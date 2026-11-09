import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { presets } from '../src/three-body';
import { reference } from '../tools/three-body-reference';
const slowFrames = () => { const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window), handles = new Map<number, {
    timer: number;
    native?: number;
}>(); let next = -1; window.requestAnimationFrame = callback => { const id = next--; const item: {
    timer: number;
    native?: number;
} = { timer: 0 }; item.timer = window.setTimeout(() => { item.native = request(t => { handles.delete(id); callback(t); }); }, 250); handles.set(id, item); return id; }; window.cancelAnimationFrame = id => { const item = handles.get(id); if (item) {
    clearTimeout(item.timer);
    if (item.native)
        cancel(item.native);
    handles.delete(id);
}
else
    cancel(id); }; };
function captureRaster() {
    const log: unknown[] = [];
    (window as any).__tbRaster = log;
    for (const name of ['setTransform', 'arc', 'fillRect'] as const) {
        const original = (CanvasRenderingContext2D.prototype as any)[name];
        (CanvasRenderingContext2D.prototype as any)[name] = function (...args: unknown[]) { if (this.canvas.id === 'tb-a') {
            log.push({ name, args, width: this.canvas.width, height: this.canvas.height });
            if (log.length > 200)
                log.shift();
        } return original.apply(this, args); };
    }
}
async function open(page: Page) { await page.goto('./'); await page.locator('#experiment').selectOption('three-body'); await settled(page); }
async function settled(page: Page) { await expect(page.locator('.three-body')).toHaveAttribute('data-render-state', 'settled'); await expect.poll(() => page.locator('.three-body').evaluate(el => el.getAttribute('data-step') === el.getAttribute('data-computed-step'))).toBe(true); }
async function coherent(page: Page) { const value = await page.locator('.three-body').evaluate(el => { const d = (el as HTMLElement).dataset, a = (document.querySelector('#tb-a') as HTMLCanvasElement).dataset, b = (document.querySelector('#tb-b') as HTMLCanvasElement).dataset; return { display: d.step, observed: d.observedStep, a: a.paintedStep, b: b.paintedStep, bMode: b.renderMode, reportedB: d.paintedBStep, positions: a.positions, dom: d.domPositions, computed: Number(d.computedStep), graph: Number(d.graphTime), time: Number(d.time), pending: d.renderState === 'pending' }; }); expect(value.observed).toBe(value.display); expect(value.a).toBe(value.display); expect(value.dom).toBe(value.positions); expect(value.computed).toBeGreaterThanOrEqual(Number(value.display)); if (value.bMode === 'side-by-side')
    expect(value.b).toBe(value.display); expect(value.graph).toBeLessThanOrEqual(value.time); return value; }
