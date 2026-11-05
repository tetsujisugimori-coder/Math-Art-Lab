import { defineConfig } from '@playwright/test';
import developmentConfig from './playwright.config';
const port=Number(process.env.MATH_ART_E2E_PRODUCTION_PORT??4174);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid MATH_ART_E2E_PRODUCTION_PORT');
const url=`http://127.0.0.1:${port}/Math-Art-Lab/`;

export default defineConfig({
  ...developmentConfig,
  testDir: './e2e-production',
  use: { ...developmentConfig.use, baseURL: url },
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port ${port} --strictPort`,
    url,
    reuseExistingServer: false,
  },
});
