import { expect, test } from '@playwright/test';

test('Penrose is registered and paints the production canvas under the Pages base', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 820 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  const picker = page.locator('#experiment');
  await expect(picker.locator('option[value=penrose]')).toHaveText('018 · 黄金比の星屑');
  await picker.selectOption('penrose');
  const art = page.locator('.penrose canvas.penrose-art');
  await expect(art).toBeVisible();
  await expect(art).toHaveAttribute('data-level', '0');
  const snapshot = () => art.evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());
  const initial = await snapshot();
  await page.locator('.penrose').getByRole('slider', { name: '細分化の段階' }).press('ArrowRight');
  await expect(art).toHaveAttribute('data-level', '1');
  await expect.poll(snapshot).not.toBe(initial);
  expect(errors).toEqual([]);
});
