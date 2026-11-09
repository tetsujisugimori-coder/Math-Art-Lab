// Diagnostic controls only; no physics or product source is patched.
import {createServer} from 'vite';
import {webkit} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {platform,release} from 'node:os';
const out='test-results/native-raster-controls';mkdirSync(out,{recursive:true});
const variants=(process.env.TB_RASTER_VARIANTS||'regular,no-glow,no-slow,will-read,reset-buffer,warm-read,opaque').split(','),repeats=Number(process.env.TB_RASTER_REPEATS||3);
const server=await createServer({server:{host:'127.0.0.1',port:0}});await server.listen();
const url=`http://127.0.0.1:${server.httpServer.address().port}${server.config.base}`;
const report={date:new Date().toISOString(),os:platform(),release:release(),node:process.version,revision:process.env.GITHUB_SHA??'working-tree',sources:Object.fromEntries(['src/three-body.ts','src/three-body-render.ts','src/three-body-view.ts'].map(p=>[p,createHash('sha256').update(readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex')])),runs:[]};
const save=()=>writeFileSync(`${out}/results.json`,JSON.stringify(report,null,2));
try{for(const variant of variants)for(let repeat=0;repeat<repeats;repeat++){
  const browser=await webkit.launch({headless:true}),page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2,reducedMotion:'no-preference'}),run={variant,repeat,version:browser.version()};report.runs.push(run);
  try{
    await page.addInitScript(variant=>{
      if(variant==='will-read'||variant==='opaque'){
        const original=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(kind,options){return original.call(this,kind,kind==='2d'&&this.id==='tb-a'?{...options,...(variant==='will-read'?{willReadFrequently:true}:{alpha:false})}:options);};
      }
      if(variant==='reset-buffer'){
        const original=CanvasRenderingContext2D.prototype.setTransform;
        CanvasRenderingContext2D.prototype.setTransform=function(...args){if(this.canvas.id==='tb-a')this.canvas.width=this.canvas.width;return original.apply(this,args);};
      }
      if(variant==='no-glow'){
        const observer=new MutationObserver(()=>{const el=document.querySelector('[data-tb-layer="glow"]');if(el){el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}));observer.disconnect();}});observer.observe(document,{childList:true,subtree:true});
      }
      if(variant!=='no-slow'){
        const request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window),handles=new Map();let next=-1;
        window.requestAnimationFrame=callback=>{const id=next--,item={timer:0};item.timer=setTimeout(()=>{item.native=request(t=>{handles.delete(id);callback(t);});},250);handles.set(id,item);return id;};
        window.cancelAnimationFrame=id=>{const item=handles.get(id);if(item){clearTimeout(item.timer);if(item.native)cancel(item.native);handles.delete(id);}else cancel(id);};
      }
    },variant);
    await page.goto(url);await page.locator('#experiment').selectOption('three-body');
    await page.waitForFunction(()=>document.querySelector('.three-body')?.dataset.renderState==='settled');
    if(variant==='warm-read')await page.locator('#tb-a').evaluate(c=>c.getContext('2d').getImageData(0,0,1,1));
    await page.locator('#tb-step').click();
    await page.waitForFunction(()=>{const d=document.querySelector('.three-body')?.dataset;return d?.renderState==='settled'&&d.step==='1';});
    run.receipt=await page.locator('#tb-a').evaluate(c=>{const ctx=c.getContext('2d'),m=ctx.getTransform(),r=c.getBoundingClientRect(),positions=JSON.parse(c.dataset.positions),scale=Math.min(c.width,c.height)/Number(c.dataset.span);return {width:c.width,height:c.height,rect:{width:r.width,height:r.height},dpr:devicePixelRatio,positions,step:c.dataset.paintedStep,matrix:[m.a,m.b,m.c,m.d,m.e,m.f],glow:document.querySelector('[data-tb-layer="glow"]').checked,attributes:ctx.getContextAttributes?.(),samples:positions.map(p=>{const x=Math.floor(c.width/2+p.x*scale),y=Math.floor(c.height/2-p.y*scale);return {x,y,rgba:Array.from(ctx.getImageData(x,y,1,1).data)};}),bitmap:c.toDataURL('image/png')};});
    writeFileSync(`${out}/${variant}-${repeat}.png`,Buffer.from(run.receipt.bitmap.split(',')[1],'base64'));delete run.receipt.bitmap;
    run.allCentersBright=run.receipt.samples.every(p=>Math.max(...p.rgba.slice(0,3))>150);
  }catch(error){run.error=String(error);}finally{await browser.close();save();}
  console.log(JSON.stringify({variant,repeat,bright:run.allCentersBright,samples:run.receipt?.samples,error:run.error}));
}}finally{const positions=report.runs.map(r=>JSON.stringify(r.receipt?.positions));report.sameModelPositions=positions.every(p=>p===positions[0])&&report.runs.every(r=>!!r.receipt);report.finishedAt=new Date().toISOString();save();await server.close();}
