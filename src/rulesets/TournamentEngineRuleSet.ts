import { RuleSet } from '../RuleSet';
import type { GameState } from '../GameState';
import { ROSETTE_SQUARES } from '../BoardLayout';

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
}
