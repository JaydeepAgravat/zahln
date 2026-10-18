import { configureApp } from '@zahln/mobile-core';
import pkg from '../../package.json';

// Runs before anything else in index.js: every shared package reads the app kind and version from here.
configureApp('consumer', pkg.version);
