const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const puppeteer = require(process.env.PUPPETEER_PATH || '../../_browser/node_modules/puppeteer-core');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    protocolTimeout: 120000,
    args: process.env.CZ_SOFTWARE_GL === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []
  });
  const page = await browser.newPage();
  const report = {
    passed: false, checks: [], errors: [], failedRequests: [], console: [],
    renderer: process.env.CZ_SOFTWARE_GL === '1' ? 'Chrome SwiftShader; not device performance acceptance' : 'Chrome hardware-selected WebGL; mobile viewport emulation is not phone hardware acceptance',
    generatedAt: new Date().toISOString(),
    assetSHA256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'assets/characters/he-wen/he-wen-study-v1.glb'))).digest('hex'),
    previewSHA256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'march-world/engine/character-preview.js'))).digest('hex'),
    visualApproval: false
  };
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (['error', 'warn'].includes(message.type())) report.console.push(message.text());
    if (message.type() === 'error') report.errors.push(message.text());
  });
  page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on('response', response => { if (response.status() >= 400) report.failedRequests.push({ url: response.url(), status: response.status() }); });
  const origin = process.env.PREVIEW_ORIGIN || 'http://127.0.0.1:8080';
  const loaded = () => page.waitForFunction(() => window.characterPreview?.stats, { timeout: 120000 });
  const frames = () => page.evaluate(() => new Promise(resolve => {
    let count = 0;
    const frame = () => ++count > 5 ? resolve() : requestAnimationFrame(frame);
    requestAnimationFrame(frame);
  }));
  const shot = async name => { await frames(); await page.screenshot({ path: path.join(root, '_shots', name + '.png') }); };
  const inspectMaterials = () => page.evaluate(() => {
    const details = [];
    characterPreview.model.traverse(node => {
      if (!node.isMesh) return;
      details.push({
        name: node.name, vertices: node.geometry.attributes.position.count, indices: node.geometry.index?.count || 0,
        materials: (Array.isArray(node.material) ? node.material : [node.material]).map(material => ({
          name: material.name, alphaTest: material.alphaTest, alphaToCoverage: material.alphaToCoverage,
          maps: ['map', 'normalMap', 'roughnessMap', 'aoMap', 'alphaMap'].filter(key => material[key]).map(key => ({
            key, width: material[key].image?.width || 0, height: material[key].image?.height || 0,
            repeat: material[key].repeat.toArray(), colorSpace: material[key].colorSpace
          }))
        }))
      });
    });
    return details;
  });
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(root, 'source-assets/characters/he-wen/face-spec.json'), 'utf8'));
    assert.equal(report.assetSHA256, spec.runtimeAsset.sha256);
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(origin + '/march-world/character-preview.html?renderer=webgl', { waitUntil: 'domcontentloaded' });
    await loaded();
    report.stats = await page.evaluate(() => characterPreview.stats);
    report.gpu = await page.evaluate(() => {
      const gl = characterPreview.renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
      return gl.getParameter(debug ? debug.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
    });
    report.materials = await inspectMaterials();
    for (const mesh of report.materials) for (const material of mesh.materials) assert(material.maps.every(map => map.width > 0 && map.height > 0), mesh.name + ': every declared map must load');
    const skin = report.materials.find(mesh => mesh.name === 'HeWen_Skin');
    for (const key of ['map', 'normalMap', 'roughnessMap', 'aoMap']) assert(skin.materials[0].maps.some(map => map.key === key), 'Skin retains ' + key);
    const skinColor = skin.materials[0].maps.find(map => map.key === 'map');
    assert(skinColor.width >= 2048 && skinColor.height >= 2048, 'Skin retains full base color resolution');
    for (const name of ['HeWen_Hair', 'HeWen_Eyebrows']) {
      const hair = report.materials.find(mesh => mesh.name === name);
      assert(hair?.materials.every(material => material.alphaToCoverage && material.maps.some(map => map.key === 'map')), name + ': original hair maps use alpha-to-coverage');
    }
    report.checks.push('Skin retains full-resolution albedo, micro-normal, roughness and occlusion; hair cards retain mapped alpha coverage');
    assert(report.stats.bones > 40);
    assert(report.stats.skinnedMeshes >= 5);
    assert(report.stats.heightMeters > 1.74 && report.stats.heightMeters < 1.84, `Unexpected height: ${report.stats.heightMeters}`);
    const armDirections = await page.evaluate(() => {
      const { model, camera } = characterPreview;
      return ['l', 'r'].map(side => {
        const shoulder = model.getObjectByName('upperarm_' + side).getWorldPosition(camera.position.clone());
        const elbow = model.getObjectByName('lowerarm_' + side).getWorldPosition(camera.position.clone());
        return elbow.sub(shoulder).toArray();
      });
    });
    for (const arm of armDirections) assert(arm[1] < -0.18 && Math.abs(arm[0]) < 0.12, `Arm is not resting naturally: ${arm}`);
    report.checks.push('Measured exported height and frozen Idle pose preserve character proportions and lowered arms');
    for (const name of ['eyeBlinkLeft', 'eyeBlinkRight', 'jawOpen']) assert(report.stats.expressions.includes(name));
    report.checks.push('Independent GLB loads with textured skinned meshes, rig and expression morph targets');
    const wardrobe = await page.evaluate(() => {
      const names = ['HeWen_EightPanelCap', 'HeWen_CapVisor', 'HeWen_CapRedStar', 'HeWen_LeatherBelt', 'HeWen_Clothes'];
      const { model } = characterPreview;
      const garment = model.getObjectByName('HeWen_Clothes');
      const indices = garment.geometry.attributes.skinIndex.array;
      const weights = garment.geometry.attributes.skinWeight.array;
      const joints = new Set();
      for (let i = 0; i < indices.length; i++) if (weights[i] > 0.0001) joints.add(indices[i]);
      return { present: names.every(name => model.getObjectByName(name)?.isSkinnedMesh), garmentJoints: joints.size };
    });
    assert(wardrobe.present);
    assert(wardrobe.garmentJoints > 1);
    report.checks.push('Cap, visor, red star and belt load; stable garment retains multi-joint skinning');
    const attachments = await page.evaluate(() => {
      const { model } = characterPreview;
      const names = ['HeWen_BreastPocket', 'HeWen_PocketFlap', 'HeWen_TunicClosure', 'HeWen_LeatherBelt', 'HeWen_UpperTunic'];
      return names.map(name => {
        const mesh = model.getObjectByName(name);
        const { skinIndex, skinWeight } = mesh.geometry.attributes;
        const joints = new Set();
        let normalized = true;
        for (let i = 0; i < skinWeight.count; i++) {
          let sum = 0;
          for (let j = 0; j < 4; j++) {
            const weight = skinWeight.array[i * 4 + j];
            sum += weight;
            if (weight > 0.0001) joints.add(skinIndex.array[i * 4 + j]);
          }
          normalized &&= Math.abs(sum - 1) < 0.001;
        }
        return { name, normalized, joints: joints.size };
      });
    });
    for (const attachment of attachments) {
      assert(attachment.normalized, `${attachment.name} weights are not normalized`);
      assert(attachment.joints > 1, `${attachment.name} is rigidly attached`);
    }
    const contactMaps = await page.evaluate(() => ['HeWen_Skin', 'HeWen_Clothes'].every(name => characterPreview.model.getObjectByName(name).material.aoMap?.isTexture));
    assert(contactMaps, 'Contact occlusion textures are missing from browser materials');
    report.checks.push('Pockets, placket, belt and inner tunic retain normalized weights; skin and tunic contact maps load');
    report.neckline = await page.evaluate(async () => {
      const T = await import('three'), { model } = characterPreview;
      const lining = model.getObjectByName('HeWen_UpperTunic'), skin = model.getObjectByName('HeWen_Skin');
      model.updateMatrixWorld(true); lining.skeleton.update(); skin.skeleton.update();
      skin.computeBoundingBox(); skin.computeBoundingSphere();
      const points = Array.from({ length: lining.geometry.attributes.position.count }, (_, index) => lining.localToWorld(lining.getVertexPosition(index, new T.Vector3())));
      const top = Math.max(...points.map(point => point.y));
      const ray = new T.Raycaster(), clearances = [];
      for (const point of points.filter(point => point.y >= top - .02)) {
        ray.set(new T.Vector3(point.x, point.y, 1), new T.Vector3(0, 0, -1));
        const hit = ray.intersectObject(skin, false)[0];
        if (hit) clearances.push(point.z - hit.point.z);
      }
      return { samples: clearances.length, minimumClearance: Math.min(...clearances), intersections: clearances.filter(clearance => clearance < -.0002).length };
    });
    assert(report.neckline.samples >= 13, 'Neckline clearance checks cover the exported upper edge');
    assert.equal(report.neckline.intersections, 0, 'Visible neckline must remain outside the skinned body');
    report.checks.push('Exported curved neckline stays outside the actual skinned body in the resting pose');
    await page.click('[data-view="front"]');
    await shot('he-wen-browser-front-v1');
    await page.click('[data-view="quarter"]');
    await shot('he-wen-browser-quarter-v1');
    await page.click('[data-view="profile"]');
    await shot('he-wen-browser-profile-v1');
    await page.click('[data-view="body"]');
    await shot('he-wen-browser-body-v1');
    await page.evaluate(() => characterPreview.camera.position.set(0, 1, -3.2));
    await shot('he-wen-browser-back-v1');
    report.checks.push('Front, three-quarter, side, full-body and rear inspection views render');
    await page.click('[data-view="front"]');
    await page.click('#clay');
    assert.equal(await page.$eval('#clay', element => element.getAttribute('aria-pressed')), 'true');
    await shot('he-wen-browser-clay-v1');
    await page.click('#clay');
    await page.$eval('#blink', input => { input.value = '1'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.$eval('#jaw', input => { input.value = '0.35'; input.dispatchEvent(new Event('input', { bubbles: true })); });
    const expressions = await page.evaluate(() => {
      const values = [];
      characterPreview.model.traverse(node => {
        if (node.name === 'HeWen_Skin') values.push(...Object.entries(node.morphTargetDictionary).map(([key, index]) => [key, node.morphTargetInfluences[index]]));
      });
      return Object.fromEntries(values);
    });
    assert.equal(expressions.eyeBlinkLeft, 1);
    assert.equal(expressions.eyeBlinkRight, 1);
    assert.equal(expressions.jawOpen, 0.35);
    await shot('he-wen-browser-expression-v1');
    report.checks.push('Clay/material toggle and bilateral blink plus jaw sliders affect the exported morphs');
    for (const clip of report.stats.animations) {
      await page.select('#animation', clip);
      await frames();
    }
    await page.select('#animation', '');
    report.checks.push('Every exported animation can be selected and stopped');
    const beforeDrag = await page.evaluate(() => characterPreview.camera.position.toArray());
    await page.mouse.move(700, 380);
    await page.mouse.down();
    await page.mouse.move(830, 410, { steps: 12 });
    await page.mouse.up();
    await frames();
    const afterDrag = await page.evaluate(() => characterPreview.camera.position.toArray());
    assert(afterDrag.some((value, index) => Math.abs(value - beforeDrag[index]) > 0.01));
    report.checks.push('Real mouse drag rotates the model view');
    await page.goto('about:blank');
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.goto(origin + '/march-world/character-preview.html?renderer=webgl', { waitUntil: 'domcontentloaded' });
    await loaded();
    assert.deepEqual(await inspectMaterials(), report.materials, 'Mobile retains every desktop mesh and material map without simplification');
    report.checks.push('390px touch viewport retains identical mesh detail and skin, hair and clothing texture dimensions');
    await page.click('[data-view="front"]');
    await shot('he-wen-browser-mobile-v1');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const contextLost = await page.evaluate(() => {
      const extension = characterPreview.renderer.getContext().getExtension('WEBGL_lose_context');
      extension.loseContext();
      return true;
    });
    assert(contextLost);
    await page.waitForFunction(() => document.getElementById('status').textContent.includes('上下文已丢失'));
    report.checks.push('390px mobile layout has no horizontal overflow and context loss displays recovery guidance');
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.failedRequests, []);
    report.passed = true;
  } catch (error) {
    report.failure = error.stack;
    await page.screenshot({ path: path.join(root, '_shots/he-wen-browser-failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(root, '_shots/he-wen-browser.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    await browser.close();
  }
})();
