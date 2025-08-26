import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { validateDisplayName, getSuggestedNames } from '../../utils/contentFilter';

interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ isOpen, onClose }) => {
    const { currentUser, userProfile, logout, isAnonymous, userDisplayName, updateUserProfile } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState(userDisplayName);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);

    if (!isOpen || !currentUser) return null;

    const handleDisplayNameChange = (value: string) => {
        setNewDisplayName(value);
        setError('');
        setSuggestions([]);

        // Real-time validation feedback
        if (value.trim().length > 0) {
            const validation = validateDisplayName(value);
            if (!validation.isValid) {
                setError(validation.reason || 'Invalid display name');
                if (validation.suggestedAlternative) {
                    setSuggestions([validation.suggestedAlternative, ...getSuggestedNames(3)]);
                }
            }
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setNewDisplayName(suggestion);
        setError('');
        setSuggestions([]);
    };

    const handleUpdateProfile = async () => {
        if (!newDisplayName.trim()) {
            setError('Display name cannot be empty');
            return;
        }

        // Validate before attempting to update
        const validation = validateDisplayName(newDisplayName.trim());
        if (!validation.isValid) {
            setError(validation.reason || 'Invalid display name');
            if (validation.suggestedAlternative) {
                setSuggestions([validation.suggestedAlternative, ...getSuggestedNames(3)]);
            }
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuggestions([]);
            await updateUserProfile(newDisplayName.trim());
            setIsEditing(false);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update profile';
            setError(errorMessage);

            // If it's a content filter error, show suggestions
            if (errorMessage.includes('not allowed') || errorMessage.includes('inappropriate')) {
                setSuggestions(getSuggestedNames(4));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            onClose();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    minWidth: '400px',
                    maxWidth: '500px',
                    maxHeight: '80vh',
                    overflow: 'auto',
                    position: 'relative'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        color: '#666',
                        padding: '0',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ×
                </button>

                <h2 style={{ marginTop: 0, marginBottom: '24px', color: '#333' }}>User Profile</h2>

                {error && (
                    <div style={{
                        background: 'rgba(220, 53, 69, 0.1)',
                        border: '1px solid rgba(220, 53, 69, 0.3)',
                        borderRadius: '4px',
                        padding: '12px',
                        marginBottom: '16px',
                        color: '#dc3545',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                    }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            backgroundColor: isAnonymous ? '#6c757d' : '#007bff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '24px',
                            fontWeight: 'bold'
                        }}>
                            {isAnonymous ? '👤' : userDisplayName.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                        {isEditing ? (
                            <div>
                                <input
                                    type="text"
                                    value={newDisplayName}
                                    onChange={(e) => handleDisplayNameChange(e.target.value)}
                                    disabled={loading}
                                    placeholder="Enter display name"
                                    maxLength={25}
                                    style={{
                                        padding: '8px',
                                        border: error ? '1px solid #dc3545' : '1px solid #ddd',
                                        borderRadius: '4px',
                                        fontSize: '16px',
                                        textAlign: 'center',
                                        marginBottom: '8px',
                                        width: '200px'
                                    }}
                                />
                                <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
                                    {newDisplayName.length}/25 characters
                                </div>

                                {/* Suggestions */}
                                {suggestions.length > 0 && (
                                    <div style={{
                                        background: '#f8f9fa',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '4px',
                                        padding: '8px',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                                            Try these family-friendly names:
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                            {suggestions.map((suggestion, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleSuggestionClick(suggestion)}
                                                    style={{
                                                        background: '#007bff',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '12px',
                                                        padding: '4px 8px',
                                                        fontSize: '12px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <button
                                        onClick={handleUpdateProfile}
                                        disabled={loading}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#28a745',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            marginRight: '8px'
                                        }}
                                    >
                                        {loading ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setNewDisplayName(userDisplayName);
                                            setError('');
                                            setSuggestions([]);
                                        }}
                                        disabled={loading}
                                        style={{
                                            padding: '6px 12px',
                                            background: '#6c757d',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            fontSize: '12px',
                                            cursor: loading ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <h3 style={{ margin: '0 0 8px 0', color: '#333' }}>
                                    {userDisplayName}
                                </h3>
                                {!isAnonymous && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        style={{
                                            background: '#007bff',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            padding: '4px 8px',
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Edit Name
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ textAlign: 'center', color: '#666', fontSize: '14px' }}>
                        {isAnonymous ? (
                            <p>Guest User</p>
                        ) : (
                            <>
                                <p><strong>Email:</strong> {currentUser.email}</p>
                                <p><strong>Account Type:</strong> {currentUser.emailVerified ? 'Verified' : 'Unverified'}</p>
                                {userProfile && (
                                    <p><strong>Member since:</strong> {userProfile.createdAt.toLocaleDateString()}</p>
                                )}
                            </>
                        )}

                        <div style={{ marginTop: '16px', fontSize: '12px', color: '#888' }}>
                            <p><strong>Firestore Document:</strong> users/{currentUser.uid}</p>
                            <p><strong>Display Name Source:</strong> {isAnonymous ? 'Generated' : 'Firestore/Auth'}</p>
                        </div>
                    </div>
                </div>

                <div style={{ borderTop: '1px solid #eee', paddingTop: '16px' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            width: '100%',
                            padding: '8px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        {isAnonymous ? 'Exit Guest Session' : 'Logout'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserProfile;
