// Diagnostic-only bundle. Original sources are read from a revision or disk;
// instrumentation is applied in memory, never shipped in the product bundle.
import {build,transformSync} from 'esbuild';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {cpus,platform,release,freemem,totalmem} from 'node:os';
import {chromium,webkit} from '@playwright/test';
const revision=process.env.TB_REVISION||'',label=process.env.TB_LABEL||'before';
const out=`docs/three-body/review-44/${label}`;mkdirSync(out,{recursive:true});
const source=path=>revision?execFileSync('git',['show',`${revision}:${path}`],{encoding:'utf8',maxBuffer:8e6}):readFileSync(path==='src/three-body-view.ts'&&process.env.TB_VIEW_FILE?process.env.TB_VIEW_FILE:path,'utf8');
const shim=`globalThis.__tbDiag={flags:{dom:true,canvas:true},metrics:{},stops:[],events:[],longTasks:[],frameRequests:[],draws:[],addedNodes:0,scope:'other',
 measure(k,f){const s=performance.now(),prior=this.scope;if(['invariants','errors','contribution'].includes(k))k+=':'+prior;if(['calculate','observe','paint'].includes(k))this.scope=k;try{return f()}finally{this.scope=prior;const dt=performance.now()-s,v=this.metrics[k]??={count:0,total:0,max:0,samples:[]};v.count++;v.total+=dt;v.max=Math.max(v.max,dt);if(['calculate','observe','paint','refresh'].includes(k)||v.count%32===1)v.samples.push(dt)}},
 reset(){this.metrics={};this.stops=[];this.events=[];this.longTasks=[];this.frameRequests=[];this.draws=[];this.addedNodes=0;this.start=performance.now()},
 result(){return {metrics:this.metrics,events:this.events,stops:this.stops,longTasks:this.longTasks,frameRequests:this.frameRequests,draws:this.draws,addedNodes:this.addedNodes}}};
for(const [proto,key] of [[Element.prototype,'innerHTML'],[Node.prototype,'textContent']]){const p=Object.getOwnPropertyDescriptor(proto,key);Object.defineProperty(proto,key,{...p,set(v){return __tbDiag.measure('domSetter',()=>p.set.call(this,v))}})}
for(const kind of ['click','change','keydown','visibilitychange','pagehide'])addEventListener(kind,e=>{if(__tbDiag.control)__tbDiag.events.push({kind,key:e.key,target:e.target?.id,stamp:e.timeStamp,begin:performance.now(),epoch:performance.timeOrigin+performance.now(),step:__tbDiag.control.state().step})},true);
new MutationObserver(list=>{for(const r of list)if(r.type==='childList')__tbDiag.addedNodes+=r.addedNodes.length}).observe(document,{subtree:true,childList:true});
if(globalThis.PerformanceObserver&&PerformanceObserver.supportedEntryTypes.includes('longtask')){new PerformanceObserver(l=>{for(const e of l.getEntries())if(e.startTime>=__tbDiag.start)__tbDiag.longTasks.push({start:e.startTime,duration:e.duration})}).observe({type:'longtask',buffered:false})}
__tbDiag.start=performance.now();
`;
function instrument(path,contents){
  let js=transformSync(contents,{loader:'ts',target:'es2022',format:'esm'}).code;
  const wrap=(name,key=name)=>{const pattern=`function ${name}(`;if(!js.includes(pattern))throw Error('Missing '+path+': '+name);js=js.replace(pattern,`function __original_${name}(`);js+=`\nfunction ${name}(...args){return globalThis.__tbDiag.measure('${key}',()=>__original_${name}(...args));}\n`;};
  if(path==='src/three-body.ts'){for(const f of ['verlet','difference','invariants','errors','contribution'])wrap(f);}
  if(path==='src/three-body-state.ts')wrap('record','history');
  if(path==='src/three-body-render.ts'){
    js=js.replace('function drawOrbit(', 'function __drawOrbit(');
    js+=`\nfunction drawOrbit(...args){globalThis.__tbDiag.draws.push({at:performance.now(),canvas:args[0].id,step:args[1].steps,positions:args[1].bodies.map(({x,y})=>({x,y})),dt:args[2].dt});return __drawOrbit(...args)}\n`;
  }
  if(path==='src/three-body-view.ts'){
    for(const name of ['observe','paint','calculate','refresh']){
      const re=new RegExp(`function ${name}\\(([^)]*)\\) \\{`);
      const match=js.match(re);if(!match)throw Error('Missing view function '+name);
      // Nested functions: insert local wrappers beside original declarations.
      const guard=name==='paint'?`if(!globalThis.__tbDiag.flags.canvas)return true; if(globalThis.__tbDiag.requestAt)globalThis.__tbDiag.frameRequests.push(performance.now()-globalThis.__tbDiag.requestAt);`:name==='observe'?`if(!globalThis.__tbDiag.flags.dom)return;`:'';
      const domGuard=name==='refresh'?`if(!globalThis.__tbDiag.flags.dom){schedulePaint();return;}`:'';
      js=js.replace(re,`function ${name}(${match[1]}){${guard}${domGuard}return globalThis.__tbDiag.measure('${name}',()=>__original_${name}(${match[1]}));}\nfunction __original_${name}(${match[1]}) {`);
    }
    js=js.replace('function schedulePaint() {','function schedulePaint() {if(!raf)globalThis.__tbDiag.requestAt=performance.now();');
    js=js.replace('function renderStatus(pending) {','function renderStatus(pending) {if(!globalThis.__tbDiag.flags.dom)return;');
    js=js.replace('function pause() {',`function pause(){const begin=performance.now(),step=e.phase.steps,epoch=performance.timeOrigin+begin;__pause();globalThis.__tbDiag.stops.push({begin,end:performance.now(),epoch,step,afterStep:e.phase.steps,bStep:comparison?.b.phase.steps,playing,timer:timer!==null});}\nfunction __pause() {`);
    js=js.replace('motion.addEventListener("change", () => {','motion.addEventListener("change", (event) => {globalThis.__tbDiag.events.push({kind:"motion",stamp:event.timeStamp,begin:performance.now(),epoch:performance.timeOrigin+performance.now(),step:e.phase.steps});');
    const marker='configForm(e.config);';const index=js.lastIndexOf(marker);if(index<0)throw Error('Missing initialization');
    js=js.slice(0,index)+`globalThis.__tbDiag.control={
      state:()=>({step:e.phase.steps,bStep:comparison?.b.phase.steps,phase:e.phase,bPhase:comparison?.b.phase,playing,disposed,safetyEpoch,timer:timer!==null,raf:!!raf,domStep:main.dataset.step,aStep:aCanvas.dataset.paintedStep,bPaint: bCanvas.dataset.paintedStep,aPositions:aCanvas.dataset.positions,bPositions:bCanvas.dataset.positions,graphTime:samples(e.graph).at(-1)?.t}),
      prime(o){pause();e=createExperiment(presets[0].config);comparison=o.ab?createComparison(e.config,0,'x',1e-6):null;if(comparison)e=comparison.a;normal=null;
        for(let i=0;i<(o.saturated?26000:0);i+=2000){if(comparison)advanceComparison(comparison,2000);else advance(e,2000)}
        layers.length=6000;layers.trails=o.trails;layers.velocity=o.vectors;layers.acceleration=o.vectors;globalThis.__tbDiag.flags={dom:true,canvas:true};refresh();},
      batch(n){calculate(n);refresh();return this.state()},play,stop:()=>{pause();refresh()},
    };\n`+js.slice(index);
  }return js;
}
const result=await build({entryPoints:['src/main.ts'],bundle:true,format:'esm',target:'es2022',write:false,outdir:'test-results/review-diag',plugins:[{name:'diagnostic',setup(b){b.onLoad({filter:/src[\\/].*\.ts$/},args=>{const path='src/'+args.path.split(/[\\/]/).at(-1);return {contents:instrument(path,source(path)),loader:'js'}});b.onLoad({filter:/src[\\/].*\.css$/},args=>({contents:source('src/'+args.path.split(/[\\/]/).at(-1)),loader:'css'}));}}]});
const assets=new Map(result.outputFiles.map(f=>[f.path.split(/[\\/]/).at(-1),f.contents]));
const legacyHtml=process.env.TB_DIAG_HTML_V3==='1';
const diagnosticHtml=legacyHtml?`<html lang="ja"><link rel="stylesheet" href="/main.css"><div id="app"></div><script>${shim}</script><script type="module" src="/main.js"></script></html>`:source('index.html').replace('src="/src/main.ts"','src="/main.js"').replace('</head>',`<link rel="stylesheet" href="/main.css"><script>${shim}</script></head>`);
const server=createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(diagnosticHtml);}else{const file=assets.get(req.url.slice(1));if(!file){res.statusCode=404;res.end();return;}res.setHeader('Content-Type',req.url.endsWith('.css')?'text/css':'application/javascript');res.end(file);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
const cases=[['full',true,true,true,true,true,true],['single',false,true,true,true,true,true],['short',true,false,true,true,true,true],['no-trail',true,true,false,true,true,true],['no-vector',true,true,true,false,true,true],['no-dom',true,true,true,true,false,true],['no-canvas',true,true,true,true,true,false],['neither',true,true,true,true,false,false]].map(([name,ab,saturated,trails,vectors,dom,canvas])=>({name,ab,saturated,trails,vectors,dom,canvas}));
const sourceHashes=Object.fromEntries(['index.html','src/three-body.ts','src/three-body-state.ts','src/three-body-render.ts','src/three-body-view.ts','src/three-body-dom.ts'].map(p=>{try{return [p,createHash('sha256').update(source(p).replaceAll('\r\n','\n')).digest('hex')]}catch{return [p,null]}}));
const report={instrumentVersion:legacyHtml?3:4,revision:revision||'working-tree',label,date:new Date().toISOString(),sourceHashes,environment:{node:process.version,os:platform(),release:release(),cpu:cpus()[0].model,totalMemory:totalmem(),freeMemory:freemem()},meaning:'performance.now elapsed intervals, not OS CPU/GPU completion. Nested metrics overlap. Long tasks and timer lag are observations, not GC attribution.',runs:[],live:[],stops:[]};
const save=()=>writeFileSync(`${out}/diagnostic.json`,JSON.stringify(report,null,2));
const only=process.env.TB_DIAG_CASE,engines=process.env.TB_DIAG_BROWSER?[process.env.TB_DIAG_BROWSER]:['chromium','webkit'];
const smoke=process.env.TB_DIAG_SMOKE==='1';
const repair=process.env.TB_DIAG_REPAIR==='1';
const liveOnly=process.env.TB_DIAG_LIVE_ONLY==='1';
const stopsOnly=process.env.TB_DIAG_STOPS_ONLY==='1';
try{for(const name of engines){const engine={chromium,webkit}[name];let accumulated;const accumulatedPages=new Map();
  const launch=()=>engine.launch({headless:true,...(name==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  for(const session of repair||liveOnly||stopsOnly?[]:smoke?['fresh']:['fresh','accumulated'])for(const dpr of smoke?[1]:[1,2])for(let repeat=0;repeat<(smoke?1:3);repeat++)for(const c of cases.filter(c=>smoke?c.name==='full':!only||c.name===only)){
    const browser=session==='fresh'?await launch():(accumulated??=await launch());let pair=session==='accumulated'?accumulatedPages.get(dpr):null;
    if(!pair){const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:dpr});pair={context,page:await context.newPage()};if(session==='accumulated')accumulatedPages.set(dpr,pair);}const {context,page}=pair;
    const run={browser:name,version:browser.version(),session,dpr,repeat,condition:c,freeMemory:freemem()};report.runs.push(run);
    try{if(page.url()==='about:blank')await page.goto(url);await page.locator('#experiment').selectOption('three-body');
      if(session==='accumulated')for(let i=0;i<3;i++){await page.locator('#experiment').selectOption('cooperation');await page.locator('#experiment').selectOption('three-body');}
      await page.evaluate(o=>__tbDiag.control.prime(o),c);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      await page.evaluate(o=>{__tbDiag.flags={dom:o.dom,canvas:o.canvas};__tbDiag.reset()},c);
      const traced=name==='chromium'&&c.name==='full'&&dpr===1&&repeat===0,traceEvents=[];
      const cdp=traced?await context.newCDPSession(page):null;
      if(cdp){cdp.on('Tracing.dataCollected',x=>traceEvents.push(...x.value));await cdp.send('Tracing.start',{categories:'v8,devtools.timeline,disabled-by-default-v8.gc',transferMode:'ReportEvents'});}
      run.frames=await page.evaluate(async()=>{const frames=[];for(let i=0;i<4;i++){const start=performance.now();const immediate=__tbDiag.control.batch(2000);await new Promise(r=>requestAnimationFrame(r));frames.push({elapsed:performance.now()-start,immediate,settled:__tbDiag.control.state()});await new Promise(r=>setTimeout(r,20));}return frames;});
      run.data=await page.evaluate(()=>__tbDiag.result());
      if(cdp){const complete=new Promise(r=>cdp.once('Tracing.tracingComplete',r));await cdp.send('Tracing.end');await complete;run.v8GcEvents=traceEvents.filter(x=>/GC|Scaveng|MarkCompact/.test(x.name)).map(({name,cat,ph,ts,dur,pid,tid})=>({name,cat,ph,ts,dur,pid,tid}));}
    }catch(error){run.error=String(error)}finally{if(session==='fresh'){await context.close();await browser.close();}save()}
    console.log(label,name,session,dpr,repeat,c.name,run.error||'done');
  }
  if(accumulated)await accumulated.close();
  if(!smoke&&!repair&&!stopsOnly)for(let repeat=0;repeat<3;repeat++)for(const c of cases.filter(c=>(liveOnly?['full','no-canvas']:['full','no-dom','no-canvas','neither']).includes(c.name))){
    const browser=await launch(),page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:2});const run={browser:name,repeat,condition:c.name,dpr:2,session:'fresh',freeMemory:freemem()};report.live.push(run);
    try{await page.goto(url);await page.locator('#experiment').selectOption('three-body');await page.evaluate(o=>__tbDiag.control.prime(o),c);await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      if(!legacyHtml)run.layout=await page.evaluate(()=>({compatMode:document.compatMode,canvases:['tb-a','tb-b'].map(id=>{const c=document.getElementById(id),r=c.getBoundingClientRect();return {id,width:r.width,height:r.height,backingWidth:c.width,backingHeight:c.height}})}));
      run.result=await page.evaluate(async o=>{__tbDiag.flags={dom:o.dom,canvas:o.canvas};document.querySelector('#tb-speed').value='4';__tbDiag.reset();const before=__tbDiag.control.state(),start=performance.now();return await new Promise(resolve=>{const worker=new Worker(URL.createObjectURL(new Blob([`setTimeout(()=>postMessage(performance.timeOrigin+performance.now()),3000)`],{type:'text/javascript'})));worker.onmessage=event=>{const receive=performance.timeOrigin+performance.now(),requested=event.data;__tbDiag.control.stop();const stopped=__tbDiag.control.state();worker.terminate();setTimeout(()=>resolve({before,stopped,later:__tbDiag.control.state(),elapsed:performance.now()-start,requested,receive,queueDelay:receive-requested,data:__tbDiag.result()}),100)};__tbDiag.control.play();});},c);
    }catch(error){run.error=String(error)}finally{await browser.close();save()}console.log(label,name,'live',repeat,c.name,run.error||'done');
  }
  // Independent real-play stop measurements. Clock transport is reported separately.
  let stopAccumulated;const stopPages=new Map();
  for(const session of liveOnly?[]:repair?['accumulated']:smoke?['fresh']:['fresh','accumulated'])for(const dpr of smoke?[1]:[1,2])for(let repeat=0;repeat<(smoke?1:3);repeat++)for(const action of smoke?['pause']:['pause','escape','visibility','motion','switch','dispose']){
    const browser=session==='fresh'?await launch():(stopAccumulated??=await launch());let page=session==='accumulated'?stopPages.get(dpr):null;if(!page){page=await browser.newPage({viewport:{width:1280,height:900},deviceScaleFactor:dpr});if(session==='accumulated')stopPages.set(dpr,page);}const run={browser:name,session,dpr,repeat,action};report.stops.push(run);
    try{if(page.url()==='about:blank')await page.goto(url);await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>{delete document.hidden});await page.locator('#experiment').selectOption('cooperation');await page.locator('#experiment').selectOption('three-body');await page.evaluate(()=>__tbDiag.control.prime({ab:true,saturated:true,trails:true,vectors:true,dom:true,canvas:true}));await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));await page.evaluate(()=>{__tbDiag.reset();__tbDiag.control.play()});await page.waitForTimeout(120);
      run.before=await page.evaluate(()=>__tbDiag.control.state());run.hostRequestEpoch=Date.now();
      if(action==='pause')await page.locator('#tb-play').click({timeout:5000});
      if(action==='escape')await page.keyboard.press('Escape');
      if(action==='visibility')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
      if(action==='motion')await page.emulateMedia({reducedMotion:'reduce'});
      if(action==='switch')await page.locator('#experiment').selectOption('cooperation');
      if(action==='dispose')await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:false})));
      await page.waitForFunction(()=>!__tbDiag.control.state().playing,null,{timeout:5000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(r)));run.hostSettledEpoch=Date.now();run.after=await page.evaluate(()=>__tbDiag.control.state());await page.waitForTimeout(100);run.later=await page.evaluate(()=>__tbDiag.control.state());run.data=await page.evaluate(()=>__tbDiag.result());
    }catch(error){run.error=String(error);run.lastState=await page.evaluate(()=>__tbDiag.control.state()).catch(()=>null);run.data=await page.evaluate(()=>__tbDiag.result()).catch(()=>null)}finally{if(session==='fresh')await browser.close();else if(action==='dispose')await page.reload();save()}
    console.log(label,name,session,dpr,repeat,action,run.error||'done');
  }
  if(stopAccumulated)await stopAccumulated.close();
}}finally{report.finishedAt=new Date().toISOString();save();server.close()}
