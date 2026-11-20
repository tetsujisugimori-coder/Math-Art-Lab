import fs from 'node:fs';

export async function capturePage(page, cdp, file, api = 'playwright') {
  if (api === 'playwright') {
    await page.screenshot({ path: file, timeout: 5000 });
    return;
  }
  if (!cdp || !['cdp-surface', 'cdp-view'].includes(api)) throw Error('Unsupported capture API ' + api);
  async function captureCdp() {
    const { visualViewport } = await cdp.send('Page.getLayoutMetrics');
    const viewport = page.viewportSize();
    const clip = {
      x: visualViewport.pageX, y: visualViewport.pageY,
      width: Math.ceil(viewport.width / visualViewport.scale),
      height: Math.ceil(viewport.height / visualViewport.scale), scale: visualViewport.scale,
    };
    return cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: api === 'cdp-surface', clip, captureBeyondViewport: false });
  }
  let timer;
  try {
    const result = await Promise.race([
      captureCdp(),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error(api + ' capture timeout 5000ms')), 5000); }),
    ]);
    fs.writeFileSync(file, Buffer.from(result.data, 'base64'));
  } finally {
    clearTimeout(timer);
  }
}

export async function inspectCaptureBitmap(page, image) {
  return page.evaluate(async base64 => {
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const decoded = document.createElement('canvas');
    decoded.width = image.naturalWidth;
    decoded.height = image.naturalHeight;
    const context = decoded.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const expectedWidth = innerWidth * devicePixelRatio;
    const expectedHeight = innerHeight * devicePixelRatio;
    const checks = [...document.querySelectorAll('#canvases canvas')].map(canvas => {
      const rect = canvas.getBoundingClientRect();
      const expected = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const actual = context.getImageData(Math.round(rect.left * devicePixelRatio), Math.round(rect.top * devicePixelRatio), canvas.width, canvas.height).data;
      let differentChannels = 0;
      let maximumChannelError = 0;
      for (let i = 0; i < expected.length; i++) {
        const error = Math.abs(expected[i] - actual[i]);
        if (error) differentChannels++;
        maximumChannelError = Math.max(maximumChannelError, error);
      }
      return { width: canvas.width, height: canvas.height, differentChannels, maximumChannelError };
    });
    return {
      imageWidth: image.naturalWidth, imageHeight: image.naturalHeight, expectedWidth, expectedHeight,
      dimensionsMatch: image.naturalWidth === expectedWidth && image.naturalHeight === expectedHeight,
      checks,
      scope: 'Post-capture readback; this readback may affect the backend and is outside the measured window',
    };
  }, image.toString('base64'));
}
