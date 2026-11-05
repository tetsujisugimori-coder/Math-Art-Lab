import {buildField,defaults,evaluate,EXTENT,OMEGA,parseNumber,PERIOD,presets,radians,RESOLUTION,screenPoint,sources,STEP,valid,validPoint,waveNumber,type Mode,type Palette,type Point,type Settings} from './ripple';
import {GLOW_RESOLUTION,legendPixels,paintPixels,paletteNames} from './ripple-render';
import {renderMath} from './inspector';
import './ripple.css';

const symbols={
  N:['エヌ','波源の個数。j=0からN−1までのN個を、重複なく円周上に置きます。すべての波源を丸で強調します。'],
  R:['アール','中心Oから波源までの配置半径。放射状の実線が各波源までのRです。'],
  lambda:['ラムダ','波長λ。波の山から次の山までの距離。波源0を中心とする二つの円の半径差と、線分の長さがλです。'],
  theta:['シータ','配置の回転角θ。右向きが0°です。中心の図は0°から現在の配置角までを示します。'],
  r:['アール・ジェー','観察点Pから選んだ波源jまでの距離r_j。破線で結びます。'],
  A:['エー・ジェー','各波源の振幅A_j。本作は共通のA。波源jのそばの縦線が振幅に比例する長さです。距離による減衰は省略します。'],
  phi:['ファイ・ジェー','初期位相φ_jは波の開始位置のずれ。発展操作では波源0だけをずらします。図の点線円はt=0での基準の山、実線円は位相をずらした山です。'],
  C:['シー','Pで取り得る合成変位の包絡振幅。Pの外側の丸の半径はCに比例します。下の値と各波の和も確認できます。'],
  sigma:['シグマ','Σは指定範囲の値を全部足す記号。図の全波源が足し算に参加します。'],
  k:['ケー','波数k=2π/λ。距離がλだけ増すと、位相krは2πラジアン増えます。'],
  omega:['オメガ','角振動数ω。振動の速さで、本作では2π/6 rad/sです。全波源は同じ周期T=6で振動します。'],
  t:['ティー','時刻t。瞬間変位uは時間で変化し、包絡振幅Cと強度相当量Iは変化しません。'],
  u:['ユー','同じ位置・同じ時刻で各波の変位を、正負も含めて足した結果です。'],
  I:['アイ','教材用の強度相当量I=C²。実際の照度や水面波のエネルギーを厳密に再現する量ではありません。'],
} as const;
type SymbolId=keyof typeof symbols;
type State={settings:Settings;time:number;playing:boolean;mode:Mode;palette:Palette;guides:boolean;glow:boolean;point:Point;target:number;symbol:SymbolId|null};
const initial=():State=>({settings:defaults(),time:0,playing:false,mode:'intensity',palette:'aurora',guides:false,glow:true,point:{x:.7,y:.4},target:0,symbol:null});
const lessonTitles=['ひとつの波','波を重ねる','対称性を作る','万華鏡を完成させる'];
const lessonCopy=[
  '1つの波源を表示中。瞬間変位uで円形の山と谷を観察します。λを短くすると間隔が狭く、Aを小さくすると変位が小さくなります。再生または1ステップを試してください。減衰と到達前線のない、領域全体に存在する波です。',
  '2つの波源を表示中。同じPで正負の変位を足すと、強め合う場所と弱め合う場所ができます。Cを選ぶと時間に依存しない包絡振幅に切り替わります。第7作「波紋の対話」と同じ重ね合わせの考え方です。',
  '同じ振幅・同じ位相の波源を円周上に等間隔配置しています。Nを3、4、5、6に変え、2π/N回した点でも値が同じことを考えてみましょう。N回回転対称性は、見える花弁の本数を保証しません。',
  'すべての設定・表示・色彩を自由に組み合わせます。uは瞬間変位、Cは包絡振幅、I=C²は教材用の強度相当量。発展操作で波源0の位相をずらすと、基本のN回回転対称性は一般には崩れます。',
];
const fields=[['wavelength','波長 λ',.5,4],['radius','配置半径 R',.25,3],['amplitude','共通振幅 A',0,2],['angle','配置角 θ（度）',-180,180],['phase','発展：波源0の位相 φ₀（度）',-180,180]] as const;
const fmt=(v:number)=>Math.abs(v)<1e-10?'0':Number(v.toPrecision(5)).toString();
const symbol=(id:SymbolId,label:string)=>`<button type="button" data-rk-symbol="${id}" aria-pressed="false" aria-label="${label}：${symbols[id][0]}">${label}</button>`;

