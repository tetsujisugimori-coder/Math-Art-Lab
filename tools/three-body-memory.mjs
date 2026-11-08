// Node heap observations, not a browser/device memory guarantee.
import {build} from 'esbuild';
import {writeFileSync} from 'node:fs';
const bundled=await build({entryPoints:['src/three-body-state.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createExperiment,advance}=await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const {presets}=await import('../src/three-body.ts');
const e=createExperiment(presets[0].config),measurements=[];
for(const target of [0,26000,52000,104000,208000]){
  const start=performance.now();while(e.phase.steps<target)advance(e,Math.min(2000,target-e.phase.steps));if(global.gc)global.gc();measurements.push({steps:target,trail:e.trail.data.length,graph:e.graph.data.length,heapUsed:process.memoryUsage().heapUsed,elapsedMs:performance.now()-start});
}
writeFileSync('docs/three-body/memory-results.json',JSON.stringify({environment:'Node '+process.version,gcAvailable:!!global.gc,measurements},null,2));console.log(measurements);
