export const SIZE=128, DU=.16, DV=.08;
export const presets=[{name:'斑点',f:.030,k:.062},{name:'迷路',f:.029,k:.057},{name:'珊瑚状',f:.0545,k:.062},{name:'分裂する粒',f:.0367,k:.0649}];
export type Settings={f:number;k:number};
export type Mode='full'|'diffusion'|'reaction';
export type Grid={size:number;u:Float64Array;v:Float64Array;step:number};
export function clone(g:Grid):Grid{return {...g,u:g.u.slice(),v:g.v.slice()};}
export function initial(size=SIZE,seeded=true):Grid{
 const g={size,u:new Float64Array(size*size).fill(1),v:new Float64Array(size*size),step:0};
 if(seeded)for(const [x,y] of [[.5,.5],[.3,.35],[.7,.65]])seed(g,Math.floor(x*size),Math.floor(y*size));
 return g;
}
/** Radius 3 disk, overwrite (not add): deterministic, including overlaps. */
export function seed(g:Grid,x:number,y:number){
 if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=g.size||y>=g.size)throw Error('座標は格子内の整数で指定してください');
 for(let yy=Math.max(0,y-3);yy<=Math.min(g.size-1,y+3);yy++)for(let xx=Math.max(0,x-3);xx<=Math.min(g.size-1,x+3);xx++)if((xx-x)**2+(yy-y)**2<=9){g.u[yy*g.size+xx]=.5;g.v[yy*g.size+xx]=.25;}
}
export function lap(a:Float64Array,size:number,i:number){const x=i%size,y=Math.floor(i/size);return a[y*size+Math.max(0,x-1)]+a[y*size+Math.min(size-1,x+1)]+a[Math.max(0,y-1)*size+x]+a[Math.min(size-1,y+1)*size+x]-4*a[i];}
export function terms(g:Grid,s:Settings,i:number,mode:Mode='full'){
 const u=g.u[i],v=g.v[i],du=mode==='reaction'?0:DU*lap(g.u,g.size,i),dv=mode==='reaction'?0:DV*lap(g.v,g.size,i),r=mode==='diffusion'?0:u*v*v,feed=mode==='diffusion'?0:s.f*(1-u),loss=mode==='diffusion'?0:-(s.f+s.k)*v;
 return {u,v,du,dv,r,feed,loss,nextU:u+du-r+feed,nextV:v+dv+r+loss};
}
export function valid(s:Settings){return Number.isFinite(s.f)&&s.f>=.01&&s.f<=.08&&Number.isFinite(s.k)&&s.k>=.045&&s.k<=.07;}
export function parse(raw:string){if(!raw.trim())return NaN;const n=Number(raw);return !Number.isFinite(n)||(n===0&&/[1-9]/.test(raw.split(/[eE]/)[0]))?NaN:n;}
export function check(g:Grid){for(let i=0;i<g.u.length;i++)if(!Number.isFinite(g.u[i])||!Number.isFinite(g.v[i])||g.u[i]<0||g.u[i]>1||g.v[i]<0||g.v[i]>1)throw Error(`濃度異常: step=${g.step}, cell=${i}, u=${g.u[i]}, v=${g.v[i]}（許容0〜1、補正なし）`);}
/** Atomic synchronous update. No input write; failed step never commits. */
export function advance(g:Grid,s:Settings,count:number,mode:Mode='full'):Grid{
 if(!valid(s)||!Number.isInteger(count)||count<1||count>32)throw Error('計算設定または処理量が不正です');
 check(g);let current=clone(g),next=clone(g);
 for(let n=0;n<count;n++){
  for(let i=0;i<g.u.length;i++){const t=terms(current,s,i,mode);next.u[i]=t.nextU;next.v[i]=t.nextV;}
  next.step=current.step+1;check(next);[current,next]=[next,current];
 }
 return current;
}
export class Generation{private value=0;next(){return ++this.value;}accept(id:number){return id===this.value;}}
export type Request={id:number;grid:Grid;settings:Settings;count:number;mode:Mode};
export type Reply={id:number;grid?:Grid;error?:string;ms:number};
