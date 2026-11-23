/* 可行走校验：对每个场景构建碰撞栅格，验证 spawn 可达全部锚点（点击寻路的先决条件）。
   用法：node march-world/tools/verify-walkable.cjs（在仓库根目录运行） */
'use strict';
const fs = require('fs');
const path = require('path');
const mwDir = path.resolve(__dirname, '..');

global.window = {};
eval(fs.readFileSync(path.join(mwDir, 'engine', 'pathfind.js'), 'utf8'));
eval(fs.readFileSync(path.join(mwDir, 'engine', 'player.js'), 'utf8'));
eval(fs.readFileSync(path.join(mwDir, 'scenes', 'kit.js'), 'utf8'));
for (const f of fs.readdirSync(path.join(mwDir, 'scenes')).filter(f => /^chapter-\d+\.js$/.test(f)).sort()) {
  eval(fs.readFileSync(path.join(mwDir, 'scenes', f), 'utf8'));
}
const M = global.window.CZMarchWorld._;
M.painter = { figureFrames: () => null };
let bad = 0;
function verifyCompoundBounds(scene, grid) {
  const cases = [
    ['北警戒线', 57, 24, 0, -1, 57, -80],
    ['南警戒线', 57, 61, 0, 1, 57, 140],
    ['西街立面', 56, 35, -1, 0, -80, 35],
    ['北院墙', 72, 20, 0, -1, 72, -40],
    ['东院墙', 101, 30, 1, 0, 150, 30],
    ['南院墙', 101, 63, 0, 1, 103, 100]
  ];
  for (const [label, x, y, dx, dy, outsideX, outsideY] of cases) {
    if (!M.path.walkableAt(grid, x, y, M.player.RADIUS)) throw Error(label + '的起点无效');
    const player = M.player.create(scene, grid, { x, y });
    const inside = () => M.path.walkableAt(grid, player.x, player.y, M.player.RADIUS);
    for (let frame = 0; frame < 180; frame++) {
      player.advance(1 / 60, { x: dx, y: dy }, true);
      if (!inside()) throw Error(label + '被直接移动穿过');
    }
    if (Math.hypot(player.x - x, player.y - y) > 4) throw Error(label + '未挡住直接移动');
    const route = M.path.findPath(grid, player.x, player.y, outsideX, outsideY);
    if (!route?.length) throw Error(label + '的越界点击没有钳制');
    const end = route.at(-1);
    player.moveTo(route);
    for (let frame = 0; frame < 1800; frame++) {
      player.advance(1 / 60);
      if (!inside()) throw Error(label + '的点击路径穿过边界');
    }
    if (Math.hypot(player.x - end.x, player.y - end.y) > .55) throw Error(`${label}的点击路径未抵达合法点 (${player.x},${player.y}) → (${end.x},${end.y})`);
  }
  const alongWall = M.player.create(scene, grid, { x: 57, y: 23.2 });
  for (let frame = 0; frame < 55; frame++) {
    alongWall.advance(1 / 60, { x: 1, y: -1 });
    if (!M.path.walkableAt(grid, alongWall.x, alongWall.y, M.player.RADIUS)) throw Error('沿北侧哨卡滑动时越界');
  }
  if (alongWall.x < 58.8 || alongWall.y < 23.14) throw Error('斜向撞墙后未沿边界移动');
  alongWall.moveTo([{ x: alongWall.x - 1, y: alongWall.y }]);
  alongWall.advance(1 / 60, { x: 0, y: 1 });
  for (let frame = 0; frame < 14; frame++) alongWall.advance(1 / 60);
  if (alongWall.x < 58.8 || alongWall.speed !== 0) throw Error('即时移动未中断寻路或松开后未停止');
  const throughGate = M.player.create(scene, grid, { x: 57, y: 43 });
  for (let frame = 0; frame < 150; frame++) throughGate.advance(1 / 60, { x: 1, y: 0 });
  if (throughGate.x < 66) throw Error('角色未能从子尹路通过西门');
  console.log('   西门实走通过。6 处边界均拦截持续移动并钳制越界点击。');
}
for (const scene of Object.values(M.scenes).sort((a, b) => a.chapterId - b.chapterId)) {
  const grid = M.path.buildGrid(scene.streetBlocked && !scene.strictPlayable ? { ...scene, blocked: [...scene.blocked, ...scene.streetBlocked] } : scene);
  const spawnOk = M.path.walkableAt(grid, scene.spawn.x, scene.spawn.y, 0.62);
  if (!spawnOk) { console.log(`!! ${scene.sceneId} 出生点不可行走 (${scene.spawn.x},${scene.spawn.y})`); bad++; }
  const unreachable = [];
  for (const a of scene.anchors) {
    /* 锚点允许贴近阻挡物（如门口），向四周 3 格内找可达点 */
    let ok = false;
    if (scene.strictPlayable && !M.path.walkableAt(grid, a.x, a.y, .62)) {
      unreachable.push(a.anchorId);
      continue;
    }
    outer: for (let r = 0; r <= (scene.strictPlayable ? 0 : 3) && !ok; r += 1) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (M.path.findPath(grid, scene.spawn.x, scene.spawn.y, a.x + dx, a.y + dy)) { ok = true; break outer; }
      }
    }
    if (!ok) unreachable.push(a.anchorId);
  }
  if (scene.strictPlayable) verifyCompoundBounds(scene, grid);
  const covered = scene.anchors.length - unreachable.length;
  console.log(`${scene.sceneId}：${covered}/${scene.anchors.length} 锚点自出生点可达${spawnOk ? '' : '（出生点异常）'}`);
  if (unreachable.length) { bad++; console.log('   不可达：' + unreachable.join(' , ')); }
}
process.exit(bad ? 1 : 0);