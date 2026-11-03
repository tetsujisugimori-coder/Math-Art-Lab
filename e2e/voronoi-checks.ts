import {expect,test,type Page} from '@playwright/test';
const c=(p:Page)=>p.locator('#vc-canvas');
const state=async(p:Page)=>JSON.parse((await c(p).getAttribute('data-state'))!);
const press=async(p:Page,id:string,key='Enter')=>{await p.locator(`#vc-${id}`).focus();await p.keyboard.press(key);};
async function point(p:Page,x:number,y:number){await p.locator('#vc-point-x').fill(String(x));await p.locator('#vc-point-y').fill(String(y));}
async function probe(p:Page,x:number,y:number){await p.locator('#vc-probe-x').fill(String(x));await p.locator('#vc-probe-y').fill(String(y));await p.locator('#vc-probe-form button').click();}
const pageErrors=new WeakMap<Page,string[]>();
test.beforeEach(async({page})=>{const errors:string[]=[];pageErrors.set(page,errors);page.on('pageerror',error=>errors.push(error.message));await page.goto('./');await page.locator('#experiment').selectOption('voronoi');});
test.afterEach(async({page})=>{expect(pageErrors.get(page)).toEqual([]);});

test('crystal: editing, invalid operations, deterministic step and reset',async({page})=>{
 await expect(c(page)).toHaveAttribute('data-step','0');await expect(c(page)).toHaveAttribute('data-count','24');await page.locator('#vc-preset').selectOption('basic');
 expect(await page.locator('[id]').evaluateAll(elements=>{const ids=elements.map(el=>el.id);return ids.length===new Set(ids).size;})).toBe(true);
 const original=(await state(page)).sites,pixels=await c(page).screenshot();await point(page,.5,.5);await press(page,'add');await expect(c(page)).toHaveAttribute('data-count','5');
 const valid=await state(page);await press(page,'add');await expect(page.locator('#vc-error')).toContainText('重複');expect((await state(page)).sites).toEqual(valid.sites);
 await point(page,1,1);await press(page,'move');expect((await state(page)).sites.find((p:{id:number})=>p.id===5)).toMatchObject({x:1,y:1});
 await press(page,'delete');expect((await state(page)).sites).toEqual(original);await expect(c(page)).toHaveAttribute('data-step','0');
 await press(page,'step');await expect(c(page)).toHaveAttribute('data-step','1');expect((await state(page)).previous).toEqual(original);expect((await c(page).screenshot()).equals(pixels)).toBe(false);
 await page.locator('#vc-reference').selectOption('previous');await expect(page.locator('#vc-reference-title')).toHaveText('直前の配置 · 0ステップ');
 await press(page,'reset');expect((await state(page)).sites).toEqual(original);expect(await c(page).screenshot()).toEqual(pixels);
 const batch=await page.evaluate(()=>{const canvas=document.querySelector<HTMLCanvasElement>('#vc-canvas')!,before=canvas.dataset.renderCount;for(let i=0;i<10;i++)document.querySelector<HTMLButtonElement>('#vc-step')!.click();return {before,after:canvas.dataset.renderCount,step:canvas.dataset.step};});
 expect(batch.step).toBe('10');expect(batch.after).toBe(batch.before);await expect(c(page)).toHaveAttribute('data-rendered-step','10');
});

test('crystal: canvas keyboard, numeric forms, presets, layers and symbols',async({page})=>{
 await page.locator('#vc-preset').selectOption('basic');await page.locator('#vc-selected').selectOption('2');const before=(await state(page)).sites[1];await c(page).focus();await page.keyboard.press('ArrowRight');expect((await state(page)).sites[1].x).toBeCloseTo(before.x+.01,12);await expect(c(page)).toBeFocused();
 await page.locator('#vc-mode').selectOption('add');await c(page).focus();await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await expect(c(page)).toHaveAttribute('data-count','5');await page.keyboard.press('Delete');await expect(c(page)).toHaveAttribute('data-count','4');
 await page.locator('#vc-mode').selectOption('observe');await c(page).focus();await page.keyboard.press('Shift+ArrowDown');expect((await state(page)).probe.y).toBeCloseTo(.46,12);
 for(const id of ['member','all','leq','norm','omega','bar','index','cell','centroid','update']){
  await press(page,'clear');const b=page.locator(`[data-vc-symbol="${id}"]`);await b.focus();const pixels=await c(page).screenshot();await page.keyboard.press('Space');await expect(b).toHaveAttribute('aria-pressed','true');await expect(page.locator('#vc-symbol-name')).not.toBeEmpty();await expect(page.locator('#vc-symbol-reading')).not.toBeEmpty();await expect(page.locator('#vc-symbol-meaning')).not.toBeEmpty();expect((await c(page).screenshot()).equals(pixels),id).toBe(false);
 }
 await expect(page.locator('#vc-symbol-name')).toContainText('等号');await press(page,'clear');
 await page.locator('[data-vc-symbol="norm"]').click();await press(page,'show-art');await expect(c(page)).toBeFocused();await page.keyboard.press('Tab');await expect(page.locator('#vc-back-symbol')).toBeFocused();await page.keyboard.press('Escape');await expect(c(page)).toBeFocused();await page.locator('[data-vc-symbol="norm"]').click();await press(page,'show-art');await press(page,'back-symbol');await expect(page.locator('[data-vc-symbol="norm"]')).toBeFocused();await press(page,'clear');
 for(const id of ['regions','edges','sites','centroids','vectors','distances','compare']){const before=(await state(page)).layers[id];await press(page,id,'Space');expect((await state(page)).layers[id]).toBe(!before);}
 await page.locator('#vc-preset').focus();await page.keyboard.press('End');await page.keyboard.press('Enter');await expect(page.locator('#vc-preset')).toHaveValue('cluster');
});

