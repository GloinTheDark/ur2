import { useAuth } from '../contexts/AuthContext';

/**
 * Utility functions for multiplayer functionality
 */

/**
 * Get the current user's ID from the auth context
 * Returns null if no user is authenticated
 */
export function getCurrentUserId(): string | null {
    // This function can't use hooks directly, so we'll need to pass the user ID
    // to RemotePlayerAgent from the component that creates it
    throw new Error('getCurrentUserId must be called from a React component context');
}

/**
 * Hook to get the current user's ID
 * Use this in React components to get the current user ID
 */
export function useCurrentUserId(): string | null {
    const { currentUser } = useAuth();
    return currentUser?.uid || null;
}

/**
 * Check if a player ID matches the current user
 */
export function isCurrentUser(playerId: string, currentUserId: string | null): boolean {
    return currentUserId !== null && playerId === currentUserId;
}

/**
 * Get display name for a player
 */
export function getPlayerDisplayName(
    playerId: string, 
    currentUserId: string | null,
    remotePlayerName?: string
): string {
    if (isCurrentUser(playerId, currentUserId)) {
        return 'You';
    }
    return remotePlayerName || 'Remote Player';
}
