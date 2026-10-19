import { Button, Field, Input } from '@zaster/web-ui';
import { useState } from 'react';
import { api, session } from '../lib/api';
import { errorText } from '../lib/ui';

/** Stand-in for company SSO: the shared ops token plus your name, which every audit entry carries. */
export function LoginPage() {
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4">
      <form
        className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-border bg-surface p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const op = { name: name.trim(), token: token.trim() };
          try {
            await api.me(op);
            session.set(op);
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-headline font-bold tracking-tight">
            <img src="/favicon.svg" alt="" className="size-7" /> Zaster Ops
          </p>
          <p className="text-footnote text-text-tertiary">Internal. Every change you make is audited.</p>
        </div>
        <Field label="Your name">
          {(id) => (
            <Input
              id={id}
              autoFocus
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label="Ops token" error={error}>
          {(id) => (
            <Input
              id={id}
              type="password"
              autoComplete="current-password"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" variant="primary" busy={busy} disabled={!name.trim() || !token.trim()}>
          Sign in
        </Button>
      </form>
    </main>
  );
}
