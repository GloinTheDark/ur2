import { RuleSet } from '../RuleSet';

// HJR Murray rule set - based on H.J.R. Murray's reconstruction
export class HJRMurrayRuleSet extends RuleSet {
    readonly name = "HJR Murray";
    readonly description = "Rule set based on H.J.R. Murray's (A History Of Chess 1913) reconstruction using 3 dice and the HJR Murray path";

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
}
