import {test,expect} from '@playwright/test';
import {lorenzDefaults,lorenzRK4} from '../src/lorenz';

for(const width of [1280,390,375])for(const colorScheme of ['dark','light'] as const)test(`lorenz controls, equations and lessons ${width}px ${colorScheme}`,async({browser})=>{
 test.setTimeout(60000);
 const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<750,deviceScaleFactor:width<750?2:1,reducedMotion:'reduce',colorScheme}),page=await context.newPage();
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#experiment').selectOption('lorenz');
 const stage=page.locator('#lorenz-stage');await expect(stage).toHaveAttribute('data-mode','complete');await expect(stage).toHaveAttribute('data-settings',JSON.stringify(lorenzDefaults));
 const image=await page.locator('canvas').screenshot();expect(image.length).toBeGreaterThan(12000);
 await page.locator('#lorenz-preset').selectOption('parameter');await expect(page.locator('#lorenz-applied')).toContainText('ρ=14');expect((await page.locator('canvas').screenshot()).equals(image)).toBe(false);
 await page.locator('#lorenz-preset').selectOption('comparison');await expect(page.locator('#lorenz-distance')).toContainText('破線・菱形');
 await page.locator('#lorenz-restart').click();await expect(stage).toHaveAttribute('data-index','0');await expect(stage).toHaveAttribute('data-mode','paused');await expect.poll(()=>stage.getAttribute('data-distance').then(Number)).toBeCloseTo(lorenzDefaults.delta,12);
 await page.locator('#lorenz-step').click();await expect(stage).toHaveAttribute('data-index','1');await expect(stage).toHaveAttribute('data-point',JSON.stringify(lorenzRK4({x:1,y:1,z:1},lorenzDefaults)));
 for(const id of ['sigma','rho','beta','x','y','z','delta']){const button=page.locator(`[data-symbol="${id}"]`).first();if(width<750)await button.tap();else await button.hover();await expect(stage).toHaveAttribute('data-guide',id);await expect(button).toHaveAttribute('aria-pressed','true');await expect(page.locator('#lorenz-annotation')).not.toBeEmpty();}
 await stage.focus();const rotation=await stage.getAttribute('data-rotation');await page.keyboard.press('ArrowRight');await expect(stage).not.toHaveAttribute('data-rotation',rotation!);await page.locator('#lorenz-view-reset').click();await expect(stage).toHaveAttribute('data-rotation',rotation!);
 const canvas=page.locator('canvas');await canvas.scrollIntoViewIfNeeded();const box=(await canvas.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+40,box.y+box.height/2+20);await page.mouse.up();await expect(stage).not.toHaveAttribute('data-rotation',rotation!);await page.locator('#lorenz-view-reset').click();
 await page.locator('#lorenz-zoom-in').click();await expect(stage).not.toHaveAttribute('data-zoom','1');await page.locator('#lorenz-view-reset').click();await expect(stage).toHaveAttribute('data-zoom','1');
 await page.locator('#lorenz-lesson-toggle').click();
 for(let i=0;i<4;i++){await page.locator(`button[data-lesson="${i}"]`).click();await expect(stage).toHaveAttribute('data-lesson',String(i+1));await expect(page.locator('#lorenz-lesson-text')).not.toBeEmpty();if(i===2)await expect(stage).toHaveAttribute('data-index','0');}
 await expect(stage).toHaveAttribute('data-mode','complete');await page.locator('#lorenz-lesson-toggle').click();await expect(stage).toHaveAttribute('data-index','1');await expect(stage).toHaveAttribute('data-mode','paused');
 await page.locator('#lorenz-lesson-toggle').click();await page.locator('button[data-lesson="1"]').focus();await page.keyboard.press('Escape');await expect(page.locator('#lorenz-lesson-toggle')).toBeFocused();await expect(page.locator('#lorenz-lesson')).toBeHidden();await expect(stage).toHaveAttribute('data-index','1');
 await page.locator('#lorenz-shape summary').click();const old=await stage.getAttribute('data-settings');await page.locator('#lorenz-rho').fill('500');await page.locator('#lorenz-form button').click();await expect(page.locator('#lorenz-error')).toContainText('未適用');await expect(stage).toHaveAttribute('data-settings',old!);await expect(page.locator('#lorenz-applied')).toContainText('ρ=28');
 await page.locator('#lorenz-rho').fill('');await page.locator('#lorenz-form button').click();await expect(page.locator('#lorenz-error')).toContainText('未適用');await expect(stage).toHaveAttribute('data-settings',old!);
 await page.locator('#lorenz-rho').fill('20');await page.locator('#lorenz-form button').click();await expect(page.locator('#lorenz-error')).toBeHidden();await expect(stage).toHaveAttribute('data-index','0');await expect(page.locator('#lorenz-applied')).toContainText('ρ=20');
 await page.locator('#lorenz-defaults').click();await expect(stage).toHaveAttribute('data-settings',JSON.stringify(lorenzDefaults));await page.locator('#lorenz-complete').click();
 if(process.env.LORENZ_CAPTURE&&test.info().project.name==='chromium'&&colorScheme==='dark'&&width!==390)await page.locator('main').screenshot({path:`docs/lorenz/standard-${width}.png`});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);await context.close();
});

