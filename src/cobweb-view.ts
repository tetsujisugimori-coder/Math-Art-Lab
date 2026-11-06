import {demand,equilibrium,initialPoint,nextStep,preset,presets,stability,stopReason,type Market,type MarketPoint,type MarketStep,type PresetId} from './cobweb';
import {validMarket} from './cobweb';
import {renderMarket} from './cobweb-render';
import {renderMath} from './inspector';
import './cobweb.css';

type Focus='demand'|'supply'|'equilibrium'|'update';
type State={market:Market;point:MarketPoint;period:number;history:MarketStep[];progress:number;playing:boolean;mode:'art'|'teach';limit:number;speed:number;focus:Focus|null};
const fmt=(n:number)=>Number(n.toFixed(3)).toString();
const guides:Record<Focus,string>={
  demand:'D・実線：需要は、その期の価格で買い手が購入したい数量。価格が上がると購入量が減ると仮定します。',
  supply:'S・破線：供給は生産者が売りたい数量。ここでは今期価格Pₜを見て、1期後の生産量Qₜ₊₁を決めます。',
  equilibrium:'E・菱形：需要と供給の交点。P*とQ*では、1期先へ進めても同じ価格・数量になります。',
  update:'糸：需要曲線上の(Qₜ,Pₜ)から水平に供給曲線へ、次に垂直に需要曲線へ。1本の折れ線が1期の更新です。',
};
const lessons=[
  {title:'現象を見る',text:'再生して、価格と数量が交互に高く・低くなる様子を眺めてください。安定市場では糸が交点へ集まり、境界市場では同じ長方形を往復し、不安定市場では外へほどけます。プリセットを切り替え、次の動きを予想してみましょう。',focus:'update'},
  {title:'図で理解する',text:'実線Dは買い手の需要、破線Sは生産者の供給、菱形Eは均衡です。横軸は数量Q、縦軸は価格P。まず旧価格を保って水平に次期供給を決め、次にその数量を保って垂直に需要と一致する新価格を決めます。供給と需要の式は同じ価格を同時に使って更新するわけではありません。',focus:'supply'},
  {title:'数式で理解する',text:'Q_d=a−bP、Q_s=c+dP。Pₜを観察した生産者がQₜ₊₁=c+dPₜを準備し、翌期にQₜ₊₁=a−bPₜ₊₁となる価格で売れると仮定します。従ってPₜ₊₁=(a−c−dPₜ)/b。下の数式ボタンで図の線と対応づけ、現在値の代入を確かめてください。',focus:'demand'},
  {title:'経済学として考える',text:'価格偏差eₜ=Pₜ−P*はeₜ₊₁=−(d/b)eₜ。負号で交点の反対側へ移り、d/b<1なら振れ幅が縮み、=1なら通常2周期、>1なら拡大します。初期価格が厳密に均衡なら全条件で静止します。これはQ(P)の係数比であり、図に描く逆関数P(Q)の傾き比とは逆です。農産物は植付けから収穫まで時間がかかるため遅れを考える例に向きますが、すべての市場の実証的説明ではありません。',focus:'equilibrium'},
] as const;

