import {
    ROSETTE_SQUARES,
    GATE_SQUARE,
    TEMPLE_SQUARES,
    HOUSE_SQUARES
} from './BoardLayout';
import { getPathPair, getPath } from './GamePaths';
import { getRuleSetByName, DEFAULT_RULE_SET } from './RuleSets';
import type { RuleSet } from './RuleSet';
import { BurglersOfUrRuleSet } from './rulesets/BurglersOfUrRuleSet';
import { HumanPlayerAgent, ComputerPlayerAgent, MCTSPlayerAgent, RandomPlayerAgent, ExhaustiveSearchPlayerAgent, NeuralNetworkPlayerAgent, getModelPathForRuleset } from './player-agents';
import type { PlayerAgent, PlayerType } from './player-agents';
import { AppLog } from './AppSettings';

// Board square constants
const BOARD_FINISH = 25; // Off-board finish square for completed pieces
const IS_MOVING = -1; // Path index value for pieces that are currently animating/moving

export type MoveIllegalReason =
    | 'blocked-by-same-color'
    | 'blocked-by-safe-square'
    | 'blocked-by-gatekeeper'
    | 'exact-roll-needed-to-bear-off'
    | 'illegal-move-to-start';

export interface Move {
    movingPieceIndex: number;
    legal: boolean;
    destinationSquare: number; // Board square number (1-24 on-board, 25 for completion)
    fromPosition: number; // Path index where piece starts
    toPosition: number; // Path index where piece ends up
    capture: boolean;
    capturedPieces: number[]; // Indices of captured pieces (if any)
    movingPieces: number[]; // Indices of pieces that move together (for stack moves)
    extraTurn: boolean;
    backwards: boolean; // Whether this move is backwards (negative distance)
    optional: boolean; // Whether this move is optional (e.g., backwards moves in Tournament Engine)
    why?: MoveIllegalReason;
}

export interface PlayerConfiguration {
    white: PlayerType;
    black: PlayerType;
    whiteAgentType?: 'computer' | 'mcts' | 'random' | 'exhaustive' | 'neural';
    blackAgentType?: 'computer' | 'mcts' | 'random' | 'exhaustive' | 'neural';
}

export interface GameSettings {
    diceAnimations: boolean;
    pieceAnimations: boolean;
    currentRuleSet: string;
}

export interface GameStateData {
    currentPlayer: 'white' | 'black';
    whitePiecePositions: number[]; // numbers represent indices into the current rule set's white path (0 = start, IS_MOVING = moving)
    blackPiecePositions: number[]; // numbers represent indices into the current rule set's black path (0 = start, IS_MOVING = moving)
    selectedPiece: number | null; // Index of the selected piece (always belongs to currentPlayer)
    gameStarted: boolean;
    gamePhase: 'initial-roll' | 'playing' | 'game-over';
    initialRollResult: number | null;
    turnCount: number; // Track number of turns played
    isExtraTurn: boolean; // Track if current turn is an extra turn
    diceRolls: number[];
    diceTotal: number;
    diceAnimating: boolean;
    houseBonusApplied: boolean;
    templeBlessingApplied: boolean;
    // Previous dice rolls for each player (for display when not their turn)
    whitePreviousDiceRolls: number[];
    blackPreviousDiceRolls: number[];
    eligiblePieces: number[];
    legalMoves: Move[];
    illegalMoves: Move[];
    isPieceAnimating: boolean;
    isCapturedPieceAnimating: boolean;
    currentMove: Move | null; // Current move being executed (for animation completion)
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
    private handlingStateChange: boolean = false; // Prevent concurrent handler execution

    // Debug mode
    private debugPaused: boolean = false;

    // Game paths - dynamically loaded from current rule set
    private whitePath: number[] = [];
    private blackPath: number[] = [];
    private endOfPath: number = 0; // Final path index for both players (paths have same length)

