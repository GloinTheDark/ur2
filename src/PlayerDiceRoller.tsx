import { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { GameState } from './GameState';
import dieB1 from './assets/DieB1.svg';
import dieB2 from './assets/DieB2.svg';
import dieB3 from './assets/DieB3.svg';
import dieW1 from './assets/DieW1.svg';
import dieW2 from './assets/DieW2.svg';
import dieW3 from './assets/DieW3.svg';
import houseBonusIcon from './assets/HouseBonus.svg';
import templeBlessingIcon from './assets/TempleBlessing.svg';

interface PlayerDiceRollerProps {
    player: 'white' | 'black';
    gameState: GameState;
}

export interface PlayerDiceRollerRef {
    triggerRoll: () => void;
}

const PlayerDiceRoller = forwardRef<PlayerDiceRollerRef, PlayerDiceRollerProps>(({ player, gameState }, ref) => {
    const state = gameState.state;
    const [isRolling, setIsRolling] = useState(false);
    const [animatedRoll, setAnimatedRoll] = useState<number[]>([]);

    // Animation constants
    const ANIMATION_DURATION = 800; // Total animation time in ms
    const FRAME_DURATION = 80; // Time between animation frames in ms

    const handleRoll = () => {
        // Only allow rolling if it's this player's turn
        if (state.currentPlayer !== player || isRolling) return;

        // Check if animations are enabled
        if (!gameState.gameSettings.diceAnimations) {
            // Skip animation, roll immediately
            gameState.rollDice();
            return;
        }

        setIsRolling(true);

        // Get dice count from current rule set
        const currentRuleSet = gameState.getCurrentRuleSet();
        const diceCount = currentRuleSet.diceCount;

        setAnimatedRoll(
            Array.from({ length: diceCount }, () => Math.floor(Math.random() * 2))
        );

        // Start animation with random dice values
        const animationInterval = setInterval(() => {
            setAnimatedRoll(
                Array.from({ length: diceCount }, () => Math.floor(Math.random() * 2))
            );
        }, FRAME_DURATION);

        // Stop animation and show final result
        setTimeout(() => {
            clearInterval(animationInterval);
            gameState.rollDice();
            setAnimatedRoll([...state.diceRolls]);
            setIsRolling(false);
            gameState.finishDiceAnimation(); // Notify GameState that dice animation finished
        }, ANIMATION_DURATION);
    };

    // Expose methods for programmatic control
    useImperativeHandle(ref, () => ({
        triggerRoll: handleRoll
    }));

    // Auto-trigger roll when dice animation starts for this player
    useEffect(() => {
        if (state.diceAnimating && state.currentPlayer === player && !isRolling) {
            // Only start rolling if animations are enabled
            if (gameState.gameSettings.diceAnimations) {
                handleRoll();
            }
        }
    }, [state.diceAnimating, state.currentPlayer, player, isRolling]);

    // Determine which dice to display
    const isCurrentPlayer = state.currentPlayer === player;
    const isAnimating = isRolling && isCurrentPlayer;

    let displayDice: number[] = [];
    let displayOpacity = 1;

    if (isAnimating) {
        // Show animated dice during roll
        displayDice = animatedRoll;
    } else if (isCurrentPlayer && state.diceRolls.length > 0) {
        // Show current player's current roll
        displayDice = state.diceRolls;
    } else {
        // Show this player's previous roll at reduced opacity (both for current player waiting to roll and non-current player)
        displayDice = gameState.getPreviousDiceRolls(player);
        displayOpacity = isCurrentPlayer ? 0.7 : 0.5; // Slightly brighter for current player
    }

    // Function to get the correct die image
    const getDieImage = (value: number, dieIndex: number) => {
        // Get random die image for the roll value
        const diceImages = value === 0 ? [dieB1, dieB2, dieB3] : [dieW1, dieW2, dieW3];
        const randomDieImage = diceImages[dieIndex % diceImages.length]; // Use index to vary the dice appearance
        return randomDieImage;
    };

    // Check for bonus/blessing indicators
    const showHouseBonus = isCurrentPlayer && state.houseBonusApplied;
    const showTempleBlessing = isCurrentPlayer && state.templeBlessingApplied;

    // Check if we're in a horizontal orientation (1 or 3) for two-row layout
    const boardOrientation = gameState.getBoardOrientation();
    const useVerticalLayout = boardOrientation === 1 || boardOrientation === 3;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: useVerticalLayout ? 'column' : 'row',
                alignItems: 'center',
                gap: useVerticalLayout ? '4px' : '8px',
                opacity: displayOpacity,
                transition: 'opacity 0.3s ease',
                height: useVerticalLayout ? '80px' : 'auto', // Fixed height for vertical layout
                justifyContent: useVerticalLayout ? 'flex-start' : 'flex-start'
            }}
        >
            {/* Dice display */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {displayDice.map((value, index) => (
                    <img
                        key={`${player}-die-${index}`}
                        src={getDieImage(value, index)}
                        alt={`${player} die ${index + 1}: ${value}`}
                        style={{
                            height: '36px',
                            display: 'block'
                        }}
                    />
                ))}
            </div>

            {/* Bonus indicators and total - second row in vertical layout */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                justifyContent: 'center'
            }}>
                {/* Temple blessing indicator */}
                {showTempleBlessing && (
                    <img
                        src={templeBlessingIcon}
                        alt="Temple Blessing"
                        title="Temple Blessing: Reroll if total is 0"
                        style={{
                            height: '30px'
                        }}
                    />
                )}

                {/* House bonus indicator */}
                {showHouseBonus && (
                    <img
                        src={houseBonusIcon}
                        alt="House Bonus"
                        title="House Bonus: +1 to dice roll"
                        style={{
                            height: '30px'
                        }}
                    />
                )}

                {/* Total display */}
                {isCurrentPlayer && state.diceTotal > 0 && (
                    <div style={{
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        color: '#646cff',
                        marginLeft: '4px'
                    }}>
                        = {state.diceTotal}
                    </div>
                )}
            </div>
        </div>
    );
});

PlayerDiceRoller.displayName = 'PlayerDiceRoller';

export default PlayerDiceRoller;
