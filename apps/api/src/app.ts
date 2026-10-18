import cors from '@fastify/cors';
import Fastify, { type FastifyServerOptions } from 'fastify';
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { Db } from './db/client';
import { ApiError } from './lib/errors';
import { authPlugin } from './plugins/auth';
import { Chaos } from './rail/chaos';
import { SimulatedSepaInstantRail } from './rail/simulatedSepaInstant';
import type { PaymentRail } from './rail/types';
import { routes } from './routes';

/** Never log credentials, account identifiers or balances. */
const REDACT = [
  'req.headers.authorization',
  'req.headers["x-user-id"]',
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
  logger?: FastifyServerOptions['logger'];
};

export async function buildApp(options: AppOptions) {
  const chaos = options.chaos ?? new Chaos();
  const rail = options.rail ?? new SimulatedSepaInstantRail(chaos);

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

  await app.register(cors, { origin: true });
  await app.register(authPlugin, { db: options.db });
  await app.register(routes, { db: options.db, rail, chaos, chaosEnabled: options.chaosEnabled ?? false });

  return Object.assign(app, { chaos });
}
