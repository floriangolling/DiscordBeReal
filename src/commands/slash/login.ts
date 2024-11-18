import { UserModel } from '@/database/models';
import { isValidEpitechMail, generateVerificationCode } from '@/utils/';
import sendEmailToUser from '@/utils/mailer';

import { SlashCommand, SlashCommandConfig } from '@/types/command';
import { writeBotLog } from '@/utils/discord';
import Logger from '@/lib/logger';

const config: SlashCommandConfig = {
  description: 'Utilisez cette commande pour vous connecter à votre compte Epitech.',
  usage: '/login',
  options: [
    {
      name: 'email',
      description: 'prenom.nom@epitech.eu',
      type: 'STRING',
      required: true,
    },
  ],
};

/**
 * Command to login user
 * It will check if the email is valid and if the user is already verified
 */

const command: SlashCommand = {
  execute: async (interaction) => {
    const login: string = interaction.options.get('email')?.value?.toString().toLowerCase() ?? '';

    try {
      await interaction.deferReply({ ephemeral: true });

      if (!isValidEpitechMail(login)) {
        await interaction.editReply('Veuillez entrer un e-mail Epitech (prénom.nom@epitech.eu)');
        return;
      }

      const alreadyVerifiedUser = await UserModel.findOne({
        where: {
          discordId: interaction.user.id,
          verified: true,
        },
      });

      if (alreadyVerifiedUser) {
        await interaction.editReply('Votre compte discord est déjà connecté à un compte EPITECH.');
        return;
      }

      const user = await UserModel.findOne({ where: { login } });

      if (user && user.verified) {
        await interaction.editReply('Cet email est déjà connecté à un compte discord.');
        return;
      }

      if (user && new Date().getTime() - user.updatedAt.getTime() < 300000) {
        await interaction.editReply('Un email a déjà été envoyé il y a moins de 5 minutes. Veuillez patienter.');
        return;
      }

      const verificationCode = generateVerificationCode();

      console.log(verificationCode);

      const errorMail = await sendEmailToUser(login, verificationCode, interaction.user.tag);

      if (errorMail) {
        writeBotLog(interaction.guild!, `Error while sending email: ${errorMail}`);
        await interaction.editReply('Erreur lors de l\'envoi de l\'email. Contactez un administrateur.');
        return;
      }

      await UserModel.upsert({
        discordId: interaction.user.id,
        login,
        verificationCode,
        verified: user ? user.verified : false,
      });

      await interaction.editReply("Un code de vérification a été envoyé sur votre adresse mail Epitech.\nRentrez le à l'aide de la commande **/verification**. (Vérifiez vos spams)");
    } catch (error) {
      Logger.error(`Error while using login interaction for ${login}: ${error}`);
      writeBotLog(interaction.guild!, `Error while logging in: ${error}`);
    }
  },
};

export default { command, config };
