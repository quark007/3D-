/* 第3章 遵义会议（1935年1月）——西牌坊入口 / 石板主街 / 会议会址院落 / 电台室 / 东侧出口。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(3);
  K.define({
    chapterId: 3, sceneId: 'chapter-3/scene-zunyi', title: '遵义会议', seed: 303,
    world: { w: 160, h: 110 },
    streetModel: { url: '/assets/scenes/zunyi-realscan/zunyi_street.glb', origin: [81, 30] },
    /* Blender X east, Y north, Z up. One unit is one metre. */
    streetBlocked: [
      K.blockedRect(68.1, 24, 25.8, 12), K.blockedRect(85.875, 19.05, 7.65, 5.7),
      { ...K.blockedRect(70.8, 49.2, 6.68, 1.6), cameraHeight: 3.1 },
      { ...K.blockedRect(80.52, 49.2, 6.68, 1.6), cameraHeight: 3.1 },
      K.blockedRect(21, 45, 40, 6), K.blockedRect(101, 45, 16, 6),
      K.blockedRect(41, 65, 32, 6), K.blockedRect(97, 61, 32, 6),
      K.blockedCircle(69, 41, .8), K.blockedCircle(58, 50, .7), K.blockedCircle(89, 49, .65)
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