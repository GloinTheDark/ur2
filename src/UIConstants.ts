/**
 * UIConstants.ts
 * 
 * Centralizes UI-related constants used across multiple components.
 * This eliminates the need to pass these values as props and ensures consistency.
 */

// Board dimensions
export const SQUARE_SIZE = 54; // Size in pixels for board squares
export const HOME_SQUARE_SIZE = 40; // Size in pixels for home area squares
export const BOARD_GAP = 4; // Gap between board squares in pixels
export const BOARD_SQUARE_BORDER = 4; // Border size for board squares in pixels

// Game piece and square styling constants
export const PIECE_SIZE = 36; // Size in pixels for game pieces
export const HIGHLIGHT_CIRCLE_SIZE = 43; // Size for piece selection/eligibility highlights
export const STACK_OFFSET = 5; // Offset in pixels for stacked pieces

// Z-index constants
export const PIECE_ANIMATION_Z_INDEX = 100; // Z-index for piece animations to stay below UI overlays
