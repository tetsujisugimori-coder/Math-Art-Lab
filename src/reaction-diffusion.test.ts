import {describe,it,expect} from 'vitest';
import {initial,lap,terms,advance,seed,parse,valid,Generation,presets} from './reaction-diffusion';
const s={f:.03,k:.062};
describe('Gray–Scott independent small grid references',()=>{
 it('five point and self-neighbor boundary on 3x3',()=>{const a=new Float64Array([1,2,3,4,5,6,7,8,9]);expect(lap(a,3,4)).toBe(0);expect(lap(a,3,0)).toBe(4);expect(lap(a,3,8)).toBe(-4);});
 it('uniform equilibrium',()=>{const g=initial(3,false),out=advance(g,s,32);expect([...out.u]).toEqual(Array(9).fill(1));expect([...out.v]).toEqual(Array(9).fill(0));});
 it('hand calculated center impulse diffusion, mass conservation and no in-place update',()=>{const g=initial(3,false);g.u.fill(0);g.u[4]=1;const out=advance(g,s,1,'diffusion');expect([...out.u]).toEqual([0,.16,0,.16,.36,.16,0,.16,0]);expect([...g.u]).toEqual([0,0,0,0,1,0,0,0,0]);expect(out.u.reduce((a,b)=>a+b,0)).toBeCloseTo(1);});
 it('corner diffusion has two self neighbors',()=>{const g=initial(3,false);g.v[0]=1;const out=advance(g,s,1,'diffusion');expect(out.v[0]).toBeCloseTo(.84);expect(out.v[1]).toBeCloseTo(.08);expect(out.v[3]).toBeCloseTo(.08);expect(out.v[4]).toBe(0);});
 it('hand calculated full step and signed contributions',()=>{const g=initial(3,false);g.u[4]=.5;g.v[4]=.25;const t=terms(g,s,4);expect(t.du).toBe(.32);expect(t.dv).toBe(-.08);expect(t.r).toBe(.03125);expect(t.feed).toBe(.015);expect(t.loss).toBe(-.023);expect(t.nextU).toBeCloseTo(.80375);expect(t.nextV).toBeCloseTo(.17825);const out=advance(g,s,1);expect(out.u[4]).toBeCloseTo(.80375);expect(out.v[4]).toBeCloseTo(.17825);expect(out.u[1]).toBe(.92);expect(out.v[1]).toBe(.02);});
 it('reaction only independent value',()=>{const g=initial(3,false);g.u.fill(.5);g.v.fill(.25);const out=advance(g,s,1,'reaction');expect(out.u[4]).toBeCloseTo(.48375);expect(out.v[4]).toBeCloseTo(.25825);});
 it('chunking cannot change values',()=>{const g=initial(16);const a=advance(g,s,32),b=advance(advance(g,s,13),s,19);expect(a).toEqual(b);expect(a).toEqual(advance(initial(16),s,32));});
 it('seed disk overwrites and clips only its geometry',()=>{const g=initial(16,false);seed(g,0,0);expect(g.u[0]).toBe(.5);expect(g.v[3]).toBe(.25);expect(g.v[4]).toBe(0);expect(g.v[15]).toBe(0);seed(g,0,0);expect(g.v[0]).toBe(.25);expect(()=>seed(g,-1,0)).toThrow();});
 for(const raw of ['', ' ', 'NaN','Infinity','1e-999','0.001','0.09'])it(`reject candidate ${JSON.stringify(raw)}`,()=>{expect(valid({f:parse(raw),k:s.k})).toBe(false);});
 it('presets accepted, k bounds checked',()=>{for(const p of presets)expect(valid(p)).toBe(true);expect(valid({f:.03,k:.071})).toBe(false);});
 it('abnormal input/output stop without repairing or writing source',()=>{const g=initial(3,false);g.u[4]=NaN;expect(()=>advance(g,s,1)).toThrow('濃度異常');expect(g.u[4]).toBeNaN();g.u.fill(1);g.v.fill(1);expect(()=>advance(g,s,1)).toThrow('濃度異常');expect(g.v[0]).toBe(1);});
 it('bounded processing',()=>{expect(()=>advance(initial(3),s,33)).toThrow();expect(()=>advance(initial(3),s,0)).toThrow();});
 it('stale generation rejected',()=>{const gate=new Generation(),old=gate.next();expect(gate.accept(old)).toBe(true);gate.next();expect(gate.accept(old)).toBe(false);});
});
