import { expect, test } from '@playwright/test';

test('modular heart builds and paints under the GitHub Pages base', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await page.locator('#experiment').selectOption('modular-heart');
  const art = page.locator('#mh-art');
  await expect(art).toHaveAttribute('data-draw-complete', 'true');
  await expect(art).toHaveAttribute('data-visible','280');
  const pixels = () => art.evaluate(element => (element as HTMLCanvasElement).toDataURL());
  const original = await pixels();
  await page.getByRole('slider', { name: /倍率 k/ }).press('End');
  await expect(art).toHaveAttribute('data-multiplier', '6');
  await expect.poll(pixels).not.toBe(original);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
