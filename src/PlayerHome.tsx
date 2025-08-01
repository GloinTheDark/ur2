import React from 'react';
import type { GameStateData, GameSettings } from './GameState';
import { PIECE_SIZE, HIGHLIGHT_CIRCLE_SIZE, HOME_SQUARE_SIZE } from './UIConstants';
import whiteBlank from './assets/WhiteBlank.svg';
import whiteSpots from './assets/WhiteSpots.svg';
import blackBlank from './assets/BlackBlank.svg';
import blackSpots from './assets/BlackSpots.svg';
import goToSquare from './assets/GoTo.svg';

interface PlayerHomeProps {
    player: 'white' | 'black';
    playerName?: string;
    state: GameStateData;
    settings: GameSettings;
    winner: 'white' | 'black' | null;
    getDestinationSquare: () => number | 'complete' | null;
    onPieceClick: (pieceIndex: number) => void;
    onDestinationClick: (pieceIndex: number) => void;
}

const PlayerHome: React.FC<PlayerHomeProps> = ({
    player,
    playerName,
    state,
    settings,
    winner,
    getDestinationSquare,
    onPieceClick,
    onDestinationClick
}) => {
    const isWhite = player === 'white';
    const pieces = isWhite ? state.whitePieces : state.blackPieces;
    const positions = isWhite ? state.whitePiecePositions : state.blackPiecePositions;
    const blankIcon = isWhite ? whiteBlank : blackBlank;
    const spotsIcon = isWhite ? whiteSpots : blackSpots;

    const completedCount = pieces.filter((piece, idx) =>
        piece === 'spots' && positions[idx] === 'start'
    ).length;

    const homeStyle = isWhite ? {
        backgroundColor: '#f8f8f8ff',
        borderColor: '#ccc'
    } : {
        backgroundColor: '#2a2a2a',
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
                {Array.from({ length: settings.piecesPerPlayer }).map((_, idx) => {
                    const isPieceInStart = positions[idx] === 'start';
                    const isPieceMoving = positions[idx] === 'moving';
                    const isEligible = state.gameStarted && !winner && state.currentPlayer === player && !state.animatingPiece?.isAnimating && state.eligiblePieces.includes(idx);
                    const isSelected = state.selectedPiece !== null && state.selectedPiece.player === player && state.selectedPiece.index === idx && isPieceInStart;

                    // Check if this home slot is the destination for a piece completing the path
                    const destinationSquare = getDestinationSquare();
                    const isDestinationHome = destinationSquare === 'complete' && state.selectedPiece?.player === player &&
                        state.selectedPiece?.index === idx && !isPieceInStart;

                    return (
                        <div
                            key={`${player}-${idx}`}
                            data-piece-index={idx}
                            style={{
                                width: HOME_SQUARE_SIZE,
                                height: HOME_SQUARE_SIZE,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 500,
                                position: 'relative',
                                cursor: isPieceInStart && isEligible ? 'pointer' : 'default'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (isPieceInStart && isEligible) {
                                    onPieceClick(idx);
                                }
                            }}
                        >
                            {/* Selected piece circle takes priority over eligible highlight */}
                            {isPieceInStart && isSelected && (
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
                            {/* Highlight circle for eligible pieces (only if not selected) */}
                            {isPieceInStart && isEligible && !isSelected && (
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
                            {/* Only render piece if it's in start position and not currently moving */}
                            {isPieceInStart && !isPieceMoving && (
                                <img
                                    src={pieces[idx] === 'blank' ? blankIcon : spotsIcon}
                                    alt={`${isWhite ? 'White' : 'Black'} piece ${idx + 1} - ${pieces[idx]}`}
                                    style={{
                                        width: `${PIECE_SIZE}px`,
                                        height: `${PIECE_SIZE}px`,
                                        borderRadius: 4,
                                        position: 'relative',
                                        zIndex: 2
                                    }}
                                />
                            )}
                            {/* GoTo indicator for pieces completing the path */}
                            {isDestinationHome && (
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDestinationClick(idx);
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
