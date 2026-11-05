import {chromium,webkit} from '@playwright/test';
import {spawn} from 'node:child_process';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cpus,platform,release} from 'node:os';
import {fileURLToPath} from 'node:url';

const cwd=fileURLToPath(new URL('..',import.meta.url)),folder=new URL('../docs/ripple-kaleidoscope/',import.meta.url);
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4185','--strictPort'],{cwd,stdio:['ignore','pipe','pipe'],windowsHide:true});
let serverLog='';server.stdout.on('data',v=>serverLog+=v);server.stderr.on('data',v=>serverLog+=v);
const url='http://127.0.0.1:4185/';
try {
  let started=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){started=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!started)throw Error(serverLog);
  const result={recordedAt:new Date().toISOString(),environment:{platform:platform(),release:release(),cpu:cpus()[0].model,node:process.version},sourceHashes:{},browsers:{}};
  for(const file of ['src/ripple.ts','src/ripple-render.ts','src/ripple-view.ts','src/ripple.css'])result.sourceHashes[file]=createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex');
  for(const [name,type] of Object.entries({chromium,webkit})){
    const browser=await type.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce',colorScheme:'dark'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('#experiment').selectOption('ripple');await page.waitForFunction(()=>document.querySelector('#rk-stage')?.dataset.draws);
    const sample=await page.evaluate(async()=>{
      const m=await import('/src/ripple.ts'),r=await import('/src/ripple-render.ts');
      const timings=(fn,count)=>{const out=[];for(let i=0;i<count;i++){const t=performance.now();fn(i);out.push(performance.now()-t);}return out;};
      for(let i=0;i<3;i++)m.buildField(m.defaults());
      const buildDefault=timings(()=>m.buildField(m.defaults()),20),buildWorst=timings(()=>m.buildField({...m.defaults(),count:8,wavelength:.5,radius:3,amplitude:2,phase:180}),20);
      const f=m.buildField({...m.defaults(),count:8}),out=new Uint8ClampedArray(m.RESOLUTION*m.RESOLUTION*4),raster={};
      for(const mode of ['displacement','envelope','intensity']){for(let i=0;i<5;i++)r.paintPixels(f,mode,'aurora',i*.05,out);raster[mode]=timings(i=>r.paintPixels(f,mode,'aurora',i*.05,out),60);}
      return {resolution:m.RESOLUTION,buildDefault,buildWorst,raster};
    });
    for(let i=0;i<4;i++) {await page.locator('#rk-preset').selectOption(String(i));await page.waitForFunction(count=>JSON.parse(document.querySelector('#rk-stage').dataset.painted).settings.count===count,[6,5,8,4][i]);await page.locator('#rk-stage').screenshot({path:fileURLToPath(new URL(`${name}-preset-${i}.png`,folder))});}
    await page.locator('#rk-preset').selectOption('0');await page.waitForFunction(()=>JSON.parse(document.querySelector('#rk-stage').dataset.painted).settings.count===6);
    const animation=await page.evaluate(async()=>{
      document.querySelector('#rk-mode').value='displacement';document.querySelector('#rk-mode').dispatchEvent(new Event('change'));
      const before=Number(document.querySelector('#rk-stage').dataset.draws);document.querySelector('#rk-play').click();const times=[];let last=performance.now();for(let i=0;i<90;i++)await new Promise(resolve=>requestAnimationFrame(t=>{times.push(t-last);last=t;resolve();}));document.querySelector('#rk-play').click();
      return {rafIntervals:times,draws:Number(document.querySelector('#rk-stage').dataset.draws)-before,time:JSON.parse(document.querySelector('#rk-stage').dataset.state).time};
    });
    await page.locator('#rk-glow-check').uncheck();
    const animationNoGlow=await page.evaluate(async()=>{
      const before=Number(document.querySelector('#rk-stage').dataset.draws);document.querySelector('#rk-play').click();const times=[];let last=performance.now();for(let i=0;i<60;i++)await new Promise(resolve=>requestAnimationFrame(t=>{times.push(t-last);last=t;resolve();}));document.querySelector('#rk-play').click();return {rafIntervals:times,draws:Number(document.querySelector('#rk-stage').dataset.draws)-before};
    });await page.locator('#rk-glow-check').check();
    await page.locator('#rk-time-reset').click();await page.locator('#rk-mode').selectOption('intensity');await page.locator('#rk-stage').scrollIntoViewIfNeeded();await page.screenshot({path:fileURLToPath(new URL(`${name}-desktop.png`,folder)),fullPage:true});
    await page.setViewportSize({width:375,height:900});await page.emulateMedia({colorScheme:'light'});await page.locator('[data-rk-symbol="r"]').click();await page.locator('#rk-jump').click();await page.screenshot({path:fileURLToPath(new URL(`${name}-mobile-light.png`,folder)),fullPage:true});
    result.browsers[name]={version:browser.version(),...sample,animation,animationNoGlow,errors};await browser.close();
  }
  writeFileSync(new URL('performance.json',folder),JSON.stringify(result,null,2)+'\n');
  const stats=a=>({mean:a.reduce((a,b)=>a+b,0)/a.length,p95:[...a].sort((a,b)=>a-b)[Math.ceil(a.length*.95)-1],max:Math.max(...a)});
  for(const [name,data] of Object.entries(result.browsers))console.log(JSON.stringify({browser:name,buildDefault:stats(data.buildDefault),buildWorst:stats(data.buildWorst),raster:Object.fromEntries(Object.entries(data.raster).map(([k,v])=>[k,stats(v)])),animation:stats(data.animation.rafIntervals),draws:data.animation.draws,animationNoGlow:stats(data.animationNoGlow.rafIntervals),drawsNoGlow:data.animationNoGlow.draws,elapsedModelTime:data.animation.time,errors:data.errors}));
}finally{server.kill();writeFileSync(new URL('evidence-server.txt',folder),serverLog);}
