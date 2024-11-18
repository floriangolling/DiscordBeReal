import EpirealModel from '@/database/models/model.epireal';
import cron from 'node-cron';
import { DateTime } from 'luxon';
import { writeBotLog } from '@/utils/discord';
import {
  EmbedBuilder, Guild, Role, TextChannel,
} from 'discord.js';
import { EPIREAL_CHANNEL_NAME, ROLES_CONSTANTS } from '@/utils/const';
import EpirealScoreModel from '@/database/models/model.epireal-score';
import Logger from '@/lib/logger';

type Loser = {
  id: string;
  streak: number;
}

let inEpiReal = false;
let task : null | NodeJS.Timeout = null;
let postedToday : string[] = [];
let loosersToday : Loser[] = [];

export const getPostedToday = () => postedToday;

export const cleanPostedToday = async () => {
  postedToday = [];
};

export const addToPostedToday = async (discordId: string) => {
  if (!postedToday.includes(discordId))
    postedToday.push(discordId);
};

export const isEpiRealTime = () => inEpiReal;

export const setEpiRealTime = (value: boolean) => {
  inEpiReal = value;
};

async function getEpirealChannel(guild: Guild) : Promise<TextChannel | null> {
  try {
    const channels = await guild.channels.fetch(undefined, {
      force: true,
    });
    const epireal = channels.find((c) => c?.name === EPIREAL_CHANNEL_NAME);
    if (!epireal) {
      writeBotLog(guild, 'Error getting epireal channel');
      return null;
    }
    return epireal as TextChannel;
  } catch (err) {
    writeBotLog(guild, 'Error getting epireal channel');
    return null;
  }
}

async function getPhotographRole(guild: Guild) : Promise<Role | null> {
  try {
    const roles = await guild.roles.fetch(undefined, {
      force: true,
    });
    const photograph = roles.find((r) => r.name === ROLES_CONSTANTS.PHOTOGRAPH);
    if (!photograph) {
      writeBotLog(guild, 'Error getting photograph role');
      return null;
    }
    return photograph;
  } catch (err) {
    writeBotLog(guild, 'Error getting photograph role');
    return null;
  }
}

