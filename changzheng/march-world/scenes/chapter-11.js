/* 第11章 吴起镇·落脚（1935年10月19日）——北路进镇 / 窑洞院落 / 门楼广场 / 档案小屋 / 直罗镇番外道。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(11);
  K.define({
    chapterId: 11, sceneId: 'chapter-11/scene-wuqi', title: '吴起镇·落脚', seed: 1111,
    world: { w: 170, h: 115 },
    spawn: { x: 85, y: 14, facing: 's' },
    palette: {
      ground: '#a68a5c', road: '#b3966a', roadEdge: '#74604a',       /* 黄土高原 */
      water: '#6b7c72', waterDeep: '#4a5c52',
      rock: '#8f7c60', wall: '#9a8468', loess: '#b48f57', roof: '#6e6252',
      leaf: '#6a6e48', pine: '#4f5e4a', tent: '#a3946f',
      sky0: '#b0beb8', sky1: '#d8d2ba', mtn0: '#87785e', mtn1: '#9d9178', mtn2: '#b3a88e', sun: true
    },
    terrain: {
      patches: [
        { x: 85, y: 62, rx: 30, ry: 16, color: '#9d885a', alpha: 0.55 },  /* 门楼广场 */
        { x: 50, y: 36, rx: 24, ry: 13, color: '#ab905e', alpha: 0.5 },   /* 窑洞台地 */
        { x: 130, y: 44, rx: 18, ry: 11, color: '#a08a5c', alpha: 0.5 },  /* 档案小屋 */
        { x: 140, y: 82, rx: 20, ry: 10, color: '#a08a5c', alpha: 0.45 }  /* 直罗镇道 */
      ],
      roads: [
        { pts: [[85, 8], [84, 24], [80, 40], [82, 56]], w: 4.6 },          /* 北路进镇 */
        { pts: [[82, 56], [62, 62], [40, 60], [18, 56]], w: 4 },           /* 广场西 */
        { pts: [[84, 60], [106, 62], [128, 70], [146, 80], [164, 86]], w: 4 }, /* 广场→直罗镇道 */
        { pts: [[80, 40], [64, 38], [52, 36]], w: 3.2 },                   /* 窑洞台地 */
        { pts: [[106, 60], [120, 52], [130, 46]], w: 3 }                   /* 档案小屋 */
      ],
      waters: [{ pts: [[0, 96], [50, 94], [100, 98], [170, 96], [170, 110], [0, 108]], top: 94, bottom: 110, sparkles: 5 }], /* 洛河 */
      cliffs: [
        { pts: [[0, 10], [50, 4], [110, 4], [170, 8]], w: 3.4 },
        { pts: [[30, 24], [70, 20]], w: 2.6 }   /* 窑洞崖线 */
      ]
    },
    walkable: [[[0, 0], [170, 0], [170, 115], [0, 115]]],
    blocked: [
      K.blockedPoly([[0, 96], [50, 94], [100, 98], [170, 96], [170, 115], [0, 115]]),
      K.blockedRect(0, 0, 170, 6),
      K.blockedRect(38, 26, 9, 6), K.blockedRect(50, 24, 9, 6), K.blockedRect(62, 26, 9, 6),  /* 窑洞群 */
      K.blockedRect(76, 40, 18, 8),   /* 门楼（两侧通行） */
      K.blockedRect(20, 48, 10, 7), K.blockedRect(98, 46, 10, 7),   /* 沿街院落 */
      K.blockedRect(124, 36, 10, 7),  /* 档案小屋 */
      K.blockedCircle(70, 66, 2), K.blockedCircle(100, 66, 2), K.blockedCircle(56, 50, 2.4),
      K.blockedCircle(120, 74, 2.2), K.blockedCircle(90, 80, 2), K.blockedCircle(150, 60, 2.4)
    ],
    props: [
      { type: 'cliff', x: 10, y: 4, w: 18, h: 6, seed: 1 }, { type: 'cliff', x: 140, y: 4, w: 18, h: 6, seed: 2 },
      /* 窑洞台地（陕北标志） */
      { type: 'yaodong', x: 42, y: 30, w: 9, h: 7, seed: 1 }, { type: 'yaodong', x: 54, y: 28, w: 9, h: 7, seed: 2 },
      { type: 'yaodong', x: 66, y: 30, w: 9, h: 7, seed: 3 },
      { type: 'tree', x: 34, y: 34, w: 7, h: 9.5, seed: 1 },
      /* 门楼与广场（红旗） */
      { type: 'gate', x: 79, y: 42, w: 14, h: 9, seed: 1 },
      { type: 'flagPole', x: 74, y: 46, w: 3, h: 6, seed: 1 }, { type: 'flagPole', x: 96, y: 46, w: 3, h: 6, seed: 2 },
      { type: 'lantern', x: 78, y: 54, w: 2, h: 4, seed: 1 }, { type: 'lantern', x: 92, y: 54, w: 2, h: 4, seed: 2 },
      /* 沿街 */
      { type: 'house', x: 25, y: 51, w: 11, h: 8, seed: 4 }, { type: 'house', x: 103, y: 49, w: 11, h: 8, seed: 5 },
      { type: 'well', x: 62, y: 62, w: 4, h: 3.6, seed: 1 }, { type: 'table', x: 88, y: 66, w: 4.4, h: 3, seed: 1 },
      { type: 'cart', x: 70, y: 72, w: 5, h: 3.4, seed: 1 }, { type: 'grain', x: 98, y: 70, w: 3.6, h: 3.2, seed: 1 },
      /* 档案小屋 */
      { type: 'houseWood', x: 129, y: 40, w: 10.5, h: 8, seed: 6 }, { type: 'stele', x: 122, y: 48, w: 2.6, h: 3.2, seed: 1 },
      /* 直罗镇道 */
      { type: 'tree', x: 148, y: 66, w: 7.5, h: 10, seed: 2 }, { type: 'rock', x: 158, y: 76, w: 4.4, h: 3.2, seed: 1 },
      { type: 'flagPole', x: 140, y: 76, w: 3, h: 6, seed: 3 },
      /* 近景遮挡 */
      { type: 'tree', x: 60, y: 78, w: 8.5, h: 11, seed: 3 }, { type: 'tree', x: 112, y: 70, w: 8, h: 10.5, seed: 4 },
      { type: 'gate', x: 82, y: 8, w: 7, h: 7, seed: 2 }
    ],
    anchors: [
      /* 北路进镇 */
      a('dialogue-11-01-narrator', 'npc', '抵达陕北背景 · 解说旁白', 82, 16),
      a('dialogue-11-01-he_wen', 'npc', '抵达陕北背景 · 指导员何文', 88, 18),
      /* 窑洞台地 */
      a('dialogue-11-02-liaison_1', 'npc', '与当地接洽 · 交通联络员', 46, 36),
      a('dialogue-11-02-civilian_1', 'npc', '与当地接洽 · 送行群众', 52, 38),
      a('dialogue-11-03-logistics_1', 'npc', '分配住宿和现有物资 · 后勤协作员', 58, 36),
      a('dialogue-11-03-medic_1', 'npc', '分配住宿和现有物资 · 卫生员', 63, 38),
      /* 门楼广场 */
      a('main-task', 'task', '吴起镇·落脚 · 岗位协作', 85, 62),
      a('dialogue-11-04-he_wen', 'npc', '自由整顿方案 · 指导员何文', 80, 64),
      a('dialogue-11-04-wang_gui', 'npc', '自由整顿方案 · 老班长王贵', 90, 64),
      a('legacy-choice-1', 'task', '扎根陕北', 76, 66),
      a('game-final', 'task', '吴起镇 · 接应路线核验', 94, 68),
      a('dialogue-11-05-chen_xiaoman', 'npc', '回应一路承诺 · 青年战士陈小满', 86, 70),
      a('chapter-task54', 'task', '陕北落脚 · 整理行记', 72, 62),
      /* 档案小屋 */
      a('workshop-archive', 'task', '档案修复 · 拼回这一页', 126, 50),
      /* 直罗镇道 */
      a('extra-zhiluo', 'task', '直罗镇 · 番外接应', 148, 78),
      /* 收场 */
      a('dialogue-11-06-narrator', 'npc', '阶段回顾与后续时间转场 · 解说旁白', 100, 76),
      a('dialogue-11-06-he_wen', 'npc', '阶段回顾与后续时间转场 · 指导员何文', 105, 78),
      a('history', 'task', '本章史实与来源', 92, 74),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 85, 24),
      a('exit', 'exit', '继续下一站', 164, 88)
    ],
    ambient: { kind: 'dust', smokes: [{ x: 42, y: 26 }, { x: 66, y: 26 }, { x: 103, y: 45 }] }
  });
})();