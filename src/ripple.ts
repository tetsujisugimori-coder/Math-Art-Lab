import {parseNumber, radians, type Point} from './wave';
export {parseNumber, radians, type Point};

export const PERIOD = 6, OMEGA = 2 * Math.PI / PERIOD, STEP = PERIOD / 120;
export const EXTENT = 5, RESOLUTION = 384, MAX_AMPLITUDE = 2;
export type Settings = {count:number; wavelength:number; radius:number; amplitude:number; angle:number; phase:number};
export type Mode = 'displacement' | 'envelope' | 'intensity';
export type Palette = 'aurora' | 'iris' | 'gold';
export type Source = Point & {amplitude:number; phase:number; index:number};
export const defaults = ():Settings => ({count:6, wavelength:1.25, radius:2.2, amplitude:1.8, angle:0, phase:0});
export const presets = [
  {name:'六花', settings:defaults(), palette:'aurora'},
  {name:'星環', settings:{...defaults(),count:5,wavelength:.85,radius:2.6,angle:18},palette:'gold'},
  {name:'光の花弁', settings:{...defaults(),count:8,wavelength:1.7,radius:2.7,angle:22.5},palette:'iris'},
  {name:'静かな結晶', settings:{...defaults(),count:4,wavelength:.7,radius:1.6,angle:45},palette:'aurora'},
] satisfies {name:string; settings:Settings; palette:Palette}[];

export function valid(s:Settings):boolean {
  return Number.isInteger(s.count) && s.count>=1 && s.count<=8 &&
    Number.isFinite(s.wavelength) && s.wavelength>=.5 && s.wavelength<=4 &&
    Number.isFinite(s.radius) && s.radius>=.25 && s.radius<=3 &&
    Number.isFinite(s.amplitude) && s.amplitude>=0 && s.amplitude<=MAX_AMPLITUDE &&
    Number.isFinite(s.angle) && Math.abs(s.angle)<=180 &&
    Number.isFinite(s.phase) && Math.abs(s.phase)<=180;
}
function assertSettings(s:Settings) {if(!valid(s)) throw new RangeError('範囲内の有限な設定が必要です');}
export function validPoint(p:Point) {return Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=EXTENT&&Math.abs(p.y)<=EXTENT;}
export function waveNumber(wavelength:number) {
  if(!Number.isFinite(wavelength)||wavelength<.5||wavelength>4) throw new RangeError('Invalid wavelength');
  return 2*Math.PI/wavelength;
}
/** j=0,...,N−1. Only source zero has the optional phase offset. */
export function sources(s:Settings):Source[] {
  assertSettings(s);
  return Array.from({length:s.count},(_,j)=>({index:j,x:s.radius*Math.cos(2*Math.PI*j/s.count+radians(s.angle)),y:s.radius*Math.sin(2*Math.PI*j/s.count+radians(s.angle)),amplitude:s.amplitude,phase:j===0?radians(s.phase):0}));
}
export function evaluate(s:Settings,p:Point,t:number) {
  if(!validPoint(p)||!Number.isFinite(t)||t<0) throw new RangeError('Invalid point/time');
  const k=waveNumber(s.wavelength), phaseTime=OMEGA*(t%PERIOD);
  const terms=sources(s).map(source=>{
    const distance=Math.hypot(p.x-source.x,p.y-source.y), phase=k*distance+source.phase;
    return {...source,distance,phase,real:source.amplitude*Math.cos(phase),imag:source.amplitude*Math.sin(phase),u:source.amplitude*Math.cos(phase-phaseTime)};
  });
  const real=terms.reduce((sum,v)=>sum+v.real,0),imag=terms.reduce((sum,v)=>sum+v.imag,0),C=Math.hypot(real,imag);
  return {terms,real,imag,u:real*Math.cos(phaseTime)+imag*Math.sin(phaseTime),C,I:C*C};
}
export const screenPoint = (u:number,v:number):Point => ({x:(2*u-1)*EXTENT,y:(1-2*v)*EXTENT});
export type Field = {real:Float64Array; imag:Float64Array; envelope:Float64Array; size:number; count:number};
/** Phasors contain all N source terms. No time or display effects enter this cache. */
export function buildField(s:Settings,size=RESOLUTION):Field {
  assertSettings(s);
  if(!Number.isInteger(size)||size<1||size>RESOLUTION) throw new RangeError('Invalid resolution');
  const real=new Float64Array(size*size),imag=new Float64Array(size*size),envelope=new Float64Array(size*size);
  const origins=sources(s),k=waveNumber(s.wavelength);
  for(let row=0;row<size;row++) for(let col=0;col<size;col++) {
    const p=screenPoint((col+.5)/size,(row+.5)/size),idx=row*size+col;
    for(const source of origins) {
      const phase=k*Math.hypot(p.x-source.x,p.y-source.y)+source.phase;
      real[idx]+=source.amplitude*Math.cos(phase);imag[idx]+=source.amplitude*Math.sin(phase);
    }
    envelope[idx]=Math.hypot(real[idx],imag[idx]);
  }
  return {real,imag,envelope,size,count:s.count};
}
export function fieldValue(f:Field,index:number,mode:Mode,t:number) {
  if(!Number.isFinite(t)||t<0||!Number.isInteger(index)||index<0||index>=f.real.length) throw new RangeError('Invalid sample');
  if(mode==='envelope')return f.envelope[index];
  if(mode==='intensity')return f.envelope[index]**2;
  return f.real[index]*Math.cos(OMEGA*(t%PERIOD))+f.imag[index]*Math.sin(OMEGA*(t%PERIOD));
}
