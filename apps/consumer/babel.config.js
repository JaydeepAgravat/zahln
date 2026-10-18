module.exports = {
  presets: [['module:@react-native/babel-preset', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  plugins: [
    // Zod 4 uses `export * as`.
    '@babel/plugin-transform-export-namespace-from',
    // Must be last.
    'react-native-worklets/plugin',
  ],
};
