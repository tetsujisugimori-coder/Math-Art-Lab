import {describe,it,expect} from 'vitest';
import {advanceKnot,gcd,knotDefaults,knotFrame,knotPoint,knotPresets,reshapeKnot,restartKnot,sampleKnot,TAU,torusPoint,validateKnot,type KnotSettings} from './knot';
import {KNOT_SIDES,knotTorus,knotTube} from './knot-geometry';

describe('torus knot mathematics',()=>{
 it('rejects radii too close for a legible finite-precision tube, without rounding valid boundary input',()=>{
  expect(()=>validateKnot({...knotDefaults,R:1+Number.EPSILON,r:1})).toThrow('表示精度');
  expect(()=>validateKnot({...knotDefaults,R:1.01,r:1})).toThrow('表示精度');
  expect(()=>validateKnot({...knotDefaults,R:1.2,r:1.1})).not.toThrow();
 });
 it('matches the requested formula, endpoints and three precise presets',()=>{
  expect(knotPresets.map(p=>[p.p,p.q])).toEqual([[2,3],[3,5],[2,5]]);
  expect(knotDefaults).toEqual({R:3,r:1,p:2,q:3});
  for(const preset of knotPresets){const s={...knotDefaults,p:preset.p,q:preset.q};
   expect(knotPoint(s,0)).toEqual({x:4,y:0,z:0});expect(knotPoint(s,TAU)).toEqual(knotPoint(s,0));
   const t=.731,p=knotPoint(s,t);expect(p.x).toBeCloseTo((3+Math.cos(s.q*t))*Math.cos(s.p*t),12);expect(p.y).toBeCloseTo((3+Math.cos(s.q*t))*Math.sin(s.p*t),12);expect(p.z).toBeCloseTo(Math.sin(s.q*t),12);
  }
 });
 it('validates coprimality without correcting integers or nonfinite inputs',()=>{
  expect(gcd(2,3)).toBe(1);expect(gcd(6,9)).toBe(3);expect(gcd(1,9)).toBe(1);
  for(const [key,values] of Object.entries({p:[0,-1,1.5,10,NaN,Infinity],q:[0,-2,.5,10,NaN,Infinity],R:[0,6.1,NaN,Infinity],r:[0,.1,2.6,NaN,Infinity]}))for(const value of values)expect(()=>validateKnot({...knotDefaults,[key]:value})).toThrow();
  for(const [p,q] of [[2,2],[2,4],[3,9]])expect(()=>validateKnot({...knotDefaults,p,q})).toThrow('互いに素');
  expect(()=>validateKnot({...knotDefaults,R:1,r:1})).toThrow('R > r');expect(()=>validateKnot({...knotDefaults,R:1,r:2})).toThrow();
  expect(()=>gcd(Infinity,3)).toThrow();expect(()=>knotPoint(knotDefaults,NaN)).toThrow();expect(()=>knotPoint(knotDefaults,TAU+.1)).toThrow();
  for(const segments of [0,255,8193,1.5,Infinity])expect(()=>sampleKnot(knotDefaults,segments)).toThrow();
 });
 it('is deterministic, finite and stays on its defining torus at all supported integer pairs',()=>{
  for(let p=1;p<=9;p++)for(let q=1;q<=9;q++)if(gcd(p,q)===1){
   const s={...knotDefaults,p,q},a=sampleKnot(s);expect(a.positions).toEqual(sampleKnot(s).positions);expect(a.segments).toBeLessThanOrEqual(2304);
   for(let i=0;i<a.positions.length;i+=3){const[x,y,z]=a.positions.subarray(i,i+3);expect([x,y,z].every(Number.isFinite)).toBe(true);expect((Math.hypot(x,y)-s.R)**2+z*z).toBeCloseTo(s.r*s.r,5);}
  }
 });
 it('has bounded chord error and identical samples at shared parameter positions',()=>{
  for(const s of [knotDefaults,{R:6,r:2.5,p:9,q:8}]){
   const coarse=sampleKnot(s),fine=sampleKnot(s,coarse.segments*2);let maxError=0;
   for(let i=0;i<coarse.segments;i++){
    for(let axis=0;axis<3;axis++)expect(fine.positions[i*6+axis]).toBe(coarse.positions[i*3+axis]);
    const t=(i+.5)/coarse.segments*TAU,p=knotPoint(s,t),keys=['x','y','z'] as const;
    maxError=Math.max(maxError,Math.hypot(...keys.map((key,j)=>p[key]-(coarse.positions[i*3+j]+coarse.positions[(i+1)*3+j])/2)));
   }
   expect(maxError).toBeLessThan(.002);
  }
 });
 it('places C, P, R and r in the correct planes and derives an actual tangent',()=>{
  const s=knotDefaults;
  for(const t of [0,.37,2.4,TAU]){
   const f=knotFrame(s,t),d={x:f.point.x-f.center.x,y:f.point.y-f.center.y,z:f.point.z};
   expect(Math.hypot(f.center.x,f.center.y)).toBeCloseTo(s.R,12);expect(f.center.z).toBe(0);expect(Math.hypot(d.x,d.y,d.z)).toBeCloseTo(s.r,12);
   expect(f.normal.x*f.tangent.x+f.normal.y*f.tangent.y+f.normal.z*f.tangent.z).toBeCloseTo(0,10);
   expect(Math.hypot(f.normal.x,f.normal.y,f.normal.z)).toBeCloseTo(1,12);
   if(t>0&&t<TAU){const h=1e-6,a=knotPoint(s,t-h),b=knotPoint(s,t+h);for(const key of ['x','y','z'] as const)expect(f.tangent[key]).toBeCloseTo((b[key]-a[key])/(2*h),7);}
  }
 });
 it('centers the visible tube on evaluated samples and closes its mesh seam exactly',()=>{
  const s=knotDefaults,n=1024,tube=knotTube(s,n),positions=tube.getAttribute('position');
  for(const i of [0,127,512,n]){const p=knotPoint(s,i/n*TAU),center=[0,0,0];for(let j=0;j<KNOT_SIDES;j++){const index=i*KNOT_SIDES+j;center[0]+=positions.getX(index)/KNOT_SIDES;center[1]+=positions.getY(index)/KNOT_SIDES;center[2]+=positions.getZ(index)/KNOT_SIDES;}expect(Math.hypot(center[0]-p.x,center[1]-p.y,center[2]-p.z)).toBeLessThan(1e-6);}
  for(let j=0;j<KNOT_SIDES;j++)for(const key of ['getX','getY','getZ'] as const)expect(positions[key](j)).toBe(positions[key](n*KNOT_SIDES+j));
  tube.dispose();const surface=knotTorus(s),attr=surface.getAttribute('position');
  for(let i=0;i<attr.count;i+=31)expect((Math.hypot(attr.getX(i),attr.getY(i))-s.R)**2+attr.getZ(i)**2).toBeCloseTo(s.r*s.r,5);surface.dispose();
  expect(torusPoint(s,0,0)).toEqual(knotPoint(s,0));
 });
});
describe('knot playback, independently of geometry sampling',()=>{
 it('pauses, resumes and completes using elapsed time independent of frame partition',()=>{
  const start={t:0,mode:'drawing'} as const;let split=advanceKnot(start,0,.4);
  for(let i=0;i<100;i++)split=advanceKnot(split,.01,.4);
  expect(split.t).toBeCloseTo(advanceKnot(start,1,.4).t,12);
  const paused={t:2,mode:'paused'} as const;expect(advanceKnot(paused,100,2)).toBe(paused);
  expect(advanceKnot({t:2,mode:'drawing'},100,2)).toEqual({t:TAU,mode:'complete'});
  expect(advanceKnot(start,1,.8).t).toBeCloseTo(2*split.t,12);
  expect(()=>advanceKnot(start,NaN,.4)).toThrow();expect(()=>advanceKnot(start,1,Infinity)).toThrow();
 });
 it('restarts and regenerates consistently with pause, complete and reduced motion',()=>{
  const complete={t:TAU,mode:'complete'} as const,paused={t:2,mode:'paused'} as const;
  expect(restartKnot(complete,false)).toEqual({t:0,mode:'drawing'});expect(restartKnot(complete,true)).toEqual({t:0,mode:'paused'});
  expect(reshapeKnot(complete,false)).toEqual(complete);expect(reshapeKnot(paused,false)).toEqual({t:0,mode:'paused'});expect(reshapeKnot({t:2,mode:'drawing'},true)).toEqual({t:0,mode:'paused'});
 });
});
