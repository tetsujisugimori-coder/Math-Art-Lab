import { chromium, webkit } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dir='docs/vibrating-sand/review-34', manifest={date:new Date().toISOString(),sourceHashes:{},captures:[]};
for(const file of ['src/sand-presentation.ts','src/sand-render.ts','src/sand-view.ts','e2e/sand-review-checks.ts'])
 manifest.sourceHashes[file]=createHash('sha256').update((await readFile(file,'utf8')).replace(/\r\n/g,'\n')).digest('hex');
await mkdir(`${dir}/screenshots`,{recursive:true});
for(const engine of [chromium,webkit]){
 const browser=await engine.launch(),page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2,colorScheme:'dark'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4173/');await page.locator('#experiment').selectOption('sand');
 async function ready(){await page.waitForFunction(()=>{const d=document.querySelector('#sd-canvas').dataset;return d.drawStatus==='submitted'&&d.revision===d.renderedRevision;});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));}
 async function capture(name){await ready();const file=`${dir}/screenshots/${engine.name()}-${name}.png`;await page.screenshot({path:file,fullPage:true});manifest.captures.push({file,engine:engine.name(),version:browser.version(),viewport:page.viewportSize(),...(await page.locator('#sd-canvas').evaluate(c=>{
  const ctx=c.getContext('2d');
  function white(x0,y0,x1,y1){const x=Math.floor(c.width*(.055+.89*x0)),y=Math.floor(c.height*(.945-.89*y1)),w=Math.max(1,Math.ceil(c.width*.89*(x1-x0))),h=Math.max(1,Math.ceil(c.height*.89*(y1-y0))),d=ctx.getImageData(x,y,w,h).data;let n=0;for(let i=0;i<d.length;i+=4)if(Math.min(d[i],d[i+1],d[i+2])>120&&Math.max(d[i],d[i+1],d[i+2])-Math.min(d[i],d[i+1],d[i+2])<45&&d[i+3]>200)n++;return n;}
  return {state:JSON.parse(c.dataset.state),presentation:JSON.parse(c.dataset.presentation),requested:c.dataset.revision,rendered:c.dataset.renderedRevision,pixels:[c.width,c.height],font:getComputedStyle(document.documentElement).fontSize,theme:matchMedia('(prefers-color-scheme:light)').matches?'light':'dark',legend:document.querySelector('#sd-key').textContent,symbolCopy:document.querySelector('#sd-symbol-copy').textContent,witnesses:{firstOnly:white(.246,.02,.254,.09),secondOnly:white(1/6-.004,.02,1/6+.004,.09),factorYOnly:white(.02,1/6-.004,.09,1/6+.004),FOnly:white(.113,.113,.137,.137)}};
 }))});}
 await page.locator('[data-mode="first"]').click();await page.locator('#sd-symbols [data-symbol="F"]').click();await capture('green-first-F');
 await page.locator('#sd-clear').click();await page.locator('#sd-nodes').check();await capture('green-first-own');
 await page.locator('[data-mode="second"]').click();await page.locator('#sd-symbols [data-symbol="a"]').click();await capture('green-second-a');
 for(const symbol of ['m','n']){await page.locator(`#sd-symbols [data-symbol="${symbol}"]`).click();await capture(`green-second-${symbol}`);}await page.locator('#sd-symbols [data-symbol="a"]').click();
 for(const mode of ['factorX','factorY']){await page.locator(`[data-mode="${mode}"]`).click();await capture(`green-${mode}-a`);}
 await page.locator('#sd-start').click();for(let i=0;i<4;i++){await page.locator(`[data-lesson="${i}"]`).click();if(i>=2)await page.locator('#sd-symbols [data-symbol="F"]').click();else await page.locator('#sd-nodes').check();await capture(`green-lesson-${i+1}`);}await page.keyboard.press('Escape');
 await page.locator('[data-mode="first"]').click();await page.locator('#sd-symbols [data-symbol="F"]').click();
 await page.locator('#sd-canvas').evaluate(c=>{const ctx=c.getContext('2d');ctx.nativeStroke=ctx.stroke;ctx.stroke=function(path){if(!path)return this.nativeStroke();const wrong=new Path2D();for(const x of [.25,.75]){wrong.moveTo(x,0);wrong.lineTo(x,1);}for(const y of [1/6,.5,5/6]){wrong.moveTo(0,y);wrong.lineTo(1,y);}return this.nativeStroke(wrong);};});
 await page.locator('[data-mode="first"]').click();await capture('negative-C1-for-F');
 await page.locator('#sd-canvas').evaluate(c=>{const ctx=c.getContext('2d');ctx.stroke=ctx.nativeStroke;});
 await page.locator('[data-mode="first"]').click();
 for(const [width,colorScheme] of [[375,'light'],[390,'dark']]){
  await page.setViewportSize({width,height:950});await page.emulateMedia({colorScheme});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await capture(`green-${width}-${colorScheme}-200`);
  await page.locator('#sd-start').click();await page.locator('[data-lesson="1"]').click();await capture(`green-${width}-lesson2-200`);await page.locator('#sd-close').click();
 }
 manifest.captures.filter(c=>c.engine===engine.name()).forEach(c=>c.pageErrors=errors);await browser.close();
}
await writeFile(`${dir}/screenshot-manifest.json`,JSON.stringify(manifest,null,2)+'\n');console.log(`Saved ${manifest.captures.length} review captures; both engines; negative target substitution included.`);
