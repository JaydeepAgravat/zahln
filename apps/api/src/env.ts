import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default('0.0.0.0'),
  CHAOS_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  DEV_AUTH: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  /** HMAC key for QR intent references. The default only exists so local dev works out of the box. */
  INTENT_SIGNING_SECRET: z.string().min(32).default('dev-only-intent-signing-secret-change-me'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => EnvSchema.parse(source);
