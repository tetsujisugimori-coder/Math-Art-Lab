import { expect, test } from '@playwright/test';

const work = '[data-prime-atlas]';
// Stable encoded snapshot avoids getImageData moving Chromium to a different raster backend.
const snapshot = (canvas: HTMLCanvasElement) => canvas.toDataURL();

for(const [width,theme] of [[375,'dark'],[390,'light'],[768,'dark'],[1280,'light']] as const){
  test(`021 controls, classification, focus and repaints (${width}px / ${theme})`,async({page},testInfo)=>{
    const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setViewportSize({width,height:900});
    await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
    await page.goto('./');await page.locator('#experiment').selectOption('prime-constellation');
    const root=page.locator(work),canvas=page.locator('#prime-art');
    await expect(root).toHaveAttribute('data-state','finished');
    await expect(root).toHaveAttribute('data-prime-count','1229');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await page.locator('#prime-reset').click();
    await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
    const initial=await canvas.evaluate(snapshot);
    for(const mode of ['polar','grid','ulam']){
      await page.locator('#prime-mode').selectOption(mode);
      await expect(root).toHaveAttribute('data-layout',mode);
      await expect(root).toHaveAttribute('data-prime-count','1229');
      if(mode!=='ulam')expect(await canvas.evaluate(snapshot)).not.toBe(initial);
    }
    await page.locator('#prime-reset').click();
    await expect.poll(()=>canvas.evaluate(snapshot)).toBe(initial);
    await page.locator('#prime-limit').selectOption('100');
    await expect(root).toHaveAttribute('data-prime-count','25');
    await page.locator('#prime-number').fill('5');
    await page.locator('#prime-number').press('Enter');
    await expect(page.locator('#prime-selection')).toContainText('相手 3、7');
    await page.locator('#prime-number').fill('4');
    await page.locator('#prime-number').press('Enter');
    await expect(page.locator('#prime-selection')).toContainText('合成数');
    await page.locator('#prime-number').fill('1');
    await page.locator('#prime-number').press('Enter');
    await expect(page.locator('#prime-selection')).toContainText('素数でも合成数でもない');
    await page.locator('#prime-primes').uncheck();await page.locator('#prime-twins').uncheck();
    await expect(root).toHaveAttribute('data-painted','0');
    await page.locator('#prime-twins').check();await expect(root).not.toHaveAttribute('data-painted','0');
    await page.locator('#prime-primes').check();
    const before=await canvas.evaluate(snapshot);
    for(const layer of ['composites','guide','labels'])await page.locator('#prime-'+layer).check();
    await canvas.press('=');await canvas.press('ArrowLeft');
    expect(await canvas.evaluate(snapshot)).not.toBe(before);
    await canvas.press('0');
    await page.locator('#prime-lesson').press('Enter');await expect(page.locator('#prime-lesson-close')).toBeFocused();
    await page.locator('#prime-next').press('Enter');
    for(const p of [2,3,5,7]){await expect(page.locator('#prime-sieve')).toHaveText(`${p} の倍数を除く`);await page.locator('#prime-sieve').click();}
    await expect(page.locator('#prime-lesson-note')).toContainText('残った25個');
    await page.locator('#prime-next').click();await expect(page.locator('#prime-lesson-copy')).toContainText('証明ではありません');
    await page.locator('#prime-next').click();await page.locator('#prime-compare').selectOption('polar');
    await expect(page.locator('#prime-lesson-note')).toContainText('25.00%');
    await page.keyboard.press('Escape');await expect(page.locator('#prime-lesson')).toBeFocused();
    await page.locator('#prime-full').click();await expect(canvas).toBeVisible();await expect(page.locator('#prime-full-close')).toBeFocused();
    await page.keyboard.press('Escape');await expect(page.locator('#prime-full')).toBeFocused();
    await page.setViewportSize({width:width+1,height:840});await expect(canvas).toBeVisible();
    await page.locator('#prime-limit').selectOption('25000');
    await expect(root).toHaveAttribute('data-prime-count','2762');
    await expect(root).toHaveAttribute('data-visible-limit','25000');
    expect(Number(await root.getAttribute('data-painted'))).toBe(2762);
    await page.locator('#experiment').selectOption('apollonian-bloom');await expect(page.locator('[data-bloom]')).toBeVisible();
    await page.locator('#experiment').selectOption('prime-constellation');await expect(root).toHaveAttribute('data-prime-count','1229');
    expect(errors).toEqual([]);
    if(width===1280)await page.locator('.prime-stage').screenshot({path:testInfo.outputPath('021-full.png')});
  });
}

