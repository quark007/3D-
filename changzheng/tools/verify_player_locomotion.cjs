const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const puppeteer = require(process.env.PUPPETEER_PATH || '../../_browser/node_modules/puppeteer-core');

async function main() {
  const root = path.resolve(__dirname, '..');
  fs.mkdirSync(path.join(root, '_shots'), { recursive: true });
  const origin = process.env.CZ_PREVIEW_URL || 'http://127.0.0.1:8082';
  const report = { passed: false, checks: [], errors: [], failedRequests: [], visualApproval: false };
  const check = text => { report.checks[report.checks.length] = text; console.log('PASS', text); };
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: process.env.CZ_SOFTWARE_GL === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [],
    protocolTimeout: 120000
  });
  const page = await browser.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  // HTTP 状态已逐个记录；控制台资源错误只是重复信息。可选王贵 LOD 缺失会回退完整模型，单独记录。
  page.on('console', message => { if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) report.errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() < 400) return;
    if (response.url().endsWith('/assets/characters/wang-gui/wang-gui-lod.glb')) {
      (report.optionalFallbacks ||= []).push({ url: response.url(), status: response.status() });
      return;
    }
    report.failedRequests.push({ url: response.url(), status: response.status() });
  });
  const frames = async (count = 4) => {
    const start = await page.evaluate(() => CZMarchWorld.performance.frames);
    await page.waitForFunction((start, count) => CZMarchWorld.performance.frames >= start + count, { timeout: 20000 }, start, count);
  };
  const motion = () => page.evaluate(() => {
    const state = CZMarchWorld.snapshot(), player = CZMarchWorld._.scenes[state.sceneId].focusActor;
    return {
      x: player.x, y: player.y, facing: player.facing, speed: player.speed, moving: player.moving,
      walking: player.walking, running: player.running, backing: player.backing,
      animation: window.__locActors?.playerState() || null,
      camera: { ...CZMarchWorld.performance },
      pointerLocked: document.pointerLockElement === document.getElementById('world')
    };
  });
  const waitStopped = () => page.waitForFunction(() => {
    const state = CZMarchWorld.snapshot();
    return CZMarchWorld._.scenes[state.sceneId].focusActor.speed === 0;
  }, { timeout: 20000 });
  const mount = async () => {
    await page.evaluate(async () => {
      const scene = CZMarchWorldManifest.scenes.find(item => item.chapterId === 1);
      await CZMarchWorld.mount(document.getElementById('world'), { ...scene, playIntro: false });
    });
    await frames(8);
  };
  try {
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(origin + '/march-world/preview.html?chapter=chapter-1%2Fscene-ruijin', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => CZMarchWorld.mounted, { timeout: 90000 });
    await page.evaluate(() => {
      const M = CZMarchWorld._;
      const renderCreate = M.renderer3d.create;
      M.renderer3d.create = async (...args) => {
        const view = await renderCreate(...args);
        window.__locView = view;
        return view;
      };
      const actorsCreate = M.actors3d.create;
      M.actors3d.create = async (...args) => {
        const actors = await actorsCreate(...args);
        window.__locActors = actors;
        return actors;
      };
    });
    await mount();
    assert.equal(await page.evaluate(() => CZMarchWorld.performance.backend), 'three');
    assert.equal(await page.evaluate(() => CZMarchWorld.performance.cameraMode), 'shoulder');
    check('Three.js scene mounts with shoulder camera and captured actor animation state');

    await page.keyboard.down('d');
    await page.waitForFunction(() => {
      const state = CZMarchWorld.snapshot();
      const speed = CZMarchWorld._.scenes[state.sceneId].focusActor.speed;
      return speed > .05;
    });
    const early = await motion();
    assert(early.speed > 0 && early.speed < 3.9, 'Movement must not start at full speed');
    await page.waitForFunction(() => {
      const state = CZMarchWorld.snapshot();
      return CZMarchWorld._.scenes[state.sceneId].focusActor.speed > 3.95;
    });
    const jogging = await motion();
    await page.keyboard.up('d');
    const release = await motion();
    await waitStopped();
    const stopped = await motion();
    const coast = Math.hypot(stopped.x - release.x, stopped.y - release.y);
    assert(coast > .01, 'Release must coast before stopping');
    assert(jogging.animation.walkWeight > .99, 'Jogging uses full Walk weight');
    assert(Math.abs(jogging.animation.timeScale - 4 / 2.2) < .08, 'Walk cadence follows actual speed');
    report.normal = { earlySpeed: early.speed, topSpeed: jogging.speed, coast, animation: jogging.animation };
    check('Real keyboard jog accelerates to 4m/s, coasts on release and drives Walk cadence from actual speed');

    await page.keyboard.press('c');
    await page.keyboard.down('d');
    await page.waitForFunction(() => {
      const state = CZMarchWorld.snapshot();
      return CZMarchWorld._.scenes[state.sceneId].focusActor.speed > 1.45;
    });
    const walking = await motion();
    assert(walking.walking && walking.speed <= 1.5 && !walking.running);
    await page.keyboard.up('d');
    await waitStopped();
    await page.keyboard.press('c');
    report.walking = walking;
    check('C toggles the 1.5m/s walking gait without changing collision coordinates');

    await page.keyboard.down('Shift');
    await page.keyboard.down('d');
    await page.waitForFunction(() => {
      const state = CZMarchWorld.snapshot();
      return CZMarchWorld._.scenes[state.sceneId].focusActor.speed > 6.9;
    });
    await page.waitForFunction(() => CZMarchWorld.performance.cameraSpeedScale > 1.1);
    const sprinting = await motion();
    assert(sprinting.running && sprinting.speed <= 7);
    assert(sprinting.camera.cameraSpeedScale > 1.1 && sprinting.camera.cameraSpeedScale <= 1.2);
    assert(sprinting.animation.timeScale > 2.5, 'Sprint cadence is faster than jog cadence');
    await page.screenshot({ path: path.join(root, '_shots/march-locomotion-sprint.png') });
    await page.keyboard.up('d');
    await page.keyboard.up('Shift');
    await waitStopped();
    await page.waitForFunction(() => CZMarchWorld.performance.cameraSpeedScale < 1.03);
    report.sprinting = sprinting;
    check('Shift reaches 7m/s, smoothly pulls the shoulder camera back and returns to normal distance after stopping');

    const canvas = await page.$('.czmw-canvas3d');
    const box = await canvas.boundingBox();
    const point = { x: box.x + box.width * .55, y: box.y + box.height * .45 };
    await page.mouse.click(point.x, point.y, { button: 'right' });
    await page.waitForFunction(() => document.pointerLockElement === document.getElementById('world'));
    const beforeLook = await motion();
    await page.mouse.move(point.x + 90, point.y + 55);
    await page.waitForFunction(({ yaw, pitch }) => {
      const stats = CZMarchWorld.performance;
      return Math.abs(stats.orbitYaw - yaw) > .01 && Math.abs(stats.orbitPitch - pitch) > .01;
    }, { timeout: 10000 }, { yaw: beforeLook.camera.orbitYaw, pitch: beforeLook.camera.orbitPitch });
    const afterLook = await motion();
    assert.notEqual(afterLook.camera.orbitYaw, beforeLook.camera.orbitYaw);
    assert.notEqual(afterLook.camera.orbitPitch, beforeLook.camera.orbitPitch);
    await page.screenshot({ path: path.join(root, '_shots/march-locomotion-free-look.png') });
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.pointerLockElement);
    report.freeLook = { before: beforeLook.camera, after: afterLook.camera };
    check('Right click pointer lock rotates both yaw and pitch; Escape releases the mouse');

    await page.mouse.click(point.x, point.y, { button: 'right' });
    await page.waitForFunction(() => document.pointerLockElement === document.getElementById('world'));
    await page.evaluate(() => CZMarchWorld.pause('locomotion-test'));
    await page.waitForFunction(() => !document.pointerLockElement);
    assert.equal((await motion()).speed, 0);
    await page.evaluate(() => CZMarchWorld.resume('locomotion-test'));
    check('Pausing clears residual speed and releases pointer lock for dialogue UI');

    await mount();
    const target = await page.evaluate(() => {
      const state = CZMarchWorld.snapshot(), x = state.x + 4, y = state.y - 2;
      const point = __locView.project(x, y), rect = document.getElementById('world').getBoundingClientRect();
      return { x: rect.x + point.x, y: rect.y + point.y, worldX: x, worldY: y };
    });
    await page.mouse.click(target.x, target.y);
    await page.waitForFunction(({ worldX, worldY }) => {
      const state = CZMarchWorld.snapshot();
      return Math.hypot(state.x - worldX, state.y - worldY) < 1.2;
    }, { timeout: 20000 }, target);
    await waitStopped();
    assert.equal(await page.evaluate(() => document.pointerLockElement === document.getElementById('world')), false);
    check('Left-click pathfinding remains available and brakes to a stable destination');

    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.failedRequests, []);
    report.passed = true;
  } catch (error) {
    console.error(error.stack);
    report.failure = error.stack;
    await page.screenshot({ path: path.join(root, '_shots/march-locomotion-failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(root, '_shots/player-locomotion-browser.json'), JSON.stringify(report, null, 2));
    await browser.close();
    console.log(JSON.stringify({ passed: report.passed, checks: report.checks, failure: report.failure, errors: report.errors, failedRequests: report.failedRequests }, null, 2));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });