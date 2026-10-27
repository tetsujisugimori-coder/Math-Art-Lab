import {escapeRadius,escapeSteps,screenToComplex,validateView,type Complex,type Plane,type PlaneView} from './twins';
export type RenderRequest={id:number;kind:Plane;c:Complex;iterations:number;view:PlaneView;width:number;height:number;aspect:number};
export type RenderResult={id:number;width:number;height:number;buffer:ArrayBuffer;elapsedMs:number};
export function validateRender(r:RenderRequest){
 validateView(r.view);
 if(!['mandelbrot','julia'].includes(r.kind)||!Number.isInteger(r.id)||!Number.isInteger(r.width)||!Number.isInteger(r.height)||r.width<1||r.height<1||r.width>640||r.height>640||!Number.isFinite(r.aspect)||r.aspect<.25||r.aspect>4||!Number.isInteger(r.iterations)||r.iterations<50||r.iterations>500||![r.c.re,r.c.im].every(v=>Number.isFinite(v)&&Math.abs(v)<=4))throw new RangeError('描画要求が範囲外です。');
}
/** Dark = unobserved; escaped pixels use a 32-iteration cyclic palette, independent of the budget. */
export function escapeColor(step:number):[number,number,number,number]{
 if(step<0)return[6,11,23,255];
 const phase=step/32*Math.PI*2;
 return[Math.round(140+100*Math.cos(phase+.7)),Math.round(155+95*Math.cos(phase-1.2)),Math.round(165+85*Math.cos(phase-2.7)),255];
}
export class LatestRenderGate{
 private revision=0;private disposed=false;pending=false;
 request(){if(this.disposed)throw new Error('描画は終了しています。');this.pending=true;return ++this.revision;}
 finish(id:number,commit:()=>void){if(this.disposed||!this.pending||id!==this.revision)return false;this.pending=false;commit();return true;}
 cancel(){this.revision++;this.pending=false;}
 dispose(){this.cancel();this.disposed=true;}
}
/** One current buffer and one scheduled callback per worker. Replacement is observed between slices. */
export function createRenderRunner(schedule:(callback:()=>void)=>void,publish:(result:RenderResult)=>void,now=()=>performance.now()){
 let current:{request:RenderRequest;pixels:Uint8ClampedArray|null;row:number;start:number}|null=null,scheduled=false;
 const palette=Array.from({length:501},(_,i)=>escapeColor(i)),dark=escapeColor(-1);
 function queue(){if(!scheduled&&current){scheduled=true;schedule(slice);}}
 function slice(){
  scheduled=false;const job=current;if(!job)return;
  const r=job.request,radius=escapeRadius(r.kind,r.c),sliceStart=now();
  if(!job.pixels){job.pixels=new Uint8ClampedArray(r.width*r.height*4);job.start=now();}
  do{
   const row=job.row;
   for(let x=0;x<r.width;x++){
    const point=screenToComplex(r.view,(x+.5)/r.width,(row+.5)/r.height,r.aspect);
    const step=escapeSteps(r.kind==='mandelbrot'?{re:0,im:0}:point,r.kind==='mandelbrot'?point:r.c,r.iterations,radius);
    job.pixels.set(step<0?dark:palette[step],(row*r.width+x)*4);
   }
   job.row++;
  }while(job.row<r.height&&now()-sliceStart<8);
  if(current!==job)return;
  if(job.row===r.height){current=null;publish({id:r.id,width:r.width,height:r.height,buffer:job.pixels.buffer as ArrayBuffer,elapsedMs:now()-job.start});}
  else queue();
 }
 return{start(request:RenderRequest){validateRender(request);current={request,pixels:null,row:0,start:0};queue();},cancel(){current=null;}};
}
