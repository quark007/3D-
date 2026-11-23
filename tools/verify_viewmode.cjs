/* 人称切换验收（CDP 连接版）：默认第一人称 → V 切第三人称 → 再切回 → 第一人称前进。
   前置：powershell 启动 msedge --headless=new --remote-debugging-port=9333
   用法：node tools/verify_viewmode.cjs [port] [cdpPort] */
'use strict';
const path = require('path');
const fs = require('fs');
const http = require('http');
const puppeteer = require('E:/新建文件夹/_browser/node_modules/puppeteer-core');

const PORT = process.argv[2] || 8082;
const CDP = Number(process.argv[3] || 9333);
const OUT = path.join(__dirname, '..', 'evidence', process.env.CZ_EVIDENCE || 'viewmode-20261123');
const SCENE = process.argv[4] || 'chapter-2/scene-xiangjiang';
const TAG = SCENE.split('/')[0];
const URL = `http://127.0.0.1:${PORT}/march-world/preview.html?3d=1&chapter=${encodeURIComponent(SCENE)}`;

const getJson = url => new Promise((resolve, reject) => {
  http.get(url, res => {
    let body = '';
    res.on('data', chunk => { body += chunk; });
    res.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
  }).on('error', reject);
});

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.bringToFront();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', error => errors.push('pageerror: ' + error.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.CZMarchWorld && window.CZMarchWorld.mounted === true', { timeout: 90000 });
  await new Promise(resolve => setTimeout(resolve, 4000));

  const read = () => page.evaluate(() => {
    const button = document.querySelector('.czmw-view86');
    const stats = window.CZMarchWorld.performance || {};
    return {
      button: button ? { text: button.textContent, mode: button.dataset.mode, hidden: button.hidden, checked: button.getAttribute('aria-checked') } : null,
      viewMode: stats.viewMode, cameraMode: stats.cameraMode, cameraDistance: stats.cameraDistance,
      frames: stats.frames, triangles: stats.triangles, renderMs: stats.renderMs,
      pinHidden: document.querySelector('.czmw-player-pin86')?.hidden ?? null
    };
  });

  const first = await read();
  await page.screenshot({ path: path.join(OUT, `${TAG}-first.png`) });

  await page.keyboard.press('KeyV');
  await new Promise(resolve => setTimeout(resolve, 1800));
  const third = await read();
  await page.screenshot({ path: path.join(OUT, `${TAG}-third.png`) });

  await page.keyboard.press('KeyV');
  await new Promise(resolve => setTimeout(resolve, 1800));
  const back = await read();

  // 鼠标转视角：alt + pointermove（无头环境拿不到指针锁，用 alt 分支）
  const yawBefore = await page.evaluate(() => window.CZMarchWorld.performance.orbitYaw);
  await page.evaluate(() => {
    const host = document.querySelector('.czmw-host');
    for (let i = 0; i < 12; i++) {
      host.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, pointerType: 'mouse', altKey: true, movementX: 18, movementY: 0
      }));
    }
  });
  await new Promise(resolve => setTimeout(resolve, 900));
  const yawAfter = await page.evaluate(() => window.CZMarchWorld.performance.orbitYaw);

  const before = await page.evaluate(() => window.CZMarchWorld.snapshot());
  await page.keyboard.down('KeyW');
  await new Promise(resolve => setTimeout(resolve, 2600));
  await page.keyboard.up('KeyW');
  const after = await page.evaluate(() => window.CZMarchWorld.snapshot());
  const walked = await read();
  await page.screenshot({ path: path.join(OUT, `${TAG}-first-walk.png`) });

  const moved = { before, after, distance: +Math.hypot(after.x - before.x, after.y - before.y).toFixed(2) };
  const result = { first, third, back, look: { yawBefore, yawAfter, delta: +(yawAfter - yawBefore).toFixed(3) }, moved, walked, errors };
  fs.writeFileSync(path.join(OUT, `${TAG}-verify.json`), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await page.close();
  await browser.close();
})().catch(error => { console.error('FAILED', error); process.exit(1); });
