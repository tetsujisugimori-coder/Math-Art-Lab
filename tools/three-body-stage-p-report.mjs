import fs from 'node:fs';
import { gzipSync, gunzipSync, brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import {chromium,webkit} from '@playwright/test';
import { distribution, analyzeTrace, completeEvents, unionOverlap, intervalQuery } from './three-body-stage-p-analysis.mjs';
const root = process.argv[2] ?? 'docs/three-body/review-44/stage-p';
const read = p => JSON.parse(p.endsWith('.gz') ? gunzipSync(fs.readFileSync(p)) : p.endsWith('.br') ? brotliDecompressSync(fs.readFileSync(p)) : fs.readFileSync(p, 'utf8'));
const hash = b => createHash('sha256').update(b).digest('hex');
const write = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n');
const result = await build({ stdin: { contents: "export * from './src/three-body.ts';export * from './src/three-body-state.ts';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false });
const model = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const browserReference=await build({stdin:{contents:"export * from './src/three-body.ts';export * from './src/three-body-state.ts';",resolveDir:process.cwd()},bundle:true,platform:'browser',format:'iife',globalName:'__stagePReference',write:false});
let referenceBrowser,referencePage,referenceEngine;
const rows = [], traceRows = [], numerical = [];
const files = fs.readdirSync(`${root}/raw-results`).filter(n => /\.json\.(gz|br)$/.test(n) && !n.endsWith('.jsonl.gz')).sort();
const resolveTrace = p => fs.existsSync(p) ? p : p.replace(/\.gz$/, '.br');
for (const name of files) {
  const analysisStarted=performance.now();
  global.gc?.();
  const r = read(`${root}/raw-results/${name}`), d = r.data ?? r.partial?.data, state = r.result?.state;
  if (!d) { rows.push({ id: r.id, errors: r.errors, missing: true, options:r.options,browser:r.browser?.name,mode:r.mode }); continue; }
  const frames = d.frames ?? [], requests = d.requests ?? [], s = r.result?.stop;
  const row = { id: r.id, browser: r.browser?.name, version: r.browser?.version, options: r.options, mode: r.mode, errors: r.errors, duration: r.result ? r.result.end - r.result.begin : null,
    phases: Object.fromEntries(['calculate', 'paint', 'observe', 'refresh'].map(n => [n, distribution(d.spans.filter(s => s.name === n).map(s => s.end - s.begin))])),
    latency: distribution(requests.map(x => x.T1 - x.T0)), frameInterval: distribution(frames.slice(1).map((f, i) => f.at - frames[i].at)), frameWait: distribution(frames.map(f => f.wait)),
    stop: s ? { T0T1: s.T1 - s.T0, T1T3: s.T3 == null ? null : s.T3 - s.T1, T2T3: s.T3 == null ? null : s.T3 - s.T2, T3T4: s.T4 == null ? null : s.T4 - s.T3, uncertainty: s.uncertainty, T4Kind: s.T4Kind ?? 'same-step DOM and Canvas command receipt', target: s.target, targetHit: s.targetHit,
      postReceiveSteps: s.stop?.after.step - s.stepAtReceive.step, postStopSteps: s.later.step - s.after.step, atomic: s.later.bStep == null || s.later.bStep === s.later.step, timerAfter: s.later.timer, safetyEpoch: [s.stepAtReceive.safetyEpoch, s.later.safetyEpoch], clockEpoch: [s.stepAtReceive.clockEpoch, s.later.clockEpoch] } : null,
    memory: { freeHostBytes: distribution(r.samples.map(s => s.freeMemory)), jsHeap: r.samples.map(s => ({ hostMono: s.hostBegin, pageMono: s.page?.now, used: s.metrics?.find(m => m.name === 'JSHeapUsedSize')?.value ?? null, processCpu: s.processes ?? null })) },
    final: state?.small, layout: state?.layout, visible: state?.layout.visibility, clockSyncs: r.result?.syncs, synthetic: !!r.options.synthetic };
  row.syntheticVerified=!row.synthetic||d.spans.find(s=>s.id===r.result?.stop.overlapId)?.name==='synthetic-'+r.options.synthetic;
  row.gpuInfo=r.browser?.gpuInfo??'NOT_TESTED';
  row.capabilities={cdpTrace:r.browser?.name==='chromium'?'available; inspect per-run trace/errors':'NOT_TESTED',cpuThrottling:r.options.cpu?(r.browser?.name==='chromium'?`CDP ${r.options.cpu}x`:'NOT_TESTED: no WebKit CDP throttling'): 'not requested',realOsVisibility:'NOT_TESTED; visibility stop is synthetic document event'};
  if(state?.e&&r.options.canvas!==false&&r.options.dom!==false&&d.lastDraw?.['tb-a']){
    const agrees=(receipt,phase)=>receipt?.step===phase.steps&&receipt.positions===JSON.stringify(phase.bodies.map(({x,y})=>({x,y})));
    row.drawStateVerification={a:agrees(d.lastDraw['tb-a'],state.e.phase),b:state.comparison?agrees(d.lastDraw['tb-b'],state.comparison.b.phase):null,scope:'Arguments of the actual drawOrbit call, before Canvas commands; not GPU presentation'};
  }else row.drawStateVerification={status:'NOT_TESTED'};
  row.committedFrameSteps={n:frames.length,mismatches:frames.filter(f=>String(f.step)!==f.observed||String(f.step)!==f.a||(f.ab&&String(f.step)!==f.b)).length};
  row.toolVersions=Object.fromEntries(Object.entries(r.toolHashes??{}).map(([p,h])=>[p,{hash:h,archived:fs.existsSync(`${root}/tool-versions/${h}/${p.split('/').at(-1)}`)}]));
  const cpuSamples=r.samples.filter(s=>s.processes&&s.hostCpuTimes);
  if(cpuSamples.length>1){const a=cpuSamples[0],b=cpuSamples.at(-1),seconds=(b.hostBegin-a.hostBegin)/1000;let total=0,idle=0;for(let i=0;i<a.hostCpuTimes.length;i++)for(const k of Object.keys(a.hostCpuTimes[i])){const delta=b.hostCpuTimes[i][k]-a.hostCpuTimes[i][k];total+=delta;if(k==='idle')idle+=delta;}
    row.cpuApprox={hostBusyPercent:100*(1-idle/total),seconds,hostTimeBracketSeconds:[(b.hostBegin-a.hostEnd)/1000,(b.hostEnd-a.hostBegin)/1000],processes:b.processes.map(p=>{const first=a.processes.find(x=>x.id===p.id);return{pid:p.id,type:p.type,averageCoreEquivalent:first?(p.cpuTime-first.cpuTime)/seconds:null};}),note:'Cumulative CPU deltas over host sampling brackets; not instantaneous thread CPU. Missing start pid is NOT_TESTED.'};
  }else row.cpuApprox={status:'NOT_TESTED'};
  if (state?.e) {
    const expected = state.comparison ? model.createComparison(model.presets[0].config, 0, 'x', 1e-6) : model.createExperiment(model.presets[0].config), steps = state.e.phase.steps;
    for (let n = 0; n < steps; n += 2000) (state.comparison ? model.advanceComparison : model.advance)(expected, Math.min(2000, steps - n));
    const phasesEqual = JSON.stringify(state.e.phase) === JSON.stringify(state.comparison ? expected.a.phase : expected.phase) && (!state.comparison || JSON.stringify(state.comparison.b.phase) === JSON.stringify(expected.b.phase));
    const historiesEqual = r.options.kernel ? null : JSON.stringify(state.comparison ?? state.e) === JSON.stringify(expected);
    const displayedEqual = r.options.canvas === false || r.options.dom === false ? null : state.domPositions === state.aPositions && state.small.observed === String(steps) && state.small.a === String(steps) && (!state.comparison || state.small.b === String(steps));
    row.numeric = { phasesEqual, historiesEqual, displayedEqual, steps, caveat: 'Browser JSON round-trip doubles; signed-zero bits not asserted here. Independent Node Float64 verification is separate.' }; numerical.push({ id: r.id, ...row.numeric });
  }
  if(state&&r.browser?.name){
    if(referenceEngine!==r.browser.name){await referenceBrowser?.close();referenceEngine=r.browser.name;referenceBrowser=await({chromium,webkit}[referenceEngine]).launch({headless:true,...(referenceEngine==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});referencePage=await referenceBrowser.newPage();await referencePage.addScriptTag({content:browserReference.outputFiles[0].text});}
    // Preserve every double while avoiding hundreds of thousands of protocol nodes.
    const actual={ab:!!state.comparison||state.small.ab,n:state.e?.phase.steps??state.small.step,snapshotStep:state.small.step,phase:state.e?JSON.stringify(state.e.phase):null,bPhase:state.comparison?JSON.stringify(state.comparison.b.phase):null,histories:state.e&&!r.options.kernel?JSON.stringify(state.comparison??state.e):null,positions:state.domPositions};
    row.sameEngineReference=await referencePage.evaluate(actual=>{
      const m=globalThis.__stagePReference,ab=actual.ab,expected=ab?m.createComparison(m.presets[0].config,0,'x',1e-6):m.createExperiment(m.presets[0].config),n=actual.n;
      for(let i=0;i<n;i+=2000)(ab?m.advanceComparison:m.advance)(expected,Math.min(2000,n-i));
      const a=ab?expected.a:expected,b=ab?expected.b:null;
      const positions=JSON.stringify(a.phase.bodies.map(({x,y})=>({x,y})));
      return {steps:n,snapshotStepMismatch:n!==actual.snapshotStep,phasesEqual:actual.phase?actual.phase===JSON.stringify(a.phase)&&(!actual.bPhase||actual.bPhase===JSON.stringify(b.phase)):null,historiesEqual:actual.histories?actual.histories===JSON.stringify(expected):null,positionsEqual:actual.positions?actual.positions===positions:null,scope:actual.phase?'all recovered doubles and histories in the same browser engine':'public A position doubles only; full phase NOT_TESTED'};
    },actual);
    if(r.options.dom===false||r.options.canvas===false)row.sameEngineReference.positionsEqual=null;
  }
  if (r.trace) {
    const trace = read(resolveTrace(r.trace.file)), a = analyzeTrace(trace.traceEvents, d), main = completeEvents(trace.traceEvents.filter(e => e.pid === a.clock.mainPid && e.tid === a.clock.mainTid)), offset = a.clock.offsetMs;
    const categories = { gc: /GC|Scaveng|MarkCompact/, js: /FunctionCall|V8.Execute|EvaluateScript/, styleLayout: /UpdateLayoutTree|Layout/, paint: /Paint|Composite|UpdateLayer|PrePaint/,mainCommitWait:/WaitForCommitCompletion/,mainGpuSync:/SyncToken::Wait|VerifyFlush/ };
    const beginOf=e=>e.ts/1000,endOf=e=>(e.ts+e.dur)/1000;
    const queries=Object.fromEntries(Object.entries(categories).map(([k,re])=>[k,intervalQuery(main.filter(e=>re.test(e.name)),beginOf,endOf)]));
    const mainQuery=intervalQuery(main,beginOf,endOf),phaseQuery=intervalQuery(d.spans,s=>s.begin,s=>s.end);
    a.inputWindows = offset == null ? [] : requests.filter(q => q.T1 - q.T0 >= 50).map(q => {
      const begin = q.T0 + offset, end = q.T1 + offset;
      if(begin<a.window.beginMs||end>a.window.endMs)return{seq:q.seq,delay:q.T1-q.T0,attribution:'NOT_TESTED_OUTSIDE_CAPTURED_MARKS'};
      return { seq: q.seq, delay: q.T1 - q.T0, begin, end, uncertainty: q.uncertainty, overlap: Object.fromEntries(Object.entries(queries).map(([k,query]) => [k, unionOverlap(query(begin,end), begin, end)])),
        activePhasesAtT0: phaseQuery(q.T0-1e-6,q.T0+1e-6).filter(s=>s.begin<=q.T0&&s.end>=q.T0).map(s => ({ id: s.id, name: s.name, begin: s.begin, end: s.end })),
        enclosingEvents: mainQuery(begin,end).filter(e => beginOf(e)<=begin&&endOf(e)>=end).map(e => ({ name: e.name, cat: e.cat, begin: e.ts / 1000, duration: e.dur / 1000, threadCpuMs: Number.isFinite(e.tdur) ? e.tdur / 1000 : null })) };
    });
    row.trace = { file: resolveTrace(r.trace.file), dataLoss: r.trace.dataLossOccurred, clock: a.clock, phasesOver50: a.long.length, mainTask: a.tasks, gcEvents: a.gc, coverage: a.coverage };
    const traceSummary = `${root}/traces/${r.id}-analysis.json`; write(traceSummary, a); traceRows.push({ id: r.id, ...row.trace, inputWindowsOver50: a.inputWindows.length });
  }
  rows.push(row);
  console.log(JSON.stringify({analysisRun:r.id,analysisMs:performance.now()-analysisStarted}));
}
await referenceBrowser?.close();
write(`${root}/raw-results/analysis.json`, { date: new Date().toISOString(), runs: rows, numerical, traceRuns: traceRows });
const groups=new Map();for(const r of rows){const {repeat,...o}=r.options??{},key=JSON.stringify({suite:r.id?.split('-')[0],browser:r.browser,mode:r.mode,...o});const a=groups.get(key)??[];a.push(r);groups.set(key,a);}
write(`${root}/raw-results/group-summary.json`,[...groups.entries()].map(([key,a])=>({condition:JSON.parse(key),runs:a.length,ids:a.map(r=>r.id),errors:a.map(r=>({id:r.id,errors:r.errors})).filter(r=>r.errors.length),runMaxRequestWait:distribution(a.map(r=>r.latency?.max)),runMaxPaint:distribution(a.map(r=>r.phases?.paint.max)),runMaxCalculate:distribution(a.map(r=>r.phases?.calculate.max)),sameEngineChecks:a.map(r=>({id:r.id,...r.sameEngineReference}))})));
const number = v => !Number.isFinite(v) ? 'NOT_TESTED' : Number(v).toFixed(2);
const table = ['# Stage P 性能集計', '', '全標本を保持。phaseはperformance.nowの経過区間、traceは別の単調時計。p99はnearest-rankの記述値であり保証値ではない。OFFのphase未測定を0msとは扱わない。', '', '| Run | seconds | step | calc max | paint max | observe max | input n / median / p95 / p99 / max ms | errors |', '|---|---:|---:|---:|---:|---:|---|---:|'];
for (const r of rows) table.push(`| ${r.id} | ${number(r.duration==null?null:r.duration / 1000)} | ${r.final?.step ?? '—'} | ${number(r.phases?.calculate.max)} | ${number(r.phases?.paint.max)} | ${number(r.phases?.observe.max)} | ${r.latency?.n ?? 0} / ${['median','p95','p99','max'].map(k=>number(r.latency?.[k])).join(' / ')} | ${r.errors?.length ?? 1} |`);
fs.writeFileSync(`${root}/performance-runs.md`, table.join('\n') + '\n');
const input = ['# 入力要求と停止', '', 'T0/T1はWorker/ページの往復同期後の単調時刻。T4はDOM／Canvas命令受付、GPU提示ではない。対象phaseの自然な長時間区間がなかった試行はTARGET_MISS。要求時の厳密なstepは未測定。誤配送Escapeの失敗はinvestigation.mdを参照。', '', '| Run | T0→T1 | T1→T3 | T2→T3 | T3→T4 | target hit | after stop step | atomic | errors |', '|---|---:|---:|---:|---:|---|---:|---|---:|'];
for (const r of rows) input.push(`| ${r.id} | ${number(r.stop?.T0T1)} | ${number(r.stop?.T1T3)} | ${number(r.stop?.T2T3)} | ${number(r.stop?.T3T4)} | ${r.stop?.target ? (r.stop.targetHit ? 'HIT' : 'TARGET_MISS') : 'deadline'}${r.synthetic ? ' (synthetic)' : ''} | ${r.stop?.postStopSteps ?? 'NOT_TESTED'} | ${r.stop?.atomic ?? 'NOT_TESTED'} | ${r.errors.length} |`);
fs.writeFileSync(`${root}/input-latency-runs.md`, input.join('\n') + '\n');
console.log(JSON.stringify({ runs: rows.length, errors: rows.filter(r=>r.errors?.length), crossEngineDifferences: numerical.filter(n=>!n.phasesEqual||n.historiesEqual===false), sameEngineFailures:rows.filter(r=>r.sameEngineReference&&(r.sameEngineReference.phasesEqual===false||r.sameEngineReference.historiesEqual===false||r.sameEngineReference.positionsEqual===false)), traceRuns: traceRows.length, naturalLong: rows.filter(r=>!r.missing&&!r.synthetic&&r.options?.duration>=60000).map(r=>({id:r.id,max:r.phases.calculate.max,paint:r.phases.paint.max,latency:r.latency.max})) }, null, 2));

if (process.argv.includes('--archive')) {
  // Lossless large-window compression after all measurements, never during a run.
  const indexFile=`${root}/archive-index.json`,entries=fs.existsSync(indexFile)?read(indexFile).entries:[],dirs = ['raw-results', 'traces'];
  for (const dir of dirs) for (const n of fs.readdirSync(`${root}/${dir}`).filter(n=>n.endsWith('.json.gz')||n.endsWith('.jsonl'))) {
    const p = `${root}/${dir}/${n}`, original = fs.readFileSync(p), decoded = n.endsWith('.gz')?gunzipSync(original):original, encoded = brotliCompressSync(decoded, { params: { [constants.BROTLI_PARAM_QUALITY]: 4, [constants.BROTLI_PARAM_LGWIN]: 24 } }), dest = n.endsWith('.gz')?p.replace(/\.gz$/, '.br'):p+'.br';
    if (hash(brotliDecompressSync(encoded)) !== hash(decoded)) throw Error('Archive changed values');
    if(fs.existsSync(dest))throw Error('Archive destination already exists: '+dest);
    fs.writeFileSync(dest, encoded); entries.push({ original: p, file: dest, originalBytes: original.length,originalSha256:hash(original), bytes: encoded.length, decodedSha256: hash(decoded), sha256: hash(encoded) }); fs.unlinkSync(p);
  }
  write(indexFile, { date: new Date().toISOString(), method: 'Brotli quality4 lgwin24; decoded JSON byte-identical; original capture paths remain in immutable raw records', entries });
  console.log('Archived', entries.length, 'files:', entries.reduce((s,x)=>s+x.originalBytes,0),'→',entries.reduce((s,x)=>s+x.bytes,0));
}
