/**
 * Comprehensive interface for describing game rules to be displayed in the rules window.
 * Supports both quick reference and detailed explanations.
 */
export interface RulesDescription {
    // Quick Reference Section
    quickReference: {
        /** One-sentence game objective */
        goal: string;
        /** Essential movement rule */
        movement: string;
        /** Key special squares summary */
        special: string;
    };

    // Board Overview
    boardOverview: {
        /** Path description without numbered squares */
        pathDescription: string;
        /** Starting area description */
        startingArea: string;
        /** Finishing area description */
        finishingArea: string;
        /** Special squares on the path */
        specialSquares: string[];
    };

    // Detailed Rules Section
    detailedRules: {
        /** Complete dice and movement mechanics */
        movement: {
            title: string;
            description: string;
            rules: string[];
        };

        /** Special squares detailed descriptions */
        specialSquares: {
            title: string;
            squares: Array<{
                name: string;
                description: string;
                effect: string;
            }>;
        };

        /** Capturing rules */
        capturing: {
            title: string;
            description: string;
            rules: string[];
        };

        /** Winning conditions */
        winning: {
            title: string;
            description: string;
            requirements: string[];
        };

        /** Edge cases and clarifications */
        edgeCases: {
            title: string;
            cases: Array<{
                situation: string;
                resolution: string;
            }>;
        };
    };

    // Movement Examples
    examples: Array<{
        title: string;
        description: string;
        beforeState: string; // Description of board state before move
        afterState: string;  // Description of board state after move
        explanation: string;
    }>;
}

/**
 * Interface for game state snapshots used in examples
 */
export interface GameStateSnapshot {
    /** Description of piece positions */
    piecePositions: string;
    /** Current player */
    currentPlayer: 'white' | 'black';
    /** Dice roll result */
    diceRoll?: number;
    /** Additional context */
    context?: string;
}
