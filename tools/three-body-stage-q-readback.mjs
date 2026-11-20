// Read-only reanalysis of Stage P. Never writes inside its directory.
import fs from'node:fs';import{createHash}from'node:crypto';import{brotliDecompressSync,gunzipSync}from'node:zlib';
import{distribution,completeEvents,unionOverlap}from'./three-body-stage-p-analysis.mjs';
const out=process.argv[2]??'.three-body-evidence/stage-q/readback';fs.mkdirSync(out,{recursive:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),load=p=>{const bytes=fs.readFileSync(p);return{value:JSON.parse(p.endsWith('.br')?brotliDecompressSync(bytes):p.endsWith('.gz')?gunzipSync(bytes):bytes),sha256:hash(bytes),file:p};};
const files=['docs/three-body/review-44/stage-p/raw-results/public-chromium-001-unmodified-public-public.json.br','.three-body-evidence/stage-q/old-generator/raw-results/public-chromium-001-unmodified-public-public.json.gz'];
const interval=files.filter(fs.existsSync).map(p=>{const r=load(p),q=r.value.data.requests;return{file:p,sha256:r.sha256,n:q.length,seq:q.at(-1).seq,T0Interarrival:distribution(q.slice(1).map((r,i)=>r.T0-q[i].T0)),topGaps:q.slice(1).map((r,i)=>({previousSeq:q[i].seq,nextSeq:r.seq,from:q[i].T0,to:r.T0,gap:r.T0-q[i].T0,previousQueue:q[i].T1-q[i].T0,nextQueue:r.T1-r.T0})).sort((a,b)=>b.gap-a.gap).slice(0,10),scope:'Observed actual send intervals only. No reconstruction of missing T-1.'};});
const prefix='docs/three-body/review-44/stage-p/',id='causal-chromium-001-F-causal-light';
const run=load(prefix+'raw-results/'+id+'.json.br'),a=load(prefix+'traces/'+id+'-analysis.json').value,tr=load(prefix+'traces/'+id+'.json.br');
const events=completeEvents(tr.value.traceEvents),meta=tr.value.traceEvents.filter(e=>e.ph==='M'&&e.name==='thread_name'&&e.pid===a.clock.mainPid);
const workers=meta.filter(e=>/DedicatedWorker/i.test(e.args?.name??'')),requests=run.value.data.requests;
const gaps=requests.slice(1).map((r,i)=>({previous:requests[i],next:r,gap:r.T0-requests[i].T0})).sort((a,b)=>b.gap-a.gap).slice(0,10).map(g=>{
 const begin=g.previous.T0+a.clock.offsetMs,end=g.next.T0+a.clock.offsetMs;
 const details=tid=>events.filter(e=>e.pid===a.clock.mainPid&&e.tid===tid&&e.ts/1000<end&&(e.ts+e.dur)/1000>begin&&/RunTask|TimerFire|FunctionCall|GC/.test(e.name)).sort((a,b)=>b.dur-a.dur).slice(0,8).map(e=>({name:e.name,tsMs:e.ts/1000,durationMs:e.dur/1000,cpuMs:Number.isFinite(e.tdur)?e.tdur/1000:null,overlapMs:unionOverlap([e],begin,end)}));
 return{fromPage:g.previous.T0,toPage:g.next.T0,gap:g.gap,main:details(a.clock.mainTid),workerCandidates:workers.map(w=>({tid:w.tid,name:w.args.name,events:details(w.tid)}))};
});
const result={date:new Date().toISOString(),interval,traceSource:{file:tr.file,sha256:tr.sha256},runSource:{file:run.file,sha256:run.sha256},clock:a.clock,workerIdentity:'Candidate from unique DedicatedWorker thread metadata; no Worker-side marker was present in Stage P.',workerThreads:workers.map(e=>({pid:e.pid,tid:e.tid,name:e.args.name})),gaps,limits:['Actual send interval is not a measured scheduled timer delay.','Candidate Worker identity is not an independently marked OS thread identity.','Shared gaps do not distinguish OS scheduling, process-wide suspension, native locks or browser scheduling.','No original1249ms time-correlated trace exists.']};
fs.writeFileSync(out+'/send-gap-reanalysis.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({interval:interval.map(r=>({file:r.file,n:r.n,interarrival:r.T0Interarrival})),workerThreads:result.workerThreads,gapMax:gaps[0].gap}));
