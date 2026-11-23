const physicalCache = new Map();

export function ensurePhysicalMaterial(T, mat) {
  if (mat.isMeshPhysicalMaterial) return mat;
  if (physicalCache.has(mat)) return physicalCache.get(mat);
  const physical = new T.MeshPhysicalMaterial();
  for (const key of [
    'name', 'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'alphaMap', 'emissiveMap', 'envMap',
    'roughness', 'metalness', 'aoMapIntensity', 'emissiveIntensity', 'envMapIntensity', 'alphaTest', 'transparent',
    'opacity', 'side', 'depthWrite', 'depthTest', 'vertexColors', 'flatShading', 'blending', 'toneMapped'
  ]) {
    if (mat[key] !== undefined) physical[key] = mat[key];
  }
  physical.color.copy(mat.color);
  physical.emissive.copy(mat.emissive);
  if (mat.normalScale) physical.normalScale.copy(mat.normalScale);
  physical.userData = { ...mat.userData };
  physicalCache.set(mat, physical);
  return physical;
}

export function applyWardrobeMaterial(T, mat, node, maxAnisotropy, environment) {
  for (const value of Object.values(mat)) {
    if (value?.isTexture) value.anisotropy = maxAnisotropy;
  }
  mat.toneMapped = true;
  const label = `${node.name} ${mat.name}`;
  if (/Cotton|Cloth|Clothes|Tunic|Collar|Pocket|Placket|ShoulderStrap|EightPanelCap|CapVisor|TrimFlap/i.test(label) && !/Leather|Button|Buckle/i.test(label)) {
    if (mat.isMeshPhysicalMaterial) {
      mat.sheen = 0.35;
      mat.sheenRoughness = 0.6;
      mat.sheenColor.set('#fff1dc');
    }
    mat.userData.surfaceClass = 'cotton';
  }
  if (/Leather/i.test(label)) {
    if (mat.isMeshPhysicalMaterial) {
      mat.clearcoat = 0.15;
      mat.clearcoatRoughness = 0.38;
    }
    mat.userData.surfaceClass = 'leather';
  }
  if (/CapRedStar|BeltBuckle|MatteButtons|TunicButton|ShoulderButton|CollarHook/i.test(label)) {
    mat.metalness = 1;
    mat.roughness = Math.min(Math.max(mat.roughness || 0.42, 0.28), 0.58);
    mat.envMap = environment;
    mat.envMapIntensity = 0.95;
    mat.userData.surfaceClass = 'metal';
  }
}