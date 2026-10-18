const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');
const { withStorybook } = require('@storybook/react-native/metro/withStorybook');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

/**
 * Monorepo setup: watch the whole workspace so `@zahln/shared` hot-reloads,
 * and resolve modules from the hoisted root node_modules (one copy of react / react-native).
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    unstable_enablePackageExports: true,
  },
};

/**
 * Storybook (mobile-ui) only with `STORYBOOK=1`. Otherwise withStorybook resolves every @storybook module and the
 * whole config folder to empty modules, so a release bundle can't contain it.
 */
module.exports = withStorybook(
  withNativeWind(mergeConfig(getDefaultConfig(projectRoot), config), { input: './global.css' }),
  {
    enabled: process.env.STORYBOOK === '1',
    configPath: path.resolve(workspaceRoot, 'packages/mobile-ui/.rnstorybook'),
  },
);
