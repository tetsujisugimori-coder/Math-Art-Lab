import { COMPOSITE, PRIME, PRIME_CONSTELLATION_DURATION_MS as DURATION, createPrimeDataset, createPrimeLayout, createSieveTrace, primeConstellationFrame, type PrimeLayout } from './prime-constellation';
import './prime-constellation.css';

const layouts: Record<PrimeLayout,string> = {ulam:'ウラムの螺旋',polar:'極座標螺旋',grid:'整数格子'};
const layoutOptions = Object.entries(layouts).map(([key,label])=>`<option value="${key}">${label}</option>`).join('');
const MAX=25000; // UI bound, independent of the verified model range.
const stages = ['宇宙の誕生','星々の出現','隠された秩序','星図の完成'];
const lessons = [
  ['素数とは何か','素数は、1より大きく、正の約数が1と自分自身だけの整数です。2は唯一の偶数の素数。4は2×2と書ける合成数。1はどちらでもありません。'],
  ['エラトステネスの篩','小さい素数から、その倍数を消します。p²より小さい合成数は、すでにより小さい素因数で除外されています。1は最初から候補外です。'],
  ['ウラムの螺旋','1を原点に置き、まず右へ進みます。数学座標では上が正で、反時計回りに折れ曲がります。斜めの筋は観察された模様であり、式がいつも素数を生むという証明ではありません。'],
  ['素数の分布','同じ整数集合を3通りに配置します。極座標は半径√n、角度nラジアン。双子素数は差が2の組です。双子素数が無限にあるかは未解決です。'],
];
const lessonData=createPrimeDataset(100), sieve=createSieveTrace(100);
const ratio=(n:number,d:number)=>`${(100*n/d).toFixed(2)}%`;
const cap=(x:number,min:number,max:number)=>Math.min(max,Math.max(min,x));

export function mountPrimeConstellation(host:HTMLElement) {
  host.innerHTML=`<main class="prime-atlas" data-prime-atlas>
    <header class="prime-head"><div><p>EXPERIMENT 021 &nbsp; / &nbsp; NUMBER SKY</p><h1>素数の星図</h1><p>数をたどる。星が灯る。見えなかった筋があらわれる。</p></div><span aria-hidden="true">◈ &nbsp; PRIME OBSERVATORY</span></header>
    <section class="prime-layout" aria-label="星図の鑑賞と操作">
      <figure class="prime-figure"><div class="prime-home"><div class="prime-stage">
        <canvas id="prime-art" tabindex="0" role="img" aria-label="素数の星図。矢印キーで移動、プラスとマイナスで拡大縮小、0で視点初期化。整数の指定は操作パネルでも行えます。">整数の配置と素数の位置を描く図</canvas>
        <div class="prime-hud" aria-hidden="true"><span>FIG. 021 &nbsp; / &nbsp; FINITE SKY</span><span id="prime-phase"></span></div>
        <div class="prime-title" id="prime-title" aria-hidden="true"><span>CONSTELLATION OF PRIMES</span><strong>素数の星図</strong></div>
      </div></div>
      <figcaption><span id="prime-counts"></span><span class="prime-legend">青白：素数　金：強調した双子素数　灰：合成数（表示時）</span></figcaption></figure>
      <aside class="prime-controls" aria-label="星図の操作">
        <h2>観測席</h2><output id="prime-state" aria-live="polite"></output>
        <div class="prime-buttons"><button id="prime-play" type="button">再生</button><button id="prime-restart" type="button">最初から</button><button id="prime-finish" type="button">完成形</button></div>
        <label>配置<select id="prime-mode">${layoutOptions}</select></label>
        <div class="prime-pair"><label>上限<select id="prime-limit"><option>100</option><option>1000</option><option selected>10000</option><option>${MAX}</option></select></label>
        <label>再生速度<select id="prime-speed"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div>
        <fieldset><legend>表示レイヤー</legend><label><input id="prime-primes" type="checkbox" checked>素数</label><label><input id="prime-composites" type="checkbox">合成数</label><label><input id="prime-twins" type="checkbox" checked>双子素数</label><label><input id="prime-guide" type="checkbox">座標ガイド</label><label><input id="prime-labels" type="checkbox">整数ラベル</label></fieldset>
        <div class="prime-buttons"><button id="prime-zoomout" type="button" aria-label="縮小">−</button><button id="prime-zoomin" type="button" aria-label="拡大">＋</button><button id="prime-reset" type="button">視点初期化</button></div>
        <form id="prime-form"><label>整数を調べる<input id="prime-number" type="number" min="1" max="10000" step="1" required value="2"></label><button type="submit">選択</button></form>
        <output id="prime-selection" aria-live="polite">星を選ぶか、整数を指定してください。</output>
        <div class="prime-pair"><button id="prime-lesson" type="button">素数の数学 · 4段階</button><button id="prime-full" type="button">全画面鑑賞</button></div>
      </aside>
    </section>
    <dialog id="prime-lesson-dialog" aria-labelledby="prime-lesson-title"><div class="prime-dialog-head"><h2 id="prime-lesson-title"></h2><button id="prime-lesson-close" type="button" autofocus>教材を終了</button></div>
      <p id="prime-lesson-copy"></p><label id="prime-compare-label">配置を比較<select id="prime-compare">${layoutOptions}</select></label>
      <canvas id="prime-example" width="600" height="300" role="img" aria-label="1から100までの教材図" aria-describedby="prime-lesson-copy prime-lesson-note"></canvas>
      <p id="prime-lesson-note" aria-live="polite"></p><div class="prime-buttons"><button id="prime-prev" type="button">前へ</button><button id="prime-sieve" type="button">倍数を除く</button><button id="prime-next" type="button">次へ</button></div>
    </dialog>
    <dialog id="prime-full-dialog" class="prime-full" aria-label="全画面鑑賞"><button id="prime-full-close" type="button" autofocus>鑑賞を終了</button><div class="prime-slot"></div></dialog>
  </main>`;
  const root=host.querySelector<HTMLElement>('[data-prime-atlas]')!;
  const get=<T extends HTMLElement=HTMLElement>(id:string)=>root.querySelector<T>(`#prime-${id}`)!;
  const canvas=get<HTMLCanvasElement>('art'), ctx=canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D が利用できません');
  const g=ctx;
  const compositeLayer=document.createElement('canvas');
  const compositeContext=compositeLayer.getContext('2d');
  let compositePixels:ImageData|undefined;
  const stage=root.querySelector<HTMLElement>('.prime-stage')!, home=root.querySelector<HTMLElement>('.prime-home')!;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const abort=new AbortController();
  const on=(target:EventTarget,event:string,f:EventListener)=>target.addEventListener(event,f,{signal:abort.signal});
  const checked=(key:string)=>get<HTMLInputElement>(key).checked;
  const value=(key:string)=>get<HTMLSelectElement>(key).value;
  let limit=10000, mode:PrimeLayout='ulam', data=createPrimeDataset(limit);
  const positions=new Map<PrimeLayout,ReturnType<typeof createPrimeLayout>>();
  function layoutFor(which:PrimeLayout) {
    let entry=positions.get(which);
    if (!entry) {entry=createPrimeLayout(which,limit);positions.set(which,entry);}
    return entry;
  }
  let coords=layoutFor(mode);
  type State='idle'|'playing'|'paused'|'finished';
  let state:State=motion.matches?'finished':'idle', elapsed=motion.matches?DURATION:0;
  let speed=1, frameId=0, previous:number|null=null, lastPaint=-Infinity, disposed=false;
  let width=1,height=1,zoom=1,panX=0,panY=0,selected=0, renderCount=0;
  let map={scale:1,x:0,y:0}, paintedUntil=0;
  const displayNumber=new Intl.NumberFormat('ja-JP');
  const nfmt=(n:number)=>displayNumber.format(n);
  function paint() {
    if(disposed)return;
    const f=primeConstellationFrame(elapsed,limit);
    paintedUntil=f.visibleLimit;
    const dpr=canvas.width/width;
    g.setTransform(dpr,0,0,canvas.height/height,0,0);
    const {minX,maxX,minY,maxY,x,y}=coords;
    const w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY);
    const approach=Math.min(1,elapsed/7000);
    const finalX=(minX+maxX)/2,finalY=(minY+maxY)/2;
    const camera=(motion.matches?1:f.zoom*(1+5*(1-approach)**2))*zoom;
    const s=Math.min(width*.83/w,height*.76/h)*camera;
    map={scale:s,x:width/2+panX-s*(x[1]+(finalX-x[1])*approach),y:height*.48+panY+s*(y[1]+(finalY-y[1])*approach)};
    const px=(n:number)=>map.x+x[n]*s,py=(n:number)=>map.y-y[n]*s;
    const backdrop=g.createRadialGradient(width*.51,height*.46,0,width*.51,height*.46,Math.hypot(width,height)*.58);
    backdrop.addColorStop(0,'#101d38');backdrop.addColorStop(.57,'#070e21');backdrop.addColorStop(1,'#020409');
    g.fillStyle=backdrop;g.fillRect(0,0,width,height);
    const has=(n:number)=>px(n)>=-4&&px(n)<=width+4&&py(n)>=-4&&py(n)<=height+4;
    if(checked('guide')){
      g.strokeStyle='#6789ae66';g.lineWidth=1;g.beginPath();g.moveTo(0,map.y);g.lineTo(width,map.y);g.moveTo(map.x,0);g.lineTo(map.x,height);g.stroke();
      g.fillStyle='#b9cbe2';g.font='12px system-ui';g.fillText('+X →   +Y ↑',12,height-16);
    }
    if(checked('composites')){
      if(compositeContext&&f.visibleLimit>2000){
        const pw=canvas.width, ph=canvas.height;
        if(!compositePixels||compositeLayer.width!==pw||compositeLayer.height!==ph){
          compositeLayer.width=pw;compositeLayer.height=ph;
          compositePixels=compositeContext.createImageData(pw,ph);
        }
        const rgba=compositePixels.data, dy=ph/height;
        rgba.fill(0);
        for(let n=4;n<=f.visibleLimit;n++)if(data.kinds[n]===COMPOSITE){
          const ix=Math.floor(px(n)*dpr),iy=Math.floor(py(n)*dy);
          if(ix<0||ix>=pw||iy<0||iy>=ph)continue;
          const offset=(iy*pw+ix)*4;
          rgba[offset]=120;rgba[offset+1]=145;rgba[offset+2]=176;rgba[offset+3]=117;
        }
        compositeContext.putImageData(compositePixels,0,0);
        g.drawImage(compositeLayer,0,0,width,height);
      }else{
        g.fillStyle='#7891b05b';
        for(let n=4;n<=f.visibleLimit;n++)if(data.kinds[n]===COMPOSITE&&has(n))g.fillRect(px(n),py(n),1,1);
      }
    }
    const showPrimes=checked('primes'),showTwins=checked('twins');
    const radius=cap(s*.115,.58,2.25);
    let visibleCount=0, painted=0;
    for(const n of data.primes){if(n>f.visibleLimit)break;visibleCount++;}
    // The soft halo and core are concentric at exactly the same mathematical coordinate.
    for(let pass=0;pass<2;pass++)for(let gold=0;gold<2;gold++){
      g.fillStyle=pass===0?(gold?'#f4c7752b':'#84acfe25'):(gold?'#ffe3a0':'#d7ecff');
      const r=pass===0?radius*2.9:radius;
      for(let i=0;i<visibleCount;i++){
        const n=data.primes[i], twin=Boolean(data.twins[n])&&showTwins;
        if((!showPrimes&&!twin)||Number(twin)!==gold||!has(n))continue;
        if(pass===1)painted++;
        const x0=px(n),y0=py(n);
        if(radius<1.05)g.fillRect(x0-r,y0-r,2*r,2*r);
        else {g.beginPath();g.arc(x0,y0,r,0,Math.PI*2);g.fill();}
      }
    }
    const latest=data.primes[visibleCount-1];
    if(!motion.matches&&state!=='finished'&&latest&&(showPrimes||(showTwins&&data.twins[latest]))&&has(latest)){
      const x0=px(latest),y0=py(latest),r=7+radius*3;
      const bloom=g.createRadialGradient(x0,y0,0,x0,y0,r);
      bloom.addColorStop(0,'#f7eece99');bloom.addColorStop(1,'#91c9ff00');g.fillStyle=bloom;g.fillRect(x0-r,y0-r,r*2,r*2);
    }
    if(checked('labels')&&s>=17){
      g.fillStyle='#cbdaf5';g.font='10px system-ui';
      let labels=0;
      const labelBounds=new Set<string>();
      for(let n=1;n<=f.visibleLimit&&labels<225;n++) if(has(n)&&(data.kinds[n]===PRIME?(showPrimes||(showTwins&&data.twins[n])):n===1||checked('composites'))){
        const key=`${Math.floor(px(n)/33)},${Math.floor(py(n)/14)}`;
        if(labelBounds.has(key))continue;
        labelBounds.add(key);g.fillText(String(n),px(n)+4,py(n)-4);labels++;
      }
    }
    if(selected>0&&selected<=f.visibleLimit&&has(selected)){
      g.beginPath();g.strokeStyle='#f3d291';g.lineWidth=1.3;g.arc(px(selected),py(selected),Math.max(5,radius*2),0,2*Math.PI);g.stroke();
    }
    get('title').style.opacity=String(f.titleOpacity);
    const phase=stages[f.stage-1];if(get('phase').textContent!==phase)get('phase').textContent=phase;
    const counts=`1〜${nfmt(limit)} · 素数 ${nfmt(visibleCount)} / ${nfmt(data.primes.length)} · 双子素数 ${nfmt(data.twinPairs.length)} 組（範囲内）`;
    if(get('counts').textContent!==counts)get('counts').textContent=counts;
    const status=get<HTMLOutputElement>('state'), label={idle:'再生待ち',playing:'再生中',paused:'一時停止',finished:'完成'}[state];
    if(status.value!==label)status.value=label;
    const playLabel=state==='playing'?'一時停止':state==='paused'?'再開':'再生';
    if(get('play').textContent!==playLabel)get('play').textContent=playLabel;
    Object.assign(root.dataset,{state,stage:String(f.stage),elapsed:String(Math.round(elapsed)),visibleLimit:String(f.visibleLimit),primeCount:String(data.primes.length),visiblePrimes:String(visibleCount),painted:String(painted),layout:mode,title:f.titleOpacity===1?'shown':'hidden',renders:String(++renderCount)});
  }
  function resize(){
    if(disposed)return;
    const rect=canvas.getBoundingClientRect(), ratio=Math.min(2,devicePixelRatio||1);
    if(rect.width<=0||rect.height<=0)return;
    const nextW=Math.round(rect.width*ratio),nextH=Math.round(rect.height*ratio);
    width=rect.width;height=rect.height;
    if(canvas.width!==nextW||canvas.height!==nextH){canvas.width=nextW;canvas.height=nextH;}
    paint();
  }
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  function stop(){if(frameId)cancelAnimationFrame(frameId);frameId=0;previous=null;}
  function step(timestamp:number){
    frameId=0;
    if(disposed||document.hidden||state!=='playing')return;
    if(previous!==null)elapsed=cap(elapsed+(timestamp-previous)*speed,0,DURATION);
    previous=timestamp;
    if(elapsed>=DURATION){state='finished';previous=null;paint();return;}
    if(timestamp-lastPaint>=32){lastPaint=timestamp;paint();}
    frameId=requestAnimationFrame(step);
  }
  function play(restart=false){
    if(motion.matches){finish();return;}
    if(restart||state==='finished')elapsed=0;
    state='playing';lastPaint=-Infinity;stop();paint();
    if(!document.hidden)frameId=requestAnimationFrame(step);
  }
  function finish(){stop();state='finished';elapsed=DURATION;paint();}
  function pause(){stop();state='paused';paint();}
  function details(n:number){
    if(!Number.isInteger(n)||n<1||n>limit)return;
    selected=n;get<HTMLInputElement>('number').value=String(n);
    const kind=data.kinds[n], partners=[n-2,n+2].filter(x=>x>=2&&x<=limit&&data.kinds[x]===PRIME&&kind===PRIME);
    get<HTMLOutputElement>('selection').value=`${nfmt(n)}：${kind===PRIME?'素数':kind===COMPOSITE?'合成数':'素数でも合成数でもない'}${partners.length?` · 双子素数の相手 ${partners.map(nfmt).join('、')}`:''} · (${coords.x[n].toFixed(mode==='polar'?2:0)}, ${coords.y[n].toFixed(mode==='polar'?2:0)})`;
    root.dataset.selected=String(n);paint();
  }
  function changeZoom(factor:number,x=width/2,y=height*.48){
    const next=cap(zoom*factor,.45,18),scale=next/zoom;
    panX=(width/2+panX-x)*scale+x-width/2;panY=(height*.48+panY-y)*scale+y-height*.48;
    zoom=next;paint();
  }
  function reset(){zoom=1;panX=0;panY=0;paint();}
  function selectPoint(cx:number,cy:number){
    let nearest=0,best=144;
    const showPrimes=checked('primes'),showTwins=checked('twins'),showComposites=checked('composites');
    for(let n=2;n<=paintedUntil;n++){
      if(data.kinds[n]===PRIME?!(showPrimes||showTwins&&data.twins[n]):!showComposites)continue;
      const dx=map.x+coords.x[n]*map.scale-cx,dy=map.y-coords.y[n]*map.scale-cy,dist=dx*dx+dy*dy;
      if(dist<best){best=dist;nearest=n;}
    }
    if(nearest)details(nearest);
  }
  type Point={x:number;y:number};
  const contacts=new Map<number,Point>();
  let dragged=false, movedAt:Point={x:0,y:0};
  const point=(e:PointerEvent)=>({x:e.offsetX,y:e.offsetY});
  on(canvas,'pointerdown',ev=>{
    const e=ev as PointerEvent;if(e.button!==0)return;const p=point(e);
    if(!contacts.size){dragged=false;movedAt=p;}
    else dragged=true;
    contacts.set(e.pointerId,p);canvas.setPointerCapture(e.pointerId);
  });
  on(canvas,'pointermove',ev=>{
    const e=ev as PointerEvent, old=contacts.get(e.pointerId);if(!old)return;
    const next=point(e), others=[...contacts].filter(([id])=>id!==e.pointerId), other=others[0]?.[1];
    contacts.set(e.pointerId,next);
    if(other){const dist=Math.hypot(old.x-other.x,old.y-other.y);if(dist>3)changeZoom(Math.hypot(next.x-other.x,next.y-other.y)/dist,(next.x+other.x)/2,(next.y+other.y)/2);return;}
    if(Math.hypot(next.x-movedAt.x,next.y-movedAt.y)>4)dragged=true;
    if(dragged){panX+=next.x-old.x;panY+=next.y-old.y;paint();}
  });
  on(canvas,'pointerup',ev=>{const e=ev as PointerEvent;if(contacts.delete(e.pointerId)&&!dragged&&!contacts.size)selectPoint(e.offsetX,e.offsetY);});
  for(const event of ['pointercancel','lostpointercapture'])on(canvas,event,ev=>{contacts.delete((ev as PointerEvent).pointerId);});
  on(canvas,'keydown',ev=>{
    const e=ev as KeyboardEvent;
    if(e.key==='+'||e.key==='=')changeZoom(1.25);
    else if(e.key==='-')changeZoom(.8);
    else if(e.key==='0')reset();
    else if(e.key.startsWith('Arrow')){panX+=e.key==='ArrowRight'?30:e.key==='ArrowLeft'?-30:0;panY+=e.key==='ArrowDown'?30:e.key==='ArrowUp'?-30:0;paint();}
    else return;
    e.preventDefault();
  });
  on(get('play'),'click',()=>{if(state==='playing')pause();else play();});
  on(get('restart'),'click',()=>{reset();play(true);});on(get('finish'),'click',finish);
  on(get('mode'),'change',()=>{mode=value('mode') as PrimeLayout;coords=layoutFor(mode);reset();if(selected)details(selected);});
  on(get('limit'),'change',()=>{
    limit=Number(value('limit'));data=createPrimeDataset(limit);positions.clear();coords=layoutFor(mode);
    get<HTMLInputElement>('number').max=String(limit);
    if(selected>limit){selected=0;delete root.dataset.selected;get<HTMLInputElement>('number').value='2';get<HTMLOutputElement>('selection').value='選択した整数は新しい範囲の外です。';}
    reset();if(selected)details(selected);
  });
  on(get('speed'),'change',()=>{speed=Number(value('speed'));previous=null;});
  for(const key of ['primes','composites','twins','guide','labels'])on(get(key),'change',paint);
  on(get('zoomin'),'click',()=>changeZoom(1.3));on(get('zoomout'),'click',()=>changeZoom(1/1.3));on(get('reset'),'click',reset);
  on(get('form'),'submit',ev=>{ev.preventDefault();details(get<HTMLInputElement>('number').valueAsNumber);});
  on(document,'visibilitychange',()=>{if(document.hidden)stop();else if(state==='playing'&&!frameId){previous=null;frameId=requestAnimationFrame(step);}});
  on(motion,'change',()=>{if(motion.matches)finish();});

  const lesson=get<HTMLDialogElement>('lesson-dialog'), full=get<HTMLDialogElement>('full-dialog');
  let lessonIndex=0,sieveIndex=0,resumeLesson=false;
  function drawLesson(){
    get('lesson-title').textContent=`0${lessonIndex+1} / ${lessons[lessonIndex][0]}`;
    get('lesson-copy').textContent=lessons[lessonIndex][1];
    get('compare-label').hidden=lessonIndex!==3;
    get<HTMLButtonElement>('prev').disabled=lessonIndex===0;
    get<HTMLButtonElement>('next').disabled=lessonIndex===3;
    const sieveButton=get<HTMLButtonElement>('sieve');
    sieveButton.hidden=lessonIndex!==1;sieveButton.textContent=sieveIndex===sieve.steps.length?'篩を最初から':`${sieve.steps[sieveIndex]} の倍数を除く`;
    const sample=get<HTMLCanvasElement>('example'),c=sample.getContext('2d');if(!c)return;
    const layout=lessonIndex<2?'grid':lessonIndex===2?'ulam':value('compare') as PrimeLayout, ceiling=lessonIndex===0?16:100;
    const p=createPrimeLayout(layout,ceiling,lessonIndex===0?4:10), sx=Math.min(450/Math.max(1,p.maxX-p.minX),224/Math.max(1,p.maxY-p.minY));
    c.fillStyle='#0b1428';c.fillRect(0,0,600,300);c.font=lessonIndex<=1?'16px system-ui':'11px system-ui';c.textAlign='center';c.textBaseline='middle';
    let remaining=0;
    for(let n=1;n<=ceiling;n++){
      const crossed=Boolean(sieve.firstFactor[n]&&sieve.firstFactor[n]<= (sieve.steps[sieveIndex-1]??0));
      if(n>1&&!crossed)remaining++;
      c.fillStyle=n===1?'#b0bbcc':lessonIndex===1?(crossed?'#768198':'#e4eeff'):(lessonData.twins[n]&&lessonIndex===3?'#ffe4a5':lessonData.kinds[n]===PRIME?'#daeaff':'#7485a2');
      const x0=300+(p.x[n]-(p.maxX+p.minX)/2)*sx,y0=150-(p.y[n]-(p.maxY+p.minY)/2)*sx;
      if(lessonIndex===3){c.beginPath();c.arc(x0,y0,lessonData.kinds[n]===PRIME?4:2,0,Math.PI*2);c.fill();}
      else {c.fillText(String(n),x0,y0);if(lessonIndex===1&&crossed)c.fillRect(x0-11,y0,22,1);}
    }
    get('lesson-note').textContent=lessonIndex===0?'金色ではなく、明るい数が素数。1は灰色で別扱いです。':lessonIndex===1?`1を除いた候補：${remaining} 個${sieveIndex===sieve.steps.length?'（残った25個は素数）':''}`:lessonIndex===2?'右隣が2、その上が3。明るい数字が素数です。':`教材範囲 1〜100：素数25個 / 100整数（${ratio(25,100)}）、双子素数 ${lessonData.twinPairs.length} 組。鑑賞範囲 1〜${nfmt(limit)}：素数 ${nfmt(data.primes.length)} 個（${ratio(data.primes.length,limit)}）、双子素数 ${nfmt(data.twinPairs.length)} 組。`;
  }
  on(get('lesson'),'click',()=>{resumeLesson=state==='playing';if(resumeLesson)pause();lessonIndex=0;sieveIndex=0;drawLesson();lesson.showModal();});
  on(get('lesson-close'),'click',()=>lesson.close());
  on(lesson,'close',()=>{if(!disposed){get('lesson').focus();if(resumeLesson&&state==='paused')play();}resumeLesson=false;});
  on(get('prev'),'click',()=>{lessonIndex--;drawLesson();if(lessonIndex===0)get('next').focus();});
  on(get('next'),'click',()=>{lessonIndex++;drawLesson();if(lessonIndex===3)get('prev').focus();});
  on(get('sieve'),'click',()=>{sieveIndex=sieveIndex===sieve.steps.length?0:sieveIndex+1;drawLesson();});
  on(get('compare'),'change',drawLesson);
  on(get('full'),'click',()=>{full.querySelector('.prime-slot')!.append(stage);full.showModal();resize();});
  on(get('full-close'),'click',()=>full.close());
  on(full,'close',()=>{if(!disposed){home.append(stage);resize();get('full').focus();}});
  resize();
  return ()=>{disposed=true;stop();observer.disconnect();abort.abort();contacts.clear();compositeLayer.width=0;compositeLayer.height=0;compositePixels=undefined;if(full.open)full.close();if(lesson.open)lesson.close();};
}
