import {writeFileSync} from 'node:fs';
import {presets,initialPhase,verlet,difference,distance} from '../src/three-body.ts';
import {reference} from './three-body-reference.ts';
const base=presets[3].config,perturbed=structuredClone(base);perturbed.bodies[0].x+=1e-6;
const refA=reference(base,30,.0001),refB=reference(perturbed,30,.0001),fineB=reference(perturbed,30,.00005);
const phase=bodies=>({bodies,steps:0}),rms=(a,b)=>Math.sqrt(a.reduce((s,p,i)=>s+distance(p,b[i])**2,0)/3);
const results={T:30,delta:1e-6,referenceD:difference(phase(refA),phase(refB),base).D,referenceBRefinement:rms(refB,fineB),runs:[]};
for(const dt of [.0001,.000025,.0000125]){
  let a=initialPhase(base),b=initialPhase(perturbed);const ca={...base,dt},cb={...perturbed,dt};
  for(let i=0,n=Math.round(30/dt);i<n;i++){const aa=verlet(a,ca),bb=verlet(b,cb);if(aa.reason||bb.reason)throw Error(aa.reason||bb.reason);a=aa.phase;b=bb.phase;}
  results.runs.push({dt,D:difference(a,b,ca).D,positionErrorA:rms(a.bodies,refA),positionErrorB:rms(b.bodies,refB)});
}
writeFileSync('docs/three-body/sensitivity-results.json',JSON.stringify(results,null,2));console.log(results);