export function mountRipple(root:HTMLElement):()=>void {
  document.body.classList.add('ripple-active');
  const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
  let state=initial(),lesson=-1,saved:{state:State;drafts:string[];error:string;pointError:string}|null=null;
  let disposed=false,raf:number|null=null,previous:number|null=null,lastUI=0,dirty=true,field=buildField(state.settings),builds=1,draws=0;
  root.innerHTML=`<main class="ripple"><header><small>MATH ART LAB / EXPERIMENT 013</small><h1>波紋の万華鏡</h1><p>複数の波が生む干渉と対称性を、光の花として観察する。<br><span lang="en">Ripple Kaleidoscope</span></p></header>
  <div class="rk-layout"><div class="rk-art"><div class="rk-plaque"><span>INTERFERENCE / SYMMETRY</span><span id="rk-symmetry"></span></div>
  <div id="rk-stage" tabindex="0" role="group" aria-label="干渉模様。クリック・タップで観察点Pを選択。矢印キーでPを移動" aria-describedby="rk-hint"><canvas id="rk-canvas" width="${RESOLUTION}" height="${RESOLUTION}" aria-label="複数の円形波の計算画像"></canvas><canvas id="rk-glow" width="${GLOW_RESOLUTION}" height="${GLOW_RESOLUTION}" aria-hidden="true"></canvas><svg id="rk-guides" viewBox="0 0 400 400" aria-hidden="true"></svg></div>
  <p id="rk-hint">座標 x,y：−5〜5、上がyの正。図をクリック・タップ、または図にTabで移動して矢印キーでPを選択（0.1単位）。図の上でも縦スクロールできます。円形の窓の外のPは数値だけで確認します。</p><p id="rk-guide-key" hidden></p>
  <div class="rk-legend"><canvas id="rk-scale" width="3" height="1" aria-hidden="true"></canvas><p id="rk-legend"></p><p>色は数値の可視化です。物理的な波長そのものの色ではありません。光彩ONでは色を重ねます。定量比較は光彩OFFで。</p></div>
  <div class="rk-actions"><button id="rk-play">再生</button><button id="rk-step">1ステップ</button><button id="rk-time-reset">時刻を初期化</button></div><output id="rk-clock" aria-live="off"></output><p>周期T=6、1ステップ=0.05。包絡振幅と強度は再生しても静止します。非表示・動きを減らす設定の有効化で停止し、再開は手動です。</p>
  <div class="rk-observation"><h2>観察点 P と波の足し算</h2><output id="rk-observation" aria-live="off"></output><details><summary>各波源の距離・位相・瞬間変位</summary><div id="rk-terms"></div></details></div>
  <div id="rk-fallback" role="status" hidden></div>
  <button id="rk-lesson-toggle">4段階の教材を開く</button><div id="rk-lesson" hidden><div class="rk-steps">${lessonTitles.map((t,i)=>`<button data-rk-lesson="${i}" aria-pressed="false">${i+1}. ${t}</button>`).join('')}</div><p id="rk-lesson-copy"></p><p>終了またはEscapeで開始前の設定・時刻・P・表示・入力候補へ戻ります。教材中の安全停止は復元後も保ちます。</p></div>
  </div><aside><h2>光の条件</h2><label>模様のプリセット<select id="rk-preset"><option value="custom" disabled>カスタム設定</option>${presets.map((p,i)=>`<option value="${i}">${p.name}</option>`).join('')}</select></label><p>名称は印象です。花弁の本数や数学的な形を保証しません。</p>
  <label>表示モード<select id="rk-mode"><option value="displacement">瞬間変位 u</option><option value="envelope">包絡振幅 C</option><option value="intensity">干渉の強度 I = C²</option></select></label>
  <label>色彩<select id="rk-palette">${Object.entries(paletteNames).map(([id,name])=>`<option value="${id}">${name}</option>`).join('')}</select></label>
  <label class="rk-check"><input id="rk-guide-check" type="checkbox">波源・対称性ガイド</label><label class="rk-check"><input id="rk-glow-check" type="checkbox" checked>光彩（表示上の演出）</label>
  <form id="rk-settings" novalidate><label>波源数 N<select name="count" id="rk-count">${Array.from({length:8},(_,i)=>`<option value="${i+1}">${i+1}個</option>`).join('')}</select></label>
  ${fields.map(([key,label,min,max])=>`<label>${label}（${min}〜${max}）<input id="rk-${key}" name="${key}" type="number" min="${min}" max="${max}" step="any" required></label>`).join('')}
  <button type="submit">設定を適用</button><p id="rk-error" role="status"></p></form><p>入力は候補です。適用すると時刻0で停止します。φ₀=0が基本対称モード。φ₀≠0は位相を崩す発展モードです。操作範囲は画質と計算量のための制限です。</p><button id="rk-default">設定を初期化</button>
  <label>距離・振幅を調べる波源 j<select id="rk-target"></select></label><form id="rk-point-form" novalidate><div class="rk-pair"><label>Pのx<input name="x" type="number" step="any" min="-5" max="5" required></label><label>Pのy<input name="y" type="number" step="any" min="-5" max="5" required></label></div><button>Pを適用</button><p id="rk-point-error" role="status"></p></form>
  </aside></div>
  <section class="rk-equations"><h2>数式を選んで、図とつなぐ</h2><p>記号ボタンはクリック・タップ・Tabで選べます。図での強調と日本語の読み方が連動します。Enter／Spaceでも選択できます。</p>
  <div class="rk-formula"><p>${symbol('r','r_j')} = √((x−x_j)²+(y−y_j)²)</p><p>x_j = ${symbol('R','R')} cos(2πj/${symbol('N','N')} + ${symbol('theta','θ')})、 y_j = R sin(2πj/N + θ)</p><p>u_j = ${symbol('A','A_j')} cos(${symbol('k','k')} r_j − ${symbol('omega','ω')}${symbol('t','t')} + ${symbol('phi','φ_j')})</p><p>${symbol('u','u')} = ${symbol('sigma','Σ')}[j=0..N−1] u_j、 k = 2π/${symbol('lambda','λ')}</p><p>${symbol('C','C')} = |Σ[j=0..N−1] A_j exp(i(kr_j+φ_j))|、 ${symbol('I','I')} = C²</p></div>
  <div id="rk-math" class="math-scroll" tabindex="0" role="region" aria-label="複素振幅の実部と虚部による計算式"></div>
  <div id="rk-symbol-copy" role="status">記号を選ぶと読み方と意味を表示します。</div><button id="rk-clear">強調を解除</button><button id="rk-jump">図形を確認</button><output id="rk-current"></output>
  <p>exp(iα)=cosα+i sinα。iは虚数単位、| |は複素数の大きさ。X=ΣA_j cos(kr_j+φ_j)、Y=ΣA_j sin(kr_j+φ_j)と置くと、u=X cos(ωt)+Y sin(ωt)、C=√(X²+Y²)です。</p></section>
  <footer>理想化モデル：同じ振動数の円形波を、距離による振幅減衰なしで重ねます。反射・到達前線・実際の光学系の照度や水面波のエネルギーは再現しません。表示は円形の窓で切り取った画素中心の近似です。等位相ではN回回転対称ですが、見える花弁はλ・R・表示範囲・色変換にも依存します。</footer></main>`;
  const $=<T extends HTMLElement=HTMLElement>(q:string)=>root.querySelector<T>(q)!;
  const canvas=$<HTMLCanvasElement>('#rk-canvas'),glow=$<HTMLCanvasElement>('#rk-glow'),stage=$('#rk-stage'),form=$<HTMLFormElement>('#rk-settings'),pointForm=$<HTMLFormElement>('#rk-point-form');
  const context=canvas.getContext('2d',{alpha:false}),glowContext=glow.getContext('2d');
  const legend=$<HTMLCanvasElement>('#rk-scale');let legendKey='',legendDraws=0;
  function drawLegend() {
    const cssWidth=legend.getBoundingClientRect().width;if(cssWidth<=0)return;
    const width=Math.max(3,Math.min(4097,Math.round(cssWidth*(devicePixelRatio||1)))),key=`${width}/${state.mode}/${state.palette}`;
    if(key===legendKey)return;
    const ctx=legend.getContext('2d',{alpha:false});if(!ctx||ctx.isContextLost?.())return;
    legend.width=width;const row=ctx.createImageData(width,1);row.data.set(legendPixels(width,state.mode,state.palette));ctx.putImageData(row,0,0);
    legendKey=key;legend.dataset.draws=String(++legendDraws);
  }
  const image=context?.createImageData(RESOLUTION,RESOLUTION);
  const inputs=()=>Array.from(root.querySelectorAll<HTMLInputElement|HTMLSelectElement>('#rk-settings input,#rk-settings select,#rk-point-form input'));
  const input=(f:HTMLFormElement,key:string)=>f.elements.namedItem(key) as HTMLInputElement;
  const math=document.createElementNS('http://www.w3.org/1998/Math/MathML','math');math.append(renderMath('X = Σ A_j cos(kr_j+φ_j), Y = Σ A_j sin(kr_j+φ_j), C = √(X²+Y²)'));$('#rk-math').append(math);
  function fill() {input(form,'count').value=String(state.settings.count);for(const [key] of fields)input(form,key).value=String(state.settings[key]);fillPoint();}
  function fillPoint() {input(pointForm,'x').value=fmt(state.point.x);input(pointForm,'y').value=fmt(state.point.y);}
  function rebuild() {field=buildField(state.settings);builds++;dirty=true;}
  function draw() {
    if(!context||!image||context.isContextLost?.()) throw Error('Canvas 2Dを利用できません');
    paintPixels(field,state.mode,state.palette,state.time,image.data);context.putImageData(image,0,0);
    if(glowContext) {
      glowContext.clearRect(0,0,GLOW_RESOLUTION,GLOW_RESOLUTION);
      if(state.glow) {
        // Nine nearby low-resolution copies spread the light. No CSS blur or
        // full-size blend surface, and no writes to the numerical base raster.
        glowContext.globalAlpha=.18;glowContext.globalCompositeOperation='lighter';
        for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)glowContext.drawImage(canvas,x,y,GLOW_RESOLUTION,GLOW_RESOLUTION);
        glowContext.globalAlpha=1;glowContext.globalCompositeOperation='source-over';
      }
    }
    dirty=false;draws++;stage.dataset.draws=String(draws);stage.dataset.builds=String(builds);stage.dataset.painted=JSON.stringify({settings:state.settings,mode:state.mode,palette:state.palette,time:state.time});
    $('#rk-fallback').hidden=true;
  }
  const X=(x:number)=>200+x*40,Y=(y:number)=>200-y*40;
  function overlay() {
    const s=state.settings,origins=sources(s),id=state.symbol,v=evaluate(s,state.point,state.time),target=origins[state.target];
    const show=state.guides||id!==null;
    let markup='';
    if(show) {
      markup+=`<g class="rk-geometry"><circle cx="200" cy="200" r="${s.radius*40}"/><path d="M194 200H206M200 194V206"/><text x="206" y="215">O</text></g>`;
      if(state.guides||id==='R'||id==='N'||id==='sigma') markup+=`<g class="${id==='R'?'rk-hot':'rk-geometry'}" data-guide="radius">${origins.map(p=>`<path d="M200 200L${X(p.x)} ${Y(p.y)}"/>`).join('')}</g>`;
      if(state.guides)markup+=`<g class="rk-axes">${origins.map((_,j)=>{const a=radians(s.angle)+Math.PI*j/s.count,x=4.8*Math.cos(a),y=4.8*Math.sin(a);return `<path d="M${X(-x)} ${Y(-y)}L${X(x)} ${Y(y)}"/>`;}).join('')}</g>`;
      markup+=`<g data-guide="sources" class="rk-sources ${id==='N'||id==='sigma'?'rk-hot':''}">${origins.map(p=>`<g data-source="${p.index}" transform="translate(${X(p.x)} ${Y(p.y)})"><circle r="${id==='N'||id==='sigma'?6:4}"/><text x="7" y="-7">${p.index}</text></g>`).join('')}</g>`;
      markup+=`<g class="rk-point" transform="translate(${X(state.point.x)} ${Y(state.point.y)})"><path d="M-6 0H6M0-6V6"/><text x="8" y="12">P</text></g>`;
      if(id==='r')markup+=`<g class="rk-hot" data-guide="distance"><path stroke-dasharray="5 3" d="M${X(state.point.x)} ${Y(state.point.y)}L${X(target.x)} ${Y(target.y)}"/><text x="${X((state.point.x+target.x)/2)}" y="${Y((state.point.y+target.y)/2)-6}">r_${state.target}≈${fmt(v.terms[state.target].distance)}</text></g>`;
      if(id==='A')markup+=`<g class="rk-hot" data-guide="amplitude"><path d="M${X(target.x)+10} ${Y(target.y)}v${-s.amplitude*15}m-4 0h8"/><text x="${X(target.x)+18}" y="${Y(target.y)-10}">A=${fmt(s.amplitude)}</text></g>`;
      if(id==='lambda'||id==='k'||id==='phi') {
        const p=origins[0],cx=X(p.x),cy=Y(p.y),r=s.wavelength*40;
        markup+=`<g class="rk-hot" data-guide="wavelength"><circle cx="${cx}" cy="${cy}" r="${id==='phi'?r:.1*r}" stroke-dasharray="3 3"/>`;
        if(id==='phi') {const shifted=s.wavelength*(1-s.phase/360)*40;markup+=`<circle data-guide="phase" cx="${cx}" cy="${cy}" r="${shifted}"/><text x="${cx-35}" y="${cy+16}">t=0, φ₀=${fmt(s.phase)}°</text>`;}
        else {const dx=-p.x/s.radius,dy=p.y/s.radius;markup+=`<circle cx="${cx}" cy="${cy}" r="${1.1*r}"/><path d="M${cx+dx*.1*r} ${cy+dy*.1*r}L${cx+dx*1.1*r} ${cy+dy*1.1*r}"/><text x="${cx+dx*.6*r+5}" y="${cy+dy*.6*r-7}">λ</text>`;}
        markup+='</g>';
      }
      if(id==='theta') {
        const a=radians(s.angle),points=Array.from({length:33},(_,j)=>`${200+36*Math.cos(a*j/32)},${200-36*Math.sin(a*j/32)}`).join(' ');
        const direction=s.angle>0?'↺':s.angle<0?'↻':'回転なし';
        markup+=`<g class="rk-hot" data-guide="angle"><path d="M200 200h45" stroke-dasharray="3 3"/>${s.angle===0?'':`<polyline points="${points}" marker-end="url(#rk-arrow)"/>`}<text x="200" y="258" text-anchor="middle">θ=${s.angle>0?'+':''}${s.angle}° ${direction}</text></g>`;
      }
      if(id==='C'||id==='I'||id==='u'||id==='t'||id==='omega')markup+=`<g class="rk-hot" data-guide="envelope"><circle cx="${X(state.point.x)}" cy="${Y(state.point.y)}" r="${16*v.C/(2*s.count)}"/><text x="${Math.min(300,X(state.point.x)+12)}" y="${Math.max(20,Y(state.point.y)-14)}">C≈${fmt(v.C)}</text></g>`;
    }
    $('#rk-guides').innerHTML=`<defs><marker id="rk-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill="#ffe4a8"/></marker></defs>${markup}`;
    stage.dataset.highlight=id??'';
  }
  function syncTime() {
    const v=evaluate(state.settings,state.point,state.time),bound=2*state.settings.count;
    $('#rk-clock').textContent=`t ≈ ${fmt(state.time)} · ${state.playing?'再生中':'停止中'}`;
    $('#rk-observation').textContent=`P=(${fmt(state.point.x)}, ${fmt(state.point.y)}) · u≈${fmt(v.u)} · C≈${fmt(v.C)} · I=C²≈${fmt(v.I)} · I/(4N²)≈${fmt(v.I/(bound*bound))}`;
    if($('#rk-terms').parentElement!.hasAttribute('open')||!$('#rk-terms').textContent)$('#rk-terms').textContent=v.terms.map(p=>`j=${p.index}: r_j≈${fmt(p.distance)}, kr_j+φ_j≈${fmt(p.phase)} rad, u_j≈${fmt(p.u)}`).join(' ／ ');
    stage.dataset.state=JSON.stringify(state);
  }
  function sync() {
    const s=state.settings,v=evaluate(s,state.point,state.time),bound=2*s.count;
    syncTime();
    $('#rk-symmetry').textContent=s.phase===0?`${s.count}波源 · 基本対称モード`:`${s.count}波源 · 位相を崩す発展モード`;
    $('#rk-play').textContent=state.playing?'停止':'再生';$<HTMLButtonElement>('#rk-step').disabled=state.playing;
    $<HTMLSelectElement>('#rk-mode').value=state.mode;$<HTMLSelectElement>('#rk-palette').value=state.palette;
    $<HTMLInputElement>('#rk-guide-check').checked=state.guides;$<HTMLInputElement>('#rk-glow-check').checked=state.glow;glow.hidden=!state.glow;
    const preset=presets.findIndex(p=>JSON.stringify(p.settings)===JSON.stringify(s)&&p.palette===state.palette);$<HTMLSelectElement>('#rk-preset').value=preset<0?'custom':String(preset);
    const target=$<HTMLSelectElement>('#rk-target');if(target.options.length!==s.count)target.innerHTML=sources(s).map(p=>`<option value="${p.index}">波源 ${p.index}</option>`).join('');target.value=String(state.target);
    $('#rk-current').textContent=`適用値 N=${s.count}, λ=${s.wavelength}, R=${s.radius}, A=${s.amplitude}, θ=${s.angle}°, φ₀=${s.phase}°。 k≈${fmt(waveNumber(s.wavelength))}, ω≈${fmt(OMEGA)}。 X≈${fmt(v.real)}, Y≈${fmt(v.imag)}。`;
    $('#rk-legend').textContent=state.mode==='displacement'?`瞬間変位 u：青 −${bound} ／ 暗 0 ／ 金 +${bound}。明るさは|u/(2N)|^0.65。符号はPの数値でも確認できます。`:`${state.mode==='envelope'?`包絡振幅 C：0〜${bound}、q=C/(2N)、色変換 q^0.7`:`強度相当量 I=C²：0〜${bound*bound}、q=I/(4N²)、色変換 q^0.4`}。左の暗色0 → 右の明色が上限。Aを変えても尺度は固定です。`;
    drawLegend();
    const symbolLabel:Partial<Record<SymbolId,string>>={lambda:'λ',theta:'θ',r:'r_j',A:'A_j',phi:'φ_j',sigma:'Σ',omega:'ω'};
    const rotationCopy=s.angle===0?'現在のθ=0°は回転なしです。':`現在のθ=${s.angle>0?'+':''}${s.angle}°は、${s.angle>0?'反時計回り':'時計回り'}に${Math.abs(s.angle)}°回転した配置です。`;
    $('#rk-symbol-copy').textContent=state.symbol?`${symbolLabel[state.symbol]??state.symbol}：${symbols[state.symbol][0]}。${symbols[state.symbol][1]}${state.symbol==='theta'?rotationCopy:''}`:'記号を選ぶと読み方と意味を表示します。';
    root.querySelectorAll<HTMLButtonElement>('[data-rk-symbol]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rkSymbol===state.symbol)));
    $('#rk-guide-key').hidden=!state.guides;$('#rk-guide-key').textContent=`丸と番号＝波源、実線＝配置半径、十字P＝観察点、O＝中心。${s.phase===0?'破線＝基本配置の対称軸（鏡映軸）。':'破線＝配置の軸。発展モードの干渉模様の対称性を保証する線ではありません。'}`;overlay();
  }
  function schedule() {if(!disposed&&!document.hidden&&raf===null&&(dirty||state.playing))raf=requestAnimationFrame(frame);}
  function frame(now:number) {
    raf=null;if(disposed||document.hidden)return;
    if(state.playing) {
      if(previous!==null)state.time+=(now-previous)/1000;previous=now;
      if(now-lastUI>=1000/30) {if(state.mode==='displacement')dirty=true;syncTime();lastUI=now;}
    } else previous=null;
    if(dirty)try{draw();}catch(error){state.playing=false;dirty=false;$('#rk-fallback').hidden=false;$('#rk-fallback').textContent=`描画できません：${String(error)}。設定・表示を変更して再試行できます。`;sync();}
    schedule();
  }
  function refresh(redraw=true) {if(redraw)dirty=true;sync();schedule();}
  function apply(settings:Settings) {state.settings={...settings};state.time=0;state.playing=false;state.target=Math.min(state.target,settings.count-1);previous=null;rebuild();fill();$('#rk-error').textContent='';refresh();}
  form.onsubmit=e=>{e.preventDefault();const settings={count:parseNumber(input(form,'count').value)} as Settings;for(const [key] of fields)settings[key]=parseNumber(input(form,key).value);if(!valid(settings)){$('#rk-error').textContent='範囲内の有限な数値を入力してください。設定は未適用です。';return;}
    if(lesson>=0&&lesson<3&&(settings.count!==(lesson===0?1:lesson===1?2:settings.count)||settings.phase!==0||lesson===2&&settings.count<3)){$('#rk-error').textContent='教材1は1波源、教材2は2波源、教材3は3〜8波源、位相0です。自由な設定は教材4で試せます。';return;}apply(settings);};
  pointForm.onsubmit=e=>{e.preventDefault();const p={x:parseNumber(input(pointForm,'x').value),y:parseNumber(input(pointForm,'y').value)};if(!validPoint(p)){$('#rk-point-error').textContent='−5〜5の有限な座標を入力してください。';return;}state.point=p;$('#rk-point-error').textContent='';refresh(false);};
  stage.onclick=e=>{const rect=canvas.getBoundingClientRect();if(rect.width<=0||rect.height<=0)return;const p=screenPoint((e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height);if(validPoint(p)){state.point=p;fillPoint();refresh(false);}};
  stage.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();state.point={x:Math.max(-EXTENT,Math.min(EXTENT,state.point.x+(e.key==='ArrowLeft'?-.1:e.key==='ArrowRight'?.1:0))),y:Math.max(-EXTENT,Math.min(EXTENT,state.point.y+(e.key==='ArrowDown'?-.1:e.key==='ArrowUp'?.1:0)))};fillPoint();refresh(false);};
  $('#rk-play').onclick=()=>{state.playing=!state.playing;previous=null;refresh(false);};$('#rk-step').onclick=()=>{if(!state.playing){state.time+=STEP;refresh(state.mode==='displacement');}};
  $('#rk-time-reset').onclick=()=>{state.time=0;state.playing=false;previous=null;refresh(state.mode==='displacement');};
  $('#rk-default').onclick=()=>{if(lesson>=0){enterLesson(lesson);return;}state=initial();apply(state.settings);};
  $<HTMLSelectElement>('#rk-mode').onchange=e=>{state.mode=(e.target as HTMLSelectElement).value as Mode;refresh();};
  $<HTMLSelectElement>('#rk-palette').onchange=e=>{state.palette=(e.target as HTMLSelectElement).value as Palette;refresh();};
  $<HTMLSelectElement>('#rk-preset').onchange=e=>{const preset=presets[Number((e.target as HTMLSelectElement).value)];if(!preset)return;state.palette=preset.palette;state.mode='intensity';apply({...preset.settings,count:lesson===0?1:lesson===1?2:preset.settings.count});};
  $<HTMLInputElement>('#rk-guide-check').onchange=e=>{state.guides=(e.target as HTMLInputElement).checked;refresh(false);};
  $<HTMLInputElement>('#rk-glow-check').onchange=e=>{state.glow=(e.target as HTMLInputElement).checked;refresh();};
  $<HTMLSelectElement>('#rk-target').onchange=e=>{state.target=Number((e.target as HTMLSelectElement).value);refresh(false);};
  root.querySelectorAll<HTMLButtonElement>('[data-rk-symbol]').forEach(b=>{const choose=()=>{state.symbol=b.dataset.rkSymbol as SymbolId;refresh(false);};b.onclick=choose;b.onfocus=choose;b.onpointerenter=()=>{if(matchMedia('(hover:hover)').matches)choose();};});
  $('#rk-clear').onclick=()=>{state.symbol=null;refresh(false);};$('#rk-jump').onclick=()=>{stage.scrollIntoView({block:'start'});stage.focus({preventScroll:true});};
  function enterLesson(i:number) {lesson=i;state.symbol=null;state.guides=true;state.mode=i===0?'displacement':i===1?'envelope':'intensity';apply({...defaults(),count:[1,2,6,6][i],radius:i===0?.25:2.2});$('#rk-lesson-copy').textContent=lessonCopy[i];root.querySelectorAll<HTMLButtonElement>('[data-rk-lesson]').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));}
  function closeLesson() {if(!saved)return;state=saved.state;lesson=-1;rebuild();fill();inputs().forEach((el,i)=>el.value=saved!.drafts[i]);$('#rk-error').textContent=saved.error;$('#rk-point-error').textContent=saved.pointError;saved=null;$('#rk-lesson').hidden=true;$('#rk-lesson-toggle').textContent='4段階の教材を開く';previous=null;refresh();$('#rk-lesson-toggle').focus({preventScroll:true});}
  $('#rk-lesson-toggle').onclick=()=>{if(saved){closeLesson();return;}saved={state:structuredClone(state),drafts:inputs().map(el=>el.value),error:$('#rk-error').textContent??'',pointError:$('#rk-point-error').textContent??''};$('#rk-point-error').textContent='';$('#rk-lesson').hidden=false;$('#rk-lesson-toggle').textContent='教材を終了して作品へ戻る';enterLesson(0);};
  root.querySelectorAll<HTMLButtonElement>('[data-rk-lesson]').forEach(b=>b.onclick=()=>enterLesson(Number(b.dataset.rkLesson)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&saved){e.preventDefault();closeLesson();}},{signal:life.signal,capture:true});
  function safetyStop() {state.playing=false;if(saved)saved.state.playing=false;previous=null;if(raf!==null)cancelAnimationFrame(raf);raf=null;sync();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)safetyStop();else schedule();},{signal:life.signal});
  motion.addEventListener('change',e=>{if(e.matches){safetyStop();schedule();}},{signal:life.signal});
  const observer=new ResizeObserver(()=>{drawLegend();dirty=true;schedule();});observer.observe(stage);
  window.addEventListener('resize',drawLegend,{signal:life.signal});
  $('#rk-terms').parentElement!.addEventListener('toggle',()=>sync(),{signal:life.signal});
  fill();refresh();
  return()=>{disposed=true;if(raf!==null)cancelAnimationFrame(raf);life.abort();observer.disconnect();saved=null;canvas.width=glow.width=legend.width=0;document.body.classList.remove('ripple-active');root.replaceChildren();};
}
