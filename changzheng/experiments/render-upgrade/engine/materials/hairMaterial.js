import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function strandDirection(T, geometry, index, stride) {
  const position = geometry.attributes.position;
  const read = (vertex, target) => target.fromBufferAttribute(position, vertex);
  if (stride > 0) {
    const base = Math.floor(index / stride) * stride;
    const end = base + stride - 2;
    const a = read(base, new T.Vector3()).add(read(base + 1, new T.Vector3())).multiplyScalar(0.5);
    const b = read(end, new T.Vector3()).add(read(end + 1, new T.Vector3())).multiplyScalar(0.5);
    return b.sub(a).normalize();
  }
  const normal = new T.Vector3().fromBufferAttribute(geometry.attributes.normal, index);
  const tangent = new T.Vector3(0.15, 1, -0.2).addScaledVector(normal, -new T.Vector3(0.15, 1, -0.2).dot(normal));
  if (tangent.lengthSq() < 0.0001) tangent.set(1, 0, 0);
  return tangent.normalize();
}

export function ensureHairTangent(T, mesh) {
  const geometry = mesh.geometry;
  if (geometry.attributes.hairTangent) return;
  const stride = /HairStrands/.test(mesh.name) ? 8 : /Eyebrows|Eyelashes/.test(mesh.name) ? 6 : 0;
  const values = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const tangent = strandDirection(T, geometry, i, stride);
    tangent.toArray(values, i * 3);
  }
  geometry.setAttribute('hairTangent', new T.BufferAttribute(values, 3));
}

function kajiyaTSL(TSL, mat, keyDir) {
  const { Fn, attribute, vec3, vec4, modelViewMatrix, positionViewDirection, normalView,
    normalize, dot, clamp, pow, max, sqrt } = TSL;
  mat.emissiveNode = Fn(() => {
    const tangent = normalize(modelViewMatrix.mul(vec4(attribute('hairTangent'), 0)).xyz);
    const view = normalize(positionViewDirection);
    const light = normalize(keyDir);
    const half = normalize(light.add(view));
    const wrap = clamp(dot(normalView, light).mul(0.5).add(0.5), 0, 1);
    const primaryT = normalize(tangent.add(normalView.mul(0.1)));
    const secondaryT = normalize(tangent.sub(normalView.mul(0.1)));
    const primaryDot = dot(primaryT, half);
    const secondaryDot = dot(secondaryT, half);
    const primary = pow(sqrt(max(0, primaryDot.mul(primaryDot).oneMinus())), 90).mul(0.22);
    const secondary = pow(sqrt(max(0, secondaryDot.mul(secondaryDot).oneMinus())), 28).mul(0.10);
    return vec3(0.90, 0.82, 0.68).mul(primary).add(vec3(0.12, 0.08, 0.045).mul(secondary)).mul(wrap);
  })();
}

export function applyHairMaterial(T, mat, mesh, backend, TSL, uniformSets) {
  ensureHairTangent(T, mesh);
  const isCard = /Hair(?!Strands)|HairCards/.test(mesh.name);
  const isDetail = /Eyebrow|Eyelash/.test(mesh.name);
  mat.alphaTest = isDetail ? 0.25 : isCard ? 0.35 : 0;
  mat.transparent = false;
  mat.opacity = 1;
  mat.depthWrite = true;
  mat.alphaToCoverage = mat.alphaTest > 0;
  mat.blending = T.NormalBlending;
  if (mat.isMeshPhysicalMaterial && !isDetail) {
    mat.anisotropy = Math.max(mat.anisotropy || 0, 0.65);
    mat.anisotropyRotation = Math.PI * 0.5;
  } else if (mat.isMeshPhysicalMaterial) {
    mat.anisotropy = 0;
  }
  if (isDetail) {
    mat.needsUpdate = true;
    return;
  }
  const keyDir = { value: new T.Vector3(0, 0, 1) };
  if (backend === 'webgpu') {
    const { uniform } = TSL;
    const direction = uniform(keyDir.value);
    keyDir.uniform = direction;
    kajiyaTSL(TSL, mat, direction);
  } else {
    mat.onBeforeCompile = shader => {
      shader.uniforms.uHwHairKeyDir = keyDir;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 hairTangent;\nvarying vec3 vHwHairTangent;')
        .replace('#include <skinnormal_vertex>', `#include <skinnormal_vertex>
vec3 hwHairTangent = hairTangent;
#ifdef USE_SKINNING
hwHairTangent = (skinMatrix * vec4(hwHairTangent, 0.0)).xyz;
#endif
vHwHairTangent = normalize(normalMatrix * hwHairTangent);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vHwHairTangent;\nuniform vec3 uHwHairKeyDir;')

        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
vec3 hwHairT = normalize(vHwHairTangent);
vec3 hwHairV = normalize(vViewPosition);
vec3 hwHairL = normalize(uHwHairKeyDir);
vec3 hwHairH = normalize(hwHairL + hwHairV);
float hwHairWrap = clamp(dot(normal, hwHairL) * 0.5 + 0.5, 0.0, 1.0);
vec3 hwHairPrimaryT = normalize(hwHairT + normal * 0.1);
vec3 hwHairSecondaryT = normalize(hwHairT - normal * 0.1);
float hwHairPrimaryDot = dot(hwHairPrimaryT, hwHairH);
float hwHairSecondaryDot = dot(hwHairSecondaryT, hwHairH);
float hwHairPrimary = pow(sqrt(max(0.0, 1.0 - hwHairPrimaryDot * hwHairPrimaryDot)), 90.0) * 0.22;
float hwHairSecondary = pow(sqrt(max(0.0, 1.0 - hwHairSecondaryDot * hwHairSecondaryDot)), 28.0) * 0.10;
reflectedLight.directSpecular += (vec3(0.90, 0.82, 0.68) * hwHairPrimary + diffuseColor.rgb * hwHairSecondary) * hwHairWrap;`);
    };
    mat.customProgramCacheKey = () => `hewen-kajiya-${mesh.name}`;
  }
  mat.needsUpdate = true;
  uniformSets.push(keyDir);
}

