import {CardUtils} from "./CardUtils";
import {EmojiUtils} from "../EmojiUtils";

export class BlackjackUtils {

    public dealerHand: object[];
    public playerHand: object[];
    // @ts-ignore
    private cards : CardUtils;

    constructor() {
        this.dealerHand = [];
        this.playerHand = [];
    }


    start(bet: number) {
        this.cards = new CardUtils(50);
        this.cards.shuffle(7);

        this.playerHand = this.cards.deal(2);
        this.dealerHand = this.cards.deal(2);

        console.log(this.dealerHand);
        console.log(this.playerHand);

    }


    getValue(hand: object[]) : number {

        // @ts-ignore
        return hand.map(c => +c.value).reduce((p,v) => p+v);


    }

    deal(hand: object[], numCards : number) : void {

        let dealt : object[] = this.cards.deal(numCards);

        for(let i = 0; i < numCards; i++) {
            hand.push(dealt[i]);
        }
    }


    generateHandString(hand: object[]): string {

        let toReturn:string = ``;

        for(let i = 0; i < hand.length; i++) {
            // @ts-ignore
            toReturn += `${EmojiUtils.nums[hand[i].value.toString()]}${EmojiUtils.suits[hand[i].suit.toLowerCase()]}`;
            if(i !== hand.length - 1) toReturn += ` and `;
        }

        return toReturn;

    }


}