import {distance,inBounds,MAX_SITES,observe,presetNames,voronoi,type Cell,type Point,type Preset} from './voronoi';
import {createState,editState,resetState,restoreState,stepState,type State,type SymbolId} from './voronoi-state';
import {drawVoronoi,modelPoint} from './voronoi-render';
import './voronoi.css';

const symbols:Record<Exclude<SymbolId,''>,{label:string;name:string;reading:string;meaning:string}>={
 member:{label:'∈',name:'要素記号・所属記号',reading:'「〜に属する」',meaning:'要素が集合に含まれること。十字の観察点xと、計算対象Ω・選択した領域を強調します。'},
 all:{label:'∀j',name:'全称記号（∀）',reading:'「すべてのjについて」',meaning:'指定したすべての対象で条件が成立すること。すべての点pⱼへの距離を比較します。'},
 leq:{label:'≤',name:'小なりイコール',reading:'「以下である」',meaning:'左側が右側より小さいか、等しいこと。距離が等しい境界も領域に含みます。境界と距離を強調します。'},
 norm:{label:'‖ ‖',name:'ノルム記号',reading:'「〜のノルム」',meaning:'今回の式では、二点間の通常のユークリッド距離。十字xから点pⱼへの線分が対応します。'},
 omega:{label:'Ω',name:'大文字のオメガ',reading:'「領域オメガ」',meaning:'計算対象となる平面の範囲。今回は0≤x≤1、0≤y≤1の正方形。その外枠を強調します。'},
 bar:{label:'|',name:'縦線・バー',reading:'「ただし」「〜という条件で」',meaning:'集合を定義する条件を区切ります。右側の距離条件で、左側の領域を選びます。今回はノルム記号とは別の用法です。'},
 index:{label:'pᵢ・pⱼ',name:'添え字（下付きのi・j）',reading:'「ピー・アイ」「ピー・ジェイ」',meaning:'点を区別する番号。iは選択中の点、jは比較する各点です。累乗ではありません。図のp番号と点選択が対応します。'},
 cell:{label:'Vᵢ',name:'大文字のブイと添え字i',reading:'「領域ブイ・アイ」',meaning:'選択した点pᵢに対応するボロノイ領域。枠を太くして示します。'},
 centroid:{label:'cᵢ',name:'小文字のシーと添え字i',reading:'「重心シー・アイ」',meaning:'領域Vᵢの面積に基づく重心。均一な薄板のつり合う位置です。四角で示し、pᵢから線で結びます。'},
 update:{label:'pᵢ(next) = cᵢ',name:'等号（=）と次ステップの記法',reading:'「次のピー・アイはシー・アイに等しい」',meaning:'更新前の全領域の重心へ、全点を同時に移します。矢印は現在の点から次の候補位置への移動です。'}
};
const lessons=[
 ['点と距離','2点A=p1・B=p2への距離を比べます。観察モードで十字xを動かしましょう。距離が等しい場所は垂直二等分線で、両方の数学的領域に属する境界です。x=(0.5,0.5)で等距離を確認できます。'],
 ['空間を分ける','3点以上への距離をすべて比較すると、平面をボロノイ領域に分けられます。境界は複数領域に属し得ます。色と距離の所属表示では番号の小さい点を優先します。これは表示の規則です。'],
 ['領域の重心','点を選ぶと、pᵢ・領域Vᵢ・四角の重心cᵢが対応します。重心は面積を重みとする位置で、頂点の単純平均ではありません。「1ステップ」で全点を同時更新し、比較図を「直前」にして前後を見ましょう。'],
 ['結晶が整う','1ステップや再生で、全点を各領域の重心へ繰り返し移します。比較図の初期配置と現在配置・ステップ数を見比べましょう。同じ形になる保証、完全な六角形分割や大域的最適解への到達保証はありません。有限回の観察は理論上の収束の証明ではありません。']
] as const;
const fmt=(n:number)=>n!==0&&Math.abs(n)<1e-5?n.toExponential(3):n.toFixed(5);
const symbolButton=(id:Exclude<SymbolId,''>)=>`<button type="button" data-vc-symbol="${id}" aria-pressed="false" aria-label="${symbols[id].label} の説明">${symbols[id].label}</button>`;

