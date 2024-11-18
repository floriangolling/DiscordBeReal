import { writeBotLog } from '@/utils/discord';
import Logger from '@/lib/logger';
import { SlashCommand, SlashCommandConfig, SlashCommandInteraction } from '@/types/command';
import { LOG_CHANNEL_NAME } from '@/utils/const';
import { PermissionsBitField, TextChannel } from 'discord.js';

const config: SlashCommandConfig = {
  description: 'Clean bot logs',
  usage: '/clean_logs',
  options: [],
};

async function clearMessages(logsChannel: TextChannel, interaction: SlashCommandInteraction) {
  let fetched;
  do {
    fetched = await (logsChannel as TextChannel).messages.fetch({ limit: 100 });
    await interaction.editReply(`Cleaning logs channel... (${fetched.size} messages left)`);
    await logsChannel.bulkDelete(fetched);
  } while (fetched.size > 0);
}

const command: SlashCommand = {
  permissions: PermissionsBitField.Flags.Administrator,
  execute: async (interaction) => {
    try {
      await interaction.deferReply({
        ephemeral: true,
      });

      const logsChannel = interaction.guild?.channels.cache.find((channel) => channel.name === LOG_CHANNEL_NAME);

      if (!logsChannel) {
        await interaction.editReply('Logs channel not found');
        return;
      }

      await interaction.editReply('Cleaning logs channel...');
      await clearMessages(logsChannel as TextChannel, interaction);

      await interaction.editReply('Logs channel cleaned successfully.');
    } catch (err) {
      Logger.error(`Error cleaning logs: ${err}`);
      writeBotLog(interaction.guild!, `Error cleaning logs: ${err}`);
    }
  },
};

export default { command, config };
