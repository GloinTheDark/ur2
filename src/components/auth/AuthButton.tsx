import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthButtonProps {
    onShowLogin: () => void;
    onShowProfile: () => void;
}

const AuthButton: React.FC<AuthButtonProps> = ({ onShowLogin, onShowProfile }) => {
    const { isAuthenticated, userDisplayName, isAnonymous } = useAuth();

    if (isAuthenticated) {
        return (
            <button
                onClick={onShowProfile}
                style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: isAnonymous ? '#6c757d' : '#28a745',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                }}
                title={`Signed in as ${userDisplayName}`}
            >
                {isAnonymous ? '👤' : '🔐'} {userDisplayName}
            </button>
        );
    }

    return (
        <button
            onClick={onShowLogin}
            style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: 'bold',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: '#007bff',
                color: '#fff',
                border: 'none',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
            }}
        >
            🔑 Sign In
        </button>
    );
};

export default AuthButton;
