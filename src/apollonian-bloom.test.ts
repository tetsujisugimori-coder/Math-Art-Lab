import {describe,expect,it} from 'vitest';
import {bloomFrame,bloomPresets,BLOOM_MS,buildBloom,MAX_CIRCLES,reflect} from './apollonian-bloom';

describe('020 Apollonian Bloom — Descartes geometry',()=>{
  it('has a genuinely symmetric default seed and four distinct sets of interior sizes',()=>{
    const sizes=Object.values(bloomPresets).map(({seed})=>seed.slice(1).map(c=>c.k).sort().join(','));
    expect(new Set(sizes).size).toBe(4);
    const [outer,a,b,c]=buildBloom(bloomPresets.trinity.seed,0).circles;
    expect(outer.k).toBe(-1);
    expect(a.radius).toBeCloseTo(2*Math.sqrt(3)-3,14);
    expect(b.radius).toBe(a.radius);expect(c.radius).toBe(a.radius);
    expect(a.x+b.x+c.x).toBeCloseTo(0,14);expect(a.y+b.y+c.y).toBeCloseTo(0,14);
  });

  it('gets the middle and peripheral first reflections from the symmetric seed',()=>{
    const circles=buildBloom(bloomPresets.trinity.seed,1).circles;
    const center=circles[4];
    expect(center.k).toBeCloseTo(7+4*Math.sqrt(3),13);
    expect(center.radius).toBeCloseTo(7-4*Math.sqrt(3),13);
    expect(Math.hypot(center.x,center.y)).toBeLessThan(1e-14);
    for(const circle of circles.slice(5)) expect(circle.k).toBeCloseTo(1+2*Math.sqrt(3),13);
  });

  it('matches an exact integer reference including equal-curvature distinct centers',()=>{
    const {seed}=bloomPresets.jewel;
    expect(seed.map((_,index)=>reflect(seed,index))).toEqual([
      {k:15,u:0,v:4},{k:6,u:3,v:4},{k:6,u:-3,v:4},{k:3,u:0,v:-2},
    ]);
    // Exact signed-bend tests: square cross-multiplied distances, no tolerance.
    const generated=buildBloom(seed,5).circles;
    for(let i=1;i<generated.length;i++){
      const a=generated[i];
      expect(a.u*a.u+a.v*a.v).toBeLessThanOrEqual((a.k-1)**2);
      for(let j=1;j<i;j++){
        const b=generated[j];
        if((a.u*b.k-b.u*a.k)**2+(a.v*b.k-b.v*a.k)**2<(a.k+b.k)**2) throw new Error(`Overlap ${i},${j}`);
      }
    }
  });

  it.each(Object.entries(bloomPresets))('validates %s through the maximum depth',(_name,{seed})=>{
    const pack=buildBloom(seed,6);
    const {circles}=pack;
    expect(circles).toHaveLength(MAX_CIRCLES);
    expect(pack.duplicates).toBe(0);
    expect(pack.tooSmall).toBe(0);
    expect(circles[0].radius).toBe(1);
    let last=0;
    const tally=Array<number>(7).fill(0);
    for(const circle of circles){
      if(circle.generation<last || !Number.isFinite(circle.x+circle.y+circle.radius) || circle.radius<=0 || Math.hypot(circle.x,circle.y)+circle.radius>1+1e-12) throw new Error('Invalid packing');
      last=circle.generation;tally[last]++;
    }
    expect(tally).toEqual([4,4,12,36,108,324,972]);
    const bends=seed.map(c=>c.k);
    expect((bends.reduce((a,b)=>a+b))**2).toBeCloseTo(2*bends.reduce((a,b)=>a+b*b,0),11);
  });
  it('rejects malformed seed, coincident interior seed and unsupported limits',()=>{
    const [a,b,c,d]=bloomPresets.jewel.seed;
    expect(()=>buildBloom([a,b,b,d],3)).toThrow(/mutually tangent/);
    expect(()=>buildBloom([a,b,c,{...d,v:NaN}],3)).toThrow(/Nonfinite/);
    expect(()=>buildBloom([{...a,k:1},b,c,d],3)).toThrow(/normalized/);
    expect(()=>buildBloom([a,b,c,{...d,v:2.1}],3)).toThrow(/mutually tangent/);
    expect(()=>buildBloom(bloomPresets.jewel.seed,7)).toThrow(/limits/);
    expect(()=>buildBloom(bloomPresets.jewel.seed,6,MAX_CIRCLES+1)).toThrow(/limits/);
    expect(()=>buildBloom(bloomPresets.jewel.seed,6,50,NaN)).toThrow(/limits/);
  });
  it('is deterministic, honors limits, and can exhaust small candidates',()=>{
    const {seed}=bloomPresets.jewel;
    const result=buildBloom(seed,5);
    expect(result).toEqual(buildBloom(seed,5));
    expect(result.circles.slice(0,100)).toEqual(buildBloom(seed,5,100).circles);
    expect(buildBloom(seed,5,100).stop).toBe('count');
    const exhausted=buildBloom(seed,5,100,.9);
    expect(exhausted.stop).toBe('exhausted');
    expect(exhausted.circles).toHaveLength(4);
    expect(exhausted.tooSmall).toBe(4);
  });
  it('reveals a deterministic prefix, separating packed count, title ramp, and finish',()=>{
    const count=488;
    expect(bloomFrame(1999,count)).toEqual({ms:1999,count:4,titleOpacity:0});
    expect(bloomFrame(14000,count)).toEqual({ms:14000,count,titleOpacity:0});
    expect(bloomFrame(14500,count)).toEqual({ms:14500,count,titleOpacity:.5});
    expect(bloomFrame(BLOOM_MS,count)).toEqual({ms:BLOOM_MS,count,titleOpacity:1});
    expect(bloomFrame(Infinity,count).ms).toBe(0);
    const samples=[0,2000,3000,5000,7000,10000,13000,15000].map(ms=>bloomFrame(ms,count).count);
    expect(samples).toEqual([...samples].sort((a,b)=>a-b));
  });
});
