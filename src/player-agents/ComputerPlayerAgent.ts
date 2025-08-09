import { GameState, type Move } from '../GameState';
import { AppLog } from '../AppSettings';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import { AI_DELAYS } from './PlayerAgent';

interface MoveEvaluation {
    move: Move
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
    PASS_TURN_BASE: 2, // Base score for passing (conservative play)
    PASS_AVOID_DANGER: 8, // Bonus for passing to avoid putting pieces in danger
    PASS_PRESERVE_POSITION: 5, // Bonus for passing to maintain good board position
    INVALID_MOVE: -1000
} as const;

export class ComputerPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'computer';
    readonly color: 'white' | 'black';

    constructor(color: 'white' | 'black') {
        this.color = color;
    }

    async onTurnStart(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`AI onTurnStart: ${this.color} player called`);

        // Computer automatically rolls dice when it's their turn
        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            AppLog.playerAgent(`AI onTurnStart: Not ${this.color}'s turn (current: ${gameState.state.currentPlayer}), returning`);
            return;
        }

        if (gameState.state.gamePhase === 'playing' &&
            gameState.state.diceRolls.length === 0) {

            AppLog.playerAgent(`AI onTurnStart: Rolling dice for ${this.color} player`);

            // Add a small delay to make it feel more natural
            await this.delay(AI_DELAYS.ROLL_DICE);

            // Use centralized dice roll function
            gameState.startDiceRoll();
        } else {
            AppLog.playerAgent(`AI onTurnStart: Not rolling dice - gamePhase: ${gameState.state.gamePhase}, diceRolls: ${gameState.state.diceRolls.length}`);
        }
    }

    async onMoveRequired(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`AI onMoveRequired: ${this.color} player called`);

        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            AppLog.playerAgent(`AI onMoveRequired: Not ${this.color}'s turn (current: ${gameState.state.currentPlayer}), returning`);
            return;
        }

        // Don't act if a piece has already been selected (prevents multiple calls)
        if (gameState.state.selectedPiece !== null) {
            AppLog.playerAgent(`AI onMoveRequired: Piece already selected (${gameState.state.selectedPiece}), returning`);
            return;
        }

        AppLog.ai(`AI onMoveRequired: Thinking with heuristic analysis...`);

        // Select a piece based on heuristic strategy with timing
        AppLog.ai(`AI onMoveRequired: Selecting best move with heuristic analysis`);
        const thinkStartTime = performance.now();
        const bestMove = await this.selectBestMove(gameState);
        const actualThinkTime = performance.now() - thinkStartTime;
        if (!bestMove) {
            AppLog.playerAgent(`AI onMoveRequired: Best option is to pass turn`);
            await this.delay(AI_DELAYS.MIN_THINK);
            gameState.passTurn();
            return;
        }
        AppLog.ai(`AI onMoveRequired: Selected move ${bestMove.movingPieceIndex} to ${bestMove.destinationSquare} in ${actualThinkTime.toFixed(0)}ms`);

        // Delay to ensure minimum thinking time
        const minThinkTime = AI_DELAYS.MIN_THINK;
        const remainingThinkTime = Math.max(0, minThinkTime - actualThinkTime);
        if (remainingThinkTime > 0) {
            AppLog.playerAgent(`AI onMoveRequired: Adding ${remainingThinkTime.toFixed(0)}ms delay to reach minimum think time`);
            await this.delay(remainingThinkTime);
        }

        gameState.selectPiece(bestMove.movingPieceIndex);

        // Small delay before moving
        await this.delay(AI_DELAYS.MOVE_PIECE);
        gameState.startLegalMove(bestMove);
        AppLog.playerAgent(`AI onMoveRequired: Move completed for ${this.color} player`);
    }

    cleanup(): void {
        // No cleanup needed for computer players
    }

    getPlayerName(): string {
        return 'Computer';
    }

    private async selectBestMove(gameState: GameState): Promise<Move> {
        // Use simple heuristic evaluation to choose the best move
        const rankedMoves = this.rankMoves(gameState);

        // Ensure we have moves to choose from
        if (rankedMoves.length === 0) {
            throw new Error(`No legal moves available for ${this.color} player`);
        }

        // Choose the best move (highest score)
        const bestEvaluation = rankedMoves[0];

        return bestEvaluation.move;
    }

    // Public method for debug purposes - allows external access to AI decision making
    public async evaluateAndSelectPiece(gameState: GameState): Promise<number> {
        const bestMove = await this.selectBestMove(gameState);
        return bestMove.movingPieceIndex;
    }

    private rankMoves(gameState: GameState): MoveEvaluation[] {
        const moves = gameState.getAllMoveOptions();
        AppLog.ai(`AI: Ranking ${moves.length} eligible pieces for ${this.color} player`);

        const evaluatedMoves: MoveEvaluation[] = [];

        for (const move of moves) {
            const evaluation = this.evaluateMove(gameState, move);
            evaluatedMoves.push(evaluation);
        }

        // Sort by score (highest first)
        const rankedMoves = evaluatedMoves.sort((a, b) => b.score - a.score);

        // Log the ranking results
        AppLog.ai(`AI: Move rankings for ${this.color}:`);
        rankedMoves.forEach((move, index) => {
            if (move.move === null) {
                AppLog.ai(`  ${index + 1}. Pass Turn: ${move.score} points (${move.reasons.join(', ')})`);
            } else {
                AppLog.ai(`  ${index + 1}. Piece ${move.move.movingPieceIndex}: ${move.score} points (${move.reasons.join(', ')})`);
            }
        });

        return rankedMoves;
    }

    private evaluateMove(gameState: GameState, move: Move): MoveEvaluation {
        let score = 0;
        const reasons: string[] = [];

        // Get current position
        const currentPosition = move.fromPosition;

        // Base scoring based on move type
        if (move.destinationSquare === 25) { // BOARD_FINISH
            // Piece completes the circuit - highest priority
            score += AI_SCORES.PIECE_COMPLETION;
            reasons.push('Piece reaches home (wins!)');
        } else if (currentPosition === 0) {
            // Getting piece into play from start
            score += AI_SCORES.ENTER_PLAY;
            reasons.push('Getting piece into play');
        } else if (move.backwards) {
            score -= AI_SCORES.ADVANCE_PIECE;
            reasons.push('Moving piece backwards');
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
}
