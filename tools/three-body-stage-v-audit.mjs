import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';
import {plans,sources,legacySources,counts,completeness,methodFor,parametersFor,stoppedFrame} from './three-body-stage-v-contracts.mjs';import {analyzeEvents} from './three-body-stage-v-trace.mjs';import {verifyIndex} from './three-body-stage-u-audit.mjs';
import {auditTiming} from './three-body-stage-w-timing.mjs';
import {auditBinding,acquiredParameters} from './three-body-stage-w-source.mjs';
import {fileURLToPath} from 'node:url';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function summaryOf(r){const {result,...request}=r.request??{};return{diagnosticContract:r.diagnosticContract,sourceReference:r.sourceReference,fixtureWindows:r.fixtureWindows,id:r.id,plan:r.plan,status:r.status,issues:r.issues,request:r.request?{...request,result:r.request.method==='Page.captureScreenshot'&&result?.data?{png:'Original payload retained in raw and PNG'}:result}:null,timestamps:r.timestamps,transport:r.transport?{...r.transport,result:r.transport.result?.data?{png:'Observed protocol payload retained in raw'}:r.transport.result}:undefined,image:r.image,readback:r.readback,before:r.before,after:r.after,trace:{...r.trace,analysis:r.traceAnalysis}};}
export function auditRecords(m,read,list,options={}){
 const issues=[],records=[],expectedRaw=[],ids=new Set(),targets=new Set(),add=(code,error,id=null,category='F_EVIDENCE')=>issues.push({category,code,error:String(error),id});
 const plan=options.plan??plans(),expectedSources=options.expectedSources??(!m.diagnosticContract&&m.sources?.length===legacySources.length?legacySources:sources);if(m.schema!==(options.schema??'stage-v-1')||JSON.stringify(m.plans)!==JSON.stringify(plan)||m.runs?.length!==plan.length)add('PLAN_MISMATCH','Fixed14-entry plan differs');
 if(JSON.stringify(m.sources?.map(s=>s.file).sort())!==JSON.stringify([...expectedSources].sort()))add('SOURCE_SET','Required diagnostic source versions absent or duplicated');
 for(const e of m.runs??[]){
  if(ids.has(e.id))add('DUPLICATE_RUN',e.id);ids.add(e.id);const p=plan.find(p=>p.id===e.id);if(!p){add('UNKNOWN_RUN',e.id);continue;}
  if(!e.finishedUTC){add('UNEXECUTED',e.status,e.id,'G_NOT_ACQUIRED');continue;}
  const raw='raw/'+e.id+'.json.gz',summary='raw/'+e.id+'-summary.json';expectedRaw.push(raw,summary);
  try{
   if(e.raw!==raw||e.summary!==summary)throw Error('Unexpected raw/summary path');const encoded=read(raw),decoded=gunzipSync(encoded),sb=read(summary),r=JSON.parse(decoded),s=JSON.parse(sb);records.push(r);
   if(encoded.length!==e.bytes||sha(encoded)!==e.sha256||sha(decoded)!==e.decodedSha256||sha(sb)!==e.summarySha256)add('RAW_SUMMARY_HASH_SIZE',raw,e.id);
   if(r.id!==e.id||JSON.stringify(r.plan)!==JSON.stringify(p)||r.status!==e.status||r.finishedUTC!==e.finishedUTC||JSON.stringify(s)!==JSON.stringify(summaryOf(r)))add('RAW_SUMMARY_CONTENT',raw,e.id);
   if(m.sourceBinding&&(r.head!==m.head||r.diagnosticContract!==m.diagnosticContract||r.sourceReference?.executionHead!==r.head))add('RAW_EXECUTION_HEAD_REVISION',raw,e.id);
   issues.push(...(r.issues??[]).map(i=>({...i,id:e.id})));
   if(r.status==='PASS'&&r.issues.length)add('FALSE_TRIAL_PASS',raw,e.id);
   if(r.calls.some(q=>q.method==='Page.getLayoutMetrics'||q.method==='Page.screenshot')||(!p.trace&&r.calls.some(q=>q.method.startsWith('Tracing.'))))add('FORBIDDEN_COMMAND',raw,e.id);
   if(r.before&&!stoppedFrame(r.before))add('BAD_FROZEN_STATE',raw,e.id,'B_STOP_DISPLAY');
   if(r.before){const meta=r.ready?.metadata;if(!meta||meta.dpr!==2||meta.canvases?.length!==2||meta.canvases.some(c=>c.width!==876||c.height!==660||c.styleWidth!=='438px'||c.styleHeight!=='330px'||c.context?.willReadFrequently!==(p.context==='readback')))add('FIXTURE_METADATA',raw,e.id);}
   if(r.after&&(!stoppedFrame(r.after)||JSON.stringify(r.before)!==JSON.stringify(r.after)))add('FROZEN_STATE_CHANGED',raw,e.id,'B_STOP_DISPLAY');
   if(r.status==='PASS'&&(!r.before||!r.after))add('PASS_STATE_MISSING',raw,e.id);
   if(!r.request){add('REQUEST_NOT_SENT',raw,e.id,'G_NOT_ACQUIRED');if(r.status==='PASS')add('MISSING_REQUEST_FALSE_PASS',raw,e.id);continue;}
   if(r.fixture?.tapeSha256!=='3080cf71635e04f98f62d13927de156c142c7828a0674b548e2a65e512129291'||r.fixture.livePhysics!==false||r.readback.explicitBeforePrimary!==false)add('FIXED_CONDITION_CHANGED',raw,e.id);
   const q=r.request;if(q.method!==methodFor(p)||JSON.stringify(q.params)!==JSON.stringify((options.parametersFor??parametersFor)(p))||q.timeoutMs!==5000||q.session.targetId!==r.session?.targetId||q.session.logicalId!==r.session?.logicalId)add('METHOD_PARAMETERS_SESSION',raw,e.id);
   if(e.requestStatus!==q.status||e.traceStatus!==r.trace.status)add('ENTRY_ACQUISITION_STATUS',raw,e.id);
   if(targets.has(q.session.targetId))add('REUSED_TARGET',q.session.targetId,e.id);targets.add(q.session.targetId);
   if(!Number.isFinite(q.start)||!Number.isFinite(q.finished)||Math.abs(q.elapsed-(q.finished-q.start))>1e-7||!['PASS','TIMEOUT','PROTOCOL_ERROR'].includes(q.status))add('REQUEST_CLOCK_STATUS',raw,e.id);
   if(q.status==='PASS'&&(!Number.isFinite(q.response)||q.response!==q.finished||q.response<q.start||q.elapsed>5000||r.timestamps.T4===null))add('FALSE_REQUEST_PASS',raw,e.id);
   if(q.status!=='PASS'&&r.status==='PASS')add('FAILED_REQUEST_FALSE_TRIAL_PASS',raw,e.id);
   const timing=auditTiming(r);for(const code of timing.errors)add('TIMING:'+code,raw,e.id);
   if(p.kind==='readback'&&r.image.acquisition!=='NOT_REQUESTED')add('AUXILIARY_CAPTURED_IMAGE',raw,e.id);
   if(p.kind==='readback'&&r.status==='PASS'&&(r.request.result?.exceptionDetails||r.readback.actualCompletedCalls!==2))add('AUXILIARY_HANDLER_FALSE_PASS',raw,e.id);
   if(p.kind==='capture'&&r.image.file){const b=read(r.image.file);if(b.length!==r.image.bytes||sha(b)!==r.image.sha256||!b.equals(Buffer.from(q.result?.data??'','base64')))add('IMAGE_HASH_PAYLOAD',raw,e.id);
    const validPixels=r.image.bitmap?.dimensionsMatch&&r.image.bitmap?.imageWidth===2560&&r.image.bitmap?.imageHeight===1800&&r.image.bitmap?.checks?.length===2&&r.image.bitmap.checks.every(c=>c.differentChannels===0);
    if(!validPixels)add('PIXEL_CHECK_INCOMPLETE_OR_MISMATCH',raw,e.id,'E_SCREENSHOT');
   }else if(p.kind==='capture'&&q.status==='PASS')add('SUCCESS_WITHOUT_IMAGE',raw,e.id,'E_SCREENSHOT');
   if(p.trace){
    if(r.trace.status!=='ACQUIRED'){add('TRACE_NOT_OBTAINED',raw,e.id,'G_NOT_ACQUIRED');if(r.status==='PASS')add('MISSING_TRACE_FALSE_PASS',raw,e.id);}
    else{const b=read(r.trace.file);if(b.length!==r.trace.bytes||sha(b)!==r.trace.sha256)add('TRACE_HASH_SIZE',raw,e.id);const data=JSON.parse(gunzipSync(b));if(!Array.isArray(data.traceEvents))throw Error('Trace events absent');const recomputed=analyzeEvents(data.traceEvents,r);
     for(const key of ['clock','endpoints','handlerMarkers','mainWindow'])if(JSON.stringify(r.traceAnalysis?.[key])!==JSON.stringify(recomputed[key]))add('TRACE_ANALYSIS_MISMATCH:'+key,raw,e.id);
     if(recomputed.clock.status!=='BRACKETED'&&r.status==='PASS')add('UNCALIBRATED_FALSE_PASS',raw,e.id);
    }
   }else if(r.trace.file||r.trace.status!=='OFF'||r.traceAnalysis)add('TRACE_OFF_INTERVENED',raw,e.id);
  }catch(error){add('UNREADABLE_RECORD',error,e.id);}
 }
 if(JSON.stringify(list().filter(f=>f.startsWith('raw/')).sort())!==JSON.stringify(expectedRaw.sort()))add('RAW_FILE_SET','Raw/summary set differs');
 for(const s of m.sources??[])try{const b=read(s.copy);if(b.length!==s.bytes||sha(b)!==s.sha256)add('SOURCE_HASH',s.file);}catch(error){add('SOURCE_MISSING',error);}
 const observed=m.runs??[],expectedCounts={all:counts(observed),primary:counts(observed,r=>r.kind==='capture'),auxiliary:counts(observed,r=>r.kind==='readback')};
 if(JSON.stringify(m.counts)!==JSON.stringify(expectedCounts))add('COUNT_MISMATCH','Manifest counts differ');
 const expectedPrimary=plan.filter(p=>p.kind==='capture').length,expectedAux=plan.filter(p=>p.kind==='readback').length,expectedTrace=plan.filter(p=>p.trace).length;
 const structuralValid=!issues.some(i=>i.category==='F_EVIDENCE'),flags=completeness(observed,structuralValid),primary=records.filter(r=>r.plan.kind==='capture'),aux=records.filter(r=>r.plan.kind==='readback'),traced=records.filter(r=>r.plan.trace);
 flags.allTrialsCompleted=observed.length===plan.length&&observed.every(r=>r.finishedUTC);flags.acceptance=flags.allTrialsCompleted&&structuralValid&&observed.every(r=>r.status==='PASS')?'ACCEPTED_OBSERVED_DIAGNOSTIC_WINDOW':'NOT_ACCEPTED';
 flags.primaryRequestsAcquired=flags.allTrialsCompleted&&primary.length===expectedPrimary&&primary.every(r=>r.request?.status==='PASS');
 flags.auxiliaryRepliesAcquired=flags.allTrialsCompleted&&aux.length===expectedAux&&aux.every(r=>r.request?.status==='PASS');
 flags.auxiliaryHandlersCompleted=flags.allTrialsCompleted&&aux.length===expectedAux&&aux.every(r=>r.readback.actualCompletedCalls===2&&!r.request?.result?.exceptionDetails);
 flags.traceEvidenceComplete=flags.allTrialsCompleted&&traced.length===expectedTrace&&traced.every(r=>r.trace.status==='ACQUIRED');
 flags.clockAlignmentComplete=flags.allTrialsCompleted&&traced.length===expectedTrace&&traced.every(r=>r.traceAnalysis?.clock.status==='BRACKETED');flags.evidenceComplete=flags.allTrialsCompleted&&flags.recordsVerified&&flags.primaryRequestsAcquired&&flags.auxiliaryRepliesAcquired&&flags.auxiliaryHandlersCompleted&&flags.traceEvidenceComplete&&flags.clockAlignmentComplete;
 if(issues.length)flags.acceptance='NOT_ACCEPTED';
 return{status:issues.length?'FAIL':'PASS',counts:expectedCounts,issues,completeness:flags,scope:'Diagnostic acquisition/clock/evidence only; no product performance or native-wait certification'};
}
export function auditStageV(root,options={}){
 const read=f=>{const p=path.resolve(root,f);if(!p.startsWith(path.resolve(root)+path.sep))throw Error('Unsafe evidence path');return fs.readFileSync(p);};
 try{const m=JSON.parse(read('manifest.json')),index=fs.existsSync(root+'/artifact-index.json')?JSON.parse(read('artifact-index.json')):null;
  const resolveParameters=p=>acquiredParameters(p,m.sourceBinding??{files:m.sources},read,parametersFor),result=auditRecords(m,read,()=>walk(root).map(f=>path.relative(root,f).replaceAll('\\','/')),{...options,parametersFor:resolveParameters});
  const records=m.runs.filter(e=>e.finishedUTC).map(e=>JSON.parse(gunzipSync(read(e.raw))));result.sourceAudit=m.sourceBinding?auditBinding(root,m,records,index):{status:'UNKNOWN',reason:'LEGACY_RUNTIME_SOURCE_REFERENCE_NOT_OBTAINED'};
  result.auditor={revision:'stage-v-w-audit-1',moduleSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),sourceContract:'stage-w-source-1'};
  result.artifactIndexStatus=index?'VERIFIED_IF_NO_ISSUES':'PENDING_FINALIZATION';
  if(index){for(const code of verifyIndex(index,read,()=>walk(root).map(f=>path.relative(root,f).replaceAll('\\','/'))))result.issues.push({category:'F_EVIDENCE',code:'INDEX:'+code});}
  for(const e of result.sourceAudit.errors??[])result.issues.push({category:'F_EVIDENCE',...e});
  result.completeness.recordsVerified=!result.issues.some(i=>i.category==='F_EVIDENCE');result.completeness.sourceBoundVerified=result.sourceAudit.status==='PASS';
  if(!result.completeness.sourceBoundVerified||!result.completeness.recordsVerified){result.completeness.evidenceComplete=false;result.completeness.acceptance='NOT_ACCEPTED';}
  if(!index){result.completeness.evidenceComplete=false;result.completeness.acceptance='NOT_ACCEPTED_PENDING_INDEX';}
  if(m.sourceBinding&&index?.completeness?.evidenceComplete===true&&!result.completeness.evidenceComplete){result.issues.push({category:'F_EVIDENCE',code:'INDEX_FALSE_COMPLETE'});result.completeness.recordsVerified=false;}
  result.status=result.issues.length?'FAIL':result.sourceAudit.status==='PASS'?'PASS':'PARTIAL';return result;
 }catch(error){return{status:'FAIL',issues:[{category:'F_EVIDENCE',code:'MANIFEST_OR_SOURCE_UNREADABLE',error:String(error)}],completeness:{recordsVerified:false,evidenceComplete:false,acceptance:'NOT_ACCEPTED'}};}
}

