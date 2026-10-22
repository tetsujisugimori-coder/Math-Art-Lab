import * as THREE from 'three';
import { buildVisual, describeBranches, visualDefinitions, type VisualId } from './visual-model';
import type { Branch, Params } from './fractal';

/** Rendering adapter. Child of the tree: exactly the same rotation and camera. */
export function createVisualOverlay(tree:THREE.Object3D, stage:HTMLElement, onClear:()=>void) {
 const geometry=new THREE.BufferGeometry();
 const material=new THREE.LineBasicMaterial({vertexColors:true,depthTest:false,transparent:true,opacity:1});
 const overlay=new THREE.LineSegments(geometry,material);overlay.renderOrder=2;tree.add(overlay);overlay.visible=false;
 const panel=document.createElement('div');panel.className='visual-caption';panel.hidden=true;
 const title=document.createElement('strong'),description=document.createElement('p'),detail=document.createElement('p');
 const phase=document.createElement('meter');phase.min=0;phase.max=2*Math.PI;phase.setAttribute('aria-label','代表端点の位相（0〜2π）');
 const clear=document.createElement('button');clear.textContent='解説を解除';clear.onclick=()=>{const button=document.querySelector<HTMLElement>('.formula.is-selected .visual-toggle');onClear();button?.focus();};
 const back=document.createElement('button');back.textContent='選択中の数式へ';back.onclick=()=>document.querySelector<HTMLElement>('.formula.is-selected button')?.focus();
 const previous=document.createElement('button'),next=document.createElement('button');previous.textContent='前の世代';next.textContent='次の世代';
 let generation=0,selected:VisualId|null=null,infos:ReturnType<typeof describeBranches>=[],source:Branch[]|null=null;
 let lastParams:Params,lastTime=0,lastKey='';
 previous.onclick=()=>{generation=Math.max(0,generation-1);update(selected,source!,lastParams,lastTime);};
 next.onclick=()=>{generation=Math.min(lastParams.depth-1,generation+1);update(selected,source!,lastParams,lastTime);};
 panel.append(title,description,detail,phase,previous,next,clear,back);stage.after(panel);
 // Reuse allocations when topology stays constant; never create GPU resources per frame.
 function update(id:VisualId|null,branches:Branch[],p:Params,time:number) {
  selected=id;lastParams=p;lastTime=time;
  const key=`${id}:${generation}:${Object.values(p).join(',')}:${id&&['phase','envelope','deform-x','deform-y','deform-z'].includes(id)?time:0}`;
  if(key===lastKey&&source===branches)return;
  lastKey=key;overlay.visible=!!id;panel.hidden=!id;
  stage.dataset.visual=id??'';
  if(!id)return;
  if(source!==branches){source=branches;infos=describeBranches(branches);}
  generation=Math.min(generation,p.depth-1);
  const model=buildVisual(id,infos,p,time,generation);
  if(title.textContent!==visualDefinitions[id].title)title.textContent=visualDefinitions[id].title;
  if(description.textContent!==visualDefinitions[id].text)description.textContent=visualDefinitions[id].text;
  if(detail.textContent!==model.detail)detail.textContent=model.detail;
  phase.hidden=model.phase===undefined;if(model.phase!==undefined)phase.value=((model.phase%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
  previous.hidden=next.hidden=!['length','count'].includes(id);previous.disabled=generation===0;next.disabled=generation===p.depth-1;
  const count=model.strokes.length*6;
  if(geometry.getAttribute('position')?.array.length!==count){
   // Release old WebGL attribute buffers before replacing them; the geometry object is reusable.
   geometry.dispose();
   geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(count),3));
   geometry.setAttribute('color',new THREE.BufferAttribute(new Float32Array(count),3));
  }
  const positions=geometry.getAttribute('position') as THREE.BufferAttribute,colors=geometry.getAttribute('color') as THREE.BufferAttribute;
  const color=new THREE.Color();
  model.strokes.forEach((s,i)=>{color.setHex(s.color);positions.setXYZ(i*2,s.a.x,s.a.y,s.a.z);positions.setXYZ(i*2+1,s.b.x,s.b.y,s.b.z);colors.setXYZ(i*2,color.r,color.g,color.b);colors.setXYZ(i*2+1,color.r,color.g,color.b);});
  positions.needsUpdate=colors.needsUpdate=true;geometry.computeBoundingSphere();
 }
 return update;
}
