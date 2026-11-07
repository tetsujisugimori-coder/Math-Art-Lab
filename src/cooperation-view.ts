import {advance,classification,compareWorld,comparisonKeys,createWorld,defaults,neighbors,payoff,presets,validate,type ComparisonKey,type Config,type World} from './cooperation';
import {drawLattice,historyPath} from './cooperation-render';
import './cooperation.css';

const labels:Record<keyof Config,string>={size:'格子サイズ',cooperation:'初期協力者割合（0〜1）',T:'T · 誘惑',R:'R · 報酬',P:'P · 罰',S:'S · 損失',neighbors:'近傍',boundary:'境界',rule:'戦略更新規則',temperature:'Fermi温度 K',mutation:'突然変異率（0〜1）',seed:'乱数seed',layout:'初期配置',scoring:'得点の扱い'};
const choices:Partial<Record<keyof Config,[string,string][]>>={neighbors:[['4','上下左右4近傍'],['8','斜めを含む8近傍']],boundary:[['fixed','固定端（外を除外）'],['periodic','周期境界']],rule:[['best','最良戦略模倣'],['fermi','Fermi更新']],layout:[['random','ランダム混在'],['island','中央に協力者の島'],['invasion','協力社会に裏切り1人']],scoring:[['sum','近隣利得の合計'],['mean','近隣利得の平均']]};
const numeric:Partial<Record<keyof Config,[number,number,number]>>={neighbors:[4,8,4],size:[4,80,1],cooperation:[0,1,.01],T:[-1000,1000,.1],R:[-1000,1000,.1],P:[-1000,1000,.1],S:[-1000,1000,.1],temperature:[.001,1000,.001],mutation:[0,1,.001],seed:[0,4294967295,1]};
const pct=(v:number)=>`${(v*100).toFixed(1)}%`,num=(v:number|null)=>v===null?'該当者なし':v.toFixed(3),strategy=(s:number)=>s?'C（協力）':'D（裏切り）';
const lessonTexts=[
  ['協力と裏切りの利得','青の斜線Cと赤の点Dは戦略です。利得表でR・T・P・Sを選び、読み方を確かめましょう。格子の住民を選ぶと、その戦略と得点が見えます。個人の高得点と全体の協力率は別の指標です。'],
  ['隣人から得点へ','白枠の住民を選び、周囲のC・Dの人数と得点の式を比べましょう。πᵢ（パイ・アイ）は局所得点、Σ（シグマ）は近隣に対する利得の足し算です。自分との対戦はありません。合計／平均の違いは固定端で特に重要です。'],
  ['模倣から模様へ','1世代進め、選択住民の直前の判断を確認しましょう。全員が同じ旧世代を見て、同時に次の戦略へ更新します。最良模倣は自分が最高点と同点なら維持。それ以外の最高点候補は行・列順で先の住民です。突然変異はその後の独立した反転です。'],
  ['条件を一つ変える','比較設定で一項目だけ選び、同じ初期配置から左右の実験を始めましょう。世代数は同期します。同じseedでも規則に応じて戦略は分岐します。協力率・最大C集団・境界数を別々に観察し、予想と違った点を言葉にしてください。'],
];
export function mountCooperation(root:HTMLElement):()=>void{
  let left=createWorld(),right:World|null=null,selected=0,playing=false,timer:ReturnType<typeof setTimeout>|null=null,disposed=false,speed=5,lesson=0;
  const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
  const fields=(Object.keys(defaults) as (keyof Config)[]).map(key=>{const opts=choices[key],r=numeric[key];return `<label>${labels[key]}${opts?`<select name="${key}" id="cl-${key}">${opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select>`:`<input name="${key}" id="cl-${key}" type="number" min="${r![0]}" max="${r![1]}" step="${r![2]}" required>`}</label>`;}).join('');
  root.innerHTML=`<main class="cooperation" data-generation="0" data-playing="false"><header><small>MATH ART LAB / EXPERIMENT 016</small><h1>協力の格子</h1><p>THE LATTICE OF COOPERATION</p><p>自分にとっての得と、みんなにとっての協力。<br>隣人の選択が、社会の模様を変えていく。</p></header>
  <div class="cl-layout"><div class="cl-art"><div id="cl-boards"><div><h2>A · 現在の格子 <span id="cl-generation"></span></h2><div class="cl-board"><canvas id="cl-left" tabindex="0" role="img" aria-label="Aの格子。青斜線Cは協力、赤点Dは裏切り。矢印キーで住民を選択" aria-describedby="cl-selection cl-summary"></canvas></div></div><div id="cl-right-panel" hidden><h2>B · 条件を一つ変更</h2><div class="cl-board"><canvas id="cl-right" tabindex="0" role="img" aria-label="Bの比較格子。矢印キーで同じ座標を選択" aria-describedby="cl-selection cl-difference"></canvas></div></div></div>
  <p class="cl-legend"><span>╱ 青＝C 協力</span><span>● 赤＝D 裏切り</span><span>白枠＝選択、暗い枠＝近隣</span></p>
  <div class="cl-actions"><button id="cl-play">開始</button><button id="cl-step">1世代進行</button><button id="cl-reset">初期化</button></div><p id="cl-status" role="status"></p><p id="cl-summary"></p><p id="cl-classification"></p>
  <section class="cl-panel"><h2>協力率の軌跡</h2><p id="cl-chart-values"></p><svg id="cl-history" viewBox="0 0 600 200" role="img" aria-label="協力率時系列。実線A、破線B。縦軸0〜100%、横軸は世代"></svg><p id="cl-history-note"></p><p>協力率と集団構造は別の指標です。塊の大きさから協力の原因を断定しません。</p></section>
  <section class="cl-panel"><h2>同じ世代を、数字で見る</h2><p id="cl-difference"></p><div class="cl-scroll" tabindex="0" role="region" aria-label="初期・A・Bの統計比較表"><table><caption>確定世代の統計（初期はAの0世代）</caption><thead><tr><th scope="col">指標</th><th scope="col">初期A</th><th scope="col">現在A</th><th scope="col">現在B</th></tr></thead><tbody id="cl-statistics"></tbody></table></div><p>最大C集団は適用した近傍・境界による連結成分。C–D境界は異戦略の隣接ペアを重複なく数えます。近傍を変えると空間指標の定義も変わります。</p><details id="cl-initial-details"><summary>初期配置を見る</summary><div class="cl-initial-board"><canvas id="cl-initial" role="img" aria-label="今回の実験の初期配置。世代0"></canvas></div></details></section>
  <section class="cl-panel"><h2>一人のまわりから</h2><form id="cl-position"><label>行<input id="cl-row" type="number" min="1" value="1" required></label><label>列<input id="cl-column" type="number" min="1" value="1" required></label><button>住民を選択</button></form><p id="cl-selection" aria-live="polite"></p><p id="cl-equation"></p><p id="cl-reason"></p><p id="cl-reason-b"></p></section></div>
  <aside aria-label="実験の条件"><h2>実験の条件</h2><p>入力は候補です。「設定を適用」で停止し、0世代から再生成します。未適用の入力は現在の状態を変えません。初期化は適用済み条件と初期配置を再現し、候補入力を保持します。</p><label>観察プリセット<select id="cl-preset"><option value="custom">カスタム</option>${presets.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}</select></label><p id="cl-preset-note">仮説：混在から境界はどう変わるでしょうか。結果の保証ではありません。</p>
  <form id="cl-settings" novalidate>${fields}<p>島：中央の約1/4がC。侵入：中央1人だけD。この2配置では初期協力者割合を使用せず、実数を表示します。ランダムはC数を四捨五入し、seed付きで並べ替えます。</p><button type="submit">設定を適用</button><p id="cl-error" role="status"></p></form><p id="cl-applied"></p>
  <label>速度（世代/秒）<input id="cl-speed" type="range" min="1" max="20" step="1" value="5"><output id="cl-speed-value">5</output></label><p>速度だけは即時反映。非表示時・動きを減らす設定への変更時は停止します。動きを減らす設定中も明示的に開始でき、1世代操作で観察できます。</p>
  <section class="cl-compare"><h2>一条件だけ変える</h2><p>Aの適用済み設定から作成します。開始時に両方を同じ初期配置・seedの0世代へ戻します。</p><label>変更する条件<select id="cl-compare-key">${comparisonKeys.map(k=>`<option value="${k}">${labels[k]}</option>`).join('')}</select></label><label>Bの値<span id="cl-compare-input"></span></label><button id="cl-compare">同じ配置で比較開始</button><button id="cl-single">比較を終了（Aを保持）</button></section>
  <button id="cl-lesson-toggle" aria-expanded="false" aria-controls="cl-lesson">4段階の教材を開く</button></aside></div>
  <section class="cl-panel" id="cl-lesson" hidden aria-label="4段階教材"><h2>協力は、どこから生まれる？</h2><div class="cl-actions">${lessonTexts.map((t,i)=>`<button data-cl-lesson="${i}" aria-pressed="false">${i+1}. ${t[0]}</button>`).join('')}</div><h3 id="cl-lesson-title"></h3><p id="cl-lesson-text"></p><p id="cl-lesson-live"></p><p>教材は現在の実験に連動します。段階を切り替えても設定・格子を変更しません。Escapeで閉じられます。</p></section>
  <section class="cl-panel"><h2>利得を読む、模様を読む</h2><div class="cl-scroll" tabindex="0" role="region" aria-label="利得行列"><table><caption>1対戦あたりの自分の利得（記号を選ぶと説明）</caption><thead><tr><th scope="col">自分＼相手</th><th scope="col">C 協力</th><th scope="col">D 裏切り</th></tr></thead><tbody><tr><th scope="row">C 協力</th><td><button data-symbol="R">R</button></td><td><button data-symbol="S">S</button></td></tr><tr><th scope="row">D 裏切り</th><td><button data-symbol="T">T</button></td><td><button data-symbol="P">P</button></td></tr></tbody></table></div><p id="cl-symbol" aria-live="polite">R（アール）＝互いに協力した報酬。</p>
  <div class="cl-formula" tabindex="0" role="region" aria-label="利得合計とFermi模倣確率の数式"><math aria-label="パイ・アイは近隣との利得の合計"><msub><mi>π</mi><mi>i</mi></msub><mo>=</mo><munder><mo>Σ</mo><mrow><mi>j</mi><mo>∈</mo><msub><mi>N</mi><mi>i</mi></msub></mrow></munder><mi>a</mi><mo>(</mo><msub><mi>s</mi><mi>i</mi></msub><mo>,</mo><msub><mi>s</mi><mi>j</mi></msub><mo>)</mo></math><math aria-label="ダブリューは1を1足す指数関数で割る。指数は自分の得点ひく相手の得点をケーで割る"><mi>W</mi><mo>=</mo><mfrac><mn>1</mn><mrow><mn>1</mn><mo>+</mo><mi>exp</mi><mo>(</mo><mfrac><mrow><msub><mi>π</mi><mi>i</mi></msub><mo>−</mo><msub><mi>π</mi><mi>j</mi></msub></mrow><mi>K</mi></mfrac><mo>)</mo></mrow></mfrac></math></div>
  <p>πᵢ（パイ・アイ）は住民iの得点、Nᵢ（エヌ・アイ）は近隣、s（エス）は戦略、a（エー）は利得行列の値。平均得点では合計を近隣人数で割ります。固定端は外の住民を除外し、周期境界は反対側につながります。自己対戦は含みません。</p><p>Fermi（フェルミ）は近隣から1人を一様に選び、W（ダブリュー）の確率でその旧戦略を採用します。K（ケー）は温度、正数です。小さいほど高得点への選好が強く、大きいほど得点差の影響が弱くなります。同点なら1/2。悪い得点の戦略も採用する可能性があります。最良模倣は自分と近隣を候補にし、自分が最高点なら維持、それ以外の同点は行・列順です。</p><p>厳密な囚人のジレンマはT&gt;R&gt;P&gt;S。弱い場合P=Sを区別します。2R&gt;T+Sは交互に搾取する2回の合計より相互協力2回の合計が大きいという追加条件です。順序条件とは独立に判定します。条件外でも入力値を補正せず、一般ゲームとして計算します。</p><p>住民は移動せず、戦略だけが変わります。突然変異は模倣決定後、各セル独立に確率μ（ミュー）で反転させます。変更数は旧状態と最終状態の差、突然変異数は反転処理数です。二度の変化が打ち消す場合もあります。</p><p><strong>これは抽象的な数理モデルです。現実の人間社会を二戦略だけで説明し尽くすことはできません。</strong>意図、記憶、制度、関係の選択などを省略しています。</p><p>参考：<a href="https://www.nature.com/articles/359826a0">Nowak &amp; May (1992)</a>、<a href="https://arxiv.org/abs/cond-mat/9710096">Szabó &amp; Tőke (1998)</a>。本作品のFermiは同期更新であり、原著の無作為逐次更新と同一ではありません。</p></section></main>`;
  const $=<T extends HTMLElement=HTMLElement>(q:string)=>root.querySelector<T>(q)!;
  const form=$<HTMLFormElement>('#cl-settings'),main=$('main'),canvas=$<HTMLCanvasElement>('#cl-left');
  function fill(c:Config){for(const k of Object.keys(c) as (keyof Config)[])($(`#cl-${k}`) as HTMLInputElement).value=String(c[k]);}
  function pause(){playing=false;if(timer!==null)clearTimeout(timer);timer=null;}
  function paint(){drawLattice(canvas,left,selected);if(right)drawLattice($<HTMLCanvasElement>('#cl-right'),right,selected);if($<HTMLDetailsElement>('#cl-initial-details').open)drawLattice($<HTMLCanvasElement>('#cl-initial'),left,null,left.initial);chart();}
  function chart(){const svg=root.querySelector<SVGSVGElement>('#cl-history')!,width=Math.max(240,svg.getBoundingClientRect().width);svg.setAttribute('viewBox',`0 0 ${width} 200`);svg.innerHTML=`<path d="M40,20V160H${width-20}" class="cl-axis"/><text x="0" y="24">100%</text><text x="10" y="164">0%</text><text x="40" y="188">${left.history[0].generation}</text><text x="${width-80}" y="188">${left.generation} 世代</text><path id="cl-line-a" d="${historyPath(left,width)}"/>${right?`<path id="cl-line-b" d="${historyPath(right,width)}"/>`:''}`;}
  function reason(w:World):string{
    const d=w.decisions[selected];if(!d)return '初期状態：戦略更新はまだありません。';
    return `直前 ${w.generation-1}→${w.generation}世代：旧${strategy(d.before)}、旧得点 ${num(d.ownScore)}。候補（${Math.floor(d.source/w.config.size)+1}, ${d.source%w.config.size+1}）旧得点 ${num(d.sourceScore)}。${d.probability===null?'最高点を比較':`模倣確率 W=${d.probability.toFixed(6)}`}、${d.adopted?'採用':'不採用'}→${strategy(d.imitated)}。突然変異：${d.mutated?'反転あり':'なし'}。確定 ${strategy(w.cells[selected])}。`;
  }
  function observe(){const c=left.config,s=left.cells[selected],ns=neighbors(c,selected),nc=ns.filter(j=>left.cells[j]).length,nd=ns.length-nc;
    $('#cl-selection').textContent=`座標（行 ${Math.floor(selected/c.size)+1}, 列 ${selected%c.size+1}） A：${strategy(s)}、局所得点 ${num(left.scores[selected])}。近隣 C ${nc}人 / D ${nd}人。${right?`B：${strategy(right.cells[selected])}、局所得点 ${num(right.scores[selected])}。`:''}`;
    $('#cl-equation').textContent=`A · πᵢ = ${nc} × ${s?'R':'T'}(${payoff(s,1,c)}) + ${nd} × ${s?'S':'P'}(${payoff(s,0,c)})${c.scoring==='mean'?`、合計を ${ns.length}人で割る`:''} = ${num(left.scores[selected])}。現在 ${left.generation}世代の得点。`;
    $('#cl-reason').textContent=`A · ${reason(left)}`;$('#cl-reason-b').textContent=right?`B · ${reason(right)}`:'';
    $('#cl-row').setAttribute('max',String(c.size));$('#cl-column').setAttribute('max',String(c.size));
    $('#cl-lesson-live').textContent=`${left.generation}世代。協力率A ${pct(left.metrics.rate)}${right?` / B ${pct(right.metrics.rate)}`:''}。選択住民の現在得点 ${num(left.scores[selected])}。${lesson===1?$('#cl-equation').textContent:lesson===2?reason(left):''}`;
  }
  function refresh(){
    main.dataset.generation=String(left.generation);main.dataset.playing=String(playing);$('#cl-generation').textContent=`/ ${left.generation}世代`;
    $('#cl-play').textContent=playing?'停止':'開始';$<HTMLButtonElement>('#cl-step').disabled=playing;
    $('#cl-status').textContent=`${playing?'実行中':'停止中'} · 両条件は確定世代で描画・集計します。`;
    const m=left.metrics,c=left.config;$('#cl-summary').textContent=`A：協力者 ${m.cooperators}人 / 裏切り者 ${m.defectors}人、協力率 ${pct(m.rate)}、変更 ${m.changed}人。`;
    $('#cl-classification').textContent=`A：${classification(c)}。追加条件 2R>T+S：${2*c.R>c.T+c.S?'成立':'不成立'}（${2*c.R} ${2*c.R>c.T+c.S?'>':'≤'} ${c.T+c.S}）。${right?`B：${classification(right.config)}。2R>T+S：${2*right.config.R>right.config.T+right.config.S?'成立':'不成立'}。`:''}`;
    $('#cl-applied').textContent=`適用中A：${(Object.keys(c) as (keyof Config)[]).map(k=>`${labels[k]}=${c[k]}`).join('、')}。`;
    $('#cl-right-panel').hidden=!right;$('#cl-boards').classList.toggle('cl-paired',!!right);
    const diffs=right?(Object.keys(c) as (keyof Config)[]).filter(k=>c[k]!==right!.config[k]):[];
    $('#cl-difference').textContent=right?`同じ初期配置・seed ${c.seed}。差分1項目：${diffs.map(k=>`${labels[k]} A=${c[k]} → B=${right!.config[k]}`).join('、')}。A / B とも ${left.generation}世代。`:'比較なし。初期Aと現在Aを比べられます。';
    const rows:[string,(m:World['metrics'])=>string][]=[['世代',m=>String(m.generation)],['協力者数',m=>String(m.cooperators)],['裏切り者数',m=>String(m.defectors)],['協力率',m=>pct(m.rate)],['Cの平均利得',m=>num(m.meanC)],['Dの平均利得',m=>num(m.meanD)],['戦略変更数',m=>String(m.changed)],['突然変異数',m=>String(m.mutations)],['最大C集団',m=>String(m.largest)],['C–D境界ペア',m=>String(m.boundaryPairs)]];
    $('#cl-statistics').innerHTML=rows.map(([label,f])=>`<tr><th scope="row">${label}</th><td>${f(left.initialMetrics)}</td><td>${f(m)}</td><td>${right?f(right.metrics):'—'}</td></tr>`).join('');
    $('#cl-chart-values').textContent=`${left.generation}世代：実線 A ${pct(m.rate)}${right?` / 破線 B ${pct(right.metrics.rate)}`:''}`;
    $('#cl-history-note').textContent=`直近 ${left.history.length}点（最大600世代分）。初期統計と初期配置は別に保持。平滑化なし。`;
    root.querySelectorAll<HTMLButtonElement>('[data-symbol]').forEach(b=>b.textContent=`${b.dataset.symbol} = ${c[b.dataset.symbol as 'R']}`);
    observe();paint();
  }
  function schedule(){if(!playing||disposed||timer!==null)return;timer=setTimeout(()=>{timer=null;if(!playing||disposed)return;left=advance(left);if(right)right=advance(right);refresh();schedule();},1000/speed);}
  function reset(a:World,b:World|null=null){pause();left=a;right=b;selected=0;$('#cl-error').textContent='';refresh();}
  function compareInput(){const key=$<HTMLSelectElement>('#cl-compare-key').value as ComparisonKey,opts=choices[key],r=numeric[key];$('#cl-compare-input').innerHTML=opts?`<select id="cl-compare-value">${opts.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select>`:`<input id="cl-compare-value" type="number" min="${r![0]}" max="${r![1]}" step="${r![2]}" required>`;
    const field=$<HTMLInputElement>('#cl-compare-value');field.value=key==='neighbors'?String(left.config.neighbors===4?8:4):key==='rule'?(left.config.rule==='best'?'fermi':'best'):key==='boundary'?(left.config.boundary==='fixed'?'periodic':'fixed'):key==='scoring'?(left.config.scoring==='sum'?'mean':'sum'):String(key==='mutation'?(left.config.mutation===0?.01:0):key==='T'?left.config.T+1:left.config.temperature*2);
  }
  form.onsubmit=e=>{e.preventDefault();try{const c={...defaults};for(const key of Object.keys(c) as (keyof Config)[]){const f=$<HTMLInputElement>(`#cl-${key}`),value=numeric[key]?(f.value.trim()===''?NaN:Number(f.value)):f.value;(c as unknown as Record<string,unknown>)[key]=value;}validate(c);
      const p=presets[Number($<HTMLSelectElement>('#cl-preset').value)],a=createWorld(c);
      if(p?.compare&&Object.keys(c).every(k=>c[k as keyof Config]===p.config[k as keyof Config])){const [x,y]=compareWorld(a,p.compare,p.value as Config[ComparisonKey]);reset(x,y);}else reset(a);
      compareInput();
    }catch(e){$('#cl-error').textContent=(e as Error).message;}};
  form.oninput=()=>{$<HTMLSelectElement>('#cl-preset').value='custom';$('#cl-preset-note').textContent='カスタム候補・未適用。現在の格子と条件を保持中。';};
  $<HTMLSelectElement>('#cl-preset').onchange=()=>{const p=presets[Number($<HTMLSelectElement>('#cl-preset').value)];if(p){fill(p.config);$('#cl-preset-note').textContent=`未適用。seed ${p.config.seed}。仮説：${p.note} 必ず起きるとは限りません。`;}};
  $('#cl-play').onclick=()=>{if(playing)pause();else playing=true;refresh();schedule();};$('#cl-step').onclick=()=>{left=advance(left);if(right)right=advance(right);refresh();};
  $('#cl-reset').onclick=()=>reset(createWorld(left.config,left.initial),right?createWorld(right.config,right.initial):null);
  $('#cl-compare-key').onchange=compareInput;
  $('#cl-compare').onclick=()=>{try{const key=$<HTMLSelectElement>('#cl-compare-key').value as ComparisonKey,raw=$<HTMLInputElement>('#cl-compare-value').value,value=numeric[key]?(raw.trim()===''?NaN:Number(raw)):raw;const [a,b]=compareWorld(left,key,value as Config[ComparisonKey]);reset(a,b);}catch(e){$('#cl-error').textContent=(e as Error).message;}};
  $('#cl-single').onclick=()=>{right=null;refresh();};
  $<HTMLInputElement>('#cl-speed').oninput=()=>{speed=Number($<HTMLInputElement>('#cl-speed').value);$('#cl-speed-value').textContent=String(speed);if(timer!==null)clearTimeout(timer);timer=null;schedule();};
  for(const id of ['#cl-left','#cl-right']){const cv=$<HTMLCanvasElement>(id);cv.onclick=e=>{const r=cv.getBoundingClientRect(),n=left.config.size;selected=Math.min(n-1,Math.max(0,Math.floor((e.clientY-r.top)/r.height*n)))*n+Math.min(n-1,Math.max(0,Math.floor((e.clientX-r.left)/r.width*n)));observe();paint();};cv.onkeydown=e=>{const n=left.config.size,row=Math.floor(selected/n),col=selected%n,moves:Record<string,number>={ArrowLeft:row*n+Math.max(0,col-1),ArrowRight:row*n+Math.min(n-1,col+1),ArrowUp:Math.max(0,row-1)*n+col,ArrowDown:Math.min(n-1,row+1)*n+col};if(e.key in moves){e.preventDefault();selected=moves[e.key];observe();paint();}};}
  $<HTMLFormElement>('#cl-position').onsubmit=e=>{e.preventDefault();const row=Number($<HTMLInputElement>('#cl-row').value),col=Number($<HTMLInputElement>('#cl-column').value),n=left.config.size;if(Number.isInteger(row)&&Number.isInteger(col)&&row>=1&&col>=1&&row<=n&&col<=n){selected=(row-1)*n+col-1;observe();paint();}};
  const descriptions={R:'R（アール）：相互協力の報酬。C対C。',T:'T（ティー）：相手の協力に裏切りで応じる誘惑。D対C。',P:'P（ピー）：相互裏切りの罰。D対D。',S:'S（エス）：相手に裏切られた協力者の利得。C対D。'};
  root.querySelectorAll<HTMLButtonElement>('[data-symbol]').forEach(b=>b.onclick=()=>{$('#cl-symbol').textContent=`${descriptions[b.dataset.symbol as 'R']} 適用値 ${left.config[b.dataset.symbol as 'R']}。`;});
  function showLesson(i:number){lesson=i;$('#cl-lesson-title').textContent=`${i+1}. ${lessonTexts[i][0]}`;$('#cl-lesson-text').textContent=lessonTexts[i][1];root.querySelectorAll<HTMLButtonElement>('[data-cl-lesson]').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));observe();}
  function closeLesson(){ $('#cl-lesson').hidden=true;$('#cl-lesson-toggle').setAttribute('aria-expanded','false');$('#cl-lesson-toggle').focus();}
  $('#cl-lesson-toggle').onclick=()=>{if(!$('#cl-lesson').hidden){closeLesson();return;}pause();refresh();$('#cl-lesson').hidden=false;$('#cl-lesson-toggle').setAttribute('aria-expanded','true');showLesson(0);$('#cl-lesson').scrollIntoView({block:'nearest'});};
  root.querySelectorAll<HTMLButtonElement>('[data-cl-lesson]').forEach(b=>b.onclick=()=>showLesson(Number(b.dataset.clLesson)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#cl-lesson').hidden)closeLesson();},{signal:life.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause();refresh();}},{signal:life.signal});motion.addEventListener('change',()=>{if(motion.matches){pause();refresh();}},{signal:life.signal});
  $<HTMLDetailsElement>('#cl-initial-details').ontoggle=paint;
  const ro=new ResizeObserver(()=>{if(!disposed)paint();});root.querySelectorAll('.cl-board,.cl-initial-board').forEach(el=>ro.observe(el));
  fill(defaults);compareInput();refresh();return()=>{disposed=true;pause();ro.disconnect();life.abort();root.replaceChildren();};
}
