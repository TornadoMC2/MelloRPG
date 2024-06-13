import {CardUtils} from "./CardUtils";

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
        this.cards.shuffle(2);

        this.playerHand = this.cards.deal(2);
        this.dealerHand = this.cards.deal(2);

        console.log(this.dealerHand);
        console.log(this.playerHand);

    }


    getValue(hand: object[]) : number {

        // @ts-ignore
        return hand.map(c => +c.value).reduce((p,v) => p+v);


    }


}