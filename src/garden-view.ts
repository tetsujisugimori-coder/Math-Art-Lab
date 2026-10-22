import * as THREE from 'three';
import {createGardenLesson,gardenLessonProgress,pauseGardenLesson,resizeGardenLesson,setGardenLessonPlayback,switchGardenLesson,type GardenLesson} from './garden-lesson';
import {renderMath} from './inspector';
import type {MathNode} from './structures';
import {addGardenPoint,advanceGarden,GARDEN_DOT_RADIUS,GARDEN_SPACING,gardenDefaults,gardenExtent,gardenPoint,gardenPresets,GOLDEN_ANGLE,lessonGardenSettings,MAX_GARDEN_POINTS,resizeGarden,restartGarden,sampleGarden,visibleGardenPoints,type GardenLessonStage,type GardenPlayback,type GardenSettings} from './garden';

const lessons=[
 ['番号と置く順番','中心がn=0。「1点追加」で次の番号を置きます。段階1〜3は最大12点です。'],
 ['αだけ回す','破線が直前、実線が現在の向き。中心から見て反時計回りにαだけ回します。粒どうしを直線で移動する距離ではありません。'],
 ['半径で広がる','中心から点までの距離がrₙ。r=c√nは、外側ほど面積が増えることに合わせた配置です。隣り合う粒の距離が一定、という意味ではありません。'],
 ['全体の模様へ','番号・角度・半径の規則は同じです。再生や完成形で、選んだ総点数まで増やしてみてください。'],
] as const;
const fmt=(n:number,digits=6)=>Number(n.toFixed(digits)).toString();

