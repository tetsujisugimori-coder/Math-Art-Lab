import {describe,it,expect} from 'vitest';
import {demand,supply,equilibrium,initialPoint,nextStep,preset,stability,stopReason,tracePoint,validMarket} from './cobweb';

describe('one-period cobweb market',()=>{
  it('clears demand at the next price, after supply was set at the old price',()=>{
    const m=preset('stable'),s=nextStep(m,initialPoint(m),1);
    expect(s.from).toEqual({price:40,quantity:80});
    expect(s.supply).toEqual({price:40,quantity:26});
    expect(s.to).toEqual({price:94,quantity:26});
    expect(demand(m,s.to.price)).toBe(supply(m,s.from.price));
    expect(tracePoint(s,0.5)).toEqual(s.supply);
    expect(tracePoint(s,0)).toEqual(s.from);
    expect(tracePoint(s,1)).toEqual(s.to);
    expect(tracePoint(s,0.25).price).toBe(s.from.price);
    expect(tracePoint(s,0.75).quantity).toBe(s.to.quantity);
  });
  it.each(['stable','cycle','unstable'] as const)('%s follows the signed error multiplier −d/b',id=>{
    const m=preset(id),e=equilibrium(m);let point=initialPoint(m);
    expect(demand(m,e.price)).toBeCloseTo(supply(m,e.price),12);
    for(let t=1;t<=8;t++){
      const step=nextStep(m,point,t);
      expect(step.to.price-e.price).toBeCloseTo(-m.d/m.b*(point.price-e.price),10);
      point=step.to;
    }
  });
  it('converges and keeps the exact equilibrium fixed',()=>{
    const m=preset('stable'),e=equilibrium(m);let p=initialPoint(m);
    for(let i=1;i<=60;i++)p=nextStep(m,p,i).to;
    expect(p.price).toBeCloseTo(e.price,8);
    expect(nextStep(m,e,1).to.price).toBeCloseTo(e.price,12);
    expect(stability(m)).toBe('convergent');
  });
  it('has an exact two-cycle at d=b; the equilibrium is the fixed-point exception',()=>{
    const m=preset('cycle'),p=initialPoint(m),one=nextStep(m,p,1);
    expect(one.to.price).toBe(80);
    expect(nextStep(m,one.to,2).to).toEqual(p);
    expect(stability(m)).toBe('cycle');
  });
  it('diverges until a negative next price is reported, without changing the last valid point',()=>{
    const m=preset('unstable');let p=initialPoint(m),t=1;
    for(;t<=240;t++){
      const s=nextStep(m,p,t);
      if(stopReason(m,s)){expect(s.to.price).toBeLessThan(0);expect(p.price).toBeGreaterThanOrEqual(0);break;}
      p=s.to;
    }
    expect(t).toBeLessThan(30);expect(stability(m)).toBe('divergent');
  });
  it('validates finite parameters and the initial demand point including boundary values',()=>{
    const m=preset('stable');
    for(const price of [0,120])expect(validMarket({...m,initialPrice:price})).toBe(true);
    for(const update of [{b:0},{d:NaN},{initialPrice:Infinity},{initialPrice:-1},{b:2,initialPrice:61},{a:121}])expect(validMarket({...m,...update})).toBe(false);
    expect(stopReason(m,nextStep(m,initialPoint(m),241))).toContain('240期');
    expect(stopReason(m,nextStep(m,initialPoint(m),1))).toBeNull();
  });
});
