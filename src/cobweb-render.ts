import {equilibrium,tracePoint,type Market,type MarketPoint,type MarketStep} from './cobweb';

export function renderMarket(svg:SVGSVGElement,m:Market,point:MarketPoint,history:MarketStep[],limit:number,width:number){
  const w=Math.max(260,Math.round(width)),h=w<460?330:480;
  const left=46,right=w-22,top=34,bottom=h-42;
  const x=(q:number)=>left+q/m.a*(right-left),y=(p:number)=>bottom-p/(m.a/m.b)*(bottom-top);
  const path=(a:MarketPoint,b:MarketPoint)=>`M${x(a.quantity)} ${y(a.price)}L${x(b.quantity)} ${y(b.price)}`;
  const e=equilibrium(m),n=w<460?3:5;
  const ticks=Array.from({length:n+1},(_,i)=>{
    const q=m.a*i/n,p=m.a/m.b*i/n;
    return `<path class="cw-grid" d="M${x(q)} ${top}V${bottom}M${left} ${y(p)}H${right}"/><text class="cw-tick" x="${x(q)}" y="${bottom+20}" text-anchor="middle">${Number(q.toFixed(1))}</text><text class="cw-tick" x="${left-8}" y="${y(p)+4}" text-anchor="end">${Number(p.toFixed(1))}</text>`;
  }).join('');
  const supplyEnd={quantity:Math.min(m.a,m.d*m.a/m.b),price:Math.min(m.a/m.b,m.a/m.d)};
  const visible=history.slice(-limit);
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.innerHTML=`<title>需要と供給の蜘蛛の巣</title><desc>横軸は数量Q、縦軸は価格P。実線Dは需要、破線Sは供給、菱形Eは均衡。水平に次期供給を決め、垂直に次期価格を決めます。数値と工程は直後の本文にも表示します。</desc>
    <defs><filter id="cw-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2"/></filter><clipPath id="cw-clip"><rect x="${left-2}" y="${top-2}" width="${right-left+4}" height="${bottom-top+4}"/></clipPath><marker id="cw-arrow" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="currentColor"/></marker></defs>
    <g>${ticks}<path class="cw-axis" d="M${left} ${top}V${bottom}H${right}"/><text x="${left}" y="18">価格 P</text><text x="${right}" y="${h-4}" text-anchor="end">数量 Q</text></g>
    <g clip-path="url(#cw-clip)"><path class="cw-demand cw-curve" d="${path({quantity:0,price:m.a/m.b},{quantity:m.a,price:0})}"/><path class="cw-supply cw-curve" d="${path({quantity:0,price:0},supplyEnd)}"/>
    <path class="cw-equilibrium-guide" d="M${left} ${y(e.price)}H${x(e.quantity)}V${bottom}"/>
    <g class="cw-history">${visible.map((s,i)=>`<path data-period="${s.period}" data-from-price="${s.from.price}" data-to-price="${s.to.price}" data-quantity="${s.to.quantity}" style="opacity:${0.12+0.65*(i+1)/visible.length}" d="${path(s.from,s.supply)}L${x(s.to.quantity)} ${y(s.to.price)}"/>`).join('')}</g>
    <path class="cw-thread-glow" id="cw-active-glow"/><path class="cw-thread" id="cw-active-thread" marker-end="url(#cw-arrow)"/>
    <g class="cw-equilibrium" transform="translate(${x(e.quantity)} ${y(e.price)})"><circle class="cw-core" r="15"/><path d="M0 -6L6 0L0 6L-6 0Z"/></g>
    <circle class="cw-market-point" cx="${x(point.quantity)}" cy="${y(point.price)}" r="4"/>
    <circle id="cw-cursor-halo" class="cw-cursor-halo" r="9"/><circle id="cw-cursor" class="cw-cursor" r="4"/></g>
    <text class="cw-demand-label" x="${x(m.a*.17)+8}" y="${y(m.a/m.b*.83)-8}">D 需要</text>
    <text class="cw-supply-label" x="${x(supplyEnd.quantity*.8)+8}" y="${y(supplyEnd.price*.8)+18}">S 供給</text>
    <text class="cw-equilibrium-label" x="${x(e.quantity)+10}" y="${y(e.price)-12}">E</text>`;
  const thread=svg.querySelector<SVGPathElement>('#cw-active-thread')!,glow=svg.querySelector<SVGPathElement>('#cw-active-glow')!;
  const cursor=svg.querySelector<SVGCircleElement>('#cw-cursor')!,halo=svg.querySelector<SVGCircleElement>('#cw-cursor-halo')!;
  return (step:MarketStep,progress:number)=>{
    const p=tracePoint(step,progress);
    const d=progress===0?'':progress<=0.5?path(step.from,p):`${path(step.from,step.supply)}L${x(p.quantity)} ${y(p.price)}`;
    thread.setAttribute('d',d);glow.setAttribute('d',d);
    for(const el of [cursor,halo]){el.setAttribute('cx',String(x(p.quantity)));el.setAttribute('cy',String(y(p.price)));}
  };
}
