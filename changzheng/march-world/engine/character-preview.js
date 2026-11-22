import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

let canvas = document.getElementById('portrait');
const status = document.getElementById('status');
const stage = canvas.parentElement;
const rendererParam = new URLSearchParams(location.search).get('renderer');
let backend = 'webgl';
let W = null;
let TSL = null;
let renderer = null;
let composer = null;
let gtao = null;
let renderPipeline = null;
let environment = null;
const scene = new T.Scene();
scene.background = new T.Color('#242b28');
const camera = new T.PerspectiveCamera(35, 1, 0.02, 30);

function setupRenderer(commonRenderer) {
  commonRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
  commonRenderer.toneMapping = T.AgXToneMapping;
  commonRenderer.toneMappingExposure = 1.0;
  commonRenderer.shadowMap.enabled = true;
  commonRenderer.shadowMap.type = T.PCFShadowMap;
}

async function initWebGPU() {
  if (!navigator.gpu) throw new Error('navigator.gpu unavailable');
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error('No WebGPU adapter');
  W = await import('three/webgpu');
  TSL = await import('three/tsl');
  const { ao } = await import('three/addons/tsl/display/GTAONode.js');
  renderer = new W.WebGPURenderer({ canvas, antialias: true });
  await renderer.init();
  setupRenderer(renderer);
  const generator = new W.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  environment = generator.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  generator.dispose();
  const prePass = TSL.pass(scene, camera, { samples: 0 });
  prePass.setMRT(TSL.mrt({ output: TSL.normalView }));
  const aoPass = ao(prePass.getTextureNode('depth'), prePass.getTextureNode(), camera);
  aoPass.radius.value = 0.06;
  const scenePass = TSL.pass(scene, camera);
  scenePass.contextNode = TSL.builtinAOContext(aoPass.getTextureNode().sample(TSL.screenUV).r);
  renderPipeline = new W.RenderPipeline(renderer);
  renderPipeline.outputNode = scenePass;
  backend = 'webgpu';
}

function initWebGL() {
  renderer = new T.WebGLRenderer({ canvas, antialias: true });
  setupRenderer(renderer);
  const generator = new T.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  environment = generator.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  generator.dispose();
  composer = new EffectComposer(renderer, new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, samples: 4 }));
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  gtao = new GTAOPass(scene, camera, 1, 1);
  gtao.updateGtaoMaterial({ radius: 0.05, distanceExponent: 1.3, thickness: 0.018, distanceFallOff: 1.0, scale: 1.0, samples: 16 });
  composer.addPass(gtao);
  composer.addPass(new OutputPass());
  backend = 'webgl';
}

