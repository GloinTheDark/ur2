import React from 'react';

interface PieceHighlightProps {
    isEligible: boolean;
    isSelected: boolean;
    size?: number;
    top?: string;
    left?: string;
    transform?: string;
    zIndex?: number;
}

const PieceHighlight: React.FC<PieceHighlightProps> = ({
    isEligible,
    isSelected,
    size = 40, // Default highlight circle size
    top = '50%',
    left = '50%',
    transform = 'translate(-50%, -50%)',
    zIndex = 0
}) => {
    if (!isEligible && !isSelected) {
        return null;
    }

    return (
        <>
            {isEligible && !isSelected && (
                <div
                    className="highlight-circle"
                    style={{
                        position: 'absolute',
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: '50%',
                        top,
                        left,
                        transform,
                        zIndex: zIndex - 1
                    }}
                />
            )}
            {isSelected && (
                <div
                    className="selected-circle"
                    style={{
                        position: 'absolute',
                        width: `${size}px`,
                        height: `${size}px`,
                        borderRadius: '50%',
                        top,
                        left,
                        transform,
                        zIndex: zIndex - 1
                    }}
                />
            )}
        </>
    );
};

export default PieceHighlight;
