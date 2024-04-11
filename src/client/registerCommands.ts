import { REST, Routes } from 'discord.js';
import Config from '../config';
import fs from 'fs';
import path from 'path';

const rest = new REST().setToken(Config.BOT_TOKEN);

export default async () => {
    const commands = [];
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath);

        for (const file of commandFiles.filter((file) => file.startsWith('index'))) {
            const filePath = path.join(commandsPath, file);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
            } else {
                console.log(
                    `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
                );
            }
        }
    }
    await rest.put(Routes.applicationCommands(Config.CLIENT_ID), { body: commands });
};
