import { useEffect, useState } from 'react';
import { GameState } from './GameState';
import type { GameSettings } from './GameState';

export const useGameState = (initialSettings?: GameSettings) => {
    const [gameState] = useState(() => new GameState(initialSettings || GameState.loadSettings()));
    const [, forceUpdate] = useState({});

    useEffect(() => {
        const unsubscribe = gameState.subscribe(() => {
            forceUpdate({});
        });

        // Cleanup when component unmounts
        return () => {
            unsubscribe();
            gameState.cleanup();
        };
    }, [gameState]);

    return gameState;
};
