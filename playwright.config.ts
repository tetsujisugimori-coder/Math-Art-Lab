import { defineConfig } from '@playwright/test';
const port=Number(process.env.MATH_ART_E2E_DEV_PORT??4173);
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Invalid MATH_ART_E2E_DEV_PORT');
const url=`http://127.0.0.1:${port}`;

export default defineConfig({
  testDir:'./e2e', timeout:30000, workers:1,
  use:{baseURL:url,screenshot:'only-on-failure'},
  webServer:{command:`node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,url,reuseExistingServer:!process.env.CI&&!process.env.MATH_ART_E2E_DEV_PORT},
  projects:[
    {name:'chromium',use:{browserName:'chromium',launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}}},
    {name:'webkit',use:{browserName:'webkit'}},
  ],
});
