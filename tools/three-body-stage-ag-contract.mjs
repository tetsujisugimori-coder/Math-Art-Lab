import ts from 'typescript';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
export const version='ag-static-1';
export const target='figure eight is reproduced and its energy stays bounded for 20 periods';
export const hash=b=>createHash('sha256').update(b).digest('hex');
const parse=s=>{const a=ts.createSourceFile('contract.ts',s,ts.ScriptTarget.Latest,true);if(a.parseDiagnostics.length)throw Error('SYNTAX');return a;};
export const canonical=s=>{
  const transformed=ts.transform(parse(s),[context=>node=>{
    const visit=n=>ts.isStringLiteral(n)?ts.factory.createStringLiteral(n.text):ts.visitEachChild(n,visit,context);
    return ts.visitNode(node,visit);
  }]);
  try{return ts.createPrinter({removeComments:true,newLine:ts.NewLineKind.LineFeed}).printFile(transformed.transformed[0]);}finally{transformed.dispose();}
};
const walk=(n,fn)=>{fn(n);ts.forEachChild(n,c=>walk(c,fn));};
export function originalParts(text){
  const a=parse(text),tests=[],rms=[];
  walk(a,n=>{if(ts.isCallExpression(n)&&n.expression.getText(a)==='it'&&n.arguments[0]?.text===target)tests.push(n);});
  for(const s of a.statements)if(ts.isVariableStatement(s))for(const d of s.declarationList.declarations)if(d.name.getText(a)==='rms')rms.push(d.initializer);
  if(tests.length!==1||rms.length!==1)throw Error('TARGET_OR_RMS_UNIQUENESS');
  const t=tests[0],f=t.arguments[1];
  if(t.arguments.length!==2||!f||!ts.isArrowFunction(f)||f.parameters.length||!ts.isBlock(f.body)||f.modifiers?.length)throw Error('TARGET_CALLBACK');
  return {body:f.body.getText(a),rms:rms[0].getText(a)};
}
const modules={'three-body.ts':'@product','reference-counted.ts':'@reference','three-body-stage-ae-expect.mjs':'@matcher','three-body-stage-ae-observer.mjs':'@observer'};
export function normalizeImports(text,allowed={}){
  const a=parse(text),changes=[];
  for(const n of a.statements)if(ts.isImportDeclaration(n)){
    const name=n.moduleSpecifier.text;
    const value=Object.hasOwn(allowed,name)?allowed[name]:Object.values(modules).includes(name)||name==='node:crypto'?name:null;
    if(value===null)throw Error('IMPORT_SOURCE_NOT_ALLOWED:'+name);
    changes.push([n.moduleSpecifier.getStart(a),n.moduleSpecifier.end,JSON.stringify(value)]);
  }
  for(const [start,end,value]of changes.reverse())text=text.slice(0,start)+value+text.slice(end);
  return text;
}
// Only a closed whitelist of template substitutions is interpreted; never execute prepare or entry.
export function materializePrepare(text,parts){
  const a=parse(text),entries=[];walk(a,n=>{if(ts.isVariableDeclaration(n)&&n.name.getText(a)==='entry')entries.push(n.initializer);});
  if(entries.length!==1||!ts.isTemplateExpression(entries[0]))throw Error('ENTRY_TEMPLATE');
  const replacements=new Map([["rms",parts.rms],["body.slice(0,-1)",parts.body.slice(0,-1)],
    ["abs('src/three-body.ts')",'"@product"'],["abs(root+'/reference-counted.ts')",'"@reference"'],
    ["abs('tools/three-body-stage-ae-expect.mjs')",'"@matcher"'],["abs('tools/three-body-stage-ae-observer.mjs')",'"@observer"']]);
  const t=entries[0];let out=t.head.text;
  for(const s of t.templateSpans){const key=s.expression.getText(a);if(!replacements.has(key))throw Error('UNEXPLAINED_TEMPLATE:'+key);out+=replacements.get(key)+s.literal.text;}
  return out;
}
// Independent AST locations, not the producer's string substitutions.
export function countedReference(text){
  const a=parse(text),rhs=[],loops=[];
  walk(a,n=>{
    if(ts.isVariableDeclaration(n)&&n.name.getText(a)==='rhs'&&ts.isArrowFunction(n.initializer)&&ts.isBlock(n.initializer.body))rhs.push(n.initializer.body);
    if(ts.isForStatement(n)&&canonical(n.initializer?.getText(a)??'').trim()==='let step = 0;'&&canonical(n.condition?.getText(a)??'').trim()==='step < n;'&&n.incrementor?.getText(a)==='step++'&&ts.isBlock(n.statement))loops.push(n.statement);
  });
  if(rhs.length!==1||loops.length!==1||text.includes('__aeCounts'))throw Error('REFERENCE_INSERTION_SITES');
  const inserts=[[rhs[0].getStart(a)+1,'globalThis.__aeCounts.rhs++;'],[loops[0].getStart(a)+1,'globalThis.__aeCounts.rkSteps++;']].sort((x,y)=>y[0]-x[0]);
  for(const [at,s]of inserts)text=text.slice(0,at)+s+text.slice(at);
  return text;
}
export function verifyStatic(s,contract){
  const errors=[];const check=(ok,e)=>{if(!ok)errors.push(e);};
  try{
    const p=originalParts(s.original);
    check(hash(canonical(p.body))===contract.bodySha256,'ORIGINAL_BODY');
    check(hash(canonical('const rms='+p.rms))===contract.rmsSha256,'ORIGINAL_RMS');
    const expected=contract.entryTemplate.replace('__AG_BODY_WITHOUT_CLOSE__',p.body.slice(0,-1)).replace('__AG_RMS__',p.rms);
    check(canonical(materializePrepare(s.prepare,p))===canonical(expected),'PRODUCER_TEMPLATE');
    check(canonical(normalizeImports(s.entry,contract.allowedImports))===canonical(expected),'EXTRACTED_BODY_WRAPPERS_BOUNDARIES');
    check(canonical(s.counted)===canonical(countedReference(s.reference)),'REFERENCE_TRANSFORM');
    // Exact raw source pinning catches unexamined adapter/clock/bootstrap/runner semantics.
    for(const k of ['original','prepare','adapter','observer','runner','bootstrap','reference'])check(hash(s[k])===contract.sourceSha256[k],'SOURCE_CONTRACT:'+k);
    check(!/\bit\s*\(/.test(s.entry),'NO_VITEST_REGISTRATION');
    return {status:errors.length?'FAIL':'PASS',errors,bodySha256:hash(canonical(p.body)),scope:'STATIC_CORRESPONDENCE_ONLY',runtimeAttribution:'NOT_OBTAINED',timeComparison:'NOT_COMPARABLE'};
  }catch(e){return {status:'FAIL',errors:[...errors,String(e)],scope:'STATIC_CORRESPONDENCE_ONLY',runtimeAttribution:'NOT_OBTAINED',timeComparison:'NOT_COMPARABLE'};}
}
export const pathMap=[
  {stage:1,name:'discovery/collection',original:'Vitest src glob and collectTests',ae:'AST named it extraction only',relation:'DIFFERENT'},
  {stage:2,name:'TS transform/import resolution',original:'Vitest/Vite module transform',ae:'esbuild Node24 ESM bundle',relation:'DIFFERENT'},
  {stage:3,name:'module initialization',original:'Full test imports and modules',ae:'Bundled subset import in fresh Node',relation:'DIFFERENT'},
  {stage:4,name:'describe/it registration',original:'Vitest task registration',ae:'No describe/it tasks',relation:'DIFFERENT'},
  {stage:5,name:'setup/hooks/worker',original:'Vitest worker/fixtures/setup lifecycle',ae:'Standalone bootstrap; adapter state init',relation:'DIFFERENT'},
  {stage:6,name:'test body',original:'Target callback statements',ae:'Same statements in IIFE plus return {p,max}',relation:'STATIC_MATCH'},
  {stage:7,name:'Verlet/energy/RK4/RMS',original:'Production functions and reference',ae:'Delegating wrappers; hash/counters and two RK4 counters',relation:'STATIC_MATCH_WITH_INSTRUMENTATION'},
  {stage:8,name:'assertion/matcher',original:'Vitest expect with test context',ae:'Installed Chai/Vitest plugins via diagnostic adapter; toBeNull/toBeLessThan only',relation:'DIFFERENT'},
  {stage:9,name:'cleanup/report',original:'Vitest hooks/task aggregation/report',ae:'Telemetry serialization, result/clock files and parent checkpoint',relation:'DIFFERENT'},
  {stage:10,name:'timeout/termination',original:'Vitest 5000ms test deadline',ae:'spawnSync 30000ms parent safety bound',relation:'DIFFERENT'}
].map((row,i)=>({...row,originalSources:['src/three-body.test.ts',...(i===6?['src/three-body.ts','tools/three-body-reference.ts']:i===7?['node_modules/@vitest/runner/dist/chunk-hooks.js']:['package.json','vite.config.ts','node_modules/@vitest/runner/dist/chunk-hooks.js'])],aeSources:i===0||i===1?['tools/three-body-stage-ae-prepare.mjs']:i===9?['tools/three-body-stage-ae-run.mjs']:['tools/three-body-stage-ae-bootstrap.mjs','tools/three-body-stage-ae-observer.mjs',...(i===7?['tools/three-body-stage-ae-expect.mjs']:[])],originalExecutor:'Vitest collection/worker/runner; historical effective configuration NOT_OBTAINED',aeExecutor:i<2?'prepare Node process':i===9?'parent Node spawnSync':'standalone child Node process',originalTiming:'NOT_OBTAINED',aeTiming:['AST extraction not timed','esbuild build not timed','clock before-import to after-import','registration absent','adapter module initialization inside import; other setup NOT_OBTAINED','start.at to end.at body envelope','ON category wall ms/process and thread CPU us; OFF NOT_OBTAINED_TIMING_OFF','expect construction and two matchers; counter/hash overhead differs','after-body to result-saved covers serialization/save; remaining cleanup NOT_OBTAINED','parent spawnSync 30000ms safety; parent performance.now interval'][i],evidence:i<2?'pinned prepare source plus frozen entry/reference snapshots':'frozen AE result/clock/manifest/cohort and AF posthoc audit',attribution:'POSTHOC_STATIC_ONLY; HISTORICAL_RUNTIME_NOT_OBTAINED'}));
export const claims=Object.freeze({version,staticScope:'STATIC_CORRESPONDENCE_ONLY',runtimeAttribution:'NOT_OBTAINED',originalBodyTiming:'NOT_OBTAINED',commonClock:'NOT_OBTAINED',timeComparison:'NOT_COMPARABLE',nativeAndOS:'UNKNOWN',workerRuntime:'NOT_OBTAINED',rootCause:'UNKNOWN',performanceImprovement:'NOT_TESTED',originalStop:'NOT_TESTED',oldSixOriginals:'NOT_OBTAINED',wholeHistory:'LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS',remoteBackup:'REMOTE_BACKUP_NOT_UPLOADED',oldW:'BLOCKED',oldX:'FAIL',originalTimeoutMs:5000,aeSafetyTimeoutMs:30000});
export function verifyClaims(value){return {status:equal(value,{...claims,pathMap})?'PASS':'FAIL',errors:equal(value,{...claims,pathMap})?[]:['UNSUPPORTED_EQUIVALENCE_OR_STATE_PROMOTION']};}
export function verifyPriorFailures(value){
  const ok=value?.acquisition==='POSTHOC_IMPORTED_CI_LOGS'&&value.runtimeOriginals==='NOT_OBTAINED'&&value.rootCause==='UNKNOWN'&&value.sourceHead==='8e6b3803af4a24a7920858dfb9b38cea5dcac961'&&value.sourceTree==='bcebe1e030dcfe8ce81db90a3139396fc882da33'&&value.w?.length===2&&value.w.every(r=>r.status==='BLOCKED'&&r.newBrowserTrials===0)&&value.x?.status==='FAIL'&&value.x.newBrowserTrials===0&&value.x.phaseA?.status==='FAIL'&&value.x.originalEvidenceCompleteness==='PARTIAL_MISSING_INDEXED_FILES'&&Array.isArray(value.x.originalIndexErrors)&&value.x.originalIndexErrors.some(x=>x.startsWith('INDEX_MISSING:'));
  return {status:ok?'PASS':'FAIL',errors:ok?[]:['PRIOR_FAILURE_OR_GAP_PROMOTION']};
}
