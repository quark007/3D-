/* 第4章 四渡赤水（1935年1月-3月）——西北山道 / 土城沙盘 / 一渡渡口 / 二渡渡口 / 东岸高地。
   赤水河为西北→东南的S形河带，两处渡口（x48-62、x128-142）留陆路缺口通行。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(4);
  K.define({
    chapterId: 4, sceneId: 'chapter-4/scene-chishui', title: '四渡赤水', seed: 404,
    world: { w: 185, h: 120 },
    spawn: { x: 16, y: 14, facing: 'e' },
    palette: {
      ground: '#96755a', road: '#a88a64', roadEdge: '#6e5540',       /* 丹霞红土 */
      water: '#5e7d6e', waterDeep: '#3f5d50',
      rock: '#8a6f5c', wall: '#8f8070', leaf: '#5f6e4c', pine: '#4a5c48',
      sky0: '#aebec0', sky1: '#d0d2c2', mtn0: '#7a7264', mtn1: '#8f8a7c', mtn2: '#a8aa9c'
    },
    terrain: {
      patches: [
        { x: 98, y: 48, rx: 24, ry: 14, color: '#8d7358', alpha: 0.55 },  /* 土城镇 */
        { x: 34, y: 22, rx: 20, ry: 12, color: '#8a6f52', alpha: 0.5 },   /* 西北山道 */
        { x: 55, y: 64, rx: 14, ry: 8, color: '#a8926a', alpha: 0.55 },   /* 一渡滩头 */
        { x: 135, y: 86, rx: 14, ry: 8, color: '#a8926a', alpha: 0.55 },  /* 二渡滩头 */
        { x: 152, y: 44, rx: 18, ry: 11, color: '#8d7358', alpha: 0.45 }, /* 东岸高地 */
        { x: 55, y: 100, rx: 24, ry: 12, color: '#8a6f52', alpha: 0.4 }   /* 西南滩 */
      ],
      roads: [
        { pts: [[8, 12], [24, 18], [40, 28], [52, 40], [58, 50], [56, 62]], w: 4.2 },  /* 山道→一渡 */
        { pts: [[58, 50], [76, 48], [96, 46], [120, 50], [140, 44], [168, 46]], w: 4 }, /* 土城→东岸 */
        { pts: [[120, 50], [130, 62], [136, 80], [136, 88]], w: 3.4 },                  /* 下二渡渡口 */
        { pts: [[40, 28], [34, 18], [30, 12]], w: 2.6 }                                  /* 山路观察点 */
      ],
      waters: [ /* 赤水河河带（西北→东南），两个渡口缺口 */
        { pts: [[0, 22], [28, 36], [48, 48], [48, 62], [28, 50], [0, 38]], top: 22, bottom: 62, sparkles: 5 },
        { pts: [[62, 54], [100, 68], [128, 82], [128, 95], [100, 82], [62, 68]], top: 54, bottom: 95, sparkles: 7 },
        { pts: [[142, 88], [170, 96], [185, 98], [185, 116], [142, 102]], top: 88, bottom: 116, sparkles: 5 }
      ],
      cliffs: [
        { pts: [[0, 6], [40, 2], [80, 4]], w: 3 },
        { pts: [[130, 4], [185, 8]], w: 3 }
      ]
    },
    walkable: [[[0, 0], [185, 0], [185, 120], [0, 120]]],
    blocked: [
      K.blockedPoly([[0, 22], [28, 36], [48, 48], [48, 62], [28, 50], [0, 38]]),
      K.blockedPoly([[62, 54], [100, 68], [128, 82], [128, 95], [100, 82], [62, 68]]),
      K.blockedPoly([[142, 88], [170, 96], [185, 98], [185, 116], [142, 102]]),
      K.blockedRect(0, 0, 185, 5),
      K.blockedRect(90, 38, 11, 7), K.blockedRect(104, 40, 9, 6), K.blockedRect(80, 42, 8, 6),   /* 土城吊脚楼群 */
      K.blockedCircle(30, 16, 2.2), K.blockedCircle(66, 28, 2.6), K.blockedCircle(120, 34, 2.4),
      K.blockedCircle(156, 52, 2.6), K.blockedCircle(40, 56, 2.2), K.blockedCircle(160, 60, 2.2)
    ],
    props: [
      { type: 'cliff', x: 8, y: 3, w: 16, h: 6, seed: 1 }, { type: 'cliff', x: 150, y: 4, w: 16, h: 6, seed: 2 },
      { type: 'pine', x: 16, y: 8, w: 5, h: 7.5, seed: 1 }, { type: 'pine', x: 52, y: 6, w: 5.5, h: 8, seed: 2 },
      { type: 'pine', x: 140, y: 8, w: 5, h: 7.5, seed: 3 },
      /* 西北山道与观察点 */
      { type: 'rock', x: 30, y: 14, w: 4.4, h: 3.2, seed: 1 }, { type: 'stairs', x: 32, y: 10, w: 5, h: 4, seed: 1 },
      { type: 'tree', x: 44, y: 26, w: 7, h: 9.5, seed: 4 },
      /* 土城镇：吊脚楼（木楼） */
      { type: 'houseWood', x: 95, y: 42, w: 11, h: 8.5, seed: 1 }, { type: 'houseWood', x: 108, y: 43, w: 9.5, h: 7.5, seed: 2 },
      { type: 'house', x: 84, y: 45, w: 9, h: 6.6, seed: 3 }, { type: 'lantern', x: 100, y: 50, w: 2, h: 4, seed: 1 },
      { type: 'stele', x: 98, y: 52, w: 2.6, h: 3.2, seed: 1 }, { type: 'table', x: 90, y: 52, w: 4.4, h: 3, seed: 1 },
      /* 一渡渡口（河带缺口 x48-62） */
      { type: 'bridge', x: 48, y: 52, w: 14, h: 4, seed: 1 }, { type: 'bridge', x: 48, y: 58, w: 14, h: 4, seed: 2 },
      { type: 'boat', x: 52, y: 66, w: 7, h: 3.4, seed: 1 },
      /* 二渡渡口（缺口 x128-142） */
      { type: 'bridge', x: 128, y: 84, w: 14, h: 4, seed: 3 }, { type: 'bridge', x: 128, y: 90, w: 14, h: 4, seed: 4 },
      { type: 'boat', x: 136, y: 96, w: 7, h: 3.4, seed: 2 },
      /* 东岸高地 */
      { type: 'tree', x: 152, y: 48, w: 7.5, h: 10, seed: 5 }, { type: 'rock', x: 162, y: 54, w: 4.4, h: 3.2, seed: 2 },
      { type: 'flagPole', x: 150, y: 40, w: 3, h: 6, seed: 1 },
      /* 西南滩 */
      { type: 'rock', x: 50, y: 96, w: 4.4, h: 3.2, seed: 3 }, { type: 'tree', x: 66, y: 102, w: 7.5, h: 10, seed: 6 },
      /* 近景遮挡 */
      { type: 'tree', x: 72, y: 58, w: 8.5, h: 11, seed: 7 }, { type: 'pine', x: 116, y: 62, w: 7, h: 10, seed: 8 },
      { type: 'gate', x: 172, y: 43, w: 7, h: 7, seed: 1 }
    ],
    anchors: [
      /* 西北山道 */
      a('dialogue-04-01-narrator', 'npc', '进入赤水沙盘 · 解说旁白', 18, 16),
      a('dialogue-04-01-he_wen', 'npc', '进入赤水沙盘 · 指导员何文', 22, 18),
      a('dialogue-04-02-liaison_1', 'npc', '山路观察点获取消息 · 交通联络员', 31, 14),
      /* 中路 */
      a('dialogue-04-03-wang_gui', 'npc', '拼接行动顺序 · 老班长王贵', 52, 42),
      a('dialogue-04-03-logistics_1', 'npc', '拼接行动顺序 · 后勤协作员', 56, 44),
      a('legacy-qte-1', 'task', '声东击西', 48, 40),
      /* 土城 */
      a('main-task', 'task', '四渡赤水 · 岗位协作', 96, 52),
      a('legacy-choice-1', 'task', '战术调度', 102, 54),
      a('ai-decision', 'task', 'DeepSeek · 行动研判与影像', 115, 50),
      a('game-cipher', 'task', '军委二局 · 密电破局', 108, 48),
      a('game-nightlamp', 'task', '苟坝夜灯 · 马灯密室', 91, 49),
      a('game-lantern', 'task', '苟坝马灯 · 夜路寻道', 86, 52),
      a('history', 'task', '本章史实与来源', 100, 56),
      /* 一渡渡口 */
      a('dialogue-04-04-boatman_1', 'npc', '河谷渡运点调度 · 船工', 56, 64),
      a('game-bluff', 'task', '迷雾渡河', 52, 68),
      /* 二渡渡口与东岸高地 */
      a('dialogue-04-05-liaison_1', 'npc', '多轮行动、对手适应 · 交通联络员', 136, 82),
      a('dialogue-04-06-he_wen', 'npc', '接应与四渡史实对照 · 指导员何文', 150, 44),
      a('dialogue-04-06-narrator', 'npc', '接应与四渡史实对照 · 解说旁白', 155, 46),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 11, 19),
      a('exit', 'exit', '继续下一站', 172, 48)
    ],
    ambient: { kind: 'mist', smokes: [{ x: 95, y: 39 }, { x: 108, y: 40 }] }
  });
})();