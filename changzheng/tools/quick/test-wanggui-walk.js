// 王贵走动测试：在 preview.html?3d=1 页面按 F12，把整段粘到控制台回车，约 40 秒。
// 挂载第 7 章，依次把王贵的站位标为已完成，模拟剧情推进；每一步打印他的状态，结果自动复制到剪贴板。
(async () => {
  const W = window.CZMarchWorld, sleep = ms => new Promise(r => setTimeout(r, ms));
  const scene = W.manifest.scenes.find(s => s.chapterId === 7);
  const order = id => Number(/dialogue-\d+-(\d+)/.exec(id)[1]);
  const ids = scene.anchors.filter(a => /wang_gui/.test(a.anchorId)).map(a => a.anchorId).sort((a, b) => order(a) - order(b));
  await W.mount(document.getElementById('world'), { chapterId: 7, sceneId: scene.sceneId, spawn: { x: 40, y: 56, facing: 'e' }, anchors: scene.anchors });
  document.querySelector('.czmw-cinema-skip3d')?.click();
  await sleep(2500);
  const log = [];
  const sample = label => {
    const list = W._.actors3d.roamers || [];
    log.push({ 步骤: label, 王贵: list.find(x => x.key === 'wang_gui') || '（没有找到，检查 actors3d.js 是否已替换）' });
  };
  sample('开始：应在 07-01 桥头，mode 为 idle');
  const done = [];
  for (const id of ids.slice(0, 2)) {
    done.push(id);
    W.applyState({ enabledAnchorIds: null, completedAnchorIds: [...done] });
    await sleep(1000); sample(`完成 ${id.split('anchor-')[1]} 后 1 秒：mode 应为 travel，remaining 在减少`);
    await sleep(15000); sample(`完成 ${id.split('anchor-')[1]} 后 16 秒：应已到下一个站位，mode 为 idle`);
  }
  const text = JSON.stringify(log, null, 2);
  console.log(text);
  if (typeof copy === 'function') { copy(text); console.log('✔ 已复制到剪贴板'); }
  console.log('接下来手动测「过桥」：在控制台运行\n  CZMarchWorld.applyState({ enabledAnchorIds: null, completedAnchorIds: ' + JSON.stringify(ids.slice(0, 3)) + ' })\n然后自己跑过铁索桥到东岸，回头看王贵是否走过来。');
})();
