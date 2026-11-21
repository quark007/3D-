/* 第10章 腊子口战役（1935年9月）——西营地 / 峡谷隘道 / 腊子河木桥 / 隘口碉堡遗迹 / 之字山径东上。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(10);
  K.define({
    chapterId: 10, sceneId: 'chapter-10/scene-lazikou', title: '腊子口战役', seed: 1010,
    world: { w: 150, h: 115 },
    spawn: { x: 18, y: 62, facing: 'e' },
    palette: {
      ground: '#82805f', road: '#968866', roadEdge: '#615c44',
      water: '#5f7a72', waterDeep: '#425c54',
      rock: '#76726a', wall: '#847f6f', leaf: '#5b6a4c', pine: '#45584a',
      sky0: '#a3b5ba', sky1: '#c5cabf', mtn0: '#69756c', mtn1: '#838f88', mtn2: '#a0aaa2'
    },
    terrain: {
      patches: [
        { x: 34, y: 64, rx: 20, ry: 12, color: '#7c7a56', alpha: 0.55 },  /* 西营地 */
        { x: 78, y: 58, rx: 18, ry: 16, color: '#8a825c', alpha: 0.5 },   /* 隘口 */
        { x: 120, y: 40, rx: 18, ry: 12, color: '#7c7a56', alpha: 0.5 },  /* 东上高地 */
        { x: 112, y: 88, rx: 20, ry: 9, color: '#8a825c', alpha: 0.45 }   /* 东南滩 */
      ],
      roads: [
        { pts: [[8, 62], [30, 62], [52, 60], [70, 58], [88, 56]], w: 4.2 },    /* 营地→隘口 */
        { pts: [[88, 56], [104, 54], [118, 46], [128, 38], [140, 34]], w: 3.6 }, /* 穿隘东上 */
        { pts: [[70, 58], [76, 70], [88, 80], [108, 86]], w: 3.2 },            /* 下河滩 */
        { pts: [[118, 46], [126, 54], [132, 62]], w: 2.8 }                      /* 东侧岔路 */
      ],
      waters: [ /* 腊子河：自北崖跌落穿峡，木桥位（x76-88）留缺口 */
        { pts: [[70, 20], [82, 36], [80, 60], [76, 70], [76, 84], [60, 96], [40, 104], [30, 115], [56, 115], [80, 100], [92, 84], [92, 60], [94, 36], [86, 20]], top: 20, bottom: 115, sparkles: 8 }
      ],
      cliffs: [
        { pts: [[0, 14], [40, 8], [66, 12]], w: 4 },       /* 西北崖 */
        { pts: [[100, 10], [150, 6]], w: 4 },              /* 东北崖 */
        { pts: [[0, 96], [24, 90]], w: 3 },                /* 西南崖 */
        { pts: [[100, 70], [120, 78]], w: 3 }              /* 东崖臂 */
      ]
    },
    walkable: [[[0, 0], [150, 0], [150, 115], [0, 115]]],
    blocked: [
      K.blockedPoly([[70, 20], [82, 36], [80, 60], [76, 70], [76, 84], [60, 96], [40, 104], [30, 115], [56, 115], [80, 100], [92, 84], [92, 60], [94, 36], [86, 20]]),
      K.blockedPoly([[0, 0], [64, 0], [64, 18], [30, 22], [0, 28]]),          /* 西北山 */
      K.blockedPoly([[98, 0], [150, 0], [150, 24], [118, 26], [98, 16]]),     /* 东北山 */
      K.blockedRect(0, 92, 26, 23),
      K.blockedRect(94, 66, 26, 12),                                          /* 东崖臂（只留桥上与北线） */
      K.blockedRect(26, 54, 7, 5), K.blockedRect(38, 56, 7, 5),               /* 营地帐篷 */
      K.blockedRect(82, 40, 8, 6),                                            /* 隘口碉堡遗迹 */
      K.blockedCircle(56, 66, 2.2), K.blockedCircle(98, 48, 2.2), K.blockedCircle(122, 60, 2.2),
      K.blockedCircle(40, 76, 2.4), K.blockedCircle(136, 44, 2)
    ],
    props: [
      { type: 'cliff', x: 10, y: 10, w: 20, h: 9, seed: 1 }, { type: 'cliff', x: 44, y: 6, w: 18, h: 8, seed: 2 },
      { type: 'cliff', x: 106, y: 4, w: 20, h: 9, seed: 3 }, { type: 'cliff', x: 130, y: 10, w: 16, h: 8, seed: 4 },
      { type: 'cliff', x: 100, y: 68, w: 18, h: 7, seed: 5 },
      { type: 'pine', x: 30, y: 24, w: 5.5, h: 8, seed: 1 }, { type: 'pine', x: 90, y: 18, w: 5, h: 7.5, seed: 2 },
      { type: 'pine', x: 128, y: 26, w: 5.5, h: 8, seed: 3 }, { type: 'pine', x: 60, y: 40, w: 5, h: 7.5, seed: 4 },
      /* 西营地 */
      { type: 'tent', x: 29, y: 56, w: 7, h: 5, seed: 1 }, { type: 'tent', x: 41, y: 58, w: 7, h: 5, seed: 2 },
      { type: 'campfire', x: 35, y: 66, w: 3.2, h: 3, seed: 1 }, { type: 'crate', x: 46, y: 64, w: 3, h: 2.6, seed: 1 },
      { type: 'sandbag', x: 52, y: 56, w: 4.6, h: 2.6, seed: 1 },
      /* 隘口：碉堡遗迹 + 木桥 */
      { type: 'tower', x: 86, y: 43, w: 8, h: 8, seed: 1 },
      { type: 'bridge', x: 76, y: 70, w: 12, h: 4, seed: 1 }, { type: 'bridge', x: 76, y: 76, w: 12, h: 4, seed: 2 },
      { type: 'bridge', x: 76, y: 82, w: 12, h: 4, seed: 3 },
      { type: 'stele', x: 72, y: 64, w: 2.6, h: 3.2, seed: 1 },
      /* 之字山径 */
      { type: 'stairs', x: 122, y: 42, w: 5, h: 4, seed: 1 }, { type: 'rock', x: 112, y: 52, w: 4.4, h: 3.2, seed: 1 },
      { type: 'flagPole', x: 140, y: 32, w: 3, h: 6, seed: 1 },
      /* 河滩 */
      { type: 'rock', x: 100, y: 84, w: 4.4, h: 3.2, seed: 2 }, { type: 'tree', x: 112, y: 90, w: 7.5, h: 10, seed: 5 },
      /* 近景遮挡 */
      { type: 'pine', x: 58, y: 72, w: 7.5, h: 10.5, seed: 6 }, { type: 'tree', x: 66, y: 48, w: 8, h: 10.5, seed: 7 },
      { type: 'gate', x: 140, y: 30, w: 7, h: 7, seed: 1 }
    ],
    anchors: [
      /* 西营地 */
      a('dialogue-10-01-narrator', 'npc', '抵近峡口 · 解说旁白', 22, 64),
      a('dialogue-10-01-liaison_1', 'npc', '抵近峡口 · 交通联络员', 26, 66),
      a('dialogue-10-02-liaison_1', 'npc', '观察通道与报告 · 交通联络员', 36, 62),
      a('dialogue-10-03-he_wen', 'npc', '岗位分工 · 指导员何文', 44, 64),
      a('dialogue-10-03-logistics_1', 'npc', '岗位分工 · 后勤协作员', 48, 66),
      a('dialogue-10-03-wang_gui', 'npc', '岗位分工 · 老班长王贵', 51, 63),
      a('dialogue-10-03-medic_1', 'npc', '岗位分工 · 卫生员', 54, 65),
      a('main-task', 'task', '腊子口战役 · 岗位协作', 40, 68),
      /* 隘口 */
      a('dialogue-10-04-wang_gui', 'npc', '玩家提交协同方案 · 老班长王贵', 70, 62),
      a('dialogue-10-04-he_wen', 'npc', '玩家提交协同方案 · 指导员何文', 74, 64),
      a('legacy-choice-1', 'task', '战术突破', 66, 58),
      a('legacy-qte-1', 'task', '悬崖攀爬', 80, 48),
      a('game-lob', 'task', '腊子口 · 联络与通路准备', 76, 70),
      /* 河滩与东南 */
      a('dialogue-10-05-chen_xiaoman', 'npc', '攀爬／传令受阻 · 青年战士陈小满', 88, 82),
      a('dialogue-10-05-liaison_1', 'npc', '攀爬／传令受阻 · 交通联络员', 94, 86),
      /* 东上高地 */
      a('dialogue-10-06-medic_1', 'npc', '通道打开后的整理 · 卫生员', 124, 44),
      a('dialogue-10-06-narrator', 'npc', '通道打开后的整理 · 解说旁白', 128, 46),
      a('game-press', 'task', '哈达铺读报', 132, 50),
      a('history', 'task', '本章史实与来源', 136, 42),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 13, 67),
      a('exit', 'exit', '继续下一站', 142, 36)
    ],
    ambient: { kind: 'mist', smokes: [{ x: 35, y: 64 }] }
  });
})();