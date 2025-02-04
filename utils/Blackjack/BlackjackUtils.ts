import {Card, CardUtils} from "./CardUtils";
import {EmojiUtils} from "../EmojiUtils";

export class BlackjackUtils {

    public dealerHand: Card[];
    public playerHand: Card[];
    // @ts-ignore
    private cards : CardUtils;

    constructor() {
        this.dealerHand = [];
        this.playerHand = [];
    }


    start() {
        this.cards = new CardUtils(50);
        this.cards.shuffle(2);

        this.playerHand = this.cards.deal(2);
        this.dealerHand = this.cards.deal(1);

        console.log(this.dealerHand);
        console.log(this.playerHand);

    }


    getValue(hand: Card[]) : number {

        // @ts-ignore
        return hand.map(c => +c.value).reduce((p,v) => p+v);


    }

    deal(hand: Card[], numCards : number) : void {

        let dealt : Card[] = this.cards.deal(numCards);

        for(let i = 0; i < numCards; i++) {
            hand.push(dealt[i]);
        }
    }


    generateHandString(hand: Card[]): string {

        let toReturn:string = ``;

        for(let i = 0; i < hand.length; i++) {
            // @ts-ignore
            toReturn += `${EmojiUtils.nums[hand[i].symbol.toString()]}${EmojiUtils.suits[hand[i].suit.toLowerCase()]}`;
            if(i !== hand.length - 1) toReturn += `and `;
        }

        return toReturn;

    }


}