import { describe, expect, it } from 'vitest';
import { contrastRatio, palette, textPairs, tokenStyle } from '../lib/tokens';

describe('landing palette', () => {
  it('comes from the shared tokens', () => {
    expect(palette.paper).toBe('#F7F3EE');
    expect(palette.ink).toBe('#1B1A17');
    expect(palette.ember).toBe('#FF4F1F');
    expect((tokenStyle as Record<string, string>)['--z-ember']).toBe('#FF4F1F');
  });

  it.each(textPairs)('%s meets its contrast minimum', (_name, fg, bg, min) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
