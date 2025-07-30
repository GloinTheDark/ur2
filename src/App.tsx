import { useState, useEffect, useMemo, useCallback } from 'react'
import './App.css'
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
import dieB1 from './assets/DieB1.svg'
import dieB2 from './assets/DieB2.svg'
import dieB3 from './assets/DieB3.svg'
import dieW1 from './assets/DieW1.svg'
import dieW2 from './assets/DieW2.svg'
import dieW3 from './assets/DieW3.svg'

interface DiceRollerProps {
  currentPlayer: 'white' | 'black';
  onRollComplete: () => void;
  whitePiecePositions: (number | 'start')[];
  blackPiecePositions: (number | 'start')[];
  whitePieces: ('blank' | 'spots')[];
  blackPieces: ('blank' | 'spots')[];
  onEligiblePiecesChange: (eligiblePieces: number[]) => void;
  selectedPiece: { player: 'white' | 'black', index: number } | null;
  houseBonus: number;
  templeBlessings: { hasControl: boolean, templeCount: { white: number, black: number } };
  onDiceTotalChange: (total: number) => void;
  resetTrigger?: number;
  gateKeeper: boolean;
  safeMarkets: boolean;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ currentPlayer, onRollComplete, whitePiecePositions, blackPiecePositions, whitePieces, blackPieces, onEligiblePiecesChange, selectedPiece, houseBonus, templeBlessings, onDiceTotalChange, resetTrigger, gateKeeper, safeMarkets }) => {
  const [rolls, setRolls] = useState<number[]>([]);
  const [diceTotal, setDiceTotal] = useState<number>(0);

  // Reset dice state when resetTrigger changes
  useEffect(() => {
    if (resetTrigger !== undefined) {
      setRolls([]);
      setDiceTotal(0);
      onDiceTotalChange(0);
    }
  }, [resetTrigger, onDiceTotalChange]);

  const handleRoll = () => {
    // Generate 4 independent dice rolls, each die can roll a 0 or a 1
    const newRolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 2));
    const baseTotal = newRolls.reduce((sum, roll) => sum + roll, 0);

    // Apply house bonus
    let total = baseTotal + houseBonus;

    // Apply temple blessings (only if base roll is 0 and player has temple control)
    if (baseTotal === 0 && templeBlessings.hasControl) {
      total = 4;
    }

    setRolls(newRolls);
    setDiceTotal(total);
    onDiceTotalChange(total);
    // Note: selectedPiece will be reset by parent component

    // If total is 0, automatically end turn after a short delay
    if (total === 0) {
      setTimeout(() => {
        setRolls([]);
        setDiceTotal(0);
        onDiceTotalChange(0);
        onRollComplete();
      }, 1500);
    }
  };

  const currentPositions = currentPlayer === 'white' ? whitePiecePositions : blackPiecePositions;

  // Filter pieces to only show eligible ones for movement - memoized to prevent infinite loops
  const eligiblePieces = useMemo(() => {
    const eligiblePiecesList: number[] = [];
    const currentPlayerPath = currentPlayer === 'white' ?
      [4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 7, 8, 16, 24, 23, 15, 14, 13, 12, 11, 10, 9] :
      [20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 23, 24, 16, 8, 7, 15, 14, 13, 12, 11, 10, 9];

    // Function to check if a piece can move to its destination
    const canPieceMove = (pieceIndex: number) => {
      const currentPos = currentPositions[pieceIndex];
      let destinationSquare: number;

      if (currentPos === 'start') {
        // Moving from start
        if (diceTotal <= currentPlayerPath.length) {
          destinationSquare = currentPlayerPath[diceTotal - 1];
        } else {
          return false; // Can't move beyond path
        }
      } else {
        // Moving along the path
        // For squares 9-15 that appear twice, use piece state to determine which occurrence
        let currentIndex = -1;
        const currentSquare = currentPos as number;
        const currentPieceStates = currentPlayer === 'white' ? whitePieces : blackPieces;

        if ([9, 10, 11, 12, 13, 14, 15].includes(currentSquare)) {
          // This square appears twice in the path
          if (currentPieceStates[pieceIndex] === 'blank') {
            // Use first occurrence (early in path)
            currentIndex = currentPlayerPath.indexOf(currentSquare);
          } else {
            // Use second occurrence (later in path)
            currentIndex = currentPlayerPath.lastIndexOf(currentSquare);
          }
        } else {
          // This square appears only once
          currentIndex = currentPlayerPath.indexOf(currentSquare);
        }

        const newIndex = currentIndex + diceTotal;

        if (newIndex >= currentPlayerPath.length) {
          // Check if gate square (9) is occupied by opponent piece (only if gate keeper rule is enabled)
          const opponentPositions = currentPlayer === 'white' ? blackPiecePositions : whitePiecePositions;
          const isGateBlocked = gateKeeper && opponentPositions.some(pos => pos === 9);
          if (isGateBlocked) {
            return false; // Cannot complete path if gate is blocked
          }
          return true; // Can return to start if gate is clear
        } else {
          destinationSquare = currentPlayerPath[newIndex];
        }
      }

      // Check if destination is occupied by same color piece (blocking)
      const isSameColorBlocking = currentPositions.some((pos, idx) =>
        pos === destinationSquare && idx !== pieceIndex
      );

      // Check if destination is a market square occupied by opponent piece (safe square)
      const opponentPositions = currentPlayer === 'white' ? blackPiecePositions : whitePiecePositions;
      const isMarketSquareBlocked = safeMarkets && [11, 14].includes(destinationSquare) &&
        opponentPositions.some(pos => pos === destinationSquare);

      return !isSameColorBlocking && !isMarketSquareBlocked;
    };

    // Only calculate eligible pieces if dice have been rolled and total > 0
    if (rolls.length > 0 && diceTotal > 0) {
      // Find the leftmost piece still in starting area (if any) and check if it can move
      // Only pieces in 'blank' state can leave the home
      const leftmostStartIndex = currentPositions.findIndex((pos, idx) => {
        const currentPieceStates = currentPlayer === 'white' ? whitePieces : blackPieces;
        return pos === 'start' && currentPieceStates[idx] === 'blank';
      });
      if (leftmostStartIndex !== -1 && canPieceMove(leftmostStartIndex)) {
        eligiblePiecesList.push(leftmostStartIndex);
      }

      // Add all pieces that are on the board and can move
      currentPositions.forEach((pos, index) => {
        if (pos !== 'start' && canPieceMove(index)) {
          eligiblePiecesList.push(index);
        }
      });
    }

    return eligiblePiecesList;
  }, [rolls, diceTotal, currentPlayer, currentPositions, whitePieces, blackPieces, whitePiecePositions, blackPiecePositions]);

  // Notify parent component about eligible pieces when they change
  useEffect(() => {
    onEligiblePiecesChange(eligiblePieces);
  }, [eligiblePieces, onEligiblePiecesChange]);

  // Auto-end turn if no pieces can move
  useEffect(() => {
    if (rolls.length > 0 && diceTotal > 0 && eligiblePieces.length === 0) {
      const timer = setTimeout(() => {
        setRolls([]);
        setDiceTotal(0);
        onDiceTotalChange(0);
        onRollComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [rolls.length, diceTotal, eligiblePieces.length, onDiceTotalChange, onRollComplete]);

  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}>
        Current Player: <span style={{ color: currentPlayer === 'white' ? 'var(--text-color, #666)' : 'var(--text-color, #333)' }}>
          {currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}
        </span>
      </div>

      {rolls.length === 0 && (
        <button
          onClick={handleRoll}
          style={{
            padding: '8px 16px',
            fontSize: '1rem',
            borderRadius: 4,
            cursor: 'pointer',
            backgroundColor: currentPlayer === 'white' ? '#f0f0f0' : '#333',
            color: currentPlayer === 'white' ? '#333' : '#fff',
            border: `2px solid ${currentPlayer === 'white' ? '#ccc' : '#666'}`
          }}
        >
          Roll Dice ({currentPlayer})
        </button>
      )}

      {rolls.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '1.5rem', fontWeight: 600, display: 'flex', gap: '12px', alignItems: 'center' }}>
          {rolls.map((roll, i) => {
            // Get random die image for the roll value
            const diceImages = roll === 0 ? [dieB1, dieB2, dieB3] : [dieW1, dieW2, dieW3];
            const randomDieImage = diceImages[i % diceImages.length]; // Use index to vary the dice appearance

            return (
              <img
                key={i}
                src={randomDieImage}
                alt={`Die ${i + 1}: ${roll}`}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '4px'
                }}
              />
            );
          })}
        </div>
      )}

      {rolls.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '1.2rem', fontWeight: 'bold', color: '#646cff' }}>
          Total: {diceTotal}
          {houseBonus > 0 && (
            <span style={{ fontSize: '0.9rem', color: '#FFD700', marginLeft: '8px' }}>
              (includes +{houseBonus} house bonus)
            </span>
          )}
          {rolls.reduce((sum, roll) => sum + roll, 0) === 0 && templeBlessings.hasControl && diceTotal === 4 && (
            <span style={{ fontSize: '0.9rem', color: '#9370DB', marginLeft: '8px' }}>
              (temple blessing: 0 → 4)
            </span>
          )}
        </div>
      )}

      {rolls.length > 0 && diceTotal === 0 && (
        <div style={{ marginTop: '12px', fontSize: '1rem', fontWeight: 'bold', color: '#ff6b6b' }}>
          No movement possible - turn will end automatically
        </div>
      )}

      {rolls.length > 0 && diceTotal > 0 && eligiblePieces.length === 0 && (
        <div style={{ marginTop: '12px', fontSize: '1rem', fontWeight: 'bold', color: '#ff6b6b' }}>
          No valid moves available - turn will end automatically
        </div>
      )}

      {rolls.length > 0 && diceTotal > 0 && eligiblePieces.length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '8px', fontSize: '1rem' }}>
            {selectedPiece !== null && selectedPiece.player === currentPlayer
              ? `Selected: Piece ${selectedPiece.index + 1} (${currentPositions[selectedPiece.index] === 'start' ? 'Start' : `Square ${currentPositions[selectedPiece.index]}`}) - Click destination to move`
              : 'Click on a highlighted piece to select it for movement'
            }
          </p>
        </div>
      )}
    </div>
  );
};

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

  const [settings, setSettings] = useState(loadSettings);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const PIECES_PER_PLAYER = settings.piecesPerPlayer;

  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white')
  const [whitePieces, setWhitePieces] = useState<('blank' | 'spots')[]>(Array(PIECES_PER_PLAYER).fill('blank'))
  const [blackPieces, setBlackPieces] = useState<('blank' | 'spots')[]>(Array(PIECES_PER_PLAYER).fill('blank'))
  const [whitePiecePositions, setWhitePiecePositions] = useState<(number | 'start')[]>(Array(PIECES_PER_PLAYER).fill('start'))
  const [blackPiecePositions, setBlackPiecePositions] = useState<(number | 'start')[]>(Array(PIECES_PER_PLAYER).fill('start'))
  const [eligiblePieces, setEligiblePieces] = useState<number[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<{ player: 'white' | 'black', index: number } | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [currentDiceTotal, setCurrentDiceTotal] = useState<number>(0);
  const [showPath, setShowPath] = useState<boolean>(false);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

  // Highlight circle size for eligible pieces
  const HIGHLIGHT_CIRCLE_SIZE = '39px';

  // Reset selected piece when eligible pieces change (after new roll)
  useEffect(() => {
    setSelectedPiece(null);
  }, [eligiblePieces]);

  // Update piece arrays when settings change
  useEffect(() => {
    if (!gameStarted) {
      setWhitePieces(Array(PIECES_PER_PLAYER).fill('blank'));
      setBlackPieces(Array(PIECES_PER_PLAYER).fill('blank'));
      setWhitePiecePositions(Array(PIECES_PER_PLAYER).fill('start'));
      setBlackPiecePositions(Array(PIECES_PER_PLAYER).fill('start'));
      setEligiblePieces([]);
      setSelectedPiece(null);
    }
  }, [PIECES_PER_PLAYER, gameStarted]);

  // Define the paths for each player  
  const whitePath = [4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 7, 8, 16, 24, 23, 15, 14, 13, 12, 11, 10, 9]
  const blackPath = [20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 23, 24, 16, 8, 7, 15, 14, 13, 12, 11, 10, 9]

  const switchPlayer = useCallback(() => {
    setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white')
    setSelectedPiece(null) // Reset piece selection when switching players
  }, [currentPlayer])

  const handlePieceClick = (pieceIndex: number) => {
    // Only allow piece selection if it's an eligible piece
    if (eligiblePieces.includes(pieceIndex)) {
      setSelectedPiece({ player: currentPlayer, index: pieceIndex });
    }
  }

  // Calculate destination square for selected piece
  const getDestinationSquare = (selectedPiece: { player: 'white' | 'black', index: number } | null, diceTotal: number) => {
    if (!selectedPiece || diceTotal === 0) return null;

    const currentPlayerPath = selectedPiece.player === 'white' ? whitePath : blackPath;
    const currentPositions = selectedPiece.player === 'white' ? whitePiecePositions : blackPiecePositions;
    const currentPieces = selectedPiece.player === 'white' ? whitePieces : blackPieces;
    const currentPos = currentPositions[selectedPiece.index];

    if (currentPos === 'start') {
      // Moving from start
      if (diceTotal <= currentPlayerPath.length) {
        return currentPlayerPath[diceTotal - 1];
      }
      return null; // Can't move beyond path
    } else {
      // Moving along the path
      // For squares 9-15 that appear twice, use piece state to determine which occurrence
      let currentIndex = -1;
      const currentSquare = currentPos as number;

      if ([9, 10, 11, 12, 13, 14, 15].includes(currentSquare)) {
        // This square appears twice in the path
        if (currentPieces[selectedPiece.index] === 'blank') {
          // Use first occurrence (early in path)
          currentIndex = currentPlayerPath.indexOf(currentSquare);
        } else {
          // Use second occurrence (later in path)
          currentIndex = currentPlayerPath.lastIndexOf(currentSquare);
        }
      } else {
        // This square appears only once
        currentIndex = currentPlayerPath.indexOf(currentSquare);
      }

      const newIndex = currentIndex + diceTotal;

      if (newIndex >= currentPlayerPath.length) {
        return 'complete'; // Piece would complete the path and return to start
      } else {
        return currentPlayerPath[newIndex];
      }
    }
  };

  // Handle clicking on destination square to move piece
  const handleDestinationClick = () => {
    if (selectedPiece !== null && selectedPiece.player === currentPlayer && currentDiceTotal > 0) {
      const landedOnRosette = movePiece(currentPlayer, selectedPiece.index, currentDiceTotal);

      // Reset dice state and selected piece
      setCurrentDiceTotal(0);
      setSelectedPiece(null);
      setResetTrigger(prev => prev + 1); // Trigger DiceRoller reset

      if (landedOnRosette) {
        // If landed on rosette, player gets to roll again
        // Don't switch players
      } else {
        // Switch to the other player after moving
        setTimeout(() => switchPlayer(), 500);
      }
    }
  };

  // Stable callback for setting eligible pieces
  const handleEligiblePiecesChange = useCallback((eligiblePieces: number[]) => {
    setEligiblePieces(eligiblePieces);
  }, []);

  // Get current dice total from DiceRoller state
  const handleDiceTotalChange = useCallback((total: number) => {
    setCurrentDiceTotal(total);
  }, []);

  // Check for win condition
  const checkWinCondition = () => {
    const whiteWon = whitePieces.every(piece => piece === 'spots') &&
      whitePiecePositions.every(pos => pos === 'start');
    const blackWon = blackPieces.every(piece => piece === 'spots') &&
      blackPiecePositions.every(pos => pos === 'start');

    if (whiteWon) return 'white';
    if (blackWon) return 'black';
    return null;
  }

  const winner = checkWinCondition();

  // Save settings to localStorage
  const saveSettings = (newSettings: { piecesPerPlayer?: number, houseBonus?: boolean, templeBlessings?: boolean, gateKeeper?: boolean, safeMarkets?: boolean }) => {
    const updatedSettings = { ...settings, ...newSettings };
    localStorage.setItem('royalGameSettings', JSON.stringify(updatedSettings));
    setSettings(updatedSettings);
  };

  // Calculate house control for house bonus rule
  const calculateHouseControl = () => {
    const houseSquares = [3, 10, 13, 16, 19];
    let whiteHouses = 0;
    let blackHouses = 0;

    houseSquares.forEach(square => {
      const whiteOnSquare = whitePiecePositions.some(pos => pos === square);
      const blackOnSquare = blackPiecePositions.some(pos => pos === square);

      if (whiteOnSquare && !blackOnSquare) whiteHouses++;
      else if (blackOnSquare && !whiteOnSquare) blackHouses++;
    });

    return { whiteHouses, blackHouses };
  };

  // Calculate temple control for temple blessings rule
  const calculateTempleControl = () => {
    const templeSquares = [2, 4, 15, 18, 20];
    let whiteTemples = 0;
    let blackTemples = 0;

    templeSquares.forEach(square => {
      const whiteOnSquare = whitePiecePositions.some(pos => pos === square);
      const blackOnSquare = blackPiecePositions.some(pos => pos === square);

      if (whiteOnSquare && !blackOnSquare) whiteTemples++;
      else if (blackOnSquare && !whiteOnSquare) blackTemples++;
    });

    return { whiteTemples, blackTemples };
  };

  const getHouseBonus = useCallback((player: 'white' | 'black') => {
    if (!settings.houseBonus) return 0;

    const { whiteHouses, blackHouses } = calculateHouseControl();

    if (player === 'white' && whiteHouses > blackHouses) return 1;
    if (player === 'black' && blackHouses > whiteHouses) return 1;
    return 0;
  }, [settings.houseBonus, whitePiecePositions, blackPiecePositions]);

  const getTempleBlessings = useCallback((player: 'white' | 'black') => {
    if (!settings.templeBlessings) return { hasControl: false, templeCount: { white: 0, black: 0 } };
    const { whiteTemples, blackTemples } = calculateTempleControl();
    const hasControl = (player === 'white' && whiteTemples > blackTemples) ||
      (player === 'black' && blackTemples > whiteTemples);
    return { hasControl, templeCount: { white: whiteTemples, black: blackTemples } };
  }, [settings.templeBlessings, whitePiecePositions, blackPiecePositions]);

  const startNewGame = () => {
    setCurrentPlayer('white');
    setWhitePieces(Array(PIECES_PER_PLAYER).fill('blank'));
    setBlackPieces(Array(PIECES_PER_PLAYER).fill('blank'));
    setWhitePiecePositions(Array(PIECES_PER_PLAYER).fill('start'));
    setBlackPiecePositions(Array(PIECES_PER_PLAYER).fill('start'));
    setEligiblePieces([]);
    setSelectedPiece(null);
    setGameStarted(true);
  };

  const resetGame = () => {
    setCurrentPlayer('white');
    setWhitePieces(Array(PIECES_PER_PLAYER).fill('blank'));
    setBlackPieces(Array(PIECES_PER_PLAYER).fill('blank'));
    setWhitePiecePositions(Array(PIECES_PER_PLAYER).fill('start'));
    setBlackPiecePositions(Array(PIECES_PER_PLAYER).fill('start'));
    setEligiblePieces([]);
    setSelectedPiece(null);
    setGameStarted(false);
  };



  const movePiece = (player: 'white' | 'black', pieceIndex: number, diceRoll: number) => {
    let landedOnRosette = false;

    // Reset selected piece after move
    setSelectedPiece(null);

    if (player === 'white') {
      const newPositions = [...whitePiecePositions]
      const newPieces = [...whitePieces]
      const newBlackPositions = [...blackPiecePositions]
      const newBlackPieces = [...blackPieces]
      const currentPos = newPositions[pieceIndex]

      let destinationSquare: number | undefined;

      if (currentPos === 'start') {
        // Move from start to first position
        if (diceRoll <= whitePath.length) {
          destinationSquare = whitePath[diceRoll - 1];
          newPositions[pieceIndex] = destinationSquare;
          // Check if piece landed on a rosette square
          if ([1, 7, 12, 17, 23].includes(destinationSquare)) {
            landedOnRosette = true;
          }
          // Check if piece lands on or passes through square 8 and change to spots
          for (let i = 0; i < diceRoll; i++) {
            if (whitePath[i] === 8) {
              newPieces[pieceIndex] = 'spots';
              break;
            }
          }
        }
      } else {
        // Find current position in path and move forward
        // For squares 9-15 that appear twice, use piece state to determine which occurrence
        let currentIndex = -1;
        const currentSquare = currentPos as number;

        if ([9, 10, 11, 12, 13, 14, 15].includes(currentSquare)) {
          // This square appears twice in the path
          if (newPieces[pieceIndex] === 'blank') {
            // Use first occurrence (early in path)
            currentIndex = whitePath.indexOf(currentSquare);
          } else {
            // Use second occurrence (later in path)
            currentIndex = whitePath.lastIndexOf(currentSquare);
          }
        } else {
          // This square appears only once
          currentIndex = whitePath.indexOf(currentSquare);
        }

        const newIndex = currentIndex + diceRoll

        if (newIndex >= whitePath.length) {
          // Check if gate square (9) is occupied by opponent piece (only if gate keeper rule is enabled)
          const isGateBlocked = settings.gateKeeper && newBlackPositions.some(pos => pos === 9);
          if (!isGateBlocked) {
            // Piece completes the circuit and returns to start
            newPositions[pieceIndex] = 'start'
            newPieces[pieceIndex] = 'spots' // Keep spots state to indicate completion
          }
          // If gate is blocked, piece cannot move (stays in current position)
        } else {
          destinationSquare = whitePath[newIndex];
          newPositions[pieceIndex] = destinationSquare;
          // Check if piece landed on a rosette square
          if ([1, 7, 12, 17, 23].includes(destinationSquare)) {
            landedOnRosette = true;
          }
          // Check if piece lands on or passes through square 8 and change to spots
          for (let i = currentIndex + 1; i <= newIndex; i++) {
            if (whitePath[i] === 8) {
              newPieces[pieceIndex] = 'spots';
              break;
            }
          }
        }
      }

      // Check for opponent piece capture
      if (destinationSquare !== undefined) {
        const capturedPieceIndex = blackPiecePositions.findIndex(pos => pos === destinationSquare);
        if (capturedPieceIndex !== -1) {
          newBlackPositions[capturedPieceIndex] = 'start';
          newBlackPieces[capturedPieceIndex] = 'blank';
        }
      }

      setWhitePiecePositions(newPositions)
      setWhitePieces(newPieces)
      setBlackPiecePositions(newBlackPositions)
      setBlackPieces(newBlackPieces)
    } else {
      const newPositions = [...blackPiecePositions]
      const newPieces = [...blackPieces]
      const newWhitePositions = [...whitePiecePositions]
      const newWhitePieces = [...whitePieces]
      const currentPos = newPositions[pieceIndex]

      let destinationSquare: number | undefined;

      if (currentPos === 'start') {
        // Move from start to first position
        if (diceRoll <= blackPath.length) {
          destinationSquare = blackPath[diceRoll - 1];
          newPositions[pieceIndex] = destinationSquare;
          // Check if piece landed on a rosette square
          if ([1, 7, 12, 17, 23].includes(destinationSquare)) {
            landedOnRosette = true;
          }
          // Check if piece lands on or passes through square 24 and change to spots
          for (let i = 0; i < diceRoll; i++) {
            if (blackPath[i] === 24) {
              newPieces[pieceIndex] = 'spots';
              break;
            }
          }
        }
      } else {
        // Find current position in path and move forward
        // For squares 9-15 that appear twice, use piece state to determine which occurrence
        let currentIndex = -1;
        const currentSquare = currentPos as number;

        if ([9, 10, 11, 12, 13, 14, 15].includes(currentSquare)) {
          // This square appears twice in the path
          if (newPieces[pieceIndex] === 'blank') {
            // Use first occurrence (early in path)
            currentIndex = blackPath.indexOf(currentSquare);
          } else {
            // Use second occurrence (later in path)
            currentIndex = blackPath.lastIndexOf(currentSquare);
          }
        } else {
          // This square appears only once
          currentIndex = blackPath.indexOf(currentSquare);
        }

        const newIndex = currentIndex + diceRoll

        if (newIndex >= blackPath.length) {
          // Check if gate square (9) is occupied by opponent piece (only if gate keeper rule is enabled)
          const isGateBlocked = settings.gateKeeper && newWhitePositions.some(pos => pos === 9);
          if (!isGateBlocked) {
            // Piece completes the circuit and returns to start
            newPositions[pieceIndex] = 'start'
            newPieces[pieceIndex] = 'spots' // Keep spots state to indicate completion
          }
          // If gate is blocked, piece cannot move (stays in current position)
        } else {
          destinationSquare = blackPath[newIndex];
          newPositions[pieceIndex] = destinationSquare;
          // Check if piece landed on a rosette square
          if ([1, 7, 12, 17, 23].includes(destinationSquare)) {
            landedOnRosette = true;
          }
          // Check if piece lands on or passes through square 24 and change to spots
          for (let i = currentIndex + 1; i <= newIndex; i++) {
            if (blackPath[i] === 24) {
              newPieces[pieceIndex] = 'spots';
              break;
            }
          }
        }
      }

      // Check for opponent piece capture
      if (destinationSquare !== undefined) {
        const capturedPieceIndex = whitePiecePositions.findIndex(pos => pos === destinationSquare);
        if (capturedPieceIndex !== -1) {
          newWhitePositions[capturedPieceIndex] = 'start';
          newWhitePieces[capturedPieceIndex] = 'blank';
        }
      }

      setBlackPiecePositions(newPositions)
      setBlackPieces(newPieces)
      setWhitePiecePositions(newWhitePositions)
      setWhitePieces(newWhitePieces)
    }

    return landedOnRosette;
  }

  return (
    <div className="app" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '20px 0',
      boxSizing: 'border-box'
    }}>
      {!gameStarted && (
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
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center' }}>
            <button
              onClick={startNewGame}
              style={{
                padding: '12px 24px',
                fontSize: '1.2rem',
                borderRadius: 8,
                cursor: 'pointer',
                backgroundColor: '#4CAF50',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold'
              }}
            >
              Start New Game
            </button>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: '12px 20px',
                fontSize: '1rem',
                borderRadius: 8,
                cursor: 'pointer',
                backgroundColor: '#646cff',
                color: '#fff',
                border: 'none',
                fontWeight: 'bold'
              }}
            >
              ⚙️ Settings
            </button>
          </div>
          <div style={{ marginTop: '12px', fontSize: '0.9rem', color: 'var(--text-color, #666)' }}>
            Current setup: {PIECES_PER_PLAYER} pieces per player
            {settings.houseBonus && <span style={{ display: 'block' }}>House Bonus: Enabled</span>}
            {settings.templeBlessings && <span style={{ display: 'block' }}>Temple Blessings: Enabled</span>}
            {settings.gateKeeper && <span style={{ display: 'block' }}>Gate Keeper: Enabled</span>}
            {settings.safeMarkets && <span style={{ display: 'block' }}>Safe Markets: Enabled</span>}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
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
            backgroundColor: 'var(--modal-bg, #fff)',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            minWidth: '300px',
            textAlign: 'center'
          }}>
            <h2 style={{ marginBottom: '20px', color: 'var(--text-color, #333)' }}>Game Settings</h2>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--text-color, #666)', fontSize: '1.1rem' }}>
                Number of Pieces per Player
              </h3>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[3, 5, 7].map(count => (
                  <button
                    key={count}
                    onClick={() => saveSettings({ piecesPerPlayer: count })}
                    style={{
                      padding: '8px 16px',
                      fontSize: '1rem',
                      borderRadius: 6,
                      cursor: 'pointer',
                      backgroundColor: PIECES_PER_PLAYER === count ? '#4CAF50' : 'var(--button-bg, #f0f0f0)',
                      color: PIECES_PER_PLAYER === count ? '#fff' : 'var(--text-color, #333)',
                      border: `2px solid ${PIECES_PER_PLAYER === count ? '#4CAF50' : '#ccc'}`,
                      fontWeight: PIECES_PER_PLAYER === count ? 'bold' : 'normal'
                    }}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-color, #666)' }}>
                Current: {PIECES_PER_PLAYER} pieces per player
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '12px', color: 'var(--text-color, #666)', fontSize: '1.1rem' }}>
                Optional Rules
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                  <input
                    type="checkbox"
                    checked={settings.houseBonus}
                    onChange={(e) => saveSettings({ houseBonus: e.target.checked })}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <span>House Bonus (+1 dice for controlling most house squares)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                  <input
                    type="checkbox"
                    checked={settings.templeBlessings}
                    onChange={(e) => saveSettings({ templeBlessings: e.target.checked })}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <span>Temple Blessings (0 roll becomes 4 when controlling most temples)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                  <input
                    type="checkbox"
                    checked={settings.gateKeeper}
                    onChange={(e) => saveSettings({ gateKeeper: e.target.checked })}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <span>Gate Keeper (opponent on gate square blocks path completion)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                  <input
                    type="checkbox"
                    checked={settings.safeMarkets}
                    onChange={(e) => saveSettings({ safeMarkets: e.target.checked })}
                    style={{ transform: 'scale(1.2)' }}
                  />
                  <span>Safe Markets (pieces on market squares cannot be captured)</span>
                </label>
              </div>
              <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-color, #666)' }}>
                {settings.houseBonus && <div>House Bonus: Player controlling the most house squares gets +1 to dice rolls</div>}
                {settings.templeBlessings && <div>Temple Blessings: Player controlling the most temple squares gets 4 instead of 0 on dice rolls</div>}
                {settings.gateKeeper && <div>Gate Keeper: Pieces cannot complete their path if an opponent piece is on the gate square (9)</div>}
                {settings.safeMarkets && <div>Safe Markets: Pieces on market squares (11, 14) cannot be captured by opponents</div>}
              </div>
            </div>            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setShowSettings(false)}
                style={{
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
                Done
              </button>
            </div>
          </div>
        </div>
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
            onClick={resetGame}
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
            (Completed: {whitePieces.filter((piece, idx) => piece === 'spots' && whitePiecePositions[idx] === 'start').length}/{PIECES_PER_PLAYER})
          </span>
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${PIECES_PER_PLAYER}, 40px)`,
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
          {Array.from({ length: PIECES_PER_PLAYER }).map((_, idx) => {
            const isPieceInStart = whitePiecePositions[idx] === 'start';
            const isEligible = gameStarted && !winner && currentPlayer === 'white' && eligiblePieces.includes(idx);
            const isSelected = selectedPiece !== null && selectedPiece.player === 'white' && selectedPiece.index === idx && isPieceInStart;

            // Check if this home slot is the destination for a piece completing the path
            const destinationSquare = getDestinationSquare(selectedPiece, currentDiceTotal);
            const isDestinationHome = destinationSquare === 'complete' && selectedPiece?.player === 'white' &&
              selectedPiece?.index === idx && !isPieceInStart;

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
                    src={whitePieces[idx] === 'blank' ? whiteBlank : whiteSpots}
                    alt={`White piece ${idx + 1} - ${whitePieces[idx]}`}
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
                      handleDestinationClick();
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
            const destinationSquare = getDestinationSquare(selectedPiece, currentDiceTotal);
            const isDestinationSquare = destinationSquare === squareNumber;

            // Check if any pieces are on this square
            const whitePiecesOnSquare = whitePiecePositions.map((pos, index) => pos === squareNumber ? index : null).filter(p => p !== null);
            const blackPiecesOnSquare = blackPiecePositions.map((pos, index) => pos === squareNumber ? index : null).filter(p => p !== null);

            // Check if any piece on this square is eligible to move (only during active gameplay)
            const hasEligiblePiece = gameStarted && !winner && (currentPlayer === 'white' ? whitePiecesOnSquare : blackPiecesOnSquare).some(pieceIndex =>
              eligiblePieces.includes(pieceIndex as number)
            );

            // Check if any piece on this square is selected
            const hasSelectedPiece = selectedPiece !== null &&
              (currentPlayer === 'white' ? whitePiecesOnSquare : blackPiecesOnSquare).some(pieceIndex =>
                selectedPiece.player === currentPlayer && selectedPiece.index === pieceIndex
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
                      handleDestinationClick();
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
                      const isEligible = gameStarted && !winner && currentPlayer === 'white' && eligiblePieces.includes(pieceIndex as number);
                      const isSelected = selectedPiece !== null && selectedPiece.player === 'white' && selectedPiece.index === pieceIndex;
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
                          {/* Selected piece circle takes priority over eligible highlight */}
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
                            src={whitePieces[pieceIndex as number] === 'blank' ? whiteBlank : whiteSpots}
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
                      const isEligible = gameStarted && !winner && currentPlayer === 'black' && eligiblePieces.includes(pieceIndex as number);
                      const isSelected = selectedPiece !== null && selectedPiece.player === 'black' && selectedPiece.index === pieceIndex;
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
                          {/* Selected piece circle takes priority over eligible highlight */}
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
                            src={blackPieces[pieceIndex as number] === 'blank' ? blackBlank : blackSpots}
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
              transform: currentPlayer === 'black' ? 'scaleY(-1)' : 'none'
            }}
          />
        )}
      </div>

      {/* Black Player's Home */}
      <div style={{ marginTop: '16px' }}>
        <h3 style={{ textAlign: 'center', margin: '0 0 8px 0', color: 'var(--text-color, #333)', filter: 'var(--dark-mode-filter, none)' }}>
          Black's Home
          <span style={{ fontSize: '0.8rem', fontWeight: 'normal', marginLeft: '8px' }}>
            (Completed: {blackPieces.filter((piece, idx) => piece === 'spots' && blackPiecePositions[idx] === 'start').length}/{PIECES_PER_PLAYER})
          </span>
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${PIECES_PER_PLAYER}, 40px)`,
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
          {Array.from({ length: PIECES_PER_PLAYER }).map((_, idx) => {
            const isPieceInStart = blackPiecePositions[idx] === 'start';
            const isEligible = gameStarted && !winner && currentPlayer === 'black' && eligiblePieces.includes(idx);
            const isSelected = selectedPiece !== null && selectedPiece.player === 'black' && selectedPiece.index === idx && isPieceInStart;

            // Check if this home slot is the destination for a piece completing the path
            const destinationSquare = getDestinationSquare(selectedPiece, currentDiceTotal);
            const isDestinationHome = destinationSquare === 'complete' && selectedPiece?.player === 'black' &&
              selectedPiece?.index === idx && !isPieceInStart;

            return (
              <div
                key={`black-${idx}`}
                style={{
                  width: 40,
                  height: 40,
                  background: SQUARE_BACKGROUND_COLOR,
                  border: '1px solid #666',
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
                    src={blackPieces[idx] === 'blank' ? blackBlank : blackSpots}
                    alt={`Black piece ${idx + 1} - ${blackPieces[idx]}`}
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
                      handleDestinationClick();
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {gameStarted && !winner && (
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
                const { whiteHouses, blackHouses } = calculateHouseControl();
                if (whiteHouses > blackHouses) {
                  return <span style={{ color: 'var(--text-color, #666)' }}>White ({whiteHouses} vs {blackHouses}) +1 dice bonus</span>;
                } else if (blackHouses > whiteHouses) {
                  return <span style={{ color: 'var(--text-color, #333)' }}>Black ({blackHouses} vs {whiteHouses}) +1 dice bonus</span>;
                } else {
                  return <span style={{ color: 'var(--text-color, #888)' }}>Tied ({whiteHouses} each) - no bonus</span>;
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
                const { whiteTemples, blackTemples } = calculateTempleControl();
                if (whiteTemples > blackTemples) {
                  return <span style={{ color: 'var(--text-color, #666)' }}>White ({whiteTemples} vs {blackTemples}) temple blessings</span>;
                } else if (blackTemples > whiteTemples) {
                  return <span style={{ color: 'var(--text-color, #333)' }}>Black ({blackTemples} vs {whiteTemples}) temple blessings</span>;
                } else {
                  return <span style={{ color: 'var(--text-color, #888)' }}>Tied ({whiteTemples} each) - no blessings</span>;
                }
              })()}
            </div>
          )}
          <DiceRoller
            currentPlayer={currentPlayer}
            onRollComplete={switchPlayer}
            whitePiecePositions={whitePiecePositions}
            blackPiecePositions={blackPiecePositions}
            whitePieces={whitePieces}
            blackPieces={blackPieces}
            onEligiblePiecesChange={handleEligiblePiecesChange}
            selectedPiece={selectedPiece}
            houseBonus={getHouseBonus(currentPlayer)}
            onDiceTotalChange={handleDiceTotalChange}
            resetTrigger={resetTrigger}
            templeBlessings={getTempleBlessings(currentPlayer)}
            gateKeeper={settings.gateKeeper}
            safeMarkets={settings.safeMarkets}
          />

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