if (rendererParam === 'webgpu' || (rendererParam !== 'webgl' && navigator.gpu)) {
  try {
    await initWebGPU();
  } catch (error) {
    console.warn('WebGPU 初始化失败，回退 WebGL2：', error.message);
    try { renderer?.dispose(); } catch { /* 忽略半初始化释放失败 */ }
    renderer = null;
    W = null;
    TSL = null;
    renderPipeline = null;
    const fresh = canvas.cloneNode(false);
    canvas.replaceWith(fresh);
    canvas = fresh;
  }
}
if (!renderer) initWebGL();
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 0.3;
controls.maxDistance = 5;
controls.maxPolarAngle = Math.PI * 0.8;
scene.add(new T.HemisphereLight('#dce7ed', '#484338', 0.22));
let keyLight = null;
for (const [color, intensity, position] of [
  ['#ffe4c8', 1.45, [-1.8, 2.3, 1.5]],
  ['#c4d8ff', 0.32, [1.7, 1.7, 1.3]],
  ['#fff0dc', 1.75, [1.1, 2.4, -1.2]],
  ['#9fb6d8', 0.55, [-1.4, 1.9, -1.6]]
]) {
  const light = new T.DirectionalLight(color, intensity);
  light.position.set(...position);
  if (position[0] < 0 && keyLight === null) {
    keyLight = light;
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.radius = 3;
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
const skinUniformSets = [];
function refineSkin(mat, frame) {
  if (backend === 'webgpu') refineSkinTSL(mat, frame);
  else refineSkinGLSL(mat, frame);
}
function refineSkinTSL(mat, frame) {
  const { Fn, vec2, vec3, vec4, float, uniform, positionGeometry, texture, normalMap,
    mix, clamp, smoothstep, exp, sin, pow, max, abs, distance, dot,
    positionViewDirection, transformedNormalView } = TSL;
  const meters = value => vec3(...value).div(frame.unit);
  const eye = meters(frame.eye), brow = meters(frame.brow), nose = meters(frame.nose);
  const mouth = meters(frame.mouth), chin = meters(frame.chin), hairline = meters(frame.hairline);
  const mole = meters(frame.mole), neck = meters(frame.neck), throat = meters(frame.throat);
  const handL = meters(frame.handL), handR = meters(frame.handR);
  const unit = float(frame.unit);
  const socketX = float(frame.socketX / frame.unit);
  const keyDir = uniform(new T.Vector3(0, 0, 1));
  const hwGauss = (value, center, width) => {
    const t = value.sub(center).div(width);
    return exp(t.mul(t).negate());
  };
  const hwLine = (point, a, b) => {
    const pa = point.sub(a), ba = b.sub(a);
    const h = clamp(dot(pa, ba).div(dot(ba, ba)), 0, 1);
    return pa.sub(ba.mul(h)).length();
  };
  const hwP = vec3(positionGeometry.x, positionGeometry.z.negate(), positionGeometry.y).div(unit);
  const absX = abs(hwP.x);
  const hwFront = smoothstep(0.0, 0.035, eye.y.sub(hwP.y));
  const hwHead = smoothstep(chin.z.sub(0.025), chin.z.add(0.015), hwP.z)
    .mul(smoothstep(hairline.z.add(0.045), hairline.z.add(0.12), hwP.z).oneMinus());
  const hwFace = hwFront.mul(hwHead);
  const hwJaw = hwGauss(hwP.z, mouth.z.add(chin.z).mul(0.5), 0.028);
  const hwLip = hwGauss(hwP.z, mouth.z.add(0.011), 0.005);
  const hwBeard = max(hwJaw.mul(0.8), hwLip.mul(0.45)).mul(hwFace)
    .mul(smoothstep(0.045, 0.075, absX).oneMinus())
    .mul(sin(hwP.x.mul(2600).add(sin(hwP.z.mul(1900)).mul(2))).mul(sin(hwP.z.mul(2300))).mul(0.20).add(0.80));
  const hwCheek = hwGauss(absX, socketX.mul(0.95), 0.020).mul(hwGauss(hwP.z, nose.z.add(0.012), 0.016)).mul(hwFace);
  const hwMoleMark = smoothstep(0.00045, 0.00085, distance(hwP, mole)).oneMinus();
  const hwJitter = sin(hwP.x.mul(310)).mul(0.0035).add(sin(hwP.x.mul(730).add(1.7)).mul(0.0018));
  const hwHairBand = hwGauss(hwP.z, hairline.z.add(0.010).add(hwJitter), 0.011).mul(smoothstep(chin.z, chin.z.add(0.05), hwP.z));
  const hwSideburn = hwGauss(absX, socketX.mul(1.45), 0.012).mul(hwGauss(hwP.z, brow.z.sub(0.005), 0.018)).mul(hwFront);
  const hwOil = max(
    hwGauss(hwP.z, brow.z.add(0.022), 0.026).mul(smoothstep(0.020, 0.050, absX).oneMinus()),
    hwGauss(hwP.z, nose.z, 0.016).mul(smoothstep(0.010, 0.028, absX).oneMinus())
  ).mul(hwFace);
  const hwUnderEye = hwGauss(hwP.z, eye.z.sub(0.010), 0.0018).mul(hwGauss(absX, socketX, 0.014)).mul(hwFace);
  const hwForehead = hwGauss(hwP.z, brow.z.add(0.020), 0.0016).add(hwGauss(hwP.z, brow.z.add(0.030), 0.0016))
    .mul(smoothstep(0.025, 0.055, absX).oneMinus()).mul(hwFace);
  const hwNaso = hwGauss(hwLine(vec2(absX, hwP.z), vec2(socketX.mul(0.42), nose.z.sub(0.002)),
    vec2(socketX.mul(0.68), mouth.z.sub(0.008))), 0.0, 0.0018).mul(hwFace);
  const hwLipLines = hwGauss(hwP.z, mouth.z, 0.004).mul(smoothstep(0.012, 0.025, absX).oneMinus())
    .mul(hwFace).mul(sin(hwP.x.mul(4200)).mul(0.5).add(0.5));
  const hwLipTint = hwGauss(hwP.z, mouth.z.add(0.004), 0.0060)
    .mul(smoothstep(0.013, 0.024, absX).oneMinus()).mul(hwFace);
  const hwVesselZone = max(
    hwGauss(absX, socketX.mul(1.05), 0.020).mul(hwGauss(hwP.z, nose.z.add(0.010), 0.014)),
    hwGauss(absX, socketX.mul(0.40), 0.007).mul(hwGauss(hwP.z, nose.z.sub(0.004), 0.010))
  ).mul(hwFace);
  const hwVessels = pow(max(0, sin(hwP.x.mul(950).add(sin(hwP.z.mul(720)).mul(2.6)))
    .mul(sin(hwP.z.mul(1150).add(hwP.x.mul(260))))), 6);
  const hwNeckZone = hwGauss(hwP.z, neck.z.add(0.020), 0.055).mul(hwFront);
  const hwNeckLines = hwGauss(hwP.z, neck.z.add(0.030), 0.0016).add(hwGauss(hwP.z, neck.z.add(0.048), 0.0016))
    .mul(smoothstep(0.035, 0.055, absX).oneMinus()).mul(hwFront);
  const hwThroatShadow = hwGauss(hwP.z, throat.z.sub(0.014), 0.008)
    .mul(smoothstep(0.006, 0.020, absX).oneMinus()).mul(hwFront);
  const hwHand = max(smoothstep(0.05, 0.09, distance(hwP, handL)).oneMinus(),
    smoothstep(0.05, 0.09, distance(hwP, handR)).oneMinus());
  const hwHandVessels = pow(max(0, sin(hwP.x.mul(700).add(sin(hwP.z.mul(500)).mul(2)))
    .mul(sin(hwP.z.mul(900).add(hwP.x.mul(220))))), 6).mul(hwHand);
  const hwKnuckle = pow(max(0, sin(hwP.z.mul(1500).add(sin(hwP.x.mul(900)).mul(3)))), 10).mul(hwHand).mul(0.4);
  const hwNostril = hwGauss(absX, socketX.mul(0.40), 0.008).mul(hwGauss(hwP.z, nose.z.sub(0.006), 0.008)).mul(hwFace);
  const hwEar = smoothstep(socketX.mul(1.75), socketX.mul(2.15), absX)
    .mul(hwGauss(hwP.z, eye.z.sub(0.010), 0.030)).mul(hwHead);
  const hwThin = clamp(hwNostril.add(hwEar.mul(0.8)), 0, 1);
  const albedo = texture(mat.map);
  mat.colorNode = Fn(() => {
    let diffuse = albedo.rgb;
    diffuse = mix(diffuse, diffuse.mul(vec3(0.80, 0.88, 0.96)), hwBeard.mul(0.85));
    diffuse = diffuse.mul(vec3(0.985, 1.0, 1.025));
    diffuse = mix(diffuse, diffuse.mul(vec3(1.10, 0.94, 0.90)), hwCheek.mul(0.5));
    diffuse = mix(diffuse, vec3(0.035, 0.022, 0.016), hwMoleMark.mul(0.85));
    diffuse = diffuse.mul(float(1.0).sub(hwHairBand.mul(0.22)).sub(hwSideburn.mul(0.18)));
    diffuse = diffuse.mul(float(1.0).sub(hwUnderEye.mul(0.06)).sub(hwForehead.mul(0.05)).sub(hwNaso.mul(0.065)).sub(hwLipLines.mul(0.04)));
    diffuse = mix(diffuse, diffuse.mul(vec3(1.20, 0.78, 0.74)), hwLipTint.mul(0.60));
    diffuse = diffuse.mul(float(1.0).sub(hwVesselZone.mul(hwVessels).mul(vec3(0.015, 0.075, 0.085))));
    diffuse = mix(diffuse, diffuse.mul(vec3(1.05, 0.93, 0.91)), hwVesselZone.mul(0.35));
    diffuse = diffuse.mul(float(1.0).sub(hwNeckLines.mul(0.045)).sub(hwThroatShadow.mul(0.06)));
    diffuse = diffuse.mul(float(1.0).add(hwNeckZone.mul(0.02)));
    diffuse = diffuse.mul(float(1.0).sub(hwHandVessels.mul(vec3(0.010, 0.045, 0.055))).sub(hwKnuckle.mul(0.04)));
    return vec4(diffuse, albedo.a);
  })();
  const pore1 = sin(hwP.x.mul(5200).add(sin(hwP.z.mul(4300)).mul(1.8)));
  const pore2 = sin(hwP.z.mul(5700).add(sin(hwP.x.mul(3900)).mul(2.1)));
  const poreMask = hwFace.mul(0.7).add(0.3).mul(0.035);
  mat.normalNode = normalMap(texture(mat.normalMap), vec2(mat.normalScale?.x ?? 1, mat.normalScale?.y ?? 1))
    .add(vec3(pore1, pore2, 0).mul(poreMask)).normalize();
  mat.roughnessNode = clamp(texture(mat.roughnessMap).g.sub(hwOil.mul(0.16)).add(hwBeard.mul(0.05)).add(hwHand.mul(0.04)), 0.24, 0.92);
  const scatterLight = keyDir.add(transformedNormalView.mul(0.35)).normalize();
  const back = pow(clamp(dot(positionViewDirection, scatterLight.negate()), 0, 1), 3);
  const wrap = clamp(dot(transformedNormalView, keyDir.normalize()).add(0.45).div(1.45), 0, 1);
  mat.emissiveNode = albedo.rgb.mul(vec3(0.42, 0.12, 0.07)).mul(back.mul(0.75).add(wrap.mul(0.16))).mul(hwFace)
    .add(albedo.rgb.mul(vec3(0.55, 0.16, 0.10)).mul(back).mul(hwThin).mul(1.6));
  mat.needsUpdate = true;
  skinUniformSets.push({ uHwKeyDir: keyDir });
}
function refineSkinGLSL(mat, frame) {
  const meters = value => new T.Vector3(...value).divideScalar(frame.unit);
  const uniforms = {
    uHwUnit: { value: frame.unit },
    uHwEye: { value: meters(frame.eye) },
    uHwBrow: { value: meters(frame.brow) },
    uHwNose: { value: meters(frame.nose) },
    uHwMouth: { value: meters(frame.mouth) },
    uHwChin: { value: meters(frame.chin) },
    uHwHairline: { value: meters(frame.hairline) },
    uHwMole: { value: meters(frame.mole) },
    uHwNeck: { value: meters(frame.neck) },
    uHwThroat: { value: meters(frame.throat) },
    uHwHandL: { value: meters(frame.handL) },
    uHwHandR: { value: meters(frame.handR) },
    uHwSocketX: { value: frame.socketX / frame.unit },
    uHwKeyDir: { value: new T.Vector3(0, 0, 1) }
  };
  mat.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHwSkin;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvHwSkin = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vHwSkin;
uniform float uHwUnit;
uniform vec3 uHwEye;
uniform vec3 uHwBrow;
uniform vec3 uHwNose;
uniform vec3 uHwMouth;
uniform vec3 uHwChin;
uniform vec3 uHwHairline;
uniform vec3 uHwMole;
uniform vec3 uHwNeck;
uniform vec3 uHwThroat;
uniform vec3 uHwHandL;
uniform vec3 uHwHandR;
uniform float uHwSocketX;
uniform vec3 uHwKeyDir;
float hwGauss(float value, float center, float width) {
  float t = (value - center) / width;
  return exp(-t * t);
}
float hwLine(vec2 point, vec2 a, vec2 b) {
  vec2 pa = point - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
vec3 hwP = vec3(vHwSkin.x, -vHwSkin.z, vHwSkin.y) / uHwUnit;
float hwFront = smoothstep(0.0, 0.035, uHwEye.y - hwP.y);
float hwHead = smoothstep(uHwChin.z - 0.025, uHwChin.z + 0.015, hwP.z)
  * (1.0 - smoothstep(uHwHairline.z + 0.045, uHwHairline.z + 0.12, hwP.z));
float hwFace = hwFront * hwHead;
float hwJaw = hwGauss(hwP.z, (uHwMouth.z + uHwChin.z) * 0.5, 0.028);
float hwLip = hwGauss(hwP.z, uHwMouth.z + 0.011, 0.005);
float hwBeard = max(hwJaw * 0.8, hwLip * 0.45) * hwFace * (1.0 - smoothstep(0.045, 0.075, abs(hwP.x)));
hwBeard *= 0.80 + 0.20 * sin(hwP.x * 2600.0 + sin(hwP.z * 1900.0) * 2.0) * sin(hwP.z * 2300.0);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.80, 0.88, 0.96), hwBeard * 0.85);
diffuseColor.rgb *= vec3(0.985, 1.0, 1.025);
float hwCheek = hwGauss(abs(hwP.x), uHwSocketX * 0.95, 0.020) * hwGauss(hwP.z, uHwNose.z + 0.012, 0.016) * hwFace;
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.10, 0.94, 0.90), hwCheek * 0.5);
float hwMoleMark = 1.0 - smoothstep(0.00045, 0.00085, distance(hwP, uHwMole));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.035, 0.022, 0.016), hwMoleMark * 0.85);
float hwHairlineJitter = 0.0035 * sin(hwP.x * 310.0) + 0.0018 * sin(hwP.x * 730.0 + 1.7);
float hwHairBand = hwGauss(hwP.z, uHwHairline.z + 0.010 + hwHairlineJitter, 0.011) * smoothstep(uHwChin.z, uHwChin.z + 0.05, hwP.z);
float hwSideburn = hwGauss(abs(hwP.x), uHwSocketX * 1.45, 0.012) * hwGauss(hwP.z, uHwBrow.z - 0.005, 0.018) * hwFront;
diffuseColor.rgb *= 1.0 - hwHairBand * 0.22 - hwSideburn * 0.18;
float hwOil = max(
  hwGauss(hwP.z, uHwBrow.z + 0.022, 0.026) * (1.0 - smoothstep(0.020, 0.050, abs(hwP.x))),
  hwGauss(hwP.z, uHwNose.z, 0.016) * (1.0 - smoothstep(0.010, 0.028, abs(hwP.x)))
) * hwFace;
float hwUnderEye = hwGauss(hwP.z, uHwEye.z - 0.010, 0.0018) * hwGauss(abs(hwP.x), uHwSocketX, 0.014) * hwFace;
float hwForehead = (hwGauss(hwP.z, uHwBrow.z + 0.020, 0.0016) + hwGauss(hwP.z, uHwBrow.z + 0.030, 0.0016))
  * (1.0 - smoothstep(0.025, 0.055, abs(hwP.x))) * hwFace;