test('lorenz clock, pause, speed, hidden tab and reduced motion',async({page})=>{
 await page.goto('/');await page.locator('#experiment').selectOption('lorenz');const stage=page.locator('#lorenz-stage');await expect.poll(()=>stage.getAttribute('data-index').then(Number)).toBeGreaterThan(2);
 await page.locator('#lorenz-play').click();await expect(stage).toHaveAttribute('data-mode','paused');const frozen=await stage.getAttribute('data-index');await page.waitForTimeout(150);await expect(stage).toHaveAttribute('data-index',frozen!);
 await page.locator('#lorenz-rate').fill('8');await expect(stage).toHaveAttribute('data-index',frozen!);await page.locator('#lorenz-play').click();await expect.poll(()=>stage.getAttribute('data-index').then(Number)).toBeGreaterThan(Number(frozen));
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await stage.getAttribute('data-index');await page.waitForTimeout(200);await expect(stage).toHaveAttribute('data-index',hidden!);
 await page.evaluate(()=>{delete(document as Document&{hidden?:boolean}).hidden;document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(()=>stage.getAttribute('data-index').then(Number)).toBeGreaterThan(Number(hidden));
 await page.emulateMedia({reducedMotion:'reduce'});await expect(stage).toHaveAttribute('data-mode','paused');await page.locator('#lorenz-complete').click();await page.locator('#lorenz-play').click();await expect(stage).toHaveAttribute('data-mode','drawing');
 await page.locator('#lorenz-shape summary').click();await page.locator('#lorenz-points').fill('1000');await page.locator('#lorenz-form button').click();await expect(stage).toHaveAttribute('data-mode','paused');await page.locator('#lorenz-play').click();await expect(stage).toHaveAttribute('data-mode','complete');await expect(page.locator('#lorenz-play')).toHaveAttribute('aria-pressed','true');
});

test('lorenz releases contexts, observers, frames and restores initial state on remount',async({page})=>{
 await page.addInitScript(()=>{const observers=new Set<ResizeObserver>(),pending=new Set<number>(),Original=ResizeObserver,request=requestAnimationFrame.bind(window),cancel=cancelAnimationFrame.bind(window);(window as any).lorenzResources={observers,pending};window.ResizeObserver=class extends Original{observe(...args:Parameters<ResizeObserver['observe']>){observers.add(this);super.observe(...args);}disconnect(){observers.delete(this);super.disconnect();}};window.requestAnimationFrame=callback=>{const id=request(t=>{pending.delete(id);callback(t);});pending.add(id);return id;};window.cancelAnimationFrame=id=>{pending.delete(id);cancel(id);};});
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#experiment').selectOption('lorenz');
 for(const width of [375,1280,390]){const old=await page.locator('canvas').elementHandle();await page.setViewportSize({width,height:950});await expect.poll(()=>old!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(true);await old!.dispose();expect((await page.locator('canvas').screenshot()).length).toBeGreaterThan(12000);}
 for(const work of ['fractal','harmonograph','garden','knot']){const old=await page.locator('canvas').elementHandle();await page.locator('#experiment').selectOption(work);await expect.poll(()=>old!.evaluate(el=>(el as HTMLCanvasElement).getContext('webgl2')!.isContextLost())).toBe(true);await old!.dispose();await expect(page.locator('canvas')).toHaveCount(1);await page.locator('#experiment').selectOption('lorenz');await expect(page.locator('#lorenz-stage')).toHaveAttribute('data-settings',JSON.stringify(lorenzDefaults));await expect.poll(()=>page.evaluate(()=>{const r=(window as any).lorenzResources;return{observers:r.observers.size,pending:r.pending.size};})).toEqual({observers:1,pending:0});}
});

test('lorenz numerical refinement and bounded sampling measurements',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const url='/src/lorenz.ts',m=await import(/* @vite-ignore */ url),s=m.lorenzDefaults;
  const solve=(h:number)=>{let p={x:1,y:1,z:1};for(let i=0;i<Math.round(1/h);i++)p=m.lorenzRK4(p,s,h);return p;};
  const coarse=solve(.005),fine=solve(.0025),finer=solve(.00125),distance=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
  const timings:Record<string,number[]>={};
  for(const [name,config] of [['standard',s],['maxComparison',{...s,points:24000,compare:true}]] as const){const times=[];for(let i=0;i<7;i++){const start=performance.now();m.sampleLorenz(config);times.push(performance.now()-start);}timings[name]=times;}
  return{coarse,fine,finer,refinementDistance:distance(coarse,fine),nextRefinementDistance:distance(fine,finer),timings,userAgent:navigator.userAgent};
 });
 expect(result.refinementDistance).toBeLessThan(.0001);expect(result.refinementDistance/result.nextRefinementDistance).toBeGreaterThan(12);expect(result.refinementDistance/result.nextRefinementDistance).toBeLessThan(20);
 console.log('LORENZ_MEASUREMENTS',JSON.stringify(result));await test.info().attach('numerical-and-cpu-measurements',{body:JSON.stringify(result,null,2),contentType:'application/json'});
});
