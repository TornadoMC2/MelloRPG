import { CommandInteraction, SlashCommandBuilder } from "discord.js";
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
        // @ts-ignore
        let balance : number = userInfo.balance;

        await interaction.reply({content: `Your balance is: \`${currencyFormatter.format(balance)}\``, ephemeral: true});

    }
}