float hwNaso = hwGauss(hwLine(vec2(abs(hwP.x), hwP.z), vec2(uHwSocketX * 0.42, uHwNose.z - 0.002),
  vec2(uHwSocketX * 0.68, uHwMouth.z - 0.008)), 0.0, 0.0018) * hwFace;
float hwLipLines = hwGauss(hwP.z, uHwMouth.z, 0.004) * (1.0 - smoothstep(0.012, 0.025, abs(hwP.x)))
  * hwFace * (0.5 + 0.5 * sin(hwP.x * 4200.0));
diffuseColor.rgb *= 1.0 - hwUnderEye * 0.06 - hwForehead * 0.05 - hwNaso * 0.065 - hwLipLines * 0.04;
float hwLipTint = hwGauss(hwP.z, uHwMouth.z + 0.004, 0.0060)
  * (1.0 - smoothstep(0.013, 0.024, abs(hwP.x))) * hwFace;
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.20, 0.78, 0.74), hwLipTint * 0.60);
float hwVesselZone = max(
  hwGauss(abs(hwP.x), uHwSocketX * 1.05, 0.020) * hwGauss(hwP.z, uHwNose.z + 0.010, 0.014),
  hwGauss(abs(hwP.x), uHwSocketX * 0.40, 0.007) * hwGauss(hwP.z, uHwNose.z - 0.004, 0.010)
) * hwFace;
float hwVessels = pow(max(0.0, sin(hwP.x * 950.0 + sin(hwP.z * 720.0) * 2.6)
  * sin(hwP.z * 1150.0 + hwP.x * 260.0)), 6.0);
