import { RuleSet } from './RuleSet';
import { getAllRuleSets, DEFAULT_RULE_SET } from './RuleSets';
import { getPathPair } from './GamePaths';

// Utility functions for integrating rule sets with the game

export interface RuleSetGameSettings {
    piecesPerPlayer: number;
    diceCount: number;
    // Rule set specific
    ruleSet: RuleSet;
}

// Convert a rule set to game settings
export function createGameSettingsFromRuleSet(ruleSet: RuleSet): RuleSetGameSettings {
    return {
        piecesPerPlayer: ruleSet.piecesPerPlayer,
        diceCount: ruleSet.diceCount,
        ruleSet: ruleSet
    };
}

// Get default game settings
export function getDefaultGameSettings(): RuleSetGameSettings {
    return createGameSettingsFromRuleSet(DEFAULT_RULE_SET);
}

// Get game settings for a specific rule set by name
export function getGameSettingsForRuleSet(ruleSetName: string): RuleSetGameSettings {
    const ruleSet = getAllRuleSets().find(rs =>
        rs.name.toLowerCase() === ruleSetName.toLowerCase()
    );

    if (!ruleSet) {
        console.warn(`Rule set "${ruleSetName}" not found, using default`);
        return getDefaultGameSettings();
    }

    return createGameSettingsFromRuleSet(ruleSet);
}

// Helper function to get paths from rule set (board layout is always the same)
export function getPathsFromRuleSet(ruleSet: RuleSet) {
    return getPathPair(ruleSet.pathType);
}

// Helper function to validate if a rule set is compatible with current game state
export function isRuleSetCompatible(ruleSet: RuleSet, currentPiecesPerPlayer: number): boolean {
    // For now, we'll consider rule sets compatible if they don't require more pieces
    // than currently exist. In the future, this could be more sophisticated.
    return ruleSet.piecesPerPlayer <= currentPiecesPerPlayer;
}

// Rule set comparison utilities
export function compareRuleSets(ruleSet1: RuleSet, ruleSet2: RuleSet): {
    differences: string[];
    compatible: boolean;
} {
    const differences: string[] = [];

    if (ruleSet1.piecesPerPlayer !== ruleSet2.piecesPerPlayer) {
        differences.push(`Pieces per player: ${ruleSet1.piecesPerPlayer} vs ${ruleSet2.piecesPerPlayer}`);
    }

    if (ruleSet1.diceCount !== ruleSet2.diceCount) {
        differences.push(`Dice count: ${ruleSet1.diceCount} vs ${ruleSet2.diceCount}`);
    }

    if (ruleSet1.pathType !== ruleSet2.pathType) {
        differences.push(`Different paths: ${ruleSet1.pathType} vs ${ruleSet2.pathType}`);
    }

    // Consider compatible if they have same basic structure
    const compatible = ruleSet1.piecesPerPlayer === ruleSet2.piecesPerPlayer &&
        ruleSet1.diceCount === ruleSet2.diceCount;

    return { differences, compatible };
}
