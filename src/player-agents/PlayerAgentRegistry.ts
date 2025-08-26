import { GameState } from '../GameState';
import { AppLog } from '../AppSettings';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import { HumanPlayerAgent } from './HumanPlayerAgent';
import { ComputerPlayerAgent } from './ComputerPlayerAgent';
import { RandomPlayerAgent } from './RandomPlayerAgent';
import { MCTSPlayerAgent } from './MCTSPlayerAgent';
import { ExhaustiveSearchPlayerAgent } from './ExhaustiveSearchPlayerAgent';
import { NeuralNetworkPlayerAgent, getModelPathForRuleset, isNeuralModelAvailableForRuleset } from './NeuralNetworkPlayerAgent';
import { RemotePlayerAgent } from './RemotePlayerAgent';

export type AgentType = 'human' | 'computer' | 'random' | 'mcts' | 'exhaustive' | 'neural' | 'remote';

// Session information for remote players
export interface RemotePlayerSessionInfo {
    playerId: string;
    sessionId: string;
    gameService: any; // Will be properly typed when OnlineGameService is implemented
}

export interface PlayerAgentInfo {
    id: AgentType;
    name: string;
    description: string;
    requiresModel?: boolean;
    isAvailable?: (gameState?: GameState) => Promise<boolean>;
}

export class PlayerAgentRegistry {
    private static readonly agents: Map<AgentType, PlayerAgentInfo> = new Map([
        ['human', {
            id: 'human',
            name: 'Local Human Player',
            description: 'Human player using the interface',
            isAvailable: async () => true
        }],
        ['computer', {
            id: 'computer',
            name: 'Basic AI',
            description: 'Standard computer opponent with tactical play',
            isAvailable: async () => true
        }],
        ['random', {
            id: 'random',
            name: 'Random AI',
            description: 'Computer opponent that makes random legal moves',
            isAvailable: async () => true
        }],
        ['mcts', {
            id: 'mcts',
            name: 'Monte Carlo AI',
            description: 'Advanced AI using Monte Carlo Tree Search',
            isAvailable: async () => true
        }],
        ['exhaustive', {
            id: 'exhaustive',
            name: 'Exhaustive Search AI',
            description: 'AI that searches all possible move combinations',
            isAvailable: async () => true
        }],
        ['neural', {
            id: 'neural',
            name: 'Neural Net AI',
            description: 'AI using neural network trained on game data',
            requiresModel: true,
            isAvailable: async (gameState?: GameState) => {
                if (!gameState) return false;
                try {
                    const currentRuleSet = gameState.getCurrentRuleSet();
                    return await isNeuralModelAvailableForRuleset(currentRuleSet.name);
                } catch {
                    return false;
                }
            }
        }],
        ['remote', {
            id: 'remote',
            name: 'Remote Player',
            description: 'Human player connected over the network',
            isAvailable: async () => true // Available when multiplayer is enabled
        }]
    ]);

    /**
     * Get information about a specific player agent type
     */
    static getAgentInfo(agentType: AgentType): PlayerAgentInfo | undefined {
        return this.agents.get(agentType);
    }

    /**
     * Get all available agent types
     */
    static getAllAgentTypes(): AgentType[] {
        return Array.from(this.agents.keys());
    }

    /**
     * Get all agent information
     */
    static getAllAgentInfo(): PlayerAgentInfo[] {
        return Array.from(this.agents.values());
    }

    /**
     * Get available agent types for the current game state
     */
    static async getAvailableAgentTypes(gameState?: GameState): Promise<AgentType[]> {
        const availableTypes: AgentType[] = [];

        for (const [agentType, agentInfo] of this.agents) {
            if (agentInfo.isAvailable) {
                const isAvailable = await agentInfo.isAvailable(gameState);
                if (isAvailable) {
                    availableTypes.push(agentType);
                }
            } else {
                availableTypes.push(agentType);
            }
        }

        return availableTypes;
    }

    /**
     * Get the display name for an agent type (consistent with PlayerAgent.getPlayerName())
     */
    static getAgentName(agentType: AgentType): string {
        const agentInfo = this.agents.get(agentType);
        return agentInfo?.name || `Unknown Agent (${agentType})`;
    }

    /**
     * Get the description for an agent type
     */
    static getAgentDescription(agentType: AgentType): string {
        const agentInfo = this.agents.get(agentType);
        return agentInfo?.description || `Unknown agent type: ${agentType}`;
    }