diffuseColor.rgb *= 1.0 - hwVesselZone * hwVessels * vec3(0.015, 0.075, 0.085);
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.05, 0.93, 0.91), hwVesselZone * 0.35);
float hwNeckZone = hwGauss(hwP.z, uHwNeck.z + 0.020, 0.055) * hwFront;
float hwNeckLines = (hwGauss(hwP.z, uHwNeck.z + 0.030, 0.0016) + hwGauss(hwP.z, uHwNeck.z + 0.048, 0.0016))
  * (1.0 - smoothstep(0.035, 0.055, abs(hwP.x))) * hwFront;
float hwThroatShadow = hwGauss(hwP.z, uHwThroat.z - 0.014, 0.008)
  * (1.0 - smoothstep(0.006, 0.020, abs(hwP.x))) * hwFront;
diffuseColor.rgb *= 1.0 - hwNeckLines * 0.045 - hwThroatShadow * 0.06;
diffuseColor.rgb *= 1.0 + hwNeckZone * 0.02;
float hwHand = max(1.0 - smoothstep(0.05, 0.09, distance(hwP, uHwHandL)),
                   1.0 - smoothstep(0.05, 0.09, distance(hwP, uHwHandR)));
float hwHandVessels = pow(max(0.0, sin(hwP.x * 700.0 + sin(hwP.z * 500.0) * 2.0)
  * sin(hwP.z * 900.0 + hwP.x * 220.0)), 6.0) * hwHand;
