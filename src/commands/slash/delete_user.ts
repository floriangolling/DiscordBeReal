import { UserModel } from '@/database/models';
import Logger from '@/lib/logger';
import { SlashCommand, SlashCommandConfig } from '@/types/command';
import { writeBotLog } from '@/utils/discord';
import { PermissionsBitField } from 'discord.js';

const config: SlashCommandConfig = {
  description: 'Utilisez cette commande pour supprimer un utilisateur',
  usage: '/delete_user',
  options: [
    {
      name: 'user_id',
      description: 'ID de l utilisateur à supprimer (discord)',
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
      } else {
        await user.destroy();
        await interaction.editReply('Utilisateur supprimé (DB)');
      }

      const member = await interaction.guild?.members.fetch(discordId);

      if (!member) {
        await interaction.editReply('Utilisateur non trouvé (Discord)');
      } else {
        await member.kick('Suppression de l\'utilisateur');
        await interaction.editReply('Utilisateur supprimé (Discord)');
      }
      await interaction.editReply('Utilisateur bien supprimé');
    } catch (err) {
      Logger.error(`An error occured while deleting a user: ${err}`);
      writeBotLog(interaction.guild!, `An error occured while deleting a user: ${err}`);
    }
  },
};

export default { command, config };
