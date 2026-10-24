import {test,expect} from '@playwright/test';
import {knotDefaults,knotPoint,knotPresets,TAU} from '../src/knot';

for(const width of [1280,390,375])for(const colorScheme of ['dark','light'] as const)test(`knot geometry, guides and controls ${width}px ${colorScheme}`,async({browser})=>{
 test.setTimeout(60000);
 const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:width<750?2:1,hasTouch:width<750,reducedMotion:'reduce',colorScheme}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});await page.goto('/');await page.locator('#experiment').selectOption('knot');
 const stage=page.locator('#knot-stage');await expect(stage).toHaveAttribute('data-mode','complete');await expect(stage).toHaveAttribute('data-settings',JSON.stringify(knotDefaults));
 const images:Buffer[]=[];
 for(const preset of knotPresets){
  await page.locator('#knot-preset').selectOption(preset.id);await expect(stage).toHaveAttribute('data-mode','complete');
  const image=await page.locator('canvas').screenshot();expect(image.length).toBeGreaterThan(10000);for(const previous of images)expect(image.equals(previous)).toBe(false);images.push(image);
  if(process.env.KNOT_CAPTURE&&width===1280&&colorScheme==='dark')await page.locator('main').screenshot({path:`docs/knot/${preset.id}-1280.png`});
 }
 await page.locator('#knot-preset').selectOption('trefoil');await page.locator('#knot-math summary').click();await page.locator('#knot-position').fill('0.173');await expect(stage).toHaveAttribute('data-mode','paused');
 const segments=Number(await stage.getAttribute('data-samples'))-1,index=Math.floor(0.173*segments),t=index/segments*TAU,p=knotPoint(knotDefaults,t);
 await expect(stage).toHaveAttribute('data-index',String(index));
 await expect(page.locator('#knot-current')).toHaveText(`t ≈ ${Number(t.toFixed(4))} rad / 2π · P ≈ (${Number(p.x.toFixed(4))}, ${Number(p.y.toFixed(4))}, ${Number(p.z.toFixed(4))})`);
 const plain=await page.locator('canvas').screenshot();
 for(const id of ['major','minor','R','r','p','q']){
  const button=page.locator(`[data-knot-guide="${id}"] button`);if(width<750)await button.tap();else await button.click();
  await expect(button).toHaveAttribute('aria-pressed','true');await expect(stage).toHaveAttribute('data-guide',id);await expect(page.locator('#knot-guide-panel')).toBeVisible();await expect(page.locator('.knot-label:not([hidden])')).toHaveCount(3);
  await expect(page.locator('#knot-guide-values')).toContainText('OC=R=3、CP=r=1');await expect(stage).toHaveAttribute('data-index',String(index));expect((await page.locator('canvas').screenshot()).equals(plain)).toBe(false);
  if(id==='p'||id==='q'||id==='R'||id==='r')await expect(page.locator(`[data-knot-coefficient="${id}"].knot-selected`).first()).toBeVisible();
 }
 await page.locator('#knot-guide-clear').focus();await page.keyboard.press('Escape');await expect(page.locator('#knot-guide-panel')).toBeHidden();await expect(page.locator('[data-knot-guide="q"] button')).toBeFocused();
 await page.keyboard.press('Enter');await expect(stage).toHaveAttribute('data-guide','q');await stage.focus();await page.keyboard.press('Escape');await expect(stage).toBeFocused();await expect(stage).toHaveAttribute('data-guide','');
 await page.locator('[data-knot-step="2"]').click();await expect(page.locator('#knot-lesson-text')).toContainText('同じt');await expect(stage).toHaveAttribute('data-guide','minor');
 await page.locator('#knot-torus').check();await expect(stage).toHaveAttribute('data-torus','true');
 if(process.env.KNOT_CAPTURE&&width===375&&colorScheme==='light')await page.locator('.stage-column').screenshot({path:'docs/knot/guide-375-light.png'});
 const rotation=await stage.getAttribute('data-rotation');await stage.focus();await page.keyboard.press('ArrowRight');await expect(stage).not.toHaveAttribute('data-rotation',rotation!);await page.locator('#knot-view-reset').click();await expect(stage).toHaveAttribute('data-rotation',rotation!);
 const canvas=page.locator('canvas');await canvas.hover();const box=(await canvas.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+40,box.y+box.height/2+20);await page.mouse.up();await expect(stage).not.toHaveAttribute('data-rotation',rotation!);await page.locator('#knot-view-reset').click();await expect(stage).toHaveAttribute('data-rotation',rotation!);
 // A whole candidate setting is rejected without silently correcting any integer.
 await page.locator('#knot-shape summary').click();await page.locator('#knot-q').fill('4');await page.locator('#knot-form button').click();await expect(page.locator('#knot-error')).toContainText('互いに素');await expect(page.locator('#knot-q')).toHaveValue('4');await expect(stage).toHaveAttribute('data-settings',JSON.stringify(knotDefaults));
 await page.locator('#knot-q').fill('3');await page.locator('#knot-R').fill('1');await page.locator('#knot-form button').click();await expect(page.locator('#knot-error')).toContainText('R > r');
 await page.locator('#knot-R').fill('1.01');await page.locator('#knot-form button').click();await expect(page.locator('#knot-error')).toContainText('表示精度');await expect(stage).toHaveAttribute('data-settings',JSON.stringify(knotDefaults));
 await page.locator('#knot-R').fill('3');await page.locator('#knot-p').fill('3');await page.locator('#knot-q').fill('5');await page.locator('#knot-r').fill('1.2');await page.locator('#knot-form button').click();await expect(page.locator('#knot-error')).toBeHidden();await expect(stage).toHaveAttribute('data-settings',JSON.stringify({R:3,r:1.2,p:3,q:5}));await expect(stage).toHaveAttribute('data-index','0');await expect(page.locator('[data-knot-coefficient="r"]').first()).toHaveText('1.2');
 await page.locator('#knot-defaults').click();await expect(stage).toHaveAttribute('data-settings',JSON.stringify(knotDefaults));
 await page.locator('#knot-complete').click();await page.locator('#knot-restart').click();await expect(stage).toHaveAttribute('data-index','0');await expect(stage).toHaveAttribute('data-mode','paused');
 await page.locator('#knot-quality').selectOption('line');await page.locator('#knot-torus').uncheck();
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('#knot-complete').click();await expect(stage).toHaveAttribute('data-mode','complete');expect(errors).toEqual([]);await context.close();
});

