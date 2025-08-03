// Path definitions for different Royal Game of Ur variants
// Each path type has a different overlay image and strategic gameplay

export interface GamePath {
    readonly name: string;
    readonly description: string;
    readonly whitePath: readonly number[];
    readonly overlayImage: string; // Path to the overlay SVG
}

// Utility function to convert white path to black path
// Rule: add 16 to values under 9, subtract 16 from values over 16
export function whitePathToBlackPath(whitePath: readonly number[]): number[] {
    return whitePath.map(square => {
        if (square < 9) {
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
    whitePath: [4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 16, 8, 7],
    overlayImage: "/src/assets/RCBellPath.svg"
};

// Alias for backwards compatibility
export const FINKEL_PATH = BELL_PATH;

// Extended Burglers path - longer circuit for strategic play
export const BURGLERS_PATH: GamePath = {
    name: "Burglers Path",
    description: "Extended path with additional strategic squares",
    whitePath: [4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 7, 8, 16, 24, 23, 15, 14, 13, 12, 11, 10, 9],
    overlayImage: "/src/assets/SJLucePath.svg"
};

// Masters/Blitz path - balanced for competitive play
export const MASTERS_PATH: GamePath = {
    name: "Masters Path",
    description: "Balanced path for competitive and fast-paced games",
    whitePath: [4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 23, 24, 16, 8, 7],
    overlayImage: "/src/assets/JMastersPath.svg"
};

// Registry of all available paths
export const ALL_PATHS = {
    finkel: BELL_PATH, // Keep 'finkel' key for backwards compatibility
    burglers: BURGLERS_PATH,
    masters: MASTERS_PATH
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
