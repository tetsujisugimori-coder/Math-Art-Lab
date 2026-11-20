import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {execFileSync} from 'node:child_process';import {createServer} from 'node:http';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';import {chromium} from '@playwright/test';
import {makeFixture} from './three-body-stage-u-fixture.mjs';
import {stageUPlans,executeOperation,stoppedFrame,observeCleanup,sourceFiles} from './three-body-stage-u-contracts.mjs';
import {inspectCaptureBitmap} from './three-body-stage-q-capture.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('='))),root=args.output??'.three-body-evidence/stage-u/local';
const hash=b=>createHash('sha256').update(b).digest('hex'),write=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2)+'\n');
const deadline=(p,ms,label)=>{let timer;return Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error(label+' timeout '+ms+'ms')),ms))]).finally(()=>clearTimeout(timer));};
for(const d of ['raw','images','sources'])fs.mkdirSync(root+'/'+d,{recursive:true});
if(fs.existsSync(root+'/manifest.json'))throw Error('Existing evidence; select unused output');
const plans=stageUPlans(),manifest={schema:1,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),ciRunId:process.env.GITHUB_RUN_ID??null,ciAttempt:process.env.GITHUB_RUN_ATTEMPT??null,environment:{os:os.platform(),release:os.release(),cpu:os.cpus()[0].model,node:process.version,pid:process.pid,timeOrigin:performance.timeOrigin},plans,runs:plans.map(p=>({id:p.id,status:'PLANNED',raw:'raw/'+p.id+'.json.gz',summary:'raw/'+p.id+'-summary.json'})),status:'PLANNED',createdUTC:new Date().toISOString()};
manifest.sources=sourceFiles.map(file=>{const bytes=fs.readFileSync(file),sha256=hash(bytes),copy='sources/'+sha256+'-'+path.basename(file);fs.writeFileSync(root+'/'+copy,bytes,{flag:'wx'});return{file,copy,bytes:bytes.length,sha256};});
write(root+'/manifest.json',manifest);
let fixture,server,blocker;
try{
 fixture=await makeFixture();manifest.fixture={...fixture.metadata,canonicalSha256:fixture.canonicalSha256};
 server=createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),p=plans.find(p=>p.id===u.searchParams.get('id'));if(!p){res.statusCode=404;res.end();return;}res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture.html(p.context,p.id));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
}catch(error){blocker={category:'G_NOT_ACQUIRED',code:'ENVIRONMENT_PREPARATION',error:String(error)};}
if(args.resume){
 const prior=JSON.parse(fs.readFileSync(args.resume+'/manifest.json')),proof=JSON.parse(fs.readFileSync(args.proof,'utf8').replace(/^\uFEFF/,''));
 if(!proof.safeToResumeFreshBrowser||proof.sourceHostPid!==prior.environment.pid||JSON.stringify(prior.plans)!==JSON.stringify(plans)||prior.fixture.tapeSha256!==manifest.fixture.tapeSha256||prior.fixture.canonicalSha256!==manifest.fixture.canonicalSha256)throw Error('Unsafe/mismatched resume');
 manifest.resume={source:args.resume,manifestSha256:hash(fs.readFileSync(args.resume+'/manifest.json')),environment:prior.environment,sources:prior.sources,proof};
 fs.writeFileSync(root+'/sources/prior-manifest.json',fs.readFileSync(args.resume+'/manifest.json'),{flag:'wx'});
 for(const src of prior.sources){const b=fs.readFileSync(args.resume+'/'+src.copy),target=root+'/'+src.copy;if(hash(b)!==src.sha256)throw Error('Prior source mismatch');if(fs.existsSync(target)){if(hash(fs.readFileSync(target))!==src.sha256)throw Error('Source collision');}else fs.writeFileSync(target,b,{flag:'wx'});}
 for(const entry of prior.runs.filter(e=>e.finishedUTC)){
  for(const file of [entry.raw,entry.summary])fs.copyFileSync(args.resume+'/'+file,root+'/'+file,fs.constants.COPYFILE_EXCL);
  manifest.runs[plans.findIndex(p=>p.id===entry.id)]={...entry,importedFrom:args.resume,originalHarness:prior.environment};
 }
 write(root+'/manifest.json',manifest);
}
const launchArgs=['--use-angle=swiftshader','--enable-unsafe-swiftshader'];
for(const [index,p] of plans.entries()){
 const entry=manifest.runs[index];if(entry.finishedUTC)continue;if(blocker){entry.status='BLOCKED';entry.reason=blocker;continue;}
 entry.status='RUNNING';entry.startedUTC=new Date().toISOString();manifest.status='RUNNING';write(root+'/manifest.json',manifest);
 const r={id:p.id,order:index,harness:{pid:process.pid,timeOrigin:performance.timeOrigin},plan:p,head:manifest.head,ciRunId:manifest.ciRunId,fixture:manifest.fixture,launchArgs,startedUTC:entry.startedUTC,issues:[],setupRequests:[],explicitMeasuredCalls:[],trace:{status:'NOT_TESTED_PRIMARY_TRACE_OFF',pid:null,tid:null,clockConversion:'NOT_USED_ALL_CDP_TIMES_USE_ONE_HARNESS_CLOCK'},math:{status:'NOT_TESTED_NO_LIVE_PHYSICS',sourcePhysicsStep:26000},image:{acquisition:p.operation==='A'?'NOT_REQUESTED':'NOT_TESTED'},readback:{enabled:p.readback,requestedGetImageDataCalls:p.readback?2:0,completedGetImageDataCalls:p.readback?null:0,status:p.readback?'PLANNED':'OFF',actualNativeCallCount:p.readback?'NOT_TESTED_WITHOUT_REPLY':0,browserInternalReadback:'NOT_TESTED'}};
 const issue=(category,code,error)=>r.issues.push({category,code,error:String(error),at:performance.now(),clock:'harness performance.now'});
 let browser,page,cdp;
 try{
  try{
   browser=await chromium.launch({headless:true,args:launchArgs});r.browser={version:browser.version(),playwrightVersion:JSON.parse(fs.readFileSync('node_modules/@playwright/test/package.json')).version};
   const context=await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2});page=await context.newPage();cdp=await context.newCDPSession(page);
   async function setup(method,params={}){const begin=performance.now(),value=await cdp.send(method,params);r.setupRequests.push({method,params,begin,end:performance.now()});return value;}
   const target=await setup('Target.getTargetInfo');r.session={logicalId:p.id+'/page-session',targetId:target.targetInfo.targetId,wireSessionId:'NOT_EXPOSED_BY_PUBLIC_PLAYWRIGHT_API',sameObjectForAllMeasuredRequests:true};
   await setup('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:2,mobile:false});
   const bc=await browser.newBrowserCDPSession(),gpuBegin=performance.now();r.gpu=await bc.send('SystemInfo.getInfo');r.setupRequests.push({session:'browser metadata only',method:'SystemInfo.getInfo',params:{},begin:gpuBegin,end:performance.now()});
  }catch(error){blocker={category:'G_NOT_ACQUIRED',code:'BROWSER_ENVIRONMENT',error:String(error)};throw error;}
  r.htmlSha256=hash(fixture.html(p.context,p.id));r.contextFixtureSha256=hash(fixture.html(p.context,'__RUN_ID__'));
  const response=await page.goto(`http://127.0.0.1:${server.address().port}/?id=${p.id}`);if(response.status()!==200)throw Error('Fixture HTTP '+response.status());
  r.ready=await deadline(page.evaluate(()=>globalThis.__stageQ.uReady),10000,'fixed frame preparation');r.before=r.ready.state;
  if(!stoppedFrame(r.before)||r.ready.metadata.dpr!==2||r.ready.metadata.canvases.length!==2||r.ready.metadata.canvases.some(c=>c.width!==876||c.height!==660||c.styleWidth!=='438px'||c.styleHeight!=='330px'))throw Error('Fixed state/dimensions mismatch');
  if(p.readback){
   r.readback.begin=performance.now();r.readback.status='RUNNING';
   r.readback.page=await deadline(page.evaluate(()=>{const q=globalThis.__stageQ;q.uBeforePixels=[];return[...document.querySelectorAll('#canvases canvas')].map(cv=>{const begin=performance.now(),data=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,end=performance.now();q.uBeforePixels.push(data);return{begin,end,bytes:data.byteLength,width:cv.width,height:cv.height,clock:'page performance.now; not absolutely aligned to harness'};});}),5000,'explicit readback');
   r.readback.end=performance.now();r.readback.completedGetImageDataCalls=2;r.readback.actualNativeCallCount=2;r.readback.status='PASS';
  }
  const send=(method,params)=>{r.explicitMeasuredCalls.push({method,params});return cdp.send(method,params);};
  r.operation=await executeOperation(send,p.operation,r.session);
  for(const request of r.operation.requests)if(request.status!=='PASS')issue(request.method==='Page.captureScreenshot'?'E_SCREENSHOT':'D_MEASUREMENT',request.status,request.error?.message??'Reply observed after deadline');
  if(r.operation.captureStatus==='NOT_TESTED_BLOCKED_BY_LAYOUT')issue('G_NOT_ACQUIRED','CAPTURE_BLOCKED_BY_LAYOUT','Capture was not sent after failed layout');
  const capture=r.operation.requests.find(r=>r.method==='Page.captureScreenshot');
  if(capture?.result?.data){
   const bytes=Buffer.from(capture.result.data,'base64'),file='images/'+p.id+'.png';fs.writeFileSync(root+'/'+file,bytes,{flag:'wx'});
   r.image={acquisition:capture.status==='PASS'?'ACQUIRED':'ACQUIRED_AFTER_DEADLINE',file,bytes:bytes.length,sha256:hash(bytes)};
   if(bytes.length<24||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid PNG reply');
   r.image.width=bytes.readUInt32BE(16);r.image.height=bytes.readUInt32BE(20);
   try{
    r.image.bitmap=await deadline(inspectCaptureBitmap(page,bytes),5000,'post-capture bitmap verification');
    r.image.postPixels=await deadline(page.evaluate(async base64=>{
     const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
     const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const cv=document.createElement('canvas');cv.width=image.naturalWidth;cv.height=image.naturalHeight;const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
     const decodedSha256=await digest(ctx.getImageData(0,0,cv.width,cv.height).data),q=globalThis.__stageQ;
     const beforeAfter=q.uBeforePixels?await Promise.all([...document.querySelectorAll('#canvases canvas')].map(async(c,i)=>{const current=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let different=0;for(let n=0;n<current.length;n++)if(current[n]!==q.uBeforePixels[i][n])different++;return{beforeSha256:await digest(q.uBeforePixels[i]),afterSha256:await digest(current),differentChannels:different};})):null;
     return{decodedSha256,beforeAfter,scope:'After the measured API; no pre-measurement digest or readback in OFF trials'};
    },bytes.toString('base64')),5000,'post-capture pixel digest');
    if(!r.image.bitmap.dimensionsMatch||r.image.bitmap.checks.some(c=>c.differentChannels!==0)||r.image.postPixels.beforeAfter?.some(c=>c.differentChannels!==0))issue('E_SCREENSHOT','PIXEL_MISMATCH',JSON.stringify(r.image.bitmap));
   }catch(error){issue('E_SCREENSHOT','POST_CAPTURE_PIXEL_CHECK',error);}
  }else if(capture){r.image.acquisition='NOT_ACQUIRED';if(capture.status==='PASS')issue('E_SCREENSHOT','MISSING_IMAGE_DATA','Successful protocol reply contained no image');}
  r.after=await deadline(page.evaluate(()=>globalThis.__stageQ.control.small()),2000,'post-operation state');
  await new Promise(resolve=>setTimeout(resolve,100));r.later=await deadline(page.evaluate(()=>globalThis.__stageQ.control.small()),2000,'later stopped state');
  if(!stoppedFrame(r.after)||!stoppedFrame(r.later)||JSON.stringify(r.after)!==JSON.stringify(r.before))issue('B_STOP_DISPLAY','FIXTURE_STATE_CHANGED',JSON.stringify({before:r.before,after:r.after,later:r.later}));
 }catch(error){if(r.readback.status==='RUNNING'){r.readback.end=performance.now();r.readback.response=null;r.readback.status=/timeout/i.test(String(error))?'TIMEOUT':'PROTOCOL_ERROR';issue('G_NOT_ACQUIRED','PRIMARY_BLOCKED_BY_READBACK','No primary CDP operation was sent');}issue(blocker?'G_NOT_ACQUIRED':'D_MEASUREMENT','TRIAL_EXCEPTION',error);}
 finally{
  if(r.before&&!r.after)issue('G_NOT_ACQUIRED','POST_STATE_UNAVAILABLE','Post-intervention state was not acquired');
  r.cleanup=await observeCleanup(()=>browser?.close()??Promise.resolve());
  if(r.cleanup.status!=='PASS')issue('D_MEASUREMENT','BROWSER_CLEANUP',JSON.stringify(r.cleanup));
  if(!r.cleanup.closed)blocker={category:'G_NOT_ACQUIRED',code:'UNCONFIRMED_CLEANUP',error:JSON.stringify(r.cleanup)};
  r.finishedUTC=new Date().toISOString();r.status=blocker?'BLOCKED':r.issues.length?'FAIL':'PASS';
  const bytes=gzipSync(JSON.stringify(r));fs.writeFileSync(root+'/'+entry.raw,bytes,{flag:'wx'});
  const summary={id:r.id,plan:r.plan,status:r.status,issues:r.issues,requests:r.operation?.requests.map(({result,...rest})=>({...rest,result:result?.data?{imagePayload:'stored in raw and original PNG'}:result})),gap:r.operation?.gap??null,captureStatus:r.operation?.captureStatus??'NOT_TESTED',image:r.image,before:r.before,after:r.after,later:r.later};
  write(root+'/'+entry.summary,summary);Object.assign(entry,{status:r.status,finishedUTC:r.finishedUTC,sha256:hash(bytes),decodedSha256:hash(Buffer.from(JSON.stringify(r))),summarySha256:hash(fs.readFileSync(root+'/'+entry.summary)),bytes:bytes.length});
  write(root+'/manifest.json',manifest);console.log(JSON.stringify({id:r.id,status:r.status,requests:summary.requests?.map(q=>({method:q.method,status:q.status,elapsed:q.elapsed})),image:r.image.acquisition,issues:r.issues.map(i=>i.code)}));
 }
}
server?.close();
manifest.finishedUTC=new Date().toISOString();manifest.blocker=blocker??null;
manifest.counts={planned:plans.length,completed:manifest.runs.filter(r=>r.finishedUTC).length,failed:manifest.runs.filter(r=>['FAIL','BLOCKED'].includes(r.status)&&r.finishedUTC).length,unexecuted:manifest.runs.filter(r=>!r.finishedUTC).length};
manifest.status=blocker?'BLOCKED':manifest.counts.failed?'FAIL':'PASS';write(root+'/manifest.json',manifest);
const {auditStageU,verifyIndex}=await import('./three-body-stage-u-audit.mjs');const audit=auditStageU(root);write(root+'/audit.json',audit);
const all=(d)=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?all(path.join(d,e.name)):[path.join(d,e.name)]);
const makeIndex=()=>write(root+'/artifact-index.json',{head:manifest.head,ciRunId:manifest.ciRunId,completeness:audit.completeness,files:all(root).filter(f=>path.basename(f)!=='artifact-index.json').map(f=>{const b=fs.readFileSync(f);return{file:path.relative(root,f).replaceAll('\\','/'),bytes:b.length,sha256:hash(b)};})});
makeIndex();
const checkIndex=()=>verifyIndex(JSON.parse(fs.readFileSync(root+'/artifact-index.json')),f=>fs.readFileSync(root+'/'+f),()=>all(root).map(f=>path.relative(root,f).replaceAll('\\','/')));
let invalid=checkIndex();
if(!invalid.length){audit.completeness.artifactIndexVerified=true;write(root+'/audit.json',audit);makeIndex();invalid=checkIndex();}
if(invalid.length){fs.copyFileSync(root+'/artifact-index.json',root+'/artifact-index-failure.json',fs.constants.COPYFILE_EXCL);audit.status='FAIL';audit.issues.push({category:'F_EVIDENCE',code:'ARTIFACT_INDEX_FAILED',error:JSON.stringify(invalid)});audit.completeness.artifactIndexVerified=false;audit.completeness.acceptance='NOT_ACCEPTED';write(root+'/audit.json',audit);makeIndex();}
console.log(JSON.stringify({counts:manifest.counts,audit:audit.status,completeness:audit.completeness}));
if(manifest.status!=='PASS'||audit.status!=='PASS')process.exitCode=1;
