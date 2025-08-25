import React from 'react';
import type { GameState } from './GameState';
import { BurglersOfUrRuleSet } from './rulesets/BurglersOfUrRuleSet';
import { HOME_SQUARE_SIZE, PIECE_SIZE, STACK_OFFSET } from './UIConstants';
import templeSquare from './assets/TempleSquare.svg';
import houseSquare from './assets/HouseSquare.svg';
import redX from './assets/RedX.svg';
import PlayerDiceRoller from './PlayerDiceRoller';
import PieceStack from './components/PieceStack';

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
    const ruleset = gameState.getCurrentRuleSet();

    const isWhite = player === 'white';
    const positions = isWhite ? state.whitePiecePositions : state.blackPiecePositions;

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
        gameState.getDestinationSquares().includes(25);

    // Build starting pieces stack data
    const startingStackPieces = Array.from({ length: blankPiecesInHome }, (_, index) => {
        const isTopPiece = index === blankPiecesInHome - 1; // Only top piece is interactable
        const isEligible = isTopPiece &&
            eligibleBlankPieces.length > 0 &&
            state.gameStarted && !winner &&
            state.currentPlayer === player &&
            !(state.isPieceAnimating || state.isCapturedPieceAnimating);

        const isSelected = isTopPiece && !!(selectedPiece !== null &&
            state.currentPlayer === player &&
            positions[selectedPiece] === 0);

        // Determine piece type based on flipIndex
        const shouldShowSpots = gameState.shouldPieceShowSpots(0);

        return {
            type: shouldShowSpots ? 'spots' as const : 'blank' as const,
            isEligible,
            isSelected,
            onClick: isEligible ? () => {
                const firstEligible = eligibleBlankPieces[0];
                if (firstEligible !== undefined) {
                    gameState.selectPiece(firstEligible);
                }
            } : undefined
        };
    });

    // Build finished pieces stack data
    const finishedStackPieces = Array.from({ length: completedCount }, () => ({
        type: 'spots' as const
    }));

    // Check if finished stack can be a destination
    const canCompleteToFinishedStack = canCompleteToHome; // BOARD_FINISH means completion

    const titleColor = isWhite ?
        'var(--text-color, #666)' :
        'var(--text-color, #333)';

    // Get control status for Burglers ruleset
    const isBurglers = gameState.getCurrentRuleSet() instanceof BurglersOfUrRuleSet;
    const templeControl = isBurglers ? gameState.getTempleBlessings(player) : null;
    const houseControl = isBurglers ? gameState.calculateHouseControl() : null;

    const hasTempleControl = templeControl?.hasControl || false;
    const hasHouseControl = houseControl ?
        (player === 'white' ? houseControl.whiteHouses > houseControl.blackHouses :
            houseControl.blackHouses > houseControl.whiteHouses) : false;

    // Get status message and UI behavior for this player
    const getStatusMessage = (): { message: string, type: 'static' | 'roll-button' | 'pass-button' | 'thinking' | 'select-or-pass' } => {
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
            } else if (gameState.playerMayPass() && !isAI) {
                // Player has optional moves and can choose to pass
                return {
                    message: 'Select piece to move or Pass Turn',
                    type: 'select-or-pass'
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
            </h3>
            <div style={{
                display: 'flex',
                alignItems: 'flex-end', // Align stacks at bottom
                justifyContent: 'center',
                gap: '24px' // Space between the two stacks
            }}>
                {/* Starting Pieces Stack */}
                <PieceStack
                    pieces={startingStackPieces}
                    player={player}
                    label="Start"
                    fixedCapacity={ruleset.piecesPerPlayer}
                />

                {/* Finished Pieces Stack */}
                <div style={{ position: 'relative' }}>
                    <PieceStack
                        pieces={finishedStackPieces}
                        player={player}
                        label={ruleset.getPiecesToWin() < ruleset.piecesPerPlayer
                            ? `Finish ${completedCount}/${ruleset.getPiecesToWin()}`
                            : "Finish"
                        }
                        fixedCapacity={ruleset.getPiecesToWin()}
                    />

                    {/* Completion destination indicator */}
                    {canCompleteToFinishedStack && (
                        <div
                            style={{
                                position: 'absolute',
                                bottom: `${completedCount * STACK_OFFSET + (HOME_SQUARE_SIZE - PIECE_SIZE / 2) + 3}px`, // Position at piece level in stack
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: HOME_SQUARE_SIZE,
                                height: HOME_SQUARE_SIZE,
                                cursor: 'pointer',
                                zIndex: 10
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
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
                            }}
                        >
                            {(() => {
                                // Find the move for this destination to check if it's a capture
                                const legalMoves = gameState.getLegalMoves();
                                const moveToMake = legalMoves.find(move =>
                                    move.movingPieceIndex === selectedPiece &&
                                    move.destinationSquare === 25
                                );
                                const isCapture = moveToMake?.capture || false;

                                return (
                                    <div
                                        style={{
                                            width: `${PIECE_SIZE}px`,
                                            height: `${PIECE_SIZE}px`,
                                            margin: 'auto',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            ...(isCapture ? {
                                                // Red X for captures - no specific styling needed for image
                                            } : {
                                                // Green circle for normal moves
                                                borderRadius: '50%',
                                                backgroundColor: 'rgba(100, 255, 100, 0.7)',
                                                border: '2px solid rgba(50, 200, 50, 0.9)'
                                            })
                                        }}
                                    >
                                        {isCapture && (
                                            <img
                                                src={redX}
                                                alt="Capture Move"
                                                style={{
                                                    width: `${PIECE_SIZE}px`,
                                                    height: `${PIECE_SIZE}px`,
                                                    opacity: 0.7
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
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
                        return (status.type === 'roll-button' || status.type === 'pass-button' || status.type === 'select-or-pass') ? 'pointer' : 'default';
                    })(),
                    borderRadius: '4px',
                    backgroundColor: (() => {
                        const status = getStatusMessage();
                        if (status.type === 'roll-button') return 'rgba(51, 136, 255, 0.2)';
                        if (status.type === 'pass-button') return 'rgba(255, 136, 0, 0.2)';
                        if (status.type === 'select-or-pass') return 'rgba(102, 204, 102, 0.2)';
                        return 'transparent';
                    })(),
                    border: (() => {
                        const status = getStatusMessage();
                        if (status.type === 'roll-button') return '1px solid rgba(51, 136, 255, 0.5)';
                        if (status.type === 'pass-button') return '1px solid rgba(255, 136, 0, 0.5)';
                        if (status.type === 'select-or-pass') return '1px solid rgba(102, 204, 102, 0.5)';
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
                    if (status.type === 'roll-button' || status.type === 'pass-button' || status.type === 'select-or-pass') {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.2)';
                    }
                }}
                onMouseOut={(e) => {
                    const status = getStatusMessage();
                    if (status.type === 'roll-button' || status.type === 'pass-button' || status.type === 'select-or-pass') {
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
                {(() => {
                    const status = getStatusMessage();
                    if (status.type === 'select-or-pass') {
                        return (
                            <span>
                                Select piece to move or{' '}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        gameState.passTurn();
                                    }}
                                    style={{
                                        background: 'rgba(255, 136, 0, 0.8)',
                                        border: '1px solid rgba(255, 136, 0, 1)',
                                        borderRadius: '4px',
                                        color: 'white',
                                        padding: '2px 6px',
                                        fontSize: '0.8rem',
                                        cursor: 'pointer',
                                        fontWeight: '500'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 136, 0, 1)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 136, 0, 0.8)';
                                    }}
                                >
                                    Pass Turn
                                </button>
                            </span>
                        );
                    } else {
                        return status.message;
                    }
                })()}

                {/* Button icons */}
                {(() => {
                    const status = getStatusMessage();
                    if (status.type === 'roll-button') {
                        return <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>🎲</span>;
                    } else if (status.type === 'pass-button') {
                        return <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>⏭️</span>;
                    } else if (status.type === 'select-or-pass') {
                        return <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>🎯</span>;
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
