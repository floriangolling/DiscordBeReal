import { UserModel } from '@/database/models';
import { isValidEpitechMail } from '@/utils/';

import { SlashCommand, SlashCommandConfig } from '@/types/command';
import { writeBotLog } from '@/utils/discord';
import Logger from '@/lib/logger';
import RoleModel from '@/database/models/model.role';
import { PermissionsBitField } from 'discord.js';
import { syncDatabaseUser } from '@/utils/discord/userSynchronization';

const config: SlashCommandConfig = {
  description: 'Utilisez cette commande pour ajouter un rôle à un utilisateur',
  usage: '/add_role',
  options: [
    {
      name: 'email',
      description: 'prenom.nom@epitech.eu',
      type: 'STRING',
      required: true,
    },
    {
      name: 'role',
      description: '@AER',
      type: 'ROLE',
      required: true,
    },
  ],
};

const command: SlashCommand = {
  permissions: PermissionsBitField.Flags.Administrator,

  execute: async (interaction) => {
    const login: string = interaction.options.get('email')?.value?.toString().toLowerCase() ?? '';
    const roleString: string = interaction.options.get('role')?.value?.toString() ?? '';

    if (roleString.trim() === '') {
      await interaction.reply('Le rôle n\'a pas été trouvé.');
      return;
    }

    const allRoles = await interaction.guild?.roles.fetch();
    const chosenRole = allRoles?.find((r) => r.id === roleString);

    if (!chosenRole) {
      await interaction.reply('Le rôle n\'a pas été trouvé.');
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      if (!isValidEpitechMail(login)) {
        await interaction.editReply('Veuillez entrer un e-mail Epitech (prénom.nom@epitech.eu)');
        return;
      }
      const role = await RoleModel.findOne({
        where: {
          roleName: chosenRole.name,
          login,
        },
      });

      if (role) {
        await interaction.editReply('L\'utilisateur a déjà ce rôle.');
        return;
      }

      await RoleModel.create({
        roleName: chosenRole.name,
        login,
      });

      await interaction.editReply('Rôle ajouté avec succès.');

      const user = await UserModel.findOne({
        where: {
          login,
        },
      });
      if (user) {
        await syncDatabaseUser(user, interaction.guild!);
        await interaction.editReply('Utilisateur déjà en DB, rôle ajouté avec succès.');
      }
    } catch (error) {
      Logger.error(`Error while using add role interaction for ${login}: ${error}`);
      writeBotLog(interaction.guild!, `Error while adding role interaction in: ${error}`);
    }
  },
};

export default { command, config };
