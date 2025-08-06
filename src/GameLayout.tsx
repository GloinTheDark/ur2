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
    const getHomePosition = useCallback((player: 'white' | 'black', pieceIndex: number): { x: number; y: number } | null => {
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

        const position = positions[pieceIndex];

        // For animations, we need to handle pieces that are 'moving' from start or to start
        // Check if this piece is currently animating from start position
        const animatingPiece = state.animatingPiece;
        const animatingCapturedPiece = state.animatingCapturedPiece;

        const isAnimatingFromStart = animatingPiece &&
            animatingPiece.player === player &&
            animatingPiece.index === pieceIndex &&
            animatingPiece.fromPosition === 0;

        // Get player path to determine completion index
        const playerPath = gameState.getPlayerPath(player);
        const completionIndex = playerPath.length - 1;

        const isAnimatingToHome = animatingPiece &&
            animatingPiece.player === player &&
            animatingPiece.index === pieceIndex &&
            (animatingPiece.toPosition === 0 || animatingPiece.toPosition === completionIndex);

        const isCapturedPieceAnimating = animatingCapturedPiece &&
            animatingCapturedPiece.player === player &&
            animatingCapturedPiece.index === pieceIndex;

        // If piece is not in start position and not animating from/to home, don't show in home
        if (position !== 0 && !isAnimatingFromStart && !isAnimatingToHome && !isCapturedPieceAnimating) {
            return null;
        }

        // Determine target slot based on piece type
        let targetSlot = 0;

        // Special handling for captured pieces - they always go to the rightmost empty slot
        if (isCapturedPieceAnimating) {
            // Captured pieces become blank and go to the rightmost empty slot
            // Count existing blank pieces (excluding the captured piece itself)
            const existingBlankCount = positions.filter((pos, idx) => {
                if (idx === pieceIndex) return false; // Don't count the captured piece itself
                const inHome = pos === 0 ||
                    (animatingPiece && animatingPiece.player === player &&
                        animatingPiece.index === idx &&
                        (animatingPiece.fromPosition === 0 || animatingPiece.toPosition === 0 || animatingPiece.toPosition === completionIndex));
                return !gameState.shouldPieceShowSpots(pos, player) && inHome;
            }).length;

            // The rightmost empty slot is just before the existing blank pieces
            // Layout: [Completed][Completed][Empty][Empty][CAPTURE HERE][Blank][Blank]
            targetSlot = gameState.getPiecesPerPlayer() - existingBlankCount - 1;
        } else if (gameState.shouldPieceShowSpots(position, player)) {
            // Completed pieces go on the left
            if (isAnimatingToHome && animatingPiece && animatingPiece.toPosition === completionIndex) {
                // When a piece is completing its circuit and returning home as a spotted piece,
                // it should go to the leftmost empty slot (next available slot after existing completed pieces)
                const existingCompletedCount = positions.filter((pos, idx) => {
                    if (idx === pieceIndex) return false; // Don't count this piece itself
                    const inHome = pos === 0 ||
                        (animatingPiece && animatingPiece.player === player &&
                            animatingPiece.index === idx &&
                            (animatingPiece.fromPosition === 0 || animatingPiece.toPosition === 0 || animatingPiece.toPosition === completionIndex));
                    return gameState.shouldPieceShowSpots(pos, player) && inHome;
                }).length;

                targetSlot = existingCompletedCount; // Next available leftmost slot
            } else {
                // For pieces already at home, find which completed piece this is (0-indexed from left)
                const completedPieces = positions.map((pos, idx) => ({ position: pos, index: idx }))
                    .filter(item => {
                        const inHome = item.position === 0 ||
                            (animatingPiece && animatingPiece.player === player &&
                                animatingPiece.index === item.index &&
                                (animatingPiece.fromPosition === 0 || animatingPiece.toPosition === 0 || animatingPiece.toPosition === completionIndex));
                        return gameState.shouldPieceShowSpots(item.position, player) && inHome;
                    })
                    .sort((a, b) => a.index - b.index); // Sort by original index for consistency

                const thisCompletedIndex = completedPieces.findIndex(item => item.index === pieceIndex);
                targetSlot = thisCompletedIndex >= 0 ? thisCompletedIndex : 0;
            }
        } else {
            // Blank pieces go on the right
            const blankPieces = positions.map((pos, idx) => ({ position: pos, index: idx }))
                .filter(item => {
                    const inHome = item.position === 0 ||
                        (animatingPiece && animatingPiece.player === player &&
                            animatingPiece.index === item.index &&
                            (animatingPiece.fromPosition === 0 || animatingPiece.toPosition === 0 || animatingPiece.toPosition === completionIndex)) ||
                        (animatingCapturedPiece && animatingCapturedPiece.player === player &&
                            animatingCapturedPiece.index === item.index);
                    return !gameState.shouldPieceShowSpots(item.position, player) && inHome;
                })
                .sort((a, b) => a.index - b.index); // Sort by original index for consistency

            const thisBlankIndex = blankPieces.findIndex(item => item.index === pieceIndex);
            const completedCount = positions.filter((pos, idx) => {
                const inHome = pos === 0 ||
                    (animatingPiece && animatingPiece.player === player &&
                        animatingPiece.index === idx &&
                        (animatingPiece.fromPosition === 0 || animatingPiece.toPosition === 0 || animatingPiece.toPosition === completionIndex));
                return gameState.shouldPieceShowSpots(pos, player) && inHome;
            }).length;

            targetSlot = completedCount + 1 + (thisBlankIndex >= 0 ? thisBlankIndex : 0);
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
