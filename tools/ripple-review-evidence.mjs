import {chromium,webkit} from '@playwright/test';
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {cpus,platform,release,freemem,totalmem} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {angles,expectedColor,measureLegend,measureRotation,modes,palettes,setReviewDisplay,setReviewSettings} from '../e2e/ripple-review-oracle.ts';

const phase=process.argv[2];if(!['before','after'].includes(phase))throw Error('Specify before or after');
const cwd=fileURLToPath(new URL('..',import.meta.url)),sourceRoot=resolve(process.env.RIPPLE_REVIEW_SOURCE_ROOT??cwd),label=process.env.RIPPLE_REVIEW_LABEL??phase;
if(!/^[a-z0-9-]+$/.test(label)||!sourceRoot.toLowerCase().startsWith(resolve(cwd).toLowerCase()+sep)&&sourceRoot.toLowerCase()!==resolve(cwd).toLowerCase())throw Error('Evidence paths must stay in this workspace');
const dir=fileURLToPath(new URL(`../docs/ripple-kaleidoscope/review-36/${label}/`,import.meta.url));mkdirSync(dir,{recursive:true});
const server=spawn(process.execPath,[`${cwd}/node_modules/vite/bin/vite.js`,'--host','127.0.0.1','--port','4186','--strictPort'],{cwd:sourceRoot,stdio:['ignore','pipe','pipe'],windowsHide:true});let serverLog='';server.stdout.on('data',v=>serverLog+=v);server.stderr.on('data',v=>serverLog+=v);
const url='http://127.0.0.1:4186/';
const hash=data=>createHash('sha256').update(data).digest('hex');
try {
  let ready=false;for(let i=0;i<100;i++){try{if((await fetch(url)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}if(!ready)throw Error(serverLog);
  const report={phase,date:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd,encoding:'utf8'}).trim(),referenceHead:process.env.RIPPLE_REVIEW_REFERENCE_SHA??null,sourceRoot,sourceDiff:sourceRoot===resolve(cwd)?execFileSync('git',['diff','--stat','--','src'],{cwd,encoding:'utf8'}):'isolated git archive',environment:{platform:platform(),os:release(),cpu:cpus()[0].model,node:process.version,freeMemoryBytes:freemem(),totalMemoryBytes:totalmem()},hashes:{},browsers:{}};
  for(const f of ['src/ripple.ts','src/ripple-render.ts','src/ripple-view.ts','src/ripple.css'])report.hashes[f]=hash(readFileSync(`${sourceRoot}/${f}`));
  report.hashes['e2e/ripple-review-oracle.ts']=hash(readFileSync(`${cwd}/e2e/ripple-review-oracle.ts`));
  for(const [name,engine] of Object.entries({chromium,webkit})) {
    const browser=await engine.launch({headless:true}),context=await browser.newContext({viewport:{width:1280,height:1000},deviceScaleFactor:1,reducedMotion:'reduce',colorScheme:'dark'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('#experiment').selectOption('ripple');await page.waitForFunction(()=>document.querySelector('#rk-stage')?.dataset.draws);
    const rotation=[];await page.locator('[data-rk-symbol="theta"]').click();
    for(const angle of angles){await setReviewSettings(page,{angle});const v=await measureRotation(page,angle);rotation.push(v);await page.locator('#rk-stage').evaluate(el=>el.scrollIntoView({block:'start'}));const r=await page.locator('#rk-stage').boundingBox();await page.screenshot({path:`${dir}/${name}-angle-${angle}.png`,clip:{x:r.x+r.width*.24,y:r.y+r.height*.24,width:r.width*.52,height:r.height*.52}});}
    // All candidate CSS variants are tested on the same current element before any product fix.
    const legends=[],candidates=[];
    for(const mode of modes)for(const palette of palettes){await setReviewDisplay(page,mode,palette);const {png,...v}=await measureLegend(page,mode,palette);writeFileSync(`${dir}/${name}-${mode}-${palette}.png`,png);legends.push(v);}
    await page.locator('#rk-clear').click();await page.locator('#rk-preset').selectOption('0');
    const computation=await page.evaluate(async()=>{
      const m=await import('/src/ripple.ts'),r=await import('/src/ripple-render.ts');
      const digest=async a=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',a))).map(v=>v.toString(16).padStart(2,'0')).join('');
      const time=(fn,n)=>{const out=[];for(let i=0;i<n;i++){const t=performance.now();fn(i);out.push(performance.now()-t);}return out;};
      for(let i=0;i<3;i++)m.buildField(m.defaults());const build=time(()=>m.buildField({...m.defaults(),count:8,wavelength:.5,radius:3,amplitude:2,phase:180}),20),field=m.buildField({...m.defaults(),count:8}),pixels=new Uint8ClampedArray(384*384*4),raster={},pixelHashes={};
      for(const mode of ['displacement','envelope','intensity']){for(let i=0;i<5;i++)r.paintPixels(field,mode,'aurora',i*.05,pixels);raster[mode]=time(i=>r.paintPixels(field,mode,'aurora',i*.05,pixels),60);for(const palette of ['aurora','iris','gold'])pixelHashes[`${mode}/${palette}`]=await digest(r.paintPixels(field,mode,palette,.7));}
      return {build,raster,pixelHashes,fieldHashes:{real:await digest(field.real.buffer),imag:await digest(field.imag.buffer),envelope:await digest(field.envelope.buffer)}};
    });
    const animation=[];
    for(let repetition=0;repetition<2;repetition++)for(const glow of [true,false]) {
      await page.locator('#rk-glow-check').setChecked(glow);await setReviewDisplay(page,'displacement','aurora');await page.locator('#rk-stage').scrollIntoViewIfNeeded();
      animation.push(await page.evaluate(async({repetition,glow})=>{const stage=document.querySelector('#rk-stage'),before=Number(stage.dataset.draws),legendBefore=document.querySelector('#rk-scale').dataset.draws??null,intervals=[];document.querySelector('#rk-play').click();let last=performance.now();for(let i=0;i<60;i++)await new Promise(resolve=>requestAnimationFrame(t=>{intervals.push(t-last);last=t;resolve();}));document.querySelector('#rk-play').click();return {repetition,glow,intervals,draws:Number(stage.dataset.draws)-before,legendBefore,legendAfter:document.querySelector('#rk-scale').dataset.draws??null};},{repetition,glow}));
    }
    // Candidate investigation follows timing: both products get the same warm-up.
    if(phase==='before')for(const mode of modes)for(const palette of palettes){
      await setReviewDisplay(page,mode,palette);
      for(const count of [65,257,2049]){
        const started=performance.now(),stops=Array.from({length:count},(_,j)=>{const q=mode==='displacement'?2*j/(count-1)-1:j/(count-1);return `rgb(${expectedColor(q,mode,palette).join(',')}) ${100*j/(count-1)}%`;});
        await page.locator('#rk-scale').evaluate((el,css)=>{el.style.background=css;},`linear-gradient(to right,${stops.join(',')})`);
        const {png,...candidate}=await measureLegend(page,mode,palette);candidates.push({count,...candidate,generationAndScreenshotMs:performance.now()-started});
      }
      await setReviewDisplay(page,mode,palette);
    }
    let narrow=null;
    if(phase==='after'){
      await page.setViewportSize({width:375,height:1000});await page.emulateMedia({colorScheme:'light'});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await page.locator('[data-rk-symbol="theta"]').click();await setReviewSettings(page,{angle:-90});await setReviewDisplay(page,'intensity','aurora');
      const geometry=await measureRotation(page,-90),{png,...legend}=await measureLegend(page,'intensity','aurora');narrow={width:375,theme:'light',font:200,geometry,legend};writeFileSync(`${dir}/${name}-375-light-200-legend.png`,png);
      await page.locator('#rk-stage').screenshot({path:`${dir}/${name}-375-light-200-stage.png`});await page.locator('#rk-symbol-copy').screenshot({path:`${dir}/${name}-375-light-200-copy.png`});
    }
    report.browsers[name]={version:browser.version(),rotation,legends,candidates,computation,animation,narrow,errors};await browser.close();
  }
  writeFileSync(`${dir}/measurements.json`,JSON.stringify(report,null,2)+'\n');
  for(const [name,b] of Object.entries(report.browsers))console.log(JSON.stringify({phase,browser:name,rotation:b.rotation.map(v=>({angle:v.angle,sourcePass:v.sourcePass,geometry:v.geometryFailures,explanation:v.explanationFailures})),legendMax:Math.max(...b.legends.map(v=>v.maxError)),profileMax:Math.max(...b.legends.map(v=>v.profileMaxError)),cssCandidates:[65,257,2049].map(count=>({count,max:Math.max(...b.candidates.filter(v=>v.count===count).map(v=>Math.max(v.maxError,v.profileMaxError)))})),animation:b.animation.map(v=>({glow:v.glow,mean:v.intervals.reduce((a,b)=>a+b,0)/v.intervals.length,max:Math.max(...v.intervals)}))}));
} finally {server.kill();writeFileSync(`${dir}/server.txt`,serverLog);}
