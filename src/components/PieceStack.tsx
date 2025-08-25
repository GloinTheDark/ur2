import React from 'react';
import { HOME_SQUARE_SIZE, PIECE_SIZE, STACK_OFFSET, HIGHLIGHT_CIRCLE_SIZE } from '../UIConstants';
import whiteBlank from '../assets/WhiteBlank.svg';
import whiteSpots from '../assets/WhiteSpots.svg';
import blackBlank from '../assets/BlackBlank.svg';
import blackSpots from '../assets/BlackSpots.svg';
import PieceHighlight from './PieceHighlight';

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
                backgroundColor: isWhite ? '#ccc' : '#999',
                borderRadius: '8px',
                border: `2px solid ${isWhite ? '#999' : '#777'}`,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                padding: '2px'
            }}>
                {/* Render stacked pieces */}
                {pieces.map((piece, index) => {
                    const icon = piece.type === 'blank' ? blankIcon : spotsIcon;

                    return (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                bottom: `${index * STACK_OFFSET}px`,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                cursor: piece.onClick ? 'pointer' : 'default',
                                width: HIGHLIGHT_CIRCLE_SIZE,
                                height: HIGHLIGHT_CIRCLE_SIZE
                            }}
                            onClick={piece.onClick}
                        >
                            <PieceHighlight
                                isEligible={piece.isEligible || false}
                                isSelected={piece.isSelected || false}
                                size={HIGHLIGHT_CIRCLE_SIZE}
                                top="50%"
                                left="50%"
                                transform="translate(-50%, -50%)"
                                zIndex={index + 1}
                            />
                            <img
                                src={icon}
                                alt={`${player} ${piece.type} piece ${index + 1}`}
                                style={{
                                    width: PIECE_SIZE,
                                    height: PIECE_SIZE,
                                    display: 'block',
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: index + 1
                                }}
                                onMouseEnter={(e) => {
                                    if (piece.onClick) {
                                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.05)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (piece.onClick) {
                                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                                    }
                                }}
                            />
                        </div>
                    );
                })}
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
