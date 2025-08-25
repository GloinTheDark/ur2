
# Plan for New Rules Window

## Goal
To have a window available to the user that shows the complete rules for the current ruleset.
- Rules button on main window brings up rules window
- Rules window is closable and draggable
- Format similar to the game settings rules tab, using icons for pieces and squares

## UI Structure

### Window Layout
```
📖 Rules - [RuleSet Name]                    [✕]
├── 🎯 Quick Reference
├── 🛤️ Board Overview
├── 🎲 Basic Movement
├── ⭐ Special Squares
├── 🏆 How to Win
├── ──────────────────
├── 📋 Detailed Rules
├── 🎮 Movement Examples
├── 🔍 Special Cases
└── 📖 Complete Rule Set
```

### Visual Elements
- **Path diagram** with numbered squares and special square icons
- **Special square legend** with icons and descriptions
- **Two-tier content structure**:
  - **Quick Reference** - concise summary at top
  - **Detailed Section** - examples and edge cases below
- **Visual separator** between quick reference and detailed rules
- **Interactive examples** in detailed section (board states, move demonstrations)

## Technical Implementation

### 1. Rules Definition Strategy

Add to abstract RuleSet class:

```typescript
// In RuleSet.ts
abstract class RuleSet {
    // ... existing properties
    abstract getRulesDescription(): RulesDescription;
}

interface RulesDescription {
    // Quick Reference Section
    quickReference: {
        overview: string; // 1-2 sentence summary
        objective: string; // Brief win condition
        basicMovement: string; // Essential movement rule
        specialSquares: string; // Quick summary of special squares
    };
    
    // Detailed Section
    detailedRules: {
        pathDescription: string; // Complete path explanation
        movementRules: string[]; // Detailed movement mechanics
        specialSquares: Array<{
            type: 'rosette' | 'house' | 'temple' | 'market' | 'treasury' | 'gate';
            description: string;
            examples?: string[]; // Optional examples for complex rules
        }>;
        captureRules: string[]; // Detailed capture mechanics
        extraTurnConditions: string[]; // When extra turns are granted
        specialRules?: string[]; // Unique ruleset features
        edgeCases?: string[]; // Unusual situations and resolutions
    };
}
```

### 2. UI Component Structure

```typescript
// RulesWindow.tsx
interface RulesWindowProps {
    isOpen: boolean;
    onClose: () => void;
    ruleSet: RuleSet;
}

// RulesQuickReference.tsx - Top section component
interface RulesQuickReferenceProps {
    quickReference: QuickReference;
    pathDiagram: React.ReactNode;
}

// RulesDetailedSection.tsx - Bottom section component  
interface RulesDetailedSectionProps {
    detailedRules: DetailedRules;
    ruleSet: RuleSet;
}

// RulesExample.tsx - Interactive example component
interface RulesExampleProps {
    title: string;
    beforeState: GameStateSnapshot;
    afterState: GameStateSnapshot;
    explanation: string;
}
```

### 3. Window Behavior
- **Modal Type**: Non-modal (users can reference rules while playing)
- **Scroll Behavior**: Quick reference stays visible, detailed section scrollable
- **Progressive Disclosure**: Most users will only need the quick reference
- **Positioning**: Draggable with position memory in localStorage
- **Responsiveness**: Adaptive layout, quick reference collapses on small screens

## Content Organization

### Top Section: Quick Reference

#### 🎯 Quick Reference
- **Game Goal**: Brief 1-sentence objective
- **Movement**: Essential rule (e.g., "Roll dice, move that many spaces")
- **Winning**: How to win (e.g., "First to get 7 pieces home")
- **Special**: Key special squares summary

#### 🛤️ Board Overview
- Simple path diagram
- Starting and finishing areas marked
- Special squares highlighted

---

### Bottom Section: Detailed Rules

#### 📋 Detailed Movement
- Complete dice mechanics
- All movement rules and restrictions
- Stacking and capture details
- Backward movement (if applicable)

#### 🎮 Movement Examples
- Visual before/after board states
- Common move scenarios
- Capture demonstrations
- Special square interactions

#### ⭐ Special Squares (Detailed)
- Complete description of each special square type
- Examples of special square effects
- Interaction rules

#### 🔍 Edge Cases
- Unusual situations and their resolutions
- Conflicting rule interactions
- Tournament/official clarifications

#### � Winning Details
- Exact requirements to win
- Tie-breaking rules
- End-game scenarios

## Implementation Steps

### Phase 1: Foundation
1. **Create RulesDescription interface** with quick reference and detailed sections
2. **Implement getRulesDescription()** for 2-3 existing rulesets
3. **Create basic RulesWindow component** with close/drag functionality

### Phase 2: Quick Reference
4. **Add rules button** to main window
5. **Create RulesQuickReference component** with essential info
6. **Add simple path diagram** for board overview
7. **Style quick reference section** for readability

### Phase 3: Detailed Section
8. **Create RulesDetailedSection component** with examples
9. **Add interactive board state examples**
10. **Implement scrollable detailed rules**
11. **Add visual separator** between sections

### Phase 4: Polish  
12. **Implement window positioning memory**
13. **Add responsive behavior** (collapsible quick reference)
14. **Accessibility improvements**

## Integration Points

The rules window integrates with:
- **GameState**: Current ruleset awareness and auto-updates
- **GameSetup**: Rule selection context
- **Board visualization**: Shared path rendering logic  
- **Settings**: Window preferences and positioning
- **Theme system**: Consistent styling

## Enhancement Ideas (Future)

### Simple Additions
- **Quick Reference**: Collapsible summary card
- **Rule Comparisons**: "How this differs from Classic Rules"
- **Print View**: Printer-friendly layout

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels and structure
- **High Contrast**: Support for accessibility themes

## File Structure

```
src/
├── components/
│   ├── rules/
│   │   ├── RulesWindow.tsx
│   │   ├── RulesQuickReference.tsx
│   │   ├── RulesDetailedSection.tsx
│   │   ├── RulesExample.tsx
│   │   ├── RulesPathDiagram.tsx
│   │   └── RulesWindow.css
│   └── ...
├── types/
│   └── RulesDescription.ts
└── ...
```

## Priority Assessment

### High Priority
- Two-tier rules interface (quick + detailed)
- Basic window functionality
- Quick reference section

### Medium Priority  
- Interactive examples in detailed section
- Scrollable detailed rules
- Window positioning memory

### Low Priority
- Advanced interactive features
- Rule comparisons between rulesets
- Export functionality
