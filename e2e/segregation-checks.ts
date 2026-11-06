import {test,expect,type Page} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';

async function open(page:Page){await page.goto('./');await page.locator('#experiment').selectOption('segregation');await expect(page.locator('#sm-step-count')).toHaveText('0');}
async function range(page:Page,id:string,value:number){await page.locator(id).fill(String(value));await page.locator(id).dispatchEvent('input');}
async function step(page:Page,n=1){for(let i=0;i<n;i++)await page.locator('#sm-step').click();}
async function image(page:Page){return page.locator('#sm-city').evaluate((el:HTMLCanvasElement)=>el.toDataURL());}
async function observation(page:Page){return page.locator('#sm-selection').textContent();}
async function raster(page:Page){return page.locator('#sm-city').evaluate((el:HTMLCanvasElement)=>{
  const ctx=el.getContext('2d')!,n=Number((document.querySelector('#sm-size') as HTMLSelectElement).value),u=el.width/n,colors=[[22,35,51],[237,137,123],[117,190,215]],cells:number[]=[];
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){const p=ctx.getImageData(Math.floor((x+.64)*u),Math.floor((y+.64)*u),1,1).data;let closest=0,dist=Infinity;colors.forEach((c,i)=>{const d=c.reduce((s,v,k)=>s+(v-p[k])**2,0);if(d<dist){closest=i;dist=d;}});cells.push(closest);}
  let pairs=0,same=0,unhappy=0;const threshold=Number(document.querySelector('#sm-applied')!.textContent!.match(/θ=(\d+)/)![1]);
  for(let i=0;i<cells.length;i++){if(!cells[i])continue;let local=0,like=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const y=Math.floor(i/n)+dy,x=i%n+dx;if((!dx&&!dy)||x<0||x>=n||y<0||y>=n)continue;const j=y*n+x;if(!cells[j])continue;local++;if(cells[i]===cells[j])like++;if(j>i){pairs++;if(cells[i]===cells[j])same++;}}if(local&&like*100<threshold*local)unhappy++;}
  const population=cells.filter(Boolean).length;
  return {red:cells.filter(v=>v===1).length,blue:cells.filter(v=>v===2).length,empty:cells.filter(v=>v===0).length,unhappy,adjacency:pairs?`${(same/pairs*100).toFixed(1)}%`:'データなし',satisfaction:population?`${((population-unhappy)/population*100).toFixed(1)}%`:'データなし'};
});}

test('play, pause, exact step, reset, seed and speed invariance',async({page})=>{
  await open(page);const start=await image(page);await step(page,6);const after=await image(page);expect(after).not.toBe(start);await page.locator('#sm-reset').click();expect(await image(page)).toBe(start);
  await range(page,'#sm-speed',30);await page.locator('#sm-play').click();await expect.poll(async()=>Number(await page.locator('#sm-step-count').textContent())).toBeGreaterThan(3);await page.locator('#sm-play').click();const paused=await page.locator('#sm-step-count').textContent();await page.waitForTimeout(200);await expect(page.locator('#sm-step-count')).toHaveText(paused!);
  await page.locator('#sm-reset').click();await range(page,'#sm-speed',1);await step(page,6);expect(await image(page)).toBe(after);
  await page.locator('#sm-reset').click();await page.locator('#sm-new-seed').click();expect(await image(page)).not.toBe(start);await expect(page.locator('main.mosaic')).not.toHaveAttribute('data-seed','15015');
});

test('drafts, all presets, explicit apply, same-city experiments and frozen result',async({page})=>{
  await open(page);const initial=await image(page);for(let i=0;i<6;i++){await page.locator('#sm-preset').selectOption(String(i));expect(await image(page)).toBe(initial);await expect(page.locator('#sm-step-count')).toHaveText('0');await expect(page.locator('#sm-preset-note')).toContainText('未適用');}
  await page.locator('#sm-preset').selectOption('1');await step(page,5);await page.locator('#sm-pin').click();await expect(page.locator('#sm-baseline-title')).toContainText('5 判断');
  await range(page,'#sm-threshold',50);await page.locator('#sm-rule').selectOption('best');await range(page,'#sm-red',80);await page.locator('#sm-rerun').click();await expect(page.locator('#sm-applied')).toContainText('赤50%');await expect(page.locator('#sm-applied')).toContainText('θ=50%');await expect(page.locator('#sm-applied')).toContainText('C ·');await expect(page.locator('#sm-step-count')).toHaveText('0');expect(await image(page)).not.toBe(initial); // comparison changes the displayed canvas size
  await page.locator('#sm-baseline-choice').selectOption('initial');await expect(page.locator('#sm-baseline-title')).toContainText('初期');await page.locator('#sm-baseline-choice').selectOption('reference');await expect(page.locator('#sm-baseline-title')).toContainText('5 判断');
  await page.locator('#sm-compare').click();expect(await image(page)).toBe(initial);
  await page.locator('#sm-seed').fill('');await page.locator('#sm-settings button[type=submit]').click();await expect(page.locator('#sm-error')).toContainText('未適用');await expect(page.locator('#sm-step-count')).toHaveText('0');
  await page.locator('#sm-seed').fill('42');await page.locator('#sm-size').selectOption('16');await range(page,'#sm-vacancy',25);await page.locator('#sm-settings button[type=submit]').click();await expect(page.locator('#sm-population')).toContainText('空き家 64軒');
});

