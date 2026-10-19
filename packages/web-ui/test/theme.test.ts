import { colors } from '@zaster/shared/tokens';
import { describe, expect, it } from 'vitest';
import { themeCss } from '../src/themeCss';

describe('web theme', () => {
  it('src/theme.css is the generated output of the shared tokens (run `pnpm theme` after a token change)', async () => {
    await expect(themeCss()).toMatchFileSnapshot('../src/theme.css');
  });

  it('has every colour token, in both themes', () => {
    const css = themeCss();
    expect(css).toContain(`--color-brand: ${colors.light.brand};`);
    expect(css).toContain(`--color-brand: ${colors.dark.brand};`);
    expect(css.match(/--color-text-primary:/g)).toHaveLength(3);
  });
});