test('crystal: all four lesson stages, distances, centroid and complete snapshot restoration',async({page})=>{
 await page.locator('#vc-preset').selectOption('cluster');await press(page,'step');await page.locator('#vc-selected').selectOption('4');await page.locator('#vc-edges').uncheck();await page.locator('#vc-centroids').check();await probe(page,.33,.71);await page.locator('[data-vc-symbol="index"]').click();
 const before=await state(page),pixels=await c(page).screenshot();await press(page,'lesson');await expect(page.locator('#vc-lesson-title')).toBeFocused();await expect(c(page)).toHaveAttribute('data-count','2');await expect(page.locator('#vc-membership')).toContainText('p1・p2');
 await probe(page,.25,.5);await expect(page.locator('#vc-membership')).toContainText('表示上の所属：p1');await expect(page.locator('#vc-distance-list')).toContainText('p1: 0.00000');
 for(let i=1;i<4;i++){await page.locator(`[data-vc-lesson="${i}"]`).click();await expect(page.locator('#vc-lesson-title')).toContainText(`${i+1}.`);await expect(c(page)).toHaveAttribute('data-step','0');if(i===3){await page.locator('#vc-preset').selectOption('grid');await expect(page.locator('#vc-lesson-text')).toContainText('同じ形になる保証');}if(i>=2){await press(page,'step');await expect(c(page)).toHaveAttribute('data-step','1');}}
 await page.keyboard.press('Escape');expect(await state(page)).toEqual(before);expect(await c(page).screenshot()).toEqual(pixels);await expect(page.locator('#vc-lesson')).toBeFocused();
});

test('crystal: replay, stop, reset, switching, reduced-motion and safety restoration',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await press(page,'play');await expect.poll(async()=>(await state(page)).step).toBeGreaterThan(0);await press(page,'play');const paused=await state(page);await page.waitForTimeout(850);expect(await state(page)).toEqual(paused);
 await press(page,'play');await press(page,'lesson');await page.locator('[data-vc-lesson="3"]').click();await press(page,'close');await expect(page.locator('#vc-play')).toHaveText('一時停止');await press(page,'reset');await page.waitForTimeout(850);await expect(c(page)).toHaveAttribute('data-step','0');
 await press(page,'play');await point(page,.12,.24);await expect(page.locator('#vc-play')).toHaveText('再生');await page.waitForTimeout(850);await expect(page.locator('#vc-point-x')).toHaveValue('0.12');await press(page,'move');expect((await state(page)).sites.find((p:{id:number})=>p.id===1)).toMatchObject({x:.12,y:.24});
 await press(page,'play');await press(page,'lesson');await page.emulateMedia({reducedMotion:'reduce'});await press(page,'close');await expect(page.locator('#vc-play')).toHaveText('再生');
 await page.emulateMedia({reducedMotion:'no-preference'});await press(page,'play');await page.locator('#experiment').selectOption('fourier');await page.locator('#experiment').selectOption('voronoi');await page.waitForTimeout(850);await expect(c(page)).toHaveAttribute('data-step','0');
});

test('crystal: hidden document pauses and forbids lesson autoplay restoration',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await press(page,'play');await press(page,'lesson');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
 await press(page,'close');await expect(page.locator('#vc-play')).toHaveText('再生');await page.waitForTimeout(850);await expect(c(page)).toHaveAttribute('data-step','0');
});

