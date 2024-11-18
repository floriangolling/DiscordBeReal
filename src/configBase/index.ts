import Logger from '@/lib/logger';
import path from 'path';
import fs from 'fs';
import {
  ForumChannel, Guild, OverwriteResolvable, PermissionResolvable, TextChannel,
} from 'discord.js';
import { ARCHIVE_CATEGORY_NAME, PROMOTIONS_PLACEHOLDER, ROLES_CONSTANTS } from '@/utils/const';
import { ConfigBase } from '@/types/configBase';
import {
  editChannelPermissions, findOrCreateCategory, findOrCreateChannelInCategory, findOrCreateRole, removeExternPermissions, writeBotLog,
} from '../utils/discord';

export default class InitConfigBase {
  private readonly _guild: Guild;

  constructor(guild: Guild) {
    this._guild = guild;
  }

  public async processConfig() {
    await this._guild.roles.fetch(undefined, {
      force: true,
    });
    const configPath = path.resolve(__dirname, '../../base.config.json');
    let config: ConfigBase;

    try {
      const data = fs.readFileSync(configPath, 'utf8');
      config = JSON.parse(data);
    } catch (error) {
      Logger.error(`Failed to read or parse config file: ${error}`);
      return false;
    }

    try {
      const { everyone } = this._guild.roles;
      await everyone.edit({
        permissions: everyone.permissions.remove('ChangeNickname'),
      });
      Logger.info('Disabled nickname change for everyone');
      writeBotLog(this._guild, 'Disabled nickname change for everyone');
    } catch (err) {
      Logger.error(`Failed to disable nickname change for everyone: ${err}`);
      writeBotLog(this._guild, `Failed to disable nickname change for everyone: ${err}`);
    }

    const archiveCategory = await findOrCreateCategory(this._guild, ARCHIVE_CATEGORY_NAME);
    if (!archiveCategory) {
      Logger.error(`Failed to initialize category for ${ARCHIVE_CATEGORY_NAME}`);
      writeBotLog(this._guild, `Failed to initialize category for ${ARCHIVE_CATEGORY_NAME}`);
      return true;
    }

    if (config.roles) {
      let rolePosition = 4;
      for (const roleConfig of config.roles) {
        const role = await findOrCreateRole(
          this._guild,
          roleConfig.name,
          roleConfig.color,
          roleConfig.permissions,
          roleConfig.displaySeparately,
        );
        try {
          const roleLength = this._guild.roles.cache.size;
          await role?.setPosition(roleLength - rolePosition);
        } catch (err) {
          Logger.error(`Failed to set position for role ${roleConfig.name}: ${err}`);
          writeBotLog(this._guild, `Failed to set position for role ${roleConfig.name}: ${err}`);
        }
        rolePosition += 1;
      }
    } else {
      writeBotLog(this._guild, 'No roles found in config.');
      Logger.warn('No roles found in config.');
    }
    if (config.categories) {
      for (const categoryConfig of config.categories) {
        if (categoryConfig.name === PROMOTIONS_PLACEHOLDER) {
          // eslint-disable-next-line no-continue
          continue;
        }

        let index = 0;

        const category = await findOrCreateCategory(this._guild, categoryConfig.name);

        if (!category) {
          Logger.error(`Couldnt create category: ${categoryConfig.name}`);
          writeBotLog(this._guild, `Couldnt create category: ${categoryConfig.name}`);
          // eslint-disable-next-line no-continue
          continue;
        }

        for (const channelConfig of categoryConfig.channels) {
          const channel = await findOrCreateChannelInCategory(this._guild, channelConfig.name, category, channelConfig.type);

          if (!channel) {
            Logger.error(`Couldnt create channel: ${channelConfig.name}`);
            writeBotLog(this._guild, `Couldnt create channel: ${channelConfig.name}`);
            // eslint-disable-next-line no-continue
            continue;
          }

          if (channelConfig.description && (channelConfig.type === 'GuildText' || channelConfig.type === 'GuildForum')) {
            if ((channel as TextChannel | ForumChannel).topic !== channelConfig.description) {
              writeBotLog(this._guild, `Setting description for channel ${channelConfig.name}`);
              try {
                await (channel as TextChannel | ForumChannel).setTopic(channelConfig.description);
                writeBotLog(this._guild, `Set description for channel ${channelConfig.name}`);
              } catch (err) {
                Logger.error(`Failed to set description for channel ${channelConfig.name}`);
                writeBotLog(this._guild, `Failed to set description for channel ${channelConfig.name}`);
              }
            }
          }

          const roles = this._guild.roles.cache;
          const permissionOverwrites: OverwriteResolvable[] = [];

          for (const role of roles.values()) {
            const allow = [] as PermissionResolvable[];
            const deny = [] as PermissionResolvable[];
            let denyRole = false;

            if (Array.isArray(channelConfig.read)) {
              if (Array.isArray(channelConfig.deny) && channelConfig.deny.includes(role.name)) {
                denyRole = true;
              } else if (channelConfig.read.includes(role.name) || (channelConfig.read.includes('*') && role.name !== '@everyone')) {
                allow.push('ViewChannel', 'Speak');
              } else {
                deny.push('ViewChannel', 'Speak');
              }
            }
            if (Array.isArray(channelConfig.write)) {
              if (Array.isArray(channelConfig.deny) && channelConfig.deny.includes(role.name)) {
                denyRole = true;
              } else if (channelConfig.write.includes(role.name) || (channelConfig.write.includes('*') && role.name !== '@everyone')) {
                allow.push('SendMessages', 'Speak');
              } else {
                deny.push('SendMessages', 'Speak');
              }
            }

            if (denyRole) {
              deny.push('ViewChannel', 'SendMessages', 'Speak');
            }

            permissionOverwrites.push({
              allow,
              deny,
              id: role.id,
            });
          }

          const everyoneAllow = [] as PermissionResolvable[];
          const everyOneDeny = [] as PermissionResolvable[];

          if (Array.isArray(channelConfig.read) && channelConfig.read.includes('*')) {
            everyoneAllow.push('ViewChannel');
          } else if (Array.isArray(channelConfig.read) && !channelConfig.read.includes('*')) {
            everyOneDeny.push('ViewChannel');
          }

          if (Array.isArray(channelConfig.write) && channelConfig.write.includes('*')) {
            everyoneAllow.push('SendMessages', 'Speak');
          } else if (Array.isArray(channelConfig.write) && !channelConfig.write.includes('*')) {
            everyOneDeny.push('SendMessages', 'Speak');
          }

          permissionOverwrites.push({
            deny: everyOneDeny,
            allow: everyoneAllow,
            id: this._guild.roles.everyone.id,
          });

          const status = await editChannelPermissions(channel, permissionOverwrites);

          if (!status) {
            Logger.error(`Failed to initialize permissions for channel ${channelConfig.name}`);
            writeBotLog(this._guild, `Failed to initialize permissions for channel ${channelConfig.name}`);
          } else {
            Logger.info(`Initialized permissions for channel ${channelConfig.name}`);
          }

          await (channel as TextChannel).setPosition(index, {
            relative: false,
          });

          index += 1;
        }
      }
    }

    const archivePermissions: OverwriteResolvable[] = [];

    const discordMaker = await findOrCreateRole(this._guild, ROLES_CONSTANTS.DISCORD_MAKER);

    if (discordMaker) {
      archivePermissions.push({
        id: discordMaker.id,
        allow: ['ViewChannel', 'SendMessages'],
      });
    }

    archivePermissions.push({
      id: this._guild.roles.everyone.id,
      deny: ['ViewChannel', 'SendMessages'],
    });

    const status = await editChannelPermissions(archiveCategory, archivePermissions);

    if (!status) {
      Logger.error(`Failed to initialize permissions for category ${ARCHIVE_CATEGORY_NAME}`);
      writeBotLog(this._guild, `Failed to initialize permissions for category ${ARCHIVE_CATEGORY_NAME}`);
    } else {
      Logger.info(`Initialized permissions for category ${ARCHIVE_CATEGORY_NAME}`);
    }

    await removeExternPermissions(this._guild);
    return true;
  }
}
