import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';

// Masters rule set by James Masters
export class MastersRuleSet extends RuleSet {
    readonly name = "Masters";
    readonly id = "Masters";
    readonly description = "Rule set by James Masters using the Masters path configuration";
    readonly moreInfoUrl = "https://www.mastersofgames.com/rules/royal-ur-rules.htm";

    // Masters game setup
    readonly piecesPerPlayer = 7;
    readonly diceCount = 3;

    // Use the balanced Masters path
    readonly pathType = "masters" as const;

    // Masters game mechanics
    getExtraTurnOnRosette(): boolean {
        return true; // Landing on rosette gives extra turn
    }

    getExtraTurnOnCapture(): boolean {
        return false; // Captures don't grant extra turns (traditional)
    }

    // Masters-specific dice roll calculation - zero roll gives 4 movement
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
            templeBlessingApplied: false, // Masters doesn't use temple blessings
            houseBonusApplied: false,     // Masters doesn't use house bonus
            flags: {
                canMove: true, // Always can move in Masters
                specialMessage
            }
        };
    }

    // Victory condition: all pieces must complete the circuit
    getPiecesToWin(): number {
        return this.piecesPerPlayer; // All 7 pieces
    }
}
