import { scroll } from 'motion';

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/**
 * One element, two states: the desktop chapter index starts centred in the intro frame's slot and travels to its
 * fixed column as the intro scrolls away (Motion's scroll() progress over the intro). Both rects are measured,
 * and re-measured on resize; per frame we only write a translate3d. This is part of the first-load chunk
 * (~4 KB of Motion) because the index has to sit in the frame at scroll 0.
 */
export function morph(): () => void {
  const root = document.documentElement;
  const nav = document.querySelector<HTMLElement>('[data-index-desktop] .chapter-index');
  const slot = document.querySelector<HTMLElement>('[data-frame-slot]');
  const intro = document.getElementById('top');
  if (!nav || !slot || !intro || !root.classList.contains('morph')) {
    root.classList.remove('morph');
    return () => {};
  }
  let from = { x: 0, y: 0 };
  let to = { x: 0, y: 0 };
  let progress = 0;
  const apply = () => {
    const e = 1 - ease(Math.min(Math.max(progress / 0.55, 0), 1));
    const dx = (from.x - to.x) * e;
    const dy = (from.y - window.scrollY - to.y) * e;
    nav.style.transform = e === 0 ? '' : `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0)`;
  };
  const measure = () => {
    nav.style.transform = '';
    const n = nav.getBoundingClientRect();
    const s = slot.getBoundingClientRect();
    to = { x: n.left, y: n.top };
    from = { x: s.left + (s.width - n.width) / 2, y: s.top + window.scrollY };
    apply();
  };
  measure();
  root.classList.add('morph-ready');
  const stop = scroll(
    (p: number) => {
      progress = p;
      apply();
    },
    { target: intro, offset: ['start start', 'end start'] as never },
  );
  window.addEventListener('resize', measure);
  return () => {
    stop();
    window.removeEventListener('resize', measure);
    nav.style.transform = '';
    root.classList.remove('morph', 'morph-ready');
  };
}
