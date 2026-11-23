const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const puppeteer = require(process.env.PUPPETEER_PATH || '../../_browser/node_modules/puppeteer-core');

async function main() {
  const root = path.resolve(__dirname, '..');
  fs.mkdirSync(path.join(root, '_shots'), { recursive: true });
  const origin = process.env.CZ_PREVIEW_URL || 'http://127.0.0.1:8080';
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: process.env.CZ_SOFTWARE_GL === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [],
    protocolTimeout: 120000
  });
  const page = await browser.newPage();
  const report = {
    generatedAt: new Date().toISOString(),
    renderer: process.env.CZ_SOFTWARE_GL === '1' ? 'Chrome SwiftShader; not device performance acceptance' : 'Chrome hardware-selected WebGL; mobile viewport emulation is not phone hardware acceptance',
    visualApproval: false,
    passed: false, checks: [], errors: [], console: [], failedRequests: [], models: [],
    scripts: ['march-world/engine/renderer3d.js', 'march-world/scenes/visual3d.js', 'march-world/engine/actors3d.js'].map(relative => {
      const file = path.join(root, relative);
      return { file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') };
    }),
    chapters: { desktop: [], mobile: [] }
  };
  const pendingRequests = new Set();
  page.on('request', request => pendingRequests.add(request));
  page.on('requestfinished', request => pendingRequests.delete(request));
  page.on('requestfailed', request => pendingRequests.delete(request));
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('dialog', dialog => {
    if (dialog.type() === 'beforeunload') dialog.accept();
    else { report.errors.push('Unexpected dialog: ' + dialog.message()); dialog.dismiss(); }
  });
  page.on('console', message => {
    if (['error', 'warn'].includes(message.type())) report.console.push(message.text());
    if (message.type() === 'error') report.errors.push(message.text());
  });
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() }); });
  const snapshot = () => page.evaluate(() => CZMarchWorld.snapshot());
  const frames = async (count = 4) => {
    const start = await page.evaluate(() => CZMarchWorld.performance.frames);
    await page.waitForFunction((start, count) => CZMarchWorld.performance.frames >= start + count, { timeout: 20000 }, start, count);
  };
  const skip = async () => {
    if (await page.$('.czmw-cinema-skip3d')) await page.click('.czmw-cinema-skip3d');
    await page.waitForFunction(() => !document.querySelector('.czmw-cinema3d'));
  };
  const installReferences = () => page.evaluate(() => {
    const M = CZMarchWorld._;
    for (const [module, capture] of [
      [M.renderer3d, (view) => { window.__verifyView3d = view; }],
      [M.actors3d, (actors, args) => {
        window.__verifyScene3d = args[2];
        const update = actors.update;
        actors.update = function (...args) { window.__verifyCamera3d = args[3]; return update.apply(this, args); };
      }]
    ]) {
      if (module.create.__verifyCapture3d) continue;
      const create = module.create;
      const wrapped = async function (...args) {
        const result = await create.apply(this, args);
        capture(result, args);
        return result;
      };
      wrapped.__verifyCapture3d = true;
      module.create = wrapped;
    }
  });
  const mount = async (role = 'soldier', chapterId = 1, { spawn } = {}) => {
    const expected = await page.evaluate(async (role, chapterId, spawn) => {
      const scene = CZMarchWorldManifest.scenes.find(scene => scene.chapterId === chapterId);
      if (!scene) throw Error('Missing manifest chapter: ' + chapterId);
      window.__verifyView3d = window.__verifyScene3d = null;
      document.getElementById('chapter').value = scene.sceneId;
      await CZMarchWorld.mount(document.getElementById('world'), { chapterId, sceneId: scene.sceneId, roleId: role, anchors: scene.anchors, spawn });
      return { chapterId, sceneId: scene.sceneId };
    }, role, chapterId, spawn);
    await skip();
    await frames();
    assert.equal(await page.evaluate(() => CZMarchWorld.performance.backend), 'three');
    const state = await snapshot();
    assert.equal(state.chapterId, expected.chapterId);
    assert.equal(state.sceneId, expected.sceneId);
    if (spawn) {
      assert.equal(state.x, Math.round(spawn.x * 100) / 100);
      assert.equal(state.y, Math.round(spawn.y * 100) / 100);
      assert.equal(state.facing, Math.round(spawn.facing * 1000) / 1000);
      const actual = await page.evaluate(sceneId => {
        const { x, y, facing } = CZMarchWorld._.scenes[sceneId].focusActor;
        return { x, y, facing };
      }, expected.sceneId);
      assert.deepEqual(actual, { x: spawn.x, y: spawn.y, facing: spawn.facing });
      // Wait for normal camera follow from the actual spawn; do not teleport the player or frame a distant target.
      await page.waitForFunction(() => {
        const player = CZMarchWorld.snapshot(), view = __verifyView3d;
        const point = view.project(player.x, player.y);
        return !point.behind && point.x > 0 && point.x < view.cam.viewW && point.y > 0 && point.y < view.cam.viewH;
      }, { timeout: 20000 });
    }
  };
  const inspectChapter = () => page.evaluate(async () => {
    const T = await import('three');
    const M = CZMarchWorld._, state = CZMarchWorld.snapshot(), stats = CZMarchWorld.performance;
    const logical = M.scenes[state.sceneId], scene = __verifyScene3d, view = __verifyView3d;
    const expectedProps = {}, props = {}, propNames = [], farTerrain = [];
    for (const prop of logical.props) expectedProps[prop.type] = (expectedProps[prop.type] || 0) + 1;
    const types = Object.keys(expectedProps);
    scene.traverse(object => {
      const type = types.find(type => object.name === 'march-prop-' + type || object.name.startsWith('march-prop-' + type + '-'));
      if (type) {
        props[type] = (props[type] || 0) + 1;
        propNames.push(object.name);
      }
      if (object.name.startsWith('march-mountains-')) {
        let meshes = 0, vertices = 0, indices = 0;
        const geometries = new Set();
        object.traverse(child => {
          if (child.isMesh) meshes++;
          if (!child.geometry || geometries.has(child.geometry)) return;
          geometries.add(child.geometry);
          vertices += child.geometry.attributes.position?.count || 0;
          indices += child.geometry.index?.count || 0;
        });
        farTerrain.push({ name: object.name, meshes, geometries: geometries.size, vertices, indices });
      }
    });
    farTerrain.sort((a, b) => a.name.localeCompare(b.name));
    const skins = { actors: 0, meshes: 0, materials: 0, textured: true, details: {} };
    for (const root of scene.children) {
      let skinned = false;
      const details = [];
      root.traverse(object => {
        if (!object.isSkinnedMesh) return;
        skinned = true;
        skins.meshes++;
        const textures = [];
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
          skins.materials++;
          if (!material.map?.image?.width || !material.map?.image?.height) skins.textured = false;
          textures.push({ name: material.name, width: material.map?.image?.width, height: material.map?.image?.height, normalWidth: material.normalMap?.image?.width || 0 });
        }
        details.push({ vertices: object.geometry.attributes.position.count, indices: object.geometry.index?.count || 0, bones: object.skeleton.bones.length, textures });
      });
      if (skinned) { skins.actors++; skins.details[root.name] = details; }
    }
    const candidates = logical.anchorEntities.filter(anchor => anchor.kind === 'npc' && M.anchors.npcKey(anchor.anchorId, anchor.label) !== 'narrator' && (anchor.enabled || anchor.completed));
    const expectedActors = 1 + candidates.filter(anchor => {
      const point = view.project(anchor.x, anchor.y, 1);
      const overlap = candidates.some(other => other !== anchor && Math.hypot(other.x - anchor.x, other.y - anchor.y) < 1.5 && (Number(other.near) > Number(anchor.near) || (Number(other.near) === Number(anchor.near) && candidates.indexOf(other) < candidates.indexOf(anchor))));
      return !overlap && !point.behind && point.x > 0 && point.x < view.cam.viewW && point.y > 0 && point.y < view.cam.viewH;
    }).length;
    const ground = scene.getObjectByName('march-pbr-ground');
    const x = state.x + 2, y = state.y - 1, projected = view.project(x, y), inverse = view.unproject(projected.x, projected.y);
    let bridge = null;
    if (state.chapterId === 7) {
      const deck = scene.getObjectByName('march-iron-bridge-deck');
      if (deck) {
        const bounds = new T.Box3().setFromObject(deck);
        bridge = { minX: bounds.min.x, maxX: bounds.max.x, top: bounds.max.y, expectedMinX: logical.ironBridge.x0 - logical.world.w / 2, expectedMaxX: logical.ironBridge.x1 - logical.world.w / 2 };
      }
    }
    const geometryChecks = { wallsInsideBlockers: true, yaodongMassGrounded: true, closedArch: !!scene.getObjectByName('march-arch-closed-door'), woodenBridgeGaps: [], cliffs: [], flamePlanes: 0, animatedFlames: true, coneFires: false };
    const woodDecks = [], scannedRocks = [];
    scene.traverse(object => {
      if (object.name === 'march-scan-rock') {
        const bounds = new T.Box3().setFromObject(object, true), meshes = [];
        object.traverse(child => {
          if (!child.isMesh) return;
          meshes.push({
            vertices: child.geometry.attributes.position.count, indices: child.geometry.index.count,
            vertexColors: child.material.vertexColors, color: child.material.color.toArray(),
            metalness: child.material.metalness, roughness: child.material.roughness,
            maps: ['map', 'normalMap', 'roughnessMap'].map(key => ({ key, width: child.material[key]?.image?.width || 0, height: child.material[key]?.image?.height || 0 }))
          });
        });
        const root = object.parent.position;
        scannedRocks.push({ name: object.parent.name, minY: bounds.min.y, groundY: view.groundHeight(root.x + logical.world.w / 2, root.z + logical.world.h / 2), meshes });
      }
      if (object.name.startsWith('march-cliff-line-')) {
        const box = new T.Box3().setFromObject(object);
        geometryChecks.cliffs.push({ name: object.name, vertices: object.geometry.attributes.position.count, indices: object.geometry.index?.count || 0, depth: box.max.z - box.min.z, width: box.max.x - box.min.x });
      }
      if (object.name === 'march-fire-flame') {
        geometryChecks.flamePlanes++;
        geometryChecks.animatedFlames &&= object.material.uniforms.time.value > 0 && object.material.transparent && !object.material.depthWrite;
      }
      if (object.name.startsWith('march-prop-campfire-')) object.traverse(child => { if (child.geometry?.type === 'ConeGeometry') geometryChecks.coneFires = true; });
      if (object.name.startsWith('march-prop-stoneWall-')) {
        const box = new T.Box3().setFromObject(object);
        geometryChecks.wallsInsideBlockers &&= logical.blocked.some(block => block.rect && box.min.x + logical.world.w / 2 >= block.rect[0] - .1 && box.max.x + logical.world.w / 2 <= block.rect[0] + block.rect[2] + .1 && box.min.z + logical.world.h / 2 >= block.rect[1] - .1 && box.max.z + logical.world.h / 2 <= block.rect[1] + block.rect[3] + .1);
      }
      if (object.name === 'march-yaodong-earth-mass') {
        const box = new T.Box3().setFromObject(object);
        geometryChecks.yaodongMassGrounded &&= Math.abs(box.min.y - object.parent.position.y) < .001 && box.max.y - box.min.y > 2;
      }
      if (object.name === 'march-wood-bridge-deck') {
        const box = new T.Box3().setFromObject(object);
        woodDecks.push({ x: (box.min.x + box.max.x) / 2, min: box.min.z, max: box.max.z });
      }
    });
    woodDecks.sort((a, b) => a.x - b.x || a.min - b.min);
    for (let i = 1; i < woodDecks.length; i++) if (Math.abs(woodDecks[i].x - woodDecks[i - 1].x) < .01) geometryChecks.woodenBridgeGaps.push(woodDecks[i].min - woodDecks[i - 1].max);
    const camera = __verifyCamera3d, target = new T.Vector3(state.x - logical.world.w / 2, view.surfaceHeight(state.x, state.y) + 1.05, state.y - logical.world.h / 2);
    const direction = camera.position.clone().sub(target), distance = direction.length();
    const ray = new T.Raycaster(target, direction.normalize(), .15, distance - .1);
    const obstacles = scene.children.flatMap(root => root.children).filter(object => /^(march-prop-|march-cliff-line-)/.test(object.name));
    const cameraBlockers = ray.intersectObjects(obstacles, true).filter(hit => hit.object.castShadow).map(hit => hit.object.name);
    const hiddenProps = obstacles.filter(object => !object.visible).map(object => object.name);
    return {
      geometryChecks, scannedRocks, cameraBlockers, hiddenProps, expectedCliffs: logical.terrain.cliffs.length,
      snapshot: state, stats, expectedSceneId: CZMarchWorldManifest.scenes.find(scene => scene.chapterId === state.chapterId).sceneId,
      forced3d: new URLSearchParams(location.search).has('3d'), storedRenderer: localStorage.getItem('cz_march_renderer'),
      invalidPerformance: Object.entries(stats).filter(([, value]) => typeof value === 'number' && !Number.isFinite(value)).map(([key]) => key),
      environment: M.visual3d.environment(logical).terrain,
      expectedProps, props, propNames, farTerrain, skins, expectedActors,
      ground: { normal: !!ground?.material.normalMap?.image?.width, map: !!ground?.material.map, color: ground?.material.color.getHexString(), vertices: ground.geometry.attributes.position.count, min: stats.terrainMin, max: stats.terrainMax },
      actorHeights: scene.children.filter(root => root.name.startsWith('march-actor-') && root.visible).map(root => ({ actual: root.position.y, expected: view.surfaceHeight(root.position.x + logical.world.w / 2, root.position.z + logical.world.h / 2) })),
      cameraClearance: camera.position.y - view.groundHeight(camera.position.x + logical.world.w / 2, camera.position.z + logical.world.h / 2),
      expectedGroundColor: new T.Color(M.visual3d.environment(logical).groundTint).getHexString(),
      roundTrip: inverse ? Math.hypot(inverse.x - x, inverse.y - y) : null,
      noOverflow: document.documentElement.scrollWidth <= innerWidth,
      bridge
    };
  });
  const assertChapter = (state, chapterId, desktop) => {
    const label = (desktop ? 'Mobile' : 'Desktop') + ' chapter ' + chapterId;
    assert.equal(state.forced3d, false, label + ': default URL');
    assert.equal(state.storedRenderer, null, label + ': no renderer preference');
    assert.equal(state.snapshot.chapterId, chapterId, label);
    assert.equal(state.snapshot.sceneId, state.expectedSceneId, label);
    assert.equal(state.stats.backend, 'three', label);
    assert.deepEqual(state.invalidPerformance, [], label + ': finite performance');
    for (const key of ['frames', 'renderMs', 'dpr', 'drawCalls', 'triangles']) assert(Number.isFinite(state.stats[key]), label + ': finite ' + key);
    assert(state.stats.frames >= 1 && state.stats.renderMs >= 0 && state.stats.dpr > 0, label + ': rendered frames');
    assert.deepEqual(state.cameraBlockers, [], label + ': camera stays in front of foreground occluders');
    assert.deepEqual(state.hiddenProps, [], label + ': camera avoidance does not hide scenery');
    assert.equal(state.scannedRocks.length, (state.expectedProps.cliff || 0) + (state.expectedProps.rock || 0), label + ': every rock retains its scanned model');
    for (const rock of state.scannedRocks) {
      assert(Math.abs(rock.minY - rock.groundY) < .00001, label + ': ' + rock.name + ' meets the local terrain');
      assert.equal(rock.meshes.length, 1, label + ': source rock mesh retained');
      for (const mesh of rock.meshes) {
        assert.equal(mesh.vertices, 7914, label + ': unchanged source rock vertices');
        assert.equal(mesh.indices, 44532, label + ': unchanged source rock triangles');
        assert(mesh.vertexColors, label + ': scanned vertex colors retained');
        assert.deepEqual(mesh.color, [1, 1, 1], label + ': no extra darkening of scanned albedo');
        assert.equal(mesh.metalness, 0, label + ': source rock remains nonmetallic');
        assert.equal(mesh.roughness, 1, label + ': source roughness map is not scaled down');
        assert(mesh.maps.every(map => map.width === 1024 && map.height === 1024), label + ': original rock PBR maps retained');
      }
    }
    assert.equal(state.geometryChecks.cliffs.length, state.expectedCliffs, label + ': every cliff line retains terrain');
    assert(state.geometryChecks.cliffs.every(cliff => cliff.indices > 0 && cliff.vertices > 100 && Math.min(cliff.width, cliff.depth) > 2), label + ': cliffs have subdivided depth rather than vertical sheets');
    assert.equal(state.geometryChecks.flamePlanes, (state.expectedProps.campfire || 0) * 3, label + ': each campfire has layered flames');
    assert(state.geometryChecks.animatedFlames && !state.geometryChecks.coneFires, label + ': animated transparent flames replace solid cones');
    assert(state.geometryChecks.wallsInsideBlockers, label + ': solid stone walls stay inside existing blocked footprints');
    assert(state.geometryChecks.yaodongMassGrounded, label + ': yaodong earth mass reaches the ground');
    assert(state.geometryChecks.woodenBridgeGaps.every(gap => gap <= .001), label + ': wooden deck segments have no gaps');
    if (chapterId === 12) assert(state.geometryChecks.closedArch, label + ': blocked arch has visible closed doors');
    assert.equal(state.stats.propsReady, true, label + ': props ready');
    assert.deepEqual(state.stats.unsupportedProps, [], label + ': no unsupported props');
    for (const [type, count] of Object.entries(state.expectedProps)) assert(state.props[type] >= count, label + ': every ' + type + ' data prop is represented');
    assert.equal(state.ground.normal, true, label + ': loaded ground normal map');
    assert(state.ground.vertices > 20000 && state.ground.max - state.ground.min > 1, label + ': subdivided three-dimensional landform');
    assert(state.actorHeights.length > 0 && state.actorHeights.every(actor => Math.abs(actor.actual - actor.expected) < .00001), label + ': all visible actors stand on their actual support surface');
    assert(state.cameraClearance >= .39, label + ': camera stays above the terrain');
    assert.equal(state.stats.environment, state.environment, label + ': environment profile');
    assert(state.farTerrain.length >= 3, label + ': three mountain background objects');
    assert(state.farTerrain.every(object => object.geometries > 0 && object.vertices > 0), label + ': background geometry');
    assert(state.skins.actors >= state.expectedActors && state.skins.meshes > 0 && state.skins.materials > 0 && state.skins.textured, label + ': all player/NPC skins retain loaded maps');
    assert(Number.isFinite(state.roundTrip) && state.roundTrip < 0.00001, label + ': projection round-trip');
    if (chapterId === 7) {
      assert(state.bridge, label + ': named iron bridge deck');
      for (const key of ['minX', 'maxX', 'top']) assert(Number.isFinite(state.bridge[key]), label + ': bridge ' + key);
      assert(Math.abs(state.bridge.minX - state.bridge.expectedMinX) < 0.00001, label + ': bridge x0');
      assert(Math.abs(state.bridge.maxX - state.bridge.expectedMaxX) < 0.00001, label + ': bridge x1');
      assert(Math.abs(state.bridge.top - .025) < 0.00001, label + ': bridge deck top');
    }
    if (chapterId === 8) {
      assert.equal(state.environment, 'snow', label);
      assert.equal(state.ground.map, false, label + ': snow must not use the brown earth color map');
      assert.equal(state.ground.color, state.expectedGroundColor, label + ': snow ground tint');
    }
    const landmarks = { 8: ['pine', 'prayerFlags', 'tent'], 11: ['yaodong'], 12: ['archGate', 'flagPole'] };
    for (const type of landmarks[chapterId] || []) assert(state.props[type] > 0, label + ': ' + type);
    if (desktop) {
      assert(state.noOverflow, label + ': no horizontal overflow');
      assert(state.stats.dpr <= 1.15, label + ': bounded DPR');
      assert.deepEqual(state.expectedProps, desktop.expectedProps, label + ': identical data props');
      assert.deepEqual(state.props, desktop.props, label + ': all desktop prop counts retained');
      assert.deepEqual(state.farTerrain, desktop.farTerrain, label + ': unchanged far terrain geometry counts');
      assert.deepEqual(state.scannedRocks, desktop.scannedRocks, label + ': unchanged scanned rock geometry and materials');
      assert.deepEqual(state.geometryChecks.cliffs, desktop.geometryChecks.cliffs, label + ': unchanged cliff geometry');
      assert.equal(state.geometryChecks.flamePlanes, desktop.geometryChecks.flamePlanes, label + ': unchanged flame layers');
      const referenceDetails = Object.assign({}, ...report.chapters.desktop.map(chapter => chapter.skins.details));
      for (const [role, details] of Object.entries(state.skins.details)) assert.deepEqual(details, referenceDetails[role], label + ': unchanged visible ' + role + ' mesh, bones and textures');
    }
  };
  const verifyBridgeMovement = async () => {
    await mount('soldier', 7, { spawn: { x: 64, y: 56, facing: 0 } });
    await page.evaluate(async () => {
      const T = await import('three'), M = CZMarchWorld._;
      const logical = M.scenes[CZMarchWorld.snapshot().sceneId], grid = M.path.buildGrid(logical);
      const player = logical.focusActor, worldPosition = new T.Vector3();
      const root = __verifyScene3d.children.find(root => {
        let skinned = false;
        root.traverse(object => { if (object.isSkinnedMesh) skinned = true; });
        root.getWorldPosition(worldPosition);
        return skinned && Math.abs(worldPosition.x - (player.x - logical.world.w / 2)) < .01 && Math.abs(worldPosition.z - (player.y - logical.world.h / 2)) < .01;
      });
      if (!root) throw Error('Missing actual bridge player skin root');
      const blocked = JSON.stringify(logical.blocked);
      const collision = () => {
        const currentGrid = M.path.buildGrid(logical), xs = [64, 67, (logical.ironBridge.x0 + logical.ironBridge.x1) / 2, logical.ironBridge.x1 - 2];
        return {
          laneOpen: xs.every(x => M.path.walkableAt(currentGrid, x, 56, M.player.RADIUS)),
          northBlocked: xs.every(x => !M.path.walkableAt(currentGrid, x, 52, M.player.RADIUS)),
          southBlocked: xs.every(x => !M.path.walkableAt(currentGrid, x, 60, M.player.RADIUS))
        };
      };
      const samples = [], before = collision();
      let raf;
      const sample = () => {
        root.getWorldPosition(worldPosition);
        samples.push({ x: player.x, y: player.y, actorX: worldPosition.x + logical.world.w / 2, actorY: worldPosition.z + logical.world.h / 2, height: worldPosition.y, walkable: M.path.walkableAt(grid, player.x, player.y, M.player.RADIUS) });
      };
      const tick = () => { sample(); raf = requestAnimationFrame(tick); };
      tick();
      window.__verifyStopBridge = () => {
        cancelAnimationFrame(raf);
        sample();
        return { samples, before, after: collision(), blockedUnchanged: JSON.stringify(logical.blocked) === blocked };
      };
    });
    const hold = async (key, reached, atEdge = false) => {
      await page.keyboard.down(key);
      try {
        await page.waitForFunction(reached, { timeout: 15000 });
        if (atEdge) {
          await frames(12);
          const edge = await snapshot();
          await frames(4);
          assert.deepEqual(await snapshot(), edge, 'Bridge water collision stops held ' + key);
        }
        return await snapshot();
      } finally { await page.keyboard.up(key); }
    };
    let trace;
    try {
      const east = await hold('d', () => CZMarchWorld.snapshot().x > 67);
      assert(east.x > 67 && east.y >= 53 && east.y <= 59);
      const south = await hold('s', () => CZMarchWorld.snapshot().y > 58, true);
      const north = await hold('w', () => CZMarchWorld.snapshot().y < 54, true);
      const stopped = await snapshot();
      await frames(6);
      assert.deepEqual(await snapshot(), stopped);
      report.bridgeMovement = { east, south, north };
    } finally {
      trace = await page.evaluate(() => {
        const result = __verifyStopBridge();
        delete window.__verifyStopBridge;
        return result;
      });
      report.bridgeMovement = { ...report.bridgeMovement, ...trace };
    }
    assert(trace.samples.length > 1);
    assert(trace.blockedUnchanged, 'Bridge collision data remains unchanged');
    assert.deepEqual(trace.before, { laneOpen: true, northBlocked: true, southBlocked: true });
    assert.deepEqual(trace.after, trace.before);
    for (const sample of trace.samples) {
      assert([sample.x, sample.y, sample.actorX, sample.actorY, sample.height].every(Number.isFinite));
      assert(sample.x >= 64 && sample.y >= 53 && sample.y <= 59 && sample.walkable, 'Bridge movement stays in the collision-safe lane');
      assert(Math.abs(sample.actorX - sample.x) < .02 && Math.abs(sample.actorY - sample.y) < .02, 'Rendered bridge player follows actual keyboard movement');
      assert(Math.abs(sample.height - .025) < 0.00001, 'Bridge player never falls below the deck');
    }
    assert.equal(await page.evaluate(() => CZMarchWorld.performance.backend), 'three');
    report.checks.push('Chapter 7: real keyboard bridge crossing from (64,56), retained water collision on both sides and no player fall-through');
  };
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(origin + '/march-world/preview.html?chapter=chapter-1%2Fscene-ruijin', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => CZMarchWorld.mounted, { timeout: 45000 });
    assert.equal(await page.evaluate(() => CZMarchWorld.performance.backend), 'three');
    await skip();
    await frames();
    await installReferences();
    await mount();
    report.gpu = await page.evaluate(() => { const gl = document.querySelector('.czmw-canvas3d').getContext('webgl2'); const extension = gl.getExtension('WEBGL_debug_renderer_info'); return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); });
    console.log('Graphics backend: ' + report.gpu);
    report.checks.push('First chapter loads Three.js, skips cinema and renders nonzero frames');
    report.environment = await page.evaluate(() => {
      const ground = __verifyScene3d.getObjectByName('march-pbr-ground'), props = {};
      __verifyScene3d.traverse(object => { if (object.name.startsWith('march-scan-')) props[object.name] = (props[object.name] || 0) + 1; });
      return { color: !!ground.material.map?.image?.width, normal: !!ground.material.normalMap?.image?.width, roughness: !!ground.material.roughnessMap?.image?.width, props };
    });
    assert(report.environment.color && report.environment.normal && report.environment.roughness);
    for (const kind of ['tree', 'rock', 'crate', 'fern']) assert(report.environment.props['march-scan-' + kind] > 0);
    report.checks.push('Local CC0 ground PBR channels and scanned trees, rocks, crates and ferns load in the actual renderer');
    report.models = await page.evaluate(() => {
      const mats = new Map();
      __verifyScene3d.traverse(n => {
        if (!n.isSkinnedMesh) return;
        for (const m of Array.isArray(n.material) ? n.material : [n.material]) mats.set(m.name, { name: m.name, map: !!m.map, imageWidth: m.map?.image?.width, colorSpace: m.map?.colorSpace, normal: !!m.normalMap });
      });
      return [...mats.values()];
    });
    assert(report.models.length > 0);
    assert(report.models.every(m => m.map && m.imageWidth > 0), 'Character base-color textures must load');
    const chapterIds = await page.evaluate(() => CZMarchWorldManifest.scenes.map(scene => scene.chapterId).sort((a, b) => a - b));
    assert.deepEqual(chapterIds, Array.from({ length: 12 }, (_, index) => index + 1), 'All 12 manifest chapters are covered');
    for (const chapterId of chapterIds) {
      console.log('Desktop chapter ' + chapterId + ': mounting');
      await mount('soldier', chapterId);
      const state = await inspectChapter();
      report.chapters.desktop.push(state);
      assertChapter(state, chapterId);
      const screenshot = '_shots/march-chapter-' + String(chapterId).padStart(2, '0') + '-desktop.png';
      await page.screenshot({ path: path.join(root, screenshot) });
      state.screenshot = screenshot;
      console.log('Chapter ' + chapterId + ': rendered and checked');
      if (chapterId === 7) await verifyBridgeMovement();
      const landmarkType = { 1: 'houseWood', 3: 'houseWood', 4: 'houseWood', 7: 'bridge', 8: 'campfire', 9: 'campfire', 11: 'yaodong', 12: 'archGate' }[chapterId];
      if (landmarkType) {
        const spawn = await page.evaluate(async type => {
          if (type === 'bridge') return { x: 94, y: 56, facing: 0 };
          const T = await import('three'), M = CZMarchWorld._, logical = M.scenes[CZMarchWorld.snapshot().sceneId];
          let object;
          __verifyScene3d.traverse(node => { if (!object && (logical.chapterId === 3 ? node.name === 'march-prop-houseWood-4' : node.name.startsWith('march-prop-' + type + '-'))) object = node; });
          const bounds = new T.Box3().setFromObject(object), grid = M.path.buildGrid(logical);
          const x = (bounds.min.x + bounds.max.x + logical.world.w) / 2, y = bounds.max.z + logical.world.h / 2;
          for (const dy of [5, 7, 9]) for (const dx of [0, 2, -2, 4, -4]) if (M.path.walkableAt(grid, x + dx, y + dy, M.player.RADIUS)) return { x: x + dx, y: y + dy, facing: 0 };
          throw Error('No safe viewpoint for ' + type);
        }, landmarkType);
        await mount('soldier', chapterId, { spawn });
        await frames(16);
        const screenshot = '_shots/march-landmark-' + String(chapterId).padStart(2, '0') + '-' + landmarkType + '.png';
        await page.screenshot({ path: path.join(root, screenshot) });
        (report.landmarks ||= []).push({ chapterId, type: landmarkType, snapshot: await snapshot(), screenshot });
      }
    }
    report.checks.push('All 12 desktop chapters default to Three.js with complete props, loaded ground normals, environment profiles, far terrain, textured NPC skins and projection round-trips');
    report.checks.push('Chapter landmarks: measured iron bridge deck, snow ground with pines/prayer flags/tents, yaodong and arch gate/flag pole');
    await mount();
    report.roles = [];
    for (const role of ['commander', 'logistics', 'medic', 'soldier']) {
      await mount(role);
      const state = await page.evaluate(() => {
        const logical = CZMarchWorld._.scenes[CZMarchWorld.snapshot().sceneId];
        let meshes = 0, textured = true;
        __verifyScene3d.traverse(n => {
          if (!n.isSkinnedMesh) return;
          meshes++;
          for (const m of Array.isArray(n.material) ? n.material : [n.material]) if (!m.map?.image?.width) textured = false;
        });
        return { role: logical.focusActor.roleId, pin: document.querySelector('.czmw-player-pin86').dataset.role, meshes, textured };
      });
      assert.equal(state.role, role);
      assert.equal(state.pin, role);
      assert(state.meshes > 0 && state.textured);
      report.roles.push(state);
    }
    report.checks.push('All four player roles mount with skinned, textured models and matching control identities');
    await page.screenshot({ path: path.join(root, '_shots/march-world-3d-desktop.png') });
    const before = await snapshot();
    await page.keyboard.down('d');
    await page.waitForFunction(x => CZMarchWorld.snapshot().x > x + 2, { timeout: 15000 }, before.x);
    await page.keyboard.up('d');
    await page.waitForFunction(() => !CZMarchWorld._.scenes[CZMarchWorld.snapshot().sceneId].focusActor.moving);
    const stopped = await snapshot();
    await frames(8);
    assert.deepEqual(await snapshot(), stopped);
    await page.evaluate(() => { window.__lastInteract3d = null; addEventListener('czmarch:interact', e => { window.__lastInteract3d = e.detail; }, { once: true }); });
    await page.keyboard.press('e');
    await page.waitForFunction(() => !!window.__lastInteract3d);
    assert.equal(await page.evaluate(() => __lastInteract3d.chapterId), 1);
    report.checks.push('Real keyboard movement, key release and nearby NPC interaction');
    await page.evaluate(() => { CZMarchWorld.pause('dialogue'); CZMarchWorld.pause('menu'); CZMarchWorld.resume('dialogue'); });
    const paused = await snapshot();
    await page.keyboard.down('d');
    await frames(5);
    await page.keyboard.up('d');
    assert.deepEqual(await snapshot(), paused);
    await page.evaluate(() => CZMarchWorld.resume('menu'));
    report.checks.push('Multiple pause reasons prevent movement until all are released');
    await mount();
    const target = await page.evaluate(() => {
      const player = CZMarchWorld.snapshot(), x = player.x + 4, y = player.y - 2;
      const point = __verifyView3d.project(x, y), inverse = __verifyView3d.unproject(point.x, point.y);
      const r = document.getElementById('world').getBoundingClientRect();
      return { x: r.x + point.x, y: r.y + point.y, roundTrip: Math.hypot(inverse.x - x, inverse.y - y), worldX: x, worldY: y };
    });
    assert(target.roundTrip < 0.00001);
    await page.mouse.click(target.x, target.y);
    await page.waitForFunction(({ worldX, worldY }) => { const p = CZMarchWorld.snapshot(); return Math.hypot(p.x - worldX, p.y - worldY) < 1.2; }, { timeout: 20000 }, target);
    await page.waitForFunction(() => !CZMarchWorld._.scenes[CZMarchWorld.snapshot().sceneId].focusActor.moving, { timeout: 20000 });
    const arrived = await snapshot();
    await frames(4);
    assert.deepEqual(await snapshot(), arrived);
    report.checks.push('Ground projection round-trip and real mouse click pathfinding stop at the destination');
    const beforeLoss = await snapshot();
    await page.evaluate(() => document.querySelector('.czmw-canvas3d').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => CZMarchWorld.performance.backend === 'canvas');
    const afterLoss = await snapshot();
    assert(Math.hypot(beforeLoss.x - afterLoss.x, beforeLoss.y - afterLoss.y) < 0.3);
    assert.equal(await page.$$eval('#world canvas', elements => elements.length), 1);
    report.checks.push('Real WebGL context loss falls back to one Canvas without resetting position');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(origin + '/march-world/preview.html?chapter=chapter-1%2Fscene-ruijin', { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(() => CZMarchWorld.mounted);
    await skip();
    await frames();
    assert.equal(await page.evaluate(() => CZMarchWorld.performance.backend), 'three');
    assert(await page.evaluate(() => CZMarchWorld.performance.dpr <= 1.15));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await installReferences();
    for (const chapterId of chapterIds) {
      console.log('Mobile chapter ' + chapterId + ': mounting');
      await mount('soldier', chapterId);
      const state = await inspectChapter();
      report.chapters.mobile.push(state);
      assertChapter(state, chapterId, report.chapters.desktop.find(desktop => desktop.snapshot.chapterId === chapterId));
      const screenshot = '_shots/march-chapter-' + String(chapterId).padStart(2, '0') + '-mobile.png';
      await page.screenshot({ path: path.join(root, screenshot) });
      state.screenshot = screenshot;
      console.log('Chapter ' + chapterId + ': rendered and checked');
    }
    report.checks.push('All 12 chapters at 390px default to Three.js without overflow and retain desktop prop counts, far terrain geometry and every NPC skin/map');
    await mount();
    const client = await page.createCDPSession();
    const joy = await page.$eval('.czmw-stick86', element => { const r = element.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const mobileBefore = await snapshot();
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...joy, id: 1 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: joy.x + 30, y: joy.y, id: 1 }] });
    await page.waitForFunction(x => CZMarchWorld.snapshot().x > x + 1, { timeout: 15000 }, mobileBefore.x);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => !CZMarchWorld._.scenes[CZMarchWorld.snapshot().sceneId].focusActor.moving);
    const mobileStopped = await snapshot();
    await frames(6);
    assert.deepEqual(await snapshot(), mobileStopped);
    await page.screenshot({ path: path.join(root, '_shots/march-world-3d-mobile.png') });
    await client.detach();
    report.checks.push('390px mobile viewport: bounded DPR, no horizontal overflow, real touch joystick and release');
    await page.evaluate(async () => { const s = CZMarchWorldManifest.scenes[0]; await Promise.all([CZMarchWorld.mount(document.getElementById('world'), s), CZMarchWorld.mount(document.getElementById('world'), s)]); });
    await skip();
    await frames();
    assert.equal(await page.$$eval('#world canvas', elements => elements.length), 1);
    await page.evaluate(() => { CZMarchWorld.destroy(); CZMarchWorld.destroy(); });
    assert.equal(await page.$$eval('#world > *', elements => elements.length), 0);
    report.checks.push('Rapid remount and repeated destroy leave no duplicate canvas or UI');
    report.overrides = [];
    const checkCanvasOverride = async (query, preference) => {
      await page.waitForFunction(() => CZMarchWorld.mounted, { timeout: 45000 });
      await skip();
      await frames();
      const state = await page.evaluate(() => ({
        snapshot: CZMarchWorld.snapshot(), stats: CZMarchWorld.performance,
        query: new URLSearchParams(location.search).get('3d'), preference: localStorage.getItem('cz_march_renderer')
      }));
      report.overrides.push(state);
      assert.equal(state.query, query);
      assert.equal(state.preference, preference);
      assert.equal(state.stats.backend, 'canvas');
      assert(state.stats.frames >= 1 && Number.isFinite(state.stats.renderMs));
      assert.equal(state.snapshot.chapterId, 1);
      assert.equal(state.snapshot.sceneId, 'chapter-1/scene-ruijin');
      assert.equal(await page.$$eval('#world canvas', elements => elements.length), 1);
      assert.equal(await page.$$eval('#world .czmw-canvas3d', elements => elements.length), 0);
    };
    await page.goto(origin + '/march-world/preview.html?3d=0&chapter=chapter-1%2Fscene-ruijin', { waitUntil: 'networkidle0', timeout: 60000 });
    await checkCanvasOverride('0', null);
    try {
      await page.evaluate(() => localStorage.setItem('cz_march_renderer', 'canvas'));
      await page.goto(origin + '/march-world/preview.html?chapter=chapter-1%2Fscene-ruijin', { waitUntil: 'networkidle0', timeout: 60000 });
      await checkCanvasOverride(null, 'canvas');
    } finally {
      await page.evaluate(() => localStorage.removeItem('cz_march_renderer'));
    }
    assert.equal(await page.evaluate(() => localStorage.getItem('cz_march_renderer')), null);
    report.checks.push('Explicit ?3d=0 and stored cz_march_renderer=canvas each select one functioning Canvas; only the verifier preference key is cleaned');
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    await page.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => !!window.CZMarchEntry);
    await page.evaluate(() => GameState.selectCharacter('soldier'));
    await installReferences();
    await page.click('#titleStart');
    await page.waitForSelector('.snow63-dialog[open]');
    await page.click('.snow63-controls button:nth-child(3)');
    await page.click('.snow63-actions .snow63-primary');
    await page.type('#snow64-message', '浏览器测试：记录沿途互助的故事。');
    await page.click('.snow63-actions .snow63-primary');
    await page.click('.snow63-actions .snow63-primary');
    await page.waitForFunction(() => CZMarchWorld.mounted && CZMarchStory.progress().next, { timeout: 60000 });
    await skip();
    await frames();
    assert.equal(await page.evaluate(() => CZMarchWorld.performance.backend), 'three');
    const openingId = await page.evaluate(() => CZMarchStory.progress().next.rows[0].storyId);
    assert.equal(await page.evaluate(() => CZMarchStory.progress().completed), 0);
    assert(await page.evaluate(() => {
      const scene = CZMarchWorld._.scenes[CZMarchWorld.snapshot().sceneId];
      return scene.anchorEntities.some(a => a.anchorId.endsWith('/anchor-main-task') && !a.enabled);
    }));
    const guide = await page.evaluate(() => {
      const line = __verifyScene3d.getObjectByName('march-guide-route');
      return { visible: line.visible, vertices: line.geometry.attributes.position?.count };
    });
    assert(guide.visible && guide.vertices > 1);
    await page.screenshot({ path: path.join(root, '_shots/march-world-3d-main-route.png') });
    report.checks.push('Real main entry completes prologue through buttons, renders 3D route and keeps the main task locked');
    await page.click('[data-march-go]');
    await page.waitForFunction(() => document.querySelector('[data-march-distance]')?.textContent.includes('已到附近'), { timeout: 30000 });
    await page.keyboard.press('e');
    await page.waitForSelector('.march83-dialog[open] .march83-choice');
    const dialoguePosition = await snapshot();
    await page.keyboard.down('d');
    await frames(5);
    await page.keyboard.up('d');
    assert.deepEqual(await snapshot(), dialoguePosition);
    await page.click('.march83-choice');
    await page.waitForFunction(() => document.querySelector('.march83-progress')?.textContent.startsWith('1 /'));
    await page.screenshot({ path: path.join(root, '_shots/march-world-3d-main-dialogue.png') });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !CZMarchStory.active && !document.querySelector('.march83-dialog[open]'));
    assert.equal(await page.evaluate(() => CZMarchStory.progress().completed), 0);
    assert.equal(await page.evaluate(() => CZMarchSave.read().pending), null);
    assert.equal(await page.evaluate(() => CZMarchStory.progress().next.rows[0].storyId), openingId);
    const beforeResume = await snapshot();
    await page.keyboard.down('a');
    await page.waitForFunction(x => CZMarchWorld.snapshot().x < x - .4, { timeout: 15000 }, beforeResume.x);
    await page.keyboard.up('a');
    await frames();
    await page.keyboard.press('e');
    await page.waitForSelector('.march83-dialog[open] .march83-choice');
    assert(await page.$eval('.march83-progress', e => e.textContent.startsWith('1 /')));
    const interruptedPosition = await snapshot();
    assert(await page.evaluate(() => !!CZMarchSave.read().pending));
    report.checks.push('NPC dialogue pauses movement; Escape preserves chosen turns without completing the task and resumes walking');
    const clickText = async (selector, text) => {
      const handle = await page.evaluateHandle((selector, text) => [...document.querySelectorAll(selector)].find(e => e.textContent === text), selector, text);
      assert(handle.asElement(), 'Missing button: ' + text);
      await handle.asElement().click();
      await handle.dispose();
    };
    const restore = async (reload = true) => {
      if (reload) await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForFunction(() => window.CZMarchEntry && typeof GameState !== 'undefined' && GameState.character);
      await page.click('#titleStart');
      await page.evaluate(() => GameUI.showDungeonPanel(GAME_NODES[0]));
      await page.waitForFunction(() => [...document.querySelectorAll('dialog[open] button')].some(e => e.textContent === '继续上次进度'));
      await clickText('dialog[open] button', '继续上次进度');
      await page.waitForFunction(() => CZMarchWorld.mounted && CZMarchStory.progress().next, { timeout: 60000 });
      await skip();
      await frames();
    };
    await restore();
    assert.deepEqual(await snapshot(), interruptedPosition);
    assert.equal(await page.evaluate(() => CZMarchSave.read().pending), null);
    assert.equal(await page.evaluate(() => CZMarchStory.progress().completed), 0);
    assert(await page.$eval('[data-march-status]', e => e.textContent.includes('刷新中断')));
    await page.keyboard.press('e');
    await page.waitForSelector('.march83-dialog[open] .march83-choice');
    const required = await page.evaluate(() => {
      const e = CZMarchEnv();
      return e.story.required(e.story.get(1, 1));
    });
    for (let count = 1; count < required; count++) {
      await page.click('.march83-choice');
      await page.waitForFunction(count => document.querySelector('.march83-progress')?.textContent.startsWith(count + ' /'), {}, count + 1);
    }
    assert.equal(await page.evaluate(() => CZMarchStory.progress().completed), 0);
    await clickText('.march83-dialog[open] button', '记录交谈 · 返回场景');
    await page.waitForFunction(() => !CZMarchStory.active && CZMarchStory.progress().completed === 1);
    assert.equal(await page.evaluate(() => CZMarchStory.progress().next.id), 'chapter-1/journey-full');
    assert(await page.evaluate(() => {
      const scene = CZMarchWorld._.scenes[CZMarchWorld.snapshot().sceneId];
      return scene.anchorEntities.some(a => a.anchorId.endsWith('/anchor-main-task') && a.enabled);
    }));
    assert.equal(await page.evaluate(() => CZMarchSave.read().tasks['chapter-1/main-task']?.completed === true), false);
    const recordedPosition = await snapshot();
    await restore();
    assert.deepEqual(await snapshot(), recordedPosition);
    assert.equal(await page.evaluate(id => CZMarchSave.read().tasks[id]?.completed, openingId), true);
    assert.equal(await page.evaluate(() => CZMarchStory.progress().completed), 1);
    report.checks.push('Refresh recovers an interrupted dialogue at its saved location; only explicit recording unlocks the main task and persists across reload');
    await page.click('[data-march-go]');
    await page.waitForFunction(() => document.querySelector('[data-march-distance]')?.textContent.includes('已到附近'), { timeout: 30000 });
    await page.click('[data-march-go]');
    await page.waitForSelector('#journeyChapter');
    const taskPosition = await snapshot();
    await page.screenshot({ path: path.join(root, '_shots/march-world-3d-main-task.png') });
    await clickText('#journeyChapter button', '保存并返回');
    await page.waitForFunction(() => !CZMarchStory.active && !document.querySelector('#journeyChapter'));
    assert.deepEqual(await snapshot(), taskPosition);
    assert.equal(await page.evaluate(() => CZMarchStory.progress().completed), 1);
    assert.equal(await page.evaluate(() => CZMarchSave.read().tasks['chapter-1/main-task']?.completed === true), false);
    report.checks.push('Original six-stage task opens from the 3D marker; cancelling returns to the same position without granting completion');
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await page.goto(origin + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await restore(false);
    assert.equal(await page.evaluate(() => CZMarchWorld.performance.backend), 'three');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert(await page.$eval('[data-march-go]', e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
    const mobileMainClient = await page.createCDPSession();
    const mobileMainJoy = await page.$eval('.czmw-stick86', e => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
    const mobileMainBefore = await snapshot();
    await mobileMainClient.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...mobileMainJoy, id: 1 }] });
    await mobileMainClient.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: mobileMainJoy.x + 30, y: mobileMainJoy.y, id: 1 }] });
    await page.waitForFunction(x => CZMarchWorld.snapshot().x > x + .5, { timeout: 15000 }, mobileMainBefore.x);
    await mobileMainClient.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForFunction(() => !CZMarchWorld._.scenes[CZMarchWorld.snapshot().sceneId].focusActor.moving);
    const mobileMainStopped = await snapshot();
    await frames(6);
    assert.deepEqual(await snapshot(), mobileMainStopped);
    await mobileMainClient.detach();
    await page.screenshot({ path: path.join(root, '_shots/march-world-3d-main-mobile.png') });
    await clickText('#march83-root .march83-hud button', '任务与线索');
    await page.waitForSelector('.march83-dialog[open]');
    assert(await page.$eval('.march83-dialog[open]', e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }));
    await page.screenshot({ path: path.join(root, '_shots/march-world-3d-main-mobile-tasks.png') });
    await clickText('.march83-dialog[open] button', '返回场景 · Esc');
    await page.waitForFunction(() => !CZMarchStory.active);
    report.checks.push('Mobile main entry restores progress, accepts real joystick input, keeps the primary action visible and fits the task dialog');
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.failedRequests, []);
    report.passed = true;
  } catch (error) {
    report.failure = error.stack;
    report.pendingRequests = [...pendingRequests].map(request => ({ url: request.url(), type: request.resourceType() }));
    await page.screenshot({ path: path.join(root, '_shots/march-world-3d-failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(root, '_shots/march-world-3d-browser.json'), JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify({ passed: report.passed, checks: report.checks.length, desktop: report.chapters.desktop.length, mobile: report.chapters.mobile.length, failure: report.failure, errors: report.errors, report: path.join(root, '_shots/march-world-3d-browser.json') }));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
