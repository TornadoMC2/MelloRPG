// profile.ts
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Colors
} from "discord.js";
import UserInfo from "../../models/userInfo";
import {currencyFormatter} from "../../utils/CurrencyUtils";

// Export the command’s data using the new SlashCommandBuilder interface.
export const data = new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a user's profile")
    .addUserOption(option =>
        option
            .setName("user")
            .setDescription("The user to view (defaults to yourself)")
            .setRequired(false)
    );

// Export the execute function that handles the command.
export const execute = async (interaction: ChatInputCommandInteraction) => {
    // Defer reply to allow for async database operations.
    await interaction.deferReply();

    // Get the target user from the slash command option, or default to the interaction user.
    const targetUser = interaction.options.getUser("user") || interaction.user;

    // Attempt to find the user record in MongoDB using our MelloRPG user schema.
    let userInfo = await UserInfo.findOne({uid: targetUser.id});
    if (!userInfo) {
        // If the user does not exist in the database, create a new record with default values.
        userInfo = new UserInfo({uid: targetUser.id});
        await userInfo.save();
    }

    // Use the stored description or fall back to a default prompt.
    const description: string = userInfo!.description

    // Build the embed using the new EmbedBuilder interface.

    const embed = new EmbedBuilder()// @ts-ignore
        .setThumbnail(targetUser.displayAvatarURL({dynamic: true}))
        .setColor("Blue")
        .setTitle(`${targetUser.tag}'s Profile`)
        .setDescription(description)


    if (userInfo.items && userInfo.items.length > 0) {
        embed.addFields({name: "Badges:", value: userInfo.items.join(" | ")});
    } else {
        embed.addFields({name: "Badges:", value: `No badges, do \`/shop\` to view some options`});
    }


    embed.addFields(
        {name: "Currency Balance", value: currencyFormatter.format(userInfo.balance), inline: false},
        {name: "Reputation", value: userInfo.rep.toString(), inline: false},
    );


    // Finally, reply to the interaction with the constructed embed.
    await interaction.editReply({embeds: [embed]});
};
