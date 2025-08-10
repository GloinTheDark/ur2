import { GameState, type Move } from '../GameState';
import { AppLog } from '../AppSettings';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import { AI_DELAYS } from './PlayerAgent';

interface MoveEvaluation {
    move: Move;
    score: number;
    reasons: string[];
}

// AI scoring constants
const AI_SCORES = {
    PIECE_COMPLETION: 50,
    CAPTURE: 25,
    EXTRA_TURN: 15,
    ENTER_PLAY: 10,
    ADVANCE_PIECE: 5,
    SAFE_SQUARE: 8,
    DANGER_PENALTY: -10,
    INVALID_MOVE: -1000
} as const;

// Monte Carlo simulation constants
const MCTS_CONFIG = {
    SIMULATIONS: 300,
    MAX_DEPTH: 5,
    ADVANCEMENT_GAMMA: 1.5, // Gamma curve for piece advancement scoring (1.0 = linear, >1.0 = progressive)
    HEURISTIC_WEIGHT: 0.0 // Weight for heuristic vs simulation (0.0 = pure simulation, 1.0 = pure heuristic)
} as const;

export class MCTSPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'computer';
    readonly color: 'white' | 'black';

    constructor(color: 'white' | 'black') {
        this.color = color;
    }

    async onTurnStart(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`MCTS onTurnStart: ${this.color} player called`);

        // Computer automatically rolls dice when it's their turn
        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            AppLog.playerAgent(`MCTS onTurnStart: Not ${this.color}'s turn (current: ${gameState.state.currentPlayer}), returning`);
            return;
        }

        if (gameState.state.gamePhase === 'playing' &&
            gameState.state.diceRolls.length === 0) {

            AppLog.playerAgent(`MCTS onTurnStart: Rolling dice for ${this.color} player`);

            // Add a small delay to make it feel more natural
            await this.delay(AI_DELAYS.ROLL_DICE);

            // Use centralized dice roll function
            gameState.startDiceRoll();
        } else {
            AppLog.playerAgent(`MCTS onTurnStart: Not rolling dice - gamePhase: ${gameState.state.gamePhase}, diceRolls: ${gameState.state.diceRolls.length}`);
        }
    }

    async onMoveRequired(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`MCTS onMoveRequired: ${this.color} player called`);

        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            AppLog.playerAgent(`MCTS onMoveRequired: Not ${this.color}'s turn (current: ${gameState.state.currentPlayer}), returning`);
            return;
        }

        // Don't act if a piece has already been selected (prevents multiple calls)
        if (gameState.state.selectedPiece !== null) {
            AppLog.playerAgent(`MCTS onMoveRequired: Piece already selected (${gameState.state.selectedPiece}), returning`);
            return;
        }

        AppLog.ai(`MCTS onMoveRequired: Thinking with Monte Carlo Tree Search...`);

        // Select a piece using Monte Carlo Tree Search with timing
        AppLog.ai(`MCTS onMoveRequired: Running MCTS analysis`);
        const thinkStartTime = performance.now();
        const move = await this.selectMCTSMove(gameState);
        const actualThinkTime = performance.now() - thinkStartTime;
        AppLog.ai(`MCTS onMoveRequired: Selected piece ${move}`);

        // Delay to ensure minimum thinking time
        const minThinkTime = AI_DELAYS.MIN_THINK;
        const remainingThinkTime = Math.max(0, minThinkTime - actualThinkTime);
        if (remainingThinkTime > 0) {
            AppLog.playerAgent(`MCTS onMoveRequired: Adding ${remainingThinkTime.toFixed(0)}ms delay to reach minimum think time`);
            await this.delay(remainingThinkTime);
        }

        gameState.selectPiece(move.movingPieceIndex);

        // Small delay before moving
        await this.delay(AI_DELAYS.MOVE_PIECE);
        AppLog.playerAgent(`MCTS onMoveRequired: Moving piece ${move.movingPieceIndex} to ${move.destinationSquare}`);
        gameState.startLegalMove(move);
        AppLog.playerAgent(`MCTS onMoveRequired: Move completed for ${this.color} player`);
    }

    cleanup(): void {
        // No cleanup needed for computer players
    }

    getPlayerName(): string {
        return 'Computer (MCTS)';
    }

    private async selectMCTSMove(gameState: GameState): Promise<Move> {
        const startTime = performance.now();

        const legalMoves = gameState.getAllMoveOptions();

        if (legalMoves.length === 1) {
            return legalMoves[0];
        }

        let bestMove = legalMoves[0];
        let bestScore = -Infinity;

        AppLog.mcts(`MCTS: Evaluating ${legalMoves.length} possible moves with ${MCTS_CONFIG.SIMULATIONS} simulations each`);

        // Evaluate each possible move using Monte Carlo simulations
        for (const move of legalMoves) {
            const score = await this.evaluateMoveWithMCTS(gameState, move);

            // Get piece starting position for logging
            const myPositions = this.color === 'white' ? gameState.state.whitePiecePositions : gameState.state.blackPiecePositions;
            const startPosition = myPositions[move.movingPieceIndex];

            AppLog.mcts(`MCTS: Piece ${move.movingPieceIndex} (pos: ${startPosition}) scored ${score.toFixed(4)}`);

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }

            // Yield time to UI between move evaluations
            await this.yieldToUI();
        }

        const elapsedTime = performance.now() - startTime;
        AppLog.mcts(`MCTS: Total time ${elapsedTime.toFixed(2)}ms`);

        // Warn if we exceed our 500ms budget
        if (elapsedTime > 1500) {
            AppLog.mcts(`MCTS: Exceeded time budget! ${elapsedTime.toFixed(2)}ms > 1500ms`);
        }

        AppLog.mcts(`MCTS: Selected piece ${bestMove.movingPieceIndex} with score ${bestScore.toFixed(4)}`);

        return bestMove;
    }

    // Public method for debug purposes - allows external access to AI decision making
    public async evaluateAndSelectPiece(gameState: GameState): Promise<number> {
        return (await this.selectMCTSMove(gameState)).movingPieceIndex;
    }

    private async evaluateMoveWithMCTS(gameState: GameState, move: Move): Promise<number> {
        // Get the heuristic evaluation as a baseline
        const heuristicEval = this.evaluateMove(gameState, move);
        const heuristicScore = heuristicEval.score;

        // For debugging: log the heuristic evaluation
        AppLog.mcts(`MCTS Debug: Piece ${move.movingPieceIndex} heuristic: ${heuristicScore} (${heuristicEval.reasons.join(', ')})`);

        // Normalize the heuristic score to a reasonable range for MCTS
        if (heuristicScore === AI_SCORES.INVALID_MOVE) {
            return -1; // Invalid moves get strongly negative scores
        }

        // Convert heuristic score to a 0-1 range for MCTS
        const normalizedHeuristic = Math.max(0, heuristicScore) / 100;

        // Run simulations
        let totalScore = 0;
        const simulations = MCTS_CONFIG.SIMULATIONS;
        let successfulSimulations = 0;

        // Yield time to UI periodically during simulations
        const yieldInterval = 25; // Yield every 25 simulations

        for (let i = 0; i < simulations; i++) {
            try {
                // Clone the game state for simulation
                const simulatedState = this.cloneGameState(gameState);

                // Make the move we're evaluating
                simulatedState.selectPiece(move.movingPieceIndex);
                simulatedState.startLegalMove(move);

                // Run simulation - extra turns will be valued naturally through position evaluation
                const simulationScore = this.runSimulation(simulatedState, MCTS_CONFIG.MAX_DEPTH);

                totalScore += simulationScore;
                successfulSimulations++;
            } catch {
                // If simulation fails, don't count it
                continue;
            }

            // Yield time to UI periodically
            if (i > 0 && i % yieldInterval === 0) {
                await this.yieldToUI();
            }
        }

        if (successfulSimulations === 0) {
            return normalizedHeuristic; // Fall back to heuristic if all simulations failed
        }

        const averageSimulation = totalScore / successfulSimulations;

        // Combine heuristic (immediate tactical value) with simulation (strategic value)
        // Weight controlled by MCTS_CONFIG.HEURISTIC_WEIGHT
        const simulationComponent = averageSimulation / 1000; // Scale simulation score
        const heuristicWeight = MCTS_CONFIG.HEURISTIC_WEIGHT;
        const simulationWeight = 1.0 - heuristicWeight;
        const finalScore = (heuristicWeight * normalizedHeuristic) + (simulationWeight * simulationComponent);

        // For debugging: log the components
        AppLog.mcts(`MCTS Debug: Piece ${move.movingPieceIndex} simulation avg: ${averageSimulation.toFixed(2)}, final: ${finalScore.toFixed(4)}`);

        return finalScore;
    }

    private runSimulation(gameState: GameState, depth: number): number {
        if (depth <= 0) {
            return this.evaluateGameState(gameState);
        }

        // Check for win condition
        const winner = gameState.checkWinCondition();
        if (winner === this.color) return 1000;
        if (winner && winner !== this.color) return -1000;

        // Only roll dice if no dice have been rolled yet for this turn
        if (gameState.state.diceRolls.length === 0) {
            gameState.rollDice();
        }

        const legalMoves = gameState.getAllMoveOptions();

        if (legalMoves.length === 0) {
            // No legal moves available, evaluate current position
            return this.evaluateGameState(gameState);
        }

        // For MCTS, we want to sample the space randomly, not find the best move
        // Pick a random move instead of trying to find the optimal one
        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];

        const clonedState = this.cloneGameState(gameState);

        // Make the random move
        clonedState.selectPiece(randomMove.movingPieceIndex);
        clonedState.startLegalMove(randomMove);

        // Continue simulation with random play
        return this.runSimulation(clonedState, depth - 1);
    }

    private evaluateGameState(gameState: GameState): number {
        // Use a simplified position evaluation
        const myPositions = this.color === 'white' ? gameState.state.whitePiecePositions : gameState.state.blackPiecePositions;
        const opponentPositions = this.color === 'white' ? gameState.state.blackPiecePositions : gameState.state.whitePiecePositions;

        let score = 0;

        // Get path length for scoring completed pieces
        const myPath = gameState.getPlayerPath(this.color);
        const pathLength = myPath.length;
        const completedPieceValue = pathLength * 2; // 2x path length

        // Count completed pieces (pieces at position 0 that show spots)
        const myCompleted = myPositions.filter((pos) => pos === gameState.getEndOfPath()).length;
        const opponentCompleted = opponentPositions.filter((pos) => pos === gameState.getEndOfPath()).length;

        score += myCompleted * completedPieceValue;
        score -= opponentCompleted * completedPieceValue;

        // Evaluate piece advancement using gamma curve
        myPositions.forEach(pos => {
            if (pos !== 0 && pos !== -1) { // Not at start, not captured/moving
                const advancementScore = this.calculateAdvancementScore(pos, pathLength);
                score += advancementScore;
            }
        });

        opponentPositions.forEach(pos => {
            if (pos !== 0 && pos !== -1) { // Not at start, not captured/moving
                const advancementScore = this.calculateAdvancementScore(pos, pathLength);
                score -= advancementScore; // Opponent advancement hurts us
            }
        });

        return score;
    }

    /**
     * Calculate advancement score using a gamma curve
     * @param position Current position on the path (0-based index)
     * @param pathLength Total length of the path
     * @returns Progressive score based on position
     */
    private calculateAdvancementScore(position: number, pathLength: number): number {
        // Normalize position to 0-1 range
        const normalizedPosition = position / (pathLength - 1);

        // Apply gamma curve: score = (normalizedPosition ^ gamma) * maxScore
        // Gamma > 1.0 creates a progressive curve (low early values, high late values)
        // Gamma < 1.0 creates a regressive curve (high early values, low late values)
        // Gamma = 1.0 is linear
        const gamma = MCTS_CONFIG.ADVANCEMENT_GAMMA;
        const curvedValue = Math.pow(normalizedPosition, gamma);

        // Scale to a reasonable score range (0 to pathLength)
        return curvedValue * pathLength;
    }

    private cloneGameState(gameState: GameState): GameState {
        // Use the proper clone method from GameState
        return gameState.clone();
    }

    private evaluateMove(gameState: GameState, move: Move): MoveEvaluation {
        let score = 0;
        const reasons: string[] = [];

        // Find the legal move for this piece
        if (!move) {
            return {
                move,
                score: AI_SCORES.INVALID_MOVE,
                reasons: ['No legal move found for piece']
            };
        }

        // Get current position
        const currentPosition = move.fromPosition;

        // Skip evaluation for pieces that are captured/moving (position -1)
        if (currentPosition === -1) {
            return {
                move,
                score: AI_SCORES.INVALID_MOVE,
                reasons: ['Piece is currently captured or moving']
            };
        }

        // Base scoring based on move type
        if (move.destinationSquare === 25) { // BOARD_FINISH
            // Piece completes the circuit - highest priority
            score += AI_SCORES.PIECE_COMPLETION;
            reasons.push('Piece reaches home (wins!)');
        } else if (currentPosition === 0) {
            // Getting piece into play from start
            score += AI_SCORES.ENTER_PLAY;
            reasons.push('Getting piece into play');
        } else {
            // Advancing piece on board
            score += AI_SCORES.ADVANCE_PIECE;
            reasons.push('Advancing piece');
        }

        // Bonus for capturing opponent pieces
        if (move.capture) {
            score += AI_SCORES.CAPTURE;
            reasons.push('Capturing opponent piece');
        }

        // Bonus for extra turns (rosettes, captures, or bear-off depending on rule set)
        if (move.extraTurn) {
            score += AI_SCORES.EXTRA_TURN;
            reasons.push('Gets extra turn');
        }

        // Positional bonus for pieces further along the path
        if (currentPosition !== 0 && currentPosition !== -1) {
            const pathIndex = currentPosition;
            score += Math.floor(pathIndex / 2); // Small bonus for advancement
            reasons.push(`Advancing piece at position ${pathIndex}`);
        }

        // Penalty for moves that put piece in danger (only if not landing on safe square)
        if (move.destinationSquare !== 25) {
            const destinationSquare = move.destinationSquare;
            const ruleSet = gameState.getCurrentRuleSet();
            const safeSquares = ruleSet.getSafeSquares();

            if (!safeSquares.includes(destinationSquare)) {
                // Check if opponent could capture us on next turn
                const opponentPlayer = this.color === 'white' ? 'black' : 'white';
                const opponentPath = gameState.getPlayerPath(opponentPlayer);
                const opponentPositions = this.color === 'white' ? gameState.state.blackPiecePositions : gameState.state.whitePiecePositions;

                const isDangerous = this.isPositionDangerous(destinationSquare, opponentPath, opponentPositions);

                if (isDangerous) {
                    score += AI_SCORES.DANGER_PENALTY;
                    reasons.push('Move puts piece in danger');
                }
            } else {
                score += AI_SCORES.SAFE_SQUARE;
                reasons.push('Moving to safe square');
            }
        }

        return {
            move,
            score,
            reasons
        };
    }

    private isPositionDangerous(
        destinationSquare: number,
        opponentPath: number[],
        opponentPositions: number[]
    ): boolean {
        return opponentPositions.some(pos => {
            if (pos === 0 || pos === -1) return false; // Skip start and captured/moving pieces
            const opponentPathIndex = pos;

            // Check if opponent could reach our destination with any dice roll (1-4)
            for (let roll = 1; roll <= 4; roll++) {
                const targetIndex = opponentPathIndex + roll;
                if (targetIndex < opponentPath.length && opponentPath[targetIndex] === destinationSquare) {
                    return true;
                }
            }
            return false;
        });
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Yield time to the UI to keep it responsive during long computations
    private yieldToUI(): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, 0));
    }
}
