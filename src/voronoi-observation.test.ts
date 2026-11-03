import {expect,it} from 'vitest';
import {observe,type Site} from './voronoi';
const pair:Site[]=[{id:1,x:.25,y:.5},{id:2,x:.75,y:.5}];
it.each([
 ['boundary',.5,[1,2],[1,2]],
 ['right inside display tolerance',.5000000000001,[2],[1,2]],
 ['left inside display tolerance',.4999999999999,[1],[1,2]],
 ['right outside display tolerance',.500000000001,[2],[2]],
 ['just inside display grouping threshold',.50000000000049,[2],[1,2]],
 ['just outside display grouping threshold',.50000000000051,[2],[2]],
 ['ordinary left',.2,[1],[1]],
] as const)('%s: mathematical owners and display candidates have separate meanings',(_name,x,owners,candidates)=>{
 const result=observe(pair,{x,y:.5});
 expect(result.mathematicalOwners).toEqual(owners);expect(result.displayCandidates).toEqual(candidates);expect(result.displayOwner).toBe(candidates[0]);
});
it('three exact equidistant sites and a four-cell vertex include every mathematical owner',()=>{
 const points=[{id:8,x:.25,y:.5},{id:3,x:.75,y:.5},{id:12,x:.5,y:.75},{id:2,x:.5,y:.25}];
 expect(observe(points.slice(0,3),{x:.5,y:.5}).mathematicalOwners).toEqual([3,8,12]);
 const result=observe(points,{x:.5,y:.5});expect(result.mathematicalOwners).toEqual([2,3,8,12]);expect(result.displayOwner).toBe(2);
 expect(observe([...points].reverse(),{x:.5,y:.5})).toEqual(result);
});
it('coordinate-range edges and negative zero retain their exact geometric meaning',()=>{
 expect(observe([{id:2,x:0,y:0},{id:1,x:0,y:1}],{x:-0,y:.5}).mathematicalOwners).toEqual([1,2]);
 expect(observe(pair,{x:1,y:1}).mathematicalOwners).toEqual([2]);
 expect(observe([{id:9,x:1,y:1}],{x:0,y:0}).mathematicalOwners).toEqual([9]);
});
function nextUp(n:number){const b=new DataView(new ArrayBuffer(8));b.setFloat64(0,n);b.setBigUint64(0,b.getBigUint64(0)+1n);return b.getFloat64(0);}
it('nearby sites: rounded hypot equality does not prove a mathematical tie',()=>{
 const ps=[{id:1,x:0,y:0},{id:2,x:1.1e-6,y:0}],probe={x:nextUp(5.5e-7),y:1};
 const result=observe(ps,probe);expect(result.distances[0].distance).toBe(result.distances[1].distance);
 // x is above the midpoint, so the right-hand site is strictly closer.
 expect(result.mathematicalOwners).toEqual([2]);expect(result.displayCandidates).toEqual([1,2]);
});
it('subnormal differences do not underflow in mathematical comparison',()=>{
 const ps=[{id:1,x:0,y:1.1e-6},{id:2,x:1.1e-6,y:0}];
 // d1²-d2² = 2 * 1.1e-6 * MIN_VALUE > 0 as a real number.
 expect(observe(ps,{x:Number.MIN_VALUE,y:0}).mathematicalOwners).toEqual([2]);
 expect(observe(ps,{x:0,y:0}).mathematicalOwners).toEqual([1,2]);
});
it('the contract refers to stored coordinates, not unrecoverable decimal intent',()=>{
 const rounded=Number('0.50000000000000001');expect(rounded).toBe(.5);
 expect(observe(pair,{x:rounded,y:.5}).mathematicalOwners).toEqual([1,2]);
});
it('IDs affect only presentation priority, not which position is mathematically closest',()=>{
 const result=observe([{id:3,x:.75,y:.5},{id:7,x:.25,y:.5}],{x:.5000000000001,y:.5});
 expect(result.mathematicalOwners).toEqual([3]);expect(result.displayCandidates).toEqual([3,7]);expect(result.displayOwner).toBe(3);
});
