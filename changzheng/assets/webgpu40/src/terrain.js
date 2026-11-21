import * as T from 'three';

export function terrainMesh(data, kind, meshGrid = data.grid) {
  const n = data.grid, b = data.bounds, centreLat = (b.north + b.south) / 2;
  const width = (b.east - b.west) * 111195 * Math.cos(centreLat * Math.PI / 180) / 60;
  const depth = (b.north - b.south) * 111195 / 60;
  const geometry = new T.PlaneGeometry(width, depth, meshGrid - 1, meshGrid - 1);
  geometry.rotateX(-Math.PI / 2);
  const p = geometry.attributes.position, colors = new Float32Array(meshGrid * meshGrid * 3);
  const low = new T.Color(kind === 'snow' ? 0xc2d0cd : 0x576957);
  const high = new T.Color(kind === 'snow' ? 0xe8eeee : 0xa9a28d), c = new T.Color();
  for (let i = 0; i < meshGrid * meshGrid; i++) {
    const lon = b.west + (i % meshGrid) / (meshGrid - 1) * (b.east - b.west);
    const lat = b.north - Math.floor(i / meshGrid) / (meshGrid - 1) * (b.north - b.south);
    const height = meshGrid === n ? (data.elevations[i] - data.min) / 60 : sample(lon, lat);
    p.setY(i, height);
    c.copy(low).lerp(high, height * 60 / Math.max(1, data.max - data.min));
    c.toArray(colors, i * 3);
  }
  geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: .96, metalness: 0 }));
  mesh.name = '真实SRTM区域地形'; mesh.receiveShadow = true;
  const toWorld = (lon, lat) => new T.Vector3((lon - (b.west + b.east) / 2) / (b.east - b.west) * width,
    sample(lon, lat), ((b.north + b.south) / 2 - lat) / (b.north - b.south) * depth);
  function sample(lon, lat) {
    const x = T.MathUtils.clamp((lon - b.west) / (b.east - b.west) * (n - 1), 0, n - 1);
    const y = T.MathUtils.clamp((b.north - lat) / (b.north - b.south) * (n - 1), 0, n - 1);
    const i = Math.min(n - 2, Math.floor(x)), j = Math.min(n - 2, Math.floor(y)), u = x - i, v = y - j;
    const at = (a, z) => data.elevations[z * n + a];
    const h = (at(i, j) * (1 - u) + at(i + 1, j) * u) * (1 - v) + (at(i, j + 1) * (1 - u) + at(i + 1, j + 1) * u) * v;
    return (h - data.min) / 60;
  }
  return { mesh, width, depth, bounds:b, maxHeight: (data.max - data.min) / 60, toWorld, sample };
}

export function clipWaterSegment(a, b, bounds) {
  if (!bounds || ![...a.slice(0,2),...b.slice(0,2)].every(Number.isFinite)) return null;
  const dx=b[0]-a[0],dy=b[1]-a[1];let lo=0,hi=1;
  for(const [p,q] of [[-dx,a[0]-bounds.west],[dx,bounds.east-a[0]],[-dy,a[1]-bounds.south],[dy,bounds.north-a[1]]]){
    if(p===0){if(q<0)return null;continue;}const u=q/p;
    if(p<0)lo=Math.max(lo,u);else hi=Math.min(hi,u);if(lo>hi)return null;
  }
  return [[a[0]+dx*lo,a[1]+dy*lo],[a[0]+dx*hi,a[1]+dy*hi]];
}

export function waterwaysMesh(geojson, terrain) {
  const group = new T.Group();
  // Map symbol width, not measured channel width; each vertex follows the DEM surface.
  const material = new T.LineBasicMaterial({ color: 0x63cee0, transparent: true, opacity: .85 });
  const points = [];
  for (const f of geojson.features || []) {
    const lines=f.geometry?.type==='MultiLineString'?f.geometry.coordinates:f.geometry?.type==='LineString'?[f.geometry.coordinates]:[];
    for (const coords of lines) {
    for (let i = 1; i < coords.length; i++) {
      const clipped=clipWaterSegment(coords[i-1],coords[i],terrain.bounds);if(!clipped)continue;
      const a = terrain.toWorld(...clipped[0]), b = terrain.toWorld(...clipped[1]);
      // Densify map lines to prevent chords cutting into mountain slopes.
      const steps = Math.min(4096, Math.max(1, Math.ceil(a.distanceTo(b) / 1.5)));
      for (let j = 0; j < steps; j++) {
        for (const u of [j / steps, (j + 1) / steps]) {
          const lon = T.MathUtils.lerp(clipped[0][0], clipped[1][0], u);
          const lat = T.MathUtils.lerp(clipped[0][1], clipped[1][1], u);
          const p = terrain.toWorld(lon, lat); p.y += .08; points.push(p.x, p.y, p.z);
        }
      }
    }
    }
  }
  const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3));
  group.add(new T.LineSegments(geometry, material)); group.name = '现代OSM水系地图符号'; return group;
}
