'use strict';
import {REST, Routes} from 'discord.js';
let { token } = require('./token.json');
import fs from 'node:fs';
import path from 'node:path';

let commands: any[] = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath : string = path.join(__dirname, 'commands');
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

// Construct and prepare an instance of the REST module
const rest: REST = new REST().setToken(token);

// and deploy your commands!
(async () : Promise<void> => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data : any = await rest.put(
            Routes.applicationCommands("1158544378537717780"),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        console.error(error);
    }
})();