    /**
     * Create a player agent instance
     */
    static async createPlayerAgent(
        color: 'white' | 'black',
        agentType: AgentType,
        gameState?: GameState,
        sessionInfo?: RemotePlayerSessionInfo
    ): Promise<PlayerAgent> {
        const agentInfo = this.agents.get(agentType);
        if (!agentInfo) {
            throw new Error(`Unknown agent type: ${agentType}`);
        }

        // Check availability if required
        if (agentInfo.isAvailable) {
            const isAvailable = await agentInfo.isAvailable(gameState);
            if (!isAvailable) {
                throw new Error(`Agent type ${agentType} is not available for the current configuration`);
            }
        }

        switch (agentType) {
            case 'human':
                return new HumanPlayerAgent(color);

            case 'computer':
                return new ComputerPlayerAgent(color);

            case 'random':
                return new RandomPlayerAgent(color);

            case 'mcts':
                return new MCTSPlayerAgent(color);

            case 'exhaustive':
                if (!gameState) {
                    throw new Error('ExhaustiveSearchPlayerAgent requires a GameState instance');
                }
                return new ExhaustiveSearchPlayerAgent(color, gameState);

            case 'neural':
                if (!gameState) {
                    throw new Error('NeuralNetworkPlayerAgent requires a GameState instance');
                }
                try {
                    const currentRuleSet = gameState.getCurrentRuleSet();
                    const modelPath = await getModelPathForRuleset(currentRuleSet.name);
                    return new NeuralNetworkPlayerAgent(color, modelPath);
                } catch (error) {
                    AppLog.playerAgent(`Neural agent requested but no model available for current ruleset: ${error}. Cannot create neural agent.`);
                    throw new Error(`Neural network model not available: ${error}`);
                }

            case 'remote':
                if (!sessionInfo) {
                    throw new Error('RemotePlayerAgent requires session information');
                }
                return new RemotePlayerAgent(
                    color,
                    sessionInfo.playerId,
                    sessionInfo.sessionId,
                    sessionInfo.gameService
                );

            default:
                throw new Error(`Unhandled agent type: ${agentType}`);
        }
    }

    /**
     * Create a player agent with fallback (used for backward compatibility)
     */
    static async createPlayerAgentWithFallback(
        color: 'white' | 'black',
        type: PlayerType,
        agentType?: AgentType,
        gameState?: GameState
    ): Promise<PlayerAgent> {
        try {
            if (type === 'human' || agentType === 'human') {
                return await this.createPlayerAgent(color, 'human', gameState);
            } else {
                const targetAgentType = agentType || 'computer';
                return await this.createPlayerAgent(color, targetAgentType, gameState);
            }
        } catch (error) {
            // Fallback to basic computer agent if the requested type fails
            AppLog.playerAgent(`Failed to create ${agentType} agent: ${error}. Falling back to computer agent.`);
            return await this.createPlayerAgent(color, 'computer', gameState);
        }
    }

    /**
     * Parse legacy player option format to agent type
     */
    static parsePlayerOption(option: string): { type: PlayerType; agentType: AgentType | null } {
        switch (option) {
            case 'human':
                return { type: 'human', agentType: null };
            case 'computer':
                return { type: 'computer', agentType: 'computer' };
            case 'mcts':
                return { type: 'computer', agentType: 'mcts' };
            case 'random':
                return { type: 'computer', agentType: 'random' };
            case 'exhaustive':
                return { type: 'computer', agentType: 'exhaustive' };
            case 'neural':
                return { type: 'computer', agentType: 'neural' };
            default:
                return { type: 'human', agentType: null };
        }
    }

    /**
     * Get a user-friendly description for player vs player matchup
     */
    static getMatchupDescription(whiteAgentType: AgentType, blackAgentType: AgentType): string {
        const whiteName = this.getAgentName(whiteAgentType);
        const blackName = this.getAgentName(blackAgentType);

        if (whiteAgentType === 'human' && blackAgentType === 'human') {
            return 'Two players taking turns on the same device';
        } else if (whiteAgentType === 'human' && blackAgentType !== 'human') {
            return `You play as White against ${blackName}`;
        } else if (whiteAgentType !== 'human' && blackAgentType === 'human') {
            return `You play as Black against ${whiteName}`;
        } else {
            return `Watch ${whiteName} (White) vs ${blackName} (Black)`;
        }
    }
}
