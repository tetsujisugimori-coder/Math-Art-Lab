import {
  buildModularGeometry, DEFAULT_MULTIPLIER, DEFAULT_POINT_COUNT, MULTIPLIER_LIMITS,
  openingFrame, OPENING_MS, POINT_LIMITS, rasterSize,
} from './modular-heart';
import './modular-heart.css';

const patterns = ['カージオイド', 'ネフロイド', '3尖点', '4尖点', '5尖点'];
const defaultToggles = { circle: false, points: false, threads: true, glow: true };
const phaseCopy = {
  dawn: '静寂', threads: '光の糸', bloom: '輪郭の出現',
  form: '完成した弦', title: 'タイトル', complete: '鑑賞',
} as const;

export function mountModularHeart(host: HTMLElement) {
  host.innerHTML = `<main class="modular-heart">
    <header class="mh-heading">
      <div><small>019 / MODULAR STRING ART</small><h1>余りが描く心臓</h1>
      <p>一本ずつ結ぶ。輪郭は、そのあとで現れる。</p></div>
      <span class="mh-equation" aria-hidden="true">i <b>→</b> k i mod N</span>
    </header>
    <section class="mh-layout" aria-label="作品と操作">
      <figure class="mh-figure">
        <div class="mh-stage-home">
          <div class="mh-stage">
            <canvas id="mh-art" role="img" aria-label="剰余で結んだ円周の弦の模様" aria-describedby="mh-caption">円周上の点を剰余演算で結んだ直線群</canvas>
            <div class="mh-hud" aria-hidden="true"><span>光の糸 / 019</span><span id="mh-pattern"></span></div>
            <div class="mh-title" aria-hidden="true"><span>MODULAR STRING ART</span><strong>余りが描く心臓</strong></div>
          </div>
        </div>
        <figcaption id="mh-caption"><span id="mh-description"></span><span id="mh-count"></span></figcaption>
      </figure>
      <aside class="mh-controls" aria-label="鑑賞の操作">
        <p class="mh-kicker">01 / 観測卓</p><h2>光の糸を結ぶ</h2>
        <button type="button" id="mh-play">再生</button>
        <div class="mh-actions"><button type="button" id="mh-reset">リセット</button><button type="button" id="mh-complete">完成図</button></div>
        <output id="mh-status" aria-live="polite" aria-atomic="true"></output>
        <div class="mh-ranges">
          <label for="mh-multiplier">倍率 k <span id="mh-k-value"></span></label>
          <input id="mh-multiplier" type="range" min="${MULTIPLIER_LIMITS.min}" max="${MULTIPLIER_LIMITS.max}" value="2" step="1">
          <label for="mh-points-count">円周上の点数 N <span id="mh-n-value"></span></label>
          <input id="mh-points-count" type="range" min="${POINT_LIMITS.min}" max="${POINT_LIMITS.max}" value="280" step="1">
          <label for="mh-speed">描画速度<select id="mh-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
        </div>
        <fieldset class="mh-layers"><legend>表示レイヤー</legend>
          <label><input type="checkbox" id="mh-circle">円周</label><label><input type="checkbox" id="mh-points">点</label>
          <label><input type="checkbox" id="mh-threads" checked>線</label><label><input type="checkbox" id="mh-glow" checked>光彩</label>
        </fieldset>
        <button type="button" id="mh-gallery">全画面鑑賞</button>
      </aside>
    </section>
    <details class="mh-guide"><summary>なぜ余りから心臓形が現れる？</summary>
      <dl>
        <div><dt>01 / 余りで結ぶ</dt><dd>円周の点を0から数え、点 i を「k × i を N で割った余り」の点に結びます。N=280、k=2 なら、i=180 は j=80 へ。同じ点に戻る接続は長さ0なので線は見えません。同じ線分を二方向から結ぶ場合もあります。</dd></div>
        <div><dt>02 / 輪郭は描かない</dt><dd>点を限りなく密に置くと、隣り合う直線の交点が近づく先に尖りを持つ輪郭ができます。これが包絡線です。k=2 で尖りが1つのカージオイド、k=3 で尖りが2つのネフロイド。画面の有限本の弦はその近似で、曲線自体は描画していません。</dd></div>
        <div><dt>03 / 見比べる</dt><dd>まず k を2から3に。それから N を減らすと、輪郭の元になっている一本ずつの直線がはっきり見えます。画面では模様の向きを半回転させています。</dd></div>
      </dl>
    </details>
    <dialog class="mh-gallery" aria-label="全画面鑑賞"><button type="button" id="mh-gallery-close" autofocus>鑑賞を終了 <span aria-hidden="true">×</span></button><div class="mh-gallery-slot"></div></dialog>
  </main>`;
  const root = host.querySelector<HTMLElement>('.modular-heart')!;
  const find = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#mh-${id}`)!;
  const canvas = find<HTMLCanvasElement>('art');
  const stage = root.querySelector<HTMLDivElement>('.mh-stage')!;
  const home = root.querySelector<HTMLDivElement>('.mh-stage-home')!;
  const gallery = root.querySelector<HTMLDialogElement>('.mh-gallery')!;
  const slot = root.querySelector<HTMLDivElement>('.mh-gallery-slot')!;
  const galleryButton = find<HTMLButtonElement>('gallery');
  const play = find<HTMLButtonElement>('play');
  const nInput = find<HTMLInputElement>('points-count');
  const kInput = find<HTMLInputElement>('multiplier');
  const speed = find<HTMLSelectElement>('speed');
  const layers = Object.keys(defaultToggles) as (keyof typeof defaultToggles)[];
  let options = { ...defaultToggles };
  let count = DEFAULT_POINT_COUNT, multiplier = DEFAULT_MULTIPLIER;
  let geometry = buildModularGeometry(count, multiplier);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let elapsed = motion.matches ? OPENING_MS : 0;
  let playing = false, lastFrame: number | null = null, request = 0, disposed = false;
  let explicitPause = false, renderedSize = 0, drawn = 0;
  const sky = document.createElement('canvas'), lines = document.createElement('canvas');
  const ctx = canvas.getContext('2d'), skyCtx = sky.getContext('2d'), lineCtx = lines.getContext('2d');
  const title = root.querySelector<HTMLElement>('.mh-title')!;
  const status = find<HTMLOutputElement>('status');
  const visibleCounter = find<HTMLElement>('count');
  const description = find<HTMLElement>('description');
  const patternLabel = find<HTMLElement>('pattern');
  const announce = (next: string) => { if (status.value !== next) status.value = next; };

  function props() {
    const { width: w, height: h } = canvas;
    return { w, h, s: Math.min(w, h), x: w / 2, y: h * 0.487, r: Math.min(w, h) * 0.436 };
  }

  function paintSky() {
    if (!skyCtx) return;
    const { w, h, s, x, y } = props();
    const field = skyCtx.createLinearGradient(0, h, w, 0);
    field.addColorStop(0, '#040712');
    field.addColorStop(0.55, '#0b0717');
    field.addColorStop(1, '#04050b');
    skyCtx.fillStyle = field;
    skyCtx.fillRect(0, 0, w, h);
    const mist = skyCtx.createRadialGradient(x, y, 0, x, y, s * 0.65);
    mist.addColorStop(0, '#372045aa');
    mist.addColorStop(0.45, '#25183665');
    mist.addColorStop(1, '#22173500');
    skyCtx.fillStyle = mist;
    skyCtx.fillRect(0, 0, w, h);
    for (let i = 0; i < 100; i++) {
      const px = ((i * 239 + 59) % 1201) / 1201 * w;
      const py = ((i * 173 + i * i * 13 + 83) % 1237) / 1237 * h;
      const bright = i % 11 === 0;
      skyCtx.fillStyle = bright ? '#cbd2fa96' : i % 7 === 0 ? '#ffc9e46b' : '#9ab3d64c';
      const radius = Math.max(0.55, s / 800) * (bright ? 1.4 : 0.75);
      skyCtx.beginPath();
      skyCtx.arc(px, py, radius, 0, 2 * Math.PI);
      skyCtx.fill();
    }
  }

  function clearLines() {
    lineCtx?.clearRect(0, 0, lines.width, lines.height);
    drawn = 0;
  }

  function addLines(visible: number) {
    if (!lineCtx) return;
    if (visible < drawn) clearLines();
    if (!options.threads) return;
    const { x, y, r, s } = props();
    const density = Math.min(1, Math.sqrt(DEFAULT_POINT_COUNT / count));
    lineCtx.globalCompositeOperation = 'screen';
    for (; drawn < visible; drawn++) {
      const { from, to } = geometry.chords[drawn];
      if (from === to) continue;
      const a = geometry.points[from], b = geometry.points[to];
      // The only presentation transform is a common half-turn plus fit/translation.
      const ax = x - a.x * r, ay = y - a.y * r, bx = x - b.x * r, by = y - b.y * r;
      const hue = drawn % 19 === 0 ? 200 : 314 + (38 * (from / count));
      lineCtx.beginPath();
      lineCtx.moveTo(ax, ay); lineCtx.lineTo(bx, by);
      if (options.glow) {
        lineCtx.lineWidth = Math.max(1.9, s / 180);
        lineCtx.strokeStyle = `hsla(${hue}, 92%, 56%, ${0.045 * density})`;
        lineCtx.stroke();
      }
      lineCtx.lineWidth = Math.max(0.65, s / 880);
      lineCtx.strokeStyle = `hsla(${hue}, 90%, ${drawn % 11 === 0 ? 78 : 67}%, ${0.28 * density})`;
      lineCtx.stroke();
    }
    lineCtx.globalCompositeOperation = 'source-over';
  }

  function draw() {
    const current = openingFrame(elapsed, count);
    if (ctx) {
      const { w, h, x, y, r, s } = props();
      ctx.drawImage(sky, 0, 0);
      if (options.glow) {
        const calm = !motion.matches && current.phase === 'form' ? 0.02 * Math.sin(current.ms / 570) : 0;
        const light = ctx.createRadialGradient(x, y + r * 0.13, 0, x, y + r * 0.13, r * 0.94);
        light.addColorStop(0, `rgba(214, 72, 143, ${0.09 + Math.min(0.075, current.visible / count * 0.075) + calm})`);
        light.addColorStop(0.55, '#a2347119');
        light.addColorStop(1, '#7c296900');
        ctx.fillStyle = light;
        ctx.fillRect(0, 0, w, h);
      }
      if (options.circle || current.phase === 'dawn' && playing) {
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.strokeStyle = options.circle ? '#d4c2f777' : '#ad86bb24';
        ctx.lineWidth = Math.max(0.8, s / 900);
        ctx.stroke();
      }
      if (options.points) {
        ctx.fillStyle = '#f4d4e9bf';
        ctx.beginPath();
        const radius = Math.max(0.75, s / 650);
        for (const p of geometry.points) {
          const px = x - p.x * r, py = y - p.y * r;
          ctx.moveTo(px + radius, py);
          ctx.arc(px, py, radius, 0, 2 * Math.PI);
        }
        ctx.fill();
      }
      addLines(current.visible);
      if (options.threads) ctx.drawImage(lines, 0, 0);
    }
    const pattern = patterns[multiplier - 2];
    const shownTitle = current.phase === 'title' ? current.titleOpacity : 0;
    title.style.opacity = String(shownTitle);
    canvas.dataset.phase = current.phase;
    canvas.dataset.visible = String(current.visible);
    canvas.dataset.count = String(count);
    canvas.dataset.multiplier = String(multiplier);
    canvas.dataset.drawComplete = String(current.visible === count);
    canvas.dataset.renderSize = `${canvas.width}×${canvas.height}`;
    canvas.dataset.renderRevision = String(renderedSize);
    const counter = `${current.visible} / ${count} 接続`;
    if (visibleCounter.textContent !== counter) visibleCounter.textContent = counter;
    const summary = `k=${multiplier} · ${pattern} · N=${count}`;
    if (description.textContent !== summary) description.textContent = summary;
    if (patternLabel.textContent !== pattern) patternLabel.textContent = pattern;
    announce(!ctx ? 'Canvasを利用できません' : motion.matches ? '動きの軽減：完成図'
      : playing ? `再生中：${phaseCopy[current.phase]}` : explicitPause ? '一時停止中' : current.phase === 'complete' ? '完成図' : '再生できます');
    play.disabled = motion.matches || !ctx;
    play.textContent = playing ? '一時停止' : explicitPause ? '再開' : elapsed >= OPENING_MS ? 'もう一度再生' : '再生';
  }

  function syncGeometry() {
    find('k-value').textContent = String(multiplier);
    find('n-value').textContent = String(count);
    geometry = buildModularGeometry(count, multiplier);
    clearLines();
  }

  function resize() {
    if (disposed) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w <= 0 || h <= 0) return;
    const { width, height } = rasterSize(w, h, window.devicePixelRatio || 1);
    if (renderedSize && canvas.width === width && canvas.height === height) return;
    canvas.width = sky.width = lines.width = width;
    canvas.height = sky.height = lines.height = height;
    renderedSize++;
    paintSky();
    clearLines();
    draw();
  }

  function stopFrame() {
    if (request) cancelAnimationFrame(request);
    request = 0;
    lastFrame = null;
  }

  function queueFrame() {
    if (!disposed && playing && !document.hidden && !request) request = requestAnimationFrame(tick);
  }

  function tick(time: number) {
    request = 0;
    if (disposed || !playing || document.hidden) return;
    if (lastFrame !== null) elapsed = Math.min(OPENING_MS, elapsed + Math.max(0, time - lastFrame) * Number(speed.value));
    lastFrame = time;
    if (elapsed === OPENING_MS) {
      playing = false;
      stopFrame();
    }
    draw();
    queueFrame();
  }

  function finish() {
    playing = explicitPause = false;
    stopFrame();
    elapsed = OPENING_MS;
    draw();
  }

  function reset() {
    playing = explicitPause = false;
    stopFrame();
    count = DEFAULT_POINT_COUNT; nInput.value = String(count);
    multiplier = DEFAULT_MULTIPLIER; kInput.value = String(multiplier);
    speed.value = '1';
    options = { ...defaultToggles };
    for (const layer of layers) find<HTMLInputElement>(layer).checked = options[layer];
    elapsed = motion.matches ? OPENING_MS : 0;
    syncGeometry();
    draw();
  }

  play.onclick = () => {
    if (motion.matches || !ctx) return;
    if (playing) { playing = false; explicitPause = true; stopFrame(); }
    else {
      if (elapsed >= OPENING_MS) { elapsed = 0; clearLines(); }
      playing = true; explicitPause = false;
      queueFrame();
    }
    draw();
  };
  find<HTMLButtonElement>('reset').onclick = reset;
  find<HTMLButtonElement>('complete').onclick = finish;
  nInput.oninput = kInput.oninput = () => {
    const nextCount = Number(nInput.value), nextMultiplier = Number(kInput.value);
    if (nextCount === count && nextMultiplier === multiplier) return;
    count = nextCount; multiplier = nextMultiplier;
    syncGeometry();
    finish();
  };
  for (const layer of layers) {
    const control = find<HTMLInputElement>(layer);
    control.onchange = () => {
      options[layer] = control.checked;
      if (layer === 'glow') clearLines();
      draw();
    };
  }
  galleryButton.onclick = () => {
    if (gallery.open) return;
    gallery.showModal();
    slot.append(stage);
    resize();
  };
  find<HTMLButtonElement>('gallery-close').onclick = () => gallery.close();
  gallery.addEventListener('close', () => {
    home.append(stage);
    if (disposed) return;
    resize();
    galleryButton.focus();
  });
  const visibility = () => { stopFrame(); queueFrame(); };
  const motionChanged = () => { if (motion.matches) finish(); else draw(); };
  motion.addEventListener('change', motionChanged);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('resize', resize);
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  syncGeometry();
  resize();
  return () => {
    disposed = true;
    stopFrame();
    if (gallery.open) gallery.close();
    observer.disconnect();
    motion.removeEventListener('change', motionChanged);
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('resize', resize);
    host.innerHTML = '';
  };
}
