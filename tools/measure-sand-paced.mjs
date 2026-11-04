import {chromium,webkit} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import os from 'node:os';
const result={date:new Date().toISOString(),cpu:os.cpus()[0].model,node:process.version,note:'Isolated, visible Canvas, one draw per two browser frames. CPU command time and frame-wait wall time reported separately; neither proves GPU completion.',browsers:[]};
for(const engine of [chromium,webkit]){
 const browser=await engine.launch(),page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,colorScheme:'dark'});
 await page.goto('http://127.0.0.1:4173/');await page.locator('#experiment').selectOption('sand');await page.locator('#sd-canvas').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const d=document.querySelector('#sd-canvas').dataset;return d.drawStatus==='submitted'&&d.revision===d.renderedRevision;});
 const data=await page.evaluate(async()=>{
  const model=await import('/src/sand.ts'),render=await import('/src/sand-render.ts'),cv=document.querySelector('#sd-canvas'),rect=cv.getBoundingClientRect();
  const frames=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const s=model.initial();s.settings={m:8,n:7,a:2};s.sand=model.scatter(42);s.nodes=true;s.symbol='F';
  const modes={};
  for(const mode of ['sand','F','u']){s.mode=mode;const cpu=[],wall=[];for(let k=0;k<40;k++){model.tick(s,mode==='sand',mode==='u');const start=performance.now();render.drawSand(cv,s);cpu.push(performance.now()-start);await frames();wall.push(performance.now()-start);}modes[mode]={cpuMs:cpu,includingTwoFramesMs:wall};}
  return {hidden:document.hidden,rect:{top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height},viewport:[innerWidth,innerHeight],pixels:[cv.width,cv.height],modes};
 });
 // Actual UI playback with visible diagram: include its DOM update, checksum and observed paint cadence.
 await page.locator('#sd-preset').selectOption('2');await page.locator('#sd-canvas').scrollIntoViewIfNeeded();
 await page.locator('#sd-sand-play').evaluate(el=>el.click());
 await page.waitForFunction(()=>JSON.parse(document.querySelector('#sd-canvas').dataset.state).sand.step>=20);
 await page.locator('#sd-sand-play').evaluate(el=>el.click());
 const playback=await page.locator('#sd-canvas').evaluate(c=>JSON.parse(c.dataset.state));
 result.browsers.push({engine:engine.name(),version:browser.version(),...data,playback});await browser.close();
}
await writeFile('docs/vibrating-sand/measurements-paced.json',JSON.stringify(result,null,2)+'\n');console.log('Saved visible paced CPU/frame measurements for both engines.');
