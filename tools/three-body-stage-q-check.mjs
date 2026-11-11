import fs from'node:fs';
const root=process.argv[2]??'test-results/stage-q',r=JSON.parse(fs.readFileSync(root+'/report/summary.json')),c=JSON.parse(fs.readFileSync(root+'/report/checks.json'));
const failures=[...c.failures];
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name):[d+'/'+e.name]);
const counts={ci:4,smoke:4,capture:36,'capture-probe':18,screen:72,follow:12,long:4,stops:9,host:9,sender:9,'sender-targets':9,os:6,targets:9,lifecycle:15};
const manifests=walk(root).filter(p=>p.endsWith('-manifest.json')).map(p=>({file:p,...JSON.parse(fs.readFileSync(p))})).filter(m=>m.toolHashes?.['tools/three-body-stage-q.mjs']);
for(const m of manifests){
 const expected=m.plannedCount??counts[m.suite];
 if(!m.finished||m.runs.length!==expected)failures.push({file:m.file,reason:'Incomplete suite',expected,actual:m.runs.length,finished:m.finished??null});
 for(const run of m.runs)if(!fs.existsSync(run.file)||!r.runs.some(x=>x.id===run.id&&x.file===run.file.replaceAll('\\','/')))failures.push({id:run.id,reason:'Manifest run missing raw or report'});
}
const ci=process.argv.find(x=>x.startsWith('--ci='))?.split('=')[1];
if(ci)for(const suite of ['ci','smoke','capture','screen','long','host','sender','lifecycle','targets','sender-targets',...(ci==='chromium'?['capture-probe']:[]),...(process.platform==='win32'?['os']:[])])if(!manifests.some(m=>m.engine===ci&&m.suite===suite))failures.push({reason:'Required CI suite absent',suite,engine:ci});
if(!r.runs.length)failures.push({reason:'No raw evidence'});
for(const x of r.runs){
 if(Number.isFinite(x.stop?.extraWithinPause)&&x.stop.extraWithinPause!==0)failures.push({id:x.id,reason:'Physics advanced inside pause',steps:x.stop.extraWithinPause});
 if(x.options.positive==='worker'&&x.input.scheduledToSend.max<50)failures.push({id:x.id,reason:'Worker timer-delay positive control not detected'});
 if(x.options.positive==='main'&&(!x.stop?.targetHit||x.input.sendToReceive.max<50))failures.push({id:x.id,reason:'main delay positive control not detected'});
 if(x.options.trace&&x.browser.name==='chromium'&&(!x.trace?.clock.completeMarkerSet||x.trace.dataLoss===true))failures.push({id:x.id,reason:'trace clock/dataloss'});
}
const budgets=r.runs.filter(x=>x.budget.scope==='PRODUCT_OBSERVED_WINDOW'&&x.budget.verdict!=='PASS_OBSERVED_WINDOW').map(x=>({id:x.id,budget:x.budget}));
console.log(JSON.stringify({functionalFailures:failures,performanceBudgetNotPassed:budgets,performanceScope:'Diagnostic budgets, not a worst-case guarantee; PARTIAL remains if old spikes cannot be reproduced or cause is unknown.'},null,2));
if(budgets.length)console.log('::warning title=Stage Q performance budget::Some observed budgets are PARTIAL or NOT_TESTED; inspect artifact. This is not a performance PASS.');
if(failures.length)process.exitCode=1;