test('raster city, displayed statistics and chart endpoints agree',async({page})=>{
  await open(page);await page.locator('#sm-patterns').uncheck();await page.locator('#sm-marks').uncheck();await step(page,15);
  const r=await raster(page);await expect(page.locator('#sm-population')).toContainText(`赤 ${r.red}人 ／ 青 ${r.blue}人 ／ 空き家 ${r.empty}軒`);await expect(page.locator('#sm-satisfaction')).toHaveText(r.satisfaction);await expect(page.locator('#sm-adjacency')).toHaveText(r.adjacency);await expect(page.locator('#sm-unhappy')).toHaveText(`${r.unhappy} 人`);
  await expect(page.locator('#sm-chart-satisfaction')).toHaveText(r.satisfaction);await expect(page.locator('#sm-chart-adjacency')).toHaveText(r.adjacency);
  const endpoint=await page.locator('#sm-line-satisfaction').getAttribute('d');expect(Number(endpoint!.trim().split(',').at(-1))).toBeCloseTo(18+(1-Number(r.satisfaction.replace('%',''))/100)*142,0);
  await page.locator('#sm-show-satisfaction').uncheck();await expect(page.locator('#sm-line-satisfaction')).toBeHidden();await expect(page.locator('#sm-line-adjacency')).toBeVisible();await page.locator('#sm-show-adjacency').uncheck();await expect(page.locator('#sm-line-adjacency')).toBeHidden();
  await page.locator('#sm-compare').click();await expect(page.locator('#sm-baseline')).toBeVisible();await expect(page.locator('#sm-baseline')).toHaveAttribute('data-painted-step','0');await expect(page.locator('#sm-city')).toHaveAttribute('data-painted-step','15');
});

test('resident ID follows one selected move and local counts exclude the source',async({page})=>{
  await open(page);await page.locator('#sm-lesson-toggle').click();await page.locator('[data-sm-lesson="1"]').click();const text=(await observation(page))!,id=text.match(/ID (\d+)/)![1];await expect(page.locator('#sm-selected-step')).toBeEnabled();await page.locator('#sm-selected-step').click();await expect(page.locator('#sm-selection')).toContainText(`住民ID ${id}`);await expect(page.locator('#sm-step-count')).toHaveText('1');await expect(page.locator('#sm-last')).toContainText(`ID ${id}`);expect(await observation(page)).not.toBe(text);await expect(page.locator('#sm-neighborhood span')).toHaveCount(9);await expect(page.locator('#sm-local-counts')).toContainText('街の外は除外');
});

test('four lesson stages gate controls, synchronize math, quiz and restore drafts/state',async({page})=>{
  await open(page);await step(page,3);await range(page,'#sm-threshold',47);const before=await image(page);await page.locator('#sm-lesson-toggle').click();await expect(page.locator('#sm-play')).toBeDisabled();await expect(page.locator('#sm-threshold')).toBeDisabled();await expect(page.locator('#sm-lesson-title')).toContainText('赤と青の街');
  for(let i=1;i<=3;i++){await page.locator('#sm-lesson-next').click();await expect(page.locator('#sm-lesson-title')).toContainText(`${i+1}.`);}
  await expect(page.locator('#sm-threshold')).toBeEnabled();await page.locator('[name=sm-answer][value=whole]').check();await expect(page.locator('#sm-answer')).toContainText('もう一度');await page.locator('[name=sm-answer][value=local]').check();await expect(page.locator('#sm-answer')).toContainText('その通り');await page.keyboard.press('Escape');await expect(page.locator('#sm-lesson')).toBeHidden();await expect(page.locator('#sm-step-count')).toHaveText('3');await expect(page.locator('#sm-threshold')).toHaveValue('47');expect(await image(page)).toBe(before);await expect(page.locator('#sm-lesson-toggle')).toBeFocused();
});

test('boundaries, empty/full populations, rules and repeated work switching',async({page})=>{
  await open(page);for(const rule of ['random','satisfying','best']){await page.locator('#sm-rule').selectOption(rule);await page.locator('#sm-settings button[type=submit]').click();await step(page,2);await expect(page.locator('#sm-step-count')).toHaveText('2');}
  await range(page,'#sm-vacancy',0);await range(page,'#sm-threshold',100);await page.locator('#sm-settings button[type=submit]').click();await expect(page.locator('#sm-status')).toContainText('有効な移動先なし');await expect(page.locator('#sm-play')).toBeDisabled();
  await range(page,'#sm-vacancy',100);await page.locator('#sm-settings button[type=submit]').click();await expect(page.locator('#sm-adjacency')).toHaveText('データなし');await expect(page.locator('#sm-satisfaction')).toHaveText('データなし');
  for(let i=0;i<3;i++){await page.locator('#experiment').selectOption('segregation');await page.locator('#sm-play').click();await page.locator('#experiment').selectOption('cobweb');await expect(page.locator('#sm-city')).toHaveCount(0);await page.locator('#experiment').selectOption('segregation');await expect(page.locator('#sm-step-count')).toHaveText('0');}
});

