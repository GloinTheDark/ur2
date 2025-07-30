import { GameState } from './GameState';

export type PlayerType = 'human' | 'computer';

export interface PlayerAgent {
    readonly playerType: PlayerType;
    readonly color: 'white' | 'black';

    // Called when it's this player's turn to roll dice
    onTurnStart(gameState: GameState): Promise<void>;

    // Called when dice have been rolled and the player needs to select a piece or pass
    onMoveRequired(gameState: GameState): Promise<void>;

    // Called when the player's turn ends
    onTurnEnd(gameState: GameState): Promise<void>;

    // Called when the game ends
    onGameEnd(gameState: GameState, winner: 'white' | 'black' | null): Promise<void>;

    // Cleanup method
    cleanup(): void;
}

export class HumanPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'human';
    readonly color: 'white' | 'black';

    constructor(color: 'white' | 'black') {
        this.color = color;
    }

    async onTurnStart(_gameState: GameState): Promise<void> {
        // For human players, the UI handles dice rolling
        // This is a no-op since humans interact directly with the UI
    }

    async onMoveRequired(_gameState: GameState): Promise<void> {
        // For human players, the UI handles piece selection and movement
        // This is a no-op since humans interact directly with the UI
    }

    async onTurnEnd(_gameState: GameState): Promise<void> {
        // No special action needed for human players
    }

    async onGameEnd(_gameState: GameState, _winner: 'white' | 'black' | null): Promise<void> {
        // Could show a message or update UI, but for now just a no-op
    }

    cleanup(): void {
        // No cleanup needed for human players
    }
}

export class ComputerPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'computer';
    readonly color: 'white' | 'black';
    private difficulty: 'easy' | 'medium' | 'hard';

    constructor(color: 'white' | 'black', difficulty: 'easy' | 'medium' | 'hard' = 'medium') {
        this.color = color;
        this.difficulty = difficulty;
    }

    async onTurnStart(gameState: GameState): Promise<void> {
        // Computer automatically rolls dice when it's their turn
        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            return;
        }

        if (gameState.state.gamePhase === 'playing' &&
            gameState.state.diceRolls.length === 0) {

            // Add a small delay to make it feel more natural
            await this.delay(500);
            gameState.rollDice();
        }
    } async onMoveRequired(gameState: GameState): Promise<void> {
        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            return;
        }

        // Add thinking delay
        await this.delay(1000);

        const eligiblePieces = gameState.state.eligiblePieces;

        if (eligiblePieces.length === 0) {
            // No moves available, pass turn
            if (gameState.shouldShowPassButton()) {
                gameState.passTurn();
            }
            return;
        }

        // Select a piece based on difficulty/strategy
        const selectedPieceIndex = this.selectBestMove(gameState, eligiblePieces);
        gameState.selectPiece(selectedPieceIndex);

        // Small delay before moving
        await this.delay(300);
        gameState.movePiece(selectedPieceIndex);
    }

    async onTurnEnd(_gameState: GameState): Promise<void> {
        // No special action needed
    }

    async onGameEnd(_gameState: GameState, _winner: 'white' | 'black' | null): Promise<void> {
        // Game ended notification for computer player
    }

    cleanup(): void {
        // No cleanup needed for computer players
    }

    private selectBestMove(gameState: GameState, eligiblePieces: number[]): number {
        // Simple AI strategy based on difficulty
        switch (this.difficulty) {
            case 'easy':
                return this.selectRandomMove(eligiblePieces);
            case 'medium':
                return this.selectMediumMove(gameState, eligiblePieces);
            case 'hard':
                return this.selectHardMove(gameState, eligiblePieces);
            default:
                return this.selectRandomMove(eligiblePieces);
        }
    }

    private selectRandomMove(eligiblePieces: number[]): number {
        return eligiblePieces[Math.floor(Math.random() * eligiblePieces.length)];
    }

    private selectMediumMove(_gameState: GameState, eligiblePieces: number[]): number {
        // Medium difficulty: prefer moving pieces forward, avoid being captured
        // For now, just return the first eligible piece (can be improved later)
        return eligiblePieces[0];
    }

    private selectHardMove(_gameState: GameState, eligiblePieces: number[]): number {
        // Hard difficulty: consider capturing opponent pieces, rosette squares, safety
        // For now, just return the first eligible piece (can be improved later)
        return eligiblePieces[0];
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
