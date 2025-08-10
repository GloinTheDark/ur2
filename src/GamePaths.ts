// Path definitions for different Royal Game of Ur variants
// Each path type has a different overlay image and strategic gameplay

export interface GamePath {
    readonly name: string;
    readonly description: string;
    readonly whitePath: readonly number[];
    readonly flipIndex: number; // Path index where pieces flip to spotted
    readonly overlayImage: string; // Path to the overlay SVG
}

// Utility function to convert white path to black path
// Rule: add 16 to values under 9, subtract 16 from values over 16
// Values 0 (start) and 25 (finish) do not get transformed
export function whitePathToBlackPath(whitePath: readonly number[]): number[] {
    return whitePath.map(square => {
        if (square === 0 || square === 25) {
            return square; // Start and finish positions stay the same
        } else if (square < 9) {
            return square + 16;
        } else if (square > 16) {
            return square - 16;
        } else {
            return square; // Middle row (9-16) stays the same
        }
    });
}

// Classic Bell path - first proposed by R. C. Bell
export const BELL_PATH: GamePath = {
    name: "Bell Path",
    description: "Classic path first proposed by R. C. Bell, later popularized by Irving Finkel",
    whitePath: [0, 4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 16, 8, 7, 25],
    flipIndex: 1, // Pieces flip when entering the board (moving from start to first square)
    overlayImage: "/src/assets/RCBellPath.svg"
};

// Alias for backwards compatibility
export const FINKEL_PATH = BELL_PATH;

// Extended Burglers path - longer circuit for strategic play
export const BURGLERS_PATH: GamePath = {
    name: "Burglers Path",
    description: "Extended path with additional strategic squares",
    whitePath: [0, 4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 7, 8, 16, 24, 23, 15, 14, 13, 12, 11, 10, 9, 25],
    flipIndex: 13, // Pieces flip when passing square 8 (path index 13 contains square 8)
    overlayImage: "/src/assets/SJLucePath.svg"
};

// Masters/Blitz path - balanced for competitive play
export const MASTERS_PATH: GamePath = {
    name: "Masters Path",
    description: "Balanced path for competitive and fast-paced games",
    whitePath: [0, 4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 23, 24, 16, 8, 7, 25],
    flipIndex: 1, // Pieces flip when entering the board (moving from start to first square)
    overlayImage: "/src/assets/JMastersPath.svg"
};

// HJR Murray path - based on H.J.R. Murray's reconstruction (initially copied from Burglers)
export const HJR_MURRAY_PATH: GamePath = {
    name: "HJR Murray Path",
    description: "Path based on H.J.R. Murray's reconstruction of the Royal Game of Ur",
    whitePath: [0, 4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 7, 24, 16, 8, 23, 15, 14, 13, 12, 11, 10, 9, 1, 2, 3, 4, 25],
    flipIndex: 13, // Pieces flip when passing square 24 (path index 13 contains square 24)
    overlayImage: "/src/assets/HJRMurrayPath.svg"
};

// Registry of all available paths
export const ALL_PATHS = {
    finkel: BELL_PATH,
    burglers: BURGLERS_PATH,
    masters: MASTERS_PATH,
    hjrmurray: HJR_MURRAY_PATH
} as const;

export type PathType = keyof typeof ALL_PATHS;

// Utility to get path by name
export function getPath(pathType: PathType): GamePath {
    return ALL_PATHS[pathType];
}

// Utility to get both white and black paths for a path type
export function getPathPair(pathType: PathType): { white: number[], black: number[] } {
    const gamePath = getPath(pathType);
    return {
        white: [...gamePath.whitePath],
        black: whitePathToBlackPath(gamePath.whitePath)
    };
}

// Helper function to determine if a piece should show spots based on path progression
export function shouldPieceShowSpots(pathIndex: number, path: GamePath): boolean {
    return pathIndex >= path.flipIndex && pathIndex !== -1; // -1 = moving
}
