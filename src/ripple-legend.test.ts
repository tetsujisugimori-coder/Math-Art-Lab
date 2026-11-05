import {describe,it,expect} from 'vitest';
import {buildField,defaults,type Field,type Mode,type Palette} from './ripple';
import {color,legendPixels,paintPixels} from './ripple-render';

const modes:Mode[]=['displacement','envelope','intensity'],palettes:Palette[]=['aurora','iris','gold'],anchors=[0,1/32,1/8,1/4,1/2,3/4,1];
describe('ripple legend: shared raster color scale',()=>{
  it('matches the actual wave raster and color function exactly at all required LUT anchors',()=>{
    for(const mode of modes)for(const palette of palettes){const legend=legendPixels(2049,mode,palette),qs=mode==='displacement'?[...anchors.slice(1).map(q=>-q),...anchors]:anchors;
      for(const q of qs){const value=mode==='intensity'?2*Math.sqrt(q):2*q,f:Field={size:3,count:1,real:new Float64Array(9).fill(value),imag:new Float64Array(9),envelope:new Float64Array(9).fill(Math.abs(value))};
        const image=paintPixels(f,mode,palette,0),col=Math.round(mode==='displacement'?(q+1)*1024:q*2048),actual=Array.from(legend.slice(4*col,4*col+4));
        expect(actual).toEqual(Array.from(image.slice(16,20)));expect(actual).toEqual([...color(q*(mode==='intensity'?4:2),mode,palette,1),255]);
      }
    }
  });
  it('pins endpoints and signed zero to opaque colors for odd and even display widths',()=>{
    for(const width of [3,4,343,358,686,716,1748,4097])for(const mode of modes)for(const palette of palettes){const image=legendPixels(width,mode,palette);
      expect(Array.from(image.slice(0,4))).toEqual([...color(mode==='displacement'?-2:0,mode,palette,1),255]);
      expect(Array.from(image.slice(-4))).toEqual([...color(mode==='intensity'?4:2,mode,palette,1),255]);
      if(mode==='displacement')for(const center of [Math.floor((width-1)/2),Math.ceil((width-1)/2)])expect(Array.from(image.slice(center*4,center*4+4))).toEqual([4,8,20,255]);
    }
  });
  it('keeps every supported profile sample within the fixed four-channel-unit accuracy budget',()=>{
    for(const width of [343,358,686,716,1748,4097])for(const mode of modes)for(const palette of palettes){const image=legendPixels(width,mode,palette),left=Math.floor((width-1)/2),right=Math.ceil((width-1)/2);let worst=0;
      for(let col=0;col<width;col++){const q=mode==='displacement'?(col<=left?col/left-1:(col-right)/(width-1-right)):col/(width-1),expected=color(q*(mode==='intensity'?4:2),mode,palette,1);worst=Math.max(worst,...expected.map((v,j)=>Math.abs(v-image[col*4+j])));}
      expect(worst).toBeLessThanOrEqual(4);
    }
  });
  it('rejects non-finite, fractional and out-of-budget widths before allocating',()=>{
    for(const width of [0,1,2,4098,3.5,NaN,Infinity])expect(()=>legendPixels(width,'intensity','aurora')).toThrow(RangeError);
    expect(legendPixels(4097,'intensity','aurora').length).toBe(4097*4);
  });
  it('does not mutate numerical fields or the base raster when generating legend variants',()=>{
    const f=buildField({...defaults(),phase:73,angle:-90},21),before={real:f.real.slice(),imag:f.imag.slice(),C:f.envelope.slice()},pixels=paintPixels(f,'displacement','aurora',.7);
    for(const mode of modes)for(const palette of palettes)legendPixels(686,mode,palette);
    expect(f.real).toEqual(before.real);expect(f.imag).toEqual(before.imag);expect(f.envelope).toEqual(before.C);expect(paintPixels(f,'displacement','aurora',.7)).toEqual(pixels);
  });
  it('returns a private image buffer without exposing or corrupting the shared LUT',()=>{
    const first=legendPixels(343,'envelope','iris'),copy=first.slice();first.fill(255);expect(legendPixels(343,'envelope','iris')).toEqual(copy);
  });
});