export function mountGarden(root:HTMLElement):()=>void{
 const lifecycle=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 root.innerHTML=`<main class="garden"><header><small>MATH ART LAB / EXPERIMENT 003</small><h1>光の花園</h1><p>少し回って、少し外へ。ひと粒ずつ、規則が花になる。</p></header><section class="workspace"><div class="stage-column"><div id="garden-stage" tabindex="0" role="region" aria-label="光の花園。正面から見る平面の点配置"><span class="stage-kicker">LIGHT / PHYLLOTAXIS</span></div><div id="garden-caption" class="garden-caption"><strong id="garden-context">中心から外へ、番号の順に。</strong><p id="garden-explanation"></p><output id="garden-progress" aria-live="off"></output></div></div><aside aria-label="光の花園の操作"><button id="garden-lesson" aria-expanded="false" aria-controls="garden-lesson-panel">置き方を見る</button><div id="garden-lesson-panel" hidden><h2>点を置く規則</h2><div class="garden-steps" role="group" aria-label="置き方の段階"></div><p>教材の設定は作品と別です。段階1〜3は最大12点・3点/秒に固定し、総点数と速度は段階4で操作します。段階1〜3は進行を共有します。段階4の進行と再生状態は別に保存し、ほかの段階では進めません。閉じると元の設定・進行・再生状態へ戻ります。</p><button id="garden-jump">図形を確認</button></div><div class="actions"><button id="garden-play">一時停止</button><button id="garden-restart">最初から</button><button id="garden-next">1点追加</button><button id="garden-complete">完成形</button></div><p class="control-note">停止して1点ずつ確認できます。「最初から」は設定を保って0点へ。完成形からは再生を再開します（動きを減らす設定では停止）。</p><div class="garden-presets" role="group" aria-label="角度のプリセット"></div><p id="garden-pattern"></p><label for="garden-angle">一粒ごとの角度 α <output id="garden-angle-value"></output><input id="garden-angle" type="range" min="0" max="360" step="any"></label><label for="garden-angle-number">角度を数値で指定（度）<input id="garden-angle-number" type="number" inputmode="decimal" min="0" max="360" step="any"></label><div class="garden-fine" role="group" aria-label="角度の微調整"><button id="garden-angle-minus">−0.01°</button><button id="garden-angle-plus">＋0.01°</button></div><p id="garden-error" role="status" hidden>角度は0〜360度の有限値を入力してください。</p><p class="control-note">黄金角は180(3−√5)度を内部計算に使用します。表示の137.507764050…度や137.5度に丸めて計算しません。</p><label for="garden-total">総点数 N <output id="garden-total-value"></output><input id="garden-total" type="range" min="1" max="${MAX_GARDEN_POINTS}" step="1"></label><label for="garden-rate">成長速度（点/秒）<output id="garden-rate-value"></output><input id="garden-rate" type="range" min="1" max="600" step="1"></label><p class="control-note">角度を変えても表示点数と再生状態は保ちます。総点数は表示領域の基準です。成長中の自動ズームは行いません。</p><details id="garden-math"><summary>数式と現在の点</summary><p id="garden-current"></p><div id="garden-formulas"></div><output id="garden-coordinates" aria-live="off"></output><p>θは中心からの向き、rは中心からの距離。sin・cosはその位置をx・y座標へ変換します。外へ広がる大きさを決めるのはrの式です。</p><p>c=${GARDEN_SPACING}は配置の広がりです。粒を描く半径（基準${GARDEN_DOT_RADIUS}）とは別の値です。数式と座標の表示は約値で、描画は丸め前の値を使います。</p></details></aside></section><footer>黄金角でも完全な均一配置とは限らず、見える螺旋の本数も点数や角度によって変わります。</footer></main>`;
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const stage=$('#garden-stage'),math=$<HTMLDetailsElement>('#garden-math'),angleNumber=$<HTMLInputElement>('#garden-angle-number');
 let settings={...gardenDefaults},state:GardenPlayback={progress:motion.matches?settings.total:0,mode:motion.matches?'complete':'drawing'};
 let lesson:null|{progress:GardenLesson;settings:GardenSettings;mathOpen:boolean}=null;
 let disposed=false,raf:number|null=null,previous:number|null=null,width=0,height=0,lastN=-2;
 const currentSettings=()=>lesson?.settings??settings;
 const effectiveSettings=()=>lesson?lessonGardenSettings(lesson.settings,lesson.progress.stage):settings;
 const currentState=()=>lesson?gardenLessonProgress(lesson.progress).playback:state;
 function setState(next:GardenPlayback,explicit=false){if(lesson)lesson.progress=setGardenLessonPlayback(lesson.progress,next,explicit);else state=next;}
 function makeRenderer(){const next=new THREE.WebGLRenderer({antialias:true});next.setClearColor('#050a17');stage.prepend(next.domElement);return next;}
 let renderer=makeRenderer(),resizeTimer:ReturnType<typeof setTimeout>|undefined;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,.1,10);camera.position.z=5;
 const geometry=new THREE.BufferGeometry();
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{diameter:{value:4}},vertexShader:`attribute vec3 color; varying vec3 dotColor; uniform float diameter;
 void main(){dotColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=diameter;}`,
 fragmentShader:`varying vec3 dotColor; void main(){float r=length(gl_PointCoord-vec2(.5))*2.0;if(r>1.0)discard;
 float a=.88*(1.0-smoothstep(.40,.55,r))+.12*(1.0-smoothstep(.55,1.0,r));gl_FragColor=vec4(dotColor,a);
 #include <colorspace_fragment>
 }`});
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;scene.add(points);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('garden-overlay');svg.setAttribute('aria-hidden','true');stage.append(svg);
 const slots=new Map<string,Element[]>();
 function makeMath(children:MathNode[],keys:string[]){
  const card=document.createElement('div');card.className='math-scroll garden-formula';card.tabIndex=0;card.setAttribute('role','region');card.setAttribute('aria-label','現在の点の数式。横にスクロールできます');
  const el=document.createElementNS('http://www.w3.org/1998/Math/MathML','math');el.setAttribute('display','block');el.append(renderMath({tag:'mrow',children}));card.append(el);$('#garden-formulas').append(card);
  el.querySelectorAll('mn').forEach((node,i)=>{const key=keys[i];if(!key)return;slots.set(key,[...(slots.get(key)??[]),node]);if(key==='angle'||key==='n'){node.classList.add('current-value');node.setAttribute('data-garden-value',key);}});
 }
 const token=(tag:'mi'|'mo'|'mn',text:string):MathNode=>({tag,children:[text]}),num=()=>token('mn','0'),op=(s:string)=>token('mo',s),mi=(s:string)=>token('mi',s);
 const sub=(symbol:string):MathNode=>({tag:'msub',children:[mi(symbol),mi('n')]});
 makeMath([sub('θ'),op('≈'),num(),op('×'),num(),op('×'),{tag:'mfrac',children:[mi('π'),token('mn','180')]}],['n','angle']);
 makeMath([sub('r'),op('≈'),num(),op('×'),{tag:'msqrt',children:[num()]}],['c','n']);
 for(const axis of ['x','y'])makeMath([sub(axis),op('≈'),num(),op('×'),mi(axis==='x'?'cos':'sin'),op('('),num(),op(')')],['r','theta']);
 const stepButtons=lessons.map(([title],i)=>{const b=document.createElement('button');b.textContent=`${i+1}. ${title}`;b.dataset.gardenStep=String(i+1);b.onclick=()=>{if(!lesson)return;lesson.progress=switchGardenLesson(lesson.progress,(i+1) as GardenLessonStage,lesson.settings);refresh();};$('.garden-steps').append(b);return b;});
 const presetButtons=gardenPresets.map(p=>{const b=document.createElement('button');b.textContent=p.label;b.dataset.gardenPreset=p.id;b.onclick=()=>changeAngle(p.angle);$('.garden-presets').append(b);return{p,b};});
 function invalidate(){if(!disposed&&!document.hidden&&raf===null)raf=requestAnimationFrame(frame);}
 function fit(){
  const w=stage.clientWidth,h=stage.clientHeight;if(!w||!h)return;
  const dpr=Math.min(devicePixelRatio,2,1600/w,1600/h);
  if(width!==w||height!==h||renderer.getPixelRatio()!==dpr){
   // Windows WebKit can blank a reused drawing buffer after resizing. Keep CPU
   // geometry, release the old GPU context, then allocate the requested resolution.
   if(width){geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();renderer=makeRenderer();}
   renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);width=w;height=h;
  }
  const extent=gardenExtent(effectiveSettings().total),aspect=w/h;
  camera.left=-extent*Math.max(1,aspect);camera.right=-camera.left;camera.top=extent/Math.min(1,aspect);camera.bottom=-camera.top;camera.updateProjectionMatrix();
  material.uniforms.diameter.value=Math.min(24,Math.max(4,4*GARDEN_DOT_RADIUS*Math.min(w,h)/(2*extent)))*dpr;
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);invalidate();
 }
 function rebuild(){
  const effective=effectiveSettings(),positions=sampleGarden(effective),colors=new Float32Array(effective.total*3);
  const palette=['#ffd778','#faab6d','#f27c90','#d66bca','#9979ec','#79cfe8'].map(c=>new THREE.Color(c)),color=new THREE.Color();
  for(let n=0;n<effective.total;n++){const s=n/Math.max(1,effective.total-1)*(palette.length-1),i=Math.min(palette.length-2,Math.floor(s));color.copy(palette[i]).lerp(palette[i+1],s-i);colors.set([color.r,color.g,color.b],n*3);}
  geometry.dispose();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));lastN=-2;
 }
 function sync(){
  const active=currentSettings(),playback=currentState(),complete=playback.mode==='complete';
  const play=$<HTMLButtonElement>('#garden-play');play.textContent=complete?(lesson&&gardenLessonProgress(lesson.progress).completion==='limit'?'上限に到達':'描画完了'):playback.mode==='drawing'?'一時停止':'再生';play.disabled=complete;play.setAttribute('aria-pressed',String(playback.mode!=='drawing'));
  $<HTMLButtonElement>('#garden-next').disabled=playback.mode==='drawing'||complete;
  $<HTMLInputElement>('#garden-angle').value=String(active.angle);$('#garden-angle-value').textContent=active.angle===GOLDEN_ANGLE?'137.507764050…°（黄金角）':`${fmt(active.angle,9)}°`;
  if(document.activeElement!==angleNumber)angleNumber.value=String(active.angle);
  for(const key of ['total','rate'] as const){const slider=$<HTMLInputElement>(`#garden-${key}`);slider.value=String(effectiveSettings()[key]);slider.disabled=!!lesson&&lesson.progress.stage<4;$(`#garden-${key}-value`).textContent=String(effectiveSettings()[key]);}
  presetButtons.forEach(({p,b})=>b.setAttribute('aria-pressed',String(active.angle===p.angle)));
  $('#garden-pattern').textContent=active.angle===120?'120°では360/120=3。同じ3方向に点が並びます。多いと重なって線状に見えますが、接続線は描いていません。':active.angle===90?'90°では360/90=4。同じ4方向に点が並びます。多いと重なって線状に見えますが、接続線は描いていません。':active.angle===GOLDEN_ANGLE?'黄金角では同じ方向に重なりにくく、隙間を埋めるような配置が現れます。':'小さな角度の違いで、方向の重なり方や見える螺旋が変わります。';
  $('#garden-lesson').textContent=lesson?'作品へ戻る':'置き方を見る';$('#garden-lesson').setAttribute('aria-expanded',String(!!lesson));$('#garden-lesson-panel').hidden=!lesson;
  stepButtons.forEach((b,i)=>b.setAttribute('aria-pressed',String(lesson?.progress.stage===i+1)));
  $('#garden-context').textContent=lesson?`教材 ${lesson.progress.stage} · ${lessons[lesson.progress.stage-1][0]}`:'中心から外へ、番号の順に。';
  $('#garden-explanation').textContent=lesson?lessons[lesson.progress.stage-1][1]:'ひと粒ごとにαだけ回り、半径c√nの位置に置きます。';
  stage.dataset.completion=lesson?gardenLessonProgress(lesson.progress).completion??'':'';stage.dataset.mode=playback.mode;stage.dataset.lesson=lesson?String(lesson.progress.stage):'';stage.dataset.angle=String(active.angle);stage.dataset.total=String(effectiveSettings().total);
 }
 function refresh(){previous=null;rebuild();sync();fit();invalidate();}
 function changeAngle(value:number,preserveTyping=false){
  if(!Number.isFinite(value)||value<0||value>360){angleNumber.setAttribute('aria-invalid','true');$('#garden-error').hidden=false;return;}
  angleNumber.removeAttribute('aria-invalid');$('#garden-error').hidden=true;if(!preserveTyping)angleNumber.value=String(value);
  if(lesson)lesson.settings={...lesson.settings,angle:value};else settings={...settings,angle:value};refresh();
 }
 $<HTMLInputElement>('#garden-angle').oninput=event=>changeAngle((event.target as HTMLInputElement).valueAsNumber);
 // Fine keyboard steps on a range that can also represent the unrounded golden angle.
 $('#garden-angle').onkeydown=event=>{if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'].includes(event.key)){event.preventDefault();changeAngle(THREE.MathUtils.clamp(currentSettings().angle+(['ArrowLeft','ArrowDown'].includes(event.key)?-.001:.001),0,360));}};
 angleNumber.oninput=()=>changeAngle(angleNumber.valueAsNumber,true);
 angleNumber.onblur=()=>{angleNumber.value=String(currentSettings().angle);angleNumber.removeAttribute('aria-invalid');$('#garden-error').hidden=true;};
 $('#garden-angle-minus').onclick=()=>changeAngle(Math.max(0,currentSettings().angle-.01));$('#garden-angle-plus').onclick=()=>changeAngle(Math.min(360,currentSettings().angle+.01));
 for(const key of ['total','rate'] as const)$<HTMLInputElement>(`#garden-${key}`).oninput=event=>{
  const value=(event.target as HTMLInputElement).valueAsNumber;if(!Number.isFinite(value)||!Number.isInteger(value))return;
  if(key==='total'&&(value<1||value>MAX_GARDEN_POINTS)||key==='rate'&&(value<1||value>600))return;
  if(lesson)lesson.settings={...lesson.settings,[key]:value};else settings={...settings,[key]:value};
  if(key==='total'){if(lesson)lesson.progress=resizeGardenLesson(lesson.progress,lesson.settings);else state=resizeGarden(state,settings.total);refresh();}else{previous=null;sync();invalidate();}
 };
 $('#garden-play').onclick=()=>{setState({...currentState(),mode:currentState().mode==='drawing'?'paused':'drawing'});previous=null;sync();invalidate();};
 $('#garden-restart').onclick=()=>{setState(restartGarden(currentState(),motion.matches));previous=null;sync();invalidate();};
 $('#garden-next').onclick=()=>{setState(addGardenPoint(currentState(),effectiveSettings().total));previous=null;sync();invalidate();};
 $('#garden-complete').onclick=()=>{setState({progress:effectiveSettings().total,mode:'complete'},true);previous=null;sync();invalidate();};
 function toggleLesson(){
  const restore=lesson&&($('#garden-lesson-panel').contains(document.activeElement)||$('#garden-caption').contains(document.activeElement)||(!lesson.mathOpen&&math.contains(document.activeElement)&&document.activeElement!==math.querySelector('summary')));
  if(lesson){math.open=lesson.mathOpen;lesson=null;}else{lesson={progress:createGardenLesson(settings),settings:{...settings},mathOpen:math.open};math.open=true;}
  angleNumber.value=String(currentSettings().angle);angleNumber.removeAttribute('aria-invalid');$('#garden-error').hidden=true;refresh();if(restore)$('#garden-lesson').focus({preventScroll:true});
 }
 $('#garden-lesson').onclick=toggleLesson;
 $('#garden-jump').onclick=()=>{stage.scrollIntoView({block:'start',behavior:'instant'});stage.focus({preventScroll:true});};
 window.addEventListener('keydown',event=>{if(event.key==='Escape'&&lesson)toggleLesson();},{signal:lifecycle.signal});
 document.addEventListener('visibilitychange',()=>{previous=null;if(document.hidden&&raf!==null){cancelAnimationFrame(raf);raf=null;}else{fit();invalidate();}},{signal:lifecycle.signal});
 function scheduleResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!disposed&&!document.hidden)fit();},120);}
 window.addEventListener('resize',scheduleResize,{signal:lifecycle.signal});
 motion.addEventListener('change',event=>{if(event.matches){if(state.mode==='drawing')state={...state,mode:'paused'};if(lesson)lesson.progress=pauseGardenLesson(lesson.progress);previous=null;sync();invalidate();}},{signal:lifecycle.signal});
 const resize=new ResizeObserver(scheduleResize);resize.observe(stage);
 function guides(count:number){
  if(!lesson){if(svg.childNodes.length)svg.replaceChildren();return;}svg.replaceChildren();if(count===0)return;
  const extent=gardenExtent(effectiveSettings().total),scale=Math.min(width,height)/(2*extent),point=(n:number)=>gardenPoint(n,currentSettings().angle);
  const xy=(p:{x:number;y:number})=>[width/2+p.x*scale,height/2-p.y*scale];
  function el(tag:string,attrs:Record<string,string|number>,text?:string,parent:Element=svg){const node=document.createElementNS(svg.namespaceURI,tag);for(const[key,value]of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=text;parent.append(node);return node;}
  const n=count-1,p=point(n),[x,y]=xy(p),cx=width/2,cy=height/2;
  el('circle',{cx:x,cy:y,r:material.uniforms.diameter.value/renderer.getPixelRatio()/4+3,class:'garden-selected'});
  if(lesson.progress.stage===1){for(let i=0;i<count;i++){const[a,b]=xy(point(i));el('text',{x:a+7,y:b-7},String(i));}}
  if(lesson.progress.stage===2&&n>0){
   const old=point(n-1),[a,b]=xy(n===1?{x:p.r,y:0}:old);el('line',{x1:cx,y1:cy,x2:a,y2:b,class:'garden-previous'});el('line',{x1:cx,y1:cy,x2:x,y2:y,class:'garden-radius'});
   const radius=Math.max(p.r*.45,GARDEN_SPACING*.4),segments=Math.max(1,Math.ceil(currentSettings().angle/5)),path=[];
   for(let i=0;i<=segments;i++){const theta=old.theta+(p.theta-old.theta)*i/segments,[u,v]=xy({x:radius*Math.cos(theta),y:radius*Math.sin(theta)});path.push(`${i?'L':'M'}${u},${v}`);}
   const defs=el('defs',{}),marker=el('marker',{id:'garden-turn-arrow',viewBox:'0 0 8 8',refX:7,refY:4,markerWidth:5,markerHeight:5,orient:'auto'},undefined,defs);el('path',{d:'M0,0 L8,4 L0,8 Z',fill:'#67e8f9'},undefined,marker);
   el('path',{d:path.join(' '),class:'garden-arc',...(currentSettings().angle>0?{'marker-end':'url(#garden-turn-arrow)'}:{})});el('text',{x:12,y:46},`α ≈ ${fmt(currentSettings().angle)}° · 反時計回り`);
   if(n===1)el('text',{x:12,y:66},'点0は中心。向きはないため、θ₀=0を基準にします。');
  }
  if(lesson.progress.stage===2&&n===0)el('text',{x:12,y:46},'点0は中心。1点追加して角度を見ます。');
  if(lesson.progress.stage===3){el('line',{x1:cx,y1:cy,x2:x,y2:y,class:'garden-radius'});el('text',{x:12,y:46},`中心 → 点${n}：r = ${GARDEN_SPACING}√${n} ≈ ${fmt(p.r)}`);}
 }
 function updateValues(count:number){
  const n=count-1,p=n>=0?gardenPoint(n,currentSettings().angle):null;
  for(const[key,nodes]of slots){const value=key==='angle'?fmt(currentSettings().angle,9):key==='c'?String(GARDEN_SPACING):p?fmt(p[key as 'n'|'r'|'theta']):'—';for(const node of nodes)node.textContent=value;}
  $('#garden-current').textContent=p?`現在最後に置いた点 n=${n}（番号は0から）`:'0点 · 次は中心のn=0です。';
  $('#garden-coordinates').textContent=p?`θₙ ≈ ${fmt(p.theta)} rad、rₙ ≈ ${fmt(p.r)}、xₙ ≈ ${fmt(p.x)}、yₙ ≈ ${fmt(p.y)}`:'まだ点を置いていません。';
 }
 function frame(now:number){
  raf=null;if(disposed||document.hidden){previous=null;return;}
  const playback=currentState(),next=advanceGarden(playback,previous===null?0:Math.min((now-previous)/1000,.1),effectiveSettings());setState(next);previous=now;
  if(next.mode!==playback.mode)sync();
  const count=visibleGardenPoints(next);geometry.setDrawRange(0,count);stage.dataset.count=String(count);$('#garden-progress').textContent=`${count} / ${effectiveSettings().total} 点${lesson?' · 教材':''}${next.mode==='paused'?' · 停止中':''}`;
  if(count!==lastN){updateValues(count);lastN=count;}guides(count);renderer.render(scene,camera);
  if(next.mode==='drawing')invalidate();
 }
 refresh();
 return()=>{disposed=true;if(raf!==null)cancelAnimationFrame(raf);resize.disconnect();clearTimeout(resizeTimer);lifecycle.abort();geometry.dispose();material.dispose();renderer.dispose();renderer.forceContextLoss();root.replaceChildren();};
}