test('021 controlled clock: phases, pause, speed, title and equivalent final pixels',async({page,browserName},testInfo)=>{
  test.setTimeout(45_000); // wall time of the test harness, not the artwork runtime
  const start=new Date('2026-01-01T00:00:00Z');
  await page.setViewportSize({width:1280,height:900});await page.clock.install({time:start});
  await page.goto('./');await page.locator('#experiment').selectOption('prime-constellation');
  const root=page.locator(work),canvas=page.locator('#prime-art');
  const click=(id:string)=>page.locator('#prime-'+id).evaluate(el=>(el as HTMLButtonElement).click());
  await page.clock.pauseAt(new Date(start.getTime()+60_000));
  const advance=async(ms:number)=>{await page.clock.runFor(50);await page.clock.fastForward(ms-50);};
  await click('play');await advance(3650);await expect(root).toHaveAttribute('data-stage','2');
  await click('play');const stopped=await root.getAttribute('data-elapsed');
  await page.clock.runFor(1000);await expect(root).toHaveAttribute('data-elapsed',stopped!);
  await page.locator('#prime-speed').evaluate(el=>{(el as HTMLSelectElement).value='2';el.dispatchEvent(new Event('change'));});
  await click('play');await advance(2900);
  await click('play');await expect(root).toHaveAttribute('data-state','paused');
  await expect(root).toHaveAttribute('data-stage','3');
  expect(Number(await root.getAttribute('data-elapsed'))).toBeGreaterThan(9100);
  expect(Number(await root.getAttribute('data-elapsed'))).toBeLessThan(9700);
  await expect(root).toHaveAttribute('data-title','hidden');
  const captureAt=await root.getAttribute('data-elapsed');
  await page.clock.resume();
  await page.locator('.prime-stage').screenshot({path:testInfo.outputPath('021-reveal.png')});
  await expect(root).toHaveAttribute('data-elapsed',captureAt!);
  await expect(root).toHaveAttribute('data-stage','3');
  const now=await page.evaluate(()=>Date.now());await page.clock.pauseAt(now+250);
  await click('play');await advance(3800);await expect(root).toHaveAttribute('data-title','shown');
  await expect(root).toHaveAttribute('data-elapsed','15000');
  async function readComplete(){
    await page.clock.runFor(64);
    await expect(root).toHaveAttribute('data-painted','1229');
    return canvas.evaluate(snapshot);
  }
  const natural=await readComplete();
  await click('restart');await click('finish');
  const immediate=await readComplete();
  if(browserName!=='webkit'){
    expect(immediate===natural).toBe(true);
  }else{
    // WPE can round a few channels by one unit across redraws. Decode the
    // lossless captures on separate readback surfaces, not the art canvas.
    const diff=await page.evaluate(async([a,b])=>{
      async function decode(url:string){
        const img=new Image();img.src=url;await img.decode();
        const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
        const ctx=c.getContext('2d',{willReadFrequently:true})!;
        ctx.drawImage(img,0,0);return ctx.getImageData(0,0,c.width,c.height);
      }
      const [x,y]=await Promise.all([decode(a),decode(b)]);
      let delta=0,channels=0,alpha=0,bright=0,mask=0;
      for(let i=0;i<x.data.length;i+=4){
        const isBright=(d:Uint8ClampedArray)=>d[i]>150&&d[i+1]>150&&d[i+2]>150;
        if(isBright(x.data))bright++;
        if(isBright(x.data)!==isBright(y.data))mask++;
        if(x.data[i+3]!==y.data[i+3])alpha++;
        for(let c=0;c<3;c++){
          const d=Math.abs(x.data[i+c]-y.data[i+c]);
          if(d)channels++;
          delta=Math.max(delta,d);
        }
      }
      return {sameSize:x.width===y.width&&x.height===y.height,delta,channels,alpha,bright,mask};
    },[natural,immediate]);
    expect(diff).toMatchObject({sameSize:true,alpha:0,mask:0});
    expect(diff.delta).toBeLessThanOrEqual(1);
    expect(diff.channels).toBeLessThanOrEqual(32);
    expect(diff.bright).toBeGreaterThan(500);
  }
  await page.clock.resume();
  await page.locator('.prime-stage').screenshot({path:testInfo.outputPath('021-complete.png')});
});

