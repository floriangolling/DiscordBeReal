import connectToDatabase, { sequelize } from '@/database';
import handleEvents from '@/handlers/eventHandler';
import loadSlashCommands from '@/loaders/slashCommands';
import { GatewayIntentBits, IntentsBitField, REST, Routes } from 'discord.js';
import DiscordClient from '@/lib/client';
import Logger from '@/lib/logger';
import env from '@/env';

interface DiscordResponse {
    length: number;
}

const client = DiscordClient.getInstance({
    intents: [
        GatewayIntentBits.Guilds,
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildVoiceStates,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
    ],
});

// Refresh application slash commands
const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
(async () => {
    try {
        Logger.debug('Started refreshing application (/) commands.');

        const { slashCommands, slashConfigs } = await loadSlashCommands();
        const res = (await rest.put(Routes.applicationCommands(env.DISCORD_APP_ID), {
            body: slashCommands,
        })) as DiscordResponse;

        client.slashConfigs = slashConfigs;

        Logger.debug(`Successfully reloaded ${res.length} (/) commands.`);

        await connectToDatabase(sequelize);
        await client.login(env.DISCORD_TOKEN);
    } catch (error) {
        Logger.error(`Error launching application: \n\t${error}`);
        try {
            Logger.info('Destroying client...');
        } catch (err) {
            Logger.error(`Error writing bot log: \n\t${err}`);
        }
        try {
            await client.destroy();
        } catch (errDestroy) {
            Logger.error(`Error destroying client: \n\t${errDestroy}`);
        }
    }
})();

// Handle application events
handleEvents();

process.on('unhandledRejection', async (error) => {
    Logger.error(`Unhandled promise rejection: \n\t${error}`);
    try {
        Logger.info('Destroying client...');
    } catch (err) {
        Logger.error(`Error writing bot log: \n\t${err}`);
    }
    try {
        await client.destroy();
    } catch (err) {
        Logger.error(`Error destroying client: \n\t${err}`);
    }

    process.exit(1);
});

process.on('uncaughtException', async (error) => {
    try {
        Logger.error(`Uncaught exception: \n\t${error}`);
    } catch (err) {
        Logger.error(`Error writing bot log: \n\t${err}`);
    }
    try {
        await client.destroy();
    } catch (err) {
        Logger.error(`Error destroying client: \n\t${err}`);
    }

    process.exit(1);
});

process.on('SIGTERM', async () => {
    try {
        await client.destroy();
    } catch (err) {
        Logger.error(`Error destroying client: \n\t${err}`);
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    try {
        await client.destroy();
    } catch (err) {
        Logger.error(`Error destroying client: \n\t${err}`);
    }
    process.exit(0);
});

export default client;
