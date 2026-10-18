const path = require('node:path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withNativeWind } = require('nativewind/metro');

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

module.exports = withNativeWind(mergeConfig(getDefaultConfig(projectRoot), config), {
  input: './global.css',
});
