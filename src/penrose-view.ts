import { getPenrosePatch, MAX_LEVEL, type Tile } from './penrose';
import './penrose.css';

const palettes = {
  nebula: {field:'#151d40', gold:['#a66540','#c2884e','#dca75e','#ecc682','#ffe2a0'], blue:['#292451','#48396f','#615191','#7b6ab7','#a098df'], line:'#fff0ce55'},
  aurora: {field:'#122e3e', gold:['#86734d','#ac8d62','#d1af7a','#e5cf9d','#ffebb3'], blue:['#093b54','#155975','#287c93','#58a2b4','#83c9d1'], line:'#defbfa66'},
} as const;

const zooms = [0.8, 1, 1.25, 1.5, 1.8, 2.2] as const;
const STEP_MS = 1500;
const FADE_MS = 380;

export function mountPenrose(host: HTMLElement) {
  host.innerHTML = `<main class="penrose">
    <header class="penrose-heading">
      <small>018 / PENROSE TILING</small>
      <h1>黄金比の星屑</h1>
      <p>ふたつの菱形から、同じ並びを繰り返さない星の絨毯へ。</p>
    </header>
    <section class="penrose-layout" aria-label="作品と操作">
      <figure class="penrose-figure">
        <div class="penrose-stage">
          <span class="penrose-plate" aria-hidden="true">P3 <i></i> 72°</span>
          <canvas class="penrose-art" role="img" aria-describedby="penrose-caption">ペンローズ・タイルの有限パッチ</canvas>
        </div>
        <figcaption id="penrose-caption">
          <span class="penrose-legend"><span><i></i>厚い菱形 72°</span><span><i></i>薄い菱形 36°</span></span>
          <output id="penrose-status" role="status"></output>
        </figcaption>
      </figure>
      <aside class="penrose-controls" aria-label="鑑賞の操作">
        <h2>星屑をほどく</h2>
        <p class="penrose-note">段階を進めて、中心の星とその周りの変化を見比べてみましょう。</p>
        <div class="penrose-actions"><button id="penrose-play" type="button">再生</button><button id="penrose-reset" type="button">リセット</button></div>
        <div class="penrose-range">
          <label for="penrose-level">細分化の段階</label><span id="penrose-level-value"></span>
          <input id="penrose-level" type="range" min="0" max="${MAX_LEVEL}" value="0" step="1">
        </div>
        <div class="penrose-selects">
          <label>再生速度<select id="penrose-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>
          <label>色彩テーマ<select id="penrose-theme"><option value="nebula">星雲</option><option value="aurora">極光</option></select></label>
        </div>
        <label class="penrose-check"><input id="penrose-outlines" type="checkbox" checked>境界線を表示</label>
        <div class="penrose-zoom" role="group" aria-label="表示倍率"><button id="penrose-minus" type="button">縮小</button><span id="penrose-zoom-value">100%</span><button id="penrose-plus" type="button">拡大</button></div>
      </aside>
    </section>
    <details class="penrose-guide">
      <summary>模様をつくる数学</summary>
      <dl>
        <div><dt>黄金比 φ</dt><dd>φ = (1 + √5) / 2 ≈ 1.618。正五角形の対角線は辺の φ 倍です。</dd></div>
        <div><dt>ふたつの菱形</dt><dd>辺の長さは同じ。鋭角が72°なら厚く、36°なら薄い菱形です。外周に残る半タイルは、菱形の枚数には含めません。</dd></div>
        <div><dt>中心の星と置換</dt><dd>72°回すと初期の配置が重なります。菱形のもとになる三角形を黄金比で分け、小さな三角形を指定の対角線で組み直すたび、同じ面積により細かな模様が現れます。</dd></div>
        <div><dt>回転と繰り返しは別</dt><dd>周期的な模様は、ある向きに一定距離ずらすと全体が重なります。ペンローズの接続規則で平面全体を敷き詰めると、そのような平行移動の周期はありません。画面は有限の切り出しで、これ自体が非周期性の証明ではありません。</dd></div>
      </dl>
    </details>
  </main>`;
  const root = host.querySelector<HTMLElement>('.penrose')!;
  const find = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#penrose-${id}`)!;
  const canvas = root.querySelector<HTMLCanvasElement>('.penrose-art')!;
  const context = canvas.getContext('2d');
  const slider = find<HTMLInputElement>('level');
  const playButton = find<HTMLButtonElement>('play');
  const speedInput = find<HTMLSelectElement>('speed');
  const themeInput = find<HTMLSelectElement>('theme');
  const linesInput = find<HTMLInputElement>('outlines');
  const minus = find<HTMLButtonElement>('minus');
  const plus = find<HTMLButtonElement>('plus');
  const status = find<HTMLOutputElement>('status');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const current = document.createElement('canvas');
  const previous = document.createElement('canvas');
  const sky = document.createElement('canvas');
  let level = 0, zoomIndex = 1, speed = 1, theme: keyof typeof palettes = 'nebula';
  let lines = true, playing = false, fadeStarted: number | undefined;
  let timer: number | undefined, frame: number | undefined;

  function cancelFade() {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    fadeStarted = undefined;
  }

  // Decoration is composited beneath the projected polygons; it never affects a tile coordinate.
  function paintSky() {
    const ctx = sky.getContext('2d');
    if (!ctx) return;
    const {width:w,height:h} = sky;
    const s = Math.min(w,h), cx=w/2, cy=h/2;
    const field = ctx.createRadialGradient(cx,cy,0,cx,cy,Math.hypot(w,h)*0.54);
    field.addColorStop(0,palettes[theme].field);
    field.addColorStop(1,'#050714');
    ctx.fillStyle=field; ctx.fillRect(0,0,w,h);
    ctx.save();
    ctx.translate(cx,cy);
    for (const radius of [0.465,0.49,0.62]) {
      ctx.beginPath(); ctx.arc(0,0,s*radius,0,2*Math.PI);
      ctx.lineWidth=Math.max(0.6,s/1000); ctx.strokeStyle='#aeaad225'; ctx.stroke();
    }
    // Fixed pseudo-random-looking field; no random input to the geometric model.
    for (let i=0;i<105;i++) {
      const x=((i*149+31)%541)/541*w, y=((i*211+9)%547)/547*h;
      ctx.fillStyle=i%7===0?'#ffe4b184':'#b9c1f048';
      ctx.beginPath(); ctx.arc(x-cx,y-cy,(i%7===0?1.6:0.75)*Math.max(0.75,s/510),0,2*Math.PI); ctx.fill();
    }
    ctx.restore();
  }

  function paintTiles() {
    const ctx = current.getContext('2d');
    if (!ctx) return;
    const {width:w,height:h} = current, s=Math.min(w,h);
    const palette = palettes[theme], scale = s * (0.405 + 0.0035 * level) * zooms[zoomIndex];
    const patch = getPenrosePatch(level);
    const groups: Path2D[][] = Array.from({length:2},()=>Array.from({length:5},()=>new Path2D()));
    const outline = new Path2D();
    const underlay = new Path2D();
    function add(path: Path2D, tile: Tile) {
      tile.points.forEach(({x,y},i)=>i===0?path.moveTo(w/2+x*scale,h/2+y*scale):path.lineTo(w/2+x*scale,h/2+y*scale));
      path.closePath();
    }
    for (const tile of patch.tiles) {
      const n = tile.points.length;
      const radius = Math.hypot(tile.points.reduce((sum,p)=>sum+p.x,0)/n,tile.points.reduce((sum,p)=>sum+p.y,0)/n);
      const shade = Math.min(4,Math.max(0,Math.floor((1-radius)*4.5)));
      add(groups[tile.kind==='thick'?0:1][shade], tile);
      add(underlay,tile);
      if (lines) add(outline,tile);
    }
    for (const half of patch.boundary) add(underlay,half);
    ctx.clearRect(0,0,w,h);
    // The neutral underlay masks subpixel raster seams, not geometric gaps.
    ctx.fillStyle='#49405a'; ctx.fill(underlay);
    for (let i=0;i<2;i++) for (let shade=0;shade<5;shade++) {
      ctx.fillStyle=(i===0?palette.gold:palette.blue)[shade];
      ctx.fill(groups[i][shade]);
    }
    if (lines) {
      ctx.lineJoin='round'; ctx.lineWidth=Math.max(0.65,s/1150);
      ctx.strokeStyle=palette.line; ctx.stroke(outline);
    }
  }
  function composite(alpha=1) {
    if (!context || !canvas.width || !canvas.height) return;
    const {width,height}=canvas;
    context.clearRect(0,0,width,height);
    context.drawImage(sky,0,0);
    if (alpha<1) {
      context.globalAlpha=1-alpha; context.drawImage(previous,0,0);
    }
    context.globalAlpha=alpha; context.drawImage(current,0,0);
    context.globalAlpha=1;
  }

  function sync() {
    const patch = getPenrosePatch(level);
    const count=patch.tiles.length, edge=patch.boundary.length;
    root.dataset.theme = theme;
    canvas.dataset.level=String(level);
    canvas.dataset.zoom=String(zooms[zoomIndex]);
    canvas.setAttribute('aria-label',`ペンローズ・タイル、段階${level}、菱形${count}枚`);
    slider.value=String(level);
    slider.setAttribute('aria-valuetext',`段階 ${level}、菱形 ${count} 枚`);
    find('level-value').textContent=`${level} / ${MAX_LEVEL}`;
    find('zoom-value').textContent=`${Math.round(zooms[zoomIndex]*100)}%`;
    playButton.textContent=playing?'一時停止':'再生';
    minus.disabled=zoomIndex===0; plus.disabled=zoomIndex===zooms.length-1;
    const text=`段階 ${level} · 菱形 ${count.toLocaleString('ja-JP')}枚${edge? ` · 外周の半タイル ${edge}枚`:''}${level===MAX_LEVEL?' · 完成':''}`;
    if (status.textContent!==text) status.textContent=text;
  }

  function resize() {
    const box=canvas.getBoundingClientRect();
    if (box.width<1 || box.height<1) return;
    const dpr=Math.min(window.devicePixelRatio||1,2,1600/Math.max(box.width,box.height));
    const width=Math.max(1,Math.round(box.width*dpr)),height=Math.max(1,Math.round(box.height*dpr));
    if (current.width===width && current.height===height && canvas.width===width && canvas.height===height && canvas.dataset.ready) return;
    cancelFade();
    for (const layer of [canvas,current,previous,sky]) {layer.width=width;layer.height=height;}
    canvas.dataset.ready='true';
    paintSky(); paintTiles(); composite();
  }
  function setLevel(next: number, animate: boolean) {
    if (next===level) {sync();return;}
    cancelFade();
    const fade=animate&&!motion.matches&&Boolean(canvas.dataset.ready);
    if (fade) {
      const ctx=previous.getContext('2d');
      ctx?.clearRect(0,0,previous.width,previous.height);
      ctx?.drawImage(current,0,0);
    }
    level=next;
    paintTiles();
    sync();
    if (!fade) {composite();return;}
    composite(0);
    function tick(now: number) {
      fadeStarted ??= now;
      const t=Math.min(1,(now-fadeStarted)/FADE_MS);
      composite(t*t*(3-2*t));
      frame=t<1?requestAnimationFrame(tick):undefined;
      if (t===1) fadeStarted=undefined;
    }
    frame=requestAnimationFrame(tick);
  }
  function cancelTimer() {
    if (timer!==undefined) window.clearTimeout(timer);
    timer=undefined;
  }
  function schedule() {
    cancelTimer();
    if (!playing) return;
    timer=window.setTimeout(()=>{
      timer=undefined;
      const next=level+1;
      if (next>=MAX_LEVEL) playing=false;
      setLevel(next,true);
      schedule();
    },STEP_MS/speed);
  }
  function stop() { playing=false; cancelTimer(); cancelFade(); composite(); }
  function restyle(skyChanged=false) {cancelFade();if(skyChanged)paintSky();paintTiles();composite();sync();}
  playButton.onclick=()=>{
    if (playing) {stop();sync();return;}
    if (level===MAX_LEVEL) setLevel(0,false);
    playing=true;sync();schedule();
  };
  slider.oninput=()=>{stop();setLevel(Number(slider.value),false);};
  speedInput.onchange=()=>{speed=Number(speedInput.value);if(playing)schedule();};
  themeInput.onchange=()=>{theme=themeInput.value==='aurora'?'aurora':'nebula';restyle(true);};
  linesInput.onchange=()=>{lines=linesInput.checked;restyle();};
  minus.onclick=()=>{if(zoomIndex>0){zoomIndex--;restyle();}};
  plus.onclick=()=>{if(zoomIndex<zooms.length-1){zoomIndex++;restyle();}};
  find('reset').onclick=()=>{
    stop(); level=0; zoomIndex=1; speed=1; theme='nebula'; lines=true;
    speedInput.value='1'; themeInput.value='nebula'; linesInput.checked=true;
    restyle(true);
  };
  const onMotion=()=>{if(motion.matches){cancelFade();composite();}};
  const onVisibility=()=>{if(document.hidden){stop();sync();}};
  const onPageHide=()=>{stop();sync();};
  const observer=new ResizeObserver(resize);
  observer.observe(canvas);
  motion.addEventListener('change',onMotion);
  document.addEventListener('visibilitychange',onVisibility);
  window.addEventListener('pagehide',onPageHide);
  sync();
  resize();
  return ()=>{
    stop();
    observer.disconnect();
    motion.removeEventListener('change',onMotion);
    document.removeEventListener('visibilitychange',onVisibility);
    window.removeEventListener('pagehide',onPageHide);
  };
}
