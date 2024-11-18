import { UserModel } from '@/database/models';
import Logger from '@/lib/logger';
import { SlashCommand, SlashCommandConfig } from '@/types/command';
import { writeBotLog } from '@/utils/discord';
import { PermissionsBitField } from 'discord.js';
import { syncDatabaseUser } from '@/utils/discord/userSynchronization';

const config: SlashCommandConfig = {
  description: 'Utilisez cette commande pour refresh un utilisateur',
  usage: '/refresh_user',
  options: [
    {
      name: 'user_id',
      description: 'ID de l utilisateur à refresh (discord)',
      type: 'STRING',
      required: true,
    },
  ],
};

const command: SlashCommand = {
  permissions: PermissionsBitField.Flags.Administrator,
  execute: async (interaction) => {
    const discordId = interaction.options.get('user_id')?.value as string;

    try {
      await interaction.deferReply({ ephemeral: true });
      const user = await UserModel.findOne({ where: { discordId } });

      if (!user) {
        await interaction.editReply('Utilisateur non trouvé (DB)');
        return;
      }

      const status = await syncDatabaseUser(user, interaction.guild!);

      if (!status) {
        await interaction.editReply('Ce discord ne lui semble pas destiné.');
        return;
      }

      await interaction.editReply(`Utilisateur ${user.getDataValue('login')} refresh avec succès.`);
    } catch (err) {
      Logger.error(`An error occured while refreshing a user: ${err}`);
      writeBotLog(interaction.guild!, `An error occured while refreshing a user: ${err}`);
    }
  },
};

export default { command, config };
