import cors from '@fastify/cors';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { Db } from './db/client';
import { ApiError } from './lib/errors';
import { configureIntentSigning } from './lib/intentRef';
import { authPlugin } from './plugins/auth';
import { Chaos } from './rail/chaos';
import { SimulatedSepaInstantRail } from './rail/simulatedSepaInstant';
import type { PaymentRail } from './rail/types';
import { routes } from './routes';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { configRoutes } from './routes/config';
import { webRoutes } from './routes/web';

/** Never log credentials, account identifiers or balances. */
const REDACT = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-admin-token"]',
  'req.headers["x-user-id"]',
  'req.headers["x-device-id"]',
  '*.sessionToken',
  '*.verificationToken',
  '*.code',
  '*.devCode',
  '*.iban',
  '*.balanceCents',
  '*.pin',
  '*.token',
];

export type AppOptions = {
  db: Db;
  rail?: PaymentRail;
  chaos?: Chaos;
  chaosEnabled?: boolean;
  /** Allow the `x-user-id` shortcut and fixed OTP codes. Never in production. */
  devAuth?: boolean;
  logger?: FastifyServerOptions['logger'];
  intentSigningSecret?: string;
  adminToken?: string;
  /** Browser origins allowed to send cookies (CORS with credentials). Never `*` with cookies. */
  webOrigins?: string[];
  secureCookies?: boolean;
};

export async function buildApp(options: AppOptions) {
  const chaos = options.chaos ?? new Chaos();
  const rail = options.rail ?? new SimulatedSepaInstantRail(chaos);
  if (options.intentSigningSecret) configureIntentSigning(options.intentSigningSecret);

  const app = Fastify({
    logger: options.logger ?? { level: 'info', redact: REDACT },
    // A payment must never hang forever: the client treats a timeout as "checking", not as failure.
    requestTimeout: 15_000,
  });
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof ApiError) return reply.status(error.statusCode).send(error.toJSON());
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.status(400).send({ error: 'bad_request', message: error.message });
    }
    req.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({ error: 'internal', message: 'internal error' });
  });

  // Cookies + CORS: only listed origins get credentialed responses. Phones send no Origin, so they're unaffected.
  const origins = options.webOrigins ?? ['http://localhost:3000', 'http://localhost:5174'];
  await app.register(cors, {
    origin: (origin, cb) => cb(null, !origin || origins.includes(origin)),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  });
  const devAuth = options.devAuth ?? false;
  await app.register(authPlugin, { db: options.db, devAuth });
  await app.register(authRoutes, { db: options.db, devOtp: devAuth });
  await app.register(routes, { db: options.db, rail, chaos, chaosEnabled: options.chaosEnabled ?? false });
  await app.register(configRoutes, { db: options.db });
  await app.register(webRoutes, {
    db: options.db,
    devOtp: devAuth,
    secureCookies: options.secureCookies ?? true,
  });
  await app.register(adminRoutes, {
    db: options.db,
    adminToken: options.adminToken ?? 'dev-admin-token-change-me-please',
    chaos,
    chaosEnabled: options.chaosEnabled ?? false,
  });

  return Object.assign(app, { chaos });
}
