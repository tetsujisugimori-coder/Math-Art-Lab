import {test,expect} from '@playwright/test';
import {assertCirclePixels,twinsReady} from '../e2e/twins-checks';
for(const width of [320,375,390,1280])test(`Pages fractal twins ${width}px`,async({page})=>{
 test.setTimeout(45000);const failures:string[]=[];page.on('pageerror',e=>failures.push(e.message));page.on('requestfailed',r=>failures.push(r.url()));await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');await page.locator('#experiment').selectOption('twins');await twinsReady(page);await page.locator('#twins-preset').selectOption('circle');await twinsReady(page);await assertCirclePixels(page);
 await page.locator('#twins-lesson-toggle').click();await page.locator('[data-twins-step="2"]').click();await expect(page.locator('[data-orbit="mandelbrot"]')).toContainText('n=3で|z|>R');await page.locator('#twins-lesson-toggle').click();await twinsReady(page);await expect(page.locator('#twins-preset')).toHaveValue('circle');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(failures).toEqual([]);
});
