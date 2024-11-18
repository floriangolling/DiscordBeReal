import { ConfigFile, ConfigFileChannel } from '@/types/configModule';
import { ConfigModel } from '@/database/models';
import Logger from '@/lib/logger';
import {
  ARCHIVE_CATEGORY_NAME, LOG_CHANNEL_NAME, PROMOTION_PREFIX,
  ROLES_CONSTANTS,
} from '@/utils/const';
import { formatChannelName } from '@/utils';
import {
  CategoryChannel,
  ChannelType,
  Collection,
  ColorResolvable,
  Guild,
  GuildBasedChannel,
  OverwriteResolvable,
  PermissionFlagsBits,
  PermissionsBitField,
  PrivateThreadChannel,
  PublicThreadChannel,
  Role,
  TextChannel,
} from 'discord.js';
import AvailableChannelType from '@/types/availableChannelType';

export const permissionFlagMap: { [key: string]: bigint } = {
  KICK_MEMBERS: PermissionFlagsBits.KickMembers,
  BAN_MEMBERS: PermissionFlagsBits.BanMembers,
  MODERATE_MEMBERS: PermissionFlagsBits.ModerateMembers,
  MANAGE_MESSAGES: PermissionFlagsBits.ManageMessages,
  VIEW_AUDIT_LOG: PermissionFlagsBits.ViewAuditLog,
  MUTE_MEMBERS: PermissionFlagsBits.MuteMembers,
  DEAFEN_MEMBERS: PermissionFlagsBits.DeafenMembers,
  MOVE_MEMBERS: PermissionFlagsBits.MoveMembers,
  SEND_MESSAGES: PermissionFlagsBits.SendMessages,
  READ_MESSAGE_HISTORY: PermissionFlagsBits.ReadMessageHistory,
  CONNECT: PermissionFlagsBits.Connect,
  SPEAK: PermissionFlagsBits.Speak,
  STREAM: PermissionFlagsBits.Stream,
  VIEW_CHANNEL: PermissionFlagsBits.ViewChannel,
  PRIORITY_SPEAKER: PermissionFlagsBits.PrioritySpeaker,
  ADMINISTRATOR: PermissionFlagsBits.Administrator,
  MENTION_EVERYONE: PermissionFlagsBits.MentionEveryone,
  ADD_REACTIONS: PermissionFlagsBits.AddReactions,
  CREATE_PUBLIC_THREAD: PermissionFlagsBits.CreatePublicThreads,
  SEND_THREAD_MESSAGE: PermissionFlagsBits.SendMessagesInThreads,
};

/**
 * Converts a string to the corresponding ChannelType enum value.
 * @param type - The string representing the channel type.
 * @returns The corresponding ChannelType value.
 */
export default function stringToChannelType(
  type: string,
):
  | ChannelType.GuildAnnouncement
  | ChannelType.GuildText
  | ChannelType.GuildForum
  | ChannelType.GuildVoice {
  switch (type) {
    case 'GuildAnnouncement':
      return ChannelType.GuildAnnouncement;
    case 'GuildText':
      return ChannelType.GuildText;
    case 'GuildVoice':
      return ChannelType.GuildVoice;
    case 'GuildForum':
      return ChannelType.GuildForum;
    default:
      throw new Error(`Unknown channel type: ${type}`);
  }
}

export async function findOrCreateCategory(guild: Guild, categoryName: string) {
  try {
    let category = guild.channels.cache.find(
      (channel) => channel
            && channel.name
              === categoryName && channel.type === ChannelType.GuildCategory,
    ) as CategoryChannel;

    if (category) return category;

    category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
    });
    return category;
  } catch (err) {
    Logger.error(`Failed to create category ${categoryName}`, err);
    return null;
  }
}

