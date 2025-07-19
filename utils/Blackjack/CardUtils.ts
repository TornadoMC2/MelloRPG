'use strict';

import { EmojiUtils } from "../EmojiUtils"; // Ensure path is correct

export interface Card {
    name: string; // e.g., "Ace of Spades"
    suit: string; // e.g., "Spades"
    value: string; // Numerical value for calculation ('2' through '10', '11' for Ace)
    symbol: string; // Face symbol ('A', 'K', 'Q', 'J', '10', '9', ...)
    displaySymbol: string; // Emoji representation (e.g., ":regional_indicator_a::spades:")
}

export class CardUtils {

    public deck: Card[];
    public dealt_cards : Card[];

    constructor(decks: number = 1) {
        this.deck = [];
        this.dealt_cards = [];
        if (decks < 1) decks = 1;
        for(let i : number = 0; i < decks; i++) this.gen();
    }

    // Generates a standard 52-card deck
    gen() : void {
        const suits: string[] = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
        const symbols: string[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        const values: { [key: string]: string } = {
            '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
            'J': '10', 'Q': '10', 'K': '10', 'A': '11'
        };

        for (const suit of suits) {
            const suitLower = suit.toLowerCase();
            for (const symbol of symbols) {
                const name: string = `${symbol === '10' ? '10' : symbol} of ${suit}`;
                // Generate the display symbol using EmojiUtils
                const emojiNum = EmojiUtils.nums[symbol] || EmojiUtils.nums["?"]; // Fallback to '?'
                const emojiSuit = EmojiUtils.suits[suitLower] || EmojiUtils.suits["unknown"]; // Fallback to 'unknown'
                const displaySymbol = `${emojiNum}${emojiSuit}`;

                this.deck.push({
                    name: name,
                    suit: suit,
                    value: values[symbol],
                    symbol: symbol,
                    displaySymbol: displaySymbol // Assign the generated emoji string
                });
            }
        }
    }

    getDeck() : Card[] {
        return this.deck;
    }

    // Shuffles the deck using Fisher-Yates algorithm
    shuffle(amount : number = 1) : void {
        for (let i = 0; i < amount; i++) {
            for (let c = this.deck.length - 1; c > 0; c--) {
                const j = Math.floor(Math.random() * (c + 1));
                [this.deck[c], this.deck[j]] = [this.deck[j], this.deck[c]];
            }
        }
    }

    // Deals a specified number of cards from the deck
    deal(num_cards: number) : Card[] {
        let cards : Card[] = [];
        if (num_cards > this.deck.length) {
            console.warn(`Requesting ${num_cards} cards, but only ${this.deck.length} remain. Dealing remaining cards.`);
            // Optional: Implement reshuffling here if desired when deck is low
            num_cards = this.deck.length;
        }
        for (let c = 0; c < num_cards; c++) {
            let dealt_card : Card | undefined = this.deck.shift();
            if (dealt_card) {
                cards.push(dealt_card);
                this.dealt_cards.push(dealt_card);
            }
        }
        return cards;
    }

    // Clears the deck and dealt cards (optional utility)
    clearDeck() : void {
        this.deck = [];
        this.dealt_cards = [];
    }
}