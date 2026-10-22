import {describe,it,expect} from 'vitest';
import {addGardenPoint,advanceGarden,GARDEN_SPACING,gardenDefaults,gardenExtent,gardenPoint,GOLDEN_ANGLE,lessonGardenSettings,MAX_GARDEN_POINTS,resizeGarden,restartGarden,sampleGarden,validateGarden,visibleGardenPoints,type GardenPlayback} from './garden';
describe('phyllotaxis coordinates',()=>{
 it('starts at the origin and uses the exact golden-angle expression',()=>{
  expect(GOLDEN_ANGLE).toBe(180*(3-Math.sqrt(5)));expect(GOLDEN_ANGLE).not.toBe(137.5);
  expect(gardenPoint(0,GOLDEN_ANGLE)).toMatchObject({n:0,r:0,x:0,y:0,theta:0});
  const p=gardenPoint(1,GOLDEN_ANGLE);expect(p.theta).toBeCloseTo(Math.PI*(3-Math.sqrt(5)),14);expect(p.x).toBeCloseTo(-.10323164293096476,12);expect(p.y).toBeCloseTo(.09456864119661335,12);
  const exact=gardenPoint(1199,GOLDEN_ANGLE),rounded=gardenPoint(1199,137.5);expect(Math.hypot(exact.x-rounded.x,exact.y-rounded.y)).toBeGreaterThan(.5);
 });
 it('places 90° on four directions and 120° on three',()=>{
  for(let n=0;n<20;n++){
   const p=gardenPoint(n,90);expect(Math.hypot(p.x,p.y)).toBeCloseTo(GARDEN_SPACING*Math.sqrt(n),13);
   expect(Math.min(Math.abs(p.x),Math.abs(p.y))).toBeLessThan(1e-13);
   const q=gardenPoint(n,120),direction=n%3*2*Math.PI/3;expect(q.x).toBeCloseTo(q.r*Math.cos(direction),13);expect(q.y).toBeCloseTo(q.r*Math.sin(direction),13);
  }
 });
 it('has equal increments of squared radius, not equal neighbor distances',()=>{
  const distances=[];
  for(let n=1;n<100;n++){const p=gardenPoint(n,GOLDEN_ANGLE),q=gardenPoint(n-1,GOLDEN_ANGLE);expect(p.r*p.r-q.r*q.r).toBeCloseTo(GARDEN_SPACING**2,13);distances.push(Math.hypot(p.x-q.x,p.y-q.y));}
  expect(Math.max(...distances)-Math.min(...distances)).toBeGreaterThan(1);
 });
 it('is deterministic, finite and bounded at all input limits',()=>{
  for(const total of [1,1200,MAX_GARDEN_POINTS])for(const angle of [0,90,120,GOLDEN_ANGLE,137.3,360]){
   const settings={...gardenDefaults,total,angle},data=sampleGarden(settings);expect(sampleGarden(settings)).toEqual(data);expect(data.length).toBe(total*3);
   expect(Array.from(data).every(Number.isFinite)).toBe(true);for(let n=0;n<total;n++)expect(Math.hypot(data[n*3],data[n*3+1])).toBeLessThan(gardenExtent(total));
  }
 });
 it('rejects nonfinite, fractional and excessive inputs',()=>{
  for(const total of [0,-1,1.1,3001,NaN,Infinity])expect(()=>sampleGarden({...gardenDefaults,total})).toThrow();
  for(const angle of [-.1,360.1,NaN,Infinity])expect(()=>sampleGarden({...gardenDefaults,angle})).toThrow();
  for(const rate of [0,601,NaN,Infinity])expect(()=>validateGarden({...gardenDefaults,rate})).toThrow();
  for(const n of [-1,.5,MAX_GARDEN_POINTS,NaN])expect(()=>gardenPoint(n,GOLDEN_ANGLE)).toThrow();
  expect(()=>gardenPoint(1,GOLDEN_ANGLE,Infinity)).toThrow();
 });
});
describe('garden playback and lesson limits',()=>{
 const paused:GardenPlayback={progress:20.6,mode:'paused'};
 it('uses elapsed seconds and fractional progress independently of frame count',()=>{
  const start:GardenPlayback={progress:0,mode:'drawing'},settings={...gardenDefaults,rate:37};let split=start;
  for(let i=0;i<100;i++)split=advanceGarden(split,.01,settings);
  expect(advanceGarden(start,1,settings).progress).toBeCloseTo(split.progress,12);expect(visibleGardenPoints(split)).toBe(37);
  expect(advanceGarden(paused,5,settings)).toBe(paused);expect(()=>advanceGarden(start,Infinity,settings)).toThrow();
 });
 it('steps one whole point, restarts, completes and resizes consistently',()=>{
  expect(addGardenPoint(paused,1200)).toEqual({progress:21,mode:'paused'});
  expect(addGardenPoint({progress:1199,mode:'paused'},1200)).toEqual({progress:1200,mode:'complete'});
  expect(restartGarden(paused,false)).toEqual({progress:0,mode:'paused'});
  expect(restartGarden({progress:1200,mode:'complete'},false)).toEqual({progress:0,mode:'drawing'});
  expect(restartGarden({progress:1200,mode:'complete'},true).mode).toBe('paused');
  expect(advanceGarden({progress:1199,mode:'drawing'},10,gardenDefaults)).toEqual({progress:1200,mode:'complete'});
  expect(resizeGarden(paused,10)).toEqual({progress:10,mode:'complete'});
  expect(resizeGarden({progress:1200,mode:'complete'},200)).toEqual({progress:200,mode:'complete'});
  expect(resizeGarden(paused,3000)).toEqual(paused);
 });
 it('caps early teaching steps at twelve and restores the artwork limits in step four',()=>{
  const settings={...gardenDefaults,angle:90};for(const stage of [1,2,3] as const)expect(lessonGardenSettings(settings,stage)).toEqual({...settings,total:12,rate:3});
  expect(lessonGardenSettings(settings,4)).toEqual(settings);expect(settings.total).toBe(1200);
  expect(lessonGardenSettings({...settings,total:1},2).total).toBe(1);
 });
});