float hwKnuckle = pow(max(0.0, sin(hwP.z * 1500.0 + sin(hwP.x * 900.0) * 3.0)), 10.0) * hwHand * 0.4;
diffuseColor.rgb *= 1.0 - hwHandVessels * vec3(0.010, 0.045, 0.055) - hwKnuckle * 0.04;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
vec2 hwPoreUv = vec2(hwP.x, hwP.z);
float hwP1 = sin(hwPoreUv.x * 5200.0 + sin(hwPoreUv.y * 4300.0) * 1.8);
float hwP2 = sin(hwPoreUv.y * 5700.0 + sin(hwPoreUv.x * 3900.0) * 2.1);
normal = normalize(normal + vec3(hwP1, hwP2, 0.0) * 0.035 * (hwFace * 0.7 + 0.3));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor - hwOil * 0.16 + hwBeard * 0.05 + hwHand * 0.04, 0.24, 0.92);`)
      .replace('#include <opaque_fragment>', `vec3 hwView = normalize(vViewPosition);
vec3 hwScatterLight = normalize(uHwKeyDir + normal * 0.35);
float hwBack = pow(clamp(dot(hwView, -hwScatterLight), 0.0, 1.0), 3.0);
float hwWrap = clamp((dot(normal, normalize(uHwKeyDir)) + 0.45) / 1.45, 0.0, 1.0);
float hwNostril = hwGauss(abs(hwP.x), uHwSocketX * 0.40, 0.008) * hwGauss(hwP.z, uHwNose.z - 0.006, 0.008) * hwFace;
float hwEar = smoothstep(uHwSocketX * 1.75, uHwSocketX * 2.15, abs(hwP.x))
  * hwGauss(hwP.z, uHwEye.z - 0.010, 0.030) * hwHead;
