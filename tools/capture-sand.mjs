import {chromium,webkit} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
const dir='docs/vibrating-sand',url=process.env.SAND_URL||'http://127.0.0.1:4173/';
await mkdir(`${dir}/screenshots`,{recursive:true});
const manifest=[],measurements={date:new Date().toISOString(),cpu:os.cpus()[0].model,node:process.version,os:os.platform(),note:'CPU model/DOM/Canvas command duration, not GPU completion or real-device frame-rate guarantee',browsers:[]};
for(const engine of [chromium,webkit]){
 const browser=await engine.launch(),page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,colorScheme:'dark'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#experiment').selectOption('sand');
 async function ready(){await page.waitForFunction(()=>{const d=document.querySelector('#sd-canvas').dataset;return d.drawStatus==='submitted'&&d.revision===d.renderedRevision;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 async function capture(name,full=false){await ready();const file=`${dir}/screenshots/${engine.name()}-${name}.png`;await (full?page:page.locator('#sd-canvas')).screenshot({path:file,fullPage:full});manifest.push({file,browser:engine.name(),version:browser.version(),viewport:page.viewportSize(),...(await page.locator('#sd-canvas').evaluate(c=>({state:JSON.parse(c.dataset.state),requested:c.dataset.revision,submitted:c.dataset.renderedRevision,pixels:[c.width,c.height],font:getComputedStyle(document.documentElement).fontSize,theme:matchMedia('(prefers-color-scheme:light)').matches?'light':'dark'})))});}
 await capture('representative');await capture('desktop',true);
 for(let i=0;i<4;i++){await page.locator('#sd-preset').selectOption(String(i));await page.evaluate(()=>{for(let i=0;i<320;i++)document.querySelector('#sd-sand-step').click();});await capture(`preset-${i}`);}
 await page.locator('#sd-preset').selectOption('1');await page.evaluate(()=>{for(let i=0;i<12;i++)document.querySelector('#sd-sand-step').click();});await capture('gathering-step12');
 await page.locator('[data-mode="F"]').click();await capture('signed-F');await page.locator('#sd-nodes').check();await capture('nodes');
 await page.locator('#sd-symbols [data-symbol="x"]').click();await capture('symbol-x');
 await page.locator('#sd-clear').click();await page.locator('#sd-quarter').click();await capture('instantaneous-zero');
 await page.locator('#sd-start').click();for(let i=0;i<4;i++){await page.locator(`[data-lesson="${i}"]`).click();await capture(`lesson-${i+1}`,true);}await page.locator('#sd-close').click();
 for(const width of [375,390,768,1280])for(const colorScheme of ['light','dark']){
  await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.locator('[data-mode="F"]').click();await capture(`width-${width}-${colorScheme}-200`,true);
 }
 await page.setViewportSize({width:1280,height:1000});await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.locator('#sd-reset').click();await ready();
 // Measurement is isolated from playback and screenshots. Worst supported m,n plus all line layers.
 const measured=await page.evaluate(async()=>{
  const model=await import('/src/sand.ts'),{drawSand}=await import('/src/sand-render.ts');
  const samples=[],referenceSamples=[],results=[];
  for(const p of model.presets)for(const seed of [1,42,12012,987654321]){const s=model.scatter(seed),before=model.statistics(s,p);const start=performance.now();for(let k=0;k<320;k++)model.advance(s,p);referenceSamples.push(performance.now()-start);results.push({settings:p,seed,before,after:model.statistics(s,p)});}
  const s=model.initial();s.settings={m:8,n:7,a:2};s.sand=model.scatter(42);s.nodes=true;s.symbol='F';
  for(let i=0;i<80;i++){const start=performance.now();model.advance(s.sand,s.settings);samples.push(performance.now()-start);}
  const render={};for(const mode of ['sand','F','u']){s.mode=mode;const times=[];for(let i=0;i<30;i++){if(mode==='u')s.t+=model.DT;const start=performance.now();drawSand(document.querySelector('#sd-canvas'),s);times.push(performance.now()-start);}render[mode]=times;}
  // Fresh independent UI events: includes hash/observation/DOM, coalesces Canvas into one pending frame.
  document.querySelector('#sd-scatter').click();const ui=[];for(let i=0;i<40;i++){const t=performance.now();document.querySelector('#sd-sand-step').click();ui.push(performance.now()-t);}
  return {stepMs:samples,reference320Ms:referenceSamples,renderMs:render,uiStepMs:ui,seeds:results,pixels:[document.querySelector('#sd-canvas').width,document.querySelector('#sd-canvas').height],dpr:devicePixelRatio,particles:model.PARTICLES};
 });
 measurements.browsers.push({engine:engine.name(),version:browser.version(),errors,...measured});await browser.close();
}
await writeFile(`${dir}/screenshot-manifest.json`,JSON.stringify(manifest,null,2)+'\n');await writeFile(`${dir}/measurements.json`,JSON.stringify(measurements,null,2)+'\n');
console.log(`Saved ${manifest.length} captures; CPU measurements for both engines.`);
