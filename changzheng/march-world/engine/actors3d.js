(() => {
  'use strict';
  const M = window.CZMarchWorld._;
  const paths = {
    commander: '/assets/models-v03/char_commander.glb',
    logistics: '/assets/models-v03/char_logistics.glb',
    soldier: '/assets/models-v03/char_soldier.glb',
    medic: '/assets/models-v03/char_medic.glb'
  };
  const cache = new Map();

  async function loadRole(T, GLTFLoader, role, signal) {
    if (cache.has(role)) return cache.get(role);
    const response = await fetch(paths[role], { signal });
    if (!response.ok) throw Error(`人物模型 ${role} HTTP ${response.status}`);
    const data = await response.arrayBuffer();
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const loader = new GLTFLoader();
    loader.register(parser => ({
      name: 'CZ_embedded_images',
      beforeRoot() {
        // Embedded images use img-src blob:, without widening connect-src for ImageBitmap fetches.
        parser.textureLoader = new T.TextureLoader(parser.options.manager);
      }
    }));
    const source = await loader.parseAsync(data, '/assets/models-v03/');
    cache.set(role, source);
    return source;
  }

  function roleForAnchor(anchor) {
    const key = M.anchors.npcKey(anchor.anchorId, anchor.label);
    const style = M.anchors.NPC_STYLES[key] || {};
    return style.role || 'soldier';
  }

  const hasModel = anchor => anchor.kind === 'npc' && M.anchors.npcKey(anchor.anchorId, anchor.label) !== 'narrator';

  async function create(T, logicalScene, parent, signal, playerRole = 'soldier') {
    const [{ GLTFLoader }, skeleton] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/utils/SkeletonUtils.js')
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const roles = new Set([paths[playerRole] ? playerRole : 'soldier']);
    for (const anchor of logicalScene.anchors) if (hasModel(anchor)) roles.add(roleForAnchor(anchor));
    const loaded = new Map();
    await Promise.all([...roles].map(async role => {
      loaded.set(role, await loadRole(T, GLTFLoader, role, signal));
    }));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const actors = [];
    const npcActors = new Map();
    const frustum = new T.Frustum(), projection = new T.Matrix4(), bounds = new T.Sphere(new T.Vector3(), 3);
    let playerActor = null;

    function makeActor(role, height = 1.78) {
      const source = loaded.get(role) || loaded.get('soldier');
      const model = skeleton.clone(source.scene);
      const bounds = new T.Box3().setFromObject(model);
      const size = bounds.getSize(new T.Vector3());
      const center = bounds.getCenter(new T.Vector3());
      const scale = height / Math.max(size.y, 0.01);
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      model.traverse(node => {
        if (!node.isMesh) return;
        node.castShadow = true;
        node.receiveShadow = true;
        node.frustumCulled = false;
      });
      const root = new T.Group();
      root.name = 'march-actor-' + role;
      root.add(model);
      parent.add(root);
      const mixer = new T.AnimationMixer(model);
      const actions = new Map();
      for (const clip of source.animations || []) actions.set(clip.name, mixer.clipAction(clip));
      const actor = { root, model, mixer, actions, current: null, role };
      play(actor, 'Idle');
      actors.push(actor);
      return actor;
    }

    function play(actor, name) {
      const next = actor.actions.get(name) || actor.actions.get('Idle') || actor.actions.values().next().value;
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
      update(dt, player, anchors, camera, surfaceHeight) {
        projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projection);
        ensurePlayer(player.roleId);
        place(playerActor, player.x, player.y, player.facing, surfaceHeight);
        play(playerActor, player.moving ? 'Walk' : 'Idle');
        for (const anchor of anchors) {
          if (!hasModel(anchor)) continue;
          bounds.center.set(anchor.x - logicalScene.world.w / 2, surfaceHeight(anchor.x, anchor.y) + 1, anchor.y - logicalScene.world.h / 2);
          const visible = visibleAnchor(anchor, anchors) && frustum.intersectsSphere(bounds);
          let actor = npcActors.get(anchor.anchorId);
          if (!visible) { if (actor) actor.root.visible = false; continue; }
          if (!actor) {
            actor = makeActor(roleForAnchor(anchor), 1.76);
            npcActors.set(anchor.anchorId, actor);
          }
          actor.root.visible = true;
          place(actor, anchor.x, anchor.y, Math.PI / 2, surfaceHeight);
          play(actor, anchor.near ? 'Talk' : 'Idle');
        }
        for (const actor of actors) if (actor.root.visible) actor.mixer.update(dt);
      },
      dispose() {
        for (const actor of actors) disposeActor(actor);
        actors.length = 0;
        npcActors.clear();
        playerActor = null;
      }
    };
  }

  M.actors3d = { create };
})();
