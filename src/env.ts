import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
    SEQUELIZE_LOGGING: z
        .string()
        .transform((val) => {
            const lower = val.toLowerCase();
            return lower === 'true' || lower === '1';
        })
        .default('false'),
    POSTGRES_USER: z.string(),
    POSTGRES_PASSWORD: z.string(),
    POSTGRES_DB: z.string(),
    POSTGRES_HOST: z.string(),
    POSTGRES_PORT: z.string(),
    DISCORD_TOKEN: z.string(),
    DEBUG: z
        .string()
        .transform((val) => {
            const lower = val.toLowerCase();
            return lower === 'true' || lower === '1';
        })
        .default('false'),
    NODE_ENV: z.string().default('dev'),
    DISCORD_APP_ID: z.string(),
});

// eslint-disable-next-line consistent-return
function parseEnv(schema: z.ZodSchema) {
    try {
        return schema.parse(process.env);
    } catch (err) {
        if (!(err instanceof z.ZodError)) {
            console.error(err);
            process.exit(1);
        }

        console.error('Invalid environment variables:', err.flatten().fieldErrors);
        process.exit(1);
    }
}

const env = parseEnv(envSchema);

export default env;