test('keyboard, zoom, reduced motion and rendering options preserve calculations',async({page})=>{
  await open(page);await page.locator('#sm-city').focus();await expect(page.locator('#sm-city')).toBeFocused();await page.keyboard.press('ArrowRight');await expect(page.locator('#sm-selection')).toContainText('列2');await page.locator('#sm-zoom').selectOption('2');await expect.poll(()=>page.locator('#sm-city').evaluate(el=>el.getBoundingClientRect().width/el.parentElement!.getBoundingClientRect().width)).toBeGreaterThan(1.9);await page.locator('#sm-zoom').selectOption('1');
  await page.locator('#sm-row').fill('5');await page.locator('#sm-col').fill('6');await page.locator('#sm-position button').click();await expect(page.locator('#sm-selection')).toContainText('行5 列6');
  await page.locator('#sm-play').click();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('main')).toHaveAttribute('data-playing','false');const count=await page.locator('#sm-step-count').textContent();await page.locator('#sm-patterns').uncheck();await page.locator('#sm-marks').uncheck();await expect(page.locator('#sm-step-count')).toHaveText(count!);await step(page);await expect(page.locator('#sm-step-count')).toHaveText(String(Number(count)+1));
});

for(const width of [375,390,765,1280])for(const theme of ['light','dark'] as const)test(`layout ${width}px ${theme}`,async({page},info)=>{
  await page.setViewportSize({width,height:1000});await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});await open(page);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await step(page,20);await page.locator('#sm-compare').click();await expect(page.locator('#sm-baseline')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.locator('#sm-city').focus();await expect(page.locator('#sm-city')).toBeFocused();await page.evaluate(()=>document.documentElement.style.fontSize='');
  if(process.env.SM_CAPTURE){const dir=`docs/segregation/screenshots/${process.env.SM_PHASE??'development'}`;mkdirSync(dir,{recursive:true});await page.screenshot({path:`${dir}/${info.project.name}-${width}-${theme}.png`,fullPage:true});}
  expect(errors).toEqual([]);
});

test('maximum grid and speed timing sample',async({page},info)=>{
  await open(page);await page.locator('#sm-size').selectOption('40');await page.locator('#sm-rule').selectOption('best');await range(page,'#sm-threshold',80);await page.locator('#sm-settings button[type=submit]').click();await range(page,'#sm-speed',30);
  await page.evaluate(()=>{const timings:number[]=[],main=document.querySelector('main')!;let start=0;main.addEventListener('click',e=>{if((e.target as HTMLElement).id==='sm-step')start=performance.now();},true);main.addEventListener('click',e=>{if((e.target as HTMLElement).id==='sm-step')timings.push(performance.now()-start);});(window as unknown as {smTimings:number[]}).smTimings=timings;});
  const timings:number[]=[];for(let i=0;i<12;i++){const t=Date.now();await page.locator('#sm-step').click();timings.push(Date.now()-t);}
  await expect(page.locator('#sm-step-count')).toHaveText('12');await page.locator('#sm-play').click();await page.waitForTimeout(1000);await page.locator('#sm-play').click();const total=Number(await page.locator('#sm-step-count').textContent());expect(total).toBeGreaterThan(12);
  const handlerMs=await page.evaluate(()=>(window as unknown as {smTimings:number[]}).smTimings);
  if(process.env.SM_CAPTURE){mkdirSync('docs/segregation/evidence',{recursive:true});writeFileSync(`docs/segregation/evidence/browser-performance-${process.env.SM_PHASE??'development'}-${info.project.name}.json`,JSON.stringify({platform:process.platform,node:process.version,browser:info.project.name,size:40,rule:'best',threshold:80,timings,handlerMs,endToEndClickMedianMs:[...timings].sort((a,b)=>a-b)[6],stepsInApproximatelyOneSecond:total-12},null,2));}
});

test('weak preference reaches a distinct mosaic on the reproducible example',async({page},info)=>{
  await open(page);await page.locator('#sm-step').evaluate(el=>{for(let i=0;i<351;i++)(el as HTMLButtonElement).click();});await expect(page.locator('#sm-status')).toContainText('全住民が満足');await expect(page.locator('#sm-adjacency')).toHaveText('74.7%');await expect(page.locator('#sm-step-count')).toHaveText('351');await page.locator('#sm-compare').click();
  if(process.env.SM_CAPTURE){const dir=`docs/segregation/screenshots/${process.env.SM_PHASE??'development'}`;mkdirSync(dir,{recursive:true});await page.locator('.sm-boards').screenshot({path:`${dir}/${info.project.name}-weak-preference.png`});}
});
