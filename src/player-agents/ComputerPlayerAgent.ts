import { GameState } from '../GameState';
import { AppLog } from '../AppSettings';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import { AI_DELAYS } from './PlayerAgent';

interface MoveEvaluation {
    pieceIndex: number;
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

        const eligiblePieces = gameState.state.eligiblePieces;
        AppLog.ai(`AI onMoveRequired: Found ${eligiblePieces.length} eligible pieces: [${eligiblePieces.join(', ')}]`);

        if (eligiblePieces.length === 0) {
            // No moves available, pass turn
            AppLog.playerAgent(`AI onMoveRequired: No eligible pieces, checking if should pass turn`);
            if (gameState.shouldShowPassButton()) {
                AppLog.playerAgent(`AI onMoveRequired: Passing turn`);
                // Add a short delay to make it feel more natural
                await this.delay(AI_DELAYS.MIN_THINK);
                gameState.passTurn();
            } else {
                AppLog.playerAgent(`AI onMoveRequired: Pass button not available, not passing`);
            }
            return;
        }

        // Select a piece based on heuristic strategy with timing
        AppLog.ai(`AI onMoveRequired: Selecting best move with heuristic analysis`);
        const thinkStartTime = performance.now();
        const selectedPieceIndex = await this.selectBestMove(gameState, eligiblePieces);
        const actualThinkTime = performance.now() - thinkStartTime;
        AppLog.ai(`AI onMoveRequired: Selected piece ${selectedPieceIndex}`);

        // Delay to ensure minimum thinking time
        const minThinkTime = AI_DELAYS.MIN_THINK;
        const remainingThinkTime = Math.max(0, minThinkTime - actualThinkTime);
        if (remainingThinkTime > 0) {
            AppLog.playerAgent(`AI onMoveRequired: Adding ${remainingThinkTime.toFixed(0)}ms delay to reach minimum think time`);
            await this.delay(remainingThinkTime);
        }

        gameState.selectPiece(selectedPieceIndex);

        // Small delay before moving
        await this.delay(AI_DELAYS.MOVE_PIECE);
        AppLog.playerAgent(`AI onMoveRequired: Moving piece ${selectedPieceIndex}`);
        gameState.movePiece(selectedPieceIndex);
        AppLog.playerAgent(`AI onMoveRequired: Move completed for ${this.color} player`);
    }

    cleanup(): void {
        // No cleanup needed for computer players
    }

    getPlayerName(): string {
        return 'Computer';
    }

    private async selectBestMove(gameState: GameState, eligiblePieces: number[]): Promise<number> {
        // Use simple heuristic evaluation to choose the best move
        const rankedMoves = this.rankMoves(gameState, eligiblePieces);

        // Ensure we have moves to choose from
        if (rankedMoves.length === 0) {
            return eligiblePieces[0]; // Fallback to first eligible piece
        }

        // Choose the best move (highest score)
        return rankedMoves[0].pieceIndex;
    }

    // Public method for debug purposes - allows external access to AI decision making
    public async evaluateAndSelectPiece(gameState: GameState, eligiblePieces: number[]): Promise<number> {
        return await this.selectBestMove(gameState, eligiblePieces);
    }

    private rankMoves(gameState: GameState, eligiblePieces: number[]): MoveEvaluation[] {
        AppLog.ai(`AI: Ranking ${eligiblePieces.length} eligible pieces for ${this.color} player`);

        const moves: MoveEvaluation[] = [];

        for (const pieceIndex of eligiblePieces) {
            const evaluation = this.evaluateMove(gameState, pieceIndex);
            moves.push(evaluation);
        }

        // Sort by score (highest first)
        const rankedMoves = moves.sort((a, b) => b.score - a.score);

        // Log the ranking results
        AppLog.ai(`AI: Move rankings for ${this.color}:`);
        rankedMoves.forEach((move, index) => {
            AppLog.ai(`  ${index + 1}. Piece ${move.pieceIndex}: ${move.score} points (${move.reasons.join(', ')})`);
        });

        return rankedMoves;
    }

    private evaluateMove(gameState: GameState, pieceIndex: number): MoveEvaluation {
        let score = 0;
        const reasons: string[] = [];

        // Find the legal move for this piece
        const legalMove = gameState.getLegalMoves().find(move => move.pieceIndex === pieceIndex);
        if (!legalMove) {
            return {
                pieceIndex,
                score: AI_SCORES.INVALID_MOVE,
                reasons: ['No legal move found for piece']
            };
        }

        // Get current position
        const myPositions = this.color === 'white' ? gameState.state.whitePiecePositions : gameState.state.blackPiecePositions;
        const currentPosition = myPositions[pieceIndex];

        // Skip evaluation for pieces that are captured/moving (position -1)
        if (currentPosition === -1) {
            return {
                pieceIndex,
                score: AI_SCORES.INVALID_MOVE,
                reasons: ['Piece is currently captured or moving']
            };
        }

        // Base scoring based on move type
        if (legalMove.destinationSquare === 25) { // BOARD_FINISH
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
        if (legalMove.capture) {
            score += AI_SCORES.CAPTURE;
            reasons.push('Capturing opponent piece');
        }

        // Bonus for extra turns (rosettes, captures, or bear-off depending on rule set)
        if (legalMove.extraTurn) {
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
        if (legalMove.destinationSquare !== 25) {
            const destinationSquare = legalMove.destinationSquare;
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
            pieceIndex,
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