export function mountVoronoi(host:HTMLElement):()=>void{
 const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)'),theme=matchMedia('(prefers-color-scheme: light)');
 let state=createState(),cells=voronoi(state.sites),referenceCells=cells,saved:State|null=null,lesson=-1,forcedStop=false,disposed=false;
 let timer:ReturnType<typeof setTimeout>|null=null,drawFrame:number|null=null,epoch=0,drag:{id:number;site:number}|null=null;
 let computeMs=0,renderMs=0,siteKey='',referenceKey='';
 host.innerHTML=`<main class="crystal"><header><small>MATH ART LAB / EXPERIMENT 011</small><h1>距離の結晶</h1><p>近い点を選ぶ。その繰り返しが、空間を整える。<br>Voronoi Crystal / ボロノイ図とロイド緩和</p></header>
 <div class="vc-layout"><div class="vc-art"><h2>現在の配置</h2><div class="vc-stage"><canvas id="vc-canvas" tabindex="0" role="img" aria-label="ボロノイ図の操作面" aria-describedby="vc-help vc-legend vc-observation"></canvas></div>
 <p class="vc-legend" id="vc-legend">丸：母点pᵢ ／ 四角：面積重心cᵢ ／ 十字：観察点x ／ 矢印：次の移動候補。上がyの正。色に加え、番号と境界で領域を区別します。</p>
 <output id="vc-observation" aria-live="off"></output><p id="vc-status" role="status"></p><p id="vc-error" role="status"></p>
 <div id="vc-reference-panel" class="vc-reference"><h3 id="vc-reference-title">初期配置 · 0ステップ</h3><div class="vc-stage"><canvas id="vc-reference-canvas" role="img" aria-label="比較用の配置"></canvas></div></div>
 <button id="vc-lesson">仕組みを見る · 4段階</button><section id="vc-lesson-panel" class="vc-panel" hidden aria-label="仕組みを見る"><h2 id="vc-lesson-title" tabindex="-1"></h2><p id="vc-lesson-text"></p><div class="vc-actions">${lessons.map(([title],i)=>`<button data-vc-lesson="${i}" aria-pressed="false">${i+1}. ${title}</button>`).join('')}</div><button id="vc-close">教材を終了して戻る</button><p>終了・Escapeで開始前の配置・設定・選択・観察点・ステップ・表示を復元します。元が再生中なら再開しますが、非表示やreduced-motionで停止した場合は停止を保ちます。</p></section></div>
 <aside aria-label="距離の結晶の操作"><div class="vc-actions"><button id="vc-play" aria-pressed="false">再生</button><button id="vc-step">1ステップ</button><button id="vc-reset">初期配置に戻す</button></div><p>初期停止。再生は約0.7秒に1回の同時更新。500ステップで停止します。計算回数は描画フレーム数に依存しません。</p>
 <label for="vc-preset">点のプリセット<select id="vc-preset">${Object.entries(presetNames).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label>
 <label for="vc-mode">図の操作モード<select id="vc-mode"><option value="select">点を選択・ドラッグ</option><option value="add">空いている場所に点を追加</option><option value="observe">観察点xを移動</option></select></label>
 <p id="vc-help">図をクリック・タップして操作。図にフォーカスし、矢印で選択点または観察点を0.01ずつ移動（Shiftで0.05）。追加モードは矢印で候補x、Enterで追加。Deleteで選択点を削除。図の外でページをスクロールできます。</p>
 <label for="vc-selected">点を選ぶ<select id="vc-selected"></select></label>
 <form id="vc-point-form"><div class="vc-fields"><label for="vc-point-x">点のx<input id="vc-point-x" type="number" min="0" max="1" step="any" required></label><label for="vc-point-y">点のy<input id="vc-point-y" type="number" min="0" max="1" step="any" required></label></div><div class="vc-actions"><button id="vc-move" type="submit">選択点を移動</button><button id="vc-add" type="button">この座標に追加</button><button id="vc-delete" type="button">選択点を削除</button></div></form>
 <p>1〜${MAX_SITES}点、x・yは0〜1。編集時の点間距離は0.025以上。緩和中は数学用の下限10⁻⁶を用います。編集すると、その配置が新しい初期配置になり、ステップは0に戻ります。</p>
 <form id="vc-probe-form"><div class="vc-fields"><label for="vc-probe-x">観察点xの横座標<input id="vc-probe-x" type="number" min="0" max="1" step="any" required></label><label for="vc-probe-y">観察点xの縦座標<input id="vc-probe-y" type="number" min="0" max="1" step="any" required></label></div><button type="submit">観察点を移動</button></form>
 <details open><summary>表示する要素</summary>${Object.entries({regions:'領域の色',edges:'境界線',sites:'母点',centroids:'重心',vectors:'点から重心への矢印',distances:'観察点からの距離',compare:'比較図'}).map(([id,label])=>`<label class="vc-check"><input id="vc-${id}" type="checkbox">${label}</label>`).join('')}<label for="vc-reference">比較する配置<select id="vc-reference"><option value="initial">初期配置</option><option value="previous">直前の配置</option></select></label></details></aside></div>
 <section class="vc-panel vc-inspector" aria-label="数式と記号のインスペクター"><h2>いちばん近い点が、領域を決める</h2><p>点集合 P = {p₁, p₂, …, pₙ}。式の記号ボタンを選ぶと、名前・読み方・意味を分けて表示し、図でも対象を強調します。Tab・Enter・Spaceでも選べます。</p>
 <div class="vc-equation" aria-label="ボロノイ領域の定義">${symbolButton('cell')} = { x ${symbolButton('member')} ${symbolButton('omega')} ${symbolButton('bar')} <span class="vc-math">‖x − pᵢ‖</span> ${symbolButton('leq')} <span class="vc-math">‖x − pⱼ‖,</span> ${symbolButton('all')} }</div><div class="vc-actions">${symbolButton('norm')}${symbolButton('index')}${symbolButton('centroid')}${symbolButton('update')}<button id="vc-clear">強調を解除</button></div>
 <p>Vᵢは、Ω内でpᵢまでの距離が、ほかのどの点までの距離よりも大きくない場所の集合です。境界の等距離点は数学的には複数の領域に属し得ます。</p><dl><dt>A. 記号の名前</dt><dd id="vc-symbol-name"></dd><dt>B. 式の中での読み方</dt><dd id="vc-symbol-reading"></dd><dt>C. 数学的な意味</dt><dd id="vc-symbol-meaning"></dd></dl><p>名称・用法・読み方には別称があります。ここではこの式での使い方を説明します。</p>
 <output id="vc-values" aria-live="off"></output><p id="vc-membership"></p><details open><summary>現在の距離をすべて比べる</summary><ul id="vc-distance-list" class="vc-distance-list"></ul></details>
 <details><summary>重心と計算の規則</summary><p>cᵢ = (1 / area(Vᵢ)) ∫∫[Vᵢ] x dA。均一な面積に基づく重心です。多角形を三角形に分け、符号付き面積を重みとして求めます。頂点を単純平均する計算とは異なります。</p><p>‖x−pᵢ‖² ≤ ‖x−pⱼ‖² ⇔ (pⱼ−pᵢ)·(x−(pᵢ+pⱼ)/2) ≤ 0。垂直二等分線の半平面で正方形を切り取ります。描画はその頂点と同じモデル座標を使用し、画素による最近点近似は使いません。</p><p>距離の差が10⁻¹²以下のとき、観察表示では同距離の候補とし、その中で番号が最小の点を表示上の所属にします。色の共有境界は小さい番号を手前に描きます。これは浮動小数点と画面上の規則で、数学的な境界の定義ではありません。</p><p>完全重複点・不正座標・不正な領域は拒否し、正常な配置を保持します。ロイド緩和は全重心を先に計算して一括更新します。有限回での完全な正六角形化や大域的最適解を保証しません。</p></details></section></main>`;
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>host.querySelector<T>(`#vc-${id}`)!;
 const input=(id:string)=>$<HTMLInputElement>(id),select=(id:string)=>$<HTMLSelectElement>(id),button=(id:string)=>$<HTMLButtonElement>(id);
 const canvas=$<HTMLCanvasElement>('canvas'),ctx=canvas.getContext('2d'),refCanvas=$<HTMLCanvasElement>('reference-canvas'),refCtx=refCanvas.getContext('2d');
 const backSymbol=document.createElement('button');backSymbol.id='vc-back-symbol';backSymbol.textContent='選択中の記号へ';$('observation').after(backSymbol);
 const showArt=document.createElement('button');showArt.id='vc-show-art';showArt.textContent='図形を確認';showArt.setAttribute('aria-controls','vc-canvas');$('clear').before(showArt);
 showArt.onclick=()=>{canvas.focus({preventScroll:true});canvas.scrollIntoView({block:'center'});};
 backSymbol.onclick=()=>{const target=host.querySelector<HTMLButtonElement>(`[data-vc-symbol="${state.symbol}"]`);target?.focus({preventScroll:true});target?.scrollIntoView({block:'center'});};
 function message(value=''){if($('error').textContent!==value)$('error').textContent=value;}
 function stop(){state.playing=false;epoch++;if(timer!==null)clearTimeout(timer);timer=null;}
 function cancelDrag(){if(drag&&canvas.hasPointerCapture(drag.id))canvas.releasePointerCapture(drag.id);drag=null;}
 function commit(next:State){state=next;message();refresh();}
 function refresh(){const start=performance.now();cells=voronoi(state.sites);computeMs=performance.now()-start;render();}
 function attempt(action:()=>State){try{const next=action();commit(next);}catch(error){stop();message(error instanceof Error?error.message:'操作できません。');render();}}
 function edit(action:'add'|'move'|'delete',point?:Point){stop();attempt(()=>editState(state,action,point));}
 function step(){try{const start=performance.now(),next=stepState(state);state=next;cells=voronoi(state.sites);computeMs=performance.now()-start;message();if(state.step>=500)stop();render();}catch(error){stop();message(error instanceof Error?error.message:'更新できません。');render();}}
 function schedule(){if(disposed||!state.playing||document.hidden||timer!==null)return;const generation=epoch;timer=setTimeout(()=>{if(disposed||generation!==epoch)return;timer=null;step();schedule();},700);}
 function drawOne(c:HTMLCanvasElement,context:CanvasRenderingContext2D|null,cs:Cell[],reference:boolean){
  if(!context||disposed||document.hidden)return;const size=c.getBoundingClientRect().width;if(size<=0)return;
  const dpr=Math.min(devicePixelRatio||1,2),pixels=Math.max(1,Math.round(size*dpr));if(c.width!==pixels||c.height!==pixels)c.width=c.height=pixels;
  drawVoronoi(context,state,cs,size,dpr,theme.matches,reference);
 }
 function draw(){if(disposed||document.hidden)return;const start=performance.now();drawOne(canvas,ctx,cells,false);if(state.layers.compare)drawOne(refCanvas,refCtx,referenceCells,true);renderMs=performance.now()-start;canvas.dataset.renderMs=String(renderMs);canvas.dataset.renderedStep=String(state.step);canvas.dataset.renderedRevision=canvas.dataset.revision;canvas.dataset.renderCount=String(Number(canvas.dataset.renderCount??0)+1);}
 // Geometry advances synchronously; one pending frame always paints the latest state.
 function requestDraw(){if(disposed||document.hidden||!ctx||drawFrame!==null)return;drawFrame=requestAnimationFrame(()=>{drawFrame=null;draw();});}
 function render(){
  if(disposed)return;
  const key=state.sites.map(p=>p.id).join(',');if(key!==siteKey){siteKey=key;select('selected').replaceChildren(...state.sites.map(p=>new Option(`p${p.id}`,String(p.id))));}select('selected').value=String(state.selected);
  const selected=state.sites.find(p=>p.id===state.selected)!,cell=cells.find(c=>c.site.id===state.selected)!;
  const field=(id:string,value:number)=>{if(document.activeElement!==input(id))input(id).value=String(value);};field('point-x',selected.x);field('point-y',selected.y);field('probe-x',state.probe.x);field('probe-y',state.probe.y);
  select('preset').value=state.preset;select('mode').value=state.mode;select('reference').value=state.reference;
  for(const [id,value] of Object.entries(state.layers))input(id).checked=value;
  const reference=state.reference==='initial'?state.initial:state.previous,keyRef=JSON.stringify(reference);if(keyRef!==referenceKey){referenceKey=keyRef;referenceCells=voronoi(reference);}
  $('reference-panel').hidden=!state.layers.compare;$('reference-title').textContent=`${state.reference==='initial'?'初期配置':'直前の配置'} · ${state.reference==='initial'?0:Math.max(0,state.step-1)}ステップ`;
  const status=state.playing?'再生中':state.step>=500?'停止中 · 500ステップの上限です':'停止中';if($('status').textContent!==status)$('status').textContent=status;
  const playText=state.playing?'一時停止':'再生';if(button('play').textContent!==playText)button('play').textContent=playText;button('play').setAttribute('aria-pressed',String(state.playing));
  button('play').disabled=!ctx||state.step>=500||lesson===0||lesson===1;button('step').disabled=!ctx||state.step>=500||lesson===0||lesson===1;
  for(const id of ['move','add','delete'])button(id).disabled=lesson===0||(id!=='move'&&lesson>0&&lesson<3);select('preset').disabled=lesson>=0&&lesson<3;select('mode').disabled=lesson===0;
  const observation=observe(state.sites,state.probe);
  $('observation').textContent=`現在：${state.step}ステップ · ${state.sites.length}点 ／ 最大移動 ${fmt(state.maxMove)} ／ 面積和 ${fmt(cells.reduce((sum,c)=>sum+c.area,0))} ／ 観察点x=(${fmt(state.probe.x)}, ${fmt(state.probe.y)})`;
  $('values').textContent=`選択 i=${state.selected}：pᵢ=(${fmt(selected.x)}, ${fmt(selected.y)}) ／ Vᵢの面積=${fmt(cell.area)} ／ cᵢ=(${fmt(cell.centroid.x)}, ${fmt(cell.centroid.y)}) ／ 重心までの距離=${fmt(distance(selected,cell.centroid))}`;
  $('membership').textContent=`観察点xの表示上の所属：p${observation.displayOwner}。同距離候補（差≤10⁻¹²）：${observation.nearest.map(id=>`p${id}`).join('・')}。選択中V${state.selected}の距離条件は${observation.nearest.includes(state.selected)?'成立する候補です':'成立しません'}。`;
  $('distance-list').replaceChildren(...observation.distances.map(d=>{const li=document.createElement('li');li.textContent=`p${d.id}: ${fmt(d.distance)}${observation.nearest.includes(d.id)?' · 最近':''}`;return li;}));
  const note=state.symbol?symbols[state.symbol]:null;$('symbol-name').textContent=note?.name??'記号を選んでください。';$('symbol-reading').textContent=note?.reading??'式の記号ボタンで確認できます。';$('symbol-meaning').textContent=note?.meaning??'図の対象と説明が連動します。';
  backSymbol.hidden=!state.symbol;showArt.disabled=!state.symbol;
  host.querySelectorAll<HTMLElement>('[data-vc-symbol]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.vcSymbol===state.symbol)));
  canvas.dataset.step=String(state.step);canvas.dataset.count=String(state.sites.length);canvas.dataset.computeMs=String(computeMs);canvas.dataset.state=JSON.stringify(state);canvas.dataset.cells=JSON.stringify(cells);canvas.dataset.symbol=state.symbol;
  canvas.dataset.revision=String(Number(canvas.dataset.revision??0)+1);
  requestDraw();
 }
 button('play').onclick=()=>{cancelDrag();if(state.playing)stop();else if(ctx&&!document.hidden){state.playing=true;schedule();}render();};
 button('step').onclick=()=>{cancelDrag();stop();step();};button('reset').onclick=()=>{cancelDrag();stop();commit(resetState(state));};
 select('preset').onchange=()=>{cancelDrag();stop();const id=select('preset').value as Preset;if(id in presetNames)commit({...createState(id),layers:structuredClone(state.layers)});};
 select('mode').onchange=()=>{cancelDrag();state.mode=select('mode').value as State['mode'];render();};
 select('selected').onchange=()=>{state.selected=Number(select('selected').value);message();render();};
 const coordinates=(prefix:string):Point=>({x:Number(input(`${prefix}-x`).value),y:Number(input(`${prefix}-y`).value)});
 $<HTMLFormElement>('point-form').onsubmit=e=>{e.preventDefault();edit('move',coordinates('point'));};
 button('add').onclick=()=>{if($<HTMLFormElement>('point-form').reportValidity())edit('add',coordinates('point'));};button('delete').onclick=()=>edit('delete');
 function setProbe(point:Point){if(!inBounds(point)){message('観察点の座標は0〜1にしてください。');return;}state.probe=point;message();render();}
 $<HTMLFormElement>('probe-form').onsubmit=e=>{e.preventDefault();setProbe(coordinates('probe'));};
 // Freeze automatic updates before a coordinate draft can lose focus to its sibling.
 for(const id of ['point-x','point-y','probe-x','probe-y'])input(id).addEventListener('input',()=>{if(state.playing){stop();render();}},{signal:life.signal});
 for(const id of Object.keys(state.layers) as (keyof State['layers'])[])input(id).onchange=()=>{state.layers[id]=input(id).checked;render();};
 select('reference').onchange=()=>{state.reference=select('reference').value as State['reference'];render();};
 host.querySelectorAll<HTMLButtonElement>('[data-vc-symbol]').forEach(b=>b.onclick=()=>{state.symbol=b.dataset.vcSymbol as SymbolId;render();});button('clear').onclick=()=>{state.symbol='';render();};
 const pointerPoint=(e:PointerEvent):Point=>{const rect=canvas.getBoundingClientRect();return modelPoint({x:e.clientX-rect.left,y:e.clientY-rect.top},rect.width);};
 canvas.addEventListener('pointerdown',e=>{
  if(e.button!==0||!e.isPrimary||drag)return;
  const point=pointerPoint(e);if(!inBounds(point)){message('外枠の内側を選んでください。');return;}
  canvas.focus({preventScroll:true});
  if(state.mode==='observe'){setProbe(point);drag={id:e.pointerId,site:0};canvas.setPointerCapture(e.pointerId);return;}
  if(state.mode==='add'){edit('add',point);return;}
  const rect=canvas.getBoundingClientRect(),near=state.sites.map(p=>({p,d:distance(p,point)*rect.width*.91})).sort((a,b)=>a.d-b.d||a.p.id-b.p.id)[0];
  if(near.d>22){message('母点の近くを選んでください。追加は操作モードを変更します。');return;}
  stop();state.selected=near.p.id;drag={id:e.pointerId,site:near.p.id};canvas.setPointerCapture(e.pointerId);message();render();
 },{signal:life.signal});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const point=pointerPoint(e);if(drag.site===0)setProbe(point);else edit('move',point);},{signal:life.signal});
 canvas.addEventListener('pointerup',e=>{if(drag?.id===e.pointerId)cancelDrag();},{signal:life.signal});
 for(const event of ['pointercancel','lostpointercapture'] as const)canvas.addEventListener(event,e=>{if(drag?.id===e.pointerId)drag=null;},{signal:life.signal});
 canvas.addEventListener('keydown',e=>{
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   e.preventDefault();const delta=e.shiftKey?.05:.01,p=state.mode==='select'?state.sites.find(p=>p.id===state.selected)!:state.probe;
   const point={x:p.x+(e.key==='ArrowRight'?delta:e.key==='ArrowLeft'?-delta:0),y:p.y+(e.key==='ArrowUp'?delta:e.key==='ArrowDown'?-delta:0)};
   if(state.mode==='select'&&lesson!==0)edit('move',point);else setProbe(point);
  }else if(e.key==='Enter'&&state.mode==='add'&&(lesson<0||lesson===3)){e.preventDefault();edit('add',state.probe);}
  else if(e.key==='Delete'&&(lesson<0||lesson===3)){e.preventDefault();edit('delete');}
 },{signal:life.signal});
 function showLesson(index:number){
  cancelDrag();stop();lesson=index;state=createState(index===0?'basic':index===1?'basic':'irregular');
  if(index===0){state.sites=[{id:1,x:.25,y:.5},{id:2,x:.75,y:.5}];state.initial=structuredClone(state.sites);state.previous=structuredClone(state.sites);state.mode='observe';}
  state.symbol=index===0?'norm':index===1?'all':index===2?'centroid':'update';state.layers.centroids=index>=2;state.layers.vectors=index>=2;state.layers.distances=index<2;state.reference=index===2?'previous':'initial';
  $('lesson-title').textContent=`${index+1}. ${lessons[index][0]}`;$('lesson-text').textContent=lessons[index][1];host.querySelectorAll<HTMLElement>('[data-vc-lesson]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.vcLesson)===index)));message();refresh();
 }
 button('lesson').onclick=()=>{saved=structuredClone(state);forcedStop=false;stop();$('lesson-panel').hidden=false;button('lesson').hidden=true;showLesson(0);$('lesson-title').focus({preventScroll:true});};
 function closeLesson(){if(!saved)return;cancelDrag();stop();state=restoreState(saved,forcedStop,motion.matches,document.hidden);saved=null;lesson=-1;$('lesson-panel').hidden=true;button('lesson').hidden=false;message();refresh();button('lesson').focus({preventScroll:true});schedule();}
 button('close').onclick=closeLesson;host.querySelectorAll<HTMLButtonElement>('[data-vc-lesson]').forEach(b=>b.onclick=()=>showLesson(Number(b.dataset.vcLesson)));
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(saved)closeLesson();else{const returnToCanvas=document.activeElement===backSymbol;cancelDrag();state.symbol='';render();if(returnToCanvas)canvas.focus({preventScroll:true});}}},{signal:life.signal});
 const safetyStop=()=>{forcedStop=true;cancelDrag();stop();if(drawFrame!==null)cancelAnimationFrame(drawFrame);drawFrame=null;render();};document.addEventListener('visibilitychange',()=>{if(document.hidden)safetyStop();else requestDraw();},{signal:life.signal});motion.addEventListener('change',()=>{if(motion.matches)safetyStop();},{signal:life.signal});theme.addEventListener('change',requestDraw,{signal:life.signal});
 const resize=new ResizeObserver(requestDraw);resize.observe(canvas);resize.observe(refCanvas);let resolution:MediaQueryList|null=null;
 const dprChange=()=>{resolution?.removeEventListener('change',dprChange);resolution=matchMedia(`(resolution: ${devicePixelRatio}dppx)`);resolution.addEventListener('change',dprChange);requestDraw();};dprChange();
 if(!ctx)message('Canvas 2Dを利用できません。数式と距離の数値は確認できます。再生は利用できません。');render();
 return ()=>{disposed=true;cancelDrag();stop();if(drawFrame!==null)cancelAnimationFrame(drawFrame);drawFrame=null;life.abort();resize.disconnect();resolution?.removeEventListener('change',dprChange);saved=null;canvas.width=canvas.height=refCanvas.width=refCanvas.height=0;host.replaceChildren();};
}
