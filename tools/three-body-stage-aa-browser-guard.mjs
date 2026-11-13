// Preload in browser-free process-path checks, inherited by bound children.
import fs from 'node:fs';import {webkit,chromium,firefox} from 'playwright';
if(!process.env.AA_GUARD_LOG)throw Error('GUARD_LOG_REQUIRED');fs.appendFileSync(process.env.AA_GUARD_LOG,JSON.stringify({pid:process.pid,event:'guard-loaded'})+'\n');
for(const b of [webkit,chromium,firefox])for(const method of ['launch','launchPersistentContext','launchServer'])b[method]=()=>{fs.appendFileSync(process.env.AA_GUARD_LOG,JSON.stringify({pid:process.pid,event:'browser-launch',method})+'\n');throw Error('FORBIDDEN_BROWSER_LAUNCH');};
