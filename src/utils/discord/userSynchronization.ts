import { Guild, GuildMember, Role } from 'discord.js';

import { UserSauronInfo } from '@/types/userSauronInfo';
import Logger from '@/lib/logger';
import { writeBotLog } from '@/utils/discord/index';
import { UserModel } from '@/database/models';
import {
  capitalizeFirstCharacter,
  removeDigitsFromEnd,
  sliceAtChar,
} from '@/utils';
import {
  BOOSTER_ROLE_ID, ROLES_CONSTANTS,
} from '@/utils/const';
import fetchUserData from '@/utils/sauron';
import env from '@/env';
import RoleModel from '@/database/models/model.role';
import { DateTime } from 'luxon';

async function removeRolesFromMember(member: GuildMember, roles: Role[]): Promise<void> {
  for (const role of member.roles.cache.values()) {
    try {
      if (!roles.find((r) => r.id === role.id) && role.id !== BOOSTER_ROLE_ID && role !== member.guild.roles.everyone && role.name !== ROLES_CONSTANTS.GAMING && role.name !== ROLES_CONSTANTS.PHOTOGRAPH) {
        writeBotLog(member.guild, `Removing role ${role.name} from ${member.user.username}`);
        Logger.debug(`Removing role ${role.name} from ${member.user.username}`);
        await member.roles.remove(role);
      }
    } catch (err) {
      writeBotLog(member.guild, `Error removing roles from member:${err}`);
      Logger.error('Error removing roles from member', { err });
    }
  }
}

export const renameSimon = async (guild: Guild) => {
  try {
    const member = guild.members.cache.find((m) => m.id === '567061665208598560');
    let d = DateTime.now().setZone('Europe/Paris');
    d = d.minus({ days: 1 });
    const formattedDate = d.toFormat('dd/MM/yyyy');

    if (member) {
      await member.setNickname(`Simon ${formattedDate}`);
      Logger.info('Simon updated', '567061665208598560');
    }
  } catch (err) {
    writeBotLog(guild, `Error renaming simon:${err}`);
    Logger.error('Error renaming simon', err);
  }
};

async function addRolesToMember(member: GuildMember, roles: Role[]): Promise<void> {
  try {
    await Promise.all(roles.map((role) => {
      if (!member.roles.cache.has(role.id)) {
        Logger.debug(`Adding role ${role.name} to ${member.user.username}`);
        return member.roles.add(role);
      }
      Logger.debug(`Role ${role.name} already added to ${member.user.username}`);
      return Promise.resolve();
    }));
  } catch (error) {
    writeBotLog(member.guild, `Error adding roles to member:${error}`);
    Logger.error('Error adding roles to member', { error });
  }
}

export async function getBaseRoles(guild: Guild, memberId: string, user: UserSauronInfo, login: string): Promise<Role[] | null> {
  try {
    const member = await guild.members.fetch(memberId);
    if (!member) {
      writeBotLog(guild, `Member not found: ${memberId}`);
      return null;
    }

    const roles = await guild.roles.fetch();
    const userRoles: Role[] = [];

    const databaseRoles = await RoleModel.findAll({
      where: {
        login,
      },
    });

    if (user.student === null && databaseRoles.length === 0) {
      if (member.roles.cache.some((r) => r.name === ROLES_CONSTANTS.STUDENT)) {
        const alumniRole = roles.find((r) => r.name === ROLES_CONSTANTS.ALUMNI);
        if (alumniRole) userRoles.push(alumniRole);
      } else {
        return null;
      }
      return userRoles;
    }

    if (env.DISCORD_MAKER.includes(login)) {
      const discordMakerRole = roles.find((r) => r.name === ROLES_CONSTANTS.DISCORD_MAKER);
      if (discordMakerRole) userRoles.push(discordMakerRole);
    }

    for (const role of databaseRoles) {
      const databaseRole = roles.find((r) => r.name === role.getDataValue('roleName'));
      if (databaseRole) userRoles.push(databaseRole);
    }
    if (userRoles.length > 0 && (userRoles.find((r) => r.name === ROLES_CONSTANTS.COMMUNICATION)
      || userRoles.find((r) => r.name === ROLES_CONSTANTS.DEVELOPPEMENT)
      || userRoles.find((r) => r.name === ROLES_CONSTANTS.ADMINISTRATION)
      || userRoles.find((r) => r.name === ROLES_CONSTANTS.DIRECTION)
      || userRoles.find((r) => r.name === ROLES_CONSTANTS.INTERVENANT))) {
      return userRoles;
    }

    if (user.student === null) {
      return userRoles.length === 0 ? null : userRoles;
    }

    const letters = user.student!.promotion!.match(/[a-zA-Z]+/g)?.join('') || null;
    const numbers = user.student!.promotion!.match(/\d+/g)?.join('') || null;

    if (letters === null || numbers === null) {
      writeBotLog(guild, `Error getting promotion: ${login} - ${user.student.promotion}`);
    } else {
      const promoRole = roles.find((r) => r.name === `${letters} ${numbers}`);
      if (!promoRole) {
        const alumniRole = roles.find((r) => r.name === ROLES_CONSTANTS.ALUMNI);
        if (alumniRole) userRoles.push(alumniRole);
        writeBotLog(guild, `Promo role not found: ${letters} ${numbers}`);
      }
      if (promoRole) {
        const studentRole = roles.find((r) => r.name === ROLES_CONSTANTS.STUDENT);
        if (studentRole) userRoles.push(studentRole);
        userRoles.push(promoRole);
      }
    }

    if (member.roles.cache.some((r) => r.id === BOOSTER_ROLE_ID)) {
      const boosterRole = guild.roles.cache.find((r) => r.id === BOOSTER_ROLE_ID);
      if (boosterRole) userRoles.push(boosterRole);
    }

    return userRoles;
  } catch (err) {
    writeBotLog(guild, `Error getting base roles:${err}`);
    Logger.error('Error getting base roles', err);
    return null;
  }
}

