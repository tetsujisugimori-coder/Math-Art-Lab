import {knotGuides,type KnotGuide,type KnotSettings} from './knot';

/** Current MathML coefficients come directly from the validated geometry settings. */
export function createKnotInspector(root:HTMLElement,onSelect:(id:KnotGuide)=>void){
 const mathNS='http://www.w3.org/1998/Math/MathML';
 const formulas=document.createElement('div');root.append(formulas);
 const cards=knotGuides.map(guide=>{
  const card=document.createElement('div');card.className='formula';card.dataset.knotGuide=guide.id;
  const title=document.createElement('strong');title.textContent=guide.title;
  const button=document.createElement('button');button.textContent='図で見る';button.setAttribute('aria-label',`${guide.title}：図で見る`);button.setAttribute('aria-pressed','false');button.onclick=()=>onSelect(guide.id);
  card.append(title,button);root.append(card);return{guide,card,button};
 });
 return{
  sync(s:KnotSettings){
   formulas.replaceChildren();
   function node(tag:string,text?:string){const el=document.createElementNS(mathNS,tag);if(text)el.textContent=text;return el;}
   function token(tag:string,text:string){return node(tag,text);}
   function coefficient(key:keyof KnotSettings){const el=token('mn',String(s[key]));el.setAttribute('data-knot-coefficient',key);el.classList.add('current-value');return el;}
   function rotation(fn:string,key:'p'|'q'){
    const row=node('mrow');row.setAttribute('data-knot-term',key==='p'?'major':'minor');row.append(token('mi',fn),token('mo','('),coefficient(key),token('mo','×'),token('mi','t'),token('mo',')'));return row;
   }
   for(const axis of ['x','y','z']){
    const scroll=document.createElement('div');scroll.className='math-scroll';scroll.tabIndex=0;scroll.role='region';scroll.setAttribute('aria-label',`${axis}(t)の現在の数式。横にスクロールできます`);
    const math=node('math');math.setAttribute('display','block');const row=node('mrow');row.append(token('mi',axis),token('mo','('),token('mi','t'),token('mo',')'),token('mo','='));
    if(axis==='z')row.append(coefficient('r'),token('mo','×'),rotation('sin','q'));
    else row.append(token('mo','('),coefficient('R'),token('mo','+'),coefficient('r'),token('mo','×'),rotation('cos','q'),token('mo',')'),token('mo','×'),rotation(axis==='x'?'cos':'sin','p'));
    math.append(row);scroll.append(math);formulas.append(scroll);
   }
  },
  select(id:KnotGuide|null){
   cards.forEach(({guide,card,button})=>{const active=guide.id===id;card.classList.toggle('is-selected',active);button.setAttribute('aria-pressed',String(active));button.textContent=active?'解説を解除':'図で見る';button.setAttribute('aria-label',`${guide.title}：${button.textContent}`);});
   root.querySelectorAll('[data-knot-coefficient],[data-knot-term]').forEach(el=>el.classList.toggle('knot-selected',el.getAttribute('data-knot-coefficient')===id||el.getAttribute('data-knot-term')===id));
  },
  button(id:KnotGuide|null){return cards.find(c=>c.guide.id===id)?.button;},
 };
}
