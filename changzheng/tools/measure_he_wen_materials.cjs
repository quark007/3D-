const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const puppeteer = require(process.env.PUPPETEER_PATH || '../../_browser/node_modules/puppeteer-core');

(async () => {
  const root = path.resolve(__dirname, '..');
  const args = process.argv.slice(2);
  const backend = args.find(arg => arg.startsWith('--backend='))?.split('=')[1] || 'webgl';
  const shot = args.find(arg => arg.startsWith('--shot='))?.slice(7);
  const label = args.find(arg => !arg.startsWith('--')) || `materials-${backend}`;
  const outputDir = path.join(root, '..', 'evidence', 'he-wen-material-2026-11-24');
  fs.mkdirSync(outputDir, { recursive: true });
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-hewen-material-'));
  const browser = await puppeteer.launch({
    userDataDir,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    protocolTimeout: 180000,
    args: backend === 'webgpu' ? ['--enable-unsafe-webgpu', '--enable-features=Vulkan,UseSkiaRenderer'] : []
  });
  const page = await browser.newPage();
  const report = { label, backend, viewport: [1280, 800], frameSamples: 120, errors: [], warnings: [], failedRequests: [] };
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') report.errors.push(message.text());
    if (message.type() === 'warn') report.warnings.push(message.text());
  });
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() }); });
  try {
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:8080';
    await page.goto(`${origin}/march-world/character-preview.html?renderer=${backend}`, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.characterPreview?.stats, { timeout: 60000 });
    await page.evaluate(() => new Promise(resolve => {
      let count = 0;
      const warm = () => ++count >= 12 ? resolve() : requestAnimationFrame(warm);
      requestAnimationFrame(warm);
    }));
    Object.assign(report, await page.evaluate(() => {
      const { renderer, model, stats } = characterPreview;
      const materials = new Map();
      model.traverse(node => {
        if (!node.isMesh) return;
        for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
          if (!materials.has(mat.uuid)) materials.set(mat.uuid, {
            name: mat.name, mesh: node.name, type: mat.type, side: mat.side,
            transparent: mat.transparent, alphaTest: mat.alphaTest, depthWrite: mat.depthWrite,
            alphaToCoverage: mat.alphaToCoverage, roughness: mat.roughness, metalness: mat.metalness,
            clearcoat: mat.clearcoat, sheen: mat.sheen,
            nodes: Object.fromEntries(['colorNode', 'normalNode', 'roughnessNode', 'emissiveNode'].map(key => [key, !!mat[key]])),
            maps: Object.fromEntries(['map', 'normalMap', 'roughnessMap', 'aoMap'].filter(key => mat[key]).map(key => [key, {
              width: mat[key].image?.width || 0, height: mat[key].image?.height || 0,
              repeat: mat[key].repeat.toArray(), anisotropy: mat[key].anisotropy
            }]))
          });
        }
      });
      return {
        actualBackend: characterPreview.backend,
        modelTriangles: stats.triangles,
        meshCount: stats.meshes,
        materialCount: materials.size,
        materials: [...materials.values()],
        maxAnisotropy: renderer.capabilities?.getMaxAnisotropy?.() || null
      };
    }));
    if (backend === 'webgl') {
      report.gpu = await page.evaluate(() => {
        const gl = characterPreview.renderer.getContext();
        const debug = gl.getExtension('WEBGL_debug_renderer_info');
        return gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
      });
      Object.assign(report, await page.evaluate(() => new Promise(resolve => {
        const renderer = characterPreview.renderer;
        renderer.info.autoReset = false;
        renderer.info.reset();
        const deltas = [];
        let calls = 0, triangles = 0, previous = null;
        const sample = timestamp => {
          if (previous !== null) {
            deltas.push(timestamp - previous);
            calls += renderer.info.render.calls;
            triangles += renderer.info.render.triangles;
          }
          previous = timestamp;
          renderer.info.reset();
          if (deltas.length < 120) requestAnimationFrame(sample);
          else {
            const averageMs = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
            resolve({
              averageFrameMs: averageMs,
              fps: 1000 / averageMs,
              calls: calls / deltas.length,
              renderTriangles: triangles / deltas.length,
              textures: renderer.info.memory.textures,
              geometries: renderer.info.memory.geometries
            });
          }
        };
        requestAnimationFrame(sample);
      })));
    }
    if (shot) {
      await page.evaluate(async () => {
        const T = await import('three');
        const { camera, model, renderer } = characterPreview;
        characterPreview.setView('front');
        const skin = model.getObjectByName('HeWen_Skin');
        model.updateMatrixWorld(true);
        skin.skeleton?.update();
        const point = new T.Vector3();
        window.__measureHeWenCloseup = () => {
          camera.updateMatrixWorld();
          let min = Infinity, max = -Infinity;
          for (let index = 0; index < skin.geometry.attributes.position.count; index++) {
            skin.getVertexPosition(index, point);
            skin.localToWorld(point);
            if (point.y < 1.44) continue;
            point.project(camera);
            min = Math.min(min, point.y);
            max = Math.max(max, point.y);
          }
          const rect = renderer.domElement.getBoundingClientRect();
          const canvasFraction = (max - min) / 2;
          return { canvasFraction, viewportFraction: canvasFraction * rect.height / innerHeight, cameraDistance: camera.position.z };
        };
        const initial = window.__measureHeWenCloseup();
        const rect = renderer.domElement.getBoundingClientRect();
        const targetCanvasFraction = 0.60 * innerHeight / rect.height;
        const distance = initial.cameraDistance * initial.canvasFraction / targetCanvasFraction;
        camera.position.set(0, 1.612, Math.max(0.3, distance));
      });
      await page.evaluate(() => new Promise(resolve => {
        let count = 0;
        const settle = () => ++count >= 12 ? resolve() : requestAnimationFrame(settle);
        requestAnimationFrame(settle);
      }));
      report.closeup = await page.evaluate(() => window.__measureHeWenCloseup());
      const shotPath = path.resolve(outputDir, shot);
      await page.screenshot({ path: shotPath, type: 'jpeg', quality: 80 });
      const bytes = fs.statSync(shotPath).size;
      if (bytes > 300 * 1024) throw new Error(`JPEG exceeds 300 KB: ${bytes}`);
      report.screenshot = { path: path.relative(root, shotPath), bytes, viewport: [1280, 800], quality: 80 };
    }
    report.passed = report.errors.length === 0 && report.failedRequests.length === 0 && report.actualBackend === backend;
  } catch (error) {
    report.passed = false;
    report.failure = error.stack;
    process.exitCode = 1;
  } finally {
    const output = path.join(outputDir, `${label}.json`);
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    const { materials, ...summary } = report;
    console.log(JSON.stringify(summary, null, 2));
    await browser.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
})();