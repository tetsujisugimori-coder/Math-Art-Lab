import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {chromium,webkit} from '@playwright/test';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/,'$1')),log=fs.openSync(path.join(dir,'resize-vite.log'),'w');
const server=spawn(process.execPath,[path.join(dir,'serve.mjs'),process.cwd()],{stdio:['ignore',log,log],windowsHide:true}),results=[];
const frames=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4187/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();try{
   const page=await browser.newPage({viewport:{width:1280,height:1000},colorScheme:'dark'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{const Native=window.ResizeObserver;window.__reviewRO=[];window.ResizeObserver=class extends Native{constructor(callback){super((entries,observer)=>{window.__reviewRO.push(entries.map(e=>({id:e.target.id,width:e.contentRect.width,height:e.contentRect.height})));callback(entries,observer);});}};});
   await page.goto('http://127.0.0.1:4187/');await page.selectOption('#experiment','voronoi');await page.waitForFunction(()=>{const c=document.querySelector('#vc-canvas');return c.dataset.drawStatus==='submitted'&&c.dataset.revision===c.dataset.renderedRevision;});await frames(page);await frames(page);
   const intermediate=await page.evaluate(()=>new Promise(resolve=>{
    const c=document.querySelector('#vc-canvas');window.__reviewRO=[];window.__reviewBefore={count:c.dataset.renderCount,revision:c.dataset.renderedRevision,png:c.toDataURL(),width:c.getBoundingClientRect().width};
    c.style.width='0px';const widthDuring=c.getBoundingClientRect().width;document.querySelector('#vc-step').click();
    requestAnimationFrame(()=>{const afterDraw={status:c.dataset.drawStatus,count:c.dataset.renderCount,revision:c.dataset.renderedRevision,step:JSON.parse(c.dataset.state).step};c.style.width='100%';resolve({widthDuring,afterDraw,widthRestored:c.getBoundingClientRect().width});});
   }));
   await frames(page);await page.waitForTimeout(500);await frames(page);
   const after=await page.locator('#vc-canvas').evaluate(c=>({status:c.dataset.drawStatus,count:c.dataset.renderCount,revision:c.dataset.renderedRevision,requested:c.dataset.revision,renderedStep:c.dataset.renderedStep,modelStep:JSON.parse(c.dataset.state).step,width:c.getBoundingClientRect().width,before:{count:window.__reviewBefore.count,revision:window.__reviewBefore.revision,width:window.__reviewBefore.width},pixelsUnchanged:c.toDataURL()===window.__reviewBefore.png,resizeDeliveries:window.__reviewRO}));
   const result={name,intermediate,after,errors};results.push(result);console.log(JSON.stringify(result));
  }finally{await browser.close();}
 }
 const green=process.argv.includes('--green');fs.writeFileSync(path.join(dir,green?'resize-coalescing-green.json':'resize-coalescing-red.json'),JSON.stringify({date:new Date().toISOString(),method:'Native ResizeObserver is only traced, not suppressed or stubbed; restore CSS width in a later rAF of the same rendering opportunity as the zero-size application draw',sources:Object.fromEntries(['voronoi-view.ts','voronoi-paint.ts'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync('src/'+f)).digest('hex')])),results},null,2)+'\n');if(green&&results.some(r=>r.after.status!=='submitted'||r.after.revision!==r.after.requested||r.after.renderedStep!=='1'||r.after.pixelsUnchanged||r.errors.length))process.exitCode=1;
}finally{server.kill();fs.closeSync(log);}
