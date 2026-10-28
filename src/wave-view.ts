import {defaults,evaluate,geometry,pixels,pointValid,screenPoint,valid,radians,parseNumber,PERIOD,type Mode,type Point,type Settings} from './wave';
import {renderMath} from './inspector';
import './wave.css';

const descriptions={wavelength:'λは波長。距離がλだけ変わると位相は2π進みます。',distance:'dは発生源間の距離。A=(−d/2,0)、B=(d/2,0)です。',phase:'φは波Bの位相差。入力は度、計算はラジアンです。',time:'tはモデル時間。周期T=2で同じ変位に戻ります。',a:'u_AはPでの波Aの瞬間変位です。',b:'u_BはPでの波Bの瞬間変位です。',u:'uは同じ地点の二つの瞬間変位の和です。'} as const;
type SymbolId=keyof typeof descriptions;
const lessons=[['波Aだけを見る','PからAまでの距離r_Aがλだけ増えると位相は2π進み、山・谷が繰り返されます。'],['波Bを加える','同じPと時刻でu_Aとu_Bを計算し、符号を含めて足します。'],['強め合い・弱め合い','Δ=k(r_B−r_A)+φ、B=2A|cos(Δ/2)|。例えば初期条件d=4、λ=2、φ=0°でP=(0,0)ならB=2です。t=T/4でu≈0でもBは2のままです。'],['条件を変えて比較する','d、λ、φを変え、PでのΔとBを比べてください。同じ場所・逆位相なら全点でB≈0です。']] as const;
type State={settings:Settings;point:Point;time:number;mode:Mode;playing:boolean;selected:SymbolId|null};
export function mountWave(root:HTMLElement):()=>void{
 const life=new AbortController(),motion=matchMedia('(prefers-reduced-motion: reduce)');
 let state:State={settings:defaults(),point:{x:0,y:0},time:0,mode:'a',playing:!motion.matches,selected:null};
 let saved:State|null=null,raf:number|null=null,previous:number|null=null,disposed=false,dirty=true,grid=geometry(state.settings);
 root.innerHTML=`<main class="wave"><header><small>MATH ART LAB / EXPERIMENT 007</small><h1>波紋の対話</h1><p>二つの波が出会う場所。<br>Wave Interference</p></header>
 <p>距離によって位相が変わる、減衰のない理想的な二つの波です。波は領域全体に存在します。</p>
 <div class="wave-layout"><section><div class="wave-stage"><canvas width="240" height="240" aria-label="波の座標平面。クリックまたはタップで観察点を選択"></canvas><svg viewBox="0 0 240 240" aria-hidden="true"><g id="wave-source-a"><circle r="5"/><text x="8" y="-8">A</text></g><g id="wave-source-b"><path d="M0 -6 L6 0 L0 6 L-6 0 Z"/><text x="8" y="14">B</text></g><g id="wave-point"><circle r="7"/><path d="M-11 0H11M0-11V11"/><text x="10" y="-10">P</text></g></svg></div><p>座標：x・yとも −6〜6（上がyの正）。図をクリック・タップしてPを選択できます。</p><p id="wave-legend"></p><output id="wave-observation" aria-live="off"></output><p>画像は画素中心での近似、Pの数値は選んだ座標で直接計算した約値です。</p></section>
 <aside><label>表示モード<select id="wave-mode"><option value="a">波Aだけ</option><option value="b">波Bだけ</option><option value="u">重ね合わせ u</option><option value="envelope">干渉の模様 B</option></select></label><p>変位は固定範囲 −2〜2、包絡振幅は0〜2。Bは同じ設定なら時間によらない静止模様です。</p><div class="wave-actions"><button id="wave-play">一時停止</button><button id="wave-step">1ステップ</button><button id="wave-reset-time">t=0へ戻す</button></div>
 <label>プリセット<select id="wave-preset"><option value="custom">選択してください</option><option value="same">同位相</option><option value="opposite">逆位相</option><option value="cancel">同じ場所で打ち消す</option></select></label>
 <form id="wave-settings" novalidate><label>波長 λ（1〜4）<input name="wavelength" type="number" step="any" required></label><label>発生源間隔 d（0〜6）<input name="distance" type="number" step="any" required></label><label>位相差 φ（−180〜180°）<input name="phase" type="number" step="any" required></label><label>再生速度（0.25〜2倍）<input name="speed" type="number" step="any" required></label><button>設定を適用</button><p id="wave-error" role="status"></p></form><p>入力は候補です。適用するとt=0で停止します。範囲は操作上の制限です。A=1、T=2は固定です。</p><button id="wave-default">設定を初期値へ</button>
 <form id="wave-point-form" novalidate><label>Pのx（−6〜6）<input name="x" type="number" step="any" required></label><label>Pのy（−6〜6）<input name="y" type="number" step="any" required></label><button>Pを適用</button><p id="wave-point-error" role="status"></p></form>
 <button id="wave-lesson-toggle">4段階の教材を開く</button><div id="wave-lesson" hidden><div class="wave-actions">${lessons.map(([title],i)=>`<button data-lesson="${i}">${i+1}. ${title}</button>`).join('')}</div><p id="wave-lesson-text"></p><p>教材を閉じると開始前の設定・時刻・モード・P・再生状態に戻ります。</p></div></aside></div>
 <section class="wave-inspector"><h2>数式と観察点</h2><p data-wave-terms="distance a b">r_A=√((x+d/2)²+y²), r_B=√((x−d/2)²+y²)</p><p data-wave-terms="a b u time phase">u_A=A cos(kr_A−ωt), u_B=A cos(kr_B−ωt+φ), u=u_A+u_B</p><p data-wave-terms="wavelength time phase distance">k=2π/λ, ω=2π/T, Δ=k(r_B−r_A)+φ, B=2A|cos(Δ/2)|</p><div class="wave-actions">${Object.entries({wavelength:'λ',distance:'d',phase:'φ',time:'t',a:'u_A',b:'u_B',u:'u'}).map(([id,label])=>`<button data-wave-symbol="${id}" aria-pressed="false">${label}</button>`).join('')}</div><p id="wave-guide">記号をホバー・タップ・Tabで選ぶと説明を表示します。</p><button id="wave-clear">強調を解除</button><div id="wave-formulas"></div><p>u=0は瞬間の変位です。B=0はその地点で常に打ち消す条件です。流体の到達前線、反射や厳密な水面運動は扱いません。</p></section></main>`;
 const $=<T extends HTMLElement=HTMLElement>(q:string)=>root.querySelector<T>(q)!;
 // Reuse the existing inspector's safe MathML renderer for the general expressions.
 root.querySelectorAll<HTMLElement>('[data-wave-terms]').forEach(el=>{const expression=el.textContent??'';el.replaceChildren();expression.split(', ').forEach((part,i)=>{if(i)el.append('、 ');const math=document.createElementNS('http://www.w3.org/1998/Math/MathML','math');math.append(renderMath(part));el.append(math);});el.tabIndex=0;el.setAttribute('role','region');el.setAttribute('aria-label',`一般式 ${expression}`);});
 const canvas=$<HTMLCanvasElement>('canvas'),ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx){root.innerHTML='<main><h1>波紋の対話</h1><p>この環境ではCanvas 2Dを利用できません。対応するブラウザで再読込してください。</p></main>';return()=>root.replaceChildren();}
 const form=$<HTMLFormElement>('#wave-settings'),pointForm=$<HTMLFormElement>('#wave-point-form');
 const input=(f:HTMLFormElement,name:string)=>f.elements.namedItem(name) as HTMLInputElement;
 const fmt=(n:number)=>Math.abs(n)<1e-12?'0':Number(n.toPrecision(5)).toString();
 function fill(){for(const key of ['wavelength','distance','phase','speed'] as const)input(form,key).value=String(state.settings[key]);input(pointForm,'x').value=String(state.point.x);input(pointForm,'y').value=String(state.point.y);}
 function marker(id:string,x:number,y:number){$(`#wave-${id}`).setAttribute('transform',`translate(${(x+6)*20} ${(6-y)*20})`);}
 function draw(){const image=ctx!.createImageData(grid.n,grid.n);image.data.set(pixels(grid,state.mode,state.time));ctx!.putImageData(image,0,0);dirty=false;}
 function sync(){
  const s=state.settings,p=state.point,v=evaluate(s,p,state.time),k=2*Math.PI/s.wavelength,phi=radians(s.phase);
  marker('source-a',-s.distance/2,0);marker('source-b',s.distance/2,0);marker('point',p.x,p.y);
  $<HTMLSelectElement>('#wave-mode').value=state.mode;$('#wave-play').textContent=state.playing?'一時停止':'再生';$<HTMLButtonElement>('#wave-step').disabled=state.playing;
  $('#wave-legend').textContent=state.mode==='envelope'?'包絡振幅 B：暗 0 → 明 2':'変位：青 −2 ／ 暗 0 ／ 金 +2（A・Bも同じ尺度）';
  $('#wave-observation').textContent=`P=(${fmt(p.x)}, ${fmt(p.y)}) · t≈${fmt(state.time)} · r_A≈${fmt(v.ra)} · r_B≈${fmt(v.rb)} · u_A≈${fmt(v.a)} · u_B≈${fmt(v.b)} · u≈${fmt(v.u)} · Δ≈${fmt(v.delta)} rad · B≈${fmt(v.envelope)}`;
  $('#wave-formulas').textContent=`適用値：λ=${fmt(s.wavelength)}, d=${fmt(s.distance)}, φ=${fmt(s.phase)}° (≈${fmt(phi)} rad), 速度=${fmt(s.speed)}倍。 k≈${fmt(k)}, ω≈${fmt(2*Math.PI/PERIOD)}。 u_A=cos(${fmt(k)}×${fmt(v.ra)}−π×${fmt(state.time)})≈${fmt(v.a)}、u_B=cos(${fmt(k)}×${fmt(v.rb)}−π×${fmt(state.time)}+${fmt(phi)})≈${fmt(v.b)}、u≈${fmt(v.a)}+${fmt(v.b)}≈${fmt(v.u)}。 Δ≈${fmt(k)}×(${fmt(v.rb)}−${fmt(v.ra)})+${fmt(phi)}≈${fmt(v.delta)}、B≈2|cos(${fmt(v.delta)}/2)|≈${fmt(v.envelope)}。`;
  $('#wave-guide').textContent=state.selected?descriptions[state.selected]:'記号をホバー・タップ・Tabで選ぶと説明を表示します。';root.querySelectorAll<HTMLButtonElement>('[data-wave-symbol]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.waveSymbol===state.selected)));
  $('.wave-stage').dataset.highlight=state.selected??'';
  root.querySelectorAll<HTMLElement>('[data-wave-terms]').forEach(el=>el.classList.toggle('wave-highlight',!!state.selected&&el.dataset.waveTerms!.split(' ').includes(state.selected)));
 }
 function schedule(){if(!disposed&&!document.hidden&&raf===null&&(state.playing||dirty))raf=requestAnimationFrame(frame);}
 function frame(now:number){raf=null;if(disposed||document.hidden){previous=null;return;}if(state.playing){if(previous!==null){state.time+=(now-previous)/1000*state.settings.speed;if(state.mode!=='envelope')dirty=true;}previous=now;sync();}else previous=null;if(dirty)draw();schedule();}
 function refresh(redraw=true){if(redraw)dirty=true;sync();schedule();}
 function apply(s:Settings){state.settings=s;state.time=0;state.playing=false;previous=null;grid=geometry(s);fill();$('#wave-error').textContent='';refresh();}
 form.onsubmit=e=>{e.preventDefault();const s={} as Settings;for(const k of ['wavelength','distance','phase','speed'] as const)s[k]=parseNumber(input(form,k).value);if(!valid(s)){$('#wave-error').textContent='範囲内の有限な数値を入力してください。設定は未適用です。';return;}apply(s);};
 pointForm.onsubmit=e=>{e.preventDefault();const p={x:parseNumber(input(pointForm,'x').value),y:parseNumber(input(pointForm,'y').value)};if(!pointValid(p)){$('#wave-point-error').textContent='−6〜6の有限な座標を入力してください。Pは変更されていません。';return;}state.point=p;$('#wave-point-error').textContent='';refresh(false);};
 canvas.onclick=e=>{const rect=canvas.getBoundingClientRect();state.point=screenPoint((e.clientX-rect.left)/rect.width,(e.clientY-rect.top)/rect.height);input(pointForm,'x').value=String(state.point.x);input(pointForm,'y').value=String(state.point.y);$('#wave-point-error').textContent='';refresh(false);};
 $<HTMLSelectElement>('#wave-mode').onchange=e=>{state.mode=(e.target as HTMLSelectElement).value as Mode;refresh();};
 $('#wave-play').onclick=()=>{state.playing=!state.playing;previous=null;refresh(false);};$('#wave-step').onclick=()=>{if(!state.playing){state.time+=PERIOD/40;refresh(state.mode!=='envelope');}};$('#wave-reset-time').onclick=()=>{state.time=0;state.playing=false;previous=null;refresh(state.mode!=='envelope');};
 $('#wave-default').onclick=()=>apply(defaults());$<HTMLSelectElement>('#wave-preset').onchange=e=>{const id=(e.target as HTMLSelectElement).value;if(id==='custom')return;apply({...state.settings,wavelength:2,distance:id==='cancel'?0:4,phase:id==='same'?0:180});};
 root.querySelectorAll<HTMLButtonElement>('[data-wave-symbol]').forEach(b=>{const select=()=>{state.selected=b.dataset.waveSymbol as SymbolId;refresh(false);};b.onclick=select;b.onfocus=select;b.onpointerenter=()=>{if(matchMedia('(hover:hover)').matches)select();};});$('#wave-clear').onclick=()=>{state.selected=null;refresh(false);};
 function lesson(i:number){state.mode=(['a','u','envelope','envelope'] as Mode[])[i];state.playing=false;previous=null;$('#wave-lesson-text').textContent=lessons[i][1];root.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));refresh();}
 root.querySelectorAll<HTMLButtonElement>('[data-lesson]').forEach(b=>b.onclick=()=>lesson(Number(b.dataset.lesson)));
 $('#wave-lesson-toggle').onclick=()=>{if(saved){state=saved;saved=null;grid=geometry(state.settings);$('#wave-lesson').hidden=true;$('#wave-lesson-toggle').textContent='4段階の教材を開く';previous=null;fill();refresh();}else{saved=structuredClone(state);$('#wave-lesson').hidden=false;$('#wave-lesson-toggle').textContent='教材を閉じて作品へ戻る';lesson(0);}};
 document.addEventListener('visibilitychange',()=>{previous=null;if(document.hidden){if(raf!==null)cancelAnimationFrame(raf);raf=null;}else schedule();},{signal:life.signal});motion.addEventListener('change',e=>{if(e.matches){state.playing=false;if(saved)saved.playing=false;previous=null;refresh(false);}},{signal:life.signal});
 fill();refresh();return()=>{disposed=true;if(raf!==null)cancelAnimationFrame(raf);life.abort();canvas.width=1;canvas.height=1;saved=null;root.replaceChildren();};
}
