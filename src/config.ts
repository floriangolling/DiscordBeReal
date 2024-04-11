import dotenv from 'dotenv';

dotenv.config();

export default class Config {
    public static readonly BOT_TOKEN = process.env.BOT_TOKEN ?? '';
    public static readonly CLIENT_ID = process.env.CLIENT_ID ?? '';
}
