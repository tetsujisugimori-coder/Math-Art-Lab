import {chromium,webkit} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import os from 'node:os';
const dir='docs/voronoi-crystal/review-32';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4185','--strictPort'],{stdio:'ignore',windowsHide:true});
const report={date:new Date().toISOString(),os:os.platform(),cpu:os.cpus()[0].model,node:process.version,note:'Canvas commands returned, not GPU presentation. CPU samples on this host; one capture browser at a time, external workload uncontrolled.',browsers:[],screenshots:[]};
report.sources=Object.fromEntries(await Promise.all(['voronoi.ts','voronoi-view.ts','voronoi-render.ts','voronoi-paint.ts'].map(async file=>[file,createHash('sha256').update(await readFile(`src/${file}`)).digest('hex')])));
const ready=page=>page.waitForFunction(()=>{const c=document.querySelector('#vc-canvas'),r=document.querySelector('#vc-reference-canvas');return c.dataset.drawStatus==='submitted'&&c.dataset.revision===c.dataset.renderedRevision&&r.dataset.drawStatus==='submitted'&&r.dataset.requestedRevision===r.dataset.renderedRevision;});
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4185')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 await mkdir(`${dir}/screenshots`,{recursive:true});
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch(),page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,colorScheme:'dark'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto('http://127.0.0.1:4185');await page.locator('#experiment').selectOption('voronoi');await ready(page);
   const benchmark=await page.evaluate(async()=>{
    const {observe}=await import('/src/voronoi.ts'),sites=Array.from({length:64},(_,i)=>({id:i+1,x:(i%8+.5)/8,y:(Math.floor(i/8)+.5)/8})),samples=[];
    for(let i=0;i<320;i++){const start=performance.now();observe(sites,{x:.5000000000001,y:Number.MIN_VALUE});const elapsed=performance.now()-start;if(i>=20)samples.push(elapsed);}
    return {sites:64,warmup:20,samples,mean:samples.reduce((a,b)=>a+b,0)/samples.length,max:Math.max(...samples)};
   });
   await page.locator('#vc-lesson').click();
   for(const [label,x] of [['right','0.5000000000001'],['boundary','0.5'],['left','0.4999999999999']]){
    await page.locator('#vc-probe-x').fill(x);await page.locator('#vc-probe-y').fill('0.5');await page.locator('#vc-probe-form button').click();
    await page.locator('[data-vc-symbol="norm"]').click();await ready(page);
    const path=`${dir}/screenshots/${engine.name()}-${label}.png`;
    await page.screenshot({path,fullPage:true});
    report.screenshots.push({path,engine:engine.name(),viewport:page.viewportSize(),dpr:2,font:'100%',theme:'dark',...await page.locator('#vc-canvas').evaluate(c=>({state:JSON.parse(c.dataset.state),status:c.dataset.drawStatus,revision:c.dataset.revision,renderedRevision:c.dataset.renderedRevision,membership:document.querySelector('#vc-membership').textContent}))});
   }
   await page.setViewportSize({width:320,height:1000});await page.emulateMedia({colorScheme:'light'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await ready(page);
   const path=`${dir}/screenshots/${engine.name()}-320-light-200.png`;await page.screenshot({path,fullPage:true});
   report.screenshots.push({path,engine:engine.name(),viewport:page.viewportSize(),dpr:2,font:'200%',theme:'light',...await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,membership:document.querySelector('#vc-membership').textContent}))});
   await page.setViewportSize({width:1280,height:1000});await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>document.documentElement.style.fontSize='100%');await page.locator('#vc-close').click();await page.locator('#vc-preset').selectOption('basic');
   for(const id of ['4','3']){await page.locator('#vc-selected').selectOption(id);await page.locator('#vc-delete').click();}
   for(const [id,x] of [['1','0.1'],['2','0.5']]){await page.locator('#vc-selected').selectOption(id);await page.locator('#vc-point-x').fill(x);await page.locator('#vc-point-y').fill('0.4');await page.locator('#vc-move').click();}await ready(page);
   for(const phase of ['before','recovered']){
    if(phase==='recovered'){
     await page.evaluate(()=>{const c=document.querySelector('#vc-canvas');c.style.width='0px';document.querySelector('#vc-step').click();requestAnimationFrame(()=>c.style.width='100%');});await ready(page);
    }
    const path=`${dir}/screenshots/${engine.name()}-size-${phase}.png`;await page.locator('#vc-canvas').screenshot({path});
    report.screenshots.push({path,engine:engine.name(),viewport:page.viewportSize(),dpr:2,font:'100%',theme:'dark',...await page.locator('#vc-canvas').evaluate(c=>({state:JSON.parse(c.dataset.state),status:c.dataset.drawStatus,revision:c.dataset.revision,renderedRevision:c.dataset.renderedRevision,renderedStep:c.dataset.renderedStep}))});
   }
   report.browsers.push({engine:engine.name(),version:browser.version(),benchmark,errors});
  }finally{await browser.close();}
 }
 await writeFile(`${dir}/capture-report.json`,JSON.stringify(report,null,2)+'\n');
}finally{server.kill();}
