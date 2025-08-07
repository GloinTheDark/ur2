import { useRef, forwardRef, useImperativeHandle } from 'react';
import { GameState } from './GameState';
import DiceRoller from './DiceRoller';
import type { DiceRollerRef } from './DiceRoller';

interface DualDiceRollerProps {
    gameState: GameState;
}

export interface DualDiceRollerRef {
    triggerRoll: () => void;
    triggerInitialRoll: () => void;
}

const DualDiceRoller = forwardRef<DualDiceRollerRef, DualDiceRollerProps>(({ gameState }, ref) => {
    const mainDiceRef = useRef<DiceRollerRef>(null);

    // Expose methods for programmatic control
    useImperativeHandle(ref, () => ({
        triggerRoll: () => {
            // For playing phase, the individual PlayerDiceRollers in PlayerHome will handle this
            // This fallback is mainly for the main dice roller during initial roll
            if (mainDiceRef.current) {
                mainDiceRef.current.triggerRoll();
            }
        },
        triggerInitialRoll: () => {
            // Use main dice roller for initial roll
            if (mainDiceRef.current) {
                mainDiceRef.current.triggerInitialRoll();
            }
        }
    }));

    const state = gameState.state;

    // During initial roll phase, show the main dice roller
    if (state.gamePhase === 'initial-roll') {
        return <DiceRoller ref={mainDiceRef} gameState={gameState} />;
    }

    // During playing phase, don't show anything here since dice rollers are in PlayerHome
    return null;
});

DualDiceRoller.displayName = 'DualDiceRoller';

export default DualDiceRoller;
