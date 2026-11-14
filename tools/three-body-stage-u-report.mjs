// Post-acquisition analysis only; never imported into the primary measurement.
import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';import {fileURLToPath} from 'node:url';
import {auditStageU,sha,verifyIndex} from './three-body-stage-u-audit.mjs';
export function report(root){
 const manifest=JSON.parse(fs.readFileSync(root+'/manifest.json')),rows=manifest.runs.filter(r=>r.finishedUTC).map(e=>JSON.parse(gunzipSync(fs.readFileSync(root+'/'+e.raw))));
 const groups=[];for(const context of ['default','readback'])for(const operation of ['A','B','C'])for(const readback of [false,true]){
  const runs=rows.filter(r=>r.plan.context===context&&r.plan.operation===operation&&r.plan.readback===readback);
  groups.push({context,operation,readback,planned:2,completed:runs.length,mainOperationNotSent:runs.filter(r=>!r.operation).length,
   trials:runs.map(r=>({id:r.id,status:r.status,readbackStatus:r.readback.status??(r.readback.enabled&&!r.operation?'NO_REPLY_NATIVE_CALL_COUNT_UNKNOWN':r.readback.enabled?'PASS':'OFF'),requests:r.operation?.requests.map(q=>({method:q.method,status:q.status,start:q.start,response:q.response,finished:q.finished,deadlineObservationMs:q.elapsed,roundTripMs:q.response===null?null:q.response-q.start})),gap:r.operation?.gap??null,image:r.image,issues:r.issues,statesAcquired:!!r.after&&!!r.later}))});
 }
 const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.relative(root,path.join(d,e.name)).replaceAll('\\','/')]);
 const index=JSON.parse(fs.readFileSync(root+'/artifact-index.json')),indexErrors=verifyIndex(index,f=>fs.readFileSync(root+'/'+f),()=>walk(root)),audit=auditStageU(root);
 const screenshots=rows.flatMap(r=>r.operation?.requests.filter(q=>q.method==='Page.captureScreenshot')??[]),layouts=rows.flatMap(r=>r.operation?.requests.filter(q=>q.method==='Page.getLayoutMetrics')??[]),images=rows.filter(r=>r.image.acquisition==='ACQUIRED');
 return{schema:1,head:manifest.head,ciRunId:manifest.ciRunId,environment:manifest.environment,browser:rows.find(r=>r.browser)?.browser,fixture:manifest.fixture,sources:manifest.sources,counts:manifest.counts,
  requests:{layout:{planned:16,sent:layouts.length,pass:layouts.filter(q=>q.status==='PASS').length},capture:{planned:16,sent:screenshots.length,pass:screenshots.filter(q=>q.status==='PASS').length,timeout:screenshots.filter(q=>q.status==='TIMEOUT').length,protocolError:screenshots.filter(q=>q.status==='PROTOCOL_ERROR').length,notSent:16-screenshots.length},mainOperationsNotSent:rows.filter(r=>!r.operation).length},
  images:{acquired:images.length,pngSha256:[...new Set(images.map(r=>r.image.sha256))],decodedBitmapSha256:[...new Set(images.map(r=>r.image.postPixels?.decodedSha256))],zeroCanvasChannelDifferences:images.every(r=>r.image.bitmap?.checks.length===2&&r.image.bitmap.checks.every(c=>c.differentChannels===0)),zeroBeforeAfterDifferences:images.filter(r=>r.plan.readback).every(r=>r.image.postPixels?.beforeAfter?.every(c=>c.differentChannels===0))},
  audit,indexErrors,indexSha256:sha(fs.readFileSync(root+'/artifact-index.json')),groups,
  limits:['Only two samples per cell; no tail guarantees','Timeout with null response is a deadline observation, not an actual CDP round-trip measurement','CDP round trip includes harness/transport/browser execution and scheduling; internal CPU/native/OS cause UNKNOWN','Frozen fixture frame30 is not a live physics step','Old readback timeout telemetry zero completed calls does not establish zero actual native calls','Wire session/request IDs are not exposed by the public Playwright API; logical IDs and target ID are recorded']};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const value=report(process.argv[2]);if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(value,null,2)+'\n');else console.log(JSON.stringify(value));
 if(value.indexErrors.length||!value.audit.completeness.rawAndSummaryVerified)process.exitCode=1;
}
