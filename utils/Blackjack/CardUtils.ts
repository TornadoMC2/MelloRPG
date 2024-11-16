'use strict';
export class CardUtils {
    public deck: object[];
    public dealt_cards : object[];

    constructor(decks: number) {

        this.deck = [];
        this.dealt_cards = [];
        for(let i : number = 0; i < decks; i++) this.gen();

    }

    gen() : void {
        let card = (suit: string, value: string) : object => {
            let name: string = value + ' of ' + suit;
            if (value.toUpperCase().includes('J') || value.toUpperCase().includes('Q') || value.toUpperCase().includes('K')) value = '10';
            if (value.toUpperCase().includes('A')) value = '11';
            return { 'name': name, 'suit': suit, 'value': value, 'name2': name.charAt(0).toUpperCase() }
        }

        let values: string[] = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        let suits : string[] = ['Clubs','Diamonds','Spades','Hearts'];

        for (let s = 0; s < suits.length; s++) {
            for (let v = 0; v < values.length; v++) {
                this.deck.push(card(suits[s], values[v]))
            }
        }

    }

    getDeck() : object[] {
        return this.deck;
    }

    shuffle(amount : number = 1) : void {
        for (let i : number = 0; i < amount; i++) {
            for (let c : number = this.deck.length -1; c >= 0; c--){
                const tempVal : object = this.deck[c];
                let randomIndex : number = Math.floor(Math.random() * this.deck.length);

                // ensures that the random index isn't the same as the current index. It runs the function again if this returns as true
                while (randomIndex === c) { randomIndex = Math.floor(Math.random() * this.deck.length) }
                this.deck[c] = this.deck[randomIndex];
                this.deck[randomIndex] = tempVal;
            }
        }
    }

    deal(num_cards: number) : object[] {
        let cards : object[] = [];
        for (let c = 0; c < num_cards; c++) {
            let dealt_card : object | undefined = this.deck.shift();
            // @ts-ignore
            cards.push(dealt_card);
            // @ts-ignore
            this.dealt_cards.push(dealt_card);
        }
        return cards
    }


    clearDeck() : void {
        this.deck = [];
    }

}