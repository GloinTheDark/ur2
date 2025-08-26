import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import type { User } from 'firebase/auth';
import { validateDisplayName, cleanDisplayName, generateFriendlyName } from '../utils/contentFilter';

// User profile interface
export interface UserProfile {
    uid: string;
    displayName: string;
    email?: string;
    createdAt: Date;
    lastLogin: Date;
    isAnonymous: boolean;
}

// User statistics interface (for future use)
export interface UserStats {
    gamesPlayed: number;
    gamesWon: number;
    winRate: number;
    favoriteRuleset?: string;
}

// User preferences interface (for future use)
export interface UserPreferences {
    theme?: string;
    soundEnabled?: boolean;
    animationsEnabled?: boolean;
}

export class UserService {
    /**
     * Create or update user profile in Firestore
     */
    static async createOrUpdateUserProfile(user: User, displayName?: string): Promise<UserProfile> {
        const userRef = doc(db, 'users', user.uid);
        const now = new Date();

        try {
            // Check if user document already exists
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                // User exists, update last login and optionally display name
                const updateData: Partial<UserProfile> = {
                    lastLogin: now
                };

                if (displayName) {
                    updateData.displayName = displayName;
                }

                await updateDoc(userRef, updateData);

                // Return updated profile
                const updatedSnap = await getDoc(userRef);
                return {
                    uid: user.uid,
                    ...updatedSnap.data(),
                    createdAt: updatedSnap.data()?.createdAt?.toDate?.() || now,
                    lastLogin: now
                } as UserProfile;
            } else {
                // User doesn't exist, create new profile
                let safeName = displayName || user.displayName || (user.isAnonymous ? 'Guest' : user.email?.split('@')[0] || 'User');

                // Ensure the initial display name is family-friendly
                const validation = validateDisplayName(safeName);
                if (!validation.isValid) {
                    safeName = generateFriendlyName();
                }
                safeName = cleanDisplayName(safeName);

                const newProfile: UserProfile = {
                    uid: user.uid,
                    displayName: safeName,
                    email: user.email || undefined,
                    createdAt: now,
                    lastLogin: now,
                    isAnonymous: user.isAnonymous
                };

                await setDoc(userRef, {
                    ...newProfile,
                    createdAt: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                return newProfile;
            }
        } catch (error) {
            console.error('Error creating/updating user profile:', error);
            throw error;
        }
    }

    /**
     * Get user profile from Firestore
     */
    static async getUserProfile(uid: string): Promise<UserProfile | null> {
        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const data = userSnap.data();
                return {
                    uid,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || new Date(),
                    lastLogin: data.lastLogin?.toDate?.() || new Date()
                } as UserProfile;
            }

            return null;
        } catch (error) {
            console.error('Error fetching user profile:', error);
            return null;
        }
    }

    /**
     * Update user display name in Firestore with content filtering
     */
    static async updateDisplayName(uid: string, displayName: string): Promise<void> {
        // Validate the display name for inappropriate content
        const validation = validateDisplayName(displayName);

        if (!validation.isValid) {
            throw new Error(`Display name not allowed: ${validation.reason}. Try: ${validation.suggestedAlternative}`);
        }

        try {
            const userRef = doc(db, 'users', uid);
            const cleanedName = cleanDisplayName(displayName); // Additional cleaning

            await updateDoc(userRef, {
                displayName: cleanedName,
                updatedAt: serverTimestamp()
            });
            console.log('Display name updated successfully:', cleanedName);
        } catch (error) {
            console.error('Error updating display name:', error);
            if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
                throw new Error('Permission denied: Please check your Firestore security rules. Users should be able to write to their own documents in the users collection.');
            }
            throw error;
        }
    }

    /**
     * Get user statistics (placeholder for future implementation)
     */
    static async getUserStats(uid: string): Promise<UserStats | null> {
        try {
            const statsRef = doc(db, 'users', uid, 'stats', 'summary');
            const statsSnap = await getDoc(statsRef);

            if (statsSnap.exists()) {
                return statsSnap.data() as UserStats;
            }

            // Return default stats if none exist
            return {
                gamesPlayed: 0,
                gamesWon: 0,
                winRate: 0
            };
        } catch (error) {
            console.error('Error fetching user stats:', error);
            return null;
        }
    }

    /**
     * Update user statistics (placeholder for future implementation)
     */
    static async updateUserStats(uid: string, stats: Partial<UserStats>): Promise<void> {
        try {
            const statsRef = doc(db, 'users', uid, 'stats', 'summary');
            await updateDoc(statsRef, stats);
        } catch (error) {
            console.error('Error updating user stats:', error);
            throw error;
        }
    }
}
