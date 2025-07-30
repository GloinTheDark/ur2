/**
 * BoardLayout.ts
 * 
 * Centralizes all board square definitions and layout information for the Royal Game of Ur.
 * This eliminates magic numbers and provides a single source of truth for board configuration.
 */

// Board dimensions and layout
export const BOARD_COLUMNS = 8; // Number of columns in the game board
export const BOARD_ROWS = 3; // Number of rows in the game board
export const TOTAL_SQUARES = 24; // Total number of squares on the board

// Special square types
export const ROSETTE_SQUARES = [1, 7, 12, 17, 23] as const;
export const GATE_SQUARE = 9 as const;
export const MARKET_SQUARES = [11, 14] as const;
export const TEMPLE_SQUARES = [2, 4, 15, 18, 20] as const;
export const HOUSE_SQUARES = [3, 10, 13, 16, 19] as const;
export const TREASURY_SQUARES = [8, 24] as const;

// Squares that don't appear on the board (blacked out)
export const BLACKED_OUT_SQUARES = [5, 6, 21, 22] as const;

// Player paths through the board
export const WHITE_PATH = [4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 7, 8, 16, 24, 23, 15, 14, 13, 12, 11, 10, 9];
export const BLACK_PATH = [20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 23, 24, 16, 8, 7, 15, 14, 13, 12, 11, 10, 9];

/**
 * Type guards and utility functions for board squares
 */
export const BoardUtils = {
    isRosetteSquare(square: number): boolean {
        return ROSETTE_SQUARES.includes(square as typeof ROSETTE_SQUARES[number]);
    },

    isGateSquare(square: number): boolean {
        return square === GATE_SQUARE;
    },

    isMarketSquare(square: number): boolean {
        return MARKET_SQUARES.includes(square as typeof MARKET_SQUARES[number]);
    },

    isTempleSquare(square: number): boolean {
        return TEMPLE_SQUARES.includes(square as typeof TEMPLE_SQUARES[number]);
    },

    isHouseSquare(square: number): boolean {
        return HOUSE_SQUARES.includes(square as typeof HOUSE_SQUARES[number]);
    },

    isTreasurySquare(square: number): boolean {
        return TREASURY_SQUARES.includes(square as typeof TREASURY_SQUARES[number]);
    },

    isBlackedOutSquare(square: number): boolean {
        return BLACKED_OUT_SQUARES.includes(square as typeof BLACKED_OUT_SQUARES[number]);
    },

    getSquareType(square: number): string {
        if (this.isRosetteSquare(square)) return 'rosette';
        if (this.isGateSquare(square)) return 'gate';
        if (this.isMarketSquare(square)) return 'market';
        if (this.isTempleSquare(square)) return 'temple';
        if (this.isHouseSquare(square)) return 'house';
        if (this.isTreasurySquare(square)) return 'treasury';
        if (this.isBlackedOutSquare(square)) return 'blacked-out';
        return 'normal';
    }
} as const;

// Type definitions for better type safety
export type RosetteSquare = typeof ROSETTE_SQUARES[number];
export type MarketSquare = typeof MARKET_SQUARES[number];
export type TempleSquare = typeof TEMPLE_SQUARES[number];
export type HouseSquare = typeof HOUSE_SQUARES[number];
export type TreasurySquare = typeof TREASURY_SQUARES[number];
export type BlackedOutSquare = typeof BLACKED_OUT_SQUARES[number];
export type SquareType = 'rosette' | 'gate' | 'market' | 'temple' | 'house' | 'treasury' | 'blacked-out' | 'normal';
