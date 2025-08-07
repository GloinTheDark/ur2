import { useState, forwardRef, useImperativeHandle } from 'react';
import { GameState } from './GameState';
import dieB1 from './assets/DieB1.svg';
import dieW1 from './assets/DieW1.svg';

interface DiceRollerProps {
    gameState: GameState;
}

export interface DiceRollerRef {
    triggerRoll: () => void;
    triggerInitialRoll: () => void;
}

const DiceRoller = forwardRef<DiceRollerRef, DiceRollerProps>(({ gameState }, ref) => {
    const state = gameState.state;
    const [isInitialRolling, setIsInitialRolling] = useState(false);
    const [animatedInitialRoll, setAnimatedInitialRoll] = useState<number>(0);

    // Animation constants
    const ANIMATION_DURATION = 800; // Total animation time in ms
    const FRAME_DURATION = 80; // Time between animation frames in ms

    // Expose methods for programmatic control
    useImperativeHandle(ref, () => ({
        triggerRoll: () => { }, // No longer used - handled by PlayerDiceRoller
        triggerInitialRoll: handleInitialRoll
    }));

    const handleInitialRoll = () => {
        if (isInitialRolling) return; // Prevent multiple rolls during animation

        // Check if animations are enabled
        if (!gameState.gameSettings.diceAnimations) {
            // Skip animation, roll immediately
            gameState.rollForFirstPlayer();
            return;
        }

        setIsInitialRolling(true);
        gameState.startDiceAnimation(); // Notify GameState that dice animation started

        // Start animation with random dice values
        const animationInterval = setInterval(() => {
            setAnimatedInitialRoll(Math.floor(Math.random() * 2)); // 0 or 1
        }, FRAME_DURATION);

        // Stop animation and show final result
        setTimeout(() => {
            clearInterval(animationInterval);
            gameState.rollForFirstPlayer();
            const finalRoll = gameState.state.initialRollResult;
            if (finalRoll !== null) {
                setAnimatedInitialRoll(finalRoll);
            }
            setIsInitialRolling(false);
            gameState.finishDiceAnimation(); // Notify GameState that dice animation finished
        }, ANIMATION_DURATION);
    };

    const handleProceedToGame = () => {
        gameState.proceedToGame();
    };

    const currentPlayer = state.currentPlayer;

    // Initial roll phase
    if (state.gamePhase === 'initial-roll') {
        return (
            <div>
                <div style={{ marginBottom: '20px', fontSize: '1.2rem', fontWeight: 'bold', textAlign: 'center' }}>
                    Roll a die to see who goes first!
                </div>

                {state.initialRollResult === null ? (
                    <div style={{ textAlign: 'center' }}>
                        {isInitialRolling && (
                            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                                <img
                                    src={animatedInitialRoll === 0 ? dieB1 : dieW1}
                                    alt="Rolling..."
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '4px',
                                        transform: 'scale(1.1)',
                                        transition: 'none'
                                    }}
                                />
                            </div>
                        )}
                        <button
                            onClick={handleInitialRoll}
                            disabled={isInitialRolling}
                            style={{
                                padding: '12px 24px',
                                fontSize: '1.1rem',
                                borderRadius: 6,
                                cursor: isInitialRolling ? 'not-allowed' : 'pointer',
                                backgroundColor: isInitialRolling ? '#ccc' : '#646cff',
                                color: isInitialRolling ? '#666' : '#fff',
                                border: 'none',
                                fontWeight: 'bold',
                                opacity: isInitialRolling ? 0.6 : 1
                            }}
                        >
                            {isInitialRolling ? 'Rolling...' : 'Roll Die'}
                        </button>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ marginBottom: '16px', fontSize: '1.1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <div>
                                <strong>Roll result:</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <img
                                    src={state.initialRollResult === 0 ? dieB1 : dieW1}
                                    alt={`Die result: ${state.initialRollResult}`}
                                    style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '4px',
                                        transform: 'scale(1)',
                                        transition: 'transform 0.3s ease'
                                    }}
                                />
                            </div>
                            <div style={{
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                color: currentPlayer === 'white' ? '#666' : '#333'
                            }}>
                                {currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)} goes first!
                            </div>
                        </div>

                        <button
                            onClick={handleProceedToGame}
                            style={{
                                padding: '12px 24px',
                                fontSize: '1.1rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                backgroundColor: '#4CAF50',
                                color: '#fff',
                                border: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            Start Game
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // Playing phase handled by PlayerDiceRoller components
    return null;
});

DiceRoller.displayName = 'DiceRoller';

export default DiceRoller;
