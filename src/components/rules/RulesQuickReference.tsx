import React from 'react';
import { PathDiagram } from './PathDiagram';
import type { RulesDescription } from '../../types/RulesDescription';
import type { PathType } from '../../GamePaths';

interface RulesQuickReferenceProps {
    quickReference: RulesDescription['quickReference'];
    boardOverview: RulesDescription['boardOverview'];
    pathType: PathType;
}

export const RulesQuickReference: React.FC<RulesQuickReferenceProps> = ({
    quickReference,
    boardOverview,
    pathType
}) => {
    return (
        <div className="rules-quick-reference">
            <h3 className="rules-section-title">🎯 Quick Reference</h3>

            <div className="quick-reference-grid">
                <div className="quick-reference-item">
                    <span className="quick-reference-label">Goal:</span>
                    <span className="quick-reference-value">{quickReference.goal}</span>
                </div>

                <div className="quick-reference-item">
                    <span className="quick-reference-label">Movement:</span>
                    <span className="quick-reference-value">{quickReference.movement}</span>
                </div>

                <div className="quick-reference-item">
                    <span className="quick-reference-label">Special:</span>
                    <span className="quick-reference-value">{quickReference.special}</span>
                </div>
            </div>

            <h4 className="board-overview-title">🛤️ Board Overview</h4>
            <div className="board-overview">
                <div className="board-overview-item">
                    <span className="board-overview-label">Path:</span>
                    <span className="board-overview-description">{boardOverview.pathDescription}</span>
                </div>

                <div className="board-overview-item">
                    <span className="board-overview-label">Starting:</span>
                    <span className="board-overview-description">{boardOverview.startingArea}</span>
                </div>

                <div className="board-overview-item">
                    <span className="board-overview-label">Finishing:</span>
                    <span className="board-overview-description">{boardOverview.finishingArea}</span>
                </div>

                {boardOverview.specialSquares.length > 0 && (
                    <div className="board-overview-item">
                        <span className="board-overview-label">Special Squares:</span>
                        <span className="board-overview-description">
                            {boardOverview.specialSquares.join(', ')}
                        </span>
                    </div>
                )}
            </div>

            {/* Visual Path Diagrams */}
            <div className="path-diagrams">
                <PathDiagram
                    pathType={pathType}
                    playerColor="white"
                    title="Path for White Pieces"
                />
                <PathDiagram
                    pathType={pathType}
                    playerColor="black"
                    title="Path for Black Pieces"
                />
            </div>
        </div>
    );
};
