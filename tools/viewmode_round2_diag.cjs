'use strict';
/* P0：3 出生点 × 3 朝向 + 焦点/事件/模式状态 + 第三人称对照。只以真实键盘移动。 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('E:/新建文件夹/_browser/node_modules/puppeteer-core');
const port = process.argv[2] || 8082;
const out = path.join(__dirname, '..', process.env.CZ_STRESS_ONLY === '1' ? 'evidence/viewmode-20261123/round2-longframe-probe.json' : 'evidence/viewmode-20261123/round2-p0-diagnostics.json');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 120000, args: ['--no-sandbox', '--hide-scrollbars'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.bringToFront();
  const report = { samples: [], errors: [] };
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('pageerror', e => report.errors.push(e.message));
  const read = () => page.evaluate(() => {
    const r = n => +Number(n).toFixed(3), W = CZMarchWorld, s = W.snapshot();
    const p = W._.scenes[s.sceneId].focusActor, i = window.__diagInput, v = W.performance || {};
    return { x: r(s.x), y: r(s.y), facing: r(s.facing), moving: p.moving, running: p.running, walking: p.walking,
      speed: r(p.speed), vector: i?.vector() || null, hasKeyboard: i?.hasKeyboard() ?? null,
      viewMode: v.viewMode, cameraMode: v.cameraMode, cameraDistance: v.cameraDistance, orbitYaw: v.orbitYaw, frames: v.frames,
      activeElement: document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName,
      worldFocused: document.activeElement === document.getElementById('world') };
  });
  async function mount(spawn) {
    // 仅布置采样起点；按键期间不改坐标，全部位移由真实 KeyW 驱动。
    await page.evaluate(spawn => {
      const W = CZMarchWorld, snap = W.snapshot();
      W._.scenes[snap.sceneId].focusActor.setPos(spawn.x, spawn.y, spawn.facing);
      document.getElementById('world').focus({ preventScroll: true });
      window.__diagKeys = [];
    }, spawn);
    const frames = await page.evaluate(() => CZMarchWorld.performance.frames);
    await page.waitForFunction(start => CZMarchWorld.performance?.frames >= start + 3, { timeout: 20000 }, frames);
  }
  async function face(target) {
    await page.evaluate(target => {
      const v = window.__diagView, current = v.lookFacing();
      const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
      v.adjustCamera(delta / .0045, 0);
    }, target);
    await page.waitForFunction(target => {
      const current = window.__diagView.lookFacing();
      return Math.abs(Math.atan2(Math.sin(target - current), Math.cos(target - current))) < .035;
    }, { timeout: 15000 }, target);
  }
  async function sample(label, spawn, facing, mode = 'first') {
    await mount({ ...spawn, facing });
    if (mode === 'third') {
      await page.keyboard.press('KeyV');
      await page.waitForFunction(() => CZMarchWorld.performance.viewMode === 'third');
      await wait(300);
    } else await face({ n: -Math.PI / 2, e: 0, s: Math.PI / 2 }[facing]);
    const before = await read();
    await page.keyboard.down('KeyW');
    await wait(2600);
    const during = await read();
    await page.keyboard.up('KeyW');
    const after = await read();
    await page.waitForFunction(() => { const W = CZMarchWorld, s = W.snapshot(); return W._.scenes[s.sceneId].focusActor.speed === 0; }, { timeout: 10000 });
    const stopped = await read(), keys = await page.evaluate(() => window.__diagKeys.slice());
    const result = { label, spawn, requestedFacing: facing, mode, before, during, after, stopped, keys,
      distance: +Math.hypot(after.x - before.x, after.y - before.y).toFixed(3), frameDelta: after.frames - before.frames };
    report.samples.push(result);
    console.log(JSON.stringify(result));
  }
  await page.evaluateOnNewDocument(() => {
    let ns, viewWrapped = false, inputWrapped = false;
    const wrap = value => {
      const M = value?._;
      if (!M) return;
      if (M.view?.create && !viewWrapped) {
        const create = M.view.create;
        M.view.create = async (...args) => { const view = await create(...args); window.__diagView = view; return view; };
        viewWrapped = true;
      }
      if (M.input?.create && !inputWrapped) {
        const create = M.input.create;
        M.input.create = (...args) => { const input = create(...args); window.__diagInput = input; return input; };
        inputWrapped = true;
      }
    };
    Object.defineProperty(window, 'CZMarchWorld', { configurable: true, get: () => ns, set: value => { ns = value; wrap(value); } });
    window.__diagKeys = [];
    for (const type of ['keydown', 'keyup']) window.addEventListener(type, e => {
      if (!['KeyW', 'KeyV'].includes(e.code)) return;
      const row = { type, code: e.code, at: +performance.now().toFixed(1), target: e.target?.id || e.target?.className || e.target?.tagName };
      window.__diagKeys.push(row);
      queueMicrotask(() => { row.defaultPrevented = e.defaultPrevented; });
    });
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/march-world/preview.html?3d=1&chapter=chapter-3%2Fscene-zunyi`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.CZMarchWorld?.mounted === true, { timeout: 90000 });
    await wait(4000);
    await page.waitForFunction(() => window.__diagView?.lookFacing && window.__diagInput && CZMarchWorld.performance?.frames >= 5, { timeout: 90000 });
    if (process.env.CZ_STRESS_ONLY !== '1') {
      for (const spawn of [{ x: 16, y: 58 }, { x: 32, y: 58 }, { x: 50, y: 58 }])
        for (const facing of ['n', 'e', 's']) await sample(`(${spawn.x},${spawn.y})-${facing}`, spawn, facing);
      await sample('third-person-control', { x: 16, y: 58 }, 'n', 'third');
      await page.keyboard.press('KeyV');
      await page.waitForFunction(() => CZMarchWorld.performance.viewMode === 'first');
    }
    // 长帧探针：keydown 后阻塞主线程 3.5s，KeyW 的实际按住时长仍为 2.6s。
    // 长帧探针沿用开场朝向，不额外等待视角准备。
    await page.evaluate(() => {
      const W = CZMarchWorld, snap = W.snapshot();
      W._.scenes[snap.sceneId].focusActor.setPos(16, 58, 'e');
      document.getElementById('world').focus({ preventScroll: true });
      window.__diagKeys = [];
      window.__diagBlock = {};
      window.addEventListener('keydown', function blockOnW(e) {
        if (e.code !== 'KeyW') return;
        window.removeEventListener('keydown', blockOnW);
        setTimeout(() => {
          window.__diagBlock.start = +performance.now().toFixed(1);
          const until = performance.now() + 3500;
          while (performance.now() < until) { /* 模拟旧证据中的长渲染任务 */ }
          window.__diagBlock.end = +performance.now().toFixed(1);
        }, 0);
      });
    });
    const stressBefore = await read();
    await page.keyboard.down('KeyW');
    await wait(2600);
    await page.keyboard.up('KeyW');
    const stressAfter = await read();
    report.longFrameProbe = { before: stressBefore, after: stressAfter,
      distance: +Math.hypot(stressAfter.x - stressBefore.x, stressAfter.y - stressBefore.y).toFixed(3),
      frameDelta: stressAfter.frames - stressBefore.frames,
      keys: await page.evaluate(() => window.__diagKeys.slice()),
      block: await page.evaluate(() => window.__diagBlock) };
    console.log('LONG_FRAME ' + JSON.stringify(report.longFrameProbe));
    report.summary = {
      firstPerson: report.samples.filter(s => s.mode === 'first').map(s => ({ label: s.label, distance: s.distance, speed: s.during.speed, frames: s.frameDelta, worldFocused: s.before.worldFocused })),
      thirdPersonDistance: report.samples.find(s => s.mode === 'third')?.distance,
      allKeyboardEventsArrived: report.samples.every(s => s.keys.some(e => e.type === 'keydown' && e.code === 'KeyW') && s.keys.some(e => e.type === 'keyup' && e.code === 'KeyW')),
      allWorldFocused: report.samples.every(s => s.before.worldFocused),
      modesMatched: report.samples.every(s => s.before.viewMode === s.mode && (s.mode === 'first' ? s.before.cameraMode === 'first' : s.before.cameraMode === 'shoulder'))
    };
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log('SUMMARY ' + JSON.stringify(report.summary));
  } finally { await browser.close(); }
})().catch(e => { console.error('FAILED', e); process.exit(1); });