    constructor(settings: GameSettings) {
        this.settings = settings;
        // Initialize paths with default rule set if current rule set is invalid
        const defaultPaths = getPathPair(DEFAULT_RULE_SET.pathType);
        this.whitePath = [...defaultPaths.white];
        this.blackPath = [...defaultPaths.black];
        this.endOfPath = this.whitePath.length - 1; // Both paths have same length
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

        // Deep copy all data (optimized for simulation - skip UI-only fields)
        cloned.data = {
            currentPlayer: this.data.currentPlayer,
            whitePiecePositions: [...this.data.whitePiecePositions],
            blackPiecePositions: [...this.data.blackPiecePositions],
            selectedPiece: null, // Not needed for simulation
            gameStarted: this.data.gameStarted,
            gamePhase: this.data.gamePhase,
            initialRollResult: this.data.initialRollResult,
            turnCount: this.data.turnCount,
            isExtraTurn: this.data.isExtraTurn,
            diceRolls: [...this.data.diceRolls],
            diceTotal: this.data.diceTotal,
            diceAnimating: false, // Animations disabled in simulation
            houseBonusApplied: this.data.houseBonusApplied,
            templeBlessingApplied: this.data.templeBlessingApplied,
            whitePreviousDiceRolls: [], // Not needed for simulation
            blackPreviousDiceRolls: [], // Not needed for simulation
            eligiblePieces: [...this.data.eligiblePieces],
            legalMoves: this.data.legalMoves.map(move => ({ ...move })),
            illegalMoves: this.data.illegalMoves.map(move => ({ ...move })),
            isPieceAnimating: false, // Animation state not needed in simulation
            isCapturedPieceAnimating: false, // Animation state not needed in simulation
            currentMove: null // Not needed for simulation
        };

        // Copy paths (share arrays since they don't change during simulation)
        cloned.whitePath = this.whitePath; // Share reference - paths are immutable during simulation
        cloned.blackPath = this.blackPath; // Share reference - paths are immutable during simulation
        cloned.endOfPath = this.endOfPath;

        return cloned;
    }

