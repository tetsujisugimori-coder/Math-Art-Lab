import {BASE_SPAN,complexToScreen,defaultView,escapeRadius,formatComplex,formatTwinsNumber as fmt,magnitude,orbit,panView,rasterSize,screenToComplex,twinsDefaults,twinsPresets,validateTwins,zoomView,type Plane,type PlaneView,type TwinsState} from './twins';
import {LatestRenderGate,type RenderRequest,type RenderResult} from './twins-render';
import './twins.css';
import {TwinsGesture} from './twins-gesture';
import {parseTwinsNumber} from './twins';

const kinds:Plane[]=['mandelbrot','julia'];
const titles:Record<Plane,string>={mandelbrot:'マンデルブロ集合',julia:'ジュリア集合'};
const symbolDescriptions={
 c:'cは左のパラメータ平面の一点。左では画素ごとに変え、右ではこの値を固定します。右の計算は同じcを使います。',
 seed:'z₀は反復の出発点。左は0に固定、右は画素ごとに変えます。右の丸いマーカーは数列を調べるために選んだz₀です。',
 square:'(a+bi)²=(a²−b²)+2abi。絶対値を二乗し、偏角を2倍にしてからcを加える操作を繰り返します。',
 iterations:'Nは最大反復回数。増やすと遅く発散する点をさらに調べられますが、有限回での未観測は所属の証明ではありません。',
 radius:'|zₙ|>Rなら発散と判定します。左はz₀=0に対してR=2、右は任意の許容cに安全なR=max(2,|c|+1)です。',
} as const;
type SymbolId=keyof typeof symbolDescriptions;
const lessons=[
 ['複素数の世界','横は実部、縦は虚部（画面では上が正）。a+biという一点が複素数を表します。左の十字はc、右の丸は調べるz₀。左を選ぶと同じcが右の計算条件へ渡ります。'],
 ['反復計算','zₙ₊₁=zₙ²+cを1回ずつ適用します。ここではc=−1、調べるz₀=0で、0→−1→0→−1を確認できます。左はcの平面なので、zの軌道線は重ねず下の数列表で示します。'],
 ['発散と境界','例c=1ではz₀=0から0→1→2→5となり、n=3で|z|>2を観測します。反復が遅く発散する点はNを増やすと分類が変わることがあります。暗い画素はNまで発散未観測で、内部と確定した印ではありません。'],
 ['二つの集合の関係','同じ二乗と加算でも、左はz₀=0を固定してcを変え、右はcを固定してz₀を変えます。二乗が絶対値と向きを変え、逆像が繰り返し分かれることで細部が生まれます。左を選んで右を比較してください。右は充填集合Kcとその境界の近似を表示し、ジュリア集合JcはKcの境界です。'],
] as const;
type Panel={kind:Plane;stage:HTMLElement;canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;worker:Worker;gate:LatestRenderGate;key:string;width:number;height:number;requested:RenderRequest|null;started:number};

