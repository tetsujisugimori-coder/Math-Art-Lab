import { expect, test, type Page } from '@playwright/test';

async function openWork(page: Page, width: number, reducedMotion: 'reduce' | 'no-preference') {
  await page.setViewportSize({ width, height: 820 });
  await page.emulateMedia({ reducedMotion });
  await page.goto('./');
  const picker = page.locator('#experiment');
  await expect(picker.locator('option[value=modular-heart]')).toHaveText('019 · 余りが描く心臓');
  await picker.selectOption('modular-heart');
  const work = page.locator('.modular-heart');
  const stage = work.locator('.mh-stage');
  const art = stage.getByRole('img', { name: '剰余で結んだ円周の弦の模様' });
  await expect(art).toBeVisible();
  return { picker, work, stage, art };
}

test('modular heart opening, pause/resume and completion at 390px', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { work, stage, art } = await openWork(page, 390, 'no-preference');
  const button = (name: string) => work.getByRole('button', { name, exact: true });
  const capture = async (name: string) => {
    const target = testInfo.outputPath(`${name}.png`);
    await stage.screenshot({ path: target });
    await testInfo.attach(name, { path: target, contentType: 'image/png' });
  };
  await expect(art).toHaveAttribute('data-phase', 'dawn');
  await expect(art).toHaveAttribute('data-visible', '0');
  await expect(art).toHaveAttribute('data-draw-complete', 'false');
  await capture('01-dawn');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await work.getByRole('combobox', { name: '描画速度' }).selectOption('2');
  await button('再生').focus();
  await button('再生').press('Enter');
  await expect.poll(async () => Number(await art.getAttribute('data-visible'))).toBeGreaterThan(12);
  await button('一時停止').click();
  await expect(button('再開')).toBeVisible();
  const pausedCount = Number(await art.getAttribute('data-visible'));
  expect(pausedCount).toBeGreaterThan(12);
  expect(pausedCount).toBeLessThan(280);
  await capture('02-interlaced');
  // Let the browser paint freely, without a sleep or a time stub; pause must hold.
  await art.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(art).toHaveAttribute('data-visible', String(pausedCount));
  await button('再開').click();
  await expect(art).toHaveAttribute('data-draw-complete', 'true');
  // Completion is a persistent state. The transient title is tested
  // separately with Playwright's controllable animation clock.
  await expect(art).toHaveAttribute('data-phase', 'complete');
  await expect(art).toHaveAttribute('data-visible', '280');
  await capture('03-complete');
  await button('リセット').click();
  await expect(art).toHaveAttribute('data-phase', 'dawn');
  await expect(art).toHaveAttribute('data-visible', '0');
  await expect(work.getByRole('combobox', { name: '描画速度' })).toHaveValue('1');
  expect(errors).toEqual([]);
});

test('modular heart title is captured at 14.5s with 280 chords at 390px', async ({ page }, testInfo) => {
  // Install before navigation, then pause only after the work has loaded.
  // runFor advances requestAnimationFrame in controlled steps. At 2x speed,
  // 7.3 seconds of clock time places the opening at about 14.5 seconds.
  await page.clock.install({ time: new Date('2026-11-21T00:00:00Z') });
  const { work, stage, art } = await openWork(page, 390, 'no-preference');
  await page.clock.pauseAt(new Date('2026-11-21T00:05:00Z'));
  await work.getByRole('combobox', { name: '描画速度' }).selectOption('2');
  await work.getByRole('button', { name: '再生', exact: true }).click();
  await page.clock.runFor(7_300);

  await expect(art).toHaveAttribute('data-phase', 'title');
  await expect(art).toHaveAttribute('data-visible', '280');
  await expect(art).toHaveAttribute('data-draw-complete', 'true');
  const title = stage.locator('.mh-title');
  await expect(title).toHaveCSS('opacity', '1');
  await expect(title).toContainText('余りが描く心臓');
  // Keep the verified frame through the app's public pause control before
  // releasing the fake clock: locator.screenshot needs live animation frames
  // for its stability check, but the title must not advance or disappear.
  await work.locator('#mh-play').evaluate((button: HTMLButtonElement) => button.click());
  await page.clock.resume();
  await expect(work.getByRole('button', { name: '再開', exact: true })).toBeVisible();
  const target = testInfo.outputPath('03-title.png');
  await stage.screenshot({ path: target });
  await testInfo.attach('03-title', { path: target, contentType: 'image/png' });
  // The screenshot must not silently advance the scene into completion.
  await expect(art).toHaveAttribute('data-phase', 'title');
});

