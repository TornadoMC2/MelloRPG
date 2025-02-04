import {CommandInteraction, SlashCommandBuilder, User} from "discord.js";
import UserInfo from "../../models/userInfo";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Admin command to add money to a user\'s balance.')
        .addUserOption(option => option.setName('user').setDescription('The user to add money to.').setRequired(true))
        .addNumberOption(option => option.setName('amount').setDescription('The amount of money to add to the user\'s balance.').setRequired(true)),
    async execute(interaction: CommandInteraction) {

        if(interaction.user.id !== "425624104901541888") return await interaction.reply({content: "You do not have permission to use this command.", ephemeral: true});

        const user : User | null = interaction.options.getUser('user');
        if(!user) return await interaction.reply({content: "User not found.", ephemeral: true});

        // @ts-ignore
        const amount : number = interaction.options.getNumber('amount');

        //command for adding money to a user's balance
        let userInfo = await UserInfo.findOne({uid: user.id});

        if(!userInfo) {
            const newUser = new UserInfo({
                uid: user.id,
            })
            await newUser.save().catch(() : void => {});
            userInfo = await UserInfo.findOne({uid: user.id});
        }
        // @ts-ignore
        userInfo.balance += amount;
        // @ts-ignore
        await userInfo.save().catch(() : void => {});

        await interaction.reply({content: `Added \`${amount}\` to \`${user.username}\`'s balance.`, ephemeral: true});

    }
}