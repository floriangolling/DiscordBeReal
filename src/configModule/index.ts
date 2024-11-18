import { ConfigFile, ConfigFileChannel, ConfigFilePromotion } from '@/types/configModule';
import { SlashCommandInteraction } from '@/types/command';
import { formatChannelName, getTekYearFromPromotion } from '@/utils';
import {
  CategoryChannel, ChannelType, Colors, Guild, OverwriteResolvable,
} from 'discord.js';
import {
  ARCHIVE_CATEGORY_NAME, PROMOTION_ENDING, PROMOTION_PREFIX, PROMOTIONS_PLACEHOLDER,
  ROLES_CONSTANTS,
} from '@/utils/const';
import Logger from '@/lib/logger';
import {
  getRolesPedago, cleanOldPromotions, deleteNotUsedChannelsInCategory, editChannelPermissions, findOrCreateCategory, findOrCreateChannelInCategory, findOrCreateRole, sortChannelsInCategory,
} from '@/utils/discord';
import baseConfigJSON from '../../base.config.json';

export default class InitConfigModule {
  private readonly _config: ConfigFile;

  private readonly _guild: Guild;

  private readonly _interaction: SlashCommandInteraction | null;

  private readonly _processedCategory: CategoryChannel[];

  constructor(guild: Guild, config: ConfigFile, interaction: SlashCommandInteraction | null = null) {
    if (!guild) throw new Error('Guild must be provided.');
    if (!config) throw new Error('Config must be provided.');

    this._guild = guild;
    this._config = config;
    this._interaction = interaction;
    this._processedCategory = [] as CategoryChannel[];

    this._config = InitConfigModule.formatConfigModule(this._config);
  }

  async logBot(message: string) {
    if (this._interaction) {
      await this._interaction.editReply({
        content: message,
      });
    }
  }

  public static formatConfigModule(config: ConfigFile) {
    Object.keys(config).forEach((key) => {
      if (key === '*') {
        (config[key] as ConfigFileChannel[]).forEach((channel) => {
          channel.name = formatChannelName(channel.name);
        });
        return;
      }
      const configPromotion = config[key] as ConfigFilePromotion;
      configPromotion.channels.forEach((channel) => {
        channel.name = formatChannelName(channel.name);
      });
    });
    return config;
  }

  async processPromotionCategory(key: string) {
    // GENERATE CATEGORY AND ITS UTILS

    const rolesResPedagos = await getRolesPedago(this._guild);

    const promotionConfig = this._config[key] as ConfigFilePromotion;
    let promotionName = '';
    if (key.includes('_') && key.split('_')[0] === 'PGE') promotionName = `${key.split('_')[0]} ${getTekYearFromPromotion(parseInt(key.split('_')[1], 10))}`;
    if (key.includes('_') && key.split('_')[0] === 'MSC') promotionName = `${key.split('_')[0]} ${getTekYearFromPromotion(parseInt(key.split('_')[1], 10), 3)}`;
    if (key.includes('_') && key.split('_')[0] === 'WAC') promotionName = `${key.split('_')[0]} ${getTekYearFromPromotion(parseInt(key.split('_')[1], 10) + 1, 2)}`;

    const category = await findOrCreateCategory(this._guild, `${PROMOTION_PREFIX} ${promotionName}${PROMOTION_ENDING}`);

    if (!category) throw new Error(`Failed to initialize category for ${promotionName}`);

    const role = await findOrCreateRole(this._guild, promotionName, Colors.Default);

    if (!role) throw new Error(`Failed to initialize role for ${promotionName}`);

    const categoryRoleStatus = await editChannelPermissions(category, [
      {
        allow: ['ViewChannel'],
        id: role.id,
      },
      {
        deny: ['ViewChannel'],
        id: this._guild.id,
      },
    ]);

    if (!categoryRoleStatus) throw new Error(`Failed to initialize role permissions for ${promotionName}`);

    // GENERATE COMMON CHANNELS FOR PROMOTION

    for (const channel of this._config['*']) {
      const existingChannel = await findOrCreateChannelInCategory(this._guild, channel.name, category, channel.type);

      if (!existingChannel) throw new Error(`Failed to initialize channel ${channel.name} in category ${category.name}`);

      const permissionOverwrites: OverwriteResolvable[] = [
        {
          deny: ['ViewChannel'],
          id: this._guild.id,
        },
      ];

      if (channel.student_write === false) {
        permissionOverwrites.push({
          allow: ['ViewChannel'],
          deny: ['SendMessages', 'SendMessagesInThreads', 'CreatePrivateThreads', 'CreatePublicThreads'],
          id: role.id,
        });
      } else {
        permissionOverwrites.push({
          allow: ['ViewChannel', 'SendMessages', 'SendMessagesInThreads', 'CreatePrivateThreads', 'CreatePublicThreads'],
          id: role.id,
        });
      }

      rolesResPedagos.forEach((r) => {
        permissionOverwrites.push({
          allow: ['ViewChannel', 'SendMessages', 'SendMessagesInThreads', 'CreatePrivateThreads', 'CreatePublicThreads', 'Administrator'],
          id: r.id,
        });
      });

      const channelStatus = await editChannelPermissions(existingChannel, permissionOverwrites);

      if (!channelStatus) throw new Error(`Failed to initialize permissions for channel ${channel.name}`);
    }

    // GENERATE SPECIFIC CHANNELS FOR PROMOTION

    // /!\ TODO: This code is mostly the same as the one above, mix it into a single function

    for (const channel of promotionConfig.channels) {
      const existingChannel = await findOrCreateChannelInCategory(this._guild, channel.name, category, channel.type);

      if (!existingChannel) throw new Error(`Failed to initialize channel ${channel.name} in category ${category.name}`);

      const permissionOverwrites: OverwriteResolvable[] = [
        {
          deny: ['ViewChannel'],
          id: this._guild.id,
        },
      ];

      if (channel.student_write === false) {
        permissionOverwrites.push({
          allow: ['ViewChannel'],
          deny: ['SendMessages', 'SendMessagesInThreads', 'CreatePrivateThreads', 'CreatePublicThreads'],
          id: role.id,
        });
      } else {
        permissionOverwrites.push({
          allow: ['ViewChannel', 'SendMessages', 'SendMessagesInThreads', 'CreatePrivateThreads', 'CreatePublicThreads'],
          id: role.id,
        });
      }

      rolesResPedagos.forEach((r) => {
        permissionOverwrites.push({
          allow: ['ViewChannel', 'SendMessages', 'SendMessagesInThreads', 'CreatePrivateThreads', 'CreatePublicThreads', 'Administrator'],
          id: r.id,
        });
      });

      const channelStatus = await editChannelPermissions(existingChannel, permissionOverwrites);

      if (!channelStatus) throw new Error(`Failed to initialize permissions for channel ${channel.name}`);
    }

    const sorted = await sortChannelsInCategory(this._guild, category, this._config['*'], promotionConfig.channels);

    if (!sorted) throw new Error(`Failed to sort channels in category ${category.name}`);

    const foundChannels = [...this._config['*'], ...promotionConfig.channels].map((c) => formatChannelName(c.name));
    const cleaned = await deleteNotUsedChannelsInCategory(this._guild, category, foundChannels);

    if (!cleaned) throw new Error(`Failed to clean channels in category ${category.name}`);

    this._processedCategory.push(category);
    return true;
  }