test('modular heart reaches completion after real-time 15-second playback at 390px', async ({ page }) => {
  test.setTimeout(45_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { work, art } = await openWork(page, 390, 'no-preference');
  await expect(work.getByRole('combobox', { name: '描画速度' })).toHaveValue('1');
  const start = Date.now();
  await work.getByRole('button', { name: '再生', exact: true }).click();
  await expect(art).toHaveAttribute('data-phase', 'complete', { timeout: 25_000 });
  expect(Date.now() - start).toBeGreaterThanOrEqual(14_000);
  await expect(art).toHaveAttribute('data-draw-complete', 'true');
  await expect(art).toHaveAttribute('data-visible', '280');
  await expect(work.getByRole('button', { name: 'もう一度再生', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('modular heart completed still, controls, resize and focus return at 375px', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { picker, work, stage, art } = await openWork(page, 375, 'reduce');
  const pixels = () => art.evaluate(element => (element as HTMLCanvasElement).toDataURL());
  const range = (name: string) => work.getByRole('slider', { name: new RegExp(name) });
  const button = (name: string) => work.getByRole('button', { name, exact: true });
  const checkbox = (name: string) => work.getByRole('checkbox', { name, exact: true });
  await expect(art).toHaveAttribute('data-phase', 'complete');
  await expect(art).toHaveAttribute('data-draw-complete', 'true');
  await expect(button('もう一度再生')).toBeDisabled();
  const initial = await pixels();
  await range('倍率 k').press('ArrowRight');
  await expect(art).toHaveAttribute('data-multiplier', '3');
  await expect(work.locator('#mh-description')).toContainText('ネフロイド');
  await expect.poll(pixels).not.toBe(initial);
  await range('円周上の点数 N').press('End');
  await expect(art).toHaveAttribute('data-count', '720');
  await expect(art).toHaveAttribute('data-visible', '720');
  for (const [label, checked] of [['円周', true], ['点', true], ['線', false], ['光彩', false]] as const) {
    const before = await pixels();
    await checkbox(label).setChecked(checked);
    await expect.poll(pixels).not.toBe(before);
  }
  await button('リセット').click();
  await expect(art).toHaveAttribute('data-count', '280');
  await expect(art).toHaveAttribute('data-multiplier', '2');
  await expect.poll(pixels).toBe(initial);
  // Resize readiness is independent of the completed timeline. Assert backing,
  // viewport and render revision together rather than pinning a stale target.
  const revision = Number(await art.getAttribute('data-render-revision'));
  await page.setViewportSize({ width: 640, height: 860 });
  await expect.poll(async () => art.evaluate((element, previous) => {
    const canvas = element as HTMLCanvasElement;
    const dpr = Math.min(2, devicePixelRatio, 2000 / Math.max(canvas.clientWidth, canvas.clientHeight));
    return Number(canvas.dataset.renderRevision) > previous &&
      canvas.width === Math.round(canvas.clientWidth * dpr) &&
      canvas.height === Math.round(canvas.clientHeight * dpr) &&
      canvas.dataset.renderSize === `${canvas.width}×${canvas.height}`;
  }, revision)).toBe(true);
  await expect(art).toHaveAttribute('data-draw-complete', 'true');
  await expect.poll(async () => (await stage.boundingBox())?.width ?? 0).toBeGreaterThan(500);
  await expect.poll(pixels).not.toBe(initial);

  const openGallery = button('全画面鑑賞');
  await openGallery.focus();
  await openGallery.press('Enter');
  const dialog = work.getByRole('dialog', { name: '全画面鑑賞' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('canvas')).toBeVisible();
  expect(await dialog.evaluate(element => Math.round(element.getBoundingClientRect().width))).toBe(640);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(openGallery).toBeFocused();
  await expect(art).toBeVisible();
  await picker.selectOption('penrose');
  await expect(work).toHaveCount(0);
  await picker.selectOption('modular-heart');
  await expect(art).toHaveAttribute('data-count', '280');
  await expect(art).toHaveAttribute('data-phase', 'complete');
  expect(errors).toEqual([]);
});
