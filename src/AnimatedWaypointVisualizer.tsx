import React, { useEffect, useState, useRef } from 'react';
import { GameState, type Move } from './GameState';
import { SQUARE_SIZE } from './UIConstants';

interface AnimatedWaypointVisualizerProps {
    gameState: GameState;
    getSquarePosition: (square: number) => { x: number; y: number } | null;
    getHomePosition: (player: 'white' | 'black', isMovingToFinish: boolean) => { x: number; y: number } | null;
}

interface WaypointPath {
    waypoints: { x: number; y: number }[];
    totalDistance: number;
    moveIndex: number; // To differentiate between multiple legal moves
}

interface AnimationState {
    paths: WaypointPath[];
    progress: number;
    startTime: number;
}

const AnimatedWaypointVisualizer: React.FC<AnimatedWaypointVisualizerProps> = ({
    gameState,
    getSquarePosition,
    getHomePosition
}) => {
    const [animationState, setAnimationState] = useState<AnimationState | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const state = gameState.state;

        // Only show when a piece is selected, game is active, and not during piece animations
        if (!state.gameStarted || state.selectedPiece === null || gameState.isAnimating()) {
            setAnimationState(null);
            return;
        }

        // Get all legal moves for the selected piece
        const legalMoves = gameState.getLegalMoves().filter((move: any) =>
            move.movingPieceIndex === state.selectedPiece && move.legal
        );

        if (legalMoves.length === 0) {
            setAnimationState(null);
            return;
        }

        // Create paths for each legal move
        const paths: WaypointPath[] = [];

        legalMoves.forEach((move: any, moveIndex: number) => {
            const player = state.currentPlayer;
            const { waypoints } = gameState.getAnimationWaypoints(
                player,
                move.fromPosition,
                move.toPosition
            );

            let startPos: { x: number; y: number } | null = null;
            let endPos: { x: number; y: number } | null = null;

            // Get start position
            if (move.fromPosition === 0) {
                startPos = getHomePosition(player, false); // Moving from start
            } else {
                const boardSquare = gameState.getSquareFromPathIndex(player, move.fromPosition);
                startPos = getSquarePosition(boardSquare);
            }

            // Get end position
            if (move.toPosition === gameState.getEndOfPath()) {
                endPos = getHomePosition(player, true); // Moving to finish
            } else {
                const boardSquare = gameState.getSquareFromPathIndex(player, move.toPosition);
                endPos = getSquarePosition(boardSquare);
            }

            if (startPos && endPos) {
                // Calculate waypoint positions
                const waypointPositions: { x: number; y: number }[] = [startPos];

                for (const waypointSquare of waypoints) {
                    const waypointPos = getSquarePosition(waypointSquare);
                    if (waypointPos) {
                        waypointPositions.push(waypointPos);
                    }
                }

                waypointPositions.push(endPos);

                // Calculate total distance
                let totalDistance = 0;
                for (let i = 0; i < waypointPositions.length - 1; i++) {
                    const dx = waypointPositions[i + 1].x - waypointPositions[i].x;
                    const dy = waypointPositions[i + 1].y - waypointPositions[i].y;
                    totalDistance += Math.sqrt(dx * dx + dy * dy);
                }

                paths.push({
                    waypoints: waypointPositions,
                    totalDistance,
                    moveIndex
                });
            }
        });

        if (paths.length > 0) {
            const newAnimationState: AnimationState = {
                paths,
                progress: 0,
                startTime: performance.now()
            };

            setAnimationState(newAnimationState);
            startAnimation(newAnimationState);
        }

    }, [gameState.state.selectedPiece, gameState.state.gameStarted, gameState.isAnimating(), gameState.getBoardOrientation(), getSquarePosition, getHomePosition]);

    const startAnimation = (state: AnimationState) => {
        const animate = (currentTime: number) => {
            const elapsed = currentTime - state.startTime;
            // Slow continuous animation - 4 seconds for full cycle
            const progress = (elapsed / 4000) % 1;

            setAnimationState(prev => prev ? {
                ...prev,
                progress
            } : null);

            animationFrameRef.current = requestAnimationFrame(animate);
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

    // Calculate positions for circles along each path
    const calculateCirclePositions = (path: WaypointPath, progress: number) => {
        const { waypoints, totalDistance } = path;
        const circleSpacing = SQUARE_SIZE / 2; // Distance between circles
        const numCircles = Math.floor(totalDistance / circleSpacing);
        const circles: { x: number; y: number; opacity: number }[] = [];

        for (let i = 0; i < numCircles; i++) {
            // Stagger circle positions with an offset based on progress and circle index
            const circleProgress = (progress + (i * 0.15)) % 1; // 0.15 creates nice spacing
            const targetDistance = circleProgress * totalDistance;

            let currentDistance = 0;

            // Find position along the path
            for (let j = 0; j < waypoints.length - 1; j++) {
                const start = waypoints[j];
                const end = waypoints[j + 1];
                const segmentDistance = Math.sqrt(
                    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
                );

                if (currentDistance + segmentDistance >= targetDistance) {
                    // Position is within this segment
                    const segmentProgress = (targetDistance - currentDistance) / segmentDistance;
                    const x = start.x + (end.x - start.x) * segmentProgress;
                    const y = start.y + (end.y - start.y) * segmentProgress;

                    // Consistent opacity for all circles
                    const opacity = 0.8;

                    circles.push({ x, y, opacity });
                    break;
                }

                currentDistance += segmentDistance;
            }
        }

        return circles;
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 50 // Above other elements but below main UI
        }}>
            {animationState.paths.map((path, pathIndex) => {
                const circles = calculateCirclePositions(path, animationState.progress);

                return circles.map((circle, circleIndex) => (
                    <div
                        key={`path-${pathIndex}-circle-${circleIndex}`}
                        style={{
                            position: 'absolute',
                            left: circle.x - 4, // Center 8px circle
                            top: circle.y - 4,
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: `rgba(100, 255, 100, ${circle.opacity})`, // Light green
                            border: '1px solid rgba(50, 200, 50, 0.8)',
                            boxShadow: `0 0 4px rgba(100, 255, 100, ${circle.opacity * 0.6})`
                        }}
                    />
                ));
            })}
        </div>
    );
};

export default AnimatedWaypointVisualizer;
