import Logger from '@/lib/logger';
import { Message } from 'discord.js';

export default async (message: Message) => {
    try {
        Logger.info(`Message received from ${message.author.tag} in ${message.channel.id}`);
        return;
    } catch (err) {
        Logger.error(`Error while processing message: ${err}`);
    }
};
