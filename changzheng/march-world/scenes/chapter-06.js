/* 第6章 强渡大渡河（1935年5月25日）——安顺场村落 / 鹅卵石滩 / 渡船点 / 浮桥核验 / 南岸接应。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(6);
  K.define({
    chapterId: 6, sceneId: 'chapter-6/scene-dadu', title: '强渡大渡河', seed: 606,
    world: { w: 175, h: 115 },
    spawn: { x: 24, y: 34, facing: 'e' },
    palette: {
      ground: '#8d8570', road: '#a08e70', roadEdge: '#686050',
      water: '#5d7a78', waterDeep: '#3f5c5a',
      rock: '#7c786c', wall: '#86816f', leaf: '#5f6d4e', pine: '#495a4a',
      sky0: '#a8babe', sky1: '#c9cec0', mtn0: '#6c7870', mtn1: '#85918a', mtn2: '#a3ada5'
    },
    terrain: {
      patches: [
        { x: 50, y: 40, rx: 24, ry: 14, color: '#877e60', alpha: 0.55 },  /* 安顺场村 */
        { x: 90, y: 68, rx: 30, ry: 10, color: '#a0946e', alpha: 0.6 },   /* 鹅卵石滩 */
        { x: 130, y: 96, rx: 26, ry: 10, color: '#8d8458', alpha: 0.5 },  /* 南岸 */
        { x: 140, y: 34, rx: 18, ry: 10, color: '#877e60', alpha: 0.45 }  /* 东高地 */
      ],
      roads: [
        { pts: [[10, 32], [34, 36], [54, 44], [74, 54], [86, 66]], w: 4.4 },   /* 进村下滩 */
        { pts: [[86, 66], [108, 68], [128, 78], [132, 92]], w: 3.8 },          /* 滩头到浮桥 */
        { pts: [[110, 50], [126, 42], [140, 36]], w: 3 }                        /* 东高地 */
      ],
      waters: [ /* 大渡河急流，浮桥位（x126-138）留缺口 */
        { pts: [[0, 74], [50, 72], [90, 76], [126, 82], [126, 98], [80, 92], [30, 88], [0, 90]], top: 72, bottom: 98, sparkles: 12 },
        { pts: [[138, 84], [160, 86], [175, 84], [175, 102], [150, 100], [138, 96]], top: 84, bottom: 102, sparkles: 6 }
      ],
      cliffs: [
        { pts: [[0, 8], [50, 4], [100, 6], [175, 10]], w: 3.2 },
        { pts: [[140, 26], [160, 28]], w: 2.8 }
      ]
    },
    walkable: [[[0, 0], [175, 0], [175, 115], [0, 115]]],
    blocked: [
      K.blockedPoly([[0, 74], [50, 72], [90, 76], [126, 82], [126, 98], [80, 92], [30, 88], [0, 90]]),
      K.blockedPoly([[138, 84], [160, 86], [175, 84], [175, 102], [150, 100], [138, 96]]),
      K.blockedRect(0, 0, 175, 8),
      K.blockedRect(42, 32, 10, 7), K.blockedRect(56, 34, 9, 6), K.blockedRect(30, 40, 8, 6),
      K.blockedRect(136, 24, 12, 8),  /* 东高地碉楼 */
      K.blockedCircle(66, 52, 2.2), K.blockedCircle(100, 62, 2.4), K.blockedCircle(48, 56, 2.2),
      K.blockedCircle(118, 74, 2), K.blockedCircle(150, 44, 2.2), K.blockedCircle(20, 48, 2.4)
    ],
    props: [
      { type: 'cliff', x: 8, y: 4, w: 16, h: 6, seed: 1 }, { type: 'cliff', x: 100, y: 3, w: 16, h: 6, seed: 2 },
      { type: 'cliff', x: 142, y: 26, w: 14, h: 7, seed: 3 },
      { type: 'pine', x: 24, y: 10, w: 5.5, h: 8, seed: 1 }, { type: 'pine', x: 70, y: 8, w: 5, h: 7.5, seed: 2 },
      { type: 'pine', x: 160, y: 12, w: 5, h: 7, seed: 3 },
      /* 安顺场村 */
      { type: 'house', x: 47, y: 36, w: 11, h: 8, seed: 1 }, { type: 'house', x: 60, y: 37, w: 9.5, h: 7, seed: 2 },
      { type: 'house', x: 34, y: 43, w: 9, h: 6.6, seed: 3 }, { type: 'lantern', x: 52, y: 44, w: 2, h: 4, seed: 1 },
      { type: 'well', x: 56, y: 50, w: 4, h: 3.6, seed: 1 }, { type: 'crate', x: 64, y: 48, w: 3, h: 2.6, seed: 1 },
      /* 鹅卵石滩 + 渡船 */
      { type: 'rock', x: 100, y: 64, w: 4.4, h: 3.2, seed: 1 }, { type: 'rock', x: 78, y: 68, w: 4, h: 3, seed: 2 },
      { type: 'boat', x: 90, y: 78, w: 7.5, h: 3.6, seed: 1 }, { type: 'boat', x: 104, y: 82, w: 7, h: 3.4, seed: 2 },
      { type: 'sandbag', x: 84, y: 70, w: 4.6, h: 2.6, seed: 1 }, { type: 'tent', x: 76, y: 62, w: 7, h: 5, seed: 1 },
      /* 浮桥（核验通行） */
      { type: 'bridge', x: 126, y: 84, w: 12, h: 4, seed: 1 }, { type: 'bridge', x: 126, y: 90, w: 12, h: 4, seed: 2 },
      { type: 'bridge', x: 126, y: 96, w: 12, h: 4, seed: 3 },
      /* 东高地碉楼（远景工事，非战斗表现） */
      { type: 'tower', x: 142, y: 28, w: 9, h: 9, seed: 1 }, { type: 'flagPole', x: 152, y: 34, w: 3, h: 6, seed: 1 },
      /* 彝海结盟副点 */
      { type: 'tree', x: 120, y: 48, w: 7.5, h: 10, seed: 4 }, { type: 'table', x: 124, y: 54, w: 4.4, h: 3, seed: 1 },
      /* 南岸 */
      { type: 'tree', x: 140, y: 100, w: 7, h: 9.5, seed: 5 }, { type: 'rock', x: 158, y: 104, w: 4.4, h: 3.2, seed: 3 },
      /* 近景遮挡 */
      { type: 'tree', x: 68, y: 60, w: 8.5, h: 11, seed: 6 }, { type: 'pine', x: 112, y: 58, w: 7, h: 10, seed: 7 },
      { type: 'gate', x: 166, y: 40, w: 7, h: 7, seed: 1 }
    ],
    anchors: [
      /* 进村 */
      a('dialogue-06-01-narrator', 'npc', '安顺场环境与任务 · 解说旁白', 26, 36),
      a('dialogue-06-01-he_wen', 'npc', '安顺场环境与任务 · 指导员何文', 30, 38),
      /* 安顺场村 */
      a('dialogue-06-02-boatman_1', 'npc', '岸边准备 · 船工', 50, 46),
      a('dialogue-06-02-logistics_1', 'npc', '岸边准备 · 后勤协作员', 55, 48),
      a('dialogue-06-02-he_wen', 'npc', '岸边准备 · 指导员何文', 47, 50),
      a('dialogue-06-03-he_wen', 'npc', '选择本组配合方式 · 指导员何文', 58, 52),
      a('dialogue-06-03-logistics_1', 'npc', '选择本组配合方式 · 后勤协作员', 62, 54),
      a('dialogue-06-03-wang_gui', 'npc', '选择本组配合方式 · 老班长王贵', 65, 51),
      a('dialogue-06-03-medic_1', 'npc', '选择本组配合方式 · 卫生员', 68, 53),
      a('main-task', 'task', '强渡大渡河 · 岗位协作', 56, 55),
      /* 滩头 */
      a('game-mortar', 'task', '观测与渡口调度', 80, 66),
      a('legacy-qte-1', 'task', '勇士冲锋', 88, 70),
      a('legacy-choice-1', 'task', '火力压制', 96, 68),
      a('dialogue-06-04-liaison_1', 'npc', '自由协同计划 · 交通联络员', 108, 62),
      a('dialogue-06-04-he_wen', 'npc', '自由协同计划 · 指导员何文', 112, 64),
      a('game-yihai', 'task', '彝海结盟', 124, 56),
      /* 渡船与浮桥 */
      a('game-ferry', 'task', '大渡河 · 渡运调度', 94, 74),
      a('dialogue-06-05-boatman_1', 'npc', '渡河执行与状态反馈 · 船工', 100, 76),
      a('dialogue-06-05-chen_xiaoman', 'npc', '渡河执行与状态反馈 · 青年战士陈小满', 104, 78),
      a('game-pontoon', 'task', '浮桥通行 · 连接与检查', 122, 82),
      /* 南岸接应 */
      a('dialogue-06-06-medic_1', 'npc', '岸上接应与下一步 · 卫生员', 136, 100),
      a('dialogue-06-06-logistics_1', 'npc', '岸上接应与下一步 · 后勤协作员', 141, 102),
      a('dialogue-06-06-he_wen', 'npc', '岸上接应与下一步 · 指导员何文', 146, 100),
      a('dialogue-06-06-narrator', 'npc', '岸上接应与下一步 · 解说旁白', 151, 102),
      a('history', 'task', '本章史实与来源', 148, 96),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 19, 39),
      a('exit', 'exit', '继续下一站', 166, 44)
    ],
    ambient: { kind: 'mist', smokes: [{ x: 47, y: 33 }] }
  });
})();