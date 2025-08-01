import React from 'react';
import {
    ROSETTE_SQUARES,
    GATE_SQUARE,
    MARKET_SQUARES,
    TEMPLE_SQUARES,
    HOUSE_SQUARES,
    WHITE_PATH,
    BLACK_PATH,
    TREASURY_SQUARES
} from './BoardLayout';
import { HumanPlayerAgent, ComputerPlayerAgent } from './PlayerAgent';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import type { DiceRollerRef } from './DiceRoller';

export interface PlayerConfiguration {
    white: PlayerType;
    black: PlayerType;
    whiteDifficulty?: 'easy' | 'medium' | 'hard';
    blackDifficulty?: 'easy' | 'medium' | 'hard';
}

export interface GameSettings {
    piecesPerPlayer: number;
    houseBonus: boolean;
    templeBlessings: boolean;
    gateKeeper: boolean;
    safeMarkets: boolean;
    diceAnimations: boolean;
    pieceAnimations: boolean;
}

export interface GameStateData {
    currentPlayer: 'white' | 'black';
    whitePieces: ('blank' | 'spots')[];
    blackPieces: ('blank' | 'spots')[];
    whitePiecePositions: (number | 'start' | 'moving')[]; // numbers represent indices into WHITE_PATH
    blackPiecePositions: (number | 'start' | 'moving')[]; // numbers represent indices into BLACK_PATH
    selectedPiece: { player: 'white' | 'black', index: number } | null;
    gameStarted: boolean;
    gamePhase: 'initial-roll' | 'playing';
    initialRollResult: number | null;
    diceRolls: number[];
    diceTotal: number;
    houseBonusApplied: boolean;
    templeBlessingApplied: boolean;
    eligiblePieces: number[];
    animatingPiece: {
        player: 'white' | 'black',
        index: number,
        fromPosition: number | 'start',
        toPosition: number | 'start',
        originalDiceRoll: number,
        isAnimating: boolean
    } | null;
    animatingCapturedPiece: {
        player: 'white' | 'black',
        index: number,
        fromPosition: number, // path index
        isAnimating: boolean,
        originalMoveLandedOnRosette: boolean
    } | null;
}

export class GameState {
    private data: GameStateData;
    private settings: GameSettings;
    private listeners: Set<() => void> = new Set();

    // Player management
    private whitePlayer: PlayerAgent | null = null;
    private blackPlayer: PlayerAgent | null = null;
    private playerManagerActive: boolean = false;
    private diceRollerRef: React.RefObject<DiceRollerRef | null> | null = null;

    // Game paths
    private readonly whitePath = [...WHITE_PATH];
    private readonly blackPath = [...BLACK_PATH];

    constructor(settings: GameSettings) {
        this.settings = settings;
        this.data = this.createInitialState();
    }

    // Helper methods for position conversion
    getSquareFromPathIndex(player: 'white' | 'black', pathIndex: number): number {
        const path = player === 'white' ? this.whitePath : this.blackPath;
        return path[pathIndex];
    }

    getSquareFromPosition(player: 'white' | 'black', position: number | 'start' | 'moving'): number | 'start' | 'moving' {
        if (position === 'start' || position === 'moving') return position;
        return this.getSquareFromPathIndex(player, position);
    }

    // Get animation waypoints between two positions
    getAnimationWaypoints(player: 'white' | 'black', fromPosition: number | 'start', toPosition: number | 'start'): number[] {
        const path = player === 'white' ? this.whitePath : this.blackPath;
        const waypoints: number[] = [];

        // Handle moving from start
        if (fromPosition === 'start') {
            if (toPosition === 'start') return waypoints; // No movement
            const toIndex = toPosition as number;
            // Add all squares from path[0] to path[toIndex]
            for (let i = 0; i <= toIndex; i++) {
                waypoints.push(path[i]);
            }
        }
        // Handle moving to start (completing circuit)
        else if (toPosition === 'start') {
            const fromIndex = fromPosition as number;
            // Add all squares from current position to end of path
            for (let i = fromIndex + 1; i < path.length; i++) {
                waypoints.push(path[i]);
            }
        }
        // Handle moving along the path
        else {
            const fromIndex = fromPosition as number;
            const toIndex = toPosition as number;
            // Add all squares between fromIndex and toIndex (exclusive of from, inclusive of to)
            for (let i = fromIndex + 1; i <= toIndex; i++) {
                waypoints.push(path[i]);
            }
        }

        return waypoints;
    }

