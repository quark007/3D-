// 第 3 章遵义街景一键自检：在 preview.html?3d=1 页面按 F12，把整段粘到控制台回车，约 30 秒出结果。
// 会依次挂载 4 个站点各测 4 秒，结果打印在控制台并自动复制到剪贴板。
(async () => {
  const W = window.CZMarchWorld;
  const logs = [];
  const hook = kind => { const original = console[kind]; console[kind] = (...args) => { logs.push([kind, args.map(String).join(' ').slice(0, 400)]); original.apply(console, args); }; return original; };
  const restoreError = hook('error'), restoreWarn = hook('warn');
  const onError = event => logs.push(['error', String(event.message || event.reason)]);
  addEventListener('error', onError); addEventListener('unhandledrejection', onError);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const summary = {};
  try {
    // 1. 文件是否放对位置
    summary.文件 = {};
    for (const url of ['/assets/scenes/zunyi-realscan/zunyi_street.glb', '/assets/characters/civilians/civ-farmer.glb',
      '/assets/characters/civilians/civ-woman.glb', '/assets/characters/civilians/civ-elder.glb']) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        summary.文件[url.split('/').pop()] = response.ok ? (await response.blob()).size / 1048576 + 0 : 'HTTP ' + response.status;
      } catch (error) { summary.文件[url.split('/').pop()] = String(error); }
    }
    for (const key in summary.文件) if (typeof summary.文件[key] === 'number') summary.文件[key] = summary.文件[key].toFixed(1) + 'MB';

    // 2. 四个站点：帧率、镜头距离、镜头跳变
    const scene = W.manifest.scenes.find(s => s.sceneId === 'chapter-3/scene-zunyi');
    const spots = [['出生点·主街西', { x: 16, y: 58, facing: 'e' }], ['茶摊旁', { x: 43, y: 56, facing: 'e' }],
      ['院落北侧（原贴脸点）', { x: 84, y: 40, facing: 'n' }], ['菜市', { x: 30, y: 74, facing: 's' }]];
    summary.站点 = [];
    for (const [name, spawn] of spots) {
      await W.mount(document.getElementById('world'), { chapterId: 3, sceneId: scene.sceneId, spawn, anchors: scene.anchors });
      document.querySelector('.czmw-cinema-skip3d')?.click();
      await sleep(2500);
      const distances = []; let frames = 0; const start = performance.now();
      await new Promise(done => (function tick() {
        frames++; distances.push(W.performance?.cameraDistance);
        performance.now() - start < 4000 ? requestAnimationFrame(tick) : done();
      })());
      const d = distances.filter(Number.isFinite), steps = d.slice(1).map((v, i) => Math.abs(v - d[i]));
      const p = W.performance || {};
      summary.站点.push({ 位置: name, fps: Math.round(frames / 4), 镜头最近: d.length ? Math.min(...d) : null,
        镜头每帧最大变化: +Math.max(0, ...steps).toFixed(3), drawCalls: p.drawCalls, triangles: p.triangles });
    }

    // 3. 各项改动是否生效
    const p = W.performance || {};
    Object.assign(summary, { 渲染后端: p.backend, 阴影: p.streetShadows, 街景相机: p.streetCamera, 去重复: p.noTile, 街市: p.streetLife });
  } catch (error) {
    summary.脚本中断 = String(error && error.stack || error).slice(0, 600);
  }
  removeEventListener('error', onError); removeEventListener('unhandledrejection', onError);
  console.error = restoreError; console.warn = restoreWarn;

  const pick = re => logs.filter(([, message]) => re.test(message)).map(([, message]) => message);
  summary.着色器错误 = pick(/Shader Error|WebGLProgram|WebGLShader|ERROR: 0:/i);
  summary.人物回退 = pick(/独立人物模型回退/);
  summary.zunyi警告 = pick(/\[zunyi\]/);
  summary.其它报错 = logs.filter(([kind, message]) => kind === 'error' && !/Shader Error|WebGLProgram|WebGLShader|ERROR: 0:/i.test(message)).map(([, m]) => m).slice(0, 10);

  // 4. 自动判定
  const fileOk = Object.values(summary.文件 || {}).every(v => /MB$/.test(v));
  const spotsOk = (summary.站点 || []).length === 4 && summary.站点.every(s => s.镜头最近 >= .9 && s.镜头每帧最大变化 < .35);
  summary.判定 = {
    文件齐全: fileOk,
    着色器无报错: !summary.着色器错误.length,
    五种材质去重复: Array.isArray(summary.去重复) && ['stone', 'brick', 'roof', 'plaster', 'wood'].every(k => summary.去重复.includes(k)),
    街市12摊16招牌: summary.街市?.stalls === 12 && summary.街市?.signs === 16,
    平民模型已加载: fileOk && !summary.人物回退.length,
    镜头不贴脸不跳变: spotsOk,
    帧率不低于30: (summary.站点 || []).every(s => s.fps >= 30)
  };
  const text = JSON.stringify(summary, null, 2);
  console.log(text);
  if (typeof copy === 'function') { copy(text); console.log('✔ 结果已复制到剪贴板，直接粘贴发给我'); }
})();
