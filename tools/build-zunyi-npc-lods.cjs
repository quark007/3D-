/* Build the scene LODs from the independent Draco assets. Set ZUNYI_ASSET_TOOLS to the dependency directory. */
'use strict';
const path = require('node:path');
const { createRequire } = require('node:module');
const dep = process.env.ZUNYI_ASSET_TOOLS ? createRequire(path.join(path.resolve(process.env.ZUNYI_ASSET_TOOLS), 'package.json')) : require;
const { NodeIO } = dep('@gltf-transform/core');
const { ALL_EXTENSIONS } = dep('@gltf-transform/extensions');
const { draco, simplify, joinPrimitives, prune } = dep('@gltf-transform/functions');
const { MeshoptSimplifier } = dep('meshoptimizer');
const draco3d = dep('draco3dgltf');

async function main() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.encoder': await draco3d.createEncoderModule(),
    'draco3d.decoder': await draco3d.createDecoderModule()
  });
  for (const name of ['he-wen', 'wang-gui', 'logistics']) {
    const base = path.join(__dirname, '..', 'changzheng', 'assets', 'characters', name, name);
    const doc = await io.read(base + '-web.glb');
    const root = doc.getRoot();
    const animated = new Set(root.listAnimations().flatMap(a => a.listChannels().map(c => c.getTargetNode())));
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: .23, error: .045 }));
    const materials = root.listMaterials();
    const groups = new Map();
    for (const node of root.listNodes()) {
      const mesh = node.getMesh();
      if (!mesh || !node.getSkin() || animated.has(node) || node.listChildren().length || !node.getParentNode()) continue;
      const [prim, extra] = mesh.listPrimitives();
      if (!prim || extra || prim.listTargets().length || prim.getMaterial()?.getAlphaMode() === 'BLEND') continue;
      const attributes = prim.listSemantics().sort().map(key => {
        const a = prim.getAttribute(key);
        return [key, a.getComponentType(), a.getType(), a.getNormalized()];
      });
      const key = JSON.stringify([root.listNodes().indexOf(node.getParentNode()), root.listSkins().indexOf(node.getSkin()),
        node.getMatrix(), materials.indexOf(prim.getMaterial()), prim.getMode(), attributes]);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ node, prim });
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const prim = joinPrimitives(group.map(entry => entry.prim));
      const [first, ...rest] = group;
      first.node.setMesh(doc.createMesh(first.node.getName()).addPrimitive(prim));
      rest.forEach(entry => entry.node.dispose());
    }
    await doc.transform(prune({ keepLeaves: true }), draco({ quantizePosition: 16, quantizeNormal: 12, quantizeTexcoord: 14, quantizeGeneric: 16 }));
    const draws = root.listMeshes().flatMap(mesh => mesh.listPrimitives());
    console.log(name, draws.length, draws.reduce((n, prim) => n + prim.getIndices().getCount() / 3, 0));
    await io.write(base + '-zunyi.glb', doc);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
