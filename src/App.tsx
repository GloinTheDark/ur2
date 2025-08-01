import { useState, useEffect, useRef } from 'react'
import './App.css'
import { useGameState } from './useGameState'
import DiceRoller from './DiceRoller'
import type { DiceRollerRef } from './DiceRoller'
import GameSetup from './GameSetup'
import GameSettings from './GameSettings'
import PlayerHome from './PlayerHome'
import GameLayout from './GameLayout'
import { PlayerManager } from './PlayerManager'
import type { PlayerType } from './PlayerAgent'
import { BoardUtils, BOARD_COLUMNS, BOARD_ROWS, TOTAL_SQUARES } from './BoardLayout'
import { SQUARE_BACKGROUND_COLOR, PIECE_SIZE, HIGHLIGHT_CIRCLE_SIZE, SQUARE_SIZE, BOARD_GAP } from './UIConstants'
import rosetteSquare from './assets/RosetteSquare.svg'
import gateSquare from './assets/GateSquare.svg'
import marketSquare from './assets/MarketSquare.svg'
import templeSquare from './assets/TempleSquare.svg'
import houseSquare from './assets/HouseSquare.svg'
import treasurySquare from './assets/TreasurySquare.svg'
import goToSquare from './assets/GoTo.svg'
import pathOverlay from './assets/Path.svg'
import whiteBlank from './assets/WhiteBlank.svg'
import whiteSpots from './assets/WhiteSpots.svg'
import blackBlank from './assets/BlackBlank.svg'
import blackSpots from './assets/BlackSpots.svg'

