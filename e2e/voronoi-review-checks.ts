import {expect,test,type Page} from '@playwright/test';
const canvas=(p:Page)=>p.locator('#vc-canvas');
const reference=(p:Page)=>p.locator('#vc-reference-canvas');
async function frames(page:Page){await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));}
async function ready(page:Page){await expect.poll(()=>canvas(page).evaluate(c=>c.dataset.drawStatus==='submitted'&&c.dataset.revision===c.dataset.renderedRevision)).toBe(true);}
const errors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const list:string[]=[];errors.set(page,list);page.on('pageerror',e=>list.push(e.message));await page.goto('./');await page.locator('#experiment').selectOption('voronoi');await ready(page);});
test.afterEach(async({page})=>{expect(errors.get(page)).toEqual([]);});
async function pair(page:Page){
 await page.locator('#vc-preset').selectOption('basic');
 for(const id of ['4','3']){await page.locator('#vc-selected').selectOption(id);await page.locator('#vc-delete').click();}
 for(const [id,x] of [['1','0.1'],['2','0.5']]){await page.locator('#vc-selected').selectOption(id);await page.locator('#vc-point-x').fill(x);await page.locator('#vc-point-y').fill('0.4');await page.locator('#vc-move').click();}await ready(page);
}
async function pixel(page:Page,x=.35){return canvas(page).evaluate((c,x)=>{const context=c.getContext('2d')!,s=c.width;return Array.from(context.getImageData(Math.floor(s*(.045+.91*x)),Math.floor(s*(.955-.91*.2)),1,1).data);},x);}
test('P2-01 RED→GREEN: a display tie must not become mathematical membership',async({page})=>{
 await page.locator('#vc-lesson').click();await ready(page);
 for(const [x,owners,selected] of [['0.5000000000001','p2','不成立'],['0.4999999999999','p1','成立'],['0.5','p1・p2','成立（等距離境界）']] as const){
  await page.locator('#vc-probe-x').fill(x);await page.locator('#vc-probe-y').fill('0.5');await page.locator('#vc-probe-form button').click();await ready(page);
  if(x==='0.5000000000001')await expect(page.locator('#vc-membership')).not.toContainText('距離条件は成立する候補です');
  await expect(page.locator('#vc-membership')).toContainText(`選択中V1の数学的所属：${selected}`);
  await expect(page.locator('#vc-membership')).toContainText(`数学的最近点：${owners}`);
  await expect(page.locator('#vc-membership')).toContainText('表示上の所属：p1');
  await expect(page.locator('#vc-membership')).toContainText('表示候補：p1・p2');
 }
});
test('P3-01 RED→GREEN: zero width cannot advance completed drawing records',async({page})=>{
 const before=await canvas(page).evaluate(c=>({count:c.dataset.renderCount,revision:c.dataset.renderedRevision,image:c.toDataURL()}));
 await canvas(page).evaluate(c=>c.style.width='0px');await frames(page);
 await page.evaluate(()=>{for(let i=0;i<10;i++)document.querySelector<HTMLButtonElement>('#vc-step')!.click();});await frames(page);
 const skipped=await canvas(page).evaluate(c=>({count:c.dataset.renderCount,revision:c.dataset.renderedRevision,requested:c.dataset.revision,image:c.toDataURL()}));
 expect(skipped.image).toBe(before.image);expect(skipped.count).toBe(before.count);expect(skipped.revision).toBe(before.revision);expect(skipped.revision).not.toBe(skipped.requested);
 await canvas(page).evaluate(c=>c.style.width='100%');await ready(page);await expect(canvas(page)).toHaveAttribute('data-rendered-step','10');
 expect(await canvas(page).evaluate(c=>c.toDataURL())).not.toBe(before.image);
});
test('P3-01: actual pixels follow the hand-calculated latest split after resize',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await pair(page);
 const before=await pixel(page);expect(before[1]).toBeGreaterThan(before[0]); // x=.35 is right of the original split x=.3: ID2.
 await canvas(page).evaluate(c=>c.style.width='0px');await page.locator('#vc-step').click();await frames(page);
 expect(await pixel(page)).toEqual(before);await expect(canvas(page)).toHaveAttribute('data-draw-status','zero-size');
 await canvas(page).evaluate(c=>c.style.width='100%');await ready(page);
 const sites=await canvas(page).evaluate(c=>JSON.parse(c.dataset.state!).sites);expect(sites[0].x).toBeCloseTo(.15,12);expect(sites[1].x).toBeCloseTo(.65,12);
 const after=await pixel(page);expect(after[0]).toBeGreaterThan(after[1]); // New split x=.4: the same pixel now belongs to ID1.
 for(const width of [390,320,1280]){await page.setViewportSize({width,height:1000});await frames(page);await ready(page);expect((await pixel(page))[0]).toBeGreaterThan((await pixel(page))[1]);}
});
test('P3-01: comparison completion is independent and records its own source step',async({page})=>{
 await pair(page);await frames(page);
 const count=await reference(page).getAttribute('data-render-count');
 await page.locator('#vc-compare').uncheck();await page.locator('#vc-step').click();await ready(page);
 await expect(reference(page)).toHaveAttribute('data-draw-status','disabled');await expect(reference(page)).toHaveAttribute('data-render-count',count!);
 await page.locator('#vc-compare').check();await frames(page);await expect(reference(page)).toHaveAttribute('data-draw-status','submitted');await expect(reference(page)).toHaveAttribute('data-rendered-step','0');
 await page.locator('#vc-reference').selectOption('previous');await page.locator('#vc-step').click();await ready(page);await expect(reference(page)).toHaveAttribute('data-rendered-step','1');
 const previousCount=await reference(page).getAttribute('data-render-count');await reference(page).evaluate(c=>c.style.width='0px');await page.locator('#vc-step').click();await ready(page);
 await expect(canvas(page)).toHaveAttribute('data-rendered-step','3');await expect(reference(page)).toHaveAttribute('data-draw-status','zero-size');await expect(reference(page)).toHaveAttribute('data-render-count',previousCount!);
 await reference(page).evaluate(c=>c.style.width='100%');await frames(page);
 await expect.poll(()=>reference(page).getAttribute('data-rendered-revision')).toBe(await canvas(page).getAttribute('data-revision'));
 await expect(reference(page)).toHaveAttribute('data-rendered-step','2');
 expect(await reference(page).evaluate(c=>JSON.parse(c.dataset.renderedSites!))).toEqual(await canvas(page).evaluate(c=>JSON.parse(c.dataset.state!).previous));
});
test('P3-01: context loss and thrown commands preserve last successful completion',async({page})=>{
 await page.emulateMedia({colorScheme:'dark'});await pair(page);const count=await canvas(page).getAttribute('data-render-count');
 await canvas(page).evaluate(c=>{(c.getContext('2d')! as CanvasRenderingContext2D&{isContextLost:()=>boolean}).isContextLost=()=>true;});
 await page.locator('#vc-step').click();await frames(page);await expect(canvas(page)).toHaveAttribute('data-draw-status','context-lost');await expect(canvas(page)).toHaveAttribute('data-render-count',count!);
 await canvas(page).evaluate(c=>{delete (c.getContext('2d')! as unknown as {isContextLost?:unknown}).isContextLost;c.dispatchEvent(new Event('contextrestored'));});await ready(page);expect((await pixel(page))[0]).toBeGreaterThan((await pixel(page))[1]);
 const revision=await canvas(page).getAttribute('data-rendered-revision');
 await canvas(page).evaluate(c=>{const context=c.getContext('2d')!; (window as unknown as {reviewFill:typeof context.fillRect}).reviewFill=context.fillRect;context.fillRect=()=>{throw new Error('simulated drawing failure');};});
 await page.locator('#vc-step').click();await frames(page);await expect(canvas(page)).toHaveAttribute('data-draw-status','failed');await expect(canvas(page)).toHaveAttribute('data-rendered-revision',revision!);
 await canvas(page).evaluate(c=>{c.getContext('2d')!.fillRect=(window as unknown as {reviewFill:CanvasRenderingContext2D['fillRect']}).reviewFill;c.dispatchEvent(new Event('contextrestored'));});await ready(page);
 await expect(canvas(page)).toHaveAttribute('data-rendered-step','2');const p=await pixel(page,.425);expect(p[0]).toBeGreaterThan(p[1]);
});
test('P3-01: unavailable main context never completes while comparison may paint',async({page})=>{
 await page.locator('#experiment').selectOption('fourier');
 await page.evaluate(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(...args:Parameters<typeof original>){return this.id==='vc-canvas'?null:original.apply(this,args);} as typeof original;});
 await page.locator('#experiment').selectOption('voronoi');await frames(page);
 await expect(canvas(page)).toHaveAttribute('data-draw-status','unavailable');expect(await canvas(page).getAttribute('data-rendered-revision')).toBeNull();
 await expect(reference(page)).toHaveAttribute('data-draw-status','submitted');await expect(page.locator('#vc-play')).toBeDisabled();
});
test('P3-01: old rAF cannot consume a replacement request or draw after teardown',async({page})=>{
 const before=Number(await canvas(page).getAttribute('data-render-count'));
 await page.evaluate(()=>{const w=window as unknown as {reviewRAF:typeof requestAnimationFrame;reviewFrames:FrameRequestCallback[]};w.reviewRAF=requestAnimationFrame;w.reviewFrames=[];window.requestAnimationFrame=callback=>{w.reviewFrames.push(callback);return 100000+w.reviewFrames.length;};window.cancelAnimationFrame=()=>{};document.querySelector<HTMLButtonElement>('#vc-step')!.click();Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await page.evaluate(()=>{(window as unknown as {reviewFrames:FrameRequestCallback[]}).reviewFrames[0](performance.now());});expect(Number(await canvas(page).getAttribute('data-render-count'))).toBe(before);
 await page.evaluate(()=>{(window as unknown as {reviewFrames:FrameRequestCallback[]}).reviewFrames.at(-1)!(performance.now());});await ready(page);await expect(canvas(page)).toHaveAttribute('data-rendered-step','1');
 await page.locator('#experiment').selectOption('fourier');await page.locator('#experiment').selectOption('voronoi');
 await page.evaluate(()=>{const w=window as unknown as {reviewRAF:typeof requestAnimationFrame;reviewFrames:FrameRequestCallback[]};for(const f of w.reviewFrames.slice(0,-1))f(performance.now());});expect(await canvas(page).getAttribute('data-rendered-revision')).toBeNull();
 await page.evaluate(()=>{const w=window as unknown as {reviewRAF:typeof requestAnimationFrame;reviewFrames:FrameRequestCallback[]};window.requestAnimationFrame=w.reviewRAF;w.reviewFrames.at(-1)!(performance.now());});await ready(page);await expect(canvas(page)).toHaveAttribute('data-rendered-step','0');
});
test('P3-01: a lesson can start and restore while drawing is unavailable',async({page})=>{
 const before=await canvas(page).evaluate(c=>({state:c.dataset.state,image:c.toDataURL(),count:c.dataset.renderCount}));
 await canvas(page).evaluate(c=>c.style.width='0px');await page.locator('#vc-lesson').click();await page.locator('[data-vc-lesson="2"]').click();await page.locator('#vc-step').click();await page.emulateMedia({reducedMotion:'reduce'});await frames(page);
 await expect(canvas(page)).toHaveAttribute('data-render-count',before.count!);await page.keyboard.press('Escape');
 expect(await canvas(page).getAttribute('data-state')).toBe(before.state);await expect(page.locator('#vc-lesson')).toBeFocused();
 await canvas(page).evaluate(c=>c.style.width='100%');await ready(page);expect(await canvas(page).evaluate(c=>c.toDataURL())).toBe(before.image);
});

test('P3-01 RED→GREEN: first recovery after a dashed-distance exception matches the normal bitmap',async({page})=>{
 await page.locator('#vc-lesson').click();await page.locator('#vc-probe-x').fill('0.5000000000001');await page.locator('#vc-probe-y').fill('0.5');await page.locator('#vc-probe-form button').click();await ready(page);await frames(page);
 const before=await canvas(page).evaluate(c=>({image:c.toDataURL(),count:Number(c.dataset.renderCount)}));
 await canvas(page).evaluate(c=>{const context=c.getContext('2d')!,stroke=context.stroke;const w=window as unknown as {reviewStroke:typeof stroke;reviewThrows:number};w.reviewStroke=stroke;w.reviewThrows=0;context.stroke=function(...args:Parameters<typeof stroke>){if(this.getLineDash().length&&w.reviewThrows++===0)throw new Error('mid-distance command failure');return stroke.apply(this,args);};});
 await page.locator('#vc-probe-form button').click();await frames(page);await expect(canvas(page)).toHaveAttribute('data-draw-status','failed');await expect(canvas(page)).toHaveAttribute('data-render-count',String(before.count));
 await canvas(page).evaluate(c=>{c.getContext('2d')!.stroke=(window as unknown as {reviewStroke:CanvasRenderingContext2D['stroke']}).reviewStroke;c.dispatchEvent(new Event('contextrestored'));});await ready(page);
 await expect(canvas(page)).toHaveAttribute('data-render-count',String(before.count+1));
 // The first successful recovery must paint the correct pixels, rather than
 // needing an extra frame to remove a dash left by the failed command.
 expect(await canvas(page).evaluate(c=>c.toDataURL())===before.image).toBe(true);
});
