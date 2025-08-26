import { GameState } from '../GameState';
import type { PlayerAgent, PlayerType, PlayerStatus, GameMove, GameStateSnapshot } from './PlayerAgent';
import { OnlineGameService } from '../services/OnlineGameService';
import { isCurrentUser, getPlayerDisplayName } from '../utils/multiplayerUtils';
import type { Unsubscribe } from 'firebase/firestore';

/**
 * Remote Player Agent for multiplayer games
 * 
 * This agent represents a player connected over the network. It handles
 * network communication, real-time synchronization, and multiplayer
 * features while implementing the standard PlayerAgent interface.
 */
export class RemotePlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'remote';
    readonly color: 'white' | 'black';
    readonly playerId: string;
    readonly sessionId: string;
    isConnected: boolean = true;
    lastSeen: Date = new Date();
    
    private gameService: OnlineGameService;
    private unsubscribers: Unsubscribe[] = [];
    private currentGameState?: GameState;
    private currentUserId: string | null;
    private remotePlayerName?: string;
    
    constructor(
        color: 'white' | 'black',
        playerId: string,
        sessionId: string,
        gameService: OnlineGameService,
        currentUserId: string | null = null,
        remotePlayerName?: string
    ) {
        this.color = color;
        this.playerId = playerId;
        this.sessionId = sessionId;
        this.gameService = gameService;
        this.currentUserId = currentUserId;
        this.remotePlayerName = remotePlayerName;
        this.setupListeners();
    }
    
    // Implement existing PlayerAgent interface
    async onTurnStart(gameState: GameState): Promise<void> {
        this.currentGameState = gameState;
        
        if (this.isLocalPlayer()) {
            // Local player - start dice roll and submit to remote
            console.log(`RemotePlayerAgent: Local player ${this.color} starting turn`);
            
            // Let the game state handle the dice roll
            gameState.startDiceRoll();
            
            // Submit the dice roll to remote players
            await this.submitDiceRoll(gameState.state.diceRolls);
        } else {
            // Remote player - wait for their move via listener
            console.log(`RemotePlayerAgent: Waiting for remote player ${this.color} to start turn`);
            await this.setStatus('active');
        }
    }
    
    async onMoveRequired(gameState: GameState): Promise<void> {
        this.currentGameState = gameState;
        
        if (this.isLocalPlayer()) {
            // Local player - UI will handle piece selection
            // When a move is made through the UI, it will call submitPieceMove
            console.log(`RemotePlayerAgent: Local player ${this.color} can make move`);
        } else {
            // Remote player - wait for their move via listener
            console.log(`RemotePlayerAgent: Waiting for remote player ${this.color} to make move`);
            await this.setStatus('thinking');
        }
    }
    
    getPlayerName(): string {
        return getPlayerDisplayName(this.playerId, this.currentUserId, this.remotePlayerName);
    }
    
    cleanup(): void {
        this.unsubscribers.forEach(unsubscribe => unsubscribe());
        this.unsubscribers = [];
    }
    
    // Multiplayer methods
    async sendMessage(message: string): Promise<void> {
        await this.gameService.sendMessage(this.sessionId, this.playerId, message);
    }
    
    async requestDraw(): Promise<void> {
        await this.gameService.requestDraw(this.sessionId, this.playerId);
    }
    
    async acceptDraw(): Promise<void> {
        await this.gameService.acceptDraw(this.sessionId, this.playerId);
    }
    
    async setStatus(status: PlayerStatus): Promise<void> {
        await this.gameService.updatePlayerStatus(this.sessionId, this.playerId, status);
    }
    
    async heartbeat(): Promise<void> {
        this.lastSeen = new Date();
        await this.gameService.updatePlayerHeartbeat(this.sessionId, this.playerId);
    }
    
    // Event handlers (set by game components)
    onOpponentMove?: (move: GameMove) => void;
    onStatusChange?: (status: PlayerStatus) => void;
    onMessage?: (message: string) => void;
    onDisconnect?: () => void;
    onReconnect?: () => void;
    
    // Network submission methods
    async submitDiceRoll(diceResult: number[]): Promise<void> {
        if (!this.currentGameState) {
            console.warn('RemotePlayerAgent: No current game state for dice roll submission');
            return;
        }
        
        const move: GameMove = {
            sessionId: this.sessionId,
            playerId: this.playerId,
            moveType: 'dice-roll',
            moveData: { diceResult },
            timestamp: new Date(),
            turnNumber: this.currentGameState.state.turnCount,
            resultingState: this.createGameStateSnapshot()
        };
        
        await this.gameService.submitMove(this.sessionId, move);
        console.log(`RemotePlayerAgent: Submitted dice roll: ${diceResult}`);
    }
    
    async submitPieceMove(fromPosition: number, toPosition: number): Promise<void> {
        if (!this.currentGameState) {
            console.warn('RemotePlayerAgent: No current game state for piece move submission');
            return;
        }
        
        const move: GameMove = {
            sessionId: this.sessionId,
            playerId: this.playerId,
            moveType: 'piece-move',
            moveData: { fromPosition, toPosition },
            timestamp: new Date(),
            turnNumber: this.currentGameState.state.turnCount,
            resultingState: this.createGameStateSnapshot()
        };
        
        await this.gameService.submitMove(this.sessionId, move);
        console.log(`RemotePlayerAgent: Submitted piece move from ${fromPosition} to ${toPosition}`);
    }
    
    async submitPassTurn(): Promise<void> {
        if (!this.currentGameState) {
            console.warn('RemotePlayerAgent: No current game state for pass turn submission');
            return;
        }
        
        const move: GameMove = {
            sessionId: this.sessionId,
            playerId: this.playerId,
            moveType: 'pass-turn',
            moveData: {},
            timestamp: new Date(),
            turnNumber: this.currentGameState.state.turnCount,
            resultingState: this.createGameStateSnapshot()
        };
        
        await this.gameService.submitMove(this.sessionId, move);
        console.log(`RemotePlayerAgent: Submitted pass turn`);
    }
    
    async submitForfeit(): Promise<void> {
        const move: GameMove = {
            sessionId: this.sessionId,
            playerId: this.playerId,
            moveType: 'forfeit',
            moveData: {},
            timestamp: new Date(),
            turnNumber: this.currentGameState?.state.turnCount || 0,
            resultingState: this.currentGameState ? this.createGameStateSnapshot() : undefined
        };
        
        await this.gameService.submitMove(this.sessionId, move);
        await this.gameService.forfeitGame(this.sessionId, this.playerId);
        console.log(`RemotePlayerAgent: Submitted forfeit`);
    }
    
    // Helper methods
    private isLocalPlayer(): boolean {
        return isCurrentUser(this.playerId, this.currentUserId);
    }
    
    private setupListeners(): void {
        // Subscribe to opponent moves
        const moveUnsubscriber = this.gameService.subscribeToMoves(
            this.sessionId,
            (move) => {
                // Only handle moves from other players
                if (move.playerId !== this.playerId && this.onOpponentMove) {
                    console.log(`RemotePlayerAgent: Received opponent move:`, move);
                    this.onOpponentMove(move);
                }
            }
        );
        
        // Subscribe to player status changes
        const statusUnsubscriber = this.gameService.subscribeToPlayerStatus(
            this.sessionId,
            this.playerId,
            (status) => {
                if (this.onStatusChange) {
                    console.log(`RemotePlayerAgent: Status changed to ${status}`);
                    this.onStatusChange(status);
                }
                
                // Update connection status
                if (status === 'disconnected') {
                    this.isConnected = false;
                    if (this.onDisconnect) {
                        this.onDisconnect();
                    }
                } else if (!this.isConnected) {
                    this.isConnected = true;
                    if (this.onReconnect) {
                        this.onReconnect();
                    }
                }
            }
        );
        
        this.unsubscribers.push(moveUnsubscriber, statusUnsubscriber);
    }
    
    private createGameStateSnapshot(): GameStateSnapshot {
        if (!this.currentGameState) {
            throw new Error('No current game state available for snapshot');
        }
        
        return {
            currentPlayer: this.currentGameState.state.currentPlayer,
            whitePiecePositions: [...this.currentGameState.state.whitePiecePositions],
            blackPiecePositions: [...this.currentGameState.state.blackPiecePositions],
            gamePhase: this.currentGameState.state.gamePhase,
            turnCount: this.currentGameState.state.turnCount,
            diceRolls: [...this.currentGameState.state.diceRolls],
            diceTotal: this.currentGameState.state.diceTotal,
            selectedPiece: this.currentGameState.state.selectedPiece,
            eligiblePieces: [...this.currentGameState.state.eligiblePieces],
            legalMoves: [...this.currentGameState.state.legalMoves],
            isExtraTurn: this.currentGameState.state.isExtraTurn
        };
    }
    
    /**
     * Apply a remote move to the local game state
     */
    applyRemoteMove(move: GameMove): void {
        if (!this.currentGameState) {
            console.warn('RemotePlayerAgent: No current game state to apply remote move');
            return;
        }
        
        console.log(`RemotePlayerAgent: Applying remote move:`, move);
        
        switch (move.moveType) {
            case 'dice-roll':
                // Apply dice roll result - we need to set the dice state directly
                // This is a simplified approach; production might need more sophisticated state sync
                if (move.resultingState) {
                    this.syncDiceState(move.resultingState);
                }
                break;
                
            case 'piece-move':
                // Apply piece movement
                const { fromPosition, toPosition } = move.moveData;
                
                // Find the piece that should move
                const pieceIndex = this.findPieceAtPosition(fromPosition);
                if (pieceIndex !== -1) {
                    // Select the piece and move it
                    this.currentGameState.selectPiece(pieceIndex);
                    
                    // Convert position to square for movePiece call
                    const destinationSquare = this.positionToSquare(toPosition);
                    this.currentGameState.movePiece(pieceIndex, destinationSquare);
                }
                break;
                
            case 'pass-turn':
                // Pass the turn
                this.currentGameState.passTurn();
                break;
                
            case 'forfeit':
                // Handle forfeit - set game phase to game-over
                // This is a simplified approach
                if (move.resultingState) {
                    this.syncWithRemoteState(move.resultingState);
                }
                break;
        }
        
        // Sync with the resulting state if provided
        if (move.resultingState) {
            this.syncWithRemoteState(move.resultingState);
        }
    }
    
    private findPieceAtPosition(position: number): number {
        if (!this.currentGameState) return -1;
        
        const positions = this.currentGameState.state.currentPlayer === 'white'
            ? this.currentGameState.state.whitePiecePositions
            : this.currentGameState.state.blackPiecePositions;
            
        return positions.findIndex(pos => pos === position);
    }
    
    private syncWithRemoteState(remoteState: GameStateSnapshot): void {
        if (!this.currentGameState) return;
        
        // Sync critical state properties
        // Note: We need to be careful not to override local state during animations
        // This is a simplified sync - production version would need more sophisticated merging
        
        if (this.currentGameState.state.turnCount !== remoteState.turnCount) {
            // State is out of sync, do a full sync
            console.log('RemotePlayerAgent: Syncing with remote state');
            
            // Create a new data object with the remote state merged in
            const updatedData = {
                ...this.currentGameState.state,
                currentPlayer: remoteState.currentPlayer,
                gamePhase: remoteState.gamePhase,
                turnCount: remoteState.turnCount,
                isExtraTurn: remoteState.isExtraTurn,
                whitePiecePositions: remoteState.whitePiecePositions || this.currentGameState.state.whitePiecePositions,
                blackPiecePositions: remoteState.blackPiecePositions || this.currentGameState.state.blackPiecePositions
            };
            
            // Apply the updated state directly to the internal data property
            (this.currentGameState as any).data = updatedData;
            
            // Trigger state change notification via the private notify method
            (this.currentGameState as any).notify();
        }
    }

    /**
     * Helper method to sync just dice state from remote updates
     */
    private syncDiceState(remoteState: GameStateSnapshot): void {
        if (!this.currentGameState) return;
        
        const updatedData = {
            ...this.currentGameState.state,
            diceRolls: remoteState.diceRolls || [],
            diceTotal: remoteState.diceTotal || 0,
            eligiblePieces: remoteState.eligiblePieces || [],
            legalMoves: remoteState.legalMoves || []
        };
        
        (this.currentGameState as any).data = updatedData;
        (this.currentGameState as any).notify();
    }

    /**
     * Helper method to convert board position to square number
     */
    private positionToSquare(position: number): number {
        // This is a simplified conversion - in a real implementation,
        // you'd need to handle the proper mapping between path positions and squares
        return position;
    }
}
