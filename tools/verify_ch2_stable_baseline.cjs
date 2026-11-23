/* 第 2 章可重复基线：真实鼠标/键盘事件；默认 65 个手动 rAF × 40ms = 2600ms。
   只校准测试视角与动画时钟，不写玩家坐标，不改生产代码，不生成截图。 */
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const puppeteer = require('E:/新建文件夹/_browser/node_modules/puppeteer-core');
const PORT = process.argv[2] || 8082;
const RUN = process.env.CZ_RUN || '10';
const FPS = Number(process.env.CZ_FPS || 0);
const VIRTUAL = process.env.CZ_VIRTUAL === '1';
const MANUAL = process.env.CZ_MANUAL !== '0';
const OUT = path.join(__dirname, '..', 'evidence', 'viewmode-20261123', 'round3', `ch2-run${RUN}`);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 120000,
    args: ['--no-sandbox', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.bringToFront();
  await page.evaluateOnNewDocument(({ fps }) => {

    let ns, wrapped = false;
    Object.defineProperty(window, 'CZMarchWorld', { configurable: true, get: () => ns, set: value => {
      ns = value; const M = value?._;
      if (!wrapped && M?.view?.create) {
        const create = M.view.create;
        M.view.create = async (...args) => { const view = await create(...args); window.__stableView = view; return view; };
        wrapped = true;
      }
    } });
  }, { fps: FPS });
  const errors = [], failedRequests = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', error => errors.push('pageerror: ' + error.message));
  page.on('response', response => { if (response.status() >= 400) failedRequests.push({ status: response.status(), url: response.url() }); });
  const read = () => page.evaluate(() => {
    const stats = CZMarchWorld.performance || {}, button = document.querySelector('.czmw-view86');
    return { button: button ? { text: button.textContent, mode: button.dataset.mode, hidden: button.hidden } : null,
      backend: stats.backend, viewMode: stats.viewMode, cameraMode: stats.cameraMode, cameraDistance: stats.cameraDistance,
      orbitYaw: stats.orbitYaw, frames: stats.frames, renderMs: stats.renderMs,
      pinHidden: document.querySelector('.czmw-player-pin86')?.hidden ?? null };
  });
  try {
    await page.goto(`http://127.0.0.1:${PORT}/march-world/preview.html?3d=1&chapter=chapter-2%2Fscene-xiangjiang`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.CZMarchWorld?.mounted === true && window.__stableView?.setLook, { timeout: 90000 });
    await wait(4000);
    const first = await read();
    await page.keyboard.press('KeyV'); await wait(1800);
    const third = await read();
    await page.keyboard.press('KeyV'); await wait(1800);
    const back = await read();
    if (FPS > 0) await page.evaluate(fps => {
      const raf = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
      let last = -Infinity;
      window.requestAnimationFrame = callback => {
        const loop = timestamp => {
          if (timestamp - last >= 1000 / fps - 1) { last = timestamp; callback(timestamp); }
          else raf(loop);
        };
        return raf(loop);
      };
      window.cancelAnimationFrame = cancel;
    }, FPS);
    const yawBefore = await page.evaluate(() => CZMarchWorld.performance.orbitYaw);
    await page.evaluate(() => {
      const host = document.querySelector('.czmw-host');
      for (let i = 0; i < 12; i++) host.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', altKey: true, movementX: 18, movementY: 0 }));
    });
    await wait(900);
    const yawAfter = await page.evaluate(() => CZMarchWorld.performance.orbitYaw);
    let manualStart = 0;
    if (MANUAL) {
      await page.evaluate(() => {
        const queue = window.__manualRaf = new Map();
        let id = 0;
        window.requestAnimationFrame = callback => { queue.set(++id, callback); return id; };
        window.cancelAnimationFrame = key => queue.delete(key);
        window.__manualStep = timestamp => {
          const callbacks = [...queue.values()]; queue.clear();
          for (const callback of callbacks) callback(timestamp);
          return callbacks.length;
        };
      });
      await wait(80); // 让接管前最后一个原生 rAF 把下一帧放入手动队列
      manualStart = await page.evaluate(() => {
        const timestamp = performance.now();
        if (!window.__manualStep(timestamp)) return 0;
        return timestamp;
      });
      if (!manualStart) throw new Error('手动 rAF 接管失败：没有待执行渲染回调');
    }
    // 历史样本的运动起点是 yaw=-0.198，目标仍是鼠标事件给出的 -0.972。
    // setLook 同时写 yaw/target；adjustCamera(172) 只把 target 调回 -0.972，当前 yaw 不变。
    await page.evaluate(() => { window.__stableView.setLook(-0.198); window.__stableView.adjustCamera(172, 0); });
    const framesBefore = await page.evaluate(() => CZMarchWorld.performance.frames);
    const before = await page.evaluate(() => CZMarchWorld.snapshot());
    if (MANUAL) {
      await page.keyboard.down('KeyW');
      for (let i = 1; i <= 65; i++) await page.evaluate(timestamp => window.__manualStep(timestamp), manualStart + i * 40);
      await page.keyboard.up('KeyW');
    } else if (VIRTUAL) {
      const client = await page.target().createCDPSession();
      await client.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
      await page.keyboard.down('KeyW');
      const expired = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('虚拟时间 2600ms 预算超时')), 90000);
        client.once('Emulation.virtualTimeBudgetExpired', () => { clearTimeout(timer); resolve(); });
      });
      await client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: 2600 });
      await expired;
      await page.keyboard.up('KeyW');
    } else {
      await page.keyboard.down('KeyW'); await wait(2600); await page.keyboard.up('KeyW');
    }
    const after = await page.evaluate(() => CZMarchWorld.snapshot());
    const walked = await read();
    const result = { run: Number(RUN), calibration: { yaw: -0.198, target: -0.972, keyHeldMs: 2600, requestedFps: FPS || 'native', virtualTime: VIRTUAL, manualFrames: MANUAL ? 65 : 0, manualStepMs: MANUAL ? 40 : 0 },
      first, third, back, look: { yawBefore, yawAfter, delta: +(yawAfter - yawBefore).toFixed(3) },
      moved: { before, after, distance: +Math.hypot(after.x - before.x, after.y - before.y).toFixed(2), frames: walked.frames - framesBefore },
      walked, errors, failedRequests };
    result.passed = result.moved.distance >= 9.57 && result.moved.frames === 65 && result.walked.backend === 'three'
      && result.walked.viewMode === 'first' && result.walked.cameraMode === 'first' && result.walked.cameraDistance === 0
      && result.third.cameraMode === 'shoulder' && result.third.cameraDistance === 7.941 && !errors.length && !failedRequests.length;
    fs.writeFileSync(path.join(OUT, 'chapter-2-verify.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(error => { console.error('FAILED', error); process.exit(1); });