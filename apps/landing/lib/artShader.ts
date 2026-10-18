import { Mesh, Program, Renderer, Triangle } from 'ogl';
import { vertex } from '@/shaders/fullscreen.vert';
import { fragment } from '@/shaders/grain.frag';
import { palette } from './tokens';

export type ArtShader = { attach(host: HTMLElement): void; detach(host: HTMLElement): void; destroy(): void };

/** Low-end and data-saver devices get the static fallback (CSS grain over the graded image). */
export function shaderAllowed(): boolean {
  const nav = navigator as Navigator & { connection?: { saveData?: boolean } };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if ((nav.hardwareConcurrency ?? 0) <= 4) return false;
  if (nav.connection?.saveData) return false;
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

const hexToVec3 = (hex: string): [number, number, number] =>
  [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

/**
 * One WebGL context for the whole page: the canvas moves into whichever hero is in view, renders only there,
 * at DPR ≤ 1.5, and stops when the tab is hidden or nothing is in view.
 */
export function createArtShader(): ArtShader | null {
  if (!shaderAllowed()) return null;
  let renderer: Renderer;
  try {
    renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
      alpha: false,
      antialias: false,
      webgl: 2,
    });
  } catch {
    return null;
  }
  const gl = renderer.gl;
  gl.canvas.className = 'shader-canvas';
  gl.canvas.setAttribute('aria-hidden', 'true');
  const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
      uTime: { value: 0 },
      uEnter: { value: 0 },
      uResolution: { value: [1, 1] },
      uEmber: { value: hexToVec3(palette.ember) },
    },
  });
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

  let host: HTMLElement | null = null;
  let raf = 0;
  let enteredAt = 0;
  const resize = () => {
    if (!host) return;
    renderer.setSize(host.clientWidth, host.clientHeight);
    program.uniforms.uResolution.value = [gl.canvas.width, gl.canvas.height];
  };
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    program.uniforms.uTime.value = now / 1000;
    program.uniforms.uEnter.value = (now - enteredAt) / 1000;
    renderer.render({ scene: mesh });
  };
  const start = () => {
    if (!raf && host && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('resize', resize);

  return {
    attach(next) {
      if (host === next) return;
      host?.removeAttribute('data-shader');
      host = next;
      next.appendChild(gl.canvas);
      next.setAttribute('data-shader', 'on');
      enteredAt = performance.now();
      resize();
      start();
    },
    detach(prev) {
      if (host !== prev) return;
      stop();
      prev.removeAttribute('data-shader');
      gl.canvas.remove();
      host = null;
    },
    destroy() {
      stop();
      host?.removeAttribute('data-shader');
      gl.canvas.remove();
      host = null;
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', resize);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
