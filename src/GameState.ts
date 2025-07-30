export interface GameSettings {
    piecesPerPlayer: number;
    houseBonus: boolean;
    templeBlessings: boolean;
    gateKeeper: boolean;
    safeMarkets: boolean;
}

export interface GameStateData {
    currentPlayer: 'white' | 'black';
    whitePieces: ('blank' | 'spots')[];
    blackPieces: ('blank' | 'spots')[];
    whitePiecePositions: (number | 'start')[];
    blackPiecePositions: (number | 'start')[];
    selectedPiece: { player: 'white' | 'black', index: number } | null;
    gameStarted: boolean;
    gamePhase: 'initial-roll' | 'playing';
    initialRollResult: number | null;
    diceRolls: number[];
    diceTotal: number;
    eligiblePieces: number[];
}

export class GameState {
    private data: GameStateData;
    private settings: GameSettings;
    private listeners: Set<() => void> = new Set();

    // Game paths
    private readonly whitePath = [4, 3, 2, 1, 9, 10, 11, 12, 13, 14, 15, 7, 8, 16, 24, 23, 15, 14, 13, 12, 11, 10, 9];
    private readonly blackPath = [20, 19, 18, 17, 9, 10, 11, 12, 13, 14, 15, 23, 24, 16, 8, 7, 15, 14, 13, 12, 11, 10, 9];

    constructor(settings: GameSettings) {
        this.settings = settings;
        this.data = this.createInitialState();
    }

    private createInitialState(): GameStateData {
        return {
            currentPlayer: 'white',
            whitePieces: Array(this.settings.piecesPerPlayer).fill('blank'),
            blackPieces: Array(this.settings.piecesPerPlayer).fill('blank'),
            whitePiecePositions: Array(this.settings.piecesPerPlayer).fill('start'),
            blackPiecePositions: Array(this.settings.piecesPerPlayer).fill('start'),
            selectedPiece: null,
            gameStarted: false,
            gamePhase: 'initial-roll',
            initialRollResult: null,
            diceRolls: [],
            diceTotal: 0,
            eligiblePieces: []
        };
    }

    // Subscription management
    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify(): void {
        this.listeners.forEach(listener => listener());
    }

    // Getters
    get state(): Readonly<GameStateData> {
        return { ...this.data };
    }

    get gameSettings(): Readonly<GameSettings> {
        return { ...this.settings };
    }

    // Game initialization
    startNewGame(): void {
        this.data = this.createInitialState();
        this.data.gameStarted = true;
        this.data.gamePhase = 'initial-roll';
        this.notify();
    }

    // Initial roll to determine first player
    rollForFirstPlayer(): void {
        const roll = this.rollSingleDie();

        this.data.initialRollResult = roll;

        // 1 = white goes first, 0 = black goes first
        this.data.currentPlayer = roll === 1 ? 'white' : 'black';

        this.notify();
    } proceedToGame(): void {
        this.data.gamePhase = 'playing';
        this.data.initialRollResult = null;
        this.notify();
    }

    private rollSingleDie(): number {
        // Roll a single binary die (0 or 1)
        return Math.floor(Math.random() * 2);
    }

    resetGame(): void {
        this.data = this.createInitialState();
        this.notify();
    }

    updateSettings(newSettings: Partial<GameSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
        if (!this.data.gameStarted) {
            // Reset piece arrays if game hasn't started
            this.data.whitePieces = Array(this.settings.piecesPerPlayer).fill('blank');
            this.data.blackPieces = Array(this.settings.piecesPerPlayer).fill('blank');
            this.data.whitePiecePositions = Array(this.settings.piecesPerPlayer).fill('start');
            this.data.blackPiecePositions = Array(this.settings.piecesPerPlayer).fill('start');
            this.data.selectedPiece = null;
            this.data.eligiblePieces = [];
        }
        this.notify();
    }

