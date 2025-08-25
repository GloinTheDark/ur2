import React, { useRef, useCallback } from 'react';
import { GameState } from './GameState';
import PieceAnimator from './PieceAnimator';
import CapturedPieceAnimator from './CapturedPieceAnimator';
import { SQUARE_SIZE, BOARD_GAP, HOME_SQUARE_SIZE, STACK_OFFSET } from './UIConstants';
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
    const getHomePosition = useCallback((player: 'white' | 'black', isMovingToFinish: boolean): { x: number; y: number } | null => {
        const homeRef = player === 'white' ? whiteHomeRef : blackHomeRef;

        if (!homeRef.current || !containerRef.current) {
            return null;
        }

        const containerRect = containerRef.current.getBoundingClientRect();

        // Find the specific stack container we need
        let targetStackContainer: HTMLElement | null = null;

        if (isMovingToFinish) {
            // Find the finished stack (should be the second PieceStack component or the right one)
            const stacks = homeRef.current.querySelectorAll('div > div[style*="position: relative"][style*="width"]');
            targetStackContainer = stacks[1] as HTMLElement; // Second stack is finished
        } else {
            // Find the starting stack (should be the first PieceStack component or the left one)
            const stacks = homeRef.current.querySelectorAll('div > div[style*="position: relative"][style*="width"]');
            targetStackContainer = stacks[0] as HTMLElement; // First stack is starting
        }

        if (!targetStackContainer) {
            console.warn(`Could not find ${isMovingToFinish ? 'finished' : 'starting'} stack container`);
            // Fallback: try to find any stack containers
            const allStacks = homeRef.current.querySelectorAll('[style*="position: relative"]');
            console.log('Available stack containers:', allStacks.length);
            return null;
        }

        const stackRect = targetStackContainer.getBoundingClientRect();

        // Get game state to determine piece counts for stack positioning
        const state = gameState.state;
        const positions = player === 'white' ? state.whitePiecePositions : state.blackPiecePositions;

        // Calculate piece counts
        const completionIndex = gameState.getEndOfPath();
        const completedCount = positions.filter((pos) => pos === completionIndex).length;
        const startingCount = positions.filter((pos) => pos === 0).length;

        // Center on the stack horizontally (like the destination marker does)
        const targetX = stackRect.left - containerRect.left + (stackRect.width / 2);

        // Calculate Y position: top of stack minus stack height offset
        let targetY: number;
        if (isMovingToFinish) {
            // Position at the top of the finished stack
            targetY = stackRect.bottom - containerRect.top - (HOME_SQUARE_SIZE / 2) - (completedCount * STACK_OFFSET);
        } else {
            // Position at the top of the starting stack
            targetY = stackRect.bottom - containerRect.top - (HOME_SQUARE_SIZE / 2) - (startingCount * STACK_OFFSET);
        }

        return { x: targetX, y: targetY };
    }, [gameState]); return (
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
            {gameState.gameSettings.pieceAnimations && gameState.isPieceAnimating() && (
                <PieceAnimator
                    gameState={gameState}
                    getSquarePosition={getSquarePosition}
                    getHomePosition={getHomePosition}
                />
            )}
            {gameState.isCapturedPieceAnimating() && (
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
