import {
    ButtonBuilder,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    ButtonStyle, ActionRowBuilder
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

        let split : ButtonBuilder = new ButtonBuilder().setCustomId('split').setLabel('Split').setStyle(ButtonStyle.Success)

        let buttonRow : any;

        if(bj.playerHand[0].symbol === bj.playerHand[1].symbol) {
            buttonRow = new ActionRowBuilder().addComponents(hit, stand, split)
        } else {
            buttonRow = new ActionRowBuilder().addComponents(hit, stand)
        }

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

                } else if (selection.customId === 'split') {

                    await selection.update({components: []});

                    const firstCard: Card = bj.playerHand[0];
                    const secondCard: Card = bj.playerHand[1];
                    let playerHands: Card[][] = [[firstCard], [secondCard]];

                    userInfo!.balance -= bet;
                    await userInfo!.save().catch(() => {});

                    bj.deal(playerHands[0], 1);
                    bj.deal(playerHands[1], 1);

                    // (0 = first hand; 1 = second hand.)
                    let activeHandIndex: number = 0;
                    let handInPlay: boolean = true;

                    const hitButton: ButtonBuilder = new ButtonBuilder()
                        .setCustomId('split_hit')
                        .setLabel('Hit')
                        .setStyle(ButtonStyle.Primary);
                    const standButton: ButtonBuilder = new ButtonBuilder()
                        .setCustomId('split_stand')
                        .setLabel('Stand')
                        .setStyle(ButtonStyle.Secondary);
                    const splitRow : any = new ActionRowBuilder().addComponents(hitButton, standButton);

                    // Main loop for playing each of the split hands sequentially.
                    while (handInPlay) {
                        // Build embed fields for each hand, adding an arrow emoji for the active one.
                        const arrow : string = '➡️';
                        let fields: { name: string; value: string; inline?: boolean; }[] = [];
                        for (let i = 0; i < playerHands.length; i++) {
                            let handValue = bj.getValue(playerHands[i]);

                            // Adjust for Aces
                            // use adjustHandValue function to adjust the hand value and get the ace value string
                            let aceValue = '';
                            [handValue, aceValue] = adjustHandValue(handValue, playerHands[i], aceValue);

                            let handStr = bj.generateHandString(playerHands[i]);
                            let title = `Hand ${i + 1} | ${handValue}`;
                            if (i === activeHandIndex) {
                                title = `${arrow} ${title}`;
                            }
                            fields.push({name: title, value: `${handStr}${aceValue}`, inline: true});
                        }

                        // Also include the dealer’s current hand.
                        let dealerValue = bj.getValue(bj.dealerHand);

                        // Adjust for Aces
                        // use adjustHandValue function to adjust the hand value and get the ace value string
                        let aceValue = '';
                        [dealerValue, aceValue] = adjustHandValue(dealerValue, bj.dealerHand, aceValue);

                        let dealerHandStr = bj.generateHandString(bj.dealerHand);
                        fields.push({name: `Dealer | ${dealerValue}`, value: dealerHandStr});

                        let splitEmbed = new EmbedBuilder()
                            .setTitle('Game of Blackjack! (Split)')
                            .addFields(fields)
                            .setColor('Blue');

                        // Update the reply with the new embed and split buttons.
                        // (Because we use editReply, the original collector is no longer listening.)
                        const splitResponse = await interaction.editReply({
                            embeds: [splitEmbed],
                            components: [splitRow],
                        });

                        // Wait for the player to choose an action on the active hand.
                        const splitSelection = await splitResponse.awaitMessageComponent({
                            filter: (i) => i.user.id === interaction.user.id,
                            time: 60_000,
                        });

                        if (splitSelection.customId === 'split_hit') {
                            // Deal one card to the active hand.
                            bj.deal(playerHands[activeHandIndex], 1);
                            let handValue: number = bj.getValue(playerHands[activeHandIndex]);
                            // If the active hand busts, automatically move to the next hand.
                            handValue = adjustHandValue(handValue, playerHands[activeHandIndex], aceValue)[0];
                            if (handValue > 21) {
                                activeHandIndex++;
                            }
                            // Acknowledge the action (using deferUpdate avoids multiple replies).
                            await splitSelection.deferUpdate();
                        } else if (splitSelection.customId === 'split_stand') {
                            // When the player stands, move to the next hand.
                            activeHandIndex++;
                            await splitSelection.deferUpdate();
                        }

                        // Once we've processed both hands, exit the loop.
                        if (activeHandIndex >= playerHands.length) {
                            handInPlay = false;
                        }
                    }

                    // --- Dealer’s Turn ---
                    let dealerValue = bj.getValue(bj.dealerHand);
                    while (dealerValue < 17) {
                        bj.deal(bj.dealerHand, 1);
                        dealerValue = bj.getValue(bj.dealerHand);
                    }
                    let dealerHandStr = bj.generateHandString(bj.dealerHand);

                    // --- Build Final Results Embed ---
                    let finalFields: { name: string; value: string; inline?: boolean }[] = [];
                    for (let i = 0; i < playerHands.length; i++) {
                        let handValue = bj.getValue(playerHands[i]);
                        let handStr = bj.generateHandString(playerHands[i]);
                        let result = '';
                        if (handValue > 21) {
                            result = 'BUST';
                        } else if (dealerValue > 21 || handValue > dealerValue) {
                            result = 'WINNER';
                            // For a win, pay out double for that hand.
                            userInfo!.balance += bet * 2;
                        } else if (handValue < dealerValue) {
                            result = 'LOSE';
                        } else {
                            result = 'PUSH';
                            // For a push, refund the bet.
                            userInfo!.balance += bet;
                        }
                        finalFields.push({
                            name: `Hand ${i + 1} | ${handValue} - ${result}`,
                            value: handStr,
                            inline: true,
                        });
                    }
                    // Also include the dealer’s final hand.
                    finalFields.push({
                        name: `Dealer | ${dealerValue}`,
                        value: dealerHandStr,
                        inline: false,
                    });

                    await userInfo!.save().catch(() => {});

                    let finalEmbed = new EmbedBuilder()
                        .setTitle('Final Results (Split)')
                        .addFields(finalFields)
                        .setColor('Blue');

                    await interaction.editReply({
                        embeds: [finalEmbed],
                        components: [],
                    });
                    return;
                }

                playerHandValue = bj.getValue(bj.playerHand)
                dealerHandValue = bj.getValue(bj.dealerHand)
            }
        } catch(e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', embeds: [], components: [] });
        }

    }
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