import { RegisterDeviceSchema, RequestOtpSchema, VerifyOtpSchema } from '@zahln/shared';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import type { Db } from '../db/client';
import { deleteAccount, exportAccount } from '../lib/account';
import { me, registerDevice, requestOtp, revokeDevice, verifyOtp } from '../lib/auth';
import { ApiError } from '../lib/errors';
import { requireActor } from '../plugins/auth';

export async function authRoutes(fastify: FastifyInstance, deps: { db: Db; devOtp: boolean }) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const { db } = deps;

  app.post('/auth/otp', { schema: { body: RequestOtpSchema } }, async (req, reply) => {
    return reply.status(201).send(await requestOtp(db, req.body.phone, { devOtp: deps.devOtp }));
  });

  app.post('/auth/verify', { schema: { body: VerifyOtpSchema } }, async (req) => {
    const result = await verifyOtp(db, req.body.challengeId, req.body.code);
    if (!result.ok) throw new ApiError(400, 'otp_invalid', 'wrong code');
    const { ok: _ok, ...body } = result;
    return body;
  });

  app.post('/devices', { schema: { body: RegisterDeviceSchema } }, async (req, reply) => {
    // Sent by the mobile apps on every request; anything else is treated as the consumer app.
    const appHeader = req.headers['x-app'] === 'merchant' ? 'merchant' : 'consumer';
    return reply.status(201).send(await registerDevice(db, { ...req.body, app: appHeader }));
  });

  app.get('/me', async (req) => me(db, requireActor(req).userId));

  /** "Meine Daten exportieren". The app asks for the PIN first (requiredAuth 'data_export'). */
  app.get('/me/export', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    return exportAccount(db, requireActor(req).userId);
  });

  /** "Konto löschen". The app asks for the PIN first; the server checks balance and ownership. */
  app.delete('/me', async (req, reply) => {
    await deleteAccount(db, requireActor(req).userId);
    return reply.status(204).send();
  });

  /** Sign out: revoke this device's session. */
  app.delete('/devices/current', async (req, reply) => {
    const actor = requireActor(req);
    if (actor.deviceId) await revokeDevice(db, actor.deviceId);
    return reply.status(204).send();
  });
}
