import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';
import { ROSETTE_SQUARES } from '../BoardLayout';
import type { RulesDescription } from '../types/RulesDescription';

// Tournament Engine rule set - fast-paced variant with Masters path
export class TournamentEngineRuleSet extends RuleSet {
    readonly name = "Tournament Engine";
    readonly id = "TournamentEngine";
    readonly description = "Allows piece stacking on rosettes and backwards movement. Developed by Société Internationale d'UR (playur.org)";
    readonly moreInfoUrl = "https://playur.org";

    // Tournament Engine game setup
    readonly piecesPerPlayer = 7;
    readonly diceCount = 4;

    // Use the Masters path configuration
    readonly pathType = "masters" as const;

    // Tournament Engine game mechanics
    getExtraTurnOnRosette(): boolean {
        return false; // Rosettes don't give extra turns in Tournament Engine
    }

    getExtraTurnOnCapture(): boolean {
        return false; // Captures don't grant extra turns
    }

    // Tournament Engine: rosettes are safe squares where pieces cannot be captured
    getSafeSquares(): number[] {
        // Make all rosette squares safe (no captures allowed)
        return [...ROSETTE_SQUARES];
    }

    // Standard dice roll calculation
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
            templeBlessingApplied: false, // Tournament Engine doesn't use temple blessings
            houseBonusApplied: false,     // Tournament Engine doesn't use house bonus
            flags: {
                canMove: total > 0 // Can only move if dice total is greater than 0
            }
        };
    }

    // Victory condition: 5 pieces must complete the circuit
    getPiecesToWin(): number {
        return 7; // All 7 pieces must complete the circuit
    }

    // Special Tournament Engine rule: pieces of the same color can stack on the same square
    getAllowPieceStacking(): boolean {
        return true;
    }

    // Special Tournament Engine rule: stacked pieces move together as one unit
    stacksMoveAsOne(): boolean {
        return true;
    }

    // Special Tournament Engine rule: pieces can move backwards
    canMoveBackwards(): boolean {
        return true;
    }

    // Special Tournament Engine rule: backwards moves are optional (shown as separate options)
    backwardsMovesAreOptional(): boolean {
        return true;
    }

    // Special Tournament Engine rule: pieces can only stack on rosette squares
    canOnlyStackOnRosettes(): boolean {
        return true;
    }

    // Rules description for the rules window
    getRulesDescription(): RulesDescription {
        return {
            quickReference: {
                goal: "Be the first player to move all 7 pieces around the board and home",
                movement: "Roll 4 dice, pieces can move forward/backward and stack on rosettes",
                special: "Pieces stack on rosettes only, can move backwards, rosettes are safe but no extra turns"
            },
            boardOverview: {
                pathDescription: "Masters path with advanced stacking and movement mechanics",
                startingArea: "All pieces start off the board in your start zone",
                finishingArea: "Pieces must complete the full circuit to reach the finish zone",
                specialSquares: ["Rosettes (safe stacking squares)"]
            },
            detailedRules: {
                movement: {
                    title: "Movement Rules",
                    description: "Players alternate turns rolling 4 tetrahedral dice with advanced movement options",
                    rules: [
                        "Roll all 4 dice and count the white corners facing up",
                        "Move any one piece (or stack) forward OR backward the exact distance",
                        "Backwards moves are optional - you choose direction",
                        "Stacked pieces move together as one unit",
                        "Pieces can only stack on rosette squares",
                        "You must use the exact roll - no more, no less"
                    ]
                },
                specialSquares: {
                    title: "Special Squares",
                    squares: [
                        {
                            name: "Rosettes",
                            description: "Safe stacking squares (no extra turns)",
                            effect: "Pieces are safe from capture and can stack here. No extra turn granted."
                        },
                        {
                            name: "Stacking on Rosettes",
                            description: "Multiple pieces can occupy rosettes",
                            effect: "Friendly pieces stack together and move as one unit"
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
                        "You cannot capture stacked pieces (they protect each other)",
                        "Capturing does not grant an extra turn"
                    ]
                },
                winning: {
                    title: "Winning the Game",
                    description: "First player to get all pieces home wins",
                    requirements: [
                        "All 7 of your pieces must complete the full circuit",
                        "Pieces must land exactly on or past the final home square",
                        "Stacked pieces can complete together",
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
                            situation: "Stacked pieces on rosette",
                            resolution: "All pieces in the stack move together as one unit"
                        },
                        {
                            situation: "Backwards movement near start",
                            resolution: "Pieces cannot move backwards past their starting area"
                        },
                        {
                            situation: "Trying to stack on non-rosette",
                            resolution: "Stacking is only allowed on rosette squares"
                        }
                    ]
                }
            },
            examples: [
                {
                    title: "Rosette Stacking",
                    description: "Multiple pieces on a rosette",
                    beforeState: "White piece on rosette, another white piece moves to same rosette",
                    afterState: "Two white pieces stacked on rosette, move together",
                    explanation: "Pieces can only stack on rosettes and move as one unit"
                },
                {
                    title: "Backwards Movement",
                    description: "Strategic retreat option",
                    beforeState: "White piece in danger zone, dice show 3",
                    afterState: "White piece moves backward 3 spaces to safety",
                    explanation: "Backwards movement is optional and provides strategic flexibility"
                },
                {
                    title: "Rosette Safety",
                    description: "Protection without extra turns",
                    beforeState: "White piece on rosette, black piece lands on same square",
                    afterState: "White piece remains safe, black piece cannot capture",
                    explanation: "Rosettes provide safety but no extra turns in Tournament Engine rules"
                }
            ]
        };
    }
}
