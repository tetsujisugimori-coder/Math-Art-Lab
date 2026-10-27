import {describe,it,expect} from 'vitest';
import {parseTwinsNumber} from './twins';
import {addComplex,multiplyComplex,magnitude,quadratic,escapeSteps,escapeRadius,orbit,defaultView,screenToComplex,complexToScreen,zoomView,panView,rasterSize,MIN_SPAN,MAX_SPAN,twinsDefaults,validateTwins,formatTwinsNumber,formatComplex} from './twins';
import {createRenderRunner,LatestRenderGate,type RenderRequest,type RenderResult} from './twins-render';
const zero={re:0,im:0};
const mandelbrot=(re:number,im=0,n=500)=>escapeSteps(zero,{re,im},n,2);
describe('quadratic complex dynamics',()=>{
 it('rejects underflow input instead of silently applying zero',()=>{
  for(const raw of ['1e-324','-1e-400','','Infinity'])expect(()=>parseTwinsNumber(raw)).toThrow();
  expect(parseTwinsNumber('1e-8')).toBe(1e-8);expect(parseTwinsNumber('5e-324')).toBe(Number.MIN_VALUE);expect(parseTwinsNumber('0e-400')).toBe(0);expect(formatTwinsNumber(parseTwinsNumber('-0'))).toBe('0');
 });
 it('matches hand calculations for addition, multiplication, modulus and one iteration',()=>{
  expect(addComplex({re:1,im:2},{re:3,im:-4})).toEqual({re:4,im:-2});expect(multiplyComplex({re:1,im:2},{re:3,im:-4})).toEqual({re:11,im:2});expect(magnitude({re:3,im:4})).toBe(5);expect(quadratic({re:1,im:1},{re:-1,im:.5})).toEqual({re:-1,im:2.5});
 });
 it('checks fixed/periodic Mandelbrot references without claiming general finite membership',()=>{
  for(const c of [0,-1,-2])expect(mandelbrot(c)).toBe(-1);
  expect(orbit(zero,zero,'mandelbrot',3).values).toEqual([zero,zero,zero,zero]);expect(orbit(zero,{re:-1,im:0},'mandelbrot',3).values).toEqual([zero,{re:-1,im:0},zero,{re:-1,im:0}]);
 });
 it('detects c=1 at n=3 (0,1,2,5), including the maximum-budget endpoint',()=>{
  expect(mandelbrot(1,0,2)).toBe(-1);expect(mandelbrot(1,0,3)).toBe(3);expect(mandelbrot(2,0,1)).toBe(-1);expect(mandelbrot(2,0,2)).toBe(2);expect(mandelbrot(3)).toBe(1);
 });
 it('checks Julia c=0 inside, on, and outside the analytically known unit circle',()=>{
  for(const seed of [zero,{re:.5,im:0},{re:1,im:0},{re:-1,im:0},{re:0,im:1}])expect(escapeSteps(seed,zero,500,2)).toBe(-1);
  expect(escapeSteps({re:1.5,im:0},zero,50,2)).toBe(1);expect(escapeSteps({re:3,im:0},zero,50,2)).toBe(0);
 });
 it('checks the exact period-two Julia orbit at c=-1',()=>{
  expect(orbit(zero,{re:-1,im:0},'julia',3).values).toEqual([zero,{re:-1,im:0},zero,{re:-1,im:0}]);expect(escapeSteps(zero,{re:-1,im:0},500,2)).toBe(-1);
 });
 it('uses a sufficient Julia radius for c outside the radius-two parameter disk',()=>{
  // 2.25² - 2.8125 = 2.25, exactly in binary64. R=2 would misclassify this fixed point.
  const c={re:-2.8125,im:0},seed={re:2.25,im:0};expect(escapeRadius('julia',c)).toBe(3.8125);expect(escapeSteps(seed,c,500,escapeRadius('julia',c))).toBe(-1);expect(escapeSteps(seed,c,500,2)).toBe(0);
 });
 it('matches independent Python complex-arithmetic escape fixtures',()=>{
  expect(mandelbrot(-.75,.1)).toBe(33);expect(mandelbrot(.3,.5)).toBe(-1);
  expect(mandelbrot(-.8,.156)).toBe(252);expect(mandelbrot(.285,.01)).toBe(19);
  for(const [c,count] of [[{re:-.75,im:.1},28],[{re:-.8,im:.156},53],[{re:.285,im:.01},32]] as const)expect(escapeSteps({re:.2,im:.1},c,500,escapeRadius('julia',c))).toBe(count);
 });
 it('rejects nonfinite inputs, invalid iteration limits and invalid settings',()=>{
  for(const value of [NaN,Infinity,-Infinity]){expect(()=>escapeSteps({re:value,im:0},zero,50,2)).toThrow();expect(()=>escapeSteps(zero,{re:0,im:value},50,2)).toThrow();expect(()=>validateTwins({...twinsDefaults(),c:{re:value,im:0}})).toThrow();}
  for(const n of [0,1.5,501])expect(()=>escapeSteps(zero,zero,n,2)).toThrow();expect(()=>escapeSteps(zero,zero,50,1)).toThrow();expect(()=>validateTwins({...twinsDefaults(),iterations:49})).toThrow();expect(()=>validateTwins({...twinsDefaults(),c:{re:4.01,im:0}})).toThrow();expect(()=>quadratic({re:1e308,im:1e308},zero)).toThrow();
 });
});
describe('complex plane coordinates and bounded display precision',()=>{
 it('maps corners and the selected point using independent CSS-normalized coordinates',()=>{
  const v=defaultView('mandelbrot');const p=screenToComplex(v,0,0,1.25);expect(p.re).toBeCloseTo(-2.3,14);expect(p.im).toBeCloseTo(1.44,14);expect(screenToComplex(v,.5,.5,1.25)).toEqual({re:-.5,im:0});const q=complexToScreen(v,{re:0,im:0},1.25);expect(q.u).toBeCloseTo(23/36,14);expect(q.v).toBe(.5);
 });
 it('preserves the pointer anchor through zoom and reverses pan/zoom',()=>{
  const v=defaultView('julia'),anchor=screenToComplex(v,.2,.7,1.25),zoomed=zoomView(v,2,.2,.7,1.25),same=screenToComplex(zoomed,.2,.7,1.25);expect(same.re).toBeCloseTo(anchor.re,14);expect(same.im).toBeCloseTo(anchor.im,14);const back=zoomView(zoomed,.5,.2,.7,1.25);expect(back.center.re).toBeCloseTo(0,14);expect(back.center.im).toBeCloseTo(0,14);expect(back.span).toBe(v.span);const moved=panView(v,50,-25,500);expect(moved.center.re).toBeCloseTo(-.36,14);expect(moved.center.im).toBeCloseTo(-.18,14);expect(panView(moved,-50,25,500).center).toEqual(zero);
 });
 it('bounds zoom and keeps neighboring pixels distinguishable at the largest zoom',()=>{
  const v=zoomView(defaultView('julia'),1e6);expect(v.span).toBe(MIN_SPAN);expect(()=>zoomView(v,2)).toThrow();expect(()=>zoomView({...v,span:MAX_SPAN},.5)).toThrow();const a=screenToComplex(v,.5,.5,1.25),b=screenToComplex(v,.5+1/640,.5,1.25);expect(b.re).toBeGreaterThan(a.re);expect(b.re-a.re).toBeGreaterThan(64*Number.EPSILON*16);
 });
 it('caps buffer memory and DPR without changing the CSS complex-plane aspect',()=>{
  for(const dpr of [1,2,3]){const r=rasterSize(375,300,dpr);expect(r.width).toBeLessThanOrEqual(640);expect(r.height).toBeLessThanOrEqual(640);expect(r.aspect).toBe(1.25);expect(screenToComplex(defaultView('julia'),.25,.75,r.aspect)).toEqual({re:-.9,im:-.72});}
  expect(rasterSize(2000,1600,3)).toEqual({width:640,height:512,aspect:1.25});expect(()=>rasterSize(0,300,2)).toThrow();
  expect(rasterSize(510.25,408.2,2).aspect).toBe(510.25/408.2);
 });
 it('formats tiny signed values without zero confusion and labels complex values',()=>{
  expect(formatTwinsNumber(1e-8)).toBe('1e-8');expect(formatTwinsNumber(-1e-8)).toBe('-1e-8');expect(formatTwinsNumber(-0)).toBe('0');expect(formatComplex({re:1,im:-2})).toBe('1 − 2i');
 });
});
describe('latest-job commitment and cancelable worker slices',()=>{
 const request=(id:number):RenderRequest=>({id,kind:'julia',c:zero,iterations:50,view:{center:zero,span:4},width:5,height:5,aspect:1});
 it('never commits stale, canceled, duplicate or disposed results',()=>{
  const gate=new LatestRenderGate(),commits:number[]=[];const first=gate.request(),last=gate.request();expect(gate.finish(first,()=>commits.push(first))).toBe(false);expect(gate.finish(last,()=>commits.push(last))).toBe(true);expect(gate.finish(last,()=>commits.push(last))).toBe(false);const canceled=gate.request();gate.cancel();expect(gate.finish(canceled,()=>commits.push(canceled))).toBe(false);const disposed=gate.request();gate.dispose();expect(gate.finish(disposed,()=>commits.push(disposed))).toBe(false);expect(commits).toEqual([last]);
 });
 it('replaces pending jobs without queuing an unbounded number of callbacks',()=>{
  const queue:(()=>void)[]=[],results:RenderResult[]=[];let time=0;const runner=createRenderRunner(cb=>queue.push(cb),r=>results.push(r),()=>time+=10);
  for(let id=1;id<=100;id++)runner.start(request(id));expect(queue.length).toBe(1);while(queue.length)queue.shift()!();expect(results.map(r=>r.id)).toEqual([100]);expect(results[0].buffer.byteLength).toBe(100);
  const pixels=new Uint8ClampedArray(results[0].buffer);expect(Array.from(pixels.slice((2*5+2)*4,(2*5+2)*4+4))).toEqual([6,11,23,255]);expect(Array.from(pixels.slice(0,4))).toEqual([216,189,88,255]);
 });
 it('cancels a partly calculated job and rejects invalid allocations',()=>{
  const queue:(()=>void)[]=[],results:RenderResult[]=[];let time=0;const runner=createRenderRunner(cb=>queue.push(cb),r=>results.push(r),()=>time+=10);runner.start(request(1));queue.shift()!();expect(queue.length).toBe(1);runner.cancel();while(queue.length)queue.shift()!();expect(results).toEqual([]);expect(()=>runner.start({...request(2),width:641})).toThrow();expect(()=>runner.start({...request(3),iterations:501})).toThrow();
 });
});
