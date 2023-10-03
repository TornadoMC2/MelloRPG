import *  as Discord from 'discord.js';

module.exports = {
	name: Discord.Events.ClientReady,
	once: true,
	execute(client : Discord.Client) {
		console.log(`Ready! Logged in as ${client.user?.tag}`);
	},
};