    // Dice rolling
    rollDice(): void {
        // Only allow dice rolling during the playing phase
        if (this.data.gamePhase !== 'playing') {
            return;
        }

        // Generate 4 independent dice rolls, each die can roll a 0 or a 1
        const newRolls = Array.from({ length: 4 }, () => Math.floor(Math.random() * 2));
        const baseTotal = newRolls.reduce((sum, roll) => sum + roll, 0);

        // Apply house bonus
        let total = baseTotal + this.getHouseBonus(this.data.currentPlayer);

        // Apply temple blessings (only if base roll is 0 and player has temple control)
        if (baseTotal === 0 && this.getTempleBlessings(this.data.currentPlayer).hasControl) {
            total = 4;
        }

        this.data.diceRolls = newRolls;
        this.data.diceTotal = total;
        this.data.selectedPiece = null; // Reset selection on new roll
        this.calculateEligiblePieces();
        this.notify();
    }

    resetDice(): void {
        this.data.diceRolls = [];
        this.data.diceTotal = 0;
        this.data.eligiblePieces = [];
        this.data.selectedPiece = null;
        this.notify();
    }

    // Piece selection
    selectPiece(pieceIndex: number): void {
        if (this.data.eligiblePieces.includes(pieceIndex)) {
            this.data.selectedPiece = { player: this.data.currentPlayer, index: pieceIndex };
            this.notify();
        }
    }

    // Piece movement
    movePiece(pieceIndex: number): boolean {
        if (!this.data.selectedPiece || this.data.selectedPiece.index !== pieceIndex || this.data.diceTotal === 0) {
            return false;
        }

        const landedOnRosette = this.executeMove(this.data.currentPlayer, pieceIndex, this.data.diceTotal);

        // Reset dice state
        this.data.diceRolls = [];
        this.data.diceTotal = 0;
        this.data.eligiblePieces = [];
        this.data.selectedPiece = null;

        // Switch player if didn't land on rosette
        if (!landedOnRosette) {
            this.data.currentPlayer = this.data.currentPlayer === 'white' ? 'black' : 'white';
        }

        // Single notification after all state changes are complete
        this.notify();

        return landedOnRosette;
    }

