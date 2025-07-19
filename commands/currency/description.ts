import {CommandInteraction, SlashCommandBuilder} from "discord.js";
import UserInfo from "../../models/userInfo";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('description')
        .setDescription('Replies with Pong!')
        .addStringOption(option => option.setName('description').setDescription('The description to set on your profile').setRequired(true)),
    async execute(interaction: CommandInteraction) {

        let userInfo = await UserInfo.findOne({uid: interaction.user.id});

        if(!userInfo) {
            const newUser = new UserInfo({
                uid: interaction.user.id,
            })
            await newUser.save().catch(() : void => {});
            userInfo = await UserInfo.findOne({uid: interaction.user.id});
        }

        // @ts-ignore
        userInfo!.description = interaction.options.getString('description');

        await userInfo!.save().catch(() : void => {});

        await interaction.reply({content: `Set your profile description to: \`${userInfo!.description}\``, ephemeral: true});
    }
}