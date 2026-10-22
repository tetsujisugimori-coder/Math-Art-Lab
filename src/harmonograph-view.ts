import * as THREE from 'three';
import {advancePlayback,axes,presets,restartPlayback,resetProgress,sampleHarmonograph,shapeFields,visibleCount,type Axis,type Playback} from './harmonograph';
import {createHarmonographInspector} from './harmonograph-inspector';
import {createHarmonographGuide} from './harmonograph-guide';

export function mountHarmonograph(root:HTMLElement):()=>void{
 const lifecycle=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 root.innerHTML=`<main class="harmonograph"><header><small>MATH ART LAB / EXPERIMENT 002</small><h1>光のハーモノグラフ</h1><p>光の糸で、空中に花を織っていく。</p></header><section class="workspace"><div class="stage-column"><div id="harm-stage" tabindex="0" role="region" aria-label="光の軌跡。ドラッグで回転"><span class="stage-kicker">LIGHT / HARMONOGRAPH</span></div><div class="view-actions"><button id="harm-rotate">斜めから見る</button><button id="harm-view-reset">視点を戻す</button><button id="harm-zoom-in">拡大</button><button id="harm-zoom-out">縮小</button></div><p class="stage-hint">図形の中をドラッグ・タッチで回転。ページのスクロールは図形の外で。</p></div><aside aria-label="光のハーモノグラフの操作"><label for="harm-preset">光のかたち<select id="harm-preset"></select></label><p id="harm-preset-description"></p><div class="actions"><button id="harm-play">一時停止</button><button id="harm-restart">最初から描き直す</button><button id="harm-complete">完成形を表示</button></div><progress id="harm-progress" aria-label="描画の進み具合"></progress><output id="harm-progress-text"></output><p id="harm-status" role="status"></p><label for="harm-rate">再生速度 <output id="harm-rate-value">6</output><input id="harm-rate" type="range" min="1" max="12" step=".5" value="6"></label><p class="control-note">作品内の秒 / 実時間の秒。線を描く速さだけが変わります。</p><details id="harm-shape"><summary>かたちを調整</summary><div id="harm-sliders"></div><button id="harm-defaults">設定を初期値へ</button><p class="control-note">設定を変えると描き始めに戻ります。停止中は停止を、完成形表示中は完成形を保ちます。</p></details><details id="harm-math"><summary>数式と図の対応</summary><div id="harm-inspector"></div></details></aside></section><footer>6つの減衰する正弦波から生まれる、有限の光の軌跡。</footer></main>`;
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const stage=$('#harm-stage'),presetControl=$<HTMLSelectElement>('#harm-preset'),play=$<HTMLButtonElement>('#harm-play'),progress=$<HTMLProgressElement>('#harm-progress');
 let presetId=presets[0].id,shape={...presets[0].shape},trajectory=sampleHarmonograph(presetId,shape),rate=6;
 let state:Playback={time:motion.matches?shape.duration:0,mode:motion.matches?'complete':'drawing'};
 let selected:Axis|null=null,disposed=false,raf:number|null=null,previous:number|null=null,zoom=1;
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));stage.prepend(renderer.domElement);
 const scene=new THREE.Scene();scene.background=new THREE.Color('#040712');
 const camera=new THREE.PerspectiveCamera(40,1,.1,100),pivot=new THREE.Group(),group=new THREE.Group();scene.add(pivot);pivot.add(group);pivot.rotation.set(.22,-.45,-.12);
 const line=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.52,blending:THREE.AdditiveBlending,depthWrite:false}));
 const tail=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.6,blending:THREE.AdditiveBlending,depthWrite:false}));group.add(line,tail);
 const tipGeometry=new THREE.BufferGeometry();tipGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(3),3));
 const tip=new THREE.Points(tipGeometry,new THREE.PointsMaterial({color:0xf3fbff,size:.06,depthTest:false}));group.add(tip);
 const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const context=glowCanvas.getContext('2d')!;
 const gradient=context.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(220,249,255,.9)');gradient.addColorStop(.15,'rgba(120,215,255,.5)');gradient.addColorStop(1,'rgba(30,90,255,0)');context.fillStyle=gradient;context.fillRect(0,0,64,64);
 const glowTexture=new THREE.CanvasTexture(glowCanvas),glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}));glow.scale.setScalar(.35);group.add(glow);
 const inspector=createHarmonographInspector($('#harm-inspector'),axis=>selectAxis(selected===axis?null:axis));
 const guide=createHarmonographGuide(group,stage,()=>clearGuide(true),()=>inspector.selectedButton()?.focus());
 function selectAxis(axis:Axis|null){selected=axis;inspector.select(axis);guide.set(axis,trajectory);invalidate();}
 function clearGuide(restoreFocus:boolean){const button=restoreFocus?inspector.selectedButton():undefined;selectAxis(null);button?.focus({preventScroll:true});}
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&selected)clearGuide(guide.panel.contains(document.activeElement));},{signal:lifecycle.signal});
 $('#harm-math').addEventListener('toggle',()=>{if(!($<HTMLDetailsElement>('#harm-math')).open)selectAxis(null);},{signal:lifecycle.signal});
 for(const preset of presets){const option=document.createElement('option');option.value=preset.id;option.textContent=preset.name;presetControl.append(option);}
 const controls=shapeFields.map(field=>{
  const label=document.createElement('label'),value=document.createElement('output'),slider=document.createElement('input');slider.id=`harm-${field.key}`;slider.type='range';slider.min=String(field.min);slider.max=String(field.max);slider.step=String(field.step);label.htmlFor=slider.id;value.htmlFor=slider.id;
  slider.oninput=()=>{const next=slider.valueAsNumber;if(!Number.isFinite(next)||next<field.min||next>field.max){slider.value=String(shape[field.key]);return;}shape={...shape,[field.key]:next};updateShape();};
  label.append(`${field.label}（${field.unit}）`,value,slider);$('#harm-sliders').append(label);return{field,value,slider};
 });
 function syncControls(){
  const complete=state.mode==='complete';play.disabled=complete;play.textContent=complete?'描画完了':state.mode==='drawing'?'一時停止':'再開';play.setAttribute('aria-pressed',String(state.mode!=='drawing'));
  $('#harm-status').textContent=complete?'完成形を表示しています。回して眺められます。':state.mode==='paused'?'一時停止中。軌跡と位置を保持しています。':'光の糸を描いています。';stage.dataset.playback=state.mode;
 }
 function fitCamera(){
  const width=stage.clientWidth,height=stage.clientHeight;if(!width||!height)return;
  camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setSize(width,height,false);
  const sphere=line.geometry.boundingSphere;const radius=Math.max(1,sphere?.radius??2.5);
  camera.position.set(0,0,radius/Math.sin(Math.atan(Math.tan(THREE.MathUtils.degToRad(20))*Math.min(1,camera.aspect)))*1.06*zoom);camera.lookAt(0,0,0);invalidate();
 }
 function updateShape(){
  trajectory=sampleHarmonograph(presetId,shape);state=resetProgress(state,shape.duration,motion.matches);previous=null;
  const positions=new THREE.BufferAttribute(trajectory.positions,3),colors=new Float32Array(trajectory.count*3),palette=['#1b6bf2','#36d8ef','#d4f4ff','#eebd76','#ffce82'].map(c=>new THREE.Color(c));
  const color=new THREE.Color();for(let i=0;i<trajectory.count;i++){const s=i/(trajectory.count-1)*(palette.length-1),a=Math.min(palette.length-2,Math.floor(s));color.copy(palette[a]).lerp(palette[a+1],s-a);colors.set([color.r,color.g,color.b],i*3);}
  line.geometry.dispose();tail.geometry.dispose();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',positions);geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));geometry.computeBoundingSphere();line.geometry=geometry;tail.geometry=geometry.clone();group.position.copy(geometry.boundingSphere!.center).negate();
  presetControl.value=presetId;$('#harm-preset-description').textContent=presets.find(p=>p.id===presetId)!.description;
  for(const control of controls){control.slider.value=String(shape[control.field.key]);control.value.textContent=String(shape[control.field.key]);}
  progress.max=shape.duration;inspector.sync(trajectory);guide.set(selected,trajectory);syncControls();fitCamera();invalidate();
 }
 presetControl.onchange=()=>{presetId=presetControl.value;shape={...presets.find(p=>p.id===presetId)!.shape};updateShape();};
 play.onclick=()=>{state={...state,mode:state.mode==='drawing'?'paused':'drawing'};previous=null;syncControls();invalidate();};
 $('#harm-restart').onclick=()=>{state=restartPlayback(state,motion.matches);previous=null;syncControls();invalidate();};
 $('#harm-complete').onclick=()=>{state={time:shape.duration,mode:'complete'};previous=null;syncControls();invalidate();};
 $('#harm-defaults').onclick=()=>{presetId=presets[0].id;shape={...presets[0].shape};rate=6;$<HTMLInputElement>('#harm-rate').value='6';$('#harm-rate-value').textContent='6';updateShape();};
 $<HTMLInputElement>('#harm-rate').oninput=()=>{rate=$<HTMLInputElement>('#harm-rate').valueAsNumber;$('#harm-rate-value').textContent=String(rate);};
 $('#harm-rotate').onclick=()=>{pivot.rotation.y+=Math.PI/6;invalidate();};
 $('#harm-view-reset').onclick=()=>{pivot.rotation.set(.22,-.45,-.12);zoom=1;fitCamera();};
 $('#harm-zoom-in').onclick=()=>{zoom=Math.max(.6,zoom-.1);fitCamera();};$('#harm-zoom-out').onclick=()=>{zoom=Math.min(1.8,zoom+.1);fitCamera();};
 let dragging=false,lastX=0,lastY=0;
 renderer.domElement.onpointerdown=event=>{dragging=true;lastX=event.clientX;lastY=event.clientY;renderer.domElement.setPointerCapture(event.pointerId);};
 renderer.domElement.onpointerup=renderer.domElement.onpointercancel=()=>{dragging=false;};
 renderer.domElement.onpointermove=event=>{if(!dragging)return;pivot.rotation.y+=(event.clientX-lastX)*.008;pivot.rotation.x+=(event.clientY-lastY)*.008;lastX=event.clientX;lastY=event.clientY;invalidate();};
 renderer.domElement.addEventListener('wheel',event=>{event.preventDefault();zoom=THREE.MathUtils.clamp(zoom+event.deltaY*.001,.6,1.8);fitCamera();},{passive:false,signal:lifecycle.signal});
 document.addEventListener('visibilitychange',()=>{previous=null;if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}else invalidate();},{signal:lifecycle.signal});
 motion.addEventListener('change',event=>{if(event.matches){state={time:shape.duration,mode:'complete'};previous=null;syncControls();invalidate();}},{signal:lifecycle.signal});
 const resize=new ResizeObserver(fitCamera);resize.observe(stage);
 function invalidate(){if(!disposed&&!document.hidden&&raf===null)raf=requestAnimationFrame(frame);}
 function frame(now:number){
  raf=null;if(disposed||document.hidden){previous=null;return;}
  const oldMode=state.mode;if(previous!==null)state=advancePlayback(state,Math.min((now-previous)/1000,.1),rate,shape.duration);previous=now;
  const count=visibleCount(trajectory,state),index=count-1;line.geometry.setDrawRange(0,count);tail.geometry.setDrawRange(Math.max(0,count-90),Math.min(count,90));
  const point=trajectory.positions.subarray(index*3,index*3+3);(tipGeometry.getAttribute('position') as THREE.BufferAttribute).setXYZ(0,point[0],point[1],point[2]);tipGeometry.getAttribute('position').needsUpdate=true;tipGeometry.computeBoundingSphere();glow.position.set(point[0],point[1],point[2]);
  progress.value=state.time;$('#harm-progress-text').textContent=`${(state.time/shape.duration*100).toFixed(1)}% · t=${(index/(trajectory.count-1)*shape.duration).toFixed(2)} / ${shape.duration} s`;
  if(oldMode!==state.mode)syncControls();pivot.updateMatrixWorld(true);guide.update(index,camera);renderer.render(scene,camera);
  if(state.mode==='drawing')invalidate();
 }
 updateShape();
 return()=>{
  disposed=true;if(raf!==null)cancelAnimationFrame(raf);resize.disconnect();inspector.dispose();lifecycle.abort();
  scene.traverse(object=>{const drawable=object as THREE.Mesh;drawable.geometry?.dispose();if(drawable.material)for(const material of Array.isArray(drawable.material)?drawable.material:[drawable.material])material.dispose();});
  glowTexture.dispose();renderer.dispose();renderer.forceContextLoss();root.replaceChildren();
 };
}