export function mountTwins(root:HTMLElement):()=>void{
 const lifecycle=new AbortController();let state=twinsDefaults(),selected:SymbolId|null=null,steps=3,disposed=false;
 let saved:{state:TwinsState;selected:SymbolId|null;steps:number}|null=null;
 let resizeTimer:ReturnType<typeof setTimeout>|undefined;
 const gestures:TwinsGesture[]=[];
 const selectionHint=(kind:Plane)=>kind==='mandelbrot'?'表示範囲と選択範囲は異なります。cは実部・虚部とも−4〜4（境界を含む）を選択できます。':'調べるz₀は実部・虚部とも−16〜16を選択できます。';
 const planeMarkup=(kind:Plane)=>`<article class="twins-plane" data-plane="${kind}"><h2>${kind==='mandelbrot'?'左 · ':'右 · '}${titles[kind]}</h2>
 <p>${kind==='mandelbrot'?'cのパラメータ平面 · z₀=0':'z₀の出発点の平面 · cは左と共通'}</p>
 <output id="twins-${kind}-condition" class="twins-condition"></output>
 <div id="twins-${kind}-stage" class="twins-stage" tabindex="0" role="region" aria-describedby="twins-${kind}-selection" aria-label="${titles[kind]}。矢印で移動、Enterで中央を選択、プラスとマイナスで拡大縮小">
 <canvas aria-label="${titles[kind]}の有限反復画像"></canvas><svg class="twins-overlay" aria-hidden="true"><line data-axis="horizontal"/><line data-axis="vertical"/><g class="twins-marker"><circle r="7"/><path d="M-12 0H12M0-12V12"/><text x="13" y="-10">${kind==='mandelbrot'?'c':'z₀'}</text></g><text class="twins-axis-real" y="20" text-anchor="end">Re ${kind==='mandelbrot'?'c':'z₀'} →</text><text x="10" y="20">↑ Im ${kind==='mandelbrot'?'c':'z₀'}</text></svg></div>
 <p id="twins-${kind}-selection" class="twins-selection" role="status" aria-atomic="true">${selectionHint(kind)}</p>
 <p id="twins-${kind}-status" class="twins-status" role="status"></p><output id="twins-${kind}-range"></output>
 <div class="view-actions"><button data-view="${kind}" data-action="in">拡大</button><button data-view="${kind}" data-action="out">縮小</button><button data-view="${kind}" data-action="reset">表示範囲をリセット</button></div></article>`;
 root.innerHTML=`<main class="twins"><header><small>MATH ART LAB / EXPERIMENT 006</small><h1>フラクタルの双子</h1><p>一つの式、二つの世界。<br>Mandelbrot × Julia</p></header>
 <p class="twins-intro">左の十字cをクリック・タップすると、右がそのcで変わります。右を選ぶと調べる出発点z₀を変更します。</p>
 <div class="twins-panels">${kinds.map(planeMarkup).join('')}</div>
 <p class="stage-hint">図の中をドラッグで移動、ホイール・2本指ピンチでその位置を拡大。タッチ1本指の移動と、クリック・タップでの選択は区別します。図にフォーカスして矢印で移動、Enterで中央を選択、+/−で拡大縮小。図の外は通常スクロールできます。</p>
 <p class="twins-legend"><span class="twins-swatch"></span>暗色：N回まで発散未観測。所属や内部の証明ではありません。明色：閾値を超えた反復回数（32回周期の配色）。色だけでなく数列表と判定も確認してください。</p>
 <div class="twins-controls"><aside aria-label="フラクタルの双子の設定"><h2>同じcで比べる</h2><label for="twins-preset">プリセット<select id="twins-preset">${twinsPresets.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}<option value="custom" disabled>カスタム</option></select></label><p id="twins-preset-description"></p>
 <form id="twins-form" novalidate><label for="twins-real">cの実部（−4〜4）<input id="twins-real" type="number" min="-4" max="4" step="any" required></label><label for="twins-imaginary">cの虚部（−4〜4）<input id="twins-imaginary" type="number" min="-4" max="4" step="any" required></label><label for="twins-iterations">最大反復 N（50〜500）<input id="twins-iterations" type="number" min="50" max="500" step="1" required></label><button type="submit">設定を適用</button></form>
 <p class="control-note">入力中の値は候補です。適用成功後に図と式を更新し、不正値は未適用のまま有効な図を保ちます。プリセットはcのみを変え、表示範囲とNを保ちます。</p><button id="twins-defaults">初期設定に戻す</button><p id="twins-error" role="status" hidden></p><button id="twins-lesson-toggle">4段階の教材を開く</button>
 <div id="twins-lesson" hidden><div class="lesson-steps" role="group" aria-label="双子の解説段階">${lessons.map(([title],i)=>`<button data-twins-step="${i}" aria-pressed="false">${i+1}. ${title}</button>`).join('')}</div><p id="twins-lesson-text"></p><p class="control-note">教材中の変更は一時的です。閉じると開始前のc・z₀・N・両表示範囲・反復段階・強調へ戻ります。</p></div></aside>
 <div class="twins-inspector"><h2>数式と適用値</h2><div class="math-scroll" tabindex="0" role="region" aria-label="二次反復式"><math display="block"><mrow><msub><mi>z</mi><mrow><mi>n</mi><mo>+</mo><mn>1</mn></mrow></msub><mo>=</mo><mpadded data-term="square" width="2.5em" lspace=".75em" height="1.4em" depth=".6em"><msup><msub><mi>z</mi><mi>n</mi></msub><mn>2</mn></msup></mpadded><mo>+</mo><mpadded data-term="c" width="2.5em" lspace=".75em" height="1.4em" depth=".6em"><mi>c</mi></mpadded></mrow></math></div>
 <p class="control-note">式のc・z²はクリック／タップでも強調できます。キーボードでは下の記号ボタンをTabで選べます。</p>
 <div class="twins-symbols">${([['c','c · 左の一点'],['seed','z₀ · 出発点'],['square','z² · 二乗'],['iterations','N · 反復上限'],['radius','R · 発散半径']] as const).map(([id,label])=>`<button data-twins-symbol="${id}" aria-pressed="false">${label}</button>`).join('')}</div>
 <output id="twins-applied"></output><p id="twins-guide">記号をホバー・タップ・Tabで選び、式と図の対応を確認します。</p><button id="twins-guide-clear">強調を解除</button>
 <h3>複素数の数列表</h3><p>左：現在のcからz₀=0。右：同じcと選択したz₀。最大16ステップ、閾値を超えたら停止します。</p><button id="twins-orbit-step">1反復進める</button><button id="twins-orbit-reset">数列をz₀へ戻す</button><div id="twins-orbits" class="twins-orbits"></div>
 <p class="control-note">数値表示は丸めた約値、計算は丸め前の倍精度値です。小さい非ゼロ値を0には丸めません。画素の中心を複素数に対応させ、DPRは最大1.5、各辺640画素まで。再計算中は古い画像を消し、最新の確定画像だけを表示します。</p></div></div>
 <details><summary>数学と表示の制約</summary><p>左はz₀=0の軌道に対してR=2を使用します。|c|≤2ならr>2でr²−|c|>r。|c|>2ではz₁=c以降が増大します。右はR=max(2,|c|+1)とし、r>Rなら|z²+c|≥r²−|c|>rが成り立ち、その後も増大します。閾値は厳密な「より大きい」で判定します。</p><p>有限反復で未観測でも、以後の発散を否定できません。右は充填ジュリア集合Kcと境界の近似で、ジュリア集合JcはKcの境界です。c=0の単位円板と単位円は解析的な基準ですが、黒い画素一般の所属は証明しません。倍精度丸め・有限反復・有限画素のため、細部の厳密性や無限精度ズームは保証しません。拡大は本作では最大100万倍までです。</p><p>二乗による半径の二乗・偏角の倍化と、cによる平行移動を何度も合成します。有限の色分けはその観測であり、色は数式そのものの性質ではありません。実機iPhone Safari、スクリーンリーダー、低性能端末・電池・熱・長時間負荷は未検証です。</p><a href="https://pi.math.cornell.edu/~lipa/mec/lesson5.html" target="_blank" rel="noreferrer">Cornell Math Explorers' Club：複素力学系と二つの集合</a></details>
 <footer>左はcを変える。右はz₀を変える。同じ式で、異なる問いを描く。</footer></main>`;
 const $=<T extends HTMLElement=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const panels:Panel[]=[];
 function fail(message:string){$('#twins-error').textContent=`未適用です。${message}`;$('#twins-error').hidden=false;}
 function clearSelectionNotices(){for(const kind of kinds){const notice=$(`#twins-${kind}-selection`);if(notice.classList.contains('twins-rejected')){notice.textContent=selectionHint(kind);notice.classList.remove('twins-rejected');}}}
 function attempt(change:()=>TwinsState,fill=false,reject=fail){try{const next=change();validateTwins(next);state=next;$('#twins-error').hidden=true;clearSelectionNotices();sync(fill);}catch(error){reject((error as Error).message);}}
 try{
  for(const kind of kinds){
   const stage=$(`#twins-${kind}-stage`),canvas=stage.querySelector('canvas')!,ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas 2Dを開始できません。');
   const worker=new Worker(new URL('./twins-worker.ts',import.meta.url),{type:'module'});
   const panel:Panel={kind,stage,canvas,ctx,worker,gate:new LatestRenderGate(),key:'',width:0,height:0,requested:null,started:0};panels.push(panel);
   worker.addEventListener('message',event=>{
    const result=event.data as RenderResult&{type:string;message?:string};
    panel.gate.finish(result.id,()=>{
     if(disposed)return;
     if(result.type!=='done'){panel.stage.dataset.status='error';$(`#twins-${kind}-status`).textContent=`計算を停止しました。${result.message??'再読込して再試行してください。'}`;return;}
     const request=panel.requested!;
     if(result.width!==request.width||result.height!==request.height||result.buffer.byteLength!==result.width*result.height*4){panel.stage.dataset.status='error';$(`#twins-${kind}-status`).textContent='描画結果のサイズが一致しません。再読込してください。';return;}
     canvas.width=result.width;canvas.height=result.height;const image=ctx.createImageData(result.width,result.height);image.data.set(new Uint8ClampedArray(result.buffer));ctx.putImageData(image,0,0);
     panel.stage.dataset.status='ready';panel.stage.dataset.render=panel.key;panel.stage.dataset.completedId=String(result.id);
     panel.stage.dataset.computeMs=String(result.elapsedMs);panel.stage.dataset.responseMs=String(performance.now()-panel.started);
     $(`#twins-${kind}-status`).textContent=`確定 · ${result.width}×${result.height}画素 · 計算約${result.elapsedMs.toFixed(1)}ms（この実行の観測値）`;
    });
   },{signal:lifecycle.signal});
   worker.addEventListener('error',()=>{panel.gate.cancel();stage.dataset.status='error';$(`#twins-${kind}-status`).textContent='Workerの計算を開始できません。ブラウザの設定を確認し再読込してください。';},{signal:lifecycle.signal});
  }
 }catch(error){panels.forEach(p=>p.worker.terminate());root.innerHTML='<main class="twins"><h1>フラクタルの双子</h1><p>この環境ではCanvas 2DまたはWeb Workerを開始できません。対応ブラウザで再読込するか上の作品選択を使ってください。</p><p>zₙ₊₁=zₙ²+c。左はz₀=0を固定、右はcを固定します。有限反復は集合の所属の証明ではありません。</p></main>';return()=>{lifecycle.abort();root.replaceChildren();};}

 function overlay(panel:Panel){
  const {kind,stage,width,height}=panel,view=state.views[kind],aspect=width/height,svg=stage.querySelector('svg')!;svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
  const origin=complexToScreen(view,{re:0,im:0},aspect),marker=complexToScreen(view,kind==='mandelbrot'?state.c:state.seed,aspect),group=svg.querySelector<SVGGElement>('.twins-marker')!;
  group.style.display=marker.u<0||marker.u>1||marker.v<0||marker.v>1?'none':'';group.setAttribute('transform',`translate(${marker.u*width},${marker.v*height})`);
  const h=svg.querySelector<SVGLineElement>('[data-axis="horizontal"]')!,v=svg.querySelector<SVGLineElement>('[data-axis="vertical"]')!;
  h.setAttribute('x1','0');h.setAttribute('x2',String(width));h.setAttribute('y1',String(origin.v*height));h.setAttribute('y2',String(origin.v*height));h.style.display=origin.v<0||origin.v>1?'none':'';
  v.setAttribute('x1',String(origin.u*width));v.setAttribute('x2',String(origin.u*width));v.setAttribute('y1','0');v.setAttribute('y2',String(height));v.style.display=origin.u<0||origin.u>1?'none':'';
  svg.querySelector('.twins-axis-real')!.setAttribute('x',String(width-10));
  const a=screenToComplex(view,0,1,aspect),b=screenToComplex(view,1,0,aspect);
  $(`#twins-${kind}-range`).textContent=`表示範囲 Re: ${fmt(a.re)}〜${fmt(b.re)} ／ Im: ${fmt(a.im)}〜${fmt(b.im)} · ${fmt(BASE_SPAN/view.span)}倍${group.style.display==='none'?' · 選択点は範囲外':''}`;
 }
 function request(panel:Panel){
  const {stage,kind}=panel,bounds=panel.canvas.getBoundingClientRect(),w=bounds.width,h=bounds.height;if(!w||!h)return;panel.width=w;panel.height=h;
  const {width,height}=rasterSize(w,h,devicePixelRatio);
  const key=JSON.stringify({kind,c:kind==='julia'?state.c:null,view:state.views[kind],iterations:state.iterations,width,height,aspect:w/h});
  stage.dataset.view=JSON.stringify(state.views[kind]);stage.dataset.c=JSON.stringify(state.c);stage.dataset.seed=JSON.stringify(state.seed);stage.dataset.iterations=String(state.iterations);stage.dataset.target=key;
  overlay(panel);
  if(document.hidden)return;
  if(key===panel.key)return;panel.key=key;
  const id=panel.gate.request(),job:RenderRequest={id,kind,c:{...state.c},view:structuredClone(state.views[kind]),iterations:state.iterations,width,height,aspect:w/h};panel.requested=job;panel.started=performance.now();
  stage.dataset.status='pending';stage.dataset.render='';stage.dataset.requestedId=String(id);panel.canvas.width=width;panel.canvas.height=height;panel.ctx.fillStyle='#060b17';panel.ctx.fillRect(0,0,width,height);
  $(`#twins-${kind}-status`).textContent='計算中 · 古い画像は消去し、最新条件の確定結果を待っています。';panel.worker.postMessage({type:'render',request:job});
 }
 function sync(fill=false){
  if(disposed)return;
  if(fill){$<HTMLInputElement>('#twins-real').value=String(state.c.re);$<HTMLInputElement>('#twins-imaginary').value=String(state.c.im);$<HTMLInputElement>('#twins-iterations').value=String(state.iterations);}
  const preset=twinsPresets.find(p=>p.c.re===state.c.re&&p.c.im===state.c.im);$<HTMLSelectElement>('#twins-preset').value=preset?.id??'custom';$('#twins-preset-description').textContent=preset?.description??`c=${formatComplex(state.c)}。有限反復で比較するカスタム条件です。`;
  for(const panel of panels){
   const kind=panel.kind,radius=escapeRadius(kind,state.c);
   $(`#twins-${kind}-condition`).textContent=`${kind==='mandelbrot'?'各画素=c ／ z₀=0':`各画素=z₀ ／ 固定c≈${formatComplex(state.c)}`} ／ N=${state.iterations} ／ |zₙ|>${fmt(radius)}`;
   panel.stage.classList.toggle('twins-selected',selected==='iterations'||selected==='radius'||selected==='square'||selected==='c'&&kind==='mandelbrot'||selected==='seed'&&kind==='julia');request(panel);
  }
  $('#twins-applied').textContent=`適用中 c ≈ ${formatComplex(state.c)} ／ 左のz₀=0 ／ 右で調べるz₀ ≈ ${formatComplex(state.seed)} ／ N=${state.iterations} ／ R左=2、R右≈${fmt(escapeRadius('julia',state.c))}`;
  $('#twins-guide').textContent=selected?symbolDescriptions[selected]:'記号をホバー・タップ・Tabで選び、式と図の対応を確認します。';
  root.querySelectorAll<HTMLElement>('[data-twins-symbol]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.twinsSymbol===selected)));
  root.querySelectorAll('[data-term]').forEach(el=>el.classList.toggle('twins-selected',el.getAttribute('data-term')===selected));
  const traces=kinds.map(kind=>({kind,...orbit(kind==='mandelbrot'?{re:0,im:0}:state.seed,state.c,kind,steps)}));
  $('#twins-orbits').replaceChildren();
  for(const trace of traces){const card=document.createElement('div'),heading=document.createElement('h4'),list=document.createElement('ol'),result=document.createElement('p');heading.textContent=trace.kind==='mandelbrot'?'左のcから · z₀=0':'右の選択z₀から';
   for(const [i,z] of trace.values.entries()){const li=document.createElement('li');li.textContent=`z(${i}) ≈ ${formatComplex(z)} ／ |z| ≈ ${fmt(magnitude(z))}`;list.append(li);}
   result.textContent=trace.escaped?`n=${trace.values.length-1}で|z|>R：発散を観測`:`n=${trace.values.length-1}まで閾値超過なし（所属は未証明）`;card.dataset.orbit=trace.kind;card.append(heading,list,result);$('#twins-orbits').append(card);
  }
  $<HTMLButtonElement>('#twins-orbit-step').disabled=steps>=16||traces.every(t=>t.escaped);
  root.querySelector('main')!.setAttribute('data-state',JSON.stringify(state));
 }
 function selectSymbol(id:SymbolId|null){selected=id;sync();}
 root.querySelectorAll<HTMLButtonElement>('[data-twins-symbol]').forEach(button=>{const id=button.dataset.twinsSymbol as SymbolId;button.onclick=()=>selectSymbol(id);button.onfocus=()=>selectSymbol(id);button.onpointerenter=()=>{if(matchMedia('(hover:hover)').matches)selectSymbol(id);};});
 root.querySelectorAll('math [data-term]').forEach(term=>term.addEventListener('click',()=>selectSymbol(term.getAttribute('data-term') as SymbolId),{signal:lifecycle.signal}));
 $('#twins-guide-clear').onclick=()=>selectSymbol(null);
 $<HTMLFormElement>('#twins-form').onsubmit=event=>{event.preventDefault();attempt(()=>({...state,c:{re:parseTwinsNumber($<HTMLInputElement>('#twins-real').value),im:parseTwinsNumber($<HTMLInputElement>('#twins-imaginary').value)},iterations:parseTwinsNumber($<HTMLInputElement>('#twins-iterations').value)}),true);};
 $<HTMLSelectElement>('#twins-preset').onchange=event=>{const p=twinsPresets.find(p=>p.id===(event.target as HTMLSelectElement).value);if(p)attempt(()=>({...state,c:{...p.c}}),true);};
 $('#twins-defaults').onclick=()=>{steps=3;selected=null;attempt(twinsDefaults,true);};
 $('#twins-orbit-step').onclick=()=>{steps=Math.min(16,steps+1);sync();};$('#twins-orbit-reset').onclick=()=>{steps=0;sync();};
 function setView(kind:Plane,view:PlaneView){attempt(()=>({...state,views:{...state.views,[kind]:view}}));}
 root.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.onclick=()=>{const kind=button.dataset.view as Plane,panel=panels.find(p=>p.kind===kind)!;try{setView(kind,button.dataset.action==='reset'?defaultView(kind):zoomView(state.views[kind],button.dataset.action==='in'?2:.5,.5,.5,panel.width/panel.height));}catch(error){fail((error as Error).message);}});
 for(const panel of panels){
  const {stage,kind}=panel;
  const position=(x:number,y:number)=>{const r=panel.canvas.getBoundingClientRect();return{u:(x-r.left)/r.width,v:(y-r.top)/r.height};};
  function selectPoint(u:number,v:number){const point=screenToComplex(state.views[kind],u,v,panel.width/panel.height);attempt(()=>kind==='mandelbrot'?{...state,c:point}:{...state,seed:point},true,message=>{const notice=$(`#twins-${kind}-selection`),symbol=kind==='mandelbrot'?'c':'z₀';notice.textContent=`未適用：選択した${symbol}≈${formatComplex(point)}。${message}表示範囲は選択範囲より広く移動できます。適用中の${symbol}≈${formatComplex(kind==='mandelbrot'?state.c:state.seed)}と画像を保持しています。`;notice.classList.add('twins-rejected');});}
  stage.addEventListener('wheel',event=>{event.preventDefault();const p=position(event.clientX,event.clientY);try{setView(kind,zoomView(state.views[kind],event.deltaY<0?1.25:.8,p.u,p.v,panel.width/panel.height));}catch(error){fail((error as Error).message);}},{passive:false,signal:lifecycle.signal});
  stage.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home','Enter'].includes(event.key))return;event.preventDefault();
   if(event.key==='Enter'){selectPoint(.5,.5);return;}
   try{let view=state.views[kind];if(event.key==='Home')view=defaultView(kind);else if(['+','=','-'].includes(event.key))view=zoomView(view,event.key==='-'?.5:2,.5,.5,panel.width/panel.height);else view=panView(view,event.key==='ArrowLeft'?panel.width*.1:event.key==='ArrowRight'?-panel.width*.1:0,event.key==='ArrowUp'?-panel.width*.1:event.key==='ArrowDown'?panel.width*.1:0,panel.width);setView(kind,view);}catch(error){fail((error as Error).message);}
  },{signal:lifecycle.signal});
  const gesture=new TwinsGesture();gestures.push(gesture);
  const bounds=()=>panel.canvas.getBoundingClientRect();
  const point=(event:PointerEvent)=>({x:event.clientX,y:event.clientY});
  stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;stage.focus({preventScroll:true});stage.setPointerCapture(event.pointerId);gesture.down(event.pointerId,point(event),state.views[kind],bounds());},{signal:lifecycle.signal});
  stage.addEventListener('pointermove',event=>{try{const view=gesture.move(event.pointerId,point(event),bounds());if(view)setView(kind,view);}catch(error){fail((error as Error).message);}},{signal:lifecycle.signal});
  stage.addEventListener('pointerup',event=>{const tap=gesture.end(event.pointerId,point(event),state.views[kind],bounds(),true);if(tap){const p=position(tap.x,tap.y);selectPoint(p.u,p.v);}},{signal:lifecycle.signal});
  for(const type of ['pointercancel','lostpointercapture'] as const)stage.addEventListener(type,event=>{gesture.end(event.pointerId,point(event),state.views[kind],bounds(),false);},{signal:lifecycle.signal});
 }
 function lessonStep(index:number){
  clearSelectionNotices();steps=3;if(index===1)state={...state,c:{re:-1,im:0},seed:{re:0,im:0}};if(index===2)state={...state,c:{re:1,im:0},seed:{re:1.5,im:0}};if(index===3)state={...state,c:{...twinsPresets[0].c}};
  selected=index===0?'c':index===1?'square':index===2?'radius':'seed';$('#twins-lesson-text').textContent=lessons[index][1];root.querySelectorAll<HTMLButtonElement>('[data-twins-step]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));sync(true);
 }
 root.querySelectorAll<HTMLButtonElement>('[data-twins-step]').forEach((button,index)=>button.onclick=()=>lessonStep(index));
 function closeLesson(){if(!saved)return;const restore=$('#twins-lesson').contains(document.activeElement);({state,selected,steps}=saved);saved=null;clearSelectionNotices();$('#twins-lesson').hidden=true;$('#twins-lesson-toggle').textContent='4段階の教材を開く';sync(true);if(restore)$('#twins-lesson-toggle').focus({preventScroll:true});}
 $('#twins-lesson-toggle').onclick=()=>{if(saved){closeLesson();return;}saved={state:structuredClone(state),selected,steps};state={...state,views:{mandelbrot:defaultView('mandelbrot'),julia:defaultView('julia')}};$('#twins-lesson').hidden=false;$('#twins-lesson-toggle').textContent='教材を閉じて作品へ戻る';lessonStep(0);};
 root.addEventListener('keydown',event=>{if(event.key==='Escape'){if(saved)closeLesson();else selectSymbol(null);}},{signal:lifecycle.signal});
 const resize=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>sync(),120);});panels.forEach(p=>resize.observe(p.stage));
 document.addEventListener('visibilitychange',()=>{if(document.hidden){gestures.forEach(g=>g.reset());for(const panel of panels){if(panel.gate.pending){panel.key='';panel.stage.dataset.status='hidden';$(`#twins-${panel.kind}-status`).textContent='非表示のため計算停止中';}panel.gate.cancel();panel.worker.postMessage({type:'cancel'});}}else sync();},{signal:lifecycle.signal});
 sync(true);
 return()=>{disposed=true;gestures.forEach(g=>g.reset());clearTimeout(resizeTimer);resize.disconnect();lifecycle.abort();for(const panel of panels){panel.gate.dispose();panel.worker.terminate();panel.canvas.width=1;panel.canvas.height=1;}saved=null;root.replaceChildren();};
}
