import { Client, Events, Interaction } from 'discord.js';

export default async (client: Client) => {
    client.on(Events.InteractionCreate, async (interaction: Interaction) => {
        if (!interaction.isChatInputCommand()) return;

        // TODO maybe pointer array function exampled in @commands/help/index
    });
};