float hwThin = clamp(hwNostril + hwEar * 0.8, 0.0, 1.0);
outgoingLight += diffuseColor.rgb * vec3(0.42, 0.12, 0.07) * (hwBack * 0.75 + hwWrap * 0.16) * hwFace;
outgoingLight += diffuseColor.rgb * vec3(0.55, 0.16, 0.10) * hwBack * hwThin * 1.6;
#include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'hewen-skin-v4';
  mat.needsUpdate = true;
  skinUniformSets.push(uniforms);
}
let mixer = null;
let model = null;
let disposed = false;
let actions = new Map();
let active = null;

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  renderer.setSize(width, height, false);
  composer?.setSize(width, height);

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
let manualBlink = 0;
let manualJaw = 0;
let manualBrow = 0;
let manualSmile = 0;
let breath = null;
let gaze = null;
const visemeNames = ['A', 'I', 'U', 'O', 'E', 'M'];
const visemeCurrent = Object.fromEntries(visemeNames.map(name => [name, 0]));
let visemeTarget = 'rest';
let visemeTimer = 0;
let browRaiseSide = 'L';
let browRaisePhase = -1;
let browRaiseTimer = 6;
let lastBlinkInput = -100;
let elapsed = 0;
let nextBlink = 2.8;
let blinkPhase = -1;
let headBone = null;
let headSway = null;
document.getElementById('blink').addEventListener('input', event => {
  manualBlink = Number(event.target.value);
  lastBlinkInput = elapsed;
  expression('eyeBlinkLeft', manualBlink);
  expression('eyeBlinkRight', manualBlink);
});
document.getElementById('jaw').addEventListener('input', event => {
  manualJaw = Number(event.target.value);
  expression('jawOpen', manualJaw);
});
document.getElementById('brow').addEventListener('input', event => {
  manualBrow = Number(event.target.value);
  expression('browDownLeft', manualBrow);
  expression('browDownRight', manualBrow);
});
document.getElementById('smile').addEventListener('input', event => {
  manualSmile = Number(event.target.value);
  expression('smile', manualSmile);
});
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
  }
  headSway?.reset().play();
  breath?.reset().play();
  mixer.update(0);
}
document.getElementById('animation').addEventListener('change', event => selectAnimation(event.target.value));