export async function renameUser(guild: Guild, memberId: string, login: string) : Promise<boolean> {
  try {
    const member = await guild.members.fetch(memberId);
    if (!member) {
      writeBotLog(guild, `Member not found: ${memberId}`);
      return false;
    }

    if (member.user.id === '567061665208598560') {
      await renameSimon(guild);
      return true;
    }

    const loginBits = sliceAtChar(login, '@').split('.');
    if (loginBits.length >= 2) {
      const firstName = capitalizeFirstCharacter(removeDigitsFromEnd(loginBits[0]));
      const lastName = loginBits[1].toUpperCase();
      let fullName = `${firstName} ${lastName}`;
      if (fullName.length > 31) {
        fullName = fullName.slice(0, 31);
      }
      await member.setNickname(fullName);
      Logger.info('Member updated', memberId);
    }
    return true;
  } catch (err) {
    writeBotLog(guild, `Error renaming user:${err}`);
    Logger.error('Error renaming user', err);
    return false;
  }
}

async function addExternRole(memberId: string, guild: Guild): Promise<void> {
  try {
    const roles = guild.roles.cache;
    const member = await guild.members.fetch(memberId);

    let externRole = roles.find((r) => r.name === ROLES_CONSTANTS.EXTERN);

    if (!externRole) {
      const refetchRoles = await guild.roles.fetch(undefined, {
        force: true,
        cache: false,
      });
      externRole = refetchRoles.find((r) => r.name === ROLES_CONSTANTS.EXTERN);
    }

    if (externRole && !member.roles.cache.find((r) => r.name === ROLES_CONSTANTS.EXTERN)) {
      await member.roles.add(externRole);
    } else if (!externRole) {
      writeBotLog(guild, `(add extern) Role not found: ${ROLES_CONSTANTS.EXTERN}`);
      Logger.error('Role not found', ROLES_CONSTANTS.EXTERN);
    }
  } catch (err) {
    writeBotLog(guild, `Error adding extern role:${err}`);
    Logger.error('Error adding extern role', err);
  }
}

export async function syncDatabaseUser(user: UserModel, guild: Guild) {
  const login: string = user.getDataValue('login');
  const discordId: string = user.getDataValue('discordId');

  try {
    const sauronUserData = await fetchUserData(login);

    if (!sauronUserData) {
      writeBotLog(guild, `No user data found for user ${login}`);
      await addExternRole(discordId, guild);
      return false;
    }

    const renamed = await renameUser(guild, discordId, login);

    if (!renamed) {
      return false;
    }

    const baseRoles = await getBaseRoles(guild, discordId, sauronUserData, login);
    const otherRoles : Role[] | null = [];

    if (baseRoles === null || baseRoles.length === 0) {
      writeBotLog(guild, `No roles found for user ${login}`);
      await addExternRole(discordId, guild);
      return false;
    }

    const member = await guild.members.fetch(discordId);

    await addRolesToMember(member, baseRoles.concat(otherRoles || []));
    await removeRolesFromMember(member, baseRoles.concat(otherRoles || []));
    return true;
  } catch (err) {
    Logger.error(`Error while syncing user ${login}: ${err}`);
    writeBotLog(guild, `Error while syncing user ${login}: ${err}`);
    return false;
  }
}
