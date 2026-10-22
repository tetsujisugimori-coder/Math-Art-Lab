import {test,expect} from '@playwright/test';
for(const width of [1280,390,375])test(`production harmonograph ${width}px`,async({browser,baseURL})=>{
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<750}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(baseURL!);await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','complete');
 const first=await page.locator('canvas').screenshot();expect(first.length).toBeGreaterThan(8000);
 await page.locator('#harm-preset').selectOption('basket');expect((await page.locator('canvas').screenshot()).equals(first)).toBe(false);
 await page.locator('#harm-math summary').click();await page.locator('[data-axis=z] button').first().click();await expect(page.locator('.harm-guide')).toBeVisible();
 await page.locator('.guide-clear').focus();await page.keyboard.press('Escape');await expect(page.locator('[data-axis=z] button').first()).toBeFocused();
 await page.locator('#harm-restart').click();await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','paused');await page.locator('#harm-play').click();await expect.poll(()=>page.locator('#harm-progress').evaluate(el=>(el as HTMLProgressElement).value)).toBeGreaterThan(0);
 await page.locator('#harm-complete').click();await page.locator('#harm-rotate').click();await page.screenshot({path:`test-results/${test.info().project.name}-harmonograph-production-${width}.png`});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await context.close();
});
