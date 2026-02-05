import 'dotenv/config';
import { z } from 'zod';

const ConfigSchema = z.object({
    port: z.number().default(3000),
    nodeEnv: z.string().default('development'),
    githubAppId: z.string().optional(),
    githubPrivateKey: z.string().optional(),
    githubWebhookSecret: z.string().optional(),
    databaseUrl: z.string().default('postgres://pudding_user:pudding_password@localhost:5432/pudding_db'),
    redisUrl: z.string().default('redis://localhost:6379'),
    geminiApiKey: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
    return ConfigSchema.parse({
        port: Number(process.env.PORT) || 3000,
        nodeEnv: process.env.NODE_ENV,
        githubAppId: process.env.GITHUB_APP_ID,
        githubPrivateKey: process.env.GITHUB_APP_PRIVATE_KEY_PATH, // TODO: Load file content or env var
        githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
        databaseUrl: process.env.DATABASE_URL,
        redisUrl: process.env.REDIS_URL,
        geminiApiKey: process.env.GEMINI_API_KEY,
    });
}