test('021 real-time 1× playback completes without clock injection',async({page})=>{
  test.setTimeout(45000);
  await page.setViewportSize({width:390,height:850});await page.goto('./');await page.locator('#experiment').selectOption('prime-constellation');
  const root=page.locator(work);const started=Date.now();await page.locator('#prime-play').click();
  await expect(root).toHaveAttribute('data-state','finished',{timeout:28000});
  expect(Date.now()-started).toBeGreaterThanOrEqual(14750);
  await expect(root).toHaveAttribute('data-title','shown');
  await expect(root).toHaveAttribute('data-visible-primes','1229');
});

test('021 tab return pauses time; switching releases canvas and scheduling',async({page})=>{
  await page.clock.install();await page.goto('./');await page.locator('#experiment').selectOption('prime-constellation');
  const root=page.locator(work);await page.locator('#prime-play').click();await page.clock.runFor(350);
  const before=await root.getAttribute('data-elapsed');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(3000);await expect(root).toHaveAttribute('data-elapsed',before!);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  await page.clock.runFor(230);expect(Number(await root.getAttribute('data-elapsed'))).toBeGreaterThan(Number(before));
  const detached=await root.elementHandle();await page.locator('#experiment').selectOption('apollonian-bloom');
  const frames=await detached!.getAttribute('data-renders');
  await page.clock.runFor(2000);await page.setViewportSize({width:375,height:850});
  expect(await detached!.getAttribute('data-renders')).toBe(frames);
});

test('021 touch-emulated selection and two-times text remain usable at 375px',async({browser,baseURL})=>{
  const context=await browser.newContext({baseURL,viewport:{width:375,height:860},hasTouch:true,isMobile:true,reducedMotion:'reduce',colorScheme:'dark'});
  try{
    const page=await context.newPage();
    await page.goto('./');
    await page.locator('#experiment').selectOption('prime-constellation');
    await page.addStyleTag({content:'html{font-size:200%!important} .prime-atlas{font-size:1rem}'});
    expect(await page.locator('.prime-atlas').evaluate(el=>getComputedStyle(el).fontSize)).toBe('32px');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(375);
    await page.locator('#prime-limit').selectOption('100');
    const stage=page.locator('#prime-art');
    await stage.scrollIntoViewIfNeeded();
    const box=(await stage.boundingBox())!;
    // Ulam maximum 100 fits x −4…5, y −4…5; 2 is at (1,0).
    const scale=Math.min(box.width*.83/9,box.height*.76/9);
    await page.touchscreen.tap(box.x+box.width/2+.5*scale,box.y+box.height*.48+.5*scale);
    await expect(page.locator('[data-prime-atlas]')).toHaveAttribute('data-selected','2');
    await page.locator('#prime-lesson').click();await expect(page.locator('#prime-lesson-title')).toBeVisible();
    const dialog=page.locator('#prime-lesson-dialog');
    expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBe(true);
  }finally{await context.close();}
});
