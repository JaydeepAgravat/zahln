import Lenis from 'lenis';
import { cancelFrame, frame, inView, scroll } from 'motion';
import { animate } from 'motion/mini';
import type { ArtShader } from './artShader';
import { scroller } from './scroller';

/**
 * The motion layer, loaded only when motion is allowed (not reduced, not paused) and only once the visitor shows
 * intent (scroll, wheel, touch, key, pointer move), so it never competes with first paint. Everything here is
 * transform/opacity only, and every effect returns a cleanup so the pause control can switch it all off.
 *
 * One scroll source: Lenis owns smooth scrolling (desktop pointers only) and is ticked from Motion's frame loop,
 * so Motion's scroll() progress and Lenis agree on the same scroll position every frame. scroll() with an
 * animation uses the browser's ScrollTimeline where available, which runs on the compositor.
 */
export function start(): { destroy(): void } {
  const cleanups: Array<() => void> = [];

  // ---------- Lenis ----------
  if (!window.matchMedia('(pointer: coarse)').matches) {
    const lenis = new Lenis({ autoRaf: false, anchors: false, lerp: 0.12 });
    const update = (data: { timestamp: number }) => lenis.raf(data.timestamp);
    frame.update(update, true);
    scroller.lenis = lenis;
    cleanups.push(() => {
      cancelFrame(update);
      lenis.destroy();
      scroller.lenis = null;
    });
  }

  // ---------- Intro art: slow push-in as you leave ----------
  const intro = document.getElementById('top');
  const introImg = intro?.querySelector<HTMLElement>('[data-intro-art] img');
  if (intro && introImg) {
    cleanups.push(
      scrollLinked(introImg, { transform: ['scale(1) translateY(0)', 'scale(1.06) translateY(4%)'] }, intro, [
        'start start',
        'end start',
      ]),
    );
  }

  // ---------- Sticky hero parallax (scale 1.08 → 1.0 over the hero's range) ----------
  for (const hero of document.querySelectorAll<HTMLElement>('[data-hero]')) {
    const img = hero.querySelector<HTMLElement>('[data-parallax]');
    if (img)
      cleanups.push(
        scrollLinked(img, { transform: ['scale(1.08)', 'scale(1)'] }, hero, ['start end', 'end end']),
      );
  }

  // ---------- Tear lag: the torn edge trails the paper by a few percent ----------
  for (const paper of document.querySelectorAll<HTMLElement>('[data-paper]')) {
    const edge = paper.querySelector<HTMLElement>('[data-tear="top"]');
    if (edge)
      cleanups.push(
        scrollLinked(edge, { transform: ['translateY(45%)', 'translateY(0%)'] }, paper, [
          'start end',
          'start 45%',
        ]),
      );
  }

  // ---------- In-view reveals (once), only for things below the fold at start ----------
  const vh = window.innerHeight;
  for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    if (el.getBoundingClientRect().top < vh) continue;
    el.style.opacity = '0';
    el.style.transform = 'translateY(28px)';
    const stop = inView(
      el,
      () => {
        animate(el, { opacity: 1, transform: 'translateY(0px)' }, { duration: 0.7, ease: [0, 0, 0, 1] });
        stop();
      },
      { margin: '0px 0px -12% 0px' },
    );
    cleanups.push(() => {
      stop();
      el.style.opacity = '';
      el.style.transform = '';
    });
  }

  // ---------- Plan cards: gathered into a stack, dealt into the fan on enter ----------
  const fan = document.querySelector<HTMLElement>('[data-plan-fan]');
  if (fan && window.matchMedia('(min-width: 900px)').matches && fan.getBoundingClientRect().top > vh) {
    const cards = [...fan.querySelectorAll<HTMLElement>('[data-plan]')];
    const pro = cards.find((c) => c.dataset.plan === 'pro');
    const finals = cards.map((c) => getComputedStyle(c).transform);
    if (pro) {
      const centre = pro.getBoundingClientRect().left;
      cards.forEach((c, i) => {
        const dx = centre - c.getBoundingClientRect().left;
        c.style.transform = `translate(${dx}px, ${24 + i * 4}px) rotate(${(i - 1) * 1.5}deg)`;
      });
      const stop = inView(
        fan,
        () => {
          cards.forEach((c, i) => {
            animate(
              c,
              { transform: finals[i] ?? 'none' },
              { duration: 0.9, delay: 0.08 * i, ease: [0.2, 0, 0, 1] },
            ).then(() => {
              c.style.transform = '';
            });
          });
          stop();
        },
        { margin: '0px 0px -25% 0px' },
      );
      cleanups.push(() => {
        stop();
        for (const c of cards) c.style.transform = '';
      });
    }
  }

  // ---------- Device videos: src attached near the viewport, play only in view ----------
  for (const video of document.querySelectorAll<HTMLVideoElement>('video[data-video]')) {
    const stop = inView(
      video,
      () => {
        for (const s of video.querySelectorAll<HTMLSourceElement>('source[data-src]')) {
          if (!s.src) s.src = s.dataset.src ?? '';
        }
        if (video.readyState === 0) video.load();
        video.play().catch(() => {});
        return () => video.pause();
      },
      { margin: '200px 0px 200px 0px' },
    );
    cleanups.push(() => {
      stop();
      video.pause();
    });
  }

  // ---------- The shader: lazy, after LCP, only in view ----------
  let shader: ArtShader | null = null;
  let cancelled = false;
  const whenIdle = (fn: () => void) => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(fn, { timeout: 4000 });
    else setTimeout(fn, 1500); // Safari < 26 has no requestIdleCallback
  };
  const loadShader = () =>
    whenIdle(async () => {
      const { createArtShader, shaderAllowed } = await import('./artShader');
      if (cancelled || !shaderAllowed()) return;
      shader = createArtShader();
      if (!shader) return;
      for (const host of document.querySelectorAll<HTMLElement>('[data-shader-host]')) {
        const stop = inView(
          host,
          () => {
            shader?.attach(host);
            return () => shader?.detach(host);
          },
          { amount: 0.35 },
        );
        cleanups.push(stop);
      }
    });
  if (document.readyState === 'complete') loadShader();
  else window.addEventListener('load', loadShader, { once: true });
  cleanups.push(() => {
    cancelled = true;
    window.removeEventListener('load', loadShader);
    shader?.destroy();
    shader = null;
  });

  return {
    destroy() {
      for (const c of cleanups.splice(0).reverse()) c();
    },
  };
}

type Offset = [string, string];

/** A WAAPI animation scrubbed by scroll progress; on cleanup the element returns to its static style. */
function scrollLinked(el: HTMLElement, keyframes: { transform: string[] }, target: Element, offset: Offset) {
  const anim = animate(el, keyframes, { ease: 'linear', duration: 1 });
  const stop = scroll(anim, { target, offset: offset as never });
  return () => {
    stop();
    anim.cancel();
    el.style.transform = '';
  };
}
