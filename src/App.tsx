import { useState, useRef, useEffect } from 'react'
import './App.css'
import { useGameState } from './useGameState'
import DualDiceRoller from './DualDiceRoller'
import type { DualDiceRollerRef } from './DualDiceRoller'
import GameSetup from './GameSetup'
import GameSettings from './GameSettings'
import UserPreferences from './UserPreferences'
import ConfirmModal from './ConfirmModal'
import LoggingControl from './LoggingControl'
import type { UserPreferencesData } from './UserPreferences'
import PlayerHome from './PlayerHome'
import GameLayout from './GameLayout'
import type { PlayerType, AgentType } from './player-agents'
import type { GameSettings as GameSettingsType } from './GameState'
import { BoardUtils, BOARD_COLUMNS, BOARD_ROWS, TOTAL_SQUARES } from './BoardLayout'
import { getRuleSetByName } from './RuleSets'
import { getPath } from './GamePaths'
import { AppSettingsManager } from './AppSettings'
import { PIECE_SIZE, HIGHLIGHT_CIRCLE_SIZE, SQUARE_SIZE, BOARD_GAP, BOARD_SQUARE_BORDER } from './UIConstants'
import PieceHighlight from './components/PieceHighlight'
import { RulesWindow } from './components/rules/RulesWindow'
import { AuthProvider } from './contexts/AuthContext'
import AuthModal from './components/auth/AuthModal'
import UserProfile from './components/auth/UserProfile'
import AuthButton from './components/auth/AuthButton'
import rosetteSquare from './assets/RosetteSquare.svg'
import gateSquare from './assets/GateSquare.svg'
import marketSquare from './assets/MarketSquare.svg'
import templeSquare from './assets/TempleSquare.svg'
import houseSquare from './assets/HouseSquare.svg'
import treasurySquare from './assets/TreasurySquare.svg'
import redX from './assets/RedX.svg'
import whiteBlank from './assets/WhiteBlank.svg'
import whiteSpots from './assets/WhiteSpots.svg'
import blackBlank from './assets/BlackBlank.svg'
import blackSpots from './assets/BlackSpots.svg'

