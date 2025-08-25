# Board Orientation Selection

## Overview
Add user preference to select board orientation with 4 possible orientations:
- **Orientation 0** (Current): Standard layout
- **Orientation 1**: Rotated 90 degrees clockwise  
- **Orientation 2**: Rotated 180 degrees
- **Orientation 3**: Rotated 270 degrees clockwise (90 degrees counter-clockwise)

This feature will allow users to customize the board layout to their preference while maintaining all game functionality.

## Technical Implementation Plan

### Phase 1: User Preferences Integration ✅ (Infrastructure Already Exists)
**Goal**: Extend existing preferences system to support board orientation

#### Current State Analysis:
- ✅ `UserPreferences.tsx` exists with working modal system
- ✅ `UserPreferencesData` interface supports extensibility
- ✅ Preferences are properly integrated with `App.tsx`
- ✅ `GameState.updateAndSaveSettings()` system exists
- ✅ localStorage persistence is working

#### Changes Needed:
1. **Update `UserPreferencesData` interface** (`src/UserPreferences.tsx`)
   ```typescript
   export interface UserPreferencesData {
       diceAnimations: boolean;
       pieceAnimations: boolean;
       boardOrientation: 0 | 1 | 2 | 3; // NEW: Add board orientation
   }
   ```

2. **Add Board Orientation Section to UserPreferences UI**
   - Add new section after "Animations" 
   - Radio buttons or dropdown for 4 orientations
   - Visual preview icons showing board rotation
   - Labels: "Standard", "90° CW", "180°", "270° CW"

3. **Update GameSettings interface** (`src/GameState.ts`)
   ```typescript
   export interface GameSettings {
       diceAnimations: boolean;
       pieceAnimations: boolean;
       currentRuleSet: string;
       boardOrientation: 0 | 1 | 2 | 3; // NEW: Add to game settings
   }
   ```

4. **Update Settings Conversion Logic** (`src/App.tsx`)
   - Extend `savePreferences()` function to handle boardOrientation
   - Add boardOrientation to settings synchronization

### Phase 2: Board Layout Transformation System
**Goal**: Create CSS transformation system for board orientation

#### 2.1 Board Container Transformation
**File**: `src/App.tsx` (main board rendering area)

1. **Add Orientation Transform Function**
   ```typescript
   const getBoardTransform = (orientation: 0 | 1 | 2 | 3): string => {
       const rotations = {
           0: 'rotate(0deg)',
           1: 'rotate(90deg)', 
           2: 'rotate(180deg)',
           3: 'rotate(270deg)'
       };
       return rotations[orientation];
   };
   ```

2. **Apply Transform to Game Board**
   - Wrap board grid in transform container
   - Apply CSS transform to rotate entire board
   - Ensure transform-origin is center
   - Handle container sizing for rotated states

#### 2.2 Coordinate System Updates
**Files**: `src/GameLayout.tsx`, `src/BoardLayout.ts`

1. **Update `getSquarePosition()` Function**
   - Add orientation parameter to calculation
   - Transform coordinates based on rotation
   - Handle coordinate system remapping for rotated layouts

2. **Animation System Compatibility**
   - Ensure `PieceAnimator.tsx` works with rotated coordinates
   - Update `CapturedPieceAnimator.tsx` for rotated board
   - Verify waypoint calculations account for orientation

### Phase 3: Player Home Positioning
**Goal**: Adjust player home areas for different orientations

#### 3.1 Home Area Layout Logic
**File**: `src/GameLayout.tsx`

1. **Dynamic Home Positioning**
   ```typescript
   const getHomeLayout = (orientation: 0 | 1 | 2 | 3) => {
       // Orientation 0: White bottom, Black top (current)
       // Orientation 1: White left, Black right  
       // Orientation 2: White top, Black bottom
       // Orientation 3: White right, Black left
   };
   ```

2. **Update `getHomePosition()` Function**
   - Modify home area calculations for each orientation
   - Ensure stack positioning works in all orientations
   - Maintain correct animation endpoints

#### 3.2 Layout Container Structure
**File**: `src/GameLayout.tsx`

1. **Flexible Container Layout**
   - Change from fixed column layout to orientation-aware layout
   - Use CSS Grid or Flexbox for adaptive positioning
   - Ensure responsive design works in all orientations

### Phase 4: UI Control Integration
**Goal**: Integrate board orientation with existing UI controls

#### 4.1 Settings Persistence
**File**: `src/GameState.ts`

1. **Update Settings Loading/Saving**
   - Add boardOrientation to `loadSettings()` 
   - Include in `getDefaultSettings()` (default to 0)
   - Ensure backwards compatibility with existing saved settings

