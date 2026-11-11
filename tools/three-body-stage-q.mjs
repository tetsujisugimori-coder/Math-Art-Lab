// Standalone diagnostic server and bounded runs. Product entry never imports it.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
import{gzipSync,gunzipSync}from'node:zlib';import{createServer}from'node:http';
import{build,transformSync}from'esbuild';import ts from'typescript';import{chromium,webkit}from'@playwright/test';
import{installStageQ,installMinimal}from'./three-body-stage-q-browser.mjs';
import{prepareThreadSampler}from'./three-body-stage-q-os.mjs';
import{distribution,analyzeTrace}from'./three-body-stage-p-analysis.mjs';
import { categories, recordIssue, suiteState } from './three-body-stage-q-contracts.mjs';
import { capturePage, inspectCaptureBitmap } from './three-body-stage-q-capture.mjs';
import { deliverFromSender } from './three-body-stage-q-sender.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(s=>s.replace(/^--/,'').split('=')));
const root=args.output??'.three-body-evidence/stage-q',suite=args.suite??'smoke',engine=args.browser??'chromium',base='b07ccec1205ca99a1112ab8db951efbe94a51f74';
for(const d of ['raw','traces','screenshots','sources'])fs.mkdirSync(`${root}/${d}`,{recursive:true});
const hash=x=>createHash('sha256').update(x).digest('hex'),write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');
const current=p=>fs.readFileSync(p,'utf8'),source=p=>args.ref==='base'&&p.startsWith('src/')?execFileSync('git',['show',`${base}:${p}`],{encoding:'utf8',maxBuffer:10000000}):current(p);
const deadline=(promise,ms,label)=>{let timer;return Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' deadline')),ms))]).finally(()=>clearTimeout(timer));};
const ownFiles=['tools/three-body-stage-q.mjs','tools/three-body-stage-q-contracts.mjs','tools/three-body-stage-q-capture.mjs','tools/three-body-stage-q-pipeline.mjs','tools/three-body-stage-q-evidence.mjs','tools/three-body-stage-q-sender.mjs','tools/three-body-stage-q-sender-child.mjs','tools/three-body-stage-q-browser.mjs','tools/three-body-stage-q-os.mjs','tools/three-body-stage-q-threads.ps1','tools/three-body-stage-p-analysis.mjs','tools/three-body-stage-p.mjs'];
const toolHashes=Object.fromEntries(ownFiles.map(p=>[p,hash(current(p).replaceAll('\r\n','\n'))]));
for(const[p,h]of Object.entries(toolHashes))fs.writeFileSync(`${root}/sources/${h}-${path.basename(p)}`,current(p).replaceAll('\r\n','\n'));
// Reuse the baseline diagnostic transform without executing its old server/harness.
const ast=ts.createSourceFile('p.mjs',current('tools/three-body-stage-p.mjs'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const fn=ast.statements.find(s=>ts.isFunctionDeclaration(s)&&s.name?.text==='instrument');
const change=(s,a,b)=>{if(!s.includes(a))throw Error('Missing baseline anchor '+a);return s.replace(a,b);};
const instrument=new Function('transformSync','change','legacyInstrument',`return (${fn.getText(ast)})`)(transformSync,change,()=>{throw Error('legacy not supported');});
const fixtureBuild=await build({stdin:{contents:"export * from './src/three-body.ts';export * from './src/three-body-state.ts';export * from './src/three-body-render.ts';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'fixed-baseline-fixture',setup(b){b.onLoad({filter:/src[\\/].*\.ts$/},a=>({contents:execFileSync('git',['show',`${base}:src/${a.path.split(/[\\/]/).at(-1)}`],{encoding:'utf8'}),loader:'ts'}));}}]});
const m=await import(`data:text/javascript;base64,${Buffer.from(fixtureBuild.outputFiles[0].text).toString('base64')}`);
const comparison=m.createComparison(m.presets[0].config,0,'x',1e-6);for(let i=0;i<26000;i+=2000)m.advanceComparison(comparison,2000);
globalThis.devicePixelRatio=2;
const tapes=[comparison.a,comparison.b].map(e=>{const tape=[],ctx=new Proxy({},{get:(_,key)=>(...a)=>tape.push(['call',key,a]),set:(_,key,v)=>{tape.push(['set',key,v]);return true;}}),cv={width:876,height:660,dataset:{},getBoundingClientRect:()=>({width:438,height:330}),getContext:()=>ctx};
 m.drawOrbit(cv,e.phase,e.config,e.trail,{x:0,y:0,span:4,follow:true},{trails:true,center:true,velocity:true,acceleration:true,axes:true,bodies:true,glow:true,length:6000,opacity:.7},0,'r');return tape;});
const fixture={steps:26000,tapeSha256:hash(JSON.stringify(tapes)),commands:tapes.map(t=>t.length),physicsInMinimalPage:false};
const bundle=await build({entryPoints:['src/main.ts'],bundle:true,format:'esm',target:'es2022',outdir:'test-results/stage-q-bundle',write:false,plugins:[{name:'q-only',setup(b){b.onLoad({filter:/src[\\/].*\.ts$/},a=>{const p='src/'+a.path.split(/[\\/]/).at(-1);let text=source(p);if(p==='src/main.ts')text=change(text,'let dispose=mountHarmonograph(host);','let dispose=globalThis.__stageQ.options.direct?()=>{}:mountHarmonograph(host);');return{contents:instrument(p,text,'light'),loader:'js'};});}}]});
const assets=new Map(bundle.outputFiles.map(f=>[path.basename(f.path),f.contents]));
const server=createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost');if(u.pathname==='/'){
 const config=JSON.parse(u.searchParams.get('config')),opts={id:u.searchParams.get('id'),mode:'light',context:config.context??'readback',mini:!!config.mini,direct:!!config.direct,instrument:config.instrument!==false,native:!!config.native};
 const shim=`<script>(${installStageQ.toString()})(${JSON.stringify(opts)});</script>`;
 res.setHeader('Content-Type','text/html; charset=utf-8');
 if(config.mini)res.end(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;background:#eef2f8;color:#162538;font:14px system-ui}#canvases{display:flex;gap:16px}#probe{width:400px}#values span{display:inline-block;min-width:70px}canvas{background:#070c19}</style>${shim}</head><body><button id="stop">停止</button><output id="value">0</output><div id="canvases"></div><div id="probe"><div id="values"></div><svg width="400" height="100"><path id="curve" stroke="blue" fill="none"/></svg></div><script>(${installMinimal.toString()})(${JSON.stringify(config)},${JSON.stringify(tapes)});document.querySelector('#stop').onclick=()=>__stageQ.control.stop();</script></body></html>`);
 else res.end(current('index.html').replace('src="/src/main.ts"','src="/main.js"').replace('</head>',`<link rel="stylesheet" href="/main.css">${shim}</head>`));
 }else{res.setHeader('Content-Type',u.pathname.endsWith('.css')?'text/css':'application/javascript');res.end(assets.get(u.pathname.slice(1))??'');}}catch(e){res.statusCode=500;res.end(String(e));}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
const mini={mini:true,canvas:'app',dom:'app',width:438,height:330,count:2,period:40,geometry:true};
function plans(){
 if(suite==='capture')return [0,1,2].flatMap(repeat=>['readback','default'].flatMap(context=>[true,false].flatMap(instrument=>['none','before-trace-end','after-trace-end'].map(captureStage=>({...mini,name:`capture-${context}-${instrument?'on':'off'}-${captureStage}`,context,instrument,captureStage,trace:engine==='chromium',duration:1200,repeat})))));
 if(suite==='capture-probe')return [0,1,2].flatMap(repeat=>['readback','default'].flatMap(context=>['playwright','cdp-surface','cdp-view'].map(captureApi=>({...mini,name:`probe-${context}-${captureApi}`,context,captureApi,captureStage:'after-trace-end',trace:true,pixelCheck:true,duration:1200,repeat}))));
 if(suite==='smoke')return[{...mini,name:'mini',duration:1200,trace:true},{...mini,name:'worker-positive',duration:1500,positive:'worker'},{mini:false,name:'app',duration:1500},{...mini,name:'main-positive',duration:1500,positive:'main',target:'synthetic-main'}];
 if(suite==='screen')return[0,1,2].flatMap(repeat=>[
  ...['none','element','context','bitmap','clear','lines','app','split'].map(canvas=>({...mini,name:'canvas-'+canvas,canvas})),
  ...['none','text','attribute','svg','geometry','layout'].map(dom=>({...mini,name:'dom-'+dom,dom})),
  {...mini,name:'DPR1',dpr:1},{...mini,name:'one-canvas',count:1},{...mini,name:'hidden',hidden:true},{...mini,name:'small',width:219,height:165},
  {...mini,name:'period80',period:80},{...mini,name:'old-context',context:'default'},{...mini,name:'unforced',backend:'unforced'},{...mini,name:'disable-gpu',backend:'disabled'},
  {...mini,name:'instrument-off',instrument:false},{...mini,name:'warm-webgl',warmWebgl:true}
 ].map(o=>({...o,repeat,duration:3000})));
 if(suite==='follow')return[0,1,2].flatMap(repeat=>[
  {...mini,name:'mini',trace:repeat===0},{...mini,name:'warm-webgl',warmWebgl:true,trace:repeat===0},
  {mini:false,name:'app',trace:repeat===0},{mini:false,name:'direct-app',direct:true,trace:repeat===0}
 ].map(o=>({...o,repeat,duration:6000})));
 if(suite==='long')return[0,1,2].map(repeat=>({mini:false,name:'app-60',repeat,duration:60000})).concat([{mini:false,name:'app-300',duration:300000}]);
 if(suite==='ci')return[{...mini,name:'mini-none',canvas:'none',duration:1500,trace:engine==='chromium'},{...mini,name:'mini-app',duration:1500,trace:engine==='chromium'},{...mini,name:'timer-positive',duration:1500,positive:'worker'},{mini:false,name:'app',duration:2000}];
 if(suite==='stops')return[0,1,2].flatMap(repeat=>['pause','escape','visibility'].map(action=>({mini:false,name:action,action,repeat,duration:3000})));
 if(suite==='host')return[0,1,2].flatMap(repeat=>['pause','escape','visibility'].map(action=>({mini:false,name:'host-'+action,source:'host',action,repeat,duration:3000})));
 if(suite==='sender')return[0,1,2].flatMap(repeat=>['pause','escape','visibility'].map(action=>({mini:false,name:'sender-'+action,source:'sender',action,repeat,duration:3000})));
 if(suite==='sender-targets')return[0,1,2].flatMap(repeat=>['paint','calculate','observe'].map(target=>({mini:false,name:'sender-'+target,source:'sender',target,repeat,duration:6000,trace:repeat===0,native:repeat===0})));
 if(suite==='os')return[0,1,2].flatMap(repeat=>[true,false].map(sampleOs=>({mini:false,name:sampleOs?'os-on':'os-off',sampleOs,repeat,duration:6000,trace:true,native:true})));
 if(suite==='targets')return[0,1,2].flatMap(repeat=>['paint','calculate','observe'].map(target=>({mini:false,name:target,target,repeat,duration:6000,trace:repeat===0})));
 if(suite==='lifecycle')return[0,1,2].flatMap(repeat=>[
  {name:'normal-A',ab:false},{name:'rapid',rapid:true},{name:'lesson',lesson:true,action:'lesson'},
  {name:'lesson-safety',lesson:true,savedPlaying:true,action:'lesson-safety'},{name:'switch-dispose',action:'switch'}
 ].map(o=>({mini:false,duration:3000,source:'host',repeat,...o})));
 throw Error('Unknown suite '+suite);
}
const manifestFile=`${root}/${suite}-${engine}-${args.ref??'working'}-manifest.json`;
if(fs.existsSync(manifestFile))throw Error('Existing evidence; select unused output');
const sourceHashes=Object.fromEntries(execFileSync('git',['ls-files','src'],{encoding:'utf8'}).trim().split(/\r?\n/).map(p=>[p,hash(source(p).replaceAll('\r\n','\n'))]));
const plannedRuns=plans();
const manifest={date:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),reference:args.ref??'working',base,suite,engine,plannedCount:plannedRuns.length,plannedRuns,fixture,toolHashes,sourceHashes,environment:{os:os.platform(),release:os.release(),cpu:os.cpus()[0].model,memory:os.totalmem(),node:process.version,hostPid:process.pid},runs:[]};write(manifestFile,manifest);
manifest.schema=2;
manifest.status='PLANNED';
manifest.runs=plannedRuns.map((plan,index)=>{
 const id=`${suite}-${engine}-${String(index+1).padStart(3,'0')}-${plan.name}`;
 return {id,file:`${root}/raw/${id}.json.gz`,status:'PLANNED'};
});
write(manifestFile,manifest);
let counter=0;
let environmentBlocked=false;
async function run(o){
 const id=`${suite}-${engine}-${String(++counter).padStart(3,'0')}-${o.name}`,file=`${root}/raw/${id}.json.gz`;
 const launchArgs=engine!=='chromium'?[]:o.backend==='unforced'?[]:o.backend==='disabled'?['--disable-gpu']:['--use-angle=swiftshader','--enable-unsafe-swiftshader'];
 const report={id,options:o,fixture,toolHashes,reference:args.ref??'working',start:new Date().toISOString(),errors:[],issues:[],hostSamples:[],launchArgs};
 const entry=manifest.runs[counter-1];entry.status='RUNNING';entry.started=report.start;manifest.status='RUNNING';write(manifestFile,manifest);
 const save=()=>fs.writeFileSync(file,gzipSync(JSON.stringify(report)));
 let browser,context,page,cdp,bc,tracing=false,sampler,osFinished=false;
 async function finishTrace(){
  if(!tracing)return;
  tracing=false;
  const begin=performance.now();
  try{
   const complete=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
   await cdp.send('Tracing.end');
   const end=await deadline(complete,10000,'trace completion');
   const traceFile=`${root}/traces/${id}.json.gz`,fd=fs.openSync(traceFile,'w');
   try{
    while(true){
     const chunk=await cdp.send('IO.read',{handle:end.stream});
     fs.writeSync(fd,Buffer.from(chunk.data,chunk.base64Encoded?'base64':'utf8'));
     if(chunk.eof)break;
    }
   }finally{fs.closeSync(fd);await cdp.send('IO.close',{handle:end.stream});}
   report.trace={file:traceFile,sha256:hash(fs.readFileSync(traceFile)),dataLoss:end.dataLossOccurred??null,begin,end:performance.now()};
  }catch(error){recordIssue(report,categories.measurement,'TRACE_CAPTURE',error,'trace collection');}
 }
 try{
  try{
   browser=await({chromium,webkit}[engine]).launch({headless:true,...(engine==='chromium'?{args:launchArgs}:{})});
   context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:o.dpr??2});page=await context.newPage();
   cdp=engine==='chromium'?await context.newCDPSession(page):null;bc=cdp?await browser.newBrowserCDPSession():null;
   if(o.pixelCheck&&cdp){
    report.captureEmulation={width:1280,height:900,deviceScaleFactor:o.dpr??2,mobile:false};
    await cdp.send('Emulation.setDeviceMetricsOverride',report.captureEmulation);
   }
  }catch(error){environmentBlocked=true;recordIssue(report,categories.missing,'ENVIRONMENT',error,'browser preparation');throw error;}
  page.on('pageerror',error=>recordIssue(report,categories.measurement,'PAGE_ERROR',error,'page execution'));
  report.browser={name:engine,version:browser.version(),gpuInfoAtLaunch:bc?await bc.send('SystemInfo.getInfo'):'NOT_TESTED'};
  const response=await page.goto(`${url}/?id=${id}&config=${encodeURIComponent(JSON.stringify(o))}`);if(response.status()!==200)throw Error('HTTP '+response.status());
  if(!o.mini){await page.locator('#experiment').selectOption('three-body');await page.evaluate(o=>__stageQ.control.configure({ab:o.ab!==false,saturated:true}),o);}
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  if(!o.mini)await page.evaluate(()=>__stageQ.control.activate());
  if(o.lesson){await page.evaluate(o=>{if(o.savedPlaying)__stageQ.control.play();document.querySelector('#tb-lesson-toggle').addEventListener('click',()=>{const s=__stageQ.control.snapshot();__stageQ.lessonExpected=JSON.stringify({e:s.e,comparison:s.comparison});},{capture:true,once:true});},o);await page.locator('#tb-lesson-toggle').click();}
  report.before=JSON.parse(await page.evaluate(()=>JSON.stringify(__stageQ.control.snapshot())));
  report.deviceRatioBefore=await page.evaluate(()=>devicePixelRatio);
  report.browser.gpuInfo=bc?await bc.send('SystemInfo.getInfo'):'NOT_TESTED';
  if(o.sampleOs&&bc){report.processes=await bc.send('SystemInfo.getProcessInfo');sampler=await prepareThreadSampler(report.processes.processInfo.filter(p=>p.type==='renderer').map(p=>p.id),o.duration+500);report.os=sampler.data;report.pageClock=[];for(let i=0;i<8;i++){const a=performance.now(),p=await page.evaluate(()=>performance.now()),b=performance.now();report.pageClock.push({a,p,b,low:p-b,high:p-a});}}
  if(cdp&&o.trace){await cdp.send('Tracing.start',{transferMode:'ReturnAsStream',streamCompression:'gzip',traceConfig:{recordMode:'recordContinuously',includedCategories:['toplevel','devtools.timeline','disabled-by-default-devtools.timeline','blink.user_timing','v8','disabled-by-default-v8.gc','cc','gpu','viz','input','renderer.scheduler','sequence_manager','skia']}});tracing=true;}
  sampler?.start();
  if(o.source==='host'||o.source==='sender'){
   report.hostClock=[];for(let i=0;i<8;i++){const a=performance.now(),p=await page.evaluate(()=>performance.now()),b=performance.now();report.hostClock.push({a,p,b,low:p-b,high:p-a});}
   const best=report.hostClock.reduce((a,b)=>b.high-b.low<a.high-a.low?b:a),offset=(best.low+best.high)/2,uncertainty=(best.high-best.low)/2;
   await page.evaluate(o=>__stageQ.start(o.duration,o.action??'pause',o.target??null,'host'),o);
   if(o.source==='sender'){
    report.senderProcess=await deliverFromSender(o.duration,offset,uncertainty,(message,offset,uncertainty)=>page.evaluate(({message,offset,uncertainty})=>__stageQ.receive(message,offset,uncertainty),{message,offset,uncertainty}));
    if(report.senderProcess.status!=='PASS')recordIssue(report,categories.measurement,'SENDER_FAILURE',JSON.stringify(report.senderProcess.errors),'dedicated sender process');
   }else{
   const start=performance.now()+100,n=Math.ceil(o.duration/37),pending=[];report.hostRequests=[];
   for(let i=1;i<=n;i++){const planned=start+i*37;pending.push(new Promise(resolve=>setTimeout(async()=>{const sent=performance.now(),message={seq:i,planned,sent,deadline:i===n,source:'harness-node-timer'};report.hostRequests.push(message);try{await page.evaluate(({message,offset,uncertainty})=>__stageQ.receive(message,offset,uncertainty),{message,offset,uncertainty});}catch(e){message.error=String(e);}resolve();},Math.max(0,planned-performance.now()))));}
   if(o.rapid){report.transitions=[];for(let i=0;i<6;i++){const planned=start+250+i*400;pending.push(new Promise(resolve=>setTimeout(async()=>{const sent=performance.now(),record={planned,sent};report.transitions.push(record);try{record.page=await page.evaluate(async()=>{const q=__stageQ,T1=performance.now();if(q.stopping)return{cancelled:true,T1};const before=q.control.small();document.querySelector('#tb-play').click();const handlerEnd=performance.now();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const after=q.control.small();await new Promise(r=>setTimeout(r,100));return{T1,handlerEnd,before,after,later:q.control.small()};});}catch(e){record.error=String(e);}resolve();},Math.max(0,planned-performance.now()))));}}
   await deadline(Promise.all(pending),o.duration+10000,'host requests');
   }
  }else await page.evaluate(o=>__stageQ.start(o.duration,o.action??'pause',o.target??null,'worker',o.positive??null),o);
  await deadline(page.evaluate(()=>__stageQ.done.then(()=>true)),o.duration+10000,'Input/stop');
  if(report.hostClock)for(let i=0;i<8;i++){const a=performance.now(),p=await page.evaluate(()=>performance.now()),b=performance.now();report.hostClock.push({a,p,b,low:p-b,high:p-a});}
  Object.assign(report,JSON.parse(await page.evaluate(()=>__stageQ.collect())));
  report.browser.gpuInfoAfter=bc?await bc.send('SystemInfo.getInfo'):'NOT_TESTED';
  if(sampler){
   await sampler.finish();osFinished=true;
   if(report.os.status!=='complete')recordIssue(report,report.os.status==='NOT_TESTED'?categories.missing:categories.measurement,'OS_SAMPLING_INCOMPLETE',JSON.stringify(report.os.errors),'nonprivileged thread sampling');
   for(let i=0;i<8;i++){const a=performance.now(),p=await page.evaluate(()=>performance.now()),b=performance.now();report.pageClock.push({a,p,b,low:p-b,high:p-a});}
  }
  const stop=report.result.stop,s=report.result.state.small;
  if(stop.after.step!==stop.later.step)report.errors.push('continued after stop');
  if(s.playing||s.timer||s.raf)report.errors.push('pending work after stop');
  if(s.ab&&s.bStep!==s.step)report.errors.push('A/B mismatch');
  if(stop.T2==null||stop.T3==null||stop.T4==null)report.errors.push('missing stop/receipt');
  if(!o.mini&&o.action!=='switch'&&(s.observed!==String(s.step)||s.a!==String(s.step)||(s.ab&&s.b!==String(s.step))))report.errors.push('display mismatch');
  if(o.action==='switch'&&(!stop.removed||!s.disposed))report.errors.push('component remains');
  if(o.lesson&&report.result.lessonRestoredEqual!==true)report.errors.push('lesson state not restored');
  for(const t of report.transitions??[])if(t.error||(t.page&&!t.page.cancelled&&!t.page.after.playing&&!t.page.later.playing&&t.page.after.step!==t.page.later.step))report.errors.push('rapid pause continued');
  save();
  if(o.captureStage==='after-trace-end')await finishTrace();
  async function captureClock(){
   const samples=[];
   for(let i=0;i<8;i++){
    const a=performance.now(),p=await deadline(page.evaluate(()=>performance.now()),2000,'capture clock sync'),b=performance.now();
    samples.push({a,p,b,low:p-b,high:p-a});
   }
   return samples;
  }
  const captureClockBefore=await captureClock();
  report.capture={stage:o.captureStage??'before-trace-end',api:o.captureApi??'playwright',traceActive:tracing,status:'RUNNING',begin:performance.now(),timeout:5000};
  report.capture.clockBefore=captureClockBefore;
  if(o.captureStage==='none'){
   report.capture.status='NOT_TESTED';report.capture.reason='planned causal control';
  }else{
   try{
    const imageFile=`${root}/screenshots/${id}.png`;
    await capturePage(page,cdp,imageFile,o.captureApi);
    report.capture.acquiredAt=performance.now();
    report.capture.status='PASS';report.capture.file=imageFile;report.capture.sha256=hash(fs.readFileSync(imageFile));
    if(o.pixelCheck){
     report.capture.bitmapCheckBegin=performance.now();
     report.capture.bitmap=await deadline(inspectCaptureBitmap(page,fs.readFileSync(imageFile)),5000,'capture bitmap verification');
     report.capture.bitmapCheckEnd=performance.now();
     if(!report.capture.bitmap.dimensionsMatch||report.capture.bitmap.checks.some(check=>check.differentChannels!==0)){report.capture.status='FAIL';recordIssue(report,categories.screenshot,'CAPTURE_PIXEL_MISMATCH',JSON.stringify(report.capture.bitmap),'capture bitmap verification');}
    }
   }catch(error){report.capture.status='FAIL';recordIssue(report,categories.screenshot,'SCREENSHOT_TIMEOUT_OR_ERROR',error,'post-stop screenshot');}
  }
  report.capture.end=performance.now();
  report.capture.clockAfter=await captureClock();
  report.capture.deviceRatioAfter=await page.evaluate(()=>devicePixelRatio);
  if(report.capture.deviceRatioAfter!==report.deviceRatioBefore)recordIssue(report,categories.screenshot,'CAPTURE_METRICS_CHANGED',JSON.stringify({before:report.deviceRatioBefore,after:report.capture.deviceRatioAfter}),'capture browser metrics');
  report.capture.after=await deadline(page.evaluate(()=>__stageQ.control.small()),2000,'post-capture state');
  if(report.capture.after.step!==s.step||report.capture.after.playing||report.capture.after.timer||report.capture.after.raf)recordIssue(report,categories.safety,'POST_CAPTURE_STATE','state advanced or work remains after capture','post-capture state');
 }catch(e){
  if(!environmentBlocked)recordIssue(report,categories.measurement,'RUN_MEASUREMENT',e,'measurement');
  try{report.partial=JSON.parse(await deadline(page.evaluate(()=>JSON.stringify({data:__stageQ.result(),state:__stageQ.control.snapshot()})),2000,'partial'));}catch(error){recordIssue(report,categories.missing,'PARTIAL_SNAPSHOT',error,'partial state acquisition');}
 }
 finally{
  if(sampler&&!osFinished)await sampler.finish();
  await finishTrace();
  try{await browser?.close();}catch(error){recordIssue(report,categories.measurement,'BROWSER_CLOSE',error,'cleanup');}
  report.finish=new Date().toISOString();report.status=environmentBlocked?'BLOCKED':report.errors.length?'FAIL':'PASS';entry.status=report.status;entry.finished=report.finish;entry.issues=report.issues;save();write(manifestFile,manifest);
  const req=report.data?.requests??[],spans=report.data?.spans??[];
  report.summary={id,errors:report.errors,scheduledToSend:distribution(req.map(r=>r.T0-r.Tminus1)),sendToReceive:distribution(req.map(r=>r.T1-r.T0)),scheduledToReceive:distribution(req.map(r=>r.T1-r.Tminus1)),phases:Object.fromEntries(['paint','observe','calculate','geometry','dom-geometry'].map(n=>[n,distribution(spans.filter(s=>s.name===n).map(s=>s.end-s.begin))])),steps:report.result?.state.small,stop:report.result?.stop};
  write(`${root}/raw/${id}-summary.json`,report.summary);save();console.log(JSON.stringify({id,errors:report.errors,input:report.summary.sendToReceive.max,timer:report.summary.scheduledToSend.max,paint:report.summary.phases.paint.max,steps:report.summary.steps?.step}));if(report.errors.length)process.exitCode=1;global.gc?.();
 }
}
try{
 for(const p of plannedRuns){await run(p);if(environmentBlocked)break;}
}finally{
 if(environmentBlocked)for(const entry of manifest.runs)if(entry.status==='PLANNED')entry.status='BLOCKED';
 manifest.counts={planned:plannedRuns.length,attempted:manifest.runs.filter(r=>r.started).length,completed:manifest.runs.filter(r=>r.finished).length,failed:manifest.runs.filter(r=>r.status==='FAIL').length,unexecuted:manifest.runs.filter(r=>!r.started).length};
 manifest.status=suiteState({...manifest.counts,blocked:environmentBlocked});
 manifest.finished=new Date().toISOString();write(manifestFile,manifest);server.close();
}
