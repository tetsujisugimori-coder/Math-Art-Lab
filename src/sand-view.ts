import { apply, components, displacement, initial, MAX_STEPS, nearNode, presets, REFERENCE_STEPS, restore, scatter, statistics, tick, type Mode, type State } from './sand';
import { drawSand, releaseSandCanvas } from './sand-render';
import { modeAllowed, modeNames, presentation, shapeNames, symbolAllowed } from './sand-presentation';
import './sand.css';
const symbols: Record<string, [
    string,
    string,
    string
]> = {
    x: ['小文字のエックス', 'エックス', '正方形の横の位置。右へ0から1。横の実線が観察する高さを示します。'],
    y: ['小文字のワイ', 'ワイ', '正方形の縦の位置。上へ0から1。縦の破線が観察する横位置を示します。'],
    m: ['小文字のエム', 'エム', '第一成分の横、第二成分の縦の波の細かさを決める整数。横断線に沿って変化を見ます。'],
    n: ['小文字のエヌ', 'エヌ', '第一成分の縦、第二成分の横の波の細かさを決める整数。縦断線に沿って変化を見ます。'],
    a: ['小文字のエー', 'エー倍', '第二成分を引く割合。破線の節と内側の枠を強調。成分表示で重ねる前と比較できます。'],
    F: ['大文字のエフ', 'エフ・かっこエックス、ワイ', '位置ごとの振動の形。白い破線はF=0の節の近似。時間では変わりません。'],
    u: ['小文字のユー', 'ユー・かっこエックス、ワイ、ティー', '今の変位。観察点の輪の半径で変位の絶対値も示します。符号は数値で確認します。'],
    t: ['小文字のティー', 'ティー', '観察する時刻。輪の半径とuが周期的に変わります。砂のステップとは独立です。'],
    'π': ['円周率の記号', 'パイ', '半周に相当する角度。mπxのように位置をコサインの角度へ変換します。横断線を強調。'],
    cos: ['余弦の記号', 'コサイン', '角度に応じて−1から1を繰り返す関数。横断線に沿う山と谷を因子表示で観察できます。'],
};
const lessons = [
    ['一方向の波', 'cos(mπx) の山（正）・谷（負）と0の位置を見ます。振動の形はそのまま、各場所はcos(t)倍で上下します。因子の0の位置はどの時刻も動きません。'],
    ['二方向を組み合わせる', '横のcos(mπx)と縦のcos(nπy)を掛けると第一成分C₁になります。横の因子・縦の因子・積を切り替え、符号と0の線を比較してください。'],
    ['二つの成分を重ねる', 'm,nを入れ替えた第二成分C₂をa倍して引き、F=C₁−aC₂を作ります。同じ固有値を持つ組です。成分の節と、重ねたFの節は一般に異なります。'],
    ['砂絵として見る', '砂は時刻によらないFの節付近へ人工的な規則で移動します。全節への均一な集積や完全な収束を保証しません。砂の進行と振動の時間を別々に動かせます。'],
];
const modes = modeNames;
export function mountSand(host: HTMLElement) {
    document.body.classList.add('sand-active');
    let s = initial(), disposed = false, frame = 0, timer = 0, recovery = 0, generation = 0, revision = 0, saved: State | null = null, lesson = -1, safeStop = false, formulaStage = -2;
    const abort = new AbortController(), motion = matchMedia('(prefers-reduced-motion: reduce)');
    host.innerHTML = `<main class="sand"><header><small>MATH ART LAB / EXPERIMENT 012</small><h1>振動の砂絵</h1><p>動かない場所に、かたちが残る。</p></header>
 <div class="sand-layout"><div class="sand-evidence"><div class="sand-plaque"><span>IDEAL SQUARE · 定在波の節</span><output id="sd-pattern"></output></div>
 <canvas id="sd-canvas" tabindex="0" role="img" aria-label="砂と振動の正方形。クリックまたは矢印キーで観察点を選択" aria-describedby="sd-key sd-caption"></canvas>
 <p id="sd-fallback" role="status" hidden></p><p id="sd-caption"></p><p id="sd-key"></p><p id="sd-scope"></p>
 <div class="sand-transport" id="sd-sand-transport"><h2>砂の進行</h2><div><button id="sd-sand-play">砂を再生</button><button id="sd-sand-step">砂を1ステップ</button><button id="sd-scatter">砂を散らす</button></div><output id="sd-sand-status"></output></div>
 <div class="sand-transport"><h2>振動の時間</h2><div><button id="sd-wave-play">振動を再生</button><button id="sd-wave-step">振動を1ステップ</button><button id="sd-phase-zero">時刻を0へ</button><button id="sd-quarter">一瞬の全面0を見る</button></div><label>観察速度<select id="sd-speed"><option value="0.25">0.25倍</option><option value="0.5">0.5倍</option><option value="1" selected>1倍</option><option value="2">2倍</option></select></label><output id="sd-time"></output></div>
 <div id="sd-lesson" hidden><h2>4段階の教材</h2><div class="sand-steps">${lessons.map((v, i) => `<button data-lesson="${i}">${i + 1} · ${v[0]}</button>`).join('')}</div><p id="sd-lesson-copy"></p><button id="sd-close">教材を閉じて復元</button></div>
 <div class="sand-observation"><h2>観察点の現在値</h2><p id="sd-observation"></p><form id="sd-point-form"><label>x 候補<input id="sd-x" type="number" min="0" max="1" step="any" value="0.3" required></label><label>y 候補<input id="sd-y" type="number" min="0" max="1" step="any" value="0.4" required></label><button>観察点を適用</button></form><p>図をクリック・タップ、またはフォーカスして矢印で0.01（Shiftで0.05）移動。図の外ではページをスクロールできます。</p></div>
 </div><aside><h2>模様を選ぶ</h2><label>プリセット<select id="sd-preset">${presets.map((p, i) => `<option value="${i}" ${i === 1 ? 'selected' : ''}>${p.name}</option>`).join('')}<option value="custom" disabled>カスタム</option></select></label>
 <form id="sd-settings" novalidate><div class="sand-pair"><label>m 候補<input id="sd-m" type="number" min="1" max="8" step="1" value="2"></label><label>n 候補<input id="sd-n" type="number" min="1" max="8" step="1" value="3"></label></div><label>混合係数 a 候補<input id="sd-a" type="number" min="0" max="2" step="any" value="1"></label><label>seed 候補<input id="sd-seed" type="number" min="1" max="4294967295" step="1" value="12012"></label><button>設定を適用</button></form>
 <p id="sd-applied"></p><p>適用・プリセット変更は両方停止、砂を一様に散らして0ステップ、時刻0へ。観察点と表示は保持。入力中は候補で、図は直前の適用値を保持します。</p>
 <h2>表示を切り替える</h2><div id="sd-modes">${Object.entries(modes).map(([id, label]) => `<button data-mode="${id}" aria-pressed="${id === 'sand'}">${label}</button>`).join('')}</div><label class="sand-check"><input id="sd-nodes" type="checkbox">節の補助線</label>
 <button id="sd-start">4段階でしくみを見る</button><button id="sd-reset">初期設定へ戻す</button><p id="sd-error" role="alert"></p><p id="sd-notice" role="status"></p>
 <h2>数式と記号</h2><div class="sand-equations" id="sd-equations"></div><p id="sd-formula-note"></p><div id="sd-symbols">${Object.keys(symbols).map(k => `<button data-symbol="${k}" aria-pressed="false">${k}</button>`).join('')}<button id="sd-clear">強調を解除</button></div><div id="sd-symbol-copy" class="sand-symbol-copy"></div>
 <p id="sd-node-explanation"></p></aside></div>
 <footer>クラドニ図形に着想を得た理想化モデル。正方形の境界で法線方向の傾きが0（Neumann条件）。実在の自由端金属板の厳密式ではありません。砂の移動は教材用の演出です。音声・マイクは使用しません。</footer></main>`;
    const q = <T extends HTMLElement = HTMLElement>(id: string) => host.querySelector<T>('#sd-' + id)!;
    const canvas = q<HTMLCanvasElement>('canvas');
    function on(el: EventTarget, event: string, fn: EventListener) { el.addEventListener(event, fn, { signal: abort.signal }); }
    function click(id: string, fn: () => void) { on(q(id), 'click', fn); }
    function clearSchedules() { generation++; clearTimeout(timer); timer = 0; }
    function schedule() { clearSchedules(); if (disposed || document.hidden || (!s.sandPlaying && !s.wavePlaying))
        return; const g = generation; timer = window.setTimeout(() => { if (disposed || g !== generation || document.hidden)
        return; tick(s, s.sandPlaying, s.wavePlaying); update(); schedule(); }, 50); }
    function pause() { s.sandPlaying = false; s.wavePlaying = false; clearSchedules(); }
    function paint() { if (disposed || document.hidden)
        return; const requested = revision; try {
        if (!drawSand(canvas, s, lesson)) {
            canvas.dataset.drawStatus = 'waiting-size';
            q('fallback').hidden = false;
            q('fallback').textContent = '表示幅が0のため描画を待っています。サイズ復帰後に最新の図を描きます。';
            if (!recovery)
                recovery = window.setTimeout(() => { recovery = 0; requestPaint(); }, 100);
            return;
        }
        canvas.dataset.renderedRevision = String(requested);
        canvas.dataset.drawStatus = 'submitted';
        q('fallback').hidden = true;
    }
    catch (e) {
        canvas.dataset.drawStatus = 'error';
        q('fallback').hidden = false;
        q('fallback').textContent = `描画できません：${e instanceof Error ? e.message : String(e)}。下の数値と数式で状態を確認できます。`;
        pause();
        showTransport();
        if (canvas.dataset.state) {
            const evidence = JSON.parse(canvas.dataset.state);
            evidence.sandPlaying = evidence.wavePlaying = false;
            canvas.dataset.state = JSON.stringify(evidence);
        }
        notice('描画エラーのため両方停止しました。表示操作で再描画を試せます。');
    } }
    function requestPaint() { if (disposed)
        return; canvas.dataset.revision = String(++revision); canvas.dataset.drawStatus = 'pending'; if (!frame && !document.hidden) {
        const id = requestAnimationFrame(() => { if (disposed || frame !== id)
            return; frame = 0; paint(); });
        frame = id;
    } }
    function syncInputs() { q<HTMLInputElement>('m').value = String(s.settings.m); q<HTMLInputElement>('n').value = String(s.settings.n); q<HTMLInputElement>('a').value = String(s.settings.a); q<HTMLInputElement>('seed').value = String(s.sand.seed); q<HTMLSelectElement>('preset').value = String(presets.findIndex(p => p.name === s.preset)); if (q<HTMLSelectElement>('preset').selectedIndex < 0)
        q<HTMLSelectElement>('preset').value = 'custom'; q<HTMLInputElement>('x').value = String(s.point.x); q<HTMLInputElement>('y').value = String(s.point.y); }
    function showTransport() { for (const kind of ['sand', 'wave'] as const) {
        const key = kind === 'sand' ? 'sandPlaying' : 'wavePlaying';
        q(kind + '-play').textContent = `${kind === 'sand' ? '砂' : '振動'}を${s[key] ? '停止' : '再生'}`;
        q(kind + '-play').setAttribute('aria-pressed', String(s[key]));
    } }
    function update() {
        const view = presentation(s, lesson);
        const c = components(s.settings, s.point.x, s.point.y), u = displacement(c.F, s.t), fmt = (v: number) => v.toPrecision(6), stats = statistics(s.sand, s.settings);
        q('pattern').textContent = s.preset;
        q('applied').textContent = `適用済み：m=${s.settings.m}, n=${s.settings.n}, a=${s.settings.a}, seed=${s.sand.seed}`;
        q('caption').textContent = `表示：${view.displayLabel} · ${s.preset} · m=${s.settings.m}, n=${s.settings.n}, a=${s.settings.a}${view.symbol ? ` · 強調：${view.symbol}` : ''}${view.mode === 'factorX' ? '。色は静止した因子。白い断面曲線はcos(mπx)cos(t)の上下（高さの尺度0.3）、金の丸は常に0の位置。正方形の実変形ではありません。' : ''}`;
        q('key').textContent = `十字：観察点。${view.nodeLabel}。${view.difference} ${view.axisLabel} ${view.ringLabel} 分布の金：正／青：負／暗色：0付近。${view.displayShape === 'F' ? 'F・uの表示尺度は±(1+a)。' : '各成分・因子の表示尺度は±1。'}`;
        q('scope').textContent = lesson === 0 ? '教材1：横の因子だけを観察します。F・a・u・tなどの記号強調は第3段階から使えます。' : lesson === 1 ? '教材2：横・縦の因子と第一成分を比較します。重ねたFとaの強調は第3段階から使えます。' : '背景の表示対象と記号の強調対象を分けています。F・aの選択は背景を切り替えず、重ねたFの節を示します。';
        if (formulaStage !== lesson) { q('equations').innerHTML = formula(lesson); formulaStage = lesson; }
        q('formula-note').textContent = lesson === 0 ? '横の因子は位置の形。白い断面曲線はその因子をcos(t)倍した今の上下です。' : lesson === 1 ? 'C₁は横の因子と縦の因子の積です。第二成分と重ねた形は次の段階で導入します。' : 'A=1、ω=1。振幅の大きさは|F|。定在波は、形を保ったまま各場所が周期的に上下する波です。';
        q('node-explanation').textContent = `${view.nodeTarget ? `${shapeNames[view.nodeTarget]}の節は、その対象の振幅が0で全時刻を通して動かない場所です。` : `補助線は${shapeNames[view.displayShape]}の振幅が0となる場所を表示します。`} 一瞬cos(t)=0になることとは別です。小さい数値や白い破線だけでは厳密な節と断定できません。`;
        q('sand-transport').hidden = lesson === 0 || lesson === 1;
        q('sand-status').textContent = `${s.sand.step} / ${MAX_STEPS} ステップ · 表示上の節付近 ${Math.round(stats.fraction * 100)}%`;
        q('time').textContent = `t=${s.t.toFixed(4)} · cos(t)=${fmt(Math.cos(s.t))} · 時間送り ${s.phaseSteps} 回`;
        q('observation').textContent = `適用座標 (${s.point.x.toFixed(4)}, ${s.point.y.toFixed(4)}) · 横の因子=${fmt(Math.cos(s.settings.m * Math.PI * s.point.x))} · 縦の因子=${fmt(Math.cos(s.settings.n * Math.PI * s.point.y))} · C₁=${fmt(c.first)} · C₂=${fmt(c.second)} · aC₂=${fmt(s.settings.a * c.second)} · F=${fmt(c.F)} · u=${fmt(u)}。${nearNode(c.F, s.settings.a) ? '表示上の節付近（|F|/(1+a)≤0.009）。厳密な節の証明ではありません。' : 'Fは表示の節付近許容幅の外です。'} `;
        if (lesson === 0) q('observation').textContent = `適用座標 (${s.point.x.toFixed(4)}, ${s.point.y.toFixed(4)}) · 横の因子=${fmt(Math.cos(s.settings.m * Math.PI * s.point.x))} · 今の上下（横因子×cos(t)）=${fmt(Math.cos(s.settings.m * Math.PI * s.point.x) * Math.cos(s.t))}`;
        if (lesson === 1) q('observation').textContent = `適用座標 (${s.point.x.toFixed(4)}, ${s.point.y.toFixed(4)}) · 横の因子=${fmt(Math.cos(s.settings.m * Math.PI * s.point.x))} · 縦の因子=${fmt(Math.cos(s.settings.n * Math.PI * s.point.y))} · 第一成分 C₁=${fmt(c.first)}`;
        showTransport();
        q<HTMLInputElement>('nodes').checked = s.nodes;
        q<HTMLSelectElement>('speed').value = String(s.speed);
        host.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(el => { el.setAttribute('aria-pressed', String(el.dataset.mode === view.mode)); el.hidden = !modeAllowed(el.dataset.mode as Mode, lesson); });
        const selected = symbols[view.symbol];
        let meaning = selected?.[2] ?? '';
        if (view.symbol === 'F') meaning = `位置ごとの重ねた振動の形F。${view.nodeLabel}。時間では変わりません。${view.difference}`;
        if (view.symbol === 'a') meaning = `第二成分を引く割合。F=C₁−aC₂の節（F=0）と内側の枠を強調します。${view.difference}`;
        if (view.ring) meaning = `${view.ringLabel} 砂の進行とは独立です。`;
        if (['x', 'y', 'm', 'n', 'π', 'cos'].includes(view.symbol)) meaning = `${selected![2].split('。')[0]}。現在の表示は${view.displayLabel}。${view.axisLabel || 'この因子には選んだ記号が含まれないため、断面線は追加しません。'}`;
        q('symbol-copy').innerHTML = selected ? `<p><b>記号の名前</b>：${selected[0]}</p><p><b>式の中での読み方</b>：${selected[1]}</p><p><b>この作品での意味</b>：${meaning}</p>` : '記号を選ぶと、名前・読み方・意味と、図の対応箇所を確認できます。';
        host.querySelectorAll<HTMLButtonElement>('[data-symbol]').forEach(el => { el.disabled = !symbolAllowed(el.dataset.symbol!, lesson); el.setAttribute('aria-pressed', String(el.dataset.symbol === view.symbol)); });
        q('lesson').hidden = lesson < 0;
        q<HTMLButtonElement>('start').disabled = lesson >= 0;
        q<HTMLButtonElement>('quarter').disabled = lesson === 0 || lesson === 1;
        q('quarter').title = lesson === 0 || lesson === 1 ? '全面0とFの節の比較は第3段階から利用できます' : '';
        if (lesson >= 0) {
            q('lesson-copy').textContent = `${lesson + 1} · ${lessons[lesson][0]}：${lessons[lesson][1]} 現在の模様：${s.preset}。`;
            host.querySelectorAll<HTMLElement>('[data-lesson]').forEach(el => el.setAttribute('aria-pressed', String(Number(el.dataset.lesson) === lesson)));
        }
        q<HTMLSelectElement>('preset').disabled = lesson >= 0 && lesson < 3;
        q<HTMLButtonElement>('settings').querySelector('button')!.disabled = lesson >= 0 && lesson < 3;
        // Serializable evidence excludes the large positions array; tests compare its deterministic checksum.
        let hash = 2166136261;
        const bytes = new Uint8Array(s.sand.positions.buffer);
        for (const b of bytes) {
            hash ^= b;
            hash = Math.imul(hash, 16777619);
        }
        canvas.dataset.state = JSON.stringify({ ...s, sand: { seed: s.sand.seed, rng: s.sand.rng, step: s.sand.step, hash: hash >>> 0 }, lesson });
        canvas.dataset.presentation = JSON.stringify(view);
        requestPaint();
    }
    function notice(text: string) { q('notice').textContent = text; }
    function change(p: {
        m: number;
        n: number;
        a: number;
    }, seed: number, name?: string) { if (!apply(s, p, seed, name)) {
        q('error').textContent = '適用できません。m,nは1〜8の異なる整数、aは0〜2、seedは1〜4294967295の整数にしてください。直前の図と適用値を保持しました。';
        return;
    } clearSchedules(); q('error').textContent = ''; notice('両方停止。砂を散らし、時刻を0へ戻しました。'); syncInputs(); update(); }
    on(q('settings'), 'submit', e => { e.preventDefault(); if (lesson >= 0 && lesson < 3)
        return; const val = (id: string) => q<HTMLInputElement>(id).value.trim() === '' ? NaN : Number(q<HTMLInputElement>(id).value); change({ m: val('m'), n: val('n'), a: val('a') }, val('seed')); });
    on(q('preset'), 'change', () => { const p = presets[Number(q<HTMLSelectElement>('preset').value)]; if (p)
        change(p, s.sand.seed, p.name); });
    for (const kind of ['sand', 'wave'] as const) {
        const key = kind === 'sand' ? 'sandPlaying' : 'wavePlaying';
        click(kind + '-play', () => { if (document.hidden)
            return; if (kind === 'sand' && s.sand.step >= MAX_STEPS) {
            notice('600ステップで停止しました。「砂を散らす」で再開できます。');
            return;
        } s[key] = !s[key]; update(); schedule(); });
        click(kind + '-step', () => { s[key] = false; tick(s, kind === 'sand', kind === 'wave'); update(); schedule(); });
    }
    click('scatter', () => { s.sand = scatter(s.sand.seed); s.sandPlaying = false; notice('同じseedで砂だけを散らしました。振動の時刻は保持します。'); update(); schedule(); });
    click('phase-zero', () => { s.t = 0; s.phaseSteps = 0; s.wavePlaying = false; update(); schedule(); });
    click('quarter', () => { s.t = Math.PI / 2; s.wavePlaying = false; notice('cos(t)≈0で全面のuが一瞬0。Fの節は増えません。浮動小数点のためcos(π/2)は厳密な0ではありません。'); s.mode = 'u'; s.nodes = true; update(); schedule(); });
    on(q('speed'), 'change', () => { s.speed = Number(q<HTMLSelectElement>('speed').value); s.wavePlaying = false; update(); schedule(); });
    click('reset', () => { if (saved) {
        closeLesson();
    } pause(); s = initial(); notice(`初期設定へ復元。砂は同じseedの有限${REFERENCE_STEPS}ステップの結果です。`); syncInputs(); update(); });
    host.querySelectorAll<HTMLElement>('[data-mode]').forEach(el => on(el, 'click', () => { const mode = el.dataset.mode as Mode; if (!modeAllowed(mode, lesson)) return; s.mode = mode; update(); }));
    on(q('nodes'), 'change', () => { s.nodes = q<HTMLInputElement>('nodes').checked; update(); });
    function selectSymbol(id: string) { if (!symbolAllowed(id, lesson)) return; s.symbol = id; update(); }
    for (const event of ['pointerover', 'focusin', 'click']) on(host, event, e => { const button = (e.target as Element).closest<HTMLButtonElement>('[data-symbol]'); if (button && !button.disabled) selectSymbol(button.dataset.symbol!); });
    click('clear', () => selectSymbol(''));
    function point(x: number, y: number) { if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 1 || y < 0 || y > 1) {
        q('error').textContent = '観察座標は0〜1の有限値にしてください。直前の観察点を保持しました。';
        return;
    } s.point = { x, y }; q('error').textContent = ''; q<HTMLInputElement>('x').value = String(x); q<HTMLInputElement>('y').value = String(y); update(); }
    on(q('point-form'), 'submit', e => { e.preventDefault(); point(Number(q<HTMLInputElement>('x').value), Number(q<HTMLInputElement>('y').value)); });
    on(canvas, 'pointerdown', e => { const p = e as PointerEvent, r = canvas.getBoundingClientRect(), style = getComputedStyle(canvas), left = parseFloat(style.borderLeftWidth), top = parseFloat(style.borderTopWidth), width = r.width - left - parseFloat(style.borderRightWidth), height = r.height - top - parseFloat(style.borderBottomWidth); if (width <= 0 || height <= 0)
        return; point(Math.max(0, Math.min(1, ((p.clientX - r.left - left) / width - .055) / .89)), Math.max(0, Math.min(1, (.945 - (p.clientY - r.top - top) / height) / .89))); });
    on(canvas, 'keydown', e => { const k = e as KeyboardEvent, d = k.shiftKey ? .05 : .01; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k.key))
        return; k.preventDefault(); point(Math.max(0, Math.min(1, s.point.x + (k.key === 'ArrowRight' ? d : k.key === 'ArrowLeft' ? -d : 0))), Math.max(0, Math.min(1, s.point.y + (k.key === 'ArrowUp' ? d : k.key === 'ArrowDown' ? -d : 0)))); });
    function stage(i: number) { pause(); lesson = i; s.nodes = i >= 2; s.symbol = ''; s.mode = i === 0 ? 'factorX' : i === 1 ? 'first' : i === 2 ? 'F' : 'sand'; update(); }
    click('start', () => { saved = structuredClone(s); safeStop = false; stage(0); q('lesson').scrollIntoView({ block: 'nearest' }); q<HTMLButtonElement>('close').focus({ preventScroll: true }); });
    host.querySelectorAll<HTMLElement>('[data-lesson]').forEach(el => on(el, 'click', () => stage(Number(el.dataset.lesson))));
    function closeLesson() { if (!saved)
        return; pause(); s = restore(saved, safeStop || document.hidden); saved = null; lesson = -1; syncInputs(); q('error').textContent = ''; update(); schedule(); q<HTMLButtonElement>('start').focus({ preventScroll: true }); }
    click('close', closeLesson);
    on(document, 'keydown', e => { if ((e as KeyboardEvent).key === 'Escape')
        closeLesson(); });
    function safety() { if (document.hidden || motion.matches) {
        if (saved)
            safeStop = true;
        pause();
        notice('非表示または動きを減らす設定により停止しました。自動再開しません。');
    } if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        clearTimeout(recovery);
        recovery = 0;
    } update(); }
    on(document, 'visibilitychange', safety);
    on(motion, 'change', safety);
    on(window, 'resize', requestPaint);
    const ro = new ResizeObserver(requestPaint);
    ro.observe(canvas);
    host.querySelectorAll('output').forEach(el => el.setAttribute('aria-live', 'off'));
    syncInputs();
    notice(`初期表示はseed 12012から有限${REFERENCE_STEPS}ステップ進めた砂です。停止中。「砂を散らす」から過程を体験できます。`);
    update();
    return () => { if (disposed)
        return; disposed = true; clearSchedules(); cancelAnimationFrame(frame); clearTimeout(recovery); ro.disconnect(); abort.abort(); releaseSandCanvas(canvas); document.body.classList.remove('sand-active'); host.innerHTML = ''; };
}
function formula(lesson = -1) { const b = (id: string) => `<button data-symbol="${id}" aria-pressed="false">${id}</button>`;
    const horizontal = `${b('cos')}(${b('m')}${b('π')}${b('x')})`, vertical = `${b('cos')}(${b('n')}${b('π')}${b('y')})`;
    if (lesson === 0) return `<p>横の因子 = ${horizontal}</p>`;
    if (lesson === 1) return `<p>第一成分 C₁ = ${horizontal} × ${vertical}</p>`;
    return `<p>${b('F')}(${b('x')},${b('y')}) = <span class="sand-component">${horizontal} ${vertical} <small>C₁</small></span> − ${b('a')} <span class="sand-component">${b('cos')}(${b('n')}${b('π')}${b('x')}) ${b('cos')}(${b('m')}${b('π')}${b('y')}) <small>C₂</small></span></p><p>${b('u')}(${b('x')},${b('y')},${b('t')}) = A ${b('F')}(${b('x')},${b('y')}) ${b('cos')}(ω${b('t')})</p>`; }
