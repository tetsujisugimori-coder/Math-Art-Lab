// Run: node --experimental-strip-types tools/three-body-measure.mjs
import {writeFileSync} from 'node:fs';
import {cpus,platform,release} from 'node:os';
import {presets,triangle,initialPhase,verlet,errors,distance,invariants,difference} from '../src/three-body.ts';
import {reference} from './three-body-reference.ts';
const rms=(a,b)=>Math.sqrt(a.reduce((s,p,i)=>s+distance(p,b[i])**2,0)/3);
function integrate(c,T){let p=initialPhase(c),maxE=0,maxP=0,maxL=0,min=Infinity;const start=performance.now();for(let i=0,n=Math.round(T/c.dt);i<n;i++){const next=verlet(p,c);if(next.reason)throw Error(next.reason);p=next.phase;min=Math.min(min,distance(p.bodies[0],p.bodies[1]),distance(p.bodies[0],p.bodies[2]),distance(p.bodies[1],p.bodies[2]));if(i%10===0){const e=errors(p,c);maxE=Math.max(maxE,Math.abs(e.energy));maxP=Math.max(maxP,e.momentum);maxL=Math.max(maxL,Math.abs(e.angular));}}return {phase:p,ms:performance.now()-start,maxE,maxP,maxL,min};}
const results={date:new Date().toISOString(),environment:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0].model},presets:[],convergence:[]};
for(let i=0;i<5;i++){
  const p=presets[i],T=[126.518,10,20,30,30][i],result=integrate(p.config,T),ref=reference(p.config,T,i===0?.0002:.0001),refHalf=reference(p.config,T,i===0?.0001:.00005);
  const r={name:p.name,config:p.config,T,steps:result.phase.steps,computeMs:result.ms,microsecondsPerStep:result.ms/result.phase.steps*1000,maxNormalizedEnergy:result.maxE,maxNormalizedMomentum:result.maxP,maxNormalizedAngular:result.maxL,minDistance:result.min,rmsAgainstRK4:rms(result.phase.bodies,ref),rk4RefinementDifference:rms(ref,refHalf),endpoint:result.phase.bodies};
  if(i===4){const b=result.phase.bodies,R={x:(b[0].x+b[1].x)/2,y:(b[0].y+b[1].y)/2},vx=b[2].vx-(b[0].vx+b[1].vx)/2,vy=b[2].vy-(b[0].vy+b[1].vy)/2,radius=distance(b[2],R);r.escape={radius,relativeSpecificEnergy:.5*(vx*vx+vy*vy)-2.1/radius,outwardVelocity:((b[2].x-R.x)*vx+(b[2].y-R.y)*vy)/radius};}
  if(i===3){const c=structuredClone(p.config);c.bodies[0].x+=1e-6;const b=integrate(c,T);r.sensitivity={delta:1e-6,...difference(result.phase,b.phase,p.config)};}
  results.presets.push(r);
}
const ref=reference(presets[0].config,2,.0001);for(const dt of [.004,.002,.001,.0005]){const c={...presets[0].config,dt},p=integrate(c,2);results.convergence.push({dt,rms:rms(p.phase.bodies,ref),maxEnergy:p.maxE});}
results.figureEightPeriod={T:6.32591398,closure:rms(reference(presets[0].config,6.32591398,.0001),presets[0].config.bodies)};
results.triangleAnalytic=[1,1,1];const c=triangle(),p=integrate(c,10),omega=Math.sqrt(3/8),exact=c.bodies.map(b=>({...b,x:b.x*Math.cos(omega*10)-b.y*Math.sin(omega*10),y:b.x*Math.sin(omega*10)+b.y*Math.cos(omega*10)}));results.triangleError=rms(p.phase.bodies,exact);
writeFileSync('docs/three-body/numerical-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify({period:results.figureEightPeriod,convergence:results.convergence,presets:results.presets.map(({name,computeMs,maxNormalizedEnergy,rmsAgainstRK4,escape,sensitivity})=>({name,computeMs,maxNormalizedEnergy,rmsAgainstRK4,escape,sensitivity}))},null,2));
