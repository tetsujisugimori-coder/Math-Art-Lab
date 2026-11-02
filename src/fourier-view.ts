import {advance,contribution,createModel,curve,format,lessonModel,presetNames,rmse,STEPS,type Preset} from './fourier';
import {drawFourier} from './fourier-render';
import './fourier.css';

type State={preset:Preset;k:number;step:number;speed:number;original:boolean;circles:boolean;selected:number|null;symbol:string;playing:boolean};
const lessons=[
 ['1本の腕','横は r cos(2πft+φ)、縦は r sin(2πft+φ)。1本の腕の先端は円を描きます。ここでは半径0.68、f=+1の既知の円です。'],
 ['動きを足す','3本の腕を先端からつなぎます。f=+1、−2、+3の動きを足すと、最後の先端が新しい線を描きます。正は反時計回り、負は時計回りです。円同士が物理的に転がる仕組みではありません。'],
 ['輪郭を分ける','魚の閉じた輪郭を弧長で128点へ再標本化し、DFTで分けます。半径は係数の大きさ、周波数は回数と向き、位相は出発角度。項を選んで図と値を比べましょう。'],
 ['円を増やして描き直す','同じ魚と固定尺度でK=4・16・64を比較しましょう。振幅が大きい順の追加です。周波数順ではなく、各点のずれが必ず小さくなるわけでもありません。128標本上の平均二乗誤差は増えません。']
] as const;
const symbolNotes:Record<string,string>={center:'c₀ は128点の平均位置。回転円の数Kには含めず、連鎖の出発点を四角で示します。',radius:'|cₖ| は腕の長さと円の半径です。選択した項は太線・四角・番号でも示します。',frequency:'fₖ は1周の間に回る回数と向き。上が正の平面で、正は反時計回り、負は時計回りです。',phase:'arg(cₖ) は t=0 の出発角度。現在の角度は 2πfₖt+arg(cₖ) です。',sum:'Σ は動きの足し算。腕を先端から順につなぎます。中心から先端への破線は和を示します。'};

