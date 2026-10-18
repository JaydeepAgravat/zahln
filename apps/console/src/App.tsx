import { cx } from '@zahln/web-ui';
import { useSyncExternalStore } from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes } from 'react-router';
import { session } from './lib/api';
import { type LiveState, useLiveFeed } from './lib/live';
import { AuditPage } from './pages/Audit';
import { ControlPage } from './pages/Control';
import { LoginPage } from './pages/Login';
import { MerchantPage, MerchantsPage } from './pages/Merchants';
import { PaymentPage } from './pages/Payment';
import { PaymentsPage } from './pages/Payments';

const NAV = [
  { to: '/payments', label: 'Payments' },
  { to: '/merchants', label: 'Merchants' },
  { to: '/control', label: 'Control room' },
  { to: '/audit', label: 'Audit log' },
];

const LIVE: Record<LiveState, { label: string; dot: string }> = {
  connecting: { label: 'Connecting…', dot: 'bg-pending' },
  live: { label: 'Live', dot: 'bg-success animate-pulse' },
  offline: { label: 'Reconnecting…', dot: 'bg-danger' },
};

function Shell() {
  const live = useLiveFeed();
  const op = session.get();
  return (
    <div className="min-h-dvh bg-bg text-text-primary md:pl-60">
      <aside className="flex flex-col gap-6 border-b border-border bg-surface px-4 py-4 md:fixed md:inset-y-0 md:left-0 md:w-60 md:border-r md:border-b-0 md:py-6">
        <p className="flex items-center gap-2 px-2 text-headline font-bold tracking-tight">
          <img src="/favicon.svg" alt="" className="size-7" /> Zahln Ops
        </p>
        <nav className="flex gap-1 overflow-x-auto md:flex-col">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                cx(
                  'rounded-sm px-3 py-2 text-callout whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-surface-muted font-semibold text-text-primary'
                    : 'text-text-secondary hover:bg-surface-muted/60 hover:text-text-primary',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-3 px-2 md:flex">
          <p className="flex items-center gap-2 text-footnote text-text-secondary" aria-live="polite">
            <span className={cx('size-2 rounded-full', LIVE[live].dot)} /> {LIVE[live].label}
          </p>
          <div className="flex items-center justify-between border-t border-border pt-3 text-footnote">
            <span className="truncate">{op?.name}</span>
            <button
              type="button"
              onClick={() => session.set(null)}
              className="text-text-tertiary hover:text-text-primary"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <Routes>
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/payments/:id" element={<PaymentPage />} />
          <Route path="/merchants" element={<MerchantsPage />} />
          <Route path="/merchants/:id" element={<MerchantPage />} />
          <Route path="/control" element={<ControlPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="*" element={<Navigate to="/payments" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  const op = useSyncExternalStore(session.subscribe, session.get);
  return <BrowserRouter>{op ? <Shell /> : <LoginPage />}</BrowserRouter>;
}
