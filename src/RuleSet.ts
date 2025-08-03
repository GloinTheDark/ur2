// Base class for all rule sets in the Royal Game of Ur
import type { PathType } from './GamePaths';

export abstract class RuleSet {
    abstract readonly name: string;
    abstract readonly description: string;

    // Game setup
    abstract readonly piecesPerPlayer: number;
    abstract readonly diceCount: number;

    // Path type (the main thing that varies by ruleset)
    abstract readonly pathType: PathType;

    // Rule variations
    abstract readonly gateKeeper: boolean;
    abstract readonly pieceAnimations: boolean;
    abstract readonly soundEffects: boolean;

    // Bear off mechanics
    getExactRollNeededToBearOff(): boolean {
        return true; // Default: exact roll needed to bear off pieces
    }

    // Victory condition
    getPiecesToWin(): number {
        return this.piecesPerPlayer; // Default: all pieces must complete the circuit
    }

    // Game mechanics that can be customized
    canCaptureOnRosette(): boolean {
        return false; // Default: pieces on rosettes are safe
    }

    getExtraTurnOnRosette(): boolean {
        return true; // Default: landing on rosette gives extra turn
    }

    getExtraTurnOnCapture(): boolean {
        return false; // Default: captures don't grant extra turns
    }

    // Dice roll calculation and UI feedback
    calculateDiceRoll(diceValues: number[], _gameState?: any): {
        total: number;
        flags: {
            canMove: boolean;
            extraTurn?: boolean;
            specialMessage?: string;
        };
    } {
        // Default implementation: simple sum
        // _gameState parameter is available for subclasses that need game context
        const total = diceValues.reduce((sum, value) => sum + value, 0);

        return {
            total,
            flags: {
                canMove: total > 0,
                extraTurn: false, // Will be determined by game logic based on landing position
                specialMessage: total === 0 ? "No movement possible" : undefined
            }
        };
    }

    // Path validation
    isValidPath(path: number[]): boolean {
        return path.length > 0 && path.every(square => square >= 1 && square <= 24);
    }

    // Convert rule set to game settings format
    toGameSettings(): {
        piecesPerPlayer: number;
        gateKeeper: boolean;
        pieceAnimations: boolean;
        soundEffects: boolean;
        diceCount: number;
    } {
        return {
            piecesPerPlayer: this.piecesPerPlayer,
            gateKeeper: this.gateKeeper,
            pieceAnimations: this.pieceAnimations,
            soundEffects: this.soundEffects,
            diceCount: this.diceCount
        };
    }
}
