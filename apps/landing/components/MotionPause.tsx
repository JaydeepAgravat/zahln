'use client';

import { useSyncExternalStore } from 'react';
import { isPaused, setPaused, subscribe } from '@/lib/motionPref';

/**
 * WCAG 2.2.2 Pause, Stop, Hide: one visible control that stops smooth scrolling, scroll-linked motion,
 * the shader and the cycling demo. The choice is remembered (localStorage, wrapped in try/catch).
 */
export function MotionPause({ pause, play }: { pause: string; play: string }) {
  const paused = useSyncExternalStore(subscribe, isPaused, () => false);
  return (
    <button
      type="button"
      onClick={() => setPaused(!paused)}
      className="needs-js inline-flex h-9 items-center gap-2 rounded-full border border-current/30 px-3 font-display text-[13px] font-bold transition-colors hover:border-current"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
        {paused ? (
          <path d="M4 2.5v11l9-5.5z" fill="currentColor" />
        ) : (
          <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor" />
        )}
      </svg>
      <span className="sr-only sm:not-sr-only">{paused ? play : pause}</span>
    </button>
  );
}