    // Update paths based on current rule set
    private updatePathsFromRuleSet(): void {
        const ruleSet = getRuleSetByName(this.settings.currentRuleSet);
        const paths = getPathPair(ruleSet.pathType);
        this.whitePath = paths.white;
        this.blackPath = paths.black;
        this.endOfPath = this.whitePath.length - 1; // Both paths have same length
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

    // Get end of path index (final position for piece completion)
    getEndOfPath(): number {
        return this.endOfPath;
    }

    // Get previous dice rolls for each player
    getPreviousDiceRolls(player: 'white' | 'black'): number[] {
        return player === 'white' ? [...this.data.whitePreviousDiceRolls] : [...this.data.blackPreviousDiceRolls];
    }

    getPlayerPath(player: 'white' | 'black'): number[] {
        return player === 'white' ? this.getWhitePath() : this.getBlackPath();
    }

    // Get the opponent of the given player
    getOpponent(player: 'white' | 'black'): 'white' | 'black' {
        return player === 'white' ? 'black' : 'white';
    }

    getCurrentPlayer(): 'white' | 'black' {
        return this.data.currentPlayer;
    }

    getCurrentOpponent(): 'white' | 'black' {
        return this.getOpponent(this.data.currentPlayer);
    }

    getGamePhase(): 'initial-roll' | 'playing' | 'game-over' {
        return this.data.gamePhase;
    }

    // Helper methods for position conversion
    getSquareFromPathIndex(player: 'white' | 'black', pathIndex: number): number {
        const path = player === 'white' ? this.whitePath : this.blackPath;
        return path[pathIndex];
    }

    // New helper methods for the refactored position system
    isPieceAtStart(pathIndex: number): boolean {
        return pathIndex === 0;
    }

    isPieceCompleted(pathIndex: number): boolean {
        return pathIndex === this.endOfPath;
    }

    isPieceMoving(pathIndex: number): boolean {
        return pathIndex === IS_MOVING;
    }

    shouldPieceShowSpots(pathIndex: number): boolean {
        if (pathIndex === IS_MOVING) return false; // Moving pieces don't show
        const pathType = this.getCurrentRuleSet().pathType;
        const gamePath = getPath(pathType);
        return pathIndex >= gamePath.flipIndex;
    }

    // Get animation waypoints between two positions
    getAnimationWaypoints(player: 'white' | 'black', fromPosition: number, toPosition: number): { waypoints: number[] } {
        const path = player === 'white' ? this.whitePath : this.blackPath;
        const waypoints: number[] = [];

        // Determine if this is a backwards move
        const isBackwards = toPosition < fromPosition;

        if (isBackwards) {
            // For backwards moves, go from fromPosition down to toPosition
            for (let i = fromPosition - 1; i >= toPosition; i--) {
                waypoints.push(path[i]);
            }
        } else {
            // For forward moves, add all squares between fromPosition and toPosition (exclusive of from, inclusive of to)
            for (let i = fromPosition + 1; i <= toPosition; i++) {
                waypoints.push(path[i]);
            }
        }

        return { waypoints };
    }

    // Get pieces on a specific board square for a specific player
    getPiecesOnSquare(squareNumber: number, player: 'white' | 'black'): number[] {
        const pieces: number[] = [];
        const playerPositions = player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

        playerPositions.forEach((pathIndex, pieceIndex) => {
            if (pathIndex !== 0 && pathIndex !== IS_MOVING) { // Not at start, not moving
                const square = this.getSquareFromPathIndex(player, pathIndex);
                if (square === squareNumber) {
                    pieces.push(pieceIndex);
                }
            }
        });

        return pieces;
    }

    // Check if any pieces on a square are eligible to move
    hasEligiblePieceOnSquare(squareNumber: number): boolean {
        if (!this.data.gameStarted || this.data.isPieceAnimating || this.data.isCapturedPieceAnimating) return false;

        const currentPlayerPieces = this.getPiecesOnSquare(squareNumber, this.data.currentPlayer);

        return currentPlayerPieces.some(pieceIndex => this.data.eligiblePieces.includes(pieceIndex));
    }

    // Check if any pieces on a square are selected
    hasSelectedPieceOnSquare(squareNumber: number): boolean {
        if (this.data.selectedPiece === null) return false;

        const selectedPlayerPieces = this.getPiecesOnSquare(squareNumber, this.data.currentPlayer);

        return selectedPlayerPieces.some(pieceIndex =>
            this.data.selectedPiece === pieceIndex
        );
    }

    private createInitialState(): GameStateData {
        const piecesPerPlayer = this.getPiecesPerPlayer();
        const currentRuleSet = this.getCurrentRuleSet();
        const diceCount = currentRuleSet.diceCount;

        return {
            currentPlayer: 'white',
            whitePiecePositions: Array(piecesPerPlayer).fill(0), // All pieces start at path index 0
            blackPiecePositions: Array(piecesPerPlayer).fill(0), // All pieces start at path index 0
            selectedPiece: null,
            gameStarted: false,
            gamePhase: 'initial-roll',
            initialRollResult: null,
            turnCount: 0,
            isExtraTurn: false,
            diceRolls: [],
            diceTotal: 0,
            diceAnimating: false,
            houseBonusApplied: false,
            templeBlessingApplied: false,
            whitePreviousDiceRolls: Array(diceCount).fill(0), // Initialize with zeros
            blackPreviousDiceRolls: Array(diceCount).fill(0), // Initialize with zeros
            eligiblePieces: [],
            legalMoves: [],
            illegalMoves: [],
            isPieceAnimating: false,
            isCapturedPieceAnimating: false,
            currentMove: null
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
        this.data.isExtraTurn = false; // Reset extra turn flag for the first turn

        // Start the first turn (will set turn count to 1)
        this.startTurn();

        this.notify();
    }

    private rollSingleDie(): number {
        // Roll a single binary die (0 or 1)
        return Math.floor(Math.random() * 2);
    }

    // Player Management
    async setupPlayers(
        config: PlayerConfiguration
    ): Promise<void> {
        // Clean up existing players
        this.cleanupPlayers();

        // Create player agents based on configuration
        this.whitePlayer = await this.createPlayerAgent('white', config.white, config.whiteAgentType);
        this.blackPlayer = await this.createPlayerAgent('black', config.black, config.blackAgentType);

        // Start the player manager
        this.playerManagerActive = true;
        this.handleGameStateChange();
    }

    private async createPlayerAgent(color: 'white' | 'black', type: PlayerType, agentType?: 'computer' | 'mcts' | 'random' | 'exhaustive' | 'neural'): Promise<PlayerAgent> {
        switch (type) {
            case 'human':
                return new HumanPlayerAgent(color);
            case 'computer':
                switch (agentType) {
                    case 'random':
                        return new RandomPlayerAgent(color);
                    case 'mcts':
                        return new MCTSPlayerAgent(color);
                    case 'exhaustive':
                        return new ExhaustiveSearchPlayerAgent(color, this);
                    case 'neural':
                        // Find the appropriate model for the current ruleset
                        try {
                            const modelPath = await this.findNeuralModelForCurrentRuleset();
                            return new NeuralNetworkPlayerAgent(color, modelPath);
                        } catch (error) {
                            // No model available for this ruleset, fall back to computer agent
                            AppLog.playerAgent(`Neural agent requested but no model available for ${this.settings.currentRuleSet}: ${error}. Falling back to computer agent.`);
                            return new ComputerPlayerAgent(color);
                        }
                    case 'computer':
                    default:
                        return new ComputerPlayerAgent(color);
                }
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
    }

    /**
     * Find the appropriate neural network model for the current ruleset
     */
    private async findNeuralModelForCurrentRuleset(): Promise<string> {
        return await getModelPathForRuleset(this.settings.currentRuleSet);
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

    isDebugPaused(): boolean {
        return this.debugPaused;
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

            // Increment to next dice value instead of rolling randomly
            this.incrementDiceRoll();
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
        const selectedPieceIndex = await computerAgent.evaluateAndSelectPiece(this);
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
                this.data.gamePhase = 'game-over';
                this.playerManagerActive = false;
                this.notify();
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
            // Reset piece positions if game hasn't started
            const piecesPerPlayer = this.getPiecesPerPlayer();
            this.data.whitePiecePositions = Array(piecesPerPlayer).fill(0); // All pieces start at path index 0
            this.data.blackPiecePositions = Array(piecesPerPlayer).fill(0); // All pieces start at path index 0
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

        this.setDice(newRolls, ruleSet);
    }

    // Set dice rolls and update game state
    private setDice(newRolls: number[], ruleSet: RuleSet): void {
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

    // Set a specific dice roll with x ones and (diceCount - x) zeros
    setSpecificDiceRoll(x: number): void {
        const ruleSet = this.getCurrentRuleSet();
        const diceCount = ruleSet.diceCount;

        // Validate input
        if (x < 0 || x > diceCount) {
            throw new Error(`Invalid dice roll: x must be between 0 and ${diceCount}, got ${x}`);
        }

        // Create dice array with x ones followed by (diceCount - x) zeros
        const newRolls = Array(diceCount).fill(0);
        for (let i = 0; i < x; i++) {
            newRolls[i] = 1;
        }

        this.setDice(newRolls, ruleSet);
    }

    // Increment the current dice roll to the next higher value, wrapping around to 0
    incrementDiceRoll(): void {
        const ruleSet = this.getCurrentRuleSet();
        const diceCount = ruleSet.diceCount;

        // Count current ones in the dice roll
        const currentOnes = this.data.diceRolls.reduce((sum, die) => sum + die, 0);

        // Calculate next value, wrapping around to 0 after maximum
        const nextOnes = (currentOnes + 1) % (diceCount + 1);

        this.setSpecificDiceRoll(nextOnes);
    }

    // Centralized dice rolling that handles both animation and direct rolling
    startDiceRoll(): void {
        // Only allow dice rolling during the playing phase
        if (this.data.gamePhase !== 'playing') {
            return;
        }

        // Check if animations are enabled
        if (this.settings.diceAnimations) {
            AppLog.dice(`Starting animated dice roll for ${this.data.currentPlayer} player`);
            // Set the animation flag to trigger auto-animation in PlayerDiceRoller
            this.startDiceAnimation();
            return;
        }

        AppLog.dice('Starting direct dice roll (no animation)');
        // Roll immediately without animation
        this.rollDice();
    }

    resetTurn(extraTurn: boolean): void {
        this.data.currentMove = null;
        // Store current dice rolls as previous dice rolls before clearing them
        if (this.data.diceRolls.length > 0) {
            if (this.data.currentPlayer === 'white') {
                this.data.whitePreviousDiceRolls = [...this.data.diceRolls];
            } else {
                this.data.blackPreviousDiceRolls = [...this.data.diceRolls];
            }
        }

        // Reset dice state
        this.data.diceRolls = [];
        this.data.diceTotal = 0;
        this.data.diceAnimating = false;
        this.data.houseBonusApplied = false;
        this.data.templeBlessingApplied = false;
        this.data.eligiblePieces = [];
        this.data.legalMoves = [];
        this.data.illegalMoves = [];
        this.data.selectedPiece = null;

        // Set extra turn flag for the next turn
        this.data.isExtraTurn = extraTurn;

        // Switch player if didn't get extra turn
        if (!extraTurn) {
            this.data.currentPlayer = this.data.currentPlayer === 'white' ? 'black' : 'white';
        }

        // Don't notify here - let the calling method handle notification
    }

    // Piece selection
    selectPiece(pieceIndex: number): void {
        // Don't allow piece selection if the game is over
        if (this.data.gamePhase === 'game-over') {
            return;
        }

        if (pieceIndex < 0 || pieceIndex >= this.getPiecesPerPlayer()) {
            this.data.selectedPiece = null; // Invalid piece index, deselect
            this.notify();
            return;
        }

        if (this.data.eligiblePieces.includes(pieceIndex)) {
            // If the piece is already selected, deselect it
            if (this.data.selectedPiece === pieceIndex) {
                this.data.selectedPiece = null;
            } else {
                // Select the piece
                this.data.selectedPiece = pieceIndex;
            }
            this.notify();
        }
    }

    // Piece movement
    movePiece(pieceIndex: number, destinationSquare: number): boolean {
        // Don't allow piece movement if the game is over
        if (this.data.gamePhase === 'game-over') {
            return false;
        }

        if (this.data.selectedPiece !== pieceIndex || this.data.diceTotal === 0) {
            return false;
        }

        // Find the legal move for this piece and destination
        const legalMove = this.data.legalMoves.find(move =>
            move.movingPieceIndex === pieceIndex && move.destinationSquare === destinationSquare
        );
        if (!legalMove) {
            // This shouldn't happen since the move should have been validated
            throw new Error(`No legal move found for piece ${pieceIndex} to destination ${destinationSquare}`);
        }

        return this.startLegalMove(legalMove);
    }

    // Start a legal move (animation or immediate)
    startLegalMove(move: Move): boolean {
        this.data.currentMove = move; // Store current move for animation completion

        if (move.movingPieceIndex < 0 || move.movingPieceIndex >= this.getPiecesPerPlayer()) {
            this.passTurn();
            return false; // Invalid piece index, pass turn
        }

        if (this.settings.pieceAnimations) {
            return this.startPieceAnimation(move);
        } else {
            return this.executeMoveImmediately(move);
        }
    }

    // Immediate move (no animation)
    private executeMoveImmediately(move: Move): boolean {
        this.executeMoveWithCaptureInfo(move);
        const extraTurn = move.extraTurn;

        // Reset turn state and handle player switching
        this.resetTurn(extraTurn);

        // Start the new turn
        this.startTurn();

        // Single notification after all state changes are complete
        this.notify();

        return extraTurn;
    }

    // Animation methods
    private startPieceAnimation(move: Move): boolean {
        const player = this.data.currentPlayer;
        const currentPositions = player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

        // Set up animation state
        this.data.isPieceAnimating = true;

        // Set all moving pieces position to 'moving' so they don't render at source or destination
        move.movingPieces.forEach(pieceIndex => {
            currentPositions[pieceIndex] = IS_MOVING;
        });

        this.notify();
        return true; // Animation started successfully
    }

    // Called when animation completes
    finishPieceAnimation(): boolean {
        if (!this.data.isPieceAnimating) {
            return false;
        }

        // Clear selected piece immediately to prevent UI from showing destination marker
        this.data.selectedPiece = null;

        // Use executeMoveWithCaptureInfo to handle all the game logic (captures, extra turns, treasury, etc.)
        const move = this.data.currentMove; // Ensure we use the current move
        if (!move) {
            throw new Error('No current move available during animation completion');
        }

        this.executeMoveWithCaptureInfo(move);
        const extraTurn = move.extraTurn;

        // Handle captured piece animation if there was a capture and animations are enabled
        if (move.capture && this.settings.pieceAnimations) {
            const capturedPlayer = this.getCurrentOpponent();
            const capturedPositions = capturedPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

            // Start captured piece animation
            this.data.isCapturedPieceAnimating = true;

            // Set all move.capturedPieces captured piece position to 'moving' during animation
            move.capturedPieces.forEach((capturedIndex) => {
                capturedPositions[capturedIndex] = IS_MOVING;
            });
        }

        // Reset animation state
        this.data.isPieceAnimating = false;

        // If there's no captured piece animation, complete the turn immediately
        if (!this.data.isCapturedPieceAnimating) {
            this.completeTurn(move.extraTurn);
        }

        this.notify();
        return extraTurn;
    }

    // Complete the turn (called after all animations finish)
    private completeTurn(extraTurn: boolean): void {
        // Reset turn state and handle player switching
        this.resetTurn(extraTurn);

        // Start the new turn
        this.startTurn();

        // Notify after all state changes are complete
        this.notify();
    }

    // Check if any animation is currently in progress
    isAnimating(): boolean {
        return this.data.diceAnimating || this.data.isPieceAnimating || this.data.isCapturedPieceAnimating;
    }

    // Check if piece animation is in progress
    isPieceAnimating(): boolean {
        return this.data.isPieceAnimating;
    }

    // Check if captured piece animation is in progress
    isCapturedPieceAnimating(): boolean {
        return this.data.isCapturedPieceAnimating;
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
        waypoints: number[],

    } | null {
        if (!this.data.isPieceAnimating || !this.data.currentMove) {
            return null;
        }

        const player = this.data.currentPlayer;
        const { fromPosition, toPosition } = this.data.currentMove;
        const waypointData = this.getAnimationWaypoints(player, fromPosition, toPosition);
        return {
            waypoints: waypointData.waypoints,
        };
    }

    // Called when captured piece animation completes
    finishCapturedPieceAnimation(): void {
        if (!this.data.isCapturedPieceAnimating) {
            return;
        }

        const move = this.data.currentMove;
        if (!move) {
            throw new Error('No current move available during captured piece animation completion');
        }

        const opponent = this.getCurrentOpponent();
        const capturedPositions = opponent === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

        move.capturedPieces.forEach((capturedIndex) => {
            capturedPositions[capturedIndex] = 0;
        });

        // Clear captured piece animation state
        this.data.isCapturedPieceAnimating = false;

        // Complete the turn with the preserved extra turn information
        this.completeTurn(move.extraTurn);
        this.notify();
    }

    // Version of executeMove that returns capture information for animations
    private executeMoveWithCaptureInfo(move: Move) {
        const player = this.data.currentPlayer;
        const currentPositions = player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

        // Handle the movement based on the legal move's destination

        // Move all pieces in the stack to the destination
        move.movingPieces.forEach(pieceIndex => {
            currentPositions[pieceIndex] = move.toPosition;
        });

        // Handle opponent piece capture if the move indicates a capture
        if (move.capture) {
            const opponentPositions = player === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;

            move.capturedPieces.forEach((capturedIndex) => {
                opponentPositions[capturedIndex] = 0;
            });
        }
    }



    // Get pieces that should be evaluated for movement
    private getPiecesToEvaluate(): number[] {
        // Don't evaluate pieces if no dice have been rolled or if piece animations are in progress
        if (this.data.diceRolls.length === 0 || this.data.diceTotal === 0 ||
            this.data.isPieceAnimating || this.data.isCapturedPieceAnimating) {
            return [];
        }

        const currentPlayer = this.data.currentPlayer;
        const currentPositions = currentPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const ruleSet = this.getCurrentRuleSet();
        const allowStacking = ruleSet.getAllowPieceStacking();
        const piecesToEvaluate: number[] = [];

        // Find the leftmost piece still in starting area (path index 0)
        const leftmostStartIndex = currentPositions.findIndex((pos) => {
            return pos === 0;
        });

        if (leftmostStartIndex !== -1) {
            piecesToEvaluate.push(leftmostStartIndex);
        }

        if (allowStacking) {
            // When stacking is allowed, only the top piece (lowest index) on each square can move
            const squareToTopPiece = new Map<number, number>();

            // Find the top piece (lowest index) for each square
            currentPositions.forEach((pos, index) => {
                if (pos !== 0 && pos !== this.endOfPath && pos !== IS_MOVING) { // Not at start, not completed, not moving
                    const square = this.getSquareFromPathIndex(currentPlayer, pos);
                    if (!squareToTopPiece.has(square) || index < squareToTopPiece.get(square)!) {
                        squareToTopPiece.set(square, index);
                    }
                }
            });

            // Add only the top pieces to evaluation list
            piecesToEvaluate.push(...squareToTopPiece.values());
        } else {
            // Traditional rules: add all pieces that are on the board
            currentPositions.forEach((pos, index) => {
                if (pos !== 0 && pos !== this.endOfPath && pos !== IS_MOVING) { // Not at start, not completed, not moving
                    piecesToEvaluate.push(index);
                }
            });
        }

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
        this.data.eligiblePieces = this.data.legalMoves.map(move => move.movingPieceIndex);
    }

    // Calculate move information for a piece
    calculateMoves(pieceIndex: number): Move[] {
        const moves = this.calculateMovesByDistance(pieceIndex, this.data.diceTotal);
        const ruleSet = this.getCurrentRuleSet();

        if (ruleSet.canMoveBackwards()) {
            // If the rule set allows moving backwards, also calculate moves for negative distance
            const negativeMoves = this.calculateMovesByDistance(pieceIndex, -this.data.diceTotal);
            return [...moves, ...negativeMoves]; // Combine both positive and negative moves
        }

        return moves;
    }

    private calculateMovesByDistance(pieceIndex: number, distance: number): Move[] {
        const currentPlayer = this.data.currentPlayer;
        const currentPositions = currentPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPlayerPath = currentPlayer === 'white' ? this.whitePath : this.blackPath;
        const currentPos = currentPositions[pieceIndex];
        const ruleSet = this.getCurrentRuleSet();

        if (distance < 0 && currentPos === 0) {
            // Cannot move backwards from start position
            return [];
        }

        // Determine which pieces move together
        let movingPieces: number[];
        if (ruleSet.stacksMoveAsOne() && currentPos !== 0) {
            // Stack moves as one: find all friendly pieces at the same position
            const boardSquare = this.getSquareFromPathIndex(currentPlayer, currentPos);
            movingPieces = this.getPiecesOnSquare(boardSquare, currentPlayer);
        } else {
            // Traditional move: only the selected piece moves
            movingPieces = [pieceIndex];
        }

        const move: Move = {
            movingPieceIndex: pieceIndex,
            legal: false,
            destinationSquare: BOARD_FINISH,
            fromPosition: currentPos,
            toPosition: currentPos, // Will be updated below
            capture: false,
            capturedPieces: [],
            movingPieces,
            extraTurn: false,
            backwards: distance < 0,
            optional: distance < 0 && ruleSet.backwardsMovesAreOptional() // Optional if backwards and rule set marks backwards as optional
        };

        let destinationPathIndex: number;
        destinationPathIndex = currentPos + distance;

        if (destinationPathIndex < 1) {
            // Attempting to move before the start of the path
            move.why = 'illegal-move-to-start';
            move.toPosition = currentPos; // No movement if illegal
            return [move]; // Return array with single move
        }

        if (destinationPathIndex >= this.endOfPath) {
            // Attempting to bear off (complete the circuit)

            // Check if exact roll is required to bear off
            if (ruleSet.getExactRollNeededToBearOff() && destinationPathIndex > this.endOfPath) {
                move.why = 'exact-roll-needed-to-bear-off';
                move.toPosition = currentPos; // No movement if illegal
                return [move]; // Return array with single move
            }

            destinationPathIndex = this.endOfPath;
            move.toPosition = destinationPathIndex;

            // Check if gate square is occupied by opponent piece (only if gate keeper rule is enabled by ruleset)
            if (ruleSet.getGateKeeperEnabled()) {
                const opponentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                const opponentPiecesOnGate = this.getPiecesOnSquare(GATE_SQUARE, opponentPlayer);
                if (opponentPiecesOnGate.length > 0) {
                    move.why = 'blocked-by-gatekeeper';
                    move.toPosition = currentPos; // No movement if illegal
                    return [move]; // Return array with single move
                }
            }

            move.destinationSquare = BOARD_FINISH; // Completion goes to finish square
            move.legal = true;

            return [move]; // Return array with single move
        }

        const destinationSquare = currentPlayerPath[destinationPathIndex];
        move.destinationSquare = destinationSquare;
        move.toPosition = destinationPathIndex;

        // Check if destination is occupied by same color piece (blocking)
        const isSameColorBlocking = this.getPiecesOnSquare(destinationSquare, currentPlayer).length > 0;
        if (isSameColorBlocking) {
            // If stacking is not allowed at all, block the move
            if (!ruleSet.getAllowPieceStacking()) {
                move.why = 'blocked-by-same-color';
                move.toPosition = currentPos; // No movement if illegal
                return [move]; // Return array with single move
            }

            // If stacking is only allowed on rosettes, check if destination is a rosette
            if (ruleSet.canOnlyStackOnRosettes() && !(ROSETTE_SQUARES as readonly number[]).includes(destinationSquare)) {
                move.why = 'blocked-by-same-color';
                move.toPosition = currentPos; // No movement if illegal
                return [move]; // Return array with single move
            }
        }

        // Check if destination is occupied by opponent piece
        const opponentPlayer = currentPlayer === 'white' ? 'black' : 'white';
        const opponentPiecesAtDestination = this.getPiecesOnSquare(destinationSquare, opponentPlayer);
        if (opponentPiecesAtDestination.length > 0) {
            // Check if destination is a safe square occupied by opponent piece
            const safeSquares = ruleSet.getSafeSquares();
            if (safeSquares.includes(destinationSquare)) {
                move.why = 'blocked-by-safe-square';
                move.toPosition = currentPos; // No movement if illegal
                return [move]; // Return array with single move
            }
            // If not a safe square, we can capture the opponent piece
            move.capture = true;
            move.capturedPieces = opponentPiecesAtDestination;
            if (ruleSet.getExtraTurnOnCapture()) {
                move.extraTurn = true;
            }
        }

        // Check if piece landed on a rosette square and rule set grants extra turns on rosettes
        if ((ROSETTE_SQUARES as readonly number[]).includes(destinationSquare) &&
            ruleSet.getExtraTurnOnRosette()) {
            move.extraTurn = true;
        }

        move.legal = true;
        return [move]; // Return array with single move
    }

    // Get all possible moves for the current player
    private getAllPossibleMoves(): Move[] {
        const piecesToEvaluate = this.getPiecesToEvaluate();
        const moves: Move[] = [];

        // For each piece that should be evaluated, calculate its moves and add them all
        piecesToEvaluate.forEach(pieceIndex => {
            const pieceMoves = this.calculateMoves(pieceIndex);
            moves.push(...pieceMoves); // Spread operator to add all moves from the array
        });

        return moves;
    }


    private makePassTurnMove(optional: boolean): Move {
        const move: Move = {
            movingPieceIndex: -1, // No piece is moving
            legal: true, // Passing is always a legal move
            destinationSquare: -1, // No destination square for pass
            fromPosition: -1, // No from position for pass
            toPosition: -1, // No to position for pass
            capture: false, // No capture when passing
            capturedPieces: [], // No captured pieces when passing
            movingPieces: [], // No moving pieces when passing
            extraTurn: false, // Passing does not grant an extra turn
            backwards: false, // Passing is not a backwards move
            optional: optional // Whether this pass is optional
        };
        return move;
    }

    getCurrentMove(): Move | null {
        return this.data.currentMove;
    }


    // Get legal moves for the current player including pass turn
    getAllMoveOptions(): Move[] {
        // Return all possible moves, including pass turn
        if (this.playerMustPass()) {
            // If player must pass, return only the pass move
            return [this.makePassTurnMove(false)];
        }
        if (this.playerMayPass()) {
            // If player may pass, return all legal moves plus the optional pass move
            const passMove = this.makePassTurnMove(true);
            return [...this.data.legalMoves, passMove];
        }
        return [...this.data.legalMoves];
    }

    // Get legal moves for the current player
    getLegalMoves(): Move[] {
        return [...this.data.legalMoves];
    }

    // Get illegal moves for the current player
    getIllegalMoves(): Move[] {
        return [...this.data.illegalMoves];
    }

    // Get destination squares for selected piece
    getDestinationSquares(): number[] {
        if (this.data.selectedPiece === null || this.data.diceTotal === 0) return [];

        // If this piece is currently animating, use the current move destination
        if (this.data.isPieceAnimating &&
            this.data.currentMove &&
            this.data.currentMove.movingPieceIndex === this.data.selectedPiece) {
            const playerPath = this.data.currentPlayer === 'white' ? this.whitePath : this.blackPath;
            if (this.data.currentMove.toPosition >= this.endOfPath) { // Piece completes circuit
                return [BOARD_FINISH]; // Completion goes to finish square
            } else {
                // Convert path index to board square
                return [playerPath[this.data.currentMove.toPosition]];
            }
        }

        // Use the new Move system to get all possible destinations, but only for legal moves
        const moves = this.calculateMoves(this.data.selectedPiece);
        return moves.filter(move => move.legal).map(move => move.destinationSquare);
    }

    // Calculate house control for house bonus rule
    calculateHouseControl(): { whiteHouses: number, blackHouses: number } {
        let whiteHouses = 0;
        let blackHouses = 0;

        HOUSE_SQUARES.forEach(square => {
            const whiteOnSquare = this.data.whitePiecePositions.some((pos) => {
                if (pos === 0 || pos === IS_MOVING) return false; // Start or moving pieces
                return this.whitePath[pos] === square;
            });
            const blackOnSquare = this.data.blackPiecePositions.some((pos) => {
                if (pos === 0 || pos === IS_MOVING) return false; // Start or moving pieces
                return this.blackPath[pos] === square;
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
            const whiteOnSquare = this.data.whitePiecePositions.some((pos) => {
                if (pos === 0 || pos === IS_MOVING) return false; // Start or moving pieces
                return this.whitePath[pos] === square;
            });
            const blackOnSquare = this.data.blackPiecePositions.some((pos) => {
                if (pos === 0 || pos === IS_MOVING) return false; // Start or moving pieces
                return this.blackPath[pos] === square;
            });

            if (whiteOnSquare && !blackOnSquare) whiteTemples++;
            else if (blackOnSquare && !whiteOnSquare) blackTemples++;
        });

        return { whiteTemples, blackTemples };
    }

    getHouseBonus(player: 'white' | 'black'): number {
        // House bonus is only available in Burglers rule set
        const ruleSet = this.getCurrentRuleSet();
        if (!(ruleSet instanceof BurglersOfUrRuleSet)) return 0;

        const { whiteHouses, blackHouses } = this.calculateHouseControl();

        if (player === 'white' && whiteHouses > blackHouses) return 1;
        if (player === 'black' && blackHouses > whiteHouses) return 1;
        return 0;
    }

    getTempleBlessings(player: 'white' | 'black'): { hasControl: boolean, templeCount: { white: number, black: number } } {
        // Temple blessings are only available in Burglers rule set
        const ruleSet = this.getCurrentRuleSet();
        if (!(ruleSet instanceof BurglersOfUrRuleSet)) return { hasControl: false, templeCount: { white: 0, black: 0 } };

        const { whiteTemples, blackTemples } = this.calculateTempleControl();
        const hasControl = (player === 'white' && whiteTemples > blackTemples) ||
            (player === 'black' && blackTemples > whiteTemples);

        return { hasControl, templeCount: { white: whiteTemples, black: blackTemples } };
    }

    // Check for win condition
    checkWinCondition(): 'white' | 'black' | null {
        const ruleSet = this.getCurrentRuleSet();
        const piecesToWin = ruleSet.getPiecesToWin();

        // Count completed pieces for each player (pieces that completed the circuit)
        const whiteCompletedPieces = this.data.whitePiecePositions.filter((pos) => {
            // A piece is completed if it's at the final path index
            return pos === this.endOfPath;
        }).length;

        const blackCompletedPieces = this.data.blackPiecePositions.filter((pos) => {
            // A piece is completed if it's at the final path index
            return pos === this.endOfPath;
        }).length;

        if (whiteCompletedPieces >= piecesToWin) return 'white';
        if (blackCompletedPieces >= piecesToWin) return 'black';
        return null;
    }

    // Check if the game is over
    isGameOver(): boolean {
        return this.data.gamePhase === 'game-over';
    }

    // Turn management
    playerMustPass(): boolean {
        // Only allow passing during the playing phase
        if (this.data.gamePhase !== 'playing') return false;

        // Show pass button when dice have been rolled but no pieces can move
        return this.data.diceRolls.length > 0 && this.data.eligiblePieces.length === 0;
    }

    playerMayPass(): boolean {
        // Only allow passing during the playing phase
        if (this.data.gamePhase !== 'playing') return false;

        // Show optional pass button when all legal moves are optional
        return this.data.legalMoves.length > 0 &&
            this.data.legalMoves.every(move => move.optional) && !this.playerMustPass();
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
        // Don't allow passing turn if the game is over
        if (this.data.gamePhase === 'game-over') {
            return;
        }

        // Reset turn state and switch player (no extra turn when passing)
        this.resetTurn(false);

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
