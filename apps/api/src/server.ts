import { buildApp } from './app';
import { createDb } from './db/client';
import { loadEnv } from './env';

const env = loadEnv();
const { db, close } = createDb(env.DATABASE_URL);
const app = await buildApp({
  db,
  chaosEnabled: env.CHAOS_ENABLED,
  devAuth: env.DEV_AUTH,
  logger: {
    level: env.LOG_LEVEL,
    redact: ['req.headers.authorization', 'req.headers["x-user-id"]', 'req.headers["x-device-id"]'],
    transport: process.stdout.isTTY ? { target: 'pino-pretty' } : undefined,
  },
});

const shutdown = async () => {
  await app.close();
  await close();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

await app.listen({ port: env.PORT, host: env.HOST });
