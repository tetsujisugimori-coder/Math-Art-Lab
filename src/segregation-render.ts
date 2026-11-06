import {neighborIndices,type City,type Sample} from './segregation';
export const tileColors=['#162333','#ed897b','#75bed7'];
export type PaintOptions={patterns:boolean;marks:boolean;selected:number|null;cursor:number;scale:number};
/** Pure projection of state: no model updates, RNG, or wall clock. */
export function drawCity(canvas:HTMLCanvasElement,city:City,cells:readonly number[],options:PaintOptions):boolean{
  const box=canvas.parentElement!.getBoundingClientRect(),width=box.width*options.scale;
  if(width<=0)return false;
  const dpr=Math.min(devicePixelRatio||1,2),pixels=Math.round(width*dpr);
  canvas.style.width=`${width}px`;canvas.style.height=`${width}px`;
  if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels;}
  const ctx=canvas.getContext('2d');if(!ctx)return false;
  ctx.setTransform(pixels/width,0,0,pixels/width,0,0);ctx.fillStyle='#0b1320';ctx.fillRect(0,0,width,width);
  const unit=width/city.config.size,gap=Math.min(1.6,unit*0.13);
  for(let p=0;p<cells.length;p++){
    const color=city.colors[cells[p]],x=(p%city.config.size)*unit,y=Math.floor(p/city.config.size)*unit;
    ctx.fillStyle=tileColors[color];ctx.fillRect(x+gap/2,y+gap/2,unit-gap,unit-gap);
    if(options.patterns&&color){ctx.strokeStyle='#142236';ctx.fillStyle='#142236';ctx.lineWidth=Math.max(1,unit*0.06);
      if(color===1){ctx.beginPath();ctx.arc(x+unit/2,y+unit/2,unit*0.115,0,Math.PI*2);ctx.fill();}
      else {ctx.beginPath();ctx.moveTo(x+unit*0.3,y+unit*0.7);ctx.lineTo(x+unit*0.7,y+unit*0.3);ctx.stroke();}
    }
  }
  const outline=(p:number,color:string,dash=false)=>{ctx.strokeStyle=color;ctx.lineWidth=Math.max(1.4,unit*0.09);ctx.setLineDash(dash?[3,2]:[]);ctx.strokeRect((p%city.config.size)*unit+2,Math.floor(p/city.config.size)*unit+2,unit-4,unit-4);ctx.setLineDash([]);};
  if(options.marks&&city.last&&cells===city.cells){outline(city.last.from,'#f5d693',true);outline(city.last.to,'#f5d693');}
  const selected=options.selected===null?-1:cells.indexOf(options.selected);
  if(selected>=0){for(const p of neighborIndices(city.config.size,selected))outline(p,'#d7e3f0');outline(selected,'#fff');}
  if(options.cursor>=0)outline(options.cursor,'#fff',true);
  canvas.dataset.paintedStep=String(cells===city.cells?city.step:0);return true;
}
/** Null data split the line; no interpolation or smoothing. */
export function seriesPath(history:Sample[],key:'satisfaction'|'adjacency',width:number):string{
  const first=history[0]?.step??0,last=history.at(-1)?.step??0,span=Math.max(1,last-first);let open=false,path='';
  for(const s of history){const value=s[key];if(value===null){open=false;continue;}const x=44+(s.step-first)/span*(width-60),y=18+(1-value)*142;path+=`${open?'L':'M'}${x.toFixed(2)},${y.toFixed(2)} `;open=true;}return path.trim();
}
