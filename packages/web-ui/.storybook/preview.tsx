import '@fontsource-variable/inter';
import './storybook.css';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  // Every story in light and dark: the toolbar switches <html data-theme>, exactly how the apps do it.
  decorators: [
    withThemeByDataAttribute({
      themes: { light: 'light', dark: 'dark' },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
  ],
  parameters: {
    layout: 'centered',
    // Accessibility checks fail the story in the test runner, not just warn.
    a11y: { test: 'error' },
    backgrounds: { disable: true },
  },
};

export default preview;
