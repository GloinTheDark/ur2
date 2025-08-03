import React, { useState } from 'react';
import HouseSquareIcon from './assets/HouseSquare.svg';
import TempleSquareIcon from './assets/TempleSquare.svg';
import GateSquareIcon from './assets/GateSquare.svg';
import MarketSquareIcon from './assets/MarketSquare.svg';
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
        piecesPerPlayer: number;
        houseBonus: boolean;
        templeBlessings: boolean;
        gateKeeper: boolean;
        safeMarkets: boolean;
        diceAnimations: boolean;
        pieceAnimations: boolean;
        currentRuleSet: string; // Add current rule set
    };
    onSettingsChange: (newSettings: Partial<GameSettingsProps['settings']>) => void;
}

type TabType = 'rules' | 'rulesets' | 'optional' | 'preferences';

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
                            border: `2px solid ${settings.currentRuleSet === ruleSet.name ? '#4CAF50' : '#ddd'}`,
                            backgroundColor: settings.currentRuleSet === ruleSet.name ? '#e8f5e8' : 'var(--button-bg, #f9f9f9)',
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

    const renderOptionalTab = () => (
        <div style={{ padding: '20px 0' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-color, #666)', fontSize: '1.2rem' }}>
                Optional Rules & Variants
            </h3>

            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '12px', color: 'var(--text-color, #666)', fontSize: '1.1rem' }}>
                    Number of Pieces per Player
                </h4>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    {[3, 5, 7].map(count => (
                        <button
                            key={count}
                            onClick={() => onSettingsChange({ piecesPerPlayer: count })}
                            style={{
                                padding: '8px 16px',
                                fontSize: '1rem',
                                borderRadius: 6,
                                cursor: 'pointer',
                                backgroundColor: settings.piecesPerPlayer === count ? '#4CAF50' : 'var(--button-bg, #f0f0f0)',
                                color: settings.piecesPerPlayer === count ? '#fff' : 'var(--text-color, #333)',
                                border: `2px solid ${settings.piecesPerPlayer === count ? '#4CAF50' : '#ccc'}`,
                                fontWeight: settings.piecesPerPlayer === count ? 'bold' : 'normal'
                            }}
                        >
                            {count}
                        </button>
                    ))}
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-color, #666)', textAlign: 'center' }}>
                    Current: {settings.piecesPerPlayer} pieces per player
                </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '12px', color: 'var(--text-color, #666)', fontSize: '1.1rem' }}>
                    Special Square Rules
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                        <input
                            type="checkbox"
                            checked={settings.houseBonus}
                            onChange={(e) => onSettingsChange({ houseBonus: e.target.checked })}
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img src={HouseSquareIcon} alt="House Square" style={{ width: '20px', height: '20px', display: 'block' }} />
                        </div>
                        <span>House Bonus (+1 dice for controlling most house squares)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                        <input
                            type="checkbox"
                            checked={settings.templeBlessings}
                            onChange={(e) => onSettingsChange({ templeBlessings: e.target.checked })}
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img src={TempleSquareIcon} alt="Temple Square" style={{ width: '20px', height: '20px', display: 'block' }} />
                        </div>
                        <span>Temple Blessings (0 roll becomes 4 when controlling most temples)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                        <input
                            type="checkbox"
                            checked={settings.gateKeeper}
                            onChange={(e) => onSettingsChange({ gateKeeper: e.target.checked })}
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img src={GateSquareIcon} alt="Gate Square" style={{ width: '20px', height: '20px', display: 'block' }} />
                        </div>
                        <span>Gate Keeper (opponent on gate square blocks path completion)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                        <input
                            type="checkbox"
                            checked={settings.safeMarkets}
                            onChange={(e) => onSettingsChange({ safeMarkets: e.target.checked })}
                            style={{ transform: 'scale(1.2)' }}
                        />
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img src={MarketSquareIcon} alt="Market Square" style={{ width: '20px', height: '20px', display: 'block' }} />
                        </div>
                        <span>Safe Markets (pieces on market squares cannot be captured)</span>
                    </label>
                </div>
            </div>
        </div>
    );

    const renderPreferencesTab = () => (
        <div style={{ padding: '20px 0' }}>
            <h3 style={{ marginBottom: '16px', color: 'var(--text-color, #666)', fontSize: '1.2rem' }}>
                Player Preferences
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                    <input
                        type="checkbox"
                        checked={settings.diceAnimations}
                        onChange={(e) => onSettingsChange({ diceAnimations: e.target.checked })}
                        style={{ transform: 'scale(1.2)' }}
                    />
                    <span>Enable dice rolling animations</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                    <input
                        type="checkbox"
                        checked={settings.pieceAnimations}
                        onChange={(e) => onSettingsChange({ pieceAnimations: e.target.checked })}
                        style={{ transform: 'scale(1.2)' }}
                    />
                    <span>Enable piece movement animations</span>
                </label>

                <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-color, #666)', textAlign: 'center' }}>
                    <div>Animations add visual flair when rolling dice and moving pieces.</div>
                    <div>Disable for faster gameplay or accessibility preferences.</div>
                </div>
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
                        <button
                            onClick={() => setActiveTab('optional')}
                            style={tabStyle(activeTab === 'optional')}
                        >
                            Optional Rules
                        </button>
                        <button
                            onClick={() => setActiveTab('preferences')}
                            style={tabStyle(activeTab === 'preferences')}
                        >
                            Preferences
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
                    {activeTab === 'optional' && renderOptionalTab()}
                    {activeTab === 'preferences' && renderPreferencesTab()}
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
