import React from 'react';
import { getPath } from '../../GamePaths';
import type { PathType } from '../../GamePaths';

interface PathDiagramProps {
    pathType: PathType;
    playerColor: 'white' | 'black';
    title: string;
}

export const PathDiagram: React.FC<PathDiagramProps> = ({
    pathType,
    playerColor,
    title
}) => {
    const gamePath = getPath(pathType);
    const boardImageSrc = "/src/assets/Board.png";
    const overlayImageSrc = gamePath.overlayImage;

    return (
        <div className="path-diagram">
            <h5 className="path-diagram-title">{title}</h5>
            <div className="path-diagram-container">
                <div className="path-diagram-board">
                    {/* Base board image */}
                    <img
                        src={boardImageSrc}
                        alt="Game Board"
                        className="path-diagram-board-image"
                    />

                    {/* Path overlay */}
                    <img
                        src={overlayImageSrc}
                        alt={`${title} Path`}
                        className={`path-diagram-overlay ${playerColor === 'black' ? 'flipped-y' : ''}`}
                    />
                </div>
            </div>
        </div>
    );
};
