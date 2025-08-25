import React, { useState, useEffect } from 'react';
import type { PlayerType } from './player-agents';
import { PlayerAgentRegistry, type AgentType, isNeuralModelAvailableForRuleset } from './player-agents';
import { DEFAULT_RULE_SET, getRuleSetByName } from './RuleSets';

export interface GameSetupProps {
    onStartGame: (whitePlayer: PlayerType, blackPlayer: PlayerType, whiteAgentType: AgentType | null, blackAgentType: AgentType | null) => void;
    currentRuleSet?: string; // Optional prop to check for model availability
}

interface GameSetupState {
    whitePlayerOption: AgentType;
    blackPlayerOption: AgentType;
}

const STORAGE_KEY = 'ur-game-setup';

// Cache for model availability to avoid repeated network requests
const modelAvailabilityCache = new Map<string, boolean>();

const checkModelAvailability = async (ruleSetName: string): Promise<boolean> => {
    // Get the ruleset ID for cache key
    const ruleSet = getRuleSetByName(ruleSetName);
    const cacheKey = ruleSet.id.toLowerCase();

    if (modelAvailabilityCache.has(cacheKey)) {
        return modelAvailabilityCache.get(cacheKey)!;
    }

    try {
        const isAvailable = await isNeuralModelAvailableForRuleset(ruleSetName);
        modelAvailabilityCache.set(cacheKey, isAvailable);
        return isAvailable;
    } catch (error) {
        console.error('Error checking model availability:', error);
        modelAvailabilityCache.set(cacheKey, false);
        return false;
    }
};

// Export for debugging
// (window as any).testNeuralAvailability = async () => {
//     console.log('Testing neural availability...');
//     const result = await isNeuralModelAvailableForRuleset('Burglers of Ur');
//     console.log('Result:', result);
//     return result;
// };


const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, currentRuleSet = DEFAULT_RULE_SET.name }) => {
    const [whitePlayerOption, setWhitePlayerOption] = useState<AgentType>('human');
    const [blackPlayerOption, setBlackPlayerOption] = useState<AgentType>('human');
    const [isLoaded, setIsLoaded] = useState(false);
    const [isNeuralAvailable, setIsNeuralAvailable] = useState(false);

    // Check if neural model is available for current ruleset
    useEffect(() => {
        checkModelAvailability(currentRuleSet).then(setIsNeuralAvailable);
    }, [currentRuleSet]);

    // Load settings from localStorage on component mount
    useEffect(() => {
        try {
            const savedSetup = localStorage.getItem(STORAGE_KEY);
            if (savedSetup) {
                const parsedSetup: GameSetupState = JSON.parse(savedSetup);
                let whiteOption = parsedSetup.whitePlayerOption || 'human';
                let blackOption = parsedSetup.blackPlayerOption || 'human';

                // Reset to human if neural is selected but no model is available
                if (whiteOption === 'neural' && !isNeuralAvailable) {
                    whiteOption = 'human';
                }
                if (blackOption === 'neural' && !isNeuralAvailable) {
                    blackOption = 'human';
                }

                setWhitePlayerOption(whiteOption);
                setBlackPlayerOption(blackOption);
            }
            setIsLoaded(true);
        } catch (error) {
            console.warn('Failed to load game setup from localStorage:', error);
            setIsLoaded(true);
        }
    }, [currentRuleSet, isNeuralAvailable]);

    // Save settings to localStorage whenever they change (but only after initial load)
    useEffect(() => {
        if (!isLoaded) return; // Don't save during initial load

        try {
            const setupState: GameSetupState = {
                whitePlayerOption,
                blackPlayerOption
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(setupState));
        } catch (error) {
            console.warn('Failed to save game setup to localStorage:', error);
        }
    }, [whitePlayerOption, blackPlayerOption, isLoaded]);

    const handleStartGame = () => {
        const { type: whiteType, agentType: whiteAgentType } = PlayerAgentRegistry.parsePlayerOption(whitePlayerOption);
        const { type: blackType, agentType: blackAgentType } = PlayerAgentRegistry.parsePlayerOption(blackPlayerOption);

        onStartGame(whiteType, blackType, whiteAgentType, blackAgentType);
    };

    const getGameModeDescription = (): string => {
        return PlayerAgentRegistry.getMatchupDescription(whitePlayerOption, blackPlayerOption);
    };

    const selectStyle = {
        width: '100%',
        padding: '8px 12px',
        fontSize: '1rem',
        borderRadius: '4px',
        border: '2px solid var(--border-color, #ddd)',
        backgroundColor: 'var(--input-bg, #fff)',
        color: 'var(--text-color, #333)',
        cursor: 'pointer',
        // Force better contrast for options in dark mode
        WebkitAppearance: 'none' as const,
        MozAppearance: 'none' as const,
        appearance: 'none' as const,
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 8px center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '16px',
        filter: 'var(--dark-mode-filter, none)'
    };

    return (
        <div style={{
            padding: '24px',
            backgroundColor: 'var(--modal-bg, #f9f9f9)',
            borderRadius: '12px',
            border: '2px solid var(--border-color, #ddd)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            maxWidth: '500px',
            margin: '0 auto',
            color: 'var(--text-color, #333)'
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--title-color, #333)' }}>Game Setup</h2>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', color: 'var(--text-color, #333)' }}>White Player</h3>
                <select
                    value={whitePlayerOption}
                    onChange={(e) => setWhitePlayerOption(e.target.value as AgentType)}
                    style={selectStyle}
                >
                    {PlayerAgentRegistry.getAllAgentInfo()
                        .filter(agentInfo => !agentInfo.requiresModel || isNeuralAvailable)
                        .map(agentInfo => (
                            <option
                                key={agentInfo.id}
                                value={agentInfo.id}
                            >
                                {agentInfo.name}
                            </option>
                        ))}
                </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', color: 'var(--text-color, #333)' }}>Black Player</h3>
                <select
                    value={blackPlayerOption}
                    onChange={(e) => setBlackPlayerOption(e.target.value as AgentType)}
                    style={selectStyle}
                >
                    {PlayerAgentRegistry.getAllAgentInfo()
                        .filter(agentInfo => !agentInfo.requiresModel || isNeuralAvailable)
                        .map(agentInfo => (
                            <option
                                key={agentInfo.id}
                                value={agentInfo.id}
                            >
                                {agentInfo.name}
                            </option>
                        ))}
                </select>
            </div>

            <div style={{
                padding: '15px',
                backgroundColor: 'var(--highlight-bg, #e9f4ff)',
                borderRadius: '6px',
                marginBottom: '20px',
                fontStyle: 'italic',
                color: 'var(--text-secondary, #666)'
            }}>
                {getGameModeDescription()}
            </div>

            <button
                onClick={handleStartGame}
                style={{
                    width: '100%',
                    padding: '12px 24px',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    backgroundColor: '#646cff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                }}
            >
                Start Game
            </button>
        </div>
    );
};

export default GameSetup;
