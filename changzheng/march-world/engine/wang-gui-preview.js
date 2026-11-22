import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

let canvas = document.getElementById('portrait');
const status = document.getElementById('status');
const metrics = document.getElementById('metrics');
const stage = canvas.parentElement;
const params = new URLSearchParams(location.search);
const shared = params.get('model') === 'shared';
const modelUrl = shared ? '/assets/models-v03/char_soldier.glb' : '/assets/characters/wang-gui/wang-gui-v1.glb';
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
const scene = new T.Scene();
scene.background = new T.Color('#242b28');
const camera = new T.PerspectiveCamera(35, 1, 0.02, 40);
let renderer = null;
let backend = 'webgl';
let environment = null;
let model = null;
let mixer = null;
let activeAction = null;
let disposed = false;
const actions = new Map();
const materials = new Map();
const clay = new T.MeshStandardMaterial({ color: '#a6a69f', roughness: 0.85 });
const perf = { fps: 0, calls: 0, triangles: 0, textures: 0 };
let perfFrames = 0;
let perfLast = performance.now();

function setupRenderer(target) {
  target.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 1.25));
  target.outputColorSpace = T.SRGBColorSpace;
  target.toneMapping = T.ACESFilmicToneMapping;
  target.toneMappingExposure = 1.0;
  target.shadowMap.enabled = true;
  target.shadowMap.type = T.PCFShadowMap;
  target.info.autoReset = false;
}

async function setupEnvironment(PMREMClass) {
  const generator = new PMREMClass(renderer);
  let hdr = null;
  let room = null;
  try {
    hdr = await new HDRLoader().loadAsync('/assets/characters/he-wen/studio_small_09_1k.hdr');
    hdr.mapping = T.EquirectangularReflectionMapping;
    environment = generator.fromEquirectangular(hdr);
  } catch {
    room = new RoomEnvironment();
    environment = generator.fromScene(room, 0.04);
  } finally {
    hdr?.dispose();
    room?.dispose();
    generator.dispose();
  }
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.9;
}

async function initWebGPU() {
  if (!navigator.gpu) throw Error('navigator.gpu unavailable');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw Error('No WebGPU adapter');
  const W = await import('three/webgpu');
  renderer = new W.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  setupRenderer(renderer);
  await setupEnvironment(W.PMREMGenerator);
  backend = 'webgpu';
}

async function initWebGL() {
  renderer = new T.WebGLRenderer({ canvas, antialias: true });
  setupRenderer(renderer);
  await setupEnvironment(T.PMREMGenerator);
  backend = 'webgl';
}

if (params.get('renderer') === 'webgpu' || (params.get('renderer') !== 'webgl' && navigator.gpu)) {
  try {
    await initWebGPU();
  } catch (error) {
    console.warn('WebGPU 初始化失败，回退 WebGL2：', error.message);
    try { renderer?.dispose(); } catch {}
    renderer = null;
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    canvas = fresh;
  }
}
if (!renderer) await initWebGL();
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 0.3;
controls.maxDistance = 8;
controls.maxPolarAngle = Math.PI * 0.82;
scene.add(new T.HemisphereLight('#dce7ed', '#484338', 0.25));
for (const [color, intensity, position, shadow] of [
  ['#fff4e5', 1.8, [-1.8, 2.4, 1.8], true],
  ['#ffd8ae', 0.55, [1.7, 1.6, 1.5], false],
  ['#d6e6ff', 1.9, [1.1, 2.4, -1.2], false]
]) {
  const light = new T.DirectionalLight(color, intensity);
  light.position.set(...position);
  light.target.position.set(0, 1, 0);
  scene.add(light.target);
  if (shadow) {
    light.castShadow = true;
    light.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    light.shadow.bias = -0.00002;
    light.shadow.normalBias = 0.004;
    light.shadow.radius = 3;
    Object.assign(light.shadow.camera, { left: -1, right: 1, top: 1.2, bottom: -1.1, near: 0.1, far: 7 });
  }
  scene.add(light);
}
const floor = new T.Mesh(new T.CircleGeometry(3, 64), new T.MeshStandardMaterial({ color: '#323b33', roughness: 0.92 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function setView(view) {
  const target = new T.Vector3(0, view === 'body' ? 0.88 : 1.53, 0);
  const angle = ({ front: 0, quarter: Math.PI / 5, profile: Math.PI / 2, body: Math.PI / 10 })[view];
  const distance = view === 'body' ? 2.9 : camera.aspect < 0.7 ? 1.5 : 0.95;
  controls.target.copy(target);
  camera.position.set(Math.sin(angle) * distance, target.y + 0.03, Math.cos(angle) * distance);
  controls.update();
  for (const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === view));
}

function expression(name, value) {
  if (!model) return;
  model.traverse(node => {
    const index = node.morphTargetDictionary?.[name];
    if (index !== undefined) node.morphTargetInfluences[index] = value;
  });
}

function selectAnimation(name) {
  if (!mixer) return;
  const next = actions.get(name) || actions.get('Idle') || actions.values().next().value;
  if (!next || next === activeAction) return;
  activeAction?.fadeOut(0.16);
  next.reset().fadeIn(0.16).play();
  activeAction = next;
  document.getElementById('animation').value = next.getClip().name;
}

for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => setView(button.dataset.view));
document.getElementById('animation').addEventListener('change', event => selectAnimation(event.target.value));
for (const [id, morphs] of Object.entries({
  blink: ['eyeBlinkLeft', 'eyeBlinkRight'],
  jaw: ['jawOpen'],
  brow: ['browDownLeft', 'browDownRight'],
  smile: ['smile']
})) {
  document.getElementById(id).addEventListener('input', event => {
    for (const name of morphs) expression(name, Number(event.target.value));
  });
}
document.getElementById('viseme').addEventListener('change', event => {
  for (const name of ['A', 'I', 'U', 'O', 'E', 'M']) expression(`viseme${name}`, event.target.value === name ? 1 : 0);
});
document.getElementById('clay').addEventListener('click', event => {
  const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
  for (const [mesh, material] of materials) mesh.material = enabled ? clay : material;
});

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}
const observer = new ResizeObserver(resize);
observer.observe(stage);
setView('front');

