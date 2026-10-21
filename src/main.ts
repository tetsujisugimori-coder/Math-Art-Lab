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
  <div id="stage"></div>
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
let params:Params={...defaults},branches=generateTree(params),time=0,playing=true,previous=0;
const syncInspector = createInspector(document.querySelector<HTMLElement>('#inspector')!,params);
const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
function selectTab(index: number) {
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
function update(){geometry.setAttribute('position',new THREE.BufferAttribute(sampleTree(branches,time,params),3));geometry.computeBoundingSphere();}
function sliders(){const root=document.querySelector<HTMLDivElement>('#sliders')!;root.replaceChildren();
for(const field of parameterFields){const label=document.createElement('label'),value=document.createElement('output'),slider=document.createElement('input');
slider.id=`param-${field.key}`;label.htmlFor=slider.id;value.htmlFor=slider.id;value.className='current-value';slider.setAttribute('aria-valuetext',`${params[field.key]} ${field.unit}`);
value.textContent=String(params[field.key]);slider.type='range';slider.min=String(field.min);slider.max=String(field.max);slider.step=String(field.step);slider.value=String(params[field.key]);
slider.addEventListener('input',()=>{params[field.key]=Number(slider.value);value.textContent=slider.value;slider.setAttribute('aria-valuetext',`${slider.value} ${field.unit}`);if(['depth','angle','shrink'].includes(field.key))branches=generateTree(params);syncInspector(params);update();});
label.append(`${field.symbol} · ${field.label} (${field.unit})`,value,slider);root.append(label);}}
sliders();update();
document.querySelector<HTMLButtonElement>('#pause')!.onclick=(e)=>{playing=!playing;(e.currentTarget as HTMLButtonElement).textContent=playing?'一時停止':'再開';(e.currentTarget as HTMLButtonElement).setAttribute('aria-pressed',String(!playing));};
document.querySelector<HTMLButtonElement>('#reset')!.onclick=()=>{params={...defaults};branches=generateTree(params);time=0;sliders();syncInspector(params);update();};
let dragging=false,lastX=0,lastY=0;
renderer.domElement.onpointerdown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
renderer.domElement.onpointerup=()=>{dragging=false;};
renderer.domElement.onpointercancel=()=>{dragging=false;};
renderer.domElement.onpointermove=e=>{if(!dragging)return;tree.rotation.y+=(e.clientX-lastX)*.008;tree.rotation.x+=(e.clientY-lastY)*.008;lastX=e.clientX;lastY=e.clientY;};
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=THREE.MathUtils.clamp(camera.position.z+e.deltaY*.01,4,20);},{passive:false});
new ResizeObserver(()=>{const{width,height}=stage.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}).observe(stage);
renderer.setAnimationLoop(now=>{if(previous&&playing){time+=Math.min((now-previous)/1000,.05);update();}previous=now;renderer.render(scene,camera);});
