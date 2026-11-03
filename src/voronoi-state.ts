import {distance,inBounds,lloyd,preset,validateSites,voronoi,type Point,type Preset,type Site} from './voronoi';
export const EDIT_SEPARATION=.025;
export type SymbolId=''|'member'|'all'|'leq'|'norm'|'omega'|'bar'|'index'|'cell'|'centroid'|'update';
export type State={sites:Site[];initial:Site[];previous:Site[];step:number;selected:number;probe:Point;mode:'select'|'add'|'observe';preset:Preset;symbol:SymbolId;playing:boolean;maxMove:number;layers:{regions:boolean;edges:boolean;sites:boolean;centroids:boolean;vectors:boolean;distances:boolean;compare:boolean};reference:'initial'|'previous'};
export function createState(id:Preset='irregular'):State{
 const sites=preset(id);
 return {sites,initial:structuredClone(sites),previous:structuredClone(sites),step:0,selected:1,probe:{x:.5,y:.5},mode:'select',preset:id,symbol:'',playing:false,maxMove:0,layers:{regions:true,edges:true,sites:true,centroids:false,vectors:false,distances:false,compare:true},reference:'initial'};
}
export function stepState(state:State):State{
 const next=lloyd(state.sites);
 // Also verify the new partition before publishing it to the view.
 voronoi(next.sites);
 return {...state,previous:structuredClone(state.sites),sites:next.sites,step:state.step+1,maxMove:next.maxMove};
}
export function editState(state:State,action:'add'|'move'|'delete',point:Point=state.probe):State{
 let sites=structuredClone(state.sites),selected=state.selected;
 if(action!=='delete'&&!inBounds(point))throw new Error('配置可能範囲は x・y ともに0〜1です。');
 if(action==='add'){
  selected=Math.max(0,...sites.map(p=>p.id))+1;sites.push({...point,id:selected});
 }else if(action==='move'){
  const site=sites.find(p=>p.id===selected);if(!site)throw new Error('移動する点を選んでください。');Object.assign(site,point);
 }else{
  if(sites.length===1)throw new Error('最後の1点は削除できません。');
  sites=sites.filter(p=>p.id!==selected);selected=sites[0].id;
 }
 validateSites(sites);
 if(action!=='delete'&&sites.some(p=>p.id!==selected&&distance(p,sites.find(p=>p.id===selected)!)<EDIT_SEPARATION))throw new Error(`操作時の点間距離は${EDIT_SEPARATION}以上にしてください。`);
 voronoi(sites);
 return {...state,sites,selected,initial:structuredClone(sites),previous:structuredClone(sites),step:0,maxMove:0,playing:false};
}
export function resetState(state:State):State{return {...state,sites:structuredClone(state.initial),previous:structuredClone(state.initial),step:0,maxMove:0,playing:false};}
export function restoreState(saved:State,forcedStop:boolean,reducedMotion:boolean,hidden:boolean):State{
 return {...structuredClone(saved),playing:saved.playing&&!forcedStop&&!reducedMotion&&!hidden};
}
