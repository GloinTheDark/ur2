import React from 'react';
import { HOME_SQUARE_SIZE, PIECE_SIZE, STACK_OFFSET } from '../UIConstants';
import whiteBlank from '../assets/WhiteBlank.svg';
import whiteSpots from '../assets/WhiteSpots.svg';
import blackBlank from '../assets/BlackBlank.svg';
import blackSpots from '../assets/BlackSpots.svg';

interface StackPiece {
    type: 'blank' | 'spots';
    isEligible?: boolean;
    isSelected?: boolean;
    onClick?: () => void;
}

interface PieceStackProps {
    pieces: StackPiece[];
    player: 'white' | 'black';
    label: string;
    fixedCapacity?: number; // Fixed capacity for the stack (determines height)
}

const PieceStack: React.FC<PieceStackProps> = ({
    pieces,
    player,
    label,
    fixedCapacity
}) => {
    const isWhite = player === 'white';
    const blankIcon = isWhite ? whiteBlank : blackBlank;
    const spotsIcon = isWhite ? whiteSpots : blackSpots;

    // Calculate stack height - use fixed capacity if provided, otherwise dynamic
    const stackHeight = fixedCapacity !== undefined
        ? Math.max(HOME_SQUARE_SIZE, HOME_SQUARE_SIZE + (fixedCapacity - 1) * STACK_OFFSET)
        : Math.max(HOME_SQUARE_SIZE, HOME_SQUARE_SIZE + (pieces.length - 1) * STACK_OFFSET);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: HOME_SQUARE_SIZE
        }}>
            {/* Stack Container */}
            <div style={{
                position: 'relative',
                width: HOME_SQUARE_SIZE,
                height: stackHeight,
                backgroundColor: isWhite ? '#f8f9fa' : '#343a40',
                borderRadius: '8px',
                border: `2px solid ${isWhite ? '#dee2e6' : '#495057'}`,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                padding: '2px'
            }}>
                {pieces.length === 0 ? (
                    /* Empty stack indicator */
                    <div style={{
                        position: 'absolute',
                        bottom: '50%',
                        left: '50%',
                        transform: 'translate(-50%, 50%)',
                        fontSize: '24px',
                        color: '#adb5bd',
                        opacity: 0.5
                    }}>
                        ∅
                    </div>
                ) : (
                    /* Render stacked pieces */
                    pieces.map((piece, index) => {
                        const icon = piece.type === 'blank' ? blankIcon : spotsIcon;

                        return (
                            <img
                                key={index}
                                src={icon}
                                alt={`${player} ${piece.type} piece ${index + 1}`}
                                style={{
                                    position: 'absolute',
                                    bottom: `${2 + index * STACK_OFFSET}px`,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    width: PIECE_SIZE,
                                    height: PIECE_SIZE,
                                    cursor: piece.onClick ? 'pointer' : 'default',
                                    zIndex: index + 1,
                                    // Highlight eligible pieces
                                    filter: piece.isEligible ? 'brightness(1.2) drop-shadow(0 0 4px rgba(255, 193, 7, 0.8))' : 'none',
                                    // Highlight selected pieces
                                    outline: piece.isSelected ? '3px solid #007bff' : 'none',
                                    outlineOffset: '2px',
                                    borderRadius: '50%'
                                }}
                                onClick={piece.onClick}
                                onMouseEnter={(e) => {
                                    if (piece.onClick) {
                                        e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (piece.onClick) {
                                        e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                                    }
                                }}
                            />
                        );
                    })
                )}
            </div>

            {/* Label */}
            <div style={{
                fontSize: '12px',
                marginTop: '4px',
                color: '#666',
                fontWeight: '500',
                textAlign: 'center'
            }}>
                {label}
            </div>
        </div>
    );
};

export default PieceStack;
