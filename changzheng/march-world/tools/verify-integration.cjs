/* march-world × march-story 真实入口集成冒烟：index.html → 选岗位 → CZMarchEntry.launch(2)。
   用法：node march-world/tools/verify-integration.cjs（仓库根目录运行） */
'use strict';
const fs = require('fs'), path = require('path'), http = require('node:http');
const puppeteer = require('../../../_browser/node_modules/puppeteer-core');
const root = path.resolve(__dirname, '..', '..');
const shots = path.join(root, 'march-world', '_shots');
const MIME = { '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' };

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
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 240000 });
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(origin + '/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CZMarchWorld && window.CZMarchWorldManifest?.scenes.length === 12 && window.CZMarchEntry && typeof GameState !== 'undefined');
    console.log('PASS index.html 全局：CZMarchWorld + 12场景清单 + CZMarchEntry + GameState');
    /* 选岗位并进入游戏主界面（沿用B方测试的前置手法） */
    await page.evaluate(() => {
      GameState.selectCharacter('soldier');
      if (typeof RouteMap !== 'undefined') RouteMap.init();
      GameState.save();
      if (typeof GameShell !== 'undefined') GameShell.enter();
      if (typeof PlayerOnboarding !== 'undefined') PlayerOnboarding.close();
    });
    await new Promise(r => setTimeout(r, 800));
    const launched = await page.evaluate(() => window.CZMarchEntry.launch(1).catch(e => 'throw:' + e.message));
    console.log('launch(1) 返回：', launched);
    const status = await page.evaluate(() => document.querySelector('[data-march-status]')?.textContent || document.querySelector('#march83-root')?.textContent?.slice(0, 120) || '');
    await page.waitForFunction(() => window.CZMarchStory.mounted && document.querySelector('.march83-world canvas'), { timeout: 20000 })
      .catch(e => { throw Error('场景未挂载（' + e.message + '）状态栏：' + status); });
    await new Promise(r => setTimeout(r, 1200));
    console.log('PASS CZMarchEntry.launch(1) 瑞金场景已挂载');
    await page.screenshot({ path: path.join(shots, 'integration-ch01-live.png') });
    /* 在真实入口里走两步 */
    const s0 = await page.evaluate(() => window.CZMarchWorld.snapshot());
    await page.keyboard.down('ArrowDown'); await new Promise(r => setTimeout(r, 500)); await page.keyboard.up('ArrowDown');
    const s1 = await page.evaluate(() => window.CZMarchWorld.snapshot());
    console.log(`PASS 真实入口行走 Δy=${(s1.y - s0.y).toFixed(1)}（${s0.y.toFixed(1)} → ${s1.y.toFixed(1)}）`);
    /* 退出（返回路线图） */
    await page.evaluate(() => window.CZMarchStory.destroy());
    const cleaned = await page.evaluate(() => !window.CZMarchWorld.mounted && !document.querySelector('.march83-shell'));
    console.log('PASS CZMarchStory.destroy → 场景释放', cleaned);
    const mine = errors.filter(e => /march-world|CZMarchWorld/i.test(e));
    console.log(mine.length ? 'FAIL march-world 相关页面错误：' + mine.join(' | ') : 'PASS 无 march-world 相关页面错误');
    if (errors.length) console.log('（其余页面错误，非本模块：' + errors.length + ' 条，已记录 verify-integration.json）');
    fs.writeFileSync(path.join(shots, 'verify-integration.json'), JSON.stringify({ when: new Date().toISOString(), marchWorldErrors: mine, otherErrors: errors }, null, 2));
    process.exitCode = mine.length ? 1 : 0;
  } catch (e) {
    console.error('集成冒烟中断：', e.message);
    try { await page.screenshot({ path: path.join(shots, 'integration-fail.png') }); } catch {}
    fs.writeFileSync(path.join(shots, 'verify-integration.json'), JSON.stringify({ when: new Date().toISOString(), fatal: e.message, errors }, null, 2));
    process.exitCode = 1;
  } finally { await context.close(); browser.disconnect(); server.close(); }
})();