import { GameState } from '../GameState';
import type { PlayerAgent, PlayerType, PlayerStatus, GameMove } from './PlayerAgent';

/**
 * Remote Player Agent for multiplayer games
 * 
 * This agent represents a player connected over the network. It handles
 * network communication, real-time synchronization, and multiplayer
 * features while implementing the standard PlayerAgent interface.
 * 
 * NOTE: This is a Phase 1 stub. Full implementation will be added in Phase 2.
 */
export class RemotePlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'remote';
    readonly color: 'white' | 'black';
    readonly playerId: string;
    readonly sessionId: string;
    isConnected: boolean = true;
    lastSeen: Date = new Date();

    private gameService: any; // Will be properly typed when OnlineGameService is implemented
    private unsubscribers: (() => void)[] = [];
    private currentGameState?: GameState;

    constructor(
        color: 'white' | 'black',
        playerId: string,
        sessionId: string,
        gameService: any
    ) {
        this.color = color;
        this.playerId = playerId;
        this.sessionId = sessionId;
        this.gameService = gameService;
    }

    // Implement existing PlayerAgent interface
    async onTurnStart(gameState: GameState): Promise<void> {
        // TODO: Phase 2 - Implement turn start logic for remote players
        this.currentGameState = gameState;
        console.log(`RemotePlayerAgent: onTurnStart called for ${this.color} player ${this.playerId}`);
    }

    async onMoveRequired(gameState: GameState): Promise<void> {
        // TODO: Phase 2 - Implement move required logic for remote players
        this.currentGameState = gameState;
        console.log(`RemotePlayerAgent: onMoveRequired called for ${this.color} player ${this.playerId}`);
    }

    getPlayerName(): string {
        return this.isLocalPlayer() ? 'You' : 'Remote Player';
    }

    cleanup(): void {
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers = [];
    }

    // Multiplayer methods (stubs for Phase 1)
    async sendMessage(message: string): Promise<void> {
        // TODO: Phase 2 - Implement message sending
        console.log(`RemotePlayerAgent: sendMessage called with "${message}"`);
    }

    async requestDraw(): Promise<void> {
        // TODO: Phase 2 - Implement draw request
        console.log(`RemotePlayerAgent: requestDraw called`);
    }

    async acceptDraw(): Promise<void> {
        // TODO: Phase 2 - Implement draw acceptance
        console.log(`RemotePlayerAgent: acceptDraw called`);
    }

    async setStatus(status: PlayerStatus): Promise<void> {
        // TODO: Phase 2 - Implement status setting
        console.log(`RemotePlayerAgent: setStatus called with ${status}`);
    }

    async heartbeat(): Promise<void> {
        // TODO: Phase 2 - Implement heartbeat
        this.lastSeen = new Date();
    }

    // Event handlers (will be set by game components)
    onOpponentMove?: (move: GameMove) => void;
    onStatusChange?: (status: PlayerStatus) => void;
    onMessage?: (message: string) => void;
    onDisconnect?: () => void;
    onReconnect?: () => void;

    // Helper methods
    private isLocalPlayer(): boolean {
        // TODO: Phase 2 - Implement proper local player detection
        // This would check against the current user's ID from auth context
        return true; // Stub implementation
    }

    // Phase 2 methods (stubs for now)
    async submitDiceRoll(diceResult: number[]): Promise<void> {
        // TODO: Phase 2 - Implement dice roll submission
        console.log(`RemotePlayerAgent: submitDiceRoll called with ${diceResult}`);
    }

    async submitPieceMove(fromPosition: number, toPosition: number): Promise<void> {
        // TODO: Phase 2 - Implement piece move submission
        console.log(`RemotePlayerAgent: submitPieceMove called from ${fromPosition} to ${toPosition}`);
    }
}
