import React from 'react';
import type { RulesDescription } from '../../types/RulesDescription';

interface RulesExampleProps {
    example: RulesDescription['examples'][0];
}

export const RulesExample: React.FC<RulesExampleProps> = ({ example }) => {
    return (
        <div className="rules-example">
            <h5 className="rules-example-title">{example.title}</h5>
            <p className="rules-example-description">{example.description}</p>

            <div className="rules-example-states">
                <div className="rules-example-state">
                    <h6 className="rules-example-state-label">Before:</h6>
                    <p className="rules-example-state-description">{example.beforeState}</p>
                </div>

                <div className="rules-example-arrow">→</div>

                <div className="rules-example-state">
                    <h6 className="rules-example-state-label">After:</h6>
                    <p className="rules-example-state-description">{example.afterState}</p>
                </div>
            </div>

            <div className="rules-example-explanation">
                <strong>Explanation:</strong> {example.explanation}
            </div>
        </div>
    );
};
