import {test,expect} from '@playwright/test';
const groups={length:0,heading:0,count:0,'endpoint-x':0,'endpoint-y':0,phase:1,envelope:1,'deform-x':1,'deform-y':1,'deform-z':1,distance:2};
for(const width of [1280,390,375])test(`all eleven explanations ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.locator('#pause').click();await page.locator('#tab-structures').click();
 const canvas=page.locator('canvas');const baseline=await canvas.screenshot();
 for(const id of Object.keys(groups)){
  const card=page.locator(`[data-formula="${id}"]`),button=card.locator('.visual-toggle');await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('.formula.is-selected')).toHaveCount(1);await expect(page.locator('#stage')).toHaveAttribute('data-visual',id);
  await expect(page.locator('.visual-caption')).toBeVisible();await expect(page.locator('.visual-caption p').last()).not.toBeEmpty();
  await card.locator('.visual-jump').click();await expect(page.locator('#stage')).toBeFocused();
  const active=await canvas.screenshot();expect(active.equals(baseline)).toBe(false);expect(await canvas.screenshot()).toEqual(active);
  if(id==='count'){await page.getByRole('button',{name:'次の世代'}).click();await expect(page.locator('.visual-caption')).toContainText('n=1');}
  if(['heading','deform-z','envelope'].includes(id)){await page.locator('.stage-column').screenshot({path:`test-results/${test.info().project.name}-${width}-${id}-visual.png`});}
  await page.locator('.visual-caption').getByRole('button',{name:'解説を解除',exact:true}).click();await expect(page.locator('.visual-caption')).toBeHidden();expect(await canvas.screenshot()).toEqual(baseline);
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('keyboard, pause, reset, parameters, rotation, zoom, resize and reduced motion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await expect(page.locator('#pause')).toHaveText('再開');await page.locator('#tab-structures').click();
 const button=page.locator('[data-formula=phase] .visual-toggle');await button.focus();await page.keyboard.press('Enter');await expect(button).toHaveAttribute('aria-pressed','true');
 const caption=page.locator('.visual-caption p').last();const text=await caption.textContent();await page.waitForTimeout(150);expect(await caption.textContent()).toBe(text);
 await page.locator('#pause').click();await expect.poll(()=>caption.textContent()).not.toBe(text);await page.locator('#pause').click();
 await page.keyboard.press('Escape');await expect(button).toHaveAttribute('aria-pressed','false');
 await page.locator('[data-formula=deform-z] .visual-toggle').click();const canvas=page.locator('canvas');const before=await canvas.screenshot();await page.locator('#rotate').click();await expect.poll(async()=>(await canvas.screenshot()).equals(before)).toBe(false);
 await page.locator('.stage-column').screenshot({path:`test-results/${test.info().project.name}-rotated-z-visual.png`});
 const rotated=await canvas.screenshot();await page.locator('#zoom-in').click();await expect.poll(async()=>(await canvas.screenshot()).equals(rotated)).toBe(false);
 await page.setViewportSize({width:375,height:844});await expect(page.locator('#stage')).toHaveAttribute('data-visual','deform-z');
 // Direct input while inspector stays visible verifies rebuilding against fresh geometry.
 const oldDetail=await caption.textContent();
 await page.locator('#param-depth').evaluate(el=>{(el as HTMLInputElement).value='2';el.dispatchEvent(new Event('input'));});await expect(caption).toContainText('代表端点');expect(await caption.textContent()).not.toBe(oldDetail);
 await page.locator('#param-amplitude').evaluate(el=>{(el as HTMLInputElement).value='0';el.dispatchEvent(new Event('input'));});await expect(caption).toContainText('Δx=0.000、Δy=0.000、Δz=0.000');
 await page.locator('#reset').click();await expect(page.locator('.visual-caption')).toBeHidden();await expect(page.locator('#pause')).toHaveText('再開');
 await page.locator('[data-formula=length] .visual-toggle').click();await page.locator('#tab-parameters').click();await expect(page.locator('.visual-caption')).toBeHidden();
});
