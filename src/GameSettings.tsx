import React, { useState } from 'react';
import RosetteSquareIcon from './assets/RosetteSquare.svg';
import TreasurySquareIcon from './assets/TreasurySquare.svg';
import dieB1 from './assets/DieB1.svg';
import dieW1 from './assets/DieW1.svg';
import whiteBlank from './assets/WhiteBlank.svg';
import whiteSpots from './assets/WhiteSpots.svg';
import blackBlank from './assets/BlackBlank.svg';
import blackSpots from './assets/BlackSpots.svg';
import { AVAILABLE_RULE_SETS } from './RuleSets';

interface GameSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: {
        currentRuleSet: string; // Add current rule set
    };
    onSettingsChange: (newSettings: Partial<GameSettingsProps['settings']>) => void;
}

type TabType = 'rules' | 'rulesets';

const GameSettings: React.FC<GameSettingsProps> = ({
    isOpen,
    onClose,
    settings,
    onSettingsChange
}) => {
    const [activeTab, setActiveTab] = useState<TabType>('rules');

    if (!isOpen) return null;

    // Get rule sets for the tab
    const ruleSets = Object.values(AVAILABLE_RULE_SETS);

    const tabStyle = (isActive: boolean) => ({
        padding: '8px 16px',
        fontSize: '1rem',
        borderRadius: '6px 6px 0 0',
        cursor: 'pointer',
        backgroundColor: isActive ? 'var(--modal-bg, #fff)' : 'var(--button-bg, #f0f0f0)',
        color: isActive ? 'var(--text-color, #333)' : 'var(--text-color, #666)',
        border: `2px solid var(--border-color, #ddd)`,
        borderBottom: isActive ? '2px solid var(--modal-bg, #fff)' : '2px solid var(--border-color, #ddd)',
        marginBottom: '-2px',
        fontWeight: isActive ? 'bold' : 'normal'
    });

    const renderRulesTab = () => (
        <div style={{ padding: '20px 0' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-color, #666)', fontSize: '1.2rem' }}>
                Basic Rules of the Royal Game of Ur
            </h3>

            <div style={{ textAlign: 'left', lineHeight: '1.6', color: 'var(--text-color, #333)' }}>
                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--text-color, #555)' }}>Setup:</h4>
                    <ul style={{ marginLeft: '20px', marginBottom: '0' }}>
                        <li style={{ marginBottom: '4px' }}>
                            <span>Each player starts with their pieces in their respective home areas, blank side up </span>
                            <img src={whiteBlank} alt="White blank piece" style={{ width: '20px', height: '20px', margin: '0 2px', verticalAlign: 'middle' }} />
                            <img src={blackBlank} alt="Black blank piece" style={{ width: '20px', height: '20px', margin: '0 2px', verticalAlign: 'middle' }} />
                        </li>
                        <li style={{ marginBottom: '4px' }}>
                            <span>Pieces flip to spotted side when passing the first </span>
                            <img src={TreasurySquareIcon} alt="Treasury Square" style={{ width: '20px', height: '20px', margin: '0 2px', verticalAlign: 'middle' }} />
                            <span> treasury square </span>
                            <img src={whiteSpots} alt="White spotted piece" style={{ width: '20px', height: '20px', margin: '0 2px', verticalAlign: 'middle' }} />
                            <img src={blackSpots} alt="Black spotted piece" style={{ width: '20px', height: '20px', margin: '0 2px', verticalAlign: 'middle' }} />
                        </li>
                        <li>Roll a single die to determine the starting player</li>
                    </ul>
                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: 'var(--info-box-bg, #f8f9fa)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color, #ddd)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={dieW1} alt="White die face" style={{ width: '24px', height: '24px' }} />
                                <span style={{ fontSize: '0.9rem' }}>= White goes first</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <img src={dieB1} alt="Black die face" style={{ width: '24px', height: '24px' }} />
                                <span style={{ fontSize: '0.9rem' }}>= Black goes first</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--text-color, #555)' }}>Gameplay:</h4>
                    <ul style={{ marginLeft: '20px', marginBottom: '0' }}>
                        <li>Roll four dice to move your pieces</li>
                        <li>
                            <span>Each die shows either a </span>
                            <img src={dieB1} alt="Blank die face" style={{ width: '20px', height: '20px', margin: '0 2px', verticalAlign: 'middle' }} />
                            <span> blank face (0 points) or a </span>
                            <img src={dieW1} alt="Spotted die face" style={{ width: '20px', height: '20px', margin: '0 2px', verticalAlign: 'middle' }} />
                            <span> spotted face (1 point)</span>
                        </li>
                        <li>Move one piece forward along the path by the total number of points rolled (press the show path button to see the route)</li>
                        <li>Land on an opponent's piece to capture it (sends it back to home)</li>
                        <li>
                            <img src={RosetteSquareIcon} alt="Rosette Square" style={{ width: '20px', height: '20px', margin: '0 2px', verticalAlign: 'middle' }} />
                            <span> Rosette squares give you an extra turn</span>
                        </li>
                    </ul>
                    <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        backgroundColor: 'var(--info-box-bg, #f8f9fa)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color, #ddd)'
                    }}>
                        <div style={{ fontSize: '0.9rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <strong>Example:</strong>
                            <span>Rolling</span>
                            <img src={dieW1} alt="Spotted die" style={{ width: '20px', height: '20px' }} />
                            <img src={dieW1} alt="Spotted die" style={{ width: '20px', height: '20px' }} />
                            <img src={dieB1} alt="Blank die" style={{ width: '20px', height: '20px' }} />
                            <img src={dieW1} alt="Spotted die" style={{ width: '20px', height: '20px' }} />
                            <span>= 3 points total</span>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <h4 style={{ marginBottom: '8px', color: 'var(--text-color, #555)' }}>Winning:</h4>
                    <ul style={{ marginLeft: '20px', marginBottom: '0' }}>
                        <li>Be the first to get all your pieces through the end of the board and back to home</li>
                        <li>Pieces automatically complete their journey and return home when they pass the final square</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    const renderRuleSetsTab = () => (
        <div style={{ padding: '20px 0' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-color, #666)', fontSize: '1.2rem' }}>
                Rule Set Selection
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                {ruleSets.map((ruleSet) => (
                    <div
                        key={ruleSet.name}
                        onClick={() => onSettingsChange({ currentRuleSet: ruleSet.name })}
                        style={{
                            padding: '16px',
                            borderRadius: '8px',
                            border: `2px solid ${settings.currentRuleSet === ruleSet.name ? '#4CAF50' : 'var(--border-color, #ddd)'}`,
                            backgroundColor: settings.currentRuleSet === ruleSet.name ? 'var(--highlight-bg, #e8f5e8)' : 'var(--button-bg, #f9f9f9)',
                            cursor: 'pointer',
                            width: '100%',
                            maxWidth: '500px',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <h4 style={{
                                margin: '0',
                                color: 'var(--text-color, #333)',
                                fontSize: '1.1rem',
                                fontWeight: settings.currentRuleSet === ruleSet.name ? 'bold' : 'normal'
                            }}>
                                {ruleSet.name}
                            </h4>
                            <div style={{
                                fontSize: '0.9rem',
                                color: 'var(--text-color, #666)',
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <span>{ruleSet.piecesPerPlayer} pieces</span>
                                <span>{ruleSet.diceCount} dice</span>
                            </div>
                        </div>
                        <p style={{
                            margin: '0',
                            color: 'var(--text-color, #666)',
                            fontSize: '0.9rem',
                            lineHeight: '1.4'
                        }}>
                            {ruleSet.description}
                        </p>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'var(--info-box-bg, #f8f9fa)',
                borderRadius: '6px',
                border: '1px solid var(--border-color, #ddd)',
                fontSize: '0.9rem',
                color: 'var(--text-color, #666)',
                textAlign: 'center'
            }}>
                Each rule set has unique mechanics, paths, and victory conditions.
                Select a rule set to automatically configure game settings.
            </div>
        </div>
    );

    return (
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
                padding: '0',
                backgroundColor: 'var(--modal-bg, #fff)',
                borderRadius: '12px',
                border: '2px solid var(--border-color, #ddd)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                minWidth: '500px',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'hidden',
                textAlign: 'center'
            }}>
                <div style={{
                    padding: '16px 24px 0 24px',
                    borderBottom: '2px solid var(--border-color, #ddd)'
                }}>
                    <h2 style={{ marginBottom: '16px', color: 'var(--text-color, #333)' }}>Game Settings</h2>

                    {/* Tab Headers */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                        <button
                            onClick={() => setActiveTab('rules')}
                            style={tabStyle(activeTab === 'rules')}
                        >
                            Rules
                        </button>
                        <button
                            onClick={() => setActiveTab('rulesets')}
                            style={tabStyle(activeTab === 'rulesets')}
                        >
                            Rule Sets
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div style={{
                    padding: '0 24px',
                    maxHeight: '50vh',
                    overflowY: 'auto'
                }}>
                    {activeTab === 'rules' && renderRulesTab()}
                    {activeTab === 'rulesets' && renderRuleSetsTab()}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '2px solid var(--border-color, #ddd)',
                    backgroundColor: 'var(--button-bg, #f8f8f8)'
                }}>
                    <button
                        onClick={onClose}
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
    );
};

export default GameSettings;
