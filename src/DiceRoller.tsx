import { useState, forwardRef, useImperativeHandle } from 'react';
import { GameState } from './GameState';
import dieB1 from './assets/DieB1.svg';
import dieB2 from './assets/DieB2.svg';
import dieB3 from './assets/DieB3.svg';
import dieW1 from './assets/DieW1.svg';
import dieW2 from './assets/DieW2.svg';
import dieW3 from './assets/DieW3.svg';
import houseBonusIcon from './assets/HouseBonus.svg';
import templeBlessingIcon from './assets/TempleBlessing.svg';

interface DiceRollerProps {
    gameState: GameState;
}

export interface DiceRollerRef {
    triggerRoll: () => void;
    triggerInitialRoll: () => void;
}

const DiceRoller = forwardRef<DiceRollerRef, DiceRollerProps>(({ gameState }, ref) => {
    const state = gameState.state;
    const [isRolling, setIsRolling] = useState(false);
    const [animatedRoll, setAnimatedRoll] = useState<number[]>([]);
    const [isInitialRolling, setIsInitialRolling] = useState(false);
    const [animatedInitialRoll, setAnimatedInitialRoll] = useState<number>(0);

    // Animation constants
    const ANIMATION_DURATION = 800; // Total animation time in ms
    const FRAME_DURATION = 80; // Time between animation frames in ms

    const handleRoll = () => {
        if (isRolling) return; // Prevent multiple rolls during animation

        // Check if animations are enabled
        if (!gameState.gameSettings.diceAnimations) {
            // Skip animation, roll immediately
            gameState.rollDice();
            return;
        }

        setIsRolling(true);
        gameState.startDiceAnimation(); // Notify GameState that dice animation started

        // Get dice count from current rule set
        const currentRuleSet = gameState.getCurrentRuleSet();
        const diceCount = currentRuleSet.diceCount;

        // Start animation with random dice values
        const animationInterval = setInterval(() => {
            setAnimatedRoll(
                Array.from({ length: diceCount }, () => Math.floor(Math.random() * 2)) // 0 or 1 for each die
            );
        }, FRAME_DURATION);

        // Stop animation and show final result
        setTimeout(() => {
            clearInterval(animationInterval);
            gameState.rollDice();
            const finalRoll = gameState.state.diceRolls;
            setAnimatedRoll(finalRoll);
            setIsRolling(false);
            gameState.finishDiceAnimation(); // Notify GameState that dice animation finished
        }, ANIMATION_DURATION);
    };

    // Expose methods for programmatic control
    useImperativeHandle(ref, () => ({
        triggerRoll: handleRoll,
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
    const rolls = state.diceRolls;
    const diceTotal = state.diceTotal;

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

    // Playing phase - normal game
    return (
        <div>
            {rolls.length === 0 && !isRolling && (
                <button
                    onClick={handleRoll}
                    style={{
                        padding: '8px 16px',
                        fontSize: '1rem',
                        borderRadius: 4,
                        cursor: 'pointer',
                        backgroundColor: currentPlayer === 'white' ? '#f0f0f0' : '#333',
                        color: currentPlayer === 'white' ? '#333' : '#fff',
                        border: `2px solid ${currentPlayer === 'white' ? '#ccc' : '#666'}`,
                    }}
                >
                    {`Roll Dice (${currentPlayer})`}
                </button>
            )}

            {(rolls.length > 0 || isRolling) && (
                <div style={{ marginTop: '12px', fontSize: '1.5rem', fontWeight: 600, display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
                    {(isRolling ? animatedRoll : rolls).map((roll, i) => {
                        // Get random die image for the roll value
                        const diceImages = roll === 0 ? [dieB1, dieB2, dieB3] : [dieW1, dieW2, dieW3];
                        const randomDieImage = diceImages[i % diceImages.length]; // Use index to vary the dice appearance

                        return (
                            <img
                                key={i}
                                src={randomDieImage}
                                alt={`Die ${i + 1}: ${roll}`}
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '4px',
                                    transform: isRolling ? 'scale(1.1)' : 'scale(1)',
                                    transition: isRolling ? 'none' : 'transform 0.2s ease'
                                }}
                            />
                        );
                    })}

                    {/* Temple blessing icon inline with dice - applied first */}
                    {!isRolling && state.templeBlessingApplied && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: '#9370DB' }}>
                            <img src={templeBlessingIcon} alt="Temple blessing" style={{ height: '40px' }} />
                        </div>
                    )}

                    {/* House bonus icon inline with dice - applied second */}
                    {!isRolling && state.houseBonusApplied && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', color: '#FFD700' }}>
                            <img src={houseBonusIcon} alt="House bonus" style={{ height: '40px' }} />
                        </div>
                    )}
                </div>
            )}

            {(rolls.length > 0 || isRolling) && (
                <div style={{ marginTop: '12px', fontSize: '1.2rem', fontWeight: 'bold', color: '#646cff' }}>
                    {!isRolling && (
                        <>
                            Total: {diceTotal}
                        </>
                    )}
                </div>
            )}

            {gameState.shouldShowPassButton() && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={() => gameState.passTurn()}
                        style={{
                            padding: '8px 16px',
                            fontSize: '1rem',
                            borderRadius: 6,
                            cursor: 'pointer',
                            backgroundColor: '#ff6b6b',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 'bold'
                        }}
                    >
                        Pass Turn
                    </button>
                </div>
            )}
        </div>
    );
});

DiceRoller.displayName = 'DiceRoller';

export default DiceRoller;
