import {it,expect} from 'vitest';
import {createState,editState,resetState,restoreState,stepState} from './voronoi-state';
import {drawVoronoi,modelPoint,screenPoint} from './voronoi-render';
import {voronoi} from './voronoi';
it('edits are atomic and reject duplicates, bounds, maximum and final-point removal',()=>{
 const s=createState('basic'),original=structuredClone(s);
 for(const point of [{x:NaN,y:.3},{x:2,y:.3},s.sites[1],{x:s.sites[1].x+.001,y:s.sites[1].y}])expect(()=>editState(s,'move',point)).toThrow();expect(s).toEqual(original);
 const one={...s,sites:[s.sites[0]]};expect(()=>editState(one,'delete')).toThrow();expect(one.sites).toHaveLength(1);
 const max={...s,sites:Array.from({length:64},(_,i)=>({id:i+1,x:(i%8+.5)/8,y:(Math.floor(i/8)+.5)/8}))};expect(()=>editState(max,'add',{x:.99,y:.99})).toThrow();expect(max.sites).toHaveLength(64);
});
it('edit establishes a new initial configuration; reset restores it after relaxation',()=>{
 const s=createState('basic'),edited=editState(s,'add',{x:.5,y:.5}),next=stepState(edited);expect(edited.selected).toBe(5);expect(edited.sites).toHaveLength(5);expect(next.previous).toEqual(edited.sites);expect(next.step).toBe(1);expect(edited.step).toBe(0);
 const reset=resetState({...next,playing:true});expect(reset.sites).toEqual(edited.sites);expect(reset.step).toBe(0);expect(reset.playing).toBe(false);expect(reset.selected).toBe(5);
});
it('deletion keeps surviving IDs stable and selects a valid point',()=>{const s=createState('basic');const next=editState(s,'delete');expect(next.sites.map(p=>p.id)).toEqual([2,3,4]);expect(next.selected).toBe(2);expect(s.sites).toHaveLength(4);});
it('lesson restoration is a deep copy including all display and selection state',()=>{
 const s=stepState(createState('basic'));s.mode='observe';s.symbol='norm';s.layers.centroids=true;s.reference='previous';s.playing=true;const original=structuredClone(s),restored=restoreState(s,false,false,false);expect(restored).toEqual(original);restored.sites[0].x=0;expect(s).toEqual(original);
});
it('safety stops suppress automatic restoration of playback',()=>{const s={...createState(),playing:true};for(const flags of [[true,false,false],[false,true,false],[false,false,true]])expect(restoreState(s,...flags as [boolean,boolean,boolean]).playing).toBe(false);expect(restoreState(s,false,false,false).playing).toBe(true);});
it('drawing and input mappings share axes and round-trip at all sizes',()=>{
 for(const size of [264,320,768,1280])for(const p of [{x:0,y:0},{x:1,y:1},{x:.25,y:.77}]){const q=screenPoint(p,size),back=modelPoint(q,size);expect(back.x).toBeCloseTo(p.x,14);expect(back.y).toBeCloseTo(p.y,14);}
 const topLeft=screenPoint({x:0,y:1},100);expect(topLeft.x).toBeCloseTo(4.5,13);expect(topLeft.y).toBeCloseTo(4.5,13);
});
it('a boundary site keeps its entire point label inside a narrow Canvas',()=>{
 const s=createState('basic');s.sites[0]={id:1,x:1,y:1};s.mode='observe';s.probe={x:1,y:1};const text:{label:string;x:number;y:number}[]=[];
 const context=new Proxy({}, {get:(_target,key)=>{
  if(key==='createLinearGradient')return ()=>({addColorStop:()=>{}});
  if(key==='measureText')return (label:string)=>({width:label.length*7});
  if(key==='fillText')return (label:string,x:number,y:number)=>text.push({label,x,y});
  return ()=>{};
 }}) as CanvasRenderingContext2D;
 drawVoronoi(context,s,voronoi(s.sites),264,1,false);
 const label=text.find(t=>t.label==='p1')!;expect(label).toBeDefined();expect(label.x).toBeGreaterThanOrEqual(3);expect(label.x+14).toBeLessThanOrEqual(261);expect(label.y).toBeGreaterThanOrEqual(12);expect(label.y).toBeLessThanOrEqual(260);
 const probe=text.find(t=>t.label==='x')!;expect(probe.x+7).toBeLessThanOrEqual(261);expect(probe.y).toBeGreaterThanOrEqual(14);expect(probe.y).toBeLessThanOrEqual(260);
});
