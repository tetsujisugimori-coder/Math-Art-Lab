import { clone, presets, acceleration, contribution, invariants, errors, time, distance, minDistance, difference, type Config } from './three-body';
import { createExperiment, createComparison, advance, advanceComparison, samples, lastSample, type Experiment, type Comparison, type History, type Sample } from './three-body-state';
import { drawOrbit, viewCenter, worldPoint, screenPoint, graphPath, type Camera, type Layers } from './three-body-render';
import { symbols, lessons } from './three-body-inspector';
import { text, html, table, paragraphs, attribute } from './three-body-dom';
import './three-body.css';
const number = (n: number) => Math.abs(n) < 1e-4 && n !== 0 ? n.toExponential(4) : n.toFixed(5);
const vector = (v: {
    x: number;
    y: number;
}) => `(${number(v.x)}, ${number(v.y)})`;
const bodyFields = ['m', 'x', 'y', 'vx', 'vy'] as const;
const fieldLabels = { m: '質量', x: '初期位置X', y: '初期位置Y', vx: '初速度VX', vy: '初速度VY' };
type Saved = {
    e: Experiment;
    comparison: Comparison | null;
    normal: Experiment | null;
    camera: Camera;
    layers: Layers;
    artSaved: Layers | null;
    selected: number;
    symbol: string;
    values: string[];
    preset: string;
    presetNote: string;
    playing: boolean;
    epoch: number;
};
export function mountThreeBody(root: HTMLElement): () => void {
    let e = createExperiment(presets[0].config), comparison: Comparison | null = null, normal: Experiment | null = null;
    let camera: Camera = { x: 0, y: 0, span: 4, follow: false }, layers: Layers = { trails: true, center: true, velocity: false, acceleration: false, axes: true, bodies: true, glow: true, length: 3000, opacity: .8 };
    let selected = 0, symbol = 'r', playing = false, disposed = false, safetyEpoch = 0, lessonSaved: Saved | null = null, lessonIndex = 0;
    let timer: ReturnType<typeof setTimeout> | null = null, raf = 0, lastWall = 0, accumulator = 0, computeMs = 0, paintMs = 0, clockEpoch = 0, paintRequestedAt = 0;
    const motion = matchMedia('(prefers-reduced-motion: reduce)'), life = new AbortController();
    root.innerHTML = `<main class="three-body" data-playing="false" data-step="0"><header><small>MATH ART LAB / EXPERIMENT 017</small><h1>三体の舞踏</h1><p class="tb-subtitle">THREE-BODY DANCE</p><p>三つの引力が、ひとつの軌跡をほどいていく。<br>秩序と予測の境界を、保存則とともに観察する。</p></header>
  <div class="tb-layout"><div class="tb-art"><div id="tb-boards"><div><h2>A · 基準の宇宙</h2><canvas id="tb-a" tabindex="0" role="img" aria-label="3天体の軌道。左右キーで天体を選択。円1・四角2・三角3" aria-describedby="tb-observation tb-summary"></canvas></div><div id="tb-b-panel" hidden><h2>B · 微小差の宇宙</h2><canvas id="tb-b" role="img" aria-label="比較Bの軌道。Aと共通の座標尺度" aria-describedby="tb-difference"></canvas></div></div>
  <p class="tb-legend"><span>○ 1 · 氷青</span><span>□ 2 · 琥珀</span><span>△ 3 · 藤紫</span><span>＋ R · 重心</span></p>
  <div class="tb-actions"><button id="tb-play">再生</button><button id="tb-step">1ステップ</button><button id="tb-reset">初期状態へ戻す</button><button id="tb-art-mode" aria-pressed="false">鑑賞モード</button></div>
  <p id="tb-status" role="status">停止中</p><p id="tb-render-status" aria-live="off"></p><p id="tb-summary"></p>
  <div class="tb-camera" aria-label="カメラ操作"><button id="tb-in" aria-label="拡大">＋</button><button id="tb-out" aria-label="縮小">−</button><button id="tb-left" aria-label="左へ平行移動">←</button><button id="tb-up" aria-label="上へ平行移動">↑</button><button id="tb-down" aria-label="下へ平行移動">↓</button><button id="tb-right" aria-label="右へ平行移動">→</button><button id="tb-fit">全体表示</button><button id="tb-home">固定座標へ</button><label><input id="tb-follow" type="checkbox">重心追従</label></div>
  <p>軌跡の表示は1天体最大1000点。保存した計算点を等間隔で間引き、端点を含む直線で結びます。計算ステップは省略しません。描画待ちの観察値と軌道は直前の同じ時刻です。カメラは物理状態を変えません。全体表示はボタンを押したときだけ。タッチは通常ページスクロール、編集モードでは天体の候補位置をドラッグできます。</p>
  <section class="tb-panel" id="tb-observe-panel"><h2>一つの天体から見る</h2><label>観察する天体<select id="tb-selected"><option value="0">○ 天体1</option><option value="1">□ 天体2</option><option value="2">△ 天体3</option></select></label><p id="tb-observation"></p><div id="tb-contributions"></div></section>
  <section class="tb-panel" id="tb-conservation"><h2>宇宙の帳尻</h2><div class="tb-table" tabindex="0" role="region" aria-label="保存量の初期値と現在値"><table><caption>Aの保存量と重心（固定座標）</caption><thead><tr><th>量</th><th>初期</th><th>現在</th><th>変化</th></tr></thead><tbody id="tb-stats"></tbody></table></div><p id="tb-errors"></p><p>ε=0はニュートン式、ε&gt;0は距離を√(r²+ε²)とするソフトニング近似。位置エネルギーも−Gmᵢmⱼ/√(r²+ε²)を使います。</p><details><summary>誤差の定義と保存則</summary><p>E・P・Lは連続モデルの保存量。表示差は有限精度と時間離散化の誤差です。S_E=max(K₀+|U₀|,10⁻¹²)、S_P=max(Σmᵢ|vᵢ₀|,√(MS_E),10⁻¹²)、S_R=max(maxᵢ|rᵢ₀−R₀|,10⁻⁶)。表示する規格化誤差はΔE/S_E、|ΔP|/S_P、ΔL/(S_P S_R)。Rの残差は|R−R₀−V₀t|。ゼロ付近のE₀やP₀で割りません。</p></details></section>
  <section class="tb-panel" id="tb-comparison-panel" hidden><h2>わずかな違いの行方</h2><p>Aは実線、Bは破線（狭い画面では重ね合わせ）。同じ色と番号は同じ天体です。</p><p id="tb-difference"></p><svg id="tb-graph" viewBox="0 0 600 190" role="img" aria-label="軌道差D(t)。横軸は物理時間、縦軸は位置差のRMS。値は隣の文章と表で確認"></svg><p id="tb-graph-values"></p><details><summary>時系列を数値で読む（直近20点）</summary><div class="tb-table"><table><thead><tr><th>t</th><th>D(t)</th></tr></thead><tbody id="tb-graph-table"></tbody></table></div></details><p id="tb-b-errors"></p><p>D(t)=√(Σᵢ|rᵢᴮ−rᵢᴬ|²/3)。重心除去D_c=√(Σᵢ|(rᵢᴮ−Rᴮ)−(rᵢᴬ−Rᴬ)|²/3)。座標は描画丸め前の倍精度値。位置差と速度差は別です。初期値敏感性の観察には刻みを小さくした再実験も必要です。数値誤差の増幅と区別し、有限時間の差だけで正のリアプノフ指数を断定しません。</p></section>
  </div><aside aria-label="三体実験の設定"><h2>実験の条件</h2><p>入力は候補です。「設定を適用」で停止し、新しい実験を開始します。リセットは適用済みの初期条件へ戻り、候補入力は保持します。</p><label>プリセット<select id="tb-preset">${presets.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}</select></label><p id="tb-preset-note"></p>
  <form id="tb-settings" novalidate>${[0, 1, 2].map(i => `<fieldset><legend>${['○', '□', '△'][i]} 天体${i + 1}</legend>${bodyFields.map(k => `<label>${fieldLabels[k]}<input id="tb-${i}-${k}" type="number" step="any" required aria-label="天体${i + 1} ${fieldLabels[k]}"></label>`).join('')}</fieldset>`).join('')}
  <label>G · 重力定数<input id="tb-G" type="number" min="0.01" max="10" step="any" required></label><label>Δt · 計算刻み<input id="tb-dt" type="number" min="0.00001" max="0.01" step="any" required></label><label>ε · ソフトニング（0=ニュートン式）<input id="tb-epsilon" type="number" min="0" max="0.5" step="any" required></label><button type="submit">設定を適用</button><p id="tb-error" role="status"></p></form>
  <p id="tb-applied"></p><label><input id="tb-edit" type="checkbox">初期条件の位置編集モード</label><p>編集モードは停止時のみ。ドラッグは候補だけを変更します。数値入力でも同じ編集ができます。</p>
  <label>再生速度（物理時間/秒）<input id="tb-speed" type="range" min="0.25" max="4" step="0.25" value="1"><output id="tb-speed-value">1</output></label><p>速度はステップ数を変更し、Δtを変えません。1回の更新は最大2000ステップ。重い条件では指定速度に届かず、壁時計の遅れを捨てても計算ステップは飛ばしません。非表示時と動きを減らす設定への変更時は停止。動きを減らす設定中は1ステップで観察できます。</p>
  <details open><summary>光跡と補助線</summary>${[['trails', '軌跡'], ['bodies', '天体'], ['center', '重心マーカー'], ['velocity', '速度ベクトル（緑）'], ['acceleration', '加速度ベクトル（赤）'], ['axes', '座標軸と目盛り'], ['glow', '発光']].map(([k, label]) => `<label><input type="checkbox" data-tb-layer="${k}" ${layers[k as keyof Layers] ? 'checked' : ''}>${label}</label>`).join('')}<label>軌跡履歴長（計算点、上限6000）<input id="tb-length" type="range" min="100" max="6000" step="100" value="3000"><output id="tb-length-value">3000</output></label><label>軌跡の不透明度<input id="tb-opacity" type="range" min="0.1" max="1" step="0.1" value="0.8"></label></details>
  <section class="tb-panel"><h2>微小差で比較する</h2><p>適用済みの初期条件からA/Bを時刻0に作成。比較終了で元の通常実験へ戻ります。</p><label>変更する天体<select id="tb-compare-body"><option value="0">天体1</option><option value="1">天体2</option><option value="2">天体3</option></select></label><label>変更する1成分<select id="tb-compare-key"><option value="x">位置X</option><option value="y">位置Y</option><option value="vx">速度VX</option><option value="vy">速度VY</option></select></label><label>初期差δ<input id="tb-delta" type="number" step="any" value="0.000001"></label><button id="tb-compare">比較開始</button><button id="tb-end-compare" disabled>比較終了・元へ戻す</button></section>
  <button id="tb-lesson-toggle" aria-expanded="false" aria-controls="tb-lesson">4段階教材</button></aside></div>
  <section class="tb-panel" id="tb-lesson" hidden aria-label="三体の4段階教材"><h2>重力から、予測の限界へ</h2><div class="tb-actions">${lessons.map((l, i) => `<button data-tb-lesson="${i}" aria-pressed="false">${i + 1}. ${l[0]}</button>`).join('')}</div><h3 id="tb-lesson-title"></h3><p id="tb-lesson-text"></p><div class="tb-actions"><label>距離倍率<input id="tb-lesson-distance" type="number" min="0.5" max="3" step="0.5" value="1"></label><button id="tb-distance-apply">距離を変えて実験</button><button id="tb-triangle">正三角形を実験</button><button id="tb-precision">刻み幅の精度実験</button><button id="tb-chaos">混沌の接近を実験</button></div><p id="tb-precision-result" role="status"></p><p id="tb-lesson-live"></p><button id="tb-lesson-close">教材を終了して元へ戻す</button><p>終了・Escapeで開始前の実験・比較・候補入力・表示へ復元。安全停止が起きた場合は停止を優先します。</p></section>
  <section class="tb-panel" id="tb-formula"><h2>引力を読む</h2><p class="tb-equation" aria-label="位置の微分は速度、速度の微分は重力加速度">d<button data-tb-symbol="r">r</button>ᵢ/d<button data-tb-symbol="t">t</button> = <button data-tb-symbol="v">v</button>ᵢ<br>d<button data-tb-symbol="v">v</button>ᵢ/d<button data-tb-symbol="t">t</button> = <button data-tb-symbol="a">a</button>ᵢ = <button data-tb-symbol="G">G</button><button data-tb-symbol="Σ">Σ</button>ⱼ≠ᵢ <button data-tb-symbol="m">m</button>ⱼ (rⱼ−rᵢ) / (|rⱼ−rᵢ|²+ε²)³ᐟ²</p><div class="tb-actions"><button data-tb-symbol="Δt">Δt</button><button data-tb-symbol="E">E = K + U</button><button data-tb-symbol="L">L = Σmᵢ(xᵢvyᵢ−yᵢvxᵢ)</button><button data-tb-symbol="δ">δ</button></div><dl id="tb-symbol"></dl><p id="tb-symbol-value"></p></section>
  <footer><p>2次元の理想化された三体問題、無次元単位系（基本G=1）。実在の太陽系の縮尺・天体暦ではありません。固定中心・合体・反発・消滅はありません。すべての三体軌道がカオスになるわけではなく、8の字のような特殊な周期解もあります。一般的な初期条件には簡単な閉形式解がなく、数値計算は有限精度の近似。予測困難さは完全なランダム性とは異なります。発光と残像は装飾であり物理量ではありません。</p><p>資料：<a href="https://arxiv.org/abs/math/0011268" target="_blank" rel="noreferrer">Chenciner & Montgomery (2000)</a> · <a href="https://people.ucsc.edu/~rmont/Nbdy/NbdyB.html" target="_blank" rel="noreferrer">Montgomeryの初期値</a> · <a href="https://arxiv.org/abs/1011.3886" target="_blank" rel="noreferrer">Ichita・Yamada・Asada（ニュートン極限）</a></p></footer></main>`;
    const elements = new Map<string, HTMLElement>();
    const $ = <T extends HTMLElement = HTMLElement>(s: string): T => { let el = elements.get(s); if (!el) {
        el = root.querySelector<HTMLElement>(s)!;
        elements.set(s, el);
    } return el as T; };
    const main = $('main'), aCanvas = $<HTMLCanvasElement>('#tb-a'), bCanvas = $<HTMLCanvasElement>('#tb-b');
    const input = (id: string) => $<HTMLInputElement>(`#tb-${id}`);
    const formInputs = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input,select'));
    function configForm(c: Config) { c.bodies.forEach((b, i) => bodyFields.forEach(k => input(`${i}-${k}`).value = String(b[k]))); for (const k of ['G', 'dt', 'epsilon'] as const)
        input(k).value = String(c[k]); }
    function draftConfig(): Config { const value = (id: string) => input(id).value.trim() === '' ? NaN : Number(input(id).value); return { bodies: [0, 1, 2].map(i => ({ m: value(`${i}-m`), x: value(`${i}-x`), y: value(`${i}-y`), vx: value(`${i}-vx`), vy: value(`${i}-vy`) })), G: value('G'), dt: value('dt'), epsilon: value('epsilon') }; }
    function pause() { clockEpoch++; playing = false; if (timer !== null)
        clearTimeout(timer); timer = null; accumulator = 0; input('edit').disabled = false; main.dataset.playing = 'false'; }
    function safetyStop() { safetyEpoch++; pause(); text($('#tb-status'), '安全停止：非表示または動きを減らす設定'); refresh(); }
    function snapshot(): Saved { return clone({ e, comparison, normal, camera, layers, artSaved, selected, symbol, values: formInputs.map(el => el instanceof HTMLInputElement && el.type === 'checkbox' ? String(el.checked) : el.value), preset: $<HTMLSelectElement>('#tb-preset').value, presetNote: $('#tb-preset-note').textContent ?? '', playing, epoch: safetyEpoch }); }
    function restore(s: Saved) { pause(); ({ e, comparison, normal, camera, layers, artSaved, selected, symbol } = clone(s)); formInputs.forEach((el, i) => { if (el instanceof HTMLInputElement && el.type === 'checkbox')
        el.checked = s.values[i] === 'true';
    else
        el.value = s.values[i]; }); text($('#tb-preset-note'), s.presetNote); if (comparison)
        e = comparison.a; refresh(); if (s.playing && s.epoch === safetyEpoch && !document.hidden && !motion.matches)
        play(); }
    function calculate(n: number) { const start = performance.now(); if (comparison) {
        advanceComparison(comparison, n);
        e = comparison.a;
    }
    else
        advance(e, n); computeMs = performance.now() - start; if (e.reason || comparison?.b.reason)
        pause(); }
    function scheduleTick(delay: number) { const epoch = clockEpoch; const handle = setTimeout(() => { if (epoch !== clockEpoch || disposed) return; if(timer===handle)timer = null; tick(); }, delay); timer=handle; }
    function tick() { if (!playing || disposed)
        return; const now = performance.now(); accumulator = Math.min(e.config.dt*2000,accumulator+Math.min((now - lastWall) / 1000, .1) * Number(input('speed').value)); lastWall = now; let remaining = Math.min(2000, Math.floor(accumulator / e.config.dt)); const start = performance.now(); do {
        const n = Math.min(64, remaining), before = e.phase.steps;
        calculate(n);
        const done = e.phase.steps - before;
        remaining -= done;
        accumulator = Math.max(0, accumulator - done * e.config.dt);
        if (!playing || !done)
            break;
    } while (remaining > 0 && performance.now() - start < 4); refresh(); if (playing)
        scheduleTick(remaining > 0 ? 0 : 40); }
    function play() { if (document.hidden || motion.matches || e.reason || comparison?.b.reason) {
        text($('#tb-status'), '停止中：安全設定または計算停止理由を確認してください。1ステップで観察できます。');
        return;
    } input('edit').checked = false; input('edit').disabled = true; playing = true; lastWall = performance.now(); scheduleTick(40); refresh(); }
    function paint() { const start = performance.now(), overlay = comparison && matchMedia('(max-width: 600px)').matches ? comparison.b.trail : undefined; drawOrbit(aCanvas, e.phase, e.config, e.trail, camera, layers, selected, symbol, overlay); if (comparison&&!overlay)
        drawOrbit(bCanvas, comparison.b.phase, comparison.b.config, comparison.b.trail, camera, layers, selected, symbol, undefined, viewCenter(e.phase, e.config, camera)); paintMs = performance.now() - start; main.dataset.paintMs = String(paintMs); main.dataset.backingBytes = String((aCanvas.width * aCanvas.height + (comparison&&!overlay ? bCanvas.width * bCanvas.height : 0)) * 4);return aCanvas.dataset.paintedStep===String(e.phase.steps)&&(!comparison||!!overlay||bCanvas.dataset.paintedStep===String(comparison.b.phase.steps)); }
    function renderStatus(pending: boolean) { main.dataset.computedStep = String(e.phase.steps); main.dataset.computedBStep = comparison ? String(comparison.b.phase.steps) : ''; main.dataset.renderState = pending ? 'pending' : 'settled'; text($('#tb-render-status'), `表示対象step ${main.dataset.observedStep ?? '未描画'} / 最新計算step ${e.phase.steps} · ${pending ? '描画待ち' : '描画確定'}（観察値と軌道は表示対象stepの値）。グラフは20ステップごとの標本。`); }
    function schedulePaint() { if (disposed)
        return; renderStatus(true); if (!raf) {
        paintRequestedAt = performance.now();
        const display = () => { raf = 0; if (disposed)
            return;
            main.dataset.frameWaitMs = String(performance.now() - paintRequestedAt);if(!paint()){pause();main.dataset.renderState='unavailable';text($('#tb-render-status'),'描画できません。観察値は直前の表示状態です。');return;} observe(); main.dataset.observedStep = String(e.phase.steps); main.dataset.paintedAStep = aCanvas.dataset.paintedStep ?? ''; const overlay = !!comparison && matchMedia('(max-width: 600px)').matches; main.dataset.paintedBStep = comparison ? String(comparison.b.phase.steps) : ''; bCanvas.dataset.renderMode = overlay ? 'overlay-on-a' : comparison ? 'side-by-side' : 'inactive'; if (overlay)
            bCanvas.removeAttribute('data-painted-step'); main.dataset.graphTime = String(comparison ? lastSample(e.graph)?.t ?? 0 : 0); renderStatus(false); };
        raf = requestAnimationFrame(display);
    } }
    let graphHistory:History|null=null,graphSample:Sample|undefined,graphData:Sample[]=[],graphGeometry=graphPath([]);
    function observe() {
        const p = e.phase, b = p.bodies[selected], c = e.config, a = acceleration(p.bodies, c)[selected], now = invariants(p.bodies, c), initial = invariants(c.bodies, c), err = errors(p, c);
        text($('#tb-summary'), `t=${number(time(p, c))} · ${p.steps}ステップ · Δt=${c.dt} · 最小距離=${number(minDistance(p.bodies))} · ${c.epsilon === 0 ? 'ニュートン式 ε=0' : `近似モデル ε=${c.epsilon}`}`);
        text($('#tb-observation'), `天体${selected + 1} / t=${number(time(p, c))} / m=${b.m} / r=${vector(b)} / v=${vector({ x: b.vx, y: b.vy })} / 速さ=${number(Math.hypot(b.vx, b.vy))} / a=${vector(a)}`);
        const terms = p.bodies.map((_, j) => j === selected ? '' : `天体${j + 1}から：距離=${number(distance(b, p.bodies[j]))}、a${selected + 1}←${j + 1}=${vector(contribution(p.bodies, selected, j, c))}`).filter(Boolean);
        paragraphs($('#tb-contributions'), [...terms, `Σの合成 a${selected + 1} = ${vector(a)}（同じ確定時刻の2項の和）`]);
        const rows: [
            string,
            string,
            string,
            string
        ][] = [['運動エネルギー K', number(initial.kinetic), number(now.kinetic), number(now.kinetic - initial.kinetic)], ['位置エネルギー U', number(initial.potential), number(now.potential), number(now.potential - initial.potential)], ['全エネルギー E', number(initial.E), number(now.E), number(now.E - initial.E)], ['全運動量 P', vector(initial.P), vector(now.P), vector({ x: now.P.x - initial.P.x, y: now.P.y - initial.P.y })], ['全角運動量 L', number(initial.L), number(now.L), number(now.L - initial.L)], ['重心位置 R', vector(initial.R), vector(now.R), vector({ x: now.R.x - initial.R.x, y: now.R.y - initial.R.y })], ['重心速度 V', vector(initial.V), vector(now.V), vector({ x: now.V.x - initial.V.x, y: now.V.y - initial.V.y })]];
        table($('#tb-stats'), rows, true);
        text($('#tb-errors'), `A 誤差 ΔE/S_E=${err.energy.toExponential(4)}、|ΔP|/S_P=${err.momentum.toExponential(4)}、ΔL/(S_P S_R)=${err.angular.toExponential(4)}、重心残差=${err.barycenter.toExponential(4)}`);
        text($('#tb-applied'), `適用済み：G=${c.G}、Δt=${c.dt}、ε=${c.epsilon}。軌跡${e.trail.data.length}/6000点、グラフ${e.graph.data.length}/1200点。`);
        if (comparison) {
            const d = difference(p, comparison.b.phase, c), eb = errors(comparison.b.phase, comparison.b.config);
            if(graphHistory!==e.graph||graphSample!==lastSample(e.graph)){graphHistory=e.graph;graphSample=lastSample(e.graph);graphData=samples(e.graph);graphGeometry=graphPath(graphData);}
            const data=graphData,g=graphGeometry;
            text($('#tb-difference'), `初期差δ=${comparison.delta}（天体${comparison.body + 1}の${comparison.key}のみ） / tA=tB=${number(time(p, c))} / 各天体の位置差=${d.individual.map(number).join(', ')} / D(t)=${d.D.toExponential(5)} / D_c=${d.centered.toExponential(5)}`);
            if (!$('#tb-graph').children.length)
                html($('#tb-graph'), '<path d="M40,25V150H570" stroke="currentColor" fill="none"/><path id="tb-graph-line" stroke="#75ddf5" fill="none" stroke-width="2"/><text x="4" y="20">D</text><text id="tb-graph-first" x="40" y="175"></text><text id="tb-graph-last" x="410" y="175"></text><text id="tb-graph-max" x="45" y="18"></text><text x="12" y="153">0</text>');
            attribute($('#tb-graph-line'), 'd', g.path);
            text($('#tb-graph-first'), number(g.first));
            text($('#tb-graph-last'), `t=${number(g.last)}`);
            text($('#tb-graph-max'), `上限 ${g.max.toExponential(3)}`);
            text($('#tb-graph-values'), `直近の確定グラフ点：t=${number(g.last)}、D=${(data.at(-1)?.D ?? 0).toExponential(5)}。縦軸は0〜${g.max.toExponential(5)}、横軸${number(g.first)}〜${number(g.last)}。20ステップごとに標本化、直近1200点。現在Dは上に表示。`);
            table($('#tb-graph-table'), data.slice(-20).map(s => [number(s.t), s.D.toExponential(6)]));
            text($('#tb-b-errors'), `B 誤差 ΔE/S_E=${eb.energy.toExponential(4)}、|ΔP|/S_P=${eb.momentum.toExponential(4)}、ΔL/(S_P S_R)=${eb.angular.toExponential(4)}、重心残差=${eb.barycenter.toExponential(4)}`);
        }
        const sym = symbols[symbol];
        html($('#tb-symbol'), `<dt>記号の名前</dt><dd>${sym.name}</dd><dt>式での読み方</dt><dd>${sym.reading}</dd><dt>物理的な意味</dt><dd>${sym.meaning}</dd>`);
        const live: Record<string, string> = { r: `r${selected + 1}=${vector(b)}`, v: `v${selected + 1}=${vector({ x: b.vx, y: b.vy })}`, a: `a${selected + 1}=${vector(a)}`, m: `m${selected + 1}=${b.m}`, G: `G=${c.G}`, t: `t=${number(time(p, c))}`, 'Δt': `Δt=${c.dt}`, E: `E=${number(now.E)}`, L: `L=${number(now.L)}`, 'δ': comparison ? `δ=${comparison.delta} / 天体${comparison.body + 1} ${comparison.key}` : '比較設定のδは未適用です。', 'Σ': `天体${selected + 1}について、自分を除く2天体の項を加算：${p.bodies.map((_, j) => j === selected ? '' : `a${selected + 1}←${j + 1}=${vector(contribution(p.bodies, selected, j, c))}`).filter(Boolean).join(' ＋ ')} = ${vector(a)}` };
        text($('#tb-symbol-value'), `A / t=${number(time(p, c))} / ${live[symbol]}`);
        if (lessonSaved)
            text($('#tb-lesson-live'), `観察中：第${lessonIndex + 1}段階、Aのt=${number(time(p, c))}、選択天体${selected + 1}、a=${vector(a)}、E誤差=${err.energy.toExponential(3)}。${comparison ? `D=${difference(p, comparison.b.phase, c).D.toExponential(3)}` : '比較は未開始。'}`);
        main.dataset.step = String(p.steps);
        main.dataset.domPositions = JSON.stringify(p.bodies.map(({ x, y }) => ({ x, y })));
        main.dataset.time = String(time(p, c));
        main.dataset.playing = String(playing);
        main.dataset.computeMs = String(computeMs);
        main.dataset.historyLength = String(e.trail.data.length);
        main.dataset.graphLength = String(e.graph.data.length);
        main.dataset.symbol = symbol;
        main.dataset.safetyEpoch = String(safetyEpoch);
    }
    function refresh() {
        if (disposed)
            return;
        text($('#tb-play'), playing ? '一時停止' : '再生');
        $('#tb-b-panel').hidden = !comparison;
        $('#tb-comparison-panel').hidden = !comparison;
        $<HTMLButtonElement>('#tb-end-compare').disabled = !comparison;
        $('#tb-boards').classList.toggle('tb-comparing', !!comparison);
        aCanvas.classList.toggle('tb-editing', input('edit').checked && !playing);
        input('follow').checked = camera.follow;
        text($('#tb-status'), e.reason || comparison?.b.reason || `${playing ? '再生中' : '停止中'}${minDistance(e.phase.bodies) < .1 ? ' · 近接警告：最小距離0.1未満' : ''}`);
        text($('#tb-speed-value'), input('speed').value);
        text($('#tb-length-value'), String(layers.length));
        $('#tb-art-mode').setAttribute('aria-pressed', String(!!artSaved));
        for (const target of ['#tb-observe-panel', '#tb-conservation', '#tb-comparison-panel'])
            $(target).classList.toggle('tb-highlight', target === (['E', 'L'].includes(symbol) ? '#tb-conservation' : symbol === 'δ' ? '#tb-comparison-panel' : '#tb-observe-panel'));
        root.querySelectorAll<HTMLButtonElement>('[data-tb-symbol]').forEach(b => attribute(b, 'aria-pressed', String(b.dataset.tbSymbol === symbol)));
        main.dataset.playing = String(playing);
        main.dataset.safetyEpoch = String(safetyEpoch);
        schedulePaint();
    }
    function apply(c: Config) { const next = createExperiment(c); pause(); e = next; comparison = null; normal = null; text($('#tb-error'), ''); refresh(); }
    function preset(i: number) { configForm(presets[i].config); $<HTMLSelectElement>('#tb-preset').value = String(i); text($('#tb-preset-note'), `候補・未適用：${presets[i].note}`); }
    $('#tb-settings').onsubmit = event => { event.preventDefault(); try {
        apply(draftConfig());
        text($('#tb-preset-note'), '設定を適用しました。プリセットからの変更はカスタム実験です。');
    }
    catch (error) {
        text($('#tb-error'), String((error as Error).message));
    } };
    $('#tb-preset').onchange = () => preset(Number($<HTMLSelectElement>('#tb-preset').value));
    $('#tb-play').onclick = () => { if (playing) {
        pause();
        refresh();
    }
    else
        play(); };
    $('#tb-step').onclick = () => { pause(); calculate(1); refresh(); };
    $('#tb-reset').onclick = () => { pause(); if (comparison) {
        comparison = createComparison(comparison.a.config, comparison.body, comparison.key, comparison.delta);
        e = comparison.a;
    }
    else
        e = createExperiment(e.config); refresh(); };
    input('speed').oninput = () => { text($('#tb-speed-value'), input('speed').value); };
    input('edit').onchange = () => { pause(); refresh(); };
    $('#tb-selected').onchange = () => { selected = Number($<HTMLSelectElement>('#tb-selected').value); refresh(); };
    aCanvas.onkeydown = event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        selected = (selected + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
        $<HTMLSelectElement>('#tb-selected').value = String(selected);
        refresh();
    } };
    root.querySelectorAll<HTMLInputElement>('[data-tb-layer]').forEach(el => el.onchange = () => { const key = el.dataset.tbLayer as keyof Layers; (layers[key] as boolean) = el.checked; refresh(); });
    input('length').oninput = () => { layers.length = Number(input('length').value); text($('#tb-length-value'), String(layers.length)); schedulePaint(); };
    input('opacity').oninput = () => { layers.opacity = Number(input('opacity').value); schedulePaint(); };
    let artSaved: Layers | null = null;
    $('#tb-art-mode').onclick = () => { if (artSaved) {
        layers = artSaved;
        artSaved = null;
    }
    else {
        artSaved = clone(layers);
        layers.axes = false;
        layers.center = false;
        layers.velocity = false;
        layers.acceleration = false;
    } root.querySelectorAll<HTMLInputElement>('[data-tb-layer]').forEach(el => el.checked = Boolean(layers[el.dataset.tbLayer as keyof Layers])); $('#tb-art-mode').setAttribute('aria-pressed', String(!!artSaved)); refresh(); };
    const zoom = (factor: number) => { camera.span = Math.max(.05, Math.min(1e6, camera.span * factor)); schedulePaint(); };
    $('#tb-in').onclick = () => zoom(.8);
    $('#tb-out').onclick = () => zoom(1.25);
    for (const [id, dx, dy] of [['left', -1, 0], ['right', 1, 0], ['up', 0, 1], ['down', 0, -1]] as const)
        $(`#tb-${id}`).onclick = () => { camera.x += dx * camera.span * .15; camera.y += dy * camera.span * .15; schedulePaint(); };
    input('follow').onchange = () => { camera.follow = input('follow').checked; camera.x = 0; camera.y = 0; refresh(); };
    $('#tb-home').onclick = () => { camera = { x: 0, y: 0, span: 4, follow: false }; refresh(); };
    $('#tb-fit').onclick = () => { const points = e.phase.bodies.concat(comparison?.b.phase.bodies ?? []), xs = points.map(p => p.x), ys = points.map(p => p.y); camera = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, span: Math.max(.5, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.5, follow: false }; refresh(); };
    let dragging: number | null = null;
    const eventPoint = (event: PointerEvent) => { const r = aCanvas.getBoundingClientRect(); return { x: event.clientX - r.left, y: event.clientY - r.top, w: r.width, h: r.height }; };
    aCanvas.onpointerdown = event => { const p = eventPoint(event), center = viewCenter(e.phase, e.config, camera); let nearest = 0, best = Infinity; e.phase.bodies.forEach((b, i) => { const q = screenPoint(b, center, camera.span, p.w, p.h), d = Math.hypot(q.x - p.x, q.y - p.y); if (d < best) {
        best = d;
        nearest = i;
    } }); if (best <= 30) {
        selected = nearest;
        $<HTMLSelectElement>('#tb-selected').value = String(selected);
        if (input('edit').checked && !playing) {
            dragging = nearest;
            aCanvas.setPointerCapture(event.pointerId);
        }
        refresh();
    } };
    aCanvas.onpointermove = event => { if (dragging === null || playing || !input('edit').checked)
        return; const p = eventPoint(event), q = worldPoint(p.x, p.y, viewCenter(e.phase, e.config, camera), camera.span, p.w, p.h); input(`${dragging}-x`).value = String(q.x); input(`${dragging}-y`).value = String(q.y); text($('#tb-error'), '候補位置を編集しました。「設定を適用」で反映します。'); };
    aCanvas.onpointerup = () => { dragging = null; };
    aCanvas.onpointercancel = () => { dragging = null; };
    aCanvas.onlostpointercapture = () => { dragging = null; };
    $('#tb-compare').onclick = () => { try {
        const next = createComparison(e.config, Number($<HTMLSelectElement>('#tb-compare-body').value), $<HTMLSelectElement>('#tb-compare-key').value as Comparison['key'], input('delta').value.trim() === '' ? NaN : Number(input('delta').value));
        pause();
        if (!comparison)
            normal = clone(e);
        comparison = next;
        e = next.a;
        text($('#tb-error'), '');
        refresh();
    }
    catch (error) {
        text($('#tb-error'), (error as Error).message);
    } };
    $('#tb-end-compare').onclick = () => { if (!normal)
        return; pause(); e = normal; comparison = null; normal = null; refresh(); };
    root.querySelectorAll<HTMLButtonElement>('[data-tb-symbol]').forEach(b => b.onclick = () => { symbol = b.dataset.tbSymbol!; refresh(); });
    function showLesson(i: number) { lessonIndex = i; text($('#tb-lesson-title'), `${i + 1}. ${lessons[i][0]}`); text($('#tb-lesson-text'), lessons[i][1]); root.querySelectorAll<HTMLButtonElement>('[data-tb-lesson]').forEach((b, j) => b.setAttribute('aria-pressed', String(i === j))); symbol = ['Σ', 'v', 'E', 'δ'][i]; refresh(); }
    function closeLesson() { if (!lessonSaved)
        return; const saved = lessonSaved; lessonSaved = null; $('#tb-lesson').hidden = true; $('#tb-lesson-toggle').setAttribute('aria-expanded', 'false'); restore(saved); $('#tb-lesson-toggle').focus(); }
    $('#tb-lesson-toggle').onclick = () => { if (lessonSaved) {
        closeLesson();
        return;
    } lessonSaved = snapshot(); pause(); $('#tb-lesson').hidden = false; $('#tb-lesson-toggle').setAttribute('aria-expanded', 'true'); showLesson(0); $<HTMLButtonElement>('[data-tb-lesson="0"]').focus(); };
    $('#tb-lesson-close').onclick = closeLesson;
    root.querySelectorAll<HTMLButtonElement>('[data-tb-lesson]').forEach(b => b.onclick = () => showLesson(Number(b.dataset.tbLesson)));
    $('#tb-distance-apply').onclick = () => { const multiplier = Number(input('lesson-distance').value); if (!Number.isFinite(multiplier) || multiplier < .5 || multiplier > 3) {
        text($('#tb-precision-result'), '距離倍率は0.5〜3です。');
        return;
    } const c = clone(presets[1].config); c.bodies.forEach(b => { b.x *= multiplier; b.y *= multiplier; b.vx = 0; b.vy = 0; }); apply(c); configForm(c); selected = 0; $<HTMLSelectElement>('#tb-selected').value = '0'; symbol = 'Σ'; refresh(); };
    $('#tb-triangle').onclick = () => { apply(presets[1].config); configForm(e.config); };
    $('#tb-chaos').onclick = () => { apply(presets[3].config); configForm(e.config); };
    $('#tb-precision').onclick = () => { pause(); const coarse = createExperiment({ ...clone(presets[0].config), dt: .004 }), fine = createExperiment({ ...clone(presets[0].config), dt: .002 }); advance(coarse, 250); advance(fine, 500); text($('#tb-precision-result'), `同じ初期値、同じt=1：Δt=0.004のE誤差=${errors(coarse.phase, coarse.config).energy.toExponential(5)}、Δt=0.002のE誤差=${errors(fine.phase, fine.config).energy.toExponential(5)}、位置のRMS差=${difference(coarse.phase, fine.phase, coarse.config).D.toExponential(5)}。厳密解との誤差そのものではありません。`); refresh(); };
    document.addEventListener('keydown', event => { if (event.key === 'Escape') {
        if (lessonSaved)
            closeLesson();
        else {
            pause();
            input('edit').checked = false;
            dragging = null;
            refresh();
        }
    } }, { signal: life.signal });
    document.addEventListener('visibilitychange', () => { if (document.hidden)
        safetyStop(); }, { signal: life.signal });
    motion.addEventListener('change', () => { if (motion.matches)
        safetyStop(); }, { signal: life.signal });
    const resize = new ResizeObserver(schedulePaint);
    resize.observe(aCanvas);
    resize.observe(bCanvas);
    configForm(e.config);
    text($('#tb-preset-note'), presets[0].note);
    refresh();
    return () => { disposed = true; pause(); if (raf)
        cancelAnimationFrame(raf); raf = 0; resize.disconnect(); life.abort(); root.replaceChildren(); };
}
