import {expect,type Page} from '@playwright/test';
export const mstage='#twins-mandelbrot-stage',jstage='#twins-julia-stage';
export async function twinsReady(page:Page){for(const id of [mstage,jstage]){await expect(page.locator(id)).toHaveAttribute('data-status','ready',{timeout:20000});const target=await page.locator(id).getAttribute('data-target');await expect(page.locator(id)).toHaveAttribute('data-render',target!);}}
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
