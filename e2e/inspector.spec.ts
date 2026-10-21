import { expect, test } from '@playwright/test';

test('現在値・全スライダー・キーボードタブ・リセットが同期する',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.screenshot({path:`test-results/${test.info().project.name}-desktop-parameters.png`});
  await page.getByRole('tab',{name:'パラメータ',exact:true}).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab',{name:'数式・構造'})).toBeFocused();
  await expect(page.locator('#panel-structures')).toBeVisible();
  await page.screenshot({path:`test-results/${test.info().project.name}-desktop-structures.png`});
  await expect(page.locator('[data-formula=length] math').first()).toHaveText('Ln=L0×rn');
  await expect(page.locator('[data-formula=length] math').last()).toHaveText('Ln=1.15×0.72n');
  await expect(page.locator('[data-formula=heading] math').first()).toHaveText('θchild=θparent±α');
  await expect(page.locator('[data-formula=heading] math').last()).toHaveText('θchild=θparent±0.48');
  await expect(page.locator('[data-formula=endpoint-x] math').first()).toHaveText('xend=xstart+cos(θbranch)×Ln');
  // Fixed L₀ is substituted without the styling reserved for current parameters.
  await expect(page.locator('[data-formula=length] math').last().locator('mn.current-value')).toHaveText('0.72');
  await expect(page.locator('[data-formula=length] math').last().locator('mn:not(.current-value)')).toHaveText('1.15');
  const fields={depth:['7','8'],angle:['0.6','0.48'],shrink:['0.65','0.72'],amplitude:['0.3','0.22'],wavelength:['6','4.5'],speed:['2','1']};
  for(const [key,[changed,initial]] of Object.entries(fields)){
    await expect(page.locator(`output[data-param=${key}]`)).toHaveText(initial);
    await page.getByRole('tab',{name:'パラメータ',exact:true}).click();
    const slider=page.locator(`#param-${key}`);
    await slider.fill(changed);
    await expect(slider.locator('..').locator('output')).toHaveText(changed);
    await page.getByRole('tab',{name:'数式・構造'}).click();
    for(const value of await page.locator(`mn[data-param=${key}]`).all())await expect(value).toHaveText(changed);
    await expect(page.locator(`output[data-param=${key}]`)).toHaveText(changed);
  }
  // Reset while inspecting also updates the hidden controls.
  await page.getByRole('button',{name:'初期値へ'}).click();
  for(const [key,[,initial]] of Object.entries(fields)){
    await expect(page.locator(`output[data-param=${key}]`)).toHaveText(initial);
    await expect(page.locator(`#param-${key}`)).toHaveValue(initial);
  }
  await page.getByRole('tab',{name:'パラメータ',exact:true}).click();
  await page.locator('#param-angle').focus();await page.keyboard.press('ArrowRight');
  await expect(page.locator('#param-angle')).toHaveValue('0.49');
  await page.getByRole('tab',{name:'数式・構造'}).click();
  await expect(page.locator('mn[data-param=angle]')).toHaveText('0.49');
  await page.getByText('ⓘ 変数・実装との対応',{exact:true}).first().click();
  await expect(page.getByText('初期長1.15（固定）。Lₙは世代nの枝長。',{exact:true})).toBeVisible();
  expect(errors).toEqual([]);
});

