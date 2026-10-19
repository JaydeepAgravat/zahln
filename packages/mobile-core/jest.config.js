module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  // Workspace packages and RN libraries ship untranspiled TS/ESM.
  transformIgnorePatterns: ['node_modules/(?!(@react-native|react-native|@zaster|zustand)/)'],
};
