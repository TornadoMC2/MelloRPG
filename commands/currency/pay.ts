import {CommandInteraction, Embed, EmbedBuilder, SlashCommandBuilder, User} from "discord.js";
import UserInfo from "../../models/userInfo";
import { currencyFormatter } from "../../utils/CurrencyUtils";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pay')
        .setDescription('Pay another user!')
        .addUserOption(option => option.setName('user').setDescription('The user to pay.').setRequired(true))
        .addNumberOption(option => option.setName('amount').setDescription('The amount of money to add to pay to the user.').setRequired(true)),
    async execute(interaction: CommandInteraction) {

        const user : User | null = interaction.options.getUser('user');
        if(!user) return await interaction.reply({content: "User not found.", ephemeral: true});

        // @ts-ignore
        const amount : number = interaction.options.getNumber('amount');

        let userToPay = await UserInfo.findOne({uid: user.id});

        if(!userToPay) {
            const newUser = new UserInfo({
                uid: user.id,
            })
            await newUser.save().catch(() : void => {});
            userToPay = await UserInfo.findOne({uid: user.id});
        }

        let commandUser = await UserInfo.findOne({uid: interaction.user.id});

        if(!commandUser) {
            const newUser = new UserInfo({
                uid: interaction.user.id,
            })
            await newUser.save().catch(() : void => {});
            commandUser = await UserInfo.findOne({uid: interaction.user.id});
        }


        let notEnoughMoneyEmbed = new EmbedBuilder()
            .setTitle("Not Enough Money")
            .setDescription("You do not have enough money to pay that amount.")
            .setColor("Red")

        if(commandUser!.balance < amount) return await interaction.reply({embeds: [notEnoughMoneyEmbed], ephemeral: true});


        userToPay!.balance += amount;
        commandUser!.balance -= amount;

        await userToPay!.save().catch(() : void => {});
        await commandUser!.save().catch(() : void => {});

        let paidEmbed = new EmbedBuilder()
            .setColor("Green")
            .addFields({
                name: "Transition Complete",
                value: `:outbox_tray: <@${interaction.user.id}> **-${currencyFormatter.format(amount)}** \n \n :inbox_tray: <@${user.id}> **+${currencyFormatter.format(amount)}**`
            });


        await interaction.reply({embeds: [paidEmbed], ephemeral: true});

    }
}