import React, { useState } from 'react';
import type { PlayerType } from './PlayerAgent';

export interface GameSetupProps {
    onStartGame: (whitePlayer: PlayerType, blackPlayer: PlayerType, difficulty: 'easy' | 'medium' | 'hard') => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ onStartGame }) => {
    const [whitePlayer, setWhitePlayer] = useState<PlayerType>('human');
    const [blackPlayer, setBlackPlayer] = useState<PlayerType>('human');
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

    const handleStartGame = () => {
        onStartGame(whitePlayer, blackPlayer, difficulty);
    };

    const getGameModeDescription = () => {
        if (whitePlayer === 'human' && blackPlayer === 'human') {
            return 'Two players taking turns on the same device';
        } else if (whitePlayer === 'human' && blackPlayer === 'computer') {
            return 'You play as White against the computer';
        } else if (whitePlayer === 'computer' && blackPlayer === 'human') {
            return 'You play as Black against the computer';
        } else {
            return 'Watch two computer players compete';
        }
    };

    const showDifficultySelector = whitePlayer === 'computer' || blackPlayer === 'computer';

    return (
        <div style={{
            padding: '20px',
            maxWidth: '500px',
            margin: '0 auto',
            backgroundColor: 'var(--modal-bg, #f9f9f9)',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #ddd)',
            color: 'var(--text-color, #333)'
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--title-color, #333)' }}>Game Setup</h2>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', color: 'var(--text-color, #333)' }}>White Player</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-color, #333)' }}>
                        <input
                            type="radio"
                            value="human"
                            checked={whitePlayer === 'human'}
                            onChange={(e) => setWhitePlayer(e.target.value as PlayerType)}
                        />
                        Human
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-color, #333)' }}>
                        <input
                            type="radio"
                            value="computer"
                            checked={whitePlayer === 'computer'}
                            onChange={(e) => setWhitePlayer(e.target.value as PlayerType)}
                        />
                        Computer
                    </label>
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '10px', color: 'var(--text-color, #333)' }}>Black Player</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-color, #333)' }}>
                        <input
                            type="radio"
                            value="human"
                            checked={blackPlayer === 'human'}
                            onChange={(e) => setBlackPlayer(e.target.value as PlayerType)}
                        />
                        Human
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-color, #333)' }}>
                        <input
                            type="radio"
                            value="computer"
                            checked={blackPlayer === 'computer'}
                            onChange={(e) => setBlackPlayer(e.target.value as PlayerType)}
                        />
                        Computer
                    </label>
                </div>
            </div>

            {showDifficultySelector && (
                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '10px', color: 'var(--text-color, #333)' }}>Computer Difficulty</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-color, #333)' }}>
                            <input
                                type="radio"
                                value="easy"
                                checked={difficulty === 'easy'}
                                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                            />
                            Easy
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-color, #333)' }}>
                            <input
                                type="radio"
                                value="medium"
                                checked={difficulty === 'medium'}
                                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                            />
                            Medium
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-color, #333)' }}>
                            <input
                                type="radio"
                                value="hard"
                                checked={difficulty === 'hard'}
                                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                            />
                            Hard
                        </label>
                    </div>
                </div>
            )}

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
