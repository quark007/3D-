import * as T from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createRenderer } from './renderer-adapter.js';
import { createDemoBudget } from './demo-budget.js';
import { createGPUEffects } from './gpu-effects.js';
import { terrainMesh, waterwaysMesh } from './terrain.js';
import { makeBridge } from './bridge.js';

const chapter = Number(document.body.dataset.chapter), snow = chapter === 8;
const query = new URLSearchParams(location.search);
const $ = id => document.getElementById(id), host = $('host');
const budget = createDemoBudget(query.get('mode') === 'economy' ? 'economy' : 'quality');
globalThis.RenderBudget = budget;
const log = message => { $('log').textContent += `${new Date().toLocaleTimeString()} ${message}\n`; };
let handle, effects, controls, bridge, waterways, disposed = false, continuous = false, benchmarkUntil = 0, now = 0;
let frameCount = 0, frameTimes = [], statsStart = performance.now(), lastDraws = 0;
const scene = new T.Scene(), camera = new T.PerspectiveCamera(42, 1, .02, 5000);
scene.background = new T.Color(snow ? 0xb6ccd4 : 0xc9c9ba);
scene.fog = new T.FogExp2(snow ? 0xb6ccd4 : 0xc9c9ba, .00065);
const hemi = new T.HemisphereLight(0xc6dce9, 0x3f4d58, .65); scene.add(hemi);
const sun = new T.DirectionalLight(0xffecd7, 2.2); sun.position.set(-440, 160, -180); scene.add(sun);

$('title').textContent = snow ? '夹金山 · 越过雪线' : '泸定桥 · 山河之间';
document.title = `${$('title').textContent} | 长征·星火`;
$('eyebrow').textContent = snow ? 'CHAPTER 08 / 雪山' : 'CHAPTER 07 / 大渡河谷';
$('description').textContent = snow ? '以真实高程读懂山势。冷白山脊之间，让光与薄雾描出翻越的尺度。' : '以真实区域地形呈现河谷形势，沿现代水系寻找一座桥的地理背景。';
$('bridge-view').hidden = snow;
$('chapter-link').href = snow ? 'luding-bridge.html' : 'snow-mountain.html';
$('chapter-link').textContent = snow ? '泸定桥 →' : '← 夹金山';
$('mode').value = budget.mode;

function updateBackend({ backend, reason }) {
  $('backend').textContent = backend === 'webgpu' ? '● WebGPU' : '● WebGL fallback';
  $('backend').dataset.backend = backend;
  $('status').textContent = reason || 'WebGPU 已初始化 · 正在准备真实地形';
  log(`backend=${backend}${reason ? ' / ' + reason : ''}`);
  if (handle) { setupEffects(); attachControls(); resize(); invalidate(); }
}

