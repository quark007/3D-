/* 第9章 穿越草地（1935年8月，松潘草地）——西入口向导点 / 沼泽草丘 / 宿营篝火 / 野菜地 / 夜营地 / 东出口。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(9);
  K.define({
    chapterId: 9, sceneId: 'chapter-9/scene-grassland', title: '穿越草地', seed: 909,
    world: { w: 200, h: 130 },
    spawn: { x: 18, y: 24, facing: 'e' },
    palette: {
      ground: '#7d7a55', road: '#94865e', roadEdge: '#5f5840',
      water: '#6b7a68', waterDeep: '#4c5c4e',                       /* 沼泽水洼 */
      rock: '#787468', wall: '#837e6e', leaf: '#66704a', pine: '#4d5e4a',
      sky0: '#a4b4b6', sky1: '#c6cabc', mtn0: '#6e7a6c', mtn1: '#87928a', mtn2: '#a4aca2'
    },
    terrain: {
      patches: [
        { x: 100, y: 66, rx: 22, ry: 13, color: '#87804f', alpha: 0.5 },   /* 宿营地 */
        { x: 40, y: 30, rx: 20, ry: 12, color: '#7c784e', alpha: 0.45 },
        { x: 150, y: 82, rx: 20, ry: 12, color: '#827b4c', alpha: 0.5 },   /* 野菜地 */
        { x: 72, y: 96, rx: 18, ry: 10, color: '#7c784e', alpha: 0.5 },    /* 夜营地 */
        { x: 160, y: 34, rx: 18, ry: 10, color: '#827b4c', alpha: 0.45 },
        { x: 60, y: 60, rx: 16, ry: 10, color: '#8a8352', alpha: 0.4 },
        { x: 130, y: 50, rx: 16, ry: 10, color: '#8a8352', alpha: 0.4 }
      ],
      roads: [
        { pts: [[8, 22], [30, 26], [52, 36], [74, 48], [92, 58]], w: 4 },      /* 西入口到宿营 */
        { pts: [[92, 58], [116, 60], [140, 70], [152, 80]], w: 3.6 },          /* 宿营→野菜地 */
        { pts: [[92, 62], [84, 78], [74, 92]], w: 3.4 },                       /* 下夜营 */
        { pts: [[116, 58], [138, 46], [158, 38], [176, 40], [192, 46]], w: 3.6 }, /* 东出口 */
        { pts: [[52, 36], [60, 52], [62, 58]], w: 2.8 }
      ],
      waters: [ /* 沼泽水洼群（浅、可绕行） */
        { pts: [[36, 52], [52, 50], [56, 60], [40, 64], [30, 58]], top: 50, bottom: 64, sparkles: 3 },
        { pts: [[108, 76], [126, 74], [132, 84], [116, 90], [104, 84]], top: 74, bottom: 90, sparkles: 3 },
        { pts: [[150, 96], [172, 94], [180, 104], [164, 112], [148, 106]], top: 94, bottom: 112, sparkles: 3 },
        { pts: [[66, 108], [88, 106], [96, 116], [80, 124], [64, 118]], top: 106, bottom: 124, sparkles: 3 },
        { pts: [[170, 14], [190, 12], [196, 22], [182, 30], [168, 24]], top: 12, bottom: 30, sparkles: 3 }
      ],
      cliffs: [{ pts: [[0, 8], [60, 4], [130, 4], [200, 8]], w: 2.4 }]
    },
    walkable: [[[0, 0], [200, 0], [200, 130], [0, 130]]],
    blocked: [
      K.blockedPoly([[36, 52], [52, 50], [56, 60], [40, 64], [30, 58]]),
      K.blockedPoly([[108, 76], [126, 74], [132, 84], [116, 90], [104, 84]]),
      K.blockedPoly([[150, 96], [172, 94], [180, 104], [164, 112], [148, 106]]),
      K.blockedPoly([[66, 108], [88, 106], [96, 116], [80, 124], [64, 118]]),
      K.blockedPoly([[170, 14], [190, 12], [196, 22], [182, 30], [168, 24]]),
      K.blockedRect(0, 0, 200, 6),
      K.blockedRect(94, 58, 7, 5),    /* 宿营帐篷 */
      K.blockedRect(104, 60, 6, 5),
      K.blockedRect(68, 90, 7, 5),    /* 夜营帐篷 */
      K.blockedCircle(46, 40, 2), K.blockedCircle(84, 44, 2.2), K.blockedCircle(124, 54, 2),
      K.blockedCircle(144, 66, 2.2), K.blockedCircle(58, 74, 2), K.blockedCircle(96, 100, 2.2),
      K.blockedCircle(166, 62, 2), K.blockedCircle(28, 44, 2)
    ],
    props: [
      { type: 'deadTree', x: 30, y: 34, w: 4, h: 6, seed: 1 }, { type: 'deadTree', x: 120, y: 30, w: 4, h: 6, seed: 2 },
      { type: 'pine', x: 14, y: 10, w: 5, h: 7, seed: 1 }, { type: 'pine', x: 90, y: 8, w: 5, h: 7, seed: 2 },
      /* 西入口向导点 */
      { type: 'stele', x: 22, y: 24, w: 2.6, h: 3.2, seed: 1 }, { type: 'flagPole', x: 28, y: 22, w: 3, h: 6, seed: 1 },
      /* 草丘与草垛 */
      { type: 'grain', x: 46, y: 42, w: 3.4, h: 3, seed: 1 }, { type: 'grain', x: 84, y: 46, w: 3.4, h: 3, seed: 2 },
      { type: 'rock', x: 124, y: 52, w: 4, h: 3, seed: 1 }, { type: 'rock', x: 58, y: 72, w: 4, h: 3, seed: 2 },
      /* 宿营地（篝火核心） */
      { type: 'tent', x: 97, y: 60, w: 7, h: 5, seed: 1 }, { type: 'tent', x: 107, y: 62, w: 6.4, h: 4.6, seed: 2 },
      { type: 'campfire', x: 100, y: 68, w: 3.4, h: 3, seed: 1 }, { type: 'crate', x: 92, y: 66, w: 3, h: 2.6, seed: 1 },
      { type: 'stele', x: 104, y: 70, w: 2.6, h: 3.2, seed: 2 },
      /* 野菜地 */
      { type: 'table', x: 152, y: 84, w: 4.4, h: 3, seed: 1 }, { type: 'grain', x: 146, y: 88, w: 3.4, h: 3, seed: 3 },
      { type: 'tree', x: 160, y: 78, w: 7.5, h: 10, seed: 3 },
      /* 夜营地 */
      { type: 'tent', x: 71, y: 92, w: 7, h: 5, seed: 3 }, { type: 'campfire', x: 78, y: 98, w: 3.2, h: 3, seed: 2 },
      { type: 'flagPole', x: 66, y: 96, w: 3, h: 6, seed: 2 },
      /* 东侧 */
      { type: 'tree', x: 170, y: 50, w: 8, h: 10.5, seed: 4 }, { type: 'rock', x: 182, y: 56, w: 4.4, h: 3.2, seed: 3 },
      { type: 'gate', x: 192, y: 44, w: 7, h: 7, seed: 1 },
      /* 近景遮挡 */
      { type: 'tree', x: 76, y: 66, w: 8.5, h: 11, seed: 5 }, { type: 'tree', x: 136, y: 62, w: 8, h: 10.5, seed: 6 },
      { type: 'deadTree', x: 56, y: 104, w: 4.4, h: 6.4, seed: 3 }
    ],
    anchors: [
      /* 西入口 */
      a('dialogue-09-01-narrator', 'npc', '进入草地 · 解说旁白', 20, 27),
      a('dialogue-09-01-guide_1', 'npc', '进入草地 · 向导', 24, 29),
      a('dialogue-09-01-liaison_1', 'npc', '进入草地 · 交通联络员', 27, 26),
      /* 中路草丘 */
      a('dialogue-09-02-logistics_1', 'npc', '盘点口粮和饮水 · 后勤协作员', 52, 40),
      a('dialogue-09-02-wang_gui', 'npc', '盘点口粮和饮水 · 老班长王贵', 56, 42),
      a('legacy-drag-1', 'task', '探路行军', 62, 48),
      a('dialogue-09-03-chen_xiaoman', 'npc', '陷入泥泞与援助 · 青年战士陈小满', 70, 52),
      a('dialogue-09-03-wang_gui', 'npc', '陷入泥泞与援助 · 老班长王贵', 74, 54),
      a('legacy-choice-1', 'task', '生存抉择', 78, 50),
      /* 宿营地 */
      a('main-task', 'task', '穿越草地 · 岗位协作', 100, 72),
      a('game-fire', 'task', '夜营守火种', 96, 74),
      a('game-ration', 'task', '草地同行 · 分粮交接', 106, 68),
      a('dialogue-09-05-chen_xiaoman', 'npc', '宿营与分享 · 青年战士陈小满', 108, 72),
      a('dialogue-09-05-medic_1', 'npc', '宿营与分享 · 卫生员', 94, 70),
      a('extra-grassland30', 'task', '草地行程协作', 112, 66),
      a('chapter-task54', 'task', '草地同行 · 核对路线', 90, 64),
      /* 向导寻路点 */
      a('dialogue-09-04-guide_1', 'npc', '自定义寻路与行军方案 · 向导', 128, 56),
      a('dialogue-09-04-he_wen', 'npc', '自定义寻路与行军方案 · 指导员何文', 132, 58),
      /* 野菜地与采集 */
      a('game-collect', 'task', '青稞采集', 148, 86),
      a('game-veg', 'task', '草地食堂 · 野菜辨识', 156, 84),
      /* 夜营地 */
      a('game-fish', 'task', '金色的鱼钩 · 老班长', 74, 100),
      a('game-matches', 'task', '七根火柴 · 守护火种', 82, 102),
      a('extra-night', 'task', '夜行军纵队 · 番外', 68, 98),
      /* 草地英模阅读点（散布草丘） */
      a('hero-fish63', 'task', '金色的鱼钩', 88, 108),
      a('hero-matches63', 'task', '七根火柴', 60, 108),
      a('hero-night63', 'task', '草地夜行', 118, 96),
      a('hero-belt63', 'task', '半截皮带', 136, 100),
      a('hero-yidaihanliang64', 'task', '一袋干粮', 40, 66),
      /* 东出口 */
      a('dialogue-09-06-wang_gui', 'npc', '走出草地后的行记 · 老班长王贵', 172, 46),
      a('dialogue-09-06-narrator', 'npc', '走出草地后的行记 · 解说旁白', 176, 48),
      a('history', 'task', '本章史实与来源', 168, 42),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 13, 29),
      a('exit', 'exit', '继续下一站', 192, 48)
    ],
    ambient: { kind: 'mist', smokes: [{ x: 100, y: 66 }, { x: 78, y: 96 }] }
  });
})();