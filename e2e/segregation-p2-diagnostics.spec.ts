import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
import os from 'node:os';

for(const theme of ['light','dark'] as const)test(`P2-01 original 375px ${theme}`,async({page,browser},info)=>{
  await page.setViewportSize({width:375,height:1000});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
  await page.goto('./');await page.locator('#experiment').selectOption('segregation');
  for(let i=0;i<20;i++)await page.locator('#sm-step').click();
  await page.locator('#sm-compare').click();
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  const inspect=()=>page.evaluate(()=>{
    const rect=(el:Element)=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,left:r.left,right:r.right,width:r.width,height:r.height};};
    const details=(el:Element)=>{const c=getComputedStyle(el);return {tag:el.tagName,id:el.id,classes:el.getAttribute('class'),rect:rect(el),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,text:el.textContent?.trim().slice(0,200),style:Object.fromEntries(['display','width','min-width','max-width','box-sizing','grid-template-columns','flex','flex-shrink','flex-wrap','overflow','overflow-x','white-space','overflow-wrap','word-break','font-family','font-size'].map(k=>[k,c.getPropertyValue(k)]))};};
    const candidates=Array.from(document.querySelectorAll('body *')).filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&(r.right>innerWidth||r.left<0);});
    const selectors=['.mosaic','.sm-layout','.sm-art','.sm-boards','.sm-comparison','.sm-board','#sm-city','#sm-baseline','.sm-metrics','.sm-table-wrap','table','#sm-history','.sm-formula','math','.mosaic aside','#sm-settings','#sm-rerun'];
    return {innerWidth,rootScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,rootFont:getComputedStyle(document.documentElement).fontSize,overflowing:candidates.map(el=>({element:details(el),ancestors:[el.parentElement,el.parentElement?.parentElement,el.parentElement?.parentElement?.parentElement].filter(Boolean).map(el=>details(el!))})),candidates:selectors.flatMap(selector=>Array.from(document.querySelectorAll(selector)).map(el=>({selector,...details(el)})))};
  });
  const immediate=await inspect();await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));const settled=await inspect();
  const dir=process.env.SM_P2_EVIDENCE??'test-results/segregation-p2-diagnostics';mkdirSync(dir,{recursive:true});
  const name=`${os.platform()}-${info.project.name}-375-${theme}`;
  writeFileSync(`${dir}/${name}.json`,JSON.stringify({at:new Date().toISOString(),browser:browser.version(),os:{platform:os.platform(),release:os.release()},baseURL:info.project.use.baseURL,viewport:page.viewportSize(),theme,fontScale:2,comparison:true,step:20,immediate,settled},null,2));
  await page.screenshot({path:`${dir}/${name}.png`,fullPage:true});
  console.log(JSON.stringify({name,immediate:{inner:immediate.innerWidth,scroll:immediate.rootScrollWidth},settled:{inner:settled.innerWidth,scroll:settled.rootScrollWidth},overflow: settled.overflowing.map(e=>({tag:e.element.tag,id:e.element.id,classes:e.element.classes,rect:e.element.rect}))}));
  expect(immediate.rootScrollWidth).toBeLessThanOrEqual(immediate.innerWidth);expect(settled.rootScrollWidth).toBeLessThanOrEqual(settled.innerWidth);
});
