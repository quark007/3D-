(() => {
  'use strict';
  const M = window.CZMarchWorld._;
  const paths = {
    commander: '/assets/models-v03/char_commander.glb',
    logistics: '/assets/models-v03/char_logistics.glb',
    soldier: '/assets/models-v03/char_soldier.glb',
    medic: '/assets/models-v03/char_medic.glb'
  };
  const DEFAULT_HEIGHT = 1.76;
  const CHARACTER_PROFILES = {
    he_wen: { glbUrl: '/assets/characters/he-wen/he-wen-web.glb', height: 1.78, scaleBias: 1, idle: 'Idle' },
    wang_gui: { height: 1.70 },
    chen_xiaoman: { height: 1.67 },
    medic_1: { height: 1.61 },
    logistics_1: { height: 1.73 },
    liaison_1: { height: 1.65 },
    boatman_1: { height: 1.74 },
    guide_1: { height: 1.68 },
    civilian_1: { height: 1.63 }
  };
  const headings = { e: 0, s: Math.PI / 2, w: Math.PI, n: -Math.PI / 2 };
  const npcKey = anchor => M.anchors.npcKey(anchor.anchorId, anchor.label);

  async function loadModel(T, GLTFLoader, draco, url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw Error(`人物模型 ${url} HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const loader = new GLTFLoader().setDRACOLoader(draco);
    loader.register(parser => ({
      name: 'CZ_embedded_images',
      beforeRoot() {
        // Embedded images use img-src blob:, without widening connect-src for ImageBitmap fetches.
        parser.textureLoader = new T.TextureLoader(parser.options.manager);
      }
    }));
    return loader.parseAsync(data, url.slice(0, url.lastIndexOf('/') + 1));
  }

  function disposeModels(sources) {
    const resources = new Set();
    for (const source of sources) source.scene.traverse(node => {
      if (node.isSkinnedMesh) resources.add(node.skeleton);
      if (node.geometry) resources.add(node.geometry);
      for (const material of [].concat(node.material || [])) {
        resources.add(material);
        for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
      }
    });
    for (const resource of resources) resource.dispose();
  }

  const hasModel = anchor => anchor.kind === 'npc' && npcKey(anchor) !== 'narrator';

  async function create(T, logicalScene, parent, signal) {
    const [{ GLTFLoader }, { DRACOLoader }, skeleton] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js'),
      import('three/addons/utils/SkeletonUtils.js')
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const independentUrls = new Set(logicalScene.anchors.filter(hasModel)
      .map(anchor => CHARACTER_PROFILES[npcKey(anchor)]?.glbUrl).filter(Boolean));
    const loaded = new Map();
    const urls = new Set([...Object.values(paths), ...independentUrls]);
    const draco = new DRACOLoader().setDecoderPath('/assets/webgpu40/vendor/three/jsm/libs/draco/gltf/');
    const results = await Promise.allSettled([...urls].map(async url => {
      try {
        const source = await loadModel(T, GLTFLoader, draco, url, signal);
        loaded.set(url, source);
      } catch (error) {
        if (signal?.aborted || !independentUrls.has(url)) throw error;
        console.warn(`独立人物模型回退：${url}`, error);
      }
    }));
    draco.dispose();
    const failure = results.find(result => result.status === 'rejected');
    if (failure || signal?.aborted) {
      disposeModels(loaded.values());
      throw failure?.reason ?? new DOMException('Aborted', 'AbortError');
    }

    const actors = [];
    const npcActors = new Map();
    const frustum = new T.Frustum(), projection = new T.Matrix4(), bounds = new T.Sphere(new T.Vector3(), 3);
    let playerActor = null;
    let dialogueAnchorId = null;
    function focusDialogue(event) {
      const { sceneId, anchorId } = event.detail || {};
      if (sceneId === logicalScene.sceneId) dialogueAnchorId = anchorId;
    }
    window.addEventListener('czmarch:interact', focusDialogue);

    function makeActor(role, height, profile = {}, style = {}, anchor) {
      const independent = loaded.get(profile.glbUrl);
      const source = independent || loaded.get(paths[role]);
      const materials = new Map();
      function tint(material) {
        const color = material.name === 'skin' ? style.skin : style.coat;
        if (independent || !color || !material.color) return material;
        if (!materials.has(material)) {
          const variant = material.clone();
          variant.color.lerp(new T.Color(color), .25);
          materials.set(material, variant);
        }
        return materials.get(material);
      }
      const model = skeleton.clone(source.scene);
      const bounds = new T.Box3().setFromObject(model);
      const size = bounds.getSize(new T.Vector3());
      const center = bounds.getCenter(new T.Vector3());
      const scale = height * (profile.scaleBias ?? 1) / Math.max(size.y, 0.01);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      model.traverse(node => {
        if (!node.isMesh) return;
        if (node.material) node.material = Array.isArray(node.material) ? node.material.map(tint) : tint(node.material);
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
      });
      const root = new T.Group();
      root.name = 'march-actor-' + role;
      if (anchor) {
        root.userData.anchorId = anchor.anchorId;
        root.userData.modelUrl = independent ? profile.glbUrl : paths[role];
      }
      root.add(model);
      parent.add(root);
      const mixer = new T.AnimationMixer(model);
      const actions = new Map();
      for (const clip of source.animations || []) actions.set(clip.name, mixer.clipAction(clip));
      const actor = { root, model, mixer, actions, current: null, role, materials, idle: profile.idle || 'Idle' };
      play(actor, actor.idle);
      actors.push(actor);
      return actor;
    }

    function play(actor, name) {
      const next = actor.actions.get(name) || actor.actions.get(actor.idle) || actor.actions.values().next().value;
      if (!next || actor.current === next) return;
      actor.current?.fadeOut(0.16);
      next.reset().fadeIn(0.16).play();
      actor.current = next;
    }

    function place(actor, x, y, facing, surfaceHeight) {
      actor.root.position.set(x - logicalScene.world.w / 2, surfaceHeight(x, y), y - logicalScene.world.h / 2);
      if (Number.isFinite(facing)) actor.root.rotation.y = Math.atan2(Math.cos(facing), Math.sin(facing));
    }

    function disposeActor(actor) {
      actor.mixer.stopAllAction();
      actor.mixer.uncacheRoot(actor.model);
      const skeletons = new Set();
      actor.model.traverse(node => { if (node.isSkinnedMesh) skeletons.add(node.skeleton); });
      for (const skeleton of skeletons) skeleton.dispose();
      for (const material of actor.materials.values()) material.dispose();
      parent.remove(actor.root);
    }

    function ensurePlayer(role) {
      role = paths[role] ? role : 'soldier';
      if (playerActor?.role === role) return;
      if (playerActor) {
        disposeActor(playerActor);
        actors.splice(actors.indexOf(playerActor), 1);
      }
      playerActor = makeActor(role, 1.8);
      const variants = new Map();
      const cloneForFade = material => {
        if (!variants.has(material)) variants.set(material, material.clone());
        return variants.get(material);
      };
      playerActor.model.traverse(node => {
        if (!node.isMesh || !node.material) return;
        node.material = Array.isArray(node.material) ? node.material.map(cloneForFade) : cloneForFade(node.material);
      });
      playerActor.fadeMaterials = [...variants.entries()];
      for (const [original, variant] of variants) playerActor.materials.set(original, variant);
      playerActor.fade = 1;
    }

    function visibleAnchor(anchor, anchors) {
      if (!anchor.enabled && !anchor.completed) return false;
      return !anchors.some(other => {
        if (other === anchor || !hasModel(other) || (!other.enabled && !other.completed)) return false;
        const preferred = Number(other.near) - Number(anchor.near);
        return Math.hypot(other.x - anchor.x, other.y - anchor.y) < 1.5 &&
          (preferred > 0 || (preferred === 0 && anchors.indexOf(other) < anchors.indexOf(anchor)));
      });
    }

    return {
      ensurePlayer,
      update(dt, player, anchors, camera, surfaceHeight, cameraDistance) {
        projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projection);
        if (player.moving) dialogueAnchorId = null;
        ensurePlayer(player.roleId);
        place(playerActor, player.x, player.y, player.facing, surfaceHeight);
        playerActor.root.position.y += player.jumpHeight;
        const fade = cameraDistance >= .55
          ? T.MathUtils.clamp(1 - (1.05 - cameraDistance) * 1.7, .15, 1)
          : .15 * T.MathUtils.clamp((cameraDistance - .25) / .30, 0, 1);
        if (fade !== playerActor.fade) {
          playerActor.fade = fade;
          for (const [original, material] of playerActor.fadeMaterials) {
            const transparent = fade < 1 || original.transparent;
            if (material.transparent !== transparent) {
              material.transparent = transparent;
              material.needsUpdate = true;
            }
            material.opacity = original.opacity * fade;
            material.depthWrite = fade === 1 && original.depthWrite;
          }
        }
        play(playerActor, player.airborne && playerActor.actions.has('Jump') ? 'Jump' :
          player.running && playerActor.actions.has('Run') ? 'Run' : player.moving ? 'Walk' : 'Idle');
        if (playerActor.current) {
          const strideRate = player.speed / (player.running && playerActor.actions.has('Run') ? 6.5 : 1.8);
          playerActor.current.timeScale = player.airborne || !player.moving ? 1 :
            player.reversing ? -strideRate : strideRate;
        }
        const localActors = new Map();
        if (logicalScene.streetModel) {
          for (const anchor of anchors) {
            if (!hasModel(anchor) || !visibleAnchor(anchor, anchors)) continue;
            const distance = Math.hypot(anchor.x - player.x, anchor.y - player.y);
            const score = distance - (anchor.anchorId === dialogueAnchorId ? 100 : 0);
            const key = npcKey(anchor);
            if (distance < (logicalScene.streetModel.actorRange ?? 18) && score < (localActors.get(key)?.score ?? Infinity)) localActors.set(key, { anchor, score });
          }
        }
        for (const anchor of anchors) {
          if (!hasModel(anchor)) continue;
          bounds.center.set(anchor.x - logicalScene.world.w / 2, surfaceHeight(anchor.x, anchor.y) + 1, anchor.y - logicalScene.world.h / 2);
          const nearby = !logicalScene.streetModel || localActors.get(npcKey(anchor))?.anchor === anchor;
          const visible = nearby && visibleAnchor(anchor, anchors) && frustum.intersectsSphere(bounds);
          let actor = npcActors.get(anchor.anchorId);
          if (!visible) { if (actor) actor.root.visible = false; continue; }
          if (!actor) {
            const key = npcKey(anchor);
            const profile = CHARACTER_PROFILES[key] || {};
            const style = M.anchors.NPC_STYLES[key] || {};
            actor = makeActor(style.role || 'soldier', profile.height ?? DEFAULT_HEIGHT, profile, style, anchor);
            const facing = anchor.facing ?? logicalScene.npcFacing ?? logicalScene.spawn?.facing;
            const heading = Number.isFinite(facing) ? facing : headings[facing] ?? Math.PI / 2;
            actor.initialYaw = Math.atan2(Math.cos(heading), Math.sin(heading));
            actor.root.rotation.y = actor.initialYaw;
            npcActors.set(anchor.anchorId, actor);
          }
          actor.root.visible = true;
          place(actor, anchor.x, anchor.y, undefined, surfaceHeight);
          const dx = player.x - anchor.x, dz = player.y - anchor.y;
          const distance = Math.hypot(dx, dz);
          const engaged = anchor.near || anchor.anchorId === dialogueAnchorId;
          const yaw = distance > .01 && (engaged || distance < 6) ? Math.atan2(dx, dz) : actor.initialYaw;
          const delta = yaw - actor.root.rotation.y;
          actor.root.rotation.y += Math.atan2(Math.sin(delta), Math.cos(delta)) * (1 - Math.exp(-8 * dt));
          play(actor, engaged ? 'Talk' : actor.idle);
        }
        for (const actor of actors) if (actor.root.visible) actor.mixer.update(dt);
      },
      dispose() {
        window.removeEventListener('czmarch:interact', focusDialogue);
        for (const actor of actors) disposeActor(actor);
        actors.length = 0;
        npcActors.clear();
        disposeModels(loaded.values());
        loaded.clear();
        playerActor = null;
      }
    };
  }

  M.actors3d = { create };
})();
