import { storage } from '@zaster/mobile-core';
import { view } from './storybook.requires';

/** On-device Storybook (STORYBOOK=1 pnpm --filter @zaster/consumer storybook). Remembers the last story in MMKV. */
const StorybookUIRoot = view.getStorybookUI({
  storage: {
    getItem: async (key) => storage.getString(key) ?? null,
    setItem: async (key, value) => storage.set(key, value),
  },
});

export default StorybookUIRoot;
