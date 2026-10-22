import {evaluateAxis,type Axis,type Oscillator} from './harmonograph';

export type LessonStage=1|2|3|4;
export type LessonParams={amplitude:number;frequency:number};
export type LessonState={stage:LessonStage;time:number;playing:boolean;params:LessonParams};
export const LESSON_DURATION=20,LESSON_INTERVAL=.02,LESSON_STEP=.25;
export const lessonDefaults:LessonParams={amplitude:1.4,frequency:1};
export const lessonFields=[
 {key:'amplitude',label:'xの往復の幅（振幅 A）',min:.5,max:2,step:.1,unit:'座標単位'},
 {key:'frequency',label:'xの往復の速さ（角周波数 ω）',min:.5,max:2,step:.1,unit:'rad/s'},
] as const;
export function validateLessonParams(params:LessonParams){
 for(const field of lessonFields)if(!Number.isFinite(params[field.key])||params[field.key]<field.min||params[field.key]>field.max)throw new RangeError(`Invalid ${field.key}`);
}
/** Teaching terms use the artwork's exact evaluator, with one undamped term per axis. */
export function lessonTerms(params:LessonParams):Record<Axis,readonly [Oscillator]>{
 validateLessonParams(params);
 return{x:[{amplitude:params.amplitude,frequency:params.frequency,phase:0,decay:0}],y:[{amplitude:1.4,frequency:1,phase:Math.PI/2,decay:0}],z:[{amplitude:.8,frequency:2,phase:Math.PI/4,decay:0}]};
}
export function lessonPoint(time:number,stage:LessonStage,params:LessonParams):[number,number,number]{
 if(!Number.isFinite(time)||time<0||time>LESSON_DURATION)throw new RangeError('Invalid lesson time');
 if(![1,2,3,4].includes(stage))throw new RangeError('Invalid lesson stage');
 const terms=lessonTerms(params);
 return[evaluateAxis(time,terms.x),stage>=2?evaluateAxis(time,terms.y):0,stage>=3?evaluateAxis(time,terms.z):0];
}
export function sampleLesson(stage:LessonStage,params:LessonParams):Float32Array{
 const count=Math.round(LESSON_DURATION/LESSON_INTERVAL)+1,positions=new Float32Array(count*3);
 for(let i=0;i<count;i++)positions.set(lessonPoint(i*LESSON_INTERVAL,stage,params),i*3);
 return positions;
}
export function advanceLesson(state:LessonState,delta:number,step=false):LessonState{
 if(!Number.isFinite(delta)||delta<0)throw new RangeError('Invalid lesson delta');
 if(step&&state.playing||!step&&!state.playing)return state;
 const time=Math.min(LESSON_DURATION,state.time+(step?LESSON_STEP:delta));
 return{...state,time,playing:time<LESSON_DURATION&&state.playing};
}
export function changeLessonParams(state:LessonState,params:LessonParams):LessonState{
 validateLessonParams(params);return{...state,params:{...params},playing:false};
}
export function lessonTrailRange(state:LessonState):{start:number;count:number;head:boolean}{
 if(state.stage===1)return{start:0,count:0,head:false};
 const end=Math.floor(state.time/LESSON_INTERVAL),start=state.stage===4?0:Math.max(0,Math.floor((state.time-1.5)/LESSON_INTERVAL));
 return{start,count:end-start+1,head:state.time>0};
}
