// Independent component execution: extract production CSS/MathML, bypass app E2E.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import os from 'node:os';
import {chromium,webkit} from '@playwright/test';

const out=dirname(fileURLToPath(import.meta.url)),repo=resolve(out,'../../../..');
const source=readFileSync(resolve(repo,'src/segregation-view.ts'),'utf8');
const globalCss=readFileSync(resolve(repo,'src/style.css'),'utf8');
const css=readFileSync(resolve(repo,'src/segregation.css'),'utf8');
const sha=value=>createHash('sha256').update(value.replace(/\r\n/g,'\n')).digest('hex');
const formula=source.match(/<div class="sm-formula">([\s\S]*?)<\/div><p>空き家/);
if(!formula)throw new Error('Cannot extract the production formula');
const fragment=`<div class="sm-formula">${formula[1]}</div>`;
if(!fragment.includes('sm-math-scroll'))throw new Error('Wait for the proposed wrapper implementation before running');
const original=execFileSync('git',['show','caa3f0a:src/segregation-view.ts'],{cwd:repo}).toString('utf8');
const originalMath=original.match(/<math[\s\S]*?<\/math>/)?.[0];
const currentMath=fragment.match(/<math[\s\S]*?<\/math>/)?.[0];
const meta={at:new Date().toISOString(),method:'Extract actual production CSS and MathML; page.setContent; no app E2E imports',platform:os.platform(),os:os.release(),arch:os.arch(),node:process.version,playwright:JSON.parse(readFileSync(resolve(repo,'node_modules/@playwright/test/package.json'),'utf8')).version,head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo}).toString('utf8').trim(),sourceHashes:{view:sha(source),globalCss:sha(globalCss),css:sha(css),currentMath:sha(currentMath??''),originalMath:sha(originalMath??'')},mathMarkupUnchanged:originalMath===currentMath,limits:['Windows browser binaries only; this is not a replacement for Linux/WebKit 200%.','The isolated component does not prove whole-application regression or real-device behavior.']};
mkdirSync(out,{recursive:true});
const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true,...(name==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}: {})});
  for(const theme of ['light','dark'])for(const scale of [1,2,3]){
    const page=await browser.newPage({viewport:{width:375,height:1000},colorScheme:theme,reducedMotion:'reduce'}),key=`${name}-${theme}-375-${scale}x`;
    const errors=[];
    await page.setContent(`<!doctype html><html lang="ja" style="font-size:${scale*100}%"><head><meta charset="utf-8"><style>${globalCss}</style><style>${css}</style></head><body><div id="app"><div id="experiment-root"><main class="mosaic"><section class="sm-panel"><h2>局所の条件、全体の模様</h2>${fragment}</section></main></div></div></body></html>`);
    await page.evaluate(()=>document.fonts.ready);
    const inspect=()=>page.evaluate(()=>{
      const region=document.querySelector('.sm-math-scroll'),math=region.querySelector('math'),first=math.firstElementChild,last=math.lastElementChild,r=el=>{const b=el.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height};};
      const c=getComputedStyle(region);
      return {innerWidth,rootScrollWidth:document.documentElement.scrollWidth,bodyScrollWidth:document.body.scrollWidth,rootOverflowX:getComputedStyle(document.documentElement).overflowX,bodyOverflowX:getComputedStyle(document.body).overflowX,mainOverflowX:getComputedStyle(document.querySelector('main')).overflowX,rootFont:getComputedStyle(document.documentElement).fontSize,mathFont:getComputedStyle(math).fontSize,region:{rect:r(region),scrollWidth:region.scrollWidth,clientWidth:region.clientWidth,scrollLeft:region.scrollLeft,clientHeight:region.clientHeight,overflowX:c.overflowX,outlineStyle:c.outlineStyle,outlineWidth:c.outlineWidth,role:region.getAttribute('role'),label:region.getAttribute('aria-label'),tabIndex:region.tabIndex,focused:document.activeElement===region},math:{rect:r(math),text:math.textContent,first:r(first),last:r(last)}};
    });
    const region=page.locator('.sm-math-scroll');await page.keyboard.press('Tab');
    const start=await inspect();
    if(start.rootScrollWidth>375||start.bodyScrollWidth>375)errors.push('Document still overflows');
    if(Math.abs(parseFloat(start.mathFont)-22.4*scale)>.02)errors.push('Formula did not preserve root text magnification');
    if([start.rootOverflowX,start.bodyOverflowX,start.mainOverflowX].some(v=>v==='hidden'||v==='clip'))errors.push('Global overflow masking');
    if(!start.region.focused||start.region.tabIndex!==0||start.region.role!=='region'||!start.region.label)errors.push('Missing accessible focusable region');
    if(start.region.outlineStyle==='none')errors.push('No visible focus outline');
    if(start.math.rect.top<start.region.rect.top-.5||start.math.rect.bottom>start.region.rect.bottom+.5)errors.push('Vertical formula clipping');
    await page.screenshot({path:resolve(out,`${key}-start.png`),fullPage:true});
    const overflows=start.region.scrollWidth>start.region.clientWidth;
    if(overflows){for(let i=0;i<18;i++){await page.keyboard.press('ArrowRight');await page.waitForTimeout(80);const p=await inspect();if(p.region.scrollLeft>=p.region.scrollWidth-p.region.clientWidth-1)break;}}
    const end=await inspect();
    if(overflows){
      if(end.region.scrollLeft<=0)errors.push('ArrowRight did not scroll');
      if(end.math.last.right>end.region.rect.right+.5||end.math.last.left<end.region.rect.left-.5)errors.push('Terminal theta is unreachable');
      await region.screenshot({path:resolve(out,`${key}-end.png`)});
      for(let i=0;i<18;i++){await page.keyboard.press('ArrowLeft');await page.waitForTimeout(80);if((await inspect()).region.scrollLeft<=1)break;}
    }
    const back=await inspect();if(overflows&&(back.region.scrollLeft>1||back.math.first.left<back.region.rect.left-.5))errors.push('ArrowLeft cannot restore the beginning');
    const result={...meta,browser:name,browserVersion:browser.version(),viewport:{width:375,height:1000},theme,scale,overflows,start,end,back,errors,passed:errors.length===0&&meta.mathMarkupUnchanged};
    results.push(result);writeFileSync(resolve(out,`${key}.json`),JSON.stringify(result,null,2));
    await page.close();
  }
  await browser.close();
}
const endSourceHashes={view:sha(readFileSync(resolve(repo,'src/segregation-view.ts'),'utf8')),globalCss:sha(readFileSync(resolve(repo,'src/style.css'),'utf8')),css:sha(readFileSync(resolve(repo,'src/segregation.css'),'utf8'))};
const sourcesStable=Object.entries(endSourceHashes).every(([key,value])=>meta.sourceHashes[key]===value);
const summary={...meta,endSourceHashes,sourcesStable,cases:results.length,passed:results.filter(r=>r.passed).length,results:results.map(({browser,theme,scale,overflows,start,end,back,errors,passed})=>({browser,theme,scale,overflows,rootWidth:start.rootScrollWidth,mathWidth:start.math.rect.width,mathFont:start.mathFont,scrollStart:start.region.scrollLeft,scrollEnd:end.region.scrollLeft,scrollBack:back.region.scrollLeft,errors,passed}))};
writeFileSync(resolve(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(summary.passed!==summary.cases||!sourcesStable)process.exitCode=1;
