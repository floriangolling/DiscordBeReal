import { writeBotLog } from '@/utils/discord';
import Logger from '@/lib/logger';
import {
  Message,
  TextChannel,
} from 'discord.js';
import { EPIREAL_CHANNEL_NAME } from '@/utils/const';
import { addToPostedToday, isEpiRealTime } from '@/epiReal';

const FUNNY_ANSWERS = [
  'Ton moment real est tellement intense que je viens de faire une pause pour respirer !',
  'Un décor digne d’une carte postale, tu nous fais voyager sans bouger !',
  "C'est fou comme ton BeReal pourrait servir de fond d’écran parfait !",
  'Un cadre aussi beau, c’est un bon moment pour savourer le présent.',
  "Cet endroit a l'air tellement cosy, je peux venir squatter ?",
  'EpiReal a de la chance de t’avoir comme modèle ! 😎',
  'Je ne savais pas que la vie de tous les jours pouvait être aussi stylée !',
  'Le moment parfait capturé en toute authenticité ! 👌',
  'T’as fait un BeReal ou une œuvre d’art sans le savoir ? 🎨',
  'Pas mal, mais il manque un ; à la ligne 42 !',
];

export default async (message: Message) => {
  try {
    const channel = message.channel as TextChannel;

    if (channel.name === '🤖・commandes' && message.author.id !== '1298678276323282985') {
      await message.delete();
    }

    if (channel.name === EPIREAL_CHANNEL_NAME && !message.author.bot && isEpiRealTime() && message.attachments.size > 0) {
      addToPostedToday(message.author.id);

      const random = Math.floor(Math.random() * 100) + 1;
      if (random <= 30) {
        const randomIndex = Math.floor(Math.random() * FUNNY_ANSWERS.length);
        await message.reply(FUNNY_ANSWERS[randomIndex]);
      } else if (message.author.id === '228912845201473536') {
        await message.reply('tututut Guillaume, tu te tais');
      }
    }
  } catch (err) {
    writeBotLog(message.guild!, `Error while processing message: ${err}`);
    Logger.error(`Error while processing message: ${err}`);
  }
};
