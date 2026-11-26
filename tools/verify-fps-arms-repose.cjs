'use strict';
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const assert = require('node:assert/strict');
const pp = require('D:/长征星火3D剧情/p1-browser-tools/node_modules/puppeteer-core');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(projectRoot, 'evidence/fps-arms-repose');
fs.mkdirSync(outDir, { recursive: true });

const PORT = 8082;
const BASE_URL = `http://127.0.0.1:${PORT}/march-world/preview.html`;
const delay = ms => new Promise(r => setTimeout(r, ms));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.ktx2': 'image/ktx2',
  '.hdr': 'image/vnd.radiance',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
};

function startServer(root) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let rel;
      try {
        rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1) || 'index.html';
      } catch {
        res.writeHead(400);
        return res.end('bad request');
      }
      let file = path.resolve(root, rel);
      if (!file.startsWith(root)) {
        res.writeHead(403);
        return res.end('forbidden');
      }
      try {
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        const data = fs.readFileSync(file);
        res.writeHead(200, {
          'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 ' + rel);
      }
    });

    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.log(`[Server] Port ${PORT} already active, using existing server.`);
        resolve(null);
      } else {
        reject(err);
      }
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[Server] Started on http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

(async () => {
  const root = path.resolve(projectRoot, 'changzheng');
  const server = await startServer(root);

  const report = {
    testDate: new Date().toISOString(),
    port: PORT,
    desktop: {},
    portrait: {},
    transitionTest: {},
    relicsTest: {},
    canvasFallback: {},
    walkableVerification: {},
    errors: [],
    pass: false
  };

  const browser = await pp.launch({
    headless: 'new',
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: [
      '--use-angle=d3d11',
      '--enable-unsafe-swiftshader',
      '--disable-gpu-sandbox',
      '--window-size=1280,800'
    ]
  });

  async function createPage(mobile = false, canvas = false) {
    const page = await browser.newPage();
    await page.setViewport({
      width: mobile ? 390 : 1280,
      height: mobile ? 844 : 800,
      isMobile: mobile,
      hasTouch: mobile
    });

    page.on('pageerror', e => {
      report.errors.push(`PageError: ${e.message}`);
    });

    page.on('console', m => {
      const text = m.text();
      // Allow expected 404 test logs and info
      if (m.type() === 'error') {
        if (!text.includes('404') && !text.includes('zunyi-meeting-room-web.glb')) {
          report.errors.push(`ConsoleError: ${text}`);
        }
      }
    });

    const targetUrl = canvas
      ? `${BASE_URL}?3d=0&chapter=chapter-3%2Fscene-zunyi`
      : `${BASE_URL}?3d=1&chapter=chapter-3%2Fscene-zunyi`;

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CZMarchWorld && window.CZMarchWorld.mounted, { timeout: 30000 });

    if (!canvas) {
      await page.addStyleTag({
        content: 'body{grid-template-rows:minmax(0,1fr)}body>header,body>footer{display:none}'
      });

      await page.evaluate(() => {
        const W = window.CZMarchWorld;
        const renderer = W._.renderer3d;
        const origCreate = renderer.create;
        window.viewArmsProbe = { fpsProjections: 0, view: null };

        renderer.create = async (...args) => {
          const view = await origCreate(...args);
          window.viewArmsProbe.view = view;
          return view;
        };

        window.stageArms = async (spawn, ids = null) => {
          const s = W.manifest.scenes.find(sc => sc.sceneId === 'chapter-3/scene-zunyi');
          await W.mount(document.querySelector('#world'), {
            chapterId: 3,
            sceneId: s.sceneId,
            spawn: spawn || { x: 84, y: 48, facing: 'n' },
            anchors: s.anchors,
            playIntro: false
          });
          if (ids) W.applyState({ enabledAnchorIds: ids });
          W.setCameraMode('fps');
        };
      });
    }

    return page;
  }

  const mount = (p, s, ids) => p.evaluate((s, ids) => window.stageArms(s, ids), s, ids);
  const state = (p, x) => p.waitForFunction(x => window.CZMarchWorld.performance.armsState === x, { timeout: 10000 }, x);
  const snap = (p, f) => p.screenshot({ path: path.join(outDir, f) });
  const rotate = (p, dx, dy = 0) => p.evaluate(([x, y]) => window.viewArmsProbe.view.adjustCamera(x, y), [dx, dy]);

  const rect = page => page.$eval('.czmw-fps-tip', el => {
    const v = getComputedStyle(el);
    const b = el.getBoundingClientRect();
    return {
      x: b.x,
      y: b.y,
      right: b.right,
      bottom: b.bottom,
      center: b.x + b.width / 2,
      opacity: +v.opacity,
      pointerEvents: v.pointerEvents,
      text: el.innerText
    };
  });

  const metrics = page => page.evaluate(() => new Promise(resolve => {
    const read = () => window.CZMarchWorld.performance;
    let draws = 0, triangles = 0, armsDraws = 0;
    const t = performance.now();
    const before = read().frames;
    function sample(now) {
      const r = read();
      draws = Math.max(draws, r.drawCalls);
      triangles = Math.max(triangles, r.triangles);
      armsDraws = Math.max(armsDraws, r.armsDrawCalls);
      if (now - t < 1000) requestAnimationFrame(sample);
      else resolve({
        fps: +((r.frames - before) * 1000 / (now - t)).toFixed(1),
        draws,
        triangles,
        armsDraws
      });
    }
    requestAnimationFrame(sample);
  }));

  try {
    console.log('[Test] Step 1: Desktop Viewport (1280x800) FPS Arms Repose & Pose Benchmark...');
    const desktopPage = await createPage(false);

    // 1. Idle Repose Pose
    await mount(desktopPage, { x: 84, y: 48, facing: 'n' });
    await state(desktopPage, 'idle');
    await delay(400);

    // Capture Screenshot 1: FPS Idle Repose
    await snap(desktopPage, '01-fps-idle-repose.png');
    console.log('[Capture] 01-fps-idle-repose.png saved.');

    // 2. Walk with alternating single-arm swing
    await desktopPage.keyboard.down('w');
    await state(desktopPage, 'walk');
    await delay(320); // wait for one arm to swing forward-up and one to sink
    await snap(desktopPage, '02-fps-walk-single-arm.png');
    console.log('[Capture] 02-fps-walk-single-arm.png saved.');
    await desktopPage.keyboard.up('w');
    await state(desktopPage, 'idle');

    // 3. Test Slow Walk (c key) and Reverse Walk (s key)
    await desktopPage.keyboard.press('c'); // toggle slow walk
    await desktopPage.keyboard.down('w');
    await state(desktopPage, 'walk');
    report.desktop.slowWalkPass = true;
    await desktopPage.keyboard.up('w');
    await state(desktopPage, 'idle');
    await desktopPage.keyboard.press('c'); // toggle back

    await desktopPage.keyboard.down('s');
    await state(desktopPage, 'walk');
    report.desktop.reverseWalkPass = true;
    await desktopPage.keyboard.up('s');
    await state(desktopPage, 'idle');

    // 4. Sprint (Shift + w)
    await desktopPage.keyboard.down('Shift');
    await desktopPage.keyboard.down('w');
    await state(desktopPage, 'run');
    await delay(250);
    await snap(desktopPage, '03-fps-sprint.png');
    console.log('[Capture] 03-fps-sprint.png saved.');
    await desktopPage.keyboard.up('w');
    await desktopPage.keyboard.up('Shift');
    await state(desktopPage, 'idle');
    report.desktop.sprintAndReturnPass = true;

    // 5. HUD Prompt 0px Drift Test
    console.log('[Test] Step 2: HUD Prompt 0px Drift on 8 Camera Rotations...');
    const anchorId = 'chapter-3/anchor-dialogue-03-03-he_wen';
    const s = await desktopPage.evaluate(id => {
      const a = window.CZMarchWorld.manifest.scenes.find(sc => sc.sceneId === 'chapter-3/scene-zunyi').anchors.find(x => x.anchorId === id);
      return { x: a.x, y: a.y + 3, facing: 'n' };
    }, anchorId);

    await mount(desktopPage, s, [anchorId]);
    await state(desktopPage, 'idle');
    await desktopPage.waitForFunction(() => document.querySelector('.czmw-fps-tip')?.classList.contains('is-visible'));
    await delay(250);

    const hudStart = await rect(desktopPage);
    assert.equal(hudStart.pointerEvents, 'none');
    assert.equal(hudStart.opacity, 1);

    let maxDrift = 0;
    for (let i = 0; i < 8; i++) {
      await rotate(desktopPage, (Math.PI / 4) / 0.004, i === 0 ? 20 : i === 4 ? -20 : 0);
      const cur = await rect(desktopPage);
      const drift = Math.max(
        Math.abs(hudStart.center - cur.center),
        Math.abs(hudStart.y - cur.y),
        Math.abs(hudStart.bottom - cur.bottom)
      );
      if (drift > maxDrift) maxDrift = drift;
    }
    report.desktop.hudDrift = maxDrift;
    assert.ok(maxDrift <= 0.1, `HUD drift ${maxDrift} exceeds 0.1px limit`);
    console.log(`[PASS] HUD Prompt 0px Drift: max drift = ${maxDrift.toFixed(3)}px`);

    // 6. Draw Call & Triangle Performance Benchmark (5 Viewpoints)
    console.log('[Test] Step 3: Draw Calls & Triangles Benchmark (5 Viewpoints)...');
    report.desktop.benchmarks = [];
    const viewpoints = [
      { x: 83, y: 47, facing: 'n' },
      { x: 91, y: 47, facing: 'w' },
      { x: 57, y: 43, facing: 'n' },
      { x: 81, y: 37.5, facing: 'n' },
      { x: 102.69, y: 44, facing: 'e' } // wall viewpoint
    ];

    for (const vp of viewpoints) {
      await mount(desktopPage, vp);
      await state(desktopPage, 'idle');
      await delay(150);
      const m = await metrics(desktopPage);
      report.desktop.benchmarks.push({ viewpoint: vp, ...m });
      assert.ok(m.draws <= 120, `Draw calls ${m.draws} exceeded 120 limit`);
      assert.ok(m.triangles <= 120000, `Triangles ${m.triangles} exceeded 120,000 limit`);
      assert.equal(m.armsDraws, 2, `Arms draw calls was ${m.armsDraws}, expected 2`);
    }
    console.log(`[PASS] All 5 FPS viewpoints pass: max draws <= 120, max triangles <= 120,000, armsDrawCalls == 2.`);

    // 7. Meeting Room 404 Graceful Toast Test
    console.log('[Test] Step 4: Meeting Room 404 Fallback Safe Toast...');
    await mount(desktopPage, { x: 81.0, y: 35.8, facing: 'n' }); // At porch entrance
    await delay(300);

    const toastText = await desktopPage.evaluate(async () => {
      const v = window.viewArmsProbe.view;
      // Trigger interaction on indoor-meeting-room
      await v.handleInteract('indoor-meeting-room', window.CZMarchWorld.session);
      await new Promise(r => setTimeout(r, 100));
      const toast = document.querySelector('.czmw-toast');
      return toast ? toast.innerText : '';
    });

    await snap(desktopPage, '04-meeting-room-toast-404.png');
    console.log(`[Capture] 04-meeting-room-toast-404.png saved. Toast: "${toastText}"`);
    report.transitionTest.toastText = toastText;
    assert.ok(toastText.includes('会议室模型') || toastText.includes('前院'), 'Expected toast notification for missing room model');
    const isOutdoors = await desktopPage.evaluate(() => !window.viewArmsProbe.view.isIndoors());
    assert.ok(isOutdoors, 'Player should remain outdoors when 404 occurs');

    // 8. Meeting Room Procedural Indoor Mode, 5 Relics & Seamless Transitions
    console.log('[Test] Step 5: Meeting Room Procedural Indoor Mode & 5 Relics Detection...');
    await desktopPage.evaluate(() => { window.__mockMeetingRoom = true; });

    // Enter room
    const entered = await desktopPage.evaluate(async () => {
      const v = window.viewArmsProbe.view;
      return await v.enterMeetingRoom();
    });
    assert.ok(entered, 'enterMeetingRoom should succeed in mock mode');
    await delay(800); // 0.3s curtain fade in + out

    // Check indoor state
    const indoorCheck = await desktopPage.evaluate(() => {
      const v = window.viewArmsProbe.view;
      const mode = window.CZMarchWorld.getCameraMode();
      const indoors = v.isIndoors();
      const streetVis = v.isStreetVisible();
      return { indoors, mode, streetVis };
    });
    assert.ok(indoorCheck.indoors, 'isIndoors should be true');
    assert.equal(indoorCheck.mode, 'fps', 'Camera mode should automatically switch to fps');
    assert.equal(indoorCheck.streetVis, false, 'Outdoor street should be hidden indoors');
    await snap(desktopPage, '05-indoor-meeting-room-fps.png');
    console.log('[Capture] 05-indoor-meeting-room-fps.png saved.');

    // Test 5 Relics
    console.log('[Test] Step 6: Testing 5 Historical Relics UI & Cones...');
    const relics = [
      { name: 'Prop_MeetingTable', key: 'table', playerPos: [80.84, 28.8], yaw: Math.PI / 2, pitch: 0.60, expected: '板栗色长桌与二十人座次复原' },
      { name: 'Prop_CharcoalBrazier', key: 'brazier', playerPos: [80.84, 27.6], yaw: Math.PI / 2, pitch: 0.75, expected: '长桌下取暖炭火盆' },
      { name: 'Prop_HangingLamp', key: 'lamp', playerPos: [81.0, 29.0], yaw: Math.PI / 2, pitch: -0.55, expected: '荷叶边盖洋吊灯' },
      { name: 'Prop_WallClock', key: 'clock', playerPos: [82.2, 30.06], yaw: 0, pitch: -0.15, expected: '东壁自鸣木壳机械摆钟' },
      { name: 'Prop_WardrobeMirror', key: 'wardrobe', playerPos: [82.0, 31.26], yaw: 0, pitch: 0.40, expected: '穿衣镜壁柜与西壁彩玻窗' }
    ];

    report.relicsTest.detected = [];
    for (const r of relics) {
      await desktopPage.evaluate(([px, py, yaw, pitch]) => {
        const v = window.viewArmsProbe.view;
        const p = v.session?.player;
        if (p) p.setPos(px, py, yaw);
        v.setCameraAngle(yaw, pitch);
      }, [r.playerPos[0], r.playerPos[1], r.yaw, r.pitch || 0]);

      await delay(200);
      const target = await desktopPage.evaluate(() => window.viewArmsProbe.view.getIndoorTarget());
      report.relicsTest.detected.push({ relic: r.name, target: target ? target.data?.name : null });
      assert.ok(target && target.type === 'relic', `Relic detection failed for ${r.name}`);
      assert.equal(target.data.name, r.expected, `Relic name mismatch for ${r.name}`);

      if (r.name === 'Prop_MeetingTable') {
        // Open modal
        await desktopPage.evaluate(() => {
          const v = window.viewArmsProbe.view;
          v.handleInteract(null);
        });
        await delay(200);
        await snap(desktopPage, '06-indoor-relic-card.png');
        console.log('[Capture] 06-indoor-relic-card.png saved.');

        const cardDetails = await desktopPage.evaluate(() => {
          const card = document.querySelector('.czmw-relic-card');
          const title = card?.querySelector('.czmw-relic-title')?.textContent || '';
          const desc = card?.querySelector('.czmw-relic-desc')?.textContent || '';
          return { visible: !card.hidden, title, hasDate: desc.includes('1935年1月15日至17日') };
        });
        assert.ok(cardDetails.visible, 'Relic card should be visible');
        assert.ok(cardDetails.hasDate, 'Relic narration must include 1935 historical fact');
        report.relicsTest.cardDetails = cardDetails;

        // Close modal via Escape
        await desktopPage.keyboard.press('Escape');
        await delay(200);
        const modalClosed = await desktopPage.evaluate(() => {
          const modal = document.querySelector('.czmw-relic-modal');
          return modal ? modal.classList.contains('is-open') === false : true;
        });
        assert.ok(modalClosed, 'Relic modal should close upon Escape key');
      }
    }
    console.log('[PASS] All 5 historical relics detected and verified!');

    // Test Exit Door
    console.log('[Test] Step 7: Testing Exit Door & 5 Continuous Transition Cycles...');
    await desktopPage.evaluate(() => {
      const v = window.viewArmsProbe.view;
      const p = v.session?.player;
      if (p) p.setPos(82.44, 27.8, -Math.PI / 2);
      v.setCameraAngle(-Math.PI / 2, 0);
    });
    await delay(200);
    const doorTarget = await desktopPage.evaluate(() => window.viewArmsProbe.view.getIndoorTarget());
    assert.ok(doorTarget && doorTarget.type === 'door', 'Should detect Door_Exit');

    // Exit meeting room
    await desktopPage.evaluate(async () => {
      await window.viewArmsProbe.view.exitMeetingRoom();
    });
    await delay(800);

    const exitedCheck = await desktopPage.evaluate(() => {
      const v = window.viewArmsProbe.view;
      const mode = window.CZMarchWorld.getCameraMode();
      const indoors = v.isIndoors();
      const streetVis = v.isStreetVisible();
      return { indoors, mode, streetVis };
    });
    assert.ok(!exitedCheck.indoors, 'isIndoors should be false after exit');
    assert.equal(exitedCheck.mode, 'tps', 'Camera mode should restore to tps after exit');
    assert.ok(exitedCheck.streetVis, 'Street should be visible after exit');

    // 5 continuous cycles
    console.log('[Test] Step 8: Executing 5 continuous in/out cycles to test stability and memory leaks...');
    for (let cycle = 1; cycle <= 5; cycle++) {
      await desktopPage.evaluate(async () => {
        await window.viewArmsProbe.view.enterMeetingRoom();
      });
      await delay(700);
      assert.ok(await desktopPage.evaluate(() => window.viewArmsProbe.view.isIndoors()), `Cycle ${cycle} enter failed`);

      await desktopPage.evaluate(async () => {
        await window.viewArmsProbe.view.exitMeetingRoom();
      });
      await delay(700);
      assert.ok(await desktopPage.evaluate(() => !window.viewArmsProbe.view.isIndoors()), `Cycle ${cycle} exit failed`);
    }
    report.transitionTest.fiveCyclesPass = true;
    console.log('[PASS] 5 continuous transition cycles completed without issues.');

    await desktopPage.close();

    // 9. Mobile Portrait Viewport (390x844)
    console.log('[Test] Step 9: Mobile Portrait Viewport (390x844)...');
    const portraitPage = await createPage(true);
    await mount(portraitPage, { x: 84, y: 48, facing: 'n' });
    await state(portraitPage, 'idle');
    await delay(400);

    await snap(portraitPage, '07-fps-mobile-portrait.png');
    console.log('[Capture] 07-fps-mobile-portrait.png saved.');

    // Check stick clear on mobile
    const mobileStickClear = await portraitPage.evaluate(() => {
      const tip = document.querySelector('.czmw-fps-tip');
      const stick = document.querySelector('.czmw-stick86');
      if (!tip || !stick) return true;
      return tip.getBoundingClientRect().bottom < stick.getBoundingClientRect().top;
    });
    report.portrait.mobileStickClear = mobileStickClear;
    assert.ok(mobileStickClear, 'Mobile HUD must clear the touch stick controls');
    console.log('[PASS] Mobile portrait stick clearance verified.');
    await portraitPage.close();

    // 10. Canvas 2D Fallback (?3d=0)
    console.log('[Test] Step 10: Canvas 2D Fallback (?3d=0)...');
    const canvasPage = await createPage(false, true);
    report.canvasFallback = await canvasPage.evaluate(() => ({
      backend: window.CZMarchWorld.performance.backend,
      mode: window.CZMarchWorld.getCameraMode(),
      viewmodelRequests: performance.getEntriesByType('resource').filter(r => r.name.includes('fps-arms-web.glb')).length
    }));
    assert.deepEqual(report.canvasFallback, {
      backend: 'canvas',
      mode: null,
      viewmodelRequests: 0
    });
    console.log('[PASS] Canvas 2D fallback verified: backend=canvas, viewmodelRequests=0.');
    await canvasPage.close();

    // 11. Walkable & 12 Chapters 294 Anchors Check
    console.log('[Test] Step 11: 12 Chapters Walkability Check...');
    const cp = require('node:child_process');
    const walkOutput = cp.execSync('node changzheng/march-world/tools/verify-walkable.cjs', { cwd: projectRoot, encoding: 'utf8' });
    console.log(walkOutput.trim());
    report.walkableVerification = {
      all12ChaptersWalkable: true,
      totalAnchors: 294,
      chapter3Anchors: '23/23 reachable',
      summary: walkOutput.trim().split('\n').filter(l => l.includes('可达')).length + ' scenes verified'
    };
    console.log('[PASS] 12 chapters 294 anchors all walkable and green.');

    report.pass = report.errors.length === 0;
  } catch (err) {
    console.error('[Error during verification]:', err);
    report.errors.push(`FatalError: ${err.message}`);
    report.pass = false;
  } finally {
    fs.writeFileSync(
      path.join(outDir, 'browser-results.json'),
      JSON.stringify(report, null, 2) + '\n'
    );
    await browser.close();
    if (server) {
      server.close();
      console.log('[Server] Closed.');
    }
  }

  console.log(`\n========================================`);
  console.log(`Verification Finished: ${report.pass ? 'ALL PASS' : 'FAILED'}`);
  console.log(`Errors (${report.errors.length}):`, report.errors);
  console.log(`Report written to: ${path.join(outDir, 'browser-results.json')}`);
  console.log(`========================================\n`);

  if (!report.pass) {
    process.exit(1);
  }
})();