2. **Real-time Settings Updates**
   - Apply orientation changes immediately when preference changes
   - No need to restart game for orientation changes

#### 4.2 Game State Integration
**File**: `src/GameState.ts`

1. **Add Orientation Getter**
   ```typescript
   getBoardOrientation(): 0 | 1 | 2 | 3 {
       return this.settings.boardOrientation;
   }
   ```

2. **Notification System**
   - Ensure orientation changes trigger UI updates
   - Maintain game state consistency during orientation changes

### Phase 5: Animation System Updates
**Goal**: Ensure all animations work correctly with board rotation

#### 5.1 Piece Animation Compatibility
**Files**: `src/PieceAnimator.tsx`, `src/CapturedPieceAnimator.tsx`

1. **Coordinate Transformation**
   - Update animation calculations for rotated coordinate systems
   - Ensure smooth animations between home and board in all orientations
   - Test waypoint calculations with rotation

2. **Animation Timing Consistency**
   - Verify animation durations remain consistent
   - Ensure easing functions work properly with transformed coordinates

#### 5.2 Dice Animation Integration
**File**: `src/DualDiceRoller.tsx` (if affected)

1. **Dice Position Adjustment**
   - Consider if dice roller position needs adjustment for different orientations
   - Ensure dice animations don't conflict with rotated board

### Phase 6: Testing & Polish
**Goal**: Comprehensive testing and user experience refinement

#### 6.1 Functionality Testing
1. **All Orientations**
   - Test piece movement in all 4 orientations
   - Verify capture animations work correctly
   - Ensure stacking mechanics function properly
   - Test completion animations to home areas

2. **Settings Persistence**
   - Verify settings save/load correctly
   - Test orientation changes during active games
   - Ensure backwards compatibility

#### 6.2 User Experience Polish
1. **Visual Feedback**
   - Add preview icons in preferences showing board orientation
   - Consider animation when orientation changes
   - Ensure UI remains intuitive in all orientations

2. **Performance Optimization**
   - Minimize layout recalculations during orientation changes
   - Optimize CSS transforms for smooth performance

## Implementation Priority
1. **High Priority**: Phase 1 (Preferences Integration) - Foundation for feature
2. **High Priority**: Phase 2 (Board Transformation) - Core visual functionality  
3. **Medium Priority**: Phase 3 (Home Positioning) - Essential for playability
4. **Medium Priority**: Phase 4 (UI Integration) - Complete feature integration
5. **Low Priority**: Phase 5 (Animation Updates) - Polish and edge cases
6. **Low Priority**: Phase 6 (Testing & Polish) - Final refinement

## Technical Considerations

### CSS Transform Approach
- Use CSS `transform: rotate()` for performance
- Apply transforms at container level to affect entire board
- Maintain original DOM structure and game logic
- Handle coordinate remapping in positioning functions

### Backwards Compatibility
- Default orientation = 0 for existing users
- Graceful fallback if invalid orientation in settings
- Existing games continue without disruption

### Performance Impact
- CSS transforms are GPU-accelerated (minimal performance impact)
- Coordinate calculations may need optimization for real-time animations
- Settings changes should be immediate (no loading delays)

### Accessibility
- Ensure screen readers work with rotated layouts
- Maintain keyboard navigation functionality
- Consider motion sensitivity (optional animation for orientation changes)

## Success Criteria
- [ ] User can select from 4 board orientations in preferences
- [ ] Board rotates correctly with all functionality preserved
- [ ] Player home areas position correctly for each orientation
- [ ] All animations (pieces, captures, dice) work in all orientations
- [ ] Settings persist across browser sessions
- [ ] No performance degradation from orientation changes
- [ ] Existing saved games remain unaffected
- [ ] UI remains intuitive and accessible in all orientations

## Files to Modify
1. **`src/UserPreferences.tsx`** - Add orientation selection UI
2. **`src/GameState.ts`** - Extend GameSettings interface and methods
3. **`src/App.tsx`** - Apply board transforms and update settings handling
4. **`src/GameLayout.tsx`** - Update positioning calculations for orientation
5. **`src/PieceAnimator.tsx`** - Ensure animations work with rotated board
6. **`src/CapturedPieceAnimator.tsx`** - Update capture animations for orientation

## Optional Enhancements (Future)
- **Visual Preview**: Small board preview in preferences showing current orientation
- **Keyboard Shortcuts**: Quick rotation keys (e.g., Ctrl+R to rotate)
- **Game Setup Integration**: Set orientation per game/ruleset
- **Transition Animation**: Smooth rotation animation when changing orientation
- **Orientation Lock**: Prevent accidental orientation changes during games
