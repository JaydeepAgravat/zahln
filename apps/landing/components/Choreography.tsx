'use client';

import { useEffect } from 'react';
import { morph } from '@/lib/morph';
import { motionAllowed, subscribe } from '@/lib/motionPref';
import { scroller } from '@/lib/scroller';

/**
 * Page behaviour that needs JS but not motion (active chapter, nav style, focus after jumping to a chapter),
 * plus the switch for the motion runtime, which is a separate chunk loaded only when motion is allowed.
 */
export function Choreography() {
  useEffect(() => {
    const root = document.documentElement;
    const cleanups: Array<() => void> = [];

    // ---------- Active chapter → aria-current on every index link ----------
    const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-index-link]')];
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = (entry.target as HTMLElement).dataset.chapter;
          for (const a of links) {
            if (a.dataset.indexLink === id) a.setAttribute('aria-current', 'true');
            else a.removeAttribute('aria-current');
          }
        }
      },
      { rootMargin: '-45% 0px -54% 0px' },
    );
    for (const s of document.querySelectorAll('[data-chapter]')) io.observe(s);
    cleanups.push(() => io.disconnect());

    // ---------- Top bar: solid over paper, transparent over art ----------
    const bar = document.querySelector<HTMLElement>('[data-topbar]');
    let ticking = false;
    const updateNav = () => {
      ticking = false;
      if (!bar) return;
      const under = document
        .elementsFromPoint(window.innerWidth / 2, 40)
        .find((el) => !bar.contains(el))
        ?.closest<HTMLElement>('[data-nav-style]');
      const style = under?.dataset.navStyle ?? 'art';
      if (bar.dataset.nav !== style) bar.dataset.nav = style;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateNav);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    updateNav();
    cleanups.push(() => window.removeEventListener('scroll', onScroll));

    // ---------- Chapter links: scroll (smoothly if Lenis runs), then move focus to the chapter heading ----------
    const onClick = (event: MouseEvent) => {
      const a = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
      const id = a.getAttribute('href')?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      event.preventDefault();
      a.closest('details')?.removeAttribute('open');
      const heading = document.getElementById(`${id}-title`) ?? target;
      const focus = () => heading.focus({ preventScroll: true });
      history.pushState(null, '', `#${id}`);
      if (scroller.lenis) scroller.lenis.scrollTo(target, { offset: 0, duration: 1.2, onComplete: focus });
      else {
        target.scrollIntoView({ block: 'start' });
        focus();
      }
    };
    document.addEventListener('click', onClick);
    cleanups.push(() => document.removeEventListener('click', onClick));

    // Close the chapter menu on Escape.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const open = document.querySelector<HTMLDetailsElement>('[data-chapter-menu][open]');
      if (open) {
        open.removeAttribute('open');
        open.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    cleanups.push(() => document.removeEventListener('keydown', onKey));

    // ---------- Motion: the morph now, the rest on first intent ----------
    let stopMorph: (() => void) | null = null;
    let runtime: { destroy(): void } | null = null;
    let loading = false;
    let intent = false;
    const INTENT = ['scroll', 'wheel', 'touchstart', 'keydown', 'pointermove'] as const;
    const loadRuntime = async () => {
      if (runtime || loading || !motionAllowed()) return;
      loading = true;
      try {
        const m = await import('@/lib/motion');
        if (motionAllowed()) runtime = m.start();
      } catch {
        // The page is complete without motion.
      } finally {
        loading = false;
      }
    };
    const onIntent = () => {
      intent = true;
      for (const t of INTENT) window.removeEventListener(t, onIntent);
      void loadRuntime();
    };
    const sync = () => {
      if (motionAllowed()) {
        stopMorph ??= morph();
        if (intent || window.scrollY > 0) onIntent();
        else for (const t of INTENT) window.addEventListener(t, onIntent, { passive: true, once: true });
      } else {
        stopMorph?.();
        stopMorph = null;
        runtime?.destroy();
        runtime = null;
        root.classList.remove('morph', 'morph-ready');
      }
    };
    sync();
    cleanups.push(subscribe(sync));
    cleanups.push(() => {
      for (const t of INTENT) window.removeEventListener(t, onIntent);
      stopMorph?.();
      runtime?.destroy();
    });

    return () => {
      for (const c of cleanups) c();
    };
  }, []);
  return null;
}
