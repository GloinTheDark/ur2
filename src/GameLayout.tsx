import React, { useRef, useCallback } from 'react';
import { GameState } from './GameState';
import PieceAnimator from './PieceAnimator';
import CapturedPieceAnimator from './CapturedPieceAnimator';
import { SQUARE_SIZE, BOARD_GAP, HOME_SQUARE_SIZE, STACK_OFFSET, BOARD_SQUARE_BORDER } from './UIConstants';
import { BOARD_COLUMNS, BOARD_ROWS } from './BoardLayout';

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

    // Transform coordinates based on board orientation for animations
    const transformAnimationCoordinates = useCallback((x: number, y: number) => {
        if (!boardRef.current || !containerRef.current) {
            return { x, y };
        }

        const orientation = gameState.getBoardOrientation();

        // Get board dimensions and center for transformation
        const boardRect = boardRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();

        // Board center relative to container
        const boardCenterX = boardRect.left - containerRect.left + boardRect.width / 2;
        const boardCenterY = boardRect.top - containerRect.top + boardRect.height / 2;

        // Translate to board center
        const translatedX = x - boardCenterX;
        const translatedY = y - boardCenterY;

        let transformedX: number;
        let transformedY: number;

        // Apply rotation around board center
        switch (orientation) {
            case 0: // 0 degrees - no rotation
                transformedX = translatedX;
                transformedY = translatedY;
                break;
            case 1: // 90 degrees clockwise
                transformedX = -translatedY;
                transformedY = translatedX;
                break;
            case 2: // 180 degrees
                transformedX = -translatedX;
                transformedY = -translatedY;
                break;
            case 3: // 270 degrees clockwise (90 counter-clockwise)
                transformedX = translatedY;
                transformedY = -translatedX;
                break;
        }

        // Translate back from board center
        return {
            x: transformedX + boardCenterX,
            y: transformedY + boardCenterY
        };
    }, [gameState]);

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

        // Calculate position within the unrotated board coordinate system
        const squareX = col * (SQUARE_SIZE + BOARD_GAP) + SQUARE_SIZE / 2 + BOARD_SQUARE_BORDER;
        const squareY = row * (SQUARE_SIZE + BOARD_GAP) + SQUARE_SIZE / 2 + BOARD_SQUARE_BORDER;

        // Get the board center relative to container
        const boardCenterX = boardRect.left - containerRect.left + boardRect.width / 2;
        const boardCenterY = boardRect.top - containerRect.top + boardRect.height / 2;

        // Calculate original board dimensions (before rotation)
        const originalBoardWidth = BOARD_COLUMNS * SQUARE_SIZE + (BOARD_COLUMNS - 1) * BOARD_GAP;
        const originalBoardHeight = BOARD_ROWS * SQUARE_SIZE + (BOARD_ROWS - 1) * BOARD_GAP;

        // Position relative to the unrotated board center
        const relativeX = squareX - (originalBoardWidth / 2);
        const relativeY = squareY - (originalBoardHeight / 2);

        // Convert to container coordinates (centered on the actual board position)
        const containerX = boardCenterX + relativeX;
        const containerY = boardCenterY + relativeY;

        // Apply orientation transformation for animations
        const transformed = transformAnimationCoordinates(containerX, containerY);

        return { x: transformed.x, y: transformed.y };
    }, [transformAnimationCoordinates]);

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

        // Home positions are already correctly positioned by the layout,
        // so no coordinate transformation is needed
        return { x: targetX, y: targetY };
    }, [gameState, transformAnimationCoordinates]);

    // Get layout configuration based on board orientation
    const getLayoutConfig = useCallback(() => {
        const orientation = gameState.getBoardOrientation();

        switch (orientation) {
            case 0: // Standard: White top, Black bottom
                return {
                    containerStyle: {
                        display: 'flex',
                        flexDirection: 'column' as const,
                        alignItems: 'center' as const,
                        gap: '16px'
                    },
                    whitePosition: 'top' as const,
                    blackPosition: 'bottom' as const
                };
            case 1: // 90° CW: Black left, White right
                return {
                    containerStyle: {
                        display: 'flex',
                        flexDirection: 'row' as const,
                        alignItems: 'center' as const,
                        gap: '16px'
                    },
                    whitePosition: 'right' as const,
                    blackPosition: 'left' as const
                };
            case 2: // 180°: White bottom, Black top
                return {
                    containerStyle: {
                        display: 'flex',
                        flexDirection: 'column' as const,
                        alignItems: 'center' as const,
                        gap: '16px'
                    },
                    whitePosition: 'bottom' as const,
                    blackPosition: 'top' as const
                };
            case 3: // 270° CW: Black right, White left
                return {
                    containerStyle: {
                        display: 'flex',
                        flexDirection: 'row' as const,
                        alignItems: 'center' as const,
                        gap: '16px'
                    },
                    whitePosition: 'left' as const,
                    blackPosition: 'right' as const
                };
        }
    }, [gameState]);

    const layoutConfig = getLayoutConfig();

    // Render components in order based on orientation
    const renderLayoutComponents = () => {
        const components = {
            white: (
                <div key="white" ref={whiteHomeRef}>
                    {whitePlayerHome}
                </div>
            ),
            board: (
                <div key="board" ref={boardRef}>
                    {children}
                </div>
            ),
            black: (
                <div key="black" ref={blackHomeRef}>
                    {blackPlayerHome}
                </div>
            )
        };

        // Determine component order based on orientation
        switch (gameState.getBoardOrientation()) {
            case 0: // Standard: White top, Black bottom
                return [components.white, components.board, components.black];
            case 1: // 90° CW: Black left, White right  
                return [components.black, components.board, components.white];
            case 2: // 180°: White bottom, Black top
                return [components.black, components.board, components.white];
            case 3: // 270° CW: Black right, White left
                return [components.white, components.board, components.black];
        }
    };

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                ...layoutConfig.containerStyle
            }}
        >
            {renderLayoutComponents()}

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
