import {test,expect} from '@playwright/test';

for(const width of [375,390,1280])test(`Pages fifth work ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:950});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');await page.locator('#experiment').selectOption('lorenz');
 await expect(page.locator('#lorenz-stage')).toHaveAttribute('data-mode','complete');expect((await page.locator('canvas').screenshot()).length).toBeGreaterThan(12000);
 await page.locator('#lorenz-preset').selectOption('comparison');await page.locator('#lorenz-restart').click();await page.locator('#lorenz-step').click();await expect(page.locator('#lorenz-stage')).toHaveAttribute('data-index','1');
 await page.locator('#lorenz-lesson-toggle').click();await page.locator('button[data-lesson="3"]').click();await expect(page.locator('#lorenz-lesson-text')).toContainText('証明ではありません');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('#experiment').selectOption('knot');await expect(page.locator('#knot-stage')).toHaveAttribute('data-mode','complete');
});
