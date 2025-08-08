import React from 'react';
import type { GameState } from './GameState';
import { HOME_SQUARE_SIZE, PIECE_SIZE, HIGHLIGHT_CIRCLE_SIZE } from './UIConstants';
import whiteBlank from './assets/WhiteBlank.svg';
import whiteSpots from './assets/WhiteSpots.svg';
import blackBlank from './assets/BlackBlank.svg';
import blackSpots from './assets/BlackSpots.svg';
import goToSquare from './assets/GoTo.svg';
import templeSquare from './assets/TempleSquare.svg';
import houseSquare from './assets/HouseSquare.svg';
import PlayerDiceRoller from './PlayerDiceRoller';

interface PlayerHomeProps {
    player: 'white' | 'black';
    gameState: GameState;
}

const PlayerHome: React.FC<PlayerHomeProps> = ({
    player,
    gameState
}) => {
    const state = gameState.state;
    const winner = gameState.checkWinCondition();
    const playerName = gameState.getPlayerName(player);

    const isWhite = player === 'white';
    const positions = isWhite ? state.whitePiecePositions : state.blackPiecePositions;
    const blankIcon = isWhite ? whiteBlank : blackBlank;
    const spotsIcon = isWhite ? whiteSpots : blackSpots;

    // Get player path to determine completion index
    const completionIndex = gameState.getEndOfPath();

    // Count pieces by type and location using the new position system
    const completedCount = positions.filter((pos) =>
        pos === completionIndex
    ).length;

    const blankPiecesInHome = positions.filter((pos) =>
        pos === 0
    ).length;

    // Get eligible blank pieces (for clicking) - pieces at position 0
    const eligibleBlankPieces = state.eligiblePieces.filter(idx =>
        positions[idx] === 0
    );

    // Check if any piece is selected and eligible to complete
    const selectedPiece = state.selectedPiece;
    const canCompleteToHome = selectedPiece !== null &&
        state.currentPlayer === player &&
        gameState.getDestinationSquares().includes(25); // BOARD_FINISH means completion

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

    // Get control status for Burglers ruleset
    const isBurglers = gameState.getCurrentRuleSet().name === 'Burglers of Ur';
    const templeControl = isBurglers ? gameState.getTempleBlessings(player) : null;
    const houseControl = isBurglers ? gameState.calculateHouseControl() : null;

    const hasTempleControl = templeControl?.hasControl || false;
    const hasHouseControl = houseControl ?
        (player === 'white' ? houseControl.whiteHouses > houseControl.blackHouses :
            houseControl.blackHouses > houseControl.whiteHouses) : false;

    // Get status message and UI behavior for this player
    const getStatusMessage = (): { message: string, type: 'static' | 'roll-button' | 'pass-button' | 'thinking' } => {
        // Check if game is over
        if (winner) {
            return {
                message: winner === player ? 'Victory!' : 'Defeat',
                type: 'static'
            };
        }

        // During initial roll phase, no player has a turn yet
        if (state.gamePhase === 'initial-roll') {
            return {
                message: 'Waiting for turn',
                type: 'static'
            };
        }

        // Check if it's this player's turn
        if (state.currentPlayer !== player) {
            return {
                message: 'Waiting for turn',
                type: 'static'
            };
        }

        // Get current player agent to determine if AI or human
        const currentPlayerAgent = gameState.getCurrentPlayerAgent();
        const isAI = currentPlayerAgent?.playerType === 'computer' && !gameState.isDebugPaused();

        // Check if animating
        if (gameState.isAnimating()) {
            // Check if it's dice animation
            if (state.diceAnimating) {
                return {
                    message: 'Rolling...',
                    type: 'static'
                };
            } else {
                // Must be piece animation
                return {
                    message: 'Moving...',
                    type: 'static'
                };
            }
        }

        // Check game phase
        if (state.diceRolls.length === 0) {
            // Need to roll dice
            if (state.isExtraTurn) {
                return {
                    message: 'Extra turn! Roll again',
                    type: isAI ? 'static' : 'roll-button'
                };
            } else {
                return {
                    message: 'Roll dice',
                    type: isAI ? 'static' : 'roll-button'
                };
            }
        } else if (state.selectedPiece === null) {
            // Need to select piece
            if (state.eligiblePieces.length === 0) {
                // No eligible pieces, turn will end automatically
                return {
                    message: 'No moves available: pass turn',
                    type: isAI ? 'static' : 'pass-button'
                };
            } else {
                return {
                    message: isAI ? 'Thinking...' : 'Select piece to move',
                    type: isAI ? 'thinking' : 'static'
                };
            }
        } else {
            // Piece selected, need to move
            return {
                message: isAI ? 'Thinking...' : 'Select destination',
                type: isAI ? 'thinking' : 'static'
            };
        }
    };

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
                    (Completed: {completedCount}/{gameState.getCurrentRuleSet().getPiecesToWin()})
                </span>
            </h3>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${gameState.getPiecesPerPlayer()}, ${HOME_SQUARE_SIZE}px)`,
                    gridTemplateRows: `repeat(1, ${HOME_SQUARE_SIZE}px)`,
                    gap: '0px',
                    justifyContent: 'center',
                    padding: '4px',
                    backgroundColor: homeStyle.backgroundColor,
                    borderRadius: '8px',
                    border: `2px solid ${homeStyle.borderColor}`,
                    width: 'fit-content'
                }}>
                    {Array.from({ length: gameState.getPiecesPerPlayer() }).map((_, slotIndex) => {
                        // Determine what goes in this slot
                        let slotContent = null;
                        let clickHandler = null;
                        let isEligible = false;
                        let isSelected = false;
                        let isDestination = false;

                        if (slotIndex < completedCount) {
                            // Left side: completed pieces (spots)
                            slotContent = spotsIcon;
                        } else if (slotIndex >= gameState.getPiecesPerPlayer() - blankPiecesInHome) {
                            // Right side: blank pieces
                            slotContent = blankIcon;

                            // Only the leftmost blank piece (first slot with blank pieces) should be eligible
                            const isLeftmostBlankSlot = slotIndex === gameState.getPiecesPerPlayer() - blankPiecesInHome;

                            // Check if this is the leftmost blank piece and it's eligible to move
                            isEligible = isLeftmostBlankSlot &&
                                eligibleBlankPieces.length > 0 &&
                                state.gameStarted && !winner &&
                                state.currentPlayer === player &&
                                !(state.isPieceAnimating || state.isCapturedPieceAnimating);

                            // Check if this leftmost blank piece is selected
                            isSelected = isLeftmostBlankSlot && !!(selectedPiece !== null &&
                                state.currentPlayer === player &&
                                positions[selectedPiece] === 0);

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
                                    if (selectedPiece !== null) {
                                        const legalMoves = gameState.getLegalMoves();
                                        const moveToMake = legalMoves.find(move =>
                                            move.movingPieceIndex === selectedPiece &&
                                            move.destinationSquare === 25
                                        );
                                        if (moveToMake) {
                                            gameState.startLegalMove(moveToMake);
                                        }
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

                {/* Status icons for Burglers ruleset */}
                {isBurglers && (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        alignItems: 'center'
                    }}>
                        {/* Temple Control Icon */}
                        <img
                            src={templeSquare}
                            alt="Temple Control"
                            title={`Temple Control: ${hasTempleControl ? 'Yes' : 'No'}`}
                            style={{
                                width: '24px',
                                height: '24px',
                                opacity: hasTempleControl ? 1.0 : 0.25,
                                filter: 'var(--dark-mode-filter, none)',
                                border: `1px solid rgba(0, 0, 255, ${hasTempleControl ? 1.0 : 0.25})`,
                                borderRadius: '2px'
                            }}
                        />

                        {/* House Control Icon */}
                        <img
                            src={houseSquare}
                            alt="House Control"
                            title={`House Control: ${hasHouseControl ? 'Yes' : 'No'}`}
                            style={{
                                width: '24px',
                                height: '24px',
                                opacity: hasHouseControl ? 1.0 : 0.25,
                                filter: 'var(--dark-mode-filter, none)',
                                border: `1px solid rgba(0, 0, 255, ${hasHouseControl ? 1.0 : 0.25})`,
                                borderRadius: '2px'
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Status Line */}
            <div
                style={{
                    textAlign: 'center',
                    marginTop: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '500',
                    color: titleColor,
                    filter: 'var(--dark-mode-filter, none)',
                    height: '32px', // Fixed height to prevent layout shifts
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: (() => {
                        const status = getStatusMessage();
                        return (status.type === 'roll-button' || status.type === 'pass-button') ? 'pointer' : 'default';
                    })(),
                    borderRadius: '4px',
                    backgroundColor: (() => {
                        const status = getStatusMessage();
                        if (status.type === 'roll-button') return 'rgba(51, 136, 255, 0.2)';
                        if (status.type === 'pass-button') return 'rgba(255, 136, 0, 0.2)';
                        return 'transparent';
                    })(),
                    border: (() => {
                        const status = getStatusMessage();
                        if (status.type === 'roll-button') return '1px solid rgba(51, 136, 255, 0.5)';
                        if (status.type === 'pass-button') return '1px solid rgba(255, 136, 0, 0.5)';
                        return '1px solid transparent';
                    })(),
                    transition: 'all 0.2s ease'
                }}
                onClick={(e) => {
                    const status = getStatusMessage();
                    if (status.type === 'roll-button') {
                        // Trigger dice roll with animation if enabled
                        gameState.startDiceRoll();
                    } else if (status.type === 'pass-button') {
                        // Trigger pass turn
                        gameState.passTurn();
                    }
                    // Reset button styling after click
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseOver={(e) => {
                    const status = getStatusMessage();
                    if (status.type === 'roll-button' || status.type === 'pass-button') {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                    }
                }}
                onMouseOut={(e) => {
                    const status = getStatusMessage();
                    if (status.type === 'roll-button' || status.type === 'pass-button') {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = 'none';
                    }
                }}
            >
                {/* Thinking spinner */}
                {(() => {
                    const status = getStatusMessage();
                    if (status.type === 'thinking') {
                        return (
                            <div
                                style={{
                                    width: '16px',
                                    height: '16px',
                                    border: '2px solid transparent',
                                    borderTop: `2px solid ${titleColor}`,
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite',
                                    opacity: 0.7
                                }}
                            />
                        );
                    }
                    return null;
                })()}

                {/* Status message */}
                {getStatusMessage().message}

                {/* Button icons */}
                {(() => {
                    const status = getStatusMessage();
                    if (status.type === 'roll-button') {
                        return <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>🎲</span>;
                    } else if (status.type === 'pass-button') {
                        return <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>⏭️</span>;
                    }
                    return null;
                })()}
            </div>

            {/* Player Dice Roller */}
            {state.gameStarted && state.gamePhase === 'playing' && (
                <div style={{
                    marginTop: '12px',
                    display: 'flex',
                    justifyContent: 'center'
                }}>
                    <PlayerDiceRoller
                        player={player}
                        gameState={gameState}
                    />
                </div>
            )}
        </div>
    );
};

export default PlayerHome;
