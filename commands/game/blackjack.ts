import {
    ButtonBuilder,
    CommandInteraction,
    EmbedBuilder,
    SlashCommandBuilder,
    ButtonStyle, ActionRow, ActionRowBuilder
} from "discord.js";
import {BlackjackUtils} from "../../utils/Blackjack/BlackjackUtils";
import {EmojiUtils} from "../../utils/EmojiUtils";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Start a game of Blackjack!')
        .addStringOption(option =>
            option.setName('bet')
                .setDescription('The amount to bet')
                .setRequired(true)),
    async execute(interaction: CommandInteraction): Promise<void> {

        // @ts-ignore
        let bet : number = parseInt(interaction.options.getString('bet'));

        let bj : BlackjackUtils = new BlackjackUtils();

        bj.start(bet);

        // @ts-ignore
        let ctn:string=`You have ${EmojiUtils.nums[bj.playerHand[0].value.toString()]}${EmojiUtils.suits[bj.playerHand[0].suit.toLowerCase()]} and ${EmojiUtils.nums[bj.playerHand[1].value.toString()]}${EmojiUtils.suits[bj.playerHand[1].suit.toLowerCase()]}\nWith a value \`${bj.getValue(bj.playerHand)}\``

        let playerHandString = bj.generateHandString(bj.playerHand);
        let dealerHandString = bj.generateHandString(bj.dealerHand);

        let bjEmbed = new EmbedBuilder()
            .setTitle('Game of Blackjack!')
            //.setDescription(ctn)
            .addFields(
                // @ts-ignore
                { name: `You | ${bj.getValue(bj.playerHand)}`, value: playerHandString },
                // @ts-ignore
                { name: `Dealer | ${bj.getValue(bj.dealerHand)}`, value: dealerHandString }
            )
            .setColor("Blue")

        let hit = new ButtonBuilder().setCustomId('hit').setLabel('Hit').setStyle(ButtonStyle.Primary)

        let stand = new ButtonBuilder().setCustomId('stand').setLabel('Stand').setStyle(ButtonStyle.Secondary)

        let buttonRow : any = new ActionRowBuilder().addComponents(hit, stand)

        let response = await interaction.reply({
            embeds: [bjEmbed],
            components: [buttonRow],
            ephemeral: true
        })

        const collectorFilter = (i: { user: { id: any; }; }) : boolean => i.user.id === interaction.user.id;

        try {
            const selection : any = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

            if(selection.customId === 'hit') {

                bj.deal(bj.playerHand, 1);
                console.log(bj.playerHand);

                let playerHandString = bj.generateHandString(bj.playerHand);
                let dealerHandString = bj.generateHandString(bj.dealerHand);

                let bjEmbed = new EmbedBuilder()
                    .setTitle('Game of Blackjack!')
                    //.setDescription(ctn)
                    .addFields(
                        // @ts-ignore
                        { name: `You | ${bj.getValue(bj.playerHand)}`, value: playerHandString },
                        // @ts-ignore
                        { name: `Dealer | ${bj.getValue(bj.dealerHand)}`, value: dealerHandString }
                    )
                    .setColor("Blue")

                await selection.update({
                    embeds: [bjEmbed],
                    components: [],
                    ephemeral: true
                })

            } else if (selection.customId === 'stand') {

            }


        } catch(e) {
            await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
        }

    }
}