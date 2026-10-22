/** Angles are stored in degrees; only the evaluator converts them to radians. */
export const GOLDEN_ANGLE=180*(3-Math.sqrt(5));
export const MAX_GARDEN_POINTS=3000;
export const GARDEN_SPACING=.14;
export const GARDEN_DOT_RADIUS=.042; // A display marker, independent of c.
export type GardenSettings={total:number;angle:number;rate:number};
export type GardenPlayback={progress:number;mode:'drawing'|'paused'|'complete'};
export const gardenDefaults:GardenSettings={total:1200,angle:GOLDEN_ANGLE,rate:160};
export const gardenPresets=[
 {id:'golden',label:'黄金角',angle:GOLDEN_ANGLE},
 {id:'120',label:'120°',angle:120},
 {id:'90',label:'90°',angle:90},
 {id:'near',label:'黄金角の近く · 137.3°',angle:137.3},
] as const;
export function validateGarden(settings:GardenSettings){
 if(!Number.isInteger(settings.total)||settings.total<1||settings.total>MAX_GARDEN_POINTS)throw new RangeError('Invalid point count');
 if(!Number.isFinite(settings.angle)||settings.angle<0||settings.angle>360)throw new RangeError('Invalid angle');
 if(!Number.isFinite(settings.rate)||settings.rate<1||settings.rate>600)throw new RangeError('Invalid growth rate');
}
export function gardenPoint(n:number,angle:number,c=GARDEN_SPACING){
 if(!Number.isInteger(n)||n<0||n>=MAX_GARDEN_POINTS||!Number.isFinite(angle)||angle<0||angle>360||!Number.isFinite(c)||c<=0||c>1)throw new RangeError('Invalid point');
 const theta=n*angle*Math.PI/180,r=c*Math.sqrt(n);
 return{n,theta,r,x:r*Math.cos(theta),y:r*Math.sin(theta)};
}
export function sampleGarden(settings:GardenSettings){
 validateGarden(settings);const positions=new Float32Array(settings.total*3);
 for(let n=0;n<settings.total;n++){const p=gardenPoint(n,settings.angle);positions.set([p.x,p.y,0],n*3);}
 return positions;
}
export function gardenExtent(total:number){
 if(!Number.isInteger(total)||total<1||total>MAX_GARDEN_POINTS)throw new RangeError('Invalid point count');
 return Math.max(GARDEN_SPACING*Math.sqrt(total-1)*1.12,.5);
}
export function visibleGardenPoints(state:GardenPlayback){return Math.floor(state.progress);}
export function advanceGarden(state:GardenPlayback,delta:number,settings:GardenSettings):GardenPlayback{
 validateGarden(settings);if(!Number.isFinite(delta)||delta<0)throw new RangeError('Invalid elapsed time');
 if(state.mode!=='drawing')return state;
 let progress=Math.min(settings.total,state.progress+delta*settings.rate);
 // Remove sub-nanopoint accumulation error at integer boundaries without dropping fractions.
 if(Math.abs(progress-Math.round(progress))<1e-9)progress=Math.round(progress);
 return{progress,mode:progress>=settings.total?'complete':'drawing'};
}
export function addGardenPoint(state:GardenPlayback,total:number):GardenPlayback{
 const progress=Math.min(total,Math.floor(state.progress)+1);
 return{progress,mode:progress>=total?'complete':'paused'};
}
export function restartGarden(state:GardenPlayback,reducedMotion:boolean):GardenPlayback{
 return{progress:0,mode:reducedMotion||state.mode==='paused'?'paused':'drawing'};
}
export function resizeGarden(state:GardenPlayback,total:number):GardenPlayback{
 const progress=state.mode==='complete'?total:Math.min(state.progress,total);
 return{progress,mode:progress>=total?'complete':state.mode};
}
export type GardenLessonStage=1|2|3|4;
export function lessonGardenSettings(settings:GardenSettings,stage:GardenLessonStage):GardenSettings{
 return{...settings,total:stage===4?settings.total:Math.min(12,settings.total),rate:stage===4?settings.rate:3};
}