export function mountCobweb(root:HTMLElement):()=>void{
  const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const market=preset('stable');
  let state:State={market,point:initialPoint(market),period:0,history:[],progress:0,playing:false,mode:'art',limit:32,speed:1,focus:null};
  let saved:{state:State;drafts:string[];error:string}|null=null,lessonIndex=0;
  let raf:number|null=null,resizeRaf:number|null=null,previous:number|null=null,disposed=false,width=600,lastPhase=-1;
  let paintTrace:ReturnType<typeof renderMarket>;
  root.innerHTML=`<main class="cobweb" data-mode="art"><header><small>MATH ART LAB / EXPERIMENT 014</small><h1>需要と供給の蜘蛛の巣</h1><p class="cw-subtitle">COBWEB MODEL / 均衡を探す、市場の織物</p><p>いまの価格を見て、次の収穫を決める。<br>その時間差が、光の糸を織っていく。</p></header>
  <div class="cw-layout"><div class="cw-stage-column"><div class="cw-stage"><svg id="cw-chart" role="img" aria-label="需要と供給の蜘蛛の巣。横軸は数量Q、縦軸は価格P"></svg></div>
  <div class="cw-legend"><span><i></i>D 需要・実線</span><span><i class="cw-key-supply"></i>S 供給・破線</span><span><i class="cw-key-thread"></i>更新の糸</span><span>◇ E 均衡</span></div>
  <dl class="cw-values"><div><dt>確定した期 t</dt><dd id="cw-period"></dd></div><div><dt>価格 Pₜ</dt><dd id="cw-price"></dd></div><div><dt>数量 Qₜ</dt><dd id="cw-quantity"></dd></div></dl>
  <div class="cw-caption"><p id="cw-equilibrium"></p><p id="cw-behavior"></p><p id="cw-phase"></p><output id="cw-update" aria-live="off"></output></div><p id="cw-status" role="status"></p>
  <p class="cw-note">横軸0〜120、縦軸0〜a/b。単位は仮想的な価格・数量です。光点は更新の順番を示す演出で、途中の市場価格ではありません。白い輪は確定点です。初期数量Q₀=a−bP₀は需要曲線上から始めます。</p>
  <div class="cw-actions"><button id="cw-play">再生</button><button id="cw-step">1ステップ</button><button id="cw-reset">初期状態へ戻す</button></div></div>
  <aside aria-label="市場の設定"><label>表示モード<select id="cw-mode"><option value="art">鑑賞 · 光の糸</option><option value="teach">教材 · 更新を読む</option></select></label>
  <label>市場のプリセット<select id="cw-preset"><option value="custom" disabled>カスタム設定</option>${Object.entries(presets).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select></label>
  <form id="cw-settings" novalidate><label>初期価格 P₀<input name="initialPrice" type="number" min="0" step="any" required></label><label>需要の反応 b（0.5〜2）<input name="b" type="number" min="0.5" max="2" step="any" required></label><label>供給の反応 d（0.25〜2）<input name="d" type="number" min="0.25" max="2" step="any" required></label><button type="submit">設定を適用</button><p id="cw-error" role="status"></p></form>
  <p class="cw-note">入力は候補です。適用すると履歴を消し、P₀から停止して始めます。P₀は0〜a/b（b=1なら0〜120）。a=120、c=0は固定。b・dは価格に対する数量の反応係数です。</p>
  <details><summary>糸と時間の詳細設定</summary><label>履歴量 <output id="cw-history-value"></output><input id="cw-history" type="range" min="4" max="80" value="32" step="1"></label><label>再生速度 <output id="cw-speed-value"></output><input id="cw-speed" type="range" min="0.25" max="2" value="1" step="0.25"></label><p class="cw-note">1期は通常2秒。速度は演出だけを変えます。記憶する履歴は最大80期、観察は240期まで。</p></details>
  <button id="cw-default">設定を初期値へ</button><button id="cw-lesson-toggle" aria-expanded="false" aria-controls="cw-lesson">4段階の教材を開く</button><p class="cw-note">初期状態は停止。タブが非表示になるか、動きを減らす設定が有効になると停止します。1ステップでも全工程を確認できます。</p></aside></div>
  <section class="cw-lesson" id="cw-lesson" hidden aria-label="4段階の教材"><h2>糸をたどる、4つの入口</h2><div class="cw-lesson-steps">${lessons.map((l,i)=>`<button data-cw-lesson="${i}" aria-pressed="false">${i+1}. ${l.title}</button>`).join('')}</div><h3 id="cw-lesson-title"></h3><p id="cw-lesson-text"></p><div class="cw-actions"><button id="cw-lesson-prev">前の段階</button><button id="cw-lesson-next">次の段階</button></div><p class="cw-note">作品の操作を試せます。閉じるかEscapeキーで、開始前の設定・履歴・表示・入力候補へ戻ります。非表示や動きを減らす設定で停止した場合は、停止を保ちます。</p></section>
  <section class="cw-inspector" aria-label="数式と図の対応"><h2>数式に触れて、糸を読む</h2><p>ボタンを選ぶと、対応する線・交点・式を強調します。数値は確定したPₜからの次期の計算です。</p><div class="cw-formulas">
  <div class="cw-formula" data-cw-formula="demand"><button data-cw-focus="demand" aria-pressed="false">D · 需要関数</button><math data-cw-math="Q_d = a − bP"></math><p>価格が高いほど買い手の購入量は少ない、という仮定。</p><p id="cw-demand-value"></p></div>
  <div class="cw-formula" data-cw-formula="supply"><button data-cw-focus="supply" aria-pressed="false">S · 供給関数</button><math data-cw-math="Q_s = c + dP"></math><p>見えている価格に反応して、次期の生産を決める。</p><p id="cw-supply-value"></p></div>
  <div class="cw-formula" data-cw-formula="equilibrium"><button data-cw-focus="equilibrium" aria-pressed="false">E · 均衡条件</button><math data-cw-math="Q_d(P*) = Q_s(P*)"></math><math data-cw-math="P* = (a − c) / (b + d)"></math><p id="cw-equilibrium-value"></p></div>
  <div class="cw-formula" data-cw-formula="update"><button data-cw-focus="update" aria-pressed="false">糸 · 1期の更新</button><math data-cw-math="Qₜ₊₁ = c + dPₜ"></math><math data-cw-math="Pₜ₊₁ = (a − Qₜ₊₁) / b"></math><p id="cw-iteration-value"></p><p>eₜ₊₁ = −(d/b)eₜ、eₜ = Pₜ − P*。</p></div></div><p id="cw-guide"></p><button id="cw-clear">強調を解除</button></section>
  <section class="cw-inspector"><h2>市場の物語と、モデルの外側</h2><p>需要は買い手がその価格で買いたい量、供給は売り手が売りたい量です。たとえば今年の作物の価格が高いと、農家は翌年の作付けを増やすかもしれません。収穫までの遅れがあり、皆が同じように反応すると、翌年には供給過多で価格が下がる。この模型では、その安い価格を見て生産を減らすことで、再び価格が上がります。</p><p>このモデルは、単一商品・変わらない線形の需要と供給・前期価格をそのまま次期の予想に使う生産者・1期の生産期間・各期に全量が売れる市場を仮定しています。在庫、より複雑な期待や学習、情報の差、政策、複数主体の違い、心理、天候や輸入などの外部要因は省略しています。</p><p><strong>数式上で起きること ≠ 現実で必ず起きること。</strong>これは現実を完全に再現する法則ではなく、特定の前提で時間差の影響を考える道具です。負価格に向かう計算は模型の限界を示すため停止し、その値を黙って0へ補正しません。</p><p class="cw-note">学習の参考：<a href="https://intro.quantecon.org/cobweb.html" target="_blank" rel="noreferrer">QuantEcon · The Cobweb Model</a>。ここでは線形・離散時間の模型を使用。プリセットは実測市場の推定ではありません。</p></section></main>`;
  const $=<T extends HTMLElement=HTMLElement>(q:string)=>root.querySelector<T>(q)!;
  const main=$('main'),svg=root.querySelector<SVGSVGElement>('#cw-chart')!,form=$<HTMLFormElement>('#cw-settings');
  const inputs=['initialPrice','b','d'].map(name=>form.elements.namedItem(name) as HTMLInputElement);
  root.querySelectorAll<MathMLElement>('[data-cw-math]').forEach(el=>{
    el.append(renderMath(el.dataset.cwMath!));
    const scroll=document.createElement('div');scroll.className='cw-math-scroll';scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',`一般式 ${el.dataset.cwMath}`);el.before(scroll);scroll.append(el);
  });
  function fill(){for(const input of inputs)input.value=String(state.market[input.name as 'initialPrice'|'b'|'d']);}
  function candidate(){return nextStep(state.market,state.point,state.period+1);}
  function draw(){paintTrace=renderMarket(svg,state.market,state.point,state.history,state.limit,width);paintTrace(candidate(),state.progress);}
  function sync(){
    const m=state.market,e=equilibrium(m),step=candidate(),reason=stopReason(m,step),kind=stability(m),ratio=m.d/m.b;
    main.dataset.mode=state.mode;main.dataset.focus=state.focus??'';
    $('#cw-period').textContent=String(state.period);$('#cw-price').textContent=fmt(state.point.price);$('#cw-quantity').textContent=fmt(state.point.quantity);
    $('#cw-equilibrium').textContent=`均衡 E：P* ≈ ${fmt(e.price)} ／ Q* ≈ ${fmt(e.quantity)}`;
    $('#cw-behavior').textContent=`d/b ≈ ${fmt(ratio)} · ${kind==='convergent'?'収束：価格のずれが縮む':kind==='cycle'?'境界：通常は2周期（均衡からは静止）':'発散：価格のずれが広がる（均衡からは静止）'}`;
    const phase=state.progress===0?0:state.progress<0.5?1:2;
    $('#cw-phase').textContent=phase===0?`第${state.period+1}期へ：① 水平に生産決定 → ② 垂直に価格決定`:phase===1?'① 生産の準備：旧価格Pₜを見て、次期供給Qₜ₊₁を決める（水平）':'② 翌期の市場：生産済みのQₜ₊₁が売れる価格Pₜ₊₁へ（垂直）';
    $('#cw-update').textContent=`Pₜ=${fmt(state.point.price)} → Qₜ₊₁=${fmt(step.to.quantity)} → Pₜ₊₁=${fmt(step.to.price)}`;
    $('#cw-status').textContent=reason?`${reason} 次期計算：Q=${fmt(step.to.quantity)}、P=${fmt(step.to.price)}。最終有効期t=${state.period}を保持しています。`:'停止中も1ステップで1期を確定できます。設定を変えると履歴を消して比較を始めます。';
    $('#cw-play').textContent=state.playing?'停止':'再生';$<HTMLButtonElement>('#cw-play').disabled=!!reason;$<HTMLButtonElement>('#cw-step').disabled=state.playing||!!reason;
    $<HTMLSelectElement>('#cw-mode').value=state.mode;
    $<HTMLSelectElement>('#cw-preset').value=Object.entries(presets).find(([,p])=>p.b===m.b&&p.d===m.d&&p.initialPrice===m.initialPrice)?.[0]??'custom';
    $<HTMLInputElement>('#cw-history').value=String(state.limit);$('#cw-history-value').textContent=`${state.limit}期`;
    $<HTMLInputElement>('#cw-speed').value=String(state.speed);$('#cw-speed-value').textContent=`${state.speed}倍`;
    $('#cw-demand-value').textContent=`現在：Qₜ = ${m.a} − ${m.b} × ${fmt(state.point.price)} ≈ ${fmt(demand(m,state.point.price))}`;
    $('#cw-supply-value').textContent=`次期：Qₜ₊₁ = ${m.c} + ${m.d} × ${fmt(state.point.price)} ≈ ${fmt(step.to.quantity)}`;
    $('#cw-equilibrium-value').textContent=`P* = (${m.a} − ${m.c}) / (${m.b} + ${m.d}) ≈ ${fmt(e.price)}、Q* ≈ ${fmt(e.quantity)}`;
    $('#cw-iteration-value').textContent=`次期：Pₜ₊₁ = (${m.a} − ${fmt(step.to.quantity)}) / ${m.b} ≈ ${fmt(step.to.price)}`;
    $('#cw-guide').textContent=state.focus?guides[state.focus]:'D・S・E・糸のボタンをタップ、またはTabで選んで対応を確認できます。';
    root.querySelectorAll<HTMLButtonElement>('[data-cw-focus]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cwFocus===state.focus)));
    root.querySelectorAll<HTMLElement>('[data-cw-formula]').forEach(el=>el.classList.toggle('cw-selected',el.dataset.cwFormula===state.focus));
    lastPhase=phase;
  }
  function schedule(){if(!disposed&&!document.hidden&&state.playing&&raf===null)raf=requestAnimationFrame(frame);}
  function cancel(){if(raf!==null)cancelAnimationFrame(raf);raf=null;previous=null;}
  function refresh(redraw=true){sync();if(redraw)draw();schedule();}
  function advance(){const step=candidate();if(stopReason(state.market,step)){state.playing=false;return;}state.point=step.to;state.period++;state.history.push(step);state.history=state.history.slice(-80);state.progress=0;if(stopReason(state.market,candidate()))state.playing=false;}
  function frame(now:number){
    raf=null;if(disposed||document.hidden||!state.playing){previous=null;return;}
    if(previous!==null)state.progress+=Math.min(now-previous,100)/2000*state.speed;
    previous=now;
    if(state.progress>=1){advance();refresh();}else{paintTrace(candidate(),state.progress);if((state.progress<0.5?1:2)!==lastPhase)sync();}
    schedule();
  }
  function reset(m=state.market){cancel();state.market={...m};state.point=initialPoint(m);state.period=0;state.history=[];state.progress=0;state.playing=false;fill();$('#cw-error').textContent='';refresh();}
  form.onsubmit=event=>{event.preventDefault();const values=inputs.map(el=>el.value.trim()===''?NaN:Number(el.value));const m={a:120,c:0,initialPrice:values[0],b:values[1],d:values[2]};if(!validMarket(m)){$('#cw-error').textContent='未適用：範囲内の有限な数値と、0〜a/bの初期価格を入力してください。';return;}reset(m);};
  $('#cw-play').onclick=()=>{if(stopReason(state.market,candidate()))return;state.playing=!state.playing;cancel();refresh(false);};
  $('#cw-step').onclick=()=>{if(!state.playing){advance();refresh();}};
  $('#cw-reset').onclick=()=>reset();$('#cw-default').onclick=()=>reset(preset('stable'));
  $<HTMLSelectElement>('#cw-preset').onchange=event=>{const id=(event.target as HTMLSelectElement).value;if(Object.hasOwn(presets,id))reset(preset(id as PresetId));};
  $<HTMLSelectElement>('#cw-mode').onchange=event=>{state.mode=(event.target as HTMLSelectElement).value as State['mode'];refresh(false);};
  $<HTMLInputElement>('#cw-history').oninput=event=>{state.limit=Number((event.target as HTMLInputElement).value);refresh();};
  $<HTMLInputElement>('#cw-speed').oninput=event=>{state.speed=Number((event.target as HTMLInputElement).value);refresh(false);};
  root.querySelectorAll<HTMLButtonElement>('[data-cw-focus]').forEach(button=>{const select=()=>{state.focus=button.dataset.cwFocus as Focus;refresh(false);};button.onclick=select;button.onfocus=select;});
  $('#cw-clear').onclick=()=>{state.focus=null;refresh(false);};
  function lesson(index:number){lessonIndex=index;cancel();state.playing=false;state.progress=0;state.mode='teach';state.focus=lessons[index].focus;$('#cw-lesson-title').textContent=`${index+1}. ${lessons[index].title}`;$('#cw-lesson-text').textContent=lessons[index].text;root.querySelectorAll<HTMLButtonElement>('[data-cw-lesson]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));$<HTMLButtonElement>('#cw-lesson-prev').disabled=index===0;$<HTMLButtonElement>('#cw-lesson-next').disabled=index===3;refresh();}
  function closeLesson(){if(!saved)return;cancel();state=saved.state;inputs.forEach((input,i)=>input.value=saved!.drafts[i]);$('#cw-error').textContent=saved.error;saved=null;$('#cw-lesson').hidden=true;$('#cw-lesson-toggle').textContent='4段階の教材を開く';$('#cw-lesson-toggle').setAttribute('aria-expanded','false');refresh();}
  $('#cw-lesson-toggle').onclick=()=>{if(saved)closeLesson();else{saved={state:structuredClone(state),drafts:inputs.map(el=>el.value),error:$('#cw-error').textContent??''};$('#cw-lesson').hidden=false;$('#cw-lesson-toggle').textContent='教材を閉じて作品へ戻る';$('#cw-lesson-toggle').setAttribute('aria-expanded','true');lesson(0);$('#cw-lesson').scrollIntoView({block:'nearest'});}};
  root.querySelectorAll<HTMLButtonElement>('[data-cw-lesson]').forEach(b=>b.onclick=()=>lesson(Number(b.dataset.cwLesson)));
  $('#cw-lesson-prev').onclick=()=>lesson(Math.max(0,lessonIndex-1));$('#cw-lesson-next').onclick=()=>lesson(Math.min(3,lessonIndex+1));
  // WebKit mouse clicks on native buttons need not move keyboard focus inside root.
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&saved){closeLesson();$('#cw-lesson-toggle').focus();}},{signal:life.signal});
  function safetyStop(){state.playing=false;if(saved)saved.state.playing=false;cancel();sync();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)safetyStop();},{signal:life.signal});
  motion.addEventListener('change',event=>{if(event.matches)safetyStop();},{signal:life.signal});
  // Width notifications must not change SVG height during ResizeObserver delivery.
  const resize=new ResizeObserver(entries=>{const next=entries[0].contentRect.width;if(next>0&&Math.abs(next-width)>=1){width=next;if(resizeRaf===null)resizeRaf=requestAnimationFrame(()=>{resizeRaf=null;if(!disposed)draw();});}});
  resize.observe($('.cw-stage'));fill();refresh();
  return()=>{disposed=true;cancel();if(resizeRaf!==null)cancelAnimationFrame(resizeRaf);life.abort();resize.disconnect();saved=null;root.replaceChildren();};
}
