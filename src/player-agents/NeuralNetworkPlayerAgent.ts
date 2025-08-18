import { GameState, type Move } from '../GameState';
import { AppLog } from '../AppSettings';
import type { PlayerAgent, PlayerType } from './PlayerAgent';
import { AI_DELAYS } from './PlayerAgent';
import { PlayerAgentUtils } from './PlayerAgentUtils';

interface MoveEvaluation {
    move: Move;
    score: number;
    reasons: string[];
}

interface NeuralNetworkModel {
    format: string;
    version: string;
    model_name: string;
    ruleset: string;
    input_size: number;
    num_layers: number;
    layer_sizes: number[];
    activations: string[];
    weights: number[][];
    biases: number[][];
    // New validation fields
    finish_position?: number;
    game_threshold?: number;
    pieces_per_player?: number;
    epochs?: number;
    learning_rate?: number;
}

interface BestModelEntry {
    model_file: string;
    date: string;
    time: string;
}

interface BestModelsConfig {
    [rulesetName: string]: BestModelEntry;
}

/**
 * Cache for the best models configuration
 */
let bestModelsConfig: BestModelsConfig | null = null;

/**
 * Load the best models configuration from the JSON file
 */
async function loadBestModelsConfig(): Promise<BestModelsConfig> {
    if (bestModelsConfig) {
        return bestModelsConfig;
    }

    try {
        const response = await fetch('/models/best_models.json');
        if (!response.ok) {
            throw new Error(`Failed to load best models config: ${response.status}`);
        }
        bestModelsConfig = await response.json();
        return bestModelsConfig!;
    } catch (error) {
        AppLog.playerAgent(`Failed to load best models configuration: ${error}`);
        throw error;
    }
}

/**
 * Get the model file path for a given ruleset
 */
export async function getModelPathForRuleset(rulesetName: string): Promise<string> {
    try {
        const config = await loadBestModelsConfig();
        const rulesetKey = Object.keys(config).find(key => 
            key.toLowerCase() === rulesetName.toLowerCase()
        );

        if (rulesetKey && config[rulesetKey]) {
            const modelEntry = config[rulesetKey];
            return `/models/${rulesetKey}/${modelEntry.model_file}`;
        }

        // No model available for this ruleset
        throw new Error(`No neural network model available for ruleset: ${rulesetName}`);
    } catch (error) {
        throw new Error(`Failed to get model path for ruleset ${rulesetName}: ${error}`);
    }
}

/**
 * Check if a neural network model is available for a given ruleset
 */
