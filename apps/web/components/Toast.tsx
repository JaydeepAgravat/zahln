'use client';

import { cx } from '@zahln/web-ui';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

type Toast = { id: number; text: string; tone: 'success' | 'error' };
const Ctx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((all) => [...all, { id, text, tone }]);
    setTimeout(() => setToasts((all) => all.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 z-50 flex flex-col gap-2">
        {toasts.map((x) => (
          <p
            key={x.id}
            className={cx(
              'animate-arrive max-w-sm rounded-md px-4 py-3 text-callout shadow-lg',
              x.tone === 'success' ? 'bg-text-primary text-bg' : 'bg-danger text-bg',
            )}
          >
            {x.text}
          </p>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
