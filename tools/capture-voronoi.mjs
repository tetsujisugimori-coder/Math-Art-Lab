import {chromium,webkit} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
const dir='docs/voronoi-crystal';
const screenshotsOnly=process.argv.includes('--screenshots-only');
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4182','--strictPort'],{stdio:'ignore',windowsHide:true});
const results={schema:2,date:new Date().toISOString(),os:os.platform(),cpu:os.cpus()[0].model,node:process.version,viewport:'1280x1000',dpr:2,note:'100 synchronous updates coalesce into a pending frame. Per-click CPU and the final Canvas submission are measured separately; no GPU-completion guarantee.',browsers:[]};
let browser;
const captures=[];
try{
 await mkdir(`${dir}/screenshots`,{recursive:true});
 for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:4182')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const engine of [chromium,webkit]){
  browser=await engine.launch();const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,colorScheme:'dark'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:4182');await page.locator('#experiment').selectOption('voronoi');
  async function capture(target,file,options={}){
   await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   await page.waitForFunction(()=>{const c=document.querySelector('#vc-canvas'),r=document.querySelector('#vc-reference-canvas'),s=JSON.parse(c.dataset.state);return c.dataset.drawStatus==='submitted'&&c.dataset.revision===c.dataset.renderedRevision&&(!s.layers.compare||(r.dataset.drawStatus==='submitted'&&r.dataset.renderedRevision===c.dataset.revision));});
   await target.screenshot({path:file,...options});
   const metadata=await page.locator('#vc-canvas').evaluate(c=>{const s=JSON.parse(c.dataset.state);return {preset:s.preset,step:s.step,sites:s.sites,selected:s.selected,probe:s.probe,symbol:s.symbol,layers:s.layers,revision:c.dataset.revision,renderedRevision:c.dataset.renderedRevision,canvasPixels:[c.width,c.height],theme:matchMedia('(prefers-color-scheme:light)').matches?'light':'dark',font:getComputedStyle(document.documentElement).fontSize};});
   captures.push({file,engine:engine.name(),version:browser.version(),viewport:page.viewportSize(),...metadata});
  }
  if(!screenshotsOnly){
  const measurement=await page.evaluate(async()=>{
   const {voronoi,lloyd,preset}=await import('/src/voronoi.ts');
   const sets={one:[{id:1,x:.2,y:.3}],default:preset('irregular'),max:Array.from({length:64},(_,i)=>({id:i+1,x:(i%8+.5)/8+.006*Math.sin(i),y:(Math.floor(i/8)+.5)/8+.006*Math.cos(i)}))};
   const stats=a=>({samples:a.length,min:Math.min(...a),mean:a.reduce((s,n)=>s+n,0)/a.length,max:Math.max(...a),values:a}),model={};
   for(const [id,sites] of Object.entries(sets)){
    let ps=sites;const times=[];for(let i=0;i<150;i++){const start=performance.now();ps=lloyd(ps).sites;voronoi(ps);times.push(performance.now()-start);}model[id]=stats(times);
   }
   const cv=document.querySelector('#vc-canvas'),steps=[],compute=[],render=[];
   for(let i=0;i<100;i++){const start=performance.now();document.querySelector('#vc-step').click();steps.push(performance.now()-start);compute.push(Number(cv.dataset.computeMs));}
   await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));render.push(Number(cv.dataset.renderMs));
   return {model,stepIncludingDOM:stats(steps),compute:stats(compute),draw:stats(render),pixels:[cv.width,cv.height]};
  });
  // Build the maximum configuration through the actual editor, then measure its UI flow.
  await page.locator('#vc-preset').selectOption('grid');
  await page.evaluate(()=>{
   const form=document.querySelector('#vc-point-form'),x=document.querySelector('#vc-point-x'),y=document.querySelector('#vc-point-y');
   for(let i=0;i<64;i++){
    if(JSON.parse(document.querySelector('#vc-canvas').dataset.state).sites.length===64)break;
    const px=(i%8+.5)/8,py=(Math.floor(i/8)+.5)/8,sites=JSON.parse(document.querySelector('#vc-canvas').dataset.state).sites;
    if(sites.some(p=>Math.hypot(p.x-px,p.y-py)<.025))continue;x.value=px;y.value=py;form.querySelector('#vc-add').click();
   }
  });
  for(const id of ['centroids','vectors','distances'])await page.locator(`#vc-${id}`).check();await page.locator('[data-vc-symbol="all"]').click();
  const maxUI=await page.evaluate(async()=>{
   const c=document.querySelector('#vc-canvas'),samples=[],before=Number(c.dataset.renderCount),burstStart=performance.now();for(let i=0;i<100;i++){const start=performance.now();document.querySelector('#vc-step').click();samples.push({wall:performance.now()-start,compute:Number(c.dataset.computeMs)});}
   const totalBurstMs=performance.now()-burstStart;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
   return {count:JSON.parse(c.dataset.state).sites.length,samples,totalBurstMs,settledMs:performance.now()-burstStart,draws:Number(c.dataset.renderCount)-before,step:Number(c.dataset.step),renderedStep:Number(c.dataset.renderedStep),maxWall:Math.max(...samples.map(s=>s.wall)),maxCompute:Math.max(...samples.map(s=>s.compute)),maxDraw:Number(c.dataset.renderMs)};
  });
  await page.locator('#vc-reset').click();const start=Date.now();await page.locator('#vc-play').click();await page.waitForFunction(()=>Number(document.querySelector('#vc-canvas').dataset.step)>=5);await page.locator('#vc-play').click();const playback5WallMs=Date.now()-start;
  results.browsers.push({engine:engine.name(),version:browser.version(),...measurement,maxUI,playback5WallMs,errors});
  }
  for(const id of ['centroids','vectors','distances'])await page.locator(`#vc-${id}`).uncheck();await page.locator('#vc-clear').click();
  for(const preset of ['basic','irregular','grid','cluster']){
   await page.locator('#vc-preset').selectOption(preset);await capture(page.locator('#vc-canvas'),`${dir}/screenshots/${engine.name()}-${preset}-initial.png`);
   if(preset==='irregular'){await page.evaluate(()=>{for(let i=0;i<20;i++)document.querySelector('#vc-step').click();});await capture(page.locator('#vc-canvas'),`${dir}/screenshots/${engine.name()}-irregular-step20.png`);}
  }
  await page.locator('#vc-preset').selectOption('irregular');await capture(page,`${dir}/screenshots/${engine.name()}-desktop-dark.png`,{fullPage:true});
  for(const width of [1280,390,375,320])for(const colorScheme of ['dark','light'])for(const font of ['100%','200%']){
   await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme});await page.evaluate(font=>document.documentElement.style.fontSize=font,font);await capture(page.locator('#vc-canvas'),`${dir}/screenshots/${engine.name()}-stage-${width}-${colorScheme}-${font.slice(0,-1)}.png`);
  }
  await page.setViewportSize({width:375,height:1000});await page.locator('#vc-lesson').click();await page.locator('[data-vc-lesson="2"]').click();await page.locator('[data-vc-symbol="member"]').click();await capture(page,`${dir}/screenshots/${engine.name()}-mobile-lesson-light-200.png`,{fullPage:true});
  await capture(page.locator('.vc-inspector'),`${dir}/screenshots/${engine.name()}-mobile-inspector-light-200.png`);
  await capture(page.locator('aside'),`${dir}/screenshots/${engine.name()}-mobile-controls-light-200.png`);
  await page.locator('#vc-canvas').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await capture(page.locator('#vc-canvas'),`${dir}/screenshots/${engine.name()}-focus-light-200.png`);
  await page.locator('#vc-close').click();await page.locator('#vc-preset').selectOption('basic');await page.locator('#vc-point-x').fill('1');await page.locator('#vc-point-y').fill('1');await page.locator('#vc-move').click();await page.locator('#vc-probe-x').fill('1');await page.locator('#vc-probe-y').fill('1');await page.locator('#vc-probe-form button').click();await page.locator('[data-vc-symbol="norm"]').click();await capture(page.locator('#vc-canvas'),`${dir}/screenshots/${engine.name()}-boundary-labels.png`);
  await browser.close();browser=null;
 }
 await writeFile(`${dir}/screenshot-manifest.json`,JSON.stringify({date:new Date().toISOString(),captures},null,2)+'\n');
 if(!screenshotsOnly){await writeFile(`${dir}/measurements.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results.browsers.map(r=>({engine:r.engine,version:r.version,modelMax:Object.fromEntries(Object.entries(r.model).map(([id,s])=>[id,s.max])),defaultUIMax:r.stepIncludingDOM.max,maxUI:{count:r.maxUI.count,maxWall:r.maxUI.maxWall,maxCompute:r.maxUI.maxCompute,maxDraw:r.maxUI.maxDraw},playback5WallMs:r.playback5WallMs,errors:r.errors}))));}
 else console.log('Updated screenshots without overwriting measurement history.');
}finally{await browser?.close();server.kill();}
