'use strict';
import {
	ActionRowBuilder,
	StringSelectMenuBuilder,
	StringSelectMenuOptionBuilder,
	SlashCommandBuilder,
	EmbedBuilder,
	MessageComponentInteraction,
} from 'discord.js';
import {ErrorEmbed} from "../../utils/EmbedUtils";

module.exports = {
	data: new SlashCommandBuilder()
		.setName('starter')
		.setDescription('Select your starter Pokémon!'),
	async execute(interaction: MessageComponentInteraction): Promise<void> {
		const select: StringSelectMenuBuilder = new StringSelectMenuBuilder()
			.setCustomId('starter')
			.setPlaceholder('Make a selection!')
			.addOptions(
				new StringSelectMenuOptionBuilder()
					.setLabel('Bulbasaur')
					.setDescription('The dual-type Grass/Poison Seed Pokémon.')
					.setValue('bulbasaur'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Charmander')
					.setDescription('The Fire-type Lizard Pokémon.')
					.setValue('charmander'),
				new StringSelectMenuOptionBuilder()
					.setLabel('Squirtle')
					.setDescription('The Water-type Tiny Turtle Pokémon.')
					.setValue('squirtle'),
			);

        const row: any = new ActionRowBuilder()
			.addComponents(select);

		const embed = new EmbedBuilder()
			.setTitle("Chose a Starter!")
			.setDescription("Please select a starter pokemon!")
			.setColor(0x23c248)

		let response = await interaction.reply({
			embeds: [embed],
			components: [row],
		});

		const collectorFilter = (i: { user: { id: any; }; }) : boolean => i.user.id === interaction.user.id;

		try {
			const selection : any = await response.awaitMessageComponent({ filter: collectorFilter, time: 60_000 });

			//console.log(selection);

			const ctn : string = `You made the selection: \`${selection.values[0]}\``
			const selectionEmbed : EmbedBuilder = new EmbedBuilder()
				.setTitle("Starter Choice")
				.setDescription(ctn)


			if(selection.customId === 'starter') {
				if(selection.values[0]) {
					await selection.update({
						content: '',
						embeds: [selectionEmbed],
						components: []
					})
				} else {
					await selection.update({
						content: "",
						embeds: [ErrorEmbed],
						components: []
					})
				}
			}

		} catch (e) {
			await interaction.editReply({ content: 'Confirmation not received within 1 minute, cancelling', components: [] });
		}
	},
};