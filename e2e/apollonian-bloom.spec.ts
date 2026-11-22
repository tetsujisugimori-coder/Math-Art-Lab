import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';

const slug = 'apollonian-bloom';
const title = '無限に咲く円の花';
const frozenStart = new Date('2026-11-22T00:00:00Z');

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function openBloom(page: Page, width: number, motion: 'reduce' | 'no-preference') {
  await page.setViewportSize({ width, height: 860 });
  await page.emulateMedia({ reducedMotion: motion });
  await page.goto('./');
  const picker = page.locator('#experiment');
  await expect(picker.locator(`option[value="${slug}"]`)).toHaveText(`020 · ${title}`);
  await picker.selectOption(slug);
  const work = page.locator('[data-bloom]');
  const control = (id: string) => work.locator(`#bloom-${id}`);
  const canvas = control('art');
  await expect(canvas).toBeVisible();
  return { picker, work, control, canvas };
}

const metric = async (work: Locator, name: string) => Number(await work.getAttribute(`data-${name}`));
const bitmap = (canvas: Locator) => canvas.evaluate(element => (element as HTMLCanvasElement).toDataURL());
const horizontalFit = async (page: Page, width: number) => {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
};
const press = (control: Locator) => control.press('Enter');
const domClick = (control: Locator) => control.evaluate(element => (element as HTMLButtonElement).click());

async function completion(work: Locator, titleElement: Locator, timeout = 5_000) {
  await expect(work).toHaveAttribute('data-state', 'finished', { timeout });
  await expect(work).toHaveAttribute('data-draw-complete', 'true', { timeout });
  await expect(work).toHaveAttribute('data-title', 'shown', { timeout });
  await expect(titleElement).toBeVisible();
  await expect(titleElement).toContainText(title);
  await expect(titleElement).toHaveCSS('opacity', '1');
  const count = await metric(work, 'max-count');
  expect(count).toBeGreaterThan(4);
  await expect(work).toHaveAttribute('data-count', String(count));
  const painted = await metric(work, 'painted');
  expect(painted).toBeGreaterThan(4);
  expect(painted).toBeLessThanOrEqual(count);
  return { count, painted };
}

async function capture(target: Locator, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await target.screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

test('020 bloom controlled clock: seed, growth, pause, simulated visibility and titled completion at 390px', async ({ page }, testInfo) => {
  const errors = watchErrors(page);
  await page.clock.install({ time: frozenStart });
  const { picker, work, control, canvas } = await openBloom(page, 390, 'no-preference');
  // Use the stage containing the actual Canvas and title, not a video or app-shell screenshot.
  const stage = canvas.locator('..');
  await expect(work).toHaveAttribute('data-state', 'idle');
  await expect(work).toHaveAttribute('data-count', '4');
  await expect(work).toHaveAttribute('data-title', 'hidden');
  await expect(control('speed')).toHaveValue('1');
  await horizontalFit(page, 390);
  const seed = await bitmap(canvas);
  await capture(stage, testInfo, '01-seed');

  await page.clock.pauseAt(new Date(frozenStart.getTime() + 60_000));
  await domClick(control('play'));
  await page.clock.runFor(6_000);
  const middleCount = await metric(work, 'count');
  expect(middleCount).toBeGreaterThan(4);
  expect(middleCount).toBeLessThan(await metric(work, 'max-count'));
  await expect(work).toHaveAttribute('data-title', 'hidden');
  const middle = await bitmap(canvas);
  expect(middle).not.toBe(seed);

  await domClick(control('play'));
  await expect(work).toHaveAttribute('data-state', 'paused');
  const pausedAt = await work.getAttribute('data-elapsed-ms');
  await page.clock.runFor(1_000);
  await expect(work).toHaveAttribute('data-elapsed-ms', pausedAt!);
  await expect(work).toHaveAttribute('data-count', String(middleCount));
  await page.clock.resume();
  await capture(stage, testInfo, '02-growth');
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 250);
  await domClick(control('play'));
  await expect(work).toHaveAttribute('data-state', 'playing');

  // Simulate the lifecycle signal deterministically; this is not a device/tab-throttling measurement.
  const setHidden = (hidden: boolean) => page.evaluate(value => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => value });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => value ? 'hidden' : 'visible',
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
  await page.clock.runFor(300);
  await setHidden(true);
  const hiddenAt = await metric(work, 'elapsed-ms');
  await page.clock.runFor(20_000);
  await expect(work).toHaveAttribute('data-elapsed-ms', String(hiddenAt));
  await setHidden(false);
  await page.clock.runFor(250);
  const visibleAgain = await metric(work, 'elapsed-ms');
  expect(visibleAgain).toBeGreaterThan(hiddenAt);
  expect(visibleAgain - hiddenAt).toBeLessThanOrEqual(350);
  await expect(work).toHaveAttribute('data-state', 'playing');

  await page.clock.runFor(15_500 - visibleAgain);
  const result = await completion(work, control('title'));
  await expect(work).toHaveAttribute('data-elapsed-ms', '15000');
  const played = await bitmap(canvas);
  expect(played).not.toBe(middle);
  await page.clock.resume();
  await capture(stage, testInfo, '03-complete-title');

  await control('restart').click();
  await expect(work).toHaveAttribute('data-count', '4');
  await expect(work).toHaveAttribute('data-state', 'idle');
  await expect.poll(() => bitmap(canvas)).toBe(seed);
  await control('complete').click();
  expect(await completion(work, control('title'))).toEqual(result);
  await expect.poll(() => bitmap(canvas)).toBe(played);

  // Switch away while a playing instance owns RAF work, not only after it has finished.
  await control('restart').click();
  await control('play').click();
  await expect(work).toHaveAttribute('data-state', 'playing');
  const oldView = await work.elementHandle();
  if (!oldView) throw new Error('No playing view to detach');
  await picker.selectOption('modular-heart');
  await expect(work).toHaveCount(0);
  const stoppedClock = await oldView.getAttribute('data-elapsed-ms');
  await page.clock.runFor(1_000);
  expect(await oldView.getAttribute('data-elapsed-ms')).toBe(stoppedClock);
  await oldView.dispose();
  await picker.selectOption(slug);
  await expect(work).toHaveAttribute('data-state', 'idle');
  await expect(work).toHaveAttribute('data-count', '4');
  expect(errors).toEqual([]);
});

