import { UserModel } from '@/database/models';
import { SlashCommand, SlashCommandConfig } from '@/types/command';
import Logger from '@/lib/logger';
import { writeBotLog } from '@/utils/discord';
import { syncDatabaseUser } from '@/utils/discord/userSynchronization';

/**
 * Command to verify user account
 * It will check if the code is valid and if the user is already verified
 * If the user is not verified, it will sync the user with the database
 */

const config: SlashCommandConfig = {
  description: 'Utilisez cette commande pour vérifier votre compte Epitech.',
  usage: '/verification',
  options: [
    {
      name: 'code',
      description: 'Code de vérification envoyé par email',
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

      const user = await UserModel.findOne({ where: { verificationCode: code, discordId: interaction.user.id } });

      if (!user) {
        await interaction.editReply('Code de vérification invalide.');
        return;
      }

      if (user.verified) {
        await interaction.editReply('Votre compte est déjà vérifié.');
        return;
      }

      const status = await syncDatabaseUser(user, interaction.guild!);

      if (!status) {
        await interaction.editReply('Ce discord ne te semble pas destiné.');
        return;
      }

      await UserModel.update({ verified: true }, { where: { login: user.getDataValue('login') } });

      await interaction.editReply('Compte vérifié avec succès.');
    } catch (error) {
      writeBotLog(interaction.guild!, `Error while verifying code: ${error}`);
      Logger.error(`Error while verifying code: ${error}`);
    }
  },
};

export default { command, config };
