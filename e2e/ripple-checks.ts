import {test,expect,type Page} from '@playwright/test';

const state=(page:Page)=>page.locator('#rk-stage').evaluate(el=>JSON.parse((el as HTMLElement).dataset.state!));
const ready=async(page:Page)=>{await expect(page.locator('#rk-stage')).toHaveAttribute('data-draws',/[1-9]/);await expect(page.locator('#rk-fallback')).toBeHidden();};
const hash=(page:Page)=>page.locator('#rk-canvas').evaluate((el:HTMLCanvasElement)=>{
  const data=el.getContext('2d')!.getImageData(0,0,el.width,el.height).data;let hash=2166136261;for(const byte of data)hash=Math.imul(hash^byte,16777619);return hash>>>0;
});
const apply=async(page:Page,values:Record<string,string>)=>{for(const [key,value] of Object.entries(values))if(key==='count')await page.locator('#rk-count').selectOption(value);else await page.locator('#rk-'+key).fill(value);await page.locator('#rk-settings button').click();await ready(page);};
const painted=async(page:Page)=>page.locator('#rk-stage').evaluate(el=>JSON.parse((el as HTMLElement).dataset.painted!));
test.beforeEach(async({page})=>{await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./',{waitUntil:'domcontentloaded'});await page.locator('#experiment').selectOption('ripple');await ready(page);});

test('ripple: default, fixed legend and all three rendering modes',async({page})=>{
  expect((await state(page)).settings.count).toBe(6);await expect(page.locator('#rk-clock')).toContainText('停止中');await expect(page.locator('#rk-legend')).toContainText('144');
  const hashes=[];for(const mode of ['intensity','envelope','displacement']) {await page.locator('#rk-mode').selectOption(mode);await expect.poll(async()=>(await painted(page)).mode).toBe(mode);hashes.push(await hash(page));}
  expect(new Set(hashes).size).toBe(3);await expect(page.locator('#rk-legend')).toContainText('青 −12');
});
test('ripple: actual raster colors match independent direct wave sums',async({page})=>{
  await apply(page,{count:'5',wavelength:'1.31',radius:'2.1',amplitude:'1.7',angle:'41',phase:'-74'});await page.locator('#rk-mode').selectOption('displacement');await page.locator('#rk-glow-check').uncheck();await expect.poll(async()=>(await painted(page)).mode).toBe('displacement');
  const samples=await page.locator('#rk-canvas').evaluate((c:HTMLCanvasElement)=>{const ctx=c.getContext('2d')!;return [[190,190],[122,225],[273,91]].map(([x,y])=>({x,y,n:c.width,rgba:Array.from(ctx.getImageData(x,y,1,1).data)}));});
  for(const pixel of samples) {
    const x=(2*(pixel.x+.5)/pixel.n-1)*5,y=(1-2*(pixel.y+.5)/pixel.n)*5;let u=0;
    for(let j=0;j<5;j++){const a=2*Math.PI*j/5+41*Math.PI/180,r=Math.hypot(x-2.1*Math.cos(a),y-2.1*Math.sin(a));u+=1.7*Math.cos(2*Math.PI/1.31*r+(j===0?-74*Math.PI/180:0));}
    const q=u/10,f=Math.abs(q)**.65,end=q<0?[65,195,255]:[255,192,105];[4,8,20].forEach((b,i)=>expect(Math.abs(pixel.rgba[i]-Math.round(b+(end[i]-b)*f))).toBeLessThanOrEqual(1));
  }
});
test('ripple: play stop step and invariants do not rebuild static field',async({page})=>{
  const initial=await hash(page),builds=await page.locator('#rk-stage').getAttribute('data-builds');await page.locator('#rk-step').click();expect((await state(page)).time).toBeCloseTo(.05,8);expect(await hash(page)).toBe(initial);
  await page.locator('#rk-mode').selectOption('displacement');await expect.poll(async()=>(await painted(page)).mode).toBe('displacement');const before=await hash(page);await page.locator('#rk-step').click();await expect.poll(()=>hash(page)).not.toBe(before);
  await page.locator('#rk-play').click();await expect(page.locator('#rk-step')).toBeDisabled();await expect.poll(async()=>(await state(page)).time).toBeGreaterThan(.12);await page.locator('#rk-play').click();const stopped=(await state(page)).time;
  await page.waitForTimeout(100);expect((await state(page)).time).toBe(stopped);await page.locator('#rk-time-reset').click();expect((await state(page)).time).toBe(0);expect(await page.locator('#rk-stage').getAttribute('data-builds')).toBe(builds);
});
test('ripple: presets palette amplitude rotation and phase update both geometry and raster',async({page})=>{
  const images=[];for(let i=0;i<4;i++){await page.locator('#rk-preset').selectOption(String(i));await expect.poll(async()=>(await painted(page)).settings.count).toBe([6,5,8,4][i]);images.push(await hash(page));}
  expect(new Set(images).size).toBe(4);await apply(page,{count:'3',angle:'90',phase:'60'});await page.locator('#rk-guide-check').check();await expect(page.locator('#rk-symmetry')).toContainText('発展モード');
  const position=await page.locator('[data-source="0"]').getAttribute('transform');expect(position).toMatch(/translate\(200 /);const before=await hash(page);await apply(page,{amplitude:'0'});await expect.poll(()=>hash(page)).not.toBe(before);
  const data=await page.locator('#rk-canvas').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(192,192,1,1).data));expect(data).toEqual([4,8,20,255]);
  await page.locator('#rk-default').click();expect((await state(page)).settings).toEqual({count:6,wavelength:1.25,radius:2.2,amplitude:1.8,angle:0,phase:0});
});
test('ripple: invalid candidates do not reach settings and bounds are accepted',async({page})=>{
  const before=await state(page);for(const value of ['','0','4.01']){await page.locator('#rk-wavelength').fill(value);await page.locator('#rk-settings button').click();await expect(page.locator('#rk-error')).toContainText('未適用');expect((await state(page)).settings).toEqual(before.settings);}
  await apply(page,{count:'8',wavelength:'.5',radius:'3',amplitude:'2',angle:'-180',phase:'180'});expect((await state(page)).settings.amplitude).toBe(2);
  await page.locator('#rk-point-form input[name=x]').fill('5.1');await page.locator('#rk-point-form button').click();await expect(page.locator('#rk-point-error')).toContainText('有限');expect((await state(page)).point).toEqual(before.point);
});
test('ripple: every formula symbol selects an actual diagram; keyboard and pointer',async({page})=>{
  const diagrams:Record<string,string>={N:'sources',R:'radius',lambda:'wavelength',theta:'angle',r:'distance',A:'amplitude',phi:'phase',C:'envelope'};
  for(const [id,guide] of Object.entries(diagrams)){await page.locator(`[data-rk-symbol="${id}"]`).click();await expect(page.locator('#rk-guides [data-guide="'+guide+'"]').first()).toBeAttached();await expect(page.locator('#rk-symbol-copy')).not.toBeEmpty();}
  await page.locator('[data-rk-symbol="lambda"]').focus();await page.keyboard.press('Enter');await expect(page.locator('#rk-symbol-copy')).toContainText('ラムダ');
  await page.locator('#rk-jump').click();await expect(page.locator('#rk-stage')).toBeFocused();const x=(await state(page)).point.x;await page.keyboard.press('ArrowRight');expect((await state(page)).point.x).toBeCloseTo(x+.1,8);
  const rect=(await page.locator('#rk-stage').boundingBox())!;await page.locator('#rk-stage').click({position:{x:rect.width/2-1,y:rect.height/2-1}});const selected=await state(page);expect(Math.abs(selected.point.x)).toBeLessThan(.05);expect(Math.abs(selected.point.y)).toBeLessThan(.05);
  await page.locator('#rk-clear').click();await expect(page.locator('#rk-stage')).toHaveAttribute('data-highlight','');await expect(page.locator('#rk-guides [data-source]')).toHaveCount(0);
});
test('ripple: all four lessons isolate settings and restore full state and drafts',async({page})=>{
  await page.locator('#rk-mode').selectOption('displacement');await page.locator('#rk-step').click();await page.locator('#rk-guide-check').check();await page.locator('[data-rk-symbol="R"]').click();await page.locator('#rk-wavelength').fill('2.345');const before=await state(page);
  await page.locator('#rk-lesson-toggle').click();expect((await state(page)).settings.count).toBe(1);
  for(let i=1;i<4;i++){await page.locator(`[data-rk-lesson="${i}"]`).click();expect((await state(page)).settings.count).toBe([1,2,6,6][i]);await expect(page.locator('#rk-lesson-copy')).toContainText(['','2つ','N回','強度相当量'][i]);}
  await apply(page,{phase:'80'});await page.keyboard.press('Escape');expect(await state(page)).toEqual(before);await expect(page.locator('#rk-wavelength')).toHaveValue('2.345');await expect(page.locator('#rk-lesson')).toBeHidden();await expect(page.locator('#rk-lesson-toggle')).toBeFocused();
});
test('ripple: safety stop survives lesson restore and switching artworks cleans up',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#rk-play').click();await page.locator('#rk-lesson-toggle').click();await page.emulateMedia({reducedMotion:'reduce'});await expect.poll(async()=>(await state(page)).playing).toBe(false);await page.locator('#rk-lesson-toggle').click();expect((await state(page)).playing).toBe(false);
  await page.locator('#rk-play').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});expect((await state(page)).playing).toBe(false);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#experiment').selectOption('wave');await expect(page.locator('.wave')).toBeVisible();await page.locator('#experiment').selectOption('ripple');await ready(page);expect((await state(page)).time).toBe(0);expect(errors).toEqual([]);
});
test('ripple: lesson restores point validation error and its candidate',async({page})=>{
  await page.locator('#rk-point-form input[name=x]').fill('5.1');await page.locator('#rk-point-form button').click();const error=await page.locator('#rk-point-error').textContent();
  await page.locator('#rk-lesson-toggle').click();await page.locator('#rk-point-form input[name=x]').fill('1');await page.locator('#rk-point-form button').click();await page.locator('#rk-lesson-toggle').click();
  await expect(page.locator('#rk-point-form input[name=x]')).toHaveValue('5.1');await expect(page.locator('#rk-point-error')).toHaveText(error!);
});
test('ripple: responsive themes 200 percent text and resize preserve usable art',async({page})=>{
  for(const width of [375,390,768,1280])for(const colorScheme of ['light','dark'] as const){await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await ready(page);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);const rect=await page.locator('#rk-stage').boundingBox();expect(rect!.width).toBeGreaterThan(width<=390?330:450);
    expect(await page.locator('#rk-play').evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);await page.locator('#rk-default').scrollIntoViewIfNeeded();await expect(page.locator('#rk-default')).toBeVisible();}
});
test('ripple: glow and guide effects preserve numerical state and base raster',async({page})=>{
  const before=await state(page),base=await hash(page),builds=await page.locator('#rk-stage').getAttribute('data-builds');await page.locator('#rk-glow-check').uncheck();await expect(page.locator('#rk-glow')).toBeHidden();await page.locator('#rk-guide-check').check();expect(await hash(page)).toBe(base);const after=await state(page);expect(after.settings).toEqual(before.settings);expect(after.point).toEqual(before.point);expect(after.time).toBe(before.time);expect(await page.locator('#rk-stage').getAttribute('data-builds')).toBe(builds);
});
test('ripple: high DPR and touch retain raster cap and coordinate selection',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,reducedMotion:'reduce'});const page=await context.newPage();await page.goto('./',{waitUntil:'domcontentloaded'});await page.locator('#experiment').selectOption('ripple');await ready(page);
  expect(await page.locator('#rk-canvas').getAttribute('width')).toBe('384');await page.locator('#rk-stage').scrollIntoViewIfNeeded();const rect=(await page.locator('#rk-stage').boundingBox())!;await page.touchscreen.tap(rect.x+rect.width/2,rect.y+rect.height/2);expect(Math.abs((await state(page)).point.x)).toBeLessThan(.05);expect(Math.abs((await state(page)).point.y)).toBeLessThan(.05);
  await page.locator('[data-rk-symbol="lambda"]').tap();await expect(page.locator('#rk-symbol-copy')).toContainText('ラムダ');await context.close();
});
test('ripple: rendering failure is explicit and next successful draw recovers',async({page})=>{
  await page.locator('#rk-canvas').evaluate((c:any)=>{const ctx=c.getContext('2d');ctx.originalPut=ctx.putImageData;ctx.putImageData=()=>{throw Error('injected raster failure');};});
  const paintedBefore=await page.locator('#rk-stage').getAttribute('data-painted');await page.locator('#rk-mode').selectOption('envelope');await expect(page.locator('#rk-fallback')).toContainText('描画できません');expect(await page.locator('#rk-stage').getAttribute('data-painted')).toBe(paintedBefore);
  await page.locator('#rk-canvas').evaluate((c:any)=>{const ctx=c.getContext('2d');ctx.putImageData=ctx.originalPut;});await page.locator('#rk-mode').selectOption('displacement');await ready(page);await expect.poll(async()=>(await painted(page)).mode).toBe('displacement');
});
test('ripple: picker has explicit theme colors and native appearance does not hide text',async({page})=>{
  for(const colorScheme of ['light','dark'] as const){await page.emulateMedia({colorScheme});expect(await page.locator('#experiment').evaluate(el=>getComputedStyle(el).appearance)).toBe('none');}
  await page.locator('#experiment').selectOption('wave');expect(await page.locator('body').evaluate(el=>el.classList.contains('ripple-active'))).toBe(false);
});