test('crystal: old scheduled callbacks cannot overwrite reset, lesson or a new mount',async({page})=>{
 await page.evaluate(()=>{const w=window as typeof window&{crystalTimers:(()=>void)[];crystalFrames:FrameRequestCallback[]};w.crystalTimers=[];w.crystalFrames=[];window.setTimeout=((callback:()=>void)=>{w.crystalTimers.push(callback);return 100000+w.crystalTimers.length;}) as typeof setTimeout;window.clearTimeout=()=>{};const native=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>{w.crystalFrames.push(callback);return native(callback);};});
 const stale=()=>page.evaluate(()=>{const w=window as typeof window&{crystalTimers:(()=>void)[];crystalFrames:FrameRequestCallback[]};for(const f of [...w.crystalTimers])f();for(const f of [...w.crystalFrames])f(performance.now());});
 await press(page,'play');await press(page,'reset');await stale();await expect(c(page)).toHaveAttribute('data-step','0');
 await press(page,'play');await press(page,'lesson');await stale();await expect(c(page)).toHaveAttribute('data-count','2');await expect(c(page)).toHaveAttribute('data-step','0');await press(page,'close');
 await page.locator('#experiment').selectOption('fourier');await page.locator('#experiment').selectOption('voronoi');await stale();await expect(c(page)).toHaveAttribute('data-step','0');
});

test('crystal: known diagram aligns model, coordinates, bisector and raster',async({page})=>{
 await press(page,'lesson');await press(page,'clear');await page.locator('#vc-distances').uncheck();await page.locator('#vc-mode').evaluate(el=>{(el as HTMLSelectElement).disabled=false;(el as HTMLSelectElement).value='select';el.dispatchEvent(new Event('change'));});await page.locator('#vc-sites').uncheck();
 await expect.poll(()=>c(page).evaluate(el=>(el as HTMLCanvasElement).dataset.revision===(el as HTMLCanvasElement).dataset.renderedRevision)).toBe(true);
 const result=await c(page).evaluate((el:HTMLCanvasElement)=>{
  const ctx=el.getContext('2d')!,s=el.width,rgba=(x:number,y:number)=>Array.from(ctx.getImageData(Math.round(s*(.045+.91*x)),Math.round(s*(.955-.91*y)),1,1).data);
  return {left:rgba(.3,.3),right:rgba(.7,.3),boundary:rgba(.5,.3),state:JSON.parse(el.dataset.state!),cells:JSON.parse(el.dataset.cells!)};
 });
 expect(result.cells.map((cell:{area:number})=>cell.area)).toEqual([.5,.5]);expect(result.left).not.toEqual(result.right);expect(result.boundary.slice(0,3).reduce((a,b)=>a+b,0)).toBeLessThan(Math.min(result.left.slice(0,3).reduce((a,b)=>a+b,0),result.right.slice(0,3).reduce((a,b)=>a+b,0)));
 await press(page,'close');await page.locator('#vc-preset').selectOption('basic');await page.locator('#vc-mode').selectOption('observe');await c(page).scrollIntoViewIfNeeded();const box=(await c(page).boundingBox())!;await page.mouse.click(box.x+box.width*(.045+.91*.3),box.y+box.height*(.955-.91*.8));const selected=await state(page);expect(selected.probe.x).toBeCloseTo(.3,2);expect(selected.probe.y).toBeCloseTo(.8,2);
});

test('crystal: pointer drag and cancellation retain a valid configuration',async({page})=>{
 await page.locator('#vc-preset').selectOption('basic');await c(page).scrollIntoViewIfNeeded();const box=(await c(page).boundingBox())!,x=box.x+box.width*(.045+.91*.2),y=box.y+box.height*(.955-.91*.3);await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+25,y-20,{steps:3});await page.mouse.up();expect((await state(page)).sites[0].x).toBeGreaterThan(.2);expect((await state(page)).sites[0].y).toBeGreaterThan(.3);
 const before=(await state(page)).sites;
 await c(page).evaluate(el=>el.addEventListener('pointerdown',event=>{(window as typeof window&{crystalPointer:number}).crystalPointer=(event as PointerEvent).pointerId;},{once:true}));
 await page.mouse.move(x+25,y-20);await page.mouse.down();const pointerId=await page.evaluate(()=>(window as typeof window&{crystalPointer:number}).crystalPointer);
 expect(await c(page).evaluate((el,id)=>el.hasPointerCapture(id),pointerId)).toBe(true);
 await c(page).dispatchEvent('pointercancel',{pointerId});await page.mouse.move(x+50,y-40);await page.mouse.up();expect((await state(page)).sites).toEqual(before);
});

