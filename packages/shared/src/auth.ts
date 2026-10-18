import { z } from 'zod';
import { PlanSchema } from './schemas';

export const PIN_LENGTH = 6;
export const OTP_LENGTH = 6;
export const MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN = 5;

/** German mobile numbers in E.164, e.g. +4915112345678. */
export const PhoneSchema = z.string().regex(/^\+491\d{9,11}$/, 'invalid German mobile number');

/** Turn what people type ("0151 1234 5678", "+49 151 …") into E.164. */
export function normalizeGermanPhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+49')) return digits;
  if (digits.startsWith('0049')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+49${digits.slice(1)}`;
  return digits;
}

const COMMON_PINS = new Set([
  '123456',
  '654321',
  '000000',
  '111111',
  '121212',
  '112233',
  '123123',
  '159753',
  '147258',
]);

/** Rejects repeated digits, straight runs and the most common PINs. */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{6}$/.test(pin)) return true;
  if (COMMON_PINS.has(pin)) return true;
  if (/^(\d)\1+$/.test(pin)) return true;
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - (digits[i] as number));
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

/** Cooldown after too many wrong PINs: 0 for the first 5, then 30 s, 60 s, 120 s … capped at 1 h. */
export function pinCooldownMs(failedAttempts: number): number {
  const over = failedAttempts - MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN;
  if (over < 0) return 0;
  return Math.min(30_000 * 2 ** over, 3_600_000);
}

// ---------- API contracts ----------

export const RequestOtpSchema = z.object({ phone: PhoneSchema });
export const RequestOtpResponseSchema = z.object({
  challengeId: z.uuid(),
  expiresAt: z.iso.datetime({ offset: true }),
  /** Only present in development builds of the API. */
  devCode: z.string().optional(),
});

export const VerifyOtpSchema = z.object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) });

export const MembershipSchema = z.object({
  merchantId: z.string(),
  merchantName: z.string(),
  role: z.enum(['owner', 'manager', 'staff']),
  plan: PlanSchema,
});
export type Membership = z.infer<typeof MembershipSchema>;

export const VerifyOtpResponseSchema = z.object({
  verificationToken: z.string(),
  isNewUser: z.boolean(),
  name: z.string().nullable(),
  memberships: z.array(MembershipSchema),
});

export const PlatformSchema = z.enum(['ios', 'android']);

export const RegisterDeviceSchema = z.object({
  verificationToken: z.string(),
  /** Random ID generated on the device and kept in the keychain (this device only). */
  deviceId: z.uuid(),
  platform: PlatformSchema,
  /** Required for new users. */
  name: z.string().min(2).max(60).optional(),
});

export const UserSchema = z.object({ id: z.string(), name: z.string(), phone: z.string() });
export type User = z.infer<typeof UserSchema>;

export const SessionResponseSchema = z.object({
  sessionToken: z.string(),
  user: UserSchema,
  memberships: z.array(MembershipSchema),
});
export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export const MeResponseSchema = z.object({ user: UserSchema, memberships: z.array(MembershipSchema) });
export type MeResponse = z.infer<typeof MeResponseSchema>;
