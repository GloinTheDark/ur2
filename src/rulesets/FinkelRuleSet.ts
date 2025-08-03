import { RuleSet } from '../RuleSet';
import { ROSETTE_SQUARES } from '../BoardLayout';

// Traditional rule set based on R. C. Bell's path and Irving Finkel's rules
export class FinkelRuleSet extends RuleSet {
    readonly name = "Finkel";
    readonly description = "Traditional rules using R. C. Bell's path, as popularized by Irving Finkel's reconstruction";

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
}
