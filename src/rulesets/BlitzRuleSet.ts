import { RuleSet } from '../RuleSet';
import type { RulesDescription } from '../types/RulesDescription';

// Fast-paced variant for quick games
export class BlitzRuleSet extends RuleSet {
    readonly name = "Blitz";
    readonly id = "Blitz";
    readonly description = "Lightning-fast variant with fewer pieces and extra turn on capture for quick games. Developed by RoyalUr.net";
    readonly moreInfoUrl = "https://royalur.net/";

    // Fewer pieces for faster games
    readonly piecesPerPlayer = 5;
    readonly diceCount = 4; // Four dice for higher potential values

    // Use the balanced Masters path
    readonly pathType = "masters" as const;

    // Blitz game mechanics
    getExtraTurnOnRosette(): boolean {
        return true; // Extra turns help maintain fast pace
    }

    getExtraTurnOnCapture(): boolean {
        return true; // Captures grant extra turns in Blitz for faster gameplay
    }

    // Victory condition: all pieces must complete
    getPiecesToWin(): number {
        return this.piecesPerPlayer; // All 5 pieces
    }

    // Rules description for the rules window
    getRulesDescription(): RulesDescription {
        return {
            quickReference: {
                goal: "Be the first player to move all 5 pieces around the board and home",
                movement: "Roll 4 dice, move one piece the total shown",
                special: "Rosettes and captures both give extra turns for fast-paced gameplay"
            },
            boardOverview: {
                pathDescription: "Fast-paced game using the balanced Masters path",
                startingArea: "All pieces start off the board in your start zone",
                finishingArea: "Pieces must complete the full circuit to reach the finish zone",
                specialSquares: ["Rosettes (extra turn squares)"]
            },
            detailedRules: {
                movement: {
                    title: "Movement Rules",
                    description: "Players alternate turns rolling 4 tetrahedral dice and moving pieces",
                    rules: [
                        "Roll all 4 dice and count the white corners facing up",
                        "Move any one of your pieces exactly that many spaces",
                        "Pieces move along the path: start zone → your track → shared middle → your track → finish zone",
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
                    description: "Land on an opponent's piece to send it back to start zone and get an extra turn",
                    rules: [
                        "If you land on a square occupied by an opponent's piece, that piece is captured",
                        "Captured pieces return to the opponent's starting area",
                        "Capturing grants an extra turn - this makes Blitz very fast-paced!",
                        "You can capture pieces anywhere on the shared middle section",
                        "You cannot capture pieces on your opponent's starting or home tracks"
                    ]
                },
                winning: {
                    title: "Winning the Game",
                    description: "First player to get all pieces home wins",
                    requirements: [
                        "All 5 of your pieces must complete the full circuit",
                        "Pieces must land exactly on or past the final home square",
                        "Once a piece reaches home, it cannot be captured or moved again",
                        "Fewer pieces means faster games - typically 5-10 minutes!"
                    ]
                },
                edgeCases: {
                    title: "Edge Cases",
                    cases: [
                        {
                            situation: "Rolling 0 (no white corners showing)",
                            resolution: "Your turn ends immediately, no piece can be moved"
                        },
                        {
                            situation: "Multiple captures in one game",
                            resolution: "Each capture grants a separate extra turn - chain captures possible!"
                        },
                        {
                            situation: "All pieces are blocked from moving",
                            resolution: "Your turn ends, even if you rolled a valid number"
                        }
                    ]
                }
            },
            examples: [
                {
                    title: "Capture with Extra Turn",
                    description: "The signature Blitz mechanic",
                    beforeState: "Black piece on shared section, white piece can reach it",
                    afterState: "Black piece returns to start, white piece takes its place, white gets another turn",
                    explanation: "Captures grant extra turns in Blitz, making it fast and aggressive"
                },
                {
                    title: "Rosette Landing",
                    description: "Landing on a rosette square",
                    beforeState: "White piece 3 squares from rosette, dice show 3",
                    afterState: "White piece on rosette, white gets another turn",
                    explanation: "Like traditional rules, rosettes grant extra turns"
                },
                {
                    title: "Quick Victory",
                    description: "Fast-paced endgame",
                    beforeState: "White has 4 pieces home, 1 piece near finish",
                    afterState: "White's last piece reaches home, white wins!",
                    explanation: "With only 5 pieces, games finish quickly - perfect for tournament play"
                }
            ]
        };
    }
}
