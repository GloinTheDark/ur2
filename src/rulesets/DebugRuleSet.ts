import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';
import type { RulesDescription } from '../types/RulesDescription';

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

    // Rules description for the rules window
    getRulesDescription(): RulesDescription {
        return {
            quickReference: {
                goal: "Be the first player to move all 3 pieces around the board to the finish zone",
                movement: "Roll 3 dice, pieces can move forward/backward and stack anywhere",
                special: "Debug mode: stacking anywhere, backwards movement, fast games for testing"
            },
            boardOverview: {
                pathDescription: "Extended Skiryuk path with full debugging features enabled",
                startingArea: "All pieces start off the board in your start zone",
                finishingArea: "Pieces must complete the full circuit to reach the finish zone",
                specialSquares: ["All squares (stacking allowed)", "Rosettes (extra turns)", "Temples and markets (safe squares)"]
            },
            detailedRules: {
                movement: {
                    title: "Movement Rules (Debug Mode)",
                    description: "Players alternate turns rolling 3 tetrahedral dice with all movement features enabled",
                    rules: [
                        "Roll all 3 dice and count the white corners facing up",
                        "Move any one piece (or stack) forward OR backward the exact distance",
                        "Backwards moves are optional - you choose direction",
                        "Stacked pieces move together as one unit",
                        "Pieces can stack on ANY square (not just rosettes)",
                        "Only 3 pieces per player for faster testing"
                    ]
                },
                specialSquares: {
                    title: "Special Squares (Debug Mode)",
                    squares: [
                        {
                            name: "Any Square (Stacking)",
                            description: "All squares allow stacking in debug mode",
                            effect: "Friendly pieces can stack anywhere for testing purposes"
                        },
                        {
                            name: "Rosettes",
                            description: "Standard rosette benefits",
                            effect: "Landing here grants an extra turn"
                        },
                        {
                            name: "Temples and Markets",
                            description: "Safe squares from Skiryuk path",
                            effect: "Pieces are safe from capture on these squares"
                        }
                    ]
                },
                capturing: {
                    title: "Capturing (Debug Mode)",
                    description: "Standard capture rules with stacking protection",
                    rules: [
                        "If you land on a square occupied by an opponent's piece, that piece is captured",
                        "Captured pieces return to the opponent's start zone",
                        "You cannot capture pieces on temples, markets, or rosettes",
                        "You cannot capture stacked pieces (they protect each other)",
                        "Capturing does not grant an extra turn"
                    ]
                },
                winning: {
                    title: "Winning the Game (Debug Mode)",
                    description: "First player to get all pieces to the finish zone wins (faster testing)",
                    requirements: [
                        "All 3 of your pieces must complete the full circuit",
                        "Pieces must land exactly on or past the final finish zone square",
                        "Stacked pieces can complete together",
                        "Much faster games for debugging and testing purposes"
                    ]
                },
                edgeCases: {
                    title: "Edge Cases (Debug Mode)",
                    cases: [
                        {
                            situation: "Rolling 0 (no white corners showing)",
                            resolution: "Your turn ends immediately, no piece can be moved"
                        },
                        {
                            situation: "Stacking on any square",
                            resolution: "Debug mode allows stacking anywhere for testing"
                        },
                        {
                            situation: "Backwards movement limitations",
                            resolution: "Pieces cannot move backwards past their start zone"
                        },
                        {
                            situation: "Quick victory with 3 pieces",
                            resolution: "Games end much faster for rapid testing cycles"
                        }
                    ]
                }
            },
            examples: [
                {
                    title: "Debug Stacking",
                    description: "Stacking anywhere for testing",
                    beforeState: "White piece on any square, another white piece moves there",
                    afterState: "Two white pieces stacked, move together",
                    explanation: "Debug mode allows stacking on any square for comprehensive testing"
                },
                {
                    title: "Fast Completion",
                    description: "Quick victory with 3 pieces",
                    beforeState: "White has 2 pieces in finish zone, 1 piece near finish",
                    afterState: "White's last piece reaches finish zone, white wins!",
                    explanation: "Only 3 pieces makes games very fast for debugging purposes"
                },
                {
                    title: "Full Movement Testing",
                    description: "Testing all movement options",
                    beforeState: "White piece can move forward or backward",
                    afterState: "White chooses optimal direction for testing scenario",
                    explanation: "Debug mode enables testing of all movement mechanics"
                }
            ]
        };
    }
}
