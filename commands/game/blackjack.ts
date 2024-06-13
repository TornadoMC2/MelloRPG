import {
    BaseInteraction,
    CommandInteraction,
    CommandInteractionOptionResolver,
    MessageComponentInteraction,
    SlashCommandBuilder
} from "discord.js";
import {BlackjackUtils} from "../../utils/Blackjack/BlackjackUtils";

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
        await interaction.reply(`You have ${bj.playerHand[0].name} and ${bj.playerHand[1].name}\nWith a value \`${bj.getValue(bj.playerHand)}\``);

    }
}