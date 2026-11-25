import { expect, test } from '@playwright/test';
import { harmonographProbe, injectHarmonographInitialResizeFailure, simulateTabReturn } from '../e2e/harmonograph-initialization-failure';

test('Pages 002 partial WebGL resize failure: tab return and resize cannot disturb 020', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await injectHarmonographInitialResizeFailure(page);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  const picker = page.locator('#experiment');
  await expect(picker.locator('option')).toHaveCount(19);
  await expect(page.getByRole('alert')).toContainText('injected WebGL resize failure');
  expect(await harmonographProbe(page)).toMatchObject({
    injected: 1, visibilityRegistrations: 1, stageObservations: 1, stageDisconnects: 1,
  });

  await picker.selectOption('apollonian-bloom');
  const work = page.locator('[data-bloom]');
  const canvas = work.locator('#bloom-art');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(work).toHaveAttribute('data-state', 'finished');
  await expect(work).toHaveAttribute('data-draw-complete', 'true');
  await expect.poll(async () => Number(await work.getAttribute('data-painted'))).toBeGreaterThan(4);
  const initialPixels = await canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  const before = await harmonographProbe(page);

  await simulateTabReturn(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.setViewportSize({ width: 390, height: 860 });
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
  await expect(work).toHaveAttribute('data-draw-complete', 'true');
  await expect.poll(async () => canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL())).toBe(initialPixels);
  const after = await harmonographProbe(page);
  expect(after?.visibilityCalls).toBe(before?.visibilityCalls);
  expect(after?.resizeCallbacks).toBe(before?.resizeCallbacks);
  expect(after?.stageDisconnects).toBe(1);
  expect(errors).toEqual([]);
});
