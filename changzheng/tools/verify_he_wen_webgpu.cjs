const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require(process.env.PUPPETEER_PATH || '../../_browser/node_modules/puppeteer-core');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    protocolTimeout: 180000,
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan,UseSkiaRenderer']
  });
  const page = await browser.newPage();
  const report = { passed: false, errors: [], warnings: [], failedRequests: [], generatedAt: new Date().toISOString() };
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(message.text());
    if (message.type() === 'warn') report.warnings.push(message.text());
  });
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() }); });
  const frames = () => page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const frame = () => ++count > 10 ? resolve() : requestAnimationFrame(frame);
    requestAnimationFrame(frame);
  }));
  try {
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto('http://127.0.0.1:8080/march-world/character-preview.html?renderer=webgpu', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.characterPreview?.stats, { timeout: 180000 });
    await frames();
    report.backend = await page.evaluate(() => characterPreview.backend);
    report.gpu = await page.evaluate(async () => {
      if (!navigator.gpu) return 'navigator.gpu unavailable';
      const adapter = await navigator.gpu.requestAdapter();
      return adapter ? (adapter.info?.description || adapter.info?.vendor || 'adapter present') : 'no adapter';
    });
    report.skin = await page.evaluate(() => {
      const skin = characterPreview.model.getObjectByName('HeWen_Skin');
      const mat = Array.isArray(skin.material) ? skin.material[0] : skin.material;
      return {
        colorNode: !!mat.colorNode, normalNode: !!mat.normalNode,
        roughnessNode: !!mat.roughnessNode, emissiveNode: !!mat.emissiveNode
      };
    });
    report.stats = await page.evaluate(() => characterPreview.stats);
    await page.click('[data-view="front"]');
    await frames();
    await page.screenshot({ path: path.join(root, '_shots', 'he-wen-webgpu-front.png') });
    await page.click('[data-view="quarter"]');
    await frames();
    await page.screenshot({ path: path.join(root, '_shots', 'he-wen-webgpu-quarter.png') });
    await page.click('[data-view="body"]');
    await frames();
    await page.screenshot({ path: path.join(root, '_shots', 'he-wen-webgpu-body.png') });
    await page.select('#animation', 'Talk');
    await frames();
    await page.screenshot({ path: path.join(root, '_shots', 'he-wen-webgpu-talk.png') });
    await page.select('#animation', '');
    if (report.backend === 'webgpu') {
      for (const key of ['colorNode', 'normalNode', 'roughnessNode', 'emissiveNode']) {
        if (!report.skin[key]) throw new Error('TSL skin node missing: ' + key);
      }
    }
    if (report.errors.length) throw new Error('Console errors: ' + report.errors.join(' | '));
    if (report.failedRequests.length) throw new Error('Failed requests detected');
    const fallbackPage = await browser.newPage();
    const fallbackErrors = [];
    fallbackPage.on('pageerror', error => fallbackErrors.push(error.message));
    await fallbackPage.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'gpu', { get: () => undefined, configurable: true });
    });
    await fallbackPage.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await fallbackPage.goto('http://127.0.0.1:8080/march-world/character-preview.html?renderer=webgpu', { waitUntil: 'domcontentloaded' });
    await fallbackPage.waitForFunction(() => window.characterPreview?.stats, { timeout: 180000 });
    report.fallback = { backend: await fallbackPage.evaluate(() => characterPreview.backend), errors: fallbackErrors };
    if (report.fallback.backend !== 'webgl') throw new Error('Fallback did not select WebGL: ' + report.fallback.backend);
    if (fallbackErrors.length) throw new Error('Fallback page errors: ' + fallbackErrors.join(' | '));
    await fallbackPage.screenshot({ path: path.join(root, '_shots', 'he-wen-webgpu-fallback.png') });
    report.passed = true;
  } catch (error) {
    report.failure = error.stack;
    await page.screenshot({ path: path.join(root, '_shots', 'he-wen-webgpu-failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(root, '_shots', 'he-wen-webgpu.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
})();