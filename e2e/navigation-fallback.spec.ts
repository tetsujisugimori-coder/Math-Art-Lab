import { expect, test, type Page } from '@playwright/test';

const registered = [
  'harmonograph', 'fractal', 'garden', 'knot', 'lorenz', 'twins', 'wave',
  'flow', 'reaction', 'fourier', 'voronoi', 'sand', 'ripple', 'cobweb',
  'segregation', 'cooperation', 'penrose', 'modular-heart', 'apollonian-bloom',
];

async function disableWebGL(page: Page) {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: unknown[]) {
      if (['webgl', 'webgl2', 'experimental-webgl'].includes(String(args[0]))) return null;
      return Reflect.apply(original, this, args);
    } as typeof original;
  });
}

test('WebGL unavailable: all registered works remain selectable and 020 Canvas 2D paints', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await disableWebGL(page);
  const uncaught: string[] = [];
  page.on('pageerror', error => uncaught.push(error.message));
  await page.goto('./');

  const picker = page.locator('#experiment');
  await expect(picker.locator('option')).toHaveCount(registered.length);
  expect(await picker.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value))).toEqual(registered);
  await expect(page.getByRole('alert')).toContainText('作品を表示できませんでした');
  await expect(page.getByRole('alert')).toContainText('原因：');
  await expect(page.getByRole('alert')).toContainText(/WebGL/i);

  await picker.selectOption('apollonian-bloom');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const bloom = page.locator('[data-bloom]');
  await expect(bloom).toHaveAttribute('data-state', 'finished');
  await expect(bloom).toHaveAttribute('data-draw-complete', 'true');
  await expect.poll(async () => Number(await bloom.getAttribute('data-painted'))).toBeGreaterThan(4);
  await expect(page.locator('#bloom-art')).toBeVisible();
  expect(await page.locator('#bloom-art').evaluate(canvas => !!(canvas as HTMLCanvasElement).getContext('2d'))).toBe(true);

  await picker.selectOption('modular-heart');
  await expect(page.getByRole('heading', { name: '余りが描く心臓' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  await picker.selectOption('harmonograph');
  await expect(page.getByRole('alert')).toContainText(/WebGL/i);
  await picker.selectOption('apollonian-bloom');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('[data-bloom]')).toHaveAttribute('data-draw-complete', 'true');
  expect(uncaught).toEqual([]);
});

test('normal WebGL: initial 002 and other works still mount after switching', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const uncaught: string[] = [];
  page.on('pageerror', error => uncaught.push(error.message));
  await page.goto('./');
  const picker = page.locator('#experiment');
  await expect(picker.locator('option')).toHaveCount(registered.length);
  await expect(page.locator('#harm-stage canvas')).toBeVisible();
  for (const [slug, heading] of [
    ['penrose', '黄金比の星屑'],
    ['modular-heart', '余りが描く心臓'],
    ['apollonian-bloom', '無限に咲く円の花'],
    ['harmonograph', '光のハーモノグラフ'],
    ['apollonian-bloom', '無限に咲く円の花'],
  ]) {
    await picker.selectOption(slug);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await expect(page.locator('[data-bloom]')).toHaveAttribute('data-draw-complete', 'true');
  expect(uncaught).toEqual([]);
});
