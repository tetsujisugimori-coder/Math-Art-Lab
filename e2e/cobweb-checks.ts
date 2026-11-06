import {expect,test,type Page} from '@playwright/test';

async function open(page:Page){await page.goto('./');await page.locator('#experiment').selectOption('cobweb');await expect(page.locator('#cw-price')).toHaveText('40');}
async function steps(page:Page,n:number){for(let i=0;i<n;i++)await page.locator('#cw-step').click();}
const number=async(page:Page,id:string)=>Number(await page.locator(id).textContent());
// Read composited PNG pixels: computed background alone missed native WebKit paint.
async function checkSelectContrast(page:Page,selector:string){
  const select=page.locator(selector),png=await select.screenshot({scale:'css'});
  const foreground=await select.evaluate(el=>getComputedStyle(el).color.match(/[\d.]+/g)!.slice(0,3).map(Number));
  const background=await page.evaluate(async base64=>{
    const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d')!;ctx.drawImage(image,0,0);
    return Array.from(ctx.getImageData(12,8,1,1).data).slice(0,3);
  },png.toString('base64'));
  const luminance=(rgb:number[])=>rgb.map(v=>{const c=v/255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[0.2126,0.7152,0.0722][i],0);
  const a=luminance(foreground),b=luminance(background);
  expect((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05),`${selector}: text versus painted background`).toBeGreaterThanOrEqual(4.5);
}

test.use({reducedMotion:'reduce'});
test('one period follows supply at old price then demand at new price, with exact SVG corners',async({page})=>{
  await open(page);await expect(page.locator('#cw-quantity')).toHaveText('80');await expect(page.locator('#cw-update')).toContainText('Qₜ₊₁=26 → Pₜ₊₁=94');
  await steps(page,1);await expect(page.locator('#cw-period')).toHaveText('1');await expect(page.locator('#cw-price')).toHaveText('94');await expect(page.locator('#cw-quantity')).toHaveText('26');
  const path=page.locator('.cw-history path');await expect(path).toHaveCount(1);
  const corners=await path.getAttribute('d'),viewBox=(await page.locator('#cw-chart').getAttribute('viewBox'))!.split(' ').map(Number);
  const [, ,w,h]=viewBox,left=46,right=w-22,top=34,bottom=h-42;
  const x=(q:number)=>left+q/120*(right-left),y=(p:number)=>bottom-p/120*(bottom-top);
  const values=corners!.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)!.map(Number);
  [x(80),y(40),x(26),y(40),x(26),y(94)].forEach((n,i)=>expect(values[i]).toBeCloseTo(n,7));
  const paused=await page.locator('#cw-update').textContent();await page.waitForTimeout(150);await expect(page.locator('#cw-update')).toHaveText(paused!);
});

test('presets shrink, repeat or grow around their analytical equilibrium; divergence stops without clamping',async({page})=>{
  await open(page);await steps(page,8);expect(Math.abs(await number(page,'#cw-price')-120/1.65)).toBeLessThan(1.1);
  await page.locator('#cw-preset').selectOption('cycle');await steps(page,1);await expect(page.locator('#cw-price')).toHaveText('80');await steps(page,1);await expect(page.locator('#cw-price')).toHaveText('40');
  await page.locator('#cw-preset').selectOption('unstable');const e=120/2.2;await steps(page,5);expect(Math.abs(await number(page,'#cw-price')-e)).toBeGreaterThan(4.55);
  for(let i=0;i<30&&await page.locator('#cw-step').isEnabled();i++)await steps(page,1);
  await expect(page.locator('#cw-status')).toContainText('負');await expect(page.locator('#cw-play')).toBeDisabled();expect(await number(page,'#cw-price')).toBeGreaterThan(0);
  const period=await page.locator('#cw-period').textContent();await page.locator('#cw-mode').selectOption('teach');await expect(page.locator('#cw-period')).toHaveText(period!);await page.locator('#cw-reset').click();await expect(page.locator('#cw-price')).toHaveText('50');await expect(page.locator('#cw-play')).toBeEnabled();
});

test('parameter validation is atomic; apply/reset clears history and changes the actual dynamics',async({page})=>{
  await open(page);await steps(page,2);const old=await page.locator('#cw-update').textContent();
  for(const [name,value] of [['b',''],['b','0'],['d','3'],['initialPrice','121']]){
    await page.locator(`#cw-settings [name=${name}]`).fill(value);await page.locator('#cw-settings button').click();await expect(page.locator('#cw-error')).toContainText('未適用');await expect(page.locator('#cw-update')).toHaveText(old!);await page.locator(`#cw-settings [name=${name}]`).fill(name==='b'?'1':name==='d'?'0.65':'40');
  }
  await page.locator('#cw-settings [name=b]').fill('2');await page.locator('#cw-settings [name=d]').fill('0.5');await page.locator('#cw-settings button').click();await expect(page.locator('#cw-period')).toHaveText('0');await expect(page.locator('.cw-history path')).toHaveCount(0);await steps(page,1);await expect(page.locator('#cw-price')).toHaveText('50');await expect(page.locator('#cw-quantity')).toHaveText('20');
  await page.locator('#cw-settings [name=initialPrice]').fill('48');await page.locator('#cw-settings button').click();await steps(page,2);await expect(page.locator('#cw-price')).toHaveText('48');
  await page.locator('#cw-default').click();await expect(page.locator('#cw-price')).toHaveText('40');await expect(page.locator('#cw-preset')).toHaveValue('stable');
});

