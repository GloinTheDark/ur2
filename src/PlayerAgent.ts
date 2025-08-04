import React from 'react';
import { GameState } from './GameState';
import type { DiceRollerRef } from './DiceRoller';

export type PlayerType = 'human' | 'computer';

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

export class HumanPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'human';
    readonly color: 'white' | 'black';

    constructor(color: 'white' | 'black') {
        this.color = color;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onTurnStart(_gameState: GameState): Promise<void> {
        // For human players, the UI handles dice rolling
        // This is a no-op since humans interact directly with the UI
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onMoveRequired(_gameState: GameState): Promise<void> {
        // For human players, the UI handles piece selection and movement
        // This is a no-op since humans interact directly with the UI
    }

    getPlayerName(): string {
        return this.color.charAt(0).toUpperCase() + this.color.slice(1);
    }

    cleanup(): void {
        // No cleanup needed for human players
    }
}

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

// AI timing constants (in milliseconds)
const AI_DELAYS = {
    ROLL_DICE: 500,
    THINK: 1000,
    MOVE_PIECE: 300
} as const;

export class ComputerPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'computer';
    readonly color: 'white' | 'black';
    private difficulty: 'easy' | 'medium' | 'hard';
    private diceRollerRef: React.RefObject<DiceRollerRef | null>;

    constructor(color: 'white' | 'black', difficulty: 'easy' | 'medium' | 'hard' = 'medium', diceRollerRef: React.RefObject<DiceRollerRef | null>) {
        this.color = color;
        this.difficulty = difficulty;
        this.diceRollerRef = diceRollerRef;
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
            await this.delay(AI_DELAYS.ROLL_DICE);

            // Use animated roll if available and animations are enabled
            if (this.diceRollerRef.current && gameState.gameSettings.diceAnimations) {
                this.diceRollerRef.current.triggerRoll();
            } else {
                // Fall back to direct roll if animations are disabled or ref is not available
                gameState.rollDice();
            }
        }
    }

    async onMoveRequired(gameState: GameState): Promise<void> {
        // PlayerManager ensures this is only called for computer players

        // Defensive check: only act if it's actually this computer's turn
        if (gameState.state.currentPlayer !== this.color) {
            return;
        }

        // Don't act if a piece has already been selected (prevents multiple calls)
        if (gameState.state.selectedPiece !== null) {
            return;
        }

        // Add thinking delay
        await this.delay(AI_DELAYS.THINK);

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
        await this.delay(AI_DELAYS.MOVE_PIECE);
        gameState.movePiece(selectedPieceIndex);
    }

    cleanup(): void {
        // No cleanup needed for computer players
    }

    getPlayerName(): string {
        return `Computer (${this.difficulty})`;
    }

    private selectBestMove(gameState: GameState, eligiblePieces: number[]): number {
        const rankedMoves = this.rankMoves(gameState, eligiblePieces);

        // Ensure we have moves to choose from
        if (rankedMoves.length === 0) {
            return eligiblePieces[0]; // Fallback to first eligible piece
        }

        // Select move based on difficulty
        switch (this.difficulty) {
            case 'easy':
                // Choose the worst move (lowest score)
                return rankedMoves[rankedMoves.length - 1].pieceIndex;

            case 'medium':
                // Choose a random move from all available moves
                return rankedMoves[Math.floor(Math.random() * rankedMoves.length)].pieceIndex;

            case 'hard':
            default:
                // Choose the best move (highest score)
                return rankedMoves[0].pieceIndex;
        }
    }

    private rankMoves(gameState: GameState, eligiblePieces: number[]): MoveEvaluation[] {
        const moves: MoveEvaluation[] = [];

        for (const pieceIndex of eligiblePieces) {
            const evaluation = this.evaluateMove(gameState, pieceIndex);
            moves.push(evaluation);
        }

        // Sort by score (highest first)
        return moves.sort((a, b) => b.score - a.score);
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

        // Skip evaluation for pieces that are currently moving (in animation)
        if (currentPosition === 'moving') {
            return {
                pieceIndex,
                score: AI_SCORES.INVALID_MOVE,
                reasons: ['Piece is currently moving']
            };
        }

        // Base scoring based on move type
        if (legalMove.destinationSquare === 'complete') {
            // Piece completes the circuit - highest priority
            score += AI_SCORES.PIECE_COMPLETION;
            reasons.push('Piece reaches home (wins!)');
        } else if (currentPosition === 'start') {
            // Getting piece into play
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
        if (currentPosition !== 'start' && typeof currentPosition === 'number') {
            const pathIndex = currentPosition;
            score += Math.floor(pathIndex / 2); // Small bonus for advancement
            reasons.push(`Advancing piece at position ${pathIndex}`);
        }

        // Penalty for moves that put piece in danger (only if not landing on safe square)
        if (legalMove.destinationSquare !== 'complete' && typeof legalMove.destinationSquare === 'number') {
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
        opponentPositions: (number | 'start' | 'moving')[]
    ): boolean {
        return opponentPositions.some(pos => {
            if (pos === 'start' || pos === 'moving') return false;
            const opponentPathIndex = pos as number;

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
