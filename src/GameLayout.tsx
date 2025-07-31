import React, { useRef, useCallback } from 'react';
import { GameState } from './GameState';
import PieceAnimator from './PieceAnimator';
import CapturedPieceAnimator from './CapturedPieceAnimator';
import { SQUARE_SIZE, BOARD_GAP, PIECE_SIZE } from './UIConstants';
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
    const getSquarePosition = useCallback((square: number | 'start'): { x: number; y: number } | null => {
        if (square === 'start' || !boardRef.current || !containerRef.current) {
            return null;
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
    const getHomePosition = useCallback((player: 'white' | 'black', pieceIndex: number): { x: number; y: number } | null => {
        const homeRef = player === 'white' ? whiteHomeRef : blackHomeRef;

        if (!homeRef.current || !containerRef.current) {
            return null;
        }

        const homeRect = homeRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Find the specific piece position within the home area
        // This is a simplified calculation - you may need to adjust based on PlayerHome layout
        const pieceElements = homeRef.current.querySelectorAll('[data-piece-index]');
        const pieceElement = Array.from(pieceElements).find(
            el => el.getAttribute('data-piece-index') === pieceIndex.toString()
        ) as HTMLElement;

        if (pieceElement) {
            const pieceRect = pieceElement.getBoundingClientRect();
            const containerX = pieceRect.left - containerRect.left + PIECE_SIZE / 2;
            const containerY = pieceRect.top - containerRect.top + PIECE_SIZE / 2;
            return { x: containerX, y: containerY };
        }

        // Fallback to estimated position if we can't find the specific piece element
        const homeWidth = homeRect.width;
        const piecesPerRow = Math.floor(homeWidth / (PIECE_SIZE + 8)); // Assuming 8px gap
        const row = Math.floor(pieceIndex / piecesPerRow);
        const col = pieceIndex % piecesPerRow;

        const pieceX = col * (PIECE_SIZE + 8) + PIECE_SIZE / 2 + 16; // 16px padding
        const pieceY = row * (PIECE_SIZE + 8) + PIECE_SIZE / 2 + 16; // 16px padding

        const containerX = homeRect.left - containerRect.left + pieceX;
        const containerY = homeRect.top - containerRect.top + pieceY;

        return { x: containerX, y: containerY };
    }, []);

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
