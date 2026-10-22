import { describe,it,expect } from 'vitest';
import { defaults,generateTree,sampleTree,deform,type Params,type Branch,type Vec3 } from './fractal';
import { buildVisual,describeBranches,visualDefinitions } from './visual-model';
import { structures } from './structures';
// Frozen pre-feature algorithm, deliberately independent from teaching metadata.
function legacy(p:Params,t:number){
 const branches:Branch[]=[];
 function grow(start:Vec3,h:number,l:number,r:number,d:number){if(r<=0)return;const end={x:start.x+Math.cos(h)*l,y:start.y+Math.sin(h)*l,z:0};branches.push({start,end,distance:d});grow(end,h+p.angle,l*p.shrink,r-1,d+l);grow(end,h-p.angle,l*p.shrink,r-1,d+l);}
 grow({x:0,y:-2.4,z:0},Math.PI/2,1.15,p.depth,0);
 const move=(v:Vec3,d:number)=>{const phase=2*Math.PI*d/p.wavelength-t*p.speed,e=1-Math.exp(-d*.8);return [v.x+p.amplitude*e*Math.sin(phase),v.y,v.z+p.amplitude*.5*e*Math.cos(phase)];};
 return {branches,values:new Float32Array(branches.flatMap(b=>[...move(b.start,b.distance),...move(b.end,b.distance+Math.hypot(b.end.x-b.start.x,b.end.y-b.start.y,b.end.z-b.start.z))]))};
}
describe('visual explanations',()=>{
 it('covers exactly the eleven existing formula IDs',()=>expect(Object.keys(visualDefinitions).sort()).toEqual(structures.flatMap(s=>s.formulas.map(f=>f.id)).sort()));
 for(const p of [defaults,{...defaults,depth:2,amplitude:0},{...defaults,depth:10,angle:1.1,shrink:.82,amplitude:.8,wavelength:1,speed:4}])
 it(`preserves baseline coordinates and samples depth=${p.depth}`,()=>{const baseline=legacy(p,2.3),branches=generateTree(p);expect(branches).toEqual(baseline.branches);expect(sampleTree(branches,2.3,p)).toEqual(baseline.values);const before=sampleTree(branches,2.3,p);const info=describeBranches(branches);for(const id of Object.keys(visualDefinitions) as (keyof typeof visualDefinitions)[]){const m=buildVisual(id,info,p,2.3);expect(m.strokes.length).toBeGreaterThan(0);expect(m.strokes.flatMap(s=>[s.a.x,s.a.y,s.a.z,s.b.x,s.b.y,s.b.z]).every(Number.isFinite)).toBe(true);}expect(sampleTree(branches,2.3,p)).toEqual(before);});
 it('tracks parent, generations, lengths and path distances from actual data',()=>{const infos=describeBranches(generateTree(defaults));for(const i of infos){expect(i.length).toBeCloseTo(1.15*defaults.shrink**i.generation,12);if(i.parent!==null){const parent=infos[i.parent];expect(i.branch.start).toBe(parent.branch.end);expect(i.branch.distance).toBeCloseTo(parent.branch.distance+parent.length,12);}}});
 it('shows alpha arcs from the parent extension and a 2alpha child opening',()=>{const infos=describeBranches(generateTree(defaults)),m=buildVisual('heading',infos,defaults,0);const arcs=m.strokes.filter(s=>s.color===0xf9d879);expect(arcs).toHaveLength(40);const o=infos[0].branch.end;for(const end of [arcs[19].b,arcs[39].b])expect(Math.abs(Math.atan2(end.y-o.y,end.x-o.x)-Math.PI/2)).toBeCloseTo(defaults.angle,12);});
 it('uses the same representative branch, correct components and endpoint displacement',()=>{const infos=describeBranches(generateTree(defaults)),b=infos.find(i=>i.generation===2)!,t=1.7,after=deform(b.branch.end,b.branch.distance+b.length,t,defaults);
 for(const [id,axis] of [['endpoint-x','x'],['endpoint-y','y'],['deform-x','x'],['deform-z','z']] as const){const model=buildVisual(id,infos,defaults,t);const shaft=model.strokes.find(s=>s.color===0xf9d879 && s.a===(id.startsWith('endpoint')?b.branch.start:b.branch.end))!;expect(shaft.b[axis]-shaft.a[axis]).toBeCloseTo(id.startsWith('endpoint')?b.branch.end[axis]-b.branch.start[axis]:after[axis]-b.branch.end[axis],12);for(const other of ['x','y','z'] as const)if(other!==axis)expect(shaft.b[other]).toBe(shaft.a[other]);}
 expect(after.y).toBe(b.branch.end.y);
 const path=buildVisual('distance',infos,defaults,t).strokes.filter(s=>s.color===0xf9d879).filter(s=>infos.some(i=>s.a===i.branch.start&&s.b===i.branch.end));expect(path).toHaveLength(3);expect(path.reduce((sum,s)=>sum+Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y,s.b.z-s.a.z),0)).toBeCloseTo(b.branch.distance+b.length,12);
 const phase=buildVisual('phase',infos,defaults,t).phase!;expect(phase).toBeCloseTo(2*Math.PI*(b.branch.distance+b.length)/defaults.wavelength-t*defaults.speed,12);
 });
});
