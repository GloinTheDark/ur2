import React from 'react';
import { GameState } from './GameState';
import { HumanPlayerAgent, ComputerPlayerAgent } from './PlayerAgent';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import type { DiceRollerRef } from './DiceRoller';

export type GameMode = 'human-vs-human' | 'human-vs-computer' | 'computer-vs-human';

export interface PlayerConfiguration {
    white: PlayerType;
    black: PlayerType;
    whiteDifficulty?: 'easy' | 'medium' | 'hard';
    blackDifficulty?: 'easy' | 'medium' | 'hard';
}

export class PlayerManager {
    private whitePlayer: PlayerAgent;
    private blackPlayer: PlayerAgent;
    private gameState: GameState;
    private isActive: boolean = false;
    private unsubscribe: (() => void) | null = null;
    private diceRollerRef: React.RefObject<DiceRollerRef | null>;

    constructor(gameState: GameState, config: PlayerConfiguration, diceRollerRef: React.RefObject<DiceRollerRef | null>) {
        this.gameState = gameState;
        this.diceRollerRef = diceRollerRef;

        // Create player agents based on configuration
        this.whitePlayer = this.createPlayerAgent('white', config.white, config.whiteDifficulty);
        this.blackPlayer = this.createPlayerAgent('black', config.black, config.blackDifficulty);

        // Subscribe to game state changes
        this.unsubscribe = this.gameState.subscribe(() => this.handleGameStateChange());
    }

    private createPlayerAgent(color: 'white' | 'black', type: PlayerType, difficulty?: 'easy' | 'medium' | 'hard'): PlayerAgent {
        switch (type) {
            case 'human':
                return new HumanPlayerAgent(color);
            case 'computer':
                return new ComputerPlayerAgent(color, difficulty || 'medium', this.diceRollerRef);
            default:
                throw new Error(`Unknown player type: ${type}`);
        }
    }

    async start(): Promise<void> {
        this.isActive = true;
        await this.handleGameStateChange();
    }

    stop(): void {
        this.isActive = false;
    }

    cleanup(): void {
        this.stop();

        // Unsubscribe from game state changes
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.whitePlayer.cleanup();
        this.blackPlayer.cleanup();
    }

    getCurrentPlayerAgent(): PlayerAgent {
        const currentPlayer = this.gameState.state.currentPlayer;
        const agent = currentPlayer === 'white' ? this.whitePlayer : this.blackPlayer;
        return agent;
    }

    getPlayerAgent(color: 'white' | 'black'): PlayerAgent {
        return color === 'white' ? this.whitePlayer : this.blackPlayer;
    }

    isCurrentPlayerComputer(): boolean {
        return this.getCurrentPlayerAgent().playerType === 'computer';
    }

    private async handleGameStateChange(): Promise<void> {
        if (!this.isActive) return;

        const state = this.gameState.state;
        const currentPlayerAgent = this.getCurrentPlayerAgent();

        // Check for game end
        const winner = this.gameState.checkWinCondition();
        if (winner) {
            this.stop();
            return;
        }

        // Only proceed if game is in playing phase
        if (state.gamePhase !== 'playing') {
            return;
        }

        // Handle different game states
        if (state.diceRolls.length === 0) {
            // Player needs to roll dice - only auto-roll for computer players
            if (currentPlayerAgent.playerType === 'computer') {
                await currentPlayerAgent.onTurnStart(this.gameState);
            }
        } else if (state.diceTotal > 0 && state.eligiblePieces.length > 0) {
            // Player needs to make a move - only auto-move for computer players
            if (currentPlayerAgent.playerType === 'computer') {
                await currentPlayerAgent.onMoveRequired(this.gameState);
            }
        } else if (state.diceTotal === 0 || state.eligiblePieces.length === 0) {
            // No moves available, player should pass - only auto-pass for computer players
            if (currentPlayerAgent.playerType === 'computer') {
                await currentPlayerAgent.onMoveRequired(this.gameState);
            }
        }
    }

    // Helper method to get game mode description
    getGameModeDescription(): string {
        const whiteType = this.whitePlayer.playerType;
        const blackType = this.blackPlayer.playerType;

        if (whiteType === 'human' && blackType === 'human') {
            return 'Human vs Human';
        } else if (whiteType === 'human' && blackType === 'computer') {
            return 'Human vs Computer';
        } else if (whiteType === 'computer' && blackType === 'human') {
            return 'Computer vs Human';
        } else {
            return 'Computer vs Computer';
        }
    }
}