const draco = new DRACOLoader().setDecoderPath('/assets/webgpu40/vendor/three/jsm/libs/draco/gltf/');
try {
  const loader = new GLTFLoader().setDRACOLoader(draco);
  loader.register(parser => ({
    name: 'CZ_embedded_images',
    beforeRoot() { parser.textureLoader = new T.TextureLoader(parser.options.manager); }
  }));
  const source = await loader.loadAsync('/assets/characters/he-wen/he-wen-web.glb');
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
      mat.envMapIntensity = node.name === 'HeWen_Eyes' ? 0.85 : (/Hair/i.test(node.name) ? 0.62 : 0.42);
      if (node.name === 'HeWen_Skin' && node.userData.skinFrame) refineSkin(mat, node.userData.skinFrame);
      if (/Hair|Eyebrow/i.test(node.name) && !/Strands/i.test(node.name)) {
        mat.alphaTest = 0.3;
        mat.transparent = false;
        mat.depthWrite = true;
        mat.alphaToCoverage = true;
        if (mat.isMeshPhysicalMaterial && /Hair/i.test(node.name)) {
          mat.anisotropy = Math.max(mat.anisotropy || 0, 0.30);
          mat.anisotropyRotation = Math.PI * 0.5;
        }
      }
      if (node.name === 'HeWen_Eyes') {
        if (backend === 'webgpu') {
          const { texture, vec3, clamp, dot, positionViewDirection, transformedNormalView } = TSL;
          const wrap = clamp(dot(transformedNormalView, positionViewDirection).add(0.6).div(1.6), 0, 1);
          mat.emissiveNode = texture(mat.map).rgb.mul(vec3(0.20, 0.06, 0.04)).mul(wrap.oneMinus()).mul(0.5);
          mat.needsUpdate = true;
        } else {
          mat.onBeforeCompile = shader => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
float hwEyeWrap = clamp((dot(normal, normalize(vViewPosition)) + 0.6) / 1.6, 0.0, 1.0);
outgoingLight += diffuseColor.rgb * vec3(0.20, 0.06, 0.04) * (1.0 - hwEyeWrap) * 0.5;
#include <opaque_fragment>`);
          };
          mat.customProgramCacheKey = () => 'hewen-eyes-v1';
          mat.needsUpdate = true;
        }
      }
    }
  });
  stats.bones = boneSet.size;
  stats.expressions = [...keys];
  scene.add(model);
  mixer = new T.AnimationMixer(model);
  headBone = model.getObjectByName('head');
  if (headBone) {
    const times = [0, 2, 4, 6, 8];
    const poses = [[0, 0, 0], [0.006, 0.010, 0.004], [0, 0, 0], [-0.006, -0.010, -0.004], [0, 0, 0]];
    const values = poses.flatMap(angles => new T.Quaternion().setFromEuler(new T.Euler(...angles)).toArray());
    const clip = new T.AnimationClip('HeWen_HeadSway', 8, [new T.QuaternionKeyframeTrack('head.quaternion', times, values)]);
    T.AnimationUtils.makeClipAdditive(clip);
    headSway = mixer.clipAction(clip);
    headSway.blendMode = T.AdditiveAnimationBlendMode;
    headSway.play();
  }
  actions = new Map(source.animations.map(clip => [clip.name, mixer.clipAction(clip)]));
  if (model.getObjectByName('spine_03')) {
    const times = [0, 1, 2, 3, 4];
    const poses = [[0, 0, 0], [0.006, 0, 0], [0.002, 0, 0], [-0.002, 0, 0], [0, 0, 0]];
    const values = poses.flatMap(angles => new T.Quaternion().setFromEuler(new T.Euler(...angles)).toArray());
    const clip = new T.AnimationClip('HeWen_Breath', 4, [new T.QuaternionKeyframeTrack('spine_03.quaternion', times, values)]);
    T.AnimationUtils.makeClipAdditive(clip);
    breath = mixer.clipAction(clip);
    breath.blendMode = T.AdditiveAnimationBlendMode;
    breath.play();
  }
  const eyesMesh = model.getObjectByName('HeWen_Eyes');
  if (eyesMesh) {
    model.updateMatrixWorld(true);
    eyesMesh.geometry.computeBoundingSphere();
    const pivot = eyesMesh.localToWorld(eyesMesh.geometry.boundingSphere.center.clone());
    pivot.applyMatrix4(new T.Matrix4().copy(eyesMesh.parent.matrixWorld).invert());
    gaze = {
      mesh: eyesMesh, pivot,
      restPosition: eyesMesh.position.clone(),
      restQuaternion: eyesMesh.quaternion.clone(),
      current: new T.Vector2(), target: new T.Vector2(), timer: 0
    };
  }
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
  status.textContent = `独立三维模型 · ${Math.round(stats.triangles).toLocaleString()} 三角面 · ${stats.bones} 骨骼 · ${stats.expressions.length} 表情形态 · ${backend === 'webgpu' ? 'WebGPU' : 'WebGL2'}`;
  window.characterPreview = { stats, model, scene, camera, renderer, mixer, expression, setView, backend };
} catch (error) {
  status.textContent = `模型加载失败：${error.message}`;
  console.error(error);
} finally {
  draco.dispose();
}
const clock = new T.Clock();
renderer.setAnimationLoop(() => {
  if (disposed) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  mixer?.update(dt);
  if (model) {
    if (elapsed - lastBlinkInput > 6) {
      nextBlink -= dt;
      if (nextBlink <= 0) {
        blinkPhase = 0;
        nextBlink = 2.6 + Math.random() * 3.4;
      }
    }
    let autoBlink = 0;
    if (blinkPhase >= 0) {
      blinkPhase += dt;
      autoBlink = Math.sin(Math.min(blinkPhase / 0.16, 1) * Math.PI);
      if (blinkPhase >= 0.16) blinkPhase = -1;
    }
    const blinkValue = Math.max(manualBlink, autoBlink, manualSmile * 0.25);
    expression('eyeBlinkLeft', blinkValue);
    expression('eyeBlinkRight', blinkValue);
    const talking = active && !active.paused && active.getClip().name === 'Talk';
    if (talking) {
      visemeTimer -= dt;
      if (visemeTimer <= 0) {
        const phonemes = ['A', 'A', 'A', 'I', 'U', 'O', 'E', 'M', 'rest'];
        visemeTarget = phonemes[Math.floor(Math.random() * phonemes.length)];
        visemeTimer = 0.09 + Math.random() * 0.11;
      }
    } else {
      visemeTarget = 'rest';
    }
    for (const name of visemeNames) {
      const target = visemeTarget === name ? 1 : 0;
      visemeCurrent[name] += (target - visemeCurrent[name]) * (1 - Math.exp(-dt * 22));
    }
    const jawTalk = 0.34 * visemeCurrent.A + 0.06 * visemeCurrent.I + 0.10 * visemeCurrent.U
      + 0.16 * visemeCurrent.O + 0.12 * visemeCurrent.E;
    expression('visemeI', 0.75 * visemeCurrent.I);
    expression('visemeU', 0.80 * visemeCurrent.U);
    expression('visemeO', 0.75 * visemeCurrent.O);
    expression('visemeE', 0.60 * visemeCurrent.E);
    expression('visemeM', 0.90 * visemeCurrent.M);
    const jawValue = Math.max(manualJaw, jawTalk + manualSmile * 0.05);
    expression('jawOpen', Math.max(0, jawValue));
    expression('browDownLeft', manualBrow);
    expression('browDownRight', manualBrow);
    expression('smile', manualSmile);
    browRaiseTimer -= dt;
    if (browRaiseTimer <= 0) {
      browRaiseSide = Math.random() < 0.5 ? 'L' : 'R';
      browRaisePhase = 0;
      browRaiseTimer = 7 + Math.random() * 8;
    }
    let browRaiseValue = 0;
    if (browRaisePhase >= 0) {
      browRaisePhase += dt;
      browRaiseValue = Math.sin(Math.min(browRaisePhase / 0.9, 1) * Math.PI) * 0.35;
      if (browRaisePhase >= 0.9) browRaisePhase = -1;
    }
    expression('browUpLeft', browRaiseSide === 'L' ? browRaiseValue : 0);
    expression('browUpRight', browRaiseSide === 'R' ? browRaiseValue : 0);
    if (gaze) {
      gaze.timer -= dt;
      if (gaze.timer <= 0) {
        gaze.timer = 1.4 + Math.random() * 2.6;
        gaze.target.set((Math.random() - 0.5) * 0.024, (Math.random() - 0.5) * 0.016);
      }
      gaze.current.lerp(gaze.target, 1 - Math.exp(-dt * 14));
      const drift = new T.Quaternion().setFromEuler(new T.Euler(gaze.current.y, gaze.current.x, 0));
      gaze.mesh.quaternion.copy(gaze.restQuaternion).multiply(drift);
      const rotatedPivot = gaze.pivot.clone().applyQuaternion(drift);
      gaze.mesh.position.copy(gaze.restPosition).add(gaze.pivot).sub(rotatedPivot);
    }

    if (keyLight) {
      for (const uniforms of skinUniformSets) {
        uniforms.uHwKeyDir.value.copy(keyLight.position).sub(keyLight.target.position).transformDirection(camera.matrixWorldInverse);
      }
    }
  }
  controls.update();
  if (renderPipeline) renderPipeline.render();
  else composer.render();
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
  gtao?.dispose();
  composer?.dispose();
  renderPipeline?.dispose();
  renderer.dispose();
}, { once: true });
