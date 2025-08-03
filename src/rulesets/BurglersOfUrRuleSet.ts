import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';

// Action-packed variant with more aggressive gameplay
export class BurglersOfUrRuleSet extends RuleSet {
    readonly name = "Burglers of Ur";
    readonly description = "Fast-paced variant with aggressive rules and special squares for dynamic gameplay";

    // More pieces for longer, more strategic games
    readonly piecesPerPlayer = 7;
    readonly diceCount = 4; // Four dice for more consistent movement

    // Use the extended Burglers path
    readonly pathType = "burglers" as const;

    // Aggressive game mechanics
    canCaptureOnRosette(): boolean {
        return true; // Even rosettes aren't safe! (Burglers can steal from anywhere)
    }

    getExtraTurnOnRosette(): boolean {
        return true; // Still get extra turns on rosettes
    }

    getExactRollNeededToBearOff(): boolean {
        return false; // Burglers don't need exact roll to bear off - more aggressive gameplay
    }

    // Burglers-specific dice roll calculation with temple blessing and house bonus
    calculateDiceRoll(diceValues: number[], gameState: GameState): {
        total: number;
        templeBlessingApplied: boolean;
        houseBonusApplied: boolean;
        flags: {
            canMove: boolean;
            extraTurn?: boolean;
            specialMessage?: string;
        };
    } {
        const baseTotal = diceValues.reduce((sum, value) => sum + value, 0);

        // Apply temple blessings first (only if base roll is 0 and player has temple control)
        let total = baseTotal;
        let templeBlessingApplied = false;
        if (baseTotal === 0 && gameState.getTempleBlessings(gameState.state.currentPlayer).hasControl) {
            total = this.diceCount; // Set to maximum possible roll for this rule set
            templeBlessingApplied = true;
        }

        // Apply house bonus second
        let houseBonusApplied = false;
        const houseBonus = gameState.getHouseBonus(gameState.state.currentPlayer);
        if (houseBonus > 0) {
            total += houseBonus;
            houseBonusApplied = true;
        }

        return {
            total,
            templeBlessingApplied,
            houseBonusApplied,
            flags: {
                canMove: total > 0,
                extraTurn: false, // Will be determined by game logic
                specialMessage: undefined
            }
        };
    }

    // Victory condition: first to get 5 pieces home wins (not all pieces)
    getPiecesToWin(): number {
        return 5; // Faster victory condition - need 5 out of 7 pieces
    }
}
