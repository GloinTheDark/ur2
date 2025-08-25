import { RuleSet } from '../RuleSet';
import type { RulesDescription } from '../types/RulesDescription';

// HJR Murray rule set - based on H.J.R. Murray's reconstruction
export class HJRMurrayRuleSet extends RuleSet {
    readonly name = "HJR Murray";
    readonly id = "HJRMurray";
    readonly description = "Rule set based on H.J.R. Murray's A History of Board-Games Other Than Chess (1952) using 3 dice and the HJR Murray path";
    readonly moreInfoUrl = "https://www.google.com/search?q=A+History+of+Board-Games+Other+Than+Chess+(1952)";

    // HJR Murray game setup
    readonly piecesPerPlayer = 7;
    readonly diceCount = 3;

    // Use the HJR Murray path configuration
    readonly pathType = "hjrmurray" as const;

    // Default game mechanics (inherited from base RuleSet)
    // - Extra turn on rosette: true
    // - Extra turn on capture: false
    // - Gate keeper: false
    // - Safe squares: none (except rosettes)
    // - Piece stacking: false
    // - Backwards movement: false

    // Rules description for the rules window
    getRulesDescription(): RulesDescription {
        return {
            quickReference: {
                goal: "Be the first player to move all 7 pieces around the board and home",
                movement: "Roll 3 dice, move one piece the total number shown",
                special: "Rosettes give extra turns and provide safety from capture"
            },
            boardOverview: {
                pathDescription: "Pieces follow the historical path as reconstructed by H.J.R. Murray",
                startingArea: "All pieces start off the board in your start zone",
                finishingArea: "Pieces must complete the full circuit to reach the finish zone",
                specialSquares: ["Rosettes (safe squares with extra turns)"]
            },
            detailedRules: {
                movement: {
                    title: "Movement Rules",
                    description: "Players alternate turns rolling 3 tetrahedral dice and moving pieces",
                    rules: [
                        "Roll all 3 dice and count the white corners facing up",
                        "Move any one of your pieces exactly that many spaces",
                        "Pieces move along the HJR Murray path: start zone → your track → shared middle → your track → finish zone",
                        "You must use the exact roll - no more, no less",
                        "If you cannot make a legal move, your turn ends"
                    ]
                },
                specialSquares: {
                    title: "Special Squares",
                    squares: [
                        {
                            name: "Rosettes",
                            description: "Decorated squares with historical significance",
                            effect: "Landing here grants an extra turn and protects the piece from capture"
                        }
                    ]
                },
                capturing: {
                    title: "Capturing",
                    description: "Land on an opponent's piece to send it back to start zone",
                    rules: [
                        "If you land on a square occupied by an opponent's piece, that piece is captured",
                        "Captured pieces return to the opponent's starting area",
                        "You cannot capture pieces on rosettes (they are safe)",
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
                            resolution: "Your turn ends immediately, no piece can be moved"
                        },
                        {
                            situation: "All pieces are blocked from moving",
                            resolution: "Your turn ends, even if you rolled a valid number"
                        },
                        {
                            situation: "Multiple pieces could move the same distance",
                            resolution: "You choose which piece to move - this is a strategic decision"
                        }
                    ]
                }
            },
            examples: [
                {
                    title: "Basic Movement",
                    description: "Moving a piece along the historical path",
                    beforeState: "White piece in starting area, dice show 2",
                    afterState: "White piece on square 2 of the HJR Murray path",
                    explanation: "Pieces follow the historical reconstruction by H.J.R. Murray"
                },
                {
                    title: "Rosette Safety",
                    description: "Landing on a rosette for protection",
                    beforeState: "White piece 1 square from rosette, dice show 1",
                    afterState: "White piece on rosette, safe from capture, white gets another turn",
                    explanation: "Rosettes provide both safety and extra turns in the historical rules"
                },
                {
                    title: "Capturing",
                    description: "Capturing an opponent's piece",
                    beforeState: "Black piece on shared path, white piece can reach that square",
                    afterState: "Black piece returns to start zone, white piece takes its place",
                    explanation: "Standard capturing rules send the opponent's piece back to start zone"
                }
            ]
        };
    }
}
