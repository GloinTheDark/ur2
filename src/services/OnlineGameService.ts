import { 
    doc, 
    collection, 
    addDoc, 
    updateDoc, 
    onSnapshot, 
    query, 
    orderBy, 
    limit, 
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import type { Unsubscribe } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { GameMove, PlayerStatus, GameStateSnapshot } from '../player-agents/PlayerAgent';

/**
 * Game session data structure for Firestore
 */
export interface GameSession {
    id: string;
    hostId: string;
    guestId?: string;
    gameState: GameStateSnapshot;
    status: 'waiting' | 'active' | 'completed' | 'abandoned';
    settings: GameSettings;
    createdAt: Date;
    updatedAt: Date;
    winner?: 'white' | 'black' | 'draw';
    turnTimeLimit?: number; // seconds
    lastActivity: Date;
    drawRequest?: {
        requestedBy: string;
        requestedAt: Date;
        status: 'pending' | 'accepted' | 'declined';
        acceptedBy?: string;
        acceptedAt?: Date;
    };
}

/**
 * Game settings for multiplayer sessions
 */
export interface GameSettings {
    ruleSet: string;
    timeControl?: 'blitz' | 'standard' | 'unlimited';
    isPrivate: boolean;
    allowSpectators: boolean;
}

/**
 * Player data in game session
 */
export interface GamePlayerData {
    playerId: string;
    displayName: string;
    status: PlayerStatus;
    isConnected: boolean;
    lastSeen: Date;
    lastStatusUpdate: Date;
}

/**
 * Chat message structure
 */
export interface GameMessage {
    playerId: string;
    message: string;
    timestamp: Date;
    type: 'chat' | 'system';
}

/**
 * Online Game Service for multiplayer functionality
 * 
 * This service handles all Firebase/Firestore operations for online games,
 * including game session management, real-time synchronization, and
 * multiplayer communication.
 */
export class OnlineGameService {
    private static instance: OnlineGameService;
    
    private constructor() {
        // Singleton pattern to ensure only one instance
    }
    
    static getInstance(): OnlineGameService {
        if (!OnlineGameService.instance) {
            OnlineGameService.instance = new OnlineGameService();
        }
        return OnlineGameService.instance;
    }
    
    // Game Session Management
    
    /**
     * Create a new game session
     */
    async createGameSession(
        hostId: string,
        hostDisplayName: string,
        settings: GameSettings,
        initialGameState: GameStateSnapshot
    ): Promise<string> {
        const gameSession: Omit<GameSession, 'id'> = {
            hostId,
            gameState: initialGameState,
            status: 'waiting',
            settings,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActivity: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'games'), gameSession);
        
        // Create player data for host
        await this.updatePlayerData(docRef.id, hostId, {
            playerId: hostId,
            displayName: hostDisplayName,
            status: 'active',
            isConnected: true,
            lastSeen: new Date(),
            lastStatusUpdate: new Date()
        });
        
        return docRef.id;
    }
    
    /**
     * Join an existing game session
     */
    async joinGameSession(
        sessionId: string,
        guestId: string,
        guestDisplayName: string
    ): Promise<void> {
        await updateDoc(doc(db, 'games', sessionId), {
            guestId,
            status: 'active',
            updatedAt: serverTimestamp(),
            lastActivity: serverTimestamp()
        });
        
        // Create player data for guest
        await this.updatePlayerData(sessionId, guestId, {
            playerId: guestId,
            displayName: guestDisplayName,
            status: 'active',
            isConnected: true,
            lastSeen: new Date(),
            lastStatusUpdate: new Date()
        });
    }
    
    /**
     * Subscribe to game session changes
     */
    subscribeToGame(sessionId: string, callback: (gameSession: GameSession) => void): Unsubscribe {
        return onSnapshot(doc(db, 'games', sessionId), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                callback({
                    id: snapshot.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    updatedAt: data.updatedAt?.toDate() || new Date(),
                    lastActivity: data.lastActivity?.toDate() || new Date()
                } as GameSession);
            }
        });
    }
    
    // Move Management
    
    /**
     * Submit a game move to Firestore
     */
    async submitMove(sessionId: string, move: GameMove): Promise<void> {
        const batch = writeBatch(db);
        
        // Update main game state
        batch.update(doc(db, 'games', sessionId), {
            gameState: move.resultingState,
            lastActivity: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        // Add to move history
        const moveData = {
            ...move,
            timestamp: serverTimestamp()
        };
        batch.set(doc(collection(db, 'games', sessionId, 'moves')), moveData);
        
        // Update player activity
        batch.update(doc(db, 'games', sessionId, 'players', move.playerId), {
            lastSeen: serverTimestamp(),
            status: 'active',
            lastStatusUpdate: serverTimestamp()
        });
        
        await batch.commit();
    }
    
    /**
     * Subscribe to game moves
     */
    subscribeToMoves(sessionId: string, callback: (move: GameMove) => void): Unsubscribe {
        return onSnapshot(
            query(
                collection(db, 'games', sessionId, 'moves'),
                orderBy('timestamp', 'desc'),
                limit(1)
            ),
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        callback({
                            ...data,
                            timestamp: data.timestamp?.toDate() || new Date()
                        } as GameMove);
                    }
                });
            }
        );
    }
    
    // Player Management
    
    /**
     * Update player data
     */
    async updatePlayerData(sessionId: string, playerId: string, playerData: GamePlayerData): Promise<void> {
        await updateDoc(doc(db, 'games', sessionId, 'players', playerId), {
            ...playerData,
            lastSeen: serverTimestamp(),
            lastStatusUpdate: serverTimestamp()
        });
    }
    
    /**
     * Update player status
     */
    async updatePlayerStatus(sessionId: string, playerId: string, status: PlayerStatus): Promise<void> {
        await updateDoc(doc(db, 'games', sessionId, 'players', playerId), {
            status,
            lastStatusUpdate: serverTimestamp()
        });
    }
    
    /**
     * Update player heartbeat
     */
    async updatePlayerHeartbeat(sessionId: string, playerId: string): Promise<void> {
        await updateDoc(doc(db, 'games', sessionId, 'players', playerId), {
            lastSeen: serverTimestamp(),
            isConnected: true
        });
    }
    
    /**
     * Handle player disconnection
     */
    async handlePlayerDisconnect(sessionId: string, playerId: string): Promise<void> {
        await updateDoc(doc(db, 'games', sessionId, 'players', playerId), {
            status: 'disconnected',
            isConnected: false,
            lastStatusUpdate: serverTimestamp()
        });
    }
    
    /**
     * Subscribe to player status changes
     */
    subscribeToPlayerStatus(
        sessionId: string, 
        playerId: string, 
        callback: (status: PlayerStatus) => void
    ): Unsubscribe {
        return onSnapshot(
            doc(db, 'games', sessionId, 'players', playerId),
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    callback(data.status as PlayerStatus);
                }
            }
        );
    }
    
    // Communication
    
    /**
     * Send a chat message
     */
    async sendMessage(sessionId: string, playerId: string, message: string): Promise<void> {
        await addDoc(collection(db, 'games', sessionId, 'messages'), {
            playerId,
            message,
            timestamp: serverTimestamp(),
            type: 'chat'
        });
    }
    
    /**
     * Request a draw
     */
    async requestDraw(sessionId: string, playerId: string): Promise<void> {
        await updateDoc(doc(db, 'games', sessionId), {
            drawRequest: {
                requestedBy: playerId,
                requestedAt: serverTimestamp(),
                status: 'pending'
            }
        });
    }
    
    /**
     * Accept a draw
     */
    async acceptDraw(sessionId: string, playerId: string): Promise<void> {
        await updateDoc(doc(db, 'games', sessionId), {
            'drawRequest.status': 'accepted',
            'drawRequest.acceptedBy': playerId,
            'drawRequest.acceptedAt': serverTimestamp(),
            status: 'completed',
            winner: 'draw'
        });
    }
    
    /**
     * Decline a draw
     */
    async declineDraw(sessionId: string): Promise<void> {
        await updateDoc(doc(db, 'games', sessionId), {
            'drawRequest.status': 'declined'
        });
    }
    
    /**
     * Forfeit a game
     */
    async forfeitGame(sessionId: string, playerId: string): Promise<void> {
        // Determine winner (opponent of the player who forfeited)
        const gameDoc = await doc(db, 'games', sessionId);
        // This would need game data to determine the winner
        // For now, just mark as completed
        
        await updateDoc(gameDoc, {
            status: 'completed',
            updatedAt: serverTimestamp()
        });
        
        await this.updatePlayerStatus(sessionId, playerId, 'forfeited');
    }
}
