import {test} from '@playwright/test';
import {twinsReady} from '../e2e/twins-checks';
import {reviewGestures,reviewSelectionAndFormula} from '../e2e/twins-review-checks';

for(const width of [375,1280])test(`production review selection and MathML ${width}px`,async({browser})=>{
 test.setTimeout(90000);const touch=width<780,context=await browser.newContext({viewport:{width,height:1000},hasTouch:touch,deviceScaleFactor:touch?2:1,colorScheme:touch?'light':'dark',reducedMotion:'reduce'}),page=await context.newPage();
 await page.goto('./');await page.locator('#experiment').selectOption('twins');await twinsReady(page);await reviewSelectionAndFormula(page,touch);await context.close();
});
test('production review pointer lifecycle',async({page})=>{test.setTimeout(60000);await page.goto('./');await page.locator('#experiment').selectOption('twins');await twinsReady(page);await reviewGestures(page);});