try {
  const loader = new GLTFLoader();
  loader.register(parser => ({
    name: 'CZ_embedded_images',
    beforeRoot() { parser.textureLoader = new T.TextureLoader(parser.options.manager); }
  }));
  const source = await loader.loadAsync(modelUrl);
  model = source.scene;
  const bounds = new T.Box3().setFromObject(model);
  const center = bounds.getCenter(new T.Vector3());
  const height = bounds.getSize(new T.Vector3()).y;
  const scale = 1.76 / Math.max(height, 0.01);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
  const stats = { meshes: 0, triangles: 0, bones: 0, morphs: [], animations: source.animations.map(clip => clip.name), shared };
  const boneSet = new Set();
  const morphSet = new Set();
  const textures = new Set();
  model.traverse(node => {
    if (!node.isMesh) return;
    stats.meshes++;
    stats.triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
    for (const bone of node.skeleton?.bones || []) boneSet.add(bone);
    for (const name of Object.keys(node.morphTargetDictionary || {})) morphSet.add(name);
    materials.set(node, node.material);
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const value of Object.values(mat)) {
        if (!value?.isTexture) continue;
        value.anisotropy = renderer.capabilities?.getMaxAnisotropy?.() ?? 16;
        textures.add(value);
      }
    }
  });
  stats.bones = boneSet.size;
  stats.morphs = [...morphSet];
  stats.textures = textures.size;
  scene.add(model);
  mixer = new T.AnimationMixer(model);
  for (const clip of source.animations) {
    actions.set(clip.name, mixer.clipAction(clip));
    const option = document.createElement('option');
    option.value = clip.name;
    option.textContent = clip.name;
    document.getElementById('animation').append(option);
  }
  selectAnimation('Idle');
  for (const control of document.querySelectorAll('footer button,footer select,footer input')) control.disabled = false;
  status.textContent = `${shared ? '当前共用基线' : '王贵专属资产'} · ${Math.round(stats.triangles).toLocaleString()} 三角面 · ${stats.bones} 骨骼 · ${stats.morphs.length} 表情 · ${backend === 'webgpu' ? 'WebGPU' : 'WebGL2'}`;
  window.wangGuiPreview = { stats, model, scene, camera, renderer, mixer, actions, expression, setView, selectAnimation, backend, perf, materials };
} catch (error) {
  status.textContent = `模型加载失败：${error.message}`;
  console.error(error);
}

const timer = new T.Timer();
timer.connect(document);
renderer.setAnimationLoop(() => {
  if (disposed) return;
  renderer.info.reset();
  perfFrames++;
  timer.update();
  mixer?.update(Math.min(timer.getDelta(), 0.05));
  controls.update();
  renderer.render(scene, camera);
  perf.calls = renderer.info.render.calls;
  perf.triangles = renderer.info.render.triangles;
  perf.textures = renderer.info.memory.textures;
  const now = performance.now();
  if (now - perfLast >= 500) {
    perf.fps = perfFrames * 1000 / (now - perfLast);
    perfFrames = 0;
    perfLast = now;
    metrics.textContent = `${backend === 'webgpu' ? 'WebGPU' : 'WebGL2'} · ${perf.fps.toFixed(1)} fps · calls ${perf.calls} · tris ${Math.round(perf.triangles).toLocaleString()}\ntextures ${perf.textures} · DPR ${renderer.getPixelRatio().toFixed(2)}`;
  }
});
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  renderer.setAnimationLoop(null);
  status.textContent = '图形上下文已丢失，请刷新页面重新查看；游戏存档不受影响。';
});
window.addEventListener('pagehide', () => {
  disposed = true;
  renderer.setAnimationLoop(null);
  timer.dispose();
  observer.disconnect();
  controls.dispose();
  mixer?.stopAllAction();
  const textures = new Set();
  const geometries = new Set();
  const mats = new Set([clay, floor.material, ...[...materials.values()].flat()]);
  scene.traverse(node => { if (node.isMesh) geometries.add(node.geometry); });
  for (const mat of mats) {
    for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
    mat.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) texture.dispose();
  environment?.dispose();
  renderer.dispose();
}, { once: true });