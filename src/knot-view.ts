import * as THREE from 'three';
import {advanceKnot,knotDefaults,knotGuides,knotPoint,knotPresets,reshapeKnot,restartKnot,sampleKnot,TAU,validateKnot,type KnotGuide,type KnotPlayback,type KnotSettings} from './knot';
import {KNOT_SIDES,knotTorus,knotTube} from './knot-geometry';
import {createKnotInspector} from './knot-inspector';
import {createKnotGuide} from './knot-guide';

const lessons=[
 ['tと周回','tは曲線のどこを見るかを決める媒介変数です（秒そのものではありません）。下の位置スライダーで止めて確かめられます。sinとcosは−1〜1を繰り返し、同じ角度の組が円の周回を表します。','major'],
 ['二つの回転','同じtからptとqtを同時に計算します。中央の円のCを回しながら、Cを中心とする断面の円でPを動かすと、一本の空間曲線になります。','minor'],
 ['閉じる一本の線','p・qが整数ならt=0と2πの位置が一致します。互いに素とは共通の約数が1だけであること。同じ経路を繰り返しなぞらないため、この作品ではこの条件も必要です。pまたはqが1なら、ほどくと輪になる自明な結び目です。','p'],
 ['投影と交差','画面で重なって見える部分も、空間では前後に離れています。回転して前後を比べ、補助トーラスも試してください。線を切ったり、交差点で接合したりはしていません。','r'],
] as const;
const fmt=(n:number)=>Number(n.toFixed(4)).toString();

