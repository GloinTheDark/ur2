import { GameState } from '../GameState';
import { AppLog } from '../AppSettings';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import { AI_DELAYS } from './PlayerAgent';

export class RandomPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'computer';
    readonly color: 'white' | 'black';

    constructor(color: 'white' | 'black') {
        this.color = color;
    }

    async onTurnStart(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`Random onTurnStart: ${this.color} player called`);

        // Computer automatically rolls dice when it's their turn
        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            AppLog.playerAgent(`Random onTurnStart: Not ${this.color}'s turn (current: ${gameState.state.currentPlayer}), returning`);
            return;
        }

        if (gameState.state.gamePhase === 'playing' &&
            gameState.state.diceRolls.length === 0) {

            AppLog.playerAgent(`Random onTurnStart: Rolling dice for ${this.color} player`);

            // Add a small delay to make it feel more natural
            await this.delay(AI_DELAYS.ROLL_DICE);

            // Use centralized dice roll function
            gameState.startDiceRoll();
        } else {
            AppLog.playerAgent(`Random onTurnStart: Not rolling dice - gamePhase: ${gameState.state.gamePhase}, diceRolls: ${gameState.state.diceRolls.length}`);
        }
    }

    async onMoveRequired(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`Random onMoveRequired: ${this.color} player called`);

        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            AppLog.playerAgent(`Random onMoveRequired: Not ${this.color}'s turn (current: ${gameState.state.currentPlayer}), returning`);
            return;
        }

        // Don't act if a piece has already been selected (prevents multiple calls)
        if (gameState.state.selectedPiece !== null) {
            AppLog.playerAgent(`Random onMoveRequired: Piece already selected (${gameState.state.selectedPiece}), returning`);
            return;
        }

        const legalMoves = gameState.getAllMoveOptions();
        AppLog.ai(`Random onMoveRequired: Found ${legalMoves.length} legal moves`);

        // Add some thinking time to make it feel more natural
        AppLog.ai(`Random onMoveRequired: Thinking randomly...`);
        const thinkStartTime = performance.now();
        await this.delay(AI_DELAYS.MIN_THINK * 0.25 + Math.random() * AI_DELAYS.MIN_THINK * 0.75); // Random delay between 25%-100% of MIN_THINK

        // Pick a random legal move
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        const selectedMove = legalMoves[randomIndex];
        const actualThinkTime = performance.now() - thinkStartTime;
        AppLog.aiTiming(`RandomAI (${this.color}): Analysis completed in ${actualThinkTime.toFixed(2)}ms`);

        AppLog.ai(`Random onMoveRequired: Randomly selected move for piece ${selectedMove.movingPieceIndex} to ${selectedMove.destinationSquare} from ${legalMoves.length} options`);

        gameState.selectPiece(selectedMove.movingPieceIndex);

        // Small delay before moving
        await this.delay(AI_DELAYS.MOVE_PIECE);
        AppLog.playerAgent(`Random onMoveRequired: Moving piece ${selectedMove.movingPieceIndex} to ${selectedMove.destinationSquare}`);
        gameState.startLegalMove(selectedMove);
        AppLog.playerAgent(`Random onMoveRequired: Move completed for ${this.color} player`);
    }

    cleanup(): void {
        // No cleanup needed for random players
    }

    getPlayerName(): string {
        return 'Random AI';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