test('数式はテキストを安全に扱い、アニメーション中に再生成されない',async({page})=>{
  await page.goto('/');
  const result=await page.evaluate(async()=>{
    // @ts-expect-error Vite serves the source module in this browser-only test.
    const {renderMath,createInspector}=await import('/src/inspector.ts');
    // @ts-expect-error Vite serves the calculation module.
    const {defaults,generateTree,sampleTree}=await import('/src/fractal.ts');
    const params=Object.freeze({...defaults});
    const branches=generateTree(params);
    const before=Array.from(sampleTree(branches,2,params));
    const host=document.createElement('div');
    const sync=createInspector(host,params);sync(params);
    const unaffected=JSON.stringify(before)===JSON.stringify(Array.from(sampleTree(branches,2,params)));
    const hostile='<img src=x onerror="window.injected=true"><script>window.injected=true</script>';
    const el=renderMath({tag:'mi',children:[hostile]});
    document.body.append(el);
    const safe=el.textContent===hostile && !el.querySelector('img,script');el.remove();
    let mutations=0;
    const observer=new MutationObserver(records=>mutations+=records.length);
    observer.observe(document.querySelector('#inspector')!,{subtree:true,childList:true,characterData:true});
    await new Promise(resolve=>setTimeout(resolve,250));observer.disconnect();
    return {safe,mutations,unaffected};
  });
  expect(result).toEqual({safe:true,mutations:0,unaffected:true});
});

test('タブ変更後も描画・停止再開・回転・ズームを維持する',async({page})=>{
  await page.goto('/');
  const canvas=page.locator('canvas');
  await expect.poll(async()=> (await canvas.screenshot()).length).toBeGreaterThan(2000);
  await page.getByRole('button',{name:'一時停止'}).click();
  await expect(page.getByRole('button',{name:'再開'})).toHaveAttribute('aria-pressed','true');
  const before=await canvas.screenshot();
  await page.getByRole('tab',{name:'数式・構造'}).click();
  expect(await canvas.screenshot()).toEqual(before);
  const box=(await canvas.boundingBox())!;
  await page.mouse.move(box.x+100,box.y+100);await page.mouse.down();
  await page.mouse.move(box.x+180,box.y+130,{steps:8});await page.mouse.up();
  const rotated=await canvas.screenshot();expect(rotated.equals(before)).toBe(false);
  await page.mouse.wheel(0,250);
  await expect.poll(async()=>(await canvas.screenshot()).equals(rotated)).toBe(false);
  const zoomed=await canvas.screenshot();
  await page.getByRole('button',{name:'再開'}).click();
  await expect.poll(async()=>(await canvas.screenshot()).equals(zoomed)).toBe(false);
});

