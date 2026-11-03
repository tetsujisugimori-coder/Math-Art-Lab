import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {spawn} from 'node:child_process';import {chromium,webkit} from '@playwright/test';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/,'$1')),log=fs.openSync(path.join(dir,'dash-vite.log'),'w');
const server=spawn(process.execPath,[path.join(dir,'serve.mjs'),process.cwd()],{stdio:['ignore',log,log],windowsHide:true}),results=[];
const ready=page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
try{
 for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:4187/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();try{
   const page=await browser.newPage({viewport:{width:1280,height:1000},colorScheme:'dark'});await page.goto('http://127.0.0.1:4187/');await page.selectOption('#experiment','voronoi');await page.click('#vc-lesson');await page.fill('#vc-probe-x','0.5000000000001');await page.fill('#vc-probe-y','.5');await page.locator('#vc-probe-form button').click();await ready(page);
   await page.evaluate(()=>{const c=document.querySelector('#vc-canvas'),ctx=c.getContext('2d');window.__dashNormal=c.toDataURL();window.__dashOldCount=c.dataset.renderCount;window.__dashOriginalStroke=ctx.stroke;window.__dashThrows=0;ctx.stroke=function(...args){if(this.getLineDash().length&&window.__dashThrows===0){window.__dashThrows++;throw new Error('review-injected-non-owner-dash-stroke');}return window.__dashOriginalStroke.apply(this,args);};c.dispatchEvent(new Event('contextrestored'));});await ready(page);
   const failed=await page.locator('#vc-canvas').evaluate(c=>({status:c.dataset.drawStatus,count:c.dataset.renderCount,countBefore:window.__dashOldCount,dash:c.getContext('2d').getLineDash(),throws:window.__dashThrows}));
   await page.locator('#vc-canvas').evaluate(c=>{c.getContext('2d').stroke=window.__dashOriginalStroke;c.dispatchEvent(new Event('contextrestored'));});await ready(page);
   const firstRecovery=await page.locator('#vc-canvas').evaluate(c=>({status:c.dataset.drawStatus,count:c.dataset.renderCount,pngMatchesNormal:c.toDataURL()===window.__dashNormal,dash:c.getContext('2d').getLineDash()}));
   await page.locator('#vc-canvas').evaluate(c=>c.dispatchEvent(new Event('contextrestored')));await ready(page);
   const secondRecovery=await page.locator('#vc-canvas').evaluate(c=>({status:c.dataset.drawStatus,count:c.dataset.renderCount,pngMatchesNormal:c.toDataURL()===window.__dashNormal,dash:c.getContext('2d').getLineDash()}));
   const result={name,failed,firstRecovery,secondRecovery};results.push(result);console.log(JSON.stringify(result));
  }finally{await browser.close();}
 }
 const green=process.argv.includes('--green');fs.writeFileSync(path.join(dir,green?'dash-recovery-green.json':'dash-recovery-red.json'),JSON.stringify({date:new Date().toISOString(),sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync('src/voronoi-render.ts')).digest('hex'),results},null,2)+'\n');if(green&&results.some(r=>!r.firstRecovery.pngMatchesNormal||!r.secondRecovery.pngMatchesNormal||r.failed.count!==r.failed.countBefore))process.exitCode=1;
}finally{server.kill();fs.closeSync(log);}
