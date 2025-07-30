import { useEffect, useState } from 'react';
import { GameState } from './GameState';
import type { GameSettings } from './GameState';

export const useGameState = (initialSettings: GameSettings) => {
    const [gameState] = useState(() => new GameState(initialSettings));
    const [, forceUpdate] = useState({});

    useEffect(() => {
        const unsubscribe = gameState.subscribe(() => {
            forceUpdate({});
        });
        return unsubscribe;
    }, [gameState]);

    return gameState;
};
