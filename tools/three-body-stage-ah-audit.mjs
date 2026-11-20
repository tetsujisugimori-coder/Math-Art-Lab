import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {read,json} from './three-body-stage-af-records.mjs';
import {gitProof} from './three-body-stage-ag-git.mjs';
import {digest,seal,baseline,validateDocuments,executionGate} from './three-body-stage-ah-contract.mjs';
export const sourceFiles=['src/three-body.test.ts','src/three-body.ts','src/three-body-state.ts','src/three-body-render.ts','tools/three-body-reference.ts','tsconfig.json','package.json','package-lock.json','vite.config.ts','tools/three-body-stage-ab-review-policy.json','tools/three-body-stage-ac-ci-policy.json','tools/three-body-stage-ad-observer.mjs','node_modules/@vitest/runner/dist/chunk-hooks.js','node_modules/vitest/dist/chunks/defaults.B7q_naMc.js','node_modules/vitest/dist/chunks/coverage.DfSpMS-b.js','node_modules/vitest/dist/worker.js','node_modules/vitest/dist/workers/forks.js','node_modules/vitest/dist/chunks/base.DfmxU-tU.js','node_modules/vitest/dist/chunks/runBaseTests.9Ij9_de-.js','node_modules/vitest/dist/chunks/execute.B7h3T_Hc.js','node_modules/vite-node/dist/client.mjs','node_modules/vite-node/dist/server.mjs','node_modules/@vitest/expect/dist/index.js'];
export function loadBundle(root='.'){
  const d='docs/three-body/review-44/stage-ah/';
  return {plan:json(root,d+'fixed-plan.json'),timing:json(root,d+'timing-plan.json'),stops:json(root,d+'stop-conditions.json'),approval:json(root,d+'approval-gate.json'),environmentMap:json(root,d+'execution-environment-map.json'),lock:json(root,d+'plan-seal.json'),policies:{ab:json(root,'tools/three-body-stage-ab-review-policy.json'),ac:json(root,'tools/three-body-stage-ac-ci-policy.json')}};
}
export function auditSources(root,bundle){
  const errors=[],rows=[];
  try{
    const map=bundle.environmentMap;
    if(map.baselineHead!==baseline.head||map.baselineTree!==baseline.tree||map.historicalRuntime!=='NOT_OBTAINED')errors.push('MAP_IDENTITY_OR_RUNTIME_PROMOTION');
    if(JSON.stringify(map.sources.map(r=>r.file).sort())!==JSON.stringify([...sourceFiles].sort()))errors.push('SOURCE_SET');
    const verifyGit=gitProof(map);
    for(const r of map.sources){
      const raw=read(root,r.file),saved=Buffer.from(r.rawBase64,'base64'),logical=b=>b.toString('utf8').replaceAll('\r\n','\n');
      if(saved.length!==r.bytes||digest(saved)!==r.sha256||digest(logical(saved))!==r.logicalSha256||digest(logical(raw))!==r.logicalSha256||r.historicalRuntime!=='NOT_OBTAINED')errors.push('SOURCE_DRIFT:'+r.file);
      rows.push({file:r.file,raw:digest(raw)===r.sha256&&raw.length===r.bytes?'RAW_MATCH':'LINE_ENDING_EQUIVALENT_ONLY',git:verifyGit(r),runtime:'NOT_OBTAINED'});
    }
    const actualSet=seal(map.sources.map(({file,logicalSha256,gitBlob,gitBlobSha256})=>({file,logicalSha256,gitBlob,gitBlobSha256})));
    if(actualSet!==map.sourceSetSha256||actualSet!==bundle.lock.sourceSetSha256)errors.push('SOURCE_SET_SHA');
    for(const stage of map.stages){
      if(stage.historicalRuntime!=='NOT_OBTAINED'||stage.existingOriginalIntervalRaw!=='NOT_OBTAINED'||stage.observationState!=='PROPOSED_NOT_IMPLEMENTED')errors.push('STAGE_STATE_PROMOTION:'+stage.id);
      for(const ref of stage.sources){const r=map.sources.find(r=>r.file===ref.file),text=Buffer.from(r?.rawBase64??'','base64').toString('utf8'),at=text.indexOf(ref.anchor);if(!r||ref.sourceSha256!==r.sha256||ref.gitBlob!==r.gitBlob||at<0||text.slice(0,at).split('\n').length!==ref.line)errors.push('STAGE_SOURCE:'+stage.id);}
    }
    errors.push(...validateDocuments(bundle).errors.map(e=>e.code));
    return {status:errors.length?'SOURCE_DRIFT':'PLAN_VALID',errors,rows,execution:executionGate(bundle),actualExecution:'NOT_TESTED'};
  }catch(e){return {status:e.code==='ENOENT'?'EVIDENCE_INCOMPLETE':'SOURCE_DRIFT',errors:[...errors,String(e)],actualExecution:'NOT_TESTED',allowed:false};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const args=process.argv.slice(2);let result;
  try{const bundle=loadBundle();result=args.length===1&&args[0]==='validate'?auditSources('.',bundle):executionGate(bundle,{action:'EXECUTE'});}
  catch(e){result={status:'EVIDENCE_INCOMPLETE',errors:[String(e)],allowed:false,actualExecution:'NOT_TESTED'};}
  console.log(JSON.stringify(result,null,2));process.exitCode=result.status==='PLAN_VALID'?0:result.status==='BLOCKED'?2:1;
}
