import {describe,it,expect,vi} from 'vitest';
import {advanceObservation,beginObservation,clipOrbitSegment,ObservationClock,plotPoint,TRAIL_POINTS} from './twins-observation';
import {escapeSteps,formatTwinsNumber,type Complex} from './twins';
const zero={re:0,im:0};
describe('point observation',()=>{
 it('starts Mandelbrot at zero and follows the hand-computed period-two example',()=>{
  let s=beginObservation('mandelbrot',{re:-1,im:0},{re:.5,im:0},50);expect(s.seed).toEqual(zero);expect(s.n).toBe(0);expect(s.previous).toBeNull();
  for(const [i,re] of [-1,0,-1,0].entries()){s=advanceObservation(s);expect(s.n).toBe(i+1);expect(s.z).toEqual({re,im:0});expect(s.status).toBe('observing');}
 });
 it('keeps Julia c fixed and computes exact binary fractions',()=>{
  let s=beginObservation('julia',zero,{re:.5,im:0},50);
  for(const re of [.25,.0625,.00390625]){const old=s.z;s=advanceObservation(s);expect(s.z).toEqual({re,im:0});expect(s.previous).toEqual(old);expect(s.c).toEqual(zero);}
 });
 it('observes c=1 escape only at n=3 and does not step beyond it',()=>{
  let s=beginObservation('mandelbrot',{re:1,im:0},zero,50);
  for(const re of [1,2,5]){s=advanceObservation(s);expect(s.z.re).toBe(re);}
  expect(s.n).toBe(3);expect(s.status).toBe('escaped');expect(advanceObservation(s)).toBe(s);
 });
 it('uses the sufficient Julia radius, including an outside-radius-two fixed point',()=>{
  let s=beginObservation('julia',{re:-2.8125,im:0},{re:2.25,im:0},50);expect(s.radius).toBe(3.8125);
  for(let i=0;i<50;i++)s=advanceObservation(s);expect(s.z.re).toBe(2.25);expect(s.status).toBe('limit');
  expect(beginObservation('julia',zero,{re:3,im:0},50).status).toBe('escaped');
 });
 it('stops at the exact configured maximum and bounds retained points',()=>{
  let s=beginObservation('mandelbrot',{re:-1,im:0},zero,50);for(let i=0;i<60;i++)s=advanceObservation(s);
  expect(s.n).toBe(50);expect(s.status).toBe('limit');expect(s.points).toHaveLength(TRAIL_POINTS);expect(s.points[0].n).toBe(19);expect(s.seed).toEqual(zero);
 });
 it('matches background escape counts for independent reference fixtures',()=>{
  for(const [c,count] of [[{re:-.75,im:.1},33],[{re:-.8,im:.156},252],[{re:.285,im:.01},19]] as const){let s=beginObservation('mandelbrot',c,zero,500);while(s.status==='observing')s=advanceObservation(s);expect(s.n).toBe(count);expect(s.n).toBe(escapeSteps(zero,c,500,2));}
 });
 it('rejects invalid parameters rather than changing them',()=>{
  for(const c of [{re:NaN,im:0},{re:Infinity,im:0},{re:4.1,im:0}])expect(()=>beginObservation('mandelbrot',c,zero,50)).toThrow();
  for(const limit of [0,49,500.1,501])expect(()=>beginObservation('julia',zero,zero,limit)).toThrow();expect(()=>beginObservation('julia',zero,{re:17,im:0},50)).toThrow();
 });
 it('reports numerical underflow separately and keeps the last nonzero point',()=>{
  const start=beginObservation('julia',zero,{re:1e-200,im:0},50),s=advanceObservation(start);expect(s.status).toBe('precision');expect(s.n).toBe(0);expect(s.z.re).toBe(1e-200);expect(formatTwinsNumber(s.z.re)).toBe('1e-200');expect(formatTwinsNumber(-0)).toBe('0');
 });
 it('reports a nonfinite computation as an error, never ordinary escape',()=>{
  const start=beginObservation('julia',zero,zero,50);expect(advanceObservation({...start,z:{re:Infinity,im:0}}).status).toBe('error');expect(advanceObservation({...start,z:{re:1e200,im:0}}).status).toBe('error');
 });
});
describe('bounded plot geometry',()=>{
 const view={center:zero,span:4};
 it('distinguishes an off-screen point from a mathematical escape',()=>{
  const s=beginObservation('julia',zero,{re:.5,im:0},50);expect(plotPoint({center:zero,span:.2},s.z,1)).toBeNull();expect(s.status).toBe('observing');expect(plotPoint(view,zero,1)).toEqual({u:.5,v:.5});
 });
 it('clips crossing segments and never clamps an outside point to an edge',()=>{
  expect(clipOrbitSegment(view,{re:-5,im:0},{re:5,im:0},1)).toEqual([{u:0,v:.5},{u:1,v:.5}]);
  expect(clipOrbitSegment(view,{re:3,im:3},{re:4,im:4},1)).toBeNull();expect(plotPoint(view,{re:5,im:0},1)).toBeNull();
  const line=clipOrbitSegment(view,zero,{re:4,im:2},1)!;expect(line[1]).toEqual({u:1,v:.25});
 });
 it('rejects unusable geometry and keeps degenerate segments finite',()=>{
  expect(clipOrbitSegment(view,{re:-Number.MAX_VALUE,im:0},{re:Number.MAX_VALUE,im:0},1)).toBeNull();
  expect(clipOrbitSegment(view,zero,zero,1)).toEqual([{u:.5,v:.5},{u:.5,v:.5}]);expect(()=>plotPoint(view,{re:NaN,im:0},1)).toThrow();
 });
});
describe('observation playback',()=>{
 it('starts only once and stops without a delayed update',()=>{
  vi.useFakeTimers();try{let n=0;const clock=new ObservationClock(()=>{n++;return true;});clock.start(1000);clock.start(1000);vi.advanceTimersByTime(2500);expect(n).toBe(2);clock.stop();vi.advanceTimersByTime(10000);expect(n).toBe(2);expect(clock.running).toBe(false);}finally{vi.useRealTimers();}
 });
 it('rejects an already queued stale callback after replacement and stops at terminal state',()=>{
  const callbacks:(()=>void)[]=[];let n=0;const clock=new ObservationClock(()=>{n++;return false;},((fn:()=>void)=>{callbacks.push(fn);return 1;}) as typeof setTimeout,()=>{});
  clock.start(1000);const stale=callbacks.shift()!;clock.stop();clock.start(1000);stale();expect(n).toBe(0);callbacks.shift()!();expect(n).toBe(1);expect(clock.running).toBe(false);
 });
});
