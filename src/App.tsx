import { useState, useEffect } from 'react'
import './App.css'
import { useGameState } from './useGameState'
import DiceRoller from './DiceRoller'
import GameSetup from './GameSetup'
import GameSettings from './GameSettings'
import { PlayerManager } from './PlayerManager'
import type { PlayerType } from './PlayerAgent'
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
  // Game configuration constants
  const SQUARE_BACKGROUND_COLOR = '#f8e8caff'; // Light tan color
  const PIECE_SIZE = 32; // Size in pixels for game pieces

  // Load settings from localStorage or use defaults
  const loadSettings = () => {
    const saved = localStorage.getItem('royalGameSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { piecesPerPlayer: 3, houseBonus: false, templeBlessings: false, gateKeeper: true, safeMarkets: true };
      }
    }
    return { piecesPerPlayer: 3, houseBonus: false, templeBlessings: false, gateKeeper: true, safeMarkets: true };
  };

  const initialSettings = loadSettings();
  const gameState = useGameState(initialSettings);
  const state = gameState.state;
  const settings = gameState.gameSettings;

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPath, setShowPath] = useState<boolean>(false);
  const [playerManager, setPlayerManager] = useState<PlayerManager | null>(null);
  const [showGameSetup, setShowGameSetup] = useState<boolean>(false);

  // Highlight circle size for eligible pieces
  const HIGHLIGHT_CIRCLE_SIZE = '39px';

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
      });

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

      {/* White Player's Home */}
      <div style={{ marginTop: '24px' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 8px 0', color: 'var(--text-color, #666)', filter: 'var(--dark-mode-filter, none)' }}>
          White's Home
          <span style={{ fontSize: '0.8rem', fontWeight: 'normal', marginLeft: '8px' }}>
            (Completed: {state.whitePieces.filter((piece, idx) => piece === 'spots' && state.whitePiecePositions[idx] === 'start').length}/{settings.piecesPerPlayer})
          </span>
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${settings.piecesPerPlayer}, 40px)`,
          gridTemplateRows: 'repeat(1, 40px)',
          gap: '4px',
          justifyContent: 'center',
          padding: '8px',
          backgroundColor: '#f8f8f8ff',
          borderRadius: '8px',
          border: '2px solid #ccc',
          width: 'fit-content',
          margin: '0 auto'
        }}>
          {Array.from({ length: settings.piecesPerPlayer }).map((_, idx) => {
            const isPieceInStart = state.whitePiecePositions[idx] === 'start';
            const isEligible = state.gameStarted && !winner && state.currentPlayer === 'white' && state.eligiblePieces.includes(idx);
            const isSelected = state.selectedPiece !== null && state.selectedPiece.player === 'white' && state.selectedPiece.index === idx && isPieceInStart;

            // Check if this home slot is the destination for a piece completing the path
            const destinationSquare = gameState.getDestinationSquare();
            const isDestinationHome = destinationSquare === 'complete' && state.selectedPiece?.player === 'white' &&
              state.selectedPiece?.index === idx && !isPieceInStart;

            return (
              <div
                key={`white-${idx}`}
                style={{
                  width: 40,
                  height: 40,
                  background: SQUARE_BACKGROUND_COLOR,
                  border: '1px solid #999',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 500,
                  borderRadius: 4,
                  position: 'relative',
                  cursor: isPieceInStart && isEligible ? 'pointer' : 'default'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPieceInStart && isEligible) {
                    handlePieceClick(idx);
                  }
                }}
              >
                {/* Selected piece circle takes priority over eligible highlight */}
                {isPieceInStart && isSelected && (
                  <div
                    className="selected-circle"
                    style={{
                      position: 'absolute',
                      width: HIGHLIGHT_CIRCLE_SIZE,
                      height: HIGHLIGHT_CIRCLE_SIZE,
                      borderRadius: '50%',
                      zIndex: 1
                    }}
                  />
                )}
                {/* Green highlight circle for eligible pieces (only if not selected) */}
                {isPieceInStart && isEligible && !isSelected && (
                  <div
                    className="highlight-circle"
                    style={{
                      position: 'absolute',
                      width: HIGHLIGHT_CIRCLE_SIZE,
                      height: HIGHLIGHT_CIRCLE_SIZE,
                      borderRadius: '50%',
                      zIndex: 1
                    }}
                  />
                )}
                {isPieceInStart && (
                  <img
                    src={state.whitePieces[idx] === 'blank' ? whiteBlank : whiteSpots}
                    alt={`White piece ${idx + 1} - ${state.whitePieces[idx]}`}
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
                      handleDestinationClick(idx);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Game Board */}
      <div style={{ position: 'relative', marginTop: '16px' }}>
        <div className="gameboard" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 40px)',
          gridTemplateRows: 'repeat(3, 40px)',
          gap: '4px',
          justifyContent: 'center'
        }}>
          {Array.from({ length: 24 }).map((_, idx) => {
            const squareNumber = idx + 1;
            const isRosetteSquare = [1, 7, 12, 17, 23].includes(squareNumber);
            const isGateSquare = squareNumber === 9;
            const isMarketSquare = [11, 14].includes(squareNumber);
            const isTempleSquare = [2, 4, 15, 18, 20].includes(squareNumber);
            const isHouseSquare = [3, 10, 13, 16, 19].includes(squareNumber);
            const isTreasurySquare = [8, 24].includes(squareNumber);
            const isBlackedOut = [5, 6, 21, 22].includes(squareNumber);

            // Check if this square is the destination for the selected piece
            const destinationSquare = gameState.getDestinationSquare();
            const isDestinationSquare = destinationSquare === squareNumber;

            // Check if any pieces are on this square
            const whitePiecesOnSquare = state.whitePiecePositions.map((pos, index) => pos === squareNumber ? index : null).filter(p => p !== null);
            const blackPiecesOnSquare = state.blackPiecePositions.map((pos, index) => pos === squareNumber ? index : null).filter(p => p !== null);

            // Check if any piece on this square is eligible to move (only during active gameplay)
            const hasEligiblePiece = state.gameStarted && !winner && (state.currentPlayer === 'white' ? whitePiecesOnSquare : blackPiecesOnSquare).some(pieceIndex =>
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
                  width: 40,
                  height: 40,
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
                          width: HIGHLIGHT_CIRCLE_SIZE,
                          height: HIGHLIGHT_CIRCLE_SIZE,
                          borderRadius: '50%',
                          zIndex: 1
                        }}
                      />
                    )}
                    {whitePiecesOnSquare.map((pieceIndex) => {
                      const isEligible = state.gameStarted && !winner && state.currentPlayer === 'white' && state.eligiblePieces.includes(pieceIndex as number);
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
                                width: HIGHLIGHT_CIRCLE_SIZE,
                                height: HIGHLIGHT_CIRCLE_SIZE,
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
                      const isEligible = state.gameStarted && !winner && state.currentPlayer === 'black' && state.eligiblePieces.includes(pieceIndex as number);
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
                                width: HIGHLIGHT_CIRCLE_SIZE,
                                height: HIGHLIGHT_CIRCLE_SIZE,
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
              zIndex: 10,
              transform: state.currentPlayer === 'black' ? 'scaleY(-1)' : 'none'
            }}
          />
        )}
      </div>

      {/* Black Player's Home */}
      <div style={{ marginTop: '16px' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 8px 0', color: 'var(--text-color, #333)', filter: 'var(--dark-mode-filter, none)' }}>
          Black's Home
          <span style={{ fontSize: '0.8rem', fontWeight: 'normal', marginLeft: '8px' }}>
            (Completed: {state.blackPieces.filter((piece, idx) => piece === 'spots' && state.blackPiecePositions[idx] === 'start').length}/{settings.piecesPerPlayer})
          </span>
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${settings.piecesPerPlayer}, 40px)`,
          gridTemplateRows: 'repeat(1, 40px)',
          gap: '4px',
          justifyContent: 'center',
          padding: '8px',
          backgroundColor: '#2a2a2a',
          borderRadius: '8px',
          border: '2px solid #555',
          width: 'fit-content',
          margin: '0 auto'
        }}>
          {Array.from({ length: settings.piecesPerPlayer }).map((_, idx) => {
            const isPieceInStart = state.blackPiecePositions[idx] === 'start';
            const isEligible = state.gameStarted && !winner && state.currentPlayer === 'black' && state.eligiblePieces.includes(idx);
            const isSelected = state.selectedPiece !== null && state.selectedPiece.player === 'black' && state.selectedPiece.index === idx && isPieceInStart;

            // Check if this home slot is the destination for a piece completing the path
            const destinationSquare = gameState.getDestinationSquare();
            const isDestinationHome = destinationSquare === 'complete' && state.selectedPiece?.player === 'black' &&
              state.selectedPiece?.index === idx && !isPieceInStart;

            return (
              <div
                key={`black-${idx}`}
                style={{
                  width: 40,
                  height: 40,
                  background: SQUARE_BACKGROUND_COLOR,
                  border: '1px solid #999',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 500,
                  borderRadius: 4,
                  position: 'relative',
                  cursor: isPieceInStart && isEligible ? 'pointer' : 'default'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isPieceInStart && isEligible) {
                    handlePieceClick(idx);
                  }
                }}
              >
                {/* Selected piece circle takes priority over eligible highlight */}
                {isPieceInStart && isSelected && (
                  <div
                    className="selected-circle"
                    style={{
                      position: 'absolute',
                      width: HIGHLIGHT_CIRCLE_SIZE,
                      height: HIGHLIGHT_CIRCLE_SIZE,
                      borderRadius: '50%',
                      zIndex: 1
                    }}
                  />
                )}
                {/* Green highlight circle for eligible pieces (only if not selected) */}
                {isPieceInStart && isEligible && !isSelected && (
                  <div
                    className="highlight-circle"
                    style={{
                      position: 'absolute',
                      width: HIGHLIGHT_CIRCLE_SIZE,
                      height: HIGHLIGHT_CIRCLE_SIZE,
                      borderRadius: '50%',
                      zIndex: 1
                    }}
                  />
                )}
                {isPieceInStart && (
                  <img
                    src={state.blackPieces[idx] === 'blank' ? blackBlank : blackSpots}
                    alt={`Black piece ${idx + 1} - ${state.blackPieces[idx]}`}
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
                      handleDestinationClick(idx);
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

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
          )}          <DiceRoller gameState={gameState} />

          {/* Show Path Button */}
          <button
            onMouseDown={() => setShowPath(true)}
            onMouseUp={() => setShowPath(false)}
            onMouseLeave={() => setShowPath(false)}
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
            Show Path
          </button>
        </div>
      )}
    </div>
  )
}

export default App
