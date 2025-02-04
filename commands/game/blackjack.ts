import {
    ButtonBuilder,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    ButtonStyle, ActionRow, ActionRowBuilder
} from "discord.js";
import {BlackjackUtils} from "../../utils/Blackjack/BlackjackUtils";
import UserInfo from "../../models/userInfo";
import {currencyFormatter} from "../../utils/CurrencyUtils";
import {Card} from "../../utils/Blackjack/CardUtils";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Start a game of Blackjack!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)),
    async execute(interaction: CommandInteraction): Promise<void> {
        
        let userInfo = await UserInfo.findOne({uid: interaction.user.id});

        if(!userInfo) {
            const newUser = new UserInfo({
                uid: interaction.user.id,
            })

            await newUser.save().catch(() => {});
            userInfo = await UserInfo.findOne({uid: interaction.user.id});
        }

        let balance : number = userInfo!.balance;

        // @ts-ignore
        let bet : number = parseInt(interaction.options.getString('bet'));

        if(isNaN(bet)) {
            await interaction.reply({content: 'Please enter a valid number for the bet', ephemeral: true});
            return;
        }
        if(bet > balance) {
            await interaction.reply({content: 'You do not have enough balance for this bet. Your balance is: ' + currencyFormatter.format(balance), ephemeral: true});
            return;
        }

        let bj : BlackjackUtils = new BlackjackUtils();

        bj.start();


        userInfo!.balance -= bet;
        await userInfo!.save().catch(():void => {});

        // @ts-ignore
        //let ctn:string=`You have ${EmojiUtils.nums[bj.playerHand[0].value.toString()]}${EmojiUtils.suits[bj.playerHand[0].suit.toLowerCase()]} and ${EmojiUtils.nums[bj.playerHand[1].value.toString()]}${EmojiUtils.suits[bj.playerHand[1].suit.toLowerCase()]}\nWith a value \`${bj.getValue(bj.playerHand)}\``

        let playerHandString : string = bj.generateHandString(bj.playerHand);
        let dealerHandString : string = bj.generateHandString(bj.dealerHand);

        let playerHandValue : number = bj.getValue(bj.playerHand)
        let dealerHandValue : number = bj.getValue(bj.dealerHand)

        let acePlayerHandValue : string = '';
        let aceDealerHandValue : string = '';

        for(let i in bj.playerHand) {
            if(bj.playerHand[i].symbol === 'A') {
                acePlayerHandValue = ` / ${playerHandValue - 10}`;
            }
        }
        for(let i in bj.dealerHand) {
            if(bj.dealerHand[i].symbol === 'A') {
                aceDealerHandValue = ` / ${dealerHandValue - 10}`;
            }
        }

        let bjEmbed = new EmbedBuilder()
            .setTitle('Game of Blackjack!')
            //.setDescription(ctn)
            .addFields(
                { name: `You | ${playerHandValue}${acePlayerHandValue}`, value: playerHandString },
                { name: `Dealer | ${dealerHandValue}${aceDealerHandValue}`, value: dealerHandString }
            )
            .setColor('Blue')

        let hit : ButtonBuilder = new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary)

        let stand : ButtonBuilder = new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)

        let buttonRow : any = new ActionRowBuilder().addComponents(hit, stand)

        let response = await interaction.reply({
            embeds: [bjEmbed],
            components: [buttonRow],
            //ephemeral: true
        })

        const collectorFilter = (i: { user: { id: any; }; }) : boolean => i.user.id === interaction.user.id;

        let gameGoing : boolean = true;

        try {
            while(gameGoing) {
                const selection: any = await response.awaitMessageComponent({filter: collectorFilter, time: 60_000});

                if (selection.customId === 'hit') {

                    //bj.deal(bj.dealerHand, 1);
                    bj.deal(bj.playerHand, 1);

                    let playerHandString : string = bj.generateHandString(bj.playerHand);
                    let dealerHandString : string = bj.generateHandString(bj.dealerHand);

                    let playerHandValue : number = bj.getValue(bj.playerHand)
                    let dealerHandValue : number = bj.getValue(bj.dealerHand)

                    let acePlayerHandValue: string = '';
                    let aceDealerHandValue: string = '';

                    [playerHandValue, acePlayerHandValue] = adjustHandValue(playerHandValue, bj.playerHand, acePlayerHandValue);
                    [dealerHandValue, aceDealerHandValue] = adjustHandValue(dealerHandValue, bj.dealerHand, aceDealerHandValue);

                    if(playerHandValue > 21) {
                        let bjEmbed = new EmbedBuilder()
                            .setTitle('Game of Blackjack!')
                            //.setDescription(ctn)
                            .addFields(
                                {name: `You | ${playerHandValue} - BUST`, value: playerHandString},
                                {name: `Dealer | ${dealerHandValue} - WINNER`, value: dealerHandString}
                            )
                            .setColor('Blue')
                        await selection.update({
                            embeds: [bjEmbed],
                            components: [],
                            //ephemeral: true
                        })
                        return;
                    } else {
                        let bjEmbed = new EmbedBuilder()
                            .setTitle('Game of Blackjack!')
                            //.setDescription(ctn)
                            .addFields(
                                {name: `You | ${playerHandValue}${acePlayerHandValue}`, value: playerHandString},
                                {name: `Dealer | ${dealerHandValue}${aceDealerHandValue}`, value: dealerHandString}
                            )
                            .setColor('Blue')

                        await selection.update({
                            embeds: [bjEmbed],
                            //components: [],
                            //ephemeral: true
                        })
                    }

                } else if (selection.customId === 'stand') {
                    while(dealerHandValue < 17) {
                        bj.deal(bj.dealerHand, 1);
                        dealerHandValue = bj.getValue(bj.dealerHand);

                        [dealerHandValue, aceDealerHandValue] = adjustHandValue(dealerHandValue, bj.dealerHand, aceDealerHandValue);

                    }

                    [playerHandValue, acePlayerHandValue] = adjustHandValue(playerHandValue, bj.playerHand, acePlayerHandValue);
                    [dealerHandValue, aceDealerHandValue] = adjustHandValue(dealerHandValue, bj.dealerHand, aceDealerHandValue);

                    let playerHandString = bj.generateHandString(bj.playerHand);
                    let dealerHandString = bj.generateHandString(bj.dealerHand);

                    if(dealerHandValue > 21) {
                        let bjEmbed = new EmbedBuilder()
                            .setTitle('Game of Blackjack!')
                            //.setDescription(ctn)
                            .addFields(
                                {name: `You | ${playerHandValue} - WINNER`, value: playerHandString},
                                {name: `Dealer | ${dealerHandValue} - BUST`, value: dealerHandString}
                            )
                            .setColor('Blue')

                        userInfo!.balance += bet * 2;

                        await userInfo!.save().catch(():void => {});
                        return await selection.update({
                            embeds: [bjEmbed],
                            components: [],
                            //ephemeral: true
                        })
                    } else {
                        if(playerHandValue > dealerHandValue) {
                            let bjEmbed = new EmbedBuilder()
                                .setTitle('Game of Blackjack!')
                                //.setDescription(ctn)
                                .addFields(
                                    {name: `You | ${playerHandValue} - WINNER`, value: playerHandString},
                                    {name: `Dealer | ${dealerHandValue}`, value: dealerHandString}
                                )
                                .setColor('Blue')

                            userInfo!.balance += bet * 2;

                            await userInfo!.save().catch(():void => {});
                            return await selection.update({
                                embeds: [bjEmbed],
                                components: [],
                                //ephemeral: true
                            })
                        } else if(dealerHandValue > playerHandValue){
                            let bjEmbed = new EmbedBuilder()
                                .setTitle('Game of Blackjack!')
                                //.setDescription(ctn)
                                .addFields(
                                    {name: `You | ${playerHandValue}`, value: playerHandString},
                                    {name: `Dealer | ${dealerHandValue} - WINNER`, value: dealerHandString}
                                )
                                .setColor('Blue')

                            return await selection.update({
                                embeds: [bjEmbed],
                                components: [],
                                //ephemeral: true
                            })
                        } else if(playerHandValue == dealerHandValue) {
                            let bjEmbed = new EmbedBuilder()
                                .setTitle('Game of Blackjack!')
                                //.setDescription(ctn)
                                .addFields(
                                    {name: `You | ${playerHandValue} - PUSH`, value: playerHandString},
                                    {name: `Dealer | ${dealerHandValue} - PUSH`, value: dealerHandString}
                                )
                                .setColor('Blue')

                            userInfo!.balance += bet;
                            await userInfo!.save().catch(():void => {});

                            return await selection.update({
                                embeds: [bjEmbed],
                                components: [],
                                //ephemeral: true
                            })
                        }
                    }

                }
                playerHandValue = bj.getValue(bj.playerHand)
                dealerHandValue = bj.getValue(bj.dealerHand)
            }
        } catch(e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', embeds: [], components: [] });
        }

    }
}

function createBlackjackEmbed(playerValue: number, dealerValue: number, playerHand: string, dealerHand: string, playerStatus: string = '', dealerStatus: string = ''): EmbedBuilder {
    return new EmbedBuilder()
        .setTitle('Game of Blackjack!')
        .addFields(
            {name: `You | ${playerValue} ${playerStatus}`, value: playerHand},
            {name: `Dealer | ${dealerValue} ${dealerStatus}`, value: dealerHand}
        )
        .setColor('Blue');
}

function adjustForAces(hand: Card[], value: number): number {
    for (let card of hand) {
        if (card.symbol === 'A' && value > 21) {
            value -= 10;
        }
    }
    return value;
}


function adjustHandValue(handValue: number, hand: Card[], aceValue: string): [number, string] {

    if (handValue > 21) {
        for (let i in hand) {
            if (hand[i].symbol === 'A') {
                handValue -= 10;
            }
        }
    } else {
        for (let i in hand) {
            if (hand[i].symbol === 'A') {
                aceValue = ` / ${handValue - 10}`;
            }
        }
    }

    return [handValue, aceValue];
}