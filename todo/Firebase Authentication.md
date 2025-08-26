# Firebase Authentication Implementation Plan

## Overview
Add Firebase Authentication to the Royal Game of Ur app to enable user accounts, game history tracking, and multiplayer functionality.

## 1. Project Setup

### 1.1 Firebase Project Configuration (ur-data-storage)
- [ ] Access existing Firebase project "ur-data-storage" in Firebase Console
- [ ] Enable Authentication service (if not already enabled)
- [ ] Configure authentication providers (Email/Password, Google, Anonymous)
- [ ] Set up Firestore database for user data and game history (if not already configured)
- [ ] Configure Firebase hosting (optional)
- [ ] Add web app to the project (if not already added)

### 1.2 Dependencies Installation
- [x] ✅ Install Firebase SDK: `npm install firebase`

### 1.3 Environment Configuration
- [x] ✅ Create `.env.local` file for Firebase config
- [x] ✅ Get Firebase config from "ur-data-storage" project settings
- [x] ✅ Add Firebase config variables to `.env.local`
- [x] ✅ Verify `.gitignore` excludes `.env.local` (already covered by `*.local`)

## 2. Core Authentication Components

### 2.1 Firebase Configuration
- [x] ✅ Create `src/firebase/config.ts`
  - Initialize Firebase app
  - Export auth, firestore instances
  - Configure authentication settings
  - Environment variable integration

### 2.2 Authentication Context
- [x] ✅ Create `src/contexts/AuthContext.tsx`
  - User state management
  - Login/logout functions
  - Registration functions
  - Password reset functionality
  - Loading states
  - Guest/anonymous login
  - Google sign-in support
  - Error handling utilities

### 2.3 Authentication Hook
- [x] ✅ Create `useAuth` custom hook (included in AuthContext.tsx)
  - Custom hook for consuming auth context
  - Type-safe authentication state access

## 3. UI Components

### 3.1 Authentication Forms
- [x] ✅ Create `src/components/auth/LoginForm.tsx`
  - Email/password login
  - Google sign-in button
  - Guest/anonymous login
  - Form validation
  - Error handling

- [x] ✅ Create `src/components/auth/RegisterForm.tsx`
  - User registration
  - Email verification
  - Display name setup
  - Form validation

- [x] ✅ Create `src/components/auth/AuthModal.tsx`
  - Combined login/register modal
  - Mode switching between forms
  - Modal overlay and close functionality

- [x] ✅ Create `src/components/auth/UserProfile.tsx`
  - User profile display
  - Display name editing
  - Account settings
  - Logout functionality

- [x] ✅ Create `src/components/auth/AuthButton.tsx`
  - Authentication status button
  - Dynamic display based on auth state
  - Integration with modal system

### 3.2 Authentication Guards
- [ ] Create `src/components/auth/AuthGuard.tsx`
  - Protect authenticated routes
  - Redirect unauthenticated users

- [ ] Create `src/components/auth/GuestGuard.tsx`
  - Redirect authenticated users from auth pages

## 4. User Profile & Data Management

### 4.1 User Profile System
- [x] ✅ Create `src/types/User.ts` (integrated into userService.ts)
  - User interface definition
  - Profile data structure  
  - Game statistics structure

- [x] ✅ Create `src/services/userService.ts`
  - User profile CRUD operations
  - Game statistics tracking
  - User preferences management

### 4.2 Firestore Integration
- [x] ✅ Set up Firestore collections:
  ```
  users/
    {userId}/
      uid: string
      displayName: string
      email?: string
      createdAt: Date
      lastLogin: Date
      isAnonymous: boolean
  
  users/{userId}/stats/summary (for future use)
    gamesPlayed: number
    gamesWon: number
    winRate: number
    favoriteRuleset?: string
  ```

- [x] ✅ Integrate AuthContext with Firestore
  - Automatic profile creation on registration/login
  - Profile loading on authentication state change
  - Display name updates sync to Firestore
  - Profile data available throughout app

## 5. Game Integration

