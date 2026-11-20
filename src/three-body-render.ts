import {acceleration,invariants,type Phase,type Config,type Vec} from './three-body';
import {displayHistory,lastSample,type History} from './three-body-state';
export type Camera={x:number;y:number;span:number;follow:boolean};
export type Layers={trails:boolean;center:boolean;velocity:boolean;acceleration:boolean;axes:boolean;bodies:boolean;glow:boolean;length:number;opacity:number};
export const colors=['#75ddf5','#ffbf79','#c8a5ff'];
/** Select committed samples, including both endpoints. Never invent coordinates. */
export function displaySamples<T>(points:T[],limit=1000):T[]{
  if(!Number.isInteger(limit)||limit<2)throw Error('Display limit must be at least 2');
  if(points.length<=limit)return points;
  return Array.from({length:limit},(_,i)=>points[Math.round(i*(points.length-1)/(limit-1))]);
}
export function viewCenter(p:Phase,c:Config,camera:Camera):Vec{const r=camera.follow?invariants(p.bodies,c).R:{x:0,y:0};return {x:camera.x+r.x,y:camera.y+r.y};}
export function screenPoint(p:Vec,center:Vec,span:number,w:number,h:number){const scale=Math.min(w,h)/span;return {x:w/2+(p.x-center.x)*scale,y:h/2-(p.y-center.y)*scale};}
export function worldPoint(x:number,y:number,center:Vec,span:number,w:number,h:number){const scale=Math.min(w,h)/span;return {x:center.x+(x-w/2)/scale,y:center.y-(y-h/2)/scale};}
export function drawOrbit(canvas:HTMLCanvasElement,p:Phase,c:Config,trail:History,camera:Camera,layers:Layers,selected:number,symbol:string,other?:History,centerOverride?:Vec):void{
  const rect=canvas.getBoundingClientRect(),w=rect.width,h=rect.height;if(w<=0||h<=0)return;
  const ratio=Math.min(devicePixelRatio||1,2),cw=Math.round(w*ratio),ch=Math.round(h*ratio);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
  // Linux WebKit DPR2 default context misrasterized coordinates in repeated
  // app controls; the readback-oriented path matched committed positions.
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return;const ctx:CanvasRenderingContext2D=context;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.setLineDash([]);ctx.globalAlpha=1;ctx.shadowBlur=0;ctx.clearRect(0,0,w,h);ctx.fillStyle='#070c19';ctx.fillRect(0,0,w,h);
  const center=centerOverride??viewCenter(p,c,camera),point=(v:Vec)=>screenPoint(v,center,camera.span,w,h),scale=Math.min(w,h)/camera.span;
  if(layers.axes){
    const raw=camera.span/5,power=10**Math.floor(Math.log10(raw)),tick=[1,2,5,10].find(n=>n*power>=raw)!*power;
    ctx.strokeStyle='#24334c';ctx.fillStyle='#b6c6df';ctx.lineWidth=1;ctx.font='11px system-ui';
    const left=center.x-w/(2*scale),right=center.x+w/(2*scale),bottom=center.y-h/(2*scale),top=center.y+h/(2*scale);
    for(let x=Math.ceil(left/tick)*tick;x<=right;x+=tick){const q=point({x,y:0});ctx.beginPath();ctx.moveTo(q.x,0);ctx.lineTo(q.x,h);ctx.stroke();ctx.fillText(Number(x.toPrecision(4)).toString(),Math.max(2,Math.min(w-40,q.x+3)),h-8);}
    for(let y=Math.ceil(bottom/tick)*tick;y<=top;y+=tick){const q=point({x:0,y});ctx.beginPath();ctx.moveTo(0,q.y);ctx.lineTo(w,q.y);ctx.stroke();ctx.fillText(Number(y.toPrecision(4)).toString(),4,Math.max(12,Math.min(h-24,q.y-3)));}
    ctx.fillText('x → / y ↑',w-75,16);
  }
  function path(history:History,dashed:boolean){const points=displayHistory(history,layers.length);ctx.globalAlpha=layers.opacity;ctx.lineWidth=dashed?1.1:1.7;ctx.setLineDash(dashed?[5,5]:[]);
    for(let i=0;i<3;i++){ctx.strokeStyle=colors[i];ctx.beginPath();points.forEach((s,j)=>{const q=point(s.positions[i]);if(j===0)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);});ctx.stroke();}ctx.setLineDash([]);ctx.globalAlpha=1;
  }
  if(layers.trails){path(trail,false);if(other)path(other,true);}
  const a=acceleration(p.bodies,c);
  function arrow(from:Vec,v:Vec,color:string,multiplier:number){const q=point(from),end={x:q.x+v.x*scale*multiplier,y:q.y-v.y*scale*multiplier},angle=Math.atan2(end.y-q.y,end.x-q.x);ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(end.x,end.y);ctx.lineTo(end.x-7*Math.cos(angle-.4),end.y-7*Math.sin(angle-.4));ctx.moveTo(end.x,end.y);ctx.lineTo(end.x-7*Math.cos(angle+.4),end.y-7*Math.sin(angle+.4));ctx.stroke();}
  p.bodies.forEach((b,i)=>{
    const q=point(b);if(layers.velocity||symbol==='v')arrow(b,{x:b.vx,y:b.vy},'#8ae7c1',.25);if(layers.acceleration||symbol==='a'||symbol==='Σ'||symbol==='G')arrow(b,a[i],'#ff8f9d',.15);
    if(layers.bodies){ctx.fillStyle=colors[i];ctx.strokeStyle=i===selected?'#ffffff':colors[i];ctx.lineWidth=i===selected?3:1;ctx.shadowColor=colors[i];ctx.shadowBlur=layers.glow?15:0;ctx.beginPath();if(i===0)ctx.arc(q.x,q.y,7,0,Math.PI*2);if(i===1)ctx.rect(q.x-6,q.y-6,12,12);if(i===2){ctx.moveTo(q.x,q.y-8);ctx.lineTo(q.x+8,q.y+6);ctx.lineTo(q.x-8,q.y+6);ctx.closePath();}ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';ctx.textAlign='left';ctx.fillText(String(i+1),Math.max(3,Math.min(w-15,q.x+12)),Math.max(16,Math.min(h-12,q.y-10)));}
  });
  if(other&&layers.bodies){const last=lastSample(other);last?.positions.forEach((b,i)=>{const q=point(b);ctx.strokeStyle=colors[i];ctx.fillStyle=colors[i];ctx.setLineDash([3,3]);ctx.lineWidth=2;ctx.beginPath();if(i===0)ctx.arc(q.x,q.y,10,0,Math.PI*2);if(i===1)ctx.rect(q.x-9,q.y-9,18,18);if(i===2){ctx.moveTo(q.x,q.y-11);ctx.lineTo(q.x+11,q.y+9);ctx.lineTo(q.x-11,q.y+9);ctx.closePath();}ctx.stroke();ctx.setLineDash([]);ctx.font='11px system-ui';ctx.fillText(`${i+1}B`,Math.max(3,Math.min(w-24,q.x+12)),Math.max(16,Math.min(h-12,q.y+16)));});}
  if(layers.center){const q=point(invariants(p.bodies,c).R);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(q.x-7,q.y);ctx.lineTo(q.x+7,q.y);ctx.moveTo(q.x,q.y-7);ctx.lineTo(q.x,q.y+7);ctx.stroke();ctx.fillStyle='#fff';ctx.font='12px system-ui';ctx.fillText('R',q.x+8,q.y+15);}
  canvas.dataset.paintedStep=String(p.steps);canvas.dataset.positions=JSON.stringify(p.bodies.map(({x,y})=>({x,y})));canvas.dataset.span=String(camera.span);
}
/** Linear D(t), actual model time on x. No smoothing. */
export function graphPath(data:{t:number;D:number}[]){const max=Math.max(...data.map(d=>d.D),1e-15),first=data[0]?.t??0,last=data.at(-1)?.t??first;return {max,first,last,path:data.map((d,i)=>`${i?'L':'M'}${40+520*(d.t-first)/(last-first||1)},${150-120*d.D/max}`).join(' ')};}
