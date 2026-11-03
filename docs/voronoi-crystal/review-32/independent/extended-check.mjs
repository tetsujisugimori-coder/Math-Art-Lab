import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {chromium,webkit} from '@playwright/test';
const dir=path.dirname(new URL(import.meta.url).pathname.replace(/^\/(.:\/)/,'$1'));
const log=fs.openSync(path.join(dir,'extended-vite.log'),'w');
const server=spawn(process.execPath,[path.join(dir,'serve.mjs'),process.cwd()],{stdio:['ignore',log,log],windowsHide:true});
const url='http://127.0.0.1:4187/',results=[];
const frame=async page=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const settled=async page=>page.waitForFunction(()=>{const c=document.querySelector('#vc-canvas');return c&&c.dataset.revision===c.dataset.renderedRevision;});
const state=async page=>page.locator('#vc-canvas').evaluate(c=>JSON.parse(c.dataset.state));
const pixel=async page=>page.locator('#vc-canvas').evaluate(c=>{const rgb=Array.from(c.getContext('2d').getImageData(Math.round(c.width*(.045+.91*.49)),Math.round(c.height*(.955-.91*.2)),1,1).data);const [r,g,b]=rgb,hi=Math.max(r,g,b),lo=Math.min(r,g,b),d=hi-lo;let hue=d===0?0:hi===r?60*((g-b)/d%6):hi===g?60*((b-r)/d+2):60*((r-g)/d+4);if(hue<0)hue+=360;return {rgb,hue};});
const record=async(page,selector='#vc-canvas')=>page.locator(selector).evaluate(c=>({count:Number(c.dataset.renderCount),step:Number(c.dataset.renderedStep),revision:c.dataset.renderedRevision,requested:c.dataset.requestedRevision,status:c.dataset.drawStatus,sites:c.dataset.renderedSites,png:c.toDataURL()}));
async function configure(page){
 await page.goto(url);await page.selectOption('#experiment','voronoi');await page.selectOption('#vc-preset','basic');
 for(const id of [4,3]){await page.selectOption('#vc-selected',String(id));await page.click('#vc-delete');}
 for(const [id,x] of [[1,.1],[2,.5]]){await page.selectOption('#vc-selected',String(id));await page.fill('#vc-point-x',String(x));await page.fill('#vc-point-y','.4');await page.click('#vc-move');}
 await settled(page);await frame(page);
}
try{
 for(let i=0;i<100;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch();try{
   const page=await browser.newPage({viewport:{width:1280,height:1000},colorScheme:'dark'}),errors=[],checks={},evidence={};page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{const native=window.requestAnimationFrame.bind(window);window.__reviewFrames=[];window.requestAnimationFrame=cb=>{const item={cb,id:0};window.__reviewFrames.push(item);return item.id=native(cb);};});
   await configure(page);
   // Height alone must invalidate the surface, even with positive width.
   const hBefore=await record(page);await page.locator('#vc-canvas').evaluate(c=>c.style.height='0px');await frame(page);await page.click('#vc-step');await frame(page);const hZero=await record(page);
   checks.zeroHeightNoCompletion=hBefore.count===hZero.count&&hBefore.revision===hZero.revision&&hZero.status==='zero-size';
   await page.locator('#vc-canvas').evaluate(c=>c.style.height='');await settled(page);await frame(page);checks.heightRecoveryLatest=(await record(page)).step===1;
   // Hidden reference must not block successful main completion or pretend success.
   const rBefore=await record(page,'#vc-reference-canvas');await page.locator('#vc-reference-canvas').evaluate(c=>c.style.width='0px');await frame(page);await page.click('#vc-step');await settled(page);await frame(page);const rZero=await record(page,'#vc-reference-canvas');
   checks.referenceIndependent=(await record(page)).step===2&&rBefore.count===rZero.count&&rBefore.revision===rZero.revision&&rZero.status==='zero-size';
   await page.locator('#vc-reference-canvas').evaluate(c=>c.style.width='');await frame(page);checks.initialReferenceStep=(await record(page,'#vc-reference-canvas')).step===0;
   await page.selectOption('#vc-reference','previous');await settled(page);await frame(page);const prev=await record(page,'#vc-reference-canvas');checks.previousReferenceSource=prev.step===1&&prev.sites===JSON.stringify((await state(page)).previous);
   // Force a canceled callback AFTER a replacement has been queued, not merely before cancellation.
   const stale=await page.evaluate(()=>{
    const c=document.querySelector('#vc-canvas'),before=Number(c.dataset.renderCount);
    document.querySelector('#vc-step').click();const old=window.__reviewFrames.at(-1);
    Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));
    const hiddenCount=Number(c.dataset.renderCount),hiddenStep=JSON.parse(c.dataset.state).step;
    Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));const fresh=window.__reviewFrames.at(-1);
    old.cb(performance.now());const afterOld=Number(c.dataset.renderCount);fresh.cb(performance.now());const afterFresh=Number(c.dataset.renderCount);
    return {before,hiddenCount,hiddenStep,afterOld,afterFresh,distinct:old!==fresh,completed:Number(c.dataset.renderedStep),revision:c.dataset.renderedRevision,requested:c.dataset.requestedRevision};
   });await frame(page);evidence.stale=stale;checks.hiddenNoCompletion=stale.hiddenCount===stale.before;checks.staleCannotConsumeNewFrame=stale.distinct&&stale.afterOld===stale.before&&stale.afterFresh===stale.before+1&&stale.completed===3&&stale.revision===stale.requested;
   // Ten synchronous steps should produce one final draw of the latest known closed-form geometry.
   const beforePixel=await pixel(page);const batch=await page.evaluate(()=>{const c=document.querySelector('#vc-canvas'),before=Number(c.dataset.renderCount);for(let i=0;i<10;i++)document.querySelector('#vc-step').click();return {before,inside:Number(c.dataset.renderCount),state:JSON.parse(c.dataset.state)};});await settled(page);await frame(page);const afterBatch=await record(page),n=batch.state.step,afterPixel=await pixel(page);
   checks.synchronousBatchCoalesced=batch.before===batch.inside&&afterBatch.count===batch.before+1;
   checks.latestClosedForm=batch.state.sites.every((p,i)=>Math.abs(p.x-((i===0?.25:.75)-.1/2**(n-1)))<1e-12&&Math.abs(p.y-.5)<1e-12)&&afterBatch.step===n&&afterBatch.sites===JSON.stringify(batch.state.sites);checks.latestCanvasPixel=Math.abs(beforePixel.hue-75.016)<3&&Math.abs(afterPixel.hue-297.508)<3;evidence.batch={...batch,afterCount:afterBatch.count,beforePixel,afterPixel};
   // Complete whole-state restoration with identical actual pixels at fractional CSS width.
   const saved=await state(page),savedRender=await record(page);await page.click('#vc-lesson');for(const i of [1,2,3])await page.click(`[data-vc-lesson="${i}"]`);await page.click('#vc-step');await page.click('#vc-close');await settled(page);await frame(page);const restored=await record(page);
   checks.lessonCompleteState=JSON.stringify(saved)===JSON.stringify(await state(page));checks.lessonPixelRestoration=savedRender.png===restored.png;checks.lessonFocus=await page.locator('#vc-lesson').evaluate(e=>e===document.activeElement);
   const failureBefore=await record(page);await page.locator('#vc-canvas').evaluate(c=>{const ctx=c.getContext('2d');window.__reviewStroke=ctx.stroke;ctx.stroke=()=>{throw new Error('review-injected-paint-failure');};});await page.click('#vc-step');await frame(page);const failureAfter=await record(page);checks.paintExceptionNoCompletion=failureBefore.count===failureAfter.count&&failureBefore.revision===failureAfter.revision&&failureAfter.status==='failed';
   await page.locator('#vc-canvas').evaluate(c=>{c.getContext('2d').stroke=window.__reviewStroke;c.dispatchEvent(new Event('contextrestored'));});await settled(page);checks.paintExceptionRecovery=(await record(page)).step===(await state(page)).step;
   const lostBefore=await record(page);await page.locator('#vc-canvas').evaluate(c=>{const ctx=c.getContext('2d');window.__reviewLost=ctx.isContextLost;ctx.isContextLost=()=>true;});await page.click('#vc-step');await frame(page);const lostAfter=await record(page);checks.reportedContextLostNoCompletion=lostBefore.count===lostAfter.count&&lostBefore.revision===lostAfter.revision&&lostAfter.status==='context-lost';
   await page.locator('#vc-canvas').evaluate(c=>{const ctx=c.getContext('2d');if(window.__reviewLost)ctx.isContextLost=window.__reviewLost;else delete ctx.isContextLost;c.dispatchEvent(new Event('contextrestored'));});await settled(page);checks.reportedContextLostRecovery=(await record(page)).step===(await state(page)).step;
   // Explicit stored-coordinate math/display separation on all three requested probes.
   await page.click('#vc-lesson');const probes=[];
   for(const [x,owners] of [['0.5','p1・p2'],['0.5000000000001','p2'],['0.4999999999999','p1']]){
    await page.fill('#vc-probe-x',x);await page.fill('#vc-probe-y','.5');await page.locator('#vc-probe-form button').click();await settled(page);
    const text=await page.locator('#vc-membership').textContent();probes.push({x,owners,text,pass:text.includes(`数学的最近点：${owners}。`)&&text.includes('表示候補：p1・p2')&&text.includes('表示候補は数学的所属を意味しません')&&text.includes(`(${x}, 0.5)`)});
   }checks.boundaryUI=probes.every(p=>p.pass);evidence.probes=probes;
   // Independent hand-specified rectangles let us inspect Canvas command semantics without product geometry construction.
   const lineSemantics=await page.evaluate(async()=>{
    const {drawVoronoi}=await import('/src/voronoi-render.ts');const strokes=[];let path=[],dash=[];
    const target={beginPath(){path=[];},moveTo(x,y){path.push([x,y]);},lineTo(x,y){path.push([x,y]);},setLineDash(v){dash=[...v];},stroke(){strokes.push({path:structuredClone(path),dash:[...dash],color:this.strokeStyle});},createLinearGradient(){return {addColorStop(){}};},measureText(){return {width:8};}};
    const ctx=new Proxy(target,{get(o,k){return k in o?o[k]:()=>{};},set(o,k,v){o[k]=v;return true;}});
    const sites=[{id:1,x:.25,y:.5},{id:2,x:.75,y:.5}],cells=sites.map((site,i)=>({site,polygon:[{x:i*.5,y:0},{x:(i+1)*.5,y:0},{x:(i+1)*.5,y:1},{x:i*.5,y:1}],area:.5,centroid:site}));
    drawVoronoi(ctx,{sites,probe:{x:.5000000000001,y:.5},selected:1,symbol:'norm',mode:'observe',layers:{regions:true,edges:true,sites:false,centroids:false,vectors:false,distances:true}},cells,100,1,false);
    const lines=strokes.filter(s=>s.path.length===2&&Math.abs(s.path[0][0]-50)<1e-8&&Math.abs(s.path[0][1]-50)<1e-8);
    return {lines,pass:lines.length===2&&lines[0].dash.join(',')==='3,5'&&lines[1].dash.length===0&&lines.every(s=>s.color==='#ffdf9c')};
   });checks.canvasMathDisplayStyles=lineSemantics.pass;evidence.lineSemantics=lineSemantics;
   await page.click('#vc-close');await page.click('#vc-play');await page.click('#vc-lesson');await page.emulateMedia({reducedMotion:'reduce'});await frame(page);await page.click('#vc-close');await settled(page);checks.reducedMotionSafeRestore=!(await state(page)).playing;
   // Captured old view callback after disposal must leave old and newly mounted surfaces untouched.
   const disposed=await page.evaluate(()=>{
    const select=document.querySelector('#experiment'),old=document.querySelector('#vc-canvas');document.querySelector('#vc-step').click();const callback=window.__reviewFrames.at(-1).cb;
    select.value='lissajous';select.dispatchEvent(new Event('change'));select.value='voronoi';select.dispatchEvent(new Event('change'));const fresh=document.querySelector('#vc-canvas'),before=fresh.dataset.renderCount;
    callback(performance.now());return {oldWidth:old.width,oldHeight:old.height,freshCountUnchanged:before===fresh.dataset.renderCount,freshStep:JSON.parse(fresh.dataset.state).step};
   });await settled(page);checks.disposedCallbackHarmless=disposed.oldWidth===0&&disposed.oldHeight===0&&disposed.freshCountUnchanged&&disposed.freshStep===0;evidence.disposed=disposed;
   checks.noPageError=errors.length===0;results.push({name,checks,evidence,errors});console.log(JSON.stringify({name,checks}));
  }finally{await browser.close();}
 }
 const sources=Object.fromEntries(['voronoi.ts','voronoi-view.ts','voronoi-render.ts','voronoi-paint.ts'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(process.cwd(),'src',f))).digest('hex')]));
 fs.writeFileSync(path.join(dir,'extended-review.json'),JSON.stringify({date:new Date().toISOString(),sources,results},null,2)+'\n');if(results.some(r=>Object.values(r.checks).includes(false)))process.exitCode=1;
}finally{server.kill();fs.closeSync(log);}
