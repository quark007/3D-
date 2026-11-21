/* 第8章 翻越雪山（1935年6月，夹金山）——按用户参考图：南路入山 / 垭口检查站（石墙木门经幡） / 之字雪路上行 / 休息营地 / 丰碑点。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(8);
  K.define({
    chapterId: 8, sceneId: 'chapter-8/scene-snowmount', title: '翻越雪山', seed: 808,
    world: { w: 165, h: 125 },
    spawn: { x: 80, y: 112, facing: 'n' },
    palette: {
      ground: '#b8b4a4', road: '#a08a68', roadEdge: '#6d604a',       /* 雪原+土路 */
      water: '#7d9498', waterDeep: '#5a7478',
      rock: '#8a877c', wall: '#8f8a7a', leaf: '#5e6b52', pine: '#46564a',
      sky0: '#9fb6c4', sky1: '#ccd4d2', mtn0: '#7e8c90', mtn1: '#9aa6a8', mtn2: '#b6bec0',
      speckle: '#8a8a80', snowyTree: true, snowyRock: true, snowcaps: true
    },
    terrain: {
      patches: [
        { x: 80, y: 100, rx: 30, ry: 14, color: '#a89e84', alpha: 0.5 },  /* 山脚营地 */
        { x: 80, y: 62, rx: 24, ry: 10, color: '#a69c80', alpha: 0.55 },  /* 检查站坝子 */
        { x: 60, y: 30, rx: 26, ry: 12, color: '#c2beb0', alpha: 0.6 },   /* 雪坡 */
        { x: 112, y: 84, rx: 16, ry: 9, color: '#aaa188', alpha: 0.5 },   /* 休息营地 */
        { x: 40, y: 60, rx: 14, ry: 16, color: '#b2ae9e', alpha: 0.5 }    /* 西侧石阶坡 */
      ],
      roads: [
        { pts: [[80, 118], [80, 104], [76, 88], [80, 72], [82, 64]], w: 4.6 },               /* 南路至关卡 */
        { pts: [[82, 58], [78, 48], [64, 40], [52, 34], [48, 26], [56, 18], [72, 14]], w: 3.8 }, /* 之字雪路 */
        { pts: [[76, 88], [96, 86], [110, 84]], w: 3.2 },                                     /* 休息营地岔路 */
        { pts: [[64, 62], [48, 64], [40, 70]], w: 2.8 }                                       /* 西侧石阶 */
      ],
      waters: [{ pts: [[120, 108], [150, 106], [165, 108], [165, 125], [120, 125]], top: 106, bottom: 125, sparkles: 4 }], /* 冰溪 */
      cliffs: [
        { pts: [[0, 10], [40, 4], [90, 2], [130, 4], [165, 8]], w: 4 },   /* 北山脊 */
        { pts: [[0, 30], [14, 44], [10, 70], [0, 84]], w: 3 },            /* 西崖 */
        { pts: [[165, 30], [152, 48], [158, 72], [165, 84]], w: 3 }       /* 东崖 */
      ]
    },
    walkable: [[[0, 0], [165, 0], [165, 125], [0, 125]]],
    blocked: [
      K.blockedPoly([[0, 0], [165, 0], [165, 12], [120, 8], [70, 8], [20, 12], [0, 18]]),   /* 北山 */
      K.blockedPoly([[0, 26], [12, 40], [8, 68], [0, 80]]),                                  /* 西崖 */
      K.blockedPoly([[165, 26], [154, 44], [160, 70], [165, 80]]),                           /* 东崖 */
      K.blockedPoly([[120, 108], [150, 106], [165, 108], [165, 125], [120, 125]]),           /* 冰溪 */
      /* 检查站石墙两翼（中间木门可通行 x78-86） */
      K.blockedRect(56, 58, 22, 4), K.blockedRect(86, 58, 24, 4),
      K.blockedCircle(30, 52, 2.4), K.blockedCircle(46, 76, 2.4), K.blockedCircle(96, 44, 2.6),
      K.blockedCircle(124, 66, 2.4), K.blockedCircle(140, 88, 2.6),
      K.blockedRect(104, 78, 7, 5),   /* 休息营地帐篷 */
      K.blockedRect(60, 96, 7, 5),    /* 山脚帐篷 */
      K.blockedRect(88, 98, 7, 5),
      K.blockedCircle(100, 26, 1.8)   /* 丰碑 */
    ],
    props: [
      /* 雪山远景层次由 backdrop 负责（snowcaps） */
      { type: 'cliff', x: 8, y: 6, w: 18, h: 7, seed: 1 }, { type: 'cliff', x: 90, y: 3, w: 20, h: 7, seed: 2 },
      { type: 'cliff', x: 140, y: 6, w: 16, h: 6, seed: 3 },
      { type: 'pine', x: 30, y: 16, w: 5, h: 7.5, seed: 1 }, { type: 'pine', x: 120, y: 12, w: 5, h: 7.5, seed: 2 },
      /* 之字雪路 */
      { type: 'stairs', x: 50, y: 32, w: 5, h: 4, seed: 1 }, { type: 'rock', x: 60, y: 42, w: 4.4, h: 3.2, seed: 1 },
      { type: 'rock', x: 74, y: 50, w: 4, h: 3, seed: 2 }, { type: 'pine', x: 44, y: 22, w: 5.5, h: 8, seed: 3 },
      /* 垭口检查站：石墙 + 木门 + 沙袋 + 经幡（参考图核心） */
      { type: 'stoneWall', x: 60, y: 59, w: 16, h: 3, seed: 1 }, { type: 'stoneWall', x: 92, y: 59, w: 16, h: 3, seed: 2 },
      { type: 'gate', x: 78, y: 56, w: 8, h: 7, seed: 1 },
      { type: 'sandbag', x: 70, y: 64, w: 4.6, h: 2.6, seed: 1 }, { type: 'sandbag', x: 92, y: 64, w: 4.6, h: 2.6, seed: 2 },
      { type: 'prayerFlags', x: 66, y: 52, w: 12, h: 5, seed: 1 }, { type: 'prayerFlags', x: 88, y: 52, w: 12, h: 5, seed: 2 },
      { type: 'stele', x: 72, y: 60, w: 2.4, h: 3, seed: 1 }, { type: 'stele', x: 96, y: 60, w: 2.4, h: 3, seed: 2 },
      { type: 'crate', x: 104, y: 62, w: 3, h: 2.6, seed: 1 },
      /* 休息营地 */
      { type: 'tent', x: 107, y: 80, w: 7, h: 5, seed: 1 }, { type: 'campfire', x: 114, y: 88, w: 3.2, h: 3, seed: 1 },
      { type: 'grain', x: 100, y: 86, w: 3.4, h: 3, seed: 1 },
      /* 山脚营地 */
      { type: 'tent', x: 63, y: 98, w: 7, h: 5, seed: 2 }, { type: 'tent', x: 91, y: 100, w: 7, h: 5, seed: 3 },
      { type: 'campfire', x: 80, y: 106, w: 3.2, h: 3, seed: 2 }, { type: 'cart', x: 70, y: 104, w: 5, h: 3.4, seed: 1 },
      /* 丰碑点 */
      { type: 'stele', x: 100, y: 24, w: 3.4, h: 4, seed: 3 }, { type: 'rock', x: 96, y: 28, w: 4, h: 3, seed: 3 },
      { type: 'pine', x: 108, y: 26, w: 5, h: 7, seed: 4 },
      /* 西侧石阶 */
      { type: 'stairs', x: 42, y: 64, w: 5, h: 4, seed: 2 }, { type: 'rock', x: 34, y: 70, w: 4, h: 3, seed: 4 },
      /* 近景遮挡雪松 */
      { type: 'pine', x: 56, y: 78, w: 7, h: 10, seed: 5 }, { type: 'pine', x: 96, y: 72, w: 7.5, h: 10.5, seed: 6 },
      { type: 'tree', x: 130, y: 92, w: 7.5, h: 10, seed: 7 },
      { type: 'gate', x: 76, y: 10, w: 7, h: 7, seed: 2 }
    ],
    anchors: [
      /* 山脚营地（出发准备） */
      a('dialogue-08-01-narrator', 'npc', '山脚准备 · 解说旁白', 76, 110),
      a('dialogue-08-01-wang_gui', 'npc', '山脚准备 · 老班长王贵', 82, 108),
      a('dialogue-08-02-logistics_1', 'npc', '被服和负重分担 · 后勤协作员', 66, 102),
      a('chapter-task54', 'task', '雪山互助 · 整理背囊', 88, 104),
      /* 南路上行 */
      a('dialogue-08-03-chen_xiaoman', 'npc', '战友体力下降 · 青年战士陈小满', 74, 92),
      a('dialogue-08-03-medic_1', 'npc', '战友体力下降 · 卫生员', 78, 94),
      a('workshop-stretcher', 'task', '双人担架 · 一起走', 84, 90),
      /* 休息营地 */
      a('main-task', 'task', '翻越雪山 · 岗位协作', 110, 88),
      a('legacy-choice-1', 'task', '雪山行军', 104, 90),
      /* 垭口检查站 */
      a('dialogue-08-04-wang_gui', 'npc', '自由行军与互助计划 · 老班长王贵', 74, 66),
      a('dialogue-08-04-he_wen', 'npc', '自由行军与互助计划 · 指导员何文', 80, 62),
      a('dialogue-08-04-logistics_1', 'npc', '自由行军与互助计划 · 后勤协作员', 86, 66),
      a('dialogue-08-04-medic_1', 'npc', '自由行军与互助计划 · 卫生员', 90, 63),
      a('legacy-qte-1', 'task', '攀登坚持', 70, 56),
      /* 之字雪路 */
      a('dialogue-08-05-liaison_1', 'npc', '风雪中失去照应 · 交通联络员', 62, 38),
      a('dialogue-08-05-chen_xiaoman', 'npc', '风雪中失去照应 · 青年战士陈小满', 56, 32),
      a('game-snow', 'task', '雪山互助 · 观察择路', 50, 28),
      /* 丰碑点 */
      a('hero-monument63', 'task', '丰碑', 102, 30),
      a('hero-laoshanjie64', 'task', '老山界', 96, 33),
      /* 北垭口（下山方向） */
      a('dialogue-08-06-chen_xiaoman', 'npc', '下山清点与关系回声 · 青年战士陈小满', 70, 16),
      a('dialogue-08-06-narrator', 'npc', '下山清点与关系回声 · 解说旁白', 76, 14),
      a('history', 'task', '本章史实与来源', 84, 16),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 85, 117),
      a('exit', 'exit', '继续下一站', 78, 12)
    ],
    ambient: { kind: 'snow', smokes: [{ x: 80, y: 104 }] }
  });
})();