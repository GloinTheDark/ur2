import { GameState } from '../GameState';

export type PlayerType = 'human' | 'computer';

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
}
