import { writeBotLog } from '@/utils/discord';
import Logger from '@/lib/logger';
import {
  EmbedBuilder,
  Message,
  ThreadChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import StringComparison from 'string-comparison';

type toCheckThread = {
  content: string;
  name: string;
  id: string;
  similarity: number;
  threadAuthor: string;
  similaryByName: boolean;
  similarByContent: boolean;
}

function checkSimilaryOfString(stringOne: string, stringTwo: string) {
  return StringComparison.levenshtein.similarity(stringOne, stringTwo);
}

async function getFirstMessageOfThread(thread: ThreadChannel): Promise<Message<boolean> | undefined> {
  const lastMessageId : undefined | string = undefined;
  let firstEverMessage : undefined | Message<boolean>;

  do {
    const messages = await thread.messages.fetch({
      limit: 100,
      before: lastMessageId,
    });
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    if (!firstEverMessage && sortedMessages.size > 0) {
      firstEverMessage = sortedMessages.first();
    }

    firstEverMessage = sortedMessages.first();
  } while (lastMessageId);

  return firstEverMessage;
}

export default async (createdThread: ThreadChannel) => {
  const authorId = createdThread.ownerId;

  let parsedThreads : toCheckThread[] = [];

  try {
    const threads = await createdThread.parent!.threads.fetch();

    for (const thread of threads.threads.values()) {
      if (thread.id === createdThread.id) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const firstEverMessage = await getFirstMessageOfThread(thread);

      if (!firstEverMessage) {
        // eslint-disable-next-line no-continue
        continue;
      }

      parsedThreads.push({
        content: firstEverMessage.content,
        name: thread.name,
        id: thread.id,
        similarity: 0,
        threadAuthor: firstEverMessage.author.displayName,
        similaryByName: false,
        similarByContent: false,
      });
    }

    for (const existingThread of parsedThreads) {
      const similarName = checkSimilaryOfString(createdThread.name, existingThread.name);
      const similarContent = checkSimilaryOfString(createdThread.messages.cache.first()!.content, existingThread.content);

      if (similarName > 0.65) {
        existingThread.similarity = similarName;
        existingThread.similaryByName = true;
      }

      if (similarContent > 0.65) {
        existingThread.similarity = similarContent;
        existingThread.similarByContent = true;
      }
    }

    parsedThreads = parsedThreads.filter((thread) => thread.similarity > 0.65).sort((a, b) => b.similarity - a.similarity).slice(0, 3);

    const embeds : EmbedBuilder[] = [];

    for (const thread of parsedThreads) {
      writeBotLog(createdThread.guild!, `Found similar thread: ${thread.name} with similarity: ${thread.similarity} | similaryByName: ${thread.similaryByName} | similarByContent: ${thread.similarByContent} | url : https://discord.com/channels/${createdThread.guild.id}/${thread.id}`);

      const embed = new EmbedBuilder();
      embed.setAuthor({
        name: `Topic crée par ${thread.threadAuthor}`,
        url: `https://discord.com/channels/${createdThread.guild.id}/${thread.id}`,
      });
      embed.setTitle(thread.name);
      embed.setURL(`https://discord.com/channels/${createdThread.guild.id}/${thread.id}`);
      embed.setDescription(thread.content);
      embed.setColor('#ffeb72');
      embeds.push(embed);
    }

    let buttonInteraction : Message | null = null;

    const closeButton = new ButtonBuilder()
      .setCustomId('close_thread')
      .setLabel('Fermer le thread')
      .setStyle(ButtonStyle.Danger);

    const actionRow = new ActionRowBuilder<ButtonBuilder>();

    actionRow.addComponents(closeButton);

    if (embeds.length > 0) {
      await createdThread.send({
        content: 'Après avoir fait quelques recherches, d\'autres étudiants ont posés des questions similaires, peut-être que cela répond déjà à ta question ?',
      });

      for (const embed of embeds) {
        await createdThread.send({ embeds: [embed] });
      }

      buttonInteraction = await createdThread.send({
        components: [actionRow],
      });
    }

    const collector = createdThread.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000,
    });

    collector.on('collect', async (i) => {
      console.log(authorId, i.user.id);
      if ((authorId === undefined || authorId !== i.user.id) && i.customId === 'close_thread') {
        await i.reply({
          content: 'Tu n\'as pas la permission de fermer ce thread',
          ephemeral: true,
        });
      }
      if (i.customId === 'close_thread' && authorId === i.user.id) {
        if (createdThread instanceof ThreadChannel) {
          await createdThread.delete();
        }
      }
    });

    collector.on('end', async () => {
      if (buttonInteraction) {
        try {
          await buttonInteraction.delete();
        } catch (err) {
          Logger.error('error', 'Error while deleting button interaction', err);
          writeBotLog(createdThread.guild!, `Error while deleting button interaction: ${err}`);
        }
      }
    });
  } catch (err) {
    Logger.error('error', 'Error while trying to find similar threads');
    writeBotLog(createdThread.guild!, `Error while trying to find similar threads: ${err}`);
  }
};
