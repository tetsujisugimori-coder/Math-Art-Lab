import * as THREE from 'three';
import{defaults,generateTree,sampleTree,type Params}from'./fractal';
import'./style.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main><header><small>MATH ART LAB / EXPERIMENT 001</small><h1>Fractal × Wave</h1><p>枝分かれする構造を、根から枝先へ伝わる波で変形する。</p></header><section><div id="stage"></div><aside><h2>パラメータ</h2><div id="sliders"></div><button id="pause">一時停止</button><button id="reset">初期値へ</button><p>ドラッグで回転、ホイールで拡大縮小。</p></aside></section><footer>数理構造と描画処理を分離した最初の実験。</footer></main>`;
const stage=document.querySelector<HTMLDivElement>('#stage')!;
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
stage.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#080d1c');
const camera=new THREE.PerspectiveCamera(45,1,.1,100);camera.position.z=9;
const geometry=new THREE.BufferGeometry();
const tree=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x7dd3fc}));
scene.add(tree);
let params:Params={...defaults},branches=generateTree(params),time=0,playing=true,previous=0;
function update(){geometry.setAttribute('position',new THREE.BufferAttribute(sampleTree(branches,time,params),3));geometry.computeBoundingSphere();}
const config:{key:keyof Params;label:string;min:number;max:number;step:number}[]=[
{key:'depth',label:'分岐の深さ',min:2,max:10,step:1},
{key:'angle',label:'分岐角',min:.1,max:1.1,step:.01},
{key:'shrink',label:'縮小率',min:.5,max:.82,step:.01},
{key:'amplitude',label:'振幅',min:0,max:.8,step:.01},
{key:'wavelength',label:'波長',min:1,max:10,step:.1},
{key:'speed',label:'速度',min:0,max:4,step:.1}];
function sliders(){const root=document.querySelector<HTMLDivElement>('#sliders')!;root.replaceChildren();
for(const field of config){const label=document.createElement('label'),value=document.createElement('output'),slider=document.createElement('input');
value.textContent=String(params[field.key]);slider.type='range';slider.min=String(field.min);slider.max=String(field.max);slider.step=String(field.step);slider.value=String(params[field.key]);
slider.addEventListener('input',()=>{params[field.key]=Number(slider.value);value.textContent=slider.value;if(['depth','angle','shrink'].includes(field.key))branches=generateTree(params);update();});
label.append(field.label,value,slider);root.append(label);}}
sliders();update();
document.querySelector<HTMLButtonElement>('#pause')!.onclick=(e)=>{playing=!playing;(e.currentTarget as HTMLButtonElement).textContent=playing?'一時停止':'再開';};
document.querySelector<HTMLButtonElement>('#reset')!.onclick=()=>{params={...defaults};branches=generateTree(params);time=0;sliders();update();};
let dragging=false,lastX=0,lastY=0;
renderer.domElement.onpointerdown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);};
renderer.domElement.onpointerup=()=>{dragging=false;};
renderer.domElement.onpointermove=e=>{if(!dragging)return;tree.rotation.y+=(e.clientX-lastX)*.008;tree.rotation.x+=(e.clientY-lastY)*.008;lastX=e.clientX;lastY=e.clientY;};
renderer.domElement.addEventListener('wheel',e=>{e.preventDefault();camera.position.z=THREE.MathUtils.clamp(camera.position.z+e.deltaY*.01,4,20);},{passive:false});
new ResizeObserver(()=>{const{width,height}=stage.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);}).observe(stage);
renderer.setAnimationLoop(now=>{if(previous&&playing){time+=Math.min((now-previous)/1000,.05);update();}previous=now;renderer.render(scene,camera);});
