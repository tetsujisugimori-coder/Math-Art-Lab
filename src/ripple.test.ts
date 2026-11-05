import fixtures from '../docs/ripple-kaleidoscope/reference.json';
import {describe,it,expect} from 'vitest';
import {buildField,defaults,evaluate,fieldValue,OMEGA,parseNumber,PERIOD,RESOLUTION,screenPoint,sources,valid,validPoint,waveNumber,type Settings,type Mode} from './ripple';
import {color,normalized,paintPixels} from './ripple-render';

describe('ripple: independent scalar reference and symmetry',()=>{
  for(const [i,c] of fixtures.entries())it(`matches Python direct sums / cmath fixture ${i}`,()=>{
    const result=evaluate(c.settings,c.point,c.time);
    for(const key of ['u','C','I','real','imag'] as const)expect(result[key]).toBeCloseTo(c[key],11);
    result.terms.forEach((v,j)=>expect(v.distance).toBeCloseTo(c.distances[j],12));
  });
  it('generates exactly N distinct, equally spaced sources with j=0 at theta',()=>{
    for(let n=1;n<=8;n++)for(const angle of [-180,0,51,180]) {
      const s={...defaults(),count:n,angle},p=sources(s);
      expect(p).toHaveLength(n);expect(new Set(p.map(v=>`${v.x},${v.y}`)).size).toBe(n);
      for(let j=0;j<n;j++) {
        expect(Math.hypot(p[j].x,p[j].y)).toBeCloseTo(s.radius,12);
        const next=p[(j+1)%n];expect(Math.hypot(p[j].x-next.x,p[j].y-next.y)).toBeCloseTo(2*s.radius*Math.sin(Math.PI/n),12);
        expect(p[j].index).toBe(j);expect(p[j].phase).toBe(0);
      }
    }
  });
  it('preserves N-fold rotational symmetry for u,C,I without equating it to petals',()=>{
    for(let count=3;count<=8;count++)for(const p of [{x:.7,y:.4},{x:2.4,y:-1.1},{x:-3.1,y:1.3}]) {
      const a=2*Math.PI/count,q={x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)},s={...defaults(),count,angle:37};
      const v=evaluate(s,p,.731),w=evaluate(s,q,.731);for(const key of ['u','C','I'] as const)expect(v[key]).toBeCloseTo(w[key],10);
    }
  });
  it('rotates source coordinates and scalar field together; single phase offset can break symmetry',()=>{
    const s=defaults(),p={x:.7,y:1.2},a=Math.PI/3,q={x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)};
    expect(evaluate({...s,angle:60},q,.2).u).toBeCloseTo(evaluate(s,p,.2).u,12);
    expect(Math.abs(evaluate({...s,phase:90},p,0).I-evaluate({...s,phase:90},q,0).I)).toBeGreaterThan(.1);
    const origins=sources({...s,phase:90});expect(origins[0].phase).toBeCloseTo(Math.PI/2,14);expect(origins.slice(1).every(p=>p.phase===0)).toBe(true);
  });
  it('time changes only displacement, and amplitude rescales C and I without normalization hiding it',()=>{
    const s={...defaults(),amplitude:1},p={x:.7,y:.4},a=evaluate(s,p,0),b=evaluate(s,p,PERIOD/4),c=evaluate({...s,amplitude:2},p,0);
    expect(a.u).not.toBeCloseTo(b.u,3);expect(a.C).toBe(b.C);expect(a.I).toBe(b.I);
    expect(evaluate(s,p,PERIOD).u).toBeCloseTo(a.u,12);expect(c.C).toBeCloseTo(2*a.C,12);expect(c.I).toBeCloseTo(4*a.I,12);
    expect(normalized(c.I,'intensity',6)).toBeCloseTo(4*normalized(a.I,'intensity',6),12);
    expect(waveNumber(2)).toBe(Math.PI);expect(OMEGA*PERIOD).toBeCloseTo(2*Math.PI,14);
  });
});
describe('ripple: input boundaries and raster correspondence',()=>{
  it('accepts finite boundary settings and rejects invalid or non-finite values at the model boundary',()=>{
    const s=defaults();
    for(const [key,values] of Object.entries({count:[0,9,3.2,NaN,Infinity],wavelength:[0,.49,4.01,NaN,Infinity],radius:[0,3.1,NaN,Infinity],amplitude:[-.1,2.1,NaN,Infinity],angle:[-181,181,NaN,Infinity],phase:[-181,181,NaN,Infinity]}))for(const value of values) {
      const bad={...s,[key]:value};expect(valid(bad)).toBe(false);expect(()=>buildField(bad,3)).toThrow(RangeError);expect(()=>evaluate(bad,{x:0,y:0},0)).toThrow(RangeError);
    }
    for(const settings of [{count:1,wavelength:.5,radius:.25,amplitude:0,angle:-180,phase:-180},{count:8,wavelength:4,radius:3,amplitude:2,angle:180,phase:180}])expect(valid(settings)).toBe(true);
    for(const raw of ['',' ','NaN','Infinity','1e999','1e-999'])expect(Number.isNaN(parseNumber(raw))).toBe(true);
    expect(validPoint({x:NaN,y:0})).toBe(false);expect(()=>evaluate(s,{x:0,y:0},Infinity)).toThrow();expect(()=>buildField(s,RESOLUTION+1)).toThrow();
  });
  it('cached phasors and raster sample values agree with separate direct scalar sums',()=>{
    const s:Settings={count:5,wavelength:1.31,radius:2.1,amplitude:1.7,angle:41,phase:-74},n=31,f=buildField(s,n);
    for(const index of [0,15,49,260,480,660,960]) {
      const p=screenPoint((index%n+.5)/n,(Math.floor(index/n)+.5)/n);
      let X=0,Y=0,u=0;
      for(let j=0;j<s.count;j++) {const a=2*Math.PI*j/s.count+s.angle*Math.PI/180,r=Math.hypot(p.x-s.radius*Math.cos(a),p.y-s.radius*Math.sin(a)),phase=2*Math.PI/s.wavelength*r+(j===0?s.phase*Math.PI/180:0);X+=s.amplitude*Math.cos(phase);Y+=s.amplitude*Math.sin(phase);u+=s.amplitude*Math.cos(phase-OMEGA*.7);}
      expect(f.real[index]).toBeCloseTo(X,11);expect(f.imag[index]).toBeCloseTo(Y,11);expect(fieldValue(f,index,'displacement',.7)).toBeCloseTo(u,11);expect(fieldValue(f,index,'envelope',.7)).toBeCloseTo(Math.hypot(X,Y),11);expect(fieldValue(f,index,'intensity',.7)).toBeCloseTo(X*X+Y*Y,10);
    }
  });
  it('raster uses stated fixed color mapping for every mode and all palettes, not decoration',()=>{
    const f=buildField(defaults(),21),index=10*21+10;
    for(const mode of ['displacement','envelope','intensity'] as Mode[])for(const palette of ['aurora','iris','gold'] as const) {
      const data=paintPixels(f,mode,palette,.7),expected=color(fieldValue(f,index,mode,.7),mode,palette,f.count);
      expected.forEach((value,j)=>expect(Math.abs(data[4*index+j]-value)).toBeLessThanOrEqual(1));expect(data[4*index+3]).toBe(255);
      if(mode!=='displacement')expect(paintPixels(f,mode,palette,2)).toEqual(data);
    }
    expect(paintPixels(f,'displacement','aurora',0)).not.toEqual(paintPixels(f,'displacement','aurora',1));
    expect(Array.from(paintPixels(f,'intensity','aurora',0).slice(0,4))).toEqual([4,8,20,255]);
  });
  it('zero amplitude stays dark; bounded full-resolution worst case stays finite',()=>{
    const f=buildField({...defaults(),count:8,wavelength:.5,radius:3,amplitude:2,phase:180});expect(f.real.length).toBe(RESOLUTION**2);expect(f.envelope.every(v=>Number.isFinite(v)&&v<=16+1e-12)).toBe(true);
    const zero=buildField({...defaults(),amplitude:0},5);expect(zero.envelope.every(v=>v===0)).toBe(true);
    for(const mode of ['envelope','intensity','displacement'] as Mode[])expect(Array.from(paintPixels(zero,mode,'gold',1)).every((v,i)=>v===[4,8,20,255][i%4])).toBe(true);
  });
});