function App() {
  const gameState = useGameState();
  const state = gameState.state;
  const settings = gameState.gameSettings;

  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showPath, setShowPath] = useState<boolean>(false);
  const [showGameSetup, setShowGameSetup] = useState<boolean>(false);
  const [showPreferences, setShowPreferences] = useState<boolean>(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState<boolean>(false);
  const [showLoggingControl, setShowLoggingControl] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showUserProfile, setShowUserProfile] = useState<boolean>(false);
  const dualDiceRollerRef = useRef<DualDiceRollerRef>(null);

  // Debug mode - use centralized AppSettings
  const [isDebugMode] = useState(() => {
    return AppSettingsManager.getInstance().isDebugMode();
  });

  const [isPaused, setIsPaused] = useState(false);

  // Update gameState with debug pause state
  useEffect(() => {
    if (isDebugMode) {
      gameState.setDebugPaused(isPaused);
    }
  }, [isDebugMode, isPaused, gameState]);

  const winner = gameState.checkWinCondition();

  // Handle game setup completion
  const handleGameSetup = async (whitePlayer: PlayerType, blackPlayer: PlayerType, whiteAgentType: AgentType | null, blackAgentType: AgentType | null) => {
    setShowGameSetup(false); // Close the setup modal

    // Start the game directly - no intermediate welcome screen
    gameState.startNewGame();

    // Setup players in GameState
    gameState.setupPlayers({
      white: whitePlayer,
      black: blackPlayer,
      whiteAgentType: whiteAgentType || undefined,
      blackAgentType: blackAgentType || undefined
    });
  };

  // Save settings to localStorage
  const saveSettings = (newSettings: Partial<GameSettingsType>) => {
    gameState.updateAndSaveSettings(newSettings);
  };

  // Handle preferences changes
  const savePreferences = (newPreferences: Partial<UserPreferencesData>) => {
    // Convert preferences to settings format for GameState
    const settingsUpdate: Partial<GameSettingsType> = {};
    if (newPreferences.diceAnimations !== undefined) {
      settingsUpdate.diceAnimations = newPreferences.diceAnimations;
    }
    if (newPreferences.pieceAnimations !== undefined) {
      settingsUpdate.pieceAnimations = newPreferences.pieceAnimations;
    }
    if (newPreferences.boardOrientation !== undefined) {
      settingsUpdate.boardOrientation = newPreferences.boardOrientation;
    }
    gameState.updateAndSaveSettings(settingsUpdate);
  };

  // Board orientation transform and container sizing functions
  const getBoardTransform = (orientation: 0 | 1 | 2 | 3): string => {
    const rotations = {
      0: 'rotate(0deg)',
      1: 'rotate(90deg)',
      2: 'rotate(180deg)',
      3: 'rotate(270deg)'
    };
    return rotations[orientation];
  };

  const getBoardContainerSize = (orientation: 0 | 1 | 2 | 3) => {
    // Calculate board dimensions including gaps
    const boardWidth = BOARD_COLUMNS * SQUARE_SIZE + (BOARD_COLUMNS - 1) * BOARD_GAP;
    const boardHeight = BOARD_ROWS * SQUARE_SIZE + (BOARD_ROWS - 1) * BOARD_GAP;

    // For 90° and 270° rotations, swap width and height
    if (orientation === 1 || orientation === 3) {
      return {
        width: boardHeight,
        height: boardWidth
      };
    }

    return {
      width: boardWidth,
      height: boardHeight
    };
  };

  // Calculate stacking offset and direction based on board orientation
  const getStackingOffset = (stackIndex: number, orientation: 0 | 1 | 2 | 3) => {
    const baseOffset = stackIndex * 5;

    switch (orientation) {
      case 0: // 0° - stack upward (negative Y)
        return { top: `calc(50% - ${baseOffset}px)`, left: '50%' };
      case 1: // 90° CW - stack leftward (negative X)
        return { top: '50%', left: `calc(50% - ${baseOffset}px)` };
      case 2: // 180° - stack downward (positive Y)
        return { top: `calc(50% + ${baseOffset}px)`, left: '50%' };
      case 3: // 270° CW - stack rightward (positive X)
        return { top: '50%', left: `calc(50% + ${baseOffset}px)` };
    }
  };

  return (
    <AuthProvider>
      <div className="app" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px 0',
        boxSizing: 'border-box'
      }}>
        {/* Upper Right Controls */}
        {(state.gameStarted || !showGameSetup) && (
          <div style={{
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Show Path Button - only during game */}
            {state.gameStarted && (
              <button
                onClick={() => setShowPath(!showPath)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: showPath ? '#4CAF50' : '#646cff',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                }}
              >
                {showPath ? '👁️ Hide Path' : '👁️ Show Path'}
              </button>
            )}

            {/* Change Ruleset Button - only before game starts */}
            {!state.gameStarted && (
              <button
                onClick={() => setShowSettings(true)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: '#ff8800',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                }}
              >
                📚 Change Ruleset
              </button>
            )}

            {/* Preferences Button - always available */}
            <button
              onClick={() => setShowPreferences(true)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#9966ff',
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
              }}
            >
              ⚙️ Preferences
            </button>

            {/* Rules Button - always available */}
            <button
              onClick={() => setShowRules(true)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#4CAF50',
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
              }}
            >
              📖 Rules
            </button>

            {/* Authentication Button - always available */}
            <AuthButton
              onShowLogin={() => setShowAuthModal(true)}
              onShowProfile={() => setShowUserProfile(true)}
            />

            {/* Quit Game Button - only during game */}
            {state.gameStarted && (
              <button
                onClick={() => setShowQuitConfirm(true)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: '#ff4444',
                  color: '#fff',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                }}
              >
                🚪 Quit Game
              </button>
            )}
          </div>
        )}

        {/* Debug Mode Panel - Always show when debug mode is enabled */}
        {isDebugMode && (
          <div style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            zIndex: 1000,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Debug Logging Control Button - Always available in debug mode, positioned first */}
            <button
              onClick={() => setShowLoggingControl(true)}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#ff9500',
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
              }}
            >
              🐛 Logging
            </button>
            {/* Game-specific debug buttons - only show when game is started */}
            {state.gameStarted && (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isPaused ? '#ff4444' : '#44ff44',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                  }}
                >
                  {isPaused ? '▶️ Resume AI' : '⏸️ Pause AI'}
                </button>
                {isPaused && (
                  <button
                    onClick={() => gameState.stepAI()}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#3388ff',
                      color: '#fff',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }}
                  >
                    ⏭️ Step AI
                  </button>
                )}
                {/* Show reroll dice button when dice have been rolled (including when waiting for pass turn) */}
                {state.diceRolls.length > 0 && !state.isPieceAnimating && !state.isCapturedPieceAnimating && (
                  <button
                    onClick={() => gameState.rerollDice()}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#ff8800',
                      color: '#fff',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }}
                  >
                    🎲 Reroll Dice
                  </button>
                )}
                {/* Show select AI piece button when paused, dice rolled, and it's an AI player's turn with eligible pieces */}
                {isPaused && state.diceRolls.length > 0 && state.eligiblePieces.length > 0 && gameState.isCurrentPlayerComputer() && !state.isPieceAnimating && !state.isCapturedPieceAnimating && (
                  <button
                    onClick={() => { gameState.selectAIPiece().catch(console.error); }}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: '#9966ff',
                      color: '#fff',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }}
                  >
                    🤖 Select AI Piece
                  </button>
                )}
              </>
            )}
            <div style={{
              fontSize: '12px',
              color: '#ccc',
              marginTop: '4px',
              textAlign: 'center'
            }}>
              Debug Mode
            </div>
          </div>
        )}

        {/* Game Title - Always show */}
        <div style={{
          marginTop: '20px',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: state.gameStarted ? '2rem' : '2.5rem',
            marginBottom: state.gameStarted ? '8px' : '12px',
            color: 'var(--title-color, #333)',
            filter: 'var(--dark-mode-filter, none)',
            transition: 'all 0.3s ease'
          }}>
            Royal Game of Ur
          </h1>
          <div style={{
            fontSize: state.gameStarted ? '1.35rem' : '1.5rem',
            color: 'var(--subtitle-color, #666)',
            marginBottom: state.gameStarted ? '16px' : '20px',
            fontWeight: '500',
            opacity: 0.9,
            filter: 'var(--dark-mode-filter, none)'
          }}>
            Ruleset: {settings.currentRuleSet}
          </div>
        </div>

        {!state.gameStarted && !showGameSetup && (
          <div style={{
            textAlign: 'center'
          }}>
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
              <GameSetup onStartGame={handleGameSetup} currentRuleSet={settings.currentRuleSet} />
            </div>
          </div>
        )}

        {/* Settings Modal */}
        <GameSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={{ currentRuleSet: settings.currentRuleSet }}
          onSettingsChange={saveSettings}
        />

        {/* User Preferences Modal */}
        <UserPreferences
          isOpen={showPreferences}
          onClose={() => setShowPreferences(false)}
          preferences={{
            diceAnimations: settings.diceAnimations,
            pieceAnimations: settings.pieceAnimations,
            boardOrientation: settings.boardOrientation
          }}
          onPreferencesChange={savePreferences}
        />

        {/* Quit Game Confirmation Modal */}
        <ConfirmModal
          isOpen={showQuitConfirm}
          title="Quit Game"
          message="Are you sure you want to quit the current game? Your progress will be lost."
          confirmText="Quit Game"
          cancelText="Continue Playing"
          confirmButtonColor="#ff4444"
          onConfirm={() => {
            gameState.resetGame();
            setShowGameSetup(false);
            setShowQuitConfirm(false);
          }}
          onCancel={() => setShowQuitConfirm(false)}
        />

        {/* Debug Logging Control Modal */}
        <LoggingControl
          isOpen={showLoggingControl}
          onClose={() => setShowLoggingControl(false)}
        />

        {/* Rules Window */}
        {showRules && (
          <RulesWindow
            ruleset={getRuleSetByName(settings.currentRuleSet)}
            onClose={() => setShowRules(false)}
          />
        )}

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
              gameState={gameState}
            />
          }
          blackPlayerHome={
            <PlayerHome
              player="black"
              gameState={gameState}
            />
          }
        >
          {/* Main Game Board */}
          <div style={{
            position: 'relative',
            transform: getBoardTransform(gameState.getBoardOrientation()),
            transformOrigin: 'center',
            transition: 'transform 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            ...getBoardContainerSize(gameState.getBoardOrientation())
          }}>
            <div className="gameboard" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${BOARD_COLUMNS}, ${SQUARE_SIZE}px)`,
              gridTemplateRows: `repeat(${BOARD_ROWS}, ${SQUARE_SIZE}px)`,
              gap: `${BOARD_GAP}px`,
              justifyContent: 'center',
              pointerEvents: 'auto'
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
                const destinationSquares = gameState.getDestinationSquares();
                const isDestinationSquare = destinationSquares.includes(squareNumber);

                // Get pieces on this square (excluding moving pieces)
                const whitePiecesOnSquare = gameState.getPiecesOnSquare(squareNumber, 'white').sort((a, b) => b - a);
                const blackPiecesOnSquare = gameState.getPiecesOnSquare(squareNumber, 'black').sort((a, b) => b - a);

                return (
                  <div
                    key={idx}
                    style={{
                      width: SQUARE_SIZE,
                      height: SQUARE_SIZE,
                      border: isBlackedOut ? 'none' : `${BOARD_SQUARE_BORDER}px solid #33f`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 500,
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
                          left: 0
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
                          left: 0
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
                          left: 0
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
                          left: 0
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
                          left: 0
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
                          left: 0
                        }}
                      />
                    )}

                    {/* Display pieces on this square */}
                    {(whitePiecesOnSquare.length > 0 || blackPiecesOnSquare.length > 0) && (
                      <>
                        {[
                          { pieces: whitePiecesOnSquare, player: 'white' as const, positions: state.whitePiecePositions, blankImage: whiteBlank, spotsImage: whiteSpots },
                          { pieces: blackPiecesOnSquare, player: 'black' as const, positions: state.blackPiecePositions, blankImage: blackBlank, spotsImage: blackSpots }
                        ].map(({ pieces, player, positions, blankImage, spotsImage }) =>
                          pieces.map((pieceIndex, stackIndex) => {
                            const isEligible = state.gameStarted && !winner && state.currentPlayer === player && !gameState.isAnimating() && state.eligiblePieces.includes(pieceIndex);
                            const isSelected = state.selectedPiece !== null && state.currentPlayer === player && state.selectedPiece === pieceIndex;

                            // Calculate stacking offset based on board orientation
                            const stackingOffset = getStackingOffset(stackIndex, gameState.getBoardOrientation());
                            const stackZIndex = 2 + stackIndex;

                            return (
                              <div
                                key={`${player}-${pieceIndex}`}
                                style={{
                                  position: 'relative',
                                  cursor: isEligible ? 'pointer' : 'default'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isEligible) {
                                    gameState.selectPiece(pieceIndex as number);
                                  }
                                }}
                              >
                                <PieceHighlight
                                  isEligible={isEligible}
                                  isSelected={isSelected}
                                  size={HIGHLIGHT_CIRCLE_SIZE}
                                  top={stackingOffset.top}
                                  left={stackingOffset.left}
                                  transform="translate(-50%, -50%)"
                                  zIndex={stackZIndex}
                                />
                                <img
                                  src={gameState.shouldPieceShowSpots(positions[pieceIndex]) ? spotsImage : blankImage}
                                  alt={`${player.charAt(0).toUpperCase() + player.slice(1)} piece ${pieceIndex + 1}`}
                                  style={{
                                    width: `${PIECE_SIZE}px`,
                                    height: `${PIECE_SIZE}px`,
                                    position: 'absolute',
                                    top: stackingOffset.top,
                                    left: stackingOffset.left,
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: stackZIndex
                                  }}
                                />
                              </div>
                            );
                          })
                        )}
                      </>
                    )}
                    {isDestinationSquare && (
                      (() => {
                        // Find the move for this destination to check if it's a capture
                        const legalMoves = gameState.getLegalMoves();
                        const moveToMake = legalMoves.find(move =>
                          move.movingPieceIndex === state.selectedPiece! &&
                          move.destinationSquare === squareNumber
                        );
                        const isCapture = moveToMake?.capture || false;

                        // count the number of pieces on this square
                        const piecesOnSquare = gameState.getPiecesOnSquare(squareNumber, 'white').length + gameState.getPiecesOnSquare(squareNumber, 'black').length;
                        const stackingOffset = getStackingOffset(isCapture ? piecesOnSquare - 1 : piecesOnSquare, gameState.getBoardOrientation());

                        return (
                          <div
                            // offset div by stackingOffset
                            style={{
                              position: 'absolute',
                              top: stackingOffset.top,
                              left: stackingOffset.left,
                              width: `${PIECE_SIZE}px`,
                              height: `${PIECE_SIZE}px`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: 10,
                              cursor: 'pointer',
                              pointerEvents: 'auto',
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
                            onClick={(e) => {
                              e.stopPropagation();
                              if (state.selectedPiece !== null && moveToMake) {
                                gameState.startLegalMove(moveToMake);
                              }
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
                      })()
                    )}

                  </div>
                );
              })}
            </div>

            {/* Path Overlay */}
            {showPath && (() => {
              const currentRuleSet = getRuleSetByName(settings.currentRuleSet);
              const pathOverlaySrc = getPath(currentRuleSet.pathType).overlayImage;

              return (
                <img
                  src={pathOverlaySrc}
                  alt="Path Overlay"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: `${BOARD_COLUMNS * SQUARE_SIZE + (BOARD_COLUMNS - 1) * BOARD_GAP}px`,
                    height: `${BOARD_ROWS * SQUARE_SIZE + (BOARD_ROWS - 1) * BOARD_GAP}px`,
                    transform: `translate(-50%, -50%) ${state.currentPlayer === 'black' ? 'scaleY(-1)' : ''}`,
                    transformOrigin: 'center',
                    pointerEvents: 'none',
                    zIndex: 5,
                    opacity: 0.7,
                    transition: 'transform 0.3s ease'
                  }}
                />
              );
            })()}
          </div>
        </GameLayout>

        {state.gameStarted && !winner && (
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <DualDiceRoller ref={dualDiceRollerRef} gameState={gameState} />
          </div>
        )}

        {/* Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />

        {/* User Profile Modal */}
        <UserProfile
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
        />
      </div>
    </AuthProvider>
  )
}

export default App
