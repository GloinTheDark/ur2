import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';
import { TEMPLE_SQUARES, MARKET_SQUARES } from '../BoardLayout';
import type { RulesDescription } from '../types/RulesDescription';

// Skiryuk rule set - using the extended Skiryuk path
export class SkiryukRuleSet extends RuleSet {
    readonly name = "Skiryuk";
    readonly id = "Skiryuk";
    readonly description = "Extended rule set using 3 dice and the Skiryuk path for strategic gameplay WIP";
    readonly moreInfoUrl = "https://skyruk-livejournal-com.translate.goog/231444.html?_x_tr_sl=ru&_x_tr_tl=en&_x_tr_hl=en&_x_tr_pto=wapp&_x_tr_hist=true";
    readonly prerelease = true; // Skiryuk rule set is prerelease

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

    // Skiryuk allows piece stacking
    getAllowPieceStacking(): boolean {
        return true;
    }

    // Safe squares in Skiryuk are temple squares and market squares
    getSafeSquares(): number[] {
        return [...TEMPLE_SQUARES, ...MARKET_SQUARES]; // Temple squares and Market squares
    }

    // Default game mechanics (inherited from base RuleSet)
    // - Extra turn on rosette: true
    // - Extra turn on capture: false
    // - Gate keeper: false
    // - Safe squares: temple squares (2, 4, 15, 18, 20) and market squares (11, 14)
    // - Piece stacking: true (overridden above)
    // - Backwards movement: false

    // Rules description for the rules window
    getRulesDescription(): RulesDescription {
        return {
            quickReference: {
                goal: "Be the first player to move all 7 pieces around the board and home",
                movement: "Roll 3 dice, move one piece the total shown (zero roll = 4 movement)",
                special: "Pieces can stack, temples and markets are safe, zero rolls become 4 movement"
            },
            boardOverview: {
                pathDescription: "Extended path with special temple and market squares for strategic gameplay",
                startingArea: "All pieces start off the board in your start zone",
                finishingArea: "Pieces must complete the full circuit to reach the finish zone",
                specialSquares: ["Temples (safe squares)", "Markets (safe squares)", "Rosettes (extra turns)"]
            },
            detailedRules: {
                movement: {
                    title: "Movement Rules",
                    description: "Players alternate turns rolling 3 tetrahedral dice and moving pieces",
                    rules: [
                        "Roll all 3 dice and count the white corners facing up",
                        "If you roll zero (no white corners), you get 4 movement instead!",
                        "Move any one of your pieces exactly that many spaces",
                        "Pieces move along the extended Skiryuk path with special squares",
                        "Multiple pieces can occupy the same square (stacking allowed)",
                        "You must use the exact roll - no more, no less"
                    ]
                },
                specialSquares: {
                    title: "Special Squares",
                    squares: [
                        {
                            name: "Temple Squares",
                            description: "Sacred squares that provide protection",
                            effect: "Pieces on temple squares are safe from capture"
                        },
                        {
                            name: "Market Squares",
                            description: "Trading squares that offer safety",
                            effect: "Pieces on market squares are safe from capture"
                        },
                        {
                            name: "Rosettes",
                            description: "Decorated squares providing benefits",
                            effect: "Landing here grants an extra turn"
                        },
                        {
                            name: "Stacking",
                            description: "Multiple pieces can share squares",
                            effect: "Friendly pieces can stack on the same square for protection"
                        }
                    ]
                },
                capturing: {
                    title: "Capturing",
                    description: "Land on an opponent's piece to send it back to start zone",
                    rules: [
                        "If you land on a square occupied by an opponent's piece, that piece is captured",
                        "Captured pieces return to the opponent's start zone",
                        "You cannot capture pieces on temples, markets, or rosettes (they are safe)",
                        "You cannot capture pieces that are stacked with other friendly pieces",
                        "Capturing does not grant an extra turn"
                    ]
                },
                winning: {
                    title: "Game Objective",
                    description: "First player to get all pieces to the finish zone wins",
                    requirements: [
                        "All 7 of your pieces must complete the full circuit",
                        "Pieces must land exactly on or past the final finish zone square",
                        "Once a piece reaches the finish zone, it cannot be captured or moved again"
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
                            situation: "Multiple pieces stacked on one square",
                            resolution: "All pieces move together as a stack, or you can choose to move individual pieces"
                        },
                        {
                            situation: "Landing on a stacked square with enemies",
                            resolution: "Only the top enemy piece is captured, others remain safe"
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
                    explanation: "Zero rolls become 4 movement - making this ruleset unique and strategic"
                },
                {
                    title: "Piece Stacking",
                    description: "Multiple pieces on one square",
                    beforeState: "White piece on square 8, another white piece moves to square 8",
                    afterState: "Two white pieces stacked on square 8, both protected",
                    explanation: "Stacking provides protection and strategic positioning options"
                },
                {
                    title: "Temple Safety",
                    description: "Using temples for protection",
                    beforeState: "White piece moves to temple square with black piece approaching",
                    afterState: "White piece safe on temple, black piece cannot capture",
                    explanation: "Temple and market squares provide sanctuary from captures"
                }
            ]
        };
    }
}
