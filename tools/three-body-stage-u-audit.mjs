import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {gunzipSync} from 'node:zlib';import {stageUPlans,methodsFor,captureParameters,stoppedFrame,sourceFiles} from './three-body-stage-u-contracts.mjs';
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function auditRecords(manifest,read,list){
 const issues=[],rows=[];const add=(category,code,error,id=null)=>issues.push({category,code,error:String(error),id});
 const plans=stageUPlans();if(JSON.stringify(manifest.plans)!==JSON.stringify(plans)||manifest.runs?.length!==24)add('F_EVIDENCE','PLAN_MISMATCH','Fixed24-entry plan differs');
 if(JSON.stringify(manifest.sources?.map(s=>s.file).sort())!==JSON.stringify([...sourceFiles].sort()))add('F_EVIDENCE','SOURCE_SET','Required source version set absent or changed');
 const ids=new Set(),expectedRaw=[];let completed=0,measurementRecordsComplete=true;
 for(const entry of manifest.runs??[]){
  if(ids.has(entry.id))add('F_EVIDENCE','DUPLICATE_ID',entry.id);ids.add(entry.id);
  const plan=plans.find(p=>p.id===entry.id);if(!plan){add('F_EVIDENCE','UNKNOWN_ID',entry.id);continue;}
  if(!entry.finishedUTC){add('G_NOT_ACQUIRED','UNEXECUTED',entry.status,entry.id);measurementRecordsComplete=false;continue;}
  completed++;const raw='raw/'+entry.id+'.json.gz',summary='raw/'+entry.id+'-summary.json';expectedRaw.push(raw,summary);
  if(entry.raw!==raw||entry.summary!==summary){add('F_EVIDENCE','RAW_PATH',entry.id);continue;}
  try{
   const encoded=read(raw),decoded=gunzipSync(encoded),r=JSON.parse(decoded),sb=read(summary),s=JSON.parse(sb);
   if(sha(encoded)!==entry.sha256||sha(decoded)!==entry.decodedSha256||sha(sb)!==entry.summarySha256||encoded.length!==entry.bytes)add('F_EVIDENCE','HASH_SIZE',raw,entry.id);
   if(r.id!==entry.id||s.id!==entry.id||JSON.stringify(r.plan)!==JSON.stringify(plan)||entry.status!==r.status||entry.finishedUTC!==r.finishedUTC||s.status!==r.status||JSON.stringify(s.issues)!==JSON.stringify(r.issues))add('F_EVIDENCE','RAW_SUMMARY_PLAN',raw,entry.id);
   const expectedSummary={id:r.id,plan:r.plan,status:r.status,issues:r.issues,requests:r.operation?.requests.map(({result,...rest})=>({...rest,result:result?.data?{imagePayload:'stored in raw and original PNG'}:result})),gap:r.operation?.gap??null,captureStatus:r.operation?.captureStatus??'NOT_TESTED',image:r.image,before:r.before,after:r.after,later:r.later};
   if(JSON.stringify(s)!==JSON.stringify(expectedSummary))add('F_EVIDENCE','SUMMARY_CONTENT',summary,entry.id);
   issues.push(...(r.issues??[]).map(i=>({...i,id:entry.id})));
   if(!r.operation){measurementRecordsComplete=false;add('G_NOT_ACQUIRED','MEASUREMENT_ABSENT',raw,entry.id);rows.push(r);continue;}
   const req=r.operation.requests,expected=methodsFor(plan.operation),blocked=plan.operation==='C'&&req.length===1&&req[0].status!=='PASS';
   const actual=req.map(r=>r.method);if(JSON.stringify(actual)!==JSON.stringify(blocked?expected.slice(0,1):expected)||JSON.stringify(r.explicitMeasuredCalls?.map(r=>r.method))!==JSON.stringify(actual))add('F_EVIDENCE','METHOD_SEQUENCE',actual,entry.id);
   for(const request of req){
    if(JSON.stringify(request.params)!==JSON.stringify(request.method==='Page.getLayoutMetrics'?{}:captureParameters)||request.session.targetId!==r.session.targetId||request.session.logicalId!==r.session.logicalId)add('F_EVIDENCE','PARAMETER_SESSION',request.method,entry.id);
    if(!Number.isFinite(request.start)||!Number.isFinite(request.finished)||Math.abs(request.elapsed-(request.finished-request.start))>1e-7||request.timeoutMs!==5000||!['PASS','TIMEOUT','PROTOCOL_ERROR'].includes(request.status))add('F_EVIDENCE','REQUEST_CLOCK_STATUS',request.method,entry.id);
    if(request.status==='PASS'&&(!Number.isFinite(request.response)||request.elapsed>5000))add('F_EVIDENCE','FALSE_REQUEST_PASS',request.method,entry.id);
   }
   if(plan.operation==='A'&&(r.image.acquisition!=='NOT_REQUESTED'||req.some(r=>r.method==='Page.captureScreenshot')))add('F_EVIDENCE','LAYOUT_ONLY_CAPTURE',raw,entry.id);
   if(plan.operation==='C'&&!blocked&&(req.length!==2||Math.abs(r.operation.gap-(req[1].start-req[0].response))>1e-7))add('F_EVIDENCE','SEQUENTIAL_GAP',raw,entry.id);
   if(r.readback.enabled!==plan.readback||(r.readback.completedGetImageDataCalls??r.readback.explicitGetImageDataCalls)!==(plan.readback?2:0))add('F_EVIDENCE','READBACK_POLICY',raw,entry.id);
   if(r.image.file){const b=read(r.image.file);if(sha(b)!==r.image.sha256||b.length!==r.image.bytes||!b.equals(Buffer.from(r.operation.requests.find(q=>q.method==='Page.captureScreenshot')?.result?.data??'','base64')))add('F_EVIDENCE','IMAGE_HASH_SIZE',r.image.file,entry.id);}
   if(r.status==='PASS'&&(!r.before||!r.after||!r.later))add('F_EVIDENCE','PASS_STATE_MISSING',raw,entry.id);
   if(r.after&&(!stoppedFrame(r.before)||!stoppedFrame(r.after)||!stoppedFrame(r.later)))add('B_STOP_DISPLAY','FRAME_OR_PENDING_WORK',raw,entry.id);
   rows.push(r);
  }catch(error){measurementRecordsComplete=false;add('F_EVIDENCE','RAW_OR_SUMMARY_UNREADABLE',error,entry.id);}
 }
 const actualRaw=list().filter(f=>f.startsWith('raw/')).sort();if(JSON.stringify(actualRaw)!==JSON.stringify(expectedRaw.sort()))add('F_EVIDENCE','RAW_FILE_SET','Actual raw/summary set differs');
 for(const source of [...(manifest.sources??[]),...(manifest.resume?.sources??[])]){try{const b=read(source.copy);if(sha(b)!==source.sha256||b.length!==source.bytes)add('F_EVIDENCE','SOURCE_HASH',source.copy);}catch(error){add('F_EVIDENCE','SOURCE_MISSING',error);}}
 const failed=rows.filter(r=>r.status!=='PASS').length,counts={planned:24,completed,failed,unexecuted:24-completed};
 if(JSON.stringify(manifest.counts)!==JSON.stringify(counts))add('F_EVIDENCE','COUNT_MISMATCH',JSON.stringify(manifest.counts));
 const structural=issues.filter(i=>i.category==='F_EVIDENCE');
 const completeness={allTrialsCompleted:completed===24,rawAndSummaryVerified:structural.length===0,measurementRecordsComplete,captureEvidenceComplete:completed===24&&measurementRecordsComplete&&rows.every(r=>r.plan.operation==='A'||(r.image.acquisition==='ACQUIRED'&&r.image.bitmap?.dimensionsMatch&&r.image.bitmap.checks.every(c=>c.differentChannels===0))),acceptance:issues.length?'NOT_ACCEPTED':'ACCEPTED_OBSERVED_CDP_WINDOW'};
 return{status:issues.length?'FAIL':'PASS',counts,issues,completeness,scope:'Protocol RTT/frozen diagnostic frame only; no claim of product performance, internal CPU or live-physics validation'};
}
export function auditStageU(root){const read=f=>{const file=path.resolve(root,f);if(!file.startsWith(path.resolve(root)+path.sep))throw Error('Unsafe evidence path');return fs.readFileSync(file);};const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.relative(root,path.join(d,e.name)).replaceAll('\\','/')]);try{return auditRecords(JSON.parse(read('manifest.json')),read,()=>walk(root));}catch(error){return{status:'FAIL',issues:[{category:'F_EVIDENCE',code:'MANIFEST_UNREADABLE',error:String(error)}],completeness:{allTrialsCompleted:false,rawAndSummaryVerified:false,measurementRecordsComplete:false,captureEvidenceComplete:false,acceptance:'NOT_ACCEPTED'}};}}
export function verifyIndex(index,read,list){
 const errors=[];if(!Array.isArray(index.files))return['INDEX_SCHEMA'];
 const actual=list().filter(f=>f!=='artifact-index.json').sort(),expected=index.files.map(r=>r.file).sort();
 if(new Set(expected).size!==expected.length||JSON.stringify(actual)!==JSON.stringify(expected))errors.push('INDEX_FILE_SET');
 for(const r of index.files)try{if(r.file.startsWith('/')||r.file.includes('..')||/^[A-Z]:/i.test(r.file))throw Error('Unsafe path');const b=read(r.file);if(b.length!==r.bytes||sha(b)!==r.sha256)errors.push('INDEX_HASH_SIZE:'+r.file);}catch(error){errors.push('INDEX_UNREADABLE:'+r.file);}
 return errors;
}
