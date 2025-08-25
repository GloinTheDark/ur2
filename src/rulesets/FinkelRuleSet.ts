import { RuleSet } from '../RuleSet';
import { ROSETTE_SQUARES } from '../BoardLayout';
import type { RulesDescription } from '../types/RulesDescription';

// Traditional rule set based on R. C. Bell's path and Irving Finkel's rules
export class FinkelRuleSet extends RuleSet {
    readonly name = "Finkel";
    readonly id = "Finkel";
    readonly description = "Traditional rules using R. C. Bell's path, as popularized by Irving Finkel's reconstruction";
    readonly moreInfoUrl = "https://www.youtube.com/watch?v=WZskjLq040I";

    // Game setup - traditional configuration
    readonly piecesPerPlayer = 7;
    readonly diceCount = 4;

    // Use the classic Finkel path
    readonly pathType = "finkel" as const;

    // Traditional game mechanics
    getExtraTurnOnRosette(): boolean {
        return true; // Landing on rosette gives extra turn
    }

    // In Finkel rules, rosettes are safe squares
    getSafeSquares(): number[] {
        return [...ROSETTE_SQUARES]; // Rosettes are safe from capture
    }

    // Victory condition: all pieces must complete the circuit
    getPiecesToWin(): number {
        return this.piecesPerPlayer;
    }

    // Rules description for the rules window
    getRulesDescription(): RulesDescription {
        return {
            quickReference: {
                goal: "Be the first player to move all 7 pieces around the board and home",
                movement: "Roll 4 dice, move one piece the total number of spaces shown",
                special: "Rosettes (flower squares) are safe and give extra turns"
            },
            boardOverview: {
                pathDescription: "Pieces travel around a shared middle path and return home",
                startingArea: "All pieces start off the board in your start zone",
                finishingArea: "Pieces must travel the full path to reach the finish zone",
                specialSquares: ["Rosettes (flower squares)"]
            },
            detailedRules: {
                movement: {
                    title: "Movement Rules",
                    description: "Players alternate turns rolling 4 tetrahedral dice and moving pieces",
                    rules: [
                        "Roll all 4 dice and count the white corners facing up",
                        "Move any one of your pieces exactly that many spaces",
                        "Pieces move along the path in order: start zone → your track → shared middle → your track → finish zone",
                        "You must use the exact roll - no more, no less",
                        "If you cannot make a legal move, your turn ends"
                    ]
                },
                specialSquares: {
                    title: "Special Squares",
                    squares: [
                        {
                            name: "Rosettes (Flower Squares)",
                            description: "Decorated squares with flower patterns",
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
                    description: "Moving a piece from start",
                    beforeState: "White piece in starting area, dice show 2",
                    afterState: "White piece on square 2 of your track",
                    explanation: "Roll determines how many spaces to move forward along the path"
                },
                {
                    title: "Rosette Landing",
                    description: "Landing on a rosette square",
                    beforeState: "White piece 3 squares from rosette, dice show 3",
                    afterState: "White piece on rosette, white gets another turn",
                    explanation: "Landing on rosette grants an extra turn and makes the piece safe"
                },
                {
                    title: "Capturing",
                    description: "Capturing an opponent's piece",
                    beforeState: "Black piece on square 6, white piece can move 6 spaces",
                    afterState: "Black piece returns to start zone, white piece on square 6",
                    explanation: "Landing on opponent's piece captures it and sends it back to start zone"
                }
            ]
        };
    }
}
