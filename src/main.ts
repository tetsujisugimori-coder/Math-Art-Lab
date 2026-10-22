import { createVisualOverlay } from './visual-overlay';
import type { VisualId } from './visual-model';
import * as THREE from 'three';
import{defaults,generateTree,sampleTree,type Params}from'./fractal';
import { createInspector } from './inspector';
import { parameterFields } from './structures';
import'./style.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`
<main>
 <header><small>MATH ART LAB / EXPERIMENT 001</small><h1>Fractal × Wave</h1><p>枝分かれする構造を、根から枝先へ伝わる波で変形する。</p></header>
 <section class="workspace">
  <div class="stage-column"><div id="stage" tabindex="0" role="region" aria-label="作品と数式の補助図。ドラッグで回転"></div><div class="view-actions"><button id="rotate">奥行きを回転</button><button id="zoom-in">拡大</button><button id="zoom-out">縮小</button></div></div>
  <aside aria-label="作品の設定と数理構造">
   <div role="tablist" aria-label="表示内容">
    <button id="tab-parameters" role="tab" aria-selected="true" aria-controls="panel-parameters">パラメータ</button>
    <button id="tab-structures" role="tab" aria-selected="false" aria-controls="panel-structures" tabindex="-1">数式・構造</button>
   </div>
   <div class="actions"><button id="pause" aria-pressed="false">一時停止</button><button id="reset">初期値へ</button></div>
   <div id="panel-parameters" role="tabpanel" aria-labelledby="tab-parameters"><h2>パラメータ</h2><div id="sliders"></div></div>
   <div id="panel-structures" role="tabpanel" aria-labelledby="tab-structures" hidden><h2>数式・構造</h2><div id="inspector"></div></div>
   <p>ドラッグで回転、ホイールで拡大縮小。</p>
  </aside>
 </section>
 <footer>数理構造と描画処理を分離した最初の実験。</footer>
</main>`;
const stage=document.querySelector<HTMLDivElement>('#stage')!;
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#080d1c');
const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.z=9;
const geometry=new THREE.BufferGeometry();
const tree=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x7dd3fc}));
scene.add(tree);
let params:Params={...defaults},branches=generateTree(params),time=0,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,previous=0;
let selectedVisual:VisualId|null=null;
const updateOverlay=createVisualOverlay(tree,stage,()=>clearVisual(true));
function clearVisual(restoreFocus:boolean){
 // Capture before selectVisual removes the selection and hides the focused panel.
 const button=restoreFocus?document.querySelector<HTMLButtonElement>('.formula.is-selected .visual-toggle'):null;
 selectVisual(null);
 if(button?.isConnected&&!button.disabled)button.focus({preventScroll:true});
}
function selectVisual(id:VisualId|null){
 selectedVisual=selectedVisual===id?null:id;
 document.querySelectorAll<HTMLElement>('[data-formula]').forEach(card=>{
  const active=card.dataset.formula===selectedVisual;card.classList.toggle('is-selected',active);
  const button=card.querySelector<HTMLButtonElement>('.visual-toggle')!;
  button.setAttribute('aria-pressed',String(active));button.textContent=active?'解説を解除':'図で見る';
  button.setAttribute('aria-label',`${card.querySelector('h4')!.textContent}：${button.textContent}`);
  card.querySelector<HTMLButtonElement>('.visual-jump')!.hidden=!active;
 });
 updateOverlay(selectedVisual,branches,params,time);
}
const syncInspector = createInspector(document.querySelector<HTMLElement>('#inspector')!,params,id=>selectVisual(id));
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&selectedVisual)clearVisual(!!document.activeElement?.closest('.visual-caption'));});
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
function selectTab(index: number) {
 if(index===0&&selectedVisual)selectVisual(null);
 tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;document.getElementById(tab.getAttribute('aria-controls')!)!.hidden=i!==index;});
}
tabs.forEach((tab,i)=>{
 tab.addEventListener('click',()=>selectTab(i));
 tab.addEventListener('keydown',e=>{
  let next:number;
  if(e.key==='ArrowRight'||e.key==='ArrowLeft')next=1-i;
  else if(e.key==='Home')next=0;
  else if(e.key==='End')next=tabs.length-1;
  else return;
  e.preventDefault();selectTab(next);tabs[next].focus();
 });
});
function update(){geometry.setAttribute('position',new THREE.BufferAttribute(sampleTree(branches,time,params),3));geometry.computeBoundingSphere();if(selectedVisual)updateOverlay(selectedVisual,branches,params,time);}
function sliders(){const root=document.querySelector<HTMLDivElement>('#sliders')!;root.replaceChildren();
for(const field of parameterFields){const label=document.createElement('label'),value=document.createElement('output'),slider=document.createElement('input');
slider.id=`param-${field.key}`;label.htmlFor=slider.id;value.htmlFor=slider.id;value.className='current-value';slider.setAttribute('aria-valuetext',`${params[field.key]} ${field.unit}`);
value.textContent=String(params[field.key]);slider.type='range';slider.min=String(field.min);slider.max=String(field.max);slider.step=String(field.step);slider.value=String(params[field.key]);
slider.addEventListener('input',()=>{params[field.key]=Number(slider.value);value.textContent=slider.value;slider.setAttribute('aria-valuetext',`${slider.value} ${field.unit}`);if(['depth','angle','shrink'].includes(field.key))branches=generateTree(params);syncInspector(params);update();});
label.append(`${field.symbol} · ${field.label} (${field.unit})`,value,slider);root.append(label);}}
sliders();update();
const pauseButton=document.querySelector<HTMLButtonElement>('#pause')!;
pauseButton.textContent=playing?'一時停止':'再開';pauseButton.setAttribute('aria-pressed',String(!playing));
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',e=>{if(e.matches){playing=false;pauseButton.textContent='再開';pauseButton.setAttribute('aria-pressed','true');}});
document.querySelector<HTMLButtonElement>('#pause')!.onclick=(e)=>{playing=!playing;(e.currentTarget as HTMLButtonElement).textContent=playing?'一時停止':'再開';(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(!playing));};
document.querySelector<HTMLButtonElement>('#reset')!.onclick=()=>{selectVisual(null);params={...defaults};branches=generateTree(params);time=0;sliders();syncInspector(params);update();};
document.querySelector<HTMLButtonElement>('#rotate')!.onclick=()=>{tree.rotation.y+=Math.PI/6;};
document.querySelector<HTMLButtonElement>('#zoom-in')!.onclick=()=>{camera.position.z=THREE.MathUtils.clamp(camera.position.z-1,4,20);};
document.querySelector<HTMLButtonElement>('#zoom-out')!.onclick=()=>{camera.position.z=THREE.MathUtils.clamp(camera.position.z+1,4,20);};
let dragging=false,lastX=0,lastY=0;
renderer.domElement.onpointerdown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
renderer.domElement.onpointerup=()=>{dragging=false;};
renderer.domElement.onpointercancel=()=>{dragging=false;};
renderer.domElement.onpointermove=e=>{if(!dragging)return;tree.rotation.y+=(e.clientX-lastX)*.008;tree.rotation.x+=(e.clientY-lastY)*.008;lastX=e.clientX;lastY=e.clientY;};
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=THREE.MathUtils.clamp(camera.position.z+e.deltaY*.01,4,20);},{passive:false});
new ResizeObserver(()=>{const{width,height}=stage.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}).observe(stage);
renderer.setAnimationLoop(now=>{if(previous&&playing){time+=Math.min((now-previous)/1000,.05);update();}previous=now;renderer.render(scene,camera);});