export function createHairCardLod(T, sourceMesh, headBone) {
  sourceMesh.geometry.computeBoundingBox();
  const box = sourceMesh.geometry.boundingBox;
  const center = box.getCenter(new T.Vector3());
  const radiusX = Math.max((box.max.x - box.min.x) * 0.52, 0.02);
  const radiusZ = Math.max((box.max.z - box.min.z) * 0.52, 0.02);
  const headIndex = sourceMesh.skeleton.bones.indexOf(headBone);
  const cards = [];
  for (let cardIndex = 0; cardIndex < 10; cardIndex++) {
    const theta = cardIndex / 10 * Math.PI * 2;
    const positions = [];
    const normals = [];
    const uvs = [];
    const tangents = [];
    const skinIndices = [];
    const skinWeights = [];
    const indices = [];
    const rows = 7;
    const cols = 5;
    const bottom = box.min.y + (Math.cos(theta) > 0.35 ? (box.max.y - box.min.y) * 0.28 : 0);
    for (let row = 0; row < rows; row++) {
      const v = row / (rows - 1);
      for (let col = 0; col < cols; col++) {
        const u = col / (cols - 1);
        const phi = theta + (u - 0.5) * 0.62;
        const crown = Math.sin(v * Math.PI) * (box.max.y - box.min.y) * 0.035;
        positions.push(center.x + Math.sin(phi) * radiusX, bottom + (box.max.y - bottom) * v + crown, center.z + Math.cos(phi) * radiusZ);
        const normal = new T.Vector3(Math.sin(phi), 0.25, Math.cos(phi)).normalize();
        normals.push(normal.x, normal.y, normal.z);
        const tangent = new T.Vector3(Math.sin(phi) * 0.15, 1, -Math.cos(phi) * 0.15).normalize();
        tangents.push(tangent.x, tangent.y, tangent.z);
        uvs.push(u, v);
        skinIndices.push(headIndex, 0, 0, 0);
        skinWeights.push(1, 0, 0, 0);
      }
    }
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const a = row * cols + col;
        const b = a + 1;
        const c = a + cols;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('hairTangent', new T.Float32BufferAttribute(tangents, 3));
    geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(skinIndices, 4));
    geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(skinWeights, 4));
    geometry.setIndex(indices);
    const material = sourceMesh.material.clone();
    material.side = T.DoubleSide;
    const card = new T.SkinnedMesh(geometry, material);
    card.name = `HeWen_HairCardsLOD1_${String(cardIndex + 1).padStart(2, '0')}`;
    card.bind(sourceMesh.skeleton, sourceMesh.bindMatrix);
    card.bindMode = sourceMesh.bindMode;
    card.bindMatrixInverse.copy(sourceMesh.bindMatrixInverse);
    card.position.copy(sourceMesh.position);
    card.quaternion.copy(sourceMesh.quaternion);
    card.scale.copy(sourceMesh.scale);
    card.frustumCulled = false;
    card.visible = false;
    card.userData.approximation = 'Procedural placeholder card fitted to source hair bounds';
    cards.push(card);
  }
  const geometry = mergeGeometries(cards.map(card => card.geometry), false);
  const combined = new T.SkinnedMesh(geometry, cards[0].material);
  combined.name = 'HeWen_HairCardsLOD1';
  combined.bind(sourceMesh.skeleton, sourceMesh.bindMatrix);
  combined.bindMode = sourceMesh.bindMode;
  combined.bindMatrixInverse.copy(sourceMesh.bindMatrixInverse);
  combined.position.copy(sourceMesh.position);
  combined.quaternion.copy(sourceMesh.quaternion);
  combined.scale.copy(sourceMesh.scale);
  combined.frustumCulled = false;
  combined.visible = false;
  combined.userData.cardCount = cards.length;
  combined.userData.approximation = 'Ten procedural placeholder cards merged into one skinned draw mesh';
  sourceMesh.parent.add(combined);
  return [combined];
}