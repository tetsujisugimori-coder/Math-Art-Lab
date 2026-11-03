import {expect,it,vi} from 'vitest';
import {submitCanvas} from './voronoi-paint';
function surface(width=100,height=100){return {width:19,height:23,getBoundingClientRect:()=>({width,height})} as HTMLCanvasElement;}
function context(lost=false){return {isContextLost:()=>lost} as CanvasRenderingContext2D;}
it.each([[0,100],[100,0],[NaN,100],[100,Infinity]])('does not touch the bitmap for an undrawable %s×%s surface',(w,h)=>{
 const c=surface(w,h),paint=vi.fn();expect(submitCanvas(c,context(),2,paint).status).toBe('zero-size');expect(paint).not.toHaveBeenCalled();expect([c.width,c.height]).toEqual([19,23]);
});
it('does not issue commands without a context',()=>{const paint=vi.fn();expect(submitCanvas(surface(),null,2,paint).status).toBe('unavailable');expect(paint).not.toHaveBeenCalled();});
it('does not claim submission for a lost context',()=>{const paint=vi.fn();expect(submitCanvas(surface(),context(true),2,paint).status).toBe('context-lost');expect(paint).not.toHaveBeenCalled();});
it('a loss during submission is not a completed frame',()=>{let lost=false;const ctx={isContextLost:()=>lost} as CanvasRenderingContext2D;expect(submitCanvas(surface(),ctx,2,()=>{lost=true;}).status).toBe('context-lost');});
it('a thrown drawing command is a failed attempt',()=>{expect(submitCanvas(surface(),context(),2,()=>{throw new Error('command failed');})).toEqual({status:'failed',reason:'command failed'});});
it('successful command submission uses current dimensions and the requested DPR',()=>{const c=surface(123.5,123.5),ctx=context(),paint=vi.fn();expect(submitCanvas(c,ctx,1.5,paint)).toEqual({status:'submitted',size:123.5,dpr:1.5});expect([c.width,c.height]).toEqual([185,185]);expect(paint).toHaveBeenCalledExactlyOnceWith(ctx,123.5,1.5);});
it('invalid DPR cannot be recorded as a successful submission',()=>{expect(submitCanvas(surface(),context(),NaN,vi.fn()).status).toBe('failed');});
