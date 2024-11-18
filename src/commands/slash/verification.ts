import { SlashCommand, SlashCommandConfig } from '@/types/command';
import Logger from '@/lib/logger';

const config: SlashCommandConfig = {
    description: 'Hello',
    usage: '/hello',
    options: [
        {
            name: 'chiffre',
            description: 'un chiffre',
            type: 'NUMBER',
            required: true,
        },
    ],
};

const command: SlashCommand = {
    execute: async (interaction) => {
        const code: number = interaction.options.get('code')?.value as number;

        try {
            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply(`Code: ${code}`);
            Logger.info(`Code: ${code}`);
            return;
        } catch (error) {
            Logger.error(`Error while verifying code: ${error}`);
        }
    },
};

export default { command, config };