let terrain;
function setupEffects() {
  handle.setEffects(null, null);
  effects = null;
  if (handle.backend === 'webgpu' && budget.mode === 'quality' && $('effects').checked) {
    try {
      const fx = createGPUEffects(handle.renderer.raw, scene, camera, terrain);
      effects = fx;
      handle.setEffects(() => fx.render(now), () => { fx.dispose(); if (effects === fx) effects = null; });
      $('effects-status').textContent = '体积雾 12步 / ¼分辨率 + Bloom';
    } catch (e) {
      handle.setEffects(null, null); $('effects-status').textContent = '高级光效创建失败，基础渲染可用'; log(e.message);
    }
  } else {
    handle.setEffects(null, null);
    $('effects-status').textContent = handle.backend === 'webgpu' ? '基础光照（节能或光效关闭）' : 'WebGL 基础光照 · 高级光效已省略';
  }
}
function attachControls() {
  const target = controls?.target.clone(); controls?.dispose();
  controls = new OrbitControls(camera, handle.renderer.domElement);
  controls.enableDamping = false; controls.minDistance = .5; controls.maxDistance = 1700;
  controls.maxPolarAngle = Math.PI * .49;
  if (target) controls.target.copy(target);
  controls.addEventListener('change', invalidate);
}
function resize() {
  if (disposed || !handle) return;
  camera.aspect = host.clientWidth / Math.max(1, host.clientHeight); camera.updateProjectionMatrix();
  handle.renderer.setSize(host.clientWidth, host.clientHeight); invalidate();
}
function overview() {
  if (disposed) return;
  document.body.classList.remove('detail-view'); hemi.intensity = .65; sun.intensity = 2.2;
  if (waterways) waterways.visible = true;
  camera.near = .2; camera.updateProjectionMatrix();
  controls.target.set(0, terrain.maxHeight * .38, 0);
  camera.position.set(terrain.width * .43, terrain.width * .40, terrain.depth * .58);
  controls.update(); $('view-label').textContent = '真实区域视图 · 高程与水平统一米制比例'; invalidate();
}
function closeBridge() {
  if (!bridge || disposed) return;
  document.body.classList.add('detail-view'); hemi.intensity = 1.5; sun.intensity = 3;
  if (waterways) waterways.visible = false;
  const p = bridge.position;
  camera.near = .01; camera.updateProjectionMatrix();
  controls.target.copy(p).add(new T.Vector3(0, -.04, 0));
  const fit = Math.max(1, 1 / camera.aspect);
  camera.position.copy(p).add(new T.Vector3(1.3, .8, 1.6).multiplyScalar(fit)); controls.update();
  $('view-label').textContent = '桥梁结构示意 · 区域DEM无法解析桥台细部，位置/尺寸未经测绘'; invalidate();
}
function invalidate() { if (handle && !disposed) handle.schedule(tick); }
function tick(timestamp) {
  if (disposed) return;
  now = timestamp;
  const start = performance.now();
  handle.renderer.info.autoReset = false;
  handle.renderer.info.reset();
  handle.renderer.render(scene, camera);
  const drawCalls = handle.renderer.info.render.drawCalls ?? handle.renderer.info.render.calls;
  const duration = performance.now() - start;
  frameTimes.push(duration); if (frameTimes.length > 300) frameTimes.shift(); frameCount++;
  const elapsed = performance.now() - statsStart;
  if (!continuous && !benchmarkUntil) {
    $('metrics').textContent = `按需绘制 · 最近CPU提交 ${duration.toFixed(1)} ms`;
    $('draw-calls').textContent = `${drawCalls} draw calls · ${handle.renderer.info.render.triangles.toLocaleString()} triangles`;
  } else if (elapsed > 900) {
    const sorted = [...frameTimes].sort((a, b) => a - b), p95 = sorted[Math.floor((sorted.length - 1) * .95)] || 0;
    const fps = (frameCount - lastDraws) * 1000 / elapsed;
    $('metrics').textContent = `${fps.toFixed(1)} fps · CPU提交 p95 ${p95.toFixed(1)} ms`;
    $('draw-calls').textContent = `${drawCalls} draw calls · ${handle.renderer.info.render.triangles.toLocaleString()} triangles`;
    lastDraws = frameCount; statsStart = performance.now();
  }
  if (continuous || timestamp < benchmarkUntil) invalidate();
  else if (benchmarkUntil) {
    benchmarkUntil = 0; $('benchmark').disabled = false; log('10s budgeted sample complete; idle: on-demand drawing');
    $('status').textContent = '采样结束 · 静止按需绘制（CPU提交耗时不等于GPU耗时）';
  }
}
function dispose() {
  if (disposed || !handle) return;
  disposed = true; controls.dispose(); observer.disconnect();
  const canvas = handle.renderer.domElement;
  // Existing game teardown sequence is supported verbatim on either backend.
  handle.renderer.dispose(); handle.renderer.forceContextLoss(); canvas.remove();
  const geometries = new Set(), materials = new Set();
  scene.traverse(o => { if (o.geometry) geometries.add(o.geometry); for (const m of [o.material].flat().filter(Boolean)) materials.add(m); });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); scene.clear();
  window.removeEventListener('pagehide', dispose);
  $('status').textContent = `已释放：${JSON.stringify(budget.diagnostics)}`;
  $('status').classList.add('error'); log('renderer.dispose + forceContextLoss + canvas.remove PASS');
}
const observer = new ResizeObserver(resize);