export function mountFourier(host:HTMLElement):()=>void{
 const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)'),theme=matchMedia('(prefers-color-scheme: light)');
 let state:State={preset:'fish',k:16,step:0,speed:1,original:true,circles:true,selected:null,symbol:'',playing:false};
 let model=createModel('fish'),path=curve(model,state.k),error=rmse(model,state.k),saved:State|null=null,lesson=-1,forcedStop=false;
 let raf:number|null=null,epoch=0,previous:number|null=null,remainder=0,disposed=false;
 host.innerHTML=`<main class="fourier"><header><small>MATH ART LAB / EXPERIMENT 010</small><h1>フーリエの万華鏡</h1><p>回転を足すと、輪郭が生まれる。<br>Fourier Kaleidoscope</p></header>
 <div class="fourier-layout"><div class="fourier-art"><div class="fourier-stage"><canvas id="fourier-canvas" role="img" aria-label="回転する円と腕の連鎖。金色の線が先端の軌跡" aria-describedby="fourier-legend fourier-observation"></canvas></div>
 <p id="fourier-legend">破線：元の輪郭 ／ 青い円と腕：回転成分 ／ 金の実線：再構成の軌跡 ／ 明るい点：先端。上がyの正。</p>
 <output id="fourier-observation" aria-live="off"></output><p id="fourier-status" role="status"></p>
 <button id="fourier-lesson">仕組みを見る · 4段階</button>
 <section id="fourier-lesson-panel" hidden aria-label="仕組みを見る"><h2 id="fourier-lesson-title" tabindex="-1"></h2><p id="fourier-lesson-text"></p><div class="fourier-actions">${lessons.map(([title],i)=>`<button data-fourier-lesson="${i}" aria-pressed="false">${i+1}. ${title}</button>`).join('')}</div><div id="fourier-compare" hidden>${[4,16,64].map(k=>`<button data-fourier-k="${k}">K=${k}で完成形</button>`).join('')}</div><button id="fourier-close">教材を終了して戻る</button><p>開始前の設定・位相・軌跡・選択を戻します。元が再生中なら再開しますが、非表示や動きを減らす設定の有効化後は停止を保ちます。教材の段階変更は先頭で停止します。</p></section></div>
 <aside aria-label="フーリエの操作"><div class="fourier-actions"><button id="fourier-play" aria-pressed="false">再生</button><button id="fourier-step">1ステップ</button><button id="fourier-reset">描き直す</button><button id="fourier-complete">完成形を見る</button></div><p>初期停止。1ステップは1/512周。1周で停止します。速度1倍で約4秒（遅延時は進行を制限）。</p>
 <label for="fourier-preset">輪郭のプリセット<select id="fourier-preset">${Object.entries(presetNames).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label>
 <label for="fourier-k">回転項の数 K <output id="fourier-k-value" aria-live="off"></output><input id="fourier-k" type="range" min="1" max="127" step="1" value="16"></label><p>中心位置を除く127項から、半径の大きい順に使用。K・輪郭の変更は先頭で停止します。</p>
 <label for="fourier-speed">再生速度<select id="fourier-speed">${[.25,.5,1,2,4].map(s=>`<option value="${s}">${s}倍</option>`).join('')}</select></label>
 <label class="fourier-check"><input id="fourier-original" type="checkbox" checked>元の輪郭を表示</label><label class="fourier-check"><input id="fourier-circles" type="checkbox" checked>円と腕を表示</label>
 <label for="fourier-term">使用中の項を選ぶ<select id="fourier-term"></select></label><p>タップ・クリック、Tabと矢印キーで選べます。図では選択した円と腕を太線・四角・番号で示します。</p><button id="fourier-clear">強調を解除</button><p>速度・表示・項選択は位相と軌跡を保ちます。非表示から戻っても自動再開しません。</p></aside></div>
 <section class="fourier-inspector" aria-label="数式と回転の観察"><h2>単純な回転を、足し合わせる</h2><p>複素数 z=x+iy は「平面の横と縦を一組で表す書き方」です。i を使うと横と縦を区別して、一つの式で回転と足し算を書けます。</p>
 <p id="fourier-equation">z_K(t) = c₀ + Σ cₖ exp(i 2πfₖt)　（振幅順の先頭K項）</p><p>cₖ exp(i 2πfₖt) = |cₖ| {cos(2πfₖt+arg(cₖ)) + i sin(2πfₖt+arg(cₖ))}</p>
 <div class="fourier-actions">${[['center','c₀ · 中心位置'],['radius','|cₖ| · 半径'],['frequency','fₖ · 回数と向き'],['phase','arg(cₖ) · 出発角度'],['sum','Σ · 足し算']].map(([id,label])=>`<button data-fourier-symbol="${id}" aria-pressed="false">${label}</button>`).join('')}</div><p id="fourier-symbol-note"></p><div id="fourier-term-values" aria-live="off"></div><p id="fourier-selected-equation" aria-live="off"></p><p id="fourier-error-value"></p>
 <details><summary>輪郭から回転成分へ</summary><p>cₖ = (1/128) Σ zₙ exp(−i 2πkn/128)。閉じる辺も含めて等弧長に128点を置き、末尾に始点を重複させません。標本の平均を引き、最大半径を1にする正規化は輪郭ごとに一度だけ行います。</p><p>周波数は k=0…63 を f=k、k=64…127 を f=k−128 と対応させます。Nyquistは−64。半径を10⁻¹²刻みのキーで降順にし、同値は |f|、f、DFT番号の昇順。微小項もKと計算に含めます。</p><p>元輪郭は128標本の折れ線、再構成は512区間の折れ線です。視野は全127項の半径の和から輪郭ごとに固定し、Kで拡大縮小しません。円は画面半径0.25px未満のみ描画を省略します。</p></details><p id="fourier-error" role="status"></p></section></main>`;
 const $=<T extends HTMLElement=HTMLElement>(id:string)=>host.querySelector<T>(`#fourier-${id}`)!;
 const canvas=$<HTMLCanvasElement>('canvas'),ctx=canvas.getContext('2d'),input=(id:string)=>$<HTMLInputElement>(id);
 const termSelect=$<HTMLSelectElement>('term');
 function stop(){state.playing=false;epoch++;if(raf!==null)cancelAnimationFrame(raf);raf=null;previous=null;remainder=0;}
 function rebuild(){path=curve(model,state.k);error=rmse(model,state.k);if(state.selected!==null&&state.selected>=state.k)state.selected=null;options();}
 function options(){termSelect.replaceChildren(new Option('未選択',''));model.terms.slice(0,state.k).forEach((term,i)=>termSelect.add(new Option(`#${i+1} · f=${term.frequency>0?'+':''}${term.frequency} · r=${format(term.radius)}`,String(i))));}
 function draw(){
  if(!ctx||disposed||document.hidden)return;
  const size=canvas.getBoundingClientRect().width,dpr=Math.min(devicePixelRatio||1,2),pixels=Math.max(1,Math.round(size*dpr));
  if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels;}
  const start=performance.now();drawFourier(ctx,{model,k:state.k,step:state.step,path,original:state.original,circles:state.circles,selected:state.selected,symbol:state.symbol},size,dpr,theme.matches);
  canvas.dataset.renderMs=String(performance.now()-start);
 }
 function sync(){
  const tip=path[state.step];canvas.dataset.step=String(state.step);canvas.dataset.k=String(state.k);canvas.dataset.points=String(state.step+1);canvas.dataset.extent=String(model.extent);canvas.dataset.x=String(tip.x);canvas.dataset.y=String(tip.y);
  $('observation').textContent=`位相 t=${state.step}/512 (${format(state.step/STEPS)}) · K=${state.k} · 先端 (x, y)=(${format(tip.x)}, ${format(tip.y)}) · c₀=(${format(model.center.x)}, ${format(model.center.y)})`;
  // Live status and focused button names only mutate on a state transition.
  const status=state.playing?'再生中':state.step===STEPS?'停止中 · 1周が完成しました':'停止中';if($('status').textContent!==status)$('status').textContent=status;
  const playName=state.playing?'一時停止':'再生';if($('play').textContent!==playName)$('play').textContent=playName;$('play').setAttribute('aria-pressed',String(state.playing));$<HTMLButtonElement>('play').disabled=!ctx||state.step===STEPS;
  $<HTMLButtonElement>('step').disabled=!ctx||state.step===STEPS;
  input('k').value=String(state.k);if($('k-value').textContent!==String(state.k))$('k-value').textContent=String(state.k);input('k').disabled=lesson===0||lesson===1;
  $<HTMLSelectElement>('preset').value=state.preset;$<HTMLSelectElement>('preset').disabled=lesson===0||lesson===1;
  $<HTMLSelectElement>('speed').value=String(state.speed);input('original').checked=state.original;input('circles').checked=state.circles;
  termSelect.value=state.selected===null?'':String(state.selected);
  $('symbol-note').textContent=symbolNotes[state.symbol]??'記号ボタンと項の選択で、式・円・腕・観察値がつながります。';
  host.querySelectorAll<HTMLElement>('[data-fourier-symbol]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fourierSymbol===state.symbol)));
  $('equation').classList.toggle('fourier-highlight',state.selected!==null||!!state.symbol);
  const values=$('term-values');values.classList.toggle('fourier-highlight',state.selected!==null);values.dataset.selected=state.selected===null?'':String(state.selected);
  if(state.selected===null)values.textContent='項は未選択です。使用中の項を選ぶと、半径・回転方向・出発角度・現在のx/y寄与を表示します。';
  else{const i=state.selected,term=model.terms[i],v=contribution(term,state.step/STEPS);values.textContent=`選択 #${i+1}（DFT番号 k=${term.index}） · 半径 |cₖ|=${format(term.radius)} · 周波数 fₖ=${term.frequency}（${term.frequency>0?'反時計回り':'時計回り'}に${Math.abs(term.frequency)}回） · 出発角度 arg(cₖ)=${term.radius<1e-12?'微小項のため不定に近い':`${format(term.phase)} rad / ${format(term.phase*180/Math.PI)}°`} · 現在の寄与 (x, y)=(${format(v.x)}, ${format(v.y)})${state.circles?'':' · 円と腕は非表示です'}`;}
  const selectedEquation=$('selected-equation');selectedEquation.hidden=state.selected===null;
  if(state.selected!==null){const term=model.terms[state.selected],v=contribution(term,state.step/STEPS),angle=`2π × (${term.frequency}) × ${format(state.step/STEPS)} + (${format(term.phase)})`;selectedEquation.textContent=`選択 #${state.selected+1} の回転：${format(term.radius)} × { cos(${angle}) + i sin(${angle}) } ≈ (${format(v.x)}) + i × (${format(v.y)})`;selectedEquation.classList.add('fourier-highlight');}
  $('error-value').textContent=`RMSE=${format(error)}（モデル座標、元の128サンプル位置での二乗平均平方根誤差）。連続輪郭全体の最大誤差ではありません。`;
 }
 function render(){if(disposed)return;sync();draw();}
 function schedule(){if(disposed||document.hidden||!state.playing||raf!==null)return;const generation=epoch;raf=requestAnimationFrame(now=>{if(disposed||generation!==epoch)return;raf=null;if(document.hidden){stop();render();return;}if(previous!==null){const next=advance(state.step,Math.max(0,now-previous),state.speed,remainder);state.step=next.step;remainder=next.remainder;}previous=now;if(state.step===STEPS)stop();render();schedule();});}
 function reset(){stop();state.step=0;render();}
 $('play').onclick=()=>{if(state.playing)stop();else if(ctx&&!document.hidden&&state.step<STEPS){state.playing=true;previous=null;schedule();}render();};
 $('step').onclick=()=>{stop();state.step=Math.min(STEPS,state.step+1);render();};$('reset').onclick=reset;
 $('complete').onclick=()=>{stop();state.step=STEPS;render();};
 input('k').oninput=()=>{const k=Number(input('k').value);if(!Number.isInteger(k)||k<1||k>127)return;stop();state.k=k;state.step=0;rebuild();render();};
 $<HTMLSelectElement>('preset').onchange=()=>{const id=$<HTMLSelectElement>('preset').value as Preset;if(!(id in presetNames))return;stop();state.preset=id;state.step=0;model=createModel(id);rebuild();render();};
 $<HTMLSelectElement>('speed').onchange=()=>{state.speed=Number($<HTMLSelectElement>('speed').value);previous=null;render();};
 for(const id of ['original','circles'] as const)input(id).onchange=()=>{state[id]=input(id).checked;render();};
 termSelect.onchange=()=>{state.selected=termSelect.value===''?null:Number(termSelect.value);render();};
 $('clear').onclick=()=>{state.selected=null;state.symbol='';render();};
 host.querySelectorAll<HTMLButtonElement>('[data-fourier-symbol]').forEach(b=>b.onclick=()=>{state.symbol=b.dataset.fourierSymbol!;if(['radius','frequency','phase'].includes(state.symbol)&&state.selected===null)state.selected=0;render();});
 function showLesson(i:number){stop();lesson=i;state.step=0;state.selected=null;state.symbol=i<2?'sum':'';state.original=i>=2;state.circles=true;state.preset='fish';state.k=i===0?1:i===1?3:i===2?16:4;model=i<2?lessonModel(i===0?1:3):createModel('fish');rebuild();$('lesson-title').textContent=`${i+1}. ${lessons[i][0]}`;$('lesson-text').textContent=lessons[i][1];$('compare').hidden=i!==3;host.querySelectorAll<HTMLElement>('[data-fourier-lesson]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.fourierLesson)===i)));render();}
 $('lesson').onclick=()=>{saved=structuredClone(state);forcedStop=false;stop();$('lesson-panel').hidden=false;$('lesson').hidden=true;showLesson(0);$('lesson-title').focus({preventScroll:true});};
 function closeLesson(){if(!saved)return;stop();state=saved;saved=null;lesson=-1;model=createModel(state.preset);rebuild();state.playing=state.playing&&!forcedStop&&!motion.matches&&!document.hidden&&!!ctx;previous=null;$('lesson-panel').hidden=true;$('lesson').hidden=false;render();$('lesson').focus({preventScroll:true});schedule();}
 $('close').onclick=closeLesson;host.querySelectorAll<HTMLButtonElement>('[data-fourier-lesson]').forEach(b=>b.onclick=()=>showLesson(Number(b.dataset.fourierLesson)));
 host.querySelectorAll<HTMLButtonElement>('[data-fourier-k]').forEach(b=>b.onclick=()=>{stop();state.k=Number(b.dataset.fourierK);state.step=STEPS;rebuild();render();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(saved)closeLesson();else{state.selected=null;state.symbol='';render();}}},{signal:life.signal});
 const safetyStop=()=>{forcedStop=true;stop();render();};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)safetyStop();else render();},{signal:life.signal});
 motion.addEventListener('change',()=>{if(motion.matches)safetyStop();},{signal:life.signal});theme.addEventListener('change',render,{signal:life.signal});
 const resize=new ResizeObserver(()=>{if(!disposed)draw();});resize.observe(canvas);
 // DPR may change without a CSS size change. Re-arm a resolution query each time.
 let resolution:MediaQueryList|null=null;
 const dprChange=()=>{resolution?.removeEventListener('change',dprChange);resolution=matchMedia(`(resolution: ${devicePixelRatio}dppx)`);resolution.addEventListener('change',dprChange);draw();};dprChange();
 if(!ctx){$('error').textContent='Canvas 2Dを利用できません。図は表示できませんが、数式・教材・観察値を確認できます。';}
 options();render();
 return ()=>{disposed=true;stop();life.abort();resize.disconnect();resolution?.removeEventListener('change',dprChange);saved=null;canvas.width=canvas.height=0;host.replaceChildren();};
}
