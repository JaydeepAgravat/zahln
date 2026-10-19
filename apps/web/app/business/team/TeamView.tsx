'use client';

import { normalizeGermanPhone, PhoneSchema } from '@zaster/shared';
import { Button, Card, Field, Input, Select } from '@zaster/web-ui';
import { useState } from 'react';
import { useT } from '@/components/I18n';
import { useStepUp } from '@/components/StepUp';
import { useToast } from '@/components/Toast';
import { ApiError, api } from '@/lib/client';
import { day } from '@/lib/format';
import type { Team } from '@/lib/types';
import { Avatar } from '../_components/Avatar';

type Role = 'manager' | 'staff';

export function TeamView({ initial }: { initial: Team }) {
  const { t, locale } = useT();
  const stepUp = useStepUp();
  const toast = useToast();
  const [team, setTeam] = useState(initial);
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('staff');
  const [busy, setBusy] = useState<string | null>(null);
  const e164 = normalizeGermanPhone(phone);

  const act = async (id: string, action: () => Promise<unknown>) => {
    setBusy(id);
    try {
      await stepUp(action);
      setTeam(await api<Team>('GET', '/web/business/staff'));
      return true;
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'cancelled'))
        toast(t('common.error', { message: e instanceof Error ? e.message : String(e) }), 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const roleName = (r: 'owner' | Role) => t(`team.${r}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-title font-bold tracking-tight">{t('team.title')}</h1>
        <p className="text-footnote text-text-tertiary">
          {team.limit
            ? t('team.limit', { count: team.members.length, limit: team.limit })
            : t('team.unlimited', { count: team.members.length })}
        </p>
      </div>
      <Card>
        <ul>
          {team.members.map((m) => (
            <li
              key={m.userId}
              className="flex flex-wrap items-center gap-4 border-b border-border px-5 py-3 last:border-0"
            >
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.name}</p>
                <p className="text-footnote text-text-tertiary">
                  <span className="font-mono">{m.phone}</span> ·{' '}
                  {t('team.since', { date: day(m.since, locale) })}
                </p>
              </div>
              {team.canManage && m.role !== 'owner' ? (
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={t('team.role')}
                    value={m.role}
                    disabled={busy === m.userId}
                    onChange={(e) =>
                      act(m.userId, () =>
                        api('PUT', `/web/business/staff/${m.userId}`, { body: { role: e.target.value } }),
                      )
                    }
                    className="w-40"
                  >
                    <option value="manager">{roleName('manager')}</option>
                    <option value="staff">{roleName('staff')}</option>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    busy={busy === `rm:${m.userId}`}
                    onClick={() =>
                      act(`rm:${m.userId}`, () => api('DELETE', `/web/business/staff/${m.userId}`))
                    }
                  >
                    {t('team.remove')}
                  </Button>
                </div>
              ) : (
                <span className="text-footnote text-text-secondary">{roleName(m.role)}</span>
              )}
            </li>
          ))}
        </ul>
      </Card>

      {team.canManage ? (
        <Card title={t('team.add')}>
          <form
            className="flex flex-wrap items-end gap-3 px-5 py-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await act('add', () =>
                api('POST', '/web/business/staff', { body: { phone: e164, role } }),
              );
              if (ok) setPhone('');
            }}
          >
            <div className="min-w-56 flex-1">
              <Field label={t('team.phone')}>
                {(id) => (
                  <Input
                    id={id}
                    type="tel"
                    placeholder="0151 0000 0002"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.slice(0, 18))}
                  />
                )}
              </Field>
            </div>
            <Select
              aria-label={t('team.role')}
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-44"
            >
              <option value="staff">{roleName('staff')}</option>
              <option value="manager">{roleName('manager')}</option>
            </Select>
            <Button
              type="submit"
              variant="primary"
              busy={busy === 'add'}
              disabled={!PhoneSchema.safeParse(e164).success}
            >
              {t('team.add')}
            </Button>
          </form>
        </Card>
      ) : (
        <p className="text-footnote text-text-tertiary">{t('team.ownerOnly')}</p>
      )}
    </div>
  );
}