try {
  const response = await fetch(`data/terrain-${chapter}.json`);
  if (!response.ok) throw new Error(`Terrain fetch ${response.status}`);
  const data = await response.json();
  if (data.grid !== 256 || data.elevations.length !== data.grid ** 2 || data.min !== data.elevations.reduce((a,b)=>Math.min(a,b),Infinity) || data.max !== data.elevations.reduce((a,b)=>Math.max(a,b),-Infinity)) throw new Error('Terrain contract invalid');
  terrain = terrainMesh(data, snow ? 'snow' : 'river', budget.mode === 'economy' ? 129 : 256); scene.add(terrain.mesh);
  $('elevation').textContent = `${Math.round(data.min)}–${Math.round(data.max)} m`;
  $('grid').textContent = `${Math.round(terrain.width * 60 / 255)} × 218 m`;
  $('range').textContent = `${(terrain.width * 60 / 1000).toFixed(1)} × ${(terrain.depth * 60 / 1000).toFixed(1)} km`;
  if (!snow) {
    const r = await fetch('data/waterways-7.geojson');
    if (r.ok) { waterways = waterwaysMesh(await r.json(), terrain); scene.add(waterways); }
    else log('Waterways unavailable; regional terrain remains available');
    bridge = makeBridge(budget.mode === 'economy');
    bridge.position.copy(terrain.toWorld(data.landmarks[0].lon, data.landmarks[0].lat));
    bridge.position.y += 18 / 60; scene.add(bridge);
  }
  const environment = query.get('test') === 'no-gpu' ? { isSecureContext, navigator: {}, devicePixelRatio, CustomEvent } : globalThis;
  handle = await createRenderer({ host, scene, RenderBudget: budget,
    backend: query.get('backend') === 'webgl' ? 'webgl' : 'auto', onBackendChange: updateBackend,
    environment, simulateInitFailure: query.get('test') === 'init-failure' });
  attachControls(); overview(); setupEffects(); observer.observe(host); resize();
  const device = handle.renderer.raw.backend?.device;
  const info = device?.adapterInfo;
  $('adapter-info').textContent = info ? `${info.vendor || ''} ${info.architecture || ''} ${info.description || ''}`.trim() || '适配器信息未公开' : '适配器信息未公开 / WebGL';
  log(`three r${T.REVISION}; secureContext=${isSecureContext}; navigator.gpu=${Boolean(navigator.gpu)}; DPR≤1`);
  $('status').textContent = '拖动旋转 · 滚轮缩放 · 静止按需绘制 · 动态采样上限30fps';
  $('continuous').onchange = () => { continuous = $('continuous').checked; invalidate(); };
  $('effects').onchange = () => { setupEffects(); invalidate(); };
  $('overview').onclick = overview; $('bridge-view').onclick = closeBridge;
  $('benchmark').onclick = () => { benchmarkUntil = performance.now() + 10000; frameTimes = []; frameCount = lastDraws = 0; statsStart = performance.now(); $('benchmark').disabled = true; invalidate(); };
  $('fallback').onclick = async () => { await handle.fallback('User tested runtime WebGL fallback'); };
  $('dispose').onclick = dispose;
  $('mode').onchange = () => { query.set('mode', $('mode').value); location.search = query.toString(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) invalidate(); });
  window.addEventListener('pagehide', dispose);
  // Public, serializable diagnostics used by the visible validation panel.
  window.LongMarchDemo = { snapshot: () => ({ chapter, backend: handle.backend, reason: handle.fallbackReason,
    frames: frameCount, budget: budget.diagnostics, disposed, effects: Boolean(effects), source: 'SRTM GL1',
    outputGrid: data.grid, meshVertices: terrain.mesh.geometry.attributes.position.count,
    visibility: document.visibilityState, focused: document.hasFocus(),
    viewport: { width: host.clientWidth, height: host.clientHeight }, min: data.min, max: data.max }), dispose };
  $('snapshot').onclick = () => { $('snapshot-output').textContent = JSON.stringify(window.LongMarchDemo.snapshot(), null, 2); };
} catch (error) {
  $('status').classList.add('error'); $('status').textContent = error.message;
  $('backend').textContent = '初始化失败'; log(error.stack || error.message);
}
