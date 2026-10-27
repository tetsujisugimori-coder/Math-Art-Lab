import {complexToScreen,escapeRadius,finiteComplex,quadratic,twinsDefaults,validateTwins,type Complex,type Plane,type PlaneView} from './twins';

export const TRAIL_POINTS=32;
export type ObservationStatus='observing'|'escaped'|'limit'|'precision'|'error';
export type Observation={kind:Plane;c:Complex;seed:Complex;limit:number;radius:number;n:number;z:Complex;previous:Complex|null;points:{n:number;z:Complex}[];status:ObservationStatus;message:string};
// Same strict squared-radius comparison as the background's escapeSteps.
const escaped=(z:Complex,r:number)=>z.re*z.re+z.im*z.im>r*r;
export function beginObservation(kind:Plane,c:Complex,seed:Complex,limit:number):Observation{
 if(kind!=='mandelbrot'&&kind!=='julia')throw new RangeError('観察側が不正です。');
 validateTwins({...twinsDefaults(),c,seed,iterations:limit});
 const start=kind==='mandelbrot'?{re:0,im:0}:{...seed},radius=escapeRadius(kind,c);
 return{kind,c:{...c},seed:start,limit,radius,n:0,z:{...start},previous:null,points:[{n:0,z:{...start}}],status:escaped(start,radius)?'escaped':'observing',message:''};
}
/** Exactly one successful quadratic iteration per call; never infer cycles or convergence. */
export function advanceObservation(s:Observation):Observation{
 if(s.status!=='observing')return s;
 if(s.n>=s.limit)return{...s,status:'limit'};
 try{
  finiteComplex(s.z);finiteComplex(s.c);
  const {re:x,im:y}=s.z;
  if((x!==0&&x*x===0)||(y!==0&&y*y===0)||(x!==0&&y!==0&&x*y===0))return{...s,status:'precision',message:'倍精度の積が0へアンダーフローするため計算を停止しました。最後の計算可能な点を保持しています。'};
  const z=quadratic(s.z,s.c),n=s.n+1;
  return{...s,z,previous:{...s.z},n,points:[...s.points,{n,z}].slice(-TRAIL_POINTS),status:escaped(z,s.radius)?'escaped':n===s.limit?'limit':'observing'};
 }catch{return{...s,status:'error',message:'非有限値などにより計算できません。発散とは判定せず、最後の計算可能な点を保持しています。'};}
}

export type PlotPoint={u:number;v:number};
export function plotPoint(view:PlaneView,z:Complex,aspect:number):PlotPoint|null{
 finiteComplex(z);const p=complexToScreen(view,z,aspect);
 return Number.isFinite(p.u)&&Number.isFinite(p.v)&&p.u>=0&&p.u<=1&&p.v>=0&&p.v<=1?p:null;
}
/** Liang–Barsky clipping in normalized coordinates. Endpoints stay real intersections, not clamped points. */
export function clipOrbitSegment(view:PlaneView,a:Complex,b:Complex,aspect:number):[PlotPoint,PlotPoint]|null{
 const p=complexToScreen(view,a,aspect),q=complexToScreen(view,b,aspect),dx=q.u-p.u,dy=q.v-p.v;
 // Valid observation endpoints at the supported zoom stay well below this bound.
 // Beyond it, subtracting huge coordinates can collapse distinct edge intersections.
 if(![p.u,p.v,q.u,q.v,dx,dy].every(v=>Number.isFinite(v)&&Math.abs(v)<=1e9))return null;
 let lo=0,hi=1;
 for(const [direction,distance] of [[-dx,p.u],[dx,1-p.u],[-dy,p.v],[dy,1-p.v]]){
  if(direction===0){if(distance<0)return null;continue;}
  const t=distance/direction;if(direction<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;
 }
 return[{u:p.u+lo*dx,v:p.v+lo*dy},{u:p.u+hi*dx,v:p.v+hi*dy}];
}

/** A stopped/replaced timer cannot mutate a new observation, even if its callback was already queued. */
export class ObservationClock{
 private version=0;private timer:ReturnType<typeof setTimeout>|undefined;running=false;
 constructor(private tick:()=>boolean,private schedule= setTimeout,private cancel=clearTimeout){}
 start(delay:number){if(this.running)return;this.running=true;const version=++this.version;
  const queue=()=>{this.timer=this.schedule(()=>{if(!this.running||version!==this.version)return;if(!this.tick()){this.stop();return;}queue();},delay);};queue();
 }
 stop(){this.running=false;this.version++;if(this.timer!==undefined)this.cancel(this.timer);this.timer=undefined;}
}
