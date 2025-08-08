import { GameState } from '../GameState';
import type { PlayerAgent, PlayerType } from './PlayerAgent';

export class HumanPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'human';
    readonly color: 'white' | 'black';

    constructor(color: 'white' | 'black') {
        this.color = color;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onTurnStart(_gameState: GameState): Promise<void> {
        // For human players, the UI handles dice rolling
        // This is a no-op since humans interact directly with the UI
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onMoveRequired(_gameState: GameState): Promise<void> {
        // For human players, the UI handles piece selection and movement
        // This is a no-op since humans interact directly with the UI
    }

    getPlayerName(): string {
        return this.color.charAt(0).toUpperCase() + this.color.slice(1);
    }

    cleanup(): void {
        // No cleanup needed for human players
    }
}
