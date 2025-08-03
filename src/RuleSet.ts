// Base class for all rule sets in the Royal Game of Ur
import type { PathType } from './GamePaths';
import type { GameState } from './GameState';

export abstract class RuleSet {
    abstract readonly name: string;
    abstract readonly description: string;

    // Game setup
    abstract readonly piecesPerPlayer: number;
    abstract readonly diceCount: number;

    // Path type (the main thing that varies by ruleset)
    abstract readonly pathType: PathType;

    // Bear off mechanics
    getExactRollNeededToBearOff(): boolean {
        return true; // Default: exact roll needed to bear off pieces
    }

    // Victory condition
    getPiecesToWin(): number {
        return this.piecesPerPlayer; // Default: all pieces must complete the circuit
    }

    // Game mechanics that can be customized
    getExtraTurnOnRosette(): boolean {
        return true; // Default: landing on rosette gives extra turn
    }

    getExtraTurnOnCapture(): boolean {
        return false; // Default: captures don't grant extra turns
    }

    // Gate keeper rule - only enabled for specific rulesets (like Burglers)
    getGateKeeperEnabled(): boolean {
        return false; // Default: gate keeper rule is disabled
    }

    // Safe squares - squares where pieces cannot be captured
    getSafeSquares(): number[] {
        return []; // Default: no safe squares (except rosettes handled separately)
    }

    // Dice roll calculation and UI feedback
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    calculateDiceRoll(diceValues: number[], _gameState: GameState): {
        total: number;
        templeBlessingApplied: boolean;
        houseBonusApplied: boolean;
        flags: {
            canMove: boolean;
            specialMessage?: string;
        };
    } {
        // Default implementation: simple sum
        // _gameState parameter is available for subclasses that need game context
        const total = diceValues.reduce((sum, value) => sum + value, 0);

        return {
            total,
            templeBlessingApplied: false,
            houseBonusApplied: false,
            flags: {
                canMove: total > 0,
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
        diceCount: number;
    } {
        return {
            piecesPerPlayer: this.piecesPerPlayer,
            diceCount: this.diceCount
        };
    }
}