### 5.1 User-Aware Game State
- [ ] Update `GameState.ts` to include user information
- [ ] Add user IDs to game state
- [ ] Track game history for authenticated users

### 5.2 Player Selection Enhancement
- [x] ✅ Update player name display to use authenticated user names (PlayerHome.tsx)
- [ ] Add avatar/profile picture support
- [ ] Show user statistics in player areas

### 5.3 Game History & Statistics
- [ ] Create `src/components/GameHistory.tsx`
- [ ] Create `src/components/UserStats.tsx`
- [ ] Add game result tracking
- [ ] Implement win/loss statistics

## 6. Navigation & UI Updates

### 6.1 App Integration
- [x] ✅ Wrap App.tsx with `<AuthProvider>`
  - Import AuthProvider
  - Wrap entire app content
  - Authentication context now available throughout app

### 6.2 Header/Navigation Updates
- [x] ✅ Add authentication status to header (AuthButton in upper right controls)
- [x] ✅ User profile dropdown/menu (UserProfile modal)
- [x] ✅ Login/logout buttons (integrated in AuthButton)
- [x] ✅ Guest vs authenticated user indicators (AuthButton shows status)

### 6.3 Main Menu Enhancement
- [ ] Add "Continue as Guest" option
- [ ] User profile dropdown/menu
- [ ] Login/logout buttons
- [ ] Guest vs authenticated user indicators

### 6.2 Main Menu Enhancement
- [ ] Add "Continue as Guest" option
- [ ] Quick stats display for authenticated users
- [ ] Game history access
- [ ] Account settings link

## 7. Multiplayer Foundation

### 7.1 Real-time Game Support (Future)
- [ ] Set up Firestore real-time listeners
- [ ] Game room creation and joining
- [ ] Turn-based multiplayer logic
- [ ] Disconnect handling

### 7.2 Matchmaking System (Future)
- [ ] Player matching algorithm
- [ ] Skill-based matching
- [ ] Random opponent matching
- [ ] Friend system

## 8. Security & Validation

### 8.1 Firestore Security Rules
- [ ] User data access rules
- [ ] Game data access rules
- [ ] Prevent unauthorized modifications

### 8.2 Input Validation
- [ ] Client-side form validation
- [ ] Server-side validation with Cloud Functions
- [ ] Sanitize user inputs

## 9. Testing Strategy

### 9.1 Authentication Testing
- [ ] Unit tests for auth context
- [ ] Integration tests for login flow
- [ ] E2E tests for complete user journey

### 9.2 User Experience Testing
- [ ] Guest user experience
- [ ] Authenticated user experience
- [ ] Authentication state transitions

## 10. Migration & Rollout

### 10.1 Backward Compatibility
- [ ] Ensure existing local gameplay still works
- [ ] Graceful handling of authentication failures
- [ ] Offline mode support

### 10.2 Progressive Enhancement
- [ ] Phase 1: Basic authentication (login/register/guest)
- [ ] Phase 2: User profiles and statistics
- [ ] Phase 3: Game history and cloud saves
- [ ] Phase 4: Real-time multiplayer

## 11. Performance Considerations

### 11.1 Bundle Size
- [ ] Use Firebase modular SDK
- [ ] Import only needed Firebase services
- [ ] Code splitting for authentication components

### 11.2 Loading States
- [ ] Authentication loading indicators
- [ ] Skeleton screens for user data
- [ ] Offline state handling

## Implementation Priority

### High Priority (Phase 1)
1. Firebase project setup and configuration
2. Basic authentication context and hooks
3. Login/register forms with email/password
4. Guest mode support
5. User profile display

### Medium Priority (Phase 2)
1. User statistics and game history
2. Enhanced player names and avatars
3. Firestore integration for user data
4. Authentication guards and routing

### Low Priority (Phase 3)
1. Advanced authentication providers (Google, etc.)
2. Real-time multiplayer foundation
3. Advanced user preferences
4. Comprehensive security rules

## Notes
- Maintain current local gameplay functionality
- Design for offline-first experience
- Consider GDPR compliance for user data
- Plan for scalability from the start