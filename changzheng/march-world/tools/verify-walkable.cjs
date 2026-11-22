/* 可行走校验：对每个场景构建碰撞栅格，验证 spawn 可达全部锚点（点击寻路的先决条件）。
   用法：node march-world/tools/verify-walkable.cjs（在仓库根目录运行） */
'use strict';
const fs = require('fs');
const path = require('path');
const mwDir = path.resolve(__dirname, '..');

global.window = {};
eval(fs.readFileSync(path.join(mwDir, 'engine', 'pathfind.js'), 'utf8'));
eval(fs.readFileSync(path.join(mwDir, 'scenes', 'kit.js'), 'utf8'));
for (const f of fs.readdirSync(path.join(mwDir, 'scenes')).filter(f => /^chapter-\d+\.js$/.test(f)).sort()) {
  eval(fs.readFileSync(path.join(mwDir, 'scenes', f), 'utf8'));
}
const M = global.window.CZMarchWorld._;
let bad = 0;
for (const scene of Object.values(M.scenes).sort((a, b) => a.chapterId - b.chapterId)) {
  const grid = M.path.buildGrid(scene.streetBlocked ? { ...scene, blocked: [...scene.blocked, ...scene.streetBlocked] } : scene);
  const spawnOk = M.path.walkableAt(grid, scene.spawn.x, scene.spawn.y, 0.62);
  if (!spawnOk) { console.log(`!! ${scene.sceneId} 出生点不可行走 (${scene.spawn.x},${scene.spawn.y})`); bad++; }
  const unreachable = [];
  for (const a of scene.anchors) {
    /* 锚点允许贴近阻挡物（如门口），向四周 3 格内找可达点 */
    let ok = false;
    outer: for (let r = 0; r <= 3 && !ok; r += 1) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (M.path.findPath(grid, scene.spawn.x, scene.spawn.y, a.x + dx, a.y + dy)) { ok = true; break outer; }
      }
    }
    if (!ok) unreachable.push(a.anchorId);
  }
  const covered = scene.anchors.length - unreachable.length;
  console.log(`${scene.sceneId}：${covered}/${scene.anchors.length} 锚点自出生点可达${spawnOk ? '' : '（出生点异常）'}`);
  if (unreachable.length) { bad++; console.log('   不可达：' + unreachable.join(' , ')); }
}
process.exit(bad ? 1 : 0);