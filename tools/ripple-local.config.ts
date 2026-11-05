// Dedicated ports avoid accidentally testing another worktree's running server.
import {defineConfig} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import base from '../playwright.config';
const production=process.env.RIPPLE_PRODUCTION==='1';
export default defineConfig({...base,testDir:production?'../e2e-production':'../e2e',use:{...base.use,baseURL:production?'http://127.0.0.1:4184/Math-Art-Lab/':'http://127.0.0.1:4183'},webServer:{cwd:fileURLToPath(new URL('..',import.meta.url)),command:production?'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4184 --strictPort':'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4183 --strictPort',url:production?'http://127.0.0.1:4184/Math-Art-Lab/':'http://127.0.0.1:4183',reuseExistingServer:false}});
