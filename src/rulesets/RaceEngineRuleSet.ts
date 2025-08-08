import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';

// RaceEngine rule set - fast-paced variant with Masters path
export class RaceEngineRuleSet extends RuleSet {
    readonly name = "RaceEngine";
    readonly description = "Fast-paced racing variant using Masters path with 4 dice and 5 pieces";

    // RaceEngine game setup
    readonly piecesPerPlayer = 5;
    readonly diceCount = 4;

    // Use the Masters path configuration
    readonly pathType = "masters" as const;

    // RaceEngine game mechanics
    getExtraTurnOnRosette(): boolean {
        return true; // Landing on rosette gives extra turn
    }

    getExtraTurnOnCapture(): boolean {
        return false; // Captures don't grant extra turns
    }

    // Standard dice roll calculation
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
        const total = diceValues.reduce((sum, value) => sum + value, 0);

        return {
            total,
            templeBlessingApplied: false, // RaceEngine doesn't use temple blessings
            houseBonusApplied: false,     // RaceEngine doesn't use house bonus
            flags: {
                canMove: total > 0 // Can only move if dice total is greater than 0
            }
        };
    }

    // Victory condition: 5 pieces must complete the circuit
    getPiecesToWin(): number {
        return 5;
    }

    // Special RaceEngine rule: pieces of the same color can stack on the same square
    getAllowPieceStacking(): boolean {
        return true;
    }
}