export async function findOrCreateRole(
  guild: Guild,
  roleName: string,
  roleColor?: ColorResolvable,
  permissions?: string[],
  displaySeparately?: boolean,
): Promise<Role | null> {
  try {
    let role = guild.roles.cache.find((r) => r.name === roleName);

    const resolvedPermissions = permissions
      ? new PermissionsBitField(permissions.map((perm) => permissionFlagMap[perm]))
      : undefined;

    if (!role) {
      Logger.info(`Role ${roleName} does not exist. Creating...`);
      role = await guild.roles.create({
        name: roleName,
        color: roleColor,
        permissions: resolvedPermissions || [],
        hoist: displaySeparately || false,
      });
      Logger.info(`Role ${roleName} created successfully.`);
    } else {
      Logger.info(`Role ${roleName} already exists.`);

      if (resolvedPermissions && !role.permissions.equals(resolvedPermissions)) {
        await role.setPermissions(resolvedPermissions);
        Logger.info(`Updated permissions for role ${roleName}: ${permissions}.`);
      }

      if (typeof displaySeparately !== 'undefined' && role.hoist !== displaySeparately) {
        await role.setHoist(displaySeparately);
        Logger.info(`Updated display separately setting for role ${roleName}: ${displaySeparately}.`);
      }

      if (roleColor && role.color !== roleColor) {
        await role.setColor(roleColor);
        Logger.info(`Updated color for role ${roleName}: ${roleColor}.`);
      }
    }
    return role;
  } catch (error) {
    Logger.error(`Error ensuring role exists: ${error}`);
    return null;
  }
}

export async function findOrCreateChannelInCategory(guild: Guild, channelName: string, category: CategoryChannel, type: AvailableChannelType) {
  try {
    let channel = guild.channels.cache.find(
      (c) => c
            && c.name === formatChannelName(channelName)
            && c.parentId === category.id
            && c.type === stringToChannelType(type),
    );

    if (channel) return channel;

    channel = await guild.channels.create({
      name: formatChannelName(channelName),
      type: stringToChannelType(type),
      parent: category,
    });
    return channel;
  } catch (err) {
    Logger.error(`Failed to create channel ${channelName} in category ${category.name}`, err);
    return null;
  }
}

export async function editChannelPermissions(channel: GuildBasedChannel, permissions: OverwriteResolvable[]) {
  try {
    await channel.edit({
      permissionOverwrites: permissions,
    });
    return true;
  } catch (err) {
    Logger.error(`Failed to edit permissions for channel ${channel.name}`, err);
    return false;
  }
}

export async function sortChannelsInCategory(guild: Guild, category: CategoryChannel, commonChannels: ConfigFileChannel[], configChannels: ConfigFileChannel[]) {
  try {
    const channels = guild.channels.cache;

    const categorizedChannels: Exclude<
      GuildBasedChannel,
      PrivateThreadChannel | PublicThreadChannel<boolean>
    >[] = [];

    channels.forEach((channel) => {
      if (
        channel
        && channel.parentId === category.id
        && channel.type !== ChannelType.PrivateThread
        && channel.type !== ChannelType.PublicThread
      ) {
        categorizedChannels.push(
          channel as Exclude<
            GuildBasedChannel,
            PrivateThreadChannel | PublicThreadChannel<boolean>
          >,
        );
      }
    });

    const commonConfigChannels = categorizedChannels.filter((channel) => commonChannels.some((config) => config.name === channel.name));

    const otherConfigChannels = categorizedChannels.filter(
      (channel) => !commonChannels.some((config) => config.name === channel.name)
        && configChannels.some((config) => config.name === channel.name),
    );

    const remainingChannels = categorizedChannels.filter(
      (channel) => !commonChannels.some((config) => config.name === channel.name)
        && !configChannels.some((config) => config.name === channel.name),
    );

    const orderedCommonChannels = commonConfigChannels.sort(
      (a, b) => commonChannels.findIndex((config) => config.name === a.name)
        - commonChannels.findIndex((config) => config.name === b.name),
    );

    const orderedOtherConfigChannels = otherConfigChannels.sort(
      (a, b) => configChannels.findIndex((config) => config.name === a.name)
        - configChannels.findIndex((config) => config.name === b.name),
    );

    const sortedRemainingChannels = remainingChannels.sort((a, b) => a.name!.localeCompare(b.name!));

    const orderedChannels = [
      ...orderedCommonChannels,
      ...orderedOtherConfigChannels,
      ...sortedRemainingChannels,
    ];

    // eslint-disable-next-line no-restricted-syntax
    for (const [index, channel] of orderedChannels.entries()) {
      if (channel.position !== index) {
        // eslint-disable-next-line no-await-in-loop
        await channel.setPosition(index, {
          relative: false,
          reason: 'Sort channels',
        });
      }
    }
    return true;
  } catch (err) {
    Logger.error(`Failed to sort channels in category ${category.name}`, err);
    return false;
  }
}

