import React from 'react';
import type { GameState } from './GameState';
import { HOME_SQUARE_SIZE, PIECE_SIZE, HIGHLIGHT_CIRCLE_SIZE } from './UIConstants';
import whiteBlank from './assets/WhiteBlank.svg';
import whiteSpots from './assets/WhiteSpots.svg';
import blackBlank from './assets/BlackBlank.svg';
import blackSpots from './assets/BlackSpots.svg';
import goToSquare from './assets/GoTo.svg';

interface PlayerHomeProps {
    player: 'white' | 'black';
    gameState: GameState;
}

const PlayerHome: React.FC<PlayerHomeProps> = ({
    player,
    gameState
}) => {
    const state = gameState.state;
    const settings = gameState.gameSettings;
    const winner = gameState.checkWinCondition();
    const playerName = gameState.getPlayerName(player);

    const isWhite = player === 'white';
    const pieces = isWhite ? state.whitePieces : state.blackPieces;
    const positions = isWhite ? state.whitePiecePositions : state.blackPiecePositions;
    const blankIcon = isWhite ? whiteBlank : blackBlank;
    const spotsIcon = isWhite ? whiteSpots : blackSpots;

    // Count pieces by type and location
    const completedCount = pieces.filter((piece, idx) =>
        piece === 'spots' && positions[idx] === 'start'
    ).length;

    const blankPiecesInHome = pieces.filter((piece, idx) =>
        piece === 'blank' && positions[idx] === 'start'
    ).length;

    // Get eligible blank pieces (for clicking)
    const eligibleBlankPieces = state.eligiblePieces.filter(idx =>
        pieces[idx] === 'blank' && positions[idx] === 'start'
    );

    // Check if any piece is selected and eligible to complete
    const selectedPiece = state.selectedPiece;
    const canCompleteToHome = selectedPiece &&
        selectedPiece.player === player &&
        gameState.getDestinationSquare() === 'complete';

    const homeStyle = isWhite ? {
        backgroundColor: '#ccc',
        borderColor: '#aaa'
    } : {
        backgroundColor: '#777',
        borderColor: '#555'
    };

    const titleColor = isWhite ?
        'var(--text-color, #666)' :
        'var(--text-color, #333)';

    return (
        <div style={{ marginTop: isWhite ? '24px' : '16px' }}>
            <h3 style={{
                textAlign: 'center',
                margin: '0 0 8px 0',
                color: titleColor,
                filter: 'var(--dark-mode-filter, none)'
            }}>
                {playerName || (isWhite ? "White's Home" : "Black's Home")}
                <span style={{ fontSize: '0.8rem', fontWeight: 'normal', marginLeft: '8px' }}>
                    (Completed: {completedCount}/{settings.piecesPerPlayer})
                </span>
            </h3>
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${settings.piecesPerPlayer}, ${HOME_SQUARE_SIZE}px)`,
                gridTemplateRows: `repeat(1, ${HOME_SQUARE_SIZE}px)`,
                gap: '0px',
                justifyContent: 'center',
                padding: '4px',
                backgroundColor: homeStyle.backgroundColor,
                borderRadius: '8px',
                border: `2px solid ${homeStyle.borderColor}`,
                width: 'fit-content',
                margin: '0 auto'
            }}>
                {Array.from({ length: settings.piecesPerPlayer }).map((_, slotIndex) => {
                    // Determine what goes in this slot
                    let slotContent = null;
                    let clickHandler = null;
                    let isEligible = false;
                    let isSelected = false;
                    let isDestination = false;

                    if (slotIndex < completedCount) {
                        // Left side: completed pieces (spots)
                        slotContent = spotsIcon;
                    } else if (slotIndex >= settings.piecesPerPlayer - blankPiecesInHome) {
                        // Right side: blank pieces
                        slotContent = blankIcon;

                        // Only the leftmost blank piece (first slot with blank pieces) should be eligible
                        const isLeftmostBlankSlot = slotIndex === settings.piecesPerPlayer - blankPiecesInHome;

                        // Check if this is the leftmost blank piece and it's eligible to move
                        isEligible = isLeftmostBlankSlot &&
                            eligibleBlankPieces.length > 0 &&
                            state.gameStarted && !winner &&
                            state.currentPlayer === player &&
                            !gameState.isAnimating();

                        // Check if this leftmost blank piece is selected
                        isSelected = isLeftmostBlankSlot && !!(selectedPiece &&
                            selectedPiece.player === player &&
                            pieces[selectedPiece.index] === 'blank' &&
                            positions[selectedPiece.index] === 'start');

                        if (isEligible) {
                            clickHandler = () => {
                                // Find the first eligible blank piece and select it
                                const firstEligible = eligibleBlankPieces[0];
                                if (firstEligible !== undefined) {
                                    gameState.selectPiece(firstEligible);
                                }
                            };
                        }
                    } else {
                        // Middle: empty slots
                        // Check if this can be a destination for completing pieces
                        // Only the leftmost empty slot should show the destination marker
                        const isLeftmostEmptySlot = slotIndex === completedCount;

                        if (canCompleteToHome && isLeftmostEmptySlot) {
                            isDestination = true;
                            clickHandler = () => {
                                if (selectedPiece) {
                                    gameState.movePiece(selectedPiece.index);
                                }
                            };
                        }
                    }

                    return (
                        <div
                            key={`${player}-slot-${slotIndex}`}
                            style={{
                                width: HOME_SQUARE_SIZE,
                                height: HOME_SQUARE_SIZE,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 500,
                                position: 'relative',
                                cursor: (isEligible || isDestination) ? 'pointer' : 'default'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (clickHandler) {
                                    clickHandler();
                                }
                            }}
                        >
                            {/* Selected piece circle */}
                            {slotContent && isSelected && (
                                <div
                                    className="selected-circle"
                                    style={{
                                        position: 'absolute',
                                        width: `${HIGHLIGHT_CIRCLE_SIZE}px`,
                                        height: `${HIGHLIGHT_CIRCLE_SIZE}px`,
                                        borderRadius: '50%',
                                        zIndex: 1
                                    }}
                                />
                            )}

                            {/* Highlight circle for eligible pieces */}
                            {slotContent && isEligible && !isSelected && (
                                <div
                                    className="highlight-circle"
                                    style={{
                                        position: 'absolute',
                                        width: `${HIGHLIGHT_CIRCLE_SIZE}px`,
                                        height: `${HIGHLIGHT_CIRCLE_SIZE}px`,
                                        borderRadius: '50%',
                                        zIndex: 1
                                    }}
                                />
                            )}

                            {/* Piece image */}
                            {slotContent && (
                                <img
                                    src={slotContent}
                                    alt={`${isWhite ? 'White' : 'Black'} piece`}
                                    style={{
                                        width: `${PIECE_SIZE}px`,
                                        height: `${PIECE_SIZE}px`,
                                        borderRadius: 4,
                                        position: 'relative',
                                        zIndex: 2
                                    }}
                                />
                            )}

                            {/* GoTo indicator for completion destination */}
                            {isDestination && (
                                <img
                                    src={goToSquare}
                                    alt="Go To Home"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        borderRadius: 4,
                                        zIndex: 3,
                                        cursor: 'pointer'
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PlayerHome;
