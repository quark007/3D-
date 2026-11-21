/* 第2章 血战湘江（1934年11月）——入口山路 / 队伍集结处 / 接应区域 / 河岸与渡口。
   用户参考图视角：高位斜俯视，近景树墙、中景道路营地、远景山峦河谷。 */
(() => {
  'use strict';
  const K = window.CZMarchWorld._.sceneKit, a = K.anchorHelper(2);
  K.define({
    chapterId: 2, sceneId: 'chapter-2/scene-xiangjiang', title: '血战湘江', seed: 202,
    world: { w: 170, h: 120 },
    spawn: { x: 24, y: 16, facing: 's' },
    palette: {
      ground: '#8a8060', road: '#9c8a68', roadEdge: '#665a44',
      water: '#5b7a70', waterDeep: '#3e5c54',
      rock: '#76736a', wall: '#86816f', leaf: '#5d6b4a', pine: '#47584a',
      sky0: '#a9bcc2', sky1: '#c9cfc2', mtn0: '#69766e', mtn1: '#84908a', mtn2: '#a2aca4',
      tent: '#9c8f6c', roof: '#66625a'
    },
    terrain: {
      patches: [
        { x: 50, y: 40, rx: 26, ry: 16, color: '#7d7a52', alpha: 0.5 },   /* 集结处草坝 */
        { x: 112, y: 46, rx: 22, ry: 13, color: '#837c56', alpha: 0.5 },   /* 接应区域 */
        { x: 85, y: 100, rx: 40, ry: 12, color: '#8d8258', alpha: 0.45 },  /* 南岸河滩 */
        { x: 24, y: 14, rx: 22, ry: 12, color: '#6f7256', alpha: 0.5 },    /* 入口山路坡地 */
        { x: 128, y: 30, rx: 18, ry: 11, color: '#767a58', alpha: 0.45 },  /* 瞭望丘 */
        { x: 86, y: 74, rx: 16, ry: 4, color: '#a2946c', alpha: 0.6 }      /* 渡口滩头 */
      ],
      roads: [
        { pts: [[8, 8], [24, 16], [40, 26], [52, 38]], w: 4 },                       /* 入口山路 */
        { pts: [[52, 40], [70, 46], [92, 50], [118, 48], [148, 54], [164, 58]], w: 4.6 }, /* 集结→接应→东出口 */
        { pts: [[84, 50], [84, 62], [85, 72]], w: 3.6 },                              /* 下河渡口路 */
        { pts: [[88, 96], [102, 100], [136, 104]], w: 3.2 },                          /* 南岸小路 */
        { pts: [[118, 48], [126, 38], [128, 32]], w: 2.6 }                            /* 瞭望丘岔路 */
      ],
      waters: [ /* 湘江S形河面，渡口桥位（x80-92）留缺口 */
        { pts: [[0, 72], [40, 70], [70, 74], [82, 76], [82, 92], [60, 86], [20, 84], [0, 86]], top: 70, bottom: 92, sparkles: 9 },
        { pts: [[92, 78], [120, 80], [150, 82], [170, 80], [170, 96], [130, 96], [92, 92]], top: 78, bottom: 96, sparkles: 9 }
      ],
      cliffs: [
        { pts: [[0, 4], [30, 2], [60, 2]], w: 3 },     /* 北山崖线 */
        { pts: [[150, 8], [170, 12]], w: 3 }
      ]
    },
    walkable: [[[0, 0], [170, 0], [170, 120], [0, 120]]],
    blocked: [
      K.blockedPoly([[0, 72], [40, 70], [70, 74], [82, 76], [82, 92], [60, 86], [20, 84], [0, 86]]),  /* 西段江面 */
      K.blockedPoly([[92, 78], [120, 80], [150, 82], [170, 80], [170, 96], [130, 96], [92, 92]]),     /* 东段江面 */
      K.blockedPoly([[0, 0], [46, 0], [34, 12], [10, 18], [0, 14]]),                                  /* 北山 */
      K.blockedRect(150, 0, 20, 14),                                                                  /* 东北山 */
      K.blockedRect(0, 100, 60, 20),                                                                  /* 西南滩外 */
      K.blockedRect(46, 33, 6, 5), K.blockedRect(58, 31, 6, 5),                                       /* 集结帐篷 */
      K.blockedRect(104, 40, 7, 5),                                                                   /* 接应帐篷 */
      K.blockedRect(130, 47, 8, 6),                                                                   /* 沙洲小屋 */
      K.blockedCircle(30, 24, 2.2), K.blockedCircle(66, 26, 2.2), K.blockedCircle(100, 30, 2.4),
      K.blockedCircle(146, 40, 2.2), K.blockedCircle(18, 40, 2.4), K.blockedCircle(120, 60, 2.2),
      K.blockedCircle(95, 66, 1.4),                                                                   /* 纪念石碑 */
      K.blockedRect(70, 34, 4, 3)                                                                     /* 集结石墙 */
    ],
    props: [
      /* 北山松坡（近大远小由深度缩放自动完成） */
      { type: 'pine', x: 14, y: 8, w: 5, h: 7, seed: 1 }, { type: 'pine', x: 26, y: 6, w: 5.5, h: 8, seed: 2 },
      { type: 'pine', x: 40, y: 8, w: 5, h: 7, seed: 3 }, { type: 'pine', x: 58, y: 5, w: 5.5, h: 8, seed: 4 },
      { type: 'cliff', x: 8, y: 3, w: 14, h: 5, seed: 1 }, { type: 'cliff', x: 152, y: 4, w: 16, h: 6, seed: 2 },
      /* 入口山路两侧 */
      { type: 'pine', x: 30, y: 24, w: 6, h: 9, seed: 5 }, { type: 'rock', x: 18, y: 26, w: 4, h: 3, seed: 1 },
      { type: 'stoneWall', x: 34, y: 30, w: 8, h: 2.6, seed: 1 },
      /* 集结处：帐篷、篝火、物资、石墙残段 */
      { type: 'tent', x: 49, y: 35, w: 7, h: 5, seed: 1 }, { type: 'tent', x: 61, y: 33, w: 7, h: 5, seed: 2 },
      { type: 'campfire', x: 55, y: 45, w: 3.4, h: 3, seed: 1 }, { type: 'crate', x: 63, y: 41, w: 3, h: 2.6, seed: 1 },
      { type: 'grain', x: 45, y: 43, w: 3.4, h: 3, seed: 1 }, { type: 'stoneWall', x: 72, y: 35, w: 9, h: 2.4, seed: 2 },
      { type: 'tree', x: 66, y: 26, w: 7, h: 9, seed: 6 },
      /* 接应区域：帐篷、担架、沙袋工事遗迹（非战斗表现） */
      { type: 'tent', x: 107, y: 42, w: 7.5, h: 5.4, seed: 3 }, { type: 'sandbag', x: 100, y: 52, w: 4.6, h: 2.6, seed: 1 },
      { type: 'sandbag', x: 120, y: 54, w: 4.6, h: 2.6, seed: 2 }, { type: 'crate', x: 114, y: 52, w: 3, h: 2.6, seed: 2 },
      { type: 'pine', x: 100, y: 32, w: 6.5, h: 9.5, seed: 7 }, { type: 'pine', x: 122, y: 30, w: 6, h: 9, seed: 8 },
      /* 瞭望丘 */
      { type: 'rock', x: 128, y: 26, w: 5, h: 3.6, seed: 3 }, { type: 'stele', x: 126, y: 30, w: 2.6, h: 3.2, seed: 1 },
      /* 沙洲小屋（半条被子） */
      { type: 'house', x: 134, y: 50, w: 10, h: 7, seed: 1 }, { type: 'lantern', x: 128, y: 54, w: 2, h: 4, seed: 1 },
      { type: 'tree', x: 146, y: 42, w: 7, h: 9.5, seed: 9 },
      /* 河岸与渡口：浮桥 + 渡船 + 纪念石碑 */
      { type: 'bridge', x: 82, y: 78, w: 12, h: 4, seed: 1 }, { type: 'bridge', x: 82, y: 84, w: 12, h: 4, seed: 2 },
      { type: 'bridge', x: 82, y: 90, w: 12, h: 4, seed: 3 },
      { type: 'boat', x: 96, y: 84, w: 7, h: 3.4, seed: 1 }, { type: 'stele', x: 95, y: 67, w: 3, h: 3.6, seed: 2 },
      { type: 'tree', x: 74, y: 60, w: 7.5, h: 10, seed: 10 },
      /* 南岸 */
      { type: 'tree', x: 100, y: 102, w: 7, h: 9.5, seed: 11 }, { type: 'rock', x: 120, y: 106, w: 4.4, h: 3.2, seed: 4 },
      /* 东出口门 */
      { type: 'gate', x: 163, y: 55, w: 7, h: 7, seed: 1 },
      /* 近景遮挡树（验证遮挡：玩家走到树后被部分遮住） */
      { type: 'tree', x: 60, y: 58, w: 8.5, h: 11, seed: 12 }, { type: 'pine', x: 90, y: 62, w: 7, h: 10, seed: 13 }
    ],
    anchors: [
      /* 入口山路 */
      a('dialogue-02-01-narrator', 'npc', '战役背景与当前职责 · 解说旁白', 22, 18),
      a('legacy-qte-1', 'task', '突破封锁', 38, 27),
      /* 队伍集结处 */
      a('dialogue-02-01-he_wen', 'npc', '战役背景与当前职责 · 指导员何文', 52, 41),
      a('dialogue-02-04-he_wen', 'npc', '玩家提交掩护／转移方案 · 指导员何文', 57, 45),
      a('dialogue-02-04-wang_gui', 'npc', '玩家提交掩护／转移方案 · 老班长王贵', 59.5, 42),
      a('main-task', 'task', '血战湘江 · 岗位协作', 54, 48),
      a('legacy-choice-1', 'task', '生死抉择', 62, 44),
      a('history', 'task', '本章史实与来源', 47, 47),
      /* 中路 */
      a('dialogue-02-02-liaison_1', 'npc', '有限情报抵达 · 交通联络员', 74, 46),
      /* 接应区域 */
      a('dialogue-02-03-medic_1', 'npc', '伤员与物资冲突 · 卫生员', 107, 47),
      a('dialogue-02-03-logistics_1', 'npc', '伤员与物资冲突 · 后勤协作员', 112, 49),
      a('game-aid', 'task', '湘江接应 · 物资转运', 116, 44),
      a('workshop-stretcher', 'task', '双人担架 · 一起走', 103, 50),
      /* 瞭望丘 */
      a('game-snipe', 'task', '1937番外 · 观察与疏导', 126, 33),
      /* 沙洲 */
      a('game-blanket', 'task', '半条被子 · 夜宿沙洲', 131, 55),
      /* 河岸与渡口 */
      a('dialogue-02-05-liaison_1', 'npc', '执行受阻与重新安排 · 交通联络员', 88, 63),
      a('dialogue-02-05-chen_xiaoman', 'npc', '执行受阻与重新安排 · 青年战士陈小满', 92, 64),
      a('game-guard', 'task', '湘江接应 · 分批转运', 80, 70),
      a('hero-chenshuxiang64', 'task', '陈树湘 · 断肠明志', 97, 68),
      /* 南岸 */
      a('dialogue-02-06-wang_gui', 'npc', '战后清点与沉默 · 老班长王贵', 88, 99),
      a('dialogue-02-06-narrator', 'npc', '战后清点与沉默 · 解说旁白', 93, 100),
      /* 3D 剧情地点模拟体验 */
      a('scene3d', 'task', '3D剧情地点模拟体验', 29, 16),
      /* 出口 */
      a('exit', 'exit', '继续下一站', 164, 60)
    ],
    ambient: { kind: 'mist', smokes: [{ x: 55, y: 44 }, { x: 134, y: 48 }] }
  });
})();