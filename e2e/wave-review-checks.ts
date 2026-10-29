import {test,expect,type Page} from '@playwright/test';

async function openWave(page:Page){await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./');await page.locator('#experiment').selectOption('wave');}
const observation=(page:Page)=>page.locator('#wave-observation');
export function waveReviewChecks(){
 test('review: stage fills its column at all widths, themes and text sizes',async({browser,baseURL},info)=>{
  const context=await browser.newContext({deviceScaleFactor:2,reducedMotion:'reduce',viewport:{width:320,height:850}}),page=await context.newPage();await page.goto(baseURL!);await page.locator('#experiment').selectOption('wave');
  for(const width of [320,375,390,700,751,800,1024,1280])for(const theme of ['light','dark'] as const)for(const zoom of [100,200]){
   await page.setViewportSize({width,height:850});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await page.evaluate(z=>{document.documentElement.style.fontSize=`${z}%`;},zoom);
   const size=await page.locator('.wave-layout>section').evaluate(el=>{const c=el.getBoundingClientRect(),s=el.querySelector('.wave-stage')!.getBoundingClientRect(),canvas=el.querySelector('canvas')!.getBoundingClientRect();return {column:c.width,stage:s.width,height:s.height,canvas:canvas.width};});
   // The square is designed to fill its column, capped at 720 CSS px; allow 1px for subpixel rounding.
   expect(size.stage,`${width}/${theme}/${zoom}`).toBeGreaterThanOrEqual(Math.min(size.column,720)-1);expect(Math.abs(size.stage-size.height)).toBeLessThan(1);expect(Math.abs(size.stage-size.canvas)).toBeLessThan(1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}/${theme}/${zoom}`).toBeTruthy();
   expect(await page.locator('.wave-inspector').evaluate(el=>getComputedStyle(el).display)).toBe('block');
   expect(await page.locator('.wave-layout>aside').evaluate(el=>el.scrollHeight<=el.clientHeight+1),`${width}/${theme}/${zoom} controls`).toBeTruthy();
   const boxes=await page.locator('.wave-layout').evaluate(el=>{const a=el.querySelector('section')!.getBoundingClientRect(),b=el.querySelector('aside')!.getBoundingClientRect();return {separate:a.right<=b.left+1||a.bottom<=b.top+1};});expect(boxes.separate).toBeTruthy();
   await expect(page.locator('#wave-source-a')).toHaveAttribute('transform','translate(80 120)');await expect(page.locator('#wave-source-b')).toHaveAttribute('transform','translate(160 120)');await expect(page.locator('#wave-point')).toHaveAttribute('transform','translate(120 120)');
   if(theme==='dark'&&zoom===100)console.log(`WAVE_WIDTH ${info.project.name} ${width}: column=${size.column.toFixed(1)} stage=${size.stage.toFixed(1)} CSS px`);
   if(process.env.WAVE_REVIEW_CAPTURE&&info.project.name==='chromium'&&theme==='light'&&((width===751&&zoom===100)||(width===320&&zoom===200)))await page.screenshot({path:`docs/wave/review-${width}-${zoom}.png`,fullPage:true});
   if(process.env.WAVE_REVIEW_CAPTURE&&info.project.name==='chromium'&&theme==='dark'&&width===751&&zoom===100){for(const mode of ['a','b','u','envelope']){await page.locator('#wave-mode').selectOption(mode);await page.waitForTimeout(50);await page.locator('.wave-stage').screenshot({path:`docs/wave/review-${mode}-751.png`});}await page.locator('#wave-mode').selectOption('a');}
  }
  await context.close();
 });
 test('review: preset follows applied settings',async({page})=>{
  await openWave(page);const preset=page.locator('#wave-preset'),formula=page.locator('#wave-formulas');
  await expect(preset).toHaveValue('same');await preset.selectOption('cancel');await expect(observation(page)).toContainText('B≈0');await expect(formula).toContainText('λ=2, d=0, φ=180°');
  await page.locator('#wave-default').click();await expect(formula).toContainText('λ=2, d=4, φ=0°');await expect(observation(page)).toContainText('u≈2');await expect(preset).toHaveValue('same');
  await preset.selectOption('cancel');await expect(observation(page)).toContainText('B≈0');
  await page.locator('#wave-settings [name=speed]').fill('2');await page.locator('#wave-settings button').click();await expect(preset).toHaveValue('cancel');await expect(formula).toContainText('速度=2倍');
  const cancelValues=await observation(page).textContent();await page.locator('#wave-settings [name=distance]').fill('9');await page.locator('#wave-settings button').click();await expect(preset).toHaveValue('cancel');await expect(observation(page)).toHaveText(cancelValues!);await expect(formula).toContainText('d=0, φ=180°');
  await page.locator('#wave-settings [name=distance]').fill('3');await expect(preset).toHaveValue('cancel');await expect(formula).toContainText('d=0');await page.locator('#wave-settings button').click();await expect(preset).toHaveValue('custom');await expect(formula).toContainText('d=3, φ=180°');
  const applied=await observation(page).textContent(),appliedFormula=await formula.textContent();await page.locator('#wave-settings [name=distance]').fill('9');await page.locator('#wave-settings button').click();await expect(page.locator('#wave-error')).toContainText('未適用');await expect(preset).toHaveValue('custom');await expect(observation(page)).toHaveText(applied!);await expect(formula).toHaveText(appliedFormula!);
  await page.locator('#wave-lesson-toggle').click();await preset.selectOption('opposite');await expect(formula).toContainText('d=4, φ=180°');await page.locator('#wave-lesson-toggle').click();await expect(preset).toHaveValue('custom');await expect(formula).toHaveText(appliedFormula!);await expect(observation(page)).toHaveText(applied!);
  await page.locator('#wave-mode').selectOption('u');await page.locator('#wave-point-form [name=x]').fill('1');await page.locator('#wave-point-form button').click();await expect(preset).toHaveValue('custom');await expect(formula).toContainText('d=3, φ=180°');
  await page.locator('#wave-settings [name=distance]').fill('4');await page.locator('#wave-settings [name=phase]').fill('0');await page.locator('#wave-settings button').click();await expect(preset).toHaveValue('same');await expect(formula).toContainText('λ=2, d=4, φ=0°');
  await preset.selectOption('cancel');await expect(preset).toHaveValue('cancel');await expect(formula).toContainText('d=0, φ=180°');await expect(observation(page)).toContainText('B≈0');
 });
 test('review: hidden while playing pauses until explicit resume',async({page})=>{
  await openWave(page);await page.locator('#wave-play').click();await expect(page.locator('#wave-play')).toHaveText('一時停止');await page.waitForTimeout(200);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await expect(page.locator('#wave-play')).toHaveText('再生');const hidden=await observation(page).textContent();await page.waitForTimeout(250);await expect(observation(page)).toHaveText(hidden!);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(250);await expect(page.locator('#wave-play')).toHaveText('再生');await expect(observation(page)).toHaveText(hidden!);
  await page.locator('#wave-play').click();await expect.poll(async()=>await observation(page).textContent()).not.toBe(hidden);await page.locator('#wave-play').click();
  await page.locator('#wave-play').click();await page.locator('#wave-lesson-toggle').click();await page.locator('#wave-lesson-toggle').click();await expect(page.locator('#wave-play')).toHaveText('一時停止');await page.locator('#wave-play').click();
  await page.locator('#wave-play').click();await page.locator('#wave-lesson-toggle').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await page.locator('#wave-lesson-toggle').click();await expect(page.locator('#wave-play')).toHaveText('再生');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(100);await page.locator('#wave-play').click();await page.locator('#wave-lesson-toggle').click();await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);await page.locator('#wave-lesson-toggle').click();await expect(page.locator('#wave-play')).toHaveText('再生');
 });
 test('review: one wave animation loop and disposal on work switch',async({page})=>{
  await openWave(page);await page.evaluate(()=>{
   const request=window.requestAnimationFrame.bind(window),cancel=window.cancelAnimationFrame.bind(window),pending=new Set<number>();let callback:FrameRequestCallback|undefined,max=0,stale=0;
   Object.assign(window,{waveLoopProbe:()=>({max,stale})});
   window.requestAnimationFrame=(fn)=>{const isWave=!!document.querySelector('#wave-play')&&(!callback||callback===fn);if(isWave)callback=fn;let id=0;id=request(t=>{pending.delete(id);if(fn===callback&&!document.querySelector('#wave-play'))stale++;fn(t);});if(isWave){pending.add(id);max=Math.max(max,pending.size);}return id;};
   window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
  });
  await page.locator('#wave-play').click();await page.waitForTimeout(200);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});await page.locator('#wave-play').click();await page.waitForTimeout(200);await page.locator('#experiment').selectOption('garden');await page.waitForTimeout(200);
  const probe=await page.evaluate(()=>(window as unknown as {waveLoopProbe:()=>{max:number;stale:number}}).waveLoopProbe());expect(probe.max).toBe(1);expect(probe.stale).toBe(0);
 });
}