    private executeMove(player: 'white' | 'black', pieceIndex: number, diceRoll: number): boolean {
        let landedOnRosette = false;

        if (player === 'white') {
            const currentPos = this.data.whitePiecePositions[pieceIndex];
            let destinationSquare: number | undefined;

            if (currentPos === 'start') {
                // Move from start to first position
                if (diceRoll <= this.whitePath.length) {
                    destinationSquare = this.whitePath[diceRoll - 1];
                    this.data.whitePiecePositions[pieceIndex] = destinationSquare;

                    // Check if piece landed on a rosette square
                    if ([1, 7, 12, 17, 23].includes(destinationSquare)) {
                        landedOnRosette = true;
                    }

                    // Check if piece lands on or passes through square 8 and change to spots
                    for (let i = 0; i < diceRoll; i++) {
                        if (this.whitePath[i] === 8) {
                            this.data.whitePieces[pieceIndex] = 'spots';
                            break;
                        }
                    }
                }
            } else {
                // Find current position in path and move forward
                let currentIndex = this.findPieceIndexInPath(currentPos as number, this.data.whitePieces[pieceIndex], this.whitePath);
                const newIndex = currentIndex + diceRoll;

                if (newIndex >= this.whitePath.length) {
                    // Check if gate square (9) is occupied by opponent piece (only if gate keeper rule is enabled)
                    const isGateBlocked = this.settings.gateKeeper && this.data.blackPiecePositions.some(pos => pos === 9);
                    if (!isGateBlocked) {
                        // Piece completes the circuit and returns to start
                        this.data.whitePiecePositions[pieceIndex] = 'start';
                        this.data.whitePieces[pieceIndex] = 'spots'; // Keep spots state to indicate completion
                    }
                } else {
                    destinationSquare = this.whitePath[newIndex];
                    this.data.whitePiecePositions[pieceIndex] = destinationSquare;

                    // Check if piece landed on a rosette square
                    if ([1, 7, 12, 17, 23].includes(destinationSquare)) {
                        landedOnRosette = true;
                    }

                    // Check if piece lands on or passes through square 8 and change to spots
                    for (let i = currentIndex + 1; i <= newIndex; i++) {
                        if (this.whitePath[i] === 8) {
                            this.data.whitePieces[pieceIndex] = 'spots';
                            break;
                        }
                    }
                }
            }

            // Check for opponent piece capture
            if (destinationSquare !== undefined) {
                const capturedPieceIndex = this.data.blackPiecePositions.findIndex(pos => pos === destinationSquare);
                if (capturedPieceIndex !== -1) {
                    this.data.blackPiecePositions[capturedPieceIndex] = 'start';
                    this.data.blackPieces[capturedPieceIndex] = 'blank';
                }
            }
        } else {
            // Similar logic for black player
            const currentPos = this.data.blackPiecePositions[pieceIndex];
            let destinationSquare: number | undefined;

            if (currentPos === 'start') {
                if (diceRoll <= this.blackPath.length) {
                    destinationSquare = this.blackPath[diceRoll - 1];
                    this.data.blackPiecePositions[pieceIndex] = destinationSquare;

                    if ([1, 7, 12, 17, 23].includes(destinationSquare)) {
                        landedOnRosette = true;
                    }

                    for (let i = 0; i < diceRoll; i++) {
                        if (this.blackPath[i] === 24) {
                            this.data.blackPieces[pieceIndex] = 'spots';
                            break;
                        }
                    }
                }
            } else {
                let currentIndex = this.findPieceIndexInPath(currentPos as number, this.data.blackPieces[pieceIndex], this.blackPath);
                const newIndex = currentIndex + diceRoll;

                if (newIndex >= this.blackPath.length) {
                    const isGateBlocked = this.settings.gateKeeper && this.data.whitePiecePositions.some(pos => pos === 9);
                    if (!isGateBlocked) {
                        this.data.blackPiecePositions[pieceIndex] = 'start';
                        this.data.blackPieces[pieceIndex] = 'spots';
                    }
                } else {
                    destinationSquare = this.blackPath[newIndex];
                    this.data.blackPiecePositions[pieceIndex] = destinationSquare;

                    if ([1, 7, 12, 17, 23].includes(destinationSquare)) {
                        landedOnRosette = true;
                    }

                    for (let i = currentIndex + 1; i <= newIndex; i++) {
                        if (this.blackPath[i] === 24) {
                            this.data.blackPieces[pieceIndex] = 'spots';
                            break;
                        }
                    }
                }
            }

            // Check for opponent piece capture
            if (destinationSquare !== undefined) {
                const capturedPieceIndex = this.data.whitePiecePositions.findIndex(pos => pos === destinationSquare);
                if (capturedPieceIndex !== -1) {
                    this.data.whitePiecePositions[capturedPieceIndex] = 'start';
                    this.data.whitePieces[capturedPieceIndex] = 'blank';
                }
            }
        }

        return landedOnRosette;
    }

    private findPieceIndexInPath(square: number, pieceState: 'blank' | 'spots', path: number[]): number {
        if ([9, 10, 11, 12, 13, 14, 15].includes(square)) {
            // This square appears twice in the path
            if (pieceState === 'blank') {
                // Use first occurrence (early in path)
                return path.indexOf(square);
            } else {
                // Use second occurrence (later in path)
                return path.lastIndexOf(square);
            }
        } else {
            // This square appears only once
            return path.indexOf(square);
        }
    }