test('crystal: unavailable Canvas gives readable fallback',async({page})=>{
 await page.locator('#experiment').selectOption('fourier');await page.evaluate(()=>HTMLCanvasElement.prototype.getContext=(()=>null) as typeof HTMLCanvasElement.prototype.getContext);await page.locator('#experiment').selectOption('voronoi');await expect(page.locator('#vc-error')).toContainText('Canvas 2D');await expect(page.locator('#vc-play')).toBeDisabled();await expect(page.locator('#vc-step')).toBeDisabled();await expect(page.locator('#vc-values')).toContainText('面積');
});

test('crystal: resolution change redraws the same geometry without advancing a step',async({page})=>{
 await page.locator('#experiment').selectOption('fourier');
 await page.evaluate(()=>{
  const w=window as typeof window&{crystalResolution:MediaQueryList[]};w.crystalResolution=[];const native=window.matchMedia.bind(window);
  window.matchMedia=query=>{const result=native(query);if(query.startsWith('(resolution:'))w.crystalResolution.push(result);return result;};
 });
 await page.locator('#experiment').selectOption('voronoi');const before=await state(page);
 await page.evaluate(()=>{Object.defineProperty(window,'devicePixelRatio',{configurable:true,value:1.5});(window as typeof window&{crystalResolution:MediaQueryList[]}).crystalResolution.at(-1)!.dispatchEvent(new Event('change'));});
 await expect.poll(()=>c(page).evaluate((el:HTMLCanvasElement)=>Math.abs(el.width-1.5*el.getBoundingClientRect().width))).toBeLessThanOrEqual(.5);expect(await state(page)).toEqual(before);
});

test.describe('crystal touch and DPR',()=>{
 test.use({hasTouch:true,deviceScaleFactor:2});
 test('tap adds and selects; outside scrolling stays available',async({page})=>{
  await page.setViewportSize({width:375,height:900});await page.locator('#vc-preset').selectOption('basic');await page.locator('#vc-mode').selectOption('add');await c(page).tap({position:{x:170,y:170}});await expect(c(page)).toHaveAttribute('data-count','5');await page.locator('#vc-mode').selectOption('select');await c(page).tap({position:{x:170,y:170}});await expect(page.locator('#vc-selected')).toHaveValue('5');await page.locator('[data-vc-symbol="member"]').tap();await expect(c(page)).toHaveAttribute('data-symbol','member');
  const dimensions=await c(page).evaluate((el:HTMLCanvasElement)=>({pixels:el.width,width:el.getBoundingClientRect().width}));expect(Math.abs(dimensions.pixels-dimensions.width*2)).toBeLessThanOrEqual(.5);
  await page.evaluate(()=>window.scrollTo(0,0));await page.mouse.move(5,200);await page.mouse.wheel(0,350);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
 });
});

for(const width of [1280,390,375,320])test(`crystal: layout ${width}px dark/light 100/200 percent text`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:1000});
 for(const colorScheme of ['dark','light'] as const)for(const font of ['100%','200%']){
  await page.emulateMedia({colorScheme});await page.evaluate(font=>document.documentElement.style.fontSize=font,font);await press(page,'lesson');await page.locator('[data-vc-lesson="2"]').click();await page.locator('[data-vc-symbol="norm"]').click();
  const dimensions=await c(page).evaluate(el=>{const rect=el.getBoundingClientRect();return {w:rect.width,h:rect.height,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth};});expect(dimensions.w).toBeGreaterThan(250);expect(dimensions.w).toBeCloseTo(dimensions.h,0);expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client+1);
  const contrast=await page.locator('#vc-symbol-name').evaluate(el=>{
   const luminance=(color:string)=>{const rgb=color.match(/[\d.]+/g)!.slice(0,3).map(n=>Number(n)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
   const a=luminance(getComputedStyle(el).color),b=luminance(getComputedStyle(el.closest('.vc-panel')!).backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  });expect(contrast).toBeGreaterThanOrEqual(4.5);
  expect(await page.locator('aside').evaluate(el=>getComputedStyle(el).maxHeight)).toBe('none');
  for(const id of ['#vc-preset','#vc-mode','#vc-selected','#vc-reference','#experiment'])expect(await page.locator(id).evaluate(el=>getComputedStyle(el).appearance)).toBe('none');
  await c(page).focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await expect(c(page)).toBeFocused();expect(await c(page).evaluate(el=>getComputedStyle(el).outlineStyle)).toBe('solid');await page.keyboard.press('Escape');await expect(page.locator('#vc-lesson')).toBeFocused();
 }
 expect(errors).toEqual([]);
});
