import fs from 'node:fs';import {gunzipSync} from 'node:zlib';import {completeEvents,unionOverlap} from './three-body-stage-p-analysis.mjs';
const finite=Number.isFinite;
// No guessed endpoint mapping: candidates remain candidates, even with a matching name.
export function alignClock(events,probes){
 const errors=[],anchors=[];const identity=probes.filter(p=>p.kind==='page'&&p.phase==='before');
 if(identity.length!==1)return{status:'UNCALIBRATED',errors:['PAGE_IDENTITY_PROBE_MISSING'],anchors};
 const main=events.filter(e=>e.name===identity[0].name&&e.cat?.includes('user_timing'));
 if(main.length!==1||!finite(main[0].pid)||!finite(main[0].tid))return{status:'UNCALIBRATED',errors:['PAGE_IDENTITY_EVENT_MISSING_OR_DUPLICATE'],anchors};
 const pid=main[0].pid,tid=main[0].tid;
 for(const p of probes){
  const found=events.filter(e=>p.kind==='browser'?e.name==='clock_sync'&&e.args?.sync_id===p.name:e.name===p.name&&e.cat?.includes('user_timing'));
  if(p.status!=='PASS'||found.length!==1){errors.push('PROBE_OR_EVENT_MISSING:'+p.name);continue;}const e=found[0];
  if(!finite(p.begin)||!finite(p.end)||p.end<p.begin||!finite(e.ts)||e.ts<=0){errors.push('INVALID_CLOCK_SAMPLE:'+p.name);continue;}
  if(p.kind==='page'&&(e.pid!==pid||e.tid!==tid)){errors.push('PID_TID_MISMATCH:'+p.name);continue;}
  anchors.push({...p,pid:e.pid,tid:e.tid,traceMs:e.ts/1000,low:e.ts/1000-p.end,high:e.ts/1000-p.begin});
 }
 const b=anchors.filter(a=>a.kind==='browser');
 if(b.filter(a=>a.phase==='before').length!==2||b.filter(a=>a.phase==='after').length!==2)errors.push('BROWSER_CALIBRATION_INCOMPLETE');
 if(b.length&&new Set(b.map(a=>a.pid+':'+a.tid)).size!==1)errors.push('BROWSER_PID_TID_MISMATCH');
 const low=anchors.length?Math.max(...anchors.map(a=>a.low)):null,high=anchors.length?Math.min(...anchors.map(a=>a.high)):null;
 if(!finite(low)||!finite(high)||low>high)errors.push('INCONSISTENT_CLOCK_BRACKETS');
 return{status:errors.length?'UNCALIBRATED':'BRACKETED',mainPid:pid,mainTid:tid,browserPid:b[0]?.pid??null,browserTid:b[0]?.tid??null,anchors,errors,offsetLow:errors.length?null:low,offsetHigh:errors.length?null:high,uncertaintyMs:errors.length?null:(high-low)/2,domain:'Chrome trace TimeTicks microseconds -> harness performance.now milliseconds via observed marker brackets',cpuTimeDomain:'tts/tdur are per-thread CPU microseconds when present; never subtracted into a named wait',crossProcessAssumption:'Chrome integrated trace ts clock; no independent kernel clock calibration',accuracyGuaranteed:false};
}
const endpoints=()=>({T1:{status:'NOT_OBTAINED',value:null},T2:{status:'NOT_OBTAINED',value:null},T3:{status:'NOT_OBTAINED',value:null},reason:'No validated unique protocol-request/target endpoint mapping. Event names or time overlap alone are insufficient.'});
export function analyzeEvents(events,record){
 const clock=alignClock(events,record.probes??[]),rawMarkers=events.filter(e=>e.name?.startsWith(record.id+'/handler-')||e.name?.startsWith(record.id+'/before-getImageData-')||e.name?.startsWith(record.id+'/after-getImageData-'));
 const handler=rawMarkers.map(e=>({name:e.name,pid:e.pid,tid:e.tid,traceUs:e.ts,identityMatches:e.pid===clock.mainPid&&e.tid===clock.mainTid,clockDomain:'Chrome trace ts microseconds'}));
 const processMetadata=events.filter(e=>e.ph==='M'&&['process_name','thread_name'].includes(e.name));
 const methodCandidates=events.filter(e=>JSON.stringify(e.args??{}).includes(record.request?.method??'__missing__')||/CaptureScreenshot|ScreenshotCaptured|EncodeBitmap|CopyOutput|CopyFromSurface|Readback|ReadPixels/i.test(e.name??''));
 const result={clock,endpoints:endpoints(),processMetadata,handlerMarkers:handler,methodCandidates:methodCandidates.map(e=>({...e,interpretation:'CANDIDATE_NOT_REQUEST_ENDPOINT'})),coverage:{traceEvents:events.length},mainWindow:null,threadWindows:[],hypotheses:{nativeWait:'UNKNOWN',osScheduling:'UNKNOWN',gpuWait:'UNKNOWN',original1249ms:'UNKNOWN'},limits:['Trace overlap is not causation','No kernel scheduler or GPU presentation observation','Missing CPU/event data are null/NOT_OBTAINED, not zero','An unfinished scope may be absent from completed-event JSON']};
 if(clock.status!=='BRACKETED'||!finite(record.request?.start)||!finite(record.request?.finished))return result;
 const begin=record.request.start+clock.offsetLow,end=record.request.finished+clock.offsetHigh;
 result.window={beginTraceMs:begin,endTraceMs:end,scope:record.request.response===null?'Until configured deadline; actual response/processing end not observed':'Includes the protocol request-to-reply window with calibration uncertainty'};
 const completed=completeEvents(events),threads=new Map();for(const e of completed){if(!finite(e.ts)||!finite(e.dur)||e.ts/1000>=end||(e.ts+e.dur)/1000<=begin)continue;const key=e.pid+':'+e.tid;if(!threads.has(key))threads.set(key,[]);threads.get(key).push(e);}
 for(const es of threads.values()){
  const first=es[0],tasks=es.filter(e=>/^(RunTask|ThreadControllerImpl::RunTask)$/.test(e.name)),main=first.pid===clock.mainPid&&first.tid===clock.mainTid;
  const groups={javascript:/FunctionCall|EvaluateScript|V8.Execute/,layout:/Layout|UpdateLayoutTree|PrePaint/,paint:/Paint|DrawFrame/,raster:/Raster|Rasterizer/,compositor:/Composite|Compositor|BeginFrame/,gc:/GC|Scaveng|MarkCompact/,waitCandidates:/Wait|SyncToken|Flush|Fence/};
  const row={pid:first.pid,tid:first.tid,rendererMain:main,events:es.length,taskUnionWallMs:tasks.length?unionOverlap(tasks,begin,end):null,groups:Object.fromEntries(Object.entries(groups).map(([k,re])=>{const found=es.filter(e=>re.test(e.name));return[k,{status:found.length?'OBSERVED':'NOT_OBTAINED',unionWallMs:found.length?unionOverlap(found,begin,end):null,count:found.length}];})),longest:es.slice().sort((a,b)=>b.dur-a.dur).slice(0,12).map(e=>({name:e.name,ts:e.ts,dur:e.dur,tts:e.tts??null,tdur:e.tdur??null,wallMs:e.dur/1000,threadCpuMs:finite(e.tdur)?e.tdur/1000:null,cat:e.cat,pid:e.pid,tid:e.tid})),cpuPartition:'NOT_OBTAINED; parent/child CPU is not summed'};
  result.threadWindows.push(row);if(main)result.mainWindow=row;
 }
 result.coverage={traceEvents:events.length,browser:processMetadata.some(e=>e.name==='process_name'&&/Browser/.test(e.args?.name??''))?'OBSERVED':'NOT_OBTAINED',rendererMain:result.mainWindow?'OBSERVED':'NOT_OBTAINED',compositor:events.some(e=>/Compositor|Composite/.test(e.name??''))?'OBSERVED':'NOT_OBTAINED',raster:events.some(e=>/Raster/.test(e.name??''))?'OBSERVED':'NOT_OBTAINED',gpu:processMetadata.some(e=>/Gpu|GPU/.test(e.args?.name??''))?'OBSERVED':'NOT_OBTAINED',scheduler:events.some(e=>/SequenceManager|Scheduler|ThreadController/.test(e.name??''))?'CHROME_TASK_EVENTS_ONLY':'NOT_OBTAINED',kernelScheduler:'NOT_OBTAINED',gpuPresentation:'NOT_OBTAINED'};
 return result;
}
export function analyzeTraceFile(file,record){try{const data=JSON.parse(gunzipSync(fs.readFileSync(file))),events=data.traceEvents;if(!Array.isArray(events))throw Error('traceEvents absent');return{status:'PARSED',dataLoss:record.trace?.completion?.dataLossOccurred??'NOT_OBTAINED',...analyzeEvents(events,record)};}catch(error){return{status:'NOT_OBTAINED',error:String(error),clock:{status:'UNCALIBRATED'},endpoints:endpoints(),mainWindow:null,hypotheses:{nativeWait:'UNKNOWN',osScheduling:'UNKNOWN',gpuWait:'UNKNOWN'}};}}