    // Calculate eligible pieces
    private calculateEligiblePieces(): void {
        if (this.data.diceRolls.length === 0 || this.data.diceTotal === 0) {
            this.data.eligiblePieces = [];
            return;
        }

        const eligiblePiecesList: number[] = [];
        const currentPlayer = this.data.currentPlayer;
        const currentPositions = currentPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;

        // Find the leftmost piece still in starting area (if any) and check if it can move
        const leftmostStartIndex = currentPositions.findIndex((pos, idx) => {
            const currentPieceStates = currentPlayer === 'white' ? this.data.whitePieces : this.data.blackPieces;
            return pos === 'start' && currentPieceStates[idx] === 'blank';
        });

        if (leftmostStartIndex !== -1 && this.canPieceMove(leftmostStartIndex)) {
            eligiblePiecesList.push(leftmostStartIndex);
        }

        // Add all pieces that are on the board and can move
        currentPositions.forEach((pos, index) => {
            if (pos !== 'start' && this.canPieceMove(index)) {
                eligiblePiecesList.push(index);
            }
        });

        this.data.eligiblePieces = eligiblePiecesList;
    }

    private canPieceMove(pieceIndex: number): boolean {
        const currentPlayer = this.data.currentPlayer;
        const currentPositions = currentPlayer === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPlayerPath = currentPlayer === 'white' ? this.whitePath : this.blackPath;
        const currentPos = currentPositions[pieceIndex];
        let destinationSquare: number;

        if (currentPos === 'start') {
            // Moving from start
            if (this.data.diceTotal <= currentPlayerPath.length) {
                destinationSquare = currentPlayerPath[this.data.diceTotal - 1];
            } else {
                return false; // Can't move beyond path
            }
        } else {
            // Moving along the path
            const currentPieceStates = currentPlayer === 'white' ? this.data.whitePieces : this.data.blackPieces;
            let currentIndex = this.findPieceIndexInPath(currentPos as number, currentPieceStates[pieceIndex], currentPlayerPath);
            const newIndex = currentIndex + this.data.diceTotal;

            if (newIndex >= currentPlayerPath.length) {
                // Check if gate square (9) is occupied by opponent piece (only if gate keeper rule is enabled)
                const opponentPositions = currentPlayer === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
                const isGateBlocked = this.settings.gateKeeper && opponentPositions.some(pos => pos === 9);
                if (isGateBlocked) {
                    return false; // Cannot complete path if gate is blocked
                }
                return true; // Can return to start if gate is clear
            } else {
                destinationSquare = currentPlayerPath[newIndex];
            }
        }

        // Check if destination is occupied by same color piece (blocking)
        const isSameColorBlocking = currentPositions.some((pos, idx) =>
            pos === destinationSquare && idx !== pieceIndex
        );

        // Check if destination is a market square occupied by opponent piece (safe square)
        const opponentPositions = currentPlayer === 'white' ? this.data.blackPiecePositions : this.data.whitePiecePositions;
        const isMarketSquareBlocked = this.settings.safeMarkets && [11, 14].includes(destinationSquare) &&
            opponentPositions.some(pos => pos === destinationSquare);

        return !isSameColorBlocking && !isMarketSquareBlocked;
    }

    // Get destination square for selected piece
    getDestinationSquare(): number | 'complete' | null {
        if (!this.data.selectedPiece || this.data.diceTotal === 0) return null;

        const currentPlayerPath = this.data.selectedPiece.player === 'white' ? this.whitePath : this.blackPath;
        const currentPositions = this.data.selectedPiece.player === 'white' ? this.data.whitePiecePositions : this.data.blackPiecePositions;
        const currentPieces = this.data.selectedPiece.player === 'white' ? this.data.whitePieces : this.data.blackPieces;
        const currentPos = currentPositions[this.data.selectedPiece.index];

        if (currentPos === 'start') {
            // Moving from start
            if (this.data.diceTotal <= currentPlayerPath.length) {
                return currentPlayerPath[this.data.diceTotal - 1];
            }
            return null; // Can't move beyond path
        } else {
            // Moving along the path
            let currentIndex = this.findPieceIndexInPath(currentPos as number, currentPieces[this.data.selectedPiece.index], currentPlayerPath);
            const newIndex = currentIndex + this.data.diceTotal;

            if (newIndex >= currentPlayerPath.length) {
                return 'complete'; // Piece would complete the path and return to start
            } else {
                return currentPlayerPath[newIndex];
            }
        }
    }

