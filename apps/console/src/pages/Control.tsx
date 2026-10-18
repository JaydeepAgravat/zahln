import { useQuery } from '@tanstack/react-query';
import {
  type AdminConfig,
  AdminConfigSchema,
  APPS,
  type AppName,
  FLAGS,
  type Flag,
  KILL_SWITCHES,
  type KillSwitch,
  updateStatus,
} from '@zahln/shared';
import { Badge, Button, Card, cx, Dialog, Empty, Field, Input, Spinner, Switch } from '@zahln/web-ui';
import { type ReactNode, useEffect, useState } from 'react';
import { api, queryClient } from '../lib/api';
import { errorText, PageHeader, ReasonDialog } from '../lib/ui';

const KILL: Record<KillSwitch, { title: string; body: string }> = {
  nfc_pay: {
    title: 'Tap to Pay',
    body: 'Hides the NFC button on every till. For when a phone OS update breaks it.',
  },
  refunds: {
    title: 'Refunds in the till',
    body: 'Managers can no longer refund from the app (the API refuses too). Support can still refund here.',
  },
  topup: { title: 'Wallet top-ups', body: 'Hides top-up in the student app and refuses it on the server.' },
};
const FLAG: Record<Flag, { title: string; body: string }> = {
  discreet_mode_default: {
    title: 'Discreet mode by default',
    body: 'New installs start with balances hidden (for paying in a queue).',
  },
};
const APP_NAME: Record<AppName, string> = { consumer: 'Zahln (students)', merchant: 'ZYSYGY (tills)' };
/** The version the demo phones run: shows the effect of a release window before publishing it. */
const SHIPPED = '0.1.0';
const CHAOS: { mode: string; title: string }[] = [
  { mode: 'ok', title: 'Normal' },
  { mode: 'slow', title: 'Slow bank (3–8 s)' },
  { mode: 'drop_after_settle', title: 'Drop the response' },
  { mode: 'reject', title: 'Bank rejects' },
  { mode: 'insufficient', title: 'Insufficient funds' },
];

/** Dotted paths whose values differ: what the publish dialog lists, and what the audit log will record. */
function diff(a: unknown, b: unknown, path = ''): string[] {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].flatMap((k) =>
      diff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], path ? `${path}.${k}` : k),
    );
  }
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [path];
}

function Row({ title, body, children }: { title: string; body: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border px-5 py-4 last:border-0">
      <div className="flex flex-col gap-0.5">
        <p className="font-medium">{title}</p>
        <p className="text-footnote text-text-tertiary">{body}</p>
      </div>
      {children}
    </div>
  );
}

const UPDATE_BADGE = {
  required: <Badge tone="danger">Blocked: update required</Badge>,
  available: <Badge tone="warning">Update banner</Badge>,
  current: <Badge tone="success">Up to date</Badge>,
};

/**
 * The control room: what every phone does right now, changed without an app release.
 * Edits are a draft; publishing needs a reason, bumps the config version, writes the audit log
 * and nudges every connected phone over SSE.
 */
