import {test,expect} from '@playwright/test';
for(const width of [1280,390,375])test(`production flower garden ${width}px`,async({browser,baseURL})=>{
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'}),page=await context.newPage();const errors:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));await page.goto(baseURL!);await page.locator('#experiment').selectOption('garden');
 await expect(page.locator('#garden-stage')).toHaveAttribute('data-count','1200');expect((await page.locator('canvas').screenshot()).length).toBeGreaterThan(10000);
 await page.locator('[data-garden-preset="120"]').click();await expect(page.locator('#garden-pattern')).toContainText('3方向');
 await page.locator('#garden-lesson').click();await page.locator('[data-garden-step="2"]').click();await expect(page.locator('.garden-arc')).toBeVisible();await page.locator('#garden-next').click();await expect(page.locator('#garden-stage')).toHaveAttribute('data-count','7');await page.locator('[data-garden-step="3"]').focus();await page.keyboard.press('Escape');await expect(page.locator('#garden-lesson')).toBeFocused();await expect(page.locator('#garden-stage')).toHaveAttribute('data-count','1200');
 await page.locator('#garden-lesson').click();await page.locator('[data-garden-step="4"]').click();await page.locator('#garden-next').click();
 for(const step of [1,2,3,4])await page.locator(`[data-garden-step="${step}"]`).click();
 await expect(page.locator('#garden-stage')).toHaveAttribute('data-count','7');await expect(page.locator('#garden-stage')).toHaveAttribute('data-mode','paused');
 await page.locator('#garden-complete').click();await page.locator('[data-garden-step="1"]').click();await page.locator('[data-garden-step="4"]').click();await expect(page.locator('#garden-stage')).toHaveAttribute('data-count','1200');
 await page.locator('#garden-lesson').click();
 await page.locator('#garden-restart').click();await page.locator('#garden-next').click();await expect(page.locator('#garden-stage')).toHaveAttribute('data-count','1');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await context.close();
});
