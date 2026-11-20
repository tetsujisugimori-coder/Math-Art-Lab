import {it,expect} from 'vitest';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {validateResult,bodyBits,analyze} from '../tools/three-body-stage-ae-analyze.mjs';
import {interval} from '../tools/three-body-stage-ae-observer.mjs';
import {plans,validatePlan} from '../tools/three-body-stage-ae-run.mjs';
import {categoryCalls,wallTolerance} from '../tools/three-body-stage-af-timing.mjs';
import {runtimeReceipt,runtimeIdentity,digest,json} from '../tools/three-body-stage-af-records.mjs';
import {createIndex,audit} from '../tools/three-body-stage-af-audit.mjs';
import {captureReport,verifyReport} from '../tools/three-body-stage-af-report.mjs';
const point=(at,pid=1)=>({at,pid,tid:0,clock:'performance.now',cpu:{user:at,system:0},thread:{user:at,system:0}});
function result(mode='ON',pid=1) {
  const bodies=Array.from({length:3},()=>({m:1,x:0,y:0,vx:0,vy:0})),start=point(2,pid),end=point(12,pid);
  return {mode,result:{p:{steps:126518,bodies},max:1e-7},referenceBodies:bodies,finalBits:bodyBits(bodies),referenceBits:bodyBits(bodies),historyHash:'a'.repeat(64),energyCalls:12652,assertions:126520,counters:{rkSteps:632590,rhs:2530360},finalRms:0,start,end,envelope:interval(start,end),unclassifiedWallMs:mode==='ON'?4:null,categories:Object.fromEntries(Object.entries(categoryCalls).map(([k,calls])=>[k,{calls,observed:mode==='ON'?calls:0,threadObserved:mode==='ON'?calls:0,wallMs:mode==='ON'?1:0,cpuUs:mode==='ON'?1000:0,threadUs:mode==='ON'?500:0}]))};
}
const save=(root,name,value)=>fs.writeFileSync(root+'/'+name,JSON.stringify(value));
function fixture(runtime=false) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'af-contract-'));
  fs.writeFileSync(root+'/bundle.mjs','mock bundle');fs.writeFileSync(root+'/bootstrap.mjs','mock bootstrap');
  const contract={success:true,numFailedTests:0,numPassedTests:29};save(root,'preflight-contract.json',contract);
  fs.writeFileSync(root+'/source.txt','mock source');
  const sources=[{file:'source.txt',snapshot:'source.txt',bytes:11,sha256:digest('mock source'),head:'a'.repeat(40),tree:'b'.repeat(40)}];
  const manifest={...(runtime?{runtimeBinding:'af-runtime-1'}:{}),head:'a'.repeat(40),tree:'b'.repeat(40),rows:sources,sourceSetSha256:digest(JSON.stringify(sources)),bundle:{bytes:11,sha256:digest('mock bundle')},bootstrapSha256:digest('mock bootstrap')};
  save(root,'source-manifest.json',manifest);
  save(root,'run-plan.json',{schema:'ae-fixed-4-1',...(runtime?{runtimeBinding:'af-runtime-1'}:{}),plans,timeout:30000,sourceSetSha256:manifest.sourceSetSha256,bundleSha256:manifest.bundle.sha256,bootstrapSha256:manifest.bootstrapSha256,manifestSha256:digest(fs.readFileSync(root+'/source-manifest.json')),contractSha256:digest(fs.readFileSync(root+'/preflight-contract.json')),executionAuthorized:false,browserLaunches:0,gateAudit:'PASS'});
  const rows=[];
  for(const [i,p] of plans.entries()) {
    save(root,p.id+'.result.json',{...(runtime?{id:p.id}:{}),...result(p.mode,i+1)});
    fs.writeFileSync(root+'/'+p.id+'.clock.jsonl',['before-import','after-import','before-body','after-body','result-saved'].map((event,j)=>JSON.stringify({event,...(runtime?{id:p.id,mode:p.mode}:{}),pid:i+1,clock:'performance.now',at:[0,1,2,12,13][j]})).join('\n')+'\n');
    rows.push({...p,pid:i+1,executionStatus:'PASS',observationStatus:'PASS',acceptance:'PASS',errors:[],parent:{wallMs:15},...(runtime?{runtimeReceipt:runtimeReceipt(root,p,i+1,{runtimeHead:manifest.head,runtimeTree:manifest.tree})}:{})});
    save(root,`checkpoint-${i+1}.json`,rows);
  }
  save(root,'cohort.json',{plans,rows,browserLaunches:0,originalTestRuns:0});
  return root;
}
it.each(['ON','OFF'])('accepts normal %s without mixing wall and CPU',mode=>expect(validateResult(result(mode))).toEqual([]));
it('checks actual runtime HEAD and tree before accepting a receipt',()=>{const root=fixture();try{expect(runtimeIdentity(root,(...args)=>args.at(-1)==='HEAD'?'a'.repeat(40):'b'.repeat(40))).toEqual({runtimeHead:'a'.repeat(40),runtimeTree:'b'.repeat(40)});for(const field of ['HEAD','HEAD^{tree}'])expect(()=>runtimeIdentity(root,(...args)=>args.at(-1)===field?'c'.repeat(40):args.at(-1)==='HEAD'?'a'.repeat(40):'b'.repeat(40))).toThrow('RUNTIME_GIT_DRIFT');}finally{fs.rmSync(root,{recursive:true});}});
const mutations={
  verlet:r=>r.categories.verlet.wallMs++,assertion:r=>r.categories.assertion.wallMs++,rk4:r=>r.categories.rk4.wallMs++,
  unclassified:r=>r.unclassifiedWallMs++,body:r=>{r.end.at++;r.envelope.wallMs++;},
  missing:r=>delete r.categories.rk4,extra:r=>r.categories.extra={...r.categories.rk4},
  mode:r=>r.mode='OFF',id:r=>r.id='ae-A1',count:r=>r.categories.verlet.calls++,observed:r=>r.categories.verlet.observed--,
};
it.each(Object.keys(mutations))('rejects independent timing/plan mutation %s',kind=>{const r=result();mutations[kind](r);expect(validateResult(r,plans[1]).length).toBeGreaterThan(0);});
it.each([undefined,null,NaN,Infinity,-Infinity,-1])('rejects invalid required wall value %s',value=>{
  for(const key of ['unclassifiedWallMs','body',...Object.keys(categoryCalls)]){
    const r=result();if(key==='unclassifiedWallMs')r[key]=value;else if(key==='body')r.envelope.wallMs=value;else r.categories[key].wallMs=value;
    expect(validateResult(r).length).toBeGreaterThan(0);
  }
});
it.each(['wallMs','cpuUs','threadUs','threadObserved','observed','unclassified'])('rejects OFF false measurement %s',key=>{const r=result('OFF');if(key==='unclassified')r.unclassifiedWallMs=0;else r.categories.rk4[key]=1;expect(validateResult(r).length).toBeGreaterThan(0);});
it('rejects ON/OFF plan exchange even with internally coherent timings',()=>expect(validateResult(result('OFF'),plans[1])).toContain('PLAN_ID_MODE'));
it('fixed tolerance accepts rounding, rejects negative residual without clamping',()=>{const r=result();r.unclassifiedWallMs+=wallTolerance(10)/2;expect(validateResult(r)).toEqual([]);r.unclassifiedWallMs=-Number.EPSILON;expect(validateResult(r).length).toBeGreaterThan(0);});
it.each([false,true])('verifies complete posthoc/runtime fixture %s',runtime=>{const root=fixture(runtime);try{const a=audit(root,createIndex(root),analyze(root));expect(a.errors).toEqual([]);expect(a.status).toBe('PASS');expect(a.rows.every(r=>r.runtimeAttribution===(runtime?'VERIFIED':'NOT_OBTAINED'))).toBe(true);}finally{fs.rmSync(root,{recursive:true});}});
const faults={
  'result-replacement':root=>fs.copyFileSync(root+'/ae-B2.result.json',root+'/ae-B1.result.json'),
  'clock-replacement':root=>fs.copyFileSync(root+'/ae-B2.clock.jsonl',root+'/ae-B1.clock.jsonl'),
  'trial-replacement':root=>{for(const suffix of ['result.json','clock.jsonl'])fs.copyFileSync(root+'/ae-B2.'+suffix,root+'/ae-B1.'+suffix);},
  'size':root=>fs.appendFileSync(root+'/ae-B1.result.json',' '),
  'sha':root=>{const r=json(root,'ae-B1.result.json');r.historyHash='b'.repeat(64);save(root,'ae-B1.result.json',r);},
  'id':root=>{const c=json(root,'cohort.json');c.rows[1].id='ae-B2';save(root,'cohort.json',c);},
  'mode':root=>{const r=json(root,'ae-B1.result.json');r.mode='OFF';save(root,'ae-B1.result.json',r);},
  'checkpoint':root=>save(root,'checkpoint-2.json',[]),
  'missing-result':root=>fs.unlinkSync(root+'/ae-B1.result.json'),
  'missing-clock':root=>fs.unlinkSync(root+'/ae-B1.clock.jsonl'),
  'missing-checkpoint':root=>fs.unlinkSync(root+'/checkpoint-4.json'),
  'truncated-json':root=>fs.writeFileSync(root+'/ae-B1.result.json','{"mode":'),
  'truncated-jsonl':root=>fs.appendFileSync(root+'/ae-B1.clock.jsonl','{"event":'),
  'missing-newline':root=>fs.writeFileSync(root+'/ae-B1.clock.jsonl',fs.readFileSync(root+'/ae-B1.clock.jsonl','utf8').trimEnd()),
  'clock-domain':root=>fs.writeFileSync(root+'/ae-B1.clock.jsonl',fs.readFileSync(root+'/ae-B1.clock.jsonl','utf8').replaceAll('performance.now','cpuUsage')),
  'source':root=>fs.writeFileSync(root+'/source.txt','wrong'),
  'bundle':root=>fs.writeFileSync(root+'/bundle.mjs','wrong'),
  'plan-id':root=>{const p=json(root,'run-plan.json');p.plans[1].id='ae-B2';save(root,'run-plan.json',p);},
  'head':root=>{const m=json(root,'source-manifest.json');m.head='c'.repeat(40);save(root,'source-manifest.json',m);},
  'failure':root=>{const c=json(root,'cohort.json');c.rows[0].observationStatus='FAIL';c.rows[0].errors=['old failure'];save(root,'cohort.json',c);},
};
it.each(Object.keys(faults))('rejects P3 copied evidence fault %s',kind=>{const root=fixture(true);try{const index=createIndex(root);const summary=analyze(root);faults[kind](root);expect(audit(root,index,summary).status).toBe('FAIL');}finally{fs.rmSync(root,{recursive:true});}});
it('rejects summary-only alteration',()=>{const root=fixture();try{const index=createIndex(root),summary=analyze(root);summary.rows[0].numericalHash='forged';expect(audit(root,index,summary).errors).toContain('SUMMARY_MISMATCH');}finally{fs.rmSync(root,{recursive:true});}});
it('requires final summary, verifies saved raw bytes, and rejects forged resealed summary',()=>{const root=fixture(),out=root+'/report';try{expect(audit(root,createIndex(root)).status).toBe('FAIL');expect(captureReport(root,out).status).toBe('PASS');fs.writeFileSync(out+'/summary.json','{"status":"PASS","rows":[]}');expect(verifyReport(root,out).status).toBe('FAIL');const index=json(out,'audit-index.json'),b=fs.readFileSync(out+'/summary.json');index.summary={file:'summary.json',bytes:b.length,sha256:digest(b)};save(out,'audit-index.json',index);expect(verifyReport(root,out).errors).toContain('SUMMARY_MISMATCH');}finally{fs.rmSync(root,{recursive:true});}});
it.each(['runtimeHead','runtimeTree','id','mode','checkpoint','head','tree','sourceSetSha256','bundleSha256','result','clock','plan'])('independently rejects runtime receipt contradiction %s after posthoc reseal',key=>{const root=fixture(true);try{const c=json(root,'cohort.json');c.rows[0].runtimeReceipt[key]='forged';save(root,'cohort.json',c);for(let i=1;i<=4;i++)save(root,`checkpoint-${i}.json`,c.rows.slice(0,i));expect(audit(root,createIndex(root),analyze(root)).errors).toContain('RUNTIME_BINDING:ae-A1');}finally{fs.rmSync(root,{recursive:true});}});
it.each(['raw-identity','manifest-contract'])('rejects missing future receipts at first audit: %s',kind=>{
  const root=fixture(kind==='raw-identity');
  try {
    const c=json(root,'cohort.json');
    c.rows.forEach(r=>delete r.runtimeReceipt);
    save(root,'cohort.json',c);
    for(let i=1;i<=4;i++)save(root,`checkpoint-${i}.json`,c.rows.slice(0,i));
    if(kind==='manifest-contract'){
      const m=json(root,'source-manifest.json'),p=json(root,'run-plan.json');
      m.runtimeBinding='af-runtime-1';save(root,'source-manifest.json',m);
      p.runtimeBinding='af-runtime-1';p.manifestSha256=digest(fs.readFileSync(root+'/source-manifest.json'));save(root,'run-plan.json',p);
    }
    const a=audit(root,createIndex(root),analyze(root));
    expect(a.status).toBe('FAIL');
    for(const p of plans)expect(a.errors).toContain('RUNTIME_RECEIPT_NOT_OBTAINED:'+p.id);
    expect(a.rows.every(r=>r.runtimeAttribution==='NOT_OBTAINED')).toBe(true);
  }finally{fs.rmSync(root,{recursive:true});}
});

it('requires matching supported future runtime contracts in fixed plan',()=>{const root=fixture(true);try{const p=json(root,'run-plan.json'),m=json(root,'source-manifest.json'),c=json(root,'preflight-contract.json');expect(validatePlan(p,m,c)).toBe(true);for(const runtimeBinding of [undefined,null,'unknown'])expect(validatePlan({...p,runtimeBinding},m,c)).toBe(false);expect(validatePlan(p,{...m,runtimeBinding:'unknown'},c)).toBe(false);}finally{fs.rmSync(root,{recursive:true});}});
