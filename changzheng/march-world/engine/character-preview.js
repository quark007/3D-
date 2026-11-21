import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('portrait');
const status = document.getElementById('status');
const stage = canvas.parentElement;
const renderer = new T.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFShadowMap;
const scene = new T.Scene();
scene.background = new T.Color('#242b28');
const generator = new T.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const environment = generator.fromScene(room, 0.04);
scene.environment = environment.texture;
room.dispose();
generator.dispose();
const camera = new T.PerspectiveCamera(35, 1, 0.02, 30);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 0.3;
controls.maxDistance = 5;
controls.maxPolarAngle = Math.PI * 0.8;
scene.add(new T.HemisphereLight('#dce7ed', '#484338', 0.38));
for (const [color, intensity, position] of [
  ['#ffe8d0', 1.6, [-1.2, 2.7, 2]],
  ['#cbdfff', 0.55, [1.6, 1.9, 1.2]],
  ['#fff2df', 1.4, [1, 2.3, -1.1]]
]) {
  const light = new T.DirectionalLight(color, intensity);
  light.position.set(...position);
  if (position[0] < 0) {
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -1, right: 1, top: 1.15, bottom: -1.1, near: 0.1, far: 6 });
    light.target.position.set(0, 1, 0);
    scene.add(light.target);
    light.shadow.bias = -0.00004;
    light.shadow.normalBias = 0.001;
    light.shadow.camera.updateProjectionMatrix();
  }
  scene.add(light);
}
const floor = new T.Mesh(new T.CircleGeometry(3, 64), new T.MeshStandardMaterial({ color: '#323b33', roughness: 1 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);
const materials = new Map();
const clay = new T.MeshStandardMaterial({ color: '#a6a69f', roughness: 0.85 });
let mixer = null;
let model = null;
let disposed = false;
let actions = new Map();
let active = null;

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}
const observer = new ResizeObserver(resize);
observer.observe(stage);

function setView(view) {
  const portraitDistance = camera.aspect < 0.7 ? 1.6 : 1.05;
  const target = new T.Vector3(0, view === 'body' ? 0.92 : 1.6, 0);
  const angle = ({ front: 0, quarter: Math.PI / 5, profile: Math.PI / 2, body: Math.PI / 10 })[view];
  const distance = view === 'body' ? (camera.aspect < 0.7 ? 3.7 : 3.2) : portraitDistance;
  controls.target.copy(target);
  camera.position.set(Math.sin(angle) * distance, target.y + (view === 'body' ? 0.08 : 0.012), Math.cos(angle) * distance);
  controls.update();
  for (const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === view));
}
setView('front');
for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => setView(button.dataset.view));

function expression(name, value) {
  model.traverse(node => {
    const index = node.morphTargetDictionary?.[name];
    if (index !== undefined) node.morphTargetInfluences[index] = value;
  });
}
document.getElementById('blink').addEventListener('input', event => {
  expression('eyeBlinkLeft', Number(event.target.value));
  expression('eyeBlinkRight', Number(event.target.value));
});
document.getElementById('jaw').addEventListener('input', event => expression('jawOpen', Number(event.target.value)));
document.getElementById('clay').addEventListener('click', event => {
  const enabled = event.currentTarget.getAttribute('aria-pressed') !== 'true';
  event.currentTarget.setAttribute('aria-pressed', String(enabled));
  for (const [mesh, material] of materials) mesh.material = enabled ? clay : material;
});
function selectAnimation(name) {
  mixer.stopAllAction();
  active = actions.get(name || 'Idle');
  if (active) {
    active.reset().play();
    active.paused = !name;
    mixer.update(0);
  }
}
document.getElementById('animation').addEventListener('change', event => selectAnimation(event.target.value));

try {
  const loader = new GLTFLoader();
  loader.register(parser => ({
    name: 'CZ_embedded_images',
    beforeRoot() { parser.textureLoader = new T.TextureLoader(parser.options.manager); }
  }));
  const source = await loader.loadAsync('/assets/characters/he-wen/he-wen-study-v1.glb');
  model = source.scene;
  model.name = 'HeWen_Independent_Study';
  const box = new T.Box3().setFromObject(model);
  model.position.y -= box.min.y;
  const stats = { meshes: 0, triangles: 0, skinnedMeshes: 0, bones: 0, expressions: [], animations: source.animations.map(clip => clip.name) };
  const boneSet = new Set();
  const keys = new Set();
  model.traverse(node => {
    if (!node.isMesh) return;
    stats.meshes++;
    stats.triangles += (node.geometry.index?.count || node.geometry.attributes.position.count) / 3;
    if (node.isSkinnedMesh) {
      stats.skinnedMeshes++;
      for (const bone of node.skeleton.bones) boneSet.add(bone);
    }
    for (const key of Object.keys(node.morphTargetDictionary || {})) keys.add(key);
    materials.set(node, node.material);
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
      mat.envMapIntensity = 0.3;
      if (/Hair|Eyebrow/i.test(node.name)) {
        mat.alphaTest = 0.35;
        mat.transparent = false;
        mat.depthWrite = true;
        mat.alphaToCoverage = true;
      }
    }
  });
  stats.bones = boneSet.size;
  stats.expressions = [...keys];
  scene.add(model);
  mixer = new T.AnimationMixer(model);
  actions = new Map(source.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  selectAnimation('');
  model.updateMatrixWorld(true);
  stats.heightMeters = new T.Box3().setFromObject(model, true).getSize(new T.Vector3()).y;
  for (const clip of source.animations) {
    const option = document.createElement('option');
    option.value = clip.name;
    option.textContent = clip.name;
    document.getElementById('animation').append(option);
  }
  for (const control of document.querySelectorAll('footer button,footer select,footer input')) control.disabled = false;
  status.textContent = `独立三维模型 · ${Math.round(stats.triangles).toLocaleString()} 三角面 · ${stats.bones} 骨骼 · ${stats.expressions.length} 表情形态`;
  window.characterPreview = { stats, model, scene, camera, renderer, mixer, expression, setView };
} catch (error) {
  status.textContent = `模型加载失败：${error.message}`;
  console.error(error);
}
const clock = new T.Clock();
renderer.setAnimationLoop(() => {
  if (disposed) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  mixer?.update(dt);
  controls.update();
  renderer.render(scene, camera);
});
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  renderer.setAnimationLoop(null);
  status.textContent = '图形上下文已丢失，请刷新页面重新查看；游戏存档不受影响。';
});
window.addEventListener('pagehide', () => {
  disposed = true;
  renderer.setAnimationLoop(null);
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
  environment.dispose();
  renderer.dispose();
}, { once: true });
