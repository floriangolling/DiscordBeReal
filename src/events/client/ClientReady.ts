import DiscordClient from '@/lib/client';
import Logger from '@/lib/logger';
import InitConfigBase from '@/configBase';
import env from '@/env';
import syncConfigModuleJob from '@/jobs/syncConfigModuleJob';
import syncStudentInfo from '@/jobs/syncUserJob';
import { writeBotLog } from '@/utils/discord';
import launchEpiReal from '@/epiReal';
import { renameSimon } from '@/utils/discord/userSynchronization';

let alreadySynced = false;

export default async (client: DiscordClient) => {
  Logger.info(`Logged in as ${client.user?.tag}!`);
  try {
    const guild = client.guilds.cache.get(env.GUILD_ID);
    if (!guild) {
      Logger.error('Guild not found in client ready event.');
      return;
    }

    try {
      await guild.members.fetch();
      await guild.roles.fetch(undefined, {
        force: true,
      });
      await guild.channels.fetch(undefined, {
        force: true,
      });
      renameSimon(guild);
      launchEpiReal(guild);
    } catch (err) {
      writeBotLog(guild, 'Error fetching guild members, roles or channels');
      Logger.error(`Error fetching guild members, roles or channels: \n\t${err}`);
    }
    if (alreadySynced) {
      Logger.info('Already synced configs');
      writeBotLog(guild, 'Already synced configs');
      return;
    }

    const BaseConfig = new InitConfigBase(guild);
    const baseConfigStatus = await BaseConfig.processConfig();
    if (!baseConfigStatus) {
      writeBotLog(guild, 'Failed to sync base config.');
      Logger.error('Failed to sync base config.');
    }
    const modularConfigStatus = await syncConfigModuleJob(client);

    if (!modularConfigStatus) {
      writeBotLog(guild, 'Failed to sync modular config.');
      Logger.error('Failed to sync modular config.');
    }

    await syncStudentInfo(client);

    Logger.info('Both configs synced successfully');
    writeBotLog(guild, ' Both configs synced successfully');
    alreadySynced = true;
  } catch (err) {
    const guild = client.guilds.cache.get(env.GUILD_ID);
    if (guild) {
      writeBotLog(guild, 'Error syncing configs');
      writeBotLog(guild, `${err}`);
    }
    Logger.error(`Error syncing configs: \n\t${err}`);
  }
};
