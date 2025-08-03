import { RuleSet } from '../RuleSet';

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
    canCaptureOnRosette(): boolean {
        return false; // Pieces on rosettes are safe from capture
    }

    getExtraTurnOnRosette(): boolean {
        return true; // Landing on rosette gives extra turn
    }

    // Victory condition: all pieces must complete the circuit
    getPiecesToWin(): number {
        return this.piecesPerPlayer;
    }
}
