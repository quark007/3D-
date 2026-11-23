const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require(process.env.PUPPETEER_PATH || '../../_browser/node_modules/puppeteer-core');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, protocolTimeout: 120000 });
  const page = await browser.newPage();
  const report = { viewport: [390, 844], requests: [], errors: [], failedRequests: [] };
  page.on('request', request => report.requests.push(request.url()));
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() }); });
  try {
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:8080';
    await page.goto(origin + '/march-world/preview.html?3d=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForFunction(() => window.CZMarchWorld && window.CZMarchWorldManifest, { timeout: 60000 });
    await page.evaluate(async () => {
      const scene = CZMarchWorldManifest.scenes.find(item => item.chapterId === 1);
      document.getElementById('chapter').value = scene.sceneId;
      await CZMarchWorld.mount(document.getElementById('world'), { chapterId: 1, sceneId: scene.sceneId, roleId: 'soldier', anchors: scene.anchors });
    });
    if (await page.$('.czmw-cinema-skip3d')) await page.click('.czmw-cinema-skip3d');
    await page.waitForFunction(() => CZMarchWorld.performance?.frames > 3, { timeout: 30000 });
    report.stats = await page.evaluate(() => JSON.parse(JSON.stringify(CZMarchWorld.performance)));
    assert(!Object.hasOwn(report.stats, 'artReady'), '3D stats must not expose a permanent false artReady field');
    assert(report.requests.some(url => url.includes('/wang-gui-web.glb')), 'mobile must load the full Wang Gui asset');
    assert(!report.requests.some(url => url.includes('/wang-gui-lod.glb')), 'mobile must not request the missing LOD');
    assert.deepEqual(report.failedRequests, []);
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.passed = false;
    report.failure = error.stack;
    process.exitCode = 1;
  } finally {
    const output = path.join(root, '..', 'evidence/he-wen-material-2026-11-24/cleanup-mobile.json');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ passed: report.passed, stats: report.stats, failedRequests: report.failedRequests, errors: report.errors, lodRequested: report.requests.some(url => url.includes('/wang-gui-lod.glb')), fullModelRequested: report.requests.some(url => url.includes('/wang-gui-web.glb')), failure: report.failure }, null, 2));
    await browser.close();
  }
})();