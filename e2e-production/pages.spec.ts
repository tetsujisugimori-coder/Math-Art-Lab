import { expect, test } from '@playwright/test';

for (const width of [1280, 375, 390]) {
  test(`Pages本番ビルド ${width}px: assets・描画・操作・インスペクター`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width < 750 });
    const page = await context.newPage();
    const errors: string[] = [], failures: string[] = [], loadedAssets: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failures.push(`${request.url()}: ${request.failure()?.errorText}`));
    page.on('response', response => {
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
      if (['script', 'stylesheet'].includes(response.request().resourceType())) {
        const url = new URL(response.url());
        if (url.origin === new URL(baseURL!).origin) loadedAssets.push(url.pathname);
      }
    });
    try {
      const response = await page.goto(baseURL!);
      expect(response?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe('/Math-Art-Lab/');
      await expect(page.getByRole('heading', { name: 'Fractal × Wave' })).toBeVisible();
      const assets = await page.locator('script[src], link[rel=stylesheet]').evaluateAll(elements =>
        elements.map(el => el.getAttribute('src') || el.getAttribute('href')!));
      expect(assets.length).toBeGreaterThanOrEqual(2);
      for (const asset of assets) expect(asset).toMatch(/^\/Math-Art-Lab\/assets\/.+\.(js|css)$/);
      expect(loadedAssets.some(path => path.endsWith('.js'))).toBe(true);
      expect(loadedAssets.some(path => path.endsWith('.css'))).toBe(true);

      const canvas = page.locator('canvas');
      await expect(canvas).toBeVisible();
      await canvas.scrollIntoViewIfNeeded();
      const animated = await canvas.screenshot();
      // Comparing frames detects a missing/frozen WebGL rendering, not just a canvas element.
      await expect.poll(async () => (await canvas.screenshot()).equals(animated)).toBe(false);
      await page.getByRole('button', { name: '一時停止' }).click();
      const paused = await canvas.screenshot();
      await page.getByRole('tab', { name: '数式・構造' }).click();
      await expect(page.locator('#panel-structures')).toBeVisible();
      await expect(page.locator('[data-formula=heading] math').first()).toHaveText('θchild=θparent±α');
      expect(await canvas.screenshot()).toEqual(paused);

      await page.getByRole('tab', { name: 'パラメータ', exact: true }).click();
      await page.locator('#param-amplitude').fill('0.6');
      const changed = await canvas.screenshot();
      expect(changed.equals(paused)).toBe(false);
      await page.getByRole('tab', { name: '数式・構造' }).click();
      await expect(page.locator('output[data-param=amplitude]')).toHaveText('0.6');
      for (const value of await page.locator('mn[data-param=amplitude]').all()) await expect(value).toHaveText('0.6');
      await page.getByRole('button', { name: '初期値へ' }).click();
      await expect(page.locator('#param-amplitude')).toHaveValue('0.22');
      await expect(page.locator('output[data-param=amplitude]')).toHaveText('0.22');
      const reset = await canvas.screenshot();
      expect(reset.equals(changed)).toBe(false);

      await canvas.scrollIntoViewIfNeeded();
      const box = (await canvas.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20, { steps: 6 });
      await page.mouse.up();
      const rotated = await canvas.screenshot();
      expect(rotated.equals(reset)).toBe(false);
      await page.mouse.wheel(0, 200);
      await expect.poll(async () => (await canvas.screenshot()).equals(rotated)).toBe(false);
      const zoomed = await canvas.screenshot();
      await page.getByRole('button', { name: '再開' }).click();
      await expect.poll(async () => (await canvas.screenshot()).equals(zoomed)).toBe(false);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/${test.info().project.name}-production-${width}.png` });
      expect(errors).toEqual([]);
      expect(failures).toEqual([]);
    } finally {
      await context.close();
    }
  });
}
