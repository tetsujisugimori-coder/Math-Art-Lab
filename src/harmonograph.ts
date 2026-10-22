/** Deterministic model. Units: t in model seconds, f in rad/model second. */
export type Axis = 'x'|'y'|'z';
export const axes:Axis[]=['x','y','z'];
export type Oscillator={amplitude:number;frequency:number;phase:number;decay:number};
export type Terms=Record<Axis,readonly [Oscillator,Oscillator]>;
export type Shape={ratio:number;phase:number;decay:number;depth:number;duration:number};
export const shapeFields:{key:keyof Shape;label:string;min:number;max:number;step:number;unit:string}[]=[
 {key:'ratio',label:'yの周波数倍率',min:.8,max:1.2,step:.001,unit:'倍'},
 {key:'phase',label:'第2項の位相ずれ',min:-3.14,max:3.14,step:.01,unit:'rad'},
 {key:'decay',label:'共通の減衰 d',min:0,max:.02,step:.0005,unit:'1/s'},
 {key:'depth',label:'zの振幅倍率（奥行き）',min:0,max:1.6,step:.05,unit:'倍'},
 {key:'duration',label:'描く時間範囲 T',min:20,max:160,step:5,unit:'s'},
];
type Seed=readonly [number,number,number]; // A, f, p; damping is a shared shape parameter.
type Preset={id:string;name:string;description:string;shape:Shape;seeds:Record<Axis,readonly [Seed,Seed]>};
export const presets:readonly Preset[]=[
 {id:'flower',name:'四葉の光冠',description:'四つの花弁がゆっくりずれて、透ける光の冠を織ります。',shape:{ratio:1,phase:0,decay:.003,depth:1,duration:110},seeds:{x:[[1.45,2.01,0],[.65,6.03,0]],y:[[1.45,2,Math.PI/2],[.65,6.04,-Math.PI/2]],z:[[.65,2.02,.8],[.28,4.01,.2]]}},
 {id:'cocoon',name:'光の繭',description:'速い周回と緩やかな奥行きの揺れが、丸い繭を編みます。',shape:{ratio:1,phase:0,decay:.001,depth:1,duration:130},seeds:{x:[[.95,3,0],[.95,3.06,0]],y:[[.95,3,Math.PI/2],[.95,3.06,Math.PI/2]],z:[[1.6,.03,0],[.1,.09,0]]}},
 {id:'basket',name:'星編みの籠',description:'異なる速さの揺れが交差し、奥行きのある編み目をつくります。',shape:{ratio:1,phase:.2,decay:.002,depth:1,duration:120},seeds:{x:[[1.2,3,0],[.65,1.02,0]],y:[[1.2,3.01,Math.PI/2],[.65,1.01,Math.PI/2]],z:[[1.1,2.03,0],[.25,6.05,.4]]}},
];
export const MAX_POINTS=24001;
export function validateShape(shape:Shape):void{
 for(const field of shapeFields){const value=shape[field.key];if(!Number.isFinite(value)||value<field.min||value>field.max)throw new RangeError(`Invalid ${field.key}`);}
}
export function resolveTerms(presetId:string,shape:Shape):Terms{
 validateShape(shape);const preset=presets.find(p=>p.id===presetId);if(!preset)throw new RangeError('Unknown preset');
 const terms={} as Terms;
 for(const axis of axes)terms[axis]=preset.seeds[axis].map(([a,f,p],index)=>({amplitude:a*(axis==='z'?shape.depth:1),frequency:f*(axis==='y'?shape.ratio:1),phase:p+(index===1?shape.phase:0),decay:shape.decay})) as [Oscillator,Oscillator];
 return terms;
}
export function evaluateAxis(t:number,terms:readonly Oscillator[]):number{
 if(!Number.isFinite(t)||t<0||t>160)throw new RangeError('Invalid time');
 return terms.reduce((sum,o)=>sum+o.amplitude*Math.exp(-o.decay*t)*Math.sin(o.frequency*t+o.phase),0);
}
export type Trajectory={positions:Float32Array;terms:Terms;duration:number;count:number};
export function sampleHarmonograph(presetId:string,shape:Shape):Trajectory{
 const terms=resolveTerms(presetId,shape),count=Math.min(MAX_POINTS,Math.ceil(shape.duration*150)+1),positions=new Float32Array(count*3);
 for(let i=0;i<count;i++)for(let a=0;a<3;a++)positions[i*3+a]=evaluateAxis(shape.duration*i/(count-1),terms[axes[a]]);
 return{positions,terms,duration:shape.duration,count};
}
export type Playback={time:number;mode:'drawing'|'paused'|'complete'};
export function advancePlayback(state:Playback,delta:number,rate:number,duration:number):Playback{
 if(!Number.isFinite(delta)||delta<0||!Number.isFinite(rate)||rate<1||rate>12||!Number.isFinite(duration)||duration<=0)throw new RangeError('Invalid playback input');
 if(state.mode!=='drawing')return state;
 const time=Math.min(duration,state.time+delta*rate);return{time,mode:time===duration?'complete':'drawing'};
}
export function resetProgress(state:Playback,duration:number,reducedMotion:boolean):Playback{
 return state.mode==='complete'?{time:duration,mode:'complete'}:{time:0,mode:reducedMotion?'paused':state.mode};
}
export function restartPlayback(state:Playback,reducedMotion:boolean):Playback{
 return{time:0,mode:reducedMotion||state.mode==='paused'?'paused':'drawing'};
}
export function visibleCount(trajectory:Trajectory,state:Playback):number{
 return Math.min(trajectory.count,Math.max(1,Math.floor(state.time/trajectory.duration*(trajectory.count-1))+1));
}
