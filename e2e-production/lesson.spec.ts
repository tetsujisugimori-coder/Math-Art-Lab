import {test,expect} from '@playwright/test';
for(const width of [1280,390,375])test(`production motion lesson ${width}px`,async({browser,baseURL})=>{
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();
 await page.goto(baseURL!);await page.locator('#harm-lesson-start').click();await page.locator('#lesson-next').click();
 for(const stage of [1,2,3,4]){
  await page.locator(`[data-lesson-stage="${stage}"]`).click();await expect(page.locator('#lesson-caption')).toHaveAttribute('data-time','0.25');await expect(page.locator('.lesson-formula:visible')).toHaveCount(Math.min(stage,3));
 }
 await page.locator('#lesson-next').focus();await page.keyboard.press('Escape');await expect(page.locator('#harm-lesson-start')).toBeFocused();await expect(page.locator('#lesson-panel')).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await context.close();
});
