import { expect, test, type Page } from '@playwright/test';
const state = (p: Page) => p.locator('#sd-canvas').evaluate(c => JSON.parse((c as HTMLElement).dataset.state!));
async function ready(p: Page) {
    await expect.poll(() => p.locator('#sd-canvas').evaluate(c => {
        const d = (c as HTMLElement).dataset; return d.drawStatus === 'submitted' && d.revision === d.renderedRevision;
    })).toBe(true);
    await p.evaluate(() => new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))));
}
/** White contour pixels in analytic witness neighborhoods, away from border/cursor/profile. */
async function witnesses(p: Page) {
    return p.locator('#sd-canvas').evaluate((c: HTMLCanvasElement) => {
        const ctx = c.getContext('2d')!;
        function white(x0: number, y0: number, x1: number, y1: number) {
            const left = Math.floor(c.width * (.055 + .89 * x0)), top = Math.floor(c.height * (.945 - .89 * y1));
            const width = Math.max(1, Math.ceil(c.width * .89 * (x1 - x0))), height = Math.max(1, Math.ceil(c.height * .89 * (y1 - y0)));
            const d = ctx.getImageData(left, top, width, height).data; let count = 0;
            // Thin anti-aliased white strokes may blend to gray; the signed field never has this neutral bright color.
            for (let i = 0; i < d.length; i += 4) if (Math.min(d[i], d[i + 1], d[i + 2]) > 120 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) < 45 && d[i + 3] > 200) count++;
            return count;
        }
        return {
            firstOnly: white(.246, .02, .254, .09), // C1=0 at x=1/4; F stays nonzero here.
            secondOnly: white(1 / 6 - .004, .02, 1 / 6 + .004, .09), // C2=0; F nonzero.
            factorYOnly: white(.02, 1 / 6 - .004, .09, 1 / 6 + .004), // cos(3πy)=0; F nonzero.
            FOnly: white(.113, .113, .137, .137), // diagonal F=0; neither component zero.
        };
    });
}
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => { const errors: string[] = []; pageErrors.set(page, errors); page.on('pageerror', e => errors.push(e.message)); await page.goto('./'); await page.locator('#experiment').selectOption('sand'); await ready(page); });
test.afterEach(async ({ page }) => expect(pageErrors.get(page)).toEqual([]));
test('sand P2-01: reported first plus F excludes C1 zeros and includes the F diagonal on screen', async ({ page }) => {
    await page.locator('[data-mode="first"]').click();
    await page.locator('#sd-symbols [data-symbol="F"]').click();
    await ready(page);
    await expect(page.locator('#sd-symbol-copy')).toContainText('F=0');
    await page.screenshot({ path: test.info().outputPath('first-F.png'), fullPage: true });
    const w = await witnesses(page);
    expect(w.firstOnly, 'white C1-only line must be absent when the explanation says F=0').toBe(0);
    expect(w.FOnly, 'F diagonal must actually reach the raster').toBeGreaterThan(2);
});
const isF = (w: Awaited<ReturnType<typeof witnesses>>) => w.firstOnly === 0 && w.secondOnly === 0 && w.factorYOnly === 0 && w.FOnly > 2;
for (const symbol of ['F', 'a']) test(`sand P2-01: ${symbol} overlay keeps the correct zero set across every background and checkbox`, async ({ page }) => {
    for (const mode of ['F', 'sand', 'u', 'first', 'second', 'factorX', 'factorY']) {
        await page.locator(`[data-mode="${mode}"]`).click();
        for (const nodes of [false, true]) {
            await page.locator('#sd-nodes').setChecked(nodes);
            await page.locator(`#sd-symbols [data-symbol="${symbol}"]`).click(); await ready(page);
            await expect(page.locator('#sd-key')).toContainText('F=0');
            await expect(page.locator('#sd-caption')).toContainText(mode === 'first' ? '第一成分' : mode === 'second' ? '第二成分' : mode.startsWith('factor') ? '因子' : mode === 'sand' ? '砂' : mode);
            expect(isF(await witnesses(page)), `${mode}, ${symbol}, nodes=${nodes}`).toBe(true);
        }
    }
});
test('sand P2-01: clearing restores component/factor auxiliary zeros; settings invalidate the same canvas cache', async ({ page }) => {
    for (const [mode, name, witness] of [['first', 'C₁=0', 'firstOnly'], ['second', 'C₂=0', 'secondOnly'], ['factorX', 'cos(mπx)=0', 'firstOnly'], ['factorY', 'cos(nπy)=0', 'factorYOnly']] as const) {
        await page.locator(`[data-mode="${mode}"]`).click(); await page.locator('#sd-nodes').check();
        await page.locator('#sd-symbols [data-symbol="F"]').click(); await ready(page); expect(isF(await witnesses(page))).toBe(true);
        await page.locator('#sd-clear').click(); await ready(page);
        await expect(page.locator('#sd-key')).toContainText(name);
        const ordinary = await witnesses(page); expect(ordinary[witness]).toBeGreaterThan(2); expect(ordinary.FOnly).toBe(0);
        await page.locator('#sd-nodes').uncheck(); await ready(page); expect((await witnesses(page))[witness]).toBe(0);
    }
    await page.locator('#sd-symbols [data-symbol="a"]').click(); await ready(page); expect(isF(await witnesses(page))).toBe(true);
    await page.locator('#sd-m').fill('3'); await page.locator('#sd-n').fill('2'); await page.locator('#sd-a').fill('0');
    await page.locator('#sd-settings button').click(); await ready(page);
    // Now F=cos(3πx)cos(2πy), so x=1/6 is a node; x=1/4 and x=y=1/8 are not.
    const changed = await witnesses(page); expect(changed.secondOnly).toBeGreaterThan(2); expect(changed.firstOnly).toBe(0); expect(changed.FOnly).toBe(0);
    await page.locator('#sd-a').fill('1'); await page.locator('#sd-settings button').click(); await ready(page);
    expect(isF(await witnesses(page))).toBe(true);
});
test('sand P2-01: highlight and clear leave particles rng step phase settings and background unchanged', async ({ page }) => {
    await page.locator('[data-mode="second"]').click(); await page.locator('#sd-wave-step').click();
    const before = await state(page);
    for (const symbol of ['F', 'a', 'u', 't', 'm', 'n', 'cos', 'π']) {
        await page.locator(`#sd-symbols [data-symbol="${symbol}"]`).focus(); await page.keyboard.press('Enter'); await ready(page);
        const after = await state(page); expect({ ...after, symbol: before.symbol }).toEqual(before);
        if (symbol === 'F' || symbol === 'a') expect(isF(await witnesses(page))).toBe(true);
        if (symbol === 'u' || symbol === 't') await expect(page.locator('#sd-key')).toContainText('背景の成分・因子の変位ではありません');
        if (symbol === 'm' || symbol === 'n') {
            // C2=cos(nπx)cos(mπy): m acts vertically, n horizontally (independent of the selector).
            const axes = await page.locator('#sd-canvas').evaluate((c: HTMLCanvasElement) => {
                const ctx = c.getContext('2d')!;
                function gold(x0: number, y0: number, x1: number, y1: number) {
                    const d = ctx.getImageData(Math.floor(c.width * (.055 + .89 * x0)), Math.floor(c.height * (.945 - .89 * y1)), Math.ceil(c.width * .89 * (x1 - x0)), Math.ceil(c.height * .89 * (y1 - y0))).data; let n = 0;
                    for (let i = 0; i < d.length; i += 4) if (d[i] > 235 && d[i + 1] > 200 && d[i + 2] > 130 && d[i] - d[i + 2] > 40) n++;
                    return n;
                }
                return { horizontal: gold(.7, .396, .8, .404), vertical: gold(.296, .7, .304, .8) };
            });
            expect(symbol === 'm' ? axes.vertical : axes.horizontal).toBeGreaterThan(2);
            expect(symbol === 'm' ? axes.horizontal : axes.vertical).toBe(0);
            await expect(page.locator('#sd-key')).toContainText(symbol === 'm' ? '縦の破線（y方向）' : '横の実線（x方向）');
        }
    }
    await page.locator('#sd-clear').click(); const after = await state(page); expect({ ...after, symbol: before.symbol }).toEqual(before);
});
test('sand P2-01: lessons restrict undeclared targets and restore normal F overlay on close and Escape', async ({ page }) => {
    await page.locator('[data-mode="first"]').click(); await page.locator('#sd-symbols [data-symbol="a"]').click();
    const before = await state(page);
    for (const exit of ['button', 'Escape']) {
        await page.locator('#sd-start').click();
        for (const stage of [0, 1, 2, 3]) {
            await page.locator(`[data-lesson="${stage}"]`).click(); await ready(page);
            await expect(page.locator('#sd-lesson-copy')).toContainText(`${stage + 1} ·`);
            for (const symbol of ['F', 'a', 'u', 't']) {
                const button = page.locator(`#sd-symbols [data-symbol="${symbol}"]`);
                if (stage < 2) await expect(button).toBeDisabled(); else await expect(button).toBeEnabled();
            }
            if (stage < 2) {
                await expect(page.locator('#sd-equations')).not.toContainText('F');
                await expect(page.locator('[data-mode="F"]')).toBeHidden();
                await page.locator('#sd-symbols [data-symbol="F"]').evaluate(el => { for (const type of ['pointerover', 'focusin', 'click']) el.dispatchEvent(new Event(type, { bubbles: true })); });
                expect((await state(page)).symbol).toBe('');
                await page.locator('#sd-nodes').check(); await ready(page);
                await expect(page.locator('#sd-key')).toContainText(stage === 0 ? 'cos(mπx)=0' : 'C₁=0');
                expect((await witnesses(page)).FOnly).toBe(0);
            } else {
                await page.locator('#sd-symbols [data-symbol="F"]').click(); await ready(page);
                await expect(page.locator('#sd-key')).toContainText('F=0'); expect(isF(await witnesses(page))).toBe(true);
            }
        }
        if (exit === 'button') await page.locator('#sd-close').click(); else await page.keyboard.press('Escape');
        await ready(page); expect(await state(page)).toEqual(before); expect(isF(await witnesses(page))).toBe(true);
    }
});
test('sand P2-01: actual raster rejects an intentionally substituted C1 grid even while legend says F', async ({ page }) => {
    await page.locator('[data-mode="first"]').click(); await page.locator('#sd-symbols [data-symbol="F"]').click(); await ready(page);
    expect(isF(await witnesses(page))).toBe(true);
    await page.locator('#sd-canvas').evaluate((c: HTMLCanvasElement) => {
        const ctx = c.getContext('2d')! as CanvasRenderingContext2D & { originalStroke?: typeof ctx.stroke };
        ctx.originalStroke = ctx.stroke;
        ctx.stroke = function (path?: Path2D) {
            if (!path) return this.originalStroke!();
            const wrong = new Path2D();
            for (const x of [.25, .75]) { wrong.moveTo(x, 0); wrong.lineTo(x, 1); }
            for (const y of [1 / 6, .5, 5 / 6]) { wrong.moveTo(0, y); wrong.lineTo(1, y); }
            return this.originalStroke!(wrong);
        } as typeof ctx.stroke;
    });
    await page.locator('[data-mode="first"]').click(); await ready(page);
    await expect(page.locator('#sd-key')).toContainText('F=0');
    const wrong = await witnesses(page); expect(isF(wrong)).toBe(false); expect(wrong.firstOnly).toBeGreaterThan(2); expect(wrong.FOnly).toBe(0);
    await page.screenshot({ path: test.info().outputPath('negative-C1-for-F.png'), fullPage: true });
    await page.locator('#sd-canvas').evaluate((c: HTMLCanvasElement) => { const ctx = c.getContext('2d')! as any; ctx.stroke = ctx.originalStroke; });
    await page.locator('[data-mode="first"]').click(); await ready(page); expect(isF(await witnesses(page))).toBe(true);
});
test('sand P2-01: narrow text-200 lesson and overlay labels remain readable without overflow', async ({ page }) => {
    for (const width of [375, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 950 }); await page.emulateMedia({ colorScheme: 'light' });
        await page.evaluate(() => document.documentElement.style.fontSize = '200%');
        await page.locator('[data-mode="first"]').click(); await page.locator('#sd-symbols [data-symbol="F"]').click(); await ready(page);
        for (const id of ['key', 'scope', 'symbol-copy', 'equations']) expect(await page.locator('#sd-' + id).evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        await page.locator('#sd-start').click(); await page.locator('[data-lesson="1"]').click(); await ready(page);
        await expect(page.locator('#sd-key')).toContainText('第一成分');
        await page.locator('#sd-close').click(); await ready(page); await expect(page.locator('#sd-key')).toContainText('F=0');
    }
});
