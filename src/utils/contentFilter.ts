/**
 * Content filtering utility for display names and user-generated content
 * Ensures family-friendly, G-rated content in the Royal Game of Ur
 */

// List of inappropriate words/phrases (basic list - you can expand this)
const BLOCKED_WORDS = [
    // Common profanity
    'damn', 'hell', 'crap', 'piss', 'shit', 'fuck', 'bitch', 'ass', 'asshole',
    'bastard', 'dick', 'cock', 'pussy', 'tits', 'boobs', 'penis', 'vagina',
    'sex', 'sexy', 'porn', 'nude', 'naked', 'horny', 'slut', 'whore',

    // Hate speech and slurs (abbreviated list)
    'hate', 'nazi', 'hitler', 'kill', 'die', 'murder', 'suicide',
    'retard', 'stupid', 'idiot', 'moron', 'loser', 'gay', 'fag',

    // Drug references
    'weed', 'pot', 'drug', 'cocaine', 'heroin', 'meth', 'crack',
    'drunk', 'alcohol', 'beer', 'wine', 'vodka', 'whiskey',

    // Violence
    'gun', 'knife', 'weapon', 'bomb', 'explosion', 'terrorist',
    'violence', 'blood', 'gore', 'torture',

    // Spam/inappropriate usernames
    'admin', 'moderator', 'official', 'support', 'system', 'bot',
    'null', 'undefined', 'test', 'delete', 'root', 'user'
];

// Patterns for suspicious content
const SUSPICIOUS_PATTERNS = [
    /(.)\1{4,}/i,           // Repeated characters (aaaaa)
    /[0-9]{10,}/,           // Long numbers (phone numbers, etc.)
    /www\.|http|\.com|\.net|\.org/i, // URLs
    /^\s*$/,                // Only whitespace
    /^[^a-zA-Z0-9\s]+$/,    // Only special characters
    /admin|mod|official/i,  // Impersonation attempts
    /\b(buy|sell|cheap|free|click|visit)\b/i // Spam keywords
];

export interface ContentFilterResult {
    isValid: boolean;
    reason?: string;
    suggestedAlternative?: string;
}

/**
 * Check if a display name is appropriate for a G-rated game
 */
export function validateDisplayName(name: string): ContentFilterResult {
    // Basic validation
    if (!name || typeof name !== 'string') {
        return {
            isValid: false,
            reason: 'Display name is required',
            suggestedAlternative: 'Player'
        };
    }

    const trimmedName = name.trim();

    // Length check
    if (trimmedName.length < 1) {
        return {
            isValid: false,
            reason: 'Display name cannot be empty',
            suggestedAlternative: 'Player'
        };
    }

    if (trimmedName.length > 25) {
        return {
            isValid: false,
            reason: 'Display name must be 25 characters or less',
            suggestedAlternative: trimmedName.substring(0, 25)
        };
    }

    // Check for blocked words
    const lowerName = trimmedName.toLowerCase();
    for (const blockedWord of BLOCKED_WORDS) {
        if (lowerName.includes(blockedWord.toLowerCase())) {
            return {
                isValid: false,
                reason: 'Display name contains inappropriate content',
                suggestedAlternative: generateFriendlyName()
            };
        }
    }

    // Check suspicious patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(trimmedName)) {
            return {
                isValid: false,
                reason: 'Display name format is not allowed',
                suggestedAlternative: generateFriendlyName()
            };
        }
    }

    // Check for excessive numbers or special characters
    const alphaCount = (trimmedName.match(/[a-zA-Z]/g) || []).length;
    const totalLength = trimmedName.length;

    if (alphaCount / totalLength < 0.5 && totalLength > 3) {
        return {
            isValid: false,
            reason: 'Display name must contain mostly letters',
            suggestedAlternative: generateFriendlyName()
        };
    }

    return { isValid: true };
}

/**
 * Generate a random family-friendly display name
 */
export function generateFriendlyName(): string {
    const adjectives = [
        'Brave', 'Clever', 'Swift', 'Noble', 'Wise', 'Bold', 'Kind',
        'Royal', 'Ancient', 'Mighty', 'Golden', 'Silver', 'Crystal',
        'Mystic', 'Sacred', 'Divine', 'Peaceful', 'Joyful', 'Happy'
    ];

    const nouns = [
        'Player', 'Warrior', 'Scholar', 'Explorer', 'Builder', 'Seeker',
        'Guardian', 'Champion', 'Traveler', 'Sage', 'Knight', 'Hero',
        'Pioneer', 'Adventurer', 'Master', 'Keeper', 'Ruler', 'Friend'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;

    return `${adjective}${noun}${number}`;
}

/**
 * Clean a display name by removing/replacing inappropriate content
 * This is a gentler approach than outright rejection
 */
export function cleanDisplayName(name: string): string {
    if (!name || typeof name !== 'string') {
        return generateFriendlyName();
    }

    let cleanName = name.trim();

    // Remove URLs and suspicious patterns
    cleanName = cleanName.replace(/www\.|http\S+|\.com\S*/gi, '');
    cleanName = cleanName.replace(/[^\w\s]/g, ''); // Remove special chars except spaces
    cleanName = cleanName.replace(/\s+/g, ' '); // Normalize spaces
    cleanName = cleanName.trim();

    // Replace blocked words with asterisks
    for (const blockedWord of BLOCKED_WORDS) {
        const regex = new RegExp(blockedWord, 'gi');
        cleanName = cleanName.replace(regex, '*'.repeat(blockedWord.length));
    }

    // Ensure minimum viable name
    if (cleanName.length < 2 || !/[a-zA-Z]/.test(cleanName)) {
        return generateFriendlyName();
    }

    // Truncate if too long
    if (cleanName.length > 25) {
        cleanName = cleanName.substring(0, 25).trim();
    }

    return cleanName;
}

/**
 * Get a list of suggested family-friendly names
 */
export function getSuggestedNames(count: number = 5): string[] {
    const suggestions: string[] = [];
    const maxAttempts = count * 3; // Prevent infinite loops
    let attempts = 0;

    while (suggestions.length < count && attempts < maxAttempts) {
        const name = generateFriendlyName();
        if (!suggestions.includes(name)) {
            suggestions.push(name);
        }
        attempts++;
    }

    return suggestions;
}

/**
 * Check if content is family-friendly (for future use with chat, etc.)
 */
export function isContentFamilyFriendly(content: string): boolean {
    const result = validateDisplayName(content);
    return result.isValid;
}
