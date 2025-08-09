import React, { useEffect, useState, useRef } from 'react';
import { GameState } from './GameState';
import whiteBlank from './assets/WhiteBlank.svg';
import whiteSpots from './assets/WhiteSpots.svg';
import blackBlank from './assets/BlackBlank.svg';
import blackSpots from './assets/BlackSpots.svg';
import { PIECE_SIZE, STACK_OFFSET, PIECE_ANIMATION_Z_INDEX } from './UIConstants';

interface PieceAnimatorProps {
    gameState: GameState;
    getSquarePosition: (square: number) => { x: number; y: number } | null;
    getHomePosition: (player: 'white' | 'black') => { x: number; y: number } | null;
}

interface AnimationState {
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
    waypoints: { x: number; y: number }[];
    totalDistance: number;
    progress: number;
    duration: number;
    startTime: number;
}

const PieceAnimator: React.FC<PieceAnimatorProps> = ({
    gameState,
    getSquarePosition,
    getHomePosition
}) => {
    const [animationState, setAnimationState] = useState<AnimationState | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const animationData = gameState.getAnimationData();
        const move = gameState.getCurrentMove();
        if (!move) {
            throw new Error("No current move available for animation");
        }

        if (animationData && !animationState) {
            // Start new animation
            const { waypoints } = animationData;
            const player = gameState.getCurrentPlayer();
            const fromPosition = move.fromPosition;
            const toPosition = move.toPosition;

            let startPos: { x: number; y: number } | null = null;
            let endPos: { x: number; y: number } | null = null;

            // Get start position
            if (fromPosition === 0) {
                startPos = getHomePosition(player);
            } else {
                // Convert path index to board square using GameState helper
                const boardSquare = gameState.getSquareFromPathIndex(player, fromPosition);
                startPos = getSquarePosition(boardSquare);
            }

            // Get end position - check if completing circuit
            if (toPosition === gameState.getEndOfPath()) {
                endPos = getHomePosition(player);
            } else {
                // Convert path index to board square using GameState helper
                const boardSquare = gameState.getSquareFromPathIndex(player, toPosition);
                endPos = getSquarePosition(boardSquare);
            }

            if (startPos && endPos) {
                // Calculate waypoint positions
                const waypointPositions: { x: number; y: number }[] = [];
                for (const waypointSquare of waypoints) {
                    const waypointPos = getSquarePosition(waypointSquare);
                    if (waypointPos) {
                        waypointPositions.push(waypointPos);
                    }
                }

                // Calculate total distance for proper speed
                let totalDistance = 0;
                let prevPos = startPos;

                for (const waypoint of waypointPositions) {
                    const dx = waypoint.x - prevPos.x;
                    const dy = waypoint.y - prevPos.y;
                    totalDistance += Math.sqrt(dx * dx + dy * dy);
                    prevPos = waypoint;
                }

                // Add distance from last waypoint to end
                const dx = endPos.x - prevPos.x;
                const dy = endPos.y - prevPos.y;
                totalDistance += Math.sqrt(dx * dx + dy * dy);

                const newAnimationState: AnimationState = {
                    startPosition: startPos,
                    endPosition: endPos,
                    waypoints: waypointPositions,
                    totalDistance,
                    progress: 0,
                    duration: Math.max(800, waypoints.length * 300), // Longer duration for more waypoints
                    startTime: performance.now()
                };

                setAnimationState(newAnimationState);
                startAnimation(newAnimationState);
            }
        } else if (!animationData && animationState) {
            // Animation should be cleaned up
            setAnimationState(null);
        }
    }, [gameState.state.isPieceAnimating, animationState, getSquarePosition, getHomePosition]);

    const startAnimation = (state: AnimationState) => {
        const animate = (currentTime: number) => {
            const elapsed = currentTime - state.startTime;
            const progress = Math.min(elapsed / state.duration, 1);

            // Easing function (ease-out cubic)
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            setAnimationState(prev => prev ? {
                ...prev,
                progress: easedProgress
            } : null);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Animation complete
                setAnimationState(null);
                gameState.finishPieceAnimation();
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    if (!animationState) {
        return null;
    }

    const animationData = gameState.getAnimationData();
    if (!animationData) {
        return null;
    }

    const move = gameState.getCurrentMove();
    if (!move) return null;

    const player = gameState.getCurrentPlayer();
    const stackSize = move.movingPieces.length;

    // Calculate current position along the waypoint path
    const { startPosition, endPosition, waypoints, totalDistance, progress } = animationState;

    // Helper function to calculate position along waypoint path
    const calculateCurrentPosition = (progress: number) => {
        if (waypoints.length === 0) {
            // No waypoints, direct path
            return {
                x: startPosition.x + (endPosition.x - startPosition.x) * progress,
                y: startPosition.y + (endPosition.y - startPosition.y) * progress
            };
        }

        // Create full path: start -> waypoints -> end
        const fullPath = [startPosition, ...waypoints, endPosition];

        // Calculate distances between consecutive points
        const segmentDistances: number[] = [];
        for (let i = 0; i < fullPath.length - 1; i++) {
            const dx = fullPath[i + 1].x - fullPath[i].x;
            const dy = fullPath[i + 1].y - fullPath[i].y;
            segmentDistances.push(Math.sqrt(dx * dx + dy * dy));
        }

        // Find current position based on progress
        const targetDistance = progress * totalDistance;
        let currentDistance = 0;

        for (let i = 0; i < segmentDistances.length; i++) {
            const segmentDistance = segmentDistances[i];

            if (currentDistance + segmentDistance >= targetDistance) {
                // Current position is within this segment
                const segmentProgress = (targetDistance - currentDistance) / segmentDistance;
                const start = fullPath[i];
                const end = fullPath[i + 1];

                return {
                    x: start.x + (end.x - start.x) * segmentProgress,
                    y: start.y + (end.y - start.y) * segmentProgress
                };
            }

            currentDistance += segmentDistance;
        }

        // Fallback to end position
        return endPosition;
    };

    const currentPos = calculateCurrentPosition(progress);
    const currentX = currentPos.x;
    const currentY = currentPos.y;

    // Get the appropriate piece image
    const getPieceImage = () => {
        // Calculate current position in the animation path
        // The animation goes from fromPosition to toPosition
        const fromPosition = move.fromPosition;
        const toPosition = move.toPosition;
        const currentPathPosition = fromPosition + (toPosition - fromPosition) * animationState.progress;

        // Use GameState logic to determine if piece should show spots at current position
        const shouldShowSpots = gameState.shouldPieceShowSpots(currentPathPosition);

        if (player === 'white') {
            return shouldShowSpots ? whiteSpots : whiteBlank;
        } else {
            return shouldShowSpots ? blackSpots : blackBlank;
        }
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: currentX - PIECE_SIZE / 2,
                top: currentY - PIECE_SIZE / 2,
                width: PIECE_SIZE,
                height: PIECE_SIZE,
                pointerEvents: 'none',
                zIndex: PIECE_ANIMATION_Z_INDEX, // Use UI constant to stay below overlays
                transition: 'none' // Disable any CSS transitions
            }}
        >
            {/* Render stack of pieces */}
            {Array.from({ length: stackSize }, (_, index) => (
                <img
                    key={index}
                    src={getPieceImage()}
                    alt={`${player} piece ${index + 1} animating`}
                    style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        display: 'block',
                        top: `${-index * STACK_OFFSET}px`, // Stack pieces higher
                        zIndex: index // Higher pieces have higher z-index
                    }}
                />
            ))}
        </div>
    );
};

export default PieceAnimator;