export async function addToArchiveCategory(guild: Guild, channel: GuildBasedChannel) {
  try {
    const archiveCategory = await findOrCreateCategory(guild, ARCHIVE_CATEGORY_NAME);

    if (!archiveCategory) {
      Logger.error('Failed to create Archive category');
      return false;
    }

    const channelNewName = `${channel.name}${channel.parent?.name ? ` (${channel.parent.name})` : new Date().toISOString()}`;

    await (channel as TextChannel).setParent(archiveCategory, {
      lockPermissions: false,
    });

    const newPermissions = [{
      id: guild.id,
      deny: ['ViewChannel'],
    }] as OverwriteResolvable[];

    const discordMaker = await findOrCreateRole(guild, ROLES_CONSTANTS.DISCORD_MAKER);

    if (discordMaker) {
      newPermissions.push({
        id: discordMaker.id,
        allow: ['ViewChannel', 'SendMessages'],
      });
    }

    await channel.edit({
      name: channelNewName,
      permissionOverwrites: newPermissions,
    });

    await archiveCategory.permissionOverwrites.set([
      {
        id: channel.guild.id,
        deny: ['ViewChannel'],
      },
    ]);

    return true;
  } catch (err) {
    Logger.error(`Failed to move channel ${channel.name} to Archive category`, err);
    return false;
  }
}

export async function deleteNotUsedChannelsInCategory(guild: Guild, category: CategoryChannel, usedChannelsNames: string[]) {
  const channelsToDelete = guild.channels.cache.filter((channel) => channel.parentId === category.id && !usedChannelsNames.includes(channel.name));
  let returnStatus = true;

  for (const channel of channelsToDelete.values()) {
    const status = await addToArchiveCategory(guild, channel);
    if (!status) returnStatus = false;
    Logger.info(`Channel ${channel.name} moved to Archive category`);
  }
  return returnStatus;
}

export async function cleanOldPromotions(guild: Guild, foundCategories: CategoryChannel[], config: ConfigFile) {
  const categoryPromotions = guild.channels.cache.filter(
    (category) => category
      && category.type === ChannelType.GuildCategory
      && category.name.includes(PROMOTION_PREFIX),
  );

  for (const category of categoryPromotions.values()) {
    if (!foundCategories.some((c) => c.id === category!.id)) {
      const channelsToDelete = guild.channels.cache.filter((channel) => channel.parentId === category!.id && !config['*'].some((c) => c.name === channel!.name));

      for (const channel of channelsToDelete.values()) {
        const archived = await addToArchiveCategory(guild, channel);
        if (!archived) {
          Logger.error(`Failed to move channel ${channel.name} to Archive category`);
        }
      }
      const sorted = await sortChannelsInCategory(guild, category as CategoryChannel, [], []);
      if (!sorted) {
        Logger.error(`Failed to sort channels in category ${category!.name}`);
      }
    }
  }
}

export async function sortPromotionCategory(guild: Guild) {
  const categories = guild.channels.cache.filter(
    (channel) => channel && channel.type === ChannelType.GuildCategory,
  ) as Collection<string, CategoryChannel>;

  const nonPromotionCategories = categories.filter((category: CategoryChannel) => !category.name.startsWith(PROMOTION_PREFIX));
  const promotionCategories = categories.filter((category: CategoryChannel) => category.name.startsWith(PROMOTION_PREFIX));

  const sortedNonPromotionCategories = nonPromotionCategories.sort((a: CategoryChannel, b: CategoryChannel) => a.name.localeCompare(b.name));
  const sortedPromotionCategories = promotionCategories.sort((a: CategoryChannel, b: CategoryChannel) => b.name.localeCompare(a.name));

  const sortedCategories = sortedNonPromotionCategories.concat(sortedPromotionCategories);

  let position = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [i, channel] of sortedCategories.entries()) {
    // eslint-disable-next-line no-await-in-loop
    await channel.setPosition(position, {
      relative: false,
      reason: 'sort categories',
    });
    position += 1;
  }
}

