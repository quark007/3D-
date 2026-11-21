/* march-world 浏览器实跑验证：12章挂载、移动、碰撞、寻路、暂停语义、交互事件、幂等销毁、竖屏取景。
   用法：node march-world/tools/verify-browser.cjs（在仓库根目录运行；复用 _browser/puppeteer-core + Edge headless） */
'use strict';
const fs = require('fs'), path = require('path'), http = require('node:http');
const puppeteer = require('../../../_browser/node_modules/puppeteer-core');

const root = path.resolve(__dirname, '..', '..');
const shots = path.join(root, 'march-world', '_shots');
fs.mkdirSync(shots, { recursive: true });

const MIME = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp' };

(async () => {
  const server = http.createServer((req, res) => {
    try {
      const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
      const file = path.resolve(root, rel);
      if (!file.startsWith(root) || !fs.statSync(file).isFile()) throw Error();
      res.setHeader('Content-Type', MIME[path.extname(rel)] || 'application/octet-stream');
      fs.createReadStream(file).pipe(res);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;

  /* 复用本机已运行的调试 Edge（9222），独立上下文不影响用户浏览器 */
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 180000 });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [], results = [];
  const ok = (name, pass, note) => { results.push({ name, pass: !!pass, note: note || '' }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (note ? ' — ' + note : '')); };
  page.on('pageerror', e => errors.push(e.message));

  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(origin + '/march-world/preview.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CZMarchWorld && window.CZMarchWorldManifest && window.CZMarchWorldManifest.scenes.length === 12);
    ok('预览页加载与清单（12场景）', true);

    /* 1) 12章逐章挂载 + 桌面截图 */
    for (let n = 1; n <= 12; n++) {
      const sceneId = await page.evaluate(i => window.CZMarchWorldManifest.scenes[i].sceneId, n - 1);
      await page.select('#chapter', sceneId);
      await page.waitForFunction(() => window.CZMarchWorld.mounted);
      await new Promise(r => setTimeout(r, 700));
      await page.screenshot({ path: path.join(shots, `ch${String(n).padStart(2, '0')}-desktop.png`) });
      const st = await page.evaluate(() => window.CZMarchWorld.snapshot());
      if (st.chapterId !== n || st.sceneId !== sceneId) throw Error(`snapshot 章节不符 ${st.sceneId}`);
    }
    ok('12章依次挂载 + snapshot 章节一致', true);

    /* 2) 键盘移动（湘江：向下=向南，y增大） */
    await page.select('#chapter', 'chapter-2/scene-xiangjiang');
    await page.waitForFunction(() => window.CZMarchWorld.mounted);
    await new Promise(r => setTimeout(r, 500));
    const before = await page.evaluate(() => window.CZMarchWorld.snapshot());
    await page.keyboard.down('ArrowDown'); await new Promise(r => setTimeout(r, 600)); await page.keyboard.up('ArrowDown');
    await new Promise(r => setTimeout(r, 200));
    const after = await page.evaluate(() => window.CZMarchWorld.snapshot());
    ok('键盘移动（ArrowDown → y 增大）', after.y > before.y + 2, `${before.y.toFixed(1)} → ${after.y.toFixed(1)}`);

    /* 3) 碰撞：向北山阻挡区持续行走不得穿入（湘江 blockedPoly 北山 y<6 区） */
    await page.keyboard.down('ArrowUp'); await new Promise(r => setTimeout(r, 2600)); await page.keyboard.up('ArrowUp');
    const blocked = await page.evaluate(() => window.CZMarchWorld.snapshot());
    ok('碰撞：北山阻挡区不可穿入', blocked.y > 5.5, `y=${blocked.y.toFixed(1)}（阻挡带 y<5.5）`);
    await page.screenshot({ path: path.join(shots, 'ch02-collision.png') });

    /* 4) 点击移动寻路：点击屏幕中右下点，位置应明显变化 */
    const p0 = await page.evaluate(() => window.CZMarchWorld.snapshot());
    await page.mouse.click(760, 560);
    await new Promise(r => setTimeout(r, 1800));
    const p1 = await page.evaluate(() => window.CZMarchWorld.snapshot());
    ok('点击地面寻路移动', Math.hypot(p1.x - p0.x, p1.y - p0.y) > 3, `位移 ${Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(1)} 单位`);

    /* 5) 暂停/恢复语义（在开阔地重挂载，排除地形干扰） */
    await page.evaluate(() => new Promise((res, rej) => {
      window.CZMarchWorld.destroy();
      const s = window.CZMarchWorldManifest.scenes.find(x => x.sceneId === 'chapter-2/scene-xiangjiang');
      window.CZMarchWorld.mount(document.getElementById('world'), { chapterId: 2, sceneId: s.sceneId, spawn: { x: 100, y: 50, facing: 's' }, anchors: s.anchors }).then(res, rej);
    }));
    await new Promise(r => setTimeout(r, 400));
    await page.evaluate(() => window.CZMarchWorld.pause('dialogue'));
    const q0 = await page.evaluate(() => window.CZMarchWorld.snapshot());
    await page.keyboard.down('ArrowDown'); await new Promise(r => setTimeout(r, 500)); await page.keyboard.up('ArrowDown');
    const q1 = await page.evaluate(() => window.CZMarchWorld.snapshot());
    ok('pause(dialogue) 冻结移动', Math.abs(q1.y - q0.y) < 0.01);
    await page.evaluate(() => { window.CZMarchWorld.pause('minigame'); window.CZMarchWorld.resume('dialogue'); });
    await page.keyboard.down('ArrowDown'); await new Promise(r => setTimeout(r, 400)); await page.keyboard.up('ArrowDown');
    const q2 = await page.evaluate(() => window.CZMarchWorld.snapshot());
    ok('仍有其他暂停原因时不恢复', Math.abs(q2.y - q1.y) < 0.01);
    await page.evaluate(() => window.CZMarchWorld.resume('minigame'));
    await page.keyboard.down('ArrowDown'); await page.keyboard.down('ArrowRight');
    await new Promise(r => setTimeout(r, 400));
    await page.keyboard.up('ArrowDown'); await page.keyboard.up('ArrowRight');
    const q3 = await page.evaluate(() => window.CZMarchWorld.snapshot());
    ok('全部原因解除后恢复移动', Math.hypot(q3.x - q2.x, q3.y - q2.y) > 1, `位移 ${Math.hypot(q3.x - q2.x, q3.y - q2.y).toFixed(1)}`);

    /* 6) 交互事件：湘江集结处何文（52,41）旁出生，按 E */
    await page.evaluate(() => window.CZMarchWorld.destroy());
    await page.evaluate(() => new Promise(res => {
      const once = ev => { window.__lastInteract = ev.detail; res(); };
      window.addEventListener('czmarch:interact', once, { once: true });
      window.CZMarchWorld.mount(document.getElementById('world'), {
        chapterId: 2, sceneId: 'chapter-2/scene-xiangjiang',
        spawn: { x: 52, y: 42.5, facing: 'n' },
        anchors: window.CZMarchWorldManifest.scenes.find(s => s.sceneId === 'chapter-2/scene-xiangjiang').anchors
      });
      setTimeout(() => { const e = new KeyboardEvent('keydown', { code: 'KeyE' }); window.dispatchEvent(e); }, 600);
    }));
    const det = await page.evaluate(() => window.__lastInteract);
    ok('接近 NPC 按 E 派发 czmarch:interact', det && det.anchorId === 'chapter-2/anchor-dialogue-02-01-he_wen', det && det.anchorId);

    /* 7) 暂停时不派发交互 */
    await page.evaluate(() => { delete window.__lastInteract; window.CZMarchWorld.pause('dialogue'); });
    await page.keyboard.press('KeyE'); await new Promise(r => setTimeout(r, 300));
    const det2 = await page.evaluate(() => window.__lastInteract);
    ok('暂停期间按 E 不触发', !det2);
    await page.evaluate(() => window.CZMarchWorld.resume('dialogue'));

    /* 8) applyState：全部禁用 → 提示层无可见标签；恢复后 exit 常驻可见 */
    const labelsOff = await page.evaluate(() => new Promise(res => {
      window.CZMarchWorld.applyState({ enabledAnchorIds: [], completedAnchorIds: [], openPassageIds: [] });
      setTimeout(() => res([...document.querySelectorAll('.czmw-tip')].filter(n => !n.hidden).length), 200);
    }));
    const labelsOn = await page.evaluate(() => new Promise(res => {
      const s = window.CZMarchWorldManifest.scenes.find(x => x.sceneId === 'chapter-2/scene-xiangjiang');
      window.CZMarchWorld.applyState({ enabledAnchorIds: s.anchors.map(a => a.anchorId), completedAnchorIds: [s.anchors[1].anchorId], openPassageIds: [] });
      setTimeout(() => res([...document.querySelectorAll('.czmw-tip')].filter(n => !n.hidden).length), 200);
    }));
    ok('applyState 禁用后隐藏 / 恢复后 exit 常驻', labelsOff === 0 && labelsOn >= 1, `off=${labelsOff} on=${labelsOn}`);

    /* 9) 遮挡验证：角色走到近景树（60,58）正北，截图供人工核对 */
    await page.evaluate(() => window.CZMarchWorld.destroy());
    await page.evaluate(() => window.CZMarchWorld.mount(document.getElementById('world'), {
      chapterId: 2, sceneId: 'chapter-2/scene-xiangjiang', spawn: { x: 60, y: 54.5, facing: 's' },
      anchors: window.CZMarchWorldManifest.scenes.find(s => s.sceneId === 'chapter-2/scene-xiangjiang').anchors
    }));
    await new Promise(r => setTimeout(r, 800));
    await page.screenshot({ path: path.join(shots, 'ch02-occlusion.png') });
    ok('遮挡验证截图（角色在近景树北侧，应被树冠部分遮蔽）', true, 'ch02-occlusion.png');

    /* 10) 幂等销毁 + snapshot 错误处理 */
    await page.evaluate(() => { window.CZMarchWorld.destroy(); window.CZMarchWorld.destroy(); });
    const threw = await page.evaluate(() => { try { window.CZMarchWorld.snapshot(); return false; } catch { return true; } });
    ok('destroy 幂等 ×2 + 销毁后 snapshot 抛错', threw);

    /* 11) 竖屏（手机）取景 */
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    for (const [n, id] of [[2, 'chapter-2/scene-xiangjiang'], [8, 'chapter-8/scene-snowmount'], [12, 'chapter-12/scene-huining']]) {
      await page.evaluate(sceneId => new Promise((res, rej) => {
        const s = window.CZMarchWorldManifest.scenes.find(x => x.sceneId === sceneId);
        window.CZMarchWorld.mount(document.getElementById('world'), { chapterId: s.chapterId, sceneId: s.sceneId, spawn: null, anchors: s.anchors }).then(res, rej);
      }), id);
      await new Promise(r => setTimeout(r, 700));
      await page.screenshot({ path: path.join(shots, `ch${String(n).padStart(2, '0')}-portrait.png`) });
    }
    ok('竖屏 390×844 取景（3 场景截图）', true);
  } catch (e) {
    ok('流程中断：' + e.message, false);
  } finally {
    if (errors.length) console.log('页面错误：', errors);
    ok('全程无 pageerror', errors.length === 0, errors.join(' | '));
    fs.writeFileSync(path.join(shots, 'verify-browser.json'), JSON.stringify({ when: new Date().toISOString(), results, errors }, null, 2));
    await context.close(); browser.disconnect(); server.close();
    const failed = results.filter(r => !r.pass);
    console.log(failed.length ? `\n${failed.length} 项未过` : '\n全部通过');
    process.exit(failed.length ? 1 : 0);
  }
})();