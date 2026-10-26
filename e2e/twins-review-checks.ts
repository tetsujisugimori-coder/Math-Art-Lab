import {expect,type Page} from '@playwright/test';
import {jstage,mstage,twinsApply,twinsReady} from './twins-checks';

async function snapshot(page:Page){
 return page.locator(jstage).evaluate(el=>({c:el.getAttribute('data-c'),requested:el.getAttribute('data-requested-id'),completed:el.getAttribute('data-completed-id'),pixels:el.querySelector('canvas')!.toDataURL()}));
}

export async function reviewSelectionAndFormula(page:Page,touch:boolean,capture?:string){
 const stage=page.locator(mstage),canvas=page.locator(`${mstage} canvas`),notice=page.locator('#twins-mandelbrot-selection');
 // Fractional CSS dimensions must be shared by coordinate conversion and rendering, irrespective of DPR.
 await stage.evaluate(el=>{el.style.width='calc(100% - 0.375px)';});await twinsReady(page);
 await expect(notice).toContainText('表示範囲と選択範囲は異なります');
 const select=async(u:number,v:number)=>{
  await canvas.scrollIntoViewIfNeeded();const r=(await canvas.boundingBox())!;
  if(touch)await page.touchscreen.tap(r.x+r.width*u,r.y+r.height*v);else await page.mouse.click(r.x+r.width*u,r.y+r.height*v);
 };
 await select(.65,.4);await twinsReady(page);
 const c=JSON.parse((await stage.getAttribute('data-c'))!);expect(c.re).toBeCloseTo(.04,1);expect(c.im).toBeCloseTo(.288,1);
 await expect(page.locator('#twins-real')).toHaveValue(String(c.re));
 for(let i=0;i<2;i++)await page.locator('[data-view="mandelbrot"][data-action="out"]').click();await twinsReady(page);
 expect(JSON.parse((await stage.getAttribute('data-view'))!).span).toBeCloseTo(14.4,10);
 await page.locator('#twins-real').fill('2.25'); // Candidate is not the applied c.
 const valid=await snapshot(page);await select(.02,.02);
 await expect(notice).toContainText('未適用');await expect(notice).toContainText('−4〜4');await expect(notice).toContainText('画像を保持');
 expect(await snapshot(page)).toEqual(valid);await expect(page.locator('#twins-real')).toHaveValue('2.25');
 await expect(stage).toHaveAttribute('aria-describedby','twins-mandelbrot-selection');
 const near=await notice.boundingBox(),diagram=await stage.boundingBox();expect(near!.y-diagram!.y-diagram!.height).toBeLessThan(25);
 if(capture)await page.locator('.twins-panels').screenshot({path:`${capture}-range.png`});
 // After panning, keyboard selection at the center must use the identical range validation.
 await stage.focus();for(let i=0;i<5;i++)await page.keyboard.press('ArrowRight');await twinsReady(page);
 const panned=await snapshot(page);await page.keyboard.press('Enter');await expect(notice).toContainText('未適用');expect(await snapshot(page)).toEqual(panned);
 await page.keyboard.press('Home');await page.keyboard.press('Enter');await twinsReady(page);await expect(notice).not.toContainText('未適用');await expect(stage).toHaveAttribute('data-c',JSON.stringify({re:-.5,im:0}));
 // Boundary inputs and just-outside inputs: real and imaginary, both signs.
 for(const sign of [-1,1]){
  await twinsApply(page,String(sign*4),String(-sign*4),'50');const boundary=await snapshot(page);
  for(const field of ['#twins-real','#twins-imaginary']){
   await page.locator(field).fill(String(sign*4.000001));await page.locator('#twins-form button').click();await expect(page.locator('#twins-error')).toContainText('未適用');expect(await snapshot(page)).toEqual(boundary);
   await page.locator(field).fill(String(field==='#twins-real'?sign*4:-sign*4));
  }
 }
 await page.locator('#twins-defaults').click();for(let i=0;i<2;i++)await page.locator('[data-view="mandelbrot"][data-action="out"]').click();await twinsReady(page);
 // Synthetic double-valued coordinates avoid device rounding when probing the ±4 selection edges.
 for(const point of [{re:3.999,im:0},{re:4.001,im:0},{re:-3.999,im:0},{re:-4.001,im:0},{re:0,im:3.999},{re:0,im:4.001},{re:0,im:-3.999},{re:0,im:-4.001}]){
  const before=await snapshot(page);
  await stage.evaluate((el,p)=>{const s=el as HTMLElement,r=s.querySelector('canvas')!.getBoundingClientRect(),view=JSON.parse(s.dataset.view!),capture=s.setPointerCapture;s.setPointerCapture=()=>{};
   const clientX=r.left+(.5+(p.re-view.center.re)/view.span)*r.width,clientY=r.top+(.5-(p.im-view.center.im)/view.span*r.width/r.height)*r.height;
   for(const type of ['pointerdown','pointerup'])s.dispatchEvent(new PointerEvent(type,{pointerId:50,pointerType:'touch',button:0,clientX,clientY,bubbles:true}));s.setPointerCapture=capture;
  },point);
  if(Math.max(Math.abs(point.re),Math.abs(point.im))>4){await expect(notice).toContainText('未適用');expect(await snapshot(page)).toEqual(before);}
  else{await twinsReady(page);const applied=JSON.parse((await stage.getAttribute('data-c'))!);expect(applied.re).toBeCloseTo(point.re,10);expect(applied.im).toBeCloseTo(point.im,10);}
 }
 await page.locator('#twins-preset').selectOption('circle');await twinsReady(page);
 const stable=await snapshot(page),mGeneration=await stage.getAttribute('data-requested-id');
 await page.locator('.twins .math-scroll').focus();await page.keyboard.press('Tab');await expect(page.locator('[data-twins-symbol="c"]')).toBeFocused();await page.keyboard.press('Space');
 await expect(page.locator('[data-twins-symbol="c"]')).toHaveAttribute('aria-pressed','true');
 for(const id of ['square','c']){
  const term=page.locator(`math [data-term="${id}"]`),button=page.locator(`[data-twins-symbol="${id}"]`);
  const box=(await term.boundingBox())!;expect(box.width).toBeGreaterThanOrEqual(44);expect(box.height).toBeGreaterThanOrEqual(44);
  if(touch)await term.tap();else await term.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(term).toHaveClass(/twins-selected/);await expect(stage).toHaveClass(/twins-selected/);
  await page.locator('#twins-guide-clear').click();await button.focus();await page.keyboard.press('Enter');await expect(button).toBeFocused();await expect(button).toHaveAttribute('aria-pressed','true');
  if(!touch){await page.locator('#twins-guide-clear').click();await button.hover();await expect(button).toHaveAttribute('aria-pressed','true');}
 }
 expect(await snapshot(page)).toEqual(stable);await expect(stage).toHaveAttribute('data-requested-id',mGeneration!);
 if(capture)await page.locator('.twins-inspector').screenshot({path:`${capture}-formula.png`});
 await page.evaluate(()=>document.documentElement.style.fontSize='200%');await twinsReady(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.locator('math [data-term="c"]').click();await expect(page.locator('[data-twins-symbol="c"]')).toHaveAttribute('aria-pressed','true');
}

export async function reviewGestures(page:Page){
 const stage=page.locator(mstage);
 // Standalone synthetic tap/drag/cancel exercise the same native-event wiring as the pinch cases.
 await stage.evaluate(el=>{
  const s=el as HTMLElement,r=s.querySelector('canvas')!.getBoundingClientRect(),capture=s.setPointerCapture;s.setPointerCapture=()=>{};
  for(const type of ['pointerdown','pointerup'])s.dispatchEvent(new PointerEvent(type,{pointerId:41,pointerType:'touch',button:0,clientX:r.left+r.width/2,clientY:r.top+r.height/2,bubbles:true}));s.setPointerCapture=capture;
 });await twinsReady(page);await expect(stage).toHaveAttribute('data-c',JSON.stringify({re:-.5,im:0}));
 const tapped=await snapshot(page);
 const single=await stage.evaluate(el=>{
  const s=el as HTMLElement,r=s.querySelector('canvas')!.getBoundingClientRect(),capture=s.setPointerCapture;s.setPointerCapture=()=>{};
  const send=(type:string,id:number,x:number,y:number)=>s.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:r.left+x,clientY:r.top+y,bubbles:true}));
  const before=JSON.parse(s.dataset.view!);send('pointerdown',42,80,100);send('pointermove',42,100,110);send('pointerup',42,100,110);const after=JSON.parse(s.dataset.view!);
  send('pointerdown',43,80,100);send('pointercancel',43,80,100);send('lostpointercapture',43,80,100);send('pointerup',43,80,100);s.setPointerCapture=capture;
  return{before,after,width:r.width};
 });
 expect(single.after.center.re).toBeCloseTo(single.before.center.re-20/single.width*single.before.span,10);expect(single.after.center.im).toBeCloseTo(single.before.center.im+10/single.width*single.before.span,10);
 expect(await snapshot(page)).toEqual(tapped);await twinsReady(page);
 for(const removed of [1,2])for(const ending of ['pointerup','pointercancel','lostpointercapture']){
  await page.locator('#twins-defaults').click();await twinsReady(page);const stable=await snapshot(page);
  const result=await stage.evaluate((el,{removed,ending})=>{
   const s=el as HTMLElement,r=s.querySelector('canvas')!.getBoundingClientRect(),capture=s.setPointerCapture;s.setPointerCapture=()=>{};
   const send=(type:string,id:number,x:number,y:number)=>s.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,clientX:r.left+x,clientY:r.top+y,bubbles:true}));
   send('pointerdown',1,80,100);send('pointerdown',2,160,100);send('pointermove',2,200,100);
   const before=JSON.parse(s.dataset.view!),survivor=removed===1?2:1,x=survivor===1?80:200;
   send(ending,removed,removed===1?80:200,100);send('lostpointercapture',removed,0,0);
   send('pointermove',survivor,x,100);const stationary=JSON.parse(s.dataset.view!);
   send('pointermove',survivor,x+20,110);const after=JSON.parse(s.dataset.view!);send('pointerup',survivor,x+20,110);
   send('pointermove',survivor,x+40,120);const idle=JSON.parse(s.dataset.view!);s.setPointerCapture=capture;
   return{before,stationary,after,idle,width:r.width};
  },{removed,ending});
  expect(result.before.span).toBeCloseTo(2.4,12);expect(result.stationary).toEqual(result.before);expect(result.idle).toEqual(result.after);
  expect(result.after.center.re).toBeCloseTo(result.before.center.re-20/result.width*result.before.span,10);expect(result.after.center.im).toBeCloseTo(result.before.center.im+10/result.width*result.before.span,10);
  expect(await snapshot(page)).toEqual(stable);await twinsReady(page);
 }
 // Disposal must detach handlers even with two active pointers, including queued terminal events.
 const handle=await stage.elementHandle();await stage.evaluate(el=>{const s=el as HTMLElement;s.setPointerCapture=()=>{};for(const id of [1,2])s.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,button:0,clientX:50*id,clientY:100,bubbles:true}));});
 await page.locator('#experiment').selectOption('lorenz');
 const old=await handle!.evaluate(el=>{const state=el.getAttribute('data-view');for(const type of ['pointermove','pointercancel','lostpointercapture','pointerup'])el.dispatchEvent(new PointerEvent(type,{pointerId:1,clientX:200,clientY:200,bubbles:true}));return{connected:el.isConnected,same:state===el.getAttribute('data-view')};});expect(old).toEqual({connected:false,same:true});await handle!.dispose();
 await page.locator('#experiment').selectOption('twins');await twinsReady(page);await stage.focus();await page.keyboard.press('Enter');await twinsReady(page);await expect(stage).toHaveAttribute('data-c',JSON.stringify({re:-.5,im:0}));
}
