import {test} from '@playwright/test';
import {observationFlow,observationPlayback} from '../e2e/twins-observation-checks';
for(const width of [375,1280])test(`production observation ${width}`,async({browser})=>{test.setTimeout(90000);const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width<780,colorScheme:width<780?'light':'dark'}),page=await context.newPage();await page.goto('./');await observationFlow(page);await context.close();});
test('production observation timer',async({page})=>{test.setTimeout(60000);await page.goto('./');await observationPlayback(page);});
