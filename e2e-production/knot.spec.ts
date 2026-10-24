import {test,expect} from '@playwright/test';
for(const width of [1280,390,375])test(`production luminous knot ${width}px`,async({browser,baseURL})=>{
 const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}),page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));await page.goto(baseURL!);await page.locator('#experiment').selectOption('knot');
 const stage=page.locator('#knot-stage');await expect(stage).toHaveAttribute('data-mode','complete');expect((await page.locator('canvas').screenshot()).length).toBeGreaterThan(10000);
 await page.locator('#knot-preset').selectOption('three-five');await page.locator('#knot-math summary').click();await page.locator('[data-knot-guide="q"] button').click();await expect(stage).toHaveAttribute('data-guide','q');await page.locator('#knot-torus').check();await page.locator('#knot-position').fill('0.25');await expect(stage).toHaveAttribute('data-mode','paused');
 await page.locator('#knot-guide-clear').focus();await page.keyboard.press('Escape');await expect(page.locator('[data-knot-guide="q"] button')).toBeFocused();await expect(page.locator('#knot-guide-panel')).toBeHidden();
 await page.locator('#knot-restart').click();await expect(stage).toHaveAttribute('data-index','0');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await context.close();
});
