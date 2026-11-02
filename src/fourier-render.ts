import {chain,STEPS,type Model,type Point} from './fourier';
export type Scene={model:Model;k:number;step:number;path:Point[];original:boolean;circles:boolean;selected:number|null;symbol:string};
export const palettes={dark:{background:'#080f20',reference:'#8b9bb2',arm:'#6cb8f0',trace:'#f5c862',tip:'#ffffff',selected:'#ffffff',axis:'#253852'},light:{background:'#f6f8fc',reference:'#64748b',arm:'#2366a0',trace:'#966000',tip:'#152238',selected:'#142f63',axis:'#d6dfec'}};
export function screen(p:Point,size:number,extent:number):Point{return {x:size/2+p.x*size/(2*extent),y:size/2-p.y*size/(2*extent)};}

/** Returns the same geometry used for Canvas commands (also useful for rendering audits). */
export function drawFourier(ctx:CanvasRenderingContext2D,scene:Scene,size:number,dpr:number,light:boolean){
 const {model,k,step,path,original,circles,selected,symbol}=scene,p=light?palettes.light:palettes.dark;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=p.background;ctx.fillRect(0,0,size,size);
 const map=(v:Point)=>screen(v,size,model.extent),scale=size/(2*model.extent);
 const line=(a:Point,b:Point,color:string,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
 const polyline=(points:Point[],color:string,width:number,closed=false)=>{if(!points.length)return;ctx.beginPath();points.forEach((v,i)=>{const q=map(v);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});if(closed)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
 line({x:size/2,y:16},{x:size/2,y:size-16},p.axis);line({x:16,y:size/2},{x:size-16,y:size/2},p.axis);
 if(original){ctx.setLineDash([4,5]);polyline(model.samples,p.reference,1.2,true);ctx.setLineDash([]);}
 const arms=chain(model,k,step/STEPS);
 if(circles){for(const [i,arm] of arms.entries()){
  const a=map(arm.start),b=map(arm.end),highlight=selected===i,color=highlight?p.selected:p.arm;
  // Tiny circles remain in K and all sums; only subpixel arcs are omitted visually.
  if(arm.term.radius*scale>=.25){ctx.beginPath();ctx.arc(a.x,a.y,arm.term.radius*scale,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=highlight?2:0.8;ctx.stroke();}
  line(a,b,color,highlight?2.8:1.1);
  if(highlight){ctx.fillStyle=color;ctx.font='bold 12px system-ui';ctx.fillText(`#${i+1}`,a.x+5,a.y-7);ctx.fillRect(b.x-3,b.y-3,6,6);}
 }}
 polyline(path.slice(0,step+1),p.trace,2);
 const tip=map(path[step]),center=map(model.center);ctx.fillStyle=p.arm;ctx.fillRect(center.x-2,center.y-2,4,4);
 if(symbol==='center'){ctx.strokeStyle=p.selected;ctx.lineWidth=2;ctx.strokeRect(center.x-6,center.y-6,12,12);}
 if(symbol==='sum'){ctx.setLineDash([3,3]);line(center,tip,p.selected,1.5);ctx.setLineDash([]);}
 ctx.beginPath();ctx.arc(tip.x,tip.y,4,0,Math.PI*2);ctx.fillStyle=p.tip;ctx.fill();ctx.strokeStyle=p.trace;ctx.lineWidth=1.5;ctx.stroke();
 return {arms,tip,center,extent:model.extent,pointCount:step+1};
}
