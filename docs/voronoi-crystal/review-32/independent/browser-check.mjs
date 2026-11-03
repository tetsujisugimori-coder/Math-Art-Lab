import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {chromium,webkit} from '@playwright/test';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'));
const baseline=process.argv.includes('--baseline');
const root=baseline?path.join(dir,'baseline'):process.cwd();
const port=4187;
const log=fs.openSync(path.join(dir,baseline?'baseline-vite.log':'current-vite.log'),'w');
const server=spawn(process.execPath,[path.join(dir,'serve.mjs'),root],{stdio:['ignore',log,log],windowsHide:true});
const url=`http://127.0.0.1:${port}/`;
const results=[];
const frame=async page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const settled=async page=>page.waitForFunction(()=>{const c=document.querySelector('#vc-canvas');return c&&c.dataset.revision===c.dataset.renderedRevision;});
async function configure(page){
 await page.goto(url);await page.selectOption('#experiment','voronoi');await page.selectOption('#vc-preset','basic');
 for(const id of [4,3]){await page.selectOption('#vc-selected',String(id));await page.click('#vc-delete');}
 for(const [id,x] of [[1,.1],[2,.5]]){await page.selectOption('#vc-selected',String(id));await page.fill('#vc-point-x',String(x));await page.fill('#vc-point-y','.4');await page.click('#vc-move');}
 await settled(page);await frame(page);
}
async function snapshot(page){return page.evaluate(()=>{
 const c=document.querySelector('#vc-canvas'),rgb=Array.from(c.getContext('2d').getImageData(Math.round(c.width*(.045+.91*.35)),Math.round(c.height*(.955-.91*.2)),1,1).data);
 const [r,g,b]=rgb.map(x=>x/255),hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;
 let hue=d===0?0:hi===r?60*((g-b)/d%6):hi===g?60*((b-r)/d+2):60*((r-g)/d+4);if(hue<0)hue+=360;
 return {state:JSON.parse(c.dataset.state),width:c.width,height:c.height,cssWidth:c.getBoundingClientRect().width,cssHeight:c.getBoundingClientRect().height,renderedStep:c.dataset.renderedStep,renderedRevision:c.dataset.renderedRevision,revision:c.dataset.revision,renderCount:c.dataset.renderCount,drawStatus:c.dataset.drawStatus,rgb,hue};
 });}
try{
 for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();try{
   const page=await browser.newPage({viewport:{width:1280,height:1000},colorScheme:'dark'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await configure(page);const before=await snapshot(page);
   await page.locator('#vc-canvas').evaluate(c=>{c.style.width='0px';c.style.height='0px';});await frame(page);
   await page.click('#vc-step');await frame(page);const zero=await snapshot(page);
   await page.locator('#vc-canvas').evaluate(c=>{c.style.width='';c.style.height='';});await settled(page);await frame(page);const restored=await snapshot(page);
   const near=(a,b)=>Math.abs(a-b)<1e-12;
   const checks={beforeExpectedOwner:Math.abs(before.hue-75.016)<3,zeroWidthSkipped:zero.cssWidth===0,zeroPixelsUnchanged:JSON.stringify(zero.rgb)===JSON.stringify(before.rgb),zeroCompletionCountUnchanged:zero.renderCount===before.renderCount,zeroCompletionRevisionUnchanged:zero.renderedRevision===before.renderedRevision,modelAdvanced:zero.state.step===1,restoredStep:restored.renderedStep==='1',restoredRevision:restored.renderedRevision===restored.revision,restoredModel:near(restored.state.sites[0].x,.15)&&near(restored.state.sites[0].y,.5)&&near(restored.state.sites[1].x,.65)&&near(restored.state.sites[1].y,.5),restoredPixelExpectedOwner:Math.abs(restored.hue-297.508)<3,noPageError:errors.length===0};
   results.push({name,before,zero,restored,checks,errors});
   console.log(JSON.stringify({name,checks}));
  }finally{await browser.close();}
 }
 const result={date:new Date().toISOString(),baseline,method:'Independent hand-calculated horizontal 2-site split .3 → .4, interior pixel hue identifies actual owner; no product geometry oracle',sources:Object.fromEntries(['voronoi-view.ts','voronoi-render.ts','voronoi-paint.ts'].filter(f=>fs.existsSync(path.join(root,'src',f))).map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'src',f))).digest('hex')])),results};
 fs.writeFileSync(path.join(dir,baseline?'baseline-browser-red.json':'browser-review-green.json'),JSON.stringify(result,null,2)+'\n');
 if(!baseline&&results.some(r=>Object.values(r.checks).includes(false)))process.exitCode=1;
}finally{server.kill();fs.closeSync(log);}
