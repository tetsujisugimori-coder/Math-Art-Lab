import {EXTENT, MAX_AMPLITUDE, OMEGA, PERIOD, type Field, type Mode, type Palette} from './ripple';

type RGB=readonly [number,number,number];
export const GLOW_RESOLUTION=96;
const background:RGB=[4,8,20];
export const paletteNames:Record<Palette,string>={aurora:'青とシアンの極光',iris:'紫とピンクの虹彩',gold:'藍と金の星明かり'};
const stops:Record<Palette,readonly RGB[]>={
  aurora:[background,[19,26,85],[69,58,169],[38,155,202],[111,241,224],[255,243,197]],
  iris:[background,[36,16,69],[104,45,149],[209,79,166],[252,157,189],[255,239,218]],
  gold:[background,[15,31,69],[31,96,139],[158,137,94],[243,200,115],[255,248,215]],
};
export const negative:RGB=[65,195,255],positive:RGB=[255,192,105];
/** Fixed scales for a given N: u/(2N), C/(2N), I/(4N²). A is never divided out. */
export function normalized(value:number,mode:Mode,count:number) {
  const bound=MAX_AMPLITUDE*count;
  return Math.max(mode==='displacement'?-1:0,Math.min(1,value/(mode==='intensity'?bound*bound:bound)));
}
export function color(value:number,mode:Mode,palette:Palette,count:number):number[] {
  const q=normalized(value,mode,count);
  if(mode==='displacement') {
    const end=q<0?negative:positive,f=Math.abs(q)**.65;
    return background.map((v,j)=>Math.round(v+(end[j]-v)*f));
  }
  const p=(q**(mode==='intensity'?.4:.7))*(stops[palette].length-1),i=Math.min(stops[palette].length-2,Math.floor(p)),f=p-i;
  return stops[palette][i].map((v,j)=>Math.round(v+(stops[palette][i+1][j]-v)*f));
}
const tables=new Map<string,Uint8ClampedArray>();
function table(mode:Mode,palette:Palette) {
  const key=mode+palette;let lut=tables.get(key);
  if(!lut) {lut=new Uint8ClampedArray(2049*3);for(let i=0;i<=2048;i++)lut.set(color(mode==='displacement'?(i/1024-1)*2:i/2048*(mode==='intensity'?4:2),mode,palette,1),i*3);tables.set(key,lut);}
  return lut;
}
/** Legend samples the exact same LUT as paintPixels, at the displayed pixel width.
 * The central one/two signed pixels are zero, so neither sign displaces zero.
 * No amplitude or source count enters the normalized color scale. */
export function legendPixels(width:number,mode:Mode,palette:Palette) {
  if(!Number.isInteger(width)||width<3||width>4097)throw new RangeError('Invalid legend width');
  const out=new Uint8ClampedArray(width*4),lut=table(mode,palette);
  const leftZero=Math.floor((width-1)/2),rightZero=Math.ceil((width-1)/2);
  for(let x=0;x<width;x++) {
    const q=mode==='displacement'?(x<=leftZero?x/leftZero-1:(x-rightZero)/(width-1-rightZero)):x/(width-1);
    const index=Math.round(Math.max(0,Math.min(2048,mode==='displacement'?(q+1)*1024:q*2048)))*3;
    out[x*4]=lut[index];out[x*4+1]=lut[index+1];out[x*4+2]=lut[index+2];out[x*4+3]=255;
  }
  return out;
}
/** Math raster only. The circular aperture crops the field; it adds no wave term. */
export function paintPixels(f:Field,mode:Mode,palette:Palette,t:number,out=new Uint8ClampedArray(f.size*f.size*4)) {
  const lut=table(mode,palette),bound=MAX_AMPLITUDE*f.count,c=Math.cos(OMEGA*(t%PERIOD)),s=Math.sin(OMEGA*(t%PERIOD));
  for(let row=0;row<f.size;row++) for(let col=0;col<f.size;col++) {
    const i=row*f.size+col,x=(2*(col+.5)/f.size-1)*EXTENT,y=(1-2*(row+.5)/f.size)*EXTENT;
    if(x*x+y*y>4.85**2) {out.set([...background,255],i*4);continue;}
    const value=mode==='intensity'?f.envelope[i]**2:mode==='envelope'?f.envelope[i]:f.real[i]*c+f.imag[i]*s;
    const q=value/(mode==='intensity'?bound*bound:bound);
    const index=Math.round(Math.max(0,Math.min(2048,mode==='displacement'?(q+1)*1024:q*2048)))*3;
    out[i*4]=lut[index];out[i*4+1]=lut[index+1];out[i*4+2]=lut[index+2];out[i*4+3]=255;
  }
  return out;
}
