import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'assets/characters/he-wen/he-wen-web.glb');
const bytes = fs.readFileSync(file);
if (bytes.toString('ascii', 0, 4) !== 'glTF') throw new Error('Not a GLB file');
const jsonLength = bytes.readUInt32LE(12);
const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength).trim());
const binStart = 28 + jsonLength;

function imageSize(imageIndex) {
  const image = gltf.images?.[imageIndex];
  if (!image) return null;
  const view = gltf.bufferViews[image.bufferView];
  const start = binStart + (view.byteOffset || 0);
  const data = bytes.subarray(start, start + view.byteLength);
  if (data.readUInt32BE(0) === 0x89504e47) return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
  if (data.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < data.length) {
      if (data[offset] !== 0xff) break;
      const marker = data[offset + 1];
      const length = data.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: data.readUInt16BE(offset + 7), height: data.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  return { width: 0, height: 0 };
}

function textureSize(textureRef) {
  if (!textureRef) return null;
  const texture = gltf.textures[textureRef.index];
  return imageSize(texture.source);
}

const meshNames = new Map();
for (const node of gltf.nodes || []) {
  if (node.mesh === undefined) continue;
  if (!meshNames.has(node.mesh)) meshNames.set(node.mesh, []);
  meshNames.get(node.mesh).push(node.name || gltf.meshes[node.mesh].name || `mesh-${node.mesh}`);
}
const users = new Map();
let triangles = 0;
for (const [meshIndex, mesh] of (gltf.meshes || []).entries()) {
  for (const primitive of mesh.primitives) {
    const material = primitive.material;
    if (material === undefined) continue;
    if (!users.has(material)) users.set(material, new Set());
    for (const name of meshNames.get(meshIndex) || [mesh.name || `mesh-${meshIndex}`]) users.get(material).add(name);
    triangles += (gltf.accessors[primitive.indices].count) / 3;
  }
}
const thinSheet = name => /HairStrand|BrowStrand|LashHair|eyebrow|short04|TrimFlap|Tear/i.test(name);
const audit = (gltf.materials || []).map((material, index) => {
  const name = material.name || `material-${index}`;
  const keepDouble = thinSheet(name);
  return {
    index,
    material: name,
    meshes: [...(users.get(index) || [])],
    doubleSided: material.doubleSided === true,
    alphaMode: material.alphaMode || 'OPAQUE',
    baseColor: textureSize(material.pbrMetallicRoughness?.baseColorTexture),
    normal: textureSize(material.normalTexture),
    keepDouble,
    targetSide: keepDouble ? 'DoubleSide' : 'FrontSide'
  };
});
console.log(JSON.stringify({ file: path.relative(root, file), meshCount: gltf.meshes.length, materialCount: audit.length, imageCount: gltf.images?.length || 0, triangles, audit }, null, 2));