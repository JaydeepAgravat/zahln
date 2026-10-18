import type Lenis from 'lenis';

/** The active Lenis instance (null when native scrolling is used: reduced motion, paused, touch, no JS). */
export const scroller: { lenis: Lenis | null } = { lenis: null };
