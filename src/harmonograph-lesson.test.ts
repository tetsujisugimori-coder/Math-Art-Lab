import {describe,it,expect} from 'vitest';
import {evaluateAxis,axes} from './harmonograph';
import {advanceLesson,changeLessonParams,lessonDefaults,lessonFields,lessonPoint,lessonTerms,lessonTrailRange,sampleLesson,type LessonState} from './harmonograph-lesson';
const initial:LessonState={stage:1,time:0,playing:false,params:lessonDefaults};
describe('motion lesson mathematics and clock',()=>{
 it('evaluates active axes at exactly the same t with the artwork evaluator',()=>{
  const terms=lessonTerms(lessonDefaults),t=1.2345;
  const point=lessonPoint(t,3,lessonDefaults);
  axes.forEach((axis,i)=>expect(point[i]).toBe(evaluateAxis(t,terms[axis])));
  expect(lessonPoint(t,1,lessonDefaults)).toEqual([point[0],0,0]);
  expect(lessonPoint(t,2,lessonDefaults)).toEqual([point[0],point[1],0]);
  expect(lessonPoint(t,4,lessonDefaults)).toEqual(point);
 });
 it('bounds the undamped coordinates and closes the default example after 2π',()=>{
  for(const field of lessonFields)for(const value of [field.min,field.max]){
   const params={...lessonDefaults,[field.key]:value},data=sampleLesson(3,params);
   expect(data.length).toBe(3003);expect(sampleLesson(3,params)).toEqual(data);
   for(let i=0;i<data.length;i++)expect(Math.abs(data[i])).toBeLessThanOrEqual([params.amplitude,1.4,.8][i%3]+1e-6);
  }
  const a=lessonPoint(0,3,lessonDefaults),b=lessonPoint(2*Math.PI,3,lessonDefaults);
  a.forEach((v,i)=>expect(b[i]).toBeCloseTo(v,12));
 });
 it('pauses, steps exactly, resumes and caps at twenty seconds',()=>{
  expect(advanceLesson(initial,5)).toBe(initial);
  expect(advanceLesson(initial,0,true).time).toBe(.25);
  const playing={...initial,playing:true};expect(advanceLesson(playing,0,true)).toBe(playing);
  expect(advanceLesson(playing,.1).time).toBe(.1);
  expect(advanceLesson({...playing,time:19.9},1)).toMatchObject({time:20,playing:false});
  expect(()=>advanceLesson(initial,NaN)).toThrow();
 });
 it('preserves comparison time on parameter changes and rebuilds every sample',()=>{
  const old={...initial,time:8,playing:true,stage:4 as const},next=changeLessonParams(old,{amplitude:2,frequency:1.5});
  expect(next).toMatchObject({time:8,playing:false,stage:4});expect(old.params).toEqual(lessonDefaults);
  const data=sampleLesson(next.stage,next.params);
  expect(data[150]).toBeCloseTo(2*Math.sin(1.5),6);
  expect(data).not.toEqual(sampleLesson(old.stage,old.params));
  expect(lessonTrailRange(next)).toEqual({start:0,count:401,head:true});
  expect(lessonTrailRange({...next,stage:2})).toEqual({start:325,count:76,head:true});
  expect(lessonTrailRange({...next,stage:1})).toEqual({start:0,count:0,head:false});
 });
 it('rejects invalid settings and times',()=>{
  for(const value of [NaN,Infinity,-1,21])expect(()=>lessonPoint(value,1,lessonDefaults)).toThrow();
  for(const field of lessonFields)for(const value of [NaN,Infinity,field.min-.1,field.max+.1])expect(()=>sampleLesson(1,{...lessonDefaults,[field.key]:value})).toThrow();
 });
});
