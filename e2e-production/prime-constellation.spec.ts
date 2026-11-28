import { expect, test } from '@playwright/test';

test('021 built Pages artifact remains drawable when 002 cannot initialize WebGL', async ({page})=>{
  await page.setViewportSize({width:375,height:840});
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  await page.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(...args:unknown[]){
      if(['webgl','webgl2','experimental-webgl'].includes(String(args[0])))return null;
      return Reflect.apply(original,this,args);
    } as typeof original;
  });
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('./');
  await expect(page.getByRole('alert')).toContainText(/WebGL/i);
  const picker=page.locator('#experiment');
  await expect(picker.locator('option')).toHaveCount(20);
  await picker.selectOption('prime-constellation');
  const root=page.locator('[data-prime-atlas]');
  await expect(root).toHaveAttribute('data-state','finished');
  await expect(root).toHaveAttribute('data-painted','1229');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const art=page.locator('#prime-art');
  const pixels=await art.evaluate(el=>{
    const c=el as HTMLCanvasElement;
    const p=c.getContext('2d')!.getImageData(0,0,c.width,c.height).data;
    let bright=0;
    for(let i=0;i<p.length;i+=4)if(p[i]>150&&p[i+1]>150&&p[i+2]>150)bright++;
    return bright;
  });expect(pixels).toBeGreaterThan(100);
  await picker.selectOption('apollonian-bloom');await expect(page.locator('[data-bloom]')).toBeVisible();
  expect(errors).toEqual([]);
});
