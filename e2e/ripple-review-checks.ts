import {test,expect,type TestInfo} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {angles,COLOR_TOLERANCE,measureLegend,measureRotation,modes,palettes,setReviewDisplay,setReviewSettings} from './ripple-review-oracle';

const starts=new WeakMap<TestInfo,number>();
async function save(info:TestInfo,values:unknown) {const path=info.outputPath('review-observations.json');mkdirSync(dirname(path),{recursive:true});writeFileSync(path,JSON.stringify({test:info.title,project:info.project.name,elapsedFromSetupMs:performance.now()-(starts.get(info)??performance.now()),values},null,2)+'\n');await info.attach('review observations',{path,contentType:'application/json'});}
const state=(page:import('@playwright/test').Page)=>page.locator('#rk-stage').evaluate(el=>JSON.parse((el as HTMLElement).dataset.state!));

test.beforeEach(async({page},info)=>{starts.set(info,performance.now());await page.emulateMedia({reducedMotion:'reduce'});await page.goto('./',{waitUntil:'domcontentloaded'});await page.locator('#experiment').selectOption('ripple');await expect(page.locator('#rk-stage')).toHaveAttribute('data-draws',/[1-9]/);});

test('ripple review P2: signed angles keep geometry, direction and source zero consistent',async({page},info)=>{
  await page.locator('[data-rk-symbol="theta"]').click();const results=[];
  for(const angle of angles){await setReviewSettings(page,{angle});const v=await measureRotation(page,angle);results.push(v);expect.soft(v.sourcePass,`source zero ${angle}`).toBe(true);expect.soft(v.geometryFailures,`arc ${angle}`).toEqual([]);expect.soft(v.explanationFailures,`description ${angle}`).toEqual([]);expect.soft(v.labelVisible).toBe(true);}
  await save(info,results);
});
test('ripple review P3: composited legend pixels match independent colors in all nine combinations',async({page},info)=>{
  const results=[];
  for(const mode of modes)for(const palette of palettes){await setReviewDisplay(page,mode,palette);const {png,...v}=await measureLegend(page,mode,palette);results.push(v);expect.soft(v.maxError,`${mode}/${palette}`).toBeLessThanOrEqual(COLOR_TOLERANCE);expect.soft(v.profileMaxError,`full profile ${mode}/${palette}`).toBeLessThanOrEqual(COLOR_TOLERANCE);expect.soft(v.samples.every(p=>p.rgba[3]===255)).toBe(true);}
  await save(info,results);
});