test('four-stage lesson restores market, history, mode and unapplied input; keyboard highlight links formulas and curves',async({page})=>{
  await open(page);await steps(page,3);await page.locator('#cw-settings [name=b]').fill('1.7');const old=await page.locator('#cw-update').textContent();
  await page.locator('#cw-lesson-toggle').click();await expect(page.locator('#cw-mode')).toHaveValue('teach');
  for(let i=0;i<4;i++){await page.locator(`[data-cw-lesson="${i}"]`).click();await expect(page.locator('#cw-lesson-title')).toContainText(`${i+1}.`);await expect(page.locator(`[data-cw-lesson="${i}"]`)).toHaveAttribute('aria-pressed','true');}
  await expect(page.locator('#cw-lesson-text')).toContainText('d/b');await page.locator('#cw-preset').selectOption('cycle');await steps(page,1);await page.keyboard.press('Escape');
  await expect(page.locator('#cw-lesson')).toBeHidden();await expect(page.locator('#cw-update')).toHaveText(old!);await expect(page.locator('.cw-history path')).toHaveCount(3);await expect(page.locator('#cw-settings [name=b]')).toHaveValue('1.7');await expect(page.locator('#cw-mode')).toHaveValue('art');
  await page.locator('[data-cw-focus=supply]').focus();await expect(page.locator('main')).toHaveAttribute('data-focus','supply');await expect(page.locator('[data-cw-formula=supply]')).toHaveClass(/cw-selected/);await expect(page.locator('#cw-guide')).toContainText('1期後');
  await page.locator('#cw-clear').click();await expect(page.locator('main')).toHaveAttribute('data-focus','');
});

test('playback traverses both phases; pause, visibility and reduced motion preserve safety through a lesson',async({page})=>{
  await open(page);await page.locator('#cw-play').click();await expect(page.locator('#cw-phase')).toContainText('① 生産の準備');await expect(page.locator('#cw-phase')).toContainText('② 翌期の市場');await expect.poll(()=>number(page,'#cw-period')).toBeGreaterThanOrEqual(1);
  await page.locator('#cw-play').click();const old=await page.locator('#cw-period').textContent();await page.waitForTimeout(200);await expect(page.locator('#cw-period')).toHaveText(old!);
  await page.locator('#cw-play').click();await page.locator('#cw-lesson-toggle').click();await page.locator('#cw-play').click();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  await page.locator('#cw-lesson-toggle').click();await expect(page.locator('#cw-play')).toHaveText('再生');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#cw-play').click();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('#cw-play')).toHaveText('再生');
});

test('history is bounded and switching existing works disposes the animated work',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await open(page);await steps(page,10);
  await page.locator('summary').click();await page.locator('#cw-history').fill('4');await expect(page.locator('.cw-history path')).toHaveCount(4);await expect(page.locator('.cw-history path').first()).toHaveAttribute('data-period','7');
  await page.locator('#cw-play').click();await page.locator('#experiment').selectOption('ripple');await expect(page.getByRole('heading',{name:'波紋の万華鏡',exact:true})).toBeVisible();await page.locator('#experiment').selectOption('cobweb');await expect(page.locator('#cw-period')).toHaveText('0');await expect(page.locator('#cw-play')).toHaveText('再生');expect(errors).toEqual([]);
});

for(const [width,scheme] of [[1280,'dark'],[375,'light'],[320,'dark']] as const){
  test(`responsive real SVG and screenshot ${width} ${scheme}`,async({page},info)=>{
    const errors:string[]=[],failures:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push(r.url()));
    await page.setViewportSize({width,height:900});await page.emulateMedia({colorScheme:scheme});await open(page);await steps(page,7);
    const chart=page.locator('#cw-chart');await expect(chart.locator('.cw-demand')).toBeVisible();await expect(chart.locator('.cw-supply')).toBeVisible();await expect(chart.locator('.cw-equilibrium')).toBeVisible();await expect(chart.locator('.cw-history path')).toHaveCount(7);
    for(const selector of ['#experiment','#cw-mode','#cw-preset'])await checkSelectContrast(page,selector);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    // The mobile renderer uses fewer ticks and CSS-size text, rather than shrinking a desktop viewBox.
    if(width<460){expect((await chart.getAttribute('viewBox'))!.split(' ').map(Number)[2]).toBeLessThan(460);await expect(chart.locator('.cw-tick')).toHaveCount(8);}
    await page.screenshot({path:info.outputPath(`cobweb-${width}-${scheme}.png`),fullPage:true});
    await info.attach('market screenshot',{body:await chart.screenshot(),contentType:'image/png'});
    await page.addStyleTag({content:'html {font-size:200%}'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);expect(failures).toEqual([]);
  });
}
