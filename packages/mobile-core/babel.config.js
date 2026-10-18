// Only used by Jest; the apps' Metro builds use their own Babel config.
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
