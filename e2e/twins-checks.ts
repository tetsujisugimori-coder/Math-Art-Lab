import {expect,type Page} from '@playwright/test';
import {rasterSize} from '../src/twins';
export const mstage='#twins-mandelbrot-stage',jstage='#twins-julia-stage';
// Wait for the rendered bitmap to match the *current* DOM size, not a target
// captured before ResizeObserver has processed a viewport/style change.
export async function twinsReady(page:Page){
 for(const id of [mstage,jstage]){
  await expect.poll(async()=>{
   const snapshot=await page.locator(id).evaluate(stage=>{
    const canvas=stage.querySelector('canvas')!;
    const bounds=canvas.getBoundingClientRect();
    return {status:stage.dataset.status,target:stage.dataset.target,render:stage.dataset.render,
     cssWidth:bounds.width,cssHeight:bounds.height,canvasWidth:canvas.width,canvasHeight:canvas.height,
     dpr:window.devicePixelRatio};
   });
   if(snapshot.status!=='ready'||!snapshot.target||snapshot.render!==snapshot.target||
      snapshot.cssWidth<=0||snapshot.cssHeight<=0)return false;
   const expected=rasterSize(snapshot.cssWidth,snapshot.cssHeight,snapshot.dpr);
   const target=JSON.parse(snapshot.target) as {width:number;height:number;aspect:number};
   return target.width===expected.width&&target.height===expected.height&&
     snapshot.canvasWidth===expected.width&&snapshot.canvasHeight===expected.height&&
     Math.abs(target.aspect-snapshot.cssWidth/snapshot.cssHeight)<1e-10;
  },{timeout:20000}).toBe(true);
 }
}
export async function twinsPixel(page:Page,stage:string,u:number,v:number){return page.locator(`${stage} canvas`).evaluate((element,point)=>{const canvas=element as HTMLCanvasElement;return Array.from(canvas.getContext('2d')!.getImageData(Math.min(canvas.width-1,Math.floor(point.u*canvas.width)),Math.min(canvas.height-1,Math.floor(point.v*canvas.height)),1,1).data);},{u,v});}
export async function twinsApply(page:Page,re:string,im:string,n='200'){await page.locator('#twins-real').fill(re);await page.locator('#twins-imaginary').fill(im);await page.locator('#twins-iterations').fill(n);await page.locator('#twins-form button').click();await twinsReady(page);}
export async function assertCirclePixels(page:Page){
 const dark=[6,11,23,255];
 // Default ranges: M center=-.5, width=3.6; J center=0, width=3.6.
 await expect.poll(()=>twinsPixel(page,mstage,.5+.5/3.6,.5)).toEqual(dark); // c≈0, safely in the fixed orbit's neighborhood.
 expect(await twinsPixel(page,mstage,.5+1.5/3.6,.5)).not.toEqual(dark); // c≈1 escapes.
 expect(await twinsPixel(page,jstage,.5+.5/3.6,.5)).toEqual(dark); // |z₀|≈.5 <1.
 expect(await twinsPixel(page,jstage,.5+1.5/3.6,.5)).not.toEqual(dark); // |z₀|≈1.5 >1.
}
