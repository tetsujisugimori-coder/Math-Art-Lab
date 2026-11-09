// Run with node --expose-gc tools/three-body-stage-p.mjs --suite=smoke|matrix|long|probes
// Diagnostic-only server, separate from Vite / Pages. Never imported by src/.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createServer } from 'node:http';
import { build, transformSync } from 'esbuild';
import ts from 'typescript';
import { chromium, webkit } from '@playwright/test';
import { installStageP } from './three-body-stage-p-browser.mjs';
import { distribution, analyzeTrace } from './three-body-stage-p-analysis.mjs';

const args = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const suite = args.suite ?? 'smoke', root = args.output ?? 'docs/three-body/review-44/stage-p';
for (const d of ['raw-results', 'traces', 'screenshots']) fs.mkdirSync(`${root}/${d}`, { recursive: true });
const hash = s => createHash('sha256').update(s).digest('hex');
const deadline = (promise, ms, label) => { let timer; return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error(label + ' deadline')), ms); })]).finally(() => clearTimeout(timer)); };
const json = (p, x) => fs.writeFileSync(p, JSON.stringify(x, null, 2) + '\n');
const source = p => fs.readFileSync(p, 'utf8');
const sourceHashes = Object.fromEntries(execFileSync('git', ['ls-files', 'src'], { encoding: 'utf8' }).trim().split(/\r?\n/).map(p => [p, hash(source(p).replaceAll('\r\n', '\n'))]));
const toolHashes = Object.fromEntries(['tools/three-body-stage-p.mjs','tools/three-body-stage-p-browser.mjs','tools/three-body-stage-p-analysis.mjs','tools/three-body-review-diagnostic.mjs'].map(p=>[p,hash(source(p).replaceAll('\r\n','\n'))]));
for(const[p,h]of Object.entries(toolHashes)){
  const d=`${root}/tool-versions/${h}`;fs.mkdirSync(d,{recursive:true});const file=`${d}/${path.basename(p)}`,contents=source(p).replaceAll('\r\n','\n');
  if(fs.existsSync(file)&&hash(fs.readFileSync(file))!==h)throw Error('Archived tool version was modified');fs.writeFileSync(file,contents);
}
// Reuse the historical shim/transform exactly, without running its old harness.
const old = ts.createSourceFile('old.mjs', source('tools/three-body-review-diagnostic.mjs'), ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const oldShimNode = old.statements.flatMap(s => ts.isVariableStatement(s) ? [...s.declarationList.declarations] : []).find(d => d.name.getText(old) === 'shim');
const oldInstrumentNode = old.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'instrument');
const legacyShim = oldShimNode.initializer.text;
const legacyInstrument = new Function('transformSync', `return (${oldInstrumentNode.getText(old)})`)(transformSync);
const cache = new Map();
function change(js, from, to, label) { if (!js.includes(from)) throw Error('Missing instrumentation anchor: ' + label); return js.replace(from, to); }
function instrument(p, text, mode) {
  if(['public','bare'].includes(mode))return transformSync(text,{loader:'ts',target:'es2022',format:'esm'}).code;
  let js = mode === 'legacy' ? legacyInstrument(p, text) : transformSync(text, { loader: 'ts', target: 'es2022', format: 'esm' }).code;
  if (p === 'src/three-body-state.ts') js = js.replace(/function record\(([^)]*)\)\s*\{/, '$&if(globalThis.__stageP.flags.history===false)return;');
  if (p === 'src/three-body-render.ts') {
    js = js.replace('willReadFrequently: true', 'willReadFrequently: globalThis.__stageP.options.context!=="default"');
    js=js.replace('canvas.getBoundingClientRect()', '(globalThis.__stageP.flags.geometryCache?{width:438,height:330}:canvas.getBoundingClientRect())');
    if (mode !== 'off') js = js.replace(/function drawOrbit\(([^)]*)\)\s*\{/, `function drawOrbit(...args){globalThis.__stageP.lastDraw[args[0].id]={step:args[1].steps,positions:JSON.stringify(args[1].bodies.map(({x,y})=>({x,y}))),points:Math.min(1000,args[3].data.length,args[5].length),width:args[0].width,height:args[0].height};return __stagePDraw(...args)}\nfunction __stagePDraw($1){`);
  }
  if (p !== 'src/three-body-view.ts') return js;
  for (const name of ['paint', 'observe', 'refresh']) {
    const guard = name === 'paint' ? 'if(!__stageP.flags.canvas)return true;' : name === 'observe' ? 'if(!__stageP.flags.dom)return;' : 'if(!__stageP.flags.dom){schedulePaint();return;}';
    js = js.replace(new RegExp(`function ${name}\\(([^)]*)\\)\\s*\\{`), `$&${guard}`);
  }
  js = js.replace('function renderStatus(pending) {', 'function renderStatus(pending) {if(!__stageP.flags.dom)return;');
  if(!/function pause\(\)\s*\{/.test(js))throw Error('Missing pause anchor');
  js=js.replace(/function pause\(\)\s*\{/, 'function pause(){return __stageP.pause(()=>__stagePOriginalPause())}\nfunction __stagePOriginalPause(){');
  js = change(js, 'renderStatus(false);', 'renderStatus(false);__stageP.present();', 'display commit');
  js = change(js, 'function schedulePaint() {', 'function schedulePaint(){if(!raf&&__stageP.active&&__stageP.options.mode!=="off")__stageP.requestedFrame=performance.now();', 'rAF request');
  js = 'import {verlet as __stagePVerlet} from "./three-body";\n' + js;
  js = js.replace(/function calculate\(([^)]*)\)\s*\{/, '$&if(__stageP.flags.kernel){for(let i=0;i<n&&!e.reason;i++){const next=__stagePVerlet(e.phase,e.config);e.reason=next.reason;if(!next.reason)e.phase=next.phase;}if(e.reason)pause();return;}');
  if (mode !== 'off') for (const name of ['calculate', 'paint', 'observe', 'refresh']) {
    js = js.replace(new RegExp(`function ${name}\\(([^)]*)\\)\\s*\\{`), `function ${name}(...args){return __stageP.phase('${name}',()=>__stagePOriginal_${name}(...args))}\nfunction __stagePOriginal_${name}($1){`);
  }
  const marker = 'configForm(e.config);', at = js.lastIndexOf(marker);
  if (at < 0) throw Error('Missing private controller anchor');
  const controller = `globalThis.__stageP.control={
    small:()=>({step:e.phase.steps,bStep:comparison?.b.phase.steps,ab:!!comparison,playing,disposed,clockEpoch,safetyEpoch,timer:timer!==null,raf:!!raf,observed:main.dataset.observedStep,a:aCanvas.dataset.paintedStep,b:comparison?bCanvas.dataset.paintedStep:undefined,trail:e.trail.data.length,graph:e.graph.data.length}),
    snapshot:()=>({e,comparison,small:__stageP.control.small(),domPositions:main.dataset.domPositions,aPositions:aCanvas.dataset.positions,bPositions:bCanvas.dataset.positions,reason:e.reason||comparison?.b.reason,layout:{mode:document.compatMode,visibility:document.visibilityState,canvases:[aCanvas,...(comparison?[bCanvas]:[])].map(cv=>({id:cv.id,width:cv.width,height:cv.height,rect:{width:cv.getBoundingClientRect().width,height:cv.getBoundingClientRect().height}}))}}),
    configure(o){pause();__stageP.flags={dom:true,canvas:true,history:true,kernel:false};e=createExperiment(presets[0].config);comparison=o.ab?createComparison(e.config,0,'x',1e-6):null;if(comparison)e=comparison.a;normal=null;
      for(let i=0;i<(o.saturated?26000:0);i+=2000){if(comparison)advanceComparison(comparison,2000);else advance(e,2000)}
      for(const cv of [aCanvas,bCanvas]){cv.style.width='438px';cv.style.height='330px'}
      layers.length=6000;layers.trails=o.trails!==false;layers.glow=o.glow!==false;layers.velocity=o.vectors!==false;layers.acceleration=o.vectors!==false;input('speed').value='4';refresh();
      __stageP.nextFlags={dom:o.dom!==false,canvas:o.canvas!==false,history:!o.kernel,kernel:!!o.kernel,geometryCache:!!o.geometryCache};},
    activate(){__stageP.flags=__stageP.nextFlags;globalThis.__tbDiag?.reset();},
    play, stop:()=>{pause();refresh()}, batch(n){calculate(n);refresh()}
  };`;
  return js.slice(0, at) + controller + js.slice(at);
}
async function assets(mode) {
  if (cache.has(mode)) return cache.get(mode);
  const result = await build({ entryPoints: ['src/main.ts'], bundle: true, format: 'esm', target: 'es2022', write: false, outdir: 'test-results/stage-p-bundle', plugins: [{ name: 'stage-p-only', setup(b) {
    b.onLoad({ filter: /src[\\/].*\.ts$/ }, a => { const p = 'src/' + a.path.split(/[\\/]/).at(-1); return { contents: instrument(p, source(p), mode), loader: 'js' }; });
  } }] });
  const files = new Map(result.outputFiles.map(f => [path.basename(f.path), f.contents])); cache.set(mode, files); return files;
}
const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost'), mode = u.searchParams.get('mode') ?? 'light', files = await assets(mode);
    if (u.pathname === '/') {
      const opts = { mode, runId: u.searchParams.get('run'), context: u.searchParams.get('context') };
      const shim = (mode === 'legacy' ? legacyShim : '') + `(${installStageP.toString()})(${JSON.stringify(opts)});`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(source('index.html').replace('src="/src/main.ts"', `src="/main.js?mode=${mode}"`).replace('</head>', `<link rel="stylesheet" href="/main.css?mode=${mode}"><script>${shim}</script></head>`));
    } else { const file = files.get(u.pathname.slice(1)); res.setHeader('Content-Type', u.pathname.endsWith('.css') ? 'text/css' : 'application/javascript'); res.end(file ?? ''); }
  } catch (e) { res.statusCode = 500; res.end(String(e)); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}`;
const full = { name: 'F', ab: true, saturated: true, dom: true, canvas: true };
function plans() {
  if (suite === 'smoke') return [{ ...full, duration: 1200, trace: true }, { ...full, name: 'synthetic', duration: 2000, target: 'synthetic-paint', synthetic: 'paint', trace: true }];
  if (suite === 'long') return (args.browser==='webkit'?['light']:['off', 'light', 'legacy']).flatMap(mode => [0, 1, 2].map(repeat => ({ ...full, mode, duration: 60000, repeat, trace: mode !== 'off' && repeat === 0 })));
  if (suite === 'public') return [{...full,name:'unmodified-public',mode:'public',duration:args.browser==='webkit'?60000:300000,trace:false}];
  if (suite === 'legacy-smoke')return [{...full,mode:'legacy',duration:1200,trace:true}];
  if (suite==='deep')return [{...full,name:'native-localization',mode:'deep',duration:60000,trace:true}];
  if(suite==='components')return [0,1,2].flatMap(repeat=>[{name:'A',kernel:true,dom:false,canvas:false},{name:'B',dom:false,canvas:false},{name:'C',canvas:false},{name:'D',dom:false},{name:'E'},full].map(o=>({saturated:true,...o,duration:3000,repeat,trace:repeat===0})));
  if(suite==='neither')return [0,1,2].map(repeat=>({...full,name:'F-no-display',dom:false,canvas:false,duration:60000,repeat,trace:repeat===0}));
  if(suite==='minimal')return [0,1,2].map(repeat=>({...full,name:'no-poll-public',mode:'bare',noPoll:true,duration:60000,repeat})).concat([{...full,name:'single-request',mode:'bare',noPoll:true,duration:60000,interval:0}]);
  if(suite==='stops')return [0,1,2].flatMap(repeat=>['pause','escape','visibility'].map(action=>({...full,name:'stop-'+action,action,duration:3000,repeat,trace:repeat===0})));
  if (suite === 'legacy')return [0,1,2].map(repeat=>({...full,mode:'legacy',duration:60000,repeat,trace:repeat===0}));
  if(suite==='causal')return [0,1,2].flatMap(repeat=>[
    {...full,name:'F-causal'},
    {...full,name:'F-causal-no-canvas',canvas:false},
    {...full,name:'F-causal-no-dom',dom:false},
    {...full,name:'unforced-backend',backend:'unforced'},
    {...full,name:'gpu-disabled',backend:'disabled'}
    ,{...full,name:'geometry-cache',geometryCache:true}
    ,{...full,name:'default-context-long',context:'default'}
  ].map(o=>({...o,duration:60000,repeat,trace:repeat===0}))).concat([{...full,name:'os-counters',duration:60000,osCounters:true,trace:true}]);
  if (suite === 'ablation') return [0,1,2].flatMap(repeat=>[full,{...full,name:'F-no-dom',dom:false},{...full,name:'F-no-canvas',canvas:false},{...full,name:'F-neither',dom:false,canvas:false}].map(o=>({...o,duration:3000,repeat,trace:repeat===0})));
  if (suite === 'probes') return [{...full,name:'native-localization',mode:'deep',duration:60000,trace:true},...['calculate', 'paint', 'observe'].flatMap(target => [0, 1, 2].map(repeat => ({ ...full, target, duration: 15000, repeat, trace: repeat === 0 })))].concat([{ ...full, name: 'synthetic', target: 'synthetic-compute', duration: 2000, synthetic: 'compute', trace: true }, { ...full, name: 'escape', action: 'escape', duration: 3000 }, { ...full, name: 'visibility', action: 'visibility', duration: 3000 }]);
  const stages = [{ name: 'A', kernel: true, dom: false, canvas: false }, { name: 'B', dom: false, canvas: false }, { name: 'C', canvas: false }, { name: 'D', dom: false }, { name: 'E' }, full];
  const factors = [{ ...full, name: 'DPR1', dpr: 1 }, { ...full, name: 'short', saturated: false }, { ...full, name: 'no-trails', trails: false }, { ...full, name: 'no-glow', glow: false }, { ...full, name: 'no-vectors', vectors: false }, { ...full, name: 'default-context', context: 'default' }, { ...full, name: 'accumulated', accumulated: true }, { ...full, name: 'cpu4', cpu: 4 }, { ...full, name: 'trace-off' }, { ...full, name: 'instrument-off', mode: 'off' }];
  return [0, 1, 2].flatMap(repeat => [...stages, ...factors].map(o => ({ duration: 3000, ...o, repeat, trace: !['trace-off', 'instrument-off'].includes(o.name) && repeat === 0 })));
}
const manifest = { schema: 1, started: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), sourceHashes, toolHashes, suite, environment: { os: os.platform(), release: os.release(), cpu: os.cpus()[0].model, memory: os.totalmem(), node: process.version }, runs: [] };
const manifestFile = `${root}/raw-results/${suite}-${args.browser ?? 'both'}-manifest.json`;
if(fs.existsSync(manifestFile))throw Error('Existing evidence: use --output with a new directory; no overwrite permitted');
const launchArgs = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
let counter = 0;
async function run(engineName, o) {
  const id = `${suite}-${engineName}-${String(++counter).padStart(3, '0')}-${o.name}-${o.mode ?? 'light'}`, mode = o.mode ?? 'light';
  const runArgs=engineName!=='chromium'?[]:o.backend==='unforced'?[]:o.backend==='disabled'?['--disable-gpu']:launchArgs;
  const report = { id, options: o, mode, start: new Date().toISOString(), sourceHashes, toolHashes, environment: { freeMemory: os.freemem(), nodeHeap: process.memoryUsage(), launchArgs: runArgs }, samples: [], errors: [] };
  const file = `${root}/raw-results/${id}.json.gz`; manifest.runs.push({ id, file, options: o }); json(manifestFile, manifest);
  const save = () => fs.writeFileSync(file, gzipSync(JSON.stringify(report)));
  const journal = `${root}/raw-results/${id}-samples.jsonl`;
  const browser = await ({ chromium, webkit }[engineName]).launch({ headless: true, ...(engineName === 'chromium' ? { args: runArgs } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: o.dpr ?? 2 }), page = await context.newPage();
  page.on('pageerror', e => report.errors.push(String(e)));
  const cdp = engineName === 'chromium' ? await context.newCDPSession(page) : null, browserCdp = cdp ? await browser.newBrowserCDPSession() : null;
  let tracing = false,browserClosed=false;
  try {
    report.browser = { name: engineName, version: browser.version(), cdp: cdp ? await cdp.send('Browser.getVersion') : 'NOT_TESTED' };
    if(browserCdp&&!o.noPoll)report.browser.gpuInfo=await browserCdp.send('SystemInfo.getInfo').catch(e=>({status:'NOT_TESTED',reason:String(e)}));
    const navigation=await page.goto(`${url}/?mode=${mode}&run=${id}&context=${o.context ?? 'readback'}`);if(navigation.status()>=400)throw Error('Diagnostic HTTP '+navigation.status()+': '+await navigation.text());await page.locator('#experiment').selectOption('three-body');
    if (o.accumulated) for (let i = 0; i < 8; i++) { await page.locator('#experiment').selectOption('cooperation'); await page.locator('#experiment').selectOption('three-body'); }
    if(['public','bare'].includes(mode)) {
      await page.locator('#tb-length').fill('6000');await page.locator('[data-tb-layer="velocity"]').check();await page.locator('[data-tb-layer="acceleration"]').check();await page.locator('#tb-compare').click();await page.locator('#tb-speed').fill('4');await page.locator('#tb-play').click();
      await page.waitForFunction(()=>Number(document.querySelector('.three-body').dataset.computedStep)>=26000,null,{timeout:15000});await page.locator('#tb-play').click({timeout:5000});await page.waitForFunction(()=>document.querySelector('.three-body').dataset.renderState==='settled');
      await page.evaluate(()=>{const m=document.querySelector('.three-body'),a=document.querySelector('#tb-a'),b=document.querySelector('#tb-b');__stageP.control={small:()=>({step:Number(m.dataset.computedStep),bStep:Number(m.dataset.computedBStep),ab:true,playing:m.dataset.playing==='true',timer:null,clockEpoch:null,safetyEpoch:null,observed:m.dataset.observedStep,a:a.dataset.paintedStep,b:b.dataset.paintedStep,trail:Number(m.dataset.historyLength),graph:Number(m.dataset.graphLength)}),snapshot:()=>({small:__stageP.control.small(),domPositions:m.dataset.domPositions,aPositions:a.dataset.positions,layout:{visibility:document.visibilityState,canvases:[a,b].map(cv=>({id:cv.id,width:cv.width,height:cv.height,rect:{width:cv.getBoundingClientRect().width,height:cv.getBoundingClientRect().height}}))}}),play:()=>document.querySelector('#tb-play').click()};});
    } else await page.evaluate(o => __stageP.control.configure(o), o);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    if(!['public','bare'].includes(mode))await page.evaluate(()=>__stageP.control.activate());
    report.before = await page.evaluate(() => __stageP.control.snapshot());
    if(o.geometryCache&&report.before.layout.canvases.some(c=>c.rect.width!==438||c.rect.height!==330))throw Error('Diagnostic geometry-cache fixture dimensions differ');
    if (cdp&&!o.noPoll) { await cdp.send('Performance.enable'); if (o.cpu) await cdp.send('Emulation.setCPUThrottlingRate', { rate: o.cpu }); }
    if (cdp && o.trace) {
      const categories = ['toplevel', 'devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink.user_timing', 'v8', 'disabled-by-default-v8.gc', 'cc', 'gpu', 'viz', 'input', 'renderer.scheduler', 'sequence_manager', 'skia'];
      report.traceCategories = categories; report.traceBuffer = [];
      cdp.on('Tracing.bufferUsage', x => report.traceBuffer.push({ hostMono: performance.now(), ...x }));
      await cdp.send('Tracing.start', { transferMode: 'ReturnAsStream', streamFormat: 'json', streamCompression: 'gzip', bufferUsageReportingInterval: 1000, traceConfig: { recordMode: 'recordContinuously', includedCategories: categories } }); tracing = true;
    }
    await page.evaluate(o => __stageP.workerStart(o.duration, o.target, o.action, o.synthetic,o.interval??37), o);
    const start = performance.now();
    while (!o.noPoll&&performance.now() - start < o.duration + 10000) {
      const hostBegin = performance.now(), cpu = os.cpus().map(c => c.times);
      const sample = { hostBegin, hostEnd: null, freeMemory: os.freemem(), hostCpuTimes: cpu, nodeHeap: process.memoryUsage() };
      try { if (cdp) { sample.metrics = (await deadline(cdp.send('Performance.getMetrics'), 5000, 'CDP metrics')).metrics; sample.processes = (await deadline(browserCdp.send('SystemInfo.getProcessInfo'), 5000, 'CDP processes')).processInfo; } sample.page = await deadline(page.evaluate(() => ({ now: performance.now(), state: __stageP.control.small(), done: !__stageP.active })), 5000, 'Page heartbeat'); }
      catch (e) { sample.error = String(e); }
      sample.hostEnd = performance.now(); report.samples.push(sample); fs.appendFileSync(journal, JSON.stringify(sample) + '\n');
      if(o.osCounters&&os.platform()==='win32'){
        const ids=(sample.processes??[]).map(x=>Number(x.id)).filter(Number.isSafeInteger);
        const command=`$stageIds=@(${ids.join(',')});$stageMem=Get-CimInstance Win32_PerfFormattedData_PerfOS_Memory;$stageProc=Get-CimInstance Win32_PerfFormattedData_PerfProc_Process|Where-Object {$stageIds -contains $_.IDProcess}|Select-Object IDProcess,Name,PercentProcessorTime,WorkingSet,WorkingSetPrivate,PageFaultsPersec,PageFileBytes,IOReadBytesPersec,IOWriteBytesPersec;[pscustomobject]@{memory=($stageMem|Select-Object AvailableMBytes,CommittedBytes,CommitLimit,PagesInputPersec,PagesOutputPersec,PageReadsPersec);processes=@($stageProc)}|ConvertTo-Json -Depth 5 -Compress`;
        const begin=performance.now();try{sample.osCounters={begin,end:null,value:JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',timeout:5000,windowsHide:true}))};}catch(e){sample.osCounters={begin,status:'NOT_TESTED',reason:String(e)}}sample.osCounters.end=performance.now();fs.appendFileSync(journal,JSON.stringify({osCounters:sample.osCounters,hostSampleBegin:hostBegin})+'\n');
      }
      if (sample.error) throw Error(sample.error);
      if (sample.page?.done) break;
      await new Promise(r => setTimeout(r, 1000));
    }
    if(o.noPoll)await deadline(page.evaluate(()=>__stageP.done),o.duration+10000,'Minimal independent stop');
    const finished = await page.evaluate(() => !__stageP.active);
    if (!finished) throw Error('Measurement deadline exceeded; partial samples retained');
    report.result = await page.evaluate(() => __stageP.done);
    report.data = await page.evaluate(() => __stageP.result());
    save(); // Preserve all recovered spans before expensive trace decoding.
    const final=report.result.state.small,stop=report.result.stop;
    if(final.bStep!=null&&final.bStep!==final.step)report.errors.push('FUNCTIONAL: A/B step mismatch');
    if(stop.after.step!==stop.later.step)report.errors.push('FUNCTIONAL: calculation continued after stop');
    if(final.timer===true)report.errors.push('FUNCTIONAL: compute timer remains');
    if(o.canvas!==false&&o.dom!==false&&(final.observed!==String(final.step)||final.a!==String(final.step)||(final.ab&&final.b!==String(final.step))))report.errors.push('FUNCTIONAL: final display step mismatch');
    if(final.trail>6000||final.graph>1200)report.errors.push('FUNCTIONAL: history cap exceeded');
    if (mode === 'legacy') report.legacy = await page.evaluate(() => __tbDiag.result());
    await page.locator('#tb-boards').screenshot({ path: `${root}/screenshots/${id}.png`, timeout: 5000 });
  } catch (e) { report.errors.push(String(e)); report.partial = await deadline(page.evaluate(() => ({ state: __stageP.control.snapshot(), data: __stageP.result() })), 2000, 'Partial state').catch(() => null); }
  finally {
    if (tracing) try {
      const complete = new Promise(r => cdp.once('Tracing.tracingComplete', r)); await cdp.send('Tracing.end'); const end = await deadline(complete,10000,'Trace completion'); report.traceEnd = end;
      const traceFile = `${root}/traces/${id}.json.gz`, fd = fs.openSync(traceFile, 'w');
      try { while (true) { const chunk = await cdp.send('IO.read', { handle: end.stream }); fs.writeSync(fd, Buffer.from(chunk.data, chunk.base64Encoded ? 'base64' : 'utf8')); if (chunk.eof) break; } } finally { fs.closeSync(fd); await cdp.send('IO.close', { handle: end.stream }); }
      const bytes = fs.readFileSync(traceFile); report.trace = { file: traceFile, bytes: bytes.length, sha256: hash(bytes), dataLossOccurred: end.dataLossOccurred ?? null };save();await browser.close();browserClosed=true;
      const trace = JSON.parse(gunzipSync(bytes)); report.traceAnalysis = analyzeTrace(trace.traceEvents, report.data ?? report.partial?.data ?? { marks: [], spans: [] });
    } catch (e) { report.errors.push('Trace: ' + String(e)); }
    report.finish = new Date().toISOString(); save();
    json(`${root}/raw-results/${id}-summary.json`, { id, options: o, errors: report.errors, elapsed: report.result ? report.result.end - report.result.begin : null, steps: report.result?.state.small, phases: Object.fromEntries(['calculate', 'paint', 'observe', 'refresh'].map(n => [n, distribution((report.data?.spans ?? []).filter(s => s.name === n).map(s => s.end - s.begin))])), latency: distribution((report.data?.requests ?? []).map(r => r.T1 - r.T0)), stop: report.result?.stop, frameIntervals: distribution((report.data?.frames ?? []).slice(1).map((f, i) => f.at - report.data.frames[i].at)), trace: report.trace, traceAnalysis: report.traceAnalysis });
    if(!browserClosed)await browser.close();if(report.errors.length)process.exitCode=1; global.gc?.(); console.log(JSON.stringify({ id, errors: report.errors, traceBytes: report.trace?.bytes, stop: report.result?.stop && { T0T1: report.result.stop.T1 - report.result.stop.T0, hit: report.result.stop.targetHit }, phases: report.data?.spans.length }));
  }
}
try { for (const engine of (args.browser ? [args.browser] : ['chromium', 'webkit'])) for (const o of plans()) await run(engine, o); }
finally { manifest.finished = new Date().toISOString(); json(manifestFile, manifest); server.close(); }
