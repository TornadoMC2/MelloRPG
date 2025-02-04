import { SlashCommandBuilder } from "discord.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logtime')
        .setDescription('replies with the current unix time'),
    async execute(interaction: { reply: (arg0: string) => any; }) {

        let time = new Date();

        //log current time in unix
        console.log(time);

        await interaction.reply(time.toString());
    }
}