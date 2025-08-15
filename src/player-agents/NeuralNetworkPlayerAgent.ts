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
    ruleset: string;
    inputSize: number;
    architecture: number[];
    layers: {
        neurons: number;
        inputs: number;
        weights: number[][];
        biases: number[];
    }[];
}

export class NeuralNetworkPlayerAgent implements PlayerAgent {
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

            // Validate model format
            if (!this.model || this.model.format !== 'ursim-neural-net') {
                throw new Error('Invalid neural network model format');
            }

            // Validate ruleset compatibility
            if (this.model.ruleset !== 'finkel') {
                AppLog.playerAgent(`NeuralNetwork: Warning - Model trained for ${this.model.ruleset} ruleset, may not work correctly with other rulesets`);
            }

            this.modelLoaded = true;
            AppLog.playerAgent(`NeuralNetwork: Model loaded successfully - ${this.model.architecture.join('→')} architecture for ${this.model.ruleset} ruleset`);
        } catch (error) {
            AppLog.playerAgent(`NeuralNetwork: Failed to load model - ${error}`);
            this.modelLoaded = false;
        }
    }

    getPlayerName(): string {
        const modelName = this.model?.ruleset || 'unknown';
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

        if (!this.model || this.model.inputSize !== expectedInputSize) {
            throw new Error(`Model input size mismatch - expected ${expectedInputSize} features (${piecesPerPlayer} pieces per player * 2), but model expects ${this.model?.inputSize || 'unknown'}`);
        }

        const features: number[] = [];
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
     * Perform forward pass through the neural network
     */
    private forwardPass(inputs: number[]): number {
        if (!this.model) return 0;

        let activations = [...inputs];

        for (let layerIndex = 0; layerIndex < this.model.layers.length; layerIndex++) {
            const layer = this.model.layers[layerIndex];
            const newActivations: number[] = [];

            for (let neuronIndex = 0; neuronIndex < layer.neurons; neuronIndex++) {
                let sum = layer.biases[neuronIndex];

                for (let inputIndex = 0; inputIndex < activations.length; inputIndex++) {
                    sum += activations[inputIndex] * layer.weights[neuronIndex][inputIndex];
                }

                // Apply activation function
                if (layerIndex < this.model.layers.length - 1) {
                    // Hidden layers use ReLU
                    newActivations.push(Math.max(0, sum));
                } else {
                    // Output layer uses sigmoid for probability output
                    newActivations.push(1.0 / (1.0 + Math.exp(-sum)));
                }
            }

            activations = newActivations;
        }

        return activations[0]; // Single output value (win probability)
    }
}