export function ControlPage() {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config });
  const chaos = useQuery({ queryKey: ['chaos'], queryFn: api.chaos, retry: false });
  const [draft, setDraft] = useState<AdminConfig | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  // Start from the server's config, and follow it while there are no local edits.
  const server = config.data?.data;
  const changed = server && draft ? diff(server, draft) : [];
  useEffect(() => {
    if (server && (!draft || diff(server, draft).length === 0)) setDraft(server);
  }, [server, draft]);

  if (config.isLoading || !draft) return <Spinner className="m-10" />;
  if (config.error) return <Empty title="Couldn't load the config">{errorText(config.error)}</Empty>;
  const parsed = AdminConfigSchema.safeParse(draft);
  const edit = (fn: (c: AdminConfig) => void) => {
    const next = structuredClone(draft);
    fn(next);
    setDraft(next);
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHeader
        title="Control room"
        sub={
          <>
            Config version <span className="font-mono">{config.data?.version}</span>, live on every phone.
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          title="Kill switches"
          actions={<span className="text-caption text-text-tertiary">on = feature off</span>}
        >
          {KILL_SWITCHES.map((k) => (
            <Row key={k} title={KILL[k].title} body={KILL[k].body}>
              <Switch
                danger
                label={`Kill ${KILL[k].title}`}
                checked={draft.killSwitches[k]}
                onChange={(v) => edit((c) => (c.killSwitches[k] = v))}
              />
            </Row>
          ))}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Feature flags">
            {FLAGS.map((f) => (
              <Row key={f} title={FLAG[f].title} body={FLAG[f].body}>
                <Switch
                  label={FLAG[f].title}
                  checked={draft.flags[f]}
                  onChange={(v) => edit((c) => (c.flags[f] = v))}
                />
              </Row>
            ))}
          </Card>
          <Card title="Banner on every phone">
            <div className="grid gap-3 px-5 py-4 sm:grid-cols-2">
              {(['de', 'en'] as const).map((lang) => (
                <Field key={lang} label={lang === 'de' ? 'German' : 'English'}>
                  {(id) => (
                    <Input
                      id={id}
                      maxLength={140}
                      placeholder={
                        lang === 'de' ? 'Wartung heute ab 22 Uhr' : 'Maintenance tonight from 10 pm'
                      }
                      value={draft.banner?.[lang] ?? ''}
                      onChange={(e) =>
                        edit((c) => {
                          const next = {
                            de: c.banner?.de ?? '',
                            en: c.banner?.en ?? '',
                            [lang]: e.target.value,
                          };
                          c.banner = next.de || next.en ? next : null;
                        })
                      }
                    />
                  )}
                </Field>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card title="Releases">
        <div className="grid gap-px bg-border md:grid-cols-2">
          {APPS.map((app) => {
            const release = draft.apps[app];
            return (
              <div key={app} className="flex flex-col gap-4 bg-surface px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{APP_NAME[app]}</p>
                  <span className="flex items-center gap-2 text-footnote text-text-tertiary">
                    {SHIPPED} {UPDATE_BADGE[updateStatus(SHIPPED, release)]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Minimum supported" hint="Older apps are blocked">
                    {(id) => (
                      <Input
                        id={id}
                        className="font-mono"
                        value={release.minSupportedVersion}
                        onChange={(e) =>
                          edit((c) => (c.apps[app].minSupportedVersion = e.target.value.trim()))
                        }
                      />
                    )}
                  </Field>
                  <Field label="Latest" hint="Older apps see a banner">
                    {(id) => (
                      <Input
                        id={id}
                        className="font-mono"
                        value={release.latestVersion}
                        onChange={(e) => edit((c) => (c.apps[app].latestVersion = e.target.value.trim()))}
                      />
                    )}
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {chaos.data ? (
        <Card
          title="Demo: payment rail"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setResetting(true)}>
              Reset demo data…
            </Button>
          }
        >
          <div className="flex flex-col gap-3 px-5 py-4">
            <p className="text-footnote text-text-tertiary">
              Dev only. Makes the simulated SEPA rail misbehave, for Act 2. Applies to the next payment.
            </p>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Rail mode</legend>
              {CHAOS.map((c) => (
                <button
                  key={c.mode}
                  type="button"
                  aria-pressed={chaos.data.mode === c.mode}
                  onClick={async () => {
                    queryClient.setQueryData(['chaos'], await api.setChaos(c.mode));
                    void queryClient.invalidateQueries({ queryKey: ['audit'] });
                  }}
                  className={cx(
                    'h-9 rounded-full px-4 text-footnote font-medium transition-colors',
                    chaos.data.mode === c.mode
                      ? c.mode === 'ok'
                        ? 'bg-text-primary text-bg'
                        : 'bg-danger text-bg'
                      : 'border border-border hover:bg-surface-muted',
                  )}
                >
                  {c.title}
                </button>
              ))}
            </fieldset>
          </div>
        </Card>
      ) : null}

      {/* Publish bar: appears with the first unsaved edit. */}
      <div
        className={cx(
          'fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface-raised/95 backdrop-blur transition-transform md:left-60',
          changed.length ? 'translate-y-0' : 'translate-y-full',
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-8 py-3">
          <p className="text-callout">
            {parsed.success ? (
              <>
                <span className="font-semibold">{changed.length} unpublished</span>{' '}
                <span className="font-mono text-footnote text-text-tertiary">{changed.join(', ')}</span>
              </>
            ) : (
              <span className="text-danger">{parsed.error.issues[0]?.message} (versions are x.y.z)</span>
            )}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => server && setDraft(server)}>
              Discard
            </Button>
            <Button variant="primary" disabled={!parsed.success} onClick={() => setPublishing(true)}>
              Publish to all phones…
            </Button>
          </div>
        </div>
      </div>

      <ReasonDialog
        open={publishing}
        onClose={() => setPublishing(false)}
        title="Publish config"
        confirm="Publish now"
        danger={changed.some((c) => c.startsWith('killSwitches') || c.endsWith('minSupportedVersion'))}
        suggestions={['NFC broken on Android 16', 'Forcing the security update', 'Demo: Act 3']}
        onConfirm={async (reason) => {
          const saved = await api.saveConfig(draft, reason);
          queryClient.setQueryData(['config'], saved);
          setDraft(saved.data);
          void queryClient.invalidateQueries({ queryKey: ['audit'] });
        }}
      >
        <ul className="flex flex-col gap-1 font-mono text-footnote">
          {changed.map((path) => (
            <li key={path}>
              {path}:{' '}
              <span className="text-text-tertiary line-through">{JSON.stringify(read(server, path))}</span> →{' '}
              <span className="font-semibold text-text-primary">{JSON.stringify(read(draft, path))}</span>
            </li>
          ))}
        </ul>
      </ReasonDialog>

      <Dialog open={resetting} onClose={() => setResetting(false)} title="Reset demo data">
        <p className="text-callout text-text-secondary">
          Balances, payments, plans and config go back to the seed and the rail goes back to normal. Phones
          stay signed in, and the audit log is kept.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setResetting(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            busy={resetBusy}
            onClick={async () => {
              setResetBusy(true);
              try {
                await api.reset();
                await queryClient.invalidateQueries();
                setResetting(false);
              } finally {
                setResetBusy(false);
              }
            }}
          >
            Reset everything
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function read(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | null)?.[k], obj);
}
