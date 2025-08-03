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

        // Try to find the actual grid element within the home container
        const gridElement = homeRef.current.querySelector('div[style*="display: grid"]') as HTMLElement;
        let gridRect = homeRect;

        if (gridElement) {
            gridRect = gridElement.getBoundingClientRect();
        }

        // Get game state to determine piece type and target zone
        const state = gameState.state;
        const pieces = player === 'white' ? state.whitePieces : state.blackPieces;
        const positions = player === 'white' ? state.whitePiecePositions : state.blackPiecePositions;

        const piece = pieces[pieceIndex];
        const position = positions[pieceIndex];

        // For animations, we need to handle pieces that are 'moving' from start or to start
        // Check if this piece is currently animating from start position
        const animatingPiece = state.animatingPiece;
        const animatingCapturedPiece = state.animatingCapturedPiece;

        const isAnimatingFromStart = animatingPiece &&
            animatingPiece.player === player &&
            animatingPiece.index === pieceIndex &&
            animatingPiece.fromPosition === 'start';

        const isAnimatingToStart = animatingPiece &&
            animatingPiece.player === player &&
            animatingPiece.index === pieceIndex &&
            animatingPiece.toPosition === 'start';

        const isCapturedPieceAnimating = animatingCapturedPiece &&
            animatingCapturedPiece.player === player &&
            animatingCapturedPiece.index === pieceIndex;

        // If piece is not in start position and not animating from/to start, don't show in home
        if (position !== 'start' && !isAnimatingFromStart && !isAnimatingToStart && !isCapturedPieceAnimating) {
            return null;
        }

        // Calculate counts to determine target zone
        // For animations, use the original state before the animation started
        const blankPiecesInHome = pieces.filter((p, idx) => {
            const pos = positions[idx];
            // Count pieces that are in start position OR animating from/to start OR captured piece animating
            const inHome = pos === 'start' ||
                (animatingPiece && animatingPiece.player === player &&
                    animatingPiece.index === idx &&
                    (animatingPiece.fromPosition === 'start' || animatingPiece.toPosition === 'start')) ||
                (animatingCapturedPiece && animatingCapturedPiece.player === player &&
                    animatingCapturedPiece.index === idx);
            return p === 'blank' && inHome;
        }).length;

        // Determine target slot based on piece type
        let targetSlot = 0;

        // Special handling for captured pieces - they always go to the rightmost empty slot
        if (isCapturedPieceAnimating) {
            // Captured pieces become blank and go to the rightmost empty slot
            // Count existing blank pieces (excluding the captured piece itself)
            const existingBlankCount = pieces.filter((p, idx) => {
                if (idx === pieceIndex) return false; // Don't count the captured piece itself
                const pos = positions[idx];
                const inHome = pos === 'start' ||
                    (animatingPiece && animatingPiece.player === player &&
                        animatingPiece.index === idx &&
                        (animatingPiece.fromPosition === 'start' || animatingPiece.toPosition === 'start'));
                return p === 'blank' && inHome;
            }).length;

            // The rightmost empty slot is just before the existing blank pieces
            // Layout: [Completed][Completed][Empty][Empty][CAPTURE HERE][Blank][Blank]
            targetSlot = gameState.getPiecesPerPlayer() - existingBlankCount - 1;
        } else if (piece === 'spots') {
            // Completed pieces go on the left
            if (isAnimatingToStart) {
                // When a piece is completing its circuit and returning home as a spotted piece,
                // it should go to the leftmost empty slot (next available slot after existing completed pieces)
                const existingCompletedCount = pieces.filter((p, idx) => {
                    if (idx === pieceIndex) return false; // Don't count this piece itself
                    const pos = positions[idx];
                    const inHome = pos === 'start' ||
                        (animatingPiece && animatingPiece.player === player &&
                            animatingPiece.index === idx &&
                            animatingPiece.fromPosition === 'start');
                    return p === 'spots' && inHome;
                }).length;

                targetSlot = existingCompletedCount; // Next available leftmost slot
            } else {
                // For pieces already at home, find which completed piece this is (0-indexed from left)
                const completedPieces = pieces.map((p, idx) => ({ piece: p, position: positions[idx], index: idx }))
                    .filter(item => {
                        const inHome = item.position === 'start' ||
                            (animatingPiece && animatingPiece.player === player &&
                                animatingPiece.index === item.index &&
                                (animatingPiece.fromPosition === 'start' || animatingPiece.toPosition === 'start'));
                        return item.piece === 'spots' && inHome;
                    })
                    .sort((a, b) => a.index - b.index); // Sort by original index for consistency

                const thisCompletedIndex = completedPieces.findIndex(item => item.index === pieceIndex);
                targetSlot = thisCompletedIndex >= 0 ? thisCompletedIndex : 0;
            }
        } else {
            // Blank pieces go on the right
            const blankPieces = pieces.map((p, idx) => ({ piece: p, position: positions[idx], index: idx }))
                .filter(item => {
                    const inHome = item.position === 'start' ||
                        (animatingPiece && animatingPiece.player === player &&
                            animatingPiece.index === item.index &&
                            (animatingPiece.fromPosition === 'start' || animatingPiece.toPosition === 'start')) ||
                        (animatingCapturedPiece && animatingCapturedPiece.player === player &&
                            animatingCapturedPiece.index === item.index);
                    return item.piece === 'blank' && inHome;
                })
                .sort((a, b) => a.index - b.index); // Sort by original index for consistency

            const thisBlankIndex = blankPieces.findIndex(item => item.index === pieceIndex);
            targetSlot = gameState.getPiecesPerPlayer() - blankPiecesInHome + (thisBlankIndex >= 0 ? thisBlankIndex : 0);
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
