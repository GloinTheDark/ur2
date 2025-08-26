import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    signInAnonymously,
    updateProfile,
    sendPasswordResetEmail,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import type { User, AuthError } from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserService } from '../services/userService';
import type { UserProfile } from '../services/userService';

// Define the shape of our auth context
interface AuthContextType {
    // User state
    currentUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;

    // Authentication methods
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, displayName?: string) => Promise<void>;
    logout: () => Promise<void>;
    loginAsGuest: () => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (displayName: string) => Promise<void>;

    // Helper methods
    isAuthenticated: boolean;
    isAnonymous: boolean;
    userDisplayName: string;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Auth provider props
interface AuthProviderProps {
    children: ReactNode;
}

// Auth provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Load user profile from Firestore
    const loadUserProfile = async (user: User): Promise<void> => {
        try {
            const profile = await UserService.getUserProfile(user.uid);
            if (profile) {
                setUserProfile(profile);
            } else {
                // Create new profile if it doesn't exist
                const newProfile = await UserService.createOrUpdateUserProfile(user);
                setUserProfile(newProfile);
            }
        } catch (error) {
            console.error('Error loading user profile:', error);
        }
    };

    // Sign up with email and password
    const register = async (email: string, password: string, displayName?: string): Promise<void> => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Update Firebase Auth profile with display name if provided
            if (displayName && userCredential.user) {
                await updateProfile(userCredential.user, {
                    displayName: displayName
                });
            }

            // Create user profile in Firestore
            await UserService.createOrUpdateUserProfile(userCredential.user, displayName);
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    };

    // Sign in with email and password
    const login = async (email: string, password: string): Promise<void> => {
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // User profile will be loaded in the onAuthStateChanged listener
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    // Sign in anonymously (guest mode)
    const loginAsGuest = async (): Promise<void> => {
        try {
            const userCredential = await signInAnonymously(auth);
            // User profile will be loaded in the onAuthStateChanged listener
        } catch (error) {
            console.error('Guest login error:', error);
            throw error;
        }
    };

    // Sign in with Google
    const loginWithGoogle = async (): Promise<void> => {
        try {
            const provider = new GoogleAuthProvider();
            const userCredential = await signInWithPopup(auth, provider);
            // User profile will be loaded in the onAuthStateChanged listener
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    };

    // Sign out
    const logout = async (): Promise<void> => {
        try {
            await signOut(auth);
            setUserProfile(null); // Clear user profile on logout
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    };

    // Reset password
    const resetPassword = async (email: string): Promise<void> => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    };

    // Update user profile
    const updateUserProfile = async (displayName: string): Promise<void> => {
        if (!currentUser) {
            throw new Error('No user is currently signed in');
        }

        try {
            // Update Firebase Auth profile
            await updateProfile(currentUser, {
                displayName: displayName
            });

            // Update Firestore profile
            await UserService.updateDisplayName(currentUser.uid, displayName);

            // Update local profile state
            if (userProfile) {
                setUserProfile({
                    ...userProfile,
                    displayName: displayName
                });
            }
        } catch (error) {
            console.error('Profile update error:', error);
            if (error instanceof Error && error.message.includes('Permission denied')) {
                throw new Error('Unable to update profile. Please ensure you are logged in and have proper permissions.');
            }
            throw error;
        }
    };

    // Listen for authentication state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                // User is signed in, load their profile from Firestore
                await loadUserProfile(user);
            } else {
                // User is signed out, clear profile
                setUserProfile(null);
            }

            setLoading(false);
        });

        return unsubscribe; // Cleanup subscription on unmount
    }, []);

    // Helper computed values
    const isAuthenticated = currentUser !== null;
    const isAnonymous = currentUser?.isAnonymous || false;
    const userDisplayName = userProfile?.displayName ||
        currentUser?.displayName ||
        (isAnonymous ? 'Guest' : currentUser?.email?.split('@')[0] || 'User');

    // Context value
    const value: AuthContextType = {
        currentUser,
        userProfile,
        loading,
        login,
        register,
        logout,
        loginAsGuest,
        loginWithGoogle,
        resetPassword,
        updateUserProfile,
        isAuthenticated,
        isAnonymous,
        userDisplayName
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// Export the context for direct use if needed
export { AuthContext };

// Helper function to get auth error messages
export const getAuthErrorMessage = (error: AuthError): string => {
    switch (error.code) {
        case 'auth/user-not-found':
            return 'No account found with this email address.';
        case 'auth/wrong-password':
            return 'Incorrect password.';
        case 'auth/email-already-in-use':
            return 'An account with this email already exists.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/invalid-email':
            return 'Invalid email address.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        case 'auth/popup-closed-by-user':
            return 'Sign-in popup was closed before completion.';
        case 'auth/cancelled-popup-request':
            return 'Sign-in popup was cancelled.';
        default:
            return error.message || 'An authentication error occurred.';
    }
};
