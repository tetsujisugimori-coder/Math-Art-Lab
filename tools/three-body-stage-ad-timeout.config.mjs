import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['src/knot.test.ts','src/three-body.test.ts'],setupFiles:process.env.STAGE_AD_OBSERVER==='on'?['tools/three-body-stage-ad-setup.mjs']:[],reporters:['default','json','./tools/three-body-stage-ad-reporter.mjs'],outputFile:{json:process.env.STAGE_AD_RESULT}}});
