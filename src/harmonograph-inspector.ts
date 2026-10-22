import {renderMath} from './inspector';
import type {MathNode} from './structures';
import {axes,type Axis,type Oscillator,type Trajectory} from './harmonograph';

const token=(tag:'mi'|'mn'|'mo',text:string):MathNode=>({tag,children:[text]});
/** Numeric MathML is derived from the very same resolved terms used by sampling. */
export function axisExpression(axis:Axis,terms:readonly Oscillator[]):MathNode{
 const number=(n:number)=>token('mn',String(n));
 const children:MathNode[]=[token('mi',axis),token('mo','('),token('mi','t'),token('mo',')'),token('mo','=')];
 terms.forEach((o,i)=>{if(i)children.push(token('mo','+'));children.push(number(o.amplitude),token('mo','×'),token('mi','exp'),token('mo','('),number(-o.decay),token('mi','t'),token('mo',')'),token('mo','×'),token('mi','sin'),token('mo','('),number(o.frequency),token('mi','t'),token('mo','+'),number(o.phase),token('mo',')'));});
 return{tag:'mrow',children};
}
export function createHarmonographInspector(root:HTMLElement,onSelect:(axis:Axis)=>void){
 root.innerHTML=`<p>各座標は2つの揺れ A exp(−dt) sin(ft+p) の和です。係数は描画に渡す値そのものです。</p><p>振幅 A：揺れの大きさ。周波数 f：揺れの速さ（角周波数、rad/s。通常の周波数Hzはf/2π）。位相 p：揺れ始める位置のずれ（rad）。減衰 d：時間とともに揺れが小さくなる度合い（1/s）。tは作品内の秒です。</p><div class="harm-formulas"></div><p>減衰・周波数のずれ・3次元の組合せを含みます。整数比だけで閉曲線になるとは限りません。表示は有限個の標本点を結んだ折れ線です。</p><p id="harm-sampling"></p>`;
 const regions:HTMLElement[]=[];
 const observer=new ResizeObserver(()=>{for(const el of regions)el.tabIndex=el.clientWidth>0&&el.scrollWidth>el.clientWidth?0:-1;});
 const cards=axes.map(axis=>{
  const card=document.createElement('div');card.className='formula';card.dataset.axis=axis;
  const title=document.createElement('h3');title.textContent=`${axis}(t) の揺れ`;
  const scroll=document.createElement('div');scroll.className='math-scroll';scroll.role='region';scroll.setAttribute('aria-label',`${axis}(t) の現在の数式`);scroll.tabIndex=-1;
  const math=document.createElementNS('http://www.w3.org/1998/Math/MathML','math');math.setAttribute('display','block');scroll.append(math);
  const button=document.createElement('button');button.textContent='図で見る';button.setAttribute('aria-label',`${axis}(t)：図で見る`);button.setAttribute('aria-pressed','false');button.onclick=()=>onSelect(axis);
  const jump=document.createElement('button');jump.textContent='図形を確認';jump.hidden=true;jump.onclick=()=>{const stage=document.getElementById('harm-stage')!;stage.scrollIntoView({block:'start',behavior:'instant'});stage.focus({preventScroll:true});};
  card.append(title,scroll,button,jump);root.querySelector('.harm-formulas')!.append(card);regions.push(scroll);observer.observe(scroll);observer.observe(math);
  return{axis,card,math,button,jump};
 });
 return{
  sync(trajectory:Trajectory){for(const card of cards)card.math.replaceChildren(renderMath(axisExpression(card.axis,trajectory.terms[card.axis])));root.querySelector('#harm-sampling')!.textContent=`0 ≤ t ≤ ${trajectory.duration} s ／ ${trajectory.count.toLocaleString('ja-JP')} 点。再生速度はこの数式や標本点を変更しません。`;},
  select(axis:Axis|null){for(const card of cards){const active=card.axis===axis;card.card.classList.toggle('is-selected',active);card.button.setAttribute('aria-pressed',String(active));card.button.textContent=active?'解説を解除':'図で見る';card.button.setAttribute('aria-label',`${card.axis}(t)：${card.button.textContent}`);card.jump.hidden=!active;}},
  selectedButton(){return cards.find(c=>c.card.classList.contains('is-selected'))?.button;},
  dispose(){observer.disconnect();},
 };
}
