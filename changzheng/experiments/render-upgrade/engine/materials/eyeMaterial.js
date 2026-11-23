function irisMaskGlsl() {
  return `
vec2 hwEyeD0 = vMapUv - vec2(0.291, 0.285);
vec2 hwEyeD1 = vMapUv - vec2(0.707, 0.702);
float hwEyeRadius = min(length(hwEyeD0), length(hwEyeD1));
float hwIrisMask = 1.0 - smoothstep(0.105, 0.125, hwEyeRadius);`;
}

export function createIrisNormalTexture(T) {
  const size = 1024;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const dx0 = u - 0.291;
      const dy0 = v - 0.285;
      const dx1 = u - 0.707;
      const dy1 = v - 0.702;
      const first = dx0 * dx0 + dy0 * dy0 <= dx1 * dx1 + dy1 * dy1;
      const dx = first ? dx0 : dx1;
      const dy = first ? dy0 : dy1;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const mask = Math.max(0, Math.min(1, (0.125 - radius) / 0.02));
      const fiber = Math.sin(angle * 70 + Math.sin(radius * 320) * 2.5) * mask * 0.32;
      const offset = (y * size + x) * 4;
      data[offset] = Math.round((0.5 + Math.cos(angle) * fiber * 0.5) * 255);
      data[offset + 1] = Math.round((0.5 + Math.sin(angle) * fiber * 0.5) * 255);
      data[offset + 2] = 255;
      data[offset + 3] = 255;
    }
  }
  const texture = new T.DataTexture(data, size, size, T.RGBAFormat, T.UnsignedByteType);
  texture.name = 'HeWen_IrisFibersNormal';
  texture.wrapS = T.ClampToEdgeWrapping;
  texture.wrapT = T.ClampToEdgeWrapping;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = T.NoColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

export function enhanceEyeMaterial(T, mat, backend, TSL) {
  const irisNormal = createIrisNormalTexture(T);
  mat.normalMap = irisNormal;
  mat.normalScale.set(0.32, 0.32);
  mat.roughness = 0.20;
  mat.clearcoat = 0.55;
  mat.clearcoatRoughness = 0.06;
  mat.transparent = false;
  mat.opacity = 1;
  mat.depthWrite = true;
  mat.blending = T.NormalBlending;
  if (backend === 'webgpu') {
    const { texture, uv, vec2, vec3, distance, smoothstep, clamp, dot, positionViewDirection, normalView } = TSL;
    const coord = uv();
    const radius = distance(coord, vec2(0.291, 0.285)).min(distance(coord, vec2(0.707, 0.702)));
    const mask = smoothstep(0.105, 0.125, radius).oneMinus();
    const shifted = coord.add(positionViewDirection.xy.mul(0.03).mul(mask));
    mat.colorNode = texture(mat.map, shifted);
    const wrap = clamp(dot(normalView, positionViewDirection).add(0.6).div(1.6), 0, 1);
    mat.emissiveNode = texture(mat.map, shifted).rgb.mul(vec3(0.20, 0.06, 0.04)).mul(wrap.oneMinus()).mul(0.5);
  } else {
    mat.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <map_fragment>', `${irisMaskGlsl()}
#ifdef USE_MAP
vec2 hwParallaxUv = vMapUv + normalize(vViewPosition).xy * 0.03 * hwIrisMask;
diffuseColor *= texture2D(map, hwParallaxUv);
#endif`)
        .replace('#include <opaque_fragment>', `float hwEyeWrap = clamp((dot(normal, normalize(vViewPosition)) + 0.6) / 1.6, 0.0, 1.0);
outgoingLight += diffuseColor.rgb * vec3(0.20, 0.06, 0.04) * (1.0 - hwEyeWrap) * 0.5;
#include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => 'hewen-eyes-parallax-v2';
  }
  mat.needsUpdate = true;
  return irisNormal;
}

function fresnelMaterial(T, backend, TSL, opacity) {
  const mat = new T.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.02,
    metalness: 0,
    ior: 1.376,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    specularIntensity: 1,
    envMapIntensity: 1.2,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: T.NormalBlending
  });
  if (backend === 'webgpu') {
    const { clamp, dot, pow, positionViewDirection, normalView, float } = TSL;
    const fresnel = pow(clamp(dot(normalView, positionViewDirection), 0, 1).oneMinus(), 3);
    mat.opacityNode = clamp(fresnel.mul(0.9).add(0.1).mul(opacity), 0.01, opacity);
  } else {
    mat.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
float hwCorneaFresnel = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
diffuseColor.a *= 0.10 + hwCorneaFresnel * 0.90;
#include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => `hewen-cornea-fresnel-${opacity}`;
  }
  return mat;
}

export function createEyeShells(T, eyesMesh, backend, TSL) {
  eyesMesh.geometry.computeBoundingBox();
  const center = eyesMesh.geometry.boundingBox.getCenter(new T.Vector3());
  const shells = [];
  for (const [name, scale, opacity] of [
    ['HeWen_Cornea', 1.006, 0.22],
    ['HeWen_TearFilm', 1.010, 0.055]
  ]) {
    const geometry = eyesMesh.geometry.clone();
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
    geometry.translate(center.x, center.y, center.z);
    const shell = new T.SkinnedMesh(geometry, fresnelMaterial(T, backend, TSL, opacity));
    shell.name = name;
    shell.position.copy(eyesMesh.position);
    shell.quaternion.copy(eyesMesh.quaternion);
    shell.scale.copy(eyesMesh.scale);
    shell.bind(eyesMesh.skeleton, eyesMesh.bindMatrix);
    shell.bindMode = eyesMesh.bindMode;
    shell.bindMatrixInverse.copy(eyesMesh.bindMatrixInverse);
    shell.frustumCulled = false;
    shell.renderOrder = name === 'HeWen_Cornea' ? 2 : 3;
    shell.userData.approximation = 'Fresnel reflection shell; no refractive transmission';
    eyesMesh.parent.add(shell);
    shells.push(shell);
  }
  return shells;
}