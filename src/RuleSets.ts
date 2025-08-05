// Export all rule sets
export { RuleSet } from './RuleSet';
export { FinkelRuleSet } from './rulesets/FinkelRuleSet';
export { BurglersOfUrRuleSet } from './rulesets/BurglersOfUrRuleSet';
export { BlitzRuleSet } from './rulesets/BlitzRuleSet';
export { MastersRuleSet } from './rulesets/MastersRuleSet';

// Import for internal use
import { RuleSet } from './RuleSet';
import { FinkelRuleSet } from './rulesets/FinkelRuleSet';
import { BurglersOfUrRuleSet } from './rulesets/BurglersOfUrRuleSet';
import { BlitzRuleSet } from './rulesets/BlitzRuleSet';
import { MastersRuleSet } from './rulesets/MastersRuleSet';

// Rule set registry for easy access
export const AVAILABLE_RULE_SETS = {
    finkel: new FinkelRuleSet(),
    burglers: new BurglersOfUrRuleSet(),
    blitz: new BlitzRuleSet(),
    masters: new MastersRuleSet()
} as const;

// Get all rule sets as an array
export function getAllRuleSets(): RuleSet[] {
    return Object.values(AVAILABLE_RULE_SETS);
}

// Get rule set by name
export function getRuleSetByName(name: string): RuleSet {
    return Object.values(AVAILABLE_RULE_SETS).find(ruleSet =>
        ruleSet.name.toLowerCase() === name.toLowerCase()
    ) || DEFAULT_RULE_SET;
}

// Default rule set
export const DEFAULT_RULE_SET = AVAILABLE_RULE_SETS.burglers;
