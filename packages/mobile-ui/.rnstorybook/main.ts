import type { StorybookConfig } from '@storybook/react-native';

const main: StorybookConfig = {
  stories: ['../src/stories/**/*.stories.?(ts|tsx)'],
  // No on-device addons: they pull in native pickers and sliders. Theme and language are per-story instead.
  deviceAddons: [],
};

export default main;
