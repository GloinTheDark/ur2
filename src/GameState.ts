import React from 'react';
import {
    ROSETTE_SQUARES,
    GATE_SQUARE,
    TEMPLE_SQUARES,
    HOUSE_SQUARES,
    TREASURY_SQUARES
} from './BoardLayout';
import { getPathPair } from './GamePaths';
import { getRuleSetByName, DEFAULT_RULE_SET } from './RuleSets';
import type { RuleSet } from './RuleSet';
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
    diceAnimations: boolean;
    pieceAnimations: boolean;
    currentRuleSet: string;
}

export interface GameStateData {
    currentPlayer: 'white' | 'black';
    whitePieces: ('blank' | 'spots')[];
    blackPieces: ('blank' | 'spots')[];
    whitePiecePositions: (number | 'start' | 'moving')[]; // numbers represent indices into the current rule set's white path
    blackPiecePositions: (number | 'start' | 'moving')[]; // numbers represent indices into the current rule set's black path
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
        originalMoveGaveExtraTurn: boolean
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

    // Game paths - dynamically loaded from current rule set
    private whitePath: number[] = [];
    private blackPath: number[] = [];

    constructor(settings: GameSettings) {
        this.settings = settings;
        // Initialize paths with default rule set if current rule set is invalid
        const defaultPaths = getPathPair(DEFAULT_RULE_SET.pathType);
        this.whitePath = [...defaultPaths.white];
        this.blackPath = [...defaultPaths.black];
        this.data = this.createInitialState();
        this.updatePathsFromRuleSet();
    }

    // Update paths based on current rule set
    private updatePathsFromRuleSet(): void {
        const ruleSet = getRuleSetByName(this.settings.currentRuleSet);
        const paths = getPathPair(ruleSet.pathType);
        this.whitePath = paths.white;
        this.blackPath = paths.black;
    }

    // Get current paths (for debugging/inspection)
    getCurrentPaths(): { white: number[], black: number[], pathType: string } {
        const ruleSet = getRuleSetByName(this.settings.currentRuleSet);
        return {
            white: [...this.whitePath],
            black: [...this.blackPath],
            pathType: ruleSet.pathType
        };
    }

    // Get pieces per player from current rule set
    getPiecesPerPlayer(): number {
        const ruleSet = getRuleSetByName(this.settings.currentRuleSet);
        return ruleSet.piecesPerPlayer;
    }

    // Get current rule set
    getCurrentRuleSet(): RuleSet {
        return getRuleSetByName(this.settings.currentRuleSet);
    }

    // Get current paths
    getWhitePath(): number[] {
        return [...this.whitePath];
    }

    getBlackPath(): number[] {
        return [...this.blackPath];
    }

    getPlayerPath(player: 'white' | 'black'): number[] {
        return player === 'white' ? this.getWhitePath() : this.getBlackPath();
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

    // Get pieces on a specific board square
    getPiecesOnSquare(squareNumber: number): { white: number[], black: number[] } {
        const whitePieces: number[] = [];
        const blackPieces: number[] = [];

        // Check white pieces
        this.data.whitePiecePositions.forEach((pos, index) => {
            if (pos !== 'start' && pos !== 'moving') {
                const square = this.getSquareFromPathIndex('white', pos as number);
                if (square === squareNumber) {
                    whitePieces.push(index);
                }
            }
        });

        // Check black pieces
        this.data.blackPiecePositions.forEach((pos, index) => {
            if (pos !== 'start' && pos !== 'moving') {
                const square = this.getSquareFromPathIndex('black', pos as number);
                if (square === squareNumber) {
                    blackPieces.push(index);
                }
            }
        });

        return { white: whitePieces, black: blackPieces };
    }

    // Check if any pieces on a square are eligible to move
    hasEligiblePieceOnSquare(squareNumber: number): boolean {
        if (!this.data.gameStarted || this.isAnimating()) return false;

        const piecesOnSquare = this.getPiecesOnSquare(squareNumber);
        const currentPlayerPieces = this.data.currentPlayer === 'white' ? piecesOnSquare.white : piecesOnSquare.black;

        return currentPlayerPieces.some(pieceIndex => this.data.eligiblePieces.includes(pieceIndex));
    }

    // Check if any pieces on a square are selected
    hasSelectedPieceOnSquare(squareNumber: number): boolean {
        if (!this.data.selectedPiece) return false;

        const piecesOnSquare = this.getPiecesOnSquare(squareNumber);
        const selectedPlayerPieces = this.data.selectedPiece.player === 'white' ? piecesOnSquare.white : piecesOnSquare.black;

        return selectedPlayerPieces.some(pieceIndex =>
            this.data.selectedPiece!.index === pieceIndex
        );
    }

    private createInitialState(): GameStateData {
        const piecesPerPlayer = this.getPiecesPerPlayer();
        return {
            currentPlayer: 'white',
            whitePieces: Array(piecesPerPlayer).fill('blank'),
            blackPieces: Array(piecesPerPlayer).fill('blank'),
            whitePiecePositions: Array(piecesPerPlayer).fill('start'),
            blackPiecePositions: Array(piecesPerPlayer).fill('start'),
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
        const oldRuleSet = this.settings.currentRuleSet;
        this.settings = { ...this.settings, ...newSettings };

        // Update paths if rule set changed
        if (newSettings.currentRuleSet && newSettings.currentRuleSet !== oldRuleSet) {
            this.updatePathsFromRuleSet();
        }

        if (!this.data.gameStarted) {
            // Reset piece arrays if game hasn't started
            const piecesPerPlayer = this.getPiecesPerPlayer();
            this.data.whitePieces = Array(piecesPerPlayer).fill('blank');
            this.data.blackPieces = Array(piecesPerPlayer).fill('blank');
            this.data.whitePiecePositions = Array(piecesPerPlayer).fill('start');
            this.data.blackPiecePositions = Array(piecesPerPlayer).fill('start');
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
                // Remove deprecated settings and ensure all current settings are included
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { piecesPerPlayer: _piecesPerPlayer, houseBonus: _houseBonus, templeBlessings: _templeBlessings, safeMarkets: _safeMarkets, gateKeeper: _gateKeeper, ...validSettings } = parsed;
                return {
                    diceAnimations: true,
                    pieceAnimations: true,
                    currentRuleSet: 'Finkel',
                    ...validSettings
                };
            } catch {
                return GameState.getDefaultSettings();
            }
        }
        return GameState.getDefaultSettings();
    }

    static getDefaultSettings(): GameSettings {
        return {
            diceAnimations: true,
            pieceAnimations: true,
            currentRuleSet: 'Finkel'
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

        // Get rule set and dice count
        const ruleSet = this.getCurrentRuleSet();
        const diceCount = ruleSet.diceCount;

        // Generate raw dice rolls (each die can roll a 0 or a 1)
        const newRolls = Array.from({ length: diceCount }, () => Math.floor(Math.random() * 2));

        // Use rule set to calculate the final total and apply any modifiers
        const rollResult = ruleSet.calculateDiceRoll(newRolls, this);

        this.data.diceRolls = newRolls;
        this.data.diceTotal = rollResult.total;
        this.data.houseBonusApplied = rollResult.houseBonusApplied;
        this.data.templeBlessingApplied = rollResult.templeBlessingApplied;

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
        const result = this.executeMoveWithCaptureInfo(player, pieceIndex, diceRoll);
        const extraTurn = result.extraTurn;

        // Reset dice state
        this.resetDice();

        // Switch player if didn't get extra turn
        if (!extraTurn) {
            this.data.currentPlayer = this.data.currentPlayer === 'white' ? 'black' : 'white';
        }

        // Single notification after all state changes are complete
        this.notify();

        return extraTurn;
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
        // Note: Move validation has already been done by canPieceMove() before this point
        if (currentPos === 'start') {
            toPosition = diceRoll - 1; // Convert 1-based dice roll to 0-based path index
        } else {
            const currentPathIndex = currentPos as number;
            const newPathIndex = currentPathIndex + diceRoll;

            if (newPathIndex >= playerPath.length) {
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

        const { player, index, originalDiceRoll } = this.data.animatingPiece;

        // First, restore the piece to its original position for executeMoveWithCaptureInfo to work correctly
        if (player === 'white') {
            this.data.whitePiecePositions[index] = this.data.animatingPiece.fromPosition;
        } else {
            this.data.blackPiecePositions[index] = this.data.animatingPiece.fromPosition;
        }

        // Use executeMoveWithCaptureInfo to handle all the game logic (captures, extra turns, treasury, etc.)
        const moveResult = this.executeMoveWithCaptureInfo(player, index, originalDiceRoll);
        const extraTurn = moveResult.extraTurn;

        // Handle captured piece animation if there was a capture and animations are enabled
        if (moveResult.captureInfo && this.settings.pieceAnimations) {
            const { player: capturedPlayer, index: capturedIndex, fromPosition } = moveResult.captureInfo;
            const capturedPositions = capturedPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

            // Start captured piece animation
            this.data.animatingCapturedPiece = {
                player: capturedPlayer,
                index: capturedIndex,
                fromPosition,
                isAnimating: true,
                originalMoveGaveExtraTurn: extraTurn
            };

            // Set captured piece position to 'moving' during animation
            capturedPositions[capturedIndex] = 'moving';
        }

        // Reset animation state
        this.data.animatingPiece = null;

        // If there's no captured piece animation, complete the turn immediately
        if (!this.data.animatingCapturedPiece?.isAnimating) {
            this.completeTurn(extraTurn);
        }

        this.notify();
        return extraTurn;
    }

    // Complete the turn (called after all animations finish)
    private completeTurn(extraTurn: boolean): void {
        // Reset dice state
        this.resetDice();

        // Switch player if didn't get extra turn
        if (!extraTurn) {
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

        const { player, index, originalMoveGaveExtraTurn } = this.data.animatingCapturedPiece;

        // Move captured piece to start position
        if (player === 'white') {
            this.data.whitePiecePositions[index] = 'start';
        } else {
            this.data.blackPiecePositions[index] = 'start';
        }

        // Clear captured piece animation state
        this.data.animatingCapturedPiece = null;

        // Complete the turn with the preserved extra turn information
        this.completeTurn(originalMoveGaveExtraTurn);

        this.notify();
    }

    // Version of executeMove that returns capture information for animations
    private executeMoveWithCaptureInfo(player: 'white' | 'black', pieceIndex: number, diceRoll: number): { extraTurn: boolean, captureInfo: { player: 'white' | 'black', index: number, fromPosition: number } | null } {
        // Validate the move first
        const currentPlayer = this.data.currentPlayer;
        this.data.currentPlayer = player; // Temporarily set for canPieceMove validation
        const isValidMove = this.canPieceMove(pieceIndex);
        this.data.currentPlayer = currentPlayer; // Restore current player

        if (!isValidMove) {
            return { extraTurn: false, captureInfo: null }; // Invalid move, don't execute
        }

        let extraTurn = false;
        let captureInfo: { player: 'white' | 'black', index: number, fromPosition: number } | null = null;
        const currentPositions = player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPieces = player === 'white' ? this.data.whitePieces : this.data.blackPieces;
        const playerPath = player === 'white' ? this.whitePath : this.blackPath;
        const currentPos = currentPositions[pieceIndex];

        let destinationPathIndex: number | undefined;
        let destinationSquare: number | undefined;

        if (currentPos === 'start') {
            // Move from start
            destinationPathIndex = diceRoll - 1; // Convert to 0-based index
            destinationSquare = playerPath[destinationPathIndex];
            currentPositions[pieceIndex] = destinationPathIndex;
        } else {
            // Move along the path
            const currentPathIndex = currentPos as number;
            const newPathIndex = currentPathIndex + diceRoll;

            if (newPathIndex >= playerPath.length) {
                // Bear off - piece completes the circuit
                currentPositions[pieceIndex] = 'start';
                currentPieces[pieceIndex] = 'spots'; // Keep spots state to indicate completion
                return { extraTurn, captureInfo }; // No capture possible when bearing off
            } else {
                destinationPathIndex = newPathIndex;
                destinationSquare = playerPath[destinationPathIndex];
                currentPositions[pieceIndex] = destinationPathIndex;
            }
        }

        // Check if piece landed on a rosette square
        if (destinationSquare !== undefined && (ROSETTE_SQUARES as readonly number[]).includes(destinationSquare)) {
            extraTurn = true;
        }

        // Handle treasury squares (piece becomes spots)
        if (currentPos === 'start') {
            // Check all squares from start to destination
            for (let i = 0; i < diceRoll; i++) {
                if ((TREASURY_SQUARES as readonly number[]).includes(playerPath[i])) {
                    currentPieces[pieceIndex] = 'spots';
                    break;
                }
            }
        } else {
            // Check squares from current position to destination
            const currentPathIndex = currentPos as number;
            const newPathIndex = destinationPathIndex!;
            for (let i = currentPathIndex + 1; i <= newPathIndex; i++) {
                if ((TREASURY_SQUARES as readonly number[]).includes(playerPath[i])) {
                    currentPieces[pieceIndex] = 'spots';
                    break;
                }
            }
        }

        // Handle opponent piece capture
        if (destinationSquare !== undefined) {
            const opponentPositions = player === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
            const opponentPieces = player === 'white' ? this.data.blackPieces : this.data.whitePieces;
            const opponentPath = player === 'white' ? this.blackPath : this.whitePath;
            const opponentPlayer = player === 'white' ? 'black' : 'white';

            const capturedPieceIndex = opponentPositions.findIndex(pos => {
                if (pos === 'start' || pos === 'moving') return false;
                return opponentPath[pos as number] === destinationSquare;
            });

            if (capturedPieceIndex !== -1) {
                // Store capture info before modifying positions
                captureInfo = {
                    player: opponentPlayer,
                    index: capturedPieceIndex,
                    fromPosition: opponentPositions[capturedPieceIndex] as number
                };

                opponentPositions[capturedPieceIndex] = 'start';
                opponentPieces[capturedPieceIndex] = 'blank';

                // Check if this ruleset grants extra turns on capture
                const ruleSet = this.getCurrentRuleSet();
                if (ruleSet.getExtraTurnOnCapture()) {
                    extraTurn = true;
                }
            }
        }

        return { extraTurn, captureInfo };
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
                // Attempting to bear off (complete the circuit)
                const ruleSet = this.getCurrentRuleSet();

                // Check if exact roll is required to bear off
                if (ruleSet.getExactRollNeededToBearOff()) {
                    const exactRollNeeded = currentPlayerPath.length - currentPathIndex;
                    if (this.data.diceTotal !== exactRollNeeded) {
                        return false; // Must have exact roll to bear off
                    }
                }

                // Check if gate square is occupied by opponent piece (only if gate keeper rule is enabled by ruleset)
                const opponentPositions = currentPlayer === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
                const opponentPath = currentPlayer === 'white' ? this.blackPath : this.whitePath;
                const isGateBlocked = ruleSet.getGateKeeperEnabled() && opponentPositions.some(pos => {
                    if (pos === 'start' || pos === 'moving') return false;
                    return opponentPath[pos as number] === GATE_SQUARE;
                });
                if (isGateBlocked) {
                    return false; // Cannot complete path if gate is blocked
                }
                return true; // Can return to start if gate is clear and exact roll conditions are met
            } else {
                destinationSquare = currentPlayerPath[newPathIndex];
            }
        }

        // Check if destination is occupied by same color piece (blocking)
        const isSameColorBlocking = currentPositions.some((pos, idx) => {
            if (pos === 'start' || pos === 'moving' || idx === pieceIndex) return false;
            return currentPlayerPath[pos as number] === destinationSquare;
        });

        // Check if destination is a safe square occupied by opponent piece
        const opponentPositions = currentPlayer === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
        const opponentPath = currentPlayer === 'white' ? this.blackPath : this.whitePath;
        const ruleSet = this.getCurrentRuleSet();
        const safeSquares = ruleSet.getSafeSquares();
        const isSafeSquareBlocked = safeSquares.includes(destinationSquare) &&
            opponentPositions.some(pos => {
                if (pos === 'start' || pos === 'moving') return false;
                return opponentPath[pos as number] === destinationSquare;
            });

        return !isSameColorBlocking && !isSafeSquareBlocked;
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
        // House bonus is only available in Burglers rule set
        const ruleSet = this.getCurrentRuleSet();
        if (ruleSet.name !== 'Burglers of Ur') return 0;

        const { whiteHouses, blackHouses } = this.calculateHouseControl();

        if (player === 'white' && whiteHouses > blackHouses) return 1;
        if (player === 'black' && blackHouses > whiteHouses) return 1;
        return 0;
    }

    getTempleBlessings(player: 'white' | 'black'): { hasControl: boolean, templeCount: { white: number, black: number } } {
        // Temple blessings are only available in Burglers rule set
        const ruleSet = this.getCurrentRuleSet();
        if (ruleSet.name !== 'Burglers of Ur') return { hasControl: false, templeCount: { white: 0, black: 0 } };

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
