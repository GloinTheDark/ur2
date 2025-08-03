import { RuleSet } from '../RuleSet';
import { TEMPLE_SQUARES, HOUSE_SQUARES } from '../BoardLayout';

// Action-packed variant with more aggressive gameplay
export class BurglersOfUrRuleSet extends RuleSet {
    readonly name = "Burglers of Ur";
    readonly description = "Fast-paced variant with aggressive rules and special squares for dynamic gameplay";

    // More pieces for longer, more strategic games
    readonly piecesPerPlayer = 7;
    readonly diceCount = 4; // Four dice for more consistent movement

    // Use the extended Burglers path
    readonly pathType = "burglers" as const;

    // Aggressive rule variations
    readonly gateKeeper = false; // No gatekeeper - more aggressive endgame
    readonly pieceAnimations = true;
    readonly soundEffects = true;

    // Aggressive game mechanics
    canCaptureOnRosette(): boolean {
        return true; // Even rosettes aren't safe! (Burglers can steal from anywhere)
    }

    getExtraTurnOnRosette(): boolean {
        return true; // Still get extra turns on rosettes
    }

    getExactRollNeededToBearOff(): boolean {
        return false; // Burglers don't need exact roll to bear off - more aggressive gameplay
    }

    // Burglers-specific dice roll calculation with temple blessing and house bonus
    calculateDiceRoll(diceValues: number[], gameState?: any): {
        total: number;
        flags: {
            canMove: boolean;
            extraTurn?: boolean;
            specialMessage?: string;
        };
    } {
        const diceTotal = diceValues.reduce((sum, value) => sum + value, 0);
        let total = diceTotal;
        let specialMessage: string | undefined;

        // Temple blessing and house bonus rules would need game state
        // For now, implement basic rules that can be enhanced later
        if (gameState?.currentPlayer && gameState?.playerPieces) {
            const playerPieces = gameState.playerPieces[gameState.currentPlayer];

            // Temple blessing: if player has pieces on temple squares, bonus movement
            const piecesOnTemples = playerPieces?.filter((piece: any) =>
                piece.position && TEMPLE_SQUARES.includes(piece.position)
            ).length || 0;

            // House bonus: if player has pieces on house squares, bonus movement  
            const piecesOnHouses = playerPieces?.filter((piece: any) =>
                piece.position && HOUSE_SQUARES.includes(piece.position)
            ).length || 0;

            const templeBonus = piecesOnTemples;
            const houseBonus = Math.floor(piecesOnHouses / 2); // Bonus for every 2 pieces on houses

            if (templeBonus > 0 || houseBonus > 0) {
                total += templeBonus + houseBonus;
                const bonusMessages = [];
                if (templeBonus > 0) bonusMessages.push(`Temple blessing +${templeBonus}`);
                if (houseBonus > 0) bonusMessages.push(`House bonus +${houseBonus}`);
                specialMessage = bonusMessages.join(', ');
            }
        }

        return {
            total,
            flags: {
                canMove: total > 0,
                extraTurn: false, // Will be determined by game logic
                specialMessage
            }
        };
    }

    // Victory condition: first to get 5 pieces home wins (not all pieces)
    getPiecesToWin(): number {
        return 5; // Faster victory condition - need 5 out of 7 pieces
    }
}
