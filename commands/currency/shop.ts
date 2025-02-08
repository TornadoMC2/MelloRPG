import {CommandInteraction, SlashCommandBuilder, EmbedBuilder} from "discord.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Displays the shop items.'),
    async execute(interaction: CommandInteraction) {
        const shop = "🛒";
        const prefix = "/";
        const microteam = "👥";
        const ayy2 = "💎";

        const sEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle(`${shop} **SHOP**`)
            .setDescription(`Welcome to the Shop. Here you can buy different things for your profile. You pay with your Cash/Diamonds \`${prefix}profile\``)
            .addFields(
                {
                    name: "Unique Badges",
                    value: `These badges are unique and not buyable! \n \n ${microteam} - Micro Staff \n :taco: - Beta Tester \n :crown: - Rich Beta User (more than $1,000,000 or ${ayy2}50,000 before 2020)`
                },
                {
                    name: "Profile Description",
                    value: `$100 for a profile description \`${prefix}description <text here>\``
                },
                {
                    name: "Badges",
                    value: `You can buy all those badges! \`${prefix}badge <number>\` \n \n **1** :ice_cream: *Ice cream for the win* - $1000 \n **2.** :four_leaf_clover:  *Lucky, Lucky* - $5000 \n **3** :bike: *Ring Ring* - $10000 \n **4** :taxi: *VROOM VROOM!* - $50000 \n **5** :star: *I'm a star!* - ${ayy2}400 \n **6** :steam_locomotive: *I like trains* - ${ayy2}1000`,
                    inline: false
                }
            );

        await interaction.reply({embeds: [sEmbed], ephemeral: true});
    }
}