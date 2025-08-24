import React, { useState, useEffect } from 'react';
import type { PlayerType } from './player-agents';
import { isNeuralModelAvailableForRuleset } from './player-agents';
import { DEFAULT_RULE_SET, getRuleSetByName } from './RuleSets';

export interface GameSetupProps {
    onStartGame: (whitePlayer: PlayerType, blackPlayer: PlayerType, whiteAgentType: 'computer' | 'mcts' | 'random' | 'exhaustive' | 'neural' | null, blackAgentType: 'computer' | 'mcts' | 'random' | 'exhaustive' | 'neural' | null) => void;
    currentRuleSet?: string; // Optional prop to check for model availability
}

type PlayerOption = 'human' | 'computer' | 'mcts' | 'random' | 'exhaustive' | 'neural';

interface GameSetupState {
    whitePlayerOption: PlayerOption;
    blackPlayerOption: PlayerOption;
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

    const isAvailable = await isNeuralModelAvailableForRuleset(ruleSetName);
    modelAvailabilityCache.set(cacheKey, isAvailable);
    return isAvailable;
};


const GameSetup: React.FC<GameSetupProps> = ({ onStartGame, currentRuleSet = DEFAULT_RULE_SET.name }) => {
    const [whitePlayerOption, setWhitePlayerOption] = useState<PlayerOption>('human');
    const [blackPlayerOption, setBlackPlayerOption] = useState<PlayerOption>('human');
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
        const { type: whiteType, agentType: whiteAgentType } = parsePlayerOption(whitePlayerOption);
        const { type: blackType, agentType: blackAgentType } = parsePlayerOption(blackPlayerOption);

        onStartGame(whiteType, blackType, whiteAgentType, blackAgentType);
    };

    const parsePlayerOption = (option: PlayerOption): { type: PlayerType; agentType: 'computer' | 'mcts' | 'random' | 'exhaustive' | 'neural' | null } => {
        switch (option) {
            case 'human':
                return { type: 'human', agentType: null };
            case 'computer':
                return { type: 'computer', agentType: 'computer' };
            case 'mcts':
                return { type: 'computer', agentType: 'mcts' };
            case 'random':
                return { type: 'computer', agentType: 'random' };
            case 'exhaustive':
                return { type: 'computer', agentType: 'exhaustive' };
            case 'neural':
                return { type: 'computer', agentType: 'neural' };
            default:
                return { type: 'human', agentType: null };
        }
    };

    const getGameModeDescription = (): string => {
        const { type: whiteType, agentType: whiteAgentType } = parsePlayerOption(whitePlayerOption);
        const { type: blackType, agentType: blackAgentType } = parsePlayerOption(blackPlayerOption);

        if (whiteType === 'human' && blackType === 'human') {
            return 'Two players taking turns on the same device';
        } else if (whiteType === 'human' && blackType === 'computer') {
            const computerType = blackAgentType === 'computer' ? 'Computer' :
                blackAgentType === 'mcts' ? 'Computer (MCTS)' :
                    blackAgentType === 'exhaustive' ? 'Computer (Exhaustive)' : 'Random Computer';
            return `You play as White against ${computerType}`;
        } else if (whiteType === 'computer' && blackType === 'human') {
            const computerType = whiteAgentType === 'computer' ? 'Computer' :
                whiteAgentType === 'mcts' ? 'Computer (MCTS)' :
                    whiteAgentType === 'exhaustive' ? 'Computer (Exhaustive)' : 'Random Computer';
            return `You play as Black against ${computerType}`;
        } else {
            const whiteComputerType = whiteAgentType === 'computer' ? 'Computer' :
                whiteAgentType === 'mcts' ? 'Computer (MCTS)' :
                    whiteAgentType === 'exhaustive' ? 'Computer (Exhaustive)' :
                        whiteAgentType === 'neural' ? 'Computer (Neural)' : 'Random Computer';
            const blackComputerType = blackAgentType === 'computer' ? 'Computer' :
                blackAgentType === 'mcts' ? 'Computer (MCTS)' :
                    blackAgentType === 'exhaustive' ? 'Computer (Exhaustive)' :
                        blackAgentType === 'neural' ? 'Computer (Neural)' : 'Random Computer';
            return `Watch ${whiteComputerType} (White) vs ${blackComputerType} (Black)`;
        }
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
                    onChange={(e) => setWhitePlayerOption(e.target.value as PlayerOption)}
                    style={selectStyle}
                >
                    <option value="human">Human</option>
                    <option value="computer">Computer</option>
                    <option value="mcts">Computer (MCTS)</option>
                    <option value="exhaustive">Computer (Exhaustive)</option>
                    {isNeuralAvailable && (
                        <option value="neural">Computer (Neural)</option>
                    )}
                    <option value="random">Random Computer</option>
                </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', color: 'var(--text-color, #333)' }}>Black Player</h3>
                <select
                    value={blackPlayerOption}
                    onChange={(e) => setBlackPlayerOption(e.target.value as PlayerOption)}
                    style={selectStyle}
                >
                    <option value="human">Human</option>
                    <option value="computer">Computer</option>
                    <option value="mcts">Computer (MCTS)</option>
                    <option value="exhaustive">Computer (Exhaustive)</option>
                    {isNeuralAvailable && (
                        <option value="neural">Computer (Neural)</option>
                    )}
                    <option value="random">Random Computer</option>
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
