// NativeWind's styles, for the app and for Storybook alike.
import './global.css';
import './src/app/configure';
import { AppRegistry } from 'react-native';
import { name as appName } from './app.json';
import { App } from './src/app/App';

// `STORYBOOK=1 pnpm --filter @zaster/consumer storybook` starts the design system instead of the app.
// Without it, Metro resolves this file to an empty module (see metro.config.js), so `storybookEnabled` is undefined.
const { storybookEnabled } = require('../../packages/mobile-ui/.rnstorybook/enabled');

AppRegistry.registerComponent(appName, () =>
  storybookEnabled === true ? require('../../packages/mobile-ui/.rnstorybook').default : App,
);
