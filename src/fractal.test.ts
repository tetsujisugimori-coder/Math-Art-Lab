import{describe,it,expect}from'vitest';
import{defaults,deform,generateTree,sampleTree}from'./fractal';
describe('Fractal × Wave',()=>{
it('generates exactly 2^depth - 1 branches',()=>{for(let depth=1;depth<=8;depth++)expect(generateTree({...defaults,depth})).toHaveLength(2**depth-1);});
it('preserves shared vertices',()=>{const branches=generateTree({...defaults,depth:5});const data=sampleTree(branches,2,defaults);
branches.forEach((parent,i)=>branches.forEach((child,j)=>{if(parent.end===child.start)expect([...data.slice(i*6+3,i*6+6)]).toEqual([...data.slice(j*6,j*6+3)]);}));});
it('is identity at zero amplitude and returns finite points',()=>{const p={x:1,y:2,z:3};expect(deform(p,1,2,{...defaults,amplitude:0})).toEqual(p);expect([...sampleTree(generateTree(defaults),4,defaults)].every(Number.isFinite)).toBe(true);});
});
