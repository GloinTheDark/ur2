import { RuleSet } from '../RuleSet';
import { MARKET_SQUARES } from '../BoardLayout';
import type { GameState } from '../GameState';
import type { RulesDescription } from '../types/RulesDescription';

// Action-packed variant with more aggressive gameplay
export class BurglersOfUrRuleSet extends RuleSet {
    readonly name = "Burglers of Ur";
    readonly id = "Burglers";
    readonly description = "Strategic variant with aggressive rules and special squares for dynamic gameplay";

    // More pieces for longer, more strategic games
    readonly piecesPerPlayer = 7;
    readonly diceCount = 4; // Four dice for more consistent movement

    // Use the extended Burglers path
    readonly pathType = "skiryuk" as const;

    // Aggressive game mechanics
    getExtraTurnOnRosette(): boolean {
        return true; // Still get extra turns on rosettes
    }

    getExactRollNeededToBearOff(): boolean {
        return false; // Burglers don't need exact roll to bear off - more aggressive gameplay
    }

    // Gate keeper rule is enabled for Burglers - opponent pieces on gate square block path completion
    getGateKeeperEnabled(): boolean {
        return true; // Gate keeper rule is active in Burglers variant
    }

    // In Burglers rules, market squares are safe
    getSafeSquares(): number[] {
        return [...MARKET_SQUARES]; // Market squares are safe from capture
    }

    // Burglers-specific dice roll calculation with temple blessing and house bonus
    calculateDiceRoll(diceValues: number[], gameState: GameState): {
        total: number;
        templeBlessingApplied: boolean;
        houseBonusApplied: boolean;
        flags: {
            canMove: boolean;
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
                specialMessage: undefined
            }
        };
    }

    // Victory condition: first to get 5 pieces home wins (not all pieces)
    getPiecesToWin(): number {
        return 4; // Faster victory condition - need 4 out of 7 pieces
    }

    // Rules description for the rules window
    getRulesDescription(): RulesDescription {
        return {
            quickReference: {
                goal: "Be the first player to get 4 pieces home (out of 7)",
                movement: "Roll 4 dice, get bonuses from temples and houses",
                special: "Gate keeper blocks opponents, temple blessings help zero rolls, house bonuses add movement"
            },
            boardOverview: {
                pathDescription: "Extended aggressive path with temple control and house bonuses",
                startingArea: "All pieces start off the board in your starting area",
                finishingArea: "Need exact landing is NOT required - pieces can overshoot",
                specialSquares: ["Temples (blessing control)", "Houses (movement bonuses)", "Markets (safe squares)", "Gate square (blocks opponents)", "Rosettes (extra turns)"]
            },
            detailedRules: {
                movement: {
                    title: "Movement Rules",
                    description: "Players alternate turns rolling 4 tetrahedral dice with special bonuses",
                    rules: [
                        "Roll all 4 dice and count the white corners facing up",
                        "Temple Blessing: If you roll 0 and control temples, get 4 movement instead",
                        "House Bonus: Add +1 movement for each house you control (max +2)",
                        "Move any one of your pieces the total distance (including bonuses)",
                        "Pieces can overshoot the finish line - exact landing not required",
                        "Gate Keeper: Opponent pieces on gate square block your path completion"
                    ]
                },
                specialSquares: {
                    title: "Special Squares",
                    squares: [
                        {
                            name: "Temple Squares",
                            description: "Control temples for blessings",
                            effect: "Majority control grants 4 movement on zero rolls"
                        },
                        {
                            name: "House Squares",
                            description: "Control houses for movement bonuses",
                            effect: "Each house controlled adds +1 movement to all rolls (max +2)"
                        },
                        {
                            name: "Market Squares",
                            description: "Safe trading squares",
                            effect: "Pieces on markets are safe from capture"
                        },
                        {
                            name: "Gate Square",
                            description: "Strategic blocking position",
                            effect: "Enemy pieces here block your path to completion"
                        },
                        {
                            name: "Rosettes",
                            description: "Decorated beneficial squares",
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
                        "You cannot capture pieces on markets or rosettes (they are safe)",
                        "Capturing pieces on temples or houses affects control bonuses",
                        "Capturing does not grant an extra turn"
                    ]
                },
                winning: {
                    title: "Winning the Game",
                    description: "First player to get 4 pieces home wins (faster than traditional)",
                    requirements: [
                        "Only 4 out of 7 pieces need to reach home to win",
                        "Pieces can overshoot the finish line - exact roll not required",
                        "Once a piece reaches home, it cannot be captured or moved again",
                        "Gate keeper rule: opponent pieces on gate square block completion"
                    ]
                },
                edgeCases: {
                    title: "Edge Cases",
                    cases: [
                        {
                            situation: "Rolling 0 with temple control",
                            resolution: "Temple blessing grants 4 movement instead of 0"
                        },
                        {
                            situation: "Opponent on gate square blocking completion",
                            resolution: "Must capture or move the gate keeper before completing pieces"
                        },
                        {
                            situation: "Multiple houses controlled",
                            resolution: "Each house adds +1 movement (maximum +2 total bonus)"
                        },
                        {
                            situation: "Piece can overshoot finish",
                            resolution: "Piece completes successfully - exact landing not required"
                        }
                    ]
                }
            },
            examples: [
                {
                    title: "Temple Blessing",
                    description: "Zero roll with temple control",
                    beforeState: "White controls temples, rolls 0 (no white corners)",
                    afterState: "White gets 4 movement from temple blessing",
                    explanation: "Temple control provides powerful backup for zero rolls"
                },
                {
                    title: "House Bonus",
                    description: "Movement bonus from house control",
                    beforeState: "White controls 2 houses, rolls 2",
                    afterState: "White gets 2 + 2 = 4 total movement",
                    explanation: "Each house controlled adds +1 movement to every roll"
                },
                {
                    title: "Gate Keeper Block",
                    description: "Opponent blocking completion",
                    beforeState: "Black piece on gate square, white piece ready to complete",
                    afterState: "White piece blocked from completing until gate is cleared",
                    explanation: "Gate keeper rule adds strategic depth to endgame positioning"
                }
            ]
        };
    }
}
