import React, { useState, useEffect } from 'react';
import { AppSettingsManager } from './AppSettings';
import type { AppSettings } from './AppSettings';

interface LoggingControlProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoggingControl: React.FC<LoggingControlProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<AppSettings>(AppSettingsManager.getInstance().getSettings());

    useEffect(() => {
        const unsubscribe = AppSettingsManager.getInstance().subscribe(() => {
            setSettings(AppSettingsManager.getInstance().getSettings());
        });
        return unsubscribe;
    }, []);

    const handleLoggingChange = (category: keyof AppSettings['logging'], enabled: boolean) => {
        AppSettingsManager.getInstance().updateSettings({
            logging: {
                ...settings.logging,
                [category]: enabled
            }
        });
    };

    const handleToggleAll = (enabled: boolean) => {
        AppSettingsManager.getInstance().updateSettings({
            logging: {
                mcts: enabled,
                ai: enabled,
                gameState: enabled,
                playerAgent: enabled,
                dice: enabled,
                animations: enabled,
                aiTiming: enabled
            }
        });
    };

    if (!isOpen) return null;

    const allEnabled = Object.values(settings.logging).every(v => v);
    const allDisabled = Object.values(settings.logging).every(v => !v);

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
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '2px solid var(--border-color, #ddd)',
                padding: '24px',
                maxWidth: '400px',
                width: '90%',
                position: 'relative',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#999',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                        e.currentTarget.style.color = '#333';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#999';
                    }}
                >
                    ×
                </button>

                <h3 style={{
                    margin: '0 0 20px 0',
                    fontSize: '1.4rem',
                    color: '#333',
                    textAlign: 'center'
                }}>
                    🐛 Debug Logging Control
                </h3>

                <div style={{
                    marginBottom: '20px',
                    display: 'flex',
                    gap: '8px',
                    justifyContent: 'center'
                }}>
                    <button
                        onClick={() => handleToggleAll(true)}
                        disabled={allEnabled}
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.9rem',
                            borderRadius: '4px',
                            cursor: allEnabled ? 'not-allowed' : 'pointer',
                            backgroundColor: allEnabled ? '#ccc' : '#4CAF50',
                            color: '#fff',
                            border: 'none',
                            opacity: allEnabled ? 0.6 : 1
                        }}
                    >
                        Enable All
                    </button>
                    <button
                        onClick={() => handleToggleAll(false)}
                        disabled={allDisabled}
                        style={{
                            padding: '6px 12px',
                            fontSize: '0.9rem',
                            borderRadius: '4px',
                            cursor: allDisabled ? 'not-allowed' : 'pointer',
                            backgroundColor: allDisabled ? '#ccc' : '#f44336',
                            color: '#fff',
                            border: 'none',
                            opacity: allDisabled ? 0.6 : 1
                        }}
                    >
                        Disable All
                    </button>
                </div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}>
                    {[
                        { key: 'mcts' as const, label: 'MCTS (Monte Carlo)', description: 'AI search algorithm details' },
                        { key: 'ai' as const, label: 'AI Decision Making', description: 'Move evaluation and selection' },
                        { key: 'gameState' as const, label: 'Game State Changes', description: 'Turn management and state updates' },
                        { key: 'playerAgent' as const, label: 'Player Agent Actions', description: 'Human and computer player events' },
                        { key: 'dice' as const, label: 'Dice Rolling', description: 'Dice roll results and modifiers' },
                        { key: 'animations' as const, label: 'Animation System', description: 'Piece movement and visual effects' },
                        { key: 'aiTiming' as const, label: 'AI Timing', description: 'Time taken for AI agent evaluations' }
                    ].map(({ key, label, description }) => (
                        <div key={key} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px'
                        }}>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontWeight: '500',
                                    color: '#333',
                                    marginBottom: '2px'
                                }}>
                                    {label}
                                </div>
                                <div style={{
                                    fontSize: '0.8rem',
                                    color: '#666'
                                }}>
                                    {description}
                                </div>
                            </div>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                cursor: 'pointer',
                                marginLeft: '12px'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={settings.logging[key]}
                                    onChange={(e) => handleLoggingChange(key, e.target.checked)}
                                    style={{
                                        marginRight: '8px',
                                        transform: 'scale(1.2)'
                                    }}
                                />
                                <span style={{
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    color: settings.logging[key] ? '#4CAF50' : '#999'
                                }}>
                                    {settings.logging[key] ? 'ON' : 'OFF'}
                                </span>
                            </label>
                        </div>
                    ))}
                </div>

                <div style={{
                    marginTop: '20px',
                    padding: '12px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    color: '#1976d2'
                }}>
                    💡 <strong>Tip:</strong> Enable logging categories to see detailed debug information in the browser console. Useful for debugging AI behavior and game mechanics.
                </div>
            </div>
        </div>
    );
};

export default LoggingControl;
