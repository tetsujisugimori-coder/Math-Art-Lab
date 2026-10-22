import {test,expect} from '@playwright/test';
import {GOLDEN_ANGLE,GARDEN_SPACING,gardenPoint} from '../src/garden';

test('lesson stage four retains playing progress across the small lesson',async({page})=>{
 test.setTimeout(60000);
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#experiment').selectOption('garden');
 const stage=page.locator('#garden-stage');
 await page.locator('#garden-lesson').click();await page.locator('[data-garden-step="4"]').click();
 await page.locator('#garden-rate').fill('1');await page.locator('#garden-restart').click();
 for(let n=0;n<100;n++)await page.locator('#garden-next').click();
 await expect(stage).toHaveAttribute('data-count','100');await page.locator('#garden-play').click();
 await page.locator('[data-garden-step="1"]').click();await page.waitForTimeout(1100);
 await page.locator('[data-garden-step="4"]').click();
 await expect(stage).toHaveAttribute('data-mode','drawing');
 expect(Number(await stage.getAttribute('data-count'))).toBeLessThan(103);
 await expect.poll(()=>stage.getAttribute('data-count').then(Number)).toBeGreaterThan(100);
});

for(const width of [1280,390,375])test(`lesson saved progress, completion and controls ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await page.locator('#experiment').selectOption('garden');const stage=page.locator('#garden-stage');
 const step=(n:number)=>page.locator(`[data-garden-step="${n}"]`),next=page.locator('#garden-next'),play=page.locator('#garden-play');
 await page.locator('#garden-total').fill('200');await page.locator('#garden-rate').fill('80');await page.locator('#garden-angle-number').fill('137.3');
 await page.locator('#garden-restart').click();for(let i=0;i<3;i++)await next.click();
 await expect(page.locator('#garden-math')).toHaveJSProperty('open',false);
 await page.locator('#garden-lesson').click();await step(4).click();await next.click();
 await expect(stage).toHaveAttribute('data-count','7');
 for(const n of [1,2,3,4,2,4])await step(n).click();
 await expect(stage).toHaveAttribute('data-count','7');await expect(stage).toHaveAttribute('data-mode','paused');
 await page.locator('#garden-complete').click();
 for(const n of [1,2,3,4])await step(n).click();
 await expect(stage).toHaveAttribute('data-count','200');await expect(stage).toHaveAttribute('data-mode','complete');await expect(stage).toHaveAttribute('data-completion','explicit');
 // Small steps share progress, but neither limit arrival nor their complete button changes step four.
 await step(1).click();await expect(stage).toHaveAttribute('data-count','6');
 await next.focus();await page.keyboard.press('Enter');await expect(stage).toHaveAttribute('data-count','7');
 await play.click();await expect(stage).toHaveAttribute('data-mode','drawing');await play.click();await expect(stage).toHaveAttribute('data-mode','paused');
 await page.locator('#garden-restart').click();await expect(stage).toHaveAttribute('data-count','0');
 for(let i=0;i<12;i++)await next.click();
 await expect(stage).toHaveAttribute('data-count','12');await expect(stage).toHaveAttribute('data-completion','limit');
 await step(2).click();await step(3).click();await expect(stage).toHaveAttribute('data-count','12');
 await page.locator('#garden-complete').click();await expect(stage).toHaveAttribute('data-completion','explicit');
 await page.locator('#garden-restart').click();await expect(stage).toHaveAttribute('data-count','0');await expect(play).toBeEnabled();
 await next.click();await expect(stage).toHaveAttribute('data-count','1');await expect(next).toBeEnabled();
 await page.locator('#garden-angle-number').fill('90');await step(4).click();
 await expect(stage).toHaveAttribute('data-count','200');await expect(stage).toHaveAttribute('data-angle','90');
 await page.locator('#garden-total').fill('6');await expect(stage).toHaveAttribute('data-count','6');await step(1).click();await expect(stage).toHaveAttribute('data-count','1');
 await step(4).click();await page.locator('#garden-total').fill('1200');await expect(stage).toHaveAttribute('data-count','1200');
 await page.locator('#garden-lesson').click();
 await expect(stage).toHaveAttribute('data-count','3');await expect(stage).toHaveAttribute('data-mode','paused');await expect(stage).toHaveAttribute('data-angle','137.3');
 await expect(page.locator('#garden-total')).toHaveValue('200');await expect(page.locator('#garden-rate')).toHaveValue('80');await expect(page.locator('#garden-math')).toHaveJSProperty('open',false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('lesson boundaries and reduced motion preserve saved playback',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#experiment').selectOption('garden');const stage=page.locator('#garden-stage');
 for(const total of [1,6,12,1200]){
  await page.locator('#garden-total').fill(String(total));await page.locator('#garden-lesson').click();
  for(const n of [4,1,2,3,4])await page.locator(`[data-garden-step="${n}"]`).click();
  await expect(stage).toHaveAttribute('data-count',String(Math.min(6,total)));await expect(stage).toHaveAttribute('data-mode',total<=6?'complete':'paused');
  await page.locator('#garden-complete').click();await page.locator('[data-garden-step="1"]').click();await page.locator('[data-garden-step="4"]').click();await expect(stage).toHaveAttribute('data-count',String(total));
  await page.locator('#garden-lesson').click();
 }
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#garden-lesson').click();await page.locator('[data-garden-step="4"]').click();await page.locator('#garden-play').click();
 await page.locator('[data-garden-step="1"]').click();await page.emulateMedia({reducedMotion:'reduce'});await page.locator('[data-garden-step="4"]').click();await expect(stage).toHaveAttribute('data-mode','paused');
});
for(const width of [1280,390,375])test(`garden presets, mathematics and teaching ${width}px`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:width<750?2:1,hasTouch:width<750,reducedMotion:'reduce'}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});await page.goto('/');await page.locator('#experiment').selectOption('garden');
 const stage=page.locator('#garden-stage');await expect(stage).toHaveAttribute('data-count','1200');await expect(stage).toHaveAttribute('data-mode','complete');await expect(stage).toHaveAttribute('data-angle',String(GOLDEN_ANGLE));
 const images:Buffer[]=[];
 for(const [preset,angle,directions]of [['golden',GOLDEN_ANGLE,''],['120',120,'3方向'],['90',90,'4方向'],['near',137.3,'']] as const){
  const button=page.locator(`[data-garden-preset="${preset}"]`);if(width<750)await button.tap();else await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(stage).toHaveAttribute('data-angle',String(angle));
  if(directions)await expect(page.locator('#garden-pattern')).toContainText(directions);
  const image=await page.locator('canvas').screenshot();expect(image.length).toBeGreaterThan(8000);for(const other of images)expect(image.equals(other)).toBe(false);images.push(image);
 }
 await page.locator('#garden-total').fill('200');await page.locator('#garden-rate').fill('80');await expect(stage).toHaveAttribute('data-count','200');await page.locator('#garden-math summary').click();
 const expected=gardenPoint(199,137.3);await expect(page.locator('#garden-current')).toContainText('n=199');await expect(page.locator('#garden-coordinates')).toContainText(`xₙ ≈ ${Number(expected.x.toFixed(6))}`);await expect(page.locator('[data-garden-value=angle]')).toHaveText('137.3');
 await page.evaluate(()=>scrollTo(0,0));const original=await page.locator('canvas').screenshot();
 await page.locator('#garden-lesson').click();await expect(stage).toHaveAttribute('data-count','6');await expect(page.locator('#garden-rate')).toHaveValue('3');await expect(page.locator('#garden-rate')).toBeDisabled();await expect(page.locator('#garden-total')).toBeDisabled();await expect(page.locator('.garden-overlay text')).toHaveCount(6);
 await page.locator('[data-garden-step="2"]').click();await expect(page.locator('.garden-arc')).toHaveAttribute('d',/^M.+L/);
 // The arc starts on the actual previous direction and ends on the current one.
 const arc=await page.locator('.garden-arc').getAttribute('d'),previous=gardenPoint(4,137.3),current=gardenPoint(5,137.3);
 const endpoints=arc!.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi)!.map(Number),box=(await stage.boundingBox())!;
 const a=Math.atan2(-(endpoints[1]-stageHeight(box.height)/2),endpoints[0]-stageWidth(box.width)/2),b=Math.atan2(-(endpoints.at(-1)!-stageHeight(box.height)/2),endpoints.at(-2)!-stageWidth(box.width)/2);
 expect(Math.cos(a)).toBeCloseTo(Math.cos(previous.theta),6);expect(Math.sin(b)).toBeCloseTo(Math.sin(current.theta),6);
 await page.locator('[data-garden-step="3"]').click();await expect(page.locator('.garden-radius')).toHaveCount(1);await expect(page.locator('.garden-overlay')).toContainText(`${GARDEN_SPACING}√5`);
 await page.locator('[data-garden-preset="90"]').click();await expect(stage).toHaveAttribute('data-count','6');await expect(stage).toHaveAttribute('data-mode','paused');
 await page.locator('#garden-next').focus();await page.keyboard.press('Enter');await expect(stage).toHaveAttribute('data-count','7');await expect(page.locator('#garden-current')).toContainText('n=6');
 await page.locator('[data-garden-step="4"]').click();await expect(stage).toHaveAttribute('data-count','7');await expect(stage).toHaveAttribute('data-total','200');await page.locator('#garden-complete').click();await expect(stage).toHaveAttribute('data-count','200');
 await page.locator('[data-garden-step="1"]').focus();await page.keyboard.press('Escape');await expect(page.locator('#garden-lesson')).toBeFocused();await expect(page.locator('#garden-lesson-panel')).toBeHidden();
 await expect(stage).toHaveAttribute('data-count','200');await expect(stage).toHaveAttribute('data-angle','137.3');await expect(page.locator('#garden-rate')).toHaveValue('80');await expect(page.locator('#garden-math')).toHaveJSProperty('open',true);await page.evaluate(()=>scrollTo(0,0));expect((await page.locator('canvas').screenshot()).equals(original)).toBe(true);
 await page.locator('#garden-restart').click();await expect(stage).toHaveAttribute('data-count','0');await expect(stage).toHaveAttribute('data-mode','paused');await page.locator('#garden-next').click();await expect(stage).toHaveAttribute('data-count','1');await expect(page.locator('#garden-coordinates')).toContainText('xₙ ≈ 0、yₙ ≈ 0');
 await page.locator('#garden-angle-number').fill('137.501');await expect(stage).toHaveAttribute('data-angle','137.501');await expect(stage).toHaveAttribute('data-count','1');await page.locator('#garden-angle-plus').click();await expect(page.locator('#garden-angle-value')).toHaveText('137.511°');
 await page.locator('#garden-angle').focus();await page.keyboard.press('ArrowRight');await expect(page.locator('#garden-angle-value')).toHaveText('137.512°');
 await page.locator('#garden-angle-number').fill('361');await expect(page.locator('#garden-angle-number')).toHaveAttribute('aria-invalid','true');await expect(stage).toHaveAttribute('data-angle',String(137.512));await page.locator('#garden-total').focus();await expect(page.locator('#garden-angle-number')).not.toHaveAttribute('aria-invalid');
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await context.close();
});
// A stage border lies outside its client coordinate system.
const stageWidth=(value:number)=>value-2,stageHeight=(value:number)=>value-2;

test('garden drawing clock, stable colors, hidden tab and lesson restoration',async({page})=>{
 await page.goto('/');await page.locator('#experiment').selectOption('garden');const stage=page.locator('#garden-stage');
 await expect.poll(()=>stage.getAttribute('data-count').then(Number)).toBeGreaterThan(5);await page.locator('#garden-play').click();const stopped=await stage.getAttribute('data-count');await page.waitForTimeout(150);await expect(stage).toHaveAttribute('data-count',stopped!);
 await page.locator('#garden-angle-number').fill('90');await expect(stage).toHaveAttribute('data-count',stopped!);await expect(stage).toHaveAttribute('data-mode','paused');await page.locator('#garden-lesson').click();await page.locator('#garden-play').click();await expect.poll(()=>stage.getAttribute('data-count').then(Number)).toBeGreaterThan(6);await page.locator('#garden-lesson').click();await expect(stage).toHaveAttribute('data-count',stopped!);await expect(stage).toHaveAttribute('data-mode','paused');
 await page.locator('#garden-play').click();await expect.poll(()=>stage.getAttribute('data-count').then(Number)).toBeGreaterThan(Number(stopped));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await stage.getAttribute('data-count');await page.waitForTimeout(200);await expect(stage).toHaveAttribute('data-count',hidden!);
 await page.evaluate(()=>{delete(document as Document&{hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>stage.getAttribute('data-count').then(Number)).toBeGreaterThan(Number(hidden));
 const frozen=await page.locator('#garden-total').inputValue();await page.locator('#garden-lesson').click();await page.locator('#garden-play').click();await expect.poll(()=>stage.getAttribute('data-count').then(Number)).toBeGreaterThan(6);await page.locator('#garden-lesson').click();await expect(page.locator('#garden-total')).toHaveValue(frozen);await expect(stage).toHaveAttribute('data-mode','drawing');
 await page.locator('#garden-complete').click();await page.locator('#garden-restart').click();await expect(stage).toHaveAttribute('data-mode','drawing');await page.emulateMedia({reducedMotion:'reduce'});await expect(stage).toHaveAttribute('data-mode','paused');
 // The center is unchanged when an outer point is added: fixed framing and fixed existing colors.
 await page.locator('#garden-restart').click();for(let n=0;n<30;n++)await page.locator('#garden-next').click();
 await page.evaluate(()=>scrollTo(0,0));const box=(await page.locator('canvas').boundingBox())!,clip={x:box.x+box.width/2-24,y:box.y+box.height/2-24,width:48,height:48};const center=await page.screenshot({clip});await page.locator('#garden-next').click();await expect(stage).toHaveAttribute('data-count','31');await page.evaluate(()=>scrollTo(0,0));expect((await page.screenshot({clip})).equals(center)).toBe(true);
});

test('garden resizes sharply and releases old GPU contexts, observers and callbacks',async({page})=>{
 await page.addInitScript(()=>{
  const observers=new Set<ResizeObserver>(),pending=new Set<number>(),Original=ResizeObserver,request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window);
  (window as Window&{gardenResources?:unknown}).gardenResources={observers,pending};
  window.ResizeObserver=class extends Original{observe(...args:Parameters<ResizeObserver['observe']>){observers.add(this);super.observe(...args);}disconnect(){observers.delete(this);super.disconnect();}};
  window.requestAnimationFrame=callback=>{const id=request(t=>{pending.delete(id);callback(t);});pending.add(id);return id;};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
 });
 await page.emulateMedia({reducedMotion:'reduce'});await page.setViewportSize({width:375,height:900});await page.goto('/');await page.locator('#experiment').selectOption('garden');
 for(const width of [1280,390,375,1280]){
  const old=await page.locator('canvas').elementHandle();await page.setViewportSize({width,height:900});
  await expect.poll(()=>old!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(true);await old!.dispose();await expect(page.locator('canvas')).toHaveCount(1);
  const sizes=await page.locator('canvas').evaluate(el=>({actual:(el as HTMLCanvasElement).width,expected:Math.floor(el.parentElement!.clientWidth*Math.min(devicePixelRatio,2,1600/el.parentElement!.clientWidth,1600/el.parentElement!.clientHeight))}));expect(sizes.actual).toBe(sizes.expected);
  expect((await page.locator('canvas').screenshot()).length).toBeGreaterThan(10000);
 }
 for(let i=0;i<3;i++){
  await page.locator('#garden-lesson').click();await page.locator('#garden-lesson').click();
  const old=await page.locator('canvas').elementHandle();await page.locator('#experiment').selectOption('fractal');await expect.poll(()=>old!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(true);await old!.dispose();await expect(page.locator('#stage canvas')).toHaveCount(1);
  await page.locator('#tab-structures').click();await page.locator('[data-formula=length] .visual-toggle').click();await expect(page.locator('.visual-caption')).toBeVisible();await page.locator('#experiment').selectOption('harmonograph');await expect(page.locator('#harm-stage canvas')).toHaveCount(1);await page.locator('#harm-lesson-start').click();await expect(page.locator('#lesson-panel')).toBeVisible();await page.locator('#experiment').selectOption('garden');
  await expect.poll(()=>page.evaluate(()=>{const r=(window as Window&{gardenResources:{observers:Set<unknown>;pending:Set<number>}}).gardenResources;return{observers:r.observers.size,pending:r.pending.size};})).toEqual({observers:1,pending:0});
 }
});

test('garden handles a central point, the first reference direction and the measured point cap',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#experiment').selectOption('garden');const stage=page.locator('#garden-stage');
 await page.locator('#garden-total').fill('1');await page.locator('#garden-lesson').click();await page.locator('[data-garden-step="2"]').click();await expect(stage).toHaveAttribute('data-count','1');await expect(page.locator('.garden-arc')).toHaveCount(0);await expect(page.locator('.garden-overlay')).toContainText('点0は中心');
 await page.locator('#garden-lesson').click();await page.locator('#garden-total').fill('2');await page.locator('#garden-lesson').click();await page.locator('[data-garden-step="2"]').click();await expect(page.locator('.garden-overlay')).toContainText('θ₀=0');const line=page.locator('.garden-previous');expect(Number(await line.getAttribute('x2'))).toBeGreaterThan(Number(await line.getAttribute('x1')));expect(await line.getAttribute('y1')).toBe(await line.getAttribute('y2'));
 for(const angle of ['0','360']){await page.locator('#garden-angle-number').fill(angle);await expect(stage).toHaveAttribute('data-count','2');await expect(page.locator('.garden-arc')).toHaveAttribute('d',/^M/);await expect(page.locator('#garden-coordinates')).not.toContainText('NaN');}
 await page.locator('#garden-angle-number').fill('90');await page.keyboard.press('Escape');await expect(page.locator('#garden-angle-number')).toHaveValue(String(GOLDEN_ANGLE));await expect(page.locator('#garden-angle-number')).toBeFocused();
 await page.locator('#garden-lesson').click();await page.locator('#garden-angle-number').fill('361');await page.keyboard.press('Escape');await expect(page.locator('#garden-angle-number')).toHaveValue(String(GOLDEN_ANGLE));await expect(page.locator('#garden-error')).toBeHidden();
 await page.locator('#garden-lesson').click();await page.locator('.garden-formula').first().focus();await page.keyboard.press('Escape');await expect(page.locator('#garden-lesson')).toBeFocused();
 await page.locator('#garden-angle-number').fill('137.1');await page.locator('[data-garden-preset=golden]').click();await expect(page.locator('#garden-angle-number')).toHaveValue(String(GOLDEN_ANGLE));
 await page.locator('#garden-total').fill('3000');await expect(stage).toHaveAttribute('data-count','3000');expect((await page.locator('canvas').screenshot()).length).toBeGreaterThan(10000);
});