  async processConfig() {
    await this._guild.roles.fetch(undefined, {
      force: true,
    });
    await this._guild.channels.fetch(undefined, {
      force: true,
    });
    await this._guild.members.fetch();

    for (const key of Object.keys(this._config)) {
      // eslint-disable-next-line no-continue
      if (key === '*') continue;
      if (!key.includes('_') || key.split('_').length !== 2) throw new Error(`Invalid key: ${key}`);

      await this.logBot(`Processing ${key}`);

      await this.processPromotionCategory(key);

      await this.logBot(`Processed ${key}`);
    }

    await this.logBot('Cleaning old promotions');

    await cleanOldPromotions(this._guild, this._processedCategory, this._config);

    await this.logBot('Sorting all categories');

    const archiveCategory = await findOrCreateCategory(this._guild, ARCHIVE_CATEGORY_NAME);

    if (archiveCategory) {
      const channels = this._guild.channels.cache;
      const categories = channels.filter((c) => c.type === ChannelType.GuildCategory);

      const notPromotionCategory = categories.filter((c) => c.name !== ARCHIVE_CATEGORY_NAME && !c.name.includes(PROMOTION_PREFIX)).sort((a, b) => a.name.localeCompare(b.name));
      const promotionCategory = categories.filter((c) => c.name.includes(PROMOTION_PREFIX)).sort((a, b) => b.name.localeCompare(a.name));

      const finalOrder = [];

      for (const c of baseConfigJSON.categories) {
        const category = notPromotionCategory.find((cat) => cat.name === c.name);
        if (category) {
          finalOrder.push(category);
        }
        if (c.name === PROMOTIONS_PLACEHOLDER) {
          for (const promotion of promotionCategory.values()) {
            finalOrder.push(promotion);
          }
        }
      }

      if (archiveCategory) {
        finalOrder.push(archiveCategory);
      }

      for (let i = 0; i < finalOrder.length; i += 1) {
        try {
          console.log('Setting position for ', (finalOrder[i] as CategoryChannel).name);
          await (finalOrder as CategoryChannel[])[i].setPosition(i);
        } catch (err) {
          Logger.error('Error while sorting categories: ', err);
          await this.logBot('Error while sorting categories');
        }
      }
    }

    const roles = this._guild.roles.cache;

    for (const role of roles.values()) {
      if (role.name !== ROLES_CONSTANTS.DISCORD_MAKER) {
        try {
          if (role.permissions.has('ChangeNickname')) {
            await role.edit({
              permissions: role.permissions.remove('ChangeNickname'),
            });
            Logger.info(`Disabled nickname change for ${role.name}`);
          }
        } catch (err) {
          Logger.error(`Failed to disable nickname change for ${role.name}: ${err}`);
        }
      } else {
        try {
          if (!role.permissions.has('ChangeNickname')) {
            await role.edit({
              permissions: role.permissions.add('ChangeNickname'),
            });
            Logger.info(`Enabled nickname change for ${role.name}`);
          }
        } catch (err) {
          Logger.error(`Failed to enable nickname change for ${role.name}: ${err}`);
        }
      }
    }

    await this.logBot('Config processed successfully');
  }
}
