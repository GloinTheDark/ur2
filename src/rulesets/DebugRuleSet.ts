import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';

// Debug rule set - only available in debug mode for testing purposes
export class DebugRuleSet extends RuleSet {
    readonly name = "Debug";
    readonly id = "Debug";
    readonly description = "Debug rule set with 3 pieces, 3 dice, Skiryuk path, stacking and backwards moves";
    readonly prerelease = true; // Debug rule set is prerelease

    // Debug game setup
    readonly piecesPerPlayer = 3;
    readonly diceCount = 3;

    // Use the Skiryuk path configuration
    readonly pathType = "skiryuk" as const;

    // Default game mechanics (mostly inherited from base RuleSet)

    // Special debug rule: pieces of the same color can stack on the same square
    getAllowPieceStacking(): boolean {
        return true;
    }

    // Special debug rule: stacked pieces move together as one unit
    stacksMoveAsOne(): boolean {
        return true;
    }

    // Special debug rule: pieces can move backwards
    canMoveBackwards(): boolean {
        return true;
    }

    // Special debug rule: backwards moves are optional (shown as separate options)
    backwardsMovesAreOptional(): boolean {
        return true;
    }

    // Special debug rule: pieces can stack anywhere (not just rosettes)
    canOnlyStackOnRosettes(): boolean {
        return false;
    }

    // Victory condition: 3 pieces must complete the circuit (all pieces)
    getPiecesToWin(): number {
        return 3;
    }

    // Standard dice roll calculation (inherited from base class)
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
            templeBlessingApplied: false,
            houseBonusApplied: false,
            flags: {
                canMove: total > 0
            }
        };
    }
}
