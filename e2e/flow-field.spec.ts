import {test,expect} from '@playwright/test';
test('velocity emphasis follows the observed start, not the candidate',async({page})=>{
 await page.addInitScript(()=>{
  type Stroke={color:string;points:[number,number][]};
  const state=window as typeof window & {flowStrokes:Stroke[]};state.flowStrokes=[];
  const proto=CanvasRenderingContext2D.prototype,clear=proto.clearRect,begin=proto.beginPath,move=proto.moveTo,line=proto.lineTo,stroke=proto.stroke;
  let path:[number,number][]=[];
  proto.clearRect=function(...args){state.flowStrokes=[];return clear.apply(this,args);};
  proto.beginPath=function(){path=[];return begin.call(this);};
  proto.moveTo=function(x,y){path.push([x,y]);return move.call(this,x,y);};
  proto.lineTo=function(x,y){path.push([x,y]);return line.call(this,x,y);};
  proto.stroke=function(){state.flowStrokes.push({color:String(this.strokeStyle),points:[...path]});return stroke.call(this);};
 });
 await page.goto('/');await page.locator('#experiment').selectOption('flow');
 await page.locator('#flow-x').fill('1');await page.locator('#flow-y').fill('0');await page.locator('#flow-add').click();
 const canvas=page.locator('#flow-canvas');await canvas.focus();await page.keyboard.press('ArrowUp');
 const read=()=>page.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('#flow-canvas')!;const state=window as typeof window & {flowStrokes:{color:string;points:[number,number][]}[]};return {size:c.width,strokes:state.flowStrokes};});
 const assertArrow=async(color:string,x:number,y:number,dx:number,dy:number)=>{const {size,strokes}=await read();const arrow=strokes.find(s=>s.color===color&&s.points.length===5);expect(arrow,`missing ${color} arrow`).toBeTruthy();expect(arrow!.points[0][0]).toBeCloseTo((x+5)*size/10,1);expect(arrow!.points[0][1]).toBeCloseTo((5-y)*size/10,1);expect(arrow!.points[1][0]-arrow!.points[0][0]).toBeCloseTo(dx*size/10,1);expect(arrow!.points[1][1]-arrow!.points[0][1]).toBeCloseTo(-dy*size/10,1);};
 await expect(page.locator('#flow-observation')).toContainText('出発点 P ≈ (1.000, 0.000)');
 for(const symbol of ['dx/dt','dy/dt']){await page.getByRole('button',{name:symbol,exact:true}).click();await assertArrow('#ffe18a',1,0,0,.18);}
 await page.locator('#flow-unselect').click();expect((await read()).strokes.filter(s=>s.color==='#ffe18a'&&s.points.length===5)).toHaveLength(0);
 await canvas.focus();await page.keyboard.press('Enter');await expect(page.locator('#flow-observation')).toContainText('出発点 P ≈ (1.000, 0.100)');await page.getByRole('button',{name:'dx/dt',exact:true}).click();await assertArrow('#ffe18a',1,.1,-.018,.18);
 await page.locator('#flow-lesson').click();await page.locator('#flow-next').click();await page.locator('#flow-step').click();const t=.2;await assertArrow('#ff9f6e',Math.cos(t)-.1*Math.sin(t),Math.sin(t)+.1*Math.cos(t),-.18*(Math.sin(t)+.1*Math.cos(t)),.18*(Math.cos(t)-.1*Math.sin(t)));
 await page.keyboard.press('Escape');await expect(page.locator('#flow-observation')).toContainText('出発点 P ≈ (1.000, 0.100)');await assertArrow('#ffe18a',1,.1,-.018,.18);
});
test('flow field controls, comparison, lesson and disposal',async({page})=>{
 await page.goto('/');await page.locator('#experiment').selectOption('flow');await expect(page.locator('h1')).toHaveText('風の軌跡');
 await page.locator('#flow-step').click();await expect(page.locator('#flow-observation')).toContainText('0.20 秒');
 await page.locator('#flow-x').fill('2');await page.locator('#flow-y').fill('1');await page.locator('#flow-add').click();await expect(page.locator('#flow-observation')).toContainText('(2.000, 1.000)');
 await page.locator('#flow-model').selectOption('sink');await expect(page.locator('#flow-observation')).toContainText('(2.000, 1.000)');await expect(page.locator('#flow-observation')).toContainText('0.00 秒');
 await page.locator('#flow-a').fill('1e-999');await page.locator('#flow-apply').click();await expect(page.locator('#flow-error')).toContainText('有限値');await expect(page.locator('#flow-equations')).toContainText('a=0.5');
 await page.locator('#flow-lesson').click();await page.locator('#flow-next').click();await page.locator('#flow-step').click();await page.keyboard.press('Escape');await expect(page.locator('#flow-observation')).toContainText('0.00 秒');
 await page.locator('#flow-canvas').focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await expect(page.locator('#flow-count')).toContainText('2 / 16');
 await page.locator('#flow-play').click();await expect(page.locator('#flow-play')).toHaveText('一時停止');await page.locator('#flow-play').click();await expect(page.locator('#flow-play')).toHaveText('再生');
 await page.locator('#experiment').selectOption('wave');await page.locator('#experiment').selectOption('flow');await expect(page.locator('#flow-count')).toContainText('0 / 16');
});
test('motion preference and visibility stop playback',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');await page.locator('#experiment').selectOption('flow');await expect(page.locator('#flow-play')).toHaveText('再生');await page.locator('#flow-play').click();await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#flow-play')).toHaveText('再生');
});
test.describe('touch and DPR 2',()=>{
 test.use({hasTouch:true,deviceScaleFactor:2});
 test('tap selects a point and reduced motion stops a lesson without resuming',async({page})=>{
  await page.goto('/');await page.locator('#experiment').selectOption('flow');const canvas=page.locator('#flow-canvas'),box=(await canvas.boundingBox())!;await page.touchscreen.tap(box.x+box.width*.6,box.y+box.height*.4);await expect(page.locator('#flow-count')).toContainText('1 / 16');expect(Number(await page.locator('#flow-x').inputValue())).toBeCloseTo(1,1);expect(Number(await page.locator('#flow-y').inputValue())).toBeCloseTo(1,1);
  await page.locator('#flow-play').click();await page.locator('#flow-lesson').click();await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#flow-close').click();await expect(page.locator('#flow-play')).toHaveText('再生');
 });
});
for(const width of [320,375,390,751,1024,1280])test(`layout ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/');await page.locator('#experiment').selectOption('flow');for(const scheme of ['light','dark'] as const){await page.emulateMedia({colorScheme:scheme});for(const font of ['100%','200%']){await page.evaluate(value=>{document.documentElement.style.fontSize=value;},font);const dims=await page.evaluate(()=>{const c=document.querySelector<HTMLCanvasElement>('#flow-canvas')!.getBoundingClientRect(),aside=document.querySelector<HTMLElement>('.flow aside')!;return {w:c.width,h:c.height,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,asideHeight:aside.clientHeight,asideScroll:aside.scrollHeight};});expect(Math.abs(dims.w-dims.h)).toBeLessThan(2);expect(dims.scroll).toBeLessThanOrEqual(dims.client+1);expect(dims.asideScroll).toBeLessThanOrEqual(dims.asideHeight+1);}}
});
