import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir:'./e2e', timeout:30000, workers:1,
  use:{baseURL:'http://127.0.0.1:4173',screenshot:'only-on-failure'},
  webServer:{command:'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:!process.env.CI},
  projects:[
    {name:'chromium',use:{browserName:'chromium',launchOptions:{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}}},
    {name:'webkit',use:{browserName:'webkit'}},
  ],
});
