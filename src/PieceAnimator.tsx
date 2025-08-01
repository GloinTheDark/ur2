import React, { useEffect, useState, useRef } from 'react';
import { GameState } from './GameState';
import whiteBlank from './assets/WhiteBlank.svg';
import whiteSpots from './assets/WhiteSpots.svg';
import blackBlank from './assets/BlackBlank.svg';
import blackSpots from './assets/BlackSpots.svg';
import { PIECE_SIZE } from './UIConstants';

interface PieceAnimatorProps {
    gameState: GameState;
    getSquarePosition: (square: number | 'start') => { x: number; y: number } | null;
    getHomePosition: (player: 'white' | 'black', pieceIndex: number) => { x: number; y: number } | null;
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

        if (animationData && !animationState) {
            // Start new animation
            const { player, index, fromPosition, toPosition, waypoints } = animationData;

            let startPos: { x: number; y: number } | null = null;
            let endPos: { x: number; y: number } | null = null;

            // Get start position
            if (fromPosition === 'start') {
                startPos = getHomePosition(player, index);
            } else {
                // Convert path index to board square using GameState helper
                const boardSquare = gameState.getSquareFromPathIndex(player, fromPosition as number);
                startPos = getSquarePosition(boardSquare);
            }

            // Get end position
            if (toPosition === 'start') {
                endPos = getHomePosition(player, index);
            } else {
                // Convert path index to board square using GameState helper
                const boardSquare = gameState.getSquareFromPathIndex(player, toPosition as number);
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
    }, [gameState.state.animatingPiece, animationState, getSquarePosition, getHomePosition]);

    const startAnimation = (state: AnimationState) => {
        const animate = (currentTime: number) => {
            const elapsed = currentTime - state.startTime;
            const progress = Math.min(elapsed / state.duration, 1);

            // Easing function (ease-out cubic)
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            setAnimationState(prev => prev ? { ...prev, progress: easedProgress } : null);

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

    const { player, index } = animationData;
    const pieces = gameState.state[player === 'white' ? 'whitePieces' : 'blackPieces'];
    const pieceType = pieces[index];

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
        if (player === 'white') {
            return pieceType === 'spots' ? whiteSpots : whiteBlank;
        } else {
            return pieceType === 'spots' ? blackSpots : blackBlank;
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
                zIndex: 1000, // High z-index to appear above everything
                transition: 'none' // Disable any CSS transitions
            }}
        >
            <img
                src={getPieceImage()}
                alt={`${player} ${pieceType} piece`}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block'
                }}
            />
        </div>
    );
};

export default PieceAnimator;
