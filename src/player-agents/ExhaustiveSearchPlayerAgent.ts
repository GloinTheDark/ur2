import { GameState, type Move } from '../GameState';
import { AppLog } from '../AppSettings';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import { AI_DELAYS } from './PlayerAgent';
import { PlayerAgentUtils } from './PlayerAgentUtils';

interface MoveEvaluation {
    move: Move;
    score: number;
    reasons: string[];
}

interface DiceOutcome {
    diceRolls: number[];
    total: number;
    probability: number;
}

// Exhaustive search configuration
const EXHAUSTIVE_CONFIG = {
    MAX_DEPTH: 4, // Increased depth for more thorough search
    ADVANCEMENT_GAMMA: 1.5,
    END_GAME_BONUS: 200
} as const;

export class ExhaustiveSearchPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'computer';
    readonly color: 'white' | 'black';
    private readonly diceOutcomes: DiceOutcome[];
    private lastYieldTime: number = 0;

    constructor(color: 'white' | 'black', gameState: GameState) {
        this.color = color;
        // Pre-calculate all possible dice outcomes for this rule set
        this.diceOutcomes = this.generateAllDiceOutcomes(gameState);
    }

    getPlayerName(): string {
        return `Exhaustive Search AI (${this.color})`;
    }

    cleanup(): void {
        // No cleanup needed for this agent
    }

    async onTurnStart(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`ExhaustiveSearch onTurnStart: ${this.color} player called`);

        // Computer automatically rolls dice when it's their turn
        if (!PlayerAgentUtils.validatePlayerTurn(gameState, this.color, 'ExhaustiveSearch onTurnStart')) {
            return;
        }

        if (!PlayerAgentUtils.canRollDice(gameState)) {
            AppLog.playerAgent('ExhaustiveSearch onTurnStart: Cannot roll dice, returning');
            return;
        }

        // Add slight delay before rolling
        await PlayerAgentUtils.delay(AI_DELAYS.ROLL_DICE);

        AppLog.playerAgent(`ExhaustiveSearch: Rolling dice for ${this.color}`);
        gameState.rollDice();
    }

    async onMoveRequired(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`ExhaustiveSearch onMoveRequired: ${this.color} player called`);

        if (!PlayerAgentUtils.shouldSelectMove(gameState, this.color, 'ExhaustiveSearch')) {
            return;
        }

        const legalMoves = PlayerAgentUtils.getLegalMovesWithLogging(gameState, 'ExhaustiveSearch');

        if (legalMoves.length === 0) {
            AppLog.ai('ExhaustiveSearch: No legal moves available');
            return;
        }

        // Find the best move using exhaustive search
        const bestMove = await this.findBestMove(gameState, legalMoves);

        if (bestMove) {
            await PlayerAgentUtils.executeMove(gameState, bestMove.move, 'ExhaustiveSearch', AI_DELAYS.MOVE_PIECE);
        } else {
            // Fallback to random move if something goes wrong
            const randomMove = PlayerAgentUtils.selectRandomMove(legalMoves);
            if (randomMove) {
                await PlayerAgentUtils.executeMove(gameState, randomMove, 'ExhaustiveSearch', AI_DELAYS.MOVE_PIECE);
            }
        }
    }

    /**
     * Find the best move using exhaustive search with minimax algorithm
     */
    private async findBestMove(gameState: GameState, legalMoves: Move[]): Promise<MoveEvaluation | null> {
        if (legalMoves.length === 0) return null;

        const startTime = performance.now();
        this.lastYieldTime = startTime;
        AppLog.ai(`ExhaustiveSearch: Evaluating ${legalMoves.length} moves with exhaustive search (depth ${EXHAUSTIVE_CONFIG.MAX_DEPTH})`);

        let bestMove: MoveEvaluation | null = null;
        let bestScore = -Infinity;

        for (let i = 0; i < legalMoves.length; i++) {
            const move = legalMoves[i];
            const clonedState = this.cloneGameState(gameState);

            // Make the move
            clonedState.startLegalMove(move);

            // Evaluate this move using minimax
            const score = await this.minimax(clonedState, EXHAUSTIVE_CONFIG.MAX_DEPTH - 1, false, -Infinity, Infinity);

            AppLog.ai(`ExhaustiveSearch: Move piece ${move.movingPieceIndex} to ${move.destinationSquare} scored ${score.toFixed(2)}`);

            if (score > bestScore) {
                bestScore = score;
                bestMove = {
                    move,
                    score,
                    reasons: [`Exhaustive search score: ${score.toFixed(2)}`]
                };
            }

            // Yield to UI if 200ms have passed
            await this.periodicallyYield();
        }

        const endTime = performance.now();
        const elapsedTime = endTime - startTime;
        AppLog.aiTiming(`ExhaustiveSearch (${this.color}): Evaluation completed in ${elapsedTime.toFixed(2)}ms`);

        if (bestMove) {
            AppLog.ai(`ExhaustiveSearch: Best move is piece ${bestMove.move.movingPieceIndex} to ${bestMove.move.destinationSquare} with score ${bestMove.score.toFixed(2)}`);
        }

        return bestMove;
    }

    /**
     * Minimax algorithm with alpha-beta pruning
     * @param gameState Current game state
     * @param depth Remaining depth to search
     * @param isMaximizingPlayer True if this is the maximizing player's turn
     * @param alpha Alpha value for pruning
     * @param beta Beta value for pruning
     * @returns Expected value of this position
     */
    private async minimax(gameState: GameState, depth: number, isMaximizingPlayer: boolean, alpha: number, beta: number): Promise<number> {
        // Base case: reached max depth or game over
        if (depth <= 0) {
            return PlayerAgentUtils.evaluateGameState(gameState, this.color, EXHAUSTIVE_CONFIG.ADVANCEMENT_GAMMA);
        }

        // Check for win condition
        const winner = gameState.checkWinCondition();
        if (winner === this.color) return EXHAUSTIVE_CONFIG.END_GAME_BONUS + depth; // Prefer quicker wins
        if (winner && winner !== this.color) return -EXHAUSTIVE_CONFIG.END_GAME_BONUS - depth; // Prefer later losses

        const currentPlayer = gameState.state.currentPlayer;
        const isOurTurn = currentPlayer === this.color;

        // If no dice have been rolled yet, we need to consider all possible dice outcomes
        if (gameState.state.diceRolls.length === 0) {
            return await this.evaluateAllDiceOutcomes(gameState, depth, isMaximizingPlayer, alpha, beta);
        }

        // Dice have been rolled, evaluate all possible moves
        const legalMoves = gameState.getAllMoveOptions();

        if (isMaximizingPlayer === isOurTurn) {
            // Maximizing player (us when it's our turn, opponent when it's their turn and we're minimizing)
            let maxEval = -Infinity;

            for (let i = 0; i < legalMoves.length; i++) {
                const move = legalMoves[i];
                const clonedState = this.cloneGameState(gameState);
                clonedState.startLegalMove(move);

                const evaluation = await this.minimax(clonedState, depth - 1, !isMaximizingPlayer, alpha, beta);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);

                if (beta <= alpha) {
                    break; // Beta cutoff
                }

                // Yield to UI if 200ms have passed
                await this.periodicallyYield();
            }

            return maxEval;
        } else {
            // Minimizing player
            let minEval = Infinity;

            for (let i = 0; i < legalMoves.length; i++) {
                const move = legalMoves[i];
                const clonedState = this.cloneGameState(gameState);
                clonedState.startLegalMove(move);

                const evaluation = await this.minimax(clonedState, depth - 1, !isMaximizingPlayer, alpha, beta);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);

                if (beta <= alpha) {
                    break; // Alpha cutoff
                }

                // Yield to UI if 200ms have passed
                await this.periodicallyYield();
            }

            return minEval;
        }
    }

    /**
     * Evaluate all possible dice outcomes weighted by their probability
     */
    private async evaluateAllDiceOutcomes(gameState: GameState, depth: number, isMaximizingPlayer: boolean, alpha: number, beta: number): Promise<number> {
        let expectedValue = 0;

        for (let i = 0; i < this.diceOutcomes.length; i++) {
            const outcome = this.diceOutcomes[i];
            const clonedState = this.cloneGameState(gameState);

            // Simulate this dice roll by setting the number of ones
            clonedState.setSpecificDiceRoll(outcome.total);

            // Recursively evaluate this outcome
            const outcomeValue = await this.minimax(clonedState, depth, isMaximizingPlayer, alpha, beta);

            // Weight by probability
            expectedValue += outcomeValue * outcome.probability;

            // Yield to UI if 200ms have passed
            await this.periodicallyYield();
        }

        return expectedValue;
    }

    /**
     * Generate all possible dice outcomes with their probabilities
     * Called once during construction to pre-calculate outcomes for the rule set
     * For binary dice, there are 2^diceCount possible outcomes
     */
    private generateAllDiceOutcomes(gameState: GameState): DiceOutcome[] {
        const outcomes: DiceOutcome[] = [];
        const diceCount = gameState.getCurrentRuleSet().diceCount;
        const totalOutcomes = Math.pow(2, diceCount);

        // Generate all binary combinations
        for (let i = 0; i < totalOutcomes; i++) {
            const diceRolls: number[] = [];

            // Convert number to binary representation
            for (let j = 0; j < diceCount; j++) {
                diceRolls.push((i >> j) & 1);
            }

            const total = diceRolls.reduce((sum, value) => sum + value, 0);
            const probability = 1 / totalOutcomes; // Each outcome equally likely

            outcomes.push({
                diceRolls,
                total,
                probability
            });
        }

        return outcomes;
    }

    /**
     * Create a deep clone of the game state for simulation
     */
    private cloneGameState(gameState: GameState): GameState {
        // Use the proper clone method from GameState
        return gameState.clone();
    }

    /**
     * Yields to UI if 100ms have passed since the last yield
     */
    private async periodicallyYield(): Promise<void> {
        const currentTime = performance.now();
        if (currentTime - this.lastYieldTime >= 100) {
            await PlayerAgentUtils.yieldToUI();
            this.lastYieldTime = currentTime;
        }
    }
}
