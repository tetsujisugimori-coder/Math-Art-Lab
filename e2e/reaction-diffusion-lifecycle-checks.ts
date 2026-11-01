import {test,expect,type Page} from '@playwright/test';

// Deliberately keep retired instances and callbacks: model events already queued
// at termination, independent of real browser scheduling and solver arithmetic.
async function install(page:Page){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('#experiment').selectOption('wave');
 await page.evaluate(()=>{
  const state={workers:[] as any[],timers:[] as (()=>void)[]};(window as any).rdFault=state;
  const timeout=window.setTimeout.bind(window);
  window.setTimeout=((handler:any,delay?:number,...args:any[])=>{if(delay===50&&typeof handler==='function'){state.timers.push(()=>handler(...args));return timeout(()=>{},100000);}return timeout(handler,delay,...args);}) as typeof window.setTimeout;
  window.Worker=class extends EventTarget{
   onmessage:((e:MessageEvent)=>void)|null=null;onerror:((e:ErrorEvent)=>void)|null=null;requests:any[]=[];terminated=false;
   constructor(){super();state.workers.push(this);}
   postMessage(request:any){this.requests.push(structuredClone(request));}
   terminate(){this.terminated=true;}
   reply(data:any){this.onmessage?.(new MessageEvent('message',{data}));}
   error(){this.onerror?.(new ErrorEvent('error',{message:'fault injection'}));}
  } as unknown as typeof Worker;
 });
 await page.locator('#experiment').selectOption('reaction');
}
async function snapshot(page:Page){return page.evaluate(()=>{const q=(s:string)=>document.querySelector(s)!;return {error:q('#rd-error').textContent,applied:q('#rd-applied').textContent,observation:q('#rd-observation').textContent,play:q('#rd-play').textContent,status:q('#rd-status').textContent,image:(q('#rd-canvas') as HTMLCanvasElement).toDataURL()};});}
async function stale(page:Page,index=0){await page.evaluate(index=>{const s=(window as any).rdFault,w=s.workers[index],latest=s.workers.at(-1).requests.at(-1),request=w.requests.at(-1);const grid=structuredClone(request.grid);grid.step=999;grid.u.fill(.2);grid.v.fill(.7);w.reply({id:latest?.id??request.id,grid,ms:0});w.error();for(const timer of s.timers)timer();},index);}
async function complete(page:Page){await page.evaluate(()=>{const w=(window as any).rdFault.workers.at(-1),r=w.requests.at(-1),grid=structuredClone(r.grid);grid.step+=r.count;w.reply({id:r.id,grid,ms:1});});}

