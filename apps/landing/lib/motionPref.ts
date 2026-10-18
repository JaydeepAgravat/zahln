'use client';

/**
 * The visitor's motion preference: the OS setting (prefers-reduced-motion) plus our own pause control
 * (WCAG 2.2.2), remembered in localStorage. localStorage can throw (Safari private mode, blocked storage),
 * so every access is wrapped; without storage the choice simply lasts for the visit.
 */
const KEY = 'zahln.landing.motion';
type Listener = () => void;
const listeners = new Set<Listener>();

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === 'paused';
  } catch {
    return false;
  }
}

let paused: boolean | null = null;

export function isPaused(): boolean {
  if (paused === null) paused = typeof window !== 'undefined' && readStored();
  return paused;
}

export function setPaused(next: boolean) {
  paused = next;
  try {
    if (next) localStorage.setItem(KEY, 'paused');
    else localStorage.removeItem(KEY);
  } catch {
    // Storage unavailable: keep the in-memory choice.
  }
  if (next) document.documentElement.setAttribute('data-motion', 'paused');
  else document.documentElement.removeAttribute('data-motion');
  for (const l of listeners) l();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', listener);
  return () => {
    listeners.delete(listener);
    mq.removeEventListener('change', listener);
  };
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Full motion allowed: not reduced, not paused. */
export function motionAllowed(): boolean {
  return !prefersReducedMotion() && !isPaused();
}
