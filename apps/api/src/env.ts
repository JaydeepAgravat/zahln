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
  /** Internal console access (stand-in for SSO). The default only exists so local dev works out of the box. */
  ADMIN_TOKEN: z.string().min(24).default('dev-admin-token-change-me-please'),
  /** Browser origins allowed to call the API with cookies (Zahln Web, the console). */
  WEB_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:5174')
    .transform((v) =>
      v
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
  /** Secure cookies work on http://localhost in browsers; only a LAN IP needs this off. */
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;
export const loadEnv = (source: NodeJS.ProcessEnv = process.env): Env => EnvSchema.parse(source);
