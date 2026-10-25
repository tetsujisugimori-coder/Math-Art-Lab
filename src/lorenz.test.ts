import {describe,it,expect} from 'vitest';
import {advanceLorenz,LORENZ_DT,lorenzDefaults as s,lorenzDerivative,lorenzIndex,lorenzRK4,pointAt,reshapeLorenz,restartLorenz,sampleLorenz,validateLorenz,type LorenzPlayback} from './lorenz';

describe('Lorenz numerical approximation',()=>{
 it('evaluates all three derivatives and equilibrium',()=>{expect(lorenzDerivative({x:1,y:1,z:1},s)).toEqual({x:0,y:26,z:1-8/3});expect(lorenzDerivative({x:0,y:0,z:0},s)).toEqual({x:0,y:0,z:0});expect(lorenzDerivative({x:2,y:3,z:4},s)).toEqual({x:10,y:45,z:6-32/3});});
 it('matches an independently calculated rational RK4 reference at h=.005',()=>{
  // Python fractions.Fraction, classical tableau (0,1/2,1/2,1), exact rational arithmetic.
  const p=lorenzRK4({x:1,y:1,z:1},s);expect(p.x).toBeCloseTo(1.0031933311430772,13);expect(p.y).toBeCloseTo(1.129839801362649,13);expect(p.z).toBeCloseTo(.9920510551862709,13);
 });
 it('converges at fourth order against the analytic invariant-axis solution',()=>{
  const solve=(h:number)=>{let p={x:0,y:0,z:1};for(let i=0;i<Math.round(1/h);i++)p=lorenzRK4(p,s,h);return Math.abs(p.z-Math.exp(-s.beta));};
  const coarse=solve(.005),fine=solve(.0025);expect(coarse).toBeLessThan(6e-11);expect(coarse/fine).toBeGreaterThan(15);expect(coarse/fine).toBeLessThan(17);
 });
 it('repeats identical conditions and compares only perturbed initial x',()=>{
  const config={...s,compare:true,points:2000},one=sampleLorenz(config),two=sampleLorenz(config);expect(one.a).toEqual(two.a);expect(one.b).toEqual(two.b);expect(pointAt(one.a,0)).toEqual({x:1,y:1,z:1});expect(pointAt(one.b!,0)).toEqual({x:1+s.delta,y:1,z:1});expect(pointAt(one.a,1999)).not.toEqual(pointAt(one.b!,1999));
 });
 it('uses identical samples for different render-frame partitions',()=>{
  const data=sampleLorenz({...s,points:2000});const run=(frames:number[])=>{let state:LorenzPlayback={elapsed:0,mode:'drawing'};for(const frame of frames)state=advanceLorenz(state,frame,1,2000);return pointAt(data.a,lorenzIndex(state,2000));};
  expect(run(Array(60).fill(1/60))).toEqual(run(Array(144).fill(1/144)));expect(run([.1,.2,.3,.4])).toEqual(run([1]));
 });
 it('rejects invalid/extreme settings and stops nonfinite/oversized RK4 stages',()=>{
  for(const next of [{sigma:NaN},{rho:Infinity},{beta:0},{x:100},{delta:0},{points:24001},{points:1000.5}])expect(()=>sampleLorenz({...s,...next})).toThrow(RangeError);
  expect(()=>lorenzRK4({x:Infinity,y:1,z:1},s)).toThrow();expect(()=>lorenzRK4({x:10000,y:-10000,z:10000},s)).toThrow();expect(()=>lorenzRK4({x:1,y:1,z:1},s,0)).toThrow();expect(()=>validateLorenz({...s,compare:1 as unknown as boolean})).toThrow();
 });
 it('keeps all preset/range corner trajectories finite within the bounded work budget',()=>{
  for(const config of [s,{...s,rho:14},{...s,sigma:20,rho:50,beta:.5,x:30,y:-30,z:60,compare:true,points:24000},{...s,sigma:1,rho:0,beta:6,x:-30,y:30,z:-30}])expect(()=>sampleLorenz(config)).not.toThrow();
 });
 it('pauses, resumes, ends and reshapes without mixing old progress',()=>{
  const paused:LorenzPlayback={elapsed:1,mode:'paused'};expect(advanceLorenz(paused,1,4,12000)).toBe(paused);expect(advanceLorenz({...paused,mode:'drawing'},1,4,12000).elapsed).toBe(5);expect(advanceLorenz({elapsed:0,mode:'drawing'},100,8,1000).mode).toBe('complete');
  expect(restartLorenz(paused,false)).toEqual({elapsed:0,mode:'paused'});expect(restartLorenz({elapsed:3,mode:'complete'},false).mode).toBe('drawing');expect(restartLorenz({elapsed:3,mode:'complete'},true).mode).toBe('paused');expect(reshapeLorenz({elapsed:3,mode:'complete'},1000,false)).toEqual({elapsed:999*LORENZ_DT,mode:'complete'});expect(()=>advanceLorenz(paused,-1,1,1000)).toThrow();
 });
});
