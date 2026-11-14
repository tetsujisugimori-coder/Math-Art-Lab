import {it,expect} from 'vitest';import {verifyIndex,sha,auditRecords} from '../tools/three-body-stage-u-audit.mjs';import {stageUPlans} from '../tools/three-body-stage-u-contracts.mjs';
import {gzipSync} from 'node:zlib';
import {sourceFiles,captureParameters,methodsFor} from '../tools/three-body-stage-u-contracts.mjs';
function completeEvidence(){
 const files=new Map(),plans=stageUPlans(),state={step:30,bStep:30,a:'30',b:'30',observed:'30',playing:false,timer:false,raf:false};
 // Use the actual state shape checked by stoppedFrame, rather than weakening it.
 const frozen=JSON.parse(JSON.stringify(state));
 const manifest={plans,runs:[],sources:sourceFiles.map((file,i)=>{const b=Buffer.from(file),copy='sources/'+i;files.set(copy,b);return{file,copy,bytes:b.length,sha256:sha(b)};}),counts:{planned:24,completed:24,failed:0,unexecuted:0}};
 for(const p of plans){
  const session={targetId:p.id,logicalId:p.id},requests=methodsFor(p.operation).map((method,i)=>({method,params:method==='Page.getLayoutMetrics'?{}:captureParameters,session,start:10+i*3,response:11+i*3,finished:11+i*3,elapsed:1,timeoutMs:5000,status:'PASS',result:method==='Page.captureScreenshot'?{data:Buffer.from('synthetic image bytes').toString('base64')}:{}}));
  const image=p.operation==='A'?{acquisition:'NOT_REQUESTED'}:{acquisition:'ACQUIRED',file:'images/'+p.id+'.png',bytes:21,sha256:sha(Buffer.from('synthetic image bytes')),bitmap:{dimensionsMatch:true,checks:[{differentChannels:0},{differentChannels:0}]}};
  if(image.file)files.set(image.file,Buffer.from('synthetic image bytes'));
  const r={id:p.id,plan:p,status:'PASS',issues:[],finishedUTC:'2026-11-11T00:00:00Z',session,operation:{requests,gap:p.operation==='C'?2:null,captureStatus:p.operation==='A'?'NOT_REQUESTED':'PASS'},explicitMeasuredCalls:requests.map(({method})=>({method})),readback:{enabled:p.readback,completedGetImageDataCalls:p.readback?2:0},image,before:frozen,after:frozen,later:frozen};
  const s={id:r.id,plan:r.plan,status:r.status,issues:r.issues,requests:requests.map(({result,...rest})=>({...rest,result:result.data?{imagePayload:'stored in raw and original PNG'}:result})),gap:r.operation.gap,captureStatus:r.operation.captureStatus,image,before:r.before,after:r.after,later:r.later};
  const raw='raw/'+p.id+'.json.gz',summary='raw/'+p.id+'-summary.json',decoded=Buffer.from(JSON.stringify(r)),encoded=gzipSync(decoded),sb=Buffer.from(JSON.stringify(s));files.set(raw,encoded);files.set(summary,sb);
  manifest.runs.push({id:p.id,status:r.status,finishedUTC:r.finishedUTC,raw,summary,bytes:encoded.length,sha256:sha(encoded),decodedSha256:sha(decoded),summarySha256:sha(sb)});
 }
 return{manifest,files,read:f=>{if(!files.has(f))throw Error('missing '+f);return files.get(f);},list:()=>[...files.keys()]};
}
it('accepts an internally consistent24-trial evidence set, then rejects a rewritten summary even when its hash is updated',()=>{
 const x=completeEvidence();let a=auditRecords(x.manifest,x.read,x.list);expect(a.issues).toEqual([]);expect(a.status).toBe('PASS');expect(a.completeness.captureEvidenceComplete).toBe(true);
 const entry=x.manifest.runs.find(r=>r.id.includes('-C-')),summary=JSON.parse(x.files.get(entry.summary));summary.gap=999;const changed=Buffer.from(JSON.stringify(summary));x.files.set(entry.summary,changed);entry.summarySha256=sha(changed);
 a=auditRecords(x.manifest,x.read,x.list);expect(a.status).toBe('FAIL');expect(a.issues.some(i=>i.code==='SUMMARY_CONTENT')).toBe(true);expect(a.completeness.rawAndSummaryVerified).toBe(false);
});
it('detects artifact corruption, size mismatch, missing members, extra members and duplicates',()=>{
 const b=Buffer.from('original'),map=new Map([['raw/a',b]]),read=f=>{if(!map.has(f))throw Error('missing');return map.get(f);},list=()=>[...map.keys()];const index={files:[{file:'raw/a',bytes:b.length,sha256:sha(b)}]};expect(verifyIndex(index,read,list)).toEqual([]);
 map.set('raw/a',Buffer.from('tampered'));expect(verifyIndex(index,read,list).length).toBeGreaterThan(0);map.set('raw/a',b);
 expect(verifyIndex({files:[{...index.files[0],bytes:0}]},read,list)).toContain('INDEX_HASH_SIZE:raw/a');map.set('extra',Buffer.from('x'));expect(verifyIndex(index,read,list)).toContain('INDEX_FILE_SET');map.delete('extra');map.delete('raw/a');expect(verifyIndex(index,read,list).length).toBeGreaterThan(0);
 expect(verifyIndex({files:[...index.files,...index.files]},read,()=>['raw/a'])).toContain('INDEX_FILE_SET');
});
it('does not turn24 unexecuted planned trials into available accepted measurements',()=>{
 const plans=stageUPlans(),m={plans,runs:plans.map(p=>({id:p.id,status:'BLOCKED'})),counts:{planned:24,completed:0,failed:0,unexecuted:24},sources:[]};
 const a=auditRecords(m,()=>{throw Error('absent');},()=>[]);expect(a.status).toBe('FAIL');expect(a.counts.unexecuted).toBe(24);expect(a.completeness.allTrialsCompleted).toBe(false);expect(a.completeness.measurementRecordsComplete).toBe(false);expect(a.completeness.captureEvidenceComplete).toBe(false);expect(a.completeness.acceptance).toBe('NOT_ACCEPTED');
});
it('detects a missing, duplicate or changed plan instead of accepting its count',()=>{
 const plans=stageUPlans();for(const p of [plans.slice(1),[...plans.slice(1),plans[1]],plans.map((p,i)=>i? p:{...p,readback:true})]){
 const a=auditRecords({plans:p,runs:[],counts:{planned:24,completed:0,failed:0,unexecuted:24}},()=>Buffer.from(''),()=>[]);expect(a.issues.some(i=>i.code==='PLAN_MISMATCH')).toBe(true);expect(a.status).toBe('FAIL');}
});