for(const width of [390,375])test(`${width}px・文字拡大・タッチ操作・数式の横スクロール`,async({browser})=>{
  const context=await browser.newContext({viewport:{width,height:844},hasTouch:true});
  const page=await context.newPage();await page.goto('/');
  await page.getByRole('tab',{name:'数式・構造'}).tap();
  await expect(page.locator('#panel-structures')).toBeVisible();
  for(const scale of [1,2]){
    await page.evaluate(s=>document.documentElement.style.fontSize=`${s*100}%`,scale);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const formula=page.locator('[data-formula=endpoint-x] .math-scroll').last();
    await formula.scrollIntoViewIfNeeded();
    // Some font/browser combinations fit at 100%. Constrain only this test region
    // when necessary; production styles and the rest of the page stay unchanged.
    if(await formula.evaluate(el=>el.scrollWidth<=el.clientWidth))
      await formula.evaluate(el=>el.style.maxWidth='160px');
    expect(await formula.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);
    await expect(formula).toHaveAttribute('tabindex','0');
    await formula.evaluate(el=>el.scrollLeft=0);
    await formula.focus();await page.keyboard.press('ArrowRight');
    await expect.poll(()=>formula.evaluate(el=>el.scrollLeft)).toBeGreaterThan(0);
    // Wait for the native keyboard scroll to settle before reversing it.
    let last=-1;
    await expect.poll(async()=>{
      const current=await formula.evaluate(el=>el.scrollLeft);
      const settled=current===last && current>0;last=current;return settled;
    }).toBe(true);
    const right=await formula.evaluate(el=>el.scrollLeft);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(()=>formula.evaluate(el=>el.scrollLeft)).toBeLessThan(right);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/${test.info().project.name}-${width}-text${scale*100}-endpoint.png`});
    await formula.evaluate(el=>el.style.maxWidth='');
  }
  await page.evaluate(()=>document.documentElement.style.fontSize='100%');
  await page.getByRole('tab',{name:'パラメータ',exact:true}).tap();
  const slider=page.locator('#param-amplitude');await slider.scrollIntoViewIfNeeded();
  const box=(await slider.boundingBox())!;await page.touchscreen.tap(box.x+box.width*.75,box.y+box.height/2);
  expect(await slider.inputValue()).not.toBe('0.22');
  await context.close();
});

test('横幅・表示切替・現在値に応じて必要な数式だけTab移動し、更新中もフォーカスを保つ',async({page})=>{
  await page.goto('/');
  const regions=page.locator('.math-scroll');
  // Initial panel is hidden, so no formula is a tab stop.
  await expect.poll(()=>regions.evaluateAll(els=>els.every(el=>el.getAttribute('tabindex')==='-1'))).toBe(true);
  await page.getByRole('tab',{name:'数式・構造'}).click();
  const short=page.locator('[data-formula=deform-y] .math-scroll').last();
  expect(await short.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await expect(short).toHaveAttribute('tabindex','-1');
  // Verify actual Tab navigation skips the short formula between its neighbors.
  const beforeShort=page.locator('[data-formula=deform-x] .math-scroll').last();
  const afterShort=page.locator('[data-formula=deform-z] .math-scroll').first();
  await beforeShort.evaluate(el=>el.style.maxWidth='100px');
  await afterShort.evaluate(el=>el.style.maxWidth='100px');
  await expect(beforeShort).toHaveAttribute('tabindex','0');
  await expect(afterShort).toHaveAttribute('tabindex','0');
  await beforeShort.focus();await page.keyboard.press('Tab');
  await expect(afterShort).toBeFocused();
  await beforeShort.evaluate(el=>el.style.maxWidth='');
  await afterShort.evaluate(el=>el.style.maxWidth='');

  // Fit the region between the rendered widths for A=0 and A=0.22.
  const formula=beforeShort;
  const wide=await formula.locator('math').evaluate(el=>el.getBoundingClientRect().width);
  const setAmplitude=async(value:string)=>page.locator('#param-amplitude').evaluate((el,value)=>{
    (el as HTMLInputElement).value=value;el.dispatchEvent(new Event('input',{bubbles:true}));
  },value);
  await setAmplitude('0');
  const narrow=await formula.locator('math').evaluate(el=>el.getBoundingClientRect().width);
  expect(wide).toBeGreaterThan(narrow);
  await formula.evaluate((el,width)=>el.style.maxWidth=`${width}px`,Math.ceil((wide+narrow)/2)+8);
  await expect(formula).toHaveAttribute('tabindex','-1');
  await setAmplitude('0.22');
  await expect(formula).toHaveAttribute('tabindex','0');
  await formula.focus();
  const mathHandle=await formula.locator('math').elementHandle();
  await setAmplitude('0');
  await expect(formula).toHaveAttribute('tabindex','-1');
  await expect(formula).toBeFocused();
  // Only math children change during synchronization, preserving its container.
  expect(await formula.locator('math').evaluate((el,original)=>el===original,mathHandle)).toBe(true);
  await setAmplitude('0.22');
  await expect(formula).toHaveAttribute('tabindex','0');
  await expect(formula).toBeFocused();
  await page.getByRole('tab',{name:'パラメータ',exact:true}).click();
  await expect(formula).toHaveAttribute('tabindex','-1');
  await page.getByRole('tab',{name:'数式・構造'}).click();
  await expect(formula).toHaveAttribute('tabindex','0');
  await formula.focus();
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>document.documentElement.style.fontSize='200%');
  await expect(formula).toHaveAttribute('tabindex','0');
  await expect(formula).toBeFocused();
  await formula.evaluate(el=>el.style.maxWidth='');
  await page.evaluate(()=>document.documentElement.style.fontSize='100%');
  await page.setViewportSize({width:1500,height:900});
  await expect(formula).toHaveAttribute('tabindex','-1');
  await expect(formula).toBeFocused();
});
