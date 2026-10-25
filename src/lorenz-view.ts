import * as THREE from 'three';
import {advanceLorenz,LORENZ_DT,lorenzDefaults,lorenzDerivative,lorenzIndex,lorenzLessons,lorenzPresets,pointAt,reshapeLorenz,restartLorenz,sampleLorenz,type LorenzPlayback,type LorenzSettings,type Point} from './lorenz';

const fmt=(n:number)=>Number(n.toFixed(5)).toString();
const world=(p:Point)=>new THREE.Vector3(p.x,p.z-25,-p.y);
const symbols=['sigma','rho','beta','x','y','z','delta'] as const;
type SymbolId=typeof symbols[number];
const names:Record<SymbolId,string>={sigma:'σ',rho:'ρ',beta:'β',x:'x',y:'y',z:'z',delta:'δ'};
const meanings:Record<SymbolId,string>={sigma:'σはxの変化速度と、y−xの差の結びつきを調整します。',rho:'ρはyの変化速度のx(ρ−z)に入り、軌道の挙動を変えます。',beta:'βはzの変化速度の−βzに入り、zを減衰させる項です。',x:'xは現在位置Aのx座標。3本の式を通じて他の座標とも影響し合います。',y:'yは現在位置Aのy座標。画面の縦方向そのものではなく、3次元の座標です。',z:'zは現在位置Aのz座標。図では初期視点の高さ方向に対応します。',delta:'δは比較用Bの初期xにだけ加えます。現在の距離dとは別の値です。'};
const fields=[['sigma','σ · 係数',1,20],['rho','ρ · 係数',0,50],['beta','β · 係数',.5,6],['x','初期 x',-30,30],['y','初期 y',-30,30],['z','初期 z',-30,60],['delta','δ · 初期xの微小差分',1e-8,.1],['points','描画点数（初期点を含む）',1000,24000]] as const;

