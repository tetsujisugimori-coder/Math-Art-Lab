import {expect,type Page,type TestInfo} from '@playwright/test';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';

export async function verifyMosaicLayout(page:Page,info:TestInfo,width:number,theme:'light'|'dark'){
  const dir=process.env.SM_P2_EVIDENCE??'test-results/segregation-layout';mkdirSync(dir,{recursive:true});
  const name=`matrix-${os.platform()}-${info.project.name}-${width}-${theme}`,states:unknown[]=[];
  const settle=async()=>{await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));};
  await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await page.goto('./');await page.locator('#experiment').selectOption('segregation');
  for(let i=0;i<20;i++)await page.locator('#sm-step').click();
  const initialValues=await page.locator('.sm-metrics').textContent();
  async function scrollWithKeyboard(selector:string){
    const region=page.locator(selector);await region.focus();await expect(region).toBeFocused();
    const dimensions=await region.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth}));
    if(dimensions.scroll>dimensions.client){
      await region.press('ArrowRight');await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
      for(let i=0;i<16;i++)await region.press('ArrowRight');
      await expect.poll(()=>region.evaluate(el=>Math.abs(el.scrollWidth-el.clientWidth-el.scrollLeft))).toBeLessThanOrEqual(1);
      for(let i=0;i<17;i++)await region.press('ArrowLeft');
      await expect.poll(()=>region.evaluate(el=>el.scrollLeft)).toBe(0);
    }
    return {...dimensions,keyboardChecked:dimensions.scroll>dimensions.client};
  }
  try{
    for(const fontScale of [1,2]){
      await page.evaluate(scale=>document.documentElement.style.fontSize=`${scale*100}%`,fontScale);
      for(const comparison of [false,true]){
        if((await page.locator('#sm-compare').getAttribute('aria-pressed')==='true')!==comparison)await page.locator('#sm-compare').click();
        await settle();
        const measurement=await page.evaluate(()=>{
          const describe=(el:Element)=>{const r=el.getBoundingClientRect(),c=getComputedStyle(el);return {tag:el.tagName,id:el.id,classes:el.getAttribute('class'),rect:{left:r.left,right:r.right,top:r.top,width:r.width,height:r.height},clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,style:Object.fromEntries(['width','min-width','max-width','display','grid-template-columns','flex-shrink','overflow-x','white-space','overflow-wrap','font-size'].map(k=>[k,c.getPropertyValue(k)]))};};
          const visible=(el:Element)=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0;};
          const escapes=Array.from(document.querySelectorAll('.mosaic *')).filter(visible).filter(el=>{const r=el.getBoundingClientRect();if(r.left>=0&&r.right<=innerWidth)return false;let parent=el.parentElement;while(parent&&parent!==document.body){const c=getComputedStyle(parent);if(c.overflowX==='auto'||c.overflowX==='scroll')return false;parent=parent.parentElement;}return true;}).map(describe);
          const selectors=['.mosaic','.sm-layout','.sm-art','.sm-boards','.sm-board','#sm-city','#sm-baseline','.sm-metrics','.sm-table-wrap','table','#sm-history','.sm-formula','.sm-math-scroll','math','.mosaic aside','#sm-settings'];
          return {innerWidth,rootScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,rootOverflow:getComputedStyle(document.documentElement).overflowX,bodyOverflow:getComputedStyle(document.body).overflowX,escapes,candidates:selectors.flatMap(selector=>Array.from(document.querySelectorAll(selector)).filter(visible).map(el=>({selector,...describe(el)}))),controls:Array.from(document.querySelectorAll('.mosaic button,.mosaic input,.mosaic select,.mosaic summary')).filter(visible).map(describe)};
        });
        const state:{fontScale:number;comparison:boolean;measurement:typeof measurement;keyboard?:unknown}={fontScale,comparison,measurement};states.push(state);
        expect(measurement.rootScrollWidth<=measurement.innerWidth,JSON.stringify(measurement)).toBe(true);
        expect(measurement.bodyScrollWidth<=measurement.innerWidth).toBe(true);
        expect(['hidden','clip']).not.toContain(measurement.rootOverflow);expect(['hidden','clip']).not.toContain(measurement.bodyOverflow);
        expect(measurement.escapes).toEqual([]);
        for(const control of measurement.controls){expect(control.rect.left,control.id).toBeGreaterThanOrEqual(0);expect(control.rect.right,control.id).toBeLessThanOrEqual(width);expect(control.scrollWidth,control.id).toBeLessThanOrEqual(control.clientWidth);}
        for(const id of comparison?['sm-city','sm-baseline']:['sm-city']){
          const canvas=page.locator(`#${id}`);expect(await canvas.evaluate(el=>{const r=el.getBoundingClientRect(),p=el.parentElement!,c=el as HTMLCanvasElement;return r.width<=p.clientWidth&&r.height<=p.clientHeight&&r.width===r.height&&c.width>0&&c.height>0;}),`${id} complete square fits board`).toBe(true);
          await expect(canvas).toHaveAttribute('data-painted-step',id==='sm-city'?'20':'0');
        }
        state.keyboard={table:await scrollWithKeyboard('.sm-table-wrap'),formula:await scrollWithKeyboard('.sm-math-scroll')};
        await page.locator('#sm-city').focus();await expect(page.locator('#sm-city')).toBeFocused();
        expect(await page.locator('.sm-metrics').textContent()).toBe(initialValues);
        if(process.env.SM_P2_EVIDENCE&&fontScale===2&&comparison&&width===375){await page.screenshot({path:`${dir}/${name}-200-comparison.png`,fullPage:true});await page.locator('.sm-formula').screenshot({path:`${dir}/${name}-formula.png`});}
      }
    }
  }catch(error){await page.screenshot({path:`${dir}/${name}-failed.png`,fullPage:true});throw error;}
  finally{
    const source=['src/segregation.css','src/segregation-view.ts','src/segregation-render.ts'].map(path=>({path,sha256Lf:createHash('sha256').update(readFileSync(path,'utf8').replace(/\r\n/g,'\n')).digest('hex')}));
    writeFileSync(`${dir}/${name}.json`,JSON.stringify({at:new Date().toISOString(),browser:info.project.name,browserVersion:page.context().browser()?.version(),os:{platform:os.platform(),release:os.release()},width,theme,step:20,baseURL:info.project.use.baseURL,source,states},null,2));
    await page.evaluate(()=>document.documentElement.style.fontSize='');
  }
}
