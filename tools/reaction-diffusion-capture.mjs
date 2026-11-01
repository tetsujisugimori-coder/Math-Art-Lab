import {chromium} from '@playwright/test';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import os from 'node:os';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4181','--strictPort'],{stdio:'ignore',windowsHide:true});
let browser;
try{
 for(let n=0;n<100;n++){try{if((await fetch('http://127.0.0.1:4181')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1280,height:1000},deviceScaleFactor:2});
 await mkdir('docs/reaction-diffusion/screenshots',{recursive:true});
 await page.goto('http://127.0.0.1:4181');await page.locator('#experiment').selectOption('reaction');
 const results=[];
 for(let i=0;i<4;i++){
  await page.locator('#rd-preset').selectOption(String(i));await page.locator('#rd-count').fill('10000');
  const start=Date.now();await page.locator('#rd-fast').click();await page.waitForFunction(()=>document.querySelector('#rd-canvas').dataset.step==='10000',null,{timeout:120000});
  results.push({preset:i,steps:10000,wallMs:Date.now()-start,lastChunk:await page.locator('#rd-performance').textContent(),observation:await page.locator('#rd-observation').textContent()});
  await page.locator('#rd-canvas').screenshot({path:`docs/reaction-diffusion/screenshots/preset-${i}.png`});
 }
 await page.setViewportSize({width:375,height:900});await page.emulateMedia({colorScheme:'light'});await page.screenshot({path:'docs/reaction-diffusion/screenshots/mobile-light.png',fullPage:true});
 await writeFile('docs/reaction-diffusion/measurements.json',JSON.stringify({os:os.platform(),cpu:os.cpus()[0].model,browser:browser.version(),dpr:2,viewport:'1280x1000',results},null,2)+'\n');
 console.log(JSON.stringify(results));
}finally{await browser?.close();server.kill();}
