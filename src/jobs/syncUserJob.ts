import DiscordClient from '@/lib/client';
import User from '@/database/models/model.user';
import env from '@/env';
import Logger from '@/lib/logger';
import { writeBotLog } from '@/utils/discord';
import { syncDatabaseUser } from '@/utils/discord/userSynchronization';

/**
 * @param client
 * @description
 * This function is responsible for synchronizing the discord user's information
 * with sauron's user information
 * @returns
 */

export default async function syncUserJob(client: DiscordClient): Promise<void> {
  try {
    await client.guilds.fetch();
    const users = await User.findAll({ where: { verified: true } });
    const guild = client.guilds.cache.get(env.GUILD_ID);

    if (!guild) {
      Logger.error('Guild not found');
      return;
    }

    Logger.info('Starting user synchronization');
    writeBotLog(client.guilds.cache.get(env.GUILD_ID)!, 'Starting user synchronization');

    for (const user of users) {
      const syncStatus = await syncDatabaseUser(user, guild);
      if (!syncStatus) {
        writeBotLog(client.guilds.cache.get(env.GUILD_ID)!, `Error while syncing user: ${user.login}`);
        Logger.error(`Error while syncing user: ${user.login}`);
      }
    }

    writeBotLog(client.guilds.cache.get(env.GUILD_ID)!, 'User synchronization completed');
    Logger.info('User synchronization completed');
  } catch (err) {
    writeBotLog(client.guilds.cache.get(env.GUILD_ID)!, `Error while syncing users: ${err}`);
    Logger.error(`Error while syncing users: ${err}`);
  }
}
