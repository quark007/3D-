/*
 * 相机取景探针：验证第 3 章桌旁"贴脸"是否修好。
 *
 * 用法（需要 puppeteer-core 与本机 Edge）：
 *   PUPPETEER_CORE="E:/新建文件夹/_browser/node_modules/puppeteer-core" node tools/probe-camera.cjs
 *   可选：EDGE_PATH="C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
 *         OUT="E:/tmp/shot.png"  CHAPTER=3  ANCHOR=dialogue-03-03-he_wen
 *
 * 输出：控制台打印 backend / cameraDistance / cameraOccluded / 玩家与锚点坐标，
 *       并落一张截图，用来肉眼判断"人物是否占满屏 / 是否穿模"。
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

function loadPuppeteer() {
  const candidates = [
    process.env.PUPPETEER_CORE,
    'puppeteer-core',
    path.join(process.cwd(), 'node_modules', 'puppeteer-core'),
    'E:/新建文件夹/_browser/node_modules/puppeteer-core'
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { return require(candidate); } catch { /* 继续找下一个 */ }
  }
  throw Error('找不到 puppeteer-core，请先 npm i puppeteer-core 或设置 PUPPETEER_CORE 指向其目录');
}

const root = path.join(__dirname, '..', 'changzheng');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
  let rel = 'index.html';
  try { rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html'; } catch {}
  const file = path.resolve(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  try {
    const data = fs.readFileSync(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});

function findEdge() {
  if (process.env.EDGE_PATH) return process.env.EDGE_PATH;
  return [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe'
  ].find(candidate => fs.existsSync(candidate));
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const puppeteer = loadPuppeteer();
  const chapter = Number(process.env.CHAPTER || 3);
  const anchorId = process.env.ANCHOR || 'dialogue-03-03-he_wen';
  const spawnOffset = [
    Number(process.env.SPAWN_DX ?? -1),
    Number(process.env.SPAWN_DY ?? -4)
  ];
  const shots = {
    aerial: { x: 82, y: 55, offset: [27, 48, 35] },
    street: { x: 72, y: 56, offset: [-22, .58, .8] },
    courtyard: { x: 85, y: 43, offset: [6.3, 4.7, 6.3] },
    perimeter: { x: 56, y: 24, offset: [12, 8.5, 13] }
  };
  const shot = process.env.SHOT ? shots[process.env.SHOT] : null;
  if (process.env.SHOT && (!shot || chapter !== 3)) throw Error('未知的遵义截图视角');
  const out = process.env.OUT || path.join(__dirname, '..', 'evidence', 'probe-ch' + chapter + '.png');

  const browser = await puppeteer.launch({
    executablePath: findEdge(),
    headless: 'new',
    args: ['--use-angle=d3d11', '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--window-size=1280,800']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: Number(process.env.VIEWPORT_WIDTH || 1280), height: Number(process.env.VIEWPORT_HEIGHT || 800), isMobile: process.env.MOBILE === "1", hasTouch: process.env.MOBILE === "1" });
  const errors = [];
  const httpErrors = [];
  page.on('response', response => { if (response.status() >= 400) httpErrors.push(response.url()); });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push('[console] ' + message.text()); });

  try {
    await page.goto(origin + '/march-world/preview.html?3d=' + (process.env.CANVAS === '1' ? '0' : '1') + '&chapter=chapter-' + chapter + (chapter === 3 ? '/scene-zunyi' : ''), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CZMarchWorld && window.CZMarchWorldManifest, { timeout: 60000 });

    const info = await page.evaluate(async ({ chapter, anchorId, spawnOffset, shot }) => {
      const W = window.CZMarchWorld;
      const scene = W.manifest.scenes.find(item => Number(item.chapterId) === chapter);
      /* 清单里的 anchorId 带前缀：chapter-3/anchor-dialogue-03-03-he_wen */
      const anchor = scene.anchors.find(item => item.anchorId === anchorId || item.anchorId.endsWith(anchorId));
      /* 实测：站在锚点北侧 4m（桌面与正房之间）必现遮挡收缩；南侧不触发。 */
      const spawn = shot ? { x: shot.x, y: shot.y, facing: 'n' } : anchor ? { x: anchor.x + spawnOffset[0], y: anchor.y + spawnOffset[1], facing: 'n' } : null;
      const staging = W._.visual3d.staging;
      if (shot) W._.visual3d.staging = scene => ({ ...staging(scene), offset: shot.offset });
      try {
        await W.mount(document.getElementById('world'), {
          chapterId: chapter, sceneId: scene.sceneId, spawn, anchors: scene.anchors
        });
      } finally {
        if (shot) W._.visual3d.staging = staging;
      }
      /* 跳过开场镜头，否则 follow() 在前 6.4s 内不执行，拿不到 cameraDistance */
      await new Promise(resolve => setTimeout(resolve, 800));
      document.querySelector('.czmw-cinema-skip3d')?.click();
      await new Promise(resolve => setTimeout(resolve, 900));
      if (anchor && !shot) W.setGuide({ anchorId: anchor.anchorId, label: anchor.label });
      await new Promise(resolve => setTimeout(resolve, 1800));
      return {
        sceneId: scene.sceneId,
        anchor: anchor ? { anchorId: anchor.anchorId, x: anchor.x, y: anchor.y, label: anchor.label } : null,
        snapshot: W.snapshot(),
        performance: W.performance
      };
    }, { chapter, anchorId, spawnOffset, shot });

    fs.mkdirSync(path.dirname(out), { recursive: true });
    await page.screenshot({ path: out });
    console.log(JSON.stringify({ ...info, screenshot: out, errors, httpErrors }, null, 2));

    if (info.performance?.backend !== 'three') {
      console.log('\n[警告] 当前走的是 Canvas 回退而不是 three.js：' + info.performance?.backend +
        '\n       headless 下 WebGL 可能不可用，改用本机调试 Edge（--remote-debugging-port=9222）再跑。');
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => {
  console.error('探针失败：' + error.message);
  server.close();
  process.exitCode = 1;
});
