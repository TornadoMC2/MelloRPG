import { Card, CardUtils } from "./CardUtils";
// EmojiUtils is used by CardUtils now, no direct import needed here unless used elsewhere

export class BlackjackUtils {

    public dealerHand: Card[];
    public playerHands: Card[][]; // Support for multiple hands (split)
    private cards: CardUtils;
    public deckCount: number;

    constructor(deckCount: number = 6) {
        this.dealerHand = [];
        this.playerHands = [[]];
        this.deckCount = deckCount;
        this.cards = new CardUtils(this.deckCount);
    }

    start() {
        if (this.cards.deck.length < (this.deckCount * 52 * 0.25)) {
            console.log("Reshuffling deck...");
            this.cards = new CardUtils(this.deckCount);
        }
        this.cards.shuffle(3);
        this.playerHands = [[]];
        this.dealerHand = [];
        this.deal(this.playerHands[0], 2);
        this.deal(this.dealerHand, 2);
    }

    getValue(hand: Card[]): number {
        let value = 0;
        let aceCount = 0;
        if (!hand || hand.length === 0) return 0;

        for (const card of hand) {
            if (card && card.value) {
                let cardValue = parseInt(card.value);
                if (card.symbol === 'A') {
                    aceCount++;
                    value += 11;
                } else {
                    value += cardValue;
                }
            } else {
                 console.warn("Card or card value missing in hand:", hand);
            }
        }
        while (value > 21 && aceCount > 0) {
            value -= 10;
            aceCount--;
        }
        return value;
    }

    isSoft(hand: Card[]): boolean {
        let value = 0;
        let aceCount = 0;
         if (!hand || hand.length === 0) return false;
        for (const card of hand) {
            if (card && card.value) {
                let cardValue = parseInt(card.value);
                if (card.symbol === 'A') {
                    aceCount++;
                    value += 11;
                } else {
                    value += cardValue;
                }
            }
        }
        while (value > 21 && aceCount > 0) {
            value -= 10;
            aceCount--;
        }
        return value <= 21 && aceCount > 0;
    }

    deal(hand: Card[], numCards: number): void {
        const dealt: Card[] = this.cards.deal(numCards);
        hand.push(...dealt);
    }

    // Generates a string representation of a hand using the pre-generated displaySymbol
    generateHandString(hand: Card[], hideHoleCard: boolean = false): string {
        if (!hand || hand.length === 0) return "*Empty*";

        let toReturn: string = "";
        for (let i = 0; i < hand.length; i++) {
            if (hideHoleCard && i === 1) {
                toReturn += " :black_joker:"; // Use a placeholder emoji for hidden card (replace ID if needed)
                break;
            } else if (hand[i] && hand[i].displaySymbol) {
                toReturn += ` ${hand[i].displaySymbol} `; // Use the displaySymbol from the Card object
            } else {
                 toReturn += ` [❓] `; // Fallback if displaySymbol is missing
            }
            // Removed the 'and'/'comma' logic for simpler spacing between emojis
        }
        // Trim leading/trailing whitespace
        return toReturn.trim();
    }
}