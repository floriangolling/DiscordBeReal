import Logger from '@/lib/logger';
import { ROLES_CONSTANTS } from '@/utils/const';
import { GuildMember } from 'discord.js';

export default async (member: GuildMember) => {
  try {
    Logger.debug('debug', `Fetching role with name ${ROLES_CONSTANTS.EXTERN} from guild ${member.guild.id}`);
    const role = member.guild.roles.cache.find((r) => r.name === ROLES_CONSTANTS.EXTERN);
    if (!role) {
      Logger.error('error', `Role with name ${ROLES_CONSTANTS.EXTERN} not found in guild ${member.guild.id}`);
      return;
    }
    await member.roles.add(role);
    Logger.debug('info', `Assigned role ${role.name} to new member ${member.user.tag} (${member.id})`);
  } catch (error) {
    Logger.error('error', `Error assigning role to new member: ${error}`);
  }
};