test('knot clock, sampling, visibility, replay and reduced motion',async({page})=>{
 await page.goto('/');await page.locator('#experiment').selectOption('knot');const stage=page.locator('#knot-stage');
 await expect.poll(()=>stage.getAttribute('data-index').then(Number)).toBeGreaterThan(5);await page.locator('#knot-play').click();await expect(stage).toHaveAttribute('data-mode','paused');const frozen=await stage.getAttribute('data-index'),samples=await stage.getAttribute('data-samples');
 await page.waitForTimeout(150);await expect(stage).toHaveAttribute('data-index',frozen!);await page.locator('#knot-rate').fill('2');await expect(stage).toHaveAttribute('data-index',frozen!);await expect(stage).toHaveAttribute('data-samples',samples!);
 await page.locator('#knot-play').click();await expect.poll(()=>stage.getAttribute('data-index').then(Number)).toBeGreaterThan(Number(frozen));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await stage.getAttribute('data-index');await page.waitForTimeout(200);await expect(stage).toHaveAttribute('data-index',hidden!);
 await page.evaluate(()=>{delete(document as Document&{hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>stage.getAttribute('data-index').then(Number)).toBeGreaterThan(Number(hidden));
 await page.locator('#knot-complete').click();await expect(stage).toHaveAttribute('data-t',String(TAU));await expect(stage).toHaveAttribute('data-mode','complete');await page.locator('#knot-restart').click();await expect(stage).toHaveAttribute('data-mode','drawing');
 await page.emulateMedia({reducedMotion:'reduce'});await expect(stage).toHaveAttribute('data-mode','paused');const stopped=await stage.getAttribute('data-index');await page.waitForTimeout(150);await expect(stage).toHaveAttribute('data-index',stopped!);
 await page.locator('#experiment').selectOption('garden');await expect(page.locator('#garden-stage')).toHaveAttribute('data-count','1200');await page.locator('#experiment').selectOption('knot');await expect(stage).toHaveAttribute('data-mode','complete');await expect(stage).toHaveAttribute('data-settings',JSON.stringify(knotDefaults));
});

test('knot resize and work switching release contexts, observers and callbacks',async({page})=>{
 await page.addInitScript(()=>{
  const observers=new Set<ResizeObserver>(),pending=new Set<number>(),Original=ResizeObserver,request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window);
  (window as Window&{knotResources?:unknown}).knotResources={observers,pending};
  window.ResizeObserver=class extends Original{observe(...args:Parameters<ResizeObserver['observe']>){observers.add(this);super.observe(...args);}disconnect(){observers.delete(this);super.disconnect();}};
  window.requestAnimationFrame=callback=>{const id=request(t=>{pending.delete(id);callback(t);});pending.add(id);return id;};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};
 });
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#experiment').selectOption('knot');
 for(const width of [375,1280,390]){
  const old=await page.locator('canvas').elementHandle();await page.setViewportSize({width,height:950});await expect.poll(()=>old!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(true);await old!.dispose();
  const sizes=await page.locator('canvas').evaluate(el=>({actual:(el as HTMLCanvasElement).width,expected:Math.floor(el.parentElement!.clientWidth*Math.min(devicePixelRatio,1.75,1600/el.parentElement!.clientWidth,1600/el.parentElement!.clientHeight))}));expect(sizes.actual).toBe(sizes.expected);expect((await page.locator('canvas').screenshot()).length).toBeGreaterThan(10000);
 }
 for(const work of ['fractal','harmonograph','garden']){
  const old=await page.locator('canvas').elementHandle();await page.locator('#experiment').selectOption(work);await expect.poll(()=>old!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(true);await old!.dispose();await expect(page.locator('canvas')).toHaveCount(1);
  await page.locator('#experiment').selectOption('knot');await expect.poll(()=>page.evaluate(()=>{const r=(window as Window&{knotResources:{observers:Set<unknown>;pending:Set<number>}}).knotResources;return{observers:r.observers.size,pending:r.pending.size};})).toEqual({observers:1,pending:0});
 }
});
