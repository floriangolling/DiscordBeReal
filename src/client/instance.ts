import { Client, GatewayIntentBits, Partials } from 'discord.js';
import Config from '../config';
import registerCommands from './registerCommands';
import listenerCommands from './listenerCommands';

const discordClient = new Client({
    intents: [
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
});

export default async () => {
    await discordClient.login(Config.BOT_TOKEN);
    await registerCommands();
    await listenerCommands(discordClient);
};
