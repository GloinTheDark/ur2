import React from 'react';
import { GameState } from './GameState';
import { WHITE_PATH, BLACK_PATH, BoardUtils } from './BoardLayout';
import type { DiceRollerRef } from './DiceRoller';

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

interface MoveEvaluation {
    pieceIndex: number;
    score: number;
    reasons: string[];
}

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
            await this.delay(500);

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
        // Rank all possible moves
        const rankedMoves = this.rankMoves(gameState, eligiblePieces);

        // Select move based on difficulty
        switch (this.difficulty) {
            case 'easy':
                // Choose the worst move
                return rankedMoves[rankedMoves.length - 1].pieceIndex;
            case 'medium':
                // Choose a random move
                return rankedMoves[Math.floor(Math.random() * rankedMoves.length)].pieceIndex;
            case 'hard':
                // Choose the best move
                return rankedMoves[0].pieceIndex;
            default:
                return rankedMoves[0].pieceIndex;
        }
    }

    private rankMoves(gameState: GameState, eligiblePieces: number[]): MoveEvaluation[] {
        const moves: MoveEvaluation[] = [];
        const diceTotal = gameState.state.diceTotal;
        const myPositions = this.color === 'white' ? gameState.state.whitePiecePositions : gameState.state.blackPiecePositions;
        const opponentPositions = this.color === 'white' ? gameState.state.blackPiecePositions : gameState.state.whitePiecePositions;

        for (const pieceIndex of eligiblePieces) {
            const evaluation = this.evaluateMove(pieceIndex, diceTotal, myPositions, opponentPositions);
            moves.push(evaluation);
        }

        // Sort by score (highest first)
        return moves.sort((a, b) => b.score - a.score);
    }

    private evaluateMove(
        pieceIndex: number,
        diceTotal: number,
        myPositions: (number | 'start' | 'moving')[],
        opponentPositions: (number | 'start' | 'moving')[]
    ): MoveEvaluation {
        let score = 0;
        const reasons: string[] = [];
        const currentPosition = myPositions[pieceIndex];

        // Skip evaluation for pieces that are currently moving (in animation)
        if (currentPosition === 'moving') {
            return {
                pieceIndex,
                score: -1000, // Very low score to avoid selecting moving pieces
                reasons: ['Piece is currently moving']
            };
        }

        // Get the path for this player
        const path = this.color === 'white' ? WHITE_PATH : BLACK_PATH;

        // Calculate destination position
        let destinationSquare: number | undefined;

        if (currentPosition === 'start') {
            // Moving from start
            if (diceTotal <= path.length) {
                destinationSquare = path[diceTotal - 1];
                score += 10; // Base score for getting a piece in play
                reasons.push('Getting piece into play');
            }
        } else {
            // Moving piece already on board (currentPosition is guaranteed to be number here)
            const currentIndex = path.indexOf(currentPosition as number);
            if (currentIndex !== -1 && currentIndex + diceTotal < path.length) {
                destinationSquare = path[currentIndex + diceTotal];
                score += 5; // Base score for advancing piece
                reasons.push('Advancing piece');
            } else if (currentIndex !== -1 && currentIndex + diceTotal === path.length) {
                // Reaching the end (winning the piece)
                score += 50;
                reasons.push('Piece reaches home (wins!)');
            }
        }

        if (destinationSquare !== undefined) {
            // Check if landing on rosette square
            if (BoardUtils.isRosetteSquare(destinationSquare)) {
                score += 15;
                reasons.push('Landing on rosette (extra turn)');
            }

            // Check if capturing opponent piece
            const canCapture = opponentPositions.some(pos => pos === destinationSquare);
            if (canCapture && !BoardUtils.isRosetteSquare(destinationSquare)) {
                score += 25;
                reasons.push('Capturing opponent piece');
            }

            // Check if moving to safety (rosette squares are safe)
            if (BoardUtils.isRosetteSquare(destinationSquare)) {
                score += 8;
                reasons.push('Moving to safe square');
            }

            // Prefer advancing pieces that are further along
            if (currentPosition !== 'start') {
                const currentIndex = path.indexOf(currentPosition as number);
                score += Math.floor(currentIndex / 2); // Small bonus for pieces further along
                reasons.push(`Advancing piece at position ${currentIndex}`);
            }

            // Avoid moves that put piece in danger (near opponent pieces)
            const isDangerous = opponentPositions.some(pos => {
                if (pos === 'start' || pos === 'moving' || pos === destinationSquare) return false;
                const opponentPath = this.color === 'white' ? BLACK_PATH : WHITE_PATH;
                const opponentIndex = opponentPath.indexOf(pos as number);
                if (opponentIndex === -1) return false;

                // Check if opponent could reach our destination square with any dice roll (1-4)
                for (let roll = 1; roll <= 4; roll++) {
                    if (opponentIndex + roll < opponentPath.length) {
                        const opponentDestination = opponentPath[opponentIndex + roll];
                        if (opponentDestination === destinationSquare && !BoardUtils.isRosetteSquare(destinationSquare)) {
                            return true;
                        }
                    }
                }
                return false;
            });

            if (isDangerous) {
                score -= 10;
                reasons.push('Move puts piece in danger');
            }
        }

        return {
            pieceIndex,
            score,
            reasons
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
