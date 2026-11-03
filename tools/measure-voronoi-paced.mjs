import {chromium,webkit} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import os from 'node:os';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4184','--strictPort'],{stdio:'ignore',windowsHide:true});
let browser;const results={date:new Date().toISOString(),cpu:os.cpus()[0].model,os:os.platform(),viewport:[1280,1000],dpr:2,note:'64 sites, every layer and all-symbol highlight. Paced steps yield two animation frames. Autoplay uses product timers. CPU submission and event latency, not GPU completion.',browsers:[]};
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4184')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const engine of [chromium,webkit]){
  browser=await engine.launch();const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,colorScheme:'dark'});
  await page.goto('http://127.0.0.1:4184');await page.locator('#experiment').selectOption('voronoi');await page.locator('#vc-preset').selectOption('grid');
  await page.evaluate(()=>{for(let i=0;i<64;i++){
   const c=document.querySelector('#vc-canvas'),sites=JSON.parse(c.dataset.state).sites;if(sites.length===64)break;const x=(i%8+.5)/8,y=(Math.floor(i/8)+.5)/8;if(sites.some(p=>Math.hypot(p.x-x,p.y-y)<.025))continue;
   document.querySelector('#vc-point-x').value=x;document.querySelector('#vc-point-y').value=y;document.querySelector('#vc-add').click();
  }});
  for(const id of ['centroids','vectors','distances'])await page.locator(`#vc-${id}`).check();await page.locator('[data-vc-symbol="all"]').click();
  await page.locator('#vc-canvas').scrollIntoViewIfNeeded();
  const visibility=await page.locator('#vc-canvas').evaluate(el=>{const r=el.getBoundingClientRect();return {document:document.visibilityState,top:r.top,bottom:r.bottom,viewportHeight:innerHeight};});
  const paced=await page.evaluate(async()=>{
   const c=document.querySelector('#vc-canvas'),samples=[];
   for(let i=0;i<60;i++){await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const start=performance.now();document.querySelector('#vc-step').click();const wall=performance.now()-start;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));samples.push({wall,settled:performance.now()-start,compute:Number(c.dataset.computeMs),draw:Number(c.dataset.renderMs)});}
   return {samples,count:JSON.parse(c.dataset.state).sites.length,maxWall:Math.max(...samples.map(s=>s.wall)),maxSettled:Math.max(...samples.map(s=>s.settled)),maxDraw:Math.max(...samples.map(s=>s.draw))};
  });
  await page.locator('#vc-reset').click();
  await page.evaluate(()=>{
   window.crystalPaced={samples:[],last:-1};const c=document.querySelector('#vc-canvas');
   window.crystalPaced.observer=new MutationObserver(()=>{const step=Number(c.dataset.step);if(step!==window.crystalPaced.last){window.crystalPaced.last=step;window.crystalPaced.samples.push({step,time:performance.now(),compute:Number(c.dataset.computeMs),draw:Number(c.dataset.renderMs)});}});
   window.crystalPaced.observer.observe(c,{attributes:true,attributeFilter:['data-render-ms']});
  });
  await page.locator('#vc-play').click();await page.waitForFunction(()=>Number(document.querySelector('#vc-canvas').dataset.step)>=20);
  await page.waitForFunction(()=>document.querySelector('#vc-canvas').dataset.renderedStep===document.querySelector('#vc-canvas').dataset.step);
  const autoplay=await page.evaluate(async()=>{const start=performance.now();document.querySelector('#vc-play').click();const stopMs=performance.now()-start;window.crystalPaced.observer.disconnect();const samples=window.crystalPaced.samples.filter(s=>s.step>0);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return {samples,stopMs,stopSettledMs:performance.now()-start,maxDraw:Math.max(...samples.map(s=>s.draw)),maxCompute:Math.max(...samples.map(s=>s.compute)),maxInterval:Math.max(...samples.slice(1).map((s,i)=>s.time-samples[i].time))};});
  await page.locator('#vc-canvas').scrollIntoViewIfNeeded();
  const box=await page.locator('#vc-canvas').boundingBox(),site=await page.evaluate(()=>JSON.parse(document.querySelector('#vc-canvas').dataset.state).sites[0]);
  await page.evaluate(()=>{
   window.crystalDrag=[];let start=0;const c=document.querySelector('#vc-canvas');c.addEventListener('pointermove',()=>{start=performance.now();},{capture:true});c.addEventListener('pointermove',()=>window.crystalDrag.push({wall:performance.now()-start,compute:Number(c.dataset.computeMs),lastCompletedDraw:Number(c.dataset.renderMs)}));
  });
  const x=box.x+box.width*(.045+.91*site.x),y=box.y+box.height*(.955-.91*site.y);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+8,y-8,{steps:20});await page.mouse.up();
  const drag=await page.evaluate(()=>({samples:window.crystalDrag,maxWall:Math.max(...window.crystalDrag.map(s=>s.wall)),message:document.querySelector('#vc-error').textContent}));
  results.browsers.push({engine:engine.name(),version:browser.version(),visibility,paced,autoplay,drag});await browser.close();browser=null;
 }
 await writeFile('docs/voronoi-crystal/measurements-paced.json',JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.browsers.map(b=>({engine:b.engine,pacedMax:b.paced.maxWall,pacedSettled:b.paced.maxSettled,autoplayDrawMax:b.autoplay.maxDraw,autoplayMaxInterval:b.autoplay.maxInterval,stopMs:b.autoplay.stopMs,stopSettled:b.autoplay.stopSettledMs,dragMax:b.drag.maxWall,dragError:b.drag.message}))));
}finally{await browser?.close();server.kill();}
