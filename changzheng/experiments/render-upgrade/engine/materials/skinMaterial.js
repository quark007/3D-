import { preintegratedSkinPars } from '../shaders/skin-preintegrated.js';

export function enhanceSkinMaterial(T, mat, frame, lut) {
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
    uHwKeyDir: { value: new T.Vector3(0, 0, 1) },
    uHwSkinLut: { value: lut }
  };
  mat.roughness = mat.roughnessMap ? 1.0 : 0.54;
  mat.metalness = 0;
  mat.clearcoat = 0.03;
  mat.clearcoatRoughness = 0.32;
  mat.sheen = 0;
  mat.normalScale?.set(0.6, 0.6);
  if (mat.normalMap) {
    mat.normalMap.repeat.set(1, 1);
    mat.normalMap.wrapS = T.RepeatWrapping;
    mat.normalMap.wrapT = T.RepeatWrapping;
  }
  mat.transparent = false;
  mat.opacity = 1;
  mat.depthWrite = true;
  mat.alphaTest = 0;
  mat.blending = T.NormalBlending;
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
${preintegratedSkinPars}
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
#ifdef USE_NORMALMAP_TANGENTSPACE
vec3 hwMicro = texture2D(normalMap, vNormalMapUv * 30.0).xyz * 2.0 - 1.0;
normal = normalize(normal + tbn * vec3(hwMicro.xy * 0.25, 0.0));
#endif
vec2 hwPoreUv = vec2(hwP.x, hwP.z);
float hwP1 = sin(hwPoreUv.x * 5200.0 + sin(hwPoreUv.y * 4300.0) * 1.8);
float hwP2 = sin(hwPoreUv.y * 5700.0 + sin(hwPoreUv.x * 3900.0) * 2.1);
normal = normalize(normal + vec3(hwP1, hwP2, 0.0) * 0.012 * (hwFace * 0.7 + 0.3));`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor - hwOil * 0.10 + hwBeard * 0.035 + hwHand * 0.025, 0.45, 0.62);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
float hwCurvature = clamp(length(fwidth(normal)) * 8.0, 0.0, 1.0);
vec3 hwPreintegrated = hwPreintegratedSkin(dot(normal, normalize(uHwKeyDir)), roughnessFactor, hwCurvature);
reflectedLight.directDiffuse = mix(reflectedLight.directDiffuse, diffuseColor.rgb * hwPreintegrated * 1.35, hwFace * 0.30);`)
      .replace('#include <opaque_fragment>', `vec3 hwView = normalize(vViewPosition);
vec3 hwScatterLight = normalize(uHwKeyDir + normal * 0.35);
float hwBack = pow(clamp(dot(hwView, -hwScatterLight), 0.0, 1.0), 3.0);
float hwWrap = clamp((dot(normal, normalize(uHwKeyDir)) + 0.45) / 1.45, 0.0, 1.0);
float hwNostril = hwGauss(abs(hwP.x), uHwSocketX * 0.40, 0.008) * hwGauss(hwP.z, uHwNose.z - 0.006, 0.008) * hwFace;
float hwEar = smoothstep(uHwSocketX * 1.75, uHwSocketX * 2.15, abs(hwP.x))
  * hwGauss(hwP.z, uHwEye.z - 0.010, 0.030) * hwHead;
float hwThin = clamp(hwNostril + hwEar * 0.8, 0.0, 1.0);
float hwAo = 1.0;
#ifdef USE_AOMAP
hwAo = texture2D(aoMap, vAoMapUv).r;
#endif
float hwThickness = clamp((1.0 - hwAo) * 0.65 + hwThin * 0.6, 0.04, 1.0);
outgoingLight += diffuseColor.rgb * vec3(0.30, 0.07, 0.035) * hwBack * hwThickness * 0.35;
outgoingLight += diffuseColor.rgb * hwPreintegrated * hwWrap * 0.035 * hwFace;
#include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'hewen-skin-preintegrated-v6';
  mat.needsUpdate = true;
  return uniforms;
}