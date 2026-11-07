import {neighbors,type Strategy,type World} from './cooperation';
export const colors=['#ed897b','#75bed7'];
export function drawLattice(canvas:HTMLCanvasElement,w:World,selected:number|null,cells:readonly Strategy[]=w.cells):void{
  const width=canvas.parentElement!.clientWidth;if(!width)return;
  const pixels=Math.round(width*Math.min(devicePixelRatio||1,3));
  if(canvas.width!==pixels||canvas.height!==pixels){canvas.width=pixels;canvas.height=pixels;}
  const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(1,0,0,1,0,0);const unit=pixels/w.config.size;
  cells.forEach((s,i)=>{const x=i%w.config.size*unit,y=Math.floor(i/w.config.size)*unit;ctx.fillStyle=colors[s];ctx.fillRect(x,y,unit+.5,unit+.5);ctx.strokeStyle='#142236';ctx.fillStyle='#142236';ctx.lineWidth=Math.max(1,unit*.07);ctx.beginPath();if(s){ctx.moveTo(x+unit*.3,y+unit*.7);ctx.lineTo(x+unit*.7,y+unit*.3);ctx.stroke();}else{ctx.arc(x+unit*.5,y+unit*.5,unit*.1,0,Math.PI*2);ctx.fill();}});
  if(selected!==null){for(const i of [...neighbors(w.config,selected),selected]){ctx.strokeStyle=i===selected?'#fff':'#142236';ctx.lineWidth=Math.max(1,unit*.09);ctx.strokeRect(i%w.config.size*unit+1,Math.floor(i/w.config.size)*unit+1,unit-2,unit-2);}}
  canvas.dataset.paintedGeneration=String(cells===w.cells?w.generation:0);
}
export function historyPath(w:World,width=600):string{
  const first=w.history[0].generation,span=Math.max(1,w.generation-first);
  return w.history.map((m,i)=>`${i?'L':'M'}${40+(m.generation-first)/span*(width-60)},${20+(1-m.rate)*140}`).join(' ');
}
