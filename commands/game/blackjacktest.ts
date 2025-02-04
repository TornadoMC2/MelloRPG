import {
    ButtonBuilder,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    ButtonStyle,
    ActionRowBuilder,
} from "discord.js";
import {BlackjackUtils} from "../../utils/Blackjack/BlackjackUtils";
import UserInfo from "../../models/userInfo";
import {currencyFormatter} from "../../utils/CurrencyUtils";
import {Card} from "../../utils/Blackjack/CardUtils";

module.exports = {
    data: new SlashCommandBuilder()
        .setName("blackjacktest")
        .setDescription("Test Blackjack command that always deals a hand eligible for splitting (pair of 6s)")
        .addStringOption(option =>
            option
                .setName("bet")
                .setDescription("The amount to bet")
                .setRequired(true)
        ),
    async execute(interaction: CommandInteraction): Promise<void> {
        // Retrieve user data or create new if none exists.
        let userInfo = await UserInfo.findOne({uid: interaction.user.id});
        if (!userInfo) {
            userInfo = new UserInfo({uid: interaction.user.id});
            await userInfo.save().catch(() => {
            });
        }
        let balance: number = userInfo.balance;

        // Parse the bet option.
        // @ts-ignore
        const betInput = interaction.options.getString("bet")!;
        let bet: number = parseInt(betInput);
        if (isNaN(bet)) {
            await interaction.reply({content: "Please enter a valid number for the bet", ephemeral: true});
            return;
        }
        if (bet > balance) {
            await interaction.reply({
                content: `You do not have enough balance for this bet. Your balance is: ${currencyFormatter.format(balance)}`,
                ephemeral: true
            });
            return;
        }

        // Create a new Blackjack game instance and start the game.
        const bj = new BlackjackUtils();
        bj.start();

        // FORCE THE PLAYER HAND TO BE SPLITTABLE:
        // Override the normally dealt hand to always be two 6s.
        bj.playerHand = [
            {symbol: "6", suit: "hearts"} as Card,
            {symbol: "6", suit: "spades"} as Card,
        ];

        // Deduct the bet from the user’s balance.
        userInfo.balance -= bet;
        await userInfo.save().catch(() => {
        });

        // Generate display strings.
        const playerHandString = bj.generateHandString(bj.playerHand);
        const dealerHandString = bj.generateHandString(bj.dealerHand);
        const playerHandValue = bj.getValue(bj.playerHand);
        const dealerHandValue = bj.getValue(bj.dealerHand);

        // Build the starting embed.
        const bjEmbed = new EmbedBuilder()
            .setTitle("Blackjack Test Game")
            .addFields(
                {name: `Your Hand | ${playerHandValue}`, value: playerHandString, inline: true},
                {name: `Dealer Hand | ${dealerHandValue}`, value: dealerHandString, inline: true}
            )
            .setColor("Blue");

        // Create action buttons.
        const hitButton = new ButtonBuilder()
            .setCustomId("hit")
            .setLabel("Hit")
            .setStyle(ButtonStyle.Primary);
        const standButton = new ButtonBuilder()
            .setCustomId("stand")
            .setLabel("Stand")
            .setStyle(ButtonStyle.Secondary);
        const splitButton = new ButtonBuilder()
            .setCustomId("split")
            .setLabel("Split")
            .setStyle(ButtonStyle.Success);
        const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(hitButton, standButton, splitButton);

        // Send the initial reply.
        const response = await interaction.reply({
            embeds: [bjEmbed],
            components: [actionRow],
            fetchReply: true,
        });

        // Create a collector for button interactions.
        const collectorFilter = (i: any) => i.user.id === interaction.user.id;
        const collector = (response as any).createMessageComponentCollector({
            filter: collectorFilter,
            time: 60000,
        });

        collector.on("collect", async (i: any) => {
            if (i.customId === "hit") {
                // Deal one card to the player's hand.
                bj.deal(bj.playerHand, 1);
                const newPlayerHandString = bj.generateHandString(bj.playerHand);
                const newPlayerHandValue = bj.getValue(bj.playerHand);
                // Update the embed.
                const newEmbed = EmbedBuilder.from(bjEmbed).spliceFields(0, 1, {
                    name: `Your Hand | ${newPlayerHandValue}`,
                    value: newPlayerHandString,
                    inline: true,
                });
                await i.update({embeds: [newEmbed]});
                // Check for bust.
                if (newPlayerHandValue > 21) {
                    const bustEmbed = new EmbedBuilder()
                        .setTitle("Blackjack Test Game")
                        .addFields(
                            {
                                name: `Your Hand | ${newPlayerHandValue} - BUST`,
                                value: newPlayerHandString,
                                inline: true
                            },
                            {name: `Dealer Hand | ${dealerHandValue}`, value: dealerHandString, inline: true}
                        )
                        .setColor("Red");
                    await i.update({embeds: [bustEmbed], components: []});
                    collector.stop();
                }
            } else if (i.customId === "stand") {
                // Simulate dealer's turn.
                let dealerVal = bj.getValue(bj.dealerHand);
                while (dealerVal < 17) {
                    bj.deal(bj.dealerHand, 1);
                    dealerVal = bj.getValue(bj.dealerHand);
                }
                const finalDealerHandString = bj.generateHandString(bj.dealerHand);
                const playerVal = bj.getValue(bj.playerHand);
                let outcome = "";
                if (playerVal > 21) {
                    outcome = "LOSE (BUST)";
                } else if (dealerVal > 21 || playerVal > dealerVal) {
                    outcome = "WIN";
                    userInfo!.balance += bet * 2;
                } else if (playerVal < dealerVal) {
                    outcome = "LOSE";
                } else {
                    outcome = "PUSH";
                    userInfo!.balance += bet;
                }
                await userInfo!.save().catch(() => {
                });
                const finalEmbed = new EmbedBuilder()
                    .setTitle("Blackjack Test Game - Final Result")
                    .addFields(
                        {
                            name: `Your Hand | ${playerVal} - ${outcome}`,
                            value: bj.generateHandString(bj.playerHand),
                            inline: true
                        },
                        {name: `Dealer Hand | ${dealerVal}`, value: finalDealerHandString, inline: true}
                    )
                    .setColor("Blue");
                await i.update({embeds: [finalEmbed], components: []});
                collector.stop();
            } else if (i.customId === "split") {
                // Cancel the original collector by removing the buttons.
                await i.update({components: []});
                // --- Begin Split Logic ---
                // Split the player's hand into two hands.
                const firstCard = bj.playerHand[0];
                const secondCard = bj.playerHand[1];
                let playerHands: Card[][] = [[firstCard], [secondCard]];
                // Deduct an extra bet for the split hand.
                userInfo!.balance -= bet;
                await userInfo!.save().catch(() => {
                });
                // For each split hand, deal one extra card.
                bj.deal(playerHands[0], 1);
                bj.deal(playerHands[1], 1);
                // Set the active hand index.
                let activeHandIndex = 0;
                const arrowEmoji = "➡️";
                // Create buttons for split-hand play.
                const splitHitButton = new ButtonBuilder()
                    .setCustomId("split_hit")
                    .setLabel("Hit")
                    .setStyle(ButtonStyle.Primary);
                const splitStandButton = new ButtonBuilder()
                    .setCustomId("split_stand")
                    .setLabel("Stand")
                    .setStyle(ButtonStyle.Secondary);
                const splitActionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(splitHitButton, splitStandButton);

                // Create a collector for split-hand actions.
                const splitCollector = (response as any).createMessageComponentCollector({
                    filter: collectorFilter,
                    time: 60000,
                });

                splitCollector.on("collect", async (splitInteraction: any) => {
                    if (splitInteraction.customId === "split_hit") {
                        // Deal a card to the active split hand.
                        bj.deal(playerHands[activeHandIndex], 1);
                        // Build fields for both split hands with inline formatting.
                        let fields = [];
                        for (let i = 0; i < playerHands.length; i++) {
                            let handVal = bj.getValue(playerHands[i]);
                            let handStr = bj.generateHandString(playerHands[i]);
                            let title = `Hand ${i + 1} | ${handVal}`;
                            if (i === activeHandIndex) title = `${arrowEmoji} ${title}`;
                            fields.push({name: title, value: handStr, inline: true});
                        }
                        // Add the dealer’s hand (non-inline so it spans full width).
                        const currDealerVal = bj.getValue(bj.dealerHand);
                        const currDealerStr = bj.generateHandString(bj.dealerHand);
                        fields.push({name: `Dealer | ${currDealerVal}`, value: currDealerStr, inline: false});
                        const splitEmbed = new EmbedBuilder()
                            .setTitle("Blackjack Test Game - Split")
                            .addFields(fields)
                            .setColor("Blue");
                        await splitInteraction.update({embeds: [splitEmbed], components: [splitActionRow]});
                        // If the active hand busts, automatically move to the next hand.
                        if (bj.getValue(playerHands[activeHandIndex]) > 21) {
                            activeHandIndex++;
                        }
                        if (activeHandIndex >= playerHands.length) {
                            splitCollector.stop();
                        }
                    } else if (splitInteraction.customId === "split_stand") {
                        activeHandIndex++;
                        await splitInteraction.deferUpdate();
                        if (activeHandIndex >= playerHands.length) {
                            splitCollector.stop();
                        }
                    }
                });

                splitCollector.on("end", async () => {
                    // Dealer's turn after both split hands have been played.
                    let dealerVal = bj.getValue(bj.dealerHand);
                    while (dealerVal < 17) {
                        bj.deal(bj.dealerHand, 1);
                        dealerVal = bj.getValue(bj.dealerHand);
                    }
                    const finalDealerHandStr = bj.generateHandString(bj.dealerHand);
                    // Build final results for each split hand.
                    let finalFields = [];
                    for (let i = 0; i < playerHands.length; i++) {
                        let handVal = bj.getValue(playerHands[i]);
                        let handStr = bj.generateHandString(playerHands[i]);
                        let result = "";
                        if (handVal > 21) {
                            result = "BUST";
                        } else if (dealerVal > 21 || handVal > dealerVal) {
                            result = "WINNER";
                            userInfo!.balance += bet * 2;
                        } else if (handVal < dealerVal) {
                            result = "LOSE";
                        } else {
                            result = "PUSH";
                            userInfo!.balance += bet;
                        }
                        finalFields.push({
                            name: `Hand ${i + 1} | ${handVal} - ${result}`,
                            value: handStr,
                            inline: true
                        });
                    }
                    // Add dealer’s final hand.
                    finalFields.push({name: `Dealer | ${dealerVal}`, value: finalDealerHandStr, inline: false});
                    await userInfo!.save().catch(() => {
                    });
                    const finalEmbed = new EmbedBuilder()
                        .setTitle("Blackjack Test Game - Final Results (Split)")
                        .addFields(finalFields)
                        .setColor("Blue");
                    await interaction.editReply({embeds: [finalEmbed], components: []});
                });
                collector.stop();
            }
        });

        collector.on("end", async () => {
            // Disable any remaining buttons after the collector ends.
            if (interaction.replied) {
                await interaction.editReply({components: []});
            }
        });
    },
};
