import React, { useState, useRef } from 'react';

export interface UserPreferencesData {
    diceAnimations: boolean;
    pieceAnimations: boolean;
}

interface UserPreferencesProps {
    isOpen: boolean;
    onClose: () => void;
    preferences: UserPreferencesData;
    onPreferencesChange: (newPreferences: Partial<UserPreferencesData>) => void;
}

const UserPreferences: React.FC<UserPreferencesProps> = ({
    isOpen,
    onClose,
    preferences,
    onPreferencesChange
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isInitialized, setIsInitialized] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);

    // Center the modal when it first opens
    React.useEffect(() => {
        if (isOpen && !isInitialized && modalRef.current) {
            const modal = modalRef.current;
            const centerX = (window.innerWidth - modal.offsetWidth) / 2;
            const centerY = (window.innerHeight - modal.offsetHeight) / 2;
            setPosition({ x: centerX, y: centerY });
            setIsInitialized(true);
        } else if (!isOpen) {
            setIsInitialized(false);
        }
    }, [isOpen, isInitialized]);

    if (!isOpen) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (modalRef.current) {
            const rect = modalRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
            setIsDragging(true);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;

            // Keep modal within viewport bounds
            const maxX = window.innerWidth - (modalRef.current?.offsetWidth || 400);
            const maxY = window.innerHeight - (modalRef.current?.offsetHeight || 600);

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

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
        }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div
                ref={modalRef}
                style={{
                    backgroundColor: 'var(--modal-bg, #fff)',
                    borderRadius: '12px',
                    border: '2px solid var(--border-color, #ddd)',
                    padding: '0',
                    maxWidth: '400px',
                    width: '90%',
                    maxHeight: '90vh',
                    overflow: 'auto',
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                    cursor: isDragging ? 'grabbing' : 'default'
                }}>
                {/* Close Button */}
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

                {/* Header */}
                <div
                    style={{
                        padding: '24px',
                        borderBottom: '2px solid var(--border-color, #ddd)',
                        textAlign: 'center',
                        cursor: 'grab',
                        userSelect: 'none'
                    }}
                    onMouseDown={handleMouseDown}
                >
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.5rem',
                        color: 'var(--text-color, #333)',
                        fontWeight: 'bold',
                        pointerEvents: 'none'
                    }}>
                        ⚙️ User Preferences
                    </h2>
                </div>

                {/* Content */}
                <div style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Animation Settings */}
                        <div>
                            <h3 style={{
                                marginBottom: '16px',
                                color: 'var(--text-color, #666)',
                                fontSize: '1.2rem',
                                fontWeight: 'bold'
                            }}>
                                Animations
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '1rem',
                                    color: 'var(--text-color, #333)',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={preferences.diceAnimations}
                                        onChange={(e) => onPreferencesChange({ diceAnimations: e.target.checked })}
                                        style={{
                                            transform: 'scale(1.3)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span>🎲 Enable dice rolling animations</span>
                                </label>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '1rem',
                                    color: 'var(--text-color, #333)',
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={preferences.pieceAnimations}
                                        onChange={(e) => onPreferencesChange({ pieceAnimations: e.target.checked })}
                                        style={{
                                            transform: 'scale(1.3)',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <span>🏃 Enable piece movement animations</span>
                                </label>
                            </div>

                            <div style={{
                                marginTop: '16px',
                                fontSize: '0.9rem',
                                color: 'var(--text-color, #666)',
                                backgroundColor: 'var(--info-bg, #f8f9fa)',
                                padding: '12px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-color, #e9ecef)'
                            }}>
                                <div style={{ marginBottom: '4px' }}>
                                    💡 <strong>Tip:</strong> Animations add visual flair when rolling dice and moving pieces.
                                </div>
                                <div>
                                    Disable for faster gameplay or accessibility preferences.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        marginTop: '24px',
                        paddingTop: '16px',
                        borderTop: '1px solid var(--border-color, #eee)',
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 24px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: '#646cff',
                                color: '#fff',
                                border: 'none',
                                boxShadow: '0 2px 8px rgba(100, 108, 255, 0.3)',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#5a67ff';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 108, 255, 0.4)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#646cff';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(100, 108, 255, 0.3)';
                            }}
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPreferences;
