import {describe,it,expect} from 'vitest';
import {advance,chain,contribution,createModel,curve,dft,format,modelFromSamples,N,normalize,outline,rankTerms,reconstruct,resample,rmse,STEPS,TAU,type Point,type Preset} from './fourier';
import {drawFourier,screen} from './fourier-render';
const close=(p:Point,q:Point,tolerance=1e-10)=>{expect(Math.abs(p.x-q.x)).toBeLessThan(tolerance);expect(Math.abs(p.y-q.y)).toBeLessThan(tolerance);};
const samples=(f:(t:number)=>Point)=>Array.from({length:N},(_,n)=>f(n/N));

describe('DFT independent analytic expectations',()=>{
 it('constant is DC only, with 1/N normalization',()=>{const c=dft(samples(()=>({x:2,y:-3})));close(c[0],{x:2,y:-3});expect(Math.max(...c.slice(1).map(t=>t.radius))).toBeLessThan(1e-12);});
 for(const f of [1,-1,7,-9,-64])it(`single circle f=${f}, radius and phase`,()=>{
  const phase=.37,c=dft(samples(t=>({x:2+3*Math.cos(TAU*f*t+phase),y:-1+3*Math.sin(TAU*f*t+phase)}))),term=c.find(t=>t.frequency===f)!;
  close(c[0],{x:2,y:-1});expect(term.radius).toBeCloseTo(3,10);expect(term.phase).toBeCloseTo(phase,10);close(term,{x:3*Math.cos(phase),y:3*Math.sin(phase)});
  expect(Math.max(...c.filter(t=>t.index!==0&&t!==term).map(t=>t.radius))).toBeLessThan(1e-12);
  const v=contribution(term,.003);close(v,{x:3*Math.cos(TAU*f*.003+phase),y:3*Math.sin(TAU*f*.003+phase)});
 });
 it('known two-term sum and signed rotation',()=>{
  const analytic=(t:number)=>({x:.4+2*Math.cos(TAU*t)+.5*Math.cos(-3*TAU*t+.7),y:-.2+2*Math.sin(TAU*t)+.5*Math.sin(-3*TAU*t+.7)}),m=modelFromSamples(samples(analytic));
  expect(m.terms.slice(0,2).map(t=>t.frequency)).toEqual([1,-3]);expect(m.terms[1].phase).toBeCloseTo(.7,10);
  for(const t of [0,.01,.125,.381,1]){close(reconstruct(m,2,t),analytic(t));close(chain(m,2,t).at(-1)!.end,analytic(t));}
  expect(contribution(m.terms[0],.01).y).toBeGreaterThan(0);
  const negative=dft(samples(t=>({x:Math.cos(-TAU*t),y:Math.sin(-TAU*t)})))[127];expect(contribution(negative,.01).y).toBeLessThan(0);
 });
 it('Nyquist is -64 and odd-N mapping is symmetric',()=>{expect(dft(samples(()=>({x:1,y:0})))[64].frequency).toBe(-64);expect(dft([{x:0,y:0},{x:1,y:0},{x:0,y:1}]).map(t=>t.frequency)).toEqual([0,1,-1]);});
});
describe('closed contour and ranking contracts',()=>{
 it('includes closing edge, ignores zero edges, no duplicate endpoint',()=>{const points=[{x:0,y:0},{x:2,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2},{x:0,y:0}];expect(resample(points,8)).toEqual([{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2},{x:1,y:2},{x:0,y:2},{x:0,y:1}]);});
 it('centers and scales only samples without mutating originals',()=>{const a=[{x:1,y:2},{x:5,y:2}],before=structuredClone(a);expect(normalize(a)).toEqual([{x:-1,y:0},{x:1,y:0}]);expect(a).toEqual(before);});
 it('sorts amplitude then quantized ties by |f|, f and index',()=>{const terms=[-3,3,1,-1].map((f,i)=>({index:i+1,frequency:f,x:1,y:0,radius:1,phase:0}));expect(rankTerms(terms).map(t=>t.frequency)).toEqual([-1,1,-3,3]);terms[0].radius=2;expect(rankTerms(terms)[0].frequency).toBe(-3);terms[0].radius=1+1e-14;expect(rankTerms(terms).map(t=>t.frequency)).toEqual([-1,1,-3,3]);});
 it('rejects invalid geometry, K, time and clocks',()=>{
  for(const p of [[],[{x:0,y:0}],[{x:NaN,y:0},{x:1,y:0}],[{x:0,y:0},{x:0,y:0}]])expect(()=>resample(p)).toThrow();
  expect(()=>resample(outline('fish'),1.5)).toThrow();expect(()=>normalize([{x:0,y:0},{x:0,y:0}])).toThrow();const m=createModel('fish');
  for(const k of [0,128,1.5,NaN])expect(()=>reconstruct(m,k,0)).toThrow();for(const t of [-.1,1.1,Infinity])expect(()=>reconstruct(m,1,t)).toThrow();
  for(const args of [[-1,1,1],[513,1,1],[1,-1,1],[0,Infinity,1],[0,1,0],[0,1,5]])expect(()=>advance(...args as [number,number,number])).toThrow();
 });
 for(const preset of ['circle','star','fish'] as Preset[])it(`${preset}: 128-sample recovery, K bounds, fixed scale and nonincreasing RMSE`,()=>{
  const m=createModel(preset),original=structuredClone(m.samples),extent=m.extent;expect(m.samples).toHaveLength(128);expect(m.terms).toHaveLength(127);
  m.samples.forEach((p,i)=>close(reconstruct(m,127,i/N),p));close(reconstruct(m,127,0),reconstruct(m,127,1));
  let error=Infinity;for(let k=1;k<=127;k++){const next=rmse(m,k);expect(next).toBeLessThanOrEqual(error+1e-11);error=next;}
  expect(error).toBeLessThan(1e-12);for(const k of [1,16,127])for(const t of [0,.25,.83,1])close(chain(m,k,t).at(-1)!.end,reconstruct(m,k,t));
  expect(m.samples).toEqual(original);expect(m.extent).toBe(extent);
 });
 it('full and progressive use the identical 513-point phase grid and close exactly within precision',()=>{const m=createModel('fish'),p=curve(m,16);expect(p).toHaveLength(513);for(let j=0;j<=STEPS;j++)close(p[j],reconstruct(m,16,j/STEPS));close(p[0],p[512]);});
});
describe('bounded playback and formatting',()=>{
 it('60Hz and 120Hz produce the same grid prefix after equal elapsed time',()=>{const run=(hz:number)=>{let state={step:0,remainder:0};for(let i=0;i<hz;i++)state=advance(state.step,1000/hz,1,state.remainder);return state;};expect(run(60).step).toBe(128);expect(run(120).step).toBe(128);});
 it('caps delayed work and total points, never wraps after a completed loop',()=>{expect(advance(0,1e9,4).step).toBe(25);expect(advance(511,1e9,4).step).toBe(512);expect(advance(512,50,4)).toEqual({step:512,remainder:0});});
 it('prints tiny values and negative zero readably',()=>{expect(format(-0)).toBe('0');expect(format(-1e-16)).toBe('0');expect(format(.123456789)).toBe('0.12346');});
});
it('renderer commands use radius and upward mathematical y; selected arm carries number and width',()=>{
 const calls:{name:string;args:unknown[]}[]=[],target:Record<string,unknown>={};const ctx=new Proxy(target,{get:(o,key)=>o[String(key)]??((...args:unknown[])=>calls.push({name:String(key),args})),set:(o,key,value)=>{o[String(key)]=value;calls.push({name:String(key),args:[value]});return true;}}) as unknown as CanvasRenderingContext2D;
 const m=createModel('circle'),p=curve(m,1),scene={model:m,k:1,step:128,path:p,original:false,circles:true,selected:0,symbol:'sum'};
 const g=drawFourier(ctx,scene,400,2,false);const scale=400/(2*m.extent);close(g.tip,{x:200,y:200-scale});close(g.arms[0].end,{x:0,y:1});
 const arc=calls.find(c=>c.name==='arc')!;expect(arc.args[0]).toBeCloseTo(200);expect(arc.args[1]).toBeCloseTo(200);expect(arc.args[2]).toBeCloseTo(scale);
 expect(calls.some(c=>c.name==='fillText'&&c.args[0]==='#1')).toBe(true);expect(calls.some(c=>c.name==='lineWidth'&&c.args[0]===2.8)).toBe(true);
 const hidden=drawFourier(ctx,{...scene,circles:false},400,2,true);expect(hidden.tip).toEqual(g.tip);expect(hidden.arms).toEqual(g.arms);close(screen({x:0,y:1},400,m.extent),g.tip);
});
