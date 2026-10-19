'use client';

import { Button, Dialog, Field, Input } from '@zaster/web-ui';
import { createContext, type ReactNode, useCallback, useContext, useRef, useState } from 'react';
import { ApiError, api } from '@/lib/client';
import { useT } from './I18n';

type Run = <R>(action: () => Promise<R>) => Promise<R>;
const Ctx = createContext<Run>((action) => action());

/**
 * Money and team actions need a code from the last 10 minutes. Any action wrapped in `useStepUp()`
 * that the API answers with `step_up_required` opens this dialog, then runs again once confirmed.
 */
export function StepUpProvider({ phone, children }: { phone: string; children: ReactNode }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [challenge, setChallenge] = useState<{ id: string; devCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ resolve: () => void; reject: (e: unknown) => void } | null>(null);

  const run = useCallback<Run>(async (action) => {
    try {
      return await action();
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== 'step_up_required') throw e;
      await new Promise<void>((resolve, reject) => {
        pending.current = { resolve, reject };
        setChallenge(null);
        setCode('');
        setError(null);
        setOpen(true);
      });
      return action();
    }
  }, []);

  const close = () => {
    setOpen(false);
    pending.current?.reject(new ApiError(0, 'cancelled', 'cancelled'));
    pending.current = null;
  };

  return (
    <Ctx.Provider value={run}>
      {children}
      <Dialog open={open} onClose={close} title={t('stepUp.title')}>
        <p className="text-callout text-text-secondary">{t('stepUp.body', { phone })}</p>
        {challenge ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await api('POST', '/web/auth/step-up', { body: { challengeId: challenge.id, code } });
                setOpen(false);
                pending.current?.resolve();
                pending.current = null;
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
              } finally {
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
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" variant="primary" busy={busy} disabled={code.length !== 6}>
                {t('stepUp.confirm')}
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={close}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              busy={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await api<{ challengeId: string; devCode?: string }>(
                    'POST',
                    '/web/auth/step-up/otp',
                  );
                  setChallenge({ id: res.challengeId, ...(res.devCode ? { devCode: res.devCode } : {}) });
                } catch (err) {
                  setError(err instanceof Error ? err.message : String(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('stepUp.send')}
            </Button>
          </div>
        )}
      </Dialog>
    </Ctx.Provider>
  );
}

export const useStepUp = () => useContext(Ctx);
