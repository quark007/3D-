'use strict';
/* 第一人称 P1：NPC 导引、对话停走、C/Shift、Space、V 连续 5 次。无截图。 */
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('E:/新建文件夹/_browser/node_modules/puppeteer-core');
const out = path.join(__dirname, '..', 'evidence/viewmode-20261123/round2-p1.json');
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 120000, args: ['--no-sandbox', '--hide-scrollbars', '--no-first-run'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.bringToFront();
  const report = { errors: [] };
  page.on('console', m => { if (m.type() === 'error') report.errors.push(m.text()); });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.evaluateOnNewDocument(() => {
    let ns, viewWrapped = false, inputWrapped = false;
    const balance = window.__p1ListenerBalance = { keydown: 0, keyup: 0 };
    const add = window.addEventListener, remove = window.removeEventListener;
    window.addEventListener = function(type, fn, opts) { if (type in balance) balance[type]++; return add.call(this, type, fn, opts); };
    window.removeEventListener = function(type, fn, opts) { if (type in balance) balance[type]--; return remove.call(this, type, fn, opts); };
    Object.defineProperty(window, 'CZMarchWorld', { configurable: true, get: () => ns, set: value => {
      ns = value; const M = value?._; if (!M) return;
      if (M.view?.create && !viewWrapped) { const create = M.view.create; M.view.create = async (...a) => { const v = await create(...a); window.__p1View = v; return v; }; viewWrapped = true; }
      if (M.input?.create && !inputWrapped) { const create = M.input.create; M.input.create = (...a) => { const i = create(...a); window.__p1Input = i; return i; }; inputWrapped = true; }
    } });
  });
  const read = () => page.evaluate(() => {
    const r = n => +Number(n).toFixed(3), W = CZMarchWorld, s = W.snapshot(), p = W._.scenes[s.sceneId].focusActor, v = W.performance || {};
    return { x: r(s.x), y: r(s.y), facing: r(s.facing), speed: r(p.speed), moving: p.moving, walking: p.walking, running: p.running,
      airborne: p.airborne, jumpHeight: r(p.jumpHeight), viewMode: v.viewMode, cameraMode: v.cameraMode, cameraDistance: v.cameraDistance,
      frames: v.frames, playerPinHidden: document.querySelector('.czmw-player-pin86')?.hidden,
      guidePinHidden: document.querySelector('.czmw-guide87')?.hidden,
      actionHidden: document.querySelector('.czmw-act')?.hidden, actionText: document.querySelector('.czmw-act')?.textContent,
      activeElement: document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName };
  });
  const stop = () => page.waitForFunction(() => { const W = CZMarchWorld, s = W.snapshot(); return W._.scenes[s.sceneId].focusActor.speed === 0; }, { timeout: 15000 });
  async function place(x, y, facing = 'e') {
    await page.evaluate(({ x, y, facing }) => { const W = CZMarchWorld, s = W.snapshot(); W._.scenes[s.sceneId].focusActor.setPos(x, y, facing); document.getElementById('world').focus({ preventScroll: true }); }, { x, y, facing });
    const start = await page.evaluate(() => CZMarchWorld.performance.frames);
    await page.waitForFunction(start => CZMarchWorld.performance.frames >= start + 3, { timeout: 30000 }, start);
  }
  async function face(target) {
    await page.evaluate(target => { const v = window.__p1View, c = v.lookFacing(), d = Math.atan2(Math.sin(target - c), Math.cos(target - c)); v.adjustCamera(d / .0045, 0); }, target);
    await page.waitForFunction(target => { const c = window.__p1View.lookFacing(); return Math.abs(Math.atan2(Math.sin(target - c), Math.cos(target - c))) < .04; }, { timeout: 45000 }, target);
  }
  async function release(code) { await page.keyboard.up(code); await stop(); }
  try {
    await page.goto('http://127.0.0.1:8082/march-world/preview.html?3d=1&chapter=chapter-3%2Fscene-zunyi', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => window.CZMarchWorld?.mounted && window.__p1View?.lookFacing && window.__p1Input, { timeout: 90000 });
    await wait(4000);

    // 1) 真实 W 走到目标 NPC 旁，再检查导引与第一人称状态。
    await place(85, 48, 'n'); await face(-Math.PI / 2);
    const npc = await page.evaluate(() => {
      const W = CZMarchWorld, a = W._.scenes['chapter-3/scene-zunyi'].anchorEntities.find(a => a.anchorId === 'chapter-3/anchor-dialogue-03-03-he_wen');
      W.setGuide({ anchorId: a.anchorId, label: a.label }); return { anchorId: a.anchorId, label: a.label, x: a.x, y: a.y };
    });
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => { const W = CZMarchWorld, s = W.snapshot(); return Math.hypot(s.x - 85, s.y - 44) < 2.8; }, { timeout: 15000 });
    await release('KeyW');
    report.npcGuide = { npc, ...(await read()), npcDistance: await page.evaluate(() => { const s = CZMarchWorld.snapshot(); return +Math.hypot(s.x - 85, s.y - 44).toFixed(3); }) };

    // 2) 交互事件由测试监听器接到 B 方 pause/resume；暂停时再按 W 也不得移动。
    await page.evaluate(() => {
      window.__p1Interactions = [];
      window.addEventListener('czmarch:interact', e => { window.__p1Interactions.push(e.detail); if (e.detail.anchorId === 'chapter-3/anchor-dialogue-03-03-he_wen') CZMarchWorld.pause('dialogue'); });
    });
    await page.keyboard.down('KeyW');
    await page.waitForFunction(() => { const W = CZMarchWorld, s = W.snapshot(); return W._.scenes[s.sceneId].focusActor.speed > .35; }, { timeout: 10000 });
    const dialogueBefore = await read();
    await page.click('.czmw-act');
    await page.keyboard.up('KeyW'); await stop();
    const dialoguePaused = await read(), pauseStart = await page.evaluate(() => CZMarchWorld.snapshot());
    await page.keyboard.down('KeyW'); await wait(400); await page.keyboard.up('KeyW');
    const pauseEnd = await page.evaluate(() => CZMarchWorld.snapshot());
    const interactions = await page.evaluate(() => window.__p1Interactions.slice());
    await page.evaluate(() => { CZMarchWorld.resume('dialogue'); document.getElementById('world').focus({ preventScroll: true }); });
    await page.keyboard.down('KeyW'); await wait(650);
    const dialogueRecovered = await read(); await release('KeyW');
    report.dialogue = { before: dialogueBefore, paused: dialoguePaused, interactions,
      pausedDistance: +Math.hypot(pauseEnd.x - pauseStart.x, pauseEnd.y - pauseStart.y).toFixed(3), recovered: dialogueRecovered };

    // 3) C=1.5m/s、Shift=7m/s，均通过真实键盘在第一人称达到稳态。
    await place(16, 58, 'e'); await face(0);
    await page.keyboard.press('KeyC'); await page.keyboard.down('KeyW');
    await page.waitForFunction(() => { const W = CZMarchWorld, s = W.snapshot(), p = W._.scenes[s.sceneId].focusActor; return p.walking && p.speed >= 1.49; }, { timeout: 15000 });
    report.walk = await read(); await release('KeyW'); await page.keyboard.press('KeyC');
    await page.keyboard.down('Shift'); await page.keyboard.down('KeyW');
    await page.waitForFunction(() => { const W = CZMarchWorld, s = W.snapshot(), p = W._.scenes[s.sceneId].focusActor; return p.running && p.speed >= 6.95; }, { timeout: 15000 });
    report.sprint = await read(); await page.keyboard.up('Shift'); await release('KeyW');

    // 4) airborne 直接由 jumpTime<JUMP_DURATION 得出；rAF 记录起跳到回落全过程。
    await place(16, 58, 'e');
    await page.evaluate(() => {
      const W = CZMarchWorld, s = W.snapshot(), p = W._.scenes[s.sceneId].focusActor;
      window.__p1JumpSamples = []; window.__p1JumpSampling = true;
      const sample = () => { window.__p1JumpSamples.push({ at: +performance.now().toFixed(1), airborne: p.airborne, jumpHeight: +p.jumpHeight.toFixed(4) }); if (window.__p1JumpSampling) requestAnimationFrame(sample); };
      sample();
    });
    await page.keyboard.press('Space');
    await page.waitForFunction(() => { const W = CZMarchWorld, s = W.snapshot(); return W._.scenes[s.sceneId].focusActor.airborne; }, { timeout: 10000 });
    await page.waitForFunction(() => { const W = CZMarchWorld, s = W.snapshot(); return !W._.scenes[s.sceneId].focusActor.airborne; }, { timeout: 10000 });
    await wait(200);
    const jumpSamples = await page.evaluate(() => { window.__p1JumpSampling = false; return window.__p1JumpSamples; });
    const airborneSamples = jumpSamples.filter(s => s.airborne);
    report.jump = { sampleCount: jumpSamples.length, airborneSampleCount: airborneSamples.length,
      observedAirborneMs: airborneSamples.length ? +(airborneSamples.at(-1).at - airborneSamples[0].at).toFixed(1) : 0,
      peakJumpHeight: Math.max(...jumpSamples.map(s => s.jumpHeight)), final: await read() };

    // 5) 连续五轮 V；事件监听净数量不变，切回后无速度残留。
    await place(16, 58, 'e');
    const listenersBefore = await page.evaluate(() => ({ ...window.__p1ListenerBalance }));
    report.viewCycles = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('KeyV'); await page.waitForFunction(() => CZMarchWorld.performance.viewMode === 'third', { timeout: 10000 });
      const third = await read();
      await page.keyboard.press('KeyV'); await page.waitForFunction(() => CZMarchWorld.performance.viewMode === 'first', { timeout: 10000 });
      const first = await read(); report.viewCycles.push({ cycle: i + 1, third, first });
    }
    const listenersAfter = await page.evaluate(() => ({ ...window.__p1ListenerBalance }));
    await page.keyboard.down('KeyW'); await wait(500); await release('KeyW');
    report.viewCycleSummary = { listenersBefore, listenersAfter, final: await read() };
    report.passed = report.npcGuide.playerPinHidden === true && report.npcGuide.guidePinHidden === true && report.npcGuide.cameraDistance === 0 && report.npcGuide.npcDistance < 3.4
      && interactions.some(e => e.anchorId === npc.anchorId) && report.dialogue.paused.speed === 0 && report.dialogue.pausedDistance === 0 && report.dialogue.recovered.speed > 0
      && report.walk.walking && Math.abs(report.walk.speed - 1.5) < .02 && report.sprint.running && Math.abs(report.sprint.speed - 7) < .02
      && report.jump.airborneSampleCount > 0 && report.jump.peakJumpHeight > .7 && !report.jump.final.airborne && report.jump.final.jumpHeight === 0
      && report.viewCycles.length === 5 && report.viewCycles.every(c => c.third.cameraMode === 'shoulder' && c.first.cameraMode === 'first' && c.first.cameraDistance === 0 && c.first.speed === 0)
      && JSON.stringify(listenersBefore) === JSON.stringify(listenersAfter) && report.viewCycleSummary.final.speed === 0 && report.errors.length === 0;
    fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (!report.passed) process.exitCode = 1;
  } finally { await browser.close(); }
})().catch(e => { console.error('FAILED', e); process.exit(1); });