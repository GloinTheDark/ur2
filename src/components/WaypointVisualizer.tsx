import React from 'react';
import { GameState } from '../GameState';
import { SQUARE_SIZE, BOARD_GAP } from '../UIConstants';
import { BOARD_COLUMNS } from '../BoardLayout';

interface WaypointVisualizerProps {
    gameState: GameState;
}

const WaypointVisualizer: React.FC<WaypointVisualizerProps> = ({ gameState }) => {
    const state = gameState.state;

    // Only show waypoints if a piece is selected and the game is active
    if (!state.gameStarted || state.selectedPiece === null || gameState.isAnimating()) {
        return null;
    }

    // Get all legal moves for the selected piece
    const legalMoves = gameState.getLegalMoves().filter(move =>
        move.movingPieceIndex === state.selectedPiece && move.legal
    );

    if (legalMoves.length === 0) {
        return null;
    }

    // Collect all waypoints for all legal moves
    const allWaypoints = new Set<number>();

    legalMoves.forEach(move => {
        const { waypoints } = gameState.getAnimationWaypoints(
            state.currentPlayer,
            move.fromPosition,
            move.toPosition
        );

        // Add all waypoints except the destination (which already has a "Go To" indicator)
        waypoints.forEach(square => {
            if (square !== move.destinationSquare) {
                allWaypoints.add(square);
            }
        });
    });

    const waypointArray = Array.from(allWaypoints);

    // Helper function to calculate position of a square on the board
    const getSquarePosition = (square: number) => {
        if (square < 1 || square > 24) {
            return null; // Invalid square number
        }

        const squareIndex = square - 1; // Convert to 0-based index
        const col = squareIndex % BOARD_COLUMNS;
        const row = Math.floor(squareIndex / BOARD_COLUMNS);

        // Calculate position within the board grid
        const x = col * (SQUARE_SIZE + BOARD_GAP) + SQUARE_SIZE / 2;
        const y = row * (SQUARE_SIZE + BOARD_GAP) + SQUARE_SIZE / 2;

        return { x, y };
    };

    return (
        <>
            {waypointArray.map(square => {
                const position = getSquarePosition(square);
                if (!position) return null;

                return (
                    <div
                        key={`waypoint-${square}`}
                        style={{
                            position: 'absolute',
                            left: position.x - 6, // Center the 12px circle
                            top: position.y - 6,
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 215, 0, 0.8)', // Golden yellow with transparency
                            border: '2px solid rgba(255, 165, 0, 0.9)', // Orange border
                            boxShadow: '0 0 6px rgba(255, 215, 0, 0.6)',
                            animation: 'waypointPulse 1.5s ease-in-out infinite',
                            pointerEvents: 'none',
                            zIndex: 15 // Above board squares but below "Go To" indicators
                        }}
                    />
                );
            })}

            {/* CSS animation for pulsing effect */}
            <style>{`
                @keyframes waypointPulse {
                    0%, 100% { 
                        transform: scale(1);
                        opacity: 0.8;
                    }
                    50% { 
                        transform: scale(1.2);
                        opacity: 1;
                    }
                }
            `}</style>
        </>
    );
};

export default WaypointVisualizer;