export function mountKnot(root:HTMLElement):()=>void{
 const lifecycle=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 root.innerHTML=`<main class="knot"><header><small>MATH ART LAB / EXPERIMENT 004</small><h1>光の結び目</h1><p>二つの周回が、一本の光を結ぶ。</p></header><section class="workspace"><div class="stage-column"><div id="knot-stage" tabindex="0" role="region" aria-label="光の結び目。ドラッグ・矢印キーで回転"><span class="stage-kicker">LUMINOUS / TORUS KNOT</span></div><div class="view-actions"><button id="knot-turn">左右に回す</button><button id="knot-tilt">上下に回す</button><button id="knot-view-reset">視点を戻す</button></div><p class="stage-hint">図の中をドラッグ・タッチ、または図にフォーカスして矢印キーで回転。ページのスクロールは図の外で。</p><div id="knot-guide-panel" class="knot-caption" hidden><strong id="knot-guide-title"></strong><p id="knot-guide-description"></p><output id="knot-guide-values"></output><div class="actions"><button id="knot-guide-clear">解説を解除</button><button id="knot-back">選択中の数式へ</button></div></div></div><aside aria-label="光の結び目の操作"><label for="knot-preset">結び目の種類<select id="knot-preset"></select></label><p id="knot-preset-description"></p><div class="actions"><button id="knot-play">一時停止</button><button id="knot-restart">最初から描き直す</button><button id="knot-complete">完成形を表示</button></div><label for="knot-position">曲線上の位置 t（0〜2π rad）<input id="knot-position" type="range" min="0" max="1" step=".001" value="0"></label><output id="knot-current"></output><p class="control-note">位置を操作すると停止します。描き直しは設定を保ち、停止中なら停止、完成形からなら再生します。</p><label for="knot-rate">描画速度（rad/秒）<output id="knot-rate-value">0.4</output><input id="knot-rate" type="range" min=".1" max="2" step=".1" value=".4"></label><p class="control-note">tが進む速さです。p・qや線の精度は変えません。</p><details id="knot-shape"><summary>かたちを調整</summary><form id="knot-form"><div id="knot-fields"></div><button type="submit">設定を適用</button><p id="knot-error" role="status" hidden></p></form><button id="knot-defaults">設定を初期値へ</button><p class="control-note">Rは断面の中心までの距離、rは断面の半径。表示精度のためR−rは0.1以上にしてください。光の線自体の太さとは別です。適用すると描き始めへ戻ります。停止中は停止、完成形なら完成を保ちます。</p></details><label class="knot-check"><input id="knot-torus" type="checkbox">補助トーラスを表示</label><p class="control-note">曲線の中心線はこの表面を通ります。光の管には見やすさのため細い厚みがあります。</p><label for="knot-quality">発光の表示<select id="knot-quality"><option value="glow">控えめな光の縁</option><option value="line">線のみ（軽量）</option></select></label><details id="knot-math"><summary>数式と図の対応・4段階の解説</summary><p>0 ≤ t ≤ 2π。すべての座標は同じtで決まります。表示値は約値、計算は丸め前の値です。</p><div id="knot-lessons" class="knot-steps" role="group" aria-label="結び目の解説段階"></div><p id="knot-lesson-text"></p><div id="knot-inspector"></div><button id="knot-jump">図形を確認</button><p id="knot-sampling"></p><p>表示は数式から求めた有限個の標本をつなぎます。回転数の変更は結び目の種類を、Rとrは同じ種類の形を変えます。</p></details></aside></section><footer>一本の曲線、二つの周回。補助表示も同じ数式と座標系を使います。</footer></main>`;
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const stage=$('#knot-stage'),math=$<HTMLDetailsElement>('#knot-math'),panel=$('#knot-guide-panel');
 let settings={...knotDefaults},sample=sampleKnot(settings),state:KnotPlayback={t:motion.matches?TAU:0,mode:motion.matches?'complete':'drawing'},rate=.4;
 let selected:KnotGuide|null=null,lessonIndex:number|null=null,disposed=false,raf:number|null=null,previous:number|null=null,width=0,height=0;
 let resizeTimer:ReturnType<typeof setTimeout>|undefined;
 function makeRenderer(){const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setClearColor('#040915');stage.prepend(renderer.domElement);return renderer;}
 let renderer:THREE.WebGLRenderer;
 try{renderer=makeRenderer();}catch{root.innerHTML='<main class="knot"><h1>光の結び目</h1><p>この環境ではWebGL2の描画を開始できませんでした。対応ブラウザで開くか、上の作品選択へ戻ってください。</p><p>x=(R+r cos(qt))cos(pt)、y=(R+r cos(qt))sin(pt)、z=r sin(qt)。0≤t≤2π、R>r>0、pとqは互いに素な正の整数です。</p></main>';return()=>{lifecycle.abort();root.replaceChildren();};}
 const scene=new THREE.Scene(),pivot=new THREE.Group(),camera=new THREE.PerspectiveCamera(38,1,.1,100);scene.add(pivot);pivot.rotation.set(.65,-.35,-.18);
 const core=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));
 const halo=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.10,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
 const torus=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial({color:0x7994ba,transparent:true,opacity:.12,depthWrite:false,side:THREE.DoubleSide}));torus.visible=false;
 const tip=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color:0xf8fcff}));pivot.add(core,halo,torus,tip);
 const guide=createKnotGuide(pivot,stage);
 const inspector=createKnotInspector($('#knot-inspector'),id=>selectGuide(selected===id?null:id));
 const fields=(['p','q','R','r'] as const).map(key=>{
  const label=document.createElement('label'),input=document.createElement('input');label.htmlFor=`knot-${key}`;label.textContent=({p:'p · 中心軸を回る回数',q:'q · 断面を回る回数',R:'R · 大半径',r:'r · 小半径'})[key];
  input.id=`knot-${key}`;input.type='number';input.required=true;input.min=key==='r'?'.2':'1';input.max=key==='R'?'6':key==='r'?'2.5':'9';input.step=key==='p'||key==='q'?'1':'any';input.inputMode=key==='p'||key==='q'?'numeric':'decimal';label.append(input);$('#knot-fields').append(label);return{key,input};
 });
 $<HTMLFormElement>('#knot-form').noValidate=true;
 function clearErrors(){fields.forEach(({input})=>input.removeAttribute('aria-invalid'));$('#knot-error').hidden=true;}
 function fillFields(){fields.forEach(({key,input})=>input.value=String(settings[key]));clearErrors();}
 const preset=$<HTMLSelectElement>('#knot-preset');
 for(const p of knotPresets){const option=document.createElement('option');option.value=p.id;option.textContent=p.name;preset.append(option);}const custom=document.createElement('option');custom.value='custom';custom.textContent='カスタム設定';custom.disabled=true;preset.append(custom);
 const stepButtons=lessons.map(([title,text,id],i)=>{const button=document.createElement('button');button.textContent=`${i+1}. ${title}`;button.dataset.knotStep=String(i+1);button.setAttribute('aria-pressed','false');button.onclick=()=>{lessonIndex=i;selectGuide(id,false,true);$('#knot-lesson-text').textContent=text;stepButtons.forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));};$('#knot-lessons').append(button);return button;});
 function sync(){
  const complete=state.mode==='complete',play=$<HTMLButtonElement>('#knot-play');play.textContent=complete?'描画完了':state.mode==='drawing'?'一時停止':'再生';play.disabled=complete;play.setAttribute('aria-pressed',String(state.mode!=='drawing'));
  stage.dataset.mode=state.mode;stage.dataset.settings=JSON.stringify(settings);stage.dataset.guide=selected??'';stage.dataset.torus=String(torus.visible);stage.dataset.samples=String(sample.segments+1);
 }
 function selectGuide(id:KnotGuide|null,restore=false,fromLesson=false){
  if(!fromLesson){lessonIndex=null;stepButtons.forEach(b=>b.setAttribute('aria-pressed','false'));$('#knot-lesson-text').textContent='段階を選んで、同じ位置tで周回と交差を確かめます。';}
  const target=restore?inspector.button(selected):undefined;selected=id;inspector.select(id);panel.hidden=!id;
  const definition=knotGuides.find(g=>g.id===id);$('#knot-guide-title').textContent=definition?.title??'';$('#knot-guide-description').textContent=definition?.description??'';
  if(!id){lessonIndex=null;stepButtons.forEach(b=>b.setAttribute('aria-pressed','false'));$('#knot-lesson-text').textContent='段階を選んで、同じ位置tで周回と交差を確かめます。';}
  sync();invalidate();if(target?.isConnected&&!target.disabled)target.focus({preventScroll:true});
 }
 function fit(){
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  const dpr=Math.min(devicePixelRatio,1.75,1600/w,1600/h);
  if(width!==w||height!==h||renderer.getPixelRatio()!==dpr){
   // A fresh surface avoids the stationary-buffer resize blank in Windows WebKit.
   if(width){scene.traverse(object=>{const drawable=object as THREE.Mesh;drawable.geometry?.dispose();if(drawable.material)for(const material of Array.isArray(drawable.material)?drawable.material:[drawable.material])material.dispose();});renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();renderer=makeRenderer();}
   renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);width=w;height=h;
  }
  camera.aspect=w/h;camera.updateProjectionMatrix();camera.position.set(0,0,(settings.R+settings.r+.15)/Math.sin(Math.atan(Math.tan(THREE.MathUtils.degToRad(19))*Math.min(1,camera.aspect)))*1.08);camera.lookAt(0,0,0);invalidate();
 }
 function rebuild(){
  sample=sampleKnot(settings);core.geometry.dispose();halo.geometry.dispose();torus.geometry.dispose();core.geometry=knotTube(settings,sample.segments);halo.geometry=knotTube(settings,sample.segments,true);torus.geometry=knotTorus(settings);
  const p=knotPresets.find(p=>p.p===settings.p&&p.q===settings.q);preset.value=p?.id??'custom';$('#knot-preset-description').textContent=p?.description??(settings.p===1||settings.q===1?'一方の回転数が1なので、ほどくと輪になる自明な結び目です。':`T(${settings.p},${settings.q})：中心軸を${settings.p}周、断面を${settings.q}周します。`);
  fillFields();inspector.sync(settings);inspector.select(selected);$('#knot-sampling').textContent=`${sample.segments}区間・${sample.segments+1}標本。速度変更では再生成しません。`;previous=null;sync();fit();invalidate();
 }
 $('#knot-form').onsubmit=event=>{
  event.preventDefault();const next={...settings};fields.forEach(({key,input})=>next[key]=input.valueAsNumber);
  try{validateKnot(next);}catch(error){fields.forEach(({input})=>input.setAttribute('aria-invalid','true'));$('#knot-error').textContent=`入力は未適用です。${(error as Error).message} 図と数式は前の有効な設定を保っています。`;$('#knot-error').hidden=false;return;}
  settings=next;state=reshapeKnot(state,motion.matches);rebuild();
 };
 preset.onchange=()=>{const p=knotPresets.find(p=>p.id===preset.value);if(!p)return;settings={...settings,p:p.p,q:p.q};state=reshapeKnot(state,motion.matches);rebuild();};
 $('#knot-defaults').onclick=()=>{settings={...knotDefaults};rate=.4;$<HTMLInputElement>('#knot-rate').value='.4';$('#knot-rate-value').textContent='.4';state=reshapeKnot(state,motion.matches);rebuild();};
 $('#knot-play').onclick=()=>{state={...state,mode:state.mode==='drawing'?'paused':'drawing'};previous=null;sync();invalidate();};
 $('#knot-restart').onclick=()=>{state=restartKnot(state,motion.matches);previous=null;sync();invalidate();};
 $('#knot-complete').onclick=()=>{state={t:TAU,mode:'complete'};previous=null;sync();invalidate();};
 $<HTMLInputElement>('#knot-position').oninput=event=>{const value=(event.target as HTMLInputElement).valueAsNumber;if(!Number.isFinite(value)||value<0||value>1)return;state={t:value*TAU,mode:value===1?'complete':'paused'};previous=null;sync();invalidate();};
 $<HTMLInputElement>('#knot-rate').oninput=event=>{const value=(event.target as HTMLInputElement).valueAsNumber;if(!Number.isFinite(value)||value<.1||value>2)return;rate=value;$('#knot-rate-value').textContent=String(rate);previous=null;invalidate();};
 $<HTMLInputElement>('#knot-torus').onchange=event=>{torus.visible=(event.target as HTMLInputElement).checked;sync();invalidate();};
 $<HTMLSelectElement>('#knot-quality').onchange=event=>{halo.visible=(event.target as HTMLSelectElement).value==='glow';invalidate();};
 function resetView(){pivot.rotation.set(.65,-.35,-.18);invalidate();}
 $('#knot-turn').onclick=()=>{pivot.rotation.y+=Math.PI/8;invalidate();};$('#knot-tilt').onclick=()=>{pivot.rotation.x+=Math.PI/8;invalidate();};$('#knot-view-reset').onclick=resetView;
 $('#knot-guide-clear').onclick=()=>selectGuide(null,panel.contains(document.activeElement));
 $('#knot-jump').onclick=()=>{stage.scrollIntoView({block:'start',behavior:'instant'});stage.focus({preventScroll:true});};
 $('#knot-back').onclick=()=>{const button=inspector.button(selected);button?.scrollIntoView({block:'center',behavior:'instant'});button?.focus({preventScroll:true});};
 math.addEventListener('toggle',()=>{if(!math.open&&selected){const restore=panel.contains(document.activeElement);selectGuide(null);if(restore)math.querySelector('summary')!.focus({preventScroll:true});}},{signal:lifecycle.signal});
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&selected)selectGuide(null,panel.contains(document.activeElement));},{signal:lifecycle.signal});
 stage.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();if(event.key==='ArrowLeft'||event.key==='ArrowRight')pivot.rotation.y+=event.key==='ArrowLeft'?-.15:.15;else pivot.rotation.x+=event.key==='ArrowUp'?-.15:.15;invalidate();},{signal:lifecycle.signal});
 let dragging=false,lastX=0,lastY=0;
 stage.addEventListener('pointerdown',event=>{if(event.button!==0||!(event.target instanceof HTMLCanvasElement))return;dragging=true;lastX=event.clientX;lastY=event.clientY;stage.setPointerCapture(event.pointerId);},{signal:lifecycle.signal});
 stage.addEventListener('pointermove',event=>{if(!dragging)return;pivot.rotation.y+=(event.clientX-lastX)*.008;pivot.rotation.x+=(event.clientY-lastY)*.008;lastX=event.clientX;lastY=event.clientY;invalidate();},{signal:lifecycle.signal});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(event,()=>dragging=false,{signal:lifecycle.signal});
 document.addEventListener('visibilitychange',()=>{previous=null;if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}else{fit();invalidate();}},{signal:lifecycle.signal});
 motion.addEventListener('change',event=>{if(event.matches&&state.mode==='drawing'){state={...state,mode:'paused'};previous=null;sync();invalidate();}},{signal:lifecycle.signal});
 function scheduleResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!disposed&&!document.hidden)fit();},120);}
 const resize=new ResizeObserver(scheduleResize);resize.observe(stage);window.addEventListener('resize',scheduleResize,{signal:lifecycle.signal});
 function invalidate(){if(!disposed&&!document.hidden&&raf===null)raf=requestAnimationFrame(frame);}
 function frame(now:number){
  raf=null;if(disposed||document.hidden){previous=null;return;}
  const old=state.mode;state=advanceKnot(state,previous===null?0:Math.min((now-previous)/1000,.1),rate);previous=now;if(old!==state.mode)sync();
  const index=state.t===TAU?sample.segments:Math.floor(state.t/TAU*sample.segments),t=index/sample.segments*TAU,point=knotPoint(settings,t);
  core.geometry.setDrawRange(0,index*KNOT_SIDES*6);halo.geometry.setDrawRange(0,index*KNOT_SIDES*6);tip.position.copy(point);
  $<HTMLInputElement>('#knot-position').value=String(state.t/TAU);$('#knot-current').textContent=`t ≈ ${fmt(t)} rad / 2π · P ≈ (${fmt(point.x)}, ${fmt(point.y)}, ${fmt(point.z)})`;
  $('#knot-guide-values').textContent=`O：原点 ／ C：断面の中心 ／ P：現在の点。pt/2π ≈ ${fmt(settings.p*t/TAU)} / ${settings.p} 周、qt/2π ≈ ${fmt(settings.q*t/TAU)} / ${settings.q} 周。OC=R=${settings.R}、CP=r=${settings.r}。`;
  stage.dataset.t=String(t);stage.dataset.index=String(index);stage.dataset.rotation=pivot.rotation.toArray().slice(0,3).join(',');stage.dataset.lesson=lessonIndex===null?'':String(lessonIndex+1);
  pivot.updateMatrixWorld(true);guide.update(settings,t,selected,camera,width,height);renderer.render(scene,camera);if(state.mode==='drawing')invalidate();
 }
 rebuild();
 return()=>{disposed=true;if(raf!==null)cancelAnimationFrame(raf);clearTimeout(resizeTimer);resize.disconnect();lifecycle.abort();guide.dispose();scene.traverse(object=>{const drawable=object as THREE.Mesh;drawable.geometry?.dispose();if(drawable.material)for(const material of Array.isArray(drawable.material)?drawable.material:[drawable.material])material.dispose();});renderer.dispose();renderer.forceContextLoss();root.replaceChildren();};
}
