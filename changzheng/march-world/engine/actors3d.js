(() => {
  'use strict';
  const M = window.CZMarchWorld._;
  const SCRIPT_BASE = document.currentScript?.src || location.href;
  const paths = {
    commander: '/assets/models-v03/char_commander.glb',
    logistics: '/assets/models-v03/char_logistics.glb',
    soldier: '/assets/models-v03/char_soldier.glb',
    medic: '/assets/models-v03/char_medic.glb'
  };
  const DEFAULT_HEIGHT = 1.76;
  const CHARACTER_PROFILES = {
    he_wen: { glbUrl: '/assets/characters/he-wen/he-wen-web.glb', zunyiUrl: '/assets/characters/he-wen/he-wen-zunyi.glb', height: 1.78, scaleBias: 1, idle: 'Idle' },
    wang_gui: { glbUrl: '/assets/characters/wang-gui/wang-gui-web.glb', zunyiUrl: '/assets/characters/wang-gui/wang-gui-zunyi.glb', height: 1.70, scaleBias: 1, idle: 'Idle', weathering: 'wang_gui',
      roam: { speed: 1.35, hurrySpeed: 2.5, pace: 2.4, paceAway: 9 } },
    chen_xiaoman: { height: 1.67, glbUrl: '/assets/characters/chen-xiaoman/chen-xiaoman-web.glb', grounded: true },
    medic_1: { height: 1.61, glbUrl: '/assets/characters/medic/medic-web.glb', grounded: true },
    logistics_1: { glbUrl: '/assets/characters/logistics/logistics-field-web.glb', height: 1.73, grounded: true },
    liaison_1: { height: 1.65 },
    boatman_1: { height: 1.74, glbUrl: '/assets/characters/boatman/boatman-web.glb', grounded: true },
    guide_1: { height: 1.68, glbUrl: '/assets/characters/guide/guide-web.glb', grounded: true },
    civilian_1: { height: 1.63, glbUrl: '/assets/characters/civilian-farmer/civilian-farmer-web.glb', grounded: true }
  };
  const civilianWoman = {
    ...CHARACTER_PROFILES.civilian_1,
    glbUrl: '/assets/characters/civilian-woman/civilian-woman-web.glb'
  };
  const headings = { e: 0, s: Math.PI / 2, w: Math.PI, n: -Math.PI / 2 };
  const npcKey = anchor => M.anchors.npcKey(anchor.anchorId, anchor.label);

  const npcProfile = anchor => anchor.anchorId === 'chapter-11/anchor-dialogue-11-02-civilian_1'
    ? civilianWoman : CHARACTER_PROFILES[npcKey(anchor)];

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

  async function create(T, logicalScene, parent, signal, roleId='soldier') {
    const [{ GLTFLoader }, { DRACOLoader }, skeleton] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'),
      import('three/addons/loaders/DRACOLoader.js'),
      import('three/addons/utils/SkeletonUtils.js')
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const usedProfiles = new Set(logicalScene.anchors.filter(hasModel).map(npcProfile).filter(profile => profile?.glbUrl));
    const npcUrl = profile => logicalScene.streetLife && profile?.zunyiUrl ? profile.zunyiUrl : profile?.glbUrl;
    const independentUrls = new Map([...usedProfiles].map(profile => [npcUrl(profile), profile]));
    const weatheringReady = [...usedProfiles].some(profile => profile.weathering) && !M.characterWeathering
      ? import(new URL('character-weathering.js', SCRIPT_BASE).href).catch(error => console.warn('人物做旧模块不可用', error))
      : Promise.resolve();
    const loaded = new Map();
    const compact = logicalScene.sceneId === 'chapter-3/scene-zunyi';
    const fallbackFor = anchor => paths[M.anchors.NPC_STYLES[npcKey(anchor)]?.role] || paths.soldier;
    const baseUrls = compact ? [paths[roleId] || paths.soldier,
      ...logicalScene.anchors.filter(a=>hasModel(a)&&!npcProfile(a)?.glbUrl).map(fallbackFor)] : Object.values(paths);
    const urls = new Set([...baseUrls, ...independentUrls.keys()]);
    const draco = new DRACOLoader().setDecoderPath('/assets/webgpu40/vendor/three/jsm/libs/draco/gltf/');
    const results = await Promise.allSettled([...urls].map(async url => {
      try {
        const source = await loadModel(T, GLTFLoader, draco, url, signal);
        loaded.set(url, source);
      } catch (error) {
        if (signal?.aborted || !independentUrls.has(url)) throw error;
        const full = independentUrls.get(url).glbUrl;
        if (full !== url) {
          try {
            loaded.set(url, await loadModel(T, GLTFLoader, draco, full, signal));
            return;
          } catch (fullError) {
            if (signal?.aborted) throw fullError;
            error = fullError;
          }
        }
        console.warn(`独立人物模型回退：${full}`, error);
      }
    }));
    if (compact && !signal?.aborted) {
      const missing=new Set(logicalScene.anchors.filter(a=>hasModel(a)&&!loaded.has(npcUrl(npcProfile(a)||{}))).map(fallbackFor));
      for (const url of missing) if(!loaded.has(url)) {
        try { loaded.set(url,await loadModel(T,GLTFLoader,draco,url,signal)); }
        catch(reason) { results.push({status:'rejected',reason}); }
      }
    }
    draco.dispose();
    const failure = results.find(result => result.status === 'rejected');
    if (failure || signal?.aborted) {
      disposeModels(loaded.values());
      throw failure?.reason ?? new DOMException('Aborted', 'AbortError');
    }

    try {
      await weatheringReady;
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      for (const profile of usedProfiles) {
        const source = loaded.get(npcUrl(profile));
        if (profile.weathering && source) M.characterWeathering?.apply(T, source.scene, profile.weathering);
      }
    } catch (error) {
      if (signal?.aborted) {
        disposeModels(loaded.values());
        throw error;
      }
      console.warn('人物做旧模块不可用', error);
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
      const url = npcUrl(profile);
      const independent = loaded.get(url);
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
      // Use posed vertices for independent rigs whose armature bounds include their bind pose.
      if (independent) model.updateMatrixWorld(true);
      const bounds = independent && profile.grounded ? null : new T.Box3().setFromObject(model, Boolean(independent));
      if (bounds) {
        const size = bounds.getSize(new T.Vector3());
        const center = bounds.getCenter(new T.Vector3());
        const scale = height * (profile.scaleBias ?? 1) / Math.max(size.y, 0.01);
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      }
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
        root.userData.modelUrl = independent ? url : paths[role];
      }
      root.add(model);
      parent.add(root);
      const mixer = new T.AnimationMixer(model);
      const actions = new Map();
      for (const clip of source.animations || []) actions.set(clip.name, mixer.clipAction(clip));
      const faces = [];
      model.traverse(node => { if (node.morphTargetDictionary && ['browDownLeft', 'browUpLeft', 'smile'].some(name => name in node.morphTargetDictionary)) faces.push(node); });
      const actor = { root, model, mixer, actions, current: null, role, materials, idle: profile.idle || 'Idle', faces, exprTime: Math.random() * 10 };
      play(actor, actor.idle);
      actors.push(actor);
      return actor;
    }

    function setMorph(actor, name, value) {
      for (const node of actor.faces) {
        const index = node.morphTargetDictionary[name];
        if (index !== undefined) node.morphTargetInfluences[index] = value;
      }
    }
    // 交谈时眉头时紧时松，偶尔一侧挑眉；待机时偶尔露一点笑意。必须在 mixer.update 之后调用，否则会被动画轨覆盖
    function updateExpression(actor, dt, talking) {
      if (!actor.faces.length) return;
      const t = actor.exprTime += dt;
      const knit = talking ? .22 + .2 * Math.max(0, Math.sin(t * 1.25)) * Math.max(0, Math.sin(t * .37 + 1)) : .08;
      const raise = talking ? .3 * Math.max(0, Math.sin(t * .9 + 2)) ** 6 : 0;
      const smile = talking ? .08 * Math.max(0, Math.sin(t * .5)) : .18 * Math.max(0, Math.sin(t * .21)) ** 8;
      setMorph(actor, 'browDownLeft', knit); setMorph(actor, 'browDownRight', knit * .92);
      setMorph(actor, 'browUpLeft', raise); setMorph(actor, 'browUpRight', 0);
      setMorph(actor, 'smile', smile);
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
      playerActor.gait = { idle: playerActor.actions.get('Idle'), walk: playerActor.actions.get('Walk'), run: playerActor.actions.get('Run') };
      playerActor.gaitWeights = [1, 0, 0];
      playerActor.stride = 0;
      for (const action of Object.values(playerActor.gait)) action?.play();
    }

    const roamGrid = (() => {
      try {
        if (!M.path?.buildGrid) return null;
        return M.path.buildGrid(logicalScene.streetModel && !logicalScene.strictPlayable ? { ...logicalScene, blocked: [...(logicalScene.blocked || []), ...(logicalScene.streetBlocked || [])] } : logicalScene);
      } catch (error) { console.warn('[剧情人物走动] 行走网格生成失败，改为直接换位', error); return null; }
    })();
    const roamers = new Map();   // npcKey -> 状态
    const isRoaming = anchor => !logicalScene.strictPlayable && hasModel(anchor) && !!CHARACTER_PROFILES[npcKey(anchor)]?.roam;
    const storyOrder = anchor => { const m = /dialogue-\d+-(\d+)-/.exec(anchor.anchorId); return m ? Number(m[1]) : 99; };
    const wrapYaw = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
    function currentStation(list) {
      const talking = list.find(anchor => anchor.anchorId === dialogueAnchorId);
      if (talking) return talking;
      const sorted = [...list].sort((x, y) => storyOrder(x) - storyOrder(y));
      return sorted.find(anchor => anchor.enabled && !anchor.completed) || sorted.filter(anchor => anchor.completed).at(-1) || null;
    }
    function planRoute(r, x, y) {
      const raw = roamGrid ? M.path.findPath(roamGrid, r.x, r.y, x, y) : null;
      r.path = null;
      if (!raw?.length) return;
      const points = [{ x: r.x, y: r.y }, ...(raw || []).slice(1).map(point => ({ x: point.x, y: point.y }))];
      const last = points.at(-1);
      const tail = Math.hypot(last.x - x, last.y - y);
      const samples = Math.ceil(tail / .15);
      for (let i = 1; i <= samples; i++) {
        if (!M.path.walkableAt(roamGrid, last.x + (x - last.x) * i / samples, last.y + (y - last.y) * i / samples, .35)) return;
      }
      if (tail > .05) points.push({ x, y });
      r.path = points; r.seg = 0; r.segT = 0;
      r.remaining = points.slice(1).reduce((sum, point, i) => sum + Math.hypot(point.x - points[i].x, point.y - points[i].y), 0);
    }
    function advanceAlong(r, distance) {
      while (distance > 0 && r.seg < r.path.length - 1) {
        const s0 = r.path[r.seg], s1 = r.path[r.seg + 1], len = Math.hypot(s1.x - s0.x, s1.y - s0.y);
        if (len < 1e-6) { r.seg++; r.segT = 0; continue; }
        const left = len * (1 - r.segT);
        if (distance >= left) { distance -= left; r.remaining -= left; r.seg++; r.segT = 0; }
        else { r.segT += distance / len; r.remaining -= distance; distance = 0; }
      }
    }
    function spawnRoamer(key, station, surfaceHeight) {
      const profile = CHARACTER_PROFILES[key], style = M.anchors.NPC_STYLES[key] || {};
      const actor = makeActor(style.role || 'soldier', profile.height ?? DEFAULT_HEIGHT, profile, style, station);
      actor.root.name = 'march-roamer-' + key;
      const facing = station.facing ?? logicalScene.npcFacing ?? logicalScene.spawn?.facing;
      const heading = Number.isFinite(facing) ? facing : headings[facing] ?? Math.PI / 2;
      actor.initialYaw = Math.atan2(Math.cos(heading), Math.sin(heading));
      actor.root.rotation.y = actor.initialYaw;
      npcActors.set('roam:' + key, actor);
      const r = { key, actor, cfg: profile.roam, station, x: station.x, y: station.y, path: null, seg: 0, segT: 0, remaining: 0,
        mode: 'idle', wait: 2 + Math.random() * 4, heading: actor.initialYaw, canWalk: actor.actions.has('Walk') };
      if (!r.canWalk) console.info(`[剧情人物走动] ${key} 的模型没有 Walk 动画，换站位时直接换位`);
      place(actor, r.x, r.y, undefined, surfaceHeight);
      roamers.set(key, r);
      return r;
    }
    // 踱步：在站位 1.2~pace 米内找一个直线可达的点，走过去、站一会儿、再走回来
    function pickPaceTarget(r) {
      if (!roamGrid) return null;
      for (let tries = 0; tries < 8; tries++) {
        const angle = Math.random() * Math.PI * 2, d = 1.2 + Math.random() * (r.cfg.pace - 1.2);
        const x = r.station.x + Math.cos(angle) * d, y = r.station.y + Math.sin(angle) * d;
        let clear = true;
        for (let k = 1; k <= 6 && clear; k++) clear = M.path.walkableAt(roamGrid, r.station.x + (x - r.station.x) * k / 6, r.station.y + (y - r.station.y) * k / 6, .45);
        if (clear) return { x, y };
      }
      return null;
    }
    function updateRoamers(dt, player, anchors, surfaceHeight) {
      const groups = new Map();
      for (const anchor of anchors) if (isRoaming(anchor) && (anchor.enabled || anchor.completed)) {
        const key = npcKey(anchor);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(anchor);
      }
      for (const [key, r] of roamers) if (!groups.has(key)) r.actor.root.visible = false;
      for (const [key, list] of groups) {
        const station = currentStation(list);
        let r = roamers.get(key);
        if (!station) { if (r) r.actor.root.visible = false; continue; }
        if (!r) r = spawnRoamer(key, station, surfaceHeight);
        const toPlayer = Math.hypot(player.x - station.x, player.y - station.y);
        const engaged = station.near || station.anchorId === dialogueAnchorId;
        const playerClose = engaged || toPlayer <= r.cfg.paceAway;
        // 1) 站位换了：走过去（不会走路就直接换位）
        if (station !== r.station) {
          r.station = station;
          if (!r.canWalk) { r.x = station.x; r.y = station.y; r.path = null; r.mode = 'idle'; }
          else { planRoute(r, station.x, station.y); r.mode = r.path ? 'travel' : 'idle'; }
        }
        // 2) 等人时踱步；玩家走近、或正在对话时回到站位
        const away = Math.hypot(r.x - station.x, r.y - station.y);
        if (r.mode === 'idle' && r.canWalk && r.cfg.pace > 0 && !playerClose) {
          r.wait -= dt;
          if (r.wait <= 0) {
            const target = away < .3 ? pickPaceTarget(r) : { x: station.x, y: station.y };
            if (target) { planRoute(r, target.x, target.y); r.mode = away < .3 ? 'pace' : 'return'; }
            r.wait = 4 + Math.random() * 6;
          }
        }
        if (r.mode === 'linger') { r.wait -= dt; if (r.wait <= 0 || playerClose) { planRoute(r, station.x, station.y); r.mode = 'return'; } }
        if ((r.mode === 'pace' || r.mode === 'idle') && away > .3 && playerClose && r.canWalk) { planRoute(r, station.x, station.y); r.mode = 'return'; }
        // 3) 沿路线移动
        let moving = false, speed = 0;
        if (r.path && (r.mode === 'travel' || r.mode === 'pace' || r.mode === 'return')) {
          // 玩家跑远了：在看不见的地方赶路，只留最后约 10m 走进画面
          if (r.mode === 'travel' && !r.actor.root.visible && r.remaining > 14) advanceAlong(r, r.remaining - 10);
          const hurry = r.mode === 'travel' && r.remaining > 20;
          speed = (hurry ? r.cfg.hurrySpeed : r.cfg.speed) * (r.mode === 'pace' ? .7 : 1);
          const a0 = r.path[r.seg], b0 = r.path[Math.min(r.seg + 1, r.path.length - 1)];
          const hx = b0.x - a0.x, hy = b0.y - a0.y, hl = Math.hypot(hx, hy) || 1;
          const px = player.x - r.x, py = player.y - r.y, pd = Math.hypot(px, py);
          const blocked = pd < 1.3 && (px * hx + py * hy) / hl > pd * .3;   // 玩家挡在前面就停下
          if (!blocked) { advanceAlong(r, speed * dt); moving = true; }
          const s0 = r.path[r.seg], s1 = r.path[Math.min(r.seg + 1, r.path.length - 1)];
          r.x = s0.x + (s1.x - s0.x) * r.segT; r.y = s0.y + (s1.y - s0.y) * r.segT;
          if (s1.x !== s0.x || s1.y !== s0.y) r.heading = Math.atan2(s1.x - s0.x, s1.y - s0.y);
          if (r.seg >= r.path.length - 1) {
            const last = r.path.at(-1);
            r.x = last.x; r.y = last.y; r.path = null; moving = false;
            r.mode = r.mode === 'pace' ? 'linger' : 'idle';
            r.wait = r.mode === 'linger' ? 2 + Math.random() * 3 : 4 + Math.random() * 5;
          }
        }
        // 4) 显示、朝向、动画
        bounds.center.set(r.x - logicalScene.world.w / 2, surfaceHeight(r.x, r.y) + 1, r.y - logicalScene.world.h / 2);
        const range = logicalScene.streetModel?.actorRange ?? 80;
        const visible = Math.hypot(player.x - r.x, player.y - r.y) < range && frustum.intersectsSphere(bounds);
        r.actor.root.visible = visible;
        place(r.actor, r.x, r.y, undefined, surfaceHeight);
        const dx = player.x - r.x, dz = player.y - r.y, toMe = Math.hypot(dx, dz);
        const yaw = moving ? r.heading : toMe > .01 && (engaged || toMe < 6) ? Math.atan2(dx, dz) : r.mode === 'linger' ? r.heading : r.actor.initialYaw;
        r.actor.root.rotation.y += wrapYaw(yaw - r.actor.root.rotation.y) * (1 - Math.exp(-(moving ? 7 : 5) * dt));
        play(r.actor, moving ? 'Walk' : engaged ? 'Talk' : r.actor.idle);
        if (r.actor.current) r.actor.current.timeScale = moving ? Math.min(1.7, Math.max(.7, speed / 1.35)) : 1;
      }
      M.actors3d.roamers = [...roamers.values()].map(r => ({ key: r.key, station: r.station?.anchorId, x: +r.x.toFixed(2), y: +r.y.toFixed(2), mode: r.mode, remaining: +(r.remaining || 0).toFixed(1), visible: r.actor.root.visible }));
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
      playerState() {
        return playerActor ? { speed: playerActor.stride, weights: [...playerActor.gaitWeights] } : null;
      },
      update(dt, player, anchors, camera, surfaceHeight, cameraDistance, firstPerson = false) {
        projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projection);
        if (player.moving) dialogueAnchorId = null;
        ensurePlayer(player.roleId);
        playerActor.root.visible = !firstPerson;
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
        const gait = playerActor.gait;
        const move = T.MathUtils.smoothstep(player.speed, .04, .85);
        const run = gait.run && !player.reversing ? T.MathUtils.smoothstep(player.speed, 2.2, 3.8) : 0;
        const targets = [1 - move, move * (1 - run), move * run];
        const blend = 1 - Math.exp(-dt * 18);
        for (const [i, action] of [gait.idle, gait.walk, gait.run].entries()) {
          playerActor.gaitWeights[i] = T.MathUtils.lerp(playerActor.gaitWeights[i], targets[i], blend);
          action?.setEffectiveWeight(playerActor.gaitWeights[i]);
        }
        const stride = player.speed * (player.reversing ? -1 : 1);
        playerActor.stride = T.MathUtils.lerp(playerActor.stride, stride, blend);
        gait.walk?.setEffectiveTimeScale(playerActor.stride / 1.8);
        gait.run?.setEffectiveTimeScale(Math.abs(playerActor.stride) / 4);
        const lean = !gait.run && !player.reversing
          ? .085 * T.MathUtils.smoothstep(player.speed, 1.8, 6.5) : 0;
        playerActor.model.rotation.x = T.MathUtils.lerp(playerActor.model.rotation.x, lean, blend);
        const localActors = new Map();
        if (logicalScene.streetModel) {
          for (const anchor of anchors) {
            if (!hasModel(anchor) || isRoaming(anchor) || !visibleAnchor(anchor, anchors)) continue;
            const distance = Math.hypot(anchor.x - player.x, anchor.y - player.y);
            bounds.center.set(anchor.x - logicalScene.world.w / 2, surfaceHeight(anchor.x, anchor.y) + 1, anchor.y - logicalScene.world.h / 2);
            const score = distance + (frustum.intersectsSphere(bounds) ? 0 : 30) -
              (anchor.anchorId === dialogueAnchorId ? 100 : 0);
            const key = npcKey(anchor);
            if (distance < (logicalScene.streetModel.actorRange ?? 18) && score < (localActors.get(key)?.score ?? Infinity)) localActors.set(key, { anchor, score });
          }
        }
        if (!anchors.length) {
          for (const actor of npcActors.values()) actor.root.visible = false;
        }
        updateRoamers(dt, player, anchors, surfaceHeight);
        for (const anchor of anchors) {
          if (!hasModel(anchor) || isRoaming(anchor)) continue;
          bounds.center.set(anchor.x - logicalScene.world.w / 2, surfaceHeight(anchor.x, anchor.y) + 1, anchor.y - logicalScene.world.h / 2);
          const nearby = !logicalScene.streetModel || localActors.get(npcKey(anchor))?.anchor === anchor;
          const visible = nearby && visibleAnchor(anchor, anchors) && frustum.intersectsSphere(bounds);
          let actor = npcActors.get(anchor.anchorId);
          if (!visible) { if (actor) actor.root.visible = false; continue; }
          if (!actor) {
            const key = npcKey(anchor);
            const profile = npcProfile(anchor) || {};
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
        for (const actor of actors) if (actor.root.visible || actor === playerActor) actor.mixer.update(dt);
        for (const actor of npcActors.values()) if (actor.root.visible) updateExpression(actor, dt, actor.current === actor.actions.get('Talk'));
      },
      dispose() {
        window.removeEventListener('czmarch:interact', focusDialogue);
        for (const actor of actors) disposeActor(actor);
        actors.length = 0;
        roamers.clear();
        npcActors.clear();
        disposeModels(loaded.values());
        loaded.clear();
        playerActor = null;
      }
    };
  }

  M.actors3d = { create };
})();
