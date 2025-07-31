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
            const { player, index, fromPosition, toPosition } = animationData;

            let startPos: { x: number; y: number } | null = null;
            let endPos: { x: number; y: number } | null = null;

            // Get start position
            if (fromPosition === 'start') {
                startPos = getHomePosition(player, index);
            } else {
                startPos = getSquarePosition(fromPosition);
            }

            // Get end position
            if (toPosition === 'start') {
                endPos = getHomePosition(player, index);
            } else {
                endPos = getSquarePosition(toPosition);
            }

            if (startPos && endPos) {
                const newAnimationState: AnimationState = {
                    startPosition: startPos,
                    endPosition: endPos,
                    progress: 0,
                    duration: 800, // 800ms animation
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

    // Calculate current position
    const { startPosition, endPosition, progress } = animationState;
    const currentX = startPosition.x + (endPosition.x - startPosition.x) * progress;
    const currentY = startPosition.y + (endPosition.y - startPosition.y) * progress;

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
