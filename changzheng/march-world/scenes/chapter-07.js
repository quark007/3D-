/* 第7章 飞夺泸定桥（1935年5月29日）——西桥头亭 / 铁索桥 / 悬崖栈道 / 东岸县城。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(7);
  K.define({
    chapterId: 7, sceneId: 'chapter-7/scene-luding', title: '飞夺泸定桥', seed: 707,
    world: { w: 170, h: 110 },
    ironBridge: { x0:62, x1:128, y:56, width:4.6, deckChains:9, sideRails:2 },
    spawn: { x: 22, y: 52, facing: 'e' },
    palette: {
      ground: '#8a8270', road: '#9e9070', roadEdge: '#665e4c',
      water: '#607a78', waterDeep: '#425e5c',
      rock: '#767468', wall: '#837e6e', leaf: '#5c6b4e', pine: '#47594a',
      sky0: '#a6b8bc', sky1: '#c7ccc0', mtn0: '#6a7670', mtn1: '#84908a', mtn2: '#a2aca4'
    },
    terrain: {
      patches: [
        { x: 40, y: 52, rx: 22, ry: 13, color: '#867e62', alpha: 0.55 },  /* 西桥头营地 */
        { x: 88, y: 20, rx: 26, ry: 10, color: '#7c7666', alpha: 0.4 },   /* 北崖栈道 */
        { x: 140, y: 55, rx: 20, ry: 12, color: '#867e62', alpha: 0.5 },  /* 东岸县城 */
        { x: 90, y: 88, rx: 30, ry: 9, color: '#7d7a62', alpha: 0.4 }     /* 南崖 */
      ],
      roads: [
        { pts: [[8, 52], [30, 52], [50, 54], [62, 56]], w: 4.4 },          /* 西岸路到桥头 */
        { pts: [[62, 56], [88, 56], [114, 56], [128, 55]], w: 4.6 },       /* 铁索桥面 */
        { pts: [[128, 55], [146, 54], [164, 52]], w: 4.2 },                /* 东岸进城 */
        { pts: [[50, 54], [58, 40], [72, 28], [92, 22], [112, 22]], w: 2.8 }, /* 北崖栈道 */
        { pts: [[64, 60], [74, 76], [92, 86]], w: 3 }                       /* 南岸下路 */
      ],
      waters: [ /* 大渡河峡谷：桥位（x62-128）通行，其余为深水 */
        { pts: [[62,39],[128,39],[128,68],[62,68]], top:39, bottom:68, sparkles:10 },
        { pts: [[0, 62], [40, 62], [62, 62], [62, 68], [0, 72]], top: 62, bottom: 72, sparkles: 4 },
        { pts: [[128, 62], [170, 60], [170, 74], [128, 68]], top: 60, bottom: 74, sparkles: 4 },
        { pts: [[62, 68], [128, 68], [128, 110], [40, 110], [20, 92], [40, 76], [62, 68]], top: 68, bottom: 110, sparkles: 8 }
      ],
      cliffs: [
        { pts: [[0, 20], [40, 12], [80, 8], [130, 8], [170, 14]], w: 4 },   /* 北崖 */
        { pts: [[0, 88], [30, 84]], w: 3 }                                   /* 西南崖 */
      ]
    },
    walkable: [[[0, 0], [170, 0], [170, 110], [0, 110]]],
    blocked: [
      K.blockedRect(62,39,66,14), K.blockedRect(62,59,66,9), /* 桥面两侧河水，不改变桥面通行带 */
      K.blockedPoly([[0, 62], [40, 62], [62, 62], [62, 68], [0, 72]]),
      K.blockedPoly([[128, 62], [170, 60], [170, 74], [128, 68]]),
      K.blockedPoly([[62, 68], [128, 68], [128, 110], [40, 110], [20, 92], [40, 76]]),  /* 峡谷深水 */
      K.blockedPoly([[0, 0], [170, 0], [170, 16], [120, 12], [70, 14], [0, 26]]),       /* 北崖体 */
      K.blockedRect(0, 92, 34, 18),
      K.blockedRect(34, 44, 8, 6), K.blockedRect(48, 46, 7, 5),                          /* 桥头营房 */
      K.blockedRect(136, 44, 10, 7), K.blockedRect(150, 46, 8, 6),                       /* 东岸屋 */
      K.blockedCircle(74, 34, 2), K.blockedCircle(96, 26, 2), K.blockedCircle(58, 60, 2.2),
      K.blockedCircle(132, 60, 2.2), K.blockedCircle(24, 60, 2.4)
    ],
    props: [
      { type: 'cliff', x: 10, y: 12, w: 20, h: 8, seed: 1 }, { type: 'cliff', x: 60, y: 6, w: 22, h: 8, seed: 2 },
      { type: 'cliff', x: 120, y: 6, w: 20, h: 8, seed: 3 }, { type: 'cliff', x: 6, y: 86, w: 18, h: 7, seed: 4 },
      /* 北崖栈道 */
      { type: 'stairs', x: 72, y: 26, w: 5, h: 4, seed: 1 }, { type: 'rock', x: 96, y: 24, w: 4.4, h: 3.2, seed: 1 },
      /* 西桥头亭与营地 */
      { type: 'gate', x: 60, y: 52, w: 7.5, h: 7.5, seed: 1 },
      { type: 'house', x: 38, y: 47, w: 9.5, h: 7, seed: 1 }, { type: 'house', x: 51, y: 49, w: 8, h: 6.4, seed: 2 },
      { type: 'crate', x: 44, y: 56, w: 3, h: 2.6, seed: 1 }, { type: 'lantern', x: 66, y: 60, w: 2, h: 4, seed: 1 },
      { type: 'sandbag', x: 56, y: 60, w: 4.6, h: 2.6, seed: 1 },
      /* 铁索桥（桥面可走，桥板段） */
      { type: 'chainBridge', variant:'rail', x:95, y:54, w:66, h:2.7, seed:707 },
      { type: 'chainBridge', variant:'rail', x:95, y:59, w:66, h:2.7, seed:708 },
      /* 东岸 */
      { type: 'gate', x: 126, y: 51, w: 7, h: 7, seed: 2 },
      { type: 'houseWood', x: 141, y: 47, w: 10.5, h: 8, seed: 3 }, { type: 'house', x: 154, y: 49, w: 8.5, h: 6.6, seed: 4 },
      { type: 'lantern', x: 136, y: 56, w: 2, h: 4, seed: 2 },
      /* 近景遮挡 */
      { type: 'pine', x: 30, y: 62, w: 7, h: 10, seed: 5 }, { type: 'tree', x: 148, y: 62, w: 7.5, h: 10, seed: 6 },
      { type: 'rock', x: 74, y: 70, w: 4, h: 3, seed: 2 }
    ],
    anchors: [
      /* 西桥头 */
      a('dialogue-07-01-narrator', 'npc', '抵达桥头、观察铁索 · 解说旁白', 26, 54),
      a('dialogue-07-01-wang_gui', 'npc', '抵达桥头、观察铁索 · 老班长王贵', 30, 52),
      a('dialogue-07-02-he_wen', 'npc', '分工与行动前交流 · 指导员何文', 42, 53),
      a('dialogue-07-02-logistics_1', 'npc', '分工与行动前交流 · 后勤协作员', 46, 55),
      a('dialogue-07-02-wang_gui', 'npc', '分工与行动前交流 · 老班长王贵', 49, 52),
      a('dialogue-07-02-medic_1', 'npc', '分工与行动前交流 · 卫生员', 52, 54),
      a('main-task', 'task', '飞夺泸定桥 · 岗位协作', 46, 58),
      a('dialogue-07-03-wang_gui', 'npc', '玩家输入行动方案 · 老班长王贵', 56, 56),
      a('dialogue-07-03-he_wen', 'npc', '玩家输入行动方案 · 指导员何文', 58, 52),
      /* 桥头任务点 */
      a('game-mortar', 'task', '观测与渡口调度', 62, 50),
      a('legacy-qte-1', 'task', '铁索攀爬', 66, 58),
      a('legacy-drag-1', 'task', '铺设桥板', 78, 52),
      a('legacy-choice-1', 'task', '突击指挥', 60, 46),
      a('game-chains', 'task', '泸定桥 · 铁索铺板协作', 90, 52),
      a('workshop-bridge', 'task', '木桥工坊 · 让队伍通过', 40, 56),
      /* 桥上反馈点 */
      a('dialogue-07-04-chen_xiaoman', 'npc', '攀索／桥头配合反馈 · 青年战士陈小满', 104, 53),
      /* 北崖栈道 */
      a('hero-ludingqiao64', 'task', '飞夺泸定桥 · 突击视角', 92, 24),
      /* 东岸 */
      a('dialogue-07-05-logistics_1', 'npc', '后续跟进与照料 · 后勤协作员', 138, 52),
      a('dialogue-07-05-medic_1', 'npc', '后续跟进与照料 · 卫生员', 142, 54),
      a('dialogue-07-05-he_wen', 'npc', '后续跟进与照料 · 指导员何文', 146, 52),
      a('dialogue-07-06-narrator', 'npc', '夺桥史实与个人行记 · 解说旁白', 152, 52),
      a('dialogue-07-06-wang_gui', 'npc', '夺桥史实与个人行记 · 老班长王贵', 156, 54),
      a('history', 'task', '本章史实与来源', 150, 58),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 17, 57),
      a('exit', 'exit', '继续下一站', 164, 54)
    ],
    ambient: { kind: 'mist', smokes: [{ x: 38, y: 44 }] }
  });
})();
