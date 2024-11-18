import DiscordClient from '@/lib/client';
import env from '@/env';
import Logger from '@/lib/logger';
import { acquireLock, isLockAcquired, releaseLock } from '@/utils/mutex/configMutex';
import { getConfigFromDatabase, writeBotLog } from '@/utils/discord';
import InitConfigModule from '@/configModule';

export default async function syncConfigModuleJob(client: DiscordClient): Promise<boolean> {
  let guildCache = null;

  while (isLockAcquired()) {
    Logger.info('A config is already being processed. Please wait...');

    // eslint-disable-next-line no-await-in-loop, no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  acquireLock();
  try {
    Logger.info('Syncing config...');
    const config = await getConfigFromDatabase();
    if (config) {
      const guilds = await client.guilds.fetch();
      const guildConfig = guilds.find((c) => c.id === env.GUILD_ID);
      if (guildConfig) {
        const guild = await guildConfig.fetch();
        guildCache = guild;
        writeBotLog(guild, 'Syncing config...');
        const module = new InitConfigModule(guild, config, null);
        await module.processConfig();
        Logger.info('Config synced successfully');
      }
    }
  } catch (err) {
    if (guildCache) {
      writeBotLog(guildCache, `Error while syncing config: ${err}`);
    }
    Logger.error('Error while syncing config: ', err);
    return false;
  }
  if (guildCache) {
    writeBotLog(guildCache, 'Config sync successful');
  }
  releaseLock();
  return true;
}
