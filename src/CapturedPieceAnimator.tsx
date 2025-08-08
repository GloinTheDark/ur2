import React, { useEffect, useState, useRef } from 'react';
import { GameState } from './GameState';
import whiteBlank from './assets/WhiteBlank.svg';
import blackBlank from './assets/BlackBlank.svg';
import { PIECE_SIZE } from './UIConstants';

interface CapturedPieceAnimatorProps {
    gameState: GameState;
    getSquarePosition: (square: number) => { x: number; y: number } | null;
    getHomePosition: (player: 'white' | 'black', pieceIndex: number) => { x: number; y: number } | null;
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
        const capturedAnimationData = gameState.getCapturedPieceAnimationData();

        if (capturedAnimationData && !animationState) {
            // Start new captured piece animation
            const { player, index, fromPosition } = capturedAnimationData;

            // Get start position (board square where piece was captured)
            const boardSquare = gameState.getSquareFromPathIndex(player, fromPosition);
            const startPos = getSquarePosition(boardSquare);

            // Get end position (home area)
            const endPos = getHomePosition(player, index);

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
        } else if (!capturedAnimationData && animationState) {
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

    const capturedAnimationData = gameState.getCapturedPieceAnimationData();
    if (!capturedAnimationData) {
        return null;
    }

    const { player } = capturedAnimationData;

    // Calculate current position
    const { startPosition, endPosition, progress } = animationState;
    const currentX = startPosition.x + (endPosition.x - startPosition.x) * progress;
    const currentY = startPosition.y + (endPosition.y - startPosition.y) * progress;

    // Captured pieces are always blank when they return home
    const getPieceImage = () => {
        return player === 'white' ? whiteBlank : blackBlank;
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
                zIndex: 999, // Slightly lower than regular piece animation
                transition: 'none', // Disable any CSS transitions
                opacity: 0.8 // Slightly transparent to distinguish from regular pieces
            }}
        >
            <img
                src={getPieceImage()}
                alt={`Captured ${player} piece`}
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'block'
                }}
            />
        </div>
    );
};

export default CapturedPieceAnimator;
