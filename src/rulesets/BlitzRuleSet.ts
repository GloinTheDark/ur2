import { RuleSet } from '../RuleSet';

// Fast-paced variant for quick games
export class BlitzRuleSet extends RuleSet {
    readonly name = "Blitz";
    readonly description = "Lightning-fast variant with fewer pieces and higher dice values for quick games (inspired by RoyalUr.net)";

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
}
