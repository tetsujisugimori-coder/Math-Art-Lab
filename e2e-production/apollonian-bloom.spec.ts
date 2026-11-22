import { expect, test } from '@playwright/test';

test('020 bloom paints and reacts under the GitHub Pages base path', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('./');
  await page.locator('#experiment').selectOption('apollonian-bloom');
  const work = page.locator('[data-bloom]');
  const canvas = work.locator('#bloom-art');
  const pixels = () => canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL());
  await expect(canvas).toBeVisible();
  await expect(work).toHaveAttribute('data-state', 'finished');
  await expect(work).toHaveAttribute('data-draw-complete', 'true');
  await expect.poll(async () => Number(await work.getAttribute('data-painted'))).toBeGreaterThan(4);
  const initial = await pixels();
  await work.locator('#bloom-preset').selectOption('vortex');
  await work.locator('#bloom-complete').click();
  await expect(work).toHaveAttribute('data-draw-complete', 'true');
  await expect.poll(pixels).not.toBe(initial);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(errors).toEqual([]);
});
