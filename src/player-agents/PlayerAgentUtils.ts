import { GameState, type Move } from '../GameState';
import { AppLog } from '../AppSettings';

/**
 * Utility class containing common helper functions for player agents
 */
export class PlayerAgentUtils {
    /**
     * Creates a delay for AI agents to make moves feel more natural
     * @param ms The delay in milliseconds
     * @returns A promise that resolves after the specified delay
     */
    static delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Yields time to the UI to keep it responsive during long computations
     * @returns A promise that resolves immediately, allowing other tasks to run
     */
    static yieldToUI(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    /**
     * Validates that it's the correct player's turn before taking action
     * @param gameState The current game state
     * @param expectedColor The color of the player that should be taking action
     * @param actionName The name of the action being performed (for logging)
     * @returns True if it's the correct player's turn, false otherwise
     */
    static validatePlayerTurn(gameState: GameState, expectedColor: 'white' | 'black', actionName: string): boolean {
        if (gameState.state.currentPlayer !== expectedColor) {
            AppLog.playerAgent(`${actionName}: Not ${expectedColor}'s turn (current: ${gameState.state.currentPlayer}), returning`);
            return false;
        }
        return true;
    }

    /**
     * Checks if dice can be rolled in the current game state
     * @param gameState The current game state
     * @returns True if dice can be rolled, false otherwise
     */
    static canRollDice(gameState: GameState): boolean {
        return gameState.state.gamePhase === 'playing' && gameState.state.diceRolls.length === 0;
    }

    /**
     * Checks if a piece has already been selected (to prevent duplicate actions)
     * @param gameState The current game state
     * @param actionName The name of the action being performed (for logging)
     * @returns True if a piece is already selected, false otherwise
     */
    static isPieceAlreadySelected(gameState: GameState, actionName: string): boolean {
        if (gameState.state.selectedPiece !== null) {
            AppLog.playerAgent(`${actionName}: Piece already selected (${gameState.state.selectedPiece}), returning`);
            return true;
        }
        return false;
    }

    /**
     * Gets all legal moves for the current player and logs the count
     * @param gameState The current game state
     * @param agentName The name of the agent (for logging)
     * @returns Array of legal moves
     */
    static getLegalMovesWithLogging(gameState: GameState, agentName: string): Move[] {
        const legalMoves = gameState.getAllMoveOptions();
        AppLog.ai(`${agentName}: Found ${legalMoves.length} legal moves`);
        return legalMoves;
    }

    /**
     * Selects a random move from an array of legal moves
     * @param legalMoves Array of legal moves to choose from
     * @returns A randomly selected move, or null if no moves available
     */
    static selectRandomMove(legalMoves: Move[]): Move | null {
        if (legalMoves.length === 0) {
            return null;
        }
        const randomIndex = Math.floor(Math.random() * legalMoves.length);
        return legalMoves[randomIndex];
    }

    /**
     * Executes a move with appropriate logging and delays
     * @param gameState The current game state
     * @param selectedMove The move to execute
     * @param agentName The name of the agent executing the move
     * @param moveDelay The delay before executing the move (in milliseconds)
     */
    static async executeMove(
        gameState: GameState,
        selectedMove: Move,
        agentName: string,
        moveDelay: number = 300
    ): Promise<void> {
        AppLog.ai(`${agentName}: Selected move for piece ${selectedMove.movingPieceIndex} to ${selectedMove.destinationSquare}`);

        gameState.selectPiece(selectedMove.movingPieceIndex);

        // Small delay before moving
        await PlayerAgentUtils.delay(moveDelay);

        AppLog.playerAgent(`${agentName}: Moving piece ${selectedMove.movingPieceIndex} to ${selectedMove.destinationSquare}`);
        gameState.startLegalMove(selectedMove);
        AppLog.playerAgent(`${agentName}: Move completed`);
    }

    /**
     * Generates a random thinking delay for AI agents
     * @param baseDelay The base delay time in milliseconds
     * @param variationFactor Factor to multiply by random value (0-1) for variation
     * @returns A randomized delay time
     */
    static getRandomThinkingDelay(baseDelay: number, variationFactor: number = 0.75): number {
        return baseDelay * (0.25 + Math.random() * variationFactor);
    }

    /**
     * Logs the start of an AI thinking process
     * @param agentName The name of the agent
     * @param moveCount The number of moves being considered
     */
    static logThinkingStart(agentName: string, moveCount: number): void {
        AppLog.ai(`${agentName}: Evaluating ${moveCount} possible moves...`);
    }

    /**
     * Common validation for computer player agents at turn start
     * @param gameState The current game state
     * @param color The player color
     * @param agentName The agent name for logging
     * @returns True if the agent should proceed with rolling dice, false otherwise
     */
    static shouldRollDice(gameState: GameState, color: 'white' | 'black', agentName: string): boolean {
        if (!PlayerAgentUtils.validatePlayerTurn(gameState, color, `${agentName} onTurnStart`)) {
            return false;
        }

        if (!PlayerAgentUtils.canRollDice(gameState)) {
            AppLog.playerAgent(`${agentName} onTurnStart: Not rolling dice - gamePhase: ${gameState.state.gamePhase}, diceRolls: ${gameState.state.diceRolls.length}`);
            return false;
        }

        return true;
    }

    /**
     * Common validation for computer player agents when move is required
     * @param gameState The current game state
     * @param color The player color
     * @param agentName The agent name for logging
     * @returns True if the agent should proceed with selecting a move, false otherwise
     */
    static shouldSelectMove(gameState: GameState, color: 'white' | 'black', agentName: string): boolean {
        if (!PlayerAgentUtils.validatePlayerTurn(gameState, color, `${agentName} onMoveRequired`)) {
            return false;
        }

        if (PlayerAgentUtils.isPieceAlreadySelected(gameState, `${agentName} onMoveRequired`)) {
            return false;
        }

        return true;
    }

    /**
     * Evaluates the current game state for a specific player using position analysis
     * @param gameState The current game state
     * @param playerColor The color of the player to evaluate for
     * @param advancementGamma Gamma curve factor for piece advancement scoring (1.0 = linear, >1.0 = progressive)
     * @returns A numerical score representing the position strength
     */
    static evaluateGameState(gameState: GameState, playerColor: 'white' | 'black', advancementGamma: number = 1.5): number {
        // Use a simplified position evaluation
        const myPositions = playerColor === 'white' ? gameState.state.whitePiecePositions : gameState.state.blackPiecePositions;
        const opponentPositions = playerColor === 'white' ? gameState.state.blackPiecePositions : gameState.state.whitePiecePositions;

        let score = 0;

        // Get path length for scoring completed pieces
        const endOfPath = gameState.getEndOfPath();
        const completedPieceValue = endOfPath * 2; // 2x path length

        // Count completed pieces (pieces at position 0 that show spots)
        const myCompleted = myPositions.filter((pos) => pos === endOfPath).length;
        const opponentCompleted = opponentPositions.filter((pos) => pos === endOfPath).length;

        score += myCompleted * completedPieceValue;
        score -= opponentCompleted * completedPieceValue;

        // Evaluate piece advancement using gamma curve
        myPositions.forEach(pos => {
            if (pos !== 0 && pos !== -1) { // Not at start, not captured/moving
                const advancementScore = PlayerAgentUtils.calculateAdvancementScore(pos, endOfPath, advancementGamma);
                score += advancementScore;
            }
        });

        opponentPositions.forEach(pos => {
            if (pos !== 0 && pos !== -1) { // Not at start, not captured/moving
                const advancementScore = PlayerAgentUtils.calculateAdvancementScore(pos, endOfPath, advancementGamma);
                score -= advancementScore; // Opponent advancement hurts us
            }
        });

        return score;
    }

    /**
     * Calculate advancement score using a gamma curve
     * @param position Current position on the path (0-based index)
     * @param pathLength Total length of the path
     * @param gamma Gamma curve factor (1.0 = linear, >1.0 = progressive, <1.0 = regressive)
     * @returns Progressive score based on position
     */
    static calculateAdvancementScore(position: number, pathLength: number, gamma: number = 1.5): number {
        // Normalize position to 0-1 range
        const normalizedPosition = position / (pathLength - 1);

        // Apply gamma curve: score = (normalizedPosition ^ gamma) * maxScore
        // Gamma > 1.0 creates a progressive curve (low early values, high late values)
        // Gamma < 1.0 creates a regressive curve (high early values, low late values)
        // Gamma = 1.0 is linear
        const curvedValue = Math.pow(normalizedPosition, gamma);

        // Scale to a reasonable score range (0 to pathLength)
        return curvedValue * pathLength;
    }
}
