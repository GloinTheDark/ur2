// Export all rule sets
export { RuleSet } from './RuleSet';
export { FinkelRuleSet } from './rulesets/FinkelRuleSet';
export { BurglersOfUrRuleSet } from './rulesets/BurglersOfUrRuleSet';
export { BlitzRuleSet } from './rulesets/BlitzRuleSet';
export { MastersRuleSet } from './rulesets/MastersRuleSet';
export { TournamentEngineRuleSet } from './rulesets/TournamentEngineRuleSet';
export { HJRMurrayRuleSet } from './rulesets/HJRMurrayRuleSet';
export { SkiryukRuleSet } from './rulesets/SkiryukRuleSet';
export { DebugRuleSet } from './rulesets/DebugRuleSet';

// Import for internal use
import { RuleSet } from './RuleSet';
import { FinkelRuleSet } from './rulesets/FinkelRuleSet';
import { BurglersOfUrRuleSet } from './rulesets/BurglersOfUrRuleSet';
import { BlitzRuleSet } from './rulesets/BlitzRuleSet';
import { MastersRuleSet } from './rulesets/MastersRuleSet';
import { TournamentEngineRuleSet } from './rulesets/TournamentEngineRuleSet';
import { HJRMurrayRuleSet } from './rulesets/HJRMurrayRuleSet';
import { SkiryukRuleSet } from './rulesets/SkiryukRuleSet';
import { DebugRuleSet } from './rulesets/DebugRuleSet';
import { AppSettingsManager } from './AppSettings';

// Rule set registry for easy access
export const AVAILABLE_RULE_SETS = {
    burglers: new BurglersOfUrRuleSet(),
    finkel: new FinkelRuleSet(),
    blitz: new BlitzRuleSet(),
    masters: new MastersRuleSet(),
    tournamentengine: new TournamentEngineRuleSet(),
    hjrmurray: new HJRMurrayRuleSet(),
    skiryuk: new SkiryukRuleSet(),
    debug: new DebugRuleSet()
} as const;

// Get all rule sets as an array (includes prerelease rule sets when debug mode is active)
export function getAllRuleSets(): RuleSet[] {
    const isDebugMode = AppSettingsManager.getInstance().isDebugMode();
    return Object.values(AVAILABLE_RULE_SETS).filter(ruleSet =>
        !ruleSet.prerelease || isDebugMode
    );
}

// Get rule set by name
export function getRuleSetByName(name: string): RuleSet {
    const isDebugMode = AppSettingsManager.getInstance().isDebugMode();

    // Check all rule sets
    const ruleSet = Object.values(AVAILABLE_RULE_SETS).find(ruleSet =>
        ruleSet.name.toLowerCase() === name.toLowerCase() &&
        (!ruleSet.prerelease || isDebugMode)
    );

    return ruleSet || DEFAULT_RULE_SET;
}

// Default rule set
export const DEFAULT_RULE_SET = AVAILABLE_RULE_SETS.burglers;