export async function isNeuralModelAvailableForRuleset(rulesetName: string): Promise<boolean> {
    try {
        const config = await loadBestModelsConfig();
        const rulesetKey = Object.keys(config).find(key => 
            key.toLowerCase() === rulesetName.toLowerCase()
        );

        if (!rulesetKey || !config[rulesetKey]) {
            return false; // No model available for this ruleset
        }

        const modelEntry = config[rulesetKey];
        const modelPath = `/models/${rulesetKey}/${modelEntry.model_file}`;

        const response = await fetch(modelPath);
        if (response.ok) {
            const model = await response.json();
            // Check for new format and matching ruleset
            if (model.format && ['ursim-robust-net', 'ursim-simple-net'].includes(model.format) &&
                model.ruleset && model.ruleset.toLowerCase() === rulesetName.toLowerCase()) {

                // Additional validation: log model configuration details
                console.log(`Neural model found for ${rulesetName}:`, {
                    model_name: model.model_name,
                    finish_position: model.finish_position,
                    pieces_per_player: model.pieces_per_player,
                    input_size: model.input_size,
                    architecture: model.layer_sizes?.join('→'),
                    activations: model.activations?.join(', '),
                    model_file: modelEntry.model_file,
                    date: modelEntry.date,
                    time: modelEntry.time
                });

                return true;
            }
        }
    } catch (error) {
        // Model file doesn't exist or failed to load
        AppLog.playerAgent(`Error checking model availability for ${rulesetName}: ${error}`);
        return false;
    }

    return false;
} export class NeuralNetworkPlayerAgent implements PlayerAgent {
    readonly playerType: PlayerType = 'computer';
    readonly color: 'white' | 'black';
    private model: NeuralNetworkModel | null = null;
    private modelLoaded: boolean = false;
    private modelPath: string;

    constructor(color: 'white' | 'black', modelPath: string) {
        this.color = color;
        this.modelPath = modelPath;
        this.loadModel();
    }

    private async loadModel(): Promise<void> {
        try {
            AppLog.playerAgent(`NeuralNetwork: Loading model from ${this.modelPath}`);
            const response = await fetch(this.modelPath);
            if (!response.ok) {
                throw new Error(`Failed to fetch model: ${response.status}`);
            }
            this.model = await response.json();

            // Validate new JSON model format only
            if (!this.model || !['ursim-robust-net', 'ursim-simple-net'].includes(this.model.format)) {
                throw new Error(`Unsupported model format: ${this.model?.format || 'unknown'}. Expected 'ursim-robust-net' or 'ursim-simple-net'.`);
            }

            if (this.model.version !== '1.0') {
                AppLog.playerAgent(`NeuralNetwork: Warning - Model version ${this.model.version} may be incompatible`);
            }

            // Validate required fields
            if (!this.model.model_name || !this.model.ruleset || !this.model.layer_sizes || !this.model.activations) {
                throw new Error('Invalid model: missing required fields');
            }

            this.modelLoaded = true;
            AppLog.playerAgent(`NeuralNetwork: Model loaded successfully - ${this.model.model_name} (${this.model.layer_sizes.join('→')}) for ${this.model.ruleset} ruleset`);
            AppLog.playerAgent(`NeuralNetwork: Activations: ${this.model.activations.join(', ')}`);

            // Log validation fields if available
            if (this.model.finish_position !== undefined) {
                AppLog.playerAgent(`NeuralNetwork: Expected finish position: ${this.model.finish_position}`);
            }
            if (this.model.pieces_per_player !== undefined) {
                AppLog.playerAgent(`NeuralNetwork: Expected pieces per player: ${this.model.pieces_per_player}`);
            }
            if (this.model.game_threshold !== undefined) {
                AppLog.playerAgent(`NeuralNetwork: Game threshold: ${this.model.game_threshold}`);
            }
        } catch (error) {
            AppLog.playerAgent(`NeuralNetwork: Failed to load model - ${error}`);
            this.modelLoaded = false;
        }
    }

    /**
     * Validate that the model is compatible with the current game configuration
     */
    private validateModelForGameState(gameState: GameState): boolean {
        if (!this.model) return false;

        // Check if model ruleset matches game ruleset (case-insensitive)
        const currentRuleset = gameState.getCurrentRuleSet().name.toLowerCase();
        const modelRuleset = this.model.ruleset.toLowerCase();
        if (modelRuleset !== currentRuleset) {
            AppLog.playerAgent(`NeuralNetwork: Warning - Model ruleset '${this.model.ruleset}' doesn't match current ruleset '${gameState.getCurrentRuleSet().name}'`);
            // Allow this for now, but log warning
        }

        // Validate finish position if provided
        if (this.model.finish_position !== undefined) {
            const expectedFinishPosition = gameState.getEndOfPath();
            if (this.model.finish_position !== expectedFinishPosition) {
                AppLog.playerAgent(`NeuralNetwork: Warning - Model expects finish position ${this.model.finish_position}, but game has ${expectedFinishPosition}`);
                return false;
            }
        }

        // Validate pieces per player if provided
        if (this.model.pieces_per_player !== undefined) {
            const expectedPiecesPerPlayer = gameState.getPiecesPerPlayer();
            if (this.model.pieces_per_player !== expectedPiecesPerPlayer) {
                AppLog.playerAgent(`NeuralNetwork: Warning - Model expects ${this.model.pieces_per_player} pieces per player, but game has ${expectedPiecesPerPlayer}`);
                return false;
            }
        }

        // Validate input size matches expected feature count
        const expectedInputSize = gameState.getPiecesPerPlayer() * 2;
        if (this.model.input_size !== expectedInputSize) {
            AppLog.playerAgent(`NeuralNetwork: Warning - Model expects input size ${this.model.input_size}, but game configuration requires ${expectedInputSize}`);
            return false;
        }

        AppLog.playerAgent(`NeuralNetwork: Model validation passed for current game configuration`);
        return true;
    }

    getPlayerName(): string {
        const modelName = this.model?.model_name || this.model?.ruleset || 'unknown';
        return `Neural Network AI (${this.color}) - ${modelName}`;
    }

    cleanup(): void {
        // No cleanup needed for this agent
    }

    async onTurnStart(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`NeuralNetwork onTurnStart: ${this.color} player called`);

        // Computer automatically rolls dice when it's their turn
        if (!PlayerAgentUtils.validatePlayerTurn(gameState, this.color, 'NeuralNetwork onTurnStart')) {
            return;
        }

        if (!PlayerAgentUtils.canRollDice(gameState)) {
            AppLog.playerAgent('NeuralNetwork onTurnStart: Cannot roll dice, returning');
            return;
        }

        // Add slight delay before rolling
        await PlayerAgentUtils.delay(AI_DELAYS.ROLL_DICE);

        AppLog.playerAgent(`NeuralNetwork: Rolling dice for ${this.color}`);
        gameState.rollDice();
    }

    async onMoveRequired(gameState: GameState): Promise<void> {
        AppLog.playerAgent(`NeuralNetwork onMoveRequired: ${this.color} player called`);

        if (!PlayerAgentUtils.shouldSelectMove(gameState, this.color, 'NeuralNetwork')) {
            return;
        }

        if (!this.modelLoaded || !this.model) {
            AppLog.playerAgent('NeuralNetwork: Model not loaded, falling back to random move');
            const legalMoves = PlayerAgentUtils.getLegalMovesWithLogging(gameState, 'NeuralNetwork');
            const randomMove = PlayerAgentUtils.selectRandomMove(legalMoves);
            if (randomMove) {
                await PlayerAgentUtils.executeMove(gameState, randomMove, 'NeuralNetwork', AI_DELAYS.MOVE_PIECE);
            }
            return;
        }

        const legalMoves = PlayerAgentUtils.getLegalMovesWithLogging(gameState, 'NeuralNetwork');

        if (legalMoves.length === 0) {
            AppLog.ai('NeuralNetwork: No legal moves available');
            return;
        }

        // Find the best move using neural network evaluation
        const bestMove = await this.findBestMove(gameState, legalMoves);

        if (bestMove) {
            await PlayerAgentUtils.executeMove(gameState, bestMove.move, 'NeuralNetwork', AI_DELAYS.MOVE_PIECE);
        } else {
            // Fallback to random move if something goes wrong
            const randomMove = PlayerAgentUtils.selectRandomMove(legalMoves);
            if (randomMove) {
                await PlayerAgentUtils.executeMove(gameState, randomMove, 'NeuralNetwork', AI_DELAYS.MOVE_PIECE);
            }
        }
    }

    /**
     * Find the best move using neural network evaluation
     */
    private async findBestMove(gameState: GameState, legalMoves: Move[]): Promise<MoveEvaluation | null> {
        if (legalMoves.length === 0 || !this.model) return null;

        // Validate model compatibility with current game state
        if (!this.validateModelForGameState(gameState)) {
            AppLog.playerAgent('NeuralNetwork: Model validation failed, falling back to random move selection');
            return null; // This will trigger the fallback to random move
        }

        const startTime = performance.now();
        AppLog.ai(`NeuralNetwork: Evaluating ${legalMoves.length} moves with neural network`);

        let bestMove: MoveEvaluation | null = null;
        let bestScore = -Infinity;

        for (let i = 0; i < legalMoves.length; i++) {
            const move = legalMoves[i];
            const clonedState = gameState.clone();

            // Make the move
            clonedState.startLegalMove(move);

            // Evaluate this move using neural network
            const score = this.evaluatePosition(clonedState);

            AppLog.ai(`NeuralNetwork: Move piece ${move.movingPieceIndex} to ${move.destinationSquare} scored ${score.toFixed(4)}`);

            if (score > bestScore) {
                bestScore = score;
                bestMove = {
                    move,
                    score,
                    reasons: [`Neural network score: ${score.toFixed(4)}`]
                };
            }
        }

        const endTime = performance.now();
        const elapsedTime = endTime - startTime;
        AppLog.aiTiming(`NeuralNetwork (${this.color}): Evaluation completed in ${elapsedTime.toFixed(2)}ms`);

        if (bestMove) {
            AppLog.ai(`NeuralNetwork: Best move is piece ${bestMove.move.movingPieceIndex} to ${bestMove.move.destinationSquare} with score ${bestMove.score.toFixed(4)}`);
        }

        return bestMove;
    }

    /**
     * Extract features from game state for neural network input
     * Features: piecesPerPlayer * 2 total
     * - First piecesPerPlayer: Current player's piece positions (sorted ascending, normalized 0.0-1.0)
     * - Next piecesPerPlayer: Opponent's piece positions (sorted ascending, normalized 0.0-1.0)
     */
    private extractFeatures(gameState: GameState): number[] {
        const piecesPerPlayer = gameState.getPiecesPerPlayer();
        const expectedInputSize = piecesPerPlayer * 2;

        if (!this.model || this.model.input_size !== expectedInputSize) {
            throw new Error(`Model input size mismatch - expected ${expectedInputSize} features (${piecesPerPlayer} pieces per player * 2), but model expects ${this.model?.input_size || 'unknown'}`);
        } const features: number[] = [];
        const state = gameState.state;

        // Get the actual end of path index for normalization (e.g., 15 for Finkel path)
        const endOfPath = gameState.getEndOfPath();

        // Current player's pieces (the player whose turn it is in the position)
        const currentPlayerPositions = state.currentPlayer === 'white' ?
            state.whitePiecePositions : state.blackPiecePositions;

        // Opponent's pieces
        const opponentPositions = state.currentPlayer === 'white' ?
            state.blackPiecePositions : state.whitePiecePositions;

        // Extract and sort current player's piece positions
        const currentPieces: number[] = [];
        for (let i = 0; i < piecesPerPlayer; i++) {
            if (i < currentPlayerPositions.length) {
                currentPieces.push(currentPlayerPositions[i]);
            } else {
                currentPieces.push(0); // Pieces not yet started
            }
        }
        currentPieces.sort((a, b) => a - b); // Sort ascending

        // Extract and sort opponent's piece positions
        const opponentPieces: number[] = [];
        for (let i = 0; i < piecesPerPlayer; i++) {
            if (i < opponentPositions.length) {
                opponentPieces.push(opponentPositions[i]);
            } else {
                opponentPieces.push(0); // Pieces not yet started
            }
        }
        opponentPieces.sort((a, b) => a - b); // Sort ascending

        // Normalize current player pieces (0.0 = start, 1.0 = finish)
        for (let i = 0; i < piecesPerPlayer; i++) {
            const position = i < currentPieces.length ? currentPieces[i] : 0;
            const normalized = position / endOfPath;
            features.push(Math.min(1.0, Math.max(0.0, normalized)));
        }

        // Normalize opponent pieces (0.0 = start, 1.0 = finish)
        for (let i = 0; i < piecesPerPlayer; i++) {
            const position = i < opponentPieces.length ? opponentPieces[i] : 0;
            const normalized = position / endOfPath;
            features.push(Math.min(1.0, Math.max(0.0, normalized)));
        }

        AppLog.ai(`NeuralNetwork: Features extracted - Current player (${state.currentPlayer}): [${currentPieces.join(', ')}] -> [${features.slice(0, piecesPerPlayer).map(f => f.toFixed(3)).join(', ')}], Opponent: [${opponentPieces.join(', ')}] -> [${features.slice(piecesPerPlayer, piecesPerPlayer * 2).map(f => f.toFixed(3)).join(', ')}]`);

        return features;
    }

    /**
     * Evaluate a position using the neural network
     * The model outputs win probability for the current player in the position.
     * If we're evaluating for the opposite player, we need to invert the probability.
     */
    private evaluatePosition(gameState: GameState): number {
        if (!this.model) {
            return 0;
        }

        try {
            const features = this.extractFeatures(gameState);
            const rawOutput = this.forwardPass(features);

            // The model outputs win probability for the current player in the position
            const currentPlayerInPosition = gameState.state.currentPlayer;

            // If we're evaluating for the same player as current in position, use probability directly
            // If we're evaluating for the opponent, invert the probability
            const winProbability = (this.color === currentPlayerInPosition) ?
                rawOutput : (1.0 - rawOutput);

            AppLog.ai(`NeuralNetwork: Position evaluation - current player: ${currentPlayerInPosition}, evaluating for: ${this.color}, raw output: ${rawOutput.toFixed(4)}, final score: ${winProbability.toFixed(4)}`);

            return winProbability;
        } catch (error) {
            AppLog.playerAgent(`NeuralNetwork: Error during evaluation - ${error}`);
            return 0;
        }
    }

    /**
     * Perform forward pass through the neural network using the new JSON format
     */
    private forwardPass(inputs: number[]): number {
        if (!this.model) return 0;

        let currentOutput = [...inputs]; // Copy input

        // Validate input size
        if (currentOutput.length !== this.model.input_size) {
            throw new Error(`Input size mismatch: expected ${this.model.input_size}, got ${currentOutput.length}`);
        }

        // Process each layer
        for (let layerIndex = 0; layerIndex < this.model.num_layers; layerIndex++) {
            const layerWeights = this.model.weights[layerIndex];
            const layerBiases = this.model.biases[layerIndex];
            const activation = this.model.activations[layerIndex];
            const outputSize = this.model.layer_sizes[layerIndex];
            const inputSize = currentOutput.length;

            const newOutput: number[] = [];

            // Compute each neuron in the layer
            for (let outputIndex = 0; outputIndex < outputSize; outputIndex++) {
                let sum = layerBiases[outputIndex];

                // Compute weighted sum of inputs
                for (let inputIndex = 0; inputIndex < inputSize; inputIndex++) {
                    const weightIndex = outputIndex * inputSize + inputIndex;
                    sum += currentOutput[inputIndex] * layerWeights[weightIndex];
                }

                // Apply activation function
                const activatedValue = this.applyActivation(sum, activation);
                newOutput.push(activatedValue);
            }

            currentOutput = newOutput;
        }

        // Return the output (should be single value for regression)
        return currentOutput[0];
    }

    /**
     * Apply activation function based on type
     */
    private applyActivation(x: number, activationType: string): number {
        switch (activationType) {
            case 'linear':
                return x;
            case 'sigmoid':
                return 1.0 / (1.0 + Math.exp(-x));
            case 'relu':
                return Math.max(0.0, x);
            case 'tanh':
                return Math.tanh(x);
            default:
                AppLog.playerAgent(`NeuralNetwork: Unknown activation: ${activationType}, using sigmoid`);
                return 1.0 / (1.0 + Math.exp(-x));
        }
    }
}
