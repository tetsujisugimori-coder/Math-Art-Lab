import {test,expect} from '@playwright/test';
test('flow field controls, comparison, lesson and disposal',async({page})=>{
 await page.goto('/');await page.locator('#experiment').selectOption('flow');await expect(page.locator('h1')).toHaveText('風の軌跡');
 await page.locator('#flow-step').click();await expect(page.locator('#flow-observation')).toContainText('0.20 秒');
 await page.locator('#flow-x').fill('2');await page.locator('#flow-y').fill('1');await page.locator('#flow-add').click();await expect(page.locator('#flow-observation')).toContainText('(2.000, 1.000)');
 await page.locator('#flow-model').selectOption('sink');await expect(page.locator('#flow-observation')).toContainText('(2.000, 1.000)');await expect(page.locator('#flow-observation')).toContainText('0.00 秒');
 await page.locator('#flow-a').fill('1e-999');await page.locator('#flow-apply').click();await expect(page.locator('#flow-error')).toContainText('有限値');await expect(page.locator('#flow-equations')).toContainText('a=0.5');
 await page.locator('#flow-lesson').click();await page.locator('#flow-next').click();await page.locator('#flow-step').click();await page.keyboard.press('Escape');await expect(page.locator('#flow-observation')).toContainText('0.00 秒');
 await page.locator('#flow-canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(page.locator('#flow-count')).toContainText('2 / 16');
 await page.locator('#flow-play').click();await expect(page.locator('#flow-play')).toHaveText('一時停止');await page.locator('#flow-play').click();await expect(page.locator('#flow-play')).toHaveText('再生');
 await page.locator('#experiment').selectOption('wave');await page.locator('#experiment').selectOption('flow');await expect(page.locator('#flow-count')).toContainText('0 / 16');
});
test('motion preference and visibility stop playback',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#experiment').selectOption('flow');await expect(page.locator('#flow-play')).toHaveText('再生');await page.locator('#flow-play').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#flow-play')).toHaveText('再生');
});
test.describe('touch and DPR 2',()=>{
 test.use({hasTouch:true,deviceScaleFactor:2});
 test('tap selects a point and reduced motion stops a lesson without resuming',async({page})=>{
  await page.goto('/');await page.locator('#experiment').selectOption('flow');const canvas=page.locator('#flow-canvas'),box=(await canvas.boundingBox())!;await page.touchscreen.tap(box.x+box.width*.6,box.y+box.height*.4);await expect(page.locator('#flow-count')).toContainText('1 / 16');expect(Number(await page.locator('#flow-x').inputValue())).toBeCloseTo(1,1);expect(Number(await page.locator('#flow-y').inputValue())).toBeCloseTo(1,1);
  await page.locator('#flow-play').click();await page.locator('#flow-lesson').click();await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#flow-close').click();await expect(page.locator('#flow-play')).toHaveText('再生');
 });
});
for(const width of [320,375,390,751,1024,1280])test(`layout ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.locator('#experiment').selectOption('flow');for(const scheme of ['light','dark'] as const){await page.emulateMedia({colorScheme:scheme});for(const font of ['100%','200%']){await page.evaluate(value=>{document.documentElement.style.fontSize=value;},font);const dims=await page.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('#flow-canvas')!.getBoundingClientRect(),aside=document.querySelector<HTMLElement>('.flow aside')!;return {w:c.width,h:c.height,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,asideHeight:aside.clientHeight,asideScroll:aside.scrollHeight};});expect(Math.abs(dims.w-dims.h)).toBeLessThan(2);expect(dims.scroll).toBeLessThanOrEqual(dims.client+1);expect(dims.asideScroll).toBeLessThanOrEqual(dims.asideHeight+1);}}
});
