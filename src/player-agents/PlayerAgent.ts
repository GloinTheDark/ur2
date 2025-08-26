import { GameState } from '../GameState';

export type PlayerType = 'human' | 'computer' | 'remote';

// Player status for multiplayer games
export type PlayerStatus = 'active' | 'thinking' | 'disconnected' | 'idle' | 'forfeited';

// Game move data for multiplayer synchronization
export interface GameMove {
    sessionId: string;
    playerId: string;
    moveType: 'dice-roll' | 'piece-move' | 'pass-turn' | 'forfeit';
    moveData: any;
    timestamp: Date;
    turnNumber: number;
    resultingState?: GameStateSnapshot;
}

// Simplified game state for network sync
export interface GameStateSnapshot {
    currentPlayer: 'white' | 'black';
    whitePiecePositions: number[];
    blackPiecePositions: number[];
    gamePhase: 'initial-roll' | 'playing' | 'game-over';
    turnCount: number;
    diceRolls: number[];
    diceTotal: number;
    selectedPiece: number | null;
    eligiblePieces: number[];
    legalMoves: any[]; // Using any for now, can be typed later
    isExtraTurn: boolean;
}

// AI timing constants (in milliseconds) - shared by all AI agents
export const AI_DELAYS = {
    ROLL_DICE: 500,
    MIN_THINK: 800,
    MOVE_PIECE: 300
} as const;

export interface PlayerAgent {
    readonly playerType: PlayerType;
    readonly color: 'white' | 'black';

    // Called when it's this player's turn to roll dice
    onTurnStart(gameState: GameState): Promise<void>;

    // Called when dice have been rolled and the player needs to select a piece or pass
    onMoveRequired(gameState: GameState): Promise<void>;

    // Get the player's display name
    getPlayerName(): string;

    // Cleanup method
    cleanup(): void;

    // Multiplayer properties (optional for backward compatibility)
    readonly playerId?: string;
    readonly sessionId?: string;
    readonly isConnected?: boolean;
    readonly lastSeen?: Date;

    // Multiplayer methods (optional for backward compatibility)
    sendMessage?(message: string): Promise<void>;
    requestDraw?(): Promise<void>;
    acceptDraw?(): Promise<void>;
    setStatus?(status: PlayerStatus): Promise<void>;
    heartbeat?(): Promise<void>;

    // Event handlers for remote player interactions (optional)
    onOpponentMove?(move: GameMove): void;
    onStatusChange?(status: PlayerStatus): void;
    onMessage?(message: string): void;
    onDisconnect?(): void;
    onReconnect?(): void;
}