    private createInitialState(): GameStateData {
        return {
            currentPlayer: 'white',
            whitePieces: Array(this.settings.piecesPerPlayer).fill('blank'),
            blackPieces: Array(this.settings.piecesPerPlayer).fill('blank'),
            whitePiecePositions: Array(this.settings.piecesPerPlayer).fill('start'),
            blackPiecePositions: Array(this.settings.piecesPerPlayer).fill('start'),
            selectedPiece: null,
            gameStarted: false,
            gamePhase: 'initial-roll',
            initialRollResult: null,
            diceRolls: [],
            diceTotal: 0,
            houseBonusApplied: false,
            templeBlessingApplied: false,
            eligiblePieces: [],
            animatingPiece: null,
            animatingCapturedPiece: null
        };
    }

    // Subscription management
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(listener => listener());
        // Handle player management after notifying UI
        if (this.playerManagerActive) {
            // Use setTimeout to avoid blocking the UI update
            setTimeout(() => this.handleGameStateChange(), 0);
        }
    }

    // Getters
    get state(): Readonly<GameStateData> {
        return { ...this.data };
    }

    get gameSettings(): Readonly<GameSettings> {
        return { ...this.settings };
    }

    // Game initialization
    startNewGame(): void {
        this.data = this.createInitialState();
        this.data.gameStarted = true;
        this.data.gamePhase = 'initial-roll';
        this.notify();
    }

    // Initial roll to determine first player
    rollForFirstPlayer(): void {
        const roll = this.rollSingleDie();

        this.data.initialRollResult = roll;

        // 1 = white goes first, 0 = black goes first
        this.data.currentPlayer = roll === 1 ? 'white' : 'black';

        this.notify();
    }

    proceedToGame(): void {
        this.data.gamePhase = 'playing';
        this.data.initialRollResult = null;
        this.notify();
    }

    private rollSingleDie(): number {
        // Roll a single binary die (0 or 1)
        return Math.floor(Math.random() * 2);
    }

    // Player Management
    setupPlayers(config: PlayerConfiguration, diceRollerRef: React.RefObject<DiceRollerRef | null>): void {
        // Clean up existing players
        this.cleanupPlayers();

        this.diceRollerRef = diceRollerRef;

        // Create player agents based on configuration
        this.whitePlayer = this.createPlayerAgent('white', config.white, config.whiteDifficulty);
        this.blackPlayer = this.createPlayerAgent('black', config.black, config.blackDifficulty);

        // Start the player manager
        this.playerManagerActive = true;
        this.handleGameStateChange();
    }

    private createPlayerAgent(color: 'white' | 'black', type: PlayerType, difficulty?: 'easy' | 'medium' | 'hard'): PlayerAgent {
        switch (type) {
            case 'human':
                return new HumanPlayerAgent(color);
            case 'computer':
                if (!this.diceRollerRef) {
                    throw new Error('DiceRollerRef is required for computer players');
                }
                return new ComputerPlayerAgent(color, difficulty || 'medium', this.diceRollerRef);
            default:
                throw new Error(`Unknown player type: ${type}`);
        }
    }

    private cleanupPlayers(): void {
        this.playerManagerActive = false;

        if (this.whitePlayer) {
            this.whitePlayer.cleanup();
            this.whitePlayer = null;
        }

        if (this.blackPlayer) {
            this.blackPlayer.cleanup();
            this.blackPlayer = null;
        }

        this.diceRollerRef = null;
    }

    getCurrentPlayerAgent(): PlayerAgent | null {
        if (!this.whitePlayer || !this.blackPlayer) return null;
        return this.data.currentPlayer === 'white' ? this.whitePlayer : this.blackPlayer;
    }

    getPlayerAgent(color: 'white' | 'black'): PlayerAgent | null {
        return color === 'white' ? this.whitePlayer : this.blackPlayer;
    }

    getPlayerName(color: 'white' | 'black'): string {
        const agent = this.getPlayerAgent(color);
        return agent ? agent.getPlayerName() : color.charAt(0).toUpperCase() + color.slice(1);
    }

    isCurrentPlayerComputer(): boolean {
        const currentAgent = this.getCurrentPlayerAgent();
        return currentAgent ? currentAgent.playerType === 'computer' : false;
    }

    private async handleGameStateChange(): Promise<void> {
        if (!this.playerManagerActive || !this.whitePlayer || !this.blackPlayer) return;

        const currentPlayerAgent = this.getCurrentPlayerAgent();
        if (!currentPlayerAgent) return;

        // Check for game end
        const winner = this.checkWinCondition();
        if (winner) {
            await this.whitePlayer.onGameEnd(this, winner);
            await this.blackPlayer.onGameEnd(this, winner);
            this.playerManagerActive = false;
            return;
        }

        // Only proceed if game is in playing phase
        if (this.data.gamePhase !== 'playing') {
            return;
        }

        // Handle different game states
        if (this.data.diceRolls.length === 0) {
            // Player needs to roll dice - only auto-roll for computer players
            if (currentPlayerAgent.playerType === 'computer') {
                await currentPlayerAgent.onTurnStart(this);
            }
        } else if (this.data.diceTotal > 0 && this.data.eligiblePieces.length > 0) {
            // Player needs to make a move - only auto-move for computer players
            if (currentPlayerAgent.playerType === 'computer') {
                await currentPlayerAgent.onMoveRequired(this);
            }
        } else if (this.data.diceTotal === 0 || this.data.eligiblePieces.length === 0) {
            // No moves available, player should pass - only auto-pass for computer players
            if (currentPlayerAgent.playerType === 'computer') {
                await currentPlayerAgent.onMoveRequired(this);
            }
        }
    }

    resetGame(): void {
        this.data = this.createInitialState();
        this.notify();
    }

    updateSettings(newSettings: Partial<GameSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        if (!this.data.gameStarted) {
            // Reset piece arrays if game hasn't started
            this.data.whitePieces = Array(this.settings.piecesPerPlayer).fill('blank');
            this.data.blackPieces = Array(this.settings.piecesPerPlayer).fill('blank');
            this.data.whitePiecePositions = Array(this.settings.piecesPerPlayer).fill('start');
            this.data.blackPiecePositions = Array(this.settings.piecesPerPlayer).fill('start');
            this.data.selectedPiece = null;
            this.data.eligiblePieces = [];
        }
        this.notify();
    }

    // Settings persistence
    static loadSettings(): GameSettings {
        const saved = localStorage.getItem('royalGameSettings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Ensure diceAnimations and pieceAnimations are included for backward compatibility
                return {
                    piecesPerPlayer: 3,
                    houseBonus: false,
                    templeBlessings: false,
                    gateKeeper: true,
                    safeMarkets: true,
                    diceAnimations: true,
                    pieceAnimations: true,
                    ...parsed
                };
            } catch {
                return GameState.getDefaultSettings();
            }
        }
        return GameState.getDefaultSettings();
    }

    static getDefaultSettings(): GameSettings {
        return {
            piecesPerPlayer: 3,
            houseBonus: false,
            templeBlessings: false,
            gateKeeper: true,
            safeMarkets: true,
            diceAnimations: true,
            pieceAnimations: true
        };
    }

    saveSettings(): void {
        localStorage.setItem('royalGameSettings', JSON.stringify(this.settings));
    }

    updateAndSaveSettings(newSettings: Partial<GameSettings>): void {
        this.updateSettings(newSettings);
        this.saveSettings();
    }

    // Dice rolling
    rollDice(): void {
        // Only allow dice rolling during the playing phase
        if (this.data.gamePhase !== 'playing') {
            return;
        }

        // Generate 4 independent dice rolls, each die can roll a 0 or a 1
        const newRolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 2));
        const baseTotal = newRolls.reduce((sum, roll) => sum + roll, 0);

        // Apply temple blessings first (only if base roll is 0 and player has temple control)
        let total = baseTotal;
        let templeBlessingApplied = false;
        if (baseTotal === 0 && this.getTempleBlessings(this.data.currentPlayer).hasControl) {
            total = 4;
            templeBlessingApplied = true;
        }

        // Apply house bonus second
        let houseBonusApplied = false;
        const houseBonus = this.getHouseBonus(this.data.currentPlayer);
        if (houseBonus > 0) {
            total += houseBonus;
            houseBonusApplied = true;
        }

        this.data.diceRolls = newRolls;
        this.data.diceTotal = total;
        this.data.houseBonusApplied = houseBonusApplied;
        this.data.templeBlessingApplied = templeBlessingApplied;
        this.data.selectedPiece = null; // Reset selection on new roll
        this.calculateEligiblePieces();
        this.notify();
    }

    resetDice(): void {
        this.data.diceRolls = [];
        this.data.diceTotal = 0;
        this.data.houseBonusApplied = false;
        this.data.templeBlessingApplied = false;
        this.data.eligiblePieces = [];
        this.data.selectedPiece = null;
        // Don't notify here - let the calling method handle notification
    }

    // Piece selection
    selectPiece(pieceIndex: number): void {
        if (this.data.eligiblePieces.includes(pieceIndex)) {
            this.data.selectedPiece = { player: this.data.currentPlayer, index: pieceIndex };
            this.notify();
        }
    }

    // Piece movement
    movePiece(pieceIndex: number): boolean {
        if (!this.data.selectedPiece || this.data.selectedPiece.index !== pieceIndex || this.data.diceTotal === 0) {
            return false;
        }

        // Check if animations are enabled
        if (this.settings.pieceAnimations) {
            return this.startPieceAnimation(this.data.currentPlayer, pieceIndex, this.data.diceTotal);
        } else {
            return this.executeMoveImmediately(this.data.currentPlayer, pieceIndex, this.data.diceTotal);
        }
    }

    // Immediate move (no animation)
    private executeMoveImmediately(player: 'white' | 'black', pieceIndex: number, diceRoll: number): boolean {
        const landedOnRosette = this.executeMove(player, pieceIndex, diceRoll);

        // Reset dice state
        this.resetDice();

        // Switch player if didn't land on rosette
        if (!landedOnRosette) {
            this.data.currentPlayer = this.data.currentPlayer === 'white' ? 'black' : 'white';
        }

        // Single notification after all state changes are complete
        this.notify();

        return landedOnRosette;
    }

    // Animation methods
    private startPieceAnimation(player: 'white' | 'black', pieceIndex: number, diceRoll: number): boolean {
        const currentPositions = player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const playerPath = player === 'white' ? this.whitePath : this.blackPath;
        const currentPos = currentPositions[pieceIndex];

        // Don't start animation if piece is already moving
        if (currentPos === 'moving') {
            return false;
        }

        let toPosition: number | 'start';

        // Calculate destination position (as path index)
        if (currentPos === 'start') {
            if (diceRoll <= playerPath.length) {
                toPosition = diceRoll - 1; // Convert 1-based dice roll to 0-based path index
            } else {
                return false; // Invalid move
            }
        } else {
            const currentPathIndex = currentPos as number;
            const newPathIndex = currentPathIndex + diceRoll;

            if (newPathIndex >= playerPath.length) {
                // Check if gate is blocked
                const opponentPositions = player === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
                const isGateBlocked = this.settings.gateKeeper && opponentPositions.some(pos => {
                    if (pos === 'start' || pos === 'moving') return false;
                    const opponentPath = player === 'white' ? this.blackPath : this.whitePath;
                    return opponentPath[pos as number] === GATE_SQUARE;
                });
                if (isGateBlocked) {
                    return false; // Cannot complete path if gate is blocked
                }
                toPosition = 'start'; // Piece completes circuit
            } else {
                toPosition = newPathIndex;
            }
        }

        // Set up animation state
        this.data.animatingPiece = {
            player,
            index: pieceIndex,
            fromPosition: currentPos as number | 'start',
            toPosition,
            originalDiceRoll: this.data.diceTotal,
            isAnimating: true
        };

        // Set piece position to 'moving' so it doesn't render at source or destination
        if (player === 'white') {
            this.data.whitePiecePositions[pieceIndex] = 'moving';
        } else {
            this.data.blackPiecePositions[pieceIndex] = 'moving';
        }

        this.notify();
        return true; // Animation started successfully
    }

    // Called when animation completes
    finishPieceAnimation(): boolean {
        if (!this.data.animatingPiece || !this.data.animatingPiece.isAnimating) {
            return false;
        }

        // Clear selected piece immediately to prevent UI from showing destination marker
        this.data.selectedPiece = null;

        const { player, index, fromPosition, toPosition, originalDiceRoll } = this.data.animatingPiece;
        const playerPath = player === 'white' ? this.whitePath : this.blackPath;
        let landedOnRosette = false;

        // Set the piece to its final position
        if (player === 'white') {
            this.data.whitePiecePositions[index] = toPosition;
        } else {
            this.data.blackPiecePositions[index] = toPosition;
        }

        // Handle piece type changes (blank to spots when passing treasury)
        if (fromPosition === 'start' && toPosition !== 'start') {
            // Moving from start - check if we pass through any treasury squares
            for (let i = 0; i < originalDiceRoll; i++) {
                if (TREASURY_SQUARES.includes(playerPath[i] as any)) {
                    if (player === 'white') {
                        this.data.whitePieces[index] = 'spots';
                    } else {
                        this.data.blackPieces[index] = 'spots';
                    }
                    break;
                }
            }
        } else if (fromPosition !== 'start' && toPosition !== 'start') {
            // Moving along the path - check if we pass through any treasury squares
            const fromIndex = fromPosition as number;
            const toIndex = toPosition as number;
            for (let i = fromIndex + 1; i <= toIndex; i++) {
                if (TREASURY_SQUARES.includes(playerPath[i] as any)) {
                    if (player === 'white') {
                        this.data.whitePieces[index] = 'spots';
                    } else {
                        this.data.blackPieces[index] = 'spots';
                    }
                    break;
                }
            }
        } else if (toPosition === 'start') {
            // Completing the circuit - piece should be spots
            if (player === 'white') {
                this.data.whitePieces[index] = 'spots';
            } else {
                this.data.blackPieces[index] = 'spots';
            }
        }

        // Check for rosette landing
        if (toPosition !== 'start') {
            const destinationSquare = playerPath[toPosition as number];
            if (ROSETTE_SQUARES.includes(destinationSquare as any)) {
                landedOnRosette = true;
            }
        }

        // Handle piece capture - start captured piece animation
        if (toPosition !== 'start') {
            const destinationSquare = playerPath[toPosition as number];
            const opponentPositions = player === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
            const opponentPieces = player === 'white' ? this.data.blackPieces : this.data.whitePieces;
            const opponentPlayer = player === 'white' ? 'black' : 'white';
            const opponentPath = player === 'white' ? this.blackPath : this.whitePath;

            const capturedPieceIndex = opponentPositions.findIndex(pos => {
                if (pos === 'start' || pos === 'moving') return false;
                return opponentPath[pos as number] === destinationSquare;
            });

            if (capturedPieceIndex !== -1) {
                // Start captured piece animation if animations are enabled
                if (this.settings.pieceAnimations) {
                    // Set piece to blank immediately (before animation starts)
                    opponentPieces[capturedPieceIndex] = 'blank';

                    // Start captured piece animation
                    this.data.animatingCapturedPiece = {
                        player: opponentPlayer,
                        index: capturedPieceIndex,
                        fromPosition: opponentPositions[capturedPieceIndex] as number,
                        isAnimating: true,
                        originalMoveLandedOnRosette: landedOnRosette
                    };

                    // Set captured piece position to 'moving' during animation
                    opponentPositions[capturedPieceIndex] = 'moving';
                } else {
                    // Immediate capture without animation
                    opponentPositions[capturedPieceIndex] = 'start';
                    opponentPieces[capturedPieceIndex] = 'blank';
                }
            }
        }

        // Reset animation state
        this.data.animatingPiece = null;

        // If there's no captured piece animation, complete the turn immediately
        if (!this.data.animatingCapturedPiece?.isAnimating) {
            this.completeTurn(landedOnRosette);
        }

        this.notify();
        return landedOnRosette;
    }

    // Complete the turn (called after all animations finish)
    private completeTurn(landedOnRosette: boolean): void {
        // Reset dice state
        this.resetDice();

        // Switch player if didn't land on rosette
        if (!landedOnRosette) {
            this.data.currentPlayer = this.data.currentPlayer === 'white' ? 'black' : 'white';
        }

        // Notify after all state changes are complete
        this.notify();
    }

    // Check if any animation is currently in progress
    isAnimating(): boolean {
        return this.data.animatingPiece?.isAnimating === true || this.data.animatingCapturedPiece?.isAnimating === true;
    }

    // Get current animation data
    getAnimationData(): {
        player: 'white' | 'black',
        index: number,
        fromPosition: number | 'start',
        toPosition: number | 'start',
        waypoints: number[]
    } | null {
        if (!this.data.animatingPiece?.isAnimating) {
            return null;
        }

        const { player, index, fromPosition, toPosition } = this.data.animatingPiece;
        const waypoints = this.getAnimationWaypoints(player, fromPosition, toPosition);
        return { player, index, fromPosition, toPosition, waypoints };
    }

    // Get current captured piece animation data
    getCapturedPieceAnimationData(): {
        player: 'white' | 'black',
        index: number,
        fromPosition: number
    } | null {
        if (!this.data.animatingCapturedPiece?.isAnimating) {
            return null;
        }

        const { player, index, fromPosition } = this.data.animatingCapturedPiece;
        return { player, index, fromPosition };
    }

    // Called when captured piece animation completes
    finishCapturedPieceAnimation(): void {
        if (!this.data.animatingCapturedPiece?.isAnimating) {
            return;
        }

        const { player, index, originalMoveLandedOnRosette } = this.data.animatingCapturedPiece;

        // Move captured piece to start position
        if (player === 'white') {
            this.data.whitePiecePositions[index] = 'start';
        } else {
            this.data.blackPiecePositions[index] = 'start';
        }

        // Clear captured piece animation state
        this.data.animatingCapturedPiece = null;

        // Complete the turn with the preserved rosette information
        this.completeTurn(originalMoveLandedOnRosette);

        this.notify();
    }

    private executeMove(player: 'white' | 'black', pieceIndex: number, diceRoll: number): boolean {
        let landedOnRosette = false;

        if (player === 'white') {
            const currentPos = this.data.whitePiecePositions[pieceIndex];
            let destinationPathIndex: number | undefined;
            let destinationSquare: number | undefined;

            if (currentPos === 'start') {
                // Move from start to first position
                if (diceRoll <= this.whitePath.length) {
                    destinationPathIndex = diceRoll - 1; // Convert to 0-based index
                    destinationSquare = this.whitePath[destinationPathIndex];
                    this.data.whitePiecePositions[pieceIndex] = destinationPathIndex;

                    // Check if piece landed on a rosette square
                    if (ROSETTE_SQUARES.includes(destinationSquare as any)) {
                        landedOnRosette = true;
                    }

                    // Check if piece lands on or passes through a treasury square and change to spots
                    for (let i = 0; i < diceRoll; i++) {
                        if (TREASURY_SQUARES.includes(this.whitePath[i] as any)) {
                            this.data.whitePieces[pieceIndex] = 'spots';
                            break;
                        }
                    }
                }
            } else {
                // Move along the path
                const currentPathIndex = currentPos as number;
                const newPathIndex = currentPathIndex + diceRoll;

                if (newPathIndex >= this.whitePath.length) {
                    // Check if gate square is occupied by opponent piece (only if gate keeper rule is enabled)
                    const isGateBlocked = this.settings.gateKeeper && this.data.blackPiecePositions.some(pos => {
                        if (pos === 'start' || pos === 'moving') return false;
                        return this.blackPath[pos as number] === GATE_SQUARE;
                    });
                    if (!isGateBlocked) {
                        // Piece completes the circuit and returns to start
                        this.data.whitePiecePositions[pieceIndex] = 'start';
                        this.data.whitePieces[pieceIndex] = 'spots'; // Keep spots state to indicate completion
                    }
                } else {
                    destinationPathIndex = newPathIndex;
                    destinationSquare = this.whitePath[destinationPathIndex];
                    this.data.whitePiecePositions[pieceIndex] = destinationPathIndex;

                    // Check if piece landed on a rosette square
                    if (ROSETTE_SQUARES.includes(destinationSquare as any)) {
                        landedOnRosette = true;
                    }

                    // Check if piece lands on or passes through a treasury square and change to spots
                    for (let i = currentPathIndex + 1; i <= newPathIndex; i++) {
                        if (TREASURY_SQUARES.includes(this.whitePath[i] as any)) {
                            this.data.whitePieces[pieceIndex] = 'spots';
                            break;
                        }
                    }
                }
            }

            // Check for opponent piece capture
            if (destinationSquare !== undefined) {
                const capturedPieceIndex = this.data.blackPiecePositions.findIndex(pos => {
                    if (pos === 'start' || pos === 'moving') return false;
                    return this.blackPath[pos as number] === destinationSquare;
                });
                if (capturedPieceIndex !== -1) {
                    this.data.blackPiecePositions[capturedPieceIndex] = 'start';
                    this.data.blackPieces[capturedPieceIndex] = 'blank';
                }
            }
        } else {
            // Similar logic for black player
            const currentPos = this.data.blackPiecePositions[pieceIndex];
            let destinationPathIndex: number | undefined;
            let destinationSquare: number | undefined;

            if (currentPos === 'start') {
                if (diceRoll <= this.blackPath.length) {
                    destinationPathIndex = diceRoll - 1; // Convert to 0-based index
                    destinationSquare = this.blackPath[destinationPathIndex];
                    this.data.blackPiecePositions[pieceIndex] = destinationPathIndex;

                    if (ROSETTE_SQUARES.includes(destinationSquare as any)) {
                        landedOnRosette = true;
                    }

                    for (let i = 0; i < diceRoll; i++) {
                        if (TREASURY_SQUARES.includes(this.blackPath[i] as any)) {
                            this.data.blackPieces[pieceIndex] = 'spots';
                            break;
                        }
                    }
                }
            } else {
                const currentPathIndex = currentPos as number;
                const newPathIndex = currentPathIndex + diceRoll;

                if (newPathIndex >= this.blackPath.length) {
                    const isGateBlocked = this.settings.gateKeeper && this.data.whitePiecePositions.some(pos => {
                        if (pos === 'start' || pos === 'moving') return false;
                        return this.whitePath[pos as number] === GATE_SQUARE;
                    });
                    if (!isGateBlocked) {
                        this.data.blackPiecePositions[pieceIndex] = 'start';
                        this.data.blackPieces[pieceIndex] = 'spots';
                    }
                } else {
                    destinationPathIndex = newPathIndex;
                    destinationSquare = this.blackPath[destinationPathIndex];
                    this.data.blackPiecePositions[pieceIndex] = destinationPathIndex;

                    if (ROSETTE_SQUARES.includes(destinationSquare as any)) {
                        landedOnRosette = true;
                    }

                    for (let i = currentPathIndex + 1; i <= newPathIndex; i++) {
                        if (TREASURY_SQUARES.includes(this.blackPath[i] as any)) {
                            this.data.blackPieces[pieceIndex] = 'spots';
                            break;
                        }
                    }
                }
            }

            // Check for opponent piece capture
            if (destinationSquare !== undefined) {
                const capturedPieceIndex = this.data.whitePiecePositions.findIndex(pos => {
                    if (pos === 'start' || pos === 'moving') return false;
                    return this.whitePath[pos as number] === destinationSquare;
                });
                if (capturedPieceIndex !== -1) {
                    this.data.whitePiecePositions[capturedPieceIndex] = 'start';
                    this.data.whitePieces[capturedPieceIndex] = 'blank';
                }
            }
        }

        return landedOnRosette;
    }

    // Calculate eligible pieces
    private calculateEligiblePieces(): void {
        if (this.data.diceRolls.length === 0 || this.data.diceTotal === 0) {
            this.data.eligiblePieces = [];
            return;
        }

        // Don't allow piece selection if animation is in progress
        if (this.isAnimating()) {
            this.data.eligiblePieces = [];
            return;
        }

        const eligiblePiecesList: number[] = [];
        const currentPlayer = this.data.currentPlayer;
        const currentPositions = currentPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

        // Find the leftmost piece still in starting area (if any) and check if it can move
        const leftmostStartIndex = currentPositions.findIndex((pos, idx) => {
            const currentPieceStates = currentPlayer === 'white' ? this.data.whitePieces : this.data.blackPieces;
            return pos === 'start' && currentPieceStates[idx] === 'blank';
        });

        if (leftmostStartIndex !== -1 && this.canPieceMove(leftmostStartIndex)) {
            eligiblePiecesList.push(leftmostStartIndex);
        }

        // Add all pieces that are on the board and can move (excluding moving pieces)
        currentPositions.forEach((pos, index) => {
            if (pos !== 'start' && pos !== 'moving' && this.canPieceMove(index)) {
                eligiblePiecesList.push(index);
            }
        });

        this.data.eligiblePieces = eligiblePiecesList;
    }

    private canPieceMove(pieceIndex: number): boolean {
        const currentPlayer = this.data.currentPlayer;
        const currentPositions = currentPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPlayerPath = currentPlayer === 'white' ? this.whitePath : this.blackPath;
        const currentPos = currentPositions[pieceIndex];
        let destinationSquare: number;

        // Can't move pieces that are currently animating
        if (currentPos === 'moving') {
            return false;
        }

        if (currentPos === 'start') {
            // Moving from start
            if (this.data.diceTotal <= currentPlayerPath.length) {
                destinationSquare = currentPlayerPath[this.data.diceTotal - 1]; // Convert 1-based dice to 0-based path index
            } else {
                return false; // Can't move beyond path
            }
        } else {
            // Moving along the path
            const currentPathIndex = currentPos as number;
            const newPathIndex = currentPathIndex + this.data.diceTotal;

            if (newPathIndex >= currentPlayerPath.length) {
                // Check if gate square is occupied by opponent piece (only if gate keeper rule is enabled)
                const opponentPositions = currentPlayer === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
                const opponentPath = currentPlayer === 'white' ? this.blackPath : this.whitePath;
                const isGateBlocked = this.settings.gateKeeper && opponentPositions.some(pos => {
                    if (pos === 'start' || pos === 'moving') return false;
                    return opponentPath[pos as number] === GATE_SQUARE;
                });
                if (isGateBlocked) {
                    return false; // Cannot complete path if gate is blocked
                }
                return true; // Can return to start if gate is clear
            } else {
                destinationSquare = currentPlayerPath[newPathIndex];
            }
        }

        // Check if destination is occupied by same color piece (blocking)
        const isSameColorBlocking = currentPositions.some((pos, idx) => {
            if (pos === 'start' || pos === 'moving' || idx === pieceIndex) return false;
            return currentPlayerPath[pos as number] === destinationSquare;
        });

        // Check if destination is a market square occupied by opponent piece (safe square)
        const opponentPositions = currentPlayer === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
        const opponentPath = currentPlayer === 'white' ? this.blackPath : this.whitePath;
        const isMarketSquareBlocked = this.settings.safeMarkets && MARKET_SQUARES.includes(destinationSquare as any) &&
            opponentPositions.some(pos => {
                if (pos === 'start' || pos === 'moving') return false;
                return opponentPath[pos as number] === destinationSquare;
            });

        return !isSameColorBlocking && !isMarketSquareBlocked;
    }

    // Get destination square for selected piece
    getDestinationSquare(): number | 'complete' | null {
        if (!this.data.selectedPiece || this.data.diceTotal === 0) return null;

        // If this piece is currently animating, use the stored destination
        if (this.data.animatingPiece &&
            this.data.animatingPiece.player === this.data.selectedPiece.player &&
            this.data.animatingPiece.index === this.data.selectedPiece.index) {
            if (this.data.animatingPiece.toPosition === 'start') {
                return 'complete';
            } else {
                // Convert path index to board square
                const playerPath = this.data.animatingPiece.player === 'white' ? this.whitePath : this.blackPath;
                return playerPath[this.data.animatingPiece.toPosition as number];
            }
        }

        const currentPlayerPath = this.data.selectedPiece.player === 'white' ? this.whitePath : this.blackPath;
        const currentPositions = this.data.selectedPiece.player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPos = currentPositions[this.data.selectedPiece.index];

        if (currentPos === 'start') {
            // Moving from start
            if (this.data.diceTotal <= currentPlayerPath.length) {
                return currentPlayerPath[this.data.diceTotal - 1]; // Convert 1-based dice to 0-based path index
            }
            return null; // Can't move beyond path
        } else {
            // Moving along the path
            const currentPathIndex = currentPos as number;
            const newPathIndex = currentPathIndex + this.data.diceTotal;

            if (newPathIndex >= currentPlayerPath.length) {
                return 'complete'; // Piece would complete the path and return to start
            } else {
                return currentPlayerPath[newPathIndex];
            }
        }
    }

    // Calculate house control for house bonus rule
    calculateHouseControl(): { whiteHouses: number, blackHouses: number } {
        let whiteHouses = 0;
        let blackHouses = 0;

        HOUSE_SQUARES.forEach(square => {
            const whiteOnSquare = this.data.whitePiecePositions.some(pos => {
                if (pos === 'start' || pos === 'moving') return false;
                return this.whitePath[pos as number] === square;
            });
            const blackOnSquare = this.data.blackPiecePositions.some(pos => {
                if (pos === 'start' || pos === 'moving') return false;
                return this.blackPath[pos as number] === square;
            });

            if (whiteOnSquare && !blackOnSquare) whiteHouses++;
            else if (blackOnSquare && !whiteOnSquare) blackHouses++;
        });

        return { whiteHouses, blackHouses };
    }

    // Calculate temple control for temple blessings rule
    calculateTempleControl(): { whiteTemples: number, blackTemples: number } {
        let whiteTemples = 0;
        let blackTemples = 0;

        TEMPLE_SQUARES.forEach(square => {
            const whiteOnSquare = this.data.whitePiecePositions.some(pos => {
                if (pos === 'start' || pos === 'moving') return false;
                return this.whitePath[pos as number] === square;
            });
            const blackOnSquare = this.data.blackPiecePositions.some(pos => {
                if (pos === 'start' || pos === 'moving') return false;
                return this.blackPath[pos as number] === square;
            });

            if (whiteOnSquare && !blackOnSquare) whiteTemples++;
            else if (blackOnSquare && !whiteOnSquare) blackTemples++;
        });

        return { whiteTemples, blackTemples };
    }

    getHouseBonus(player: 'white' | 'black'): number {
        if (!this.settings.houseBonus) return 0;

        const { whiteHouses, blackHouses } = this.calculateHouseControl();

        if (player === 'white' && whiteHouses > blackHouses) return 1;
        if (player === 'black' && blackHouses > whiteHouses) return 1;
        return 0;
    }

    getTempleBlessings(player: 'white' | 'black'): { hasControl: boolean, templeCount: { white: number, black: number } } {
        if (!this.settings.templeBlessings) return { hasControl: false, templeCount: { white: 0, black: 0 } };

        const { whiteTemples, blackTemples } = this.calculateTempleControl();
        const hasControl = (player === 'white' && whiteTemples > blackTemples) ||
            (player === 'black' && blackTemples > whiteTemples);

        return { hasControl, templeCount: { white: whiteTemples, black: blackTemples } };
    }

    // Check for win condition
    checkWinCondition(): 'white' | 'black' | null {
        const whiteWon = this.data.whitePieces.every(piece => piece === 'spots') &&
            this.data.whitePiecePositions.every(pos => pos === 'start');
        const blackWon = this.data.blackPieces.every(piece => piece === 'spots') &&
            this.data.blackPiecePositions.every(pos => pos === 'start');

        if (whiteWon) return 'white';
        if (blackWon) return 'black';
        return null;
    }

    // Turn management
    shouldShowPassButton(): boolean {
        // Show pass button when dice have been rolled but no pieces can move
        return this.data.diceRolls.length > 0 && this.data.eligiblePieces.length === 0;
    }

    passTurn(): void {
        // Reset dice state and switch player in one atomic operation
        this.resetDice();
        this.data.currentPlayer = this.data.currentPlayer === 'white' ? 'black' : 'white';

        // Single notification after all state changes are complete
        this.notify();
    }

    // Cleanup method for when GameState is destroyed
    cleanup(): void {
        this.cleanupPlayers();
        this.listeners.clear();
    }
}
