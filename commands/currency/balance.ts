import {CommandInteraction, EmbedBuilder, SlashCommandBuilder} from "discord.js";
import UserInfo from "../../models/userInfo";
import { currencyFormatter } from "../../utils/CurrencyUtils";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your balance!'),
    async execute(interaction: CommandInteraction) : Promise<void> {

        let userInfo = await UserInfo.findOne({uid: interaction.user.id});

        if(!userInfo) {
            const newUser = new UserInfo({
                uid: interaction.user.id,
            })
            await newUser.save().catch(() : void => {});
            userInfo = await UserInfo.findOne({uid: interaction.user.id});
        }
        let balance : number = userInfo!.balance;


        let balanceEmbed = new EmbedBuilder()
            .setColor("Blurple")
            .setTitle("Balance")
            .addFields({ name: "Your balance is:", value: `\`${currencyFormatter.format(balance)}\`` });

        await interaction.reply({embeds: [balanceEmbed], ephemeral: true});

    }
}