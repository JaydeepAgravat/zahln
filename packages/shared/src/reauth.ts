/**
 * How strongly to re-check the person before a sensitive action. The thresholds come from remote config
 * (`limits.reauthAboveCents`), so ops can tighten them during an incident without a release.
 *
 * - Small payments: Face ID / fingerprint, or the PIN.
 * - Payments above the threshold, refunds, PIN change, data export, signing out another device: the PIN.
 *   Biometrics prove "a registered finger", the PIN proves "the person who knows it"; for big or irreversible
 *   actions we want the second.
 */
export type SensitiveAction = 'payment' | 'refund' | 'pin_change' | 'data_export' | 'device_revoke';
export type AuthMethod = 'biometric_or_pin' | 'pin';

export function requiredAuth(
  action: SensitiveAction,
  opts: { amountCents?: number; reauthAboveCents: number },
): AuthMethod {
  if (action !== 'payment') return 'pin';
  return (opts.amountCents ?? 0) > opts.reauthAboveCents ? 'pin' : 'biometric_or_pin';
}
