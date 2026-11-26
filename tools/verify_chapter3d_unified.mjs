/* 第1–5章共享3D资源基线/对照：桌面1280×800 + 竖屏390×844，无截图。 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const puppeteer = require('E:/新建文件夹/_browser/node_modules/puppeteer-core');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rendererRevision = process.env.CZ_RENDERER_REV || null;
const rendererOverride = rendererRevision ? execFileSync('git', ['show', `${rendererRevision}:changzheng/march-world/engine/renderer3d.js`], { cwd: root, encoding: 'utf8' }) : null;
const phase = process.env.CZ_PHASE || 'baseline';
const outDir = path.join(root, 'evidence', 'chapter3d-unified-20261123');
const outFile = path.join(outDir, `${phase}.json`);
const origin = process.env.CZ_PREVIEW_URL || 'http://127.0.0.1:8082';
const sampleFrames = Number(process.env.CZ_SAMPLE_FRAMES || 45);
const round = n => +Number(n).toFixed(3);
const summarize = values => {
  const sorted = [...values].sort((a, b) => a - b);
  return { count: values.length, median: round(sorted[Math.floor((sorted.length - 1) * .5)] || 0), p95: round(sorted[Math.floor((sorted.length - 1) * .95)] || 0), mean: round(values.reduce((a, b) => a + b, 0) / (values.length || 1)) };
};
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 120000,
  args: ['--no-sandbox', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check'] });
const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
  let ns, viewWrapped = false, actorsWrapped = false;
  Object.defineProperty(window, 'CZMarchWorld', { configurable: true, get: () => ns, set: value => {
    ns = value; const M = value?._; if (!M) return;
    if (M.renderer3d?.create && !viewWrapped) {
      const create = M.renderer3d.create;
      M.renderer3d.create = async (...args) => { const view = await create(...args); window.__chapterView = view; return view; };
      viewWrapped = true;
    }
    if (M.actors3d?.create && !actorsWrapped) {
      const create = M.actors3d.create;
      M.actors3d.create = async (...args) => { const scene = await create(...args); window.__chapterScene = args[2]; return scene; };
      actorsWrapped = true;
    }
  } });
});
const report = { phase, generatedAt: new Date().toISOString(), sampleFrames, visualApproval: false, rendererRevision,
  renderer: 'Chrome WebGL; mobile viewport emulation is not phone hardware acceptance',
  scripts: ['engine/renderer3d.js', 'scenes/visual3d.js', 'engine/actors3d.js'].map(relative => ({
    file: `changzheng/march-world/${relative}`,
    sha256: crypto.createHash('sha256').update(relative === 'engine/renderer3d.js' && rendererOverride ? rendererOverride : fs.readFileSync(path.join(root, 'changzheng', 'march-world', relative))).digest('hex')
  })), chapters: [], errors: [], warnings: [], failedRequests: [] };
page.on('pageerror', error => report.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); else if (message.type() === 'warn') report.warnings.push(message.text()); });
page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({ status: response.status(), url: response.url() }); });
if (rendererOverride) {
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().endsWith('/march-world/engine/renderer3d.js')) request.respond({ status: 200, contentType: 'application/javascript; charset=utf-8', body: rendererOverride });
    else request.continue();
  });
}
try {
  await page.goto(origin + '/march-world/preview.html?3d=1&chapter=chapter-1%2Fscene-ruijin', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForFunction(() => window.CZMarchWorld?.mounted && window.__chapterView && window.__chapterScene, { timeout: 90000 });
  for (const device of [
    { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
    { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
  ]) {
    await page.setViewport(device);
    for (let chapterId = 1; chapterId <= 5; chapterId++) {
      await page.evaluate(async chapterId => {
        const scene = CZMarchWorldManifest.scenes.find(item => item.chapterId === chapterId);
        await CZMarchWorld.mount(document.getElementById('world'), { ...scene, chapterId, roleId: 'soldier', playIntro: false });
      }, chapterId);
      await page.waitForFunction(() => CZMarchWorld.performance?.backend === 'three' && CZMarchWorld.performance.frames >= 5, { timeout: 90000 });
      const chapter = await page.evaluate(async ({ chapterId, device, sampleFrames }) => {
        const T = await import('three');
        const W = CZMarchWorld, M = W._, snapshot = W.snapshot(), logical = M.scenes[snapshot.sceneId], scene = window.__chapterScene;
        const geometrySignature = geometry => {
          const hash = { value: 2166136261 }, data = new DataView(new ArrayBuffer(4));
          const addInt = value => { hash.value = Math.imul(hash.value ^ (value >>> 0), 16777619) >>> 0; };
          const addFloat = value => { data.setFloat32(0, value); addInt(data.getUint32(0)); };
          const index = geometry.index?.array || Uint32Array.from({ length: geometry.attributes.position.count }, (_, i) => i);
          const attributes = Object.keys(geometry.attributes).sort();
          for (const vertex of index) for (const name of attributes) {
            const attribute = geometry.attributes[name];
            for (let component = 0; component < attribute.itemSize; component++) addFloat(attribute.array[vertex * attribute.itemSize + component]);
          }
          const used = new Uint8Array(geometry.attributes.position.count);
          for (const vertex of index) used[vertex] = 1;
          return { hash: hash.value.toString(16).padStart(8, '0'), vertices: geometry.attributes.position.count,
            indices: index.length, triangles: index.length / 3, unusedVertices: used.reduce((sum, value) => sum + (value ? 0 : 1), 0),
            attributes };
        };
        const roads = [], waters = [], waterMaterials = new Map(), waterFlows = new Map();
        scene.traverse(object => {
          if (!object.isMesh || !object.geometry) return;
          if (object.name === 'march-river-water') {
            const material = object.material, flow = material.userData.flow;
            if (!waterMaterials.has(material.uuid)) waterMaterials.set(material.uuid, waterMaterials.size + 1);
            if (flow && !waterFlows.has(flow)) waterFlows.set(flow, waterFlows.size + 1);
            waters.push({ geometry: geometrySignature(object.geometry), materialId: waterMaterials.get(material.uuid), flowId: flow ? waterFlows.get(flow) : null,
              parameters: { color: material.color.getHexString(), roughness: material.roughness, metalness: material.metalness,
                clearcoat: material.clearcoat, clearcoatRoughness: material.clearcoatRoughness, transparent: material.transparent,
                opacity: material.opacity, side: material.side } });
          } else if (object.material?.transparent && object.material.side === T.DoubleSide && object.geometry.attributes.uv1) {
            roads.push({ ...geometrySignature(object.geometry), material: { color: object.material.color.getHexString(), roughness: object.material.roughness,
              metalness: object.material.metalness, opacity: object.material.opacity, transparent: object.material.transparent, side: object.material.side } });
          }
        });
        const ground = scene.getObjectByName('march-pbr-ground');
        const frames = [];
        for (let i = 0; i < sampleFrames; i++) {
          await new Promise(requestAnimationFrame);
          frames.push(CZMarchWorld.performance.renderMs);
        }
        return { chapterId, device: device.name, sceneId: snapshot.sceneId, terrain: {
          vertices: ground?.geometry.attributes.position.count || 0, geometry: ground ? geometrySignature(ground.geometry) : null,
          heightsHash: (() => { let hash = 2166136261; for (const value of M.visual3d.terrain(logical).heights) { hash ^= Math.round(value * 1000000); hash = Math.imul(hash, 16777619) >>> 0; } return hash.toString(16).padStart(8, '0'); })()
        }, environment: M.visual3d.environment(logical), staging: M.visual3d.staging(logical), roads, waters,
          waterMaterialCount: waterMaterials.size, waterFlowCount: waterFlows.size,
          stats: { ...CZMarchWorld.performance }, renderSamples: frames,
          noOverflow: document.documentElement.scrollWidth <= innerWidth };
      }, { chapterId, device, sampleFrames });
      chapter.renderMs = summarize(chapter.renderSamples);
      delete chapter.renderSamples;
      report.chapters.push(chapter);
      console.log(JSON.stringify({ phase, device: device.name, chapterId, terrain: chapter.terrain.vertices,
        roads: chapter.roads.map(road => ({ vertices: road.vertices, unused: road.unusedVertices, triangles: road.triangles })),
        waters: chapter.waters.length, waterMaterialCount: chapter.waterMaterialCount, renderMs: chapter.renderMs }));
    }
  }
  report.passed = !report.errors.length && !report.failedRequests.length && report.chapters.length === 10
    && report.chapters.every(chapter => chapter.noOverflow && chapter.terrain.vertices > 0 && chapter.roads.length > 0 && chapter.waterMaterialCount > 0);
  if (process.env.CZ_COMPARE === '1') {
    const baselineFile = path.join(outDir, 'baseline.json');
    if (!fs.existsSync(baselineFile)) throw new Error('缺少 baseline.json，不能判定几何等价');
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    report.comparisons = report.chapters.map(chapter => {
      const before = baseline.chapters.find(item => item.chapterId === chapter.chapterId && item.device === chapter.device);
      if (!before) throw new Error(`缺少基线：${chapter.device} chapter ${chapter.chapterId}`);
      const geometryEqual = before.terrain.heightsHash === chapter.terrain.heightsHash
        && before.terrain.geometry.hash === chapter.terrain.geometry.hash
        && JSON.stringify(before.roads.map(item => [item.hash, item.triangles, item.material])) === JSON.stringify(chapter.roads.map(item => [item.hash, item.triangles, item.material]))
        && JSON.stringify(before.waters.map(item => [item.geometry.hash, item.parameters])) === JSON.stringify(chapter.waters.map(item => [item.geometry.hash, item.parameters]));
      const roadVerticesBefore = before.roads.reduce((sum, road) => sum + road.vertices, 0), roadVerticesAfter = chapter.roads.reduce((sum, road) => sum + road.vertices, 0);
      return { chapterId: chapter.chapterId, device: chapter.device, geometryEqual, roadVerticesBefore, roadVerticesAfter,
        roadVerticesSaved: roadVerticesBefore - roadVerticesAfter, unusedAfter: chapter.roads.reduce((sum, road) => sum + road.unusedVertices, 0),
        waterMeshesBefore: before.waters.length, waterMeshesAfter: chapter.waters.length,
        waterMaterialsBefore: before.waterMaterialCount, waterMaterialsAfter: chapter.waterMaterialCount,
        waterFlowsBefore: before.waterFlowCount, waterFlowsAfter: chapter.waterFlowCount,
        renderMsBefore: before.renderMs, renderMsAfter: chapter.renderMs };
    });
    report.passed &&= report.comparisons.every(item => item.geometryEqual && item.unusedAfter === 0
      && item.roadVerticesAfter < item.roadVerticesBefore && item.waterMeshesAfter === item.waterMeshesBefore
      && item.waterMaterialsAfter === 1 && item.waterFlowsAfter === 1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log('SUMMARY ' + JSON.stringify({ phase, passed: report.passed, outFile, comparisons: report.comparisons || null, errors: report.errors, failedRequests: report.failedRequests }));
  if (!report.passed) process.exitCode = 1;
} finally { await browser.close(); }