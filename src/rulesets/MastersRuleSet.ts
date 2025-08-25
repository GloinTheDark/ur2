import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';
import type { RulesDescription } from '../types/RulesDescription';

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

    // Rules description for the rules window
    getRulesDescription(): RulesDescription {
        return {
            quickReference: {
                goal: "Be the first player to move all 7 pieces around the board and home",
                movement: "Roll 3 dice, move one piece the total number shown (zero roll = 4 movement)",
                special: "Rosettes give extra turns, zero rolls become 4 movement"
            },
            boardOverview: {
                pathDescription: "Pieces travel through a balanced path with strategic decision points",
                startingArea: "All pieces start off the board in your start zone",
                finishingArea: "Pieces must complete the full circuit to reach the finish zone",
                specialSquares: ["Rosettes (extra turn squares)"]
            },
            detailedRules: {
                movement: {
                    title: "Movement Rules",
                    description: "Players alternate turns rolling 3 tetrahedral dice and moving pieces",
                    rules: [
                        "Roll all 3 dice and count the white corners facing up",
                        "If you roll zero (no white corners), you get 4 movement instead!",
                        "Move any one of your pieces exactly that many spaces",
                        "Pieces move along the Masters path: start zone → your track → shared middle → your track → finish zone",
                        "You must use the exact roll - no more, no less",
                        "If you cannot make a legal move, your turn ends"
                    ]
                },
                specialSquares: {
                    title: "Special Squares",
                    squares: [
                        {
                            name: "Rosettes",
                            description: "Decorated squares that provide benefits",
                            effect: "Landing here grants an extra turn"
                        }
                    ]
                },
                capturing: {
                    title: "Capturing",
                    description: "Land on an opponent's piece to send it back to start zone",
                    rules: [
                        "If you land on a square occupied by an opponent's piece, that piece is captured",
                        "Captured pieces return to the opponent's starting area",
                        "You can capture pieces anywhere on the shared middle section",
                        "You cannot capture pieces on your opponent's starting or home tracks",
                        "Capturing does not grant an extra turn"
                    ]
                },
                winning: {
                    title: "Winning the Game",
                    description: "First player to get all pieces home wins",
                    requirements: [
                        "All 7 of your pieces must complete the full circuit",
                        "Pieces must land exactly on or past the final home square",
                        "Once a piece reaches home, it cannot be captured or moved again"
                    ]
                },
                edgeCases: {
                    title: "Edge Cases",
                    cases: [
                        {
                            situation: "Rolling 0 (no white corners showing)",
                            resolution: "You get 4 movement instead - this is a powerful roll!"
                        },
                        {
                            situation: "All pieces are blocked from moving",
                            resolution: "Your turn ends, even if you rolled a valid number"
                        },
                        {
                            situation: "Zero roll but cannot move 4 spaces",
                            resolution: "Turn ends - the 4 movement still follows normal movement rules"
                        }
                    ]
                }
            },
            examples: [
                {
                    title: "Zero Roll Bonus",
                    description: "The special zero roll rule",
                    beforeState: "White piece in starting area, dice show 0 (no white corners)",
                    afterState: "White piece moves 4 spaces forward",
                    explanation: "Zero rolls become 4 movement - this makes the Masters ruleset unique"
                },
                {
                    title: "Rosette Landing",
                    description: "Landing on a rosette square",
                    beforeState: "White piece 2 squares from rosette, dice show 2",
                    afterState: "White piece on rosette, white gets another turn",
                    explanation: "Landing on rosette grants an extra turn for strategic advantage"
                },
                {
                    title: "Capturing",
                    description: "Capturing an opponent's piece",
                    beforeState: "Black piece on shared section, white piece can reach that square",
                    afterState: "Black piece returns to start zone, white piece takes its place",
                    explanation: "Capturing sends the opponent's piece back to their start zone"
                }
            ]
        };
    }
}
