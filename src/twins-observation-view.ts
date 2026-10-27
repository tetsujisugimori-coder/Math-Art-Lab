import {complexToScreen,defaultView,formatComplex,formatTwinsNumber as fmt,panView,parseTwinsNumber,zoomView,type Plane,type TwinsState} from './twins';
import {advanceObservation,beginObservation,clipOrbitSegment,ObservationClock,plotPoint,TRAIL_POINTS} from './twins-observation';

const examples=[
 {id:'return',kind:'mandelbrot',c:{re:-1,im:0},seed:{re:0,im:0},label:'往復：左・c=−1、z₀=0',description:'この例は手計算で0→−1→0と確認できます。一般の周期性を短い観察だけで断定はしません。'},
 {id:'toward',kind:'julia',c:{re:0,im:0},seed:{re:.5,im:0},label:'0へ近づく：右・c=0、z₀=0.5',description:'この例では実数0.5を繰り返し二乗します。小さな値での倍精度の限界にも注意します。'},
 {id:'escape',kind:'mandelbrot',c:{re:1,im:0},seed:{re:0,im:0},label:'外へ：左・c=1、z₀=0',description:'0→1→2→5。n=3でR=2を超えることと、図の枠を出ることは別の判定です。'},
] as const;

export function mountTwinsObservation(root:HTMLElement,toggle:HTMLButtonElement,options:{getState:()=>TwinsState;apply:(state:TwinsState)=>boolean;highlight:(id:'c'|'seed'|'square')=>void;onOpen:()=>void;markSide:(kind:Plane|null)=>void}){
 const lifecycle=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 let opened=false,disposed=false,kind:Plane='mandelbrot',view=defaultView('julia'),key='',selected:string|null=null;
 const initial=()=>{const s=options.getState();return beginObservation(kind,s.c,s.seed,s.iterations);};
 let observation=initial();
 root.hidden=true;root.className='twins-observation';
 root.innerHTML=`<h2>点の足跡を観察する</h2><p>同じ式でも、cや出発点が違うと足跡が変わります。上の左右の図で点を選ぶか、観察側と例を選んでください。</p>
 <div class="obs-sides" role="group" aria-label="観察する側"><button data-obs-side="mandelbrot" aria-pressed="true">左から観察：cを選び、0から</button><button data-obs-side="julia" aria-pressed="false">右から観察：固定c、選んだz₀から</button></div>
 <label for="twins-observation-example">教材プリセット<select id="twins-observation-example"><option value="">例を選ぶ（自動再生しません）</option>${examples.map(p=>`<option value="${p.id}">${p.label}</option>`).join('')}</select></label><p id="twins-observation-example-note"></p>
 <div class="obs-layout"><div><h3 id="twins-observation-title"></h3><p>足跡専用のz平面です。上の左画像はcの平面なので、zの足跡を重ねません。左右の画像や選択点は保持します。</p>
 <div id="twins-observation-plot" tabindex="0" role="region" aria-label="足跡のz平面。矢印で移動、プラス・マイナスで拡大縮小、Homeで範囲を戻す"><svg viewBox="0 0 500 360" role="img" aria-label="計算済みの点を直線で結ぶ足跡"></svg></div>
 <div class="view-actions"><button data-obs-view="in">足跡を拡大</button><button data-obs-view="out">足跡を縮小</button><button data-obs-view="reset">足跡の表示範囲を戻す</button></div><p id="twins-observation-range"></p>
 <p class="obs-legend">□ 出発点 z₀ ／ ○ 過去の点 ／ ◆ 現在の点 zₙ。細い直線は計算順の接続です。連続時間の運動や補間曲線ではありません。</p><p id="twins-observation-omission"></p></div>
 <div class="obs-readout"><div id="twins-observation-values" aria-live="off"></div><div class="obs-equation"><button data-obs-symbol="square">zₙ₊₁ = zₙ²</button> + <button data-obs-symbol="c">c</button><p id="twins-observation-calculation" aria-live="off"></p></div>
 <p id="twins-observation-status" aria-live="off"></p><p id="twins-observation-visibility" aria-live="off"></p>
 <div class="view-actions"><button id="twins-observation-step">1回進める</button><button id="twins-observation-play">自動再生</button><button id="twins-observation-reset">最初に戻す（n=0）</button></div>
 <p>再生は1秒に1回（動きを減らす設定では2秒）。勝手には開始しません。停止後は手動で続けられます。上限は設定のNと共通です。</p>
 <form id="twins-observation-seed" novalidate><h3>右の出発点を数値で選ぶ</h3><label for="twins-seed-real">z₀の実部（−16〜16）<input id="twins-seed-real" type="number" step="any" min="-16" max="16" required></label><label for="twins-seed-imaginary">z₀の虚部（−16〜16）<input id="twins-seed-imaginary" type="number" step="any" min="-16" max="16" required></label><button>出発点を適用して右から観察</button><p>入力中は候補です。cは下の既存設定欄で変更できます。適用成功時だけn=0に戻ります。</p></form>
 </div></div><p id="twins-observation-notice" role="status" aria-atomic="true"></p>
 <p>値は約値です。倍精度の丸め、有限反復、有限画面の限界があり、未観測・点の重なりから集合所属や周期・収束を証明しません。検出できる積のアンダーフローや非有限値では計算停止として区別します。</p><button id="twins-observation-close">観察を閉じる</button>`;
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>(id)!;
 const clock=new ObservationClock(()=>{advance(false);return observation.status==='observing'&&opened&&!disposed;});
 function announce(message:string){$('#twins-observation-notice').textContent=message;}
 function signature(){const s=options.getState();return JSON.stringify([kind,s.c,s.seed,s.iterations]);}
 function restart(){clock.stop();observation=initial();key=signature();$<HTMLSelectElement>('#twins-observation-example').value='';$('#twins-observation-example-note').textContent='';const s=options.getState();$<HTMLInputElement>('#twins-seed-real').value=String(s.seed.re);$<HTMLInputElement>('#twins-seed-imaginary').value=String(s.seed.im);render();}
 function select(side:Plane){kind=side;if(opened){restart();announce(`${side==='mandelbrot'?'左':'右'}を観察します。n=0へ戻しました。`);}}
 function advance(manual:boolean){if(!opened||disposed)return;observation=advanceObservation(observation);if(observation.status!=='observing')clock.stop();render();if(manual||observation.status!=='observing')announce(`n=${observation.n}。${$('#twins-observation-status').textContent}`);}
 function render(){
  if(disposed||!opened)return;
  const o=observation;
  root.dataset.n=String(o.n);root.dataset.kind=kind;root.dataset.status=o.status;root.dataset.running=String(clock.running);root.dataset.z=JSON.stringify(o.z);root.dataset.c=JSON.stringify(o.c);root.dataset.seed=JSON.stringify(o.seed);
  options.markSide(kind);root.querySelectorAll<HTMLButtonElement>('[data-obs-side]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.obsSide===kind)));
  root.querySelectorAll<HTMLButtonElement>('[data-obs-symbol]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.obsSymbol===selected)));
  $('#twins-observation-title').textContent=`観察中の側：${kind==='mandelbrot'?'左 Mandelbrot（選ぶのはc／出発点0）':'右 Julia（c固定／選ぶのはz₀）'}`;
  $('#twins-observation-values').textContent=`c ≈ ${formatComplex(o.c)} ／ 出発点 z₀ ≈ ${formatComplex(o.seed)} ／ n = ${o.n} ／ 現在 zₙ ≈ ${formatComplex(o.z)} ／ N=${o.limit} ／ R≈${fmt(o.radius)}`;
  $('#twins-observation-calculation').textContent=o.previous?`直近の計算：z(${o.n}) ≈ (${formatComplex(o.previous)})² + (${formatComplex(o.c)}) ≈ ${formatComplex(o.z)}`:'n=0：まだ反復計算していません。現在の点は出発点です。';
  $('#twins-observation-status').textContent=o.status==='escaped'?`発散を確認：n=${o.n}で |zₙ|>R（数値計算による判定）。`:o.status==='limit'?`設定回数N=${o.limit}まで発散を確認できず。集合への所属は未証明です。`:o.status==='observing'?'観察中：ここまで閾値超過なし。以後の発散は否定できません。':o.message;
  const current=plotPoint(view,o.z,500/360);
  $('#twins-observation-visibility').textContent=current?'現在の点は表示範囲内です。':'現在の点は表示範囲外です。枠外と発散判定は別です。端に点を置き換えていません。';
  const omitted=Math.max(0,o.n+1-o.points.length);
  $('#twins-observation-omission').textContent=`足跡：直近${o.points.length}点（最大${TRAIL_POINTS}点）。${omitted?`最初の${omitted}点の履歴を省略しています。出発点の□は別に残します。`:'履歴の省略なし。'}重なった点でもnと直近の計算で進行を確認できます。`;
  const a=complexToScreen(view,{re:0,im:0},500/360),svg=$('#twins-observation-plot').querySelector('svg')!;
  const xy=(p:{u:number;v:number})=>({x:+(p.u*500).toFixed(4),y:+(p.v*360).toFixed(4)});
  const parts=['<rect width="500" height="360" fill="#080f20"/>'];
  if(a.u>=0&&a.u<=1)parts.push(`<line class="obs-axis" x1="${a.u*500}" x2="${a.u*500}" y1="0" y2="360"/>`);
  if(a.v>=0&&a.v<=1)parts.push(`<line class="obs-axis" x1="0" x2="500" y1="${a.v*360}" y2="${a.v*360}"/>`);
  parts.push('<text x="10" y="22">↑ Im z</text><text x="490" y="22" text-anchor="end">Re z →</text>');
  if(a.u>=0&&a.u<=1&&a.v>=0&&a.v<=1)parts.push(`<text text-anchor="end" x="${Math.max(65,a.u*500-12)}" y="${Math.min(335,a.v*360+30)}">O (0)</text>`);
  for(let i=1;i<o.points.length;i++){const segment=clipOrbitSegment(view,o.points[i-1].z,o.points[i].z,500/360);if(segment){const p=xy(segment[0]),q=xy(segment[1]);parts.push(`<line class="obs-segment" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`);}}
  for(const entry of o.points.slice(0,-1)){const p=plotPoint(view,entry.z,500/360);if(p){const {x,y}=xy(p);parts.push(`<circle class="obs-past" cx="${x}" cy="${y}" r="3"/>`);}}
  const start=plotPoint(view,o.seed,500/360);if(start){const {x,y}=xy(start);parts.push(`<rect class="obs-start" x="${x-10}" y="${y-10}" width="20" height="20"/><text x="${Math.min(440,Math.max(6,x+14))}" y="${Math.min(345,Math.max(38,y+30))}">z₀</text>`);}
  if(current){const {x,y}=xy(current);parts.push(`<path class="obs-current" d="M${x} ${y-8}L${x+8} ${y}L${x} ${y+8}L${x-8} ${y}Z"/><text class="obs-current-label" x="${Math.min(410,Math.max(6,x+14))}" y="${Math.min(335,Math.max(42,y-16))}">z(${o.n})</text>`);}
  svg.innerHTML=parts.join('');svg.setAttribute('aria-label',`z平面の足跡。n=${o.n}、現在z≈${formatComplex(o.z)}。${current?'範囲内':'範囲外'}。`);
  $('#twins-observation-plot').classList.toggle('twins-selected',selected==='square');
  $('#twins-observation-range').textContent=`足跡の中心 ≈ ${formatComplex(view.center)} ／ 横幅 ${fmt(view.span)}。枠外の線分はクリップし、点は描きません。`;
  $<HTMLButtonElement>('#twins-observation-step').disabled=clock.running||o.status!=='observing';
  $<HTMLButtonElement>('#twins-observation-play').disabled=o.status!=='observing';$('#twins-observation-play').textContent=clock.running?'停止':'自動再生';
 }
 function close(){clock.stop();root.dataset.running='false';opened=false;root.hidden=true;toggle.textContent='点の足跡を観察する';toggle.setAttribute('aria-expanded','false');options.markSide(null);}
 toggle.onclick=()=>{if(opened){close();return;}options.onOpen();opened=true;root.hidden=false;toggle.textContent='観察を終了して通常表示へ';toggle.setAttribute('aria-expanded','true');view=defaultView('julia');restart();$('#twins-observation-step').focus({preventScroll:true});};
 toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls',root.id);
 $('#twins-observation-close').onclick=()=>{close();toggle.focus({preventScroll:true});};
 $('#twins-observation-step').onclick=()=>advance(true);
 $('#twins-observation-reset').onclick=()=>{restart();announce('cと出発点を保持してn=0へ戻しました。');};
 $('#twins-observation-play').onclick=()=>{if(clock.running){clock.stop();render();announce(`n=${observation.n}で停止しました。`);}else{clock.start(motion.matches?2000:1000);render();announce('自動再生を開始しました。途中の読み上げ通知は行いません。');}};
 root.querySelectorAll<HTMLButtonElement>('[data-obs-side]').forEach(b=>b.onclick=()=>select(b.dataset.obsSide as Plane));
 root.querySelectorAll<HTMLButtonElement>('[data-obs-symbol]').forEach(b=>b.onclick=()=>options.highlight(b.dataset.obsSymbol as 'square'|'c'));
 $<HTMLSelectElement>('#twins-observation-example').onchange=event=>{const p=examples.find(p=>p.id===(event.target as HTMLSelectElement).value);if(!p)return;if(options.apply({...options.getState(),c:{...p.c},seed:{...p.seed}})){kind=p.kind;view=defaultView('julia');restart();$<HTMLSelectElement>('#twins-observation-example').value=p.id;$('#twins-observation-example-note').textContent=`${p.label}。${p.description}`;announce('例を適用しました。停止中、n=0です。');}};
 $<HTMLFormElement>('#twins-observation-seed').onsubmit=event=>{event.preventDefault();try{const seed={re:parseTwinsNumber($<HTMLInputElement>('#twins-seed-real').value),im:parseTwinsNumber($<HTMLInputElement>('#twins-seed-imaginary').value)};if(options.apply({...options.getState(),seed})){select('julia');announce('cを保持し、右の出発点を適用しました。');}else announce('出発点は未適用です。実部・虚部は−16〜16です。');}catch(error){announce(`未適用です。${(error as Error).message}`);}};
 function move(key:string){try{view=key==='Home'?defaultView('julia'):key==='+'||key==='-'?zoomView(view,key==='+'?2:.5,.5,.5,500/360):panView(view,key==='ArrowLeft'?50:key==='ArrowRight'?-50:0,key==='ArrowUp'?-50:key==='ArrowDown'?50:0,500);render();}catch(error){announce((error as Error).message);}}
 root.querySelectorAll<HTMLButtonElement>('[data-obs-view]').forEach(b=>b.onclick=()=>move(b.dataset.obsView==='reset'?'Home':b.dataset.obsView==='in'?'+':'-'));
 $('#twins-observation-plot').addEventListener('keydown',event=>{if(['Home','+','-','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();move(event.key);}},{signal:lifecycle.signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clock.stop();render();}},{signal:lifecycle.signal});
 motion.addEventListener('change',()=>{clock.stop();render();if(opened)announce('動きの設定が変わったため停止しました。');},{signal:lifecycle.signal});
 return{get isOpen(){return opened;},select,restart,close,sync(symbol:string|null){selected=symbol;if(!opened)return;if(key!==signature())restart();else render();},dispose(){clock.stop();disposed=true;lifecycle.abort();toggle.onclick=null;root.replaceChildren();}};
}