async function pixelOracle(page: Page) {
    const step = Number(await page.locator('.three-body').getAttribute('data-step')), bodies = reference(presets[0].config, step * .001, .0002);
    const receipt = await page.locator('#tb-a').evaluate((cv: HTMLCanvasElement, bodies) => {
        const makeProbe = () => ['transform', 'scale', 'matrix', 'identity', 'path-transform', 'path-identity', 'path-repeat', 'path-reset', 'path2d-transform', 'path-arc', 'path-shadow', 'path-shadow-identity', 'path-shadow-stroke'].map(method => { const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 200; canvas.style.cssText = 'position:fixed;left:-1000px;top:0;width:100px;height:100px'; document.body.append(canvas); const c = canvas.getContext('2d')!; if (method.includes('transform') || method === 'path-repeat' || method === 'path-reset' || method === 'path-arc' || (method.startsWith('path-shadow') && !method.includes('identity')))
            c.setTransform(2, 0, 0, 2, 0, 0); if (method === 'scale')
            c.scale(2, 2); if (method === 'matrix')
            c.setTransform(new DOMMatrix([2, 0, 0, 2, 0, 0])); c.fillStyle = '#75ddf5'; if (method.startsWith('path-shadow')) {
            c.shadowColor = '#75ddf5';
            c.shadowBlur = 15;
        } if (method === 'path-repeat' || method === 'path-reset') {
            c.beginPath();
            c.rect(10, 10, 10, 10);
            c.fill();
            c.clearRect(0, 0, 200, 200);
            if (method === 'path-reset')
                c.resetTransform();
            c.setTransform(2, 0, 0, 2, 0, 0);
        } const v = method.includes('identity') ? 20 : 10; if (method === 'path2d-transform') {
            const p = new Path2D();
            p.rect(v, v, v, v);
            c.fill(p);
        }
        else if (method.startsWith('path')) {
            c.beginPath();
            if (method === 'path-arc')
                c.arc(15, 15, 5, 0, 2 * Math.PI);
            else
                c.rect(v, v, v, v);
            c.fill();
            if (method === 'path-shadow-stroke') {
                c.strokeStyle = '#fff';
                c.lineWidth = 3;
                c.stroke();
            }
        }
        else
            c.fillRect(v, v, v, v); const rgba = c.getImageData(0, 0, 200, 200).data; let x0 = 200, y0 = 200, x1 = -1, y1 = -1; for (let y = 0; y < 200; y++)
            for (let x = 0; x < 200; x++)
                if (rgba[(y * 200 + x) * 4 + 3]) {
                    x0 = Math.min(x0, x);
                    x1 = Math.max(x1, x);
                    y0 = Math.min(y0, y);
                    y1 = Math.max(y1, y);
                } const m = c.getTransform(); canvas.remove(); return { method, bbox: [x0, y0, x1, y1], atExpected: Array.from(c.getImageData(30, 30, 1, 1).data), atDouble: Array.from(c.getImageData(60, 60, 1, 1).data), matrix: [m.a, m.b, m.c, m.d, m.e, m.f] }; });
        const ctx = cv.getContext('2d')!, scale = Math.min(cv.width, cv.height) / 4, m = ctx.getTransform(), rect = cv.getBoundingClientRect();
        return { drawCalls: (window as any).__tbRaster, step: cv.dataset.paintedStep, positions: cv.dataset.positions, span: cv.dataset.span, dpr: devicePixelRatio, width: cv.width, height: cv.height, rect: { width: rect.width, height: rect.height, left: rect.left, top: rect.top }, matrix: { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f }, samples: bodies.map(p => { const x = Math.floor(cv.width / 2 + p.x * scale), y = Math.floor(cv.height / 2 - p.y * scale); return { x, y, rgba: Array.from(ctx.getImageData(x, y, 1, 1).data) }; }), bitmap: cv.toDataURL('image/png'), probe: makeProbe() };
    }, bodies);
    mkdirSync(test.info().outputDir, { recursive: true });
    writeFileSync(test.info().outputPath('pixel-step-' + step + '.png'), Buffer.from(receipt.bitmap.split(',')[1], 'base64'));
    const { bitmap, ...metadata } = receipt;
    writeFileSync(test.info().outputPath('pixel-step-' + step + '.json'), JSON.stringify({ ...metadata, reference: bodies }, null, 2));
    expect(receipt.samples.every(p => Math.max(...p.rgba.slice(0, 3)) > 150)).toBe(true);
}
for (const dpr of [1, 2])
    test(`three-body review: DPR${dpr} delayed rAF coherent step pause reset comparison lesson hide restore`, async ({ browser, baseURL }) => {
        const context = await browser.newContext({ baseURL, deviceScaleFactor: dpr, viewport: { width: 1280, height: 900 } }), page = await context.newPage();
        try {
            await page.addInitScript(captureRaster);
            await page.addInitScript(slowFrames);
            await open(page);
            await page.locator('#tb-step').click();
            await expect(page.locator('.three-body')).toHaveAttribute('data-render-state', 'pending');
            await coherent(page);
            await settled(page);
            await pixelOracle(page);
            await page.locator('#tb-compare').click();
            await settled(page);
            await page.locator('#tb-speed').fill('4');
            await page.locator('#tb-play').click();
            for (let i = 0; i < 10; i++) {
                await page.waitForTimeout(35);
                await coherent(page);
            }
            await page.keyboard.press('Escape');
            await expect(page.locator('.three-body')).toHaveAttribute('data-playing', 'false');
            await coherent(page);
            await settled(page);
            const stopped = await coherent(page);
            await page.waitForTimeout(300);
            expect((await coherent(page)).computed).toBe(stopped.computed);
            await pixelOracle(page);
            await page.locator('#tb-reset').click();
            await settled(page);
            expect((await coherent(page)).display).toBe('0');
            await page.locator('#tb-end-compare').click();
            await settled(page);
            await page.locator('#tb-lesson-toggle').click();
            await page.locator('#tb-chaos').click();
            await page.keyboard.press('Escape');
            await settled(page);
            expect((await coherent(page)).display).toBe('1');
            await page.locator('#tb-play').click();
            await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
            await expect(page.locator('.three-body')).toHaveAttribute('data-playing', 'false');
            await page.evaluate(() => { delete (document as unknown as Record<string, unknown>).hidden; document.dispatchEvent(new Event('visibilitychange')); });
            await settled(page);
            await coherent(page);
            await page.waitForTimeout(300);
            await expect(page.locator('.three-body')).toHaveAttribute('data-playing', 'false');
        }
        catch (error) {
            mkdirSync(test.info().outputDir, { recursive: true });
            writeFileSync(test.info().outputPath('state.json'), JSON.stringify(await page.locator('.three-body').evaluate(el => ({ ...((el as HTMLElement).dataset), status: document.querySelector('#tb-status')?.textContent, render: document.querySelector('#tb-render-status')?.textContent })), null, 2));
            await page.screenshot({ path: test.info().outputPath('state.png') });
            throw error;
        }
        finally {
            await context.close();
        }
    });
