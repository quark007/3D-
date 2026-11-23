/* 第 3 章遵义会议会址。世界 X 向东、Y 向南，1 单位 = 1 米。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(3);
  // Compound orientation and documented rooms follow the memorial director's account:
  // https://www.gzstv.com/a/58ee403ec6fd4682896534a4c112babc
  // Annex footprints and checkpoint positions are reconstructed gameplay dimensions.
  // Blender consumes the same metric bounds. Keep the marked block valid JSON.
  const compound = /* compound-layout */ {
    "grounds": [[61, 17, 43, 49], [54, 22, 7.25, 42]],
    "passage": [59, 41.485, 10, 3.03],
    "barriers": [
      ["北围墙", 61, 17, 43, 0.46, 4.1],
      ["东围墙", 103.54, 17, 0.46, 49, 4.1],
      ["南围墙", 61, 65.54, 43, 0.46, 4.1],
      ["西北封火墙", 61, 17, 0.46, 5, 4.05],
      ["西南封火墙", 61, 64, 0.46, 2, 4.05],
      ["临街北排四铺", 61, 22, 5.5, 19.485, 5.2],
      ["临街南排四铺", 61, 44.515, 5.5, 19.485, 5.2],
      ["子尹路对街连续立面", 53.55, 22, 0.45, 42, 5.3],
      ["北侧警戒线", 54, 22, 7, 0.52, 1.25],
      ["南侧警戒线", 54, 63.48, 7, 0.52, 1.25],
      ["会址主楼内墙", 68.125, 24, 25.75, 9, 7.62],
      ["会址主楼北翼", 85.875, 19.05, 7.65, 5.7, 9.54],
      ["旧宅东房", 94, 51, 5.3, 13, 4.9],
      ["旧宅西房", 72, 51, 5, 13, 4.8],
      ["旧宅北房", 77, 51, 6, 4.6, 4.7],
      ["旧宅南房", 77, 59.4, 17, 4.6, 4.8],
      ["东侧厨房及楼上警卫用房", 97, 34, 4.6, 6, 6.7],
      ["井台", 98.8, 43, 1.2, 1.2, 0.72],
      ["槐树花台", 93.6, 46.3, 2.3, 2.3, 0.52],
      ["慎笃照壁", 69.6, 41.2, 0.55, 3.6, 3.25],
      ["廊柱", 68.08, 35.28, 0.64, 0.68, 7.45],
      ["廊柱", 71.68, 35.28, 0.64, 0.68, 7.45],
      ["廊柱", 75.28, 35.28, 0.64, 0.68, 7.45],
      ["廊柱", 78.88, 35.28, 0.64, 0.68, 7.45],
      ["廊柱", 82.48, 35.28, 0.64, 0.68, 7.45],
      ["廊柱", 86.08, 35.28, 0.64, 0.68, 7.45],
      ["廊柱", 89.68, 35.28, 0.64, 0.68, 7.45],
      ["廊柱", 93.28, 35.28, 0.64, 0.68, 7.45]
    ]
  } /* end-compound-layout */;
  const polygon = ([x, y, w, h]) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const walls = compound.barriers.map(([, x, y, w, h, cameraHeight]) => ({ ...K.blockedRect(x, y, w, h), cameraHeight }));
  K.define({
    chapterId: 3, sceneId: 'chapter-3/scene-zunyi', title: '遵义会议', seed: 303,
    world: { w: 160, h: 110 },
    streetModel: { url: '/assets/scenes/zunyi-realscan/zunyi_street.glb', origin: [81, 30], actorRange: 13 },
    // Stone mesh dimensions in the Blender assembly, converted to logical X east / Y south.
    stepSurfaces: [
      [59, 41.485, 10, 3.03, .014],
      [68.125, 24, 25.75, 12, .46],
      ...Array.from({ length: 3 }, (_, i) => [77.85, 35.99 + i * .35, 6.30, .38, (3 - i) * .145]),
      ...[68.9, 93.1].flatMap(x => Array.from({ length: 5 }, (_, i) =>
        [x - .625, 37.215 - i * .28, 1.25, .29, (i + 1) * .093]))
    ],
    streetLife: [
      { stops: [[56.2, 38], [58.8, 42], [56.5, 47]], observe: [62, 43] },
      { stops: [[58.3, 39], [56.2, 43], [58.7, 47]], observe: [62, 43] },
      { stops: [[56.2, 55], [58.7, 51], [57.2, 58]] },
      { stops: [[58.7, 55], [56.2, 51], [58.6, 59]] },
      { stops: [[74.8, 45.5], [76, 40], [71.7, 42]], observe: [70, 43] },
      { stops: [[76, 46.7], [73.6, 41.2], [72.7, 44]], observe: [70, 43] },
      { stops: [[91, 47], [92, 43], [89, 45.5]], observe: [94.75, 47.45] },
      { stops: [[91.2, 49], [95.9, 44.5], [89.4, 46.8]], observe: [94.75, 47.45] }
    ],
    streetBlocked: walls,
    strictPlayable: true,
    // The west gate jambs extend beyond the shop façades. Use camera-only
    // proxies for their projections and the curved underside of the arch.
    cameraBlocked: [
      ...[39.75, 44.515].map(y => ({ ...K.blockedRect(61.09, y, 2.12, 1.735), cameraHeight: 4.0 })),
      ...Array.from({ length: 12 }, (_, i) => {
        const width = 3.03 / 12, y = 41.485 + i * width;
        const offset = Math.max(Math.abs(y - 43), Math.abs(y + width - 43));
        const cameraMinHeight = 2.12 + Math.sqrt(Math.max(0, 1.52 ** 2 - offset ** 2));
        return { ...K.blockedRect(61.02, y, 2.26, width), cameraMinHeight, cameraHeight: 5.46 };
      })
    ],
    spawn: { x: 57, y: 30, facing: 's' },
    palette: {
      ground: '#81795f', road: '#a39a85', roadEdge: '#6d6450', wood: '#7a5c40', roof: '#565248',
      houseWall: '#a8947a', leaf: '#5c6a52', pine: '#48584c', sky0: '#a7b6bc', sky1: '#c8ccc0',
      mtn0: '#6b776e', mtn1: '#86918a', mtn2: '#a3aca4'
    },
    terrain: {
      patches: [{ x: 82, y: 42, rx: 20, ry: 23, color: '#9a927f', alpha: 0.7 }],
      roads: [{ pts: [[57.5, 22], [57.5, 64]], w: 7 }, { pts: [[57, 43], [94, 43]], w: 3 }]
    },
    walkable: [...compound.grounds, compound.passage].map(polygon),
    blocked: walls,
    props: [
      { type: 'houseWood', x: 81, y: 29, w: 25.75, h: 13, seed: 4 },
      { type: 'house', x: 96.5, y: 57, w: 5.3, h: 7, seed: 3 },
      { type: 'house', x: 74.5, y: 57, w: 5, h: 7, seed: 2 },
      { type: 'gate', x: 62, y: 43, w: 3.03, h: 5.6, seed: 1 },
      { type: 'tree', x: 94.75, y: 47.45, w: 5, h: 7, seed: 6 }
    ],
    anchors: [
      a('dialogue-03-01-narrator', 'npc', '到达遵义、说明身份 · 解说旁白', 57, 33),
      a('dialogue-03-01-he_wen', 'npc', '到达遵义、说明身份 · 指导员何文', 57, 37),

      a('dialogue-03-05-wang_gui', 'npc', '等候与战友交谈 · 老班长王贵', 82, 43),
      a('dialogue-03-05-chen_xiaoman', 'npc', '等候与战友交谈 · 青年战士陈小满', 57, 52),
      a('legacy-drag-1', 'task', '情报梳理', 57, 56),

      a('dialogue-03-02-liaison_1', 'npc', '接收、分类、核对资料 · 交通联络员', 80, 44),
      a('dialogue-03-03-he_wen', 'npc', '情报互相矛盾 · 指导员何文', 85, 44),
      a('dialogue-03-03-liaison_1', 'npc', '情报互相矛盾 · 交通联络员', 89, 40),
      a('main-task', 'task', '核对资料 · 保障传递', 83, 47),
      a('legacy-choice-1', 'task', '资料核对', 78, 47),
      a('game-zunyi', 'task', '遵义会议 · 抉择二十分钟', 90, 40),
      a('dialogue-03-06-narrator', 'npc', '会后史实说明与任务复盘 · 解说旁白', 76, 44),
      a('dialogue-03-06-he_wen', 'npc', '会后史实说明与任务复盘 · 指导员何文', 79, 42),

      a('game-lamp', 'task', '苟坝夜灯', 94, 44),
      a('game-poem', 'task', '娄山关诗卷', 97, 42),
      a('hero-meihu64', 'task', '半条被子 · 红军坟', 72, 46),

      a('dialogue-03-04-logistics_1', 'npc', '自定义基层保障方案 · 后勤协作员', 87.5, 43),
      a('dialogue-03-04-he_wen', 'npc', '自定义基层保障方案 · 指导员何文', 90, 56),
      a('workshop-circuit', 'task', '战地电台 · 断线重连', 85, 56),

      a('history', 'task', '本章史实与来源', 80, 57),

      a('scene3d', 'task', '3D剧情地点模拟体验', 57, 27),

      a('exit', 'exit', '继续下一站', 57, 60)
    ],
    ambient: { kind: 'mist' }
  });
})();
