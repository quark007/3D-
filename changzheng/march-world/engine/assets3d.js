(() => {
  'use strict';
  const M = window.CZMarchWorld._;

  async function load(T, signal, streetModel, compoundOnly = false) {
    const textures = {}, models = {};
    const collect = (geometries, materials, maps) => {
      for (const set of Object.values(textures)) for (const texture of Object.values(set)) if (texture) maps.add(texture);
      for (const model of Object.values(models)) model.traverse(object => {
        if (object.geometry) geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!material) continue;
          materials.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) maps.add(value);
        }
      });
    };
    const dispose = () => {
      const geometries = new Set(), materials = new Set(), maps = new Set();
      collect(geometries, materials, maps);
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials) material.dispose();
      for (const texture of maps) { texture.dispose(); texture.image?.close?.(); }
    };
    const response = await fetch('/assets/pbr/manifest.json', { signal });
    if (!response.ok) throw Error('场景材质清单 HTTP ' + response.status);
    const manifest = await response.json();
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js')
    ]);
    signal?.throwIfAborted();
    const draco = new DRACOLoader().setDecoderPath('/assets/webgpu40/vendor/three/jsm/libs/draco/gltf/');
    const jobs = [];
    for (const key of (compoundOnly ? [] : ['earth', 'wood', 'plaster', 'roof', 'rock'])) {
      textures[key] = {};
      for (const [channel, info] of Object.entries(manifest[key].maps)) jobs.push((async () => {
        const response = await fetch('/' + (info.webPath || info.path), { signal });
        if (!response.ok) throw Error(`${key}/${channel} HTTP ${response.status}`);
        const image = await createImageBitmap(await response.blob(), { imageOrientation: 'flipY', colorSpaceConversion: 'none' });
        if (signal?.aborted) { image.close(); signal.throwIfAborted(); }
        const texture = new T.Texture(image);
        texture.colorSpace = channel === 'diffuse' ? T.SRGBColorSpace : T.NoColorSpace;
        texture.wrapS = texture.wrapT = T.RepeatWrapping;
        texture.needsUpdate = true;
        textures[key][channel] = texture;
      })());
    }
    const sources = {
      tree: '/assets/models/tree_small_02/tree-cinema.glb',
      rock: '/assets/models/rock_07/model.gltf',
      crate: '/assets/models/wooden_crate_01/model.gltf',
      fern: '/assets/models/fern_02/model.gltf',
      playerArms: '/assets/characters/player/fps-arms-web.glb'
    };
    if (compoundOnly) for (const key of ['tree','rock','crate','fern']) delete sources[key];
    if (streetModel?.gallery) sources.gallery = streetModel.gallery;
    if (streetModel) sources.street = streetModel.url;
    for (const [key, url] of Object.entries(sources)) jobs.push((async () => {
      const response = await fetch(url, { signal });
      if (!response.ok) throw Error(`${key} HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      signal?.throwIfAborted();
      const loader = new GLTFLoader().setDRACOLoader(draco);
      loader.register(parser => ({ name: 'CZ_embedded_images', beforeRoot() { parser.textureLoader = new T.TextureLoader(parser.options.manager); } }));
      const source = await loader.parseAsync(bytes, url.slice(0, url.lastIndexOf('/') + 1));
      models[key] = source.scene;
      source.scene.traverse(object => {
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          if (material?.transparent && !material.name.startsWith('WestPane_')) {
            material.transparent = false;
            material.alphaTest = .45;
            material.depthWrite = true;
          }
        }
      });
      signal?.throwIfAborted();
    })().catch(error => {
      if (key !== 'playerArms' || signal?.aborted) throw error;
      console.warn('第一人称双手加载失败', error);
    }));
    const results = await Promise.allSettled(jobs);
    draco.dispose();
    const failed = results.find(result => result.status === 'rejected');
    if (failed || signal?.aborted) {
      dispose();
      if (failed) throw failed.reason;
      signal.throwIfAborted();
    }
    if (models.gallery) models.street.add(models.gallery);
    if (compoundOnly) {
      // The terrain mesh is used only for picking. The porch reuses the manor timber.
      textures.earth = {};
      let wood;
      models.street.traverse(o=>{if(o.material?.name==='ZY_wood') wood=o.material;});
      textures.wood = wood ? {diffuse:wood.map,normal:wood.normalMap,roughness:wood.roughnessMap} : {};
    }
    return { textures, models, collect };
  }

  M.assets3d = { load };
})();
