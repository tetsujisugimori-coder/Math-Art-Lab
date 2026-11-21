import { expect, test } from '@playwright/test';

for (const width of [375, 390]) {
  test(`Penrose controls, motion and layout at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 820 });
    await page.emulateMedia({ reducedMotion: width === 375 ? 'reduce' : 'no-preference' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('./');
    await page.locator('#experiment').selectOption('penrose');

    const work = page.locator('.penrose');
    const art = work.locator('canvas.penrose-art');
    const level = work.getByRole('slider', { name: '細分化の段階' });
    const reset = work.getByRole('button', { name: 'リセット', exact: true });
    const play = work.getByRole('button', { name: '再生', exact: true });
    const pause = work.getByRole('button', { name: '一時停止', exact: true });
    const speed = work.getByRole('combobox', { name: '再生速度' });
    const theme = work.getByRole('combobox', { name: '色彩テーマ' });
    const boundary = work.getByRole('checkbox', { name: '境界線を表示' });
    const zoomIn = work.getByRole('button', { name: '拡大', exact: true });
    const zoomOut = work.getByRole('button', { name: '縮小', exact: true });
    const pixels = () => art.evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());

    await expect(art).toBeVisible();
    await expect(art).toHaveAttribute('data-level', '0');
    await expect(art).toHaveAttribute('data-zoom', '1');
    await expect(play).toBeVisible();
    await expect(boundary).toBeChecked();
    await expect(speed).toHaveValue('1');
    await expect(theme).toHaveValue('nebula');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

    // Exercise native keyboard navigation and assert the backing Canvas changes.
    await level.focus();
    await expect(level).toBeFocused();
    await level.press('ArrowRight');
    await expect(level).toHaveValue('1');
    await expect(art).toHaveAttribute('data-level', '1');
    for (let step = 1; step < 6; step++) await level.press('ArrowRight');
    await expect(art).toHaveAttribute('data-level', '6');
    await level.press('ArrowRight');
    await expect(level).toHaveValue('6');

    // Use the settled frame for style comparisons independent of any fade.
    await reset.click();
    const original = await pixels();
    await theme.selectOption('aurora');
    await expect.poll(pixels).not.toBe(original);
    const themed = await pixels();
    await boundary.uncheck();
    await expect(boundary).not.toBeChecked();
    await expect.poll(pixels).not.toBe(themed);

    await zoomIn.click();
    await expect.poll(async () => Number(await art.getAttribute('data-zoom'))).toBeGreaterThan(1);
    await zoomOut.click();
    await expect(art).toHaveAttribute('data-zoom', '1');

    await speed.selectOption('0.5');
    await play.focus();
    await play.press('Enter');
    await expect(pause).toBeVisible();
    await pause.click();
    await expect(play).toBeVisible();
    const pausedLevel = await art.getAttribute('data-level');

    // Observe the first committed frame in the microtask before any animation
    // frame callback. No sleep, clock stub, or modification of renderer APIs.
    await art.evaluate(element => {
      const canvas = element as HTMLCanvasElement;
      const oldFrame = canvas.toDataURL();
      const oldLevel = canvas.dataset.level;
      const nextLevel = new MutationObserver(() => {
        if (canvas.dataset.level === oldLevel) return;
        nextLevel.disconnect();
        canvas.dataset.testInstantStage = String(canvas.toDataURL() !== oldFrame);
      });
      nextLevel.observe(canvas, { attributes: true, attributeFilter: ['data-level'] });
    });
    await play.click();
    await expect(art).not.toHaveAttribute('data-level', pausedLevel ?? '0');
    await expect(art).toHaveAttribute('data-test-instant-stage', width === 375 ? 'true' : 'false');
    await reset.click();
    await expect(play).toBeVisible();
    await expect(art).toHaveAttribute('data-level', '0');
    await expect(art).toHaveAttribute('data-zoom', '1');
    await expect(speed).toHaveValue('1');
    await expect(theme).toHaveValue('nebula');
    await expect(boundary).toBeChecked();

    // Navigate away, then remount: no stale playback or preferences.
    await page.locator('#experiment').selectOption('fractal');
    await expect(work).toHaveCount(0);
    await page.locator('#experiment').selectOption('penrose');
    await expect(art).toHaveAttribute('data-level', '0');
    await expect(play).toBeVisible();
    expect(errors).toEqual([]);
  });
}
