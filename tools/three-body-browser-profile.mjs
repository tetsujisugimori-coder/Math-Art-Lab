// Start `npm run preview -- --host 127.0.0.1 --port 4195` after building first.
// Public UI only. No production state hooks. Do not run alongside GUI suites.
import {chromium,webkit} from '@playwright/test';
import {writeFileSync} from 'node:fs';
const report={date:new Date().toISOString(),note:'Windows Playwright, public UI, full trails/all vectors/two experiments. Canvas CPU command submission only.',runs:[]};
const saturated=process.env.TB_PROFILE_SATURATED==='1',output=`docs/three-body/browser-${saturated?'saturated':'stress'}-results.json`;
report.note+=saturated?' Separate saturated-history measurement at 26000 steps; not a pass for the earlier 52000-step throughput target.':'';
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch({headless:true,...(name==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})}),context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();
  await page.goto('http://127.0.0.1:4195/Math-Art-Lab/');await page.locator('#experiment').selectOption('three-body');
  await page.locator('#tb-length').fill('6000');await page.locator('[data-tb-layer="velocity"]').check();await page.locator('[data-tb-layer="acceleration"]').check();await page.locator('#tb-compare').click();await page.locator('#tb-speed').fill('4');
  const cdp=name==='chromium'?await context.newCDPSession(page):null,retained=[];
  const run={browser:name,viewport:[1280,900],retained,samples:[]};report.runs.push(run);
  try{
  for(const target of saturated?[0,7000,26000]:[0,7000,26000,52000]){
    console.log(name,'target',target);
    if(target){await page.locator('#tb-play').click();await page.waitForFunction(n=>Number(document.querySelector('.three-body').dataset.step)>=n,target,{timeout:30000});await page.locator('#tb-play').click();}
    if(cdp)await cdp.send('HeapProfiler.collectGarbage');
    retained.push(await page.locator('.three-body').evaluate(el=>({steps:Number(el.dataset.step),trail:Number(el.dataset.historyLength),graph:Number(el.dataset.graphLength),heap:performance.memory?.usedJSHeapSize??null,backingBytes:Number(el.dataset.backingBytes)})));
    writeFileSync(output,JSON.stringify(report,null,2));
  }
  await page.locator('#tb-play').click();
  const samples=await page.evaluate(async()=>{const out=[];for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,50));out.push({...document.querySelector('.three-body').dataset});}return out;});
  run.samples=samples;
  const pauseStart=performance.now();await page.locator('#tb-play').click({timeout:5000});await page.waitForFunction(()=>document.querySelector('.three-body').dataset.playing==='false',null,{timeout:5000});run.pauseResponseMs=performance.now()-pauseStart;run.stopped=true;await page.locator('#tb-a').screenshot({path:`docs/three-body/${name}-comparison-full-trails.png`});
  }catch(error){run.error=String(error);run.lastState=await page.locator('.three-body').evaluate(el=>({...el.dataset,status:document.querySelector('#tb-status').textContent})).catch(()=>null);}
  finally{writeFileSync(output,JSON.stringify(report,null,2));await browser.close();}
}
writeFileSync(output,JSON.stringify(report,null,2));console.log(report.runs.map(r=>({browser:r.browser,error:r.error,retained:r.retained,computeMax:r.samples.length?Math.max(...r.samples.map(s=>Number(s.computeMs))):null,paintMax:r.samples.length?Math.max(...r.samples.map(s=>Number(s.paintMs))):null,pauseResponseMs:r.pauseResponseMs,stopped:r.stopped})));
