import fs from 'fs';
import path from 'path';
import { Events, type Awaitable } from 'discord.js';

import DiscordClient from '@/lib/client';
import Logger from '@/lib/logger';

/**
 * Subdirectories in `events` folder
 */
const eventsSubdirectories = ['client', 'guild'] as const;

/**
 * Load all events file in `events` folder.
 * Only `.ts` files are loaded and files starting with an underscode (`_`) are ignored.
 */
export default async function handleEvents() {
    const client = DiscordClient.getInstance();

    const loadEvents = async (dir: string): Promise<number> => {
        const eventFiles = fs
            .readdirSync(path.join(__dirname, `../events/${dir}`))
            .filter(
                (file) => (file.endsWith('.ts') || file.endsWith('.js')) && !file.startsWith('_'),
            );
        let loaded = 0;
        await Promise.allSettled(
            eventFiles.map(async (file) => {
                const eventName = file.split('.')[0] as keyof typeof Events;

                // Skip invalid events
                if (!(eventName in Events)) {
                    Logger.warn(`Invalid event name '${eventName}', skipping...`);
                    return;
                }

                try {
                    const rawModule = await import(`../events/${dir}/${file}`);
                    const eventModule = rawModule.default?.default ? rawModule.default : rawModule;

                    if (!eventModule.default) {
                        throw new Error(`Missing default export in '${file}'`);
                    }
                    const eventFunction: (...args: unknown[]) => Awaitable<void> =
                        eventModule.default;
                    // @ts-expect-error Events contains all client events so this is fine
                    client.on(Events[eventName], eventFunction);
                    loaded += 1;
                } catch (err) {
                    Logger.error(
                        `Failed to load event '${eventName}': \n\t${(err as Error).message}`,
                    );
                }
            }),
        );

        return loaded;
    };

    eventsSubdirectories.forEach(async (dir) => {
        try {
            const loadedEvents = await loadEvents(dir);
            Logger.debug(`Loaded ${loadedEvents} events from '${dir}'`);
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
            Logger.error(`Failed to load events in ${dir}: \n\t${(err as Error).message}`);
        }
    });
}
