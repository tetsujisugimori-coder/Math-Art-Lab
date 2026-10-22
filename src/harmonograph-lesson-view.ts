import * as THREE from 'three';
import {axes} from './harmonograph';
import {renderMath} from './inspector';
import type {MathNode} from './structures';
import {advanceLesson,changeLessonParams,LESSON_DURATION,LESSON_INTERVAL,lessonDefaults,lessonFields,lessonPoint,lessonTerms,lessonTrailRange,sampleLesson,type LessonStage,type LessonState} from './harmonograph-lesson';

const colors={x:'#67e8f9',y:'#f9d879',z:'#c4b5fd'};
const stages=[
 {id:1,title:'左右の往復',text:'揺れとは、位置がある範囲を行ったり来たりすること。まずxだけを見ます。点は時間が増えても、際限なく遠くへ進みません。'},
 {id:2,title:'上下も加える',text:'同じ時刻tからxとyを同時に求めます。xへ動いてからyへ動く、という順番ではありません。短い線は直近約1.5秒の道すじです。'},
 {id:3,title:'奥行きも加える',text:'同じ時刻tからx・y・zが一緒に決まり、空間の点になります。斜めの視点や回転で奥行きを確認してください。線は直近約1.5秒だけです。'},
 {id:4,title:'軌跡を残す',text:'点の計算は段階3と同じです。0秒から通った場所を消さずに残すと、軌跡が作品になります。教材は20秒で止まり、線は無限に増えません。'},
] as const;

