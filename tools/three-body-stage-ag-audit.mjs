import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyStatic,originalParts,materializePrepare,hash,claims,pathMap,verifyClaims,verifyPriorFailures,version} from './three-body-stage-ag-contract.mjs';
import {verifyReport} from './three-body-stage-af-report.mjs';
import {gitProof} from './three-body-stage-ag-git.mjs';
import {read,json,descriptor} from './three-body-stage-af-records.mjs';
export const sourcePaths={original:'src/three-body.test.ts',prepare:'tools/three-body-stage-ae-prepare.mjs',reference:'tools/three-body-reference.ts',adapter:'tools/three-body-stage-ae-expect.mjs',observer:'tools/three-body-stage-ae-observer.mjs',runner:'tools/three-body-stage-ae-run.mjs',bootstrap:'tools/three-body-stage-ae-bootstrap.mjs'};
export const additionalSources=['src/three-body.ts','src/three-body-state.ts','src/three-body-render.ts','tools/three-body-stage-ae-analyze.mjs','tools/three-body-stage-af-audit.mjs','tools/three-body-stage-af-report.mjs','tools/three-body-stage-af-records.mjs','package.json','package-lock.json','tsconfig.json','vite.config.ts','.github/workflows/deploy-pages.yml','.github/workflows/three-body-stage-ae.yml','node_modules/@vitest/runner/dist/chunk-hooks.js','node_modules/vitest/dist/chunks/defaults.B7q_naMc.js','node_modules/vitest/dist/chunks/coverage.DfSpMS-b.js','tools/three-body-stage-ag-audit.mjs','tools/three-body-stage-ag-contract.mjs','tools/three-body-stage-ag-entry.fixture.txt','tools/three-body-stage-ag-faults.mjs','tools/three-body-stage-ag-tests.config.mjs','src/three-body-stage-ag.test.js','tools/three-body-stage-ag-controls.mjs','tools/three-body-stage-ag-git.mjs','docs/three-body/review-44/stage-ag/prior-evidence.json'];
export const logical=b=>b.toString('utf8').replaceAll('\r\n','\n');
export function workspaceSources(root='.'){
  const s=Object.fromEntries(Object.entries(sourcePaths).map(([k,f])=>[k,logical(read(root,f))]));
  const parts=originalParts(s.original);
  s.entry=materializePrepare(s.prepare,parts);
  s.counted=s.reference.replace('const rhs=(z:number[])=>{','const rhs=(z:number[])=>{globalThis.__aeCounts.rhs++;').replace('for(let step=0;step<n;step++){','for(let step=0;step<n;step++){globalThis.__aeCounts.rkSteps++;');
  return s;
}
export function staticAudit(root,binding){
  const errors=[];
  try{
    if(binding.schema!=='ag-binding-1'||binding.diagnosticVersion!==version||binding.runtimeAttribution!=='NOT_OBTAINED'||binding.baselineHead!=='8e6b3803af4a24a7920858dfb9b38cea5dcac961'||binding.baselineTree!=='bcebe1e030dcfe8ce81db90a3139396fc882da33')errors.push('BINDING_IDENTITY');
    const verifyGit=gitProof(binding),sourceStates=[];
    for(const r of binding.sources){
      const raw=read(root,r.file),lf=Buffer.from(logical(raw)),crlf=Buffer.from(logical(raw).replaceAll('\n','\r\n'));
      if(hash(lf)!==r.logicalSha256)errors.push('SOURCE_BYTES:'+r.file);
      const matches=b=>hash(b)===r.sha256&&b.length===r.bytes;
      if(![raw,lf,crlf].some(matches))errors.push('RAW_SOURCE_DESCRIPTOR:'+r.file);
      const expectedAcquisition=r.gitBlob?'POSTHOC_BASELINE_GIT_AND_WORKSPACE':r.file.startsWith('node_modules/')?'POSTHOC_INSTALLED; HISTORICAL_RUNTIME_NOT_OBTAINED':'POSTHOC_UNCOMMITTED_AG_NO_BASELINE_BLOB';
      if(r.acquisition!==expectedAcquisition)errors.push('SOURCE_ACQUISITION:'+r.file);
      sourceStates.push({file:r.file,rawBytes:matches(raw)?'RAW_MATCH':'LINE_ENDING_EQUIVALENT_ONLY',git:verifyGit(r),acquisition:'POSTHOC'});
    }
    const expected=[...Object.values(sourcePaths),...additionalSources].sort();
    if(JSON.stringify(binding.sources.map(r=>r.file).sort())!==JSON.stringify(expected))errors.push('SOURCE_SET');
    errors.push(...verifyPriorFailures(json(root,'docs/three-body/review-44/stage-ag/prior-evidence.json')).errors);
    const result=verifyStatic(workspaceSources(root),binding.contract);
    errors.push(...result.errors);
    const template=logical(read(root,'tools/three-body-stage-ag-entry.fixture.txt'));
    if(template!==binding.contract.entryTemplate)errors.push('ENTRY_CONTRACT_TEMPLATE');
    return {...result,status:errors.length?'FAIL':'PASS',errors,claims:{...claims,pathMap},sourceStates,diagnosticVersion:version};
  }catch(e){return {status:'FAIL',errors:[...errors,String(e)],runtimeAttribution:'NOT_OBTAINED',timeComparison:'NOT_COMPARABLE'};}
}
export function historicalAudit(rawRoot,afReport,binding){
  const errors=[];
  try{
    for(const r of binding.historicalFiles){const d=descriptor(rawRoot,r.file);if(d.bytes!==r.bytes||d.sha256!==r.sha256)errors.push('HISTORICAL_BYTES:'+r.file);}
    for(const r of binding.afReportFiles){const d=descriptor(afReport,r.file);if(d.bytes!==r.bytes||d.sha256!==r.sha256)errors.push('AF_REPORT_BYTES:'+r.file);}
    const af=verifyReport(rawRoot,afReport);
    if(af.status!=='PASS')errors.push('AF_AUDIT:'+af.status);
    const m=json(rawRoot,'source-manifest.json');
    const expectedFiles=[...new Set(['source-manifest.json','run-plan.json','entry.ts','reference-counted.ts','esbuild-metafile.json','bundle.mjs','cohort.json',...m.rows.map(r=>r.snapshot)])].sort();
    if(JSON.stringify(binding.historicalFiles.map(r=>r.file).sort())!==JSON.stringify(expectedFiles)||JSON.stringify(binding.afReportFiles.map(r=>r.file).sort())!==JSON.stringify(['audit-index.json','summary.json']))errors.push('HISTORICAL_DESCRIPTOR_SET');
    const snapshot=f=>{const matches=m.rows.filter(r=>r.file===f);if(matches.length!==1)throw Error('SNAPSHOT_SET:'+f);return logical(read(rawRoot,matches[0].snapshot));};
    const s=Object.fromEntries(Object.entries(sourcePaths).map(([k,f])=>[k,snapshot(f)]));
    s.entry=logical(read(rawRoot,'entry.ts'));s.counted=logical(read(rawRoot,'reference-counted.ts'));
    const staticResult=verifyStatic(s,binding.historicalContract);
    errors.push(...staticResult.errors);
    for(const file of ['entry.ts','reference-counted.ts']){
      const rows=m.rows.filter(r=>r.file.replaceAll('\\','/').endsWith('/'+file));
      if(rows.length!==1||hash(read(rawRoot,file))!==rows[0].sha256)errors.push('GENERATED_SNAPSHOT:'+file);
    }
    const meta=json(rawRoot,'esbuild-metafile.json');
    for(const [f,v]of Object.entries(meta.inputs)){
      const rows=m.rows.filter(r=>r.file===f);
      if(rows.length!==1||rows[0].bytes!==v.bytes)errors.push('BUNDLE_INPUT_SNAPSHOT:'+f);
    }
    if(Object.keys(meta.outputs).length!==1||Object.values(meta.outputs)[0].bytes!==m.bundle.bytes)errors.push('BUNDLE_OUTPUT');
    return {status:errors.length?'FAIL':'PASS',errors,evidenceStatus:af.status==='PASS'?'POSTHOC_VERIFIED':af.errors?.some(e=>/ENOENT|NOT_OBTAINED/.test(e))?'NOT_OBTAINED':'INVALID',acquisition:'POSTHOC_READ_ONLY',runtimeAttribution:'NOT_OBTAINED',timeComparison:'NOT_COMPARABLE',bundleDerivation:'MANIFEST_BYTES_AND_INPUT_SET_CHECKED; REPRODUCIBLE_REBUILD_NOT_TESTED',staticResult,rows:af.rows??[],rootCause:'UNKNOWN',performanceImprovement:'NOT_TESTED',originalStop:'NOT_TESTED'};
  }catch(e){return {status:e.code==='ENOENT'?'NOT_OBTAINED':'FAIL',errors:[...errors,String(e)],runtimeAttribution:'NOT_OBTAINED',timeComparison:'NOT_COMPARABLE',rootCause:'UNKNOWN',performanceImprovement:'NOT_TESTED',originalStop:'NOT_TESTED'};}
}
export function verifySavedReport(actual,expected){return verifyClaims(actual.claims).status==='PASS'&&JSON.stringify(actual)===JSON.stringify(expected)?{status:'PASS'}:{status:'FAIL',errors:['REPORT_CONTENT_OR_STATE_PROMOTION']};}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [command,root='.',report]=process.argv.slice(2),binding=json('.','docs/three-body/review-44/stage-ag/source-binding.json');
  if(!['static','historical'].includes(command))throw Error('USAGE: static WORKSPACE | historical RAW_ROOT AF_REPORT');
  const result=command==='static'?staticAudit(root,binding):historicalAudit(root,report,binding);
  console.log(JSON.stringify(result,null,2));if(result.status!=='PASS')process.exitCode=1;
}
