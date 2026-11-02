import {chromium,webkit} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4182','--strictPort'],{stdio:'ignore',windowsHide:true});
const dir='docs/fourier-kaleidoscope';let browser;
try{
 for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:4182')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 await mkdir(`${dir}/screenshots`,{recursive:true});const results={os:os.platform(),cpu:os.cpus()[0].model,date:new Date().toISOString(),conditions:'K=127, fish, 1280x1000, DPR2, circles on; one run; foreground',browsers:[],layouts:[]};
 for(const engine of [chromium,webkit]){
  browser=await engine.launch();const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,colorScheme:'dark'});await page.goto('http://127.0.0.1:4182');await page.locator('#experiment').selectOption('fourier');
  const numerical=await page.evaluate(async()=>{const m=await import('/src/fourier.ts'),start=performance.now(),model=m.createModel('fish'),dftMs=performance.now()-start,begin=performance.now(),path=m.curve(model,127);return {dftAndModelMs:dftMs,curve127Ms:performance.now()-begin,points:path.length,rmse127:m.rmse(model,127),extent:model.extent};});
  await page.locator('#fourier-k').evaluate(el=>{el.value='127';el.dispatchEvent(new Event('input',{bubbles:true}));});
  const timings=await page.evaluate(()=>{const times=[],total=performance.now(),c=document.querySelector('#fourier-canvas');for(let i=0;i<512;i++){document.querySelector('#fourier-step').click();times.push(Number(c.dataset.renderMs));}times.sort((a,b)=>a-b);return {step512TotalMs:performance.now()-total,renderMedianMs:times[256],renderP95Ms:times[Math.floor(512*.95)],renderMaxMs:times.at(-1),width:c.width,height:c.height,points:c.dataset.points};});
  await page.locator('#fourier-reset').click();await page.locator('#fourier-speed').selectOption('4');const start=Date.now();await page.locator('#fourier-play').click();await page.waitForFunction(()=>document.querySelector('#fourier-canvas').dataset.step==='512');const playbackWallMs=Date.now()-start;
  results.browsers.push({engine:engine.name(),version:browser.version(),...numerical,...timings,playbackWallMs});
  if(engine===chromium){
   for(const preset of ['circle','star','fish']){await page.locator('#fourier-preset').selectOption(preset);await page.locator('#fourier-k').evaluate(el=>{el.value='16';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#fourier-complete').click();await page.locator('#fourier-canvas').screenshot({path:`${dir}/screenshots/${preset}-k16.png`});}
   await page.locator('#fourier-reset').click();await page.evaluate(()=>{for(let i=0;i<325;i++)document.querySelector('#fourier-step').click();});await page.locator('#fourier-term').selectOption('2');await page.screenshot({path:`${dir}/screenshots/desktop-dark.png`,fullPage:true});
   for(const width of [320,375,390,768,1280])for(const colorScheme of ['dark','light'])for(const font of ['100%','200%']){
    await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme});await page.evaluate(f=>document.documentElement.style.fontSize=f,font);
    await page.locator('#fourier-canvas').screenshot({path:`${dir}/screenshots/stage-${width}-${colorScheme}-${font.slice(0,-1)}.png`});
    results.layouts.push({width,colorScheme,font,...await page.evaluate(()=>{const c=document.querySelector('#fourier-canvas'),r=c.getBoundingClientRect();return {width:r.width,height:r.height,documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,phase:c.dataset.step};})});
    if(width===375&&colorScheme==='light'&&font==='100%')await page.screenshot({path:`${dir}/screenshots/mobile-light.png`,fullPage:true});
    if(width===320&&colorScheme==='light'&&font==='200%')await page.locator('.fourier-inspector').screenshot({path:`${dir}/screenshots/text200.png`});
   }
  }
  await browser.close();browser=null;
 }
 await writeFile(`${dir}/measurements.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.browsers));
}finally{await browser?.close();server.kill();}
