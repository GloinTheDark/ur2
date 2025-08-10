// Global app settings for debugging and logging control
export interface AppSettings {
    debug: boolean;
    logging: {
        mcts: boolean;
        ai: boolean;
        gameState: boolean;
        playerAgent: boolean;
        dice: boolean;
        animations: boolean;
        aiTiming: boolean;
    };
}

export class AppSettingsManager {
    private static instance: AppSettingsManager;
    private settings: AppSettings;
    private listeners: Set<() => void> = new Set();

    private constructor() {
        this.settings = this.loadSettings();
        // Check URL for debug parameter
        const urlParams = new URLSearchParams(window.location.search);
        const debugParam = urlParams.get('debug');
        if (debugParam === '1') {
            this.settings.debug = true;
        }
    }

    public static getInstance(): AppSettingsManager {
        if (!AppSettingsManager.instance) {
            AppSettingsManager.instance = new AppSettingsManager();
        }
        return AppSettingsManager.instance;
    }

    public getSettings(): Readonly<AppSettings> {
        return { ...this.settings };
    }

    public updateSettings(newSettings: Partial<AppSettings>): void {
        this.settings = {
            ...this.settings,
            ...newSettings,
            logging: {
                ...this.settings.logging,
                ...(newSettings.logging || {})
            }
        };
        this.saveSettings();
        this.notifyListeners();
    }

    public isDebugMode(): boolean {
        return this.settings.debug;
    }

    public subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener());
    }

    private loadSettings(): AppSettings {
        const saved = localStorage.getItem('royalGameAppSettings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                return {
                    debug: parsed.debug ?? false,
                    logging: {
                        mcts: parsed.logging?.mcts ?? false,
                        ai: parsed.logging?.ai ?? false,
                        gameState: parsed.logging?.gameState ?? false,
                        playerAgent: parsed.logging?.playerAgent ?? false,
                        dice: parsed.logging?.dice ?? false,
                        animations: parsed.logging?.animations ?? false,
                        aiTiming: parsed.logging?.aiTiming ?? false
                    }
                };
            } catch {
                return this.getDefaultSettings();
            }
        }
        return this.getDefaultSettings();
    }

    private saveSettings(): void {
        localStorage.setItem('royalGameAppSettings', JSON.stringify(this.settings));
    }

    private getDefaultSettings(): AppSettings {
        return {
            debug: false,
            logging: {
                mcts: false,
                ai: false,
                gameState: false,
                playerAgent: false,
                dice: false,
                animations: false,
                aiTiming: false
            }
        };
    }
}

// Convenience functions for logging
export const AppLog = {
    mcts: (message: string, ...args: any[]) => {
        if (AppSettingsManager.getInstance().getSettings().logging.mcts) {
            console.log(`[MCTS] ${message}`, ...args);
        }
    },
    ai: (message: string, ...args: any[]) => {
        if (AppSettingsManager.getInstance().getSettings().logging.ai) {
            console.log(`[AI] ${message}`, ...args);
        }
    },
    gameState: (message: string, ...args: any[]) => {
        if (AppSettingsManager.getInstance().getSettings().logging.gameState) {
            console.log(`[GameState] ${message}`, ...args);
        }
    },
    playerAgent: (message: string, ...args: any[]) => {
        if (AppSettingsManager.getInstance().getSettings().logging.playerAgent) {
            console.log(`[PlayerAgent] ${message}`, ...args);
        }
    },
    dice: (message: string, ...args: any[]) => {
        if (AppSettingsManager.getInstance().getSettings().logging.dice) {
            console.log(`[Dice] ${message}`, ...args);
        }
    },
    animations: (message: string, ...args: any[]) => {
        if (AppSettingsManager.getInstance().getSettings().logging.animations) {
            console.log(`[Animations] ${message}`, ...args);
        }
    },
    aiTiming: (message: string, ...args: any[]) => {
        if (AppSettingsManager.getInstance().getSettings().logging.aiTiming) {
            console.log(`[AI-Timing] ${message}`, ...args);
        }
    }
};