function App() {
  // Load settings from localStorage or use defaults
  const loadSettings = () => {
    const saved = localStorage.getItem('royalGameSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure diceAnimations and pieceAnimations are included for backward compatibility
        return {
          piecesPerPlayer: 3,
          houseBonus: false,
          templeBlessings: false,
          gateKeeper: true,
          safeMarkets: true,
          diceAnimations: true,
          pieceAnimations: true,
          ...parsed
        };
      } catch {
        return { piecesPerPlayer: 3, houseBonus: false, templeBlessings: false, gateKeeper: true, safeMarkets: true, diceAnimations: true, pieceAnimations: true };
      }
    }
    return { piecesPerPlayer: 3, houseBonus: false, templeBlessings: false, gateKeeper: true, safeMarkets: true, diceAnimations: true, pieceAnimations: true };
  };

  const initialSettings = loadSettings();
  const gameState = useGameState(initialSettings);
  const state = gameState.state;
  const settings = gameState.gameSettings;

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPath, setShowPath] = useState<boolean>(false);
  const [playerManager, setPlayerManager] = useState<PlayerManager | null>(null);
  const [showGameSetup, setShowGameSetup] = useState<boolean>(false);
  const diceRollerRef = useRef<DiceRollerRef>(null);

  const winner = gameState.checkWinCondition();

  // Handle game setup completion
  const handleGameSetup = async (whitePlayer: PlayerType, blackPlayer: PlayerType, difficulty: 'easy' | 'medium' | 'hard') => {
    // Clean up any existing player manager
    if (playerManager) {
      playerManager.cleanup();
      setPlayerManager(null);
    }

    setShowGameSetup(false); // Close the setup modal

    // Start the game directly - no intermediate welcome screen
    gameState.startNewGame();    // Only create player manager if there are computer players
    if (whitePlayer === 'computer' || blackPlayer === 'computer') {
      // Create new player manager with selected configuration
      const newPlayerManager = new PlayerManager(gameState, {
        white: whitePlayer,
        black: blackPlayer,
        computerDifficulty: difficulty
      }, diceRollerRef);

      setPlayerManager(newPlayerManager);
      await newPlayerManager.start();
    }
  };  // Cleanup player manager on unmount
  useEffect(() => {
    return () => {
      if (playerManager) {
        playerManager.cleanup();
      }
    };
  }, [playerManager]);

  // Save settings to localStorage
  const saveSettings = (newSettings: any) => {
    const updatedSettings = { ...settings, ...newSettings };
    localStorage.setItem('royalGameSettings', JSON.stringify(updatedSettings));
    gameState.updateSettings(newSettings);
  };

  const handlePieceClick = (pieceIndex: number) => {
    gameState.selectPiece(pieceIndex);
  };

  // Handle clicking on destination square to move piece
  const handleDestinationClick = (pieceIndex: number) => {
    gameState.movePiece(pieceIndex);
  };

  return (
    <div className="app" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px 0',
      boxSizing: 'border-box'
    }}>
      {!state.gameStarted && !showGameSetup && (
        <div style={{
          marginTop: '50px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '20px',
            color: 'var(--title-color, #333)',
            filter: 'var(--dark-mode-filter, none)'
          }}>
            Royal Game of Ur
          </h1>
          <p style={{
            fontSize: '1.2rem',
            marginBottom: '40px',
            color: '#666',
            maxWidth: '600px',
            margin: '0 auto 40px auto'
          }}>
            Experience the ancient Mesopotamian board game that predates chess by over 1,500 years!
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowGameSetup(true)}
              style={{
                padding: '16px 32px',
                fontSize: '1.3rem',
                fontWeight: 'bold',
                borderRadius: 8,
                cursor: 'pointer',
                backgroundColor: '#646cff',
                color: '#fff',
                border: 'none',
                boxShadow: '0 4px 12px rgba(100, 108, 255, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#5a67ff';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#646cff';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Start Game
            </button>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: '16px 32px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                borderRadius: 8,
                cursor: 'pointer',
                backgroundColor: '#f0f0f0',
                color: '#333',
                border: '2px solid #ddd',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e0e0e0';
                e.currentTarget.style.borderColor = '#bbb';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.borderColor = '#ddd';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Game Settings
            </button>
          </div>
        </div>
      )}

      {showGameSetup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '2px solid var(--border-color, #ddd)',
            padding: '0',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <button
              onClick={() => setShowGameSetup(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#999',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f0f0';
                e.currentTarget.style.color = '#333';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#999';
              }}
            >
              ×
            </button>
            <GameSetup onStartGame={handleGameSetup} />
          </div>
        </div>
      )}

      {/* Settings Modal */}
      <GameSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={saveSettings}
      />

      {winner && (
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: winner === 'white' ? '#f0f8ff' : '#2a2a2a',
          color: winner === 'white' ? '#333' : '#fff',
          borderRadius: '8px',
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          border: `3px solid ${winner === 'white' ? '#4CAF50' : '#FF9800'}`
        }}>
          🎉 {winner.charAt(0).toUpperCase() + winner.slice(1)} Player Wins! 🎉
          <div style={{ fontSize: '1rem', marginTop: '8px', fontWeight: 'normal' }}>
            All pieces have completed the path and returned home!
          </div>
          <button
            onClick={() => gameState.resetGame()}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              fontSize: '1rem',
              borderRadius: 6,
              cursor: 'pointer',
              backgroundColor: '#646cff',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold'
            }}
          >
            Start New Game
          </button>
        </div>
      )}

      {/* Game Layout with Animation Support */}
      <GameLayout
        gameState={gameState}
        whitePlayerHome={
          <PlayerHome
            player="white"
            state={state}
            settings={settings}
            winner={winner}
            getDestinationSquare={() => gameState.getDestinationSquare()}
            onPieceClick={handlePieceClick}
            onDestinationClick={handleDestinationClick}
          />
        }
        blackPlayerHome={
          <PlayerHome
            player="black"
            state={state}
            settings={settings}
            winner={winner}
            getDestinationSquare={() => gameState.getDestinationSquare()}
            onPieceClick={handlePieceClick}
            onDestinationClick={handleDestinationClick}
          />
        }
      >
        {/* Main Game Board */}
        <div style={{ position: 'relative' }}>
          <div className="gameboard" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${BOARD_COLUMNS}, ${SQUARE_SIZE}px)`,
            gridTemplateRows: `repeat(${BOARD_ROWS}, ${SQUARE_SIZE}px)`,
            gap: `${BOARD_GAP}px`,
            justifyContent: 'center'
          }}>
            {Array.from({ length: TOTAL_SQUARES }).map((_, idx) => {
              const squareNumber = idx + 1;
              const isRosetteSquare = BoardUtils.isRosetteSquare(squareNumber);
              const isGateSquare = BoardUtils.isGateSquare(squareNumber);
              const isMarketSquare = BoardUtils.isMarketSquare(squareNumber);
              const isTempleSquare = BoardUtils.isTempleSquare(squareNumber);
              const isHouseSquare = BoardUtils.isHouseSquare(squareNumber);
              const isTreasurySquare = BoardUtils.isTreasurySquare(squareNumber);
              const isBlackedOut = BoardUtils.isBlackedOutSquare(squareNumber);

              // Check if this square is the destination for the selected piece
              const destinationSquare = gameState.getDestinationSquare();
              const isDestinationSquare = destinationSquare === squareNumber;

              // Check if any pieces are on this square (excluding moving pieces)
              const whitePiecesOnSquare = state.whitePiecePositions.map((pos, index) =>
                pos === squareNumber ? index : null
              ).filter(p => p !== null);
              const blackPiecesOnSquare = state.blackPiecePositions.map((pos, index) =>
                pos === squareNumber ? index : null
              ).filter(p => p !== null);

              // Check if any piece on this square is eligible to move (only during active gameplay and not during animation)
              const hasEligiblePiece = state.gameStarted && !winner && !gameState.isAnimating() && (state.currentPlayer === 'white' ? whitePiecesOnSquare : blackPiecesOnSquare).some(pieceIndex =>
                state.eligiblePieces.includes(pieceIndex as number)
              );

              // Check if any piece on this square is selected
              const hasSelectedPiece = state.selectedPiece !== null &&
                (state.currentPlayer === 'white' ? whitePiecesOnSquare : blackPiecesOnSquare).some(pieceIndex =>
                  state.selectedPiece!.player === state.currentPlayer && state.selectedPiece!.index === pieceIndex
                );

              return (
                <div
                  key={idx}
                  style={{
                    width: SQUARE_SIZE,
                    height: SQUARE_SIZE,
                    background: isBlackedOut ? 'transparent' : SQUARE_BACKGROUND_COLOR,
                    border: isBlackedOut ? 'none' : '3px solid #33f',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 500,
                    borderRadius: 1,
                    gap: '0px',
                    position: 'relative',
                  }}
                >
                  {isRosetteSquare && (
                    <img
                      src={rosetteSquare}
                      alt="Rosette Square"
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: 4
                      }}
                    />
                  )}
                  {isGateSquare && (
                    <img
                      src={gateSquare}
                      alt="Gate Square"
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: 4
                      }}
                    />
                  )}
                  {isMarketSquare && (
                    <img
                      src={marketSquare}
                      alt="Market Square"
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: 4
                      }}
                    />
                  )}
                  {isTempleSquare && (
                    <img
                      src={templeSquare}
                      alt="Temple Square"
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: 4
                      }}
                    />
                  )}
                  {isHouseSquare && (
                    <img
                      src={houseSquare}
                      alt="House Square"
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: 4
                      }}
                    />
                  )}
                  {isTreasurySquare && (
                    <img
                      src={treasurySquare}
                      alt="Treasury Square"
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        borderRadius: 4
                      }}
                    />
                  )}
                  {isDestinationSquare && (
                    <img
                      src={goToSquare}
                      alt="Go To Square"
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
                        if (state.selectedPiece) {
                          handleDestinationClick(state.selectedPiece.index);
                        }
                      }}
                    />
                  )}

                  {/* Display pieces on this square */}
                  {(whitePiecesOnSquare.length > 0 || blackPiecesOnSquare.length > 0) && (
                    <>
                      {/* Green highlight circle for eligible pieces (only during active gameplay and if no piece is selected) */}
                      {hasEligiblePiece && !hasSelectedPiece && (
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
                      {whitePiecesOnSquare.map((pieceIndex) => {
                        const isEligible = state.gameStarted && !winner && state.currentPlayer === 'white' && !gameState.isAnimating() && state.eligiblePieces.includes(pieceIndex as number);
                        const isSelected = state.selectedPiece !== null && state.selectedPiece.player === 'white' && state.selectedPiece.index === pieceIndex;
                        return (
                          <div
                            key={`white-${pieceIndex}`}
                            style={{
                              position: 'relative',
                              cursor: isEligible ? 'pointer' : 'default'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEligible) {
                                handlePieceClick(pieceIndex as number);
                              }
                            }}
                          >
                            {isSelected && (
                              <div
                                className="selected-circle"
                                style={{
                                  position: 'absolute',
                                  width: `${HIGHLIGHT_CIRCLE_SIZE}px`,
                                  height: `${HIGHLIGHT_CIRCLE_SIZE}px`,
                                  borderRadius: '50%',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 1
                                }}
                              />
                            )}
                            <img
                              src={state.whitePieces[pieceIndex as number] === 'blank' ? whiteBlank : whiteSpots}
                              alt={`White piece ${(pieceIndex as number) + 1}`}
                              style={{
                                width: `${PIECE_SIZE}px`,
                                height: `${PIECE_SIZE}px`,
                                borderRadius: 4,
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 2
                              }}
                            />
                          </div>
                        );
                      })}
                      {blackPiecesOnSquare.map((pieceIndex) => {
                        const isEligible = state.gameStarted && !winner && state.currentPlayer === 'black' && !gameState.isAnimating() && state.eligiblePieces.includes(pieceIndex as number);
                        const isSelected = state.selectedPiece !== null && state.selectedPiece.player === 'black' && state.selectedPiece.index === pieceIndex;
                        return (
                          <div
                            key={`black-${pieceIndex}`}
                            style={{
                              position: 'relative',
                              cursor: isEligible ? 'pointer' : 'default'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isEligible) {
                                handlePieceClick(pieceIndex as number);
                              }
                            }}
                          >
                            {isSelected && (
                              <div
                                className="selected-circle"
                                style={{
                                  position: 'absolute',
                                  width: `${HIGHLIGHT_CIRCLE_SIZE}px`,
                                  height: `${HIGHLIGHT_CIRCLE_SIZE}px`,
                                  borderRadius: '50%',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 1
                                }}
                              />
                            )}
                            <img
                              src={state.blackPieces[pieceIndex as number] === 'blank' ? blackBlank : blackSpots}
                              alt={`Black piece ${(pieceIndex as number) + 1}`}
                              style={{
                                width: `${PIECE_SIZE}px`,
                                height: `${PIECE_SIZE}px`,
                                borderRadius: 4,
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                zIndex: 2
                              }}
                            />
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Path Overlay */}
          {showPath && (
            <img
              src={pathOverlay}
              alt="Path Overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 5,
                opacity: 0.7,
                transform: state.currentPlayer === 'black' ? 'scaleY(-1)' : 'none'
              }}
            />
          )}
        </div>
      </GameLayout>

      {state.gameStarted && !winner && (
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {settings.houseBonus && (
            <div style={{
              marginBottom: '16px',
              padding: '8px 16px',
              backgroundColor: 'var(--info-box-bg, #f0f8ff)',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              <strong>House Control:</strong>{' '}
              {(() => {
                const { whiteHouses, blackHouses } = gameState.calculateHouseControl();
                if (whiteHouses > blackHouses) {
                  return `White leads (${whiteHouses} vs ${blackHouses})`;
                } else if (blackHouses > whiteHouses) {
                  return `Black leads (${blackHouses} vs ${whiteHouses})`;
                } else {
                  return `Tied (${whiteHouses} each)`;
                }
              })()}
            </div>
          )}
          {settings.templeBlessings && (
            <div style={{
              marginBottom: '16px',
              padding: '8px 16px',
              backgroundColor: 'var(--temple-box-bg, #f5f0ff)',
              borderRadius: '8px',
              border: '1px solid #ccc',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              <strong>Temple Control:</strong>{' '}
              {(() => {
                const { whiteTemples, blackTemples } = gameState.calculateTempleControl();
                if (whiteTemples > blackTemples) {
                  return `White leads (${whiteTemples} vs ${blackTemples})`;
                } else if (blackTemples > whiteTemples) {
                  return `Black leads (${blackTemples} vs ${whiteTemples})`;
                } else {
                  return `Tied (${whiteTemples} each)`;
                }
              })()}
            </div>
          )}

          {/* Player Type Indicator */}
          {playerManager && (
            <div style={{
              marginBottom: '12px',
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              borderRadius: '6px',
              fontSize: '0.9rem',
              color: '#666',
              textAlign: 'center'
            }}>
              {playerManager ? playerManager.getGameModeDescription() : 'Human vs Human'}
              {playerManager && playerManager.isCurrentPlayerComputer() && (
                <span style={{ color: '#646cff', fontWeight: 'bold', marginLeft: '8px' }}>
                  (Computer thinking...)
                </span>
              )}
            </div>
          )}          <DiceRoller ref={diceRollerRef} gameState={gameState} />

          {/* Toggle Path Button */}
          <button
            onClick={() => setShowPath(!showPath)}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              fontSize: '1rem',
              borderRadius: 6,
              cursor: 'pointer',
              backgroundColor: showPath ? '#4CAF50' : '#646cff',
              color: '#fff',
              border: 'none',
              fontWeight: 'bold',
              userSelect: 'none'
            }}
          >
            {showPath ? 'Hide Path' : 'Show Path'}
          </button>
        </div>
      )}
    </div>
  )
}

export default App
