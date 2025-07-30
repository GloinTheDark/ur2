import { GameState } from './GameState';
import dieB1 from './assets/DieB1.svg';
import dieB2 from './assets/DieB2.svg';
import dieB3 from './assets/DieB3.svg';
import dieW1 from './assets/DieW1.svg';
import dieW2 from './assets/DieW2.svg';
import dieW3 from './assets/DieW3.svg';

interface DiceRollerProps {
    gameState: GameState;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ gameState }) => {
    const state = gameState.state;

    const handleRoll = () => {
        gameState.rollDice();
    };

    const currentPlayer = state.currentPlayer;
    const rolls = state.diceRolls;
    const diceTotal = state.diceTotal;
    const selectedPiece = state.selectedPiece;
    const eligiblePieces = state.eligiblePieces;
    const houseBonus = gameState.getHouseBonus(currentPlayer);
    const templeBlessings = gameState.getTempleBlessings(currentPlayer);

    const currentPositions = currentPlayer === 'white' ? state.whitePiecePositions : state.blackPiecePositions;

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

            {gameState.shouldShowPassButton() && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ff6b6b' }}>
                        {diceTotal === 0 ? 'No movement possible' : 'No valid moves available'}
                    </div>
                    <button
                        onClick={() => gameState.passTurn()}
                        style={{
                            padding: '8px 16px',
                            fontSize: '1rem',
                            borderRadius: 6,
                            cursor: 'pointer',
                            backgroundColor: '#ff6b6b',
                            color: '#fff',
                            border: 'none',
                            fontWeight: 'bold'
                        }}
                    >
                        Pass Turn
                    </button>
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

export default DiceRoller;
