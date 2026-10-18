'use client';

import { normalizeGermanPhone, PhoneSchema } from '@zahln/shared';
import { Button, Field, Input } from '@zahln/web-ui';
import { useState } from 'react';
import { useT } from '@/components/I18n';
import { ApiError, api } from '@/lib/client';

export function LoginForm({ audience }: { audience: 'business' | 'consumer' }) {
  const wallet = audience === 'consumer';
  const { t } = useT();
  const [phone, setPhone] = useState('');
  const [challenge, setChallenge] = useState<{ id: string; devCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const e164 = normalizeGermanPhone(phone);
  const validPhone = PhoneSchema.safeParse(e164).success;

  const fail = (e: unknown) =>
    setError(
      e instanceof ApiError && e.code === 'not_a_manager'
        ? t('login.sub')
        : t('common.error', { message: e instanceof Error ? e.message : String(e) }),
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold tracking-tight">
          {wallet ? t('wallet.signInTitle') : t('login.title')}
        </h1>
        <p className="text-callout text-text-secondary">{wallet ? t('wallet.signInSub') : t('login.sub')}</p>
      </div>
      {!challenge ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              const res = await api<{ challengeId: string; devCode?: string }>('POST', '/web/auth/otp', {
                body: { phone: e164 },
              });
              setChallenge({ id: res.challengeId, ...(res.devCode ? { devCode: res.devCode } : {}) });
            } catch (err) {
              fail(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label={t('login.phone')} error={error}>
            {(id) => (
              <Input
                id={id}
                autoFocus
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                placeholder="0151 0000 0010"
                value={phone}
                onChange={(e) => setPhone(e.target.value.slice(0, 18))}
              />
            )}
          </Field>
          <Button type="submit" variant="primary" busy={busy} disabled={!validPhone}>
            {t('login.sendCode')}
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError(null);
            try {
              await api('POST', '/web/auth/verify', {
                body: { challengeId: challenge.id, code, audience },
              });
              window.location.assign(wallet ? '/wallet' : '/business');
            } catch (err) {
              fail(err);
              setBusy(false);
            }
          }}
        >
          <Field
            label={t('login.code')}
            error={error}
            hint={challenge.devCode ? t('login.devCode', { code: challenge.devCode }) : undefined}
          >
            {(id) => (
              <Input
                id={id}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="font-mono tracking-[0.4em]"
              />
            )}
          </Field>
          <Button type="submit" variant="primary" busy={busy} disabled={code.length !== 6}>
            {t('login.verify')}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setChallenge(null);
              setCode('');
              setError(null);
            }}
          >
            {t('login.otherNumber')}
          </Button>
        </form>
      )}
    </div>
  );
}
