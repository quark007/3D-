/* 第3章 遵义会议（1935年1月）——西牌坊入口 / 石板主街 / 会议会址院落 / 电台室 / 东侧出口。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(3);
  /* 街市生活（仅街景模型生效）：摊位、招幌与往来行人。坐标与 tools/assemble-zunyi.py 的沿街铺面一致：
     北排铺面前沿 y≈50.8~51.0、南排 y≈65.0~65.2、东南排 y≈61.0~61.2；摊位压在墙脚器物带之外、路沿排水沟之内。
     face 为摊位正面朝向（s=朝南/大 y，n=朝北，e=朝东）；vendor=±1 表示摊主站在摊位哪一侧。 */
  const STREET_STALLS = [
    { kind: 'produce', x: 27.0, y: 52.11, w: 2.2, d: 0.9, face: 's', vendor: 1 },
    { kind: 'sandals', x: 35.0, y: 52.11, w: 2.0, d: 0.9, face: 's', vendor: -1 },
    { kind: 'tea', x: 43.0, y: 52.28, w: 2.6, d: 1.25, face: 's', vendor: 1 },
    { kind: 'pottery', x: 55.0, y: 52.11, w: 2.4, d: 0.9, face: 's', vendor: -1 },
    { kind: 'cloth', x: 47.0, y: 63.9, w: 2.4, d: 0.9, face: 'n', vendor: 1 },
    { kind: 'food', x: 67.0, y: 63.9, w: 2.4, d: 0.9, face: 'n', vendor: -1 },
    { kind: 'grain', x: 115.0, y: 59.93, w: 2.2, d: 0.9, face: 'n', vendor: 1 },
    { kind: 'herbs', x: 123.0, y: 59.93, w: 2.2, d: 0.9, face: 'n', vendor: -1 },
    { kind: 'produce', x: 24.0, y: 76.0, w: 2.2, d: 0.9, face: 'e', vendor: -1 },
    { kind: 'pottery', x: 24.0, y: 80.6, w: 2.2, d: 0.9, face: 'e', vendor: 1 },
    { kind: 'grain', x: 30.0, y: 81.8, w: 2.2, d: 0.9, face: 'n', vendor: 1 },
    { kind: 'cloth', x: 35.6, y: 80.7, w: 2.2, d: 0.9, face: 'n', vendor: -1 }
  ];
  /* 招幌挂在铺面立柱上、垂直于墙面，沿街走时能看到正面。front 为该开间的铺面前沿，face=+1 向南挑出 */
  const STREET_SIGNS = [
    { text: '雜貨', style: 'dark', x: 24.84, front: 50.825, face: 1 },
    { text: '布莊', style: 'light', x: 32.84, front: 50.8, face: 1 },
    { text: '草鞋', style: 'light', x: 36.84, front: 51.0, face: 1 },
    { text: '茶', style: 'flag', x: 44.84, front: 50.825, face: 1, lantern: true },
    { text: '米行', style: 'dark', x: 48.84, front: 50.95, face: 1 },
    { text: '客棧', style: 'dark', x: 57.16, front: 50.875, face: 1, lantern: true },
    { text: '藥舖', style: 'dark', x: 104.84, front: 50.825, face: 1 },
    { text: '當', style: 'light', x: 112.84, front: 50.8, face: 1 },
    { text: '染坊', style: 'light', x: 44.84, front: 65.125, face: -1 },
    { text: '酒', style: 'flag', x: 49.16, front: 65.05, face: -1, lantern: true },
    { text: '油鹽', style: 'dark', x: 64.84, front: 65.125, face: -1 },
    { text: '羊肉粉', style: 'dark', x: 68.84, front: 65.175, face: -1, lantern: true },
    { text: '銅器', style: 'dark', x: 100.84, front: 61.2, face: -1 },
    { text: '書局', style: 'light', x: 105.16, front: 61.125, face: -1 },
    { text: '鹽號', style: 'dark', x: 120.84, front: 61.2, face: -1 },
    { text: '客棧', style: 'light', x: 125.16, front: 61.125, face: -1, lantern: true }
  ];
  /* 行人：沿路线往返（loop=true 为环线）。车道错开 ≥0.8m，避开剧情 NPC 站位 ≥1.7m。
     role：soldier 为红军战士（通用模型）；farmer / woman / elder 为平民（assets/characters/civilians），tint 只换外衣颜色 */
  const STREET_WALKERS = [
    { role: 'soldier', speed: 1.35, phase: 0, route: [[27.0,56.0],[35.0,56.0],[43.0,55.85],[51.0,55.45],[59.0,55.05],[67.0,54.65],[75.0,54.25],[83.0,53.85],[91.0,53.45],[99.0,53.05],[107.0,52.65],[115.0,52.25],[123.0,51.82],[131.0,51.35],[139.0,50.88],[147.0,50.41]] },
    { role: 'soldier', speed: 1.35, phase: 0, route: [[27.6,56.8],[35.6,56.8],[43.6,56.62],[51.6,56.22],[59.6,55.82],[67.6,55.42],[75.6,55.02],[83.6,54.62],[91.6,54.22],[99.6,53.82],[107.6,53.42],[115.6,53.02],[123.6,52.59],[131.6,52.12],[139.6,51.65],[147.6,51.18]] },
    { role: 'farmer', speed: 1.15, phase: 0.35, route: [[65.0,58.45],[73.1,58.04],[81.2,57.64],[89.3,57.24],[91.0,55.65],[97.4,55.33],[101.0,55.15],[105.5,56.42],[113.6,56.02],[121.7,55.6],[129.8,55.12],[137.9,54.65],[146.0,54.17]] },
    { role: 'woman', tint: 'brown', speed: 1.0, phase: 0.6, route: [[27.0,59.3],[33.0,59.3],[39.0,59.3],[45.0,59.05]] },
    { role: 'elder', speed: 1.1, phase: 0.2, route: [[42.0,56.6],[37.0,57.2],[34.5,61.0],[32.5,66.0],[30.8,71.0],[28.5,74.5],[29.0,78.6],[33.0,78.4]] },
    { role: 'soldier', speed: 1.45, phase: 0.5, route: [[67.0,53.65],[75.5,53.22],[84.0,52.8],[92.5,52.38],[101.0,51.95]] },
    { role: 'woman', speed: 1.2, phase: 0.8, route: [[104.0,55.2],[112.4,54.78],[120.8,54.35],[129.2,53.86],[137.6,53.36],[146.0,52.87]] },
    { role: 'farmer', tint: 'brown', loop: true, speed: 0.9, phase: 0.1, route: [[26.5,73.2],[31.5,73.4],[32.5,78.0],[27.0,78.3]] }
  ];
  const STREET_VENDORS = {
    produce: { role: 'farmer', tint: 'brown' }, sandals: { role: 'farmer', tint: 'undyed' }, tea: { role: 'elder' },
    pottery: { role: 'woman' }, cloth: { role: 'woman', tint: 'indigo' }, food: { role: 'farmer', tint: 'grey' },
    grain: { role: 'elder', tint: 'brown' }, herbs: { role: 'elder', tint: 'grey' }
  };
  // 摊位连同摊主、遮棚立柱一起进入行走阻挡；cameraHeight 1 低于镜头目标点，不会推镜头
  const stallFootprint = s => {
    const alongX = s.face === 's' || s.face === 'n', span = s.w + 1.8, depth = s.d + .3;
    const rect = alongX ? K.blockedRect(s.x - span / 2, s.y - depth / 2, span, depth) : K.blockedRect(s.x - depth / 2, s.y - span / 2, depth, span);
    return { ...rect, cameraHeight: 1 };
  };
  K.define({
    chapterId: 3, sceneId: 'chapter-3/scene-zunyi', title: '遵义会议', seed: 303,
    world: { w: 160, h: 110 },
    streetModel: { url: '/assets/scenes/zunyi-realscan/zunyi_street.glb', origin: [81, 30], actorRange: 13 },
    streetLife: { stalls: STREET_STALLS, signs: STREET_SIGNS, walkers: STREET_WALKERS, vendors: STREET_VENDORS },
    /* Blender X east, Y north, Z up. One unit is one metre. */
    streetBlocked: [
      K.blockedRect(68.1, 24, 25.8, 12), K.blockedRect(85.875, 19.05, 7.65, 5.7),
      { ...K.blockedRect(70.8, 49.2, 6.68, 1.6), cameraHeight: 3.1 },
      { ...K.blockedRect(80.52, 49.2, 6.68, 1.6), cameraHeight: 3.1 },
      K.blockedRect(21, 45, 40, 6), K.blockedRect(101, 45, 16, 6),
      K.blockedRect(41, 65, 32, 6), K.blockedRect(97, 61, 32, 6),
      // Wall feet and furnishing strips. Keep the carriageway and gate approaches clear.
      ...[[62,22,11],[99,26,9],[27,39,12],[111,43,15],[51,76,16],[119,72,14],[7,46,9],[151,43,10]]
        .map(([x,y,w]) => ({ ...K.blockedRect(x-w/2,y-.82,w,1.64), cameraHeight: 1.6 })),
      ...[[49,73.6,12],[120,69.5,12],[17,45,6],[52,11,25],[112,12,27],[36,84,36],[117,85,37]]
        .map(([x,y,w]) => ({ ...K.blockedRect(x-w/2,y-.40,w,.80), cameraHeight: 1 })),
      ...[[61,19.5],[103,27.5],[43,76],[125,72]]
        .map(([x,y]) => ({ ...K.blockedRect(x-2,y-1.25,4,2.5), cameraHeight: 2.25 })),
      ...[[39,77.5],[74,18],[112,75.5],[132,72]]
        .map(([x,y]) => ({ ...K.blockedRect(x-1.5,y-.22,3,1.60), cameraHeight: .22 })),
      ...[[21,50.65,40],[101,50.65,16],[41,64.41,32],[97,60.44,32]]
        .map(([x,y,w]) => ({ ...K.blockedRect(x,y,w,1.08), cameraHeight: .75 })),
      K.blockedCircle(69, 41, .8), K.blockedCircle(58, 50, .7), K.blockedCircle(89, 49, .65),
      ...STREET_STALLS.map(stallFootprint)
    ],
    spawn: { x: 16, y: 58, facing: 'e' },
    palette: {
      ground: '#8d8468', road: '#a89a80', roadEdge: '#6d6450',
      wood: '#7a5c40', roof: '#565248', houseWall: '#a8947a',
      leaf: '#5c6a52', pine: '#48584c', sky0: '#a7b6bc', sky1: '#c8ccc0',
      mtn0: '#6b776e', mtn1: '#86918a', mtn2: '#a3aca4'
    },
    terrain: {
      patches: [
        { x: 60, y: 60, rx: 40, ry: 12, color: '#9a8f70', alpha: 0.5 },   /* 主街石板 */
        { x: 85, y: 36, rx: 22, ry: 13, color: '#8a8064', alpha: 0.55 },  /* 会址院落 */
        { x: 30, y: 74, rx: 18, ry: 10, color: '#8f8666', alpha: 0.45 },  /* 菜市空地 */
        { x: 126, y: 44, rx: 16, ry: 10, color: '#8a8064', alpha: 0.45 }  /* 电台小院 */
      ],
      roads: [
        { pts: [[6, 58], [40, 58], [80, 56], [120, 54], [154, 52]], w: 5 },   /* 石板主街 */
        { pts: [[78, 56], [80, 46], [82, 40]], w: 3.6 },                       /* 进会址 */
        { pts: [[112, 54], [120, 48], [126, 44]], w: 3 },
        { pts: [[36, 58], [32, 66], [30, 72]], w: 3 }
      ],
      waters: [{ pts: [[0, 92], [60, 90], [120, 94], [160, 92], [160, 106], [0, 104]], top: 90, bottom: 106, sparkles: 6 }], /* 湘江支流绕城 */
      cliffs: [{ pts: [[0, 4], [60, 2], [120, 4], [160, 6]], w: 2.6 }]
    },
    walkable: [[[0, 0], [160, 0], [160, 110], [0, 110]]],
    blocked: [
      K.blockedPoly([[0, 92], [60, 90], [120, 94], [160, 92], [160, 110], [0, 110]]),
      K.blockedRect(0, 0, 160, 6),
      K.blockedRect(74, 26, 14, 9),   /* 会址主楼 */
      K.blockedRect(90, 30, 8, 6),    /* 会址侧屋 */
      K.blockedRect(48, 40, 10, 7),   /* 沿街铺面 */
      K.blockedRect(20, 42, 9, 6),
      K.blockedRect(122, 34, 9, 7),   /* 电台室 */
      K.blockedRect(104, 38, 9, 6),
      K.blockedCircle(60, 62, 2.2), K.blockedCircle(96, 58, 2.2), K.blockedCircle(36, 74, 2.4),
      K.blockedCircle(140, 60, 2.2), K.blockedCircle(14, 44, 2.4)
    ],
    props: [
      { type: 'cliff', x: 8, y: 3, w: 15, h: 5, seed: 1 }, { type: 'cliff', x: 140, y: 4, w: 15, h: 5, seed: 2 },
      { type: 'pine', x: 30, y: 8, w: 5, h: 7.5, seed: 1 }, { type: 'pine', x: 100, y: 6, w: 5.5, h: 8, seed: 2 },
      /* 西牌坊入口 */
      { type: 'gate', x: 10, y: 55, w: 7.5, h: 7.5, seed: 1 }, { type: 'lantern', x: 16, y: 60, w: 2, h: 4, seed: 1 },
      /* 沿街 */
      { type: 'houseWood', x: 53, y: 44, w: 11, h: 8.5, seed: 1 }, { type: 'houseWood', x: 24, y: 46, w: 10, h: 8, seed: 2 },
      { type: 'house', x: 66, y: 62, w: 10, h: 7, seed: 3 }, { type: 'lantern', x: 60, y: 64, w: 2, h: 4, seed: 2 },
      /* 会议会址院落：两层木楼 + 围墙 + 小桌 */
      { type: 'houseWood', x: 81, y: 30, w: 14, h: 10, seed: 4 }, { type: 'house', x: 94, y: 33, w: 8.5, h: 6.6, seed: 5 },
      { type: 'stoneWall', x: 70, y: 40, w: 10, h: 2.2, seed: 1 }, { type: 'stoneWall', x: 96, y: 42, w: 8, h: 2.2, seed: 2 },
      { type: 'table', x: 84, y: 42, w: 4.4, h: 3, seed: 1 }, { type: 'lantern', x: 76, y: 42, w: 2, h: 4, seed: 3 },
      { type: 'tree', x: 70, y: 30, w: 7.5, h: 10, seed: 6 },
      /* 电台室小院 */
      { type: 'house', x: 126, y: 37, w: 10, h: 7.5, seed: 6 }, { type: 'house', x: 108, y: 41, w: 9, h: 6.6, seed: 7 },
      { type: 'stele', x: 120, y: 46, w: 2.6, h: 3.2, seed: 1 },
      /* 菜市空地 */
      { type: 'table', x: 32, y: 76, w: 4.4, h: 3, seed: 2 }, { type: 'crate', x: 38, y: 78, w: 3, h: 2.6, seed: 1 },
      { type: 'grain', x: 27, y: 79, w: 3.4, h: 3, seed: 1 }, { type: 'tree', x: 42, y: 72, w: 8, h: 10.5, seed: 7 },
      /* 东段 */
      { type: 'tree', x: 140, y: 58, w: 8, h: 10.5, seed: 8 }, { type: 'gate', x: 152, y: 50, w: 7, h: 7, seed: 2 },
      /* 河畔 */
      { type: 'tree', x: 60, y: 88, w: 7, h: 9, seed: 9 }, { type: 'boat', x: 90, y: 96, w: 6.4, h: 3.2, seed: 1 }
    ],
    anchors: [
      /* 西入口 */
      a('dialogue-03-01-narrator', 'npc', '到达遵义、说明身份 · 解说旁白', 18, 60),
      a('dialogue-03-01-he_wen', 'npc', '到达遵义、说明身份 · 指导员何文', 22, 58),
      /* 主街 */
      a('dialogue-03-05-wang_gui', 'npc', '等候与战友交谈 · 老班长王贵', 56, 60),
      a('dialogue-03-05-chen_xiaoman', 'npc', '等候与战友交谈 · 青年战士陈小满', 60, 62),
      a('legacy-drag-1', 'task', '情报梳理', 50, 58),
      /* 会址院落 */
      a('dialogue-03-02-liaison_1', 'npc', '接收、分类、核对资料 · 交通联络员', 80, 44),
      a('dialogue-03-03-he_wen', 'npc', '情报互相矛盾 · 指导员何文', 85, 44),
      a('dialogue-03-03-liaison_1', 'npc', '情报互相矛盾 · 交通联络员', 88, 42),
      a('main-task', 'task', '核对资料 · 保障传递', 83, 47),
      a('legacy-choice-1', 'task', '资料核对', 78, 47),
      a('game-zunyi', 'task', '遵义会议 · 抉择二十分钟', 90, 40),
      a('dialogue-03-06-narrator', 'npc', '会后史实说明与任务复盘 · 解说旁白', 76, 44),
      a('dialogue-03-06-he_wen', 'npc', '会后史实说明与任务复盘 · 指导员何文', 79, 42),
      /* 侧院（苟坝/娄山关联动） */
      a('game-lamp', 'task', '苟坝夜灯', 94, 44),
      a('game-poem', 'task', '娄山关诗卷', 97, 42),
      a('hero-meihu64', 'task', '半条被子 · 红军坟', 72, 44),
      /* 电台室 */
      a('dialogue-03-04-logistics_1', 'npc', '自定义基层保障方案 · 后勤协作员', 122, 48),
      a('dialogue-03-04-he_wen', 'npc', '自定义基层保障方案 · 指导员何文', 126, 46),
      a('workshop-circuit', 'task', '战地电台 · 断线重连', 124, 40),
      /* 菜市 */
      a('history', 'task', '本章史实与来源', 34, 76),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 11, 63),
      /* 东出口 */
      a('exit', 'exit', '继续下一站', 152, 54)
    ],
    ambient: { kind: 'mist', smokes: [{ x: 53, y: 41 }, { x: 24, y: 43 }, { x: 126, y: 34 }] }
  });
})();