import {bloomFrame,bloomPresets,BLOOM_MS,buildBloom,MAX_DEPTH,type BloomCircle,type BloomPreset} from './apollonian-bloom';
import './apollonian-bloom.css';

const themes = {
  night:{name:'夜の花園', shadow:'#080b25', haze:'#241952', hue:[50,256,273,203,46,279,185]},
  amber:{name:'琥珀', shadow:'#180b0e', haze:'#4a2114', hue:[44,32,16,49,28,4,48]},
  crystal:{name:'水晶', shadow:'#041520', haze:'#10384f', hue:[188,207,190,219,171,199,178]},
  sakura:{name:'桜', shadow:'#1a0e22', haze:'#3b1b46', hue:[327,336,278,303,354,273,310]},
  mono:{name:'モノクロ', shadow:'#101318', haze:'#272b33', hue:[213,213,213,213,213,213,213]},
} as const;
type Theme=keyof typeof themes;
const stages = ['接円の種','最初の隙間','世代の成長','細部が咲く','完成'] as const;
const lesson = [
  ['01 / 円が接するとは','外円Aと内円Bが内接すると、中心間距離は半径の差。内円Bと内円Cが外接すると、距離は半径の和です。'],
  ['02 / 三円が作る隙間','金色の三円に囲まれた中央の隙間に、三円すべてと接する新しい円を一つ置けます。これは外円とは別の解です。'],
  ['03 / デカルトの円定理','曲率 k は正の円では 1/r、囲う円では −1/r。四円では (Σk)² = 2Σk²。三円を残したとき、置き換わる円の曲率は k′ = 2(残した三円の曲率の和) − k。中心も同じ反射を曲率×座標に適用します。'],
  ['04 / 無限に近づく構造','段数を増やすと、残った隙間にさらに小さな円が現れます。数学上は際限なく続けられますが、ここでは段数・円数・描画半径を制限しています。'],
] as const;

function options<T extends {name:string}>(values: Record<string,T>) {
  return Object.entries(values).map(([id,value])=>`<option value="${id}">${value.name}</option>`).join('');
}
function drawCircle(ctx: CanvasRenderingContext2D,circle:BloomCircle,x:number,y:number,scale:number,theme:Theme,outline:boolean,outer=false) {
  const radius=circle.radius*scale;
  if (radius<.65) return false;
  const hue=themes[theme].hue[circle.generation], sat=theme==='mono'?8:72;
  const px=x+circle.x*scale, py=y+circle.y*scale;
  ctx.beginPath();
  ctx.arc(px,py,radius,0,2*Math.PI);
  if (!outer) {
    if (radius>=7) {
      const glow=ctx.createRadialGradient(px-.29*radius,py-.4*radius,0,px,py,radius);
      glow.addColorStop(0,`hsla(${hue},${sat}%,69%,.40)`);
      glow.addColorStop(.68,`hsla(${hue},${sat}%,42%,.21)`);
      glow.addColorStop(1,`hsla(${hue},${sat}%,71%,.32)`);
      ctx.fillStyle=glow;
    } else ctx.fillStyle=`hsla(${hue},${sat}%,71%,.44)`;
    ctx.fill();
  }
  if (outline) {
    ctx.strokeStyle=`hsla(${hue},${sat}%,${outer?85:80}%,${outer?.66:.79})`;
    ctx.lineWidth=Math.min(radius/2,outer?1.7:1.02);
    ctx.stroke();
  }
  return true;
}

export function mountApollonianBloom(host: HTMLElement) {
  host.innerHTML=`<main class="bloom" data-bloom>
    <header class="bloom-header"><div><small>EXPERIMENT 020 / APOLLONIAN BLOOM</small><h1>無限に咲く円の花</h1><p>触れるたび、隙間に次の花が咲く。</p></div><span aria-hidden="true">◉ &nbsp; 円の標本室</span></header>
    <section class="bloom-layout" aria-label="円の鑑賞と操作">
      <figure><div class="bloom-home"><div class="bloom-stage"><canvas id="bloom-art" role="img" aria-label="外円の隙間を埋める有限の接円の花" aria-describedby="bloom-description">接円を世代順に描く図</canvas><div class="bloom-hud" aria-hidden="true"><span>GROWTH STUDY 020</span><span>○ &nbsp; 接円標本</span></div><div id="bloom-title" aria-hidden="true"><span>APOLLONIAN BLOOM</span><strong>無限に咲く円の花</strong></div></div></div>
      <figcaption id="bloom-description"><span id="bloom-preset-note"></span><span id="bloom-counters"></span></figcaption></figure>
      <aside class="bloom-panel" aria-label="鑑賞の操作">
        <p class="bloom-kicker">01 / 生長の観測</p><h2>隙間に、もう一輪。</h2>
        <button id="bloom-play" type="button">再生</button>
        <div class="bloom-pair"><button id="bloom-restart" type="button">最初から</button><button id="bloom-complete" type="button">完成形</button></div>
        <output id="bloom-status" aria-live="polite"></output>
        <label for="bloom-preset">初期配置<select id="bloom-preset">${options(bloomPresets)}</select></label>
        <label for="bloom-depth">生成段数<select id="bloom-depth">${Array.from({length:MAX_DEPTH},(_,i)=>`<option value="${i+1}"${i===4?' selected':''}>${i+1} 段</option>`).join('')}</select></label>
        <label for="bloom-speed">再生速度<select id="bloom-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
        <label for="bloom-theme">配色<select id="bloom-theme">${options(themes)}</select></label>
        <label class="bloom-check"><input id="bloom-outline" type="checkbox" checked>円の境界線</label>
        <div class="bloom-pair"><button id="bloom-reset" type="button">初期設定に戻す</button><button id="bloom-immersive" type="button">全画面鑑賞</button></div>
        <button id="bloom-lesson" type="button">円の数学 · 4段階</button>
      </aside>
    </section>
    <dialog id="bloom-lesson-dialog" aria-labelledby="bloom-lesson-title"><div class="bloom-lesson-head"><h2 id="bloom-lesson-title"></h2><button type="button" id="bloom-lesson-close" autofocus>教材を終了</button></div>
      <p id="bloom-lesson-copy"></p><canvas id="bloom-lesson-art" width="440" height="275" role="img" aria-describedby="bloom-lesson-copy bloom-lesson-values" aria-label="教材の接円図"></canvas>
      <p id="bloom-lesson-values"></p><div class="bloom-lesson-nav"><button type="button" id="bloom-lesson-prev">前へ</button><output id="bloom-lesson-step" aria-live="polite"></output><button type="button" id="bloom-lesson-next">次へ</button></div>
    </dialog>
    <dialog id="bloom-immersive-dialog" aria-label="全画面鑑賞"><button type="button" id="bloom-immersive-close" autofocus>鑑賞を終了 <span aria-hidden="true">×</span></button><div class="bloom-immersive-slot"></div></dialog>
  </main>`;
  const root=host.querySelector<HTMLElement>('[data-bloom]')!;
  const get=<T extends HTMLElement>(id:string)=>root.querySelector<T>(`#bloom-${id}`)!;
  const select=(key:string)=>get<HTMLSelectElement>(key);
  const button=(key:string)=>get<HTMLButtonElement>(key);
  const canvas=get<HTMLCanvasElement>('art'), ctx=canvas.getContext('2d');
  const title=get('title'), status=get<HTMLOutputElement>('status');
  const stage=root.querySelector<HTMLElement>('.bloom-stage')!, home=root.querySelector<HTMLElement>('.bloom-home')!;
  const lessonDialog=get<HTMLDialogElement>('lesson-dialog'), immersive=get<HTMLDialogElement>('immersive-dialog');
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const events=new AbortController();
  const on=(target:EventTarget,event:string,listener:EventListener)=>target.addEventListener(event,listener,{signal:events.signal});
  const modelCache=new Map<string,readonly BloomCircle[]>();
  let state:'idle'|'playing'|'paused'|'finished'=media.matches?'finished':'idle';
  let preset:BloomPreset='trinity', theme:Theme='night', depth=5, speed=1, outline=true;
  let model=modelFor(preset,depth), elapsed=state==='finished'?BLOOM_MS:0;
  let request=0, previous:number|null=null, disposed=false, shown=0, painted=0, dirty=true;
  let lessonStep=1;
  function modelFor(which:BloomPreset,level:number) {
    const key=`${which}:${level}`, cached=modelCache.get(key);
    if(cached) return cached;
    const model=buildBloom(bloomPresets[which].seed,level).circles;
    modelCache.set(key,model);
    return model;
  }
  function paintBackdrop(width:number,height:number) {
    if(!ctx)return;
    const t=themes[theme], field=ctx.createRadialGradient(width*.5,height*.41,0,width*.5,height*.48,Math.max(width,height)*.67);
    field.addColorStop(0,t.haze);field.addColorStop(.58,t.shadow);field.addColorStop(1,'#060711');
    ctx.fillStyle=field;ctx.fillRect(0,0,width,height);
    for(let i=0;i<56;i++){
      ctx.fillStyle=i%9===0?'#e3ddc282':'#aab7dd37';
      ctx.fillRect(((i*337+17)%709)/709*width,((i*i*53+i*67+83)%719)/719*height,i%9===0?1.6:1, i%9===0?1.6:1);
    }
  }
  function render() {
    if(disposed)return;
    const frame=bloomFrame(elapsed,model.length);
    const {width,height}=canvas;
    const s=Math.min(width,height);
    if(ctx&&width>0&&height>0){
      if(dirty||frame.count<shown) { paintBackdrop(width,height); shown=0;painted=0;dirty=false; }
      for(;shown<frame.count;shown++) if(drawCircle(ctx,model[shown],width/2,height*.455,s*.395,theme,outline,shown===0))painted++;
    }
    title.style.opacity=String(frame.titleOpacity);
    const stageIndex=frame.ms>=BLOOM_MS?4:frame.ms>=10_000?3:frame.ms>=5000?2:frame.ms>=2000?1:0;
    const generation=model[frame.count-1].generation;
    get('counters').textContent=`${frame.count} / ${model.length} 円 · 第 ${generation} 世代`;
    get('preset-note').textContent=bloomPresets[preset].note;
    const caption=`${{idle:'再生待ち',playing:'再生中',paused:'一時停止',finished:'完成'}[state]} · ${stages[stageIndex]}`;
    if(status.value!==caption)status.value=caption;
    button('play').textContent=state==='playing'?'一時停止':state==='paused'?'再開':'再生';
    Object.assign(root.dataset,{state,count:String(frame.count),maxCount:String(model.length),painted:String(painted),title:frame.titleOpacity===1?'shown':'hidden',elapsedMs:String(Math.round(frame.ms)),drawComplete:String(shown===frame.count && !dirty)});
  }
  function resize(){
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const dpr=Math.min(2,window.devicePixelRatio||1,1920/Math.max(rect.width,rect.height));
    const w=Math.max(1,Math.round(rect.width*dpr)), h=Math.max(1,Math.round(rect.height*dpr));
    if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;dirty=true;}
    render();
  }
  function halt() { if(request)cancelAnimationFrame(request);request=0;previous=null; }
  function schedule() {
    if(!request&&!disposed&&state==='playing'&&!document.hidden&&!lessonDialog.open)request=requestAnimationFrame(tick);
  }
  function tick(now:number){
    request=0;
    if(disposed||state!=='playing'||document.hidden||lessonDialog.open){previous=null;return;}
    if(previous!==null)elapsed=Math.min(BLOOM_MS,elapsed+Math.max(0,now-previous)*speed);
    previous=now;
    if(elapsed===BLOOM_MS){state='finished';previous=null;}
    render();schedule();
  }
  function complete(){halt();state='finished';elapsed=BLOOM_MS;render();}
  function restart(){halt();if(media.matches){complete();return;}elapsed=0;state='idle';render();}
  function updateModel(){model=modelFor(preset,depth);dirty=true;restart();}
  on(button('play'),'click',()=>{
    if(media.matches){complete();return;}
    if(state==='playing'){halt();state='paused';render();return;}
    if(state==='finished')elapsed=0;
    state='playing';render();schedule();
  });
  on(button('restart'),'click',restart);
  on(button('complete'),'click',complete);
  on(button('reset'),'click',()=>{
    preset='trinity';theme='night';depth=5;speed=1;outline=true;
    select('preset').value=preset;select('theme').value=theme;select('depth').value=String(depth);
    select('speed').value='1';get<HTMLInputElement>('outline').checked=true;updateModel();
  });
  on(select('preset'),'change',()=>{
    const next=select('preset').value;
    if(!Object.hasOwn(bloomPresets,next)) return;
    preset=next as BloomPreset;theme=bloomPresets[preset].theme;select('theme').value=theme;updateModel();
  });
  on(select('depth'),'change',()=>{depth=Number(select('depth').value);updateModel();});
  on(select('speed'),'change',()=>{speed=Number(select('speed').value);});
  on(select('theme'),'change',()=>{
    const next=select('theme').value;
    if(Object.hasOwn(themes,next)){theme=next as Theme;dirty=true;render();}
  });
  on(get('outline'),'change',()=>{outline=get<HTMLInputElement>('outline').checked;dirty=true;render();});
  on(document,'visibilitychange',()=>{halt();schedule();});
  on(media,'change',()=>{if(media.matches)complete();});
  on(button('immersive'),'click',()=>{
    immersive.showModal();
    immersive.querySelector('.bloom-immersive-slot')!.append(stage);
    resize();
  });
  on(button('immersive-close'),'click',()=>immersive.close());
  on(immersive,'close',()=>{if(disposed)return;home.append(stage);resize();button('immersive').focus();});
  on(button('lesson'),'click',()=>{
    halt();lessonStep=1;renderLesson();lessonDialog.showModal();
  });
  on(button('lesson-close'),'click',()=>lessonDialog.close());
  on(lessonDialog,'close',()=>{if(disposed)return;button('lesson').focus();schedule();});
  on(button('lesson-next'),'click',()=>{if(lessonStep<4){lessonStep++;renderLesson();}});
  on(button('lesson-prev'),'click',()=>{if(lessonStep>1){lessonStep--;renderLesson();}});
  function renderLesson(){
    const index=lessonStep-1;
    lessonDialog.dataset.step=String(lessonStep);
    get('lesson-title').textContent=lesson[index][0];
    get('lesson-copy').textContent=lesson[index][1];
    get('lesson-step').textContent=`${lessonStep} / 4`;
    button('lesson-next').disabled=lessonStep===4;button('lesson-prev').disabled=lessonStep===1;
    const demo=get<HTMLCanvasElement>('lesson-art').getContext('2d');
    const model=modelFor('trinity',lessonStep===4?4:1);
    const a=model[0],b=model[1],c=model[2],d=model[4];
    get('lesson-values').textContent=[
      `AB: ${Math.hypot(b.x,b.y).toFixed(6)} = R−r · BC: ${Math.hypot(b.x-c.x,b.y-c.y).toFixed(6)} = 2r`,
      `中央の円の半径: ${d.radius.toFixed(6)} · 外円半径: 1`,
      `反射前 k = ${a.k} · 反射後 k′ = ${d.k.toFixed(6)}`,
      `第4世代まで: ${model.length} 円（外円を含む）`,
    ][index];
    if(!demo)return;
    demo.fillStyle='#111329';demo.fillRect(0,0,440,275);
    const limit=[3,5,8,model.length][index];
    model.slice(0,limit).forEach((c,i)=>drawCircle(demo,c,220,137.5,118,'night',true,i===0));
    if(index===0){
      demo.strokeStyle='#ffd99e';demo.setLineDash([5,6]);demo.beginPath();
      demo.moveTo(220,137.5);demo.lineTo(220+b.x*118,137.5+b.y*118);demo.lineTo(220+c.x*118,137.5+c.y*118);demo.stroke();demo.setLineDash([]);
      demo.font='bold 14px sans-serif';demo.fillStyle='#fff2c9';
      [[a,'A'],[b,'B'],[c,'C']].forEach(([point,label])=>{const p=point as BloomCircle;demo.fillText(label as string,226+p.x*118,132+p.y*118);});
    }
  }
  const observer=new ResizeObserver(resize);observer.observe(canvas);
  resize();
  return ()=>{
    disposed=true;halt();events.abort();observer.disconnect();
    if(lessonDialog.open)lessonDialog.close();
    if(immersive.open)immersive.close();
    modelCache.clear();
  };
}