    // Calculate house control for house bonus rule
    calculateHouseControl(): { whiteHouses: number, blackHouses: number } {
        const houseSquares = [3, 10, 13, 16, 19];
        let whiteHouses = 0;
        let blackHouses = 0;

        houseSquares.forEach(square => {
            const whiteOnSquare = this.data.whitePiecePositions.some(pos => pos === square);
            const blackOnSquare = this.data.blackPiecePositions.some(pos => pos === square);

            if (whiteOnSquare && !blackOnSquare) whiteHouses++;
            else if (blackOnSquare && !whiteOnSquare) blackHouses++;
        });

        return { whiteHouses, blackHouses };
    }

    // Calculate temple control for temple blessings rule
    calculateTempleControl(): { whiteTemples: number, blackTemples: number } {
        const templeSquares = [2, 4, 15, 18, 20];
        let whiteTemples = 0;
        let blackTemples = 0;

        templeSquares.forEach(square => {
            const whiteOnSquare = this.data.whitePiecePositions.some(pos => pos === square);
            const blackOnSquare = this.data.blackPiecePositions.some(pos => pos === square);

            if (whiteOnSquare && !blackOnSquare) whiteTemples++;
            else if (blackOnSquare && !whiteOnSquare) blackTemples++;
        });

        return { whiteTemples, blackTemples };
    }

    getHouseBonus(player: 'white' | 'black'): number {
        if (!this.settings.houseBonus) return 0;

        const { whiteHouses, blackHouses } = this.calculateHouseControl();

        if (player === 'white' && whiteHouses > blackHouses) return 1;
        if (player === 'black' && blackHouses > whiteHouses) return 1;
        return 0;
    }

    getTempleBlessings(player: 'white' | 'black'): { hasControl: boolean, templeCount: { white: number, black: number } } {
        if (!this.settings.templeBlessings) return { hasControl: false, templeCount: { white: 0, black: 0 } };

        const { whiteTemples, blackTemples } = this.calculateTempleControl();
        const hasControl = (player === 'white' && whiteTemples > blackTemples) ||
            (player === 'black' && blackTemples > whiteTemples);

        return { hasControl, templeCount: { white: whiteTemples, black: blackTemples } };
    }

    // Check for win condition
    checkWinCondition(): 'white' | 'black' | null {
        const whiteWon = this.data.whitePieces.every(piece => piece === 'spots') &&
            this.data.whitePiecePositions.every(pos => pos === 'start');
        const blackWon = this.data.blackPieces.every(piece => piece === 'spots') &&
            this.data.blackPiecePositions.every(pos => pos === 'start');

        if (whiteWon) return 'white';
        if (blackWon) return 'black';
        return null;
    }

    // Path getters for PlayerAgent
    getWhitePath(): number[] {
        return [...this.whitePath];
    }

    getBlackPath(): number[] {
        return [...this.blackPath];
    }

    // Check if a square is a rosette square
    isRosetteSquare(square: number): boolean {
        const rosetteSquares = [1, 7, 12, 17, 23];
        return rosetteSquares.includes(square);
    }

    // Turn management
    shouldShowPassButton(): boolean {
        // Show pass button when dice have been rolled but no pieces can move
        return this.data.diceRolls.length > 0 && this.data.eligiblePieces.length === 0;
    }

    passTurn(): void {
        // Reset dice state and switch player in one atomic operation
        this.data.diceRolls = [];
        this.data.diceTotal = 0;
        this.data.eligiblePieces = [];
        this.data.selectedPiece = null;
        this.data.currentPlayer = this.data.currentPlayer === 'white' ? 'black' : 'white';

        // Single notification after all state changes are complete
        this.notify();
    }
}
