/**
 * Read by the app's entry. When Metro runs without STORYBOOK=1, withStorybook resolves every file in this folder to
 * an empty module, so this is `undefined` and the real app starts: release bundles can't contain Storybook.
 */
export const storybookEnabled = true;
