import { expect, test } from '@playwright/test';

test('Pages production build: WebGL startup failure does not block Canvas 2D work 020', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 860 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(String(args[0]))) return null;
      return Reflect.apply(original, this, args);
    } as typeof original;
  });
  const uncaught: string[] = [];
  page.on('pageerror', error => uncaught.push(error.message));
  await page.goto('./');
  const picker = page.locator('#experiment');
  await expect(picker.locator('option')).toHaveCount(19);
  await expect(page.getByRole('alert')).toContainText(/WebGL/i);
  await picker.selectOption('apollonian-bloom');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const work = page.locator('[data-bloom]');
  await expect(work).toHaveAttribute('data-state', 'finished');
  await expect(work).toHaveAttribute('data-draw-complete', 'true');
  await expect.poll(async () => Number(await work.getAttribute('data-painted'))).toBeGreaterThan(4);
  await expect(page.locator('#bloom-art')).toBeVisible();
  expect(uncaught).toEqual([]);
});
