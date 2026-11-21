import * as T from 'three';

/** Visual bridge exhibit. Dimensions/placement are illustrative, not a surveyed reconstruction. */
export function makeBridge(economy = false) {
  const group = new T.Group();
  const wood = new T.MeshStandardMaterial({ color: 0x71513a, roughness: .94 });
  const iron = new T.MeshStandardMaterial({ color: 0x363e40, roughness: .72, metalness: .62 });
  const stone = new T.MeshStandardMaterial({ color: 0x93918a, roughness: 1 });
  const deck = new T.InstancedMesh(new T.BoxGeometry(.72, .16, 3.25), wood, 132);
  const dummy = new T.Object3D();
  const sag = x => 2.8 * (1 - (x / 50) ** 2);
  for (let i = 0; i < 132; i++) {
    const x = -49.5 + i * 99 / 131; dummy.position.set(x, -sag(x), 0);
    dummy.rotation.set(0, 0, Math.sin(i * 2.1) * .012); dummy.updateMatrix(); deck.setMatrixAt(i, dummy.matrix);
  }
  deck.castShadow = deck.receiveShadow = true; group.add(deck);
  // Thirteen iron lines: nine carrying the deck and four handrails.
  const links = economy ? 140 : 280;
  const ringGeometry = new T.TorusGeometry(.18, .045, economy ? 4 : 5, economy ? 6 : 8);
  const chains = new T.InstancedMesh(ringGeometry, iron, 13 * links);
  let index = 0;
  for (let cable = 0; cable < 13; cable++) {
    const z = cable < 9 ? -1.45 + cable * 2.9 / 8 : (cable % 2 ? -1 : 1) * 1.8;
    const railY = cable < 9 ? -.22 : cable < 11 ? .7 : 1.45;
    for (let i = 0; i < links; i++) {
      const x = -50 + i * 100 / (links - 1); dummy.position.set(x, -sag(x) + railY, z);
      dummy.rotation.set(i % 2 ? Math.PI / 2 : 0, 0, .056 * x / 50); dummy.updateMatrix(); chains.setMatrixAt(index++, dummy.matrix);
    }
  }
  chains.castShadow = true; group.add(chains);
  for (const x of [-52, 52]) {
    const anchor = new T.Mesh(new T.BoxGeometry(5, 8, 9), stone); anchor.position.set(x, -3.3, 0); anchor.castShadow = true; group.add(anchor);
    for (const z of [-2.5, 2.5]) {
      const pillar = new T.Mesh(new T.BoxGeometry(1, 5, 1), stone); pillar.position.set(x, 2, z); group.add(pillar);
    }
    const beam = new T.Mesh(new T.BoxGeometry(1.4, 1, 6), stone); beam.position.set(x, 4.5, 0); group.add(beam);
  }
  group.scale.setScalar(1 / 60); group.name = '泸定桥结构示意_非测绘复原';
  return group;
}