test('020 bloom independently finishes a true 1× real-time opening at 390px', async ({ page }, testInfo) => {
  test.setTimeout(45_000);
  const errors = watchErrors(page);
  const { work, control } = await openBloom(page, 390, 'no-preference');
  await expect(work).toHaveAttribute('data-state', 'idle');
  await expect(control('speed')).toHaveValue('1');
  const observeClock = work.evaluate(element => new Promise<number>((resolve, reject) => {
    let startedAt: number | undefined;
    const play = element.querySelector('#bloom-play');
    if (!play) { reject(new Error('No play control')); return; }
    const start = () => { startedAt = performance.now(); };
    const observer = new MutationObserver(() => {
      if (element.getAttribute('data-state') !== 'finished' || startedAt === undefined) return;
      clearTimeout(deadline);
      observer.disconnect();
      resolve(performance.now() - startedAt);
    });
    const deadline = window.setTimeout(() => {
      observer.disconnect();
      play.removeEventListener('click', start, true);
      reject(new Error('Real-time opening exceeded its observation window'));
    }, 31_000);
    play.addEventListener('click', start, { capture: true, once: true });
    observer.observe(element, { attributeFilter: ['data-state'] });
    element.setAttribute('data-clock-observer-ready', 'true');
  }));
  await expect(work).toHaveAttribute('data-clock-observer-ready', 'true');
  await control('play').focus();
  await press(control('play'));
  await expect(work).toHaveAttribute('data-state', 'playing');
  const elapsed = await observeClock;
  // Native browser performance.now, from actual keyboard activation to completed state.
  expect(elapsed).toBeGreaterThanOrEqual(14_000);
  expect(elapsed).toBeLessThan(30_000);
  const outcome = await completion(work, control('title'));
  await expect(work).toHaveAttribute('data-elapsed-ms', '15000');
  await testInfo.attach('real-time-clock', {
    body: JSON.stringify({ observedMsFromActivation: elapsed, openingMs: 15_000, speed: 1, ...outcome }),
    contentType: 'application/json',
  });
  expect(errors).toEqual([]);
});

