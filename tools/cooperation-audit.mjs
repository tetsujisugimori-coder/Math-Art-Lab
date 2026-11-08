// Model-only stress evidence. Browser memory and real-device performance are separate.
import {readFileSync,writeFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/cooperation.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const model=await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const heap=()=>{global.gc?.();return process.memoryUsage().heapUsed;};
let world=model.createWorld({...model.defaults,rule:'fermi',mutation:.01});
for(let i=0;i<1000;i++)world=model.advance(world);
const warmHeap=heap(),start=performance.now();
for(let i=0;i<10000;i++)world=model.advance(world);
const elapsed=performance.now()-start,finalHeap=heap();
let max=model.createWorld({...model.defaults,size:80,rule:'fermi',mutation:.01});
const maxStart=performance.now();for(let i=0;i<100;i++)max=model.advance(max);
const report={node:process.version,platform:process.platform,scope:'model only, forced-GC heap; not browser memory or mobile performance',generations:world.generation,history:world.history.length,initial:world.initial.length,cells:world.cells.length,decisions:world.decisions.length,warmHeap,finalHeap,heapDifference:finalHeap-warmHeap,tenThousandGenerationMs:elapsed,max80OneHundredGenerationMs:performance.now()-maxStart,populationConserved:world.metrics.cooperators+world.metrics.defectors===900,maxPopulationConserved:max.metrics.cooperators+max.metrics.defectors===6400};
writeFileSync(new URL('../docs/cooperation/evidence/model-stress.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
if(report.history!==600||!report.populationConserved||!report.maxPopulationConserved)process.exitCode=1;
