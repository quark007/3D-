/* march-world 场景共享构造器：锚点简写、基础色板、场景注册。
   约定：世界坐标 x 向东、y 向南（北=远景=y小）。anchorId 与 B 方 anchor-requests.json 完全一致。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};
  M.scenes = M.scenes || {};

  const basePalette = {
    ground: '#8f8459', road: '#a5906a', roadEdge: '#6e5f45',
    water: '#5d7a72', waterDeep: '#40605a',
    rock: '#7d7a6e', wall: '#8a8577', wood: '#7a5c40', roof: '#6e6a5e',
    tent: '#a3946f', leaf: '#5f6f46', pine: '#4a5d48', sand: '#9c8a62',
    sky0: '#aebfc4', sky1: '#cfd4c8', mtn0: '#6d7a72', mtn1: '#87928a', mtn2: '#a5aea6',
    flag: '#a03a2c', speckle: '#5d5a42', sun: false
  };

  function define(scene) {
    scene.palette = Object.assign({}, basePalette, scene.palette || {});
    const artThemes={1:'苏区村落与整装',2:'湘江河岸与接应',3:'遵义街巷与会址',4:'赤水山路与渡口',5:'金沙石滩与渡船',6:'安顺场村与调度',7:'铁索桥与桥头',8:'雪山垭口与互助',9:'草丘湿地与夜营',10:'峡谷隘道与通路',11:'陕北窑洞与落脚',12:'会师门楼与广场'};
    scene.artTheme=artThemes[scene.chapterId];
    // Light parchment roads improve contrast with olive foliage and the red player locator.
    const mix=(hex,k)=>{const n=parseInt(hex.slice(1),16);return '#'+[n>>16,(n>>8)&255,n&255].map(v=>Math.round(v+(255-v)*k).toString(16).padStart(2,'0')).join('');};
    scene.palette.ground=mix(scene.palette.ground,scene.chapterId===8?.19:.10);scene.palette.road=mix(scene.palette.road,.14);
    scene.playerStyle = scene.playerStyle || { coat: '#66706b', hat: '#566057', pack: '#77694d' };
    scene.passages = scene.passages || [];
    if (M.scenes[scene.sceneId]) throw Error('重复场景：' + scene.sceneId);
    M.scenes[scene.sceneId] = scene;
  }

  /* 锚点简写：a('dialogue-02-01-narrator','npc','战役背景 · 解说旁白',x,y) */
  function anchorHelper(chapterId) {
    const prefix = `chapter-${chapterId}/anchor-`;
    return (slug, kind, label, x, y) => ({ anchorId: prefix + slug, kind, label, x, y });
  }

  /* 几何简写 */
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const blockedCircle = (x, y, r) => ({ circle: [x, y, r] });
  const blockedRect = (x, y, w, h) => ({ rect: [x, y, w, h] });
  const blockedPoly = pts => ({ poly: pts });

  M.sceneKit = { define, anchorHelper, rect, blockedCircle, blockedRect, blockedPoly };
})();