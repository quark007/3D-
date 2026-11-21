/* 生成 march-world/anchors-map.json，并与 B 方 march-story/anchor-requests.json 交叉校验。
   用法：node march-world/tools/build-anchors-map.cjs（在仓库根目录运行） */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const mwDir = path.join(root, 'march-world');

/* 场景文件是浏览器 classic script：用 window 桩加载 */
global.window = {};
const sceneFiles = fs.readdirSync(path.join(mwDir, 'scenes')).filter(f => /^chapter-\d+\.js$/.test(f)).sort();
for (const f of ['scenes/kit.js', ...sceneFiles.map(f => 'scenes/' + f)]) {
  eval(fs.readFileSync(path.join(mwDir, f), 'utf8'));
}
const scenes = Object.values(global.window.CZMarchWorld._.scenes).sort((a, b) => a.chapterId - b.chapterId);

const map = {
  version: 1,
  coordinateSystem: 'scene ground coordinates (x east, y south, unit≈1m); anchors are ground points',
  generatedAt: new Date().toISOString(),
  chapters: scenes.map(s => ({
    chapterId: s.chapterId, sceneId: s.sceneId, title: s.title,
    world: s.world, spawn: s.spawn,
    anchors: s.anchors.map(a => ({ anchorId: a.anchorId, kind: a.kind, label: a.label, x: a.x, y: a.y }))
  }))
};
fs.writeFileSync(path.join(mwDir, 'anchors-map.json'), JSON.stringify(map, null, 2));

/* ---- 交叉校验：B 方请求的每一个 anchorId 都必须存在且坐标为有限数 ---- */
const req = JSON.parse(fs.readFileSync(path.join(root, 'march-story', 'anchor-requests.json'), 'utf8'));
const have = new Map();
for (const s of scenes) for (const a of s.anchors) have.set(a.anchorId, a);
const missing = [], wrongScene = [], badCoord = [];
for (const b of req.requestedBindings) {
  const a = have.get(b.anchorId);
  if (!a) { missing.push(b.anchorId); continue; }
  if (a.kind !== b.kind) wrongScene.push(`${b.anchorId} kind ${a.kind}≠${b.kind}`);
  if (!Number.isFinite(a.x) || !Number.isFinite(a.y)) badCoord.push(b.anchorId);
  const scene = scenes.find(s => s.sceneId === b.sceneId);
  if (!scene || !scene.anchors.some(x => x.anchorId === b.anchorId)) wrongScene.push(`${b.anchorId} 不在 ${b.sceneId}`);
}
console.log(`A方场景：${scenes.length} 章 / ${[...have.keys()].length} 锚点`);
console.log(`B方请求：${req.requestedBindings.length} 项绑定`);
console.log(`缺失：${missing.length}　场景不符：${wrongScene.length}　坐标非法：${badCoord.length}`);
if (missing.length) console.log('MISSING:', missing);
if (wrongScene.length) console.log('MISMATCH:', wrongScene);
if (badCoord.length) console.log('BADCOORD:', badCoord);
/* 出口与章节覆盖 */
for (const c of req.chapters) {
  const s = scenes.find(x => x.sceneId === c.sceneId);
  if (!s) console.log(`!! 缺场景 ${c.sceneId}（${c.title}）`);
  else if (!s.anchors.some(a => a.kind === 'exit')) console.log(`!! ${c.sceneId} 缺 exit 锚点`);
}
process.exit(missing.length || wrongScene.length || badCoord.length ? 1 : 0);