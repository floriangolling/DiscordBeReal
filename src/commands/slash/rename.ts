import {
  renamedChannelPattern,
  temporaryChannelPattern,
} from '@/events/guild/VoiceStateUpdate';

import { SlashCommand, SlashCommandConfig } from '@/types/command';
import Logger from '@/lib/logger';
import { writeBotLog } from '@/utils/discord';

const config: SlashCommandConfig = {
  description: 'Renomme un channel temporaire',
  usage: '/rename',
  options: [
    {
      name: 'name',
      description: 'Le nom de ton nouveau channel',
      type: 'STRING',
      required: true,
    },
  ],
};

const command: SlashCommand = {
  execute: async (interaction) => {
    const name = interaction.options.get('name')?.value as string;
    const member = await interaction.guild?.members.fetch(interaction.user.id);

    try {
      await interaction.deferReply({ ephemeral: true });

      if (!member?.voice.channel) {
        await interaction.editReply('You need to be in a voice channel to use this command.');
        return;
      }

      const { channel } = member.voice;

      if (!temporaryChannelPattern.test(channel.name) && !renamedChannelPattern.test(channel.name)) {
        await interaction.editReply('You can only rename temporary channels.');
        return;
      }

      let channelNumber = 0;
      let match = channel.name.match(temporaryChannelPattern);
      if (!match) {
        match = channel.name.match(renamedChannelPattern);
      }
      if (match) {
        if (parseInt(match[1], 10) === 0 || Number.isNaN(parseInt(match[1], 10))) {
          channelNumber = parseInt(match[2], 10);
        } else {
          channelNumber = parseInt(match[1], 10);
        }
      }

      const newChannelName = `${name} - Voice Chat #${channelNumber}`;

      if (newChannelName.length < 1 || newChannelName.length > 100) {
        await interaction.editReply('The channel name must be between 1 and 100 characters.');
        return;
      }
      await channel.setName(newChannelName);
      await interaction.editReply(`Your channel is now named ${newChannelName}.`);

      Logger.info(`Channel renamed to: ${newChannelName} by ${interaction.user.tag}`);
    } catch (err) {
      Logger.error(`An error occured while renaming a channel: ${err}`);
      writeBotLog(interaction.guild!, `An error occured while renaming a channel: ${err}`);
    }
  },
};

export default { command, config };