async function triggerEpiReal(guild: Guild) {
  setEpiRealTime(true);
  const channel = await getEpirealChannel(guild);
  const role = await getPhotographRole(guild);

  if (!role) {
    writeBotLog(guild, 'Error getting photograph role');
    setEpiRealTime(false);
    return;
  }
  if (!channel) {
    writeBotLog(guild, 'Error getting epireal channel');
    setEpiRealTime(false);
    return;
  }

  await channel.permissionOverwrites.edit(role, {
    SendMessages: true,
  });

  const franceTimezone = 'Europe/Paris';
  const franceTime = new Date().toLocaleString('en-US', {
    timeZone: franceTimezone, hour12: false, hour: '2-digit', minute: '2-digit',
  });
  const payload = new EmbedBuilder();

  payload
    .setTitle('Sors ton plus grand sourire, c\'est l\'heure du EpiReal !')
    .setDescription(`Cher ami <@&${role.id}>, il est l'heure de te prendre en photo là maintenant !\nSois naturel, ne change rien à ce qui t'entoure et capture le moment présent.\n\nTu as à partir de **maintenant 5 minutes** pour poster ta photo, au delà, il faudra attendre demain pour retenter ta chance !`)
    .setColor('#1978dd');

  await channel.send({ embeds: [payload], content: `Tic... tac.. tic... tac.. <@&${role.id}> : **${franceTime}** !` });

  setTimeout(async () => {
    try {
      setEpiRealTime(false);
      await channel.permissionOverwrites.edit(role, {
        SendMessages: false,
      });
      await channel.send('Tic... tac.. tic... tac.. C\'est la fin !');

      const allEpiRealusers = await EpirealScoreModel.findAll();

      for (const user of allEpiRealusers) {
        if (postedToday.includes(user.getDataValue('discordId'))) {
          const streak = user.getDataValue('streak');
          await user.update({
            streak: streak + 1,
            streakSave: 0,
          });
          const index = postedToday.indexOf(user.getDataValue('discordId'));
          if (index > -1) {
            postedToday.splice(index, 1);
          }
        } else {
          const streakSave = user.getDataValue('streakSave');
          if (streakSave < 3) {
            await user.update({
              streakSave: streakSave + 1,
            });
          } else {
            const lostStreak = user.getDataValue('streak');
            if (lostStreak !== 0 && !loosersToday.find((l) => l.id === user.getDataValue('discordId'))) {
              loosersToday.push({
                id: user.getDataValue('discordId'),
                streak: lostStreak,
              });
            }
            await user.update({
              streak: 0,
              streakSave: 0,
            });
          }
        }
      }
      for (const rest of postedToday) {
        await EpirealScoreModel.create({
          discordId: rest,
          streak: 1,
          streakSave: 0,
        });
      }

      const bestTen = await EpirealScoreModel.findAll({
        order: [['streak', 'DESC']],
        limit: 10,
      });

      const bestEmbed = new EmbedBuilder();
      let bestString = '';

      for (const best of bestTen) {
        try {
          const user = await guild.members.fetch(best.getDataValue('discordId'));
          if (!user) {
            await EpirealScoreModel.destroy({
              where: {
                discordId: best.getDataValue('discordId'),
              },
            });
            // eslint-disable-next-line no-continue
            continue;
          }
          bestString = bestString.concat(`${user.displayName} : ${best.streak}\n`);
        } catch (err) {
          await EpirealScoreModel.destroy({
            where: {
              discordId: best.getDataValue('discordId'),
            },
          });
          writeBotLog(guild, `Error fetching user: ${err}`);
          Logger.error(`Error fetching user: ${err}`);
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      if (bestString === '') {
        await channel.send('Plus personne avec un streak!');
      } else {
        bestEmbed
          .setTitle('Les 10 meilleurs streaks')
          .setDescription(bestString)
          .setColor('#1978dd');
        await channel.send({ embeds: [bestEmbed], content: 'Voici le top 10 des meilleurs streaks !' });
      }

      const looserEmbed = new EmbedBuilder();

      looserEmbed
        .setTitle('Les loosers du jour')
        .setColor('#1978dd');

      let loosersString = '';

      for (const looser of loosersToday) {
        try {
          const user = await guild.members.fetch(looser.id);
          if (!user) {
            // eslint-disable-next-line no-continue
            continue;
          }
          loosersString = loosersString.concat(`${user.displayName} : ${looser.streak}\n`);
        } catch (err) {
          writeBotLog(guild, `Error fetching user: ${err}`);
          Logger.error(`Error fetching user: ${err}`);
          // eslint-disable-next-line no-continue
          continue;
        }
      }
      if (loosersString === '') {
        channel.send('Personne n\'a perdu aujourd\'hui !');
      } else {
        looserEmbed.setDescription(loosersString);
        await channel.send({ embeds: [looserEmbed] });
      }

      loosersToday = [];
      cleanPostedToday();
    } catch (err) {
      writeBotLog(guild, `Error processing epi real: ${err}`);
      Logger.error(`Error processing epi real: ${err}`);
      await channel.permissionOverwrites.edit(role, {
        SendMessages: false,
      });
      setEpiRealTime(false);
    }
  }, 60 * 1000 * 5);
}

async function launchEpiReal(guild: Guild) {
  try {
    const existing = await EpirealModel.findOne();

    if (existing) {
      const now = DateTime.now().setZone('Europe/Paris');
      const nextProc = DateTime.fromJSDate(existing.nextProc).setZone('Europe/Paris');

      if (nextProc.toMillis() - now.toMillis() > 0) {
        if (task) {
          clearTimeout(task);
          task = null;
        }
        task = setTimeout(() => {
          triggerEpiReal(guild);
          task = null;
        }, nextProc.toMillis() - now.toMillis());
        writeBotLog(guild, `[EPI - REAL] Task scheduled to run in ${(nextProc.toMillis() - now.toMillis()) / 1000} seconds`);
      } else {
        writeBotLog(guild, '[EPI - REAL] Next proc is in the past, triggering now');
      }
    } else {
      writeBotLog(guild, '[EPI - REAL] No next proc found, triggering now');
    }

    cron.schedule('0 6 * * *', async () => {
      const now = DateTime.now().setZone('Europe/Paris');
      const randomHour = Math.floor(Math.random() * 18) + 6;
      const randomMinute = Math.floor(Math.random() * 58) + 1;
      const randomTime = now.set({ hour: randomHour, minute: randomMinute });
      const epireal = await EpirealModel.findOne();

      if (!epireal) {
        await EpirealModel.create({
          nextProc: randomTime.toJSDate(),
        });
      } else {
        await epireal.update({
          nextProc: randomTime.toJSDate(),
        });
      }

      writeBotLog(guild, `[EPI - REAL] Next proc will be at ${randomTime.hour}:${randomTime.minute}`);
      if (task) {
        writeBotLog(guild, '[EPI - REAL] Clean last task');
        clearTimeout(task);
        task = null;
      }

      task = setTimeout(() => {
        writeBotLog(guild, '[EPI - REAL] Triggered !');
        triggerEpiReal(guild);
        task = null;
      }, randomTime.toMillis() - now.toMillis());

      writeBotLog(guild, `[EPI - REAL] Task scheduled to run in ${(randomTime.toMillis() - now.toMillis()) / 1000} seconds`);
    }, {
      scheduled: true,
      timezone: 'Europe/Paris',
    });
  } catch (err) {
    writeBotLog(guild, `Error launching epi real: ${err}`);
  }
}

export default launchEpiReal;
