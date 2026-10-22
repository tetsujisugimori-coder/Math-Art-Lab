import {lessonGardenSettings,resizeGarden,type GardenLessonStage,type GardenPlayback,type GardenSettings} from './garden';

type Progress={playback:GardenPlayback;completion:'limit'|'explicit'|null};
export type GardenLesson={stage:GardenLessonStage;small:Progress;full:Progress|null};
export function createGardenLesson(settings:GardenSettings):GardenLesson{
 const progress=Math.min(6,settings.total),complete=progress===settings.total;
 return{stage:1,small:{playback:{progress,mode:complete?'complete':'paused'},completion:complete?'limit':null},full:null};
}
export function gardenLessonProgress(lesson:GardenLesson):Progress{
 return lesson.stage===4?lesson.full!:lesson.small;
}
export function setGardenLessonPlayback(lesson:GardenLesson,playback:GardenPlayback,explicit=false):GardenLesson{
 const old=gardenLessonProgress(lesson);
 const completion=playback.mode!=='complete'?null:explicit?'explicit':old.playback===playback?old.completion:'limit';
 return{...lesson,[lesson.stage===4?'full':'small']:{playback,completion}};
}
export function switchGardenLesson(lesson:GardenLesson,stage:GardenLessonStage,settings:GardenSettings):GardenLesson{
 // Steps 1–3 share one capped demonstration. Step 4 is seeded only once;
 // reaching the small cap (or requesting its complete form) cannot complete it.
 let full=lesson.full;
 if(stage===4&&!full){
  const source=lesson.small.playback,complete=source.progress>=settings.total;
  full={playback:{progress:source.progress,mode:complete?'complete':source.mode==='complete'?'paused':source.mode},completion:complete?'limit':null};
 }
 return{...lesson,stage,full};
}
export function resizeGardenLesson(lesson:GardenLesson,settings:GardenSettings):GardenLesson{
 const total=lessonGardenSettings(settings,1).total,old=lesson.small;
 // Only an explicit complete-form request follows an increased small limit.
 const progress=old.completion==='explicit'?total:Math.min(old.playback.progress,total),complete=progress>=total;
 const small:Progress={playback:{progress,mode:complete?'complete':old.playback.mode==='complete'?'paused':old.playback.mode},completion:complete?old.completion??'limit':null};
 const full=lesson.full?{playback:resizeGarden(lesson.full.playback,settings.total),completion:lesson.full.completion}:null;
 if(full)full.completion=full.playback.mode==='complete'?full.completion??'limit':null;
 return{...lesson,small,full};
}
export function pauseGardenLesson(lesson:GardenLesson):GardenLesson{
 const pause=(p:Progress):Progress=>p.playback.mode==='drawing'?{...p,playback:{...p.playback,mode:'paused'}}:p;
 return{...lesson,small:pause(lesson.small),full:lesson.full?pause(lesson.full):null};
}