/** One small teaching scene, driven by the parent's existing animation loop and renderer. */
export function createMotionLesson(stage:HTMLElement,aside:HTMLElement,invalidate:()=>void){
 let state:LessonState={stage:1,time:0,playing:false,params:{...lessonDefaults}},active=false;
 let width=1,height=1;
 const group=new THREE.Group();group.visible=false;
 const ortho=new THREE.OrthographicCamera(-3,3,2.5,-2.5,.1,100);ortho.position.z=10;
 const perspective=new THREE.PerspectiveCamera(40,1,.1,100);perspective.position.set(5,3.4,6.5);perspective.lookAt(0,0,0);
 const axisLines=axes.map((axis,i)=>{
  const points=new Float32Array(6);points[i]=-2.3;points[i+3]=2.3;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:colors[axis],transparent:true,opacity:.7}));group.add(line);return line;
 });
 const tickGeometry=new THREE.BufferGeometry(),ticks=new THREE.LineSegments(tickGeometry,new THREE.LineBasicMaterial({color:colors.x}));group.add(ticks);
 const geometry=new THREE.BufferGeometry(),trail=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:0xe4f7ff,transparent:true,opacity:.65}));group.add(trail);
 const headPositions=new THREE.BufferAttribute(new Float32Array(6),3),headGeometry=new THREE.BufferGeometry();headGeometry.setAttribute('position',headPositions);
 const head=new THREE.Line(headGeometry,new THREE.LineBasicMaterial({color:0xe4f7ff}));group.add(head);
 const dot=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),new THREE.MeshBasicMaterial({color:0xffffff}));group.add(dot);
 const labels=axes.map(axis=>{const el=document.createElement('span');el.className='axis-label lesson-axis-label';el.textContent=axis.toUpperCase();el.style.color=colors[axis];el.hidden=true;el.setAttribute('aria-hidden','true');stage.append(el);return el;});
 const bounds=[-1,0,1].map(()=>{const el=document.createElement('span');el.className='axis-label lesson-axis-label lesson-bound';el.hidden=true;el.setAttribute('aria-hidden','true');stage.append(el);return el;});
 const caption=document.createElement('div');caption.id='lesson-caption';caption.className='lesson-caption';caption.hidden=true;
 caption.innerHTML=`<strong>教材設定 · 減衰なし／各方向1つの揺れ</strong><p id="lesson-description"></p><output id="lesson-readout"></output><div class="actions"><button id="lesson-play">再生</button><button id="lesson-next">0.25秒進める</button><button id="lesson-reset">最初から</button></div><p id="lesson-clock-note">共通の時計tを1秒/実秒で進めます。鑑賞用の再生速度とは独立です。</p>`;
 stage.after(caption);
 const panel=document.createElement('div');panel.id='lesson-panel';panel.hidden=true;
 panel.innerHTML=`<h2>動きの仕組み</h2><div class="lesson-steps" role="group" aria-label="解説の段階"></div><p>見せる方向を増やす順番です。段階を変えても時刻tと設定は保ちます。</p><div id="lesson-sliders"></div><p class="control-note">変更すると時刻を保って一時停止。線は新しい設定で0秒から計算し直します。</p><div id="lesson-formulas"></div><p id="lesson-observation"></p><details><summary>sin・cosと範囲について</summary><p>sinとcosの値は−1〜1の範囲で繰り返し変わります。1項だけのx=A sin(ωt+φ)は、Aが一定なら−|A|〜|A|。Aは中心から端まで、端から端は2|A|です。</p><p>ωは式に入る角周波数（rad/s）で、往復の速さを決めます。周期は2π/ω秒。時計を進める再生速度の変更とは別です。φは開始位置・タイミングをずらす位相。この教材のxはφ=0、yはπ/2、zはπ/4（固定）です。</p><p>sinとcosを同じ振幅・速さで組み合わせた円は一例です。振幅・速さ・位相の組合せで、円以外の曲線にもなります。</p></details><details id="lesson-art-connection"><summary>教材から作品へ</summary><p>教材は減衰なし・各方向1項。鑑賞の作品は各方向2つの揺れを足し、時間とともに小さくなる減衰も含みます。作品の範囲は単独のAではなく、各項の |Aᵢ| exp(−dᵢt) の和で見積もります。</p><p>範囲内に収まることと、軌跡が閉じることは別です。閉じ方は各方向の周期の組合せに依存します。減衰があれば範囲も縮まり、減衰なしの閉じた軌道とは区別します。</p><p>上の「作品へ戻る」で元のプリセット・設定・視点・進行位置へ戻れます。解説中に作品の時計は進みません。</p></details><div class="lesson-camera-actions"><button id="lesson-angle">斜めから見る</button><button id="lesson-view-reset">解説の視点を戻す</button></div><button id="lesson-jump">図形を確認</button>`;
 aside.append(panel);
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>(panel.querySelector<T>(selector)??caption.querySelector<T>(selector))!;
 const steps=stages.map(definition=>{
  const button=document.createElement('button');button.textContent=`${definition.id}. ${definition.title}`;button.dataset.lessonStage=String(definition.id);button.setAttribute('aria-pressed','false');
  button.onclick=()=>{const old=state.stage;state={...state,stage:definition.id};if(old<=2||definition.id<=2)group.rotation.set(0,0,0);rebuild();sync();invalidate();};return button;
 });
 for(const button of steps)panel.querySelector('.lesson-steps')!.append(button);
 const controls=lessonFields.map(field=>{
  const label=document.createElement('label'),output=document.createElement('output'),slider=document.createElement('input');slider.id=`lesson-${field.key}`;slider.type='range';slider.min=String(field.min);slider.max=String(field.max);slider.step=String(field.step);label.htmlFor=slider.id;output.htmlFor=slider.id;output.className='current-value';
  slider.oninput=()=>{const value=slider.valueAsNumber;if(!Number.isFinite(value)||value<field.min||value>field.max)return;state=changeLessonParams(state,{...state.params,[field.key]:value});rebuild();sync();invalidate();};
  label.append(`${field.label}（${field.unit}）`,output,slider);$('#lesson-sliders').append(label);return{field,slider,output};
 });
 const mathCards=axes.map(axis=>{
  const card=document.createElement('div');card.className=`lesson-formula lesson-${axis}`;
  card.tabIndex=0;card.setAttribute('role','region');card.setAttribute('aria-label',`${axis}方向の教材の数式。横にスクロールできます`);
  const label=document.createElement('strong');label.textContent=`${axis.toUpperCase()}方向`;
  const math=document.createElementNS('http://www.w3.org/1998/Math/MathML','math');math.setAttribute('display','block');math.setAttribute('aria-label',`${axis}方向の教材の数式`);card.append(label,math);$('#lesson-formulas').append(card);return{axis,card,math};
 });
 let positions=sampleLesson(state.stage,state.params);
 function rebuild(){
  positions=sampleLesson(state.stage,state.params);geometry.dispose();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.computeBoundingSphere();
  tickGeometry.dispose();const a=state.params.amplitude;tickGeometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array([-a,-.07,0,-a,.07,0,0,-.07,0,0,.07,0,a,-.07,0,a,.07,0]),3));tickGeometry.computeBoundingSphere();
 }
 function sync(){
  const definition=stages[state.stage-1];$('#lesson-description').textContent=`${state.stage}. ${definition.title}：${definition.text}`;
  steps.forEach((button,i)=>button.setAttribute('aria-pressed',String(state.stage===i+1)));
  controls.forEach(({field,slider,output})=>{slider.value=String(state.params[field.key]);output.textContent=String(state.params[field.key]);});
  const terms=lessonTerms(state.params),count=state.stage===1?1:state.stage===2?2:3;
  for(let i=0;i<3;i++){
   axisLines[i].visible=i<count;labels[i].hidden=!active||i>=count;mathCards[i].card.hidden=i>=count;
   const axis=axes[i],term=terms[axis][0];
   const tok=(tag:'mi'|'mn'|'mo',text:string):MathNode=>({tag,children:[text]});
   const number=(value:number):MathNode=>({tag:'mn',children:[String(value)]});
   const phase:MathNode=term.phase===Math.PI/2?{tag:'mfrac',children:[tok('mi','π'),tok('mn','2')]}:{tag:'mfrac',children:[tok('mi','π'),tok('mn','4')]};
   const expression:MathNode={tag:'mrow',children:[tok('mi',axis),tok('mo','('),tok('mi','t'),tok('mo',')'),tok('mo','='),number(term.amplitude),tok('mo','×'),tok('mi','sin'),tok('mo','('),number(term.frequency),tok('mi','t'),...(term.phase?[tok('mo','+'),phase]:[]),tok('mo',')')]};
   mathCards[i].math.replaceChildren(renderMath(expression));
   if(axis==='x'){const nums=mathCards[i].math.querySelectorAll('mn');nums[0].classList.add('current-value');nums[0].setAttribute('data-lesson-param','amplitude');nums[1].classList.add('current-value');nums[1].setAttribute('data-lesson-param','frequency');}
  }
  ticks.visible=state.stage===1;bounds.forEach((el,i)=>{el.hidden=!active||state.stage!==1;el.textContent=i===1?'中心 0':`${i===0?'−':'+'}${state.params.amplitude}`;});
  $('#lesson-observation').textContent=state.stage===1?`振幅 A=${state.params.amplitude} は中心から端。端から端は 2|A|=${(2*state.params.amplitude).toFixed(1)}。xの周期は ${(2*Math.PI/state.params.frequency).toFixed(2)} 秒です。`:state.stage===2?'教材の初期値では、y=1.4 sin(t+π/2)=1.4 cos(t)。xの幅・速さもそろうので円になります。xだけを変更すると円とは限りません。':'範囲内にいることと、同じ経路へ戻ることは別です。教材の初期値は2π秒で戻りますが、xの速さを変えると周期の組合せも変わります。20秒で閉じるとは限りません。';
  $('.lesson-camera-actions').hidden=state.stage<=2;
  syncPlayback();
 }
 function syncPlayback(){
  const play=$<HTMLButtonElement>('#lesson-play'),next=$<HTMLButtonElement>('#lesson-next');play.textContent=state.playing?'一時停止':'再生';play.disabled=state.time>=LESSON_DURATION;play.setAttribute('aria-pressed',String(!state.playing));next.disabled=state.playing||state.time>=LESSON_DURATION;
  panel.dataset.stage=String(state.stage);caption.dataset.playing=String(state.playing);
 }
 $('#lesson-play').onclick=()=>{state={...state,playing:!state.playing};syncPlayback();invalidate();};
 $('#lesson-next').onclick=()=>{state=advanceLesson(state,0,true);syncPlayback();invalidate();};
 $('#lesson-reset').onclick=()=>{state={...state,time:0};rebuild();syncPlayback();invalidate();};
 $('#lesson-angle').onclick=()=>{group.rotation.y+=Math.PI/6;invalidate();};$('#lesson-view-reset').onclick=()=>{group.rotation.set(0,0,0);invalidate();};
 $('#lesson-jump').onclick=()=>{stage.scrollIntoView({block:'start',behavior:'instant'});stage.focus({preventScroll:true});};
 function positionLabel(el:HTMLElement,point:THREE.Vector3,camera:THREE.Camera){point.applyMatrix4(group.matrixWorld).project(camera);el.style.left=`${(point.x+1)*width/2}px`;el.style.top=`${(1-point.y)*height/2}px`;}
 return{
  group,panel,caption,
  get active(){return active;},get playing(){return state.playing;},get camera(){return state.stage<=2?ortho:perspective;},
  start(){active=true;state={stage:1,time:0,playing:false,params:{...lessonDefaults}};group.rotation.set(0,0,0);group.visible=true;panel.hidden=caption.hidden=false;rebuild();sync();},
  stop(){active=false;state={...state,playing:false};group.visible=false;panel.hidden=caption.hidden=true;labels.forEach(el=>el.hidden=true);bounds.forEach(el=>el.hidden=true);},
  pause(){state={...state,playing:false};syncPlayback();},
  rotate(dx:number,dy:number){if(state.stage>=3){group.rotation.y+=dx*.008;group.rotation.x+=dy*.008;}},
  resize(w:number,h:number){width=w;height=h;const aspect=w/h;ortho.left=-2.6*Math.max(1,aspect);ortho.right=-ortho.left;ortho.top=2.6/Math.min(1,aspect);ortho.bottom=-ortho.top;ortho.updateProjectionMatrix();perspective.aspect=aspect;perspective.zoom=Math.min(1,aspect);perspective.updateProjectionMatrix();},
  frame(delta:number){
   const wasPlaying=state.playing;state=advanceLesson(state,delta);if(wasPlaying!==state.playing)syncPlayback();
   const point=lessonPoint(state.time,state.stage,state.params),range=lessonTrailRange(state),last=Math.floor(state.time/LESSON_INTERVAL);
   dot.position.set(...point);trail.visible=state.stage>1;geometry.setDrawRange(range.start,range.count);head.visible=range.head;
   headPositions.setXYZ(0,positions[last*3],positions[last*3+1],positions[last*3+2]);headPositions.setXYZ(1,...point);headPositions.needsUpdate=true;headGeometry.computeBoundingSphere();
   const count=state.stage===1?1:state.stage===2?2:3;
   $('#lesson-readout').textContent=`同じ t=${state.time.toFixed(3)} s：${axes.slice(0,count).map((axis,i)=>`${axis}=${point[i].toFixed(3)}`).join('、')}${state.time===LESSON_DURATION?' ／ 20秒で停止。最初からで再確認できます。':''}`;
   caption.dataset.time=String(state.time);caption.dataset.trailCount=String(state.stage===1?0:range.count);caption.dataset.dimensions=String(count);
   group.updateMatrixWorld(true);const camera=state.stage<=2?ortho:perspective;camera.updateMatrixWorld(true);
   labels.forEach((el,i)=>{const p=new THREE.Vector3();p.setComponent(i,2.4);positionLabel(el,p,camera);});
   bounds.forEach((el,i)=>positionLabel(el,new THREE.Vector3((i-1)*state.params.amplitude,-.28,0),camera));
  },
  dispose(){labels.forEach(el=>el.remove());bounds.forEach(el=>el.remove());panel.remove();caption.remove();},
 };
}
