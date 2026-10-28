import {test} from '@playwright/test';
import {defaults,geometry,pixels} from '../src/wave';
test('capture wave modes and measure pixel generation',async({page},info)=>{
 test.skip(info.project.name!=='chromium'||!process.env.WAVE_CAPTURE,'manual capture');
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:1280,height:900});await page.goto('./');await page.locator('#experiment').selectOption('wave');
 for(const mode of ['a','b','u','envelope']){await page.locator('#wave-mode').selectOption(mode);await page.waitForTimeout(150);await page.locator('.wave-stage').screenshot({path:`docs/wave/${mode}.png`});}
 await page.setViewportSize({width:320,height:900});await page.screenshot({path:'docs/wave/mobile.png',fullPage:true});
 const g=geometry(defaults());for(let i=0;i<10;i++)pixels(g,'u',i/10);const t=performance.now();for(let i=0;i<100;i++)pixels(g,'u',i/100);console.log(`100 pixel generations at 240²: ${(performance.now()-t).toFixed(1)} ms`);
});
