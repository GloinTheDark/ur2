import React from 'react';
import { SQUARE_BACKGROUND_COLOR } from './UIConstants';
import HouseSquareIcon from './assets/HouseSquare.svg';
import TempleSquareIcon from './assets/TempleSquare.svg';
import GateSquareIcon from './assets/GateSquare.svg';
import MarketSquareIcon from './assets/MarketSquare.svg';

interface GameSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    settings: {
        piecesPerPlayer: number;
        houseBonus: boolean;
        templeBlessings: boolean;
        gateKeeper: boolean;
        safeMarkets: boolean;
    };
    onSettingsChange: (newSettings: Partial<GameSettingsProps['settings']>) => void;
}

const GameSettings: React.FC<GameSettingsProps> = ({
    isOpen,
    onClose,
    settings,
    onSettingsChange
}) => {
    if (!isOpen) return null;

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
                padding: '24px',
                backgroundColor: 'var(--modal-bg, #fff)',
                borderRadius: '12px',
                border: '2px solid var(--border-color, #ddd)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                minWidth: '300px',
                textAlign: 'center'
            }}>
                <h2 style={{ marginBottom: '20px', color: 'var(--text-color, #333)' }}>Game Settings</h2>

                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '12px', color: 'var(--text-color, #666)', fontSize: '1.1rem' }}>
                        Number of Pieces per Player
                    </h3>
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
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-color, #666)' }}>
                        Current: {settings.piecesPerPlayer} pieces per player
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '12px', color: 'var(--text-color, #666)', fontSize: '1.1rem' }}>
                        Optional Rules
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem', color: 'var(--text-color, #333)' }}>
                            <input
                                type="checkbox"
                                checked={settings.houseBonus}
                                onChange={(e) => onSettingsChange({ houseBonus: e.target.checked })}
                                style={{ transform: 'scale(1.2)' }}
                            />
                            <div style={{
                                backgroundColor: SQUARE_BACKGROUND_COLOR,
                                padding: '2px',
                                borderRadius: '3px',
                                border: '2px solid #00f',
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
                                backgroundColor: SQUARE_BACKGROUND_COLOR,
                                padding: '2px',
                                borderRadius: '3px',
                                border: '2px solid #00f',
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
                                backgroundColor: SQUARE_BACKGROUND_COLOR,
                                padding: '2px',
                                borderRadius: '3px',
                                border: '2px solid #00f',
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
                                backgroundColor: SQUARE_BACKGROUND_COLOR,
                                padding: '2px',
                                borderRadius: '3px',
                                border: '2px solid #00f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <img src={MarketSquareIcon} alt="Market Square" style={{ width: '20px', height: '20px', display: 'block' }} />
                            </div>
                            <span>Safe Markets (pieces on market squares cannot be captured)</span>
                        </label>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-color, #666)' }}>
                        {settings.houseBonus && <div>House Bonus: Player controlling the most house squares gets +1 to dice rolls</div>}
                        {settings.templeBlessings && <div>Temple Blessings: Player controlling the most temple squares gets 4 instead of 0 on dice rolls</div>}
                        {settings.gateKeeper && <div>Gate Keeper: Pieces cannot complete their path if an opponent piece is on the gate square</div>}
                        {settings.safeMarkets && <div>Safe Markets: Pieces on market squares cannot be captured by opponents</div>}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
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