for (const dpr of [1, 2])
    test(`three-body review: DPR${dpr} saturated A/B actual play stop and same display state`, async ({ browser, baseURL }) => {
        const context = await browser.newContext({ baseURL, deviceScaleFactor: dpr, viewport: { width: 1280, height: 900 } }), page = await context.newPage();
        try {
            await open(page);
            await page.locator('#tb-length').fill('6000');
            await page.locator('[data-tb-layer="velocity"]').check();
            await page.locator('[data-tb-layer="acceleration"]').check();
            await page.locator('#tb-compare').click();
            await page.locator('#tb-speed').fill('4');
            await page.locator('#tb-play').click();
            await page.waitForFunction(() => Number((document.querySelector('.three-body') as HTMLElement).dataset.computedStep) >= 26000, null, { timeout: 15000 });
            await page.locator('#tb-play').click({ timeout: 5000 });
            await expect(page.locator('.three-body')).toHaveAttribute('data-playing', 'false');
            await settled(page);
            const state = await coherent(page);
            await expect(page.locator('.three-body')).toHaveAttribute('data-history-length', '6000');
            await expect(page.locator('.three-body')).toHaveAttribute('data-graph-length', '1200');
            await page.waitForTimeout(150);
            expect((await coherent(page)).computed).toBe(state.computed);
            await page.evaluate(slowFrames);
            await page.locator('#tb-play').click();
            await page.waitForTimeout(600);
            await coherent(page);
            await page.keyboard.press('Escape');
            await settled(page);
            const slowStop = await coherent(page);
            await page.waitForTimeout(300);
            expect((await coherent(page)).computed).toBe(slowStop.computed);
            if (process.env.TB_REVIEW_EVIDENCE) {
                mkdirSync(process.env.TB_REVIEW_EVIDENCE, { recursive: true });
                await page.locator('#tb-boards').screenshot({ path: `${process.env.TB_REVIEW_EVIDENCE}/${test.info().project.name}-dpr${dpr}-saturated.png` });
            }
        }
        catch (error) {
            mkdirSync(test.info().outputDir, { recursive: true });
            writeFileSync(test.info().outputPath('state.json'), JSON.stringify(await page.locator('.three-body').evaluate(el => ({ ...((el as HTMLElement).dataset), status: document.querySelector('#tb-status')?.textContent, render: document.querySelector('#tb-render-status')?.textContent })), null, 2));
            await page.screenshot({ path: test.info().outputPath('state.png') });
            throw error;
        }
        finally {
            await context.close();
        }
    });
test('three-body review: retained table inspector graph nodes and exact graph sample time', async ({ page }) => {
    await open(page);
    await page.locator('#tb-compare').click();
    await settled(page);
    await page.evaluate(() => { (window as any).__tbNodes = ['#tb-stats tr', '#tb-symbol dd', '#tb-graph-line', '#tb-graph-table tr'].map(s => document.querySelector(s)); });
    await page.locator('#tb-step').click();
    await settled(page);
    expect(await page.evaluate(() => (window as any).__tbNodes.every((e: Element, i: number) => e === document.querySelector(['#tb-stats tr', '#tb-symbol dd', '#tb-graph-line', '#tb-graph-table tr'][i])))).toBe(true);
    await coherent(page);
    await expect(page.locator('#tb-graph-values')).toContainText('t=0.00000');
    await page.locator('#tb-a').focus();
    await page.keyboard.press('ArrowRight');
    await settled(page);
    await expect(page.locator('#tb-observation')).toContainText('天体2');
});
test('three-body review: repeated disposal cancels delayed render and never resumes old experiment', async ({ page }) => {
    await open(page);
    for (let i = 0; i < 6; i++) {
        await page.locator('#tb-play').click();
        await page.locator('#experiment').selectOption('cooperation');
        await page.locator('#experiment').selectOption('three-body');
        await settled(page);
        await expect(page.locator('.three-body')).toHaveAttribute('data-playing', 'false');
        await expect(page.locator('.three-body')).toHaveAttribute('data-computed-step', '0');
    }
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
});
