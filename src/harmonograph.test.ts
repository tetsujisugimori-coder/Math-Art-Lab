import {describe,it,expect} from 'vitest';
import {advancePlayback,axes,evaluateAxis,MAX_POINTS,presets,resetProgress,resolveTerms,restartPlayback,sampleHarmonograph,shapeFields,visibleCount} from './harmonograph';
import {axisExpression} from './harmonograph-inspector';
import {mathText} from './structures';
import {projectToAxis} from './harmonograph-guide';

describe('harmonograph model',()=>{
 for(const preset of presets)it(`${preset.id}: deterministic, finite, bounded and samples both endpoints`,()=>{
  const data=sampleHarmonograph(preset.id,preset.shape);
  expect(sampleHarmonograph(preset.id,preset.shape).positions).toEqual(data.positions);
  expect(data.count).toBeLessThanOrEqual(MAX_POINTS);expect(Array.from(data.positions).every(Number.isFinite)).toBe(true);
  axes.forEach((axis,a)=>{expect(data.positions[a]).toBeCloseTo(evaluateAxis(0,data.terms[axis]),6);expect(data.positions[(data.count-1)*3+a]).toBeCloseTo(evaluateAxis(data.duration,data.terms[axis]),6);});
 });
 it('has the documented initial coordinates and sums actual damped terms',()=>{
  const p=presets[0],data=sampleHarmonograph(p.id,p.shape);
  expect(data.positions[0]).toBe(0);expect(data.positions[1]).toBeCloseTo(.8,6);expect(data.positions[2]).toBeCloseTo(.65*Math.sin(.8)+.28*Math.sin(.2),6);
  const t=1.25,expected=1.45*Math.exp(-.003*t)*Math.sin(2.01*t)+.65*Math.exp(-.003*t)*Math.sin(6.03*t);
  expect(evaluateAxis(t,data.terms.x)).toBeCloseTo(expected,14);
 });
 it('covers every boundary and rejects nonfinite or excessive shape inputs',()=>{
  const p=presets[0];
  for(const field of shapeFields){
   for(const boundary of [field.min,field.max]){const data=sampleHarmonograph(p.id,{...p.shape,[field.key]:boundary});expect(data.count).toBeLessThanOrEqual(MAX_POINTS);expect(Array.from(data.positions).every(Number.isFinite)).toBe(true);}
   for(const bad of [NaN,Infinity,-Infinity,field.min-1,field.max+1])expect(()=>sampleHarmonograph(p.id,{...p.shape,[field.key]:bad})).toThrow(RangeError);
  }
  expect(()=>sampleHarmonograph('unknown',p.shape)).toThrow(RangeError);
  for(const t of [NaN,Infinity,-1,161])expect(()=>evaluateAxis(t,resolveTerms(p.id,p.shape).x)).toThrow(RangeError);
 });
 it('maps each control to the stated coefficients, keeping unrelated axes unchanged',()=>{
  const p=presets[0],base=resolveTerms(p.id,p.shape),ratio=resolveTerms(p.id,{...p.shape,ratio:1.1}),phase=resolveTerms(p.id,{...p.shape,phase:.2}),depth=resolveTerms(p.id,{...p.shape,depth:0});
  expect(ratio.x).toEqual(base.x);expect(ratio.z).toEqual(base.z);expect(ratio.y[0].frequency).toBe(base.y[0].frequency*1.1);
  for(const axis of axes){expect(phase[axis][0]).toEqual(base[axis][0]);expect(phase[axis][1].phase).toBe(base[axis][1].phase+.2);}
  expect(depth.z.map(t=>t.amplitude)).toEqual([0,0]);expect(depth.x).toEqual(base.x);expect(depth.y).toEqual(base.y);
  const damped=resolveTerms(p.id,{...p.shape,decay:.02});for(const axis of axes)expect(evaluateAxis(5,damped[axis])).toBeCloseTo(evaluateAxis(5,base[axis])*Math.exp(-(.02-.003)*5),12);
 });
 it('derives displayed numeric expressions from the resolved sampling terms',()=>{
  for(const preset of presets){const terms=resolveTerms(preset.id,preset.shape);for(const axis of axes){const text=mathText(axisExpression(axis,terms[axis]));for(const o of terms[axis]){expect(text).toContain(`${o.amplitude}×exp(${-o.decay}t)×sin(${o.frequency}t+${o.phase})`);}}}
 });
 it('projects onto the selected coordinate without changing that coordinate',()=>{
  expect(projectToAxis([2,-3,4],'x')).toEqual([2,0,0]);expect(projectToAxis([2,-3,4],'y')).toEqual([0,-3,0]);expect(projectToAxis([2,-3,4],'z')).toEqual([0,0,4]);
 });
});
describe('harmonograph playback',()=>{
 it('advances by elapsed time, independent of frame count or path generation',()=>{
  let a={time:0,mode:'drawing' as const},b:{time:number;mode:'drawing'|'paused'|'complete'}=a;
  for(let i=0;i<10;i++)a=advancePlayback(a,.05,6,110) as typeof a;
  for(let i=0;i<20;i++)b=advancePlayback(b,.025,6,110);
  expect(a.time).toBeCloseTo(b.time,12);
  const data=sampleHarmonograph('flower',presets[0].shape),copy=data.positions.slice();visibleCount(data,a);expect(data.positions).toEqual(copy);
 });
 it('preserves pause and completion, resets consistently, and ends exactly',()=>{
  const paused={time:5,mode:'paused' as const};expect(advancePlayback(paused,1,6,110)).toBe(paused);
  expect(advancePlayback({time:109,mode:'drawing'},1,6,110)).toEqual({time:110,mode:'complete'});
  expect(resetProgress(paused,120,false)).toEqual({time:0,mode:'paused'});
  expect(resetProgress({time:110,mode:'complete'},120,false)).toEqual({time:120,mode:'complete'});
  expect(resetProgress({time:5,mode:'drawing'},120,false)).toEqual({time:0,mode:'drawing'});
  expect(restartPlayback({time:110,mode:'complete'},false)).toEqual({time:0,mode:'drawing'});
  expect(restartPlayback({time:110,mode:'complete'},true)).toEqual({time:0,mode:'paused'});
  const data=sampleHarmonograph('flower',presets[0].shape);expect(visibleCount(data,{time:0,mode:'paused'})).toBe(1);expect(visibleCount(data,{time:110,mode:'complete'})).toBe(data.count);
 });
 it('rejects invalid playback inputs',()=>{
  for(const delta of [NaN,Infinity,-1])expect(()=>advancePlayback({time:0,mode:'drawing'},delta,6,110)).toThrow(RangeError);
  for(const rate of [NaN,Infinity,0,13])expect(()=>advancePlayback({time:0,mode:'drawing'},1,rate,110)).toThrow(RangeError);
 });
});
