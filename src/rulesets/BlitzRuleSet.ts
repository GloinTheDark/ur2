import { RuleSet } from '../RuleSet';

// Fast-paced variant for quick games
export class BlitzRuleSet extends RuleSet {
    readonly name = "Blitz";
    readonly description = "Lightning-fast variant with fewer pieces and higher dice values for quick games (inspired by RooyalUr.net)";

    // Fewer pieces for faster games
    readonly piecesPerPlayer = 5;
    readonly diceCount = 4; // Four dice for higher potential values

    // Use the balanced Masters path
    readonly pathType = "masters" as const;

    // Speed-focused rule variations
    readonly gateKeeper = false; // No gatekeeper for faster endgame
    readonly pieceAnimations = false; // Disabled for speed
    readonly soundEffects = true;

    // Blitz game mechanics
    canCaptureOnRosette(): boolean {
        return false; // Keep rosettes safe for strategic positioning
    }

    getExtraTurnOnRosette(): boolean {
        return true; // Extra turns help maintain fast pace
    }

    getExtraTurnOnCapture(): boolean {
        return true; // Captures grant extra turns in Blitz for faster gameplay
    }

    // Blitz-specific dice roll calculation (simple total)
    calculateDiceRoll(diceValues: number[], _gameState?: any): {
        total: number;
        flags: {
            canMove: boolean;
            extraTurn?: boolean;
            specialMessage?: string;
        };
    } {
        const total = diceValues.reduce((sum, value) => sum + value, 0);

        return {
            total,
            flags: {
                canMove: total > 0,
                extraTurn: false, // Will be determined by game logic
                specialMessage: total === 0 ? "No movement possible" : undefined
            }
        };
    }

    // Victory condition: all pieces must complete
    getPiecesToWin(): number {
        return this.piecesPerPlayer; // All 5 pieces
    }
}