for(const width of [375,390,768,1280])test.describe(`DPR2 width ${width}`,()=>{
test.use({viewport:{width,height:1000},deviceScaleFactor:2});
test(`ripple review: width ${width} DPR2 themes text scale and live theta/legend updates`,async({page},info)=>{
  test.setTimeout(60000); // 36 composited PNG captures plus four geometry/layout changes.
  await page.locator('[data-rk-symbol="theta"]').click();const results=[];
  for(const theme of ['dark','light'] as const)for(const font of [100,200]) {
    await page.emulateMedia({colorScheme:theme});await page.evaluate(font=>document.documentElement.style.fontSize=font+'%',font);
    await page.setViewportSize({width:width+1,height:1000});await page.setViewportSize({width,height:1000});
    const angle=font===100?90:-90;await setReviewSettings(page,{angle});const rotation=await measureRotation(page,angle);
    expect.soft(rotation.sourcePass).toBe(true);expect.soft(rotation.geometryFailures).toEqual([]);expect.soft(rotation.explanationFailures).toEqual([]);expect.soft(rotation.labelVisible).toBe(true);
    expect.soft(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect.soft(await page.locator('#rk-symbol-copy').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    const legends=[];for(const mode of modes)for(const palette of palettes){await setReviewDisplay(page,mode,palette);const {png,...v}=await measureLegend(page,mode,palette);legends.push(v);expect.soft(v.maxError,`${theme}/${font}/${mode}/${palette}`).toBeLessThanOrEqual(COLOR_TOLERANCE);expect.soft(v.profileMaxError).toBeLessThanOrEqual(COLOR_TOLERANCE);}
    results.push({width,dpr:2,theme,font,rotation,legends});
  }
  await save(info,results);
});
});
test('ripple review: normal controls pass and reversed arc, moved source and red legend are rejected',async({page},info)=>{
  await page.locator('[data-rk-symbol="theta"]').click();await setReviewSettings(page,{angle:90});const normal=await measureRotation(page,90);expect(normal.geometryFailures).toEqual([]);expect(normal.explanationFailures).toEqual([]);expect(normal.sourcePass).toBe(true);
  await page.locator('[data-guide="angle"] polyline').evaluate(el=>el.setAttribute('points',el.getAttribute('points')!.split(' ').reverse().join(' ')));const reversed=await measureRotation(page,90);expect(reversed.geometryFailures.length).toBeGreaterThan(0);expect(reversed.explanationFailures).toEqual([]);expect(reversed.sourcePass).toBe(true);
  await setReviewSettings(page,{angle:90});await page.locator('[data-source="0"]').evaluate(el=>el.setAttribute('transform','translate(0 0)'));const moved=await measureRotation(page,90);expect(moved.sourcePass).toBe(false);expect(moved.geometryFailures).toEqual([]);
  await setReviewSettings(page,{angle:90});await setReviewDisplay(page,'intensity','aurora');const normalColor=await measureLegend(page,'intensity','aurora');expect(normalColor.pass).toBe(true);
  await page.locator('#rk-scale').evaluate(el=>{if(el instanceof HTMLCanvasElement){const ctx=el.getContext('2d')!;ctx.fillStyle='rgb(255,0,0)';ctx.fillRect(0,0,el.width,el.height);}else el.style.background='rgb(255,0,0)';});const red=await measureLegend(page,'intensity','aurora');expect(red.pass).toBe(false);expect(red.maxError).toBeGreaterThan(COLOR_TOLERANCE);
  await setReviewDisplay(page,'intensity','iris');await setReviewDisplay(page,'intensity','aurora');const restored=await measureLegend(page,'intensity','aurora');expect(restored.pass).toBe(true);
  const withoutPng=({png,...data}:typeof normalColor)=>data;await save(info,{normal,reversed,moved,normalColor:withoutPng(normalColor),red:withoutPng(red),restored:withoutPng(restored)});
});
test('ripple review: signed formula selection and exact color scale survive all lesson stages and amplitude changes',async({page},info)=>{
  await page.locator('[data-rk-symbol="theta"]').focus();await page.keyboard.press('Enter');await page.locator('#rk-angle').fill('-90');await page.locator('#rk-angle').press('Enter');
  await page.locator('#rk-mode').selectOption('envelope');await page.locator('#rk-palette').selectOption('iris');await page.locator('#rk-step').click();
  const before=await state(page);await page.locator('#rk-wavelength').fill('2.345');await page.locator('#rk-lesson-toggle').click();
  for(let i=1;i<4;i++){await page.locator(`[data-rk-lesson="${i}"]`).click();await setReviewDisplay(page,'displacement','gold');}
  await page.keyboard.press('Escape');expect(await state(page)).toEqual(before);await expect(page.locator('#rk-wavelength')).toHaveValue('2.345');const rotation=await measureRotation(page,-90);expect(rotation.geometryFailures).toEqual([]);expect(rotation.explanationFailures).toEqual([]);
  await page.locator('#rk-wavelength').fill(String(before.settings.wavelength)); // Only A will be changed by the next submit.
  const original=await measureLegend(page,'envelope','iris');expect(original.pass).toBe(true);const originalBytes=await page.locator('#rk-scale').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,1).data));
  const amplitudes=[];for(const amplitude of [0,2]){await setReviewSettings(page,{amplitude});expect((await state(page)).settings).toEqual({...before.settings,amplitude});const value=await measureLegend(page,'envelope','iris');expect(value.pass).toBe(true);expect(await page.locator('#rk-scale').evaluate((c:HTMLCanvasElement)=>Array.from(c.getContext('2d')!.getImageData(0,0,c.width,1).data))).toEqual(originalBytes);await expect(page.locator('#rk-legend')).toContainText('0〜12');amplitudes.push({amplitude,maxError:value.maxError,profileMaxError:value.profileMaxError});}
  const legendDraws=await page.locator('#rk-scale').getAttribute('data-draws');await page.locator('#rk-play').click();await expect.poll(async()=>(await state(page)).time).toBeGreaterThan(.1);await page.locator('#rk-play').click();expect(await page.locator('#rk-scale').getAttribute('data-draws')).toBe(legendDraws);await save(info,{before,rotation,amplitudes,legendDraws});
});
test.describe('DPR3 touch',()=>{
test.use({viewport:{width:390,height:844},hasTouch:true,deviceScaleFactor:3});
test('ripple review: touch DPR3 keeps negative theta and legend correct after resize',async({page},info)=>{
  await page.locator('[data-rk-symbol="theta"]').tap();await page.locator('#rk-angle').fill('-180');await page.locator('#rk-settings button').tap();const observations=[];
  for(const width of [375,390]){await page.setViewportSize({width,height:844});const rotation=await measureRotation(page,-180);expect(rotation.sourcePass).toBe(true);expect(rotation.geometryFailures).toEqual([]);expect(rotation.explanationFailures).toEqual([]);await setReviewDisplay(page,'intensity','gold');const {png,...legend}=await measureLegend(page,'intensity','gold');expect(legend.pass).toBe(true);observations.push({width,rotation,legend});}
  await save(info,observations);
});
});
test.describe('PNG capture parity DPR2',()=>{
test.use({deviceScaleFactor:2});
test('ripple review: direct screen clip and element screenshot have identical composited color pixels',async({page},info)=>{
  const observations=[];
  try {for(const [mode,palette] of [['displacement','aurora'],['intensity','iris']] as const){
    await setReviewDisplay(page,mode,palette);const {png:one,...element}=await measureLegend(page,mode,palette,'element'),{png:two,...clip}=await measureLegend(page,mode,palette,'clip');observations.push({element,clip});
    // Vertical clip rounding can include an extra outer row. The specified
    // measurement is the full central color row, which must match byte-for-byte.
    expect(clip.width).toBe(element.width);expect(clip.profileHash).toBe(element.profileHash);expect(clip.pass).toBe(true);expect(element.pass).toBe(true);
  }} finally {await save(info,observations);}
});
});