function walk(root){return fs.readdirSync(root,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(root,e.name)):[path.join(root,e.name)]);}
export function writeIndex(root,head,ciRunId,flags){const file=root+'/artifact-index.json',manifest=JSON.parse(fs.readFileSync(root+'/manifest.json')),record={head,tree:manifest.tree,sourceBindingId:manifest.sourceBinding?.id??null,diagnosticRevision:manifest.diagnosticContract??'LEGACY',ciRunId,completeness:flags,files:walk(root).filter(f=>path.resolve(f)!==path.resolve(file)).map(f=>{const b=fs.readFileSync(f);return{file:path.relative(root,f).replaceAll('\\','/'),bytes:b.length,sha256:sha(b)};})};fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n');const errors=verifyIndex(record,f=>fs.readFileSync(root+'/'+f),()=>walk(root).map(f=>path.relative(root,f).replaceAll('\\','/')));if(errors.length)throw Error('Artifact index verification failed: '+JSON.stringify(errors));return record;}
export function sealIndex(root,audit){const file=root+'/artifact-index.json',record=JSON.parse(fs.readFileSync(file));record.completeness=audit.completeness;record.sealedAfterFullArtifactReread=true;fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n');const errors=verifyIndex(record,f=>fs.readFileSync(root+'/'+f),()=>walk(root).map(f=>path.relative(root,f).replaceAll('\\','/')));if(errors.length)throw Error('Sealed index differs from evidence: '+JSON.stringify(errors));}
