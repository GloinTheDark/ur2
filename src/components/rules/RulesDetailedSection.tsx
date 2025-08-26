import React, { useState } from 'react';
import { RulesExample } from './RulesExample';
import type { RuleSet } from '../../RuleSet';

interface RulesDetailedSectionProps {
    ruleset: RuleSet;
}

export const RulesDetailedSection: React.FC<RulesDetailedSectionProps> = ({
    ruleset
}) => {
    // Extract data from ruleset
    const rulesDescription = ruleset.getRulesDescription();
    const detailedRules = rulesDescription.detailedRules;
    const examples = rulesDescription.examples;

    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    const toggleSection = (sectionId: string) => {
        const newExpanded = new Set(expandedSections);
        if (newExpanded.has(sectionId)) {
            newExpanded.delete(sectionId);
        } else {
            newExpanded.add(sectionId);
        }
        setExpandedSections(newExpanded);
    };

    const isSectionExpanded = (sectionId: string) => expandedSections.has(sectionId);

    return (
        <div className="rules-detailed-section">
            <h3 className="rules-section-title">📋 Detailed Rules</h3>

            {/* Movement Rules */}
            <div className="rules-subsection">
                <button
                    className="rules-subsection-header"
                    onClick={() => toggleSection('movement')}
                    aria-expanded={isSectionExpanded('movement')}
                >
                    <span className="rules-subsection-title">{detailedRules.movement.title}</span>
                    <span className="rules-expand-icon">
                        {isSectionExpanded('movement') ? '▼' : '▶'}
                    </span>
                </button>
                {isSectionExpanded('movement') && (
                    <div className="rules-subsection-content">
                        <p className="rules-description">{detailedRules.movement.description}</p>
                        <ul className="rules-list">
                            {detailedRules.movement.rules.map((rule, index) => (
                                <li key={index} className="rules-list-item">{rule}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Special Squares */}
            <div className="rules-subsection">
                <button
                    className="rules-subsection-header"
                    onClick={() => toggleSection('special')}
                    aria-expanded={isSectionExpanded('special')}
                >
                    <span className="rules-subsection-title">{detailedRules.specialSquares.title}</span>
                    <span className="rules-expand-icon">
                        {isSectionExpanded('special') ? '▼' : '▶'}
                    </span>
                </button>
                {isSectionExpanded('special') && (
                    <div className="rules-subsection-content">
                        {detailedRules.specialSquares.squares.map((square, index) => (
                            <div key={index} className="special-square-item">
                                <h5 className="special-square-name">{square.name}</h5>
                                <p className="special-square-description">{square.description}</p>
                                <p className="special-square-effect"><strong>Effect:</strong> {square.effect}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Capturing Rules */}
            <div className="rules-subsection">
                <button
                    className="rules-subsection-header"
                    onClick={() => toggleSection('capturing')}
                    aria-expanded={isSectionExpanded('capturing')}
                >
                    <span className="rules-subsection-title">{detailedRules.capturing.title}</span>
                    <span className="rules-expand-icon">
                        {isSectionExpanded('capturing') ? '▼' : '▶'}
                    </span>
                </button>
                {isSectionExpanded('capturing') && (
                    <div className="rules-subsection-content">
                        <p className="rules-description">{detailedRules.capturing.description}</p>
                        <ul className="rules-list">
                            {detailedRules.capturing.rules.map((rule, index) => (
                                <li key={index} className="rules-list-item">{rule}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Winning Rules */}
            <div className="rules-subsection">
                <button
                    className="rules-subsection-header"
                    onClick={() => toggleSection('winning')}
                    aria-expanded={isSectionExpanded('winning')}
                >
                    <span className="rules-subsection-title">{detailedRules.winning.title}</span>
                    <span className="rules-expand-icon">
                        {isSectionExpanded('winning') ? '▼' : '▶'}
                    </span>
                </button>
                {isSectionExpanded('winning') && (
                    <div className="rules-subsection-content">
                        <p className="rules-description">{detailedRules.winning.description}</p>
                        <ul className="rules-list">
                            {detailedRules.winning.requirements.map((requirement, index) => (
                                <li key={index} className="rules-list-item">{requirement}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Edge Cases */}
            <div className="rules-subsection">
                <button
                    className="rules-subsection-header"
                    onClick={() => toggleSection('edge-cases')}
                    aria-expanded={isSectionExpanded('edge-cases')}
                >
                    <span className="rules-subsection-title">{detailedRules.edgeCases.title}</span>
                    <span className="rules-expand-icon">
                        {isSectionExpanded('edge-cases') ? '▼' : '▶'}
                    </span>
                </button>
                {isSectionExpanded('edge-cases') && (
                    <div className="rules-subsection-content">
                        {detailedRules.edgeCases.cases.map((edgeCase, index) => (
                            <div key={index} className="edge-case-item">
                                <h5 className="edge-case-situation">{edgeCase.situation}</h5>
                                <p className="edge-case-resolution">{edgeCase.resolution}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Movement Examples */}
            {examples.length > 0 && (
                <div className="rules-subsection">
                    <button
                        className="rules-subsection-header"
                        onClick={() => toggleSection('examples')}
                        aria-expanded={isSectionExpanded('examples')}
                    >
                        <span className="rules-subsection-title">🎮 Movement Examples</span>
                        <span className="rules-expand-icon">
                            {isSectionExpanded('examples') ? '▼' : '▶'}
                        </span>
                    </button>
                    {isSectionExpanded('examples') && (
                        <div className="rules-subsection-content">
                            {examples.map((example, index) => (
                                <RulesExample key={index} example={example} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
