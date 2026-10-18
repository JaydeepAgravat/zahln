import { configureApp } from '@zahln/mobile-core';

// Runs before anything else in index.js: every shared package reads the app kind from here.
configureApp('merchant');