export function mountLorenz(root:HTMLElement):()=>void{
 const lifecycle=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const token=(s:SymbolId)=>`<button type="button" data-symbol="${s}" aria-label="${names[s]}の対応を強調" aria-pressed="false">${names[s]}</button>`;
 root.innerHTML=`<main class="lorenz"><header><small>MATH ART LAB / EXPERIMENT 005</small><h1>カオスの蝶</h1><p>三つの式から、予測の向こうへ。<br>ローレンツ・アトラクター</p></header><section class="workspace"><div class="stage-column"><div id="lorenz-stage" tabindex="0" role="region" aria-label="カオスの蝶。ドラッグ・矢印キーで回転。ズームは下のボタン"><span class="stage-kicker">CHAOS / LORENZ ATTRACTOR</span><span id="lorenz-annotation"></span></div><div class="view-actions"><button id="lorenz-turn">左右に回す</button><button id="lorenz-tilt">上下に回す</button><button id="lorenz-zoom-in">拡大</button><button id="lorenz-zoom-out">縮小</button><button id="lorenz-view-reset">視点リセット</button></div><p class="stage-hint">図内をドラッグ・タッチ、または矢印キーで回転。図の外でページをスクロール。実線A・丸い点A／破線B・菱形の点B。</p><div class="lorenz-caption"><output id="lorenz-current"></output><output id="lorenz-velocity"></output><output id="lorenz-distance"></output><p id="lorenz-guide">数式の記号をホバー・タップ、またはTabで選ぶと対応を表示します。</p><button id="lorenz-clear">強調を解除</button></div><div class="lorenz-equations" aria-label="ローレンツ方程式"><p>dx/dt = ${token('sigma')} (${token('y')} − ${token('x')})</p><p>dy/dt = ${token('x')} (${token('rho')} − ${token('z')}) − ${token('y')}</p><p>dz/dt = ${token('x')}${token('y')} − ${token('beta')}${token('z')}</p><p>Bの初期位置：(${token('x')}₀ + ${token('delta')}, y₀, z₀)</p><output id="lorenz-applied"></output></div></div><aside aria-label="カオスの蝶の操作"><label for="lorenz-preset">プリセット<select id="lorenz-preset">${lorenzPresets.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}<option value="custom" disabled>カスタム設定</option></select></label><p id="lorenz-preset-description"></p><div class="actions"><button id="lorenz-play">一時停止</button><button id="lorenz-step">1ステップ</button><button id="lorenz-restart">最初から</button><button id="lorenz-complete">完成形表示</button></div><label for="lorenz-rate">再生速度（作品内時間／実秒）<output id="lorenz-rate-value">4</output><input id="lorenz-rate" type="range" min=".25" max="8" step=".25" value="4"></label><p class="control-note">速度は表示時刻だけを変え、積分刻み・計算済み軌道を変えません。1ステップは停止中に使えます。</p><details id="lorenz-shape"><summary>係数・初期値を調整</summary><form id="lorenz-form" novalidate>${fields.map(([key,label,min,max])=>`<label for="lorenz-${key}" data-field="${key}">${label}<input id="lorenz-${key}" type="number" min="${min}" max="${max}" step="${key==='points'?'1':'any'}" required></label>`).join('')}<label class="lorenz-check"><input id="lorenz-compare" type="checkbox">比較軌道Bを表示</label><button type="submit">設定を適用</button><p id="lorenz-error" role="status" hidden></p></form><button id="lorenz-defaults">設定を初期値へ</button><p class="control-note">推奨は標準係数・初期値(1,1,1)、δ=0.00001、12,000点。入力範囲は安全と負荷のための制限で、カオスの保証ではありません。適用時は古い軌道を破棄して再計算します。停止は停止、完成形は新しい完成形を保ちます。未適用の入力は図・数式へ反映しません。</p></details><p id="lorenz-budget" class="control-note"></p><button id="lorenz-lesson-toggle">4段階の教材を開く</button><div id="lorenz-lesson" hidden><div class="lesson-steps" role="group" aria-label="カオスの解説段階">${lorenzLessons.map(([title],i)=>`<button data-lesson="${i}" aria-pressed="false">${i+1}. ${title}</button>`).join('')}</div><p id="lorenz-lesson-text"></p><p class="control-note">段階2は初期位置で停止、段階3は比較を有効にして初期位置で停止、段階4は完成形です。教材を閉じると開く前の設定と進行・速度へ戻ります。</p></div><p class="control-note">倍精度の固定RK4、Δt=0.005。表示は単精度の有限線分です。光の点は表示上の大きさで、残光による軌跡の追加はありません。長時間の軌道一致や数学的証明を主張しません。</p></aside></section><footer>初期値の小さな違いが、異なる未来へ。<a href="https://journals.ametsoc.org/view/journals/atsc/20/2/1520-0469_1963_020_0130_dnf_2_0_co_2.xml" target="_blank" rel="noreferrer">Lorenz (1963), Deterministic Nonperiodic Flow</a>。実機iPhone Safariは未検証。</footer></main>`;
 const $=<T extends HTMLElement=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const stage=$('#lorenz-stage');let settings={...lorenzDefaults},sample=sampleLorenz(settings),rate=4;
 const roundingNote=document.createElement('p');roundingNote.className='control-note';roundingNote.textContent='数値表示は丸めた約値です。計算は丸め前の値を使います。';$('#lorenz-applied').after(roundingNote);
 // Continuous numeric readouts remain readable without announcing every frame.
 for(const id of ['current','velocity','distance'])$(`#lorenz-${id}`).setAttribute('aria-live','off');
 let state:LorenzPlayback={elapsed:motion.matches?(settings.points-1)*LORENZ_DT:0,mode:motion.matches?'complete':'drawing'};
 let saved:{settings:LorenzSettings;sample:ReturnType<typeof sampleLorenz>;state:LorenzPlayback;rate:number;preset:string}|null=null;
 let selected:SymbolId|null=null,lesson=0,disposed=false,raf:number|null=null,previous:number|null=null,width=0,height=0,zoom=1;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const scene=new THREE.Scene(),pivot=new THREE.Group(),camera=new THREE.PerspectiveCamera(42,1,.1,1000);scene.add(pivot);pivot.rotation.set(.12,-.35,0);
 function makeRenderer(){const r=new THREE.WebGLRenderer({antialias:true});r.setClearColor('#040915');stage.prepend(r.domElement);return r;}
 let renderer:THREE.WebGLRenderer;
 try{renderer=makeRenderer();}catch{root.innerHTML='<main class="lorenz"><h1>カオスの蝶</h1><p>WebGL2の描画を開始できませんでした。対応ブラウザで開くか、上の作品選択へ戻ってください。</p><p>dx/dt=σ(y−x)、dy/dt=x(ρ−z)−y、dz/dt=xy−βz。標準値はσ=10、ρ=28、β=8/3。固定刻みRK4による数値近似です。</p></main>';return()=>{lifecycle.abort();root.replaceChildren();};}
 const a=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({vertexColors:true}));
 const b=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xffd281,dashSize:.65,gapSize:.4}));
 const tipA=new THREE.Mesh(new THREE.SphereGeometry(.6,12,8),new THREE.MeshBasicMaterial({color:0xffffff}));
 const tipB=new THREE.Mesh(new THREE.OctahedronGeometry(.85),new THREE.MeshBasicMaterial({color:0xffd281,wireframe:true}));
 const direction=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),5,0xffffff,1.4,.7);
 const connector=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.6}));
 pivot.add(a,b,tipA,tipB,direction,connector);
 const labels=['A','B','v'].map(text=>{const el=document.createElement('span');el.className='lorenz-label';el.textContent=text;stage.append(el);return el;});
 const axes=(['x','y','z'] as const).map(axis=>{const v=new THREE.Vector3(axis==='x'?1:0,axis==='z'?1:0,axis==='y'?-1:0),arrow=new THREE.ArrowHelper(v,world({x:0,y:0,z:0}),10,0x7186a6,1,.5),label=document.createElement('span');label.className='lorenz-label';label.textContent=axis;stage.append(label);pivot.add(arrow);return{axis,arrow,label,v};});
 const preset=$<HTMLSelectElement>('#lorenz-preset');
 function invalidate(){if(!disposed&&!document.hidden&&raf===null)raf=requestAnimationFrame(frame);}
 function sync(){
  const play=$<HTMLButtonElement>('#lorenz-play');play.textContent=state.mode==='drawing'?'一時停止':state.mode==='complete'?'最初から再生':'再生';play.setAttribute('aria-pressed',String(state.mode!=='drawing'));
  $<HTMLButtonElement>('#lorenz-step').disabled=state.mode!=='paused';
  stage.dataset.mode=state.mode;stage.dataset.settings=JSON.stringify(settings);stage.dataset.guide=selected??'';
  stage.dataset.lesson=saved?String(lesson+1):'';stage.dataset.rate=String(rate);invalidate();
 }
 function select(id:SymbolId|null){
  selected=id;root.querySelectorAll<HTMLElement>('[data-symbol]').forEach(el=>{const active=el.dataset.symbol===id;el.classList.toggle('lorenz-selected',active);el.setAttribute('aria-pressed',String(active));});
  root.querySelectorAll<HTMLElement>('[data-field]').forEach(el=>el.classList.toggle('lorenz-selected',el.dataset.field===id));
  root.querySelectorAll<HTMLElement>('[data-value]').forEach(el=>el.classList.toggle('lorenz-selected',el.dataset.value===id));
  $('#lorenz-guide').textContent=id?meanings[id]:'数式の記号をホバー・タップ、またはTabで選ぶと対応を表示します。';sync();
 }
 root.querySelectorAll<HTMLButtonElement>('[data-symbol]').forEach(button=>{
  const id=button.dataset.symbol as SymbolId;button.onclick=()=>select(id);button.onpointerenter=()=>{if(matchMedia('(hover:hover)').matches)select(id);};button.onfocus=()=>select(id);
 });
 for(const [key] of fields){const input=$<HTMLInputElement>(`#lorenz-${key}`);input.onfocus=()=>{if(key!=='points')select(key);};input.oninput=()=>{if(key!=='points')select(key);};}
 $('#lorenz-clear').onclick=()=>{const inButton=$('#lorenz-clear')===document.activeElement,id=selected;select(null);if(inButton&&id){const button=root.querySelector<HTMLButtonElement>(`[data-symbol="${id}"]`);button?.focus({preventScroll:true});select(null);}};
 function fill(){for(const [key] of fields)$<HTMLInputElement>(`#lorenz-${key}`).value=String(settings[key]);$<HTMLInputElement>('#lorenz-compare').checked=settings.compare;$('#lorenz-error').hidden=true;root.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));}
 function geometry(data:Float64Array){
  const positions=new Float32Array(data.length),colors=new Float32Array(data.length),color=new THREE.Color();
  for(let i=0;i<settings.points;i++){world(pointAt(data,i)).toArray(positions,i*3);color.setHSL(.52+i/settings.points*.17,.8,.65);color.toArray(colors,i*3);}
  return new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(positions,3)).setAttribute('color',new THREE.BufferAttribute(colors,3));
 }
 function rebuild(){
  a.geometry.dispose();b.geometry.dispose();a.geometry=geometry(sample.a);b.geometry=sample.b?geometry(sample.b):new THREE.BufferGeometry();if(sample.b)b.computeLineDistances();b.visible=!!sample.b;tipB.visible=!!sample.b;connector.visible=!!sample.b;
  fill();$('#lorenz-applied').innerHTML=`適用値：${(['sigma','rho','beta'] as const).map(id=>`<span data-value="${id}">${names[id]}=${fmt(settings[id])}</span>`).join('、')}。初期(x,y,z)=(${settings.x}, ${settings.y}, ${settings.z})、<span data-value="delta">δ=${settings.delta}</span>。`;
  root.querySelectorAll<HTMLElement>('[data-value]').forEach(el=>el.classList.toggle('lorenz-selected',el.dataset.value===selected));
  $('#lorenz-preset-description').textContent=lorenzPresets.find(p=>p.id===preset.value)?.description??'カスタム係数での数値軌道です。カオスになるとは限りません。';
  $('#lorenz-budget').textContent=`${settings.points.toLocaleString()}点 × ${sample.b?2:1}本、t=0〜${fmt((settings.points-1)*LORENZ_DT)}。${settings.points>16000?'高負荷設定。点数を減らすと軽くなります。':''} DPRは最大1.75、描画バッファ各辺は最大1,600px。`;
  previous=null;sync();
 }
 function apply(next:LorenzSettings,presetId:string){
  try{const data=sampleLorenz(next);settings=next;sample=data;state=reshapeLorenz(state,next.points,motion.matches);preset.value=presetId;rebuild();}catch(error){$('#lorenz-error').textContent=`未適用です。${(error as Error).message} 図と数式は直前の有効な設定を保ちます。`;$('#lorenz-error').hidden=false;for(const [key] of fields)$(`#lorenz-${key}`).setAttribute('aria-invalid','true');}
 }
 $<HTMLFormElement>('#lorenz-form').onsubmit=event=>{event.preventDefault();const next={...settings};for(const [key] of fields)next[key]=$<HTMLInputElement>(`#lorenz-${key}`).valueAsNumber;next.compare=$<HTMLInputElement>('#lorenz-compare').checked;apply(next,'custom');};
 preset.onchange=()=>{const p=lorenzPresets.find(p=>p.id===preset.value);if(p)apply({...lorenzDefaults,rho:p.rho,compare:p.compare},p.id);};
 $('#lorenz-defaults').onclick=()=>{rate=4;$<HTMLInputElement>('#lorenz-rate').value='4';$('#lorenz-rate-value').textContent='4';apply({...lorenzDefaults},'standard');};
 $('#lorenz-play').onclick=()=>{state=state.mode==='complete'?{elapsed:0,mode:'drawing'}:{...state,mode:state.mode==='drawing'?'paused':'drawing'};previous=null;sync();};
 $('#lorenz-step').onclick=()=>{if(state.mode==='paused'){state={elapsed:Math.min((settings.points-1)*LORENZ_DT,(lorenzIndex(state,settings.points)+1)*LORENZ_DT),mode:'paused'};if(lorenzIndex(state,settings.points)===settings.points-1)state.mode='complete';previous=null;sync();}};
 $('#lorenz-restart').onclick=()=>{state=restartLorenz(state,motion.matches);previous=null;sync();};
 $('#lorenz-complete').onclick=()=>{state={elapsed:(settings.points-1)*LORENZ_DT,mode:'complete'};previous=null;sync();};
 $<HTMLInputElement>('#lorenz-rate').oninput=event=>{const value=(event.target as HTMLInputElement).valueAsNumber;if(Number.isFinite(value)&&value>=.25&&value<=8){rate=value;$('#lorenz-rate-value').textContent=String(rate);previous=null;sync();}};
 function lessonStep(index:number){
  lesson=index;state={...state,mode:'paused'};
  if(index===1)state={elapsed:0,mode:'paused'};
  if(index===2){state={elapsed:0,mode:'paused'};if(!settings.compare){apply({...settings,compare:true},'custom');}}
  if(index===3)state={elapsed:(settings.points-1)*LORENZ_DT,mode:'complete'};
  $('#lorenz-lesson-text').textContent=lorenzLessons[index][1];root.querySelectorAll('button[data-lesson]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));select(index===0?'sigma':index===1?'x':index===2?'delta':'z');previous=null;sync();
 }
 root.querySelectorAll<HTMLButtonElement>('button[data-lesson]').forEach((button,index)=>button.onclick=()=>lessonStep(index));
 function closeLesson(){
  if(!saved)return;const restoreFocus=$('#lorenz-lesson').contains(document.activeElement);
  ({settings,sample,state,rate}=saved);preset.value=saved.preset;saved=null;$('#lorenz-lesson').hidden=true;$('#lorenz-lesson-toggle').textContent='4段階の教材を開く';$<HTMLInputElement>('#lorenz-rate').value=String(rate);$('#lorenz-rate-value').textContent=String(rate);select(null);rebuild();
  if(restoreFocus)$('#lorenz-lesson-toggle').focus({preventScroll:true});
 }
 $('#lorenz-lesson-toggle').onclick=()=>{if(saved){closeLesson();return;}saved={settings:{...settings},sample,state:{...state},rate,preset:preset.value};$('#lorenz-lesson').hidden=false;$('#lorenz-lesson-toggle').textContent='教材を閉じて作品へ戻る';lessonStep(0);};
 root.addEventListener('keydown',event=>{if(event.key==='Escape'){if(saved)closeLesson();select(null);}},{signal:lifecycle.signal});
 function fit(){
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;const dpr=Math.min(devicePixelRatio,1.75,1600/w,1600/h);
  if(w!==width||h!==height||renderer.getPixelRatio()!==dpr){
   // Same workaround as existing works for stationary WebKit canvas resize.
   if(width){scene.traverse(object=>{const draw=object as THREE.Mesh;draw.geometry?.dispose();if(draw.material)for(const m of Array.isArray(draw.material)?draw.material:[draw.material])m.dispose();});renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();renderer=makeRenderer();}
   renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);width=w;height=h;
  }
  camera.aspect=w/h;camera.position.set(0,0,110/Math.min(1,camera.aspect)/zoom);camera.lookAt(0,0,0);camera.updateProjectionMatrix();invalidate();
 }
 $('#lorenz-turn').onclick=()=>{pivot.rotation.y+=.2;invalidate();};$('#lorenz-tilt').onclick=()=>{pivot.rotation.x+=.2;invalidate();};
 $('#lorenz-view-reset').onclick=()=>{pivot.rotation.set(.12,-.35,0);zoom=1;fit();};
 $('#lorenz-zoom-in').onclick=()=>{zoom=Math.min(3,zoom*1.2);fit();};$('#lorenz-zoom-out').onclick=()=>{zoom=Math.max(.4,zoom/1.2);fit();};
 stage.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();if(event.key==='ArrowLeft'||event.key==='ArrowRight')pivot.rotation.y+=event.key==='ArrowLeft'?-.15:.15;else pivot.rotation.x+=event.key==='ArrowUp'?-.15:.15;invalidate();},{signal:lifecycle.signal});
 let dragging=false,lastX=0,lastY=0;
 stage.addEventListener('pointerdown',event=>{if(event.button!==0||!(event.target instanceof HTMLCanvasElement))return;dragging=true;lastX=event.clientX;lastY=event.clientY;stage.setPointerCapture(event.pointerId);},{signal:lifecycle.signal});
 stage.addEventListener('pointermove',event=>{if(!dragging)return;pivot.rotation.y+=(event.clientX-lastX)*.008;pivot.rotation.x+=(event.clientY-lastY)*.008;lastX=event.clientX;lastY=event.clientY;invalidate();},{signal:lifecycle.signal});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,()=>dragging=false,{signal:lifecycle.signal});
 document.addEventListener('visibilitychange',()=>{previous=null;if(document.hidden){if(raf!==null)cancelAnimationFrame(raf);raf=null;}else{fit();invalidate();}},{signal:lifecycle.signal});
 motion.addEventListener('change',event=>{if(event.matches&&state.mode==='drawing'){state={...state,mode:'paused'};previous=null;sync();}},{signal:lifecycle.signal});
 const scheduleResize=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!disposed&&!document.hidden)fit();},120);};
 const resize=new ResizeObserver(scheduleResize);resize.observe(stage);window.addEventListener('resize',scheduleResize,{signal:lifecycle.signal});
 function labelAt(el:HTMLElement,p:THREE.Vector3,visible=true){const projected=p.clone().applyMatrix4(pivot.matrixWorld).project(camera);el.hidden=!visible||Math.abs(projected.x)>.94||Math.abs(projected.y)>.94||projected.z>1;el.style.left=`${(projected.x+1)*width/2}px`;el.style.top=`${(1-projected.y)*height/2}px`;}
 function frame(now:number){
  raf=null;if(disposed||document.hidden){previous=null;return;}state=advanceLorenz(state,previous===null?0:(now-previous)/1000,rate,settings.points);previous=now;
  const index=lorenzIndex(state,settings.points),p=pointAt(sample.a,index),v=lorenzDerivative(p,settings),pos=world(p),vector=new THREE.Vector3(v.x,v.z,-v.y);a.geometry.setDrawRange(0,index+1);b.geometry.setDrawRange(0,index+1);tipA.position.copy(pos);direction.position.copy(pos);direction.visible=vector.length()>1e-10;if(direction.visible)direction.setDirection(vector.normalize());
  let distance:number|null=null;if(sample.b){const q=pointAt(sample.b,index),qpos=world(q);tipB.position.copy(qpos);distance=Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z);const positions=connector.geometry.getAttribute('position') as THREE.BufferAttribute;positions.setXYZ(0,pos.x,pos.y,pos.z);positions.setXYZ(1,qpos.x,qpos.y,qpos.z);positions.needsUpdate=true;connector.geometry.computeBoundingSphere();}
  $('#lorenz-current').textContent=`t ≈ ${fmt(index*LORENZ_DT)} · 点 ${index+1}/${settings.points} · A: x=${fmt(p.x)}, y=${fmt(p.y)}, z=${fmt(p.z)}`;
  $('#lorenz-velocity').textContent=`変化速度 v: dx/dt=${fmt(v.x)}, dy/dt=${fmt(v.y)}, dz/dt=${fmt(v.z)}`;
  $('#lorenz-distance').textContent=distance===null?'A：実線・丸い点（比較Bは非表示）':`A：実線・丸い点 ／ B：破線・菱形 · 同時刻の距離 d=${distance.toExponential(5)}（初期δ=${settings.delta}）`;
  $('#lorenz-annotation').textContent=selected?`${names[selected]}：${selected==='x'||selected==='y'||selected==='z'?`Aの${names[selected]} ≈ ${fmt(p[selected])}`:`適用値 ${fmt(settings[selected])}`} ／ A:現在位置、v:変化方向`:'A:現在位置 ／ v:変化方向';
  pivot.updateMatrixWorld(true);labelAt(labels[0],pos);labelAt(labels[1],tipB.position,!!sample.b);labelAt(labels[2],pos.clone().add(vector.multiplyScalar(5)),direction.visible);
  for(const axis of axes){axis.arrow.setColor(selected===axis.axis?0xf9d879:0x7186a6);axis.label.classList.toggle('lorenz-selected',selected===axis.axis);labelAt(axis.label,world({x:0,y:0,z:0}).add(axis.v.clone().multiplyScalar(11)));}
  stage.dataset.index=String(index);stage.dataset.point=JSON.stringify(p);stage.dataset.distance=distance===null?'':String(distance);stage.dataset.rotation=pivot.rotation.toArray().slice(0,3).join(',');stage.dataset.zoom=String(zoom);
  const play=$<HTMLButtonElement>('#lorenz-play');play.textContent=state.mode==='drawing'?'一時停止':state.mode==='complete'?'最初から再生':'再生';play.setAttribute('aria-pressed',String(state.mode!=='drawing'));$<HTMLButtonElement>('#lorenz-step').disabled=state.mode!=='paused';stage.dataset.mode=state.mode;
  renderer.render(scene,camera);if(state.mode==='drawing')invalidate();
 }
 rebuild();fit();
 return()=>{disposed=true;if(raf!==null)cancelAnimationFrame(raf);clearTimeout(timer);resize.disconnect();lifecycle.abort();scene.traverse(object=>{const draw=object as THREE.Mesh;draw.geometry?.dispose();if(draw.material)for(const m of Array.isArray(draw.material)?draw.material:[draw.material])m.dispose();});renderer.dispose();renderer.forceContextLoss();saved=null;root.replaceChildren();};
}
