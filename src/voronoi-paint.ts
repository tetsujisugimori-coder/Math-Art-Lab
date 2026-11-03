export type PaintResult={status:'submitted';size:number;dpr:number}|{status:'unavailable'|'zero-size'|'context-lost'|'failed';reason?:string};
/** A successful result means Canvas commands returned; it says nothing about GPU presentation. */
export function submitCanvas(
 canvas:HTMLCanvasElement,context:CanvasRenderingContext2D|null,dpr:number,
 paint:(context:CanvasRenderingContext2D,size:number,dpr:number)=>void
):PaintResult{
 if(!context)return {status:'unavailable'};
 try{
  const rect=canvas.getBoundingClientRect();
  if(!Number.isFinite(rect.width)||!Number.isFinite(rect.height)||rect.width<=0||rect.height<=0)return {status:'zero-size'};
  if(context.isContextLost?.())return {status:'context-lost'};
  if(!Number.isFinite(dpr)||dpr<=0)throw new Error('描画倍率が不正です。');
  const pixels=Math.max(1,Math.round(rect.width*dpr));
  if(canvas.width!==pixels||canvas.height!==pixels)canvas.width=canvas.height=pixels;
  paint(context,rect.width,dpr);
  // A loss during command submission must not be called a successful paint either.
  if(context.isContextLost?.())return {status:'context-lost'};
  return {status:'submitted',size:rect.width,dpr};
 }catch(error){return {status:'failed',reason:error instanceof Error?error.message:'Canvas描画を実行できません。'};}
}
