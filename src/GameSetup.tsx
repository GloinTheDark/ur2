import React, { useState, useEffect } from 'react';
import type { PlayerType } from './PlayerAgent';

export interface GameSetupProps {
    onStartGame: (whitePlayer: PlayerType, blackPlayer: PlayerType, whiteDifficulty: 'easy' | 'medium' | 'hard' | null, blackDifficulty: 'easy' | 'medium' | 'hard' | null) => void;
}

type PlayerOption = 'human' | 'easy-computer' | 'medium-computer' | 'hard-computer';

interface GameSetupState {
    whitePlayerOption: PlayerOption;
    blackPlayerOption: PlayerOption;
}

const STORAGE_KEY = 'ur-game-setup';

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
    const [whitePlayerOption, setWhitePlayerOption] = useState<PlayerOption>('human');
    const [blackPlayerOption, setBlackPlayerOption] = useState<PlayerOption>('human');
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings from localStorage on component mount
    useEffect(() => {
        try {
            const savedSetup = localStorage.getItem(STORAGE_KEY);
            if (savedSetup) {
                const parsedSetup: GameSetupState = JSON.parse(savedSetup);
                setWhitePlayerOption(parsedSetup.whitePlayerOption || 'human');
                setBlackPlayerOption(parsedSetup.blackPlayerOption || 'human');
            }
            setIsLoaded(true);
        } catch (error) {
            console.warn('Failed to load game setup from localStorage:', error);
            setIsLoaded(true);
        }
    }, []);

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
        const { type: whiteType, difficulty: whiteDifficulty } = parsePlayerOption(whitePlayerOption);
        const { type: blackType, difficulty: blackDifficulty } = parsePlayerOption(blackPlayerOption);

        onStartGame(whiteType, blackType, whiteDifficulty, blackDifficulty);
    };

    const parsePlayerOption = (option: PlayerOption): { type: PlayerType; difficulty: 'easy' | 'medium' | 'hard' | null } => {
        switch (option) {
            case 'human':
                return { type: 'human', difficulty: null };
            case 'easy-computer':
                return { type: 'computer', difficulty: 'easy' };
            case 'medium-computer':
                return { type: 'computer', difficulty: 'medium' };
            case 'hard-computer':
                return { type: 'computer', difficulty: 'hard' };
            default:
                return { type: 'human', difficulty: null };
        }
    };

    const getGameModeDescription = (): string => {
        const { type: whiteType, difficulty: whiteDifficulty } = parsePlayerOption(whitePlayerOption);
        const { type: blackType, difficulty: blackDifficulty } = parsePlayerOption(blackPlayerOption);

        if (whiteType === 'human' && blackType === 'human') {
            return 'Two players taking turns on the same device';
        } else if (whiteType === 'human' && blackType === 'computer') {
            return `You play as White against ${blackDifficulty} computer`;
        } else if (whiteType === 'computer' && blackType === 'human') {
            return `You play as Black against ${whiteDifficulty} computer`;
        } else {
            return `Watch ${whiteDifficulty} computer (White) vs ${blackDifficulty} computer (Black)`;
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
                    <option value="easy-computer">Easy Computer</option>
                    <option value="medium-computer">Medium Computer</option>
                    <option value="hard-computer">Hard Computer</option>
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
                    <option value="easy-computer">Easy Computer</option>
                    <option value="medium-computer">Medium Computer</option>
                    <option value="hard-computer">Hard Computer</option>
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
