import {CommandInteraction, EmbedBuilder, SlashCommandBuilder} from "discord.js";
import path from "node:path";
import fs from "node:fs";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows the help menu.'),
    async execute(interaction: CommandInteraction) {

        let commands: any[] = [];
        const foldersPath : string = path.normalize(path.join(__dirname, '../', '../commands'));
        const commandFolders : string[] = fs.readdirSync(foldersPath);
        let folder : string;
        for (folder of commandFolders) {
            // Grab all the command files from the commands directory you created earlier
            const commandsPath : string = path.join(foldersPath, folder);
            const commandFiles : string[] = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
            let file:string;
            for (file of commandFiles) {
                const filePath : string = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }


        let helpMenu = new EmbedBuilder()
            .setTitle("Help Menu")
            .setDescription("Here are the commands you can use:")
            .setColor("Random")

        commands.forEach((command) : void => {

            let name : string = '';
            let description : string = '';

            name += command.name;
            description += command.description;

            if(command.hasOwnProperty('options')) {
                let options : string = '';
                command.options.forEach((option : any) : void => {
                    options += `\n\`${option.name}\` - ${option.description}`;
                })
                description += options;
            }


            helpMenu.addFields({name: name, value: description});
        })

        await interaction.reply({embeds: [helpMenu]});



    }
}