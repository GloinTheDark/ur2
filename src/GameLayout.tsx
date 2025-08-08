import React, { useRef, useCallback } from 'react';
import { GameState } from './GameState';
import PieceAnimator from './PieceAnimator';
import CapturedPieceAnimator from './CapturedPieceAnimator';
import { SQUARE_SIZE, BOARD_GAP, HOME_SQUARE_SIZE } from './UIConstants';
import { BOARD_COLUMNS } from './BoardLayout';

interface GameLayoutProps {
    gameState: GameState;
    children: React.ReactNode; // The game board
    whitePlayerHome: React.ReactNode;
    blackPlayerHome: React.ReactNode;
}

const GameLayout: React.FC<GameLayoutProps> = ({
    gameState,
    children,
    whitePlayerHome,
    blackPlayerHome
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const boardRef = useRef<HTMLDivElement>(null);
    const whiteHomeRef = useRef<HTMLDivElement>(null);
    const blackHomeRef = useRef<HTMLDivElement>(null);

    // Calculate position of a square on the board
    const getSquarePosition = useCallback((square: number): { x: number; y: number } | null => {
        if (!boardRef.current || !containerRef.current) {
            return null;
        }

        if (square < 1 || square > 24) {
            return null; // Invalid square number
        }

        const boardRect = boardRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Convert square number to grid position
        const squareIndex = square - 1; // Convert to 0-based index
        const col = squareIndex % BOARD_COLUMNS;
        const row = Math.floor(squareIndex / BOARD_COLUMNS);

        // Calculate position within the board
        const squareX = col * (SQUARE_SIZE + BOARD_GAP) + SQUARE_SIZE / 2;
        const squareY = row * (SQUARE_SIZE + BOARD_GAP) + SQUARE_SIZE / 2;

        // Convert to container coordinates
        const containerX = boardRect.left - containerRect.left + squareX;
        const containerY = boardRect.top - containerRect.top + squareY;

        return { x: containerX, y: containerY };
    }, []);

    // Calculate position of a piece in a player's home area
    // This is used for animating pieces to and from home
    const getHomePosition = useCallback((player: 'white' | 'black'): { x: number; y: number } | null => {
        const homeRef = player === 'white' ? whiteHomeRef : blackHomeRef;

        if (!homeRef.current || !containerRef.current) {
            return null;
        }

        const homeRect = homeRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Try to find the actual grid element within the home container
        const gridElement = homeRef.current.querySelector('div[style*="display: grid"]') as HTMLElement;
        let gridRect = homeRect;

        if (gridElement) {
            gridRect = gridElement.getBoundingClientRect();
        }

        // Get game state to determine piece type and target zone
        const state = gameState.state;
        const positions = player === 'white' ? state.whitePiecePositions : state.blackPiecePositions;


        // For animations, we need to handle pieces that are 'moving' from start or to start
        // Check if this piece is currently animating from start position
        const isPieceAnimating = state.isPieceAnimating;
        const currentMove = state.currentMove;

        if (!currentMove) {
            return null; // No current move to evaluate
        }

        // Get completion index
        const completionIndex = gameState.getEndOfPath();

        const isAnimatingToHome = isPieceAnimating && currentMove.destinationSquare === 25;

        // Determine target slot based on piece type
        let targetSlot = 0;

        if (isAnimatingToHome) {
            const existingCompletedCount = positions.filter((pos) => {
                return pos === completionIndex;
            }).length;

            targetSlot = existingCompletedCount; // Next available leftmost slot
        } else {
            // used for moving pieces from start and moving captured pieces back to start
            const existingBlankCount = positions.filter((pos) => {
                return pos === 0;
            }).length;

            targetSlot = gameState.getPiecesPerPlayer() - existingBlankCount - 1; // Rightmost empty slot
        }

        // Calculate position within the home grid
        const slotWidth = HOME_SQUARE_SIZE;

        const containerX = gridRect.left - containerRect.left + (targetSlot * slotWidth) + (slotWidth / 2);
        const containerY = gridRect.top - containerRect.top + (HOME_SQUARE_SIZE / 2);

        return { x: containerX, y: containerY };
    }, [gameState]);

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
            }}
        >
            {/* White Player Home */}
            <div ref={whiteHomeRef}>
                {whitePlayerHome}
            </div>

            {/* Game Board */}
            <div ref={boardRef}>
                {children}
            </div>

            {/* Black Player Home */}
            <div ref={blackHomeRef}>
                {blackPlayerHome}
            </div>

            {/* Piece Animators */}
            {gameState.gameSettings.pieceAnimations && gameState.isAnimating() && (
                <PieceAnimator
                    gameState={gameState}
                    getSquarePosition={getSquarePosition}
                    getHomePosition={getHomePosition}
                />
            )}
            {gameState.gameSettings.pieceAnimations && gameState.getCapturedPieceAnimationData() && (
                <CapturedPieceAnimator
                    gameState={gameState}
                    getSquarePosition={getSquarePosition}
                    getHomePosition={getHomePosition}
                />
            )}
        </div>
    );
};

export default GameLayout;
