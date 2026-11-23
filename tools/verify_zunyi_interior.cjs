/* 遵义主楼内部走查：门口 → 门厅 → 楼梯 → 二层会议室，逐段读坐标与楼层高度。
   用法：node tools/verify_zunyi_interior.cjs [port] */
'use strict';
const path = require('path');
const fs = require('fs');
const puppeteer = require('E:/新建文件夹/_browser/node_modules/puppeteer-core');

const PORT = process.argv[2] || 8081;
const OUT = path.join(__dirname, '..', 'evidence', 'zunyi-interior-20261123');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(`http://127.0.0.1:${PORT}/march-world/preview.html?3d=1&chapter=chapter-3%2Fscene-zunyi`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction('window.CZMarchWorld && CZMarchWorld.mounted === true', { timeout: 120000 });
  await page.waitForFunction(() => CZMarchWorld.performance.viewMode, { timeout: 60000 });

  const info = await page.evaluate(() => {
    const s = CZMarchWorld.snapshot(), scene = CZMarchWorld._.scenes[s.sceneId];
    return { zone: scene.zunyiInterior ? { cx: scene.zunyiInterior.cx, cy: scene.zunyiInterior.cy, walls: scene.zunyiInterior.walls.length, x1: scene.zunyiInterior.x1, x2: scene.zunyiInterior.x2, y1: scene.zunyiInterior.y1, y2: scene.zunyiInterior.y2 } : null, stats: CZMarchWorld.performance.zunyiInterior || null };
  });

  const state = () => page.evaluate(() => {
    const s = CZMarchWorld.snapshot(), p = CZMarchWorld._.scenes[s.sceneId].focusActor;
    return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), height: +(p.height || 0).toFixed(2), indoor: !!p.indoor, moving: p.moving };
  });

  // 直线走一段：起点 → 终点，最多等 9 秒
  const walk = async (from, to, facing) => {
    await page.evaluate(({ from, to, facing }) => {
      const s = CZMarchWorld.snapshot(), p = CZMarchWorld._.scenes[s.sceneId].focusActor;
      p.setPos(from[0], from[1], facing);
      p.moveTo([{ x: to[0], y: to[1] }]);
    }, { from, to, facing });
    const started = Date.now();
    let begun = false;
    while (Date.now() - started < 14000) {
      await new Promise(r => setTimeout(r, 250));
      const now = await state();
      if (now.moving) begun = true;
      else if (begun) break;
      if (Math.hypot(now.x - to[0], now.y - to[1]) < 0.7) break;
    }
    await new Promise(r => setTimeout(r, 500));
    return await state();
  };

  const results = {};
  results.zone = info.zone;
  results.stats = info.stats;
  results.door = await walk([81, 36.5], [81, 30.6], 'n');
  await page.screenshot({ path: path.join(OUT, 'inside-hall.png') });

  results.stairs = await walk([76.18, 33.2], [76.18, 29.6], 'n');
  await page.screenshot({ path: path.join(OUT, 'stairs.png') });

  results.meeting = await walk([76.18, 29.7], [83.4, 29.9], 'e');
  await page.screenshot({ path: path.join(OUT, 'meeting-room.png') });

  results.errors = errors;
  fs.writeFileSync(path.join(OUT, 'verify.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
