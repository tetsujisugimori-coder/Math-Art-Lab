import {test,expect} from '@playwright/test';
test('regression: displayed default resident can make a selected judgement',async({page})=>{
  await page.goto('./');await page.locator('#experiment').selectOption('segregation');await page.locator('#sm-seed').fill('1');await page.locator('#sm-threshold').fill('100');await page.locator('#sm-settings button[type=submit]').click();
  await expect(page.locator('#sm-selection')).toContainText('住民ID');await expect(page.locator('#sm-selected-step')).toBeEnabled();await page.locator('#sm-selected-step').click();await expect(page.locator('#sm-step-count')).toHaveText('1');
});
test('regression: lesson restores each series visibility',async({page})=>{
  await page.goto('./');await page.locator('#experiment').selectOption('segregation');await page.locator('#sm-show-satisfaction').uncheck();await page.locator('#sm-lesson-toggle').click();await page.locator('[data-sm-lesson="3"]').click();await page.locator('#sm-show-satisfaction').check();await page.keyboard.press('Escape');
  await expect(page.locator('#sm-show-satisfaction')).not.toBeChecked();await expect(page.locator('#sm-line-satisfaction')).toBeHidden();
});

for(const theme of ['light','dark'] as const)test(`regression: native select raster contrast ${theme}`,async({page})=>{
  await page.emulateMedia({colorScheme:theme});await page.goto('./');await page.locator('#experiment').selectOption('segregation');
  for(const selector of ['#experiment','#sm-preset','#sm-rule','#sm-size','#sm-zoom','#sm-baseline-choice']){
    const select=page.locator(selector),png=await select.screenshot({scale:'css'});
    const foreground=await select.evaluate(el=>getComputedStyle(el).color.match(/[\d.]+/g)!.slice(0,3).map(Number));
    expect(await select.evaluate(el=>getComputedStyle(el).backgroundImage),'selection arrow remains visible').not.toBe('none');
    const background=await page.evaluate(async encoded=>{const img=new Image();img.src='data:image/png;base64,'+encoded;await img.decode();const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);return Array.from(ctx.getImageData(12,8,1,1).data).slice(0,3);},png.toString('base64'));
    const luminance=(rgb:number[])=>rgb.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const a=luminance(foreground),b=luminance(background);expect((Math.max(a,b)+.05)/(Math.min(a,b)+.05),`${theme} ${selector}: foreground ${foreground}, raster background ${background}`).toBeGreaterThanOrEqual(4.5);
  }
});
