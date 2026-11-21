/* 第12章 三大主力·会师（1936年10月，会宁）——西城门进镇 / 会师门楼 / 中心广场 / 腰鼓场 / 三旗汇聚。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(12);
  K.define({
    chapterId: 12, sceneId: 'chapter-12/scene-huining', title: '三大主力·会师', seed: 1212,
    world: { w: 180, h: 120 },
    spawn: { x: 16, y: 62, facing: 'e' },
    palette: {
      ground: '#a88e60', road: '#b89c6e', roadEdge: '#78644c',
      water: '#6d7e70', waterDeep: '#4c5e52',
      rock: '#90806a', wall: '#9a8468', loess: '#b48f57', roof: '#6e6252',
      leaf: '#6d704a', pine: '#505f4c',
      sky0: '#aec0c4', sky1: '#dcd6bc', mtn0: '#8a7c64', mtn1: '#a0947c', mtn2: '#b5aa90', sun: true
    },
    terrain: {
      patches: [
        { x: 92, y: 62, rx: 34, ry: 18, color: '#b0946a', alpha: 0.6 },   /* 中心广场 */
        { x: 90, y: 30, rx: 24, ry: 11, color: '#a38c60', alpha: 0.5 },   /* 会师门楼 */
        { x: 40, y: 60, rx: 20, ry: 12, color: '#a38c60', alpha: 0.45 },  /* 西城区 */
        { x: 140, y: 60, rx: 20, ry: 12, color: '#a38c60', alpha: 0.45 }, /* 东城区 */
        { x: 92, y: 92, rx: 22, ry: 10, color: '#ac9568', alpha: 0.5 }    /* 南场 */
      ],
      roads: [
        { pts: [[6, 62], [40, 62], [70, 62], [92, 62], [120, 62], [150, 62], [174, 60]], w: 5.4 }, /* 东西主街 */
        { pts: [[90, 62], [90, 44], [90, 30]], w: 4.2 },                                            /* 北到门楼 */
        { pts: [[92, 66], [92, 82], [92, 94]], w: 4 },                                              /* 南场 */
        { pts: [[70, 62], [56, 72], [46, 84]], w: 3 }, { pts: [[118, 62], [132, 72], [142, 84]], w: 3 }
      ],
      waters: [{ pts: [[0, 104], [60, 102], [120, 106], [180, 104], [180, 118], [0, 116]], top: 102, bottom: 118, sparkles: 4 }], /* 祖厉河 */
      cliffs: [{ pts: [[0, 8], [60, 4], [120, 4], [180, 8]], w: 3 }]
    },
    walkable: [[[0, 0], [180, 0], [180, 120], [0, 120]]],
    blocked: [
      K.blockedPoly([[0, 104], [60, 102], [120, 106], [180, 104], [180, 120], [0, 120]]),
      K.blockedRect(0, 0, 180, 6),
      K.blockedRect(78, 22, 24, 9),   /* 会师门楼（中间通行 x86-94 由门洞视觉呈现，锚点在门前） */
      K.blockedRect(30, 50, 10, 7), K.blockedRect(46, 48, 9, 6),     /* 西城 */
      K.blockedRect(132, 48, 10, 7), K.blockedRect(148, 50, 9, 6),   /* 东城 */
      K.blockedRect(56, 88, 9, 6), K.blockedRect(122, 88, 9, 6),     /* 南场屋 */
      K.blockedCircle(70, 52, 2), K.blockedCircle(114, 52, 2),       /* 广场旗杆座 */
      K.blockedCircle(80, 74, 1.8), K.blockedCircle(104, 74, 1.8),
      K.blockedCircle(40, 74, 2.4), K.blockedCircle(150, 74, 2.4), K.blockedCircle(92, 100, 2)
    ],
    props: [
      { type: 'cliff', x: 8, y: 4, w: 16, h: 6, seed: 1 }, { type: 'cliff', x: 156, y: 4, w: 16, h: 6, seed: 2 },
      /* 会师门楼（北面核心） */
      { type: 'archGate', x: 80, y: 24, w: 20, h: 10, seed: 1 },
      { type: 'flagPole', x: 74, y: 26, w: 3, h: 6.6, seed: 1 }, { type: 'flagPole', x: 106, y: 26, w: 3, h: 6.6, seed: 2 },
      { type: 'lantern', x: 84, y: 36, w: 2, h: 4, seed: 1 }, { type: 'lantern', x: 96, y: 36, w: 2, h: 4, seed: 2 },
      /* 三旗汇聚（广场三侧） */
      { type: 'flagPole', x: 68, y: 54, w: 3, h: 7, seed: 3 }, { type: 'flagPole', x: 114, y: 54, w: 3, h: 7, seed: 4 },
      { type: 'flagPole', x: 91, y: 48, w: 3, h: 7, seed: 5 },
      /* 西城区 */
      { type: 'house', x: 35, y: 53, w: 11, h: 8, seed: 3 }, { type: 'yaodong', x: 50, y: 51, w: 9, h: 7, seed: 4 },
      { type: 'table', x: 42, y: 66, w: 4.4, h: 3, seed: 1 }, { type: 'well', x: 54, y: 64, w: 4, h: 3.6, seed: 1 },
      /* 东城区 */
      { type: 'houseWood', x: 137, y: 51, w: 10.5, h: 8, seed: 5 }, { type: 'house', x: 152, y: 53, w: 9.5, h: 7, seed: 6 },
      { type: 'crate', x: 144, y: 66, w: 3, h: 2.6, seed: 1 }, { type: 'grain', x: 130, y: 64, w: 3.6, h: 3.2, seed: 1 },
      /* 腰鼓场（南场） */
      { type: 'campfire', x: 92, y: 88, w: 3.4, h: 3, seed: 1 },
      { type: 'house', x: 60, y: 91, w: 9.5, h: 7, seed: 7 }, { type: 'house', x: 126, y: 91, w: 9.5, h: 7, seed: 8 },
      { type: 'stele', x: 84, y: 92, w: 2.6, h: 3.2, seed: 1 }, { type: 'stele', x: 100, y: 92, w: 2.6, h: 3.2, seed: 2 },
      /* 近景遮挡 */
      { type: 'tree', x: 62, y: 76, w: 8.5, h: 11, seed: 9 }, { type: 'tree', x: 122, y: 76, w: 8.5, h: 11, seed: 10 },
      { type: 'tree', x: 24, y: 70, w: 8, h: 10.5, seed: 11 }, { type: 'tree', x: 164, y: 70, w: 8, h: 10.5, seed: 12 },
      { type: 'gate', x: 12, y: 59, w: 7, h: 7, seed: 3 }
    ],
    anchors: [
      /* 西城门 */
      a('dialogue-12-01-narrator', 'npc', '时间转场 · 解说旁白', 20, 64),
      /* 西城区 */
      a('dialogue-12-02-liaison_1', 'npc', '接应来人和核对信息 · 交通联络员', 42, 62),
      a('dialogue-12-02-he_wen', 'npc', '接应来人和核对信息 · 指导员何文', 47, 64),
      a('dialogue-12-02-logistics_1', 'npc', '接应来人和核对信息 · 后勤协作员', 52, 61),
      a('dialogue-12-02-wang_gui', 'npc', '接应来人和核对信息 · 老班长王贵', 56, 64),
      a('dialogue-12-02-medic_1', 'npc', '接应来人和核对信息 · 卫生员', 60, 62),
      /* 会师门楼前 */
      a('dialogue-12-03-he_wen', 'npc', '会宁与将台堡资料整理 · 指导员何文', 86, 40),
      a('legacy-drag-1', 'task', '三军汇聚', 94, 40),
      a('history', 'task', '本章史实与来源', 90, 36),
      /* 中心广场 */
      a('main-task', 'task', '会师协作 · 同行回望', 92, 64),
      a('dialogue-12-04-logistics_1', 'npc', '玩家安排接应与保障 · 后勤协作员', 86, 66),
      a('dialogue-12-04-medic_1', 'npc', '玩家安排接应与保障 · 卫生员', 98, 66),
      a('dialogue-12-04-he_wen', 'npc', '玩家安排接应与保障 · 指导员何文', 92, 70),
      a('legacy-choice-1', 'task', '战略部署', 84, 60),
      a('extra-run', 'task', '全程协作推演', 100, 60),
      a('chapter-task54', 'task', '会师相迎 · 协作分工', 96, 62),
      /* 东城区 */
      a('dialogue-12-05-chen_xiaoman', 'npc', '战友重逢／彼此介绍 · 青年战士陈小满', 138, 62),
      a('dialogue-12-05-wang_gui', 'npc', '战友重逢／彼此介绍 · 老班长王贵', 143, 64),
      /* 腰鼓场 */
      a('game-drum', 'task', '会师腰鼓', 92, 86),
      /* 终章 */
      a('dialogue-12-06-narrator', 'npc', '终章行记与历史回望 · 解说旁白', 80, 90),
      a('dialogue-12-06-he_wen', 'npc', '终章行记与历史回望 · 指导员何文', 85, 92),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 11, 67),
      a('exit', 'exit', '旅途回顾', 174, 64)
    ],
    ambient: { kind: 'dust', smokes: [{ x: 35, y: 49 }, { x: 152, y: 49 }, { x: 92, y: 86 }] }
  });
})();