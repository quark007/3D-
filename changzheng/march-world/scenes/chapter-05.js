/* 第5章 巧渡金沙江（1935年5月）——北山旱道 / 皎平渡石滩 / 指挥山洞 / 七船渡江 / 彝海结盟林。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(5);
  K.define({
    chapterId: 5, sceneId: 'chapter-5/scene-jinsha', title: '巧渡金沙江', seed: 505,
    world: { w: 180, h: 115 },
    spawn: { x: 22, y: 30, facing: 'e' },
    palette: {
      ground: '#a08a62', road: '#b0966c', roadEdge: '#74604a',       /* 干热黄褐 */
      water: '#7a7248', waterDeep: '#57553a',                          /* 金沙江浊水 */
      rock: '#8f7a62', wall: '#8f8070', leaf: '#6b6e4c', pine: '#515e4a',
      sky0: '#b6c0bc', sky1: '#d8d2bc', mtn0: '#827662', mtn1: '#98907c', mtn2: '#b0a890', sun: true
    },
    terrain: {
      patches: [
        { x: 45, y: 36, rx: 24, ry: 14, color: '#97825c', alpha: 0.5 },   /* 结盟林地 */
        { x: 92, y: 66, rx: 30, ry: 12, color: '#a8946a', alpha: 0.6 },   /* 渡口石滩 */
        { x: 142, y: 36, rx: 18, ry: 11, color: '#97825c', alpha: 0.5 },  /* 山洞高地 */
        { x: 60, y: 90, rx: 26, ry: 8, color: '#ab976e', alpha: 0.5 }
      ],
      roads: [
        { pts: [[8, 28], [30, 32], [52, 40], [74, 50], [88, 62]], w: 4.2 },   /* 北山旱道下渡口 */
        { pts: [[88, 62], [110, 64], [136, 52], [148, 40]], w: 3.8 },         /* 滩头→山洞 */
        { pts: [[30, 32], [40, 42], [48, 46]], w: 3 }                          /* 结盟林岔路 */
      ],
      waters: [ /* 金沙江横贯南缘，渡口（x84-118）浅滩可过 */
        { pts: [[0, 78], [40, 76], [84, 80], [84, 115], [0, 115]], top: 76, bottom: 115, sparkles: 8 },
        { pts: [[118, 82], [150, 84], [180, 82], [180, 115], [118, 115]], top: 82, bottom: 115, sparkles: 8 }
      ],
      cliffs: [
        { pts: [[0, 8], [40, 4], [80, 6], [120, 4], [180, 10]], w: 3.4 },
        { pts: [[136, 28], [156, 30]], w: 3 }   /* 山洞崖 */
      ]
    },
    walkable: [[[0, 0], [180, 0], [180, 115], [0, 115]]],
    blocked: [
      K.blockedPoly([[0, 78], [40, 76], [84, 80], [84, 115], [0, 115]]),
      K.blockedPoly([[118, 82], [150, 84], [180, 82], [180, 115], [118, 115]]),
      K.blockedRect(0, 0, 180, 8),
      K.blockedRect(136, 24, 16, 10),   /* 指挥山洞崖体 */
      K.blockedCircle(40, 44, 2.6), K.blockedCircle(52, 38, 2.4), K.blockedCircle(120, 56, 2.4),
      K.blockedCircle(70, 70, 2.2), K.blockedCircle(160, 50, 2.4), K.blockedCircle(26, 44, 2.2),
      K.blockedRect(60, 88, 10, 6),     /* 滩头石堆 */
      K.blockedCircle(100, 74, 1.6)
    ],
    props: [
      { type: 'cliff', x: 8, y: 4, w: 18, h: 6, seed: 1 }, { type: 'cliff', x: 90, y: 3, w: 18, h: 6, seed: 2 },
      { type: 'cliff', x: 144, y: 28, w: 16, h: 8, seed: 3 },
      { type: 'deadTree', x: 26, y: 36, w: 4, h: 6, seed: 1 }, { type: 'rock', x: 60, y: 20, w: 5, h: 3.6, seed: 1 },
      { type: 'rock', x: 110, y: 16, w: 5, h: 3.6, seed: 2 },
      /* 彝海结盟林地 */
      { type: 'tree', x: 38, y: 40, w: 7.5, h: 10, seed: 4 }, { type: 'tree', x: 50, y: 34, w: 7, h: 9.5, seed: 5 },
      { type: 'table', x: 44, y: 46, w: 4.4, h: 3, seed: 1 }, { type: 'flagPole', x: 52, y: 44, w: 3, h: 6, seed: 1 },
      /* 皎平渡石滩：七船意象（3可见船+滩石） */
      { type: 'boat', x: 88, y: 82, w: 7, h: 3.4, seed: 1 }, { type: 'boat', x: 100, y: 86, w: 7, h: 3.4, seed: 2 },
      { type: 'boat', x: 112, y: 82, w: 6.6, h: 3.2, seed: 3 },
      { type: 'rock', x: 64, y: 90, w: 10, h: 5, seed: 4 }, { type: 'rock', x: 96, y: 72, w: 4, h: 3, seed: 5 },
      { type: 'crate', x: 92, y: 66, w: 3, h: 2.6, seed: 1 }, { type: 'grain', x: 86, y: 68, w: 3.4, h: 3, seed: 1 },
      { type: 'tent', x: 78, y: 62, w: 7, h: 5, seed: 1 },
      /* 山洞指挥所 */
      { type: 'stele', x: 140, y: 36, w: 2.6, h: 3.2, seed: 1 }, { type: 'lantern', x: 148, y: 38, w: 2, h: 4, seed: 1 },
      { type: 'sandbag', x: 152, y: 42, w: 4.6, h: 2.6, seed: 1 },
      /* 近景遮挡与出口 */
      { type: 'tree', x: 70, y: 52, w: 8, h: 10.5, seed: 6 }, { type: 'rock', x: 124, y: 60, w: 5, h: 3.6, seed: 6 },
      { type: 'gate', x: 168, y: 44, w: 7, h: 7, seed: 1 }
    ],
    anchors: [
      /* 北山旱道 */
      a('dialogue-05-01-narrator', 'npc', '抵达渡运环境 · 解说旁白', 24, 31),
      a('dialogue-05-01-boatman_1', 'npc', '抵达渡运环境 · 船工', 28, 33),
      /* 彝海结盟林地 */
      a('game-alliance', 'task', '彝海结盟 · 倾听与信任', 46, 48),
      /* 下滩路 */
      a('dialogue-05-02-logistics_1', 'npc', '核对船只和运力 · 后勤协作员', 66, 48),
      a('dialogue-05-02-boatman_1', 'npc', '核对船只和运力 · 船工', 70, 51),
      a('legacy-choice-1', 'task', '船只分配', 74, 55),
      /* 渡口石滩 */
      a('main-task', 'task', '巧渡金沙江 · 岗位协作', 90, 66),
      a('legacy-drag-1', 'task', '渡江调度', 96, 68),
      a('dialogue-05-03-medic_1', 'npc', '拖拽编排渡运顺序 · 卫生员', 86, 70),
      a('dialogue-05-03-logistics_1', 'npc', '拖拽编排渡运顺序 · 后勤协作员', 100, 70),
      a('dialogue-05-04-he_wen', 'npc', '输入自由渡运方案 · 指导员何文', 94, 62),
      a('dialogue-05-04-boatman_1', 'npc', '输入自由渡运方案 · 船工', 106, 66),
      a('workshop-ropes', 'task', '绳结解围 · 整理携行绳', 82, 64),
      /* 夜探与山洞 */
      a('game-scout', 'task', '夜探渡口', 118, 62),
      a('dialogue-05-05-chen_xiaoman', 'npc', '夜间联络与操作受阻 · 青年战士陈小满', 124, 56),
      a('dialogue-05-05-boatman_1', 'npc', '夜间联络与操作受阻 · 船工', 130, 52),
      /* 指挥山洞 */
      a('dialogue-05-06-boatman_1', 'npc', '渡运完成与回望 · 船工', 142, 40),
      a('dialogue-05-06-narrator', 'npc', '渡运完成与回望 · 解说旁白', 147, 42),
      a('history', 'task', '本章史实与来源', 152, 44),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 17, 35),
      a('exit', 'exit', '继续下一站', 168, 48)
    ],
    ambient: { kind: 'dust', smokes: [{ x: 78, y: 59 }] }
  });
})();