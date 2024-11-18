import axios from 'axios';
import { SlashCommand, SlashCommandConfig, SlashCommandInteraction } from '@/types/command';
import Logger from '@/lib/logger';
import { acquireLock, isLockAcquired, releaseLock } from '@/utils/mutex/configMutex';
import { PermissionsBitField } from 'discord.js';
import InitConfigModule from '@/configModule';
import { saveConfigToDatabase, writeBotLog } from '@/utils/discord';
import syncUserJob from '@/jobs/syncUserJob';
import Client from '@/index';

const config: SlashCommandConfig = {
  description: 'Init the channels and roles according to the config',
  usage: '/init',
  options: [
    {
      name: 'config_file',
      description: 'The .json config file',
      type: 'ATTACHMENT',
      required: true,
    },
  ],
};

async function notifyProcessing(interaction: SlashCommandInteraction, content: string) {
  if (isLockAcquired()) {
    await interaction.editReply({ content });
    let dots = 1;

    while (isLockAcquired()) {
      // eslint-disable-next-line no-promise-executor-return
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await interaction.editReply({ content: `${content}${'.'.repeat(dots % 4)}` });
      dots += 1;
    }
  }
  return null;
}

const command: SlashCommand = {
  permissions: PermissionsBitField.Flags.Administrator,
  execute: async (interaction) => {
    const configInput = interaction.options.get('config_file');

    try {
      await interaction.deferReply({ ephemeral: true });
      const { data: configData } = await axios.get(configInput!.attachment!.url);

      if (isLockAcquired()) {
        await notifyProcessing(interaction, 'A config is already being processed. Please wait');
      }

      acquireLock();

      writeBotLog(interaction.guild!, 'Processing config file...');
      await interaction.editReply({ content: 'Config file loaded successfully' });

      const configModule = new InitConfigModule(interaction.guild!, configData, interaction);

      await configModule.processConfig();

      releaseLock();

      await saveConfigToDatabase(configData);
      writeBotLog(interaction.guild!, 'Config updated successfully');
      await interaction.editReply({ content: 'Config updated successfully.' });

      try {
        writeBotLog(interaction.guild!, 'Starting user synchronization after config update');
        await syncUserJob(Client);
        writeBotLog(interaction.guild!, 'User synchronization completed');
      } catch (errSync) {
        Logger.error(`An error occurred while synchronizing users: ${errSync}`);
        writeBotLog(interaction.guild!, 'An error occurred while synchronizing users');
      }
    } catch (err) {
      Logger.error(`An error occurred while processing the config file: ${err}`);
      writeBotLog(interaction.guild!, 'An error occurred while processing the config file');
    }
  },
};

export default { command, config };
