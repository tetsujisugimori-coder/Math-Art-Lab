import {test,expect} from '@playwright/test';

for(const width of [1280,390,375])test(`three real harmonograph presets and guides ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<750,deviceScaleFactor:width<750?2:1,reducedMotion:'reduce'}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.getByRole('heading',{name:'光のハーモノグラフ',exact:true})).toBeVisible();
 const images:Buffer[]=[];
 for(const preset of ['flower','cocoon','basket']){
  await page.locator('#harm-preset').selectOption(preset);await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','complete');
  const image=await page.locator('canvas').screenshot();expect(image.length).toBeGreaterThan(8000);for(const other of images)expect(image.equals(other)).toBe(false);images.push(image);
  await page.locator('.harmonograph .stage-column').screenshot({path:`test-results/harmonograph-${test.info().project.name}-${width}-${preset}.png`});
 }
 const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded();const box=(await canvas.boundingBox())!;
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+45,box.y+box.height/2+20,{steps:5});await page.mouse.up();
 expect((await canvas.screenshot()).equals(images[2])).toBe(false);
 await page.locator('#harm-view-reset').click();await page.evaluate(()=>window.scrollTo(0,0));expect(await canvas.screenshot()).toEqual(images[2]);
 // CSS dimensions must remain the stage content size even on a DPR=2 device.
 expect(await canvas.evaluate(el=>Math.abs(el.getBoundingClientRect().width-el.parentElement!.clientWidth))).toBeLessThan(1);
 await page.locator('#harm-math summary').click();
 for(const axis of ['x','y','z']){
  const card=page.locator(`.harm-formulas [data-axis=${axis}]`),button=card.locator('button').first();
  if(width<750)await button.tap();else await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('#harm-stage')).toHaveAttribute('data-axis',axis);
  await card.getByRole('button',{name:'図形を確認'}).click();await expect(page.locator('#harm-stage')).toBeFocused();
  await expect(page.locator('.harm-guide svg .plot-curve')).toHaveAttribute('d',/^M.+L/);
  await expect(page.locator('.guide-value')).toContainText(`${axis}(t)=`);
  await page.locator('.harm-guide').screenshot({path:`test-results/harmonograph-${test.info().project.name}-${width}-${axis}-guide.png`});
  const clear=page.locator('.guide-clear');await clear.focus();await page.keyboard.press('Escape');
  await expect(page.locator('.harm-guide')).toBeHidden();await expect(button).toBeFocused();await expect(button).toHaveAttribute('aria-pressed','false');
 }
 await page.locator('#harm-shape summary').click();
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`test-results/harmonograph-${test.info().project.name}-${width}-controls.png`});
 expect(errors).toEqual([]);await context.close();
});

test('playback pauses in place, resumes, redraws and completes independently of shape',async({page})=>{
 await page.goto('/');const progress=()=>page.locator('#harm-progress').evaluate(el=>(el as HTMLProgressElement).value);
 await expect.poll(progress).toBeGreaterThan(1);await page.locator('#harm-play').click();
 await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','paused');
 const stopped=await progress(),image=await page.locator('canvas').screenshot();await page.waitForTimeout(200);expect(await progress()).toBe(stopped);expect(await page.locator('canvas').screenshot()).toEqual(image);
 await page.locator('#harm-rate').fill('1');expect(await progress()).toBe(stopped);await page.locator('#harm-play').click();await expect.poll(progress).toBeGreaterThan(stopped);
 await page.locator('#harm-play').click();await page.locator('#harm-restart').click();await expect.poll(progress).toBe(0);await expect(page.locator('#harm-play')).toHaveText('再開');
 await page.locator('#harm-play').click();await expect.poll(progress).toBeGreaterThan(0);
 // A background tab must retain the path and resume without consuming hidden elapsed time.
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 const hidden=await progress();await page.waitForTimeout(200);expect(await progress()).toBe(hidden);
 await page.evaluate(()=>{delete (document as Document&{hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(progress).toBeGreaterThan(hidden);
 await page.locator('#harm-complete').click();await expect.poll(progress).toBe(110);await expect(page.locator('#harm-play')).toBeDisabled();
 const full=await page.locator('canvas').screenshot();await page.locator('#harm-rate').fill('12');expect(await page.locator('canvas').screenshot()).toEqual(full);
 await page.locator('#harm-restart').click();await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','drawing');await expect.poll(progress).toBeLessThan(10);
});

test('coefficients, preset and shape controls stay consistent with the completed trajectory',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 const initial=await page.locator('canvas').screenshot();await page.locator('#harm-shape summary').click();await page.locator('#harm-math summary').click();
 const x=page.locator('[data-axis=x] math'),y=page.locator('[data-axis=y] math'),z=page.locator('[data-axis=z] math'),originalX=await x.textContent();
 await page.locator('#harm-ratio').fill('1.1');await expect(y).toContainText('2.2');await expect(x).toHaveText(originalX!);expect((await page.locator('canvas').screenshot()).equals(initial)).toBe(false);
 await page.locator('#harm-depth').fill('0');await expect(z).toContainText('0×exp');
 await page.locator('#harm-duration').fill('20');await expect(page.locator('#harm-progress')).toHaveAttribute('max','20');await expect(page.locator('#harm-sampling')).toContainText('3,001');
 await page.locator('[data-axis=x] button').first().click();await page.locator('#harm-preset').selectOption('cocoon');await expect(x).toContainText('0.95');await expect(y).toContainText('3.06');await expect(page.locator('#harm-ratio')).toHaveValue('1');await expect(page.locator('.guide-value')).toContainText('t=130.00');
 await page.locator('#harm-defaults').click();await expect(page.locator('#harm-preset')).toHaveValue('flower');await expect(page.locator('#harm-duration')).toHaveValue('110');await expect(page.locator('#harm-rate')).toHaveValue('6');
 await page.locator('.guide-clear').click();
 // Compare at the original page position: Chromium rounds a clipped border row differently after scrolling.
 await page.evaluate(()=>window.scrollTo(0,0));expect(await page.locator('canvas').screenshot()).toEqual(initial);
 // Reduced motion suppresses automatic drawing, but explicit replay remains available.
 await page.locator('#harm-restart').click();await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','paused');
 await page.locator('#harm-ratio').fill('0.9');await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','paused');await expect(page.locator('#harm-progress')).toHaveJSProperty('value',0);
 await page.locator('#harm-play').click();await expect(page.locator('#harm-stage')).toHaveAttribute('data-playback','drawing');
});

test('repeated work switches release WebGL contexts, observers and animation callbacks',async({page})=>{
 await page.addInitScript(()=>{
  const observers=new Set<ResizeObserver>(),pending=new Set<number>();
  (window as Window&{artResources?:unknown}).artResources={observers,pending};
  const Original=window.ResizeObserver;
  window.ResizeObserver=class extends Original{observe(...args:Parameters<ResizeObserver['observe']>){observers.add(this);super.observe(...args);}disconnect(){observers.delete(this);super.disconnect();}};
  const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame=callback=>{const id=request(now=>{pending.delete(id);callback(now);});pending.add(id);return id;};
  window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
 });
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 for(let i=0;i<3;i++){
  const old=await page.locator('canvas').elementHandle();await page.locator('#experiment').selectOption('fractal');
  await expect.poll(()=>old!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(true);await old!.dispose();
  await expect(page.locator('canvas')).toHaveCount(1);await page.locator('#tab-structures').click();await page.locator('[data-formula=length] .visual-toggle').click();await expect(page.locator('.visual-caption')).toBeVisible();
  const fractal=await page.locator('canvas').elementHandle();await page.locator('#experiment').selectOption('harmonograph');
  await expect.poll(()=>fractal!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(true);await fractal!.dispose();
  await expect(page.locator('canvas')).toHaveCount(1);await expect(page.locator('.visual-caption')).toHaveCount(1);
  await expect.poll(()=>page.evaluate(()=>{const r=(window as Window&{artResources?:{observers:Set<unknown>;pending:Set<number>}}).artResources!;return{observers:r.observers.size,pending:r.pending.size};})).toEqual({observers:2,pending:0});
 }
 expect(errors).toEqual([]);
});