test('020 bloom reduced-motion controls, presets, lesson restore and lifecycle at 375px/1280px', async ({ page }) => {
  const errors = watchErrors(page);
  const { picker, work, control, canvas } = await openBloom(page, 375, 'reduce');
  await horizontalFit(page, 375);
  await completion(work, control('title'));
  const initialBitmap = await bitmap(canvas);
  const initialDepth = await control('depth').inputValue();
  await expect(control('preset')).toHaveValue('trinity');
  const presets = ['vortex', 'jewel', 'mandala', 'trinity'] as const;
  const images = new Set<string>([initialBitmap]);
  for (const preset of presets) {
    await control('preset').selectOption(preset);
    await control('complete').click();
    await completion(work, control('title'));
    const image = await bitmap(canvas);
    if (preset === 'trinity') expect(image).toBe(initialBitmap);
    else {
      expect(images.has(image)).toBe(false);
      images.add(image);
    }
  }

  await control('depth').selectOption('6');
  await expect(control('depth')).toHaveValue('6');
  await control('complete').click();
  const deep = await completion(work, control('title'));
  expect(deep.count).toBeLessThanOrEqual(3_000);
  expect(deep.count).toBeGreaterThan(100);
  await control('speed').selectOption('2');
  for (const theme of ['crystal', 'sakura', 'mono', 'night', 'amber']) {
    const beforeTheme = await bitmap(canvas);
    await control('theme').selectOption(theme);
    await expect(work).toHaveAttribute('data-count', String(deep.count));
    await expect.poll(() => bitmap(canvas)).not.toBe(beforeTheme);
  }
  const beforeOutline = await bitmap(canvas);
  await control('outline').press('Space');
  await expect.poll(() => bitmap(canvas)).not.toBe(beforeOutline);

  const settings = await Promise.all(['preset', 'depth', 'speed', 'theme'].map(id => control(id).inputValue()));
  const beforeLesson = await bitmap(canvas);
  await control('lesson').focus();
  await press(control('lesson'));
  const lesson = control('lesson-dialog');
  await expect(lesson).toBeVisible();
  for (let step = 1; step <= 4; step++) {
    await expect(lesson).toHaveAttribute('data-step', String(step));
    if (step < 4) await press(control('lesson-next'));
  }
  await page.keyboard.press('Escape');
  await expect(lesson).not.toBeVisible();
  await expect(control('lesson')).toBeFocused();
  await expect(work).toHaveAttribute('data-count', String(deep.count));
  await expect.poll(() => bitmap(canvas)).toBe(beforeLesson);
  expect(await Promise.all(['preset', 'depth', 'speed', 'theme'].map(id => control(id).inputValue()))).toEqual(settings);
  // Reopening starts at stage 1, and the explicit close control also restores focus.
  await press(control('lesson'));
  await expect(lesson).toHaveAttribute('data-step', '1');
  await press(control('lesson-close'));
  await expect(lesson).not.toBeVisible();
  await expect(control('lesson')).toBeFocused();

  await press(control('immersive'));
  const immersive = control('immersive-dialog');
  await expect(immersive).toBeVisible();
  await expect(lesson).not.toBeVisible();
  await expect(immersive.locator('canvas')).toBeVisible();
  await expect(immersive.locator('canvas')).not.toHaveJSProperty('width', 0);
  await press(control('immersive-close'));
  await expect(immersive).not.toBeVisible();
  await expect(control('immersive')).toBeFocused();

  await control('reset').click();
  await expect(control('preset')).toHaveValue('trinity');
  await expect(control('depth')).toHaveValue(initialDepth);
  await expect(control('speed')).toHaveValue('1');
  await expect(control('theme')).toHaveValue('night');
  await expect.poll(() => bitmap(canvas)).toBe(initialBitmap);

  await page.setViewportSize({ width: 1280, height: 960 });
  await horizontalFit(page, 1280);
  await expect.poll(() => bitmap(canvas)).not.toBe(initialBitmap);
  await expect(work).toHaveAttribute('data-draw-complete', 'true');
  const desktopBitmap = await bitmap(canvas);
  await picker.selectOption('modular-heart');
  await expect(work).toHaveCount(0);
  await picker.selectOption(slug);
  await expect(work).toHaveAttribute('data-state', 'finished');
  await expect.poll(() => bitmap(canvas)).toBe(desktopBitmap);
  expect(errors).toEqual([]);
});
