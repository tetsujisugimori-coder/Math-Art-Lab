import { defineConfig } from '@playwright/test';
import developmentConfig from './playwright.config';

export default defineConfig({
  ...developmentConfig,
  testDir: './e2e-production',
  use: { ...developmentConfig.use, baseURL: 'http://127.0.0.1:4174/Math-Art-Lab/' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/Math-Art-Lab/',
    reuseExistingServer: false,
  },
});
