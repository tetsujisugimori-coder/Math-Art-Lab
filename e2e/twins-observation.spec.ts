import {test,expect} from '@playwright/test';
import {observationFlow,observationPlayback,openObservation,example,obs} from './twins-observation-checks';
import {mstage,jstage,twinsReady,assertCirclePixels} from './twins-checks';
for(const width of [320,375,390,1280])for(const colorScheme of ['dark','light'] as const)test(`observation flow ${width} ${colorScheme}`,async({browser})=>{
 test.setTimeout(90000);const context=await browser.newContext({viewport:{width,height:1000},colorScheme,hasTouch:width<780,deviceScaleFactor:width<780?2:1,reducedMotion:'reduce'}),page=await context.newPage();await page.goto('/');
 const capture=process.env.OBS_CAPTURE&&((width===1280&&colorScheme==='dark')||(width===375&&colorScheme==='light'))?`docs/fractal-twins/observation-${test.info().project.name}-${width}-${colorScheme}.png`:undefined;
 await observationFlow(page,capture);await context.close();
});
test('observation latest selection survives asynchronous rendering',async({page})=>{
 await page.goto('/');await openObservation(page);await example(page,'toward');
 await page.evaluate(()=>{const re=document.querySelector<HTMLInputElement>('#twins-real')!,im=document.querySelector<HTMLInputElement>('#twins-imaginary')!,n=document.querySelector<HTMLInputElement>('#twins-iterations')!,form=document.querySelector<HTMLFormElement>('#twins-form')!;n.value='500';im.value='0';for(let i=0;i<12;i++){re.value=String(i===11?0:-.8+i*.01);form.requestSubmit();}document.querySelector<HTMLButtonElement>('#twins-observation-step')!.click();});
 await expect(page.locator(obs)).toHaveAttribute('data-n','1');await twinsReady(page);await expect(page.locator(obs)).toHaveAttribute('data-n','1');await expect(page.locator(obs)).toHaveAttribute('data-z',JSON.stringify({re:.25,im:0}));await expect(page.locator(obs)).toHaveAttribute('data-c',JSON.stringify({re:0,im:0}));await assertCirclePixels(page);
 const ids=await Promise.all([mstage,jstage].map(s=>page.locator(s).getAttribute('data-requested-id')));await example(page,'return');await twinsReady(page);
 const before=await Promise.all([mstage,jstage].map(s=>page.locator(s).getAttribute('data-requested-id')));
 const elapsed=await page.evaluate(()=>{const start=performance.now(),step=document.querySelector<HTMLButtonElement>('#twins-observation-step')!;for(let i=0;i<50;i++)step.click();return performance.now()-start;});
 await expect(page.locator(obs)).toHaveAttribute('data-n','50');expect(await Promise.all([mstage,jstage].map(s=>page.locator(s).getAttribute('data-requested-id')))).toEqual(before);expect(Number(before[1])).toBeGreaterThan(Number(ids[1]));
 console.log(`Observation 50 steps + SVG DOM updates: ${elapsed.toFixed(1)}ms; background requests unchanged (single run, no frame-time claim).`);
});
test('observation timer lifecycle',async({page})=>{test.setTimeout(60000);await page.goto('/');await observationPlayback(page);});
test('observation bounded history, touch selection and rejected c',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:1000},hasTouch:true}),page=await context.newPage();await page.goto('/');await openObservation(page);await example(page,'return');
 await page.locator('#twins-iterations').fill('50');await page.locator('#twins-form button').click();await twinsReady(page);
 await page.evaluate(()=>{for(let i=0;i<55;i++)document.querySelector<HTMLButtonElement>('#twins-observation-step')!.click();});await expect(page.locator(obs)).toHaveAttribute('data-n','50');await expect(page.locator(obs)).toHaveAttribute('data-status','limit');await expect(page.locator('#twins-observation-omission')).toContainText('19点');await expect(page.locator('.obs-past')).toHaveCount(31);
 await page.locator(`${mstage} canvas`).tap({position:{x:150,y:100}});await twinsReady(page);await expect(page.locator(obs)).toHaveAttribute('data-n','0');
 for(let i=0;i<2;i++)await page.locator('[data-view="mandelbrot"][data-action="out"]').click();await twinsReady(page);const c=await page.locator(obs).getAttribute('data-c');await page.locator('#twins-observation-step').click();const n=await page.locator(obs).getAttribute('data-n');
 await page.locator(`${mstage} canvas`).tap({position:{x:5,y:5}});await expect(page.locator('#twins-mandelbrot-selection')).toContainText('未適用');await expect(page.locator(obs)).toHaveAttribute('data-c',c!);await expect(page.locator(obs)).toHaveAttribute('data-n',n!);await context.close();
});
