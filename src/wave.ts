export const AMPLITUDE=1, PERIOD=2, SIZE=240;
export type Settings={wavelength:number; distance:number; phase:number; speed:number};
export type Point={x:number;y:number};
export type Mode='a'|'b'|'u'|'envelope';
export const defaults=():Settings=>({wavelength:2,distance:4,phase:0,speed:1});
export const radians=(degrees:number)=>degrees*Math.PI/180;
export function parseNumber(raw:string){const value=Number(raw);if(!raw.trim()||!Number.isFinite(value)||(value===0&&/[1-9]/.test(raw.split(/[eE]/)[0])))return NaN;return value;}
export function evaluate(s:Settings,p:Point,t:number){
 const ra=Math.hypot(p.x+s.distance/2,p.y),rb=Math.hypot(p.x-s.distance/2,p.y),k=2*Math.PI/s.wavelength,phase=radians(s.phase),omega=2*Math.PI/PERIOD;
 const a=AMPLITUDE*Math.cos(k*ra-omega*t),b=AMPLITUDE*Math.cos(k*rb-omega*t+phase),delta=k*(rb-ra)+phase;
 return {ra,rb,a,b,u:a+b,delta,envelope:2*AMPLITUDE*Math.abs(Math.cos(delta/2))};
}
export function valid(s:Settings){return Number.isFinite(s.wavelength)&&s.wavelength>=1&&s.wavelength<=4&&Number.isFinite(s.distance)&&s.distance>=0&&s.distance<=6&&Number.isFinite(s.phase)&&s.phase>=-180&&s.phase<=180&&Number.isFinite(s.speed)&&s.speed>=.25&&s.speed<=2;}
export function pointValid(p:Point){return Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=6&&Math.abs(p.y)<=6;}
export function screenPoint(u:number,v:number):Point{return {x:12*u-6,y:6-12*v};}
/** Geometry and phase are independent of time; only rebuild when conditions change. */
export function geometry(s:Settings,n=SIZE){
 const a=new Float64Array(n*n),b=new Float64Array(n*n),env=new Float64Array(n*n),k=2*Math.PI/s.wavelength,phi=radians(s.phase);
 for(let j=0;j<n;j++)for(let i=0;i<n;i++){const p=screenPoint((i+.5)/n,(j+.5)/n),idx=j*n+i; a[idx]=k*Math.hypot(p.x+s.distance/2,p.y);b[idx]=k*Math.hypot(p.x-s.distance/2,p.y)+phi;env[idx]=2*Math.abs(Math.cos((b[idx]-a[idx])/2));}
 return {a,b,env,n};
}
export function pixels(g:ReturnType<typeof geometry>,mode:Mode,t:number){
 const out=new Uint8ClampedArray(g.n*g.n*4),theta=2*Math.PI*t/PERIOD;
 for(let i=0;i<g.a.length;i++){
  const v=mode==='envelope'?g.env[i]:mode==='a'?Math.cos(g.a[i]-theta):mode==='b'?Math.cos(g.b[i]-theta):Math.cos(g.a[i]-theta)+Math.cos(g.b[i]-theta);
  if(mode==='envelope'){const q=v/2;out[4*i]=Math.round(8+220*q);out[4*i+1]=Math.round(17+175*q);out[4*i+2]=Math.round(35+72*q);}
  else {const q=v/2;out[4*i]=Math.round(12+Math.max(0,q)*220);out[4*i+1]=Math.round(20+Math.abs(q)*120);out[4*i+2]=Math.round(37+Math.max(0,-q)*210);}
  out[4*i+3]=255;
 }
 return out;
}
