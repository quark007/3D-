/* 第1章 中央苏区·出发（1934年10月）——送行路口 / 村庄晒谷场 / 补给仓库 / 于都河浮桥 / 研学档案区。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(1);
  K.define({
    chapterId: 1, sceneId: 'chapter-1/scene-ruijin', title: '中央苏区·出发', seed: 101,
    world: { w: 190, h: 125 },
    spawn: { x: 20, y: 52, facing: 'e' },
    palette: {
      ground: '#94865c', road: '#ab9468', roadEdge: '#6e5f45',
      water: '#62807a', waterDeep: '#46655f',
      leaf: '#67744a', pine: '#4d604c', roof: '#6b675c',
      sky0: '#b3c2c2', sky1: '#d3d5c4', mtn0: '#707d70', mtn1: '#8a948a', mtn2: '#a8b0a4', sun: true
    },
    terrain: {
      patches: [
        { x: 55, y: 55, rx: 26, ry: 17, color: '#9c8e5e', alpha: 0.55 },  /* 晒谷场 */
        { x: 92, y: 40, rx: 20, ry: 13, color: '#8d8158', alpha: 0.5 },   /* 仓库区 */
        { x: 150, y: 34, rx: 24, ry: 15, color: '#8f8558', alpha: 0.5 },  /* 研学档案区 */
        { x: 150, y: 62, rx: 18, ry: 11, color: '#8f8558', alpha: 0.45 }, /* 编辑部 */
        { x: 95, y: 92, rx: 30, ry: 8, color: '#a2946c', alpha: 0.6 }     /* 河滩 */
      ],
      roads: [
        { pts: [[8, 52], [30, 52], [48, 56], [62, 52], [86, 46], [110, 44], [140, 40], [168, 44]], w: 4.8 }, /* 村道 */
        { pts: [[56, 56], [60, 68], [72, 80], [88, 88]], w: 4 },                                             /* 去浮桥 */
        { pts: [[92, 46], [96, 60], [96, 86]], w: 3.6 },
        { pts: [[140, 40], [148, 52], [150, 62]], w: 3 }
      ],
      waters: [ /* 于都河，浮桥位（x88-100）留缺口 */
        { pts: [[0, 84], [40, 82], [70, 86], [88, 88], [88, 102], [50, 98], [0, 96]], top: 82, bottom: 102, sparkles: 8 },
        { pts: [[100, 90], [140, 92], [190, 88], [190, 108], [130, 106], [100, 102]], top: 88, bottom: 108, sparkles: 10 }
      ],
      cliffs: [{ pts: [[0, 6], [50, 2], [110, 4], [190, 8]], w: 3 }]
    },
    walkable: [[[0, 0], [190, 0], [190, 125], [0, 125]]],
    blocked: [
      K.blockedPoly([[0, 84], [40, 82], [70, 86], [88, 88], [88, 102], [50, 98], [0, 96]]),
      K.blockedPoly([[100, 90], [140, 92], [190, 88], [190, 108], [130, 106], [100, 102]]),
      K.blockedRect(0, 0, 190, 7),
      K.blockedRect(34, 34, 10, 7),   /* 村西瓦房 */
      K.blockedRect(66, 34, 10, 7),   /* 村公所 */
      K.blockedRect(86, 32, 12, 8),   /* 补给仓库 */
      K.blockedRect(104, 34, 8, 6),
      K.blockedRect(142, 24, 12, 8),  /* 研学小屋 */
      K.blockedRect(158, 28, 9, 6),
      K.blockedRect(146, 54, 10, 6),  /* 编辑部 */
      K.blockedCircle(48, 68, 2.6),   /* 晒谷场粮囤 */
      K.blockedCircle(60, 70, 2.6),
      K.blockedCircle(90, 56, 1.8),   /* 独轮车 */
      K.blockedCircle(120, 52, 2.4), K.blockedCircle(30, 66, 2.6), K.blockedCircle(76, 24, 2.8),
      K.blockedCircle(170, 56, 2.4),
      K.blockedRect(92, 86, 0.1, 0.1)
    ],
    props: [
      { type: 'cliff', x: 6, y: 3, w: 16, h: 5, seed: 1 }, { type: 'cliff', x: 170, y: 4, w: 16, h: 5, seed: 2 },
      { type: 'pine', x: 20, y: 10, w: 5.5, h: 8, seed: 1 }, { type: 'pine', x: 60, y: 6, w: 5, h: 7.5, seed: 2 },
      { type: 'pine', x: 120, y: 8, w: 5.5, h: 8, seed: 3 }, { type: 'pine', x: 180, y: 12, w: 5, h: 7, seed: 4 },
      /* 送行路口 */
      { type: 'gate', x: 12, y: 49, w: 7, h: 7, seed: 1 }, { type: 'tree', x: 22, y: 44, w: 7.5, h: 10, seed: 5 },
      /* 村庄 */
      { type: 'house', x: 39, y: 37, w: 11, h: 8, seed: 1 }, { type: 'house', x: 71, y: 37, w: 11, h: 8, seed: 2 },
      { type: 'lantern', x: 46, y: 44, w: 2, h: 4, seed: 1 }, { type: 'lantern', x: 64, y: 44, w: 2, h: 4, seed: 2 },
      { type: 'well', x: 52, y: 48, w: 4, h: 3.6, seed: 1 },
      /* 晒谷场 */
      { type: 'grain', x: 48, y: 66, w: 4, h: 3.6, seed: 1 }, { type: 'grain', x: 60, y: 68, w: 4, h: 3.6, seed: 2 },
      { type: 'cart', x: 88, y: 54, w: 5, h: 3.4, seed: 1 }, { type: 'campfire', x: 56, y: 60, w: 3.2, h: 3, seed: 1 },
      /* 仓库区 */
      { type: 'house', x: 92, y: 36, w: 12, h: 8, seed: 3 }, { type: 'house', x: 108, y: 37, w: 9, h: 7, seed: 4 },
      { type: 'crate', x: 96, y: 46, w: 3, h: 2.6, seed: 1 }, { type: 'crate', x: 100, y: 47, w: 3, h: 2.6, seed: 2 },
      { type: 'grain', x: 84, y: 44, w: 3.6, h: 3.2, seed: 3 },
      /* 研学档案区 */
      { type: 'house', x: 148, y: 28, w: 12, h: 8, seed: 5 }, { type: 'house', x: 162, y: 31, w: 9, h: 6.6, seed: 6 },
      { type: 'table', x: 150, y: 40, w: 4.4, h: 3, seed: 1 }, { type: 'stele', x: 156, y: 40, w: 2.6, h: 3.2, seed: 1 },
      { type: 'houseWood', x: 151, y: 57, w: 10, h: 8, seed: 7 },
      /* 于都河浮桥 */
      { type: 'bridge', x: 88, y: 90, w: 12, h: 4, seed: 1 }, { type: 'bridge', x: 88, y: 96, w: 12, h: 4, seed: 2 },
      { type: 'boat', x: 104, y: 94, w: 7, h: 3.4, seed: 1 }, { type: 'boat', x: 76, y: 90, w: 6.4, h: 3.2, seed: 2 },
      { type: 'tree', x: 30, y: 68, w: 8.5, h: 11, seed: 8 }, { type: 'tree', x: 120, y: 50, w: 8, h: 10.5, seed: 9 },
      { type: 'tree', x: 76, y: 22, w: 8, h: 10, seed: 10 }, { type: 'tree', x: 170, y: 54, w: 7.5, h: 10, seed: 11 },
      /* 南岸 */
      { type: 'tree', x: 110, y: 108, w: 7.5, h: 10, seed: 12 }, { type: 'house', x: 130, y: 108, w: 9, h: 6.6, seed: 8 },
      { type: 'gate', x: 172, y: 41, w: 7, h: 7, seed: 2 }
    ],
    anchors: [
      /* 送行路口 */
      a('dialogue-01-03-civilian_1', 'npc', '出发告别 · 送行群众', 24, 54),
      a('dialogue-01-03-chen_xiaoman', 'npc', '出发告别 · 青年战士陈小满', 28, 56),
      /* 村庄主道 */
      a('dialogue-01-01-he_wen', 'npc', '进入剧情、确认玩家岗位 · 指导员何文', 50, 52),
      a('dialogue-01-06-chen_xiaoman', 'npc', '第一章行记 · 青年战士陈小满', 68, 50),
      a('dialogue-01-06-narrator', 'npc', '第一章行记 · 解说旁白', 72, 52),
      a('legacy-choice-2', 'task', '行记与史实对照', 76, 48),
      /* 晒谷场 */
      a('dialogue-01-02-wang_gui', 'npc', '整装携行、拖动物资 · 老班长王贵', 52, 62),
      a('dialogue-01-02-logistics_1', 'npc', '整装携行、拖动物资 · 后勤协作员', 57, 64),
      a('legacy-drag-1', 'task', '携行与岗位协作', 47, 62),
      a('dialogue-01-05-wang_gui', 'npc', '行路互助与渡河协作 · 老班长王贵', 62, 60),
      a('dialogue-01-05-chen_xiaoman', 'npc', '行路互助与渡河协作 · 青年战士陈小满', 65, 63),
      /* 仓库区 */
      a('dialogue-01-04-he_wen', 'npc', '提交自由行动计划 · 指导员何文', 92, 50),
      a('dialogue-01-04-logistics_1', 'npc', '提交自由行动计划 · 后勤协作员', 96, 52),
      a('dialogue-01-04-wang_gui', 'npc', '提交自由行动计划 · 老班长王贵', 99, 49),
      a('dialogue-01-04-medic_1', 'npc', '提交自由行动计划 · 卫生员', 103, 51),
      a('main-task', 'task', '中央苏区·出发 · 岗位协作', 95, 55),
      a('legacy-choice-1', 'task', '自由决策推演', 88, 51),
      a('workshop-warehouse', 'task', '补给仓库 · 让出一条路', 92, 43),
      /* 于都河浮桥 */
      a('game-bridge', 'task', '于都河浮桥 · 星夜架桥', 86, 86),
      a('legacy-qte-1', 'task', '于都阶段协作', 96, 84),
      /* 研学档案区 */
      a('extra-newsroom', 'task', '真相编辑部', 150, 60),
      a('extra-morse', 'task', '摩斯学堂', 156, 58),
      a('extra-correspondent', 'task', '随军记者', 146, 57),
      a('extra-spark', 'task', '星火传承档案', 152, 42),
      a('extra-prologue', 'task', '序章 · 让世界看见长征', 158, 42),
      a('archive-mnist-lock', 'task', '手写数字辨识', 144, 42),
      a('archive-keypad-lock', 'task', '密码锁研习', 147, 44),
      a('archive-memory-match', 'task', '线索记忆', 161, 40),
      a('archive-tic-tac-toe', 'task', '井字棋研习', 164, 42),
      a('archive-huarong-15', 'task', '样本重排', 167, 40),
      a('archive-mine-sweeper', 'task', '路障排查', 170, 42),
      a('archive-sokoban-dark', 'task', '物资推箱', 173, 40),
      /* 史实与出口 */
      a('history', 'task', '本章史实与来源', 58, 48),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 15, 57),
      a('exit', 'exit', '继续下一站', 176, 46)
    ],
    ambient: { kind: 'dust', smokes: [{ x: 39, y: 34 }, { x: 92, y: 33 }, { x: 148, y: 25 }] }
  });
})();