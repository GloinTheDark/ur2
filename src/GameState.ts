import React from 'react';
import {
    ROSETTE_SQUARES,
    GATE_SQUARE,
    TEMPLE_SQUARES,
    HOUSE_SQUARES
} from './BoardLayout';
import { getPathPair } from './GamePaths';
import { getRuleSetByName, DEFAULT_RULE_SET } from './RuleSets';
import type { RuleSet } from './RuleSet';
import { HumanPlayerAgent, ComputerPlayerAgent } from './PlayerAgent';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import type { DiceRollerRef } from './DiceRoller';
import { AppLog } from './AppSettings';

export type MoveIllegalReason =
    | 'blocked-by-same-color'
    | 'blocked-by-safe-square'
    | 'blocked-by-gatekeeper'
    | 'exact-roll-needed-to-bear-off';

export interface Move {
    pieceIndex: number;
    legal: boolean;
    destinationSquare: number | 'complete' | null;
    capture: boolean;
    extraTurn: boolean;
    flipSquareIndex?: number; // Path index where piece should flip (if any)
    why?: MoveIllegalReason;
}

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
    turnCount: number; // Track number of turns played
    diceRolls: number[];
    diceTotal: number;
    diceAnimating: boolean;
    houseBonusApplied: boolean;
    templeBlessingApplied: boolean;
    eligiblePieces: number[];
    legalMoves: Move[];
    illegalMoves: Move[];
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
    private isSimulation: boolean = false; // Flag to track if this is a simulation

    // Player management
    private whitePlayer: PlayerAgent | null = null;
    private blackPlayer: PlayerAgent | null = null;
    private playerManagerActive: boolean = false;
    private diceRollerRef: React.RefObject<DiceRollerRef | null> | null = null;
    private handlingStateChange: boolean = false; // Prevent concurrent handler execution

    // Debug mode
    private debugPaused: boolean = false;

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

    // Create a deep clone of this GameState for simulations
    clone(): GameState {
        // Prevent cloning during animations to avoid inconsistent state
        if (this.isAnimating()) {
            throw new Error('Cannot clone GameState during animations');
        }

        // Create a new instance with settings modified for simulation
        // Disable animations so movePiece() executes immediately instead of starting animations
        const simulationSettings = {
            ...this.settings,
            diceAnimations: false,
            pieceAnimations: false
        };
        const cloned = new GameState(simulationSettings);

        // Mark as simulation to prevent logging
        cloned.markAsSimulation();

        // Deep copy all data
        cloned.data = {
            currentPlayer: this.data.currentPlayer,
            whitePieces: [...this.data.whitePieces],
            blackPieces: [...this.data.blackPieces],
            whitePiecePositions: [...this.data.whitePiecePositions],
            blackPiecePositions: [...this.data.blackPiecePositions],
            selectedPiece: this.data.selectedPiece ? { ...this.data.selectedPiece } : null,
            gameStarted: this.data.gameStarted,
            gamePhase: this.data.gamePhase,
            initialRollResult: this.data.initialRollResult,
            turnCount: this.data.turnCount,
            diceRolls: [...this.data.diceRolls],
            diceTotal: this.data.diceTotal,
            diceAnimating: this.data.diceAnimating,
            houseBonusApplied: this.data.houseBonusApplied,
            templeBlessingApplied: this.data.templeBlessingApplied,
            eligiblePieces: [...this.data.eligiblePieces],
            legalMoves: this.data.legalMoves.map(move => ({ ...move })),
            illegalMoves: this.data.illegalMoves.map(move => ({ ...move })),
            animatingPiece: this.data.animatingPiece ? { ...this.data.animatingPiece } : null,
            animatingCapturedPiece: this.data.animatingCapturedPiece ? { ...this.data.animatingCapturedPiece } : null
        };

        // Copy paths
        cloned.whitePath = [...this.whitePath];
        cloned.blackPath = [...this.blackPath];

        return cloned;
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

    // Get current turn count
    getTurnCount(): number {
        return this.data.turnCount;
    }

    // Mark this GameState as a simulation (for MCTS/AI)
    markAsSimulation(): void {
        this.isSimulation = true;
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
    getAnimationWaypoints(player: 'white' | 'black', fromPosition: number | 'start', toPosition: number | 'start'): { waypoints: number[], flipWaypointIndex: number | null } {
        const path = player === 'white' ? this.whitePath : this.blackPath;
        const waypoints: number[] = [];
        let flipWaypointIndex: number | null = null;

        // Try to find the legal move for this animation to get pre-calculated flip info
        let flipSquarePathIndex: number | undefined;
        if (this.data.animatingPiece) {
            const legalMove = this.data.legalMoves.find(move => move.pieceIndex === this.data.animatingPiece!.index);
            flipSquarePathIndex = legalMove?.flipSquareIndex;
        }

        // Handle moving from start
        if (fromPosition === 'start') {
            if (toPosition === 'start') return { waypoints, flipWaypointIndex }; // No movement
            const toIndex = toPosition as number;
            // Add all squares from path[0] to path[toIndex]
            for (let i = 0; i <= toIndex; i++) {
                waypoints.push(path[i]);
                // Check if this is the pre-calculated flip square
                if (flipWaypointIndex === null && flipSquarePathIndex !== undefined && i === flipSquarePathIndex) {
                    flipWaypointIndex = waypoints.length - 1; // Index in waypoints array
                }
            }
        }
        // Handle moving to start (completing circuit)
        else if (toPosition === 'start') {
            const fromIndex = fromPosition as number;
            // Add all squares from current position to end of path
            for (let i = fromIndex + 1; i < path.length; i++) {
                waypoints.push(path[i]);
                // Check if this is the pre-calculated flip square
                if (flipWaypointIndex === null && flipSquarePathIndex !== undefined && i === flipSquarePathIndex) {
                    flipWaypointIndex = waypoints.length - 1; // Index in waypoints array
                }
            }
        }
        // Handle moving along the path
        else {
            const fromIndex = fromPosition as number;
            const toIndex = toPosition as number;
            // Add all squares between fromIndex and toIndex (exclusive of from, inclusive of to)
            for (let i = fromIndex + 1; i <= toIndex; i++) {
                waypoints.push(path[i]);
                // Check if this is the pre-calculated flip square
                if (flipWaypointIndex === null && flipSquarePathIndex !== undefined && i === flipSquarePathIndex) {
                    flipWaypointIndex = waypoints.length - 1; // Index in waypoints array
                }
            }
        }

        return { waypoints, flipWaypointIndex };
    }

    // Get pieces on a specific board square for a specific player
    getPiecesOnSquare(squareNumber: number, player: 'white' | 'black'): number[] {
        const pieces: number[] = [];
        const playerPositions = player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

        playerPositions.forEach((pos, index) => {
            if (pos !== 'start' && pos !== 'moving') {
                const square = this.getSquareFromPathIndex(player, pos as number);
                if (square === squareNumber) {
                    pieces.push(index);
                }
            }
        });

        return pieces;
    }

    // Check if any pieces on a square are eligible to move
    hasEligiblePieceOnSquare(squareNumber: number): boolean {
        if (!this.data.gameStarted || this.data.animatingPiece?.isAnimating || this.data.animatingCapturedPiece?.isAnimating) return false;

        const currentPlayerPieces = this.getPiecesOnSquare(squareNumber, this.data.currentPlayer);

        return currentPlayerPieces.some(pieceIndex => this.data.eligiblePieces.includes(pieceIndex));
    }

    // Check if any pieces on a square are selected
    hasSelectedPieceOnSquare(squareNumber: number): boolean {
        if (!this.data.selectedPiece) return false;

        const selectedPlayerPieces = this.getPiecesOnSquare(squareNumber, this.data.selectedPiece.player);

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
            turnCount: 0,
            diceRolls: [],
            diceTotal: 0,
            diceAnimating: false,
            houseBonusApplied: false,
            templeBlessingApplied: false,
            eligiblePieces: [],
            legalMoves: [],
            illegalMoves: [],
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

        // Start the first turn (will set turn count to 1)
        this.startTurn();

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

    setDebugPaused(paused: boolean): void {
        this.debugPaused = paused;
        this.notify(); // Trigger state change to resume AI if unpaused
    }

    stepAI(): void {
        if (!this.debugPaused) return; // Only step when paused

        // Temporarily unpause, trigger state change, then re-pause after a short delay
        this.debugPaused = false;
        this.notify();

        // Re-pause after allowing one AI action
        setTimeout(() => {
            if (!this.debugPaused) { // Only re-pause if still unpaused
                this.debugPaused = true;
            }
        }, 100); // Short delay to allow the AI action to start
    }

    rerollDice(): void {
        // Only allow rerolling if dice have been rolled
        if (this.data.diceRolls.length > 0) {
            AppLog.gameState('Debug: Rerolling dice');

            // Deselect any selected piece first since the reroll will change available moves
            if (this.data.selectedPiece !== null) {
                AppLog.gameState('Debug: Deselecting piece before reroll');
                this.data.selectedPiece = null;
            }

            // Clear current dice state
            this.data.diceRolls = [];
            this.data.diceTotal = 0;
            this.data.houseBonusApplied = false;
            this.data.templeBlessingApplied = false;
            this.data.eligiblePieces = [];
            this.data.legalMoves = [];
            this.data.illegalMoves = [];

            // Roll new dice
            this.rollDice();
        }
    }

    async selectAIPiece(): Promise<void> {
        // Only allow when paused and it's an AI player's turn
        if (!this.debugPaused) return;

        const currentPlayerAgent = this.getCurrentPlayerAgent();
        if (!currentPlayerAgent || currentPlayerAgent.playerType !== 'computer') {
            AppLog.gameState('Debug: Current player is not a computer player');
            return;
        }

        // Only proceed if dice have been rolled and there are eligible pieces
        if (this.data.diceRolls.length === 0 || this.data.eligiblePieces.length === 0) {
            AppLog.gameState('Debug: No dice rolled or no eligible pieces to select');
            return;
        }

        AppLog.gameState('Debug: AI selecting piece without moving...');

        // Deselect any currently selected piece first
        if (this.data.selectedPiece !== null) {
            AppLog.gameState('Debug: Deselecting current piece before AI selection');
            this.data.selectedPiece = null;
        }

        // Use the AI's selection logic to choose the best piece
        const computerAgent = currentPlayerAgent as import('./PlayerAgent').ComputerPlayerAgent;
        const selectedPieceIndex = await computerAgent.evaluateAndSelectPiece(this, this.data.eligiblePieces);

        AppLog.gameState(`Debug: AI selected piece ${selectedPieceIndex}`);
        this.selectPiece(selectedPieceIndex);
    }

    private async handleGameStateChange(): Promise<void> {
        if (!this.playerManagerActive || !this.whitePlayer || !this.blackPlayer) return;

        // Prevent concurrent execution
        if (this.handlingStateChange) return;
        this.handlingStateChange = true;

        try {
            const currentPlayerAgent = this.getCurrentPlayerAgent();
            if (!currentPlayerAgent) return;

            // Don't trigger AI actions during animations
            if (this.isAnimating()) {
                return;
            }

            // Check if debug mode is pausing AI actions
            if (this.debugPaused && currentPlayerAgent.playerType === 'computer') {
                return;
            }

            // Check for game end
            const winner = this.checkWinCondition();
            if (winner) {
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
            } else {
                // Player needs to make a move or pass - only auto-act for computer players
                if (currentPlayerAgent.playerType === 'computer') {
                    await currentPlayerAgent.onMoveRequired(this);
                }
            }
        } finally {
            this.handlingStateChange = false;
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
            this.data.legalMoves = [];
            this.data.illegalMoves = [];
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
                    currentRuleSet: DEFAULT_RULE_SET.name,
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
            currentRuleSet: DEFAULT_RULE_SET.name
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
        if (!this.isSimulation) {
            AppLog.dice(`Dice rolled: ${newRolls.join(', ')} (Total: ${rollResult.total})`);
        }
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
        this.data.diceAnimating = false;
        this.data.houseBonusApplied = false;
        this.data.templeBlessingApplied = false;
        this.data.eligiblePieces = [];
        this.data.legalMoves = [];
        this.data.illegalMoves = [];
        this.data.selectedPiece = null;
        // Don't notify here - let the calling method handle notification
    }

    // Piece selection
    selectPiece(pieceIndex: number): void {
        if (this.data.eligiblePieces.includes(pieceIndex)) {
            // If the piece is already selected, deselect it
            if (this.data.selectedPiece &&
                this.data.selectedPiece.player === this.data.currentPlayer &&
                this.data.selectedPiece.index === pieceIndex) {
                this.data.selectedPiece = null;
            } else {
                // Select the piece
                this.data.selectedPiece = { player: this.data.currentPlayer, index: pieceIndex };
            }
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

        // Start the new turn
        this.startTurn();

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

        // Start the new turn
        this.startTurn();

        // Notify after all state changes are complete
        this.notify();
    }

    // Check if any animation is currently in progress
    isAnimating(): boolean {
        return this.data.diceAnimating || this.data.animatingPiece?.isAnimating === true || this.data.animatingCapturedPiece?.isAnimating === true;
    }

    // Start dice animation
    startDiceAnimation(): void {
        this.data.diceAnimating = true;
        this.notify();
    }

    // Finish dice animation
    finishDiceAnimation(): void {
        this.data.diceAnimating = false;
        this.notify();
    }

    // Get current animation data
    getAnimationData(): {
        player: 'white' | 'black',
        index: number,
        fromPosition: number | 'start',
        toPosition: number | 'start',
        waypoints: number[],
        flipWaypointIndex: number | null
    } | null {
        if (!this.data.animatingPiece?.isAnimating) {
            return null;
        }

        const { player, index, fromPosition, toPosition } = this.data.animatingPiece;
        const waypointData = this.getAnimationWaypoints(player, fromPosition, toPosition);
        return {
            player,
            index,
            fromPosition,
            toPosition,
            waypoints: waypointData.waypoints,
            flipWaypointIndex: waypointData.flipWaypointIndex
        };
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
        let captureInfo: { player: 'white' | 'black', index: number, fromPosition: number } | null = null;

        // Find the legal move for this piece
        const legalMove = this.data.legalMoves.find(move => move.pieceIndex === pieceIndex);
        if (!legalMove) {
            // This shouldn't happen since the move should have been validated
            throw new Error(`No legal move found for piece ${pieceIndex}`);
        }

        const currentPositions = player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPieces = player === 'white' ? this.data.whitePieces : this.data.blackPieces;
        const currentPos = currentPositions[pieceIndex];

        // Handle the movement based on the legal move's destination
        if (legalMove.destinationSquare === 'complete') {
            // Bear off - piece completes the circuit
            currentPositions[pieceIndex] = 'start';
            currentPieces[pieceIndex] = 'spots'; // Keep spots state to indicate completion
            return { extraTurn: legalMove.extraTurn, captureInfo }; // No capture possible when bearing off
        } else {
            // Normal move along the path
            let destinationPathIndex: number;
            const destinationSquare = legalMove.destinationSquare as number;

            if (currentPos === 'start') {
                // Move from start
                destinationPathIndex = diceRoll - 1; // Convert to 0-based index
                currentPositions[pieceIndex] = destinationPathIndex;
            } else {
                // Move along the path
                const currentPathIndex = currentPos as number;
                destinationPathIndex = currentPathIndex + diceRoll;
                currentPositions[pieceIndex] = destinationPathIndex;
            }

            // Handle flip squares using pre-calculated information
            if (legalMove.flipSquareIndex !== undefined) {
                currentPieces[pieceIndex] = 'spots';
            }

            // Handle opponent piece capture if the move indicates a capture
            if (legalMove.capture) {
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
                }
            }
        }

        return { extraTurn: legalMove.extraTurn, captureInfo };
    }

    // Get pieces that should be evaluated for movement
    private getPiecesToEvaluate(): number[] {
        // Don't evaluate pieces if no dice have been rolled or if piece animations are in progress
        if (this.data.diceRolls.length === 0 || this.data.diceTotal === 0 ||
            this.data.animatingPiece?.isAnimating || this.data.animatingCapturedPiece?.isAnimating) {
            return [];
        }

        const currentPlayer = this.data.currentPlayer;
        const currentPositions = currentPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPieceStates = currentPlayer === 'white' ? this.data.whitePieces : this.data.blackPieces;
        const piecesToEvaluate: number[] = [];

        // Find the leftmost piece still in starting area (if any)
        const leftmostStartIndex = currentPositions.findIndex((pos, idx) => {
            return pos === 'start' && currentPieceStates[idx] === 'blank';
        });

        if (leftmostStartIndex !== -1) {
            piecesToEvaluate.push(leftmostStartIndex);
        }

        // Add all pieces that are on the board (excluding moving pieces)
        currentPositions.forEach((pos, index) => {
            if (pos !== 'start' && pos !== 'moving') {
                piecesToEvaluate.push(index);
            }
        });

        return piecesToEvaluate;
    }

    // Calculate eligible pieces
    private calculateEligiblePieces(): void {
        // Get all possible moves first
        const allMoves = this.getAllPossibleMoves();

        // Separate legal and illegal moves
        this.data.legalMoves = allMoves.filter(move => move.legal);
        this.data.illegalMoves = allMoves.filter(move => !move.legal);

        // Build eligible pieces list from legal moves
        this.data.eligiblePieces = this.data.legalMoves.map(move => move.pieceIndex);
    }

    // Calculate move information for a piece
    calculateMove(pieceIndex: number): Move {
        const currentPlayer = this.data.currentPlayer;
        const currentPositions = currentPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPlayerPath = currentPlayer === 'white' ? this.whitePath : this.blackPath;
        const currentPos = currentPositions[pieceIndex];
        const ruleSet = this.getCurrentRuleSet();

        const move: Move = {
            pieceIndex,
            legal: false,
            destinationSquare: null,
            capture: false,
            extraTurn: false
        };

        let destinationPathIndex: number;

        if (currentPos === 'start') {
            destinationPathIndex = this.data.diceTotal - 1; // Convert 1-based dice to 0-based path index
        } else {
            destinationPathIndex = currentPos as number + this.data.diceTotal;
        }

        if (destinationPathIndex >= currentPlayerPath.length) {
            // Attempting to bear off (complete the circuit)

            // Check if exact roll is required to bear off
            if (ruleSet.getExactRollNeededToBearOff() && destinationPathIndex > currentPlayerPath.length) {
                move.why = 'exact-roll-needed-to-bear-off';
                return move;
            }

            // Check if gate square is occupied by opponent piece (only if gate keeper rule is enabled by ruleset)
            if (ruleSet.getGateKeeperEnabled()) {
                const opponentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                const opponentPiecesOnGate = this.getPiecesOnSquare(GATE_SQUARE, opponentPlayer);
                if (opponentPiecesOnGate.length > 0) {
                    move.why = 'blocked-by-gatekeeper';
                    return move;
                }
            }

            move.destinationSquare = 'complete';
            move.legal = true;

            // Calculate flip information for bear-off moves
            const flipSquares = ruleSet.getFlipSquares();
            if (currentPos === 'start') {
                // Check all squares from start to end of path
                for (let i = 0; i < currentPlayerPath.length; i++) {
                    if (flipSquares.includes(currentPlayerPath[i])) {
                        move.flipSquareIndex = i;
                        break;
                    }
                }
            } else {
                // Check squares from current position to end of path
                const currentPathIndex = currentPos as number;
                for (let i = currentPathIndex + 1; i < currentPlayerPath.length; i++) {
                    if (flipSquares.includes(currentPlayerPath[i])) {
                        move.flipSquareIndex = i;
                        break;
                    }
                }
            }

            return move;
        }

        const destinationSquare = currentPlayerPath[destinationPathIndex];
        move.destinationSquare = destinationSquare;

        // Check if destination is occupied by same color piece (blocking)
        const isSameColorBlocking = currentPositions.some((pos, idx) => {
            if (pos === 'start' || pos === 'moving' || idx === pieceIndex) return false;
            return currentPlayerPath[pos as number] === destinationSquare;
        });

        if (isSameColorBlocking) {
            move.why = 'blocked-by-same-color';
            return move;
        }

        // Check if destination is a safe square occupied by opponent piece
        const safeSquares = ruleSet.getSafeSquares();
        if (safeSquares.includes(destinationSquare)) {
            const opponentPlayer = currentPlayer === 'white' ? 'black' : 'white';
            const opponentPiecesAtDestination = this.getPiecesOnSquare(destinationSquare, opponentPlayer);
            if (opponentPiecesAtDestination.length > 0) {
                move.why = 'blocked-by-safe-square';
                return move;
            }
        }

        // Check for capture
        const opponentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        const opponentPiecesAtDestination = this.getPiecesOnSquare(destinationSquare, opponentPlayer);

        if (opponentPiecesAtDestination.length > 0) {
            move.capture = true;
            if (ruleSet.getExtraTurnOnCapture()) {
                move.extraTurn = true;
            }
        }

        // Check if piece landed on a rosette square and rule set grants extra turns on rosettes
        if ((ROSETTE_SQUARES as readonly number[]).includes(destinationSquare) &&
            ruleSet.getExtraTurnOnRosette()) {
            move.extraTurn = true;
        }

        // Calculate flip information for normal moves
        const flipSquares = ruleSet.getFlipSquares();
        if (currentPos === 'start') {
            // Check all squares from start to destination
            for (let i = 0; i <= destinationPathIndex; i++) {
                if (flipSquares.includes(currentPlayerPath[i])) {
                    move.flipSquareIndex = i;
                    break;
                }
            }
        } else {
            // Check squares from current position to destination
            const currentPathIndex = currentPos as number;
            for (let i = currentPathIndex + 1; i <= destinationPathIndex; i++) {
                if (flipSquares.includes(currentPlayerPath[i])) {
                    move.flipSquareIndex = i;
                    break;
                }
            }
        }

        move.legal = true;
        return move;
    }

    // Get all possible moves for the current player
    getAllPossibleMoves(): Move[] {
        const piecesToEvaluate = this.getPiecesToEvaluate();
        const moves: Move[] = [];

        // For each piece that should be evaluated, calculate its move
        piecesToEvaluate.forEach(pieceIndex => {
            moves.push(this.calculateMove(pieceIndex));
        });

        return moves;
    }

    // Get legal moves for the current player
    getLegalMoves(): Move[] {
        return [...this.data.legalMoves];
    }

    // Get illegal moves for the current player
    getIllegalMoves(): Move[] {
        return [...this.data.illegalMoves];
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

        // Use the new Move system to get destination
        const move = this.calculateMove(this.data.selectedPiece.index);
        return move.destinationSquare;
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
        const ruleSet = this.getCurrentRuleSet();
        const piecesToWin = ruleSet.getPiecesToWin();

        // Count completed pieces for each player (spotted pieces that are back at start)
        const whiteCompletedPieces = this.data.whitePieces.filter((piece, index) =>
            piece === 'spots' && this.data.whitePiecePositions[index] === 'start'
        ).length;

        const blackCompletedPieces = this.data.blackPieces.filter((piece, index) =>
            piece === 'spots' && this.data.blackPiecePositions[index] === 'start'
        ).length;

        if (whiteCompletedPieces >= piecesToWin) return 'white';
        if (blackCompletedPieces >= piecesToWin) return 'black';
        return null;
    }

    // Turn management
    shouldShowPassButton(): boolean {
        // Show pass button when dice have been rolled but no pieces can move
        return this.data.diceRolls.length > 0 && this.data.eligiblePieces.length === 0;
    }

    // Start a new turn (centralized turn logging and counting)
    private startTurn(): void {
        // Increment turn count
        this.data.turnCount++;

        // Log the new turn (unless simulating)
        if (!this.isSimulation) {
            AppLog.gameState(`Turn ${this.data.turnCount}: ${this.data.currentPlayer} player's turn`);
        }
    }

    passTurn(): void {
        // Reset dice state and switch player in one atomic operation
        this.resetDice();
        this.data.currentPlayer = this.data.currentPlayer === 'white' ? 'black' : 'white';

        // Start the new turn
        this.startTurn();

        // Single notification after all state changes are complete
        this.notify();
    }

    // Cleanup method for when GameState is destroyed
    cleanup(): void {
        this.cleanupPlayers();
        this.listeners.clear();
    }
}