export async function saveConfigToDatabase(file: ConfigFile) {
  try {
    const config = await ConfigModel.findOne();
    if (!config) {
      await ConfigModel.create({ data: file });
    } else {
      config.set('data', file);
      await config.save();
    }
    Logger.info('Config saved to database');
    return true;
  } catch (err) {
    Logger.error(`Error in saveConfigToDatabase: ${err}`);
    return false;
  }
}

export async function getConfigFromDatabase() {
  try {
    const config = await ConfigModel.findOne();
    if (!config) {
      Logger.info('No config found in database');
      return null;
    }
    return config.getDataValue('data') as ConfigFile;
  } catch (err) {
    Logger.error(`Error in getConfigFromDatabase: ${err}`);
    return null;
  }
}

export async function getRolesPedago(guild: Guild) {
  try {
    const roles = guild.roles.cache;
    const rolesPedago: Role[] = [];

    const rolePedago = roles.find((role) => role.name === ROLES_CONSTANTS.PEDAGO);
    if (rolePedago) rolesPedago.push(rolePedago);
    const roleDiscordMaker = roles.find((role) => role.name === ROLES_CONSTANTS.DISCORD_MAKER);
    if (roleDiscordMaker) rolesPedago.push(roleDiscordMaker);
    const roleDev = roles.find((role) => role.name === ROLES_CONSTANTS.DEVELOPPEMENT);
    if (roleDev) rolesPedago.push(roleDev);
    const roleCommunication = roles.find((role) => role.name === ROLES_CONSTANTS.COMMUNICATION);
    if (roleCommunication) rolesPedago.push(roleCommunication);
    const roleAER = roles.find((role) => role.name === ROLES_CONSTANTS.AER);
    if (roleAER) rolesPedago.push(roleAER);
    const roleIntervenant = roles.find((role) => role.name === ROLES_CONSTANTS.INTERVENANT);
    if (roleIntervenant) rolesPedago.push(roleIntervenant);
    const roleAdministratio = roles.find((role) => role.name === ROLES_CONSTANTS.ADMINISTRATION);
    if (roleAdministratio) rolesPedago.push(roleAdministratio);
    const directionRole = roles.find((role) => role.name === ROLES_CONSTANTS.DIRECTION);
    if (directionRole) rolesPedago.push(directionRole);

    return rolesPedago;
  } catch (error) {
    Logger.error(`Error getting role for pedago: ${error}`);
    return [];
  }
}

export async function getRolesResModule(guild: Guild, key: string) {
  try {
    const roles = guild.roles.cache;

    const roleName = key.replace('_', '');
    const rolesRespModule = roles.filter((role) => role.name.includes(`Resp ${roleName}`));
    return rolesRespModule.map((role) => role);
  } catch (error) {
    Logger.error(`Error getting role for ${key}: ${error}`);
    return [];
  }
}

export async function writeBotLog(guild: Guild, message: string) {
  try {
    if (!guild) { return; }
    const logChannel = guild.channels.cache.find((channel) => channel.name === LOG_CHANNEL_NAME) as TextChannel;
    if (!logChannel) {
      Logger.error('Bot log channel not found');
      return;
    }
    await logChannel.send(`[${new Date().toISOString()}] ${message}`);
  } catch (err) {
    Logger.error(`Failed to write bot log: ${err}`);
  }
}

export async function removeExternPermissions(guild: Guild) {
  try {
    const externRole = guild.roles.cache.find((role) => role.name === ROLES_CONSTANTS.EXTERN);
    const everyoneRole = guild.roles.everyone;

    if (!externRole) {
      Logger.error('Extern role not found');
      return;
    }
    if (!externRole.permissions.has('AddReactions') && !everyoneRole.permissions.has('AddReactions')) return;
    await externRole.edit({
      permissions: externRole.permissions.remove(['AddReactions']),
    });
    await everyoneRole.edit({
      permissions: everyoneRole.permissions.remove(['AddReactions']),
    });
    Logger.info('Extern permissions removed');
    writeBotLog(guild, 'Extern permissions removed');
  } catch (err) {
    writeBotLog(guild, `Failed to remove extern permissions: ${err}`);
    Logger.error(`Failed to remove extern permissions: ${err}`);
  }
}
