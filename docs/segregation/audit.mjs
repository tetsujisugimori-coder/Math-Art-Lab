import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {createCity,advance,defaults,MAX_STEPS} from '../../src/segregation.ts';
mkdirSync(new URL('./evidence/',import.meta.url),{recursive:true});
const original=readFileSync(new URL('./request.md',import.meta.url),'utf8').trimEnd();
const readback=readFileSync(new URL('./issue-readback.txt',import.meta.url),'utf8').replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').trimEnd();
if(original!==readback)throw new Error('Issue body mismatch');
const timings=[];
for(const size of [16,30,40])for(const rule of ['random','satisfying','best'])for(const vacancy of [2,15,50]){
  const c=createCity({...defaults,size,rule,vacancy,threshold:80}),values=[];
  for(let i=0;i<120&&c.status==='active';i++){const start=performance.now();advance(c);values.push(performance.now()-start);}
  const sorted=[...values].sort((a,b)=>a-b);
  timings.push({size,rule,vacancy,steps:c.step,medianMs:sorted[Math.floor(sorted.length/2)]??0,p95Ms:sorted[Math.floor(sorted.length*.95)]??0,maxMs:Math.max(0,...values)});
}
const experiments=[];
for(const seed of [15015,1,42,2026])for(const threshold of [0,30]){
  const c=createCity({...defaults,seed,threshold}),initial={...c.metrics},start=performance.now();while(c.status==='active')advance(c);
  experiments.push({seed,threshold,initial,final:c.metrics,step:c.step,moves:c.moves,status:c.status,wallMs:performance.now()-start});
}
const result={at:new Date().toISOString(),node:process.version,platform:os.platform(),release:os.release(),cpu:os.cpus()[0].model,cpus:os.cpus().length,stepLimit:MAX_STEPS,issueBodyMatches:true,timings,experiments};
writeFileSync(new URL('./evidence/model-audit.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({issueBodyMatches:true,maxStepMs:Math.max(...timings.map(t=>t.maxMs)),experiments:experiments.map(e=>({seed:e.seed,threshold:e.threshold,step:e.step,status:e.status,initialAdjacency:e.initial.adjacency,finalAdjacency:e.final.adjacency}))},null,2));
