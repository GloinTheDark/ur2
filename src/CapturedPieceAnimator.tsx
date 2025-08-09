import React, { useEffect, useState, useRef } from 'react';
import { GameState } from './GameState';
import whiteBlank from './assets/WhiteBlank.svg';
import blackBlank from './assets/BlackBlank.svg';
import { PIECE_SIZE, STACK_OFFSET, PIECE_ANIMATION_Z_INDEX } from './UIConstants';

interface CapturedPieceAnimatorProps {
    gameState: GameState;
    getSquarePosition: (square: number) => { x: number; y: number } | null;
    getHomePosition: (player: 'white' | 'black', isMovingToFinish: boolean) => { x: number; y: number } | null;
}

interface CapturedAnimationState {
    startPosition: { x: number; y: number };
    endPosition: { x: number; y: number };
    progress: number;
    duration: number;
    startTime: number;
}

const CapturedPieceAnimator: React.FC<CapturedPieceAnimatorProps> = ({
    gameState,
    getSquarePosition,
    getHomePosition
}) => {
    const [animationState, setAnimationState] = useState<CapturedAnimationState | null>(null);
    const animationFrameRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        const move = gameState.getCurrentMove();

        if (move && !animationState) {
            // Start new captured piece animation
            const player = gameState.getCurrentOpponent(); // Get the player from the move
            const boardSquare = move.destinationSquare; // Get the board square from the move

            // Get start position (board square where piece was captured)
            const startPos = getSquarePosition(boardSquare);

            // Get end position (home area) - captured pieces go back to start, not to finish
            const endPos = getHomePosition(player, false);

            if (startPos && endPos) {
                const newAnimationState: CapturedAnimationState = {
                    startPosition: startPos,
                    endPosition: endPos,
                    progress: 0,
                    duration: 600, // 600ms animation (slightly faster than regular moves)
                    startTime: performance.now()
                };

                setAnimationState(newAnimationState);
                startAnimation(newAnimationState);
            }
        } else if (!move && animationState) {
            // Animation should be cleaned up
            setAnimationState(null);
        }
    }, [gameState.state.isCapturedPieceAnimating, animationState, getSquarePosition, getHomePosition]);

    const startAnimation = (state: CapturedAnimationState) => {
        const animate = (currentTime: number) => {
            const elapsed = currentTime - state.startTime;
            const progress = Math.min(elapsed / state.duration, 1);

            // Easing function (ease-in cubic for captured pieces - feels more like falling back)
            const easedProgress = progress * progress * progress;

            setAnimationState(prev => prev ? { ...prev, progress: easedProgress } : null);

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            } else {
                // Animation complete
                setAnimationState(null);
                gameState.finishCapturedPieceAnimation();
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

    const player = gameState.getCurrentOpponent();
    const move = gameState.getCurrentMove();
    if (!move) return null;
    const stackSize = move.capturedPieces.length;

    // Calculate current position
    const { startPosition, endPosition, progress } = animationState;
    const currentX = startPosition.x + (endPosition.x - startPosition.x) * progress;
    const currentY = startPosition.y + (endPosition.y - startPosition.y) * progress;

    // Captured pieces are always blank when they return home
    const getPieceImage = () => {
        return player === 'white' ? whiteBlank : blackBlank;
    };

    // Render all pieces in the stack
    const renderStackPieces = () => {
        const pieces = [];
        for (let i = 0; i < stackSize; i++) {
            pieces.push(
                <img
                    key={i}
                    src={getPieceImage()}
                    alt={`Captured ${player} piece ${i + 1}`}
                    style={{
                        position: 'absolute',
                        left: i * STACK_OFFSET,
                        top: i * STACK_OFFSET,
                        width: '100%',
                        height: '100%',
                        display: 'block'
                    }}
                />
            );
        }
        return pieces;
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
                transition: 'none', // Disable any CSS transitions
                opacity: 0.8 // Slightly transparent to distinguish from regular pieces
            }}
        >
            {renderStackPieces()}
        </div>
    );
};

export default CapturedPieceAnimator;
