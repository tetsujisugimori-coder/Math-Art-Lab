import {test,expect} from '@playwright/test';
for(const width of [1280,390,375])test(`motion lesson stages, keyboard and artwork restoration ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',hasTouch:width<750}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.locator('#harm-preset').selectOption('basket');await page.locator('#harm-rotate').click();await page.evaluate(()=>scrollTo(0,0));
 const artwork=await page.locator('canvas').screenshot(),progress=await page.locator('#harm-progress').getAttribute('max');
 await page.locator('#harm-lesson-start').click();await expect(page.locator('#lesson-panel')).toBeVisible();await expect(page.locator('#harm-art-controls')).toBeHidden();
 await expect(page.locator('#lesson-caption')).toHaveAttribute('data-time','0');await expect(page.locator('#lesson-caption')).toHaveAttribute('data-playing','false');
 await page.waitForTimeout(150);await expect(page.locator('#lesson-caption')).toHaveAttribute('data-time','0');
 await page.locator('#lesson-next').focus();await page.keyboard.press('Enter');await expect(page.locator('#lesson-caption')).toHaveAttribute('data-time','0.25');
 const images:Buffer[]=[];
 for(const stage of [1,2,3,4]){
  await page.locator(`[data-lesson-stage="${stage}"]`).click();await expect(page.locator('#lesson-caption')).toHaveAttribute('data-time','0.25');
  await expect(page.locator('#lesson-caption')).toHaveAttribute('data-dimensions',String(Math.min(stage,3)));
  await expect(page.locator('.lesson-formula:visible')).toHaveCount(Math.min(stage,3));
  if(stage===1)await expect(page.locator('#lesson-caption')).toHaveAttribute('data-trail-count','0');
  await page.locator('#lesson-jump').click();await expect(page.locator('#harm-stage')).toBeFocused();
  const image=await page.locator('canvas').screenshot();if(stage<=3)for(const other of images)expect(image.equals(other)).toBe(false);images.push(image);
  await page.locator('.stage-column').screenshot({path:`test-results/lesson-${test.info().project.name}-${width}-stage-${stage}.png`});
 }
 await page.locator('#lesson-frequency').fill('1.5');await expect(page.locator('#lesson-caption')).toHaveAttribute('data-time','0.25');await expect(page.locator('[data-lesson-param=frequency]')).toHaveText('1.5');
 await expect(page.locator('#lesson-readout')).toContainText('x=0.513');await expect(page.locator('#lesson-caption')).toHaveAttribute('data-playing','false');
 await page.locator('#lesson-reset').click();await expect(page.locator('#lesson-caption')).toHaveAttribute('data-time','0');await expect(page.locator('#lesson-caption')).toHaveAttribute('data-trail-count','1');
 await page.locator('#lesson-play').click();await expect.poll(()=>page.locator('#lesson-caption').getAttribute('data-time').then(Number)).toBeGreaterThan(.1);
 await page.locator('#lesson-play').click();const time=await page.locator('#lesson-caption').getAttribute('data-time');await page.waitForTimeout(150);await expect(page.locator('#lesson-caption')).toHaveAttribute('data-time',time!);
 await page.locator('#lesson-next').click();await expect.poll(()=>page.locator('#lesson-caption').getAttribute('data-time').then(Number)).toBe(Number(time)+.25);
 if(width===1280){await page.setViewportSize({width:375,height:1000});await page.locator('#lesson-angle').click();await page.setViewportSize({width:1280,height:1000});}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('#lesson-next').focus();await page.keyboard.press('Escape');await expect(page.locator('#harm-lesson-start')).toBeFocused();await expect(page.locator('#lesson-panel')).toBeHidden();
 await expect(page.locator('#harm-preset')).toHaveValue('basket');await expect(page.locator('#harm-progress')).toHaveAttribute('max',progress!);await page.evaluate(()=>scrollTo(0,0));const restored=await page.locator('canvas').screenshot();await test.info().attach('artwork-before',{body:artwork,contentType:'image/png'});await test.info().attach('artwork-after',{body:restored,contentType:'image/png'});expect(restored.equals(artwork)).toBe(true);
 for(let i=0;i<3;i++){await page.locator('#harm-lesson-start').click();await page.locator('#harm-lesson-start').click();}
 await expect(page.locator('canvas')).toHaveCount(1);await page.locator('#experiment').selectOption('fractal');await expect(page.locator('#stage canvas')).toHaveCount(1);
 await page.locator('#experiment').selectOption('harmonograph');await expect(page.locator('#lesson-panel')).toBeHidden();expect(errors).toEqual([]);await context.close();
});
test('artwork clock freezes during lesson and resumes without consuming lesson time',async({page})=>{
 await page.goto('/');await page.locator('#harm-lesson-start').click();
 const progress=()=>page.locator('#harm-progress').evaluate(el=>(el as HTMLProgressElement).value),time=await progress();
 await page.locator('#lesson-play').click();await expect.poll(()=>page.locator('#lesson-caption').getAttribute('data-time').then(Number)).toBeGreaterThan(.3);expect(await progress()).toBe(time);
 await page.locator('#harm-lesson-start').click();await expect.poll(progress).toBeGreaterThan(time);
 await page.locator('#harm-play').click();const stopped=await progress();await page.locator('#harm-lesson-start').click();await page.waitForTimeout(150);await page.locator('#harm-lesson-start').click();expect(await progress()).toBe(stopped);
});
test('reentry keeps one animation loop and reduced-motion changes pause safely',async({page})=>{
 await page.addInitScript(()=>{
  const pending=new Set<number>(),request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window);
  (window as Window&{lessonPending?:Set<number>}).lessonPending=pending;
  window.requestAnimationFrame=callback=>{const id=request(now=>{pending.delete(id);callback(now);});pending.add(id);return id;};
  window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
 });
 await page.goto('/');await page.locator('#harm-play').click();
 const pending=()=>page.evaluate(()=>(window as Window&{lessonPending:Set<number>}).lessonPending.size);
 for(let i=0;i<3;i++){
  await page.locator('#harm-lesson-start').click();await expect.poll(pending).toBe(0);
  await page.locator('#lesson-play').click();await expect(page.locator('#lesson-caption')).toHaveAttribute('data-playing','true');await expect.poll(pending).toBe(1);
  await page.locator('#lesson-play').click();await expect.poll(pending).toBe(0);
  const before=Number(await page.locator('#lesson-caption').getAttribute('data-time'));await page.locator('#lesson-next').click();await expect.poll(()=>page.locator('#lesson-caption').getAttribute('data-time').then(Number)).toBe(before+.25);
  await page.locator('#harm-lesson-start').click();await expect.poll(pending).toBe(0);
 }
 await page.locator('#harm-play').click();await page.locator('#harm-lesson-start').click();const progress=await page.locator('#harm-progress').evaluate(el=>(el as HTMLProgressElement).value);
 await page.locator('#lesson-play').click();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#lesson-caption')).toHaveAttribute('data-playing','false');await expect.poll(pending).toBe(0);
 await page.locator('#harm-lesson-start').click();await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','paused');await expect(page.locator('#harm-progress')).toHaveJSProperty('value',progress);
 // Explicit user playback under an already reduced-motion preference must still restore.
 await page.locator('#harm-play').click();await page.locator('#harm-lesson-start').click();await page.locator('#harm-lesson-start').click();await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','drawing');
});
