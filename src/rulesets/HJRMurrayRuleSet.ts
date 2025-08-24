import { RuleSet } from '../RuleSet';

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
}
