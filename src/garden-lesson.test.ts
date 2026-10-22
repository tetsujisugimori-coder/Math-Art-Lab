import {describe,it,expect} from 'vitest';
import {addGardenPoint,advanceGarden,gardenDefaults,lessonGardenSettings,restartGarden,type GardenPlayback} from './garden';
import {createGardenLesson,gardenLessonProgress,pauseGardenLesson,resizeGardenLesson,setGardenLessonPlayback,switchGardenLesson} from './garden-lesson';

describe('independent garden lesson progress',()=>{
 for(const mode of ['drawing','paused','complete'] as const)it(`restores full ${mode} progress without advancing the inactive slot`,()=>{
  let lesson=switchGardenLesson(createGardenLesson(gardenDefaults),4,gardenDefaults);
  const playback:GardenPlayback={progress:mode==='complete'?1200:100.25,mode};
  lesson=setGardenLessonPlayback(lesson,playback,mode==='complete');
  for(const stage of [1,2,3,1] as const){
   lesson=switchGardenLesson(lesson,stage,gardenDefaults);
   lesson=setGardenLessonPlayback(lesson,advanceGarden({progress:6,mode:'drawing'},100,lessonGardenSettings(gardenDefaults,stage)));
   expect(lesson.full!.playback).toEqual(playback);
   expect(gardenLessonProgress(lesson).completion).toBe('limit');
  }
  lesson=switchGardenLesson(lesson,4,gardenDefaults);
  expect(gardenLessonProgress(lesson).playback).toEqual(playback);
  expect(gardenLessonProgress(lesson).completion).toBe(mode==='complete'?'explicit':null);
  expect(advanceGarden(playback,1,gardenDefaults).progress).toBe(mode==='drawing'?260.25:playback.progress);
 });
 for(const total of [1,6,12,1200])it(`keeps both scopes bounded and operable at total ${total}`,()=>{
  const settings={...gardenDefaults,total},cap=Math.min(12,total);
  let lesson=createGardenLesson(settings);
  expect(gardenLessonProgress(lesson).playback.progress).toBe(Math.min(6,total));
  lesson=setGardenLessonPlayback(lesson,{progress:cap,mode:'complete'});
  for(const stage of [2,3,1] as const){
   lesson=switchGardenLesson(lesson,stage,settings);
   expect(gardenLessonProgress(lesson)).toEqual({playback:{progress:cap,mode:'complete'},completion:'limit'});
  }
  lesson=switchGardenLesson(lesson,4,settings);
  expect(gardenLessonProgress(lesson).playback).toEqual({progress:cap,mode:cap===total?'complete':'paused'});
  lesson=switchGardenLesson(lesson,1,settings);
  lesson=setGardenLessonPlayback(lesson,restartGarden(gardenLessonProgress(lesson).playback,true));
  expect(gardenLessonProgress(lesson)).toEqual({playback:{progress:0,mode:'paused'},completion:null});
  lesson=setGardenLessonPlayback(lesson,addGardenPoint(gardenLessonProgress(lesson).playback,cap));
  expect(gardenLessonProgress(lesson).playback.progress).toBe(1);
  lesson=setGardenLessonPlayback(lesson,{progress:cap,mode:'complete'},true);
  expect(gardenLessonProgress(lesson).completion).toBe('explicit');
  lesson=switchGardenLesson(lesson,4,settings);
  expect(gardenLessonProgress(lesson).playback.progress).toBe(cap);
 });
 it('seeds step four only once and never propagates a small complete-form request',()=>{
  let lesson=createGardenLesson(gardenDefaults);
  lesson=setGardenLessonPlayback(lesson,{progress:7.5,mode:'drawing'});
  lesson=switchGardenLesson(lesson,4,gardenDefaults);
  expect(gardenLessonProgress(lesson).playback).toEqual({progress:7.5,mode:'drawing'});
  lesson=switchGardenLesson(lesson,1,gardenDefaults);
  lesson=setGardenLessonPlayback(lesson,{progress:12,mode:'complete'},true);
  lesson=switchGardenLesson(lesson,4,gardenDefaults);
  expect(gardenLessonProgress(lesson).playback).toEqual({progress:7.5,mode:'drawing'});
  let first=createGardenLesson(gardenDefaults);
  first=setGardenLessonPlayback(first,{progress:12,mode:'complete'},true);
  expect(gardenLessonProgress(switchGardenLesson(first,4,gardenDefaults))).toEqual({playback:{progress:12,mode:'paused'},completion:null});
 });
 it('resizes saved scopes consistently and keeps explicit completion separate from reaching a cap',()=>{
  let lesson=switchGardenLesson(createGardenLesson(gardenDefaults),4,gardenDefaults);
  lesson=setGardenLessonPlayback(lesson,{progress:100,mode:'paused'});
  lesson=resizeGardenLesson(lesson,{...gardenDefaults,total:1});
  expect(lesson.small.completion).toBe('limit');expect(lesson.full!.playback).toEqual({progress:1,mode:'complete'});
  lesson=resizeGardenLesson(lesson,gardenDefaults);
  expect(lesson.small.playback).toEqual({progress:1,mode:'paused'});
  // Preserve the existing full-form resize policy, independently of the small cap.
  expect(lesson.full!.playback).toEqual({progress:1200,mode:'complete'});
  lesson=switchGardenLesson(lesson,1,gardenDefaults);
  lesson=setGardenLessonPlayback(lesson,{progress:12,mode:'complete'},true);
  lesson=setGardenLessonPlayback(lesson,gardenLessonProgress(lesson).playback);
  expect(gardenLessonProgress(lesson).completion).toBe('explicit');
 });
 it('pauses active and saved playback when reduced motion becomes enabled',()=>{
  let lesson=switchGardenLesson(createGardenLesson(gardenDefaults),4,gardenDefaults);
  lesson=setGardenLessonPlayback(lesson,{progress:100,mode:'drawing'});
  lesson=switchGardenLesson(lesson,1,gardenDefaults);
  lesson=setGardenLessonPlayback(lesson,{progress:6,mode:'drawing'});
  lesson=pauseGardenLesson(lesson);
  expect(lesson.small.playback).toEqual({progress:6,mode:'paused'});
  expect(lesson.full!.playback).toEqual({progress:100,mode:'paused'});
 });
});
