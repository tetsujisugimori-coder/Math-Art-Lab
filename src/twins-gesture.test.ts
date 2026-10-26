import {expect,it} from 'vitest';
import {TwinsGesture} from './twins-gesture';
import {twinsDefaults,validateTwins,type PlaneView} from './twins';

const bounds={left:10.25,top:20.5,width:500.5,height:400.4};
const initial=():PlaneView=>({center:{re:0,im:0},span:4});

it('accepts both components at ±4, rejecting immediately adjacent out-of-range values',()=>{
 for(const re of [-4,4])for(const im of [-4,4])expect(()=>validateTwins({...twinsDefaults(),c:{re,im}})).not.toThrow();
 for(const value of [-4-4*Number.EPSILON,4+4*Number.EPSILON])for(const c of [{re:value,im:0},{re:0,im:value}])expect(()=>validateTwins({...twinsDefaults(),c})).toThrow('−4〜4');
});

it('distinguishes tap, drag, canceled tap and an up with no preceding move',()=>{
 const g=new TwinsGesture(),view=initial(),p={x:100,y:100};
 g.down(1,p,view,bounds);expect(g.move(1,{x:103,y:100},bounds)).toBeNull();expect(g.end(1,p,view,bounds,true)).toEqual(p);
 g.down(2,p,view,bounds);const moved=g.move(2,{x:120,y:110},bounds)!;
 expect(moved.center.re).toBeCloseTo(-80/500.5,14);expect(moved.center.im).toBeCloseTo(40/500.5,14);expect(g.end(2,{x:120,y:110},moved,bounds,true)).toBeNull();
 g.down(3,p,view,bounds);expect(g.end(3,p,view,bounds,false)).toBeNull();
 g.down(4,p,view,bounds);expect(g.end(4,{x:130,y:100},view,bounds,true)).toBeNull();
});

for(const removed of [1,2])for(const allowTap of [true,false])it(`rebases survivor after removing ID ${removed}, allowTap=${allowTap}`,()=>{
 const g=new TwinsGesture(),view=initial();g.down(1,{x:100,y:100},view,bounds);g.down(2,{x:200,y:100},view,bounds);
 const pinched=g.move(2,{x:300,y:100},bounds)!;expect(pinched.span).toBe(2);
 const survivor=removed===1?2:1,x=survivor===1?100:300;
 expect(g.end(removed,{x:removed===1?100:300,y:100},pinched,bounds,allowTap)).toBeNull();
 expect(g.end(removed,{x:0,y:0},pinched,bounds,false)).toBeNull(); // duplicate lostcapture
 expect(g.move(survivor,{x,y:100},bounds)).toEqual(pinched); // no coordinate jump
 const moved=g.move(survivor,{x:x+2,y:103},bounds)!; // no new drag threshold after pinch
 expect(moved.center.re).toBeCloseTo(pinched.center.re-4/500.5,14);expect(moved.center.im).toBeCloseTo(pinched.center.im+6/500.5,14);
 expect(g.end(survivor,{x:x+2,y:103},moved,bounds,true)).toBeNull();
 g.down(9,{x:50,y:50},view,bounds);expect(g.end(9,{x:50,y:50},view,bounds,true)).toEqual({x:50,y:50});
});

it('uses the accepted view after a rejected pinch, resets and ignores unknown IDs',()=>{
 const g=new TwinsGesture(),view=initial();expect(g.move(99,{x:0,y:0},bounds)).toBeNull();
 g.down(1,{x:100,y:100},view,bounds);g.down(2,{x:200,y:100},view,bounds);
 g.move(2,{x:101,y:100},bounds); // Candidate span=400 is rejected by the caller; current view is unchanged.
 g.end(2,{x:101,y:100},view,bounds,false);
 expect(g.move(1,{x:100,y:100},bounds)).toEqual(view);
 g.reset();expect(g.move(1,{x:120,y:100},bounds)).toBeNull();expect(g.end(1,{x:120,y:100},view,bounds,true)).toBeNull();
});

it('rebases the remaining pair when a third pointer leaves',()=>{
 const g=new TwinsGesture(),view=initial();g.down(1,{x:100,y:100},view,bounds);g.down(2,{x:200,y:100},view,bounds);g.down(3,{x:300,y:100},view,bounds);
 g.end(1,{x:100,y:100},view,bounds,false);expect(g.move(3,{x:300,y:100},bounds)).toEqual(view);
 expect(g.move(3,{x:400,y:100},bounds)!.span).toBe(2);
});
