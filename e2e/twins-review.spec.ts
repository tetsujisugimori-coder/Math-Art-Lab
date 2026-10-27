import {test,expect} from '@playwright/test';
import {jstage,mstage,twinsReady} from './twins-checks';
import {reviewGestures,reviewSelectionAndFormula} from './twins-review-checks';

test.beforeEach(async({page})=>{
 await page.goto('/');await page.locator('#experiment').selectOption('twins');await twinsReady(page);
});

for(const width of [320,375,390,1280])for(const colorScheme of ['dark','light'] as const)test(`review UI ${width}px ${colorScheme}`,async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await twinsReady(page);
 const capture=process.env.TWINS_REVIEW_CAPTURE&&test.info().project.name==='chromium'&&((width===1280&&colorScheme==='dark')||(width===375&&colorScheme==='light'))?`docs/fractal-twins/review-${width}-${colorScheme}`:undefined;
 // Dedicated touch contexts below also exercise DPR=2; this matrix uses native mouse/keyboard.
 await reviewSelectionAndFormula(page,false,capture);
});

test('review touch, fractional dimensions and DPR=2',async({browser})=>{
 test.setTimeout(90000);const context=await browser.newContext({viewport:{width:390,height:1000},hasTouch:true,deviceScaleFactor:2,colorScheme:'light',reducedMotion:'reduce'}),page=await context.newPage();
 await page.goto('/');await page.locator('#experiment').selectOption('twins');await twinsReady(page);await reviewSelectionAndFormula(page,true);await context.close();
});

test('review both lift orders, cancel, lost capture and active disposal',async({page})=>{test.setTimeout(60000);await reviewGestures(page);});

test('review P2 rejected selection explains the range beside the plane',async({page})=>{
 for(let i=0;i<2;i++)await page.locator('[data-view="mandelbrot"][data-action="out"]').click();
 await twinsReady(page);
 const c=await page.locator(mstage).getAttribute('data-c'),generation=await page.locator(jstage).getAttribute('data-completed-id');
 const pixels=await page.locator(`${jstage} canvas`).evaluate(el=>el.toDataURL());
 await page.locator(`${mstage} canvas`).click({position:{x:10,y:10}});
 await expect(page.locator(mstage)).toHaveAttribute('data-c',c!);
 await expect(page.locator(jstage)).toHaveAttribute('data-completed-id',generation!);
 expect(await page.locator(`${jstage} canvas`).evaluate(el=>el.toDataURL())).toBe(pixels);
 await expect(page.locator('[data-plane="mandelbrot"] #twins-mandelbrot-selection')).toContainText('未適用');
});

test('review P3 formula symbols share the existing highlight state',async({page})=>{
 const generation=await page.locator(jstage).getAttribute('data-requested-id');
 await page.locator('math [data-term="c"]').click();
 await expect(page.locator('[data-twins-symbol="c"]')).toHaveAttribute('aria-pressed','true');
 await expect(page.locator(mstage)).toHaveClass(/twins-selected/);
 await expect(page.locator(jstage)).toHaveAttribute('data-requested-id',generation!);
});

test('review P3 pinch survivor continues dragging without selecting c',async({page})=>{
 const c=await page.locator(mstage).getAttribute('data-c');
 const result=await page.locator(mstage).evaluate(el=>{
  const stage=el as HTMLElement,r=stage.querySelector('canvas')!.getBoundingClientRect(),capture=stage.setPointerCapture;stage.setPointerCapture=()=>{};
  const send=(type:string,id:number,x:number,y:number)=>stage.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:r.left+x,clientY:r.top+y,bubbles:true}));
  send('pointerdown',1,80,100);send('pointerdown',2,160,100);send('pointermove',2,200,100);send('pointerup',2,200,100);
  const before=JSON.parse(stage.dataset.view!);send('pointermove',1,100,110);const after=JSON.parse(stage.dataset.view!);send('pointerup',1,100,110);stage.setPointerCapture=capture;
  return {before,after,width:r.width};
 });
 expect(result.after.center.re).toBeCloseTo(result.before.center.re-20/result.width*result.before.span,10);
 expect(result.after.center.im).toBeCloseTo(result.before.center.im+10/result.width*result.before.span,10);
 await expect(page.locator(mstage)).toHaveAttribute('data-c',c!);
});