for(const action of ['reset','stop','add','preset','lesson','close','hidden','motion'] as const)test(`worker isolation after ${action}`,async({page})=>{
 await install(page);
 if(action==='close')await page.locator('#rd-lesson').click();
 await page.locator('#rd-step').click();
 if(action==='preset')await page.locator('#rd-preset').selectOption('1');
 else if(action==='hidden')await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
 else if(action==='motion')await page.emulateMedia({reducedMotion:'reduce'});
 else await page.locator(`#rd-${action}`).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).rdFault.workers[0].terminated)).toBe(true);
 const before=await snapshot(page);await stale(page);expect(await snapshot(page)).toEqual(before);
 expect(await page.evaluate(()=>(window as any).rdFault.workers[0].terminated)).toBe(true);
});
test('interruption then new request rejects old instance even with current request id',async({page})=>{
 await install(page);await page.locator('#rd-step').click();await page.locator('#rd-stop').click();await page.locator('#rd-play').click();const before=await snapshot(page);await stale(page);expect(await snapshot(page)).toEqual(before);
 expect(await page.evaluate(()=>(window as any).rdFault.workers.length)).toBe(2);await complete(page);await expect(page.locator('#rd-canvas')).toHaveAttribute('data-step','16');await expect(page.locator('#rd-play')).toHaveText('一時停止');
});
test('retired instance cannot affect remount; active instance error must stop',async({page})=>{
 await install(page);await page.locator('#rd-play').click();await page.locator('#experiment').selectOption('wave');await page.locator('#experiment').selectOption('reaction');const before=await snapshot(page);await stale(page);expect(await snapshot(page)).toEqual(before);
 await page.locator('#rd-play').click();await page.evaluate(()=>(window as any).rdFault.workers.at(-1).error());await expect(page.locator('#rd-error')).toContainText('Workerで計算できません');await expect(page.locator('#rd-play')).toHaveText('再生');
});
test('queued playback callback cannot start a new generation; idle stop does not recreate',async({page})=>{
 await install(page);await page.locator('#rd-play').click();await complete(page);await page.locator('#rd-stop').click();await page.locator('#rd-step').click();const before=await snapshot(page);const count=await page.evaluate(()=>(window as any).rdFault.workers.at(-1).requests.length);await stale(page);expect(await snapshot(page)).toEqual(before);expect(await page.evaluate(()=>(window as any).rdFault.workers.at(-1).requests.length)).toBe(count);
 await complete(page);await page.locator('#rd-stop').click();await page.locator('#rd-stop').click();expect(await page.evaluate(()=>(window as any).rdFault.workers.length)).toBe(2);
});
test('replacement construction failure is visible and cannot resume from lesson',async({page})=>{
 await install(page);await page.locator('#rd-play').click();await page.locator('#rd-lesson').click();await page.evaluate(()=>{window.Worker=class{constructor(){throw Error('replacement unavailable');}} as unknown as typeof Worker;});await page.locator('#rd-step').click();await expect(page.locator('#rd-error')).toContainText('Worker作成失敗');await page.locator('#rd-close').click();await expect(page.locator('#rd-error')).toContainText('Worker作成失敗');await expect(page.locator('#rd-play')).toHaveText('再生');
});
for(const width of [320,375,390,1280])test(`pointer ownership, cancellation, outside movement and release ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const canvas=page.locator('#rd-canvas');await canvas.scrollIntoViewIfNeeded();
 const box=(await canvas.boundingBox())!;await page.mouse.move(box.x+box.width*.1,box.y+box.height*.1);await page.mouse.down();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.3,{steps:4});await page.mouse.up();const released=await snapshot(page);await page.mouse.move(box.x+box.width*.8,box.y+box.height*.8);expect(await snapshot(page)).toEqual(released);
 await canvas.evaluate(c=>{c.setPointerCapture=()=>{};});
 const send=async(type:string,id:number,x:number,y:number)=>canvas.evaluate((c,args)=>{const r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent(args.type,{pointerId:args.id,button:0,clientX:r.left+r.width*args.x,clientY:r.top+r.height*args.y}));},{type,id,x,y});
 await send('pointerdown',1,.1,.1);await send('pointerdown',2,.2,.2);
 for(const end of ['pointerup','pointercancel','lostpointercapture']){await send(end,2,.2,.2);await send('pointermove',1,.4,.4);await expect(page.locator('#rd-x')).toHaveValue('51');}
 const before=await snapshot(page);await send('pointermove',1,1.1,.4);expect(await snapshot(page)).toEqual(before);
 for(const end of ['pointerup','pointercancel','lostpointercapture']){await send(end,1,.4,.4);const stopped=await snapshot(page);await send('pointermove',1,.8,.8);expect(await snapshot(page)).toEqual(stopped);await send('pointerdown',1,.4,.4);}
 await send('pointerup',1,.4,.4);await canvas.click({position:{x:20,y:20}});await page.mouse.move(40,40);await expect(page.locator('#rd-canvas')).toHaveAttribute('data-v','0.25');
});
test('legend matches grayscale and switching display leaves grid unchanged',async({page})=>{
 const before=await page.locator('#rd-observation').textContent();await page.locator('#rd-display').selectOption('contrast');await expect(page.locator('.rd-stage + p')).toContainText('黒 0 → 白 0.5');await expect(page.locator('.rd-stage + p')).not.toContainText('金色');await expect(page.locator('#rd-observation')).toHaveText(before!);await page.locator('#rd-display').selectOption('color');await expect(page.locator('.rd-stage + p')).toContainText('暗色 0 → 青 → 金色 0.5');
});
