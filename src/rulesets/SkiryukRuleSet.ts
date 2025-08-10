import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';

// Skiryuk rule set - using the extended Skiryuk path
export class SkiryukRuleSet extends RuleSet {
    readonly name = "Skiryuk";
    readonly description = "Extended rule set using 3 dice and the Skiryuk path for strategic gameplay";

    // Skiryuk game setup
    readonly piecesPerPlayer = 7;
    readonly diceCount = 3;

    // Use the Skiryuk path configuration
    readonly pathType = "skiryuk" as const;

    // Skiryuk-specific dice roll calculation - zero roll gives 4 movement (same as Masters)
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
        const diceTotal = diceValues.reduce((sum, value) => sum + value, 0);
        const total = diceTotal === 0 ? 4 : diceTotal; // Zero roll becomes 4 movement
        let specialMessage: string | undefined;

        if (diceTotal === 0) {
            specialMessage = "Zero roll grants 4 movement!";
        }

        return {
            total,
            templeBlessingApplied: false, // Skiryuk doesn't use temple blessings
            houseBonusApplied: false,     // Skiryuk doesn't use house bonus
            flags: {
                canMove: true, // Always can move in Skiryuk
                specialMessage
            }
        };
    }

    // Default game mechanics (inherited from base RuleSet)
    // - Extra turn on rosette: true
    // - Extra turn on capture: false
    // - Gate keeper: false
    // - Safe squares: none (except rosettes)
    // - Piece stacking: false
    // - Backwards movement: false
}
