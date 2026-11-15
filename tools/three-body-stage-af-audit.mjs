import {isDeepStrictEqual as equal} from 'node:util';
import {analyze,validateResult} from './three-body-stage-ae-analyze.mjs';
import {plans,validatePlan} from './three-body-stage-ae-run.mjs';
import {digest,read,json,descriptor,binding} from './three-body-stage-af-records.mjs';

// The returned index is posthoc evidence. Retain it in a separate trusted archive.
export function createIndex(root) {
  const m=json(root,'source-manifest.json');
  const files=['run-plan.json','source-manifest.json','bundle.mjs','bootstrap.mjs','preflight-contract.json','cohort.json',...plans.flatMap(p=>[p.id+'.result.json',p.id+'.clock.jsonl']),...plans.map((_,i)=>`checkpoint-${i+1}.json`),...m.rows.map(r=>r.snapshot)];
  const missing=[],rows=[];
  for(const file of files)try{rows.push(descriptor(root,file));}catch{missing.push(file);}
  return {schema:'af-posthoc-1',acquisition:'POSTHOC',createdUTC:new Date().toISOString(),files:rows,missing};
}

export function audit(root,index,summary) {
  const errors=[],rows=[];
  const check=(ok,e)=>{if(!ok)errors.push(e);};
  try {
    check(index?.schema==='af-posthoc-1'&&index.acquisition==='POSTHOC','INDEX_SCHEMA');
    check(Array.isArray(index.missing)&&index.missing.length===0,'NOT_OBTAINED');
    const regenerated=createIndex(root);
    check(equal(index.files,regenerated.files)&&equal(index.missing,regenerated.missing),'FILE_SET_SIZE_SHA');
    const m=json(root,'source-manifest.json'),p=json(root,'run-plan.json'),c=json(root,'cohort.json'),contract=json(root,'preflight-contract.json');
    check(validatePlan(p,m,contract),'PLAN');
    check(digest(read(root,'preflight-contract.json'))===p.contractSha256,'CONTRACT_SHA');
    check(digest(read(root,'source-manifest.json'))===p.manifestSha256,'MANIFEST_SHA');
    check(digest(read(root,'bundle.mjs'))===p.bundleSha256&&descriptor(root,'bundle.mjs').bytes===m.bundle.bytes,'BUNDLE');
    check(digest(read(root,'bootstrap.mjs'))===p.bootstrapSha256&&p.bootstrapSha256===m.bootstrapSha256,'BOOTSTRAP');
    check(/^[a-f0-9]{40}$/.test(m.head)&&/^[a-f0-9]{40}$/.test(m.tree),'HEAD_TREE');
    check(equal(c.plans,plans)&&c.rows?.length===4&&c.browserLaunches===0&&c.originalTestRuns===0,'COHORT');
    for(const source of m.rows) {
      check(source.head===m.head&&source.tree===m.tree,'SOURCE_IDENTITY:'+source.file);
      const d=descriptor(root,source.snapshot);
      check(d.bytes===source.bytes&&d.sha256===source.sha256,'SOURCE_BYTES:'+source.file);
    }
    for(const [i,plan] of plans.entries()) {
      const run=c.rows[i],r=json(root,plan.id+'.result.json');
      check(run?.id===plan.id&&run?.mode===plan.mode,'ID_MODE:'+plan.id);
      check(equal(json(root,`checkpoint-${i+1}.json`),c.rows.slice(0,i+1)),'CHECKPOINT:'+plan.id);
      const resultErrors=validateResult(r,plan);
      check(resultErrors.length===0,'RESULT:'+plan.id+':'+resultErrors.join(','));
      const raw=read(root,plan.id+'.clock.jsonl').toString('utf8');
      check(raw.endsWith('\n'),'CLOCK_TRUNCATED:'+plan.id);
      const clocks=raw.trimEnd().split('\n').map(x=>JSON.parse(x));
      check(equal(clocks.map(x=>x.event),['before-import','after-import','before-body','after-body','result-saved']),'CLOCK_EVENTS:'+plan.id);
      check(clocks.every((x,j)=>Number.isFinite(x.at)&&x.clock==='performance.now'&&x.pid===run.pid&&x.pid===r.start.pid&&(!j||x.at>=clocks[j-1].at)),'CLOCK_DOMAIN:'+plan.id);
      check(clocks[2].at<=r.start.at&&r.end.at<=clocks[3].at,'CLOCK_BODY:'+plan.id);
      let runtimeAttribution='NOT_OBTAINED';
      if(Object.hasOwn(run,'runtimeReceipt')) {
        const rawIdentity=r.id===plan.id&&clocks.every(x=>x.id===plan.id&&x.mode===plan.mode);
        check(rawIdentity,'RUNTIME_RAW_ID_MODE:'+plan.id);
        const receipt={schema:'af-runtime-1',acquisition:'EXECUTION_CHECKPOINT',runtimeHead:m.head,runtimeTree:m.tree,...binding(root,plan,i+1)};
        check(equal(run.runtimeReceipt,receipt),'RUNTIME_BINDING:'+plan.id);
        runtimeAttribution=rawIdentity&&equal(run.runtimeReceipt,receipt)?'VERIFIED':'FAIL';
      }
      rows.push({id:plan.id,mode:plan.mode,runtimeAttribution,posthocAttribution:'POSTHOC_VERIFIED',binding:binding(root,plan,i+1),executionStatus:run.executionStatus,observationStatus:run.observationStatus,bodyWallMs:r.envelope.wallMs,counts:{energy:r.energyCalls,assertions:r.assertions,...r.counters},finalBits:r.finalBits,referenceBits:r.referenceBits,historyHash:r.historyHash});
    }
    const analysis=analyze(root);
    check(analysis.status==='PASS','ANALYSIS:'+analysis.status);
    check(summary!==undefined,'SUMMARY_NOT_OBTAINED');
    if(summary!==undefined)check(equal(summary,analysis),'SUMMARY_MISMATCH');
    return {status:errors.length?'FAIL':'PASS',errors,rows:rows.map(r=>({...r,posthocAttribution:errors.length?'FAIL':r.posthocAttribution})),analysis,rootCause:'UNKNOWN',performanceImprovement:'NOT_TESTED'};
  } catch(error) {
    return {status:'FAIL',errors:[...errors,'EVIDENCE_MISSING_OR_INVALID:'+String(error)],rows:rows.map(r=>({...r,posthocAttribution:'FAIL'})),rootCause:'UNKNOWN',performanceImprovement:'NOT_TESTED'};
  }
}
