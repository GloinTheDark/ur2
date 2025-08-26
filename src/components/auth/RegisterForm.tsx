import React, { useState } from 'react';
import { useAuth, getAuthErrorMessage } from '../../contexts/AuthContext';
import type { AuthError } from 'firebase/auth';

interface RegisterFormProps {
    onClose: () => void;
    onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onClose, onSwitchToLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { register, loginWithGoogle, loginAsGuest } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password || !confirmPassword || !displayName) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            setLoading(true);
            setError('');
            await register(email, password, displayName);
            onClose();
        } catch (error) {
            setError(getAuthErrorMessage(error as AuthError));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        try {
            setLoading(true);
            setError('');
            await loginWithGoogle();
            onClose();
        } catch (error) {
            setError(getAuthErrorMessage(error as AuthError));
        } finally {
            setLoading(false);
        }
    };

    const handleGuestLogin = async () => {
        try {
            setLoading(true);
            setError('');
            await loginAsGuest();
            onClose();
        } catch (error) {
            setError(getAuthErrorMessage(error as AuthError));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            padding: '24px',
            maxWidth: '400px',
            margin: '0 auto'
        }}>
            <h2 style={{
                textAlign: 'center',
                marginBottom: '24px',
                color: 'var(--text-color, #333)'
            }}>
                Create Account
            </h2>

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

            <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '16px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '4px',
                        color: 'var(--text-color, #333)',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        Display Name
                    </label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                        placeholder="Your name for the game"
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '4px',
                        color: 'var(--text-color, #333)',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        Email
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                        placeholder="Enter your email"
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '4px',
                        color: 'var(--text-color, #333)',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        Password
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                        placeholder="At least 6 characters"
                    />
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '4px',
                        color: 'var(--text-color, #333)',
                        fontSize: '14px',
                        fontWeight: '500'
                    }}>
                        Confirm Password
                    </label>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                        }}
                        placeholder="Confirm your password"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: loading ? '#ccc' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '16px',
                        fontWeight: '500',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        marginBottom: '12px'
                    }}
                >
                    {loading ? 'Creating account...' : 'Create Account'}
                </button>
            </form>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <span style={{ color: '#666', fontSize: '14px' }}>or</span>
            </div>

            <button
                onClick={handleGoogleSignup}
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '12px',
                    background: loading ? '#ccc' : '#db4437',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                }}
            >
                🔍 Continue with Google
            </button>

            <button
                onClick={handleGuestLogin}
                disabled={loading}
                style={{
                    width: '100%',
                    padding: '12px',
                    background: loading ? '#ccc' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    marginBottom: '20px'
                }}
            >
                {loading ? 'Signing in...' : 'Continue as Guest'}
            </button>

            <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
                    Already have an account?{' '}
                    <button
                        onClick={onSwitchToLogin}
                        disabled={loading}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#007bff',
                            textDecoration: 'underline',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        Sign in
                    </button>
                </p>
            </div>
        </div>
    );
};

export default RegisterForm;
