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
    const formula=page.locator('[data-formula=phase] .math-scroll').last();
    await formula.scrollIntoViewIfNeeded();
    expect(await formula.evaluate(el=>el.clientWidth>0 && getComputedStyle(el).overflowX==='auto')).toBe(true);
    await formula.focus();await page.keyboard.press('ArrowRight');
    await page.screenshot({path:`test-results/${test.info().project.name}-${width}-text${scale*100}-phase.png`});
  }
  await page.evaluate(()=>document.documentElement.style.fontSize='100%');
  await page.getByRole('tab',{name:'パラメータ',exact:true}).tap();
  const slider=page.locator('#param-amplitude');await slider.scrollIntoViewIfNeeded();
  const box=(await slider.boundingBox())!;await page.touchscreen.tap(box.x+box.width*.75,box.y+box.height/2);
  expect(await slider.inputValue()).not.toBe('0.22');
  await context.close();
});
