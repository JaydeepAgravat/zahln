import type { StoryObj } from '@storybook/react-native';
import type { ReactElement } from 'react';

/** The same story in light and dark (German), plus an English one: what ships, side by side in the list. */
export function themed(render: () => ReactElement): Record<'Light' | 'Dark' | 'English', StoryObj> {
  return {
    Light: { render, parameters: { theme: 'light', locale: 'de' } },
    Dark: { render, parameters: { theme: 'dark', locale: 'de' } },
    English: { render, parameters: { theme: 'light', locale: 'en' } },
  };
}
