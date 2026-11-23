/*!
 * 长征·星火 —— 过草地 · 青稞采集（子游戏模块）
 * =========================================================================
 * 用途
 *   将独立小游戏《过草地·青稞采集》封装为可导入《长征·星火》主游戏的单文件
 *   JS 模块（无任何依赖）。玩家在 1935 年松潘草地的像素地图上操控一名红军
 *   战士，绕开泥潭水潭、采集 8 份青稞；集齐后本关结束并回调结果。自带
 *   键盘 + 触屏双端操控、WebAudio 合成音效、小地图与动态视口缩放。
 *
 * 作者接入方式（主游戏侧三步）
 *   1) 把本文件复制到 changzheng/js/ 目录；
 *   2) index.html 中加入 <script src="js/grassland-collect.module.js"></script>
 *      （放在 Chap / GameState 等主游戏脚本都能加载到的位置；本模块加载时
 *      不执行任何游戏逻辑，惰性启动）；
 *   3) 在需要触发的节点调用：
 *        GrasslandCollect.open(9, function (r) {
 *          // r = { collected: 已采数量, elapsedSec: 本局秒数, total: 青稞总数 }
 *        });   // 节点 9 = 穿越草地
 *      提前关闭用 GrasslandCollect.close()（同样会补发一次 onDone 并记分）。
 *
 * 与主游戏 GameState 的自动对接
 *   本局结束时（集满 TARGET=8 个青稞，或点遮罩右上角「✕ 退出」）：
 *     1) 回调 onDone({ collected, elapsedSec, total })（onDone 非函数则跳过）；
 *     2) 若全局存在 GameState.recordBattleScore 且 open() 传入了 nodeId，
 *        自动调用（写法对齐主游戏 ChapterTasks54 的
 *        GameState.recordBattleScore(node.id, 90, '协作完成')）：
 *          GameState.recordBattleScore(nodeId,
 *            Math.max(60, Math.min(95, 55 + collected * 5)), '青稞采集')
 *        即集满 8 个 = 95 分；提前退出按进度给分，下限 60。
 *
 * 对外 API
 *   window.GrasslandCollect = { open(nodeId, onDone), close(), version }
 *   - open()：创建全屏遮罩（position:fixed，z-index 9999，暗色背景居中一个
 *     960px 容器），注入原 <style> 与游戏 DOM 后依次挂载三个子模块；
 *     重复调用 open 会先自动 close 上一局（防重入）。
 *   - close()：置主循环 running=false 并取消 rAF、关闭 AudioContext、
 *     解绑 window/document 级监听、移除遮罩 DOM、删除本模块的全局名。
 *
 * 全局命名说明
 *   游戏本体代码全部在闭包内；open 期间会存在三个带前缀的接口全局名
 *   （均由原游戏代码定义，close 时删除，与主游戏 GAME_NODES / GameState /
 *   GameUI 等不冲突）：window.CAOGAO_MAP、window.RED_ARMY_SPRITE、
 *   window.CAOGAO_CROSSING（后者含 forceHarvest/teleport 等自动化测试接口）。
 *
 * 来源与改造点
 *   由 caogao-crossing.html（过草地·青稞采集 单文件版）打包生成。地形生成、
 *   精灵帧数据（FRAME_DATA）、游戏主控逻辑与源文件逐字节一致；仅按模块化
 *   要求做了如下改造：IIFE 改为 mount(rootEl, opts) 延迟挂载、window/document
 *   级监听改为可解绑的跟踪式绑定（onWin/onDoc）、主循环增加 running 标志、
 *   新增完成回调 __finish 与 stop/finish 接口、遮罩与「✕ 退出」按钮。
 * 版本 1.0.0    生成日期 2026-10-24
 * ========================================================================= */
(function () {
'use strict';

var VERSION = '1.0.0';

/* ---------- 注入用 DOM 片段：原 caogao-crossing.html 的 <style> 与 <div class="cc-stage">（逐字节一致；不含 meta 与外层说明 div） ---------- */
var STYLE_HTML = "<style>\n#caogao-crossing{display:block;font-family:\"Microsoft YaHei\",\"PingFang SC\",\"Noto Sans SC\",sans-serif;color:#e8e4d0;-webkit-text-size-adjust:100%;}\n#caogao-crossing *{box-sizing:border-box;}\n#caogao-crossing .cc-stage{position:relative;max-width:960px;margin:0 auto;background:#141a10;border:3px solid #3b3626;box-shadow:0 4px 18px rgba(0,0,0,.5);overflow:hidden;user-select:none;-webkit-user-select:none;}\n#caogao-crossing canvas#cc-canvas{width:100%;height:auto;display:block;image-rendering:crisp-edges;image-rendering:pixelated;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;}\n#caogao-crossing .cc-title{position:absolute;top:8px;left:50%;transform:translateX(-50%);font-size:13px;line-height:1.5;letter-spacing:2px;padding:3px 12px;background:rgba(14,18,10,.72);border:1px solid rgba(222,216,182,.4);color:#f0e9d6;text-shadow:1px 1px 0 rgba(0,0,0,.8);pointer-events:none;white-space:nowrap;}\n#caogao-crossing .cc-hud{position:absolute;top:8px;left:8px;font-size:12px;line-height:1.6;padding:4px 10px;background:rgba(14,18,10,.72);border:1px solid rgba(222,216,182,.4);pointer-events:none;text-shadow:1px 1px 0 rgba(0,0,0,.8);}\n#caogao-crossing #cc-quest{color:#ffd977;font-weight:bold;letter-spacing:1px;}\n#caogao-crossing #cc-terrain{color:rgba(232,228,200,.9);font-size:11px;letter-spacing:1px;}\n#caogao-crossing #cc-sound{position:absolute;top:8px;right:8px;font:inherit;font-size:11px;letter-spacing:1px;color:#e8e4d0;background:rgba(14,18,10,.72);border:1px solid rgba(222,216,182,.4);padding:4px 9px;cursor:pointer;touch-action:manipulation;}\n#caogao-crossing #cc-zoom{position:absolute;top:44px;right:140px;display:flex;flex-direction:column;gap:6px;z-index:2;}\n#caogao-crossing #cc-zoom button{font:inherit;font-size:14px;line-height:1;width:34px;height:34px;color:#e8e4d0;background:rgba(14,18,10,.72);border:1px solid rgba(222,216,182,.4);cursor:pointer;touch-action:manipulation;padding:0;border-radius:3px;}\n#caogao-crossing #cc-zoom button:active{background:rgba(60,72,40,.85);}\n#caogao-crossing .cc-minimap{position:absolute;right:8px;top:40px;width:120px;height:120px;border:2px solid rgba(222,216,182,.5);background:#10140c;image-rendering:pixelated;pointer-events:none;box-shadow:0 2px 8px rgba(0,0,0,.6);}\n#caogao-crossing #cc-keys{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);font-size:11px;letter-spacing:1px;padding:3px 10px;background:rgba(14,18,10,.62);border:1px solid rgba(222,216,182,.25);color:rgba(232,228,200,.85);pointer-events:none;white-space:nowrap;}\n#caogao-crossing #cc-banner{position:absolute;top:32%;left:50%;transform:translate(-50%,-50%) scale(.92);font-size:16px;line-height:1.6;letter-spacing:2px;color:#ffe9a8;background:rgba(20,16,8,.9);border:1px solid #d9b44a;padding:12px 22px;text-shadow:1px 1px 0 rgba(0,0,0,.9);opacity:0;pointer-events:none;transition:opacity .5s,transform .5s;text-align:center;max-width:86%;box-shadow:0 0 24px rgba(217,180,74,.35);}\n#caogao-crossing #cc-banner.show{opacity:1;transform:translate(-50%,-50%) scale(1);}\n#caogao-crossing #cc-btn-harvest{display:none;position:absolute;right:14px;bottom:16px;width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,233,168,.85);background:rgba(30,26,14,.72);color:#ffe9a8;font:inherit;font-size:15px;letter-spacing:2px;align-items:center;justify-content:center;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;box-shadow:0 3px 10px rgba(0,0,0,.5);}\n#caogao-crossing #cc-btn-harvest.near{animation:ccPulse .9s ease-in-out infinite;background:rgba(96,74,20,.85);}\n@keyframes ccPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(255,220,130,.55);}50%{transform:scale(1.08);box-shadow:0 0 0 10px rgba(255,220,130,0);}}\n#caogao-crossing #cc-touch-hint{display:none;position:absolute;bottom:22px;left:12px;font-size:11px;letter-spacing:1px;line-height:1.6;color:rgba(240,233,214,.9);background:rgba(14,18,10,.6);border:1px solid rgba(222,216,182,.25);padding:3px 8px;pointer-events:none;opacity:0;transition:opacity .8s;}\n#caogao-crossing .cc-note{max-width:966px;margin:8px auto 0;text-align:center;font-size:11px;letter-spacing:2px;color:#8a8570;}\n#caogao-crossing.touch #cc-keys{display:none;}\n#caogao-crossing.touch #cc-btn-harvest{display:flex;}\n#caogao-crossing.touch #cc-touch-hint{display:block;}\n#caogao-crossing.touch .cc-minimap{width:84px;height:84px;top:38px;right:6px;}\n#caogao-crossing.touch .cc-title{font-size:11px;top:6px;}\n#caogao-crossing.touch .cc-hud{font-size:11px;top:6px;left:6px;padding:3px 8px;}\n#caogao-crossing.touch #cc-terrain{font-size:10px;}\n#caogao-crossing.touch #cc-sound{font-size:10px;top:6px;right:6px;padding:3px 7px;}\n#caogao-crossing.touch #cc-zoom{right:100px;top:44px;}\n</style>";
var STAGE_HTML = "<div class=\"cc-stage\">\n<canvas id=\"cc-canvas\" width=\"480\" height=\"300\"></canvas>\n<div class=\"cc-title\">过草地 · 青稞采集</div>\n<div class=\"cc-hud\"><div id=\"cc-quest\">青稞 0/8</div><div id=\"cc-terrain\">地形 · 草甸</div></div>\n<button id=\"cc-sound\" type=\"button\" tabindex=\"-1\">声音:开</button>\n<div id=\"cc-zoom\"><button id=\"cc-zin\" type=\"button\" tabindex=\"-1\">＋</button><button id=\"cc-zout\" type=\"button\" tabindex=\"-1\">－</button></div>\n<canvas id=\"cc-minimap\" class=\"cc-minimap\" width=\"128\" height=\"128\"></canvas>\n<div id=\"cc-keys\">WASD/方向键 移动 · Shift 行军 · E/空格 采摘 · Q 敬礼 · R 休息 · Z/滚轮 缩放</div>\n<div id=\"cc-banner\">青稞集齐——晚上能有一碗青稞面了</div>\n<button id=\"cc-btn-harvest\" type=\"button\" tabindex=\"-1\"><span>采摘</span></button>\n<div id=\"cc-touch-hint\">左半屏拖动移动<br>右侧点按青稞或按钮采摘</div>\n</div>";

/* ---------- 遮罩样式（模块新增，gcm- 前缀避免与主游戏冲突） ---------- */
var OVERLAY_CSS = '#gcm-overlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9999;background:rgba(4,5,8,0.94);background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.015) 0 2px,transparent 2px 6px);display:flex;align-items:center;justify-content:center;padding:14px;}'
  + '#gcm-overlay .gcm-shell{width:960px;max-width:96vw;max-height:94vh;overflow:auto;border:1px solid #4a4d52;}'
  + '#gcm-overlay .gcm-op{position:absolute;top:12px;left:16px;z-index:1;font:11px/1 "Microsoft YaHei","PingFang SC",sans-serif;letter-spacing:0.18em;color:#8b8e93;background:rgba(16,17,20,0.88);border:1px solid #4a4d52;border-left:3px solid #ffcf24;padding:8px 12px;}'
  + '#gcm-overlay .gcm-exit{position:absolute;top:12px;right:16px;z-index:1;font:bold 13px/1 "Microsoft YaHei","PingFang SC",sans-serif;letter-spacing:2px;color:#ffcf24;background:#101114;border:1px solid #ffcf24;padding:9px 14px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:border-color .12s,transform .12s;}'
  + '#gcm-overlay .gcm-exit:hover{transform:translateY(-1px);border-color:#ffe27a;}';

/* ---------- 事件绑定跟踪（模块化改造新增：close() 时统一解绑 window/document 级监听） ---------- */
var __listeners = [];
function onWin(type, fn, opts) { window.addEventListener(type, fn, opts); __listeners.push([window, type, fn, opts]); }
function onDoc(type, fn, opts) { document.addEventListener(type, fn, opts); __listeners.push([document, type, fn, opts]); }
function removeListeners(list) {
  for (var i = 0; i < list.length; i++) {
    var L = list[i];
    try { L[0].removeEventListener(L[1], L[2], L[3]); } catch (e) {}
  }
  list.length = 0;
}
function deleteGlobal(name) {
  try { delete window[name]; } catch (e) { try { window[name] = undefined; } catch (e2) {} }
}
/* ================= 模块一：松潘草地像素地图（mount 化：函数体与源文件逐字节一致，仅 IIFE 启动方式改为延迟挂载） ================= */
function mountPixelMap(rootEl) {
  /* rootEl 为遮罩内挂载容器；画布 #cc-canvas/#cc-minimap 查询保持全局 id（主游戏页面无同名 id） */
  'use strict';
  var canvas = document.getElementById('cc-canvas');
  var mmCanvas = document.getElementById('cc-minimap');
  var ctx = canvas.getContext('2d');
  var mmCtx = mmCanvas.getContext('2d');

  /* ================= 常量 ================= */
  var TILE = 32, COLS = 112, ROWS = 112;
  var VIEW_W = 480, VIEW_H = 300;
  var WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;
  var CHUNK = 16, CPX = CHUNK * TILE;           /* 每个离屏块 16x16 图块 = 512px */
  var CW = Math.ceil(COLS / CHUNK), CH = Math.ceil(ROWS / CHUNK);
  var T_GRASS = 0, T_WET = 1, T_MUD = 2, T_WATER = 3;
  var SEED = 19350801;

  /* ================= 带固定种子的随机 / 值噪声 ================= */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash2(x, y, s) {
    var h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1440662683) + SEED) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  /* ================= 地形数据（同步生成二维类型表） ================= */
  var terrain = new Uint8Array(COLS * ROWS);        /* 0草 1湿草 2泥潭 3水潭 */
  var waterShade = new Uint8Array(COLS * ROWS);     /* 水图块被水包围数 0..8 => 深浅 */
  var mudNoise = new Float32Array(COLS * ROWS);     /* 泥面花斑噪声 */
  var blobCenters = [];                             /* 泥潭中心（世界px，中央大泡用） */
  var gVar = new Float32Array((COLS + 1) * (ROWS + 1));  /* 草地变体角点网格（双线性平滑过渡） */
  var gDry = new Float32Array((COLS + 1) * (ROWS + 1));  /* 枯黄干燥度角点网格 */
  var fieldF = new Float32Array((COLS + 1) * (ROWS + 1)); /* 泥/水存在场角点网格（子块级圆滑边界+内切） */
  var fieldW = new Float32Array((COLS + 1) * (ROWS + 1)); /* 湿草存在场角点网格（湿草圈外缘圆滑） */
  var contact = new Uint8Array(COLS * ROWS);              /* bit1: 邻水 bit2: 邻泥（泥水交界湿缝用） */

  (function generate() {
    var rng = mulberry32(SEED);
    var waterM = new Uint8Array(COLS * ROWS);
    var mudM = new Uint8Array(COLS * ROWS);

    function clampC(v, r, max) {
      var lo = r * 2.2 + 1, hi = max - r * 2.2 - 1;
      return Math.max(lo, Math.min(hi, v));
    }
    /* 角度多谐波 + 低频角度噪声扰动的椭圆 blob：轮廓臃肿不规则，不再像圆角矩形 */
    function stampBlob(mask, cx, cy, rx, ry, ph) {
      var ex = rx * 2.2 + 1, ey = ry * 2.2 + 1;
      var x0 = Math.max(1, Math.floor(cx - ex)), x1 = Math.min(COLS - 2, Math.ceil(cx + ex));
      var y0 = Math.max(1, Math.floor(cy - ey)), y1 = Math.min(ROWS - 2, Math.ceil(cy + ey));
      var kA = Math.max(0.55, Math.min(1.05, ((rx + ry) * 0.5) / 6));   /* 半径越大扰动越强 */
      var vseed = (ph * 977) | 0;
      for (var ty = y0; ty <= y1; ty++) {
        for (var tx = x0; tx <= x1; tx++) {
          var dx = (tx + 0.5 - cx) / rx, dy = (ty + 0.5 - cy) / ry;
          var d = Math.sqrt(dx * dx + dy * dy);
          if (d > 2.2) continue;
          var a = Math.atan2(dy, dx);
          var wob = 0.20 * Math.sin(2 * a + ph) + 0.26 * Math.sin(3 * a + ph * 1.9)
                  + 0.15 * Math.sin(5 * a + ph * 2.7) + 0.08 * Math.sin(8 * a + ph * 4.1)
                  + (vnoise(Math.cos(a) * 1.7 + 7.3, Math.sin(a) * 1.7 + 3.1, vseed) - 0.5) * 1.05;
          var w = 1 + kA * wob;
          if (w < 0.38) w = 0.38; else if (w > 2.05) w = 2.05;
          if (d < w) mask[ty * COLS + tx] = 1;
        }
      }
    }
    /* 两次细胞自动机平滑：去毛刺、补缺口，边缘更圆润 */
    function smooth(mask) {
      for (var pass = 0; pass < 2; pass++) {
        var out = new Uint8Array(mask);
        for (var ty = 1; ty < ROWS - 1; ty++) {
          for (var tx = 1; tx < COLS - 1; tx++) {
            var i = ty * COLS + tx, c = 0, oy, ox;
            for (oy = -1; oy <= 1; oy++) {
              for (ox = -1; ox <= 1; ox++) {
                if (ox !== 0 || oy !== 0) c += mask[i + oy * COLS + ox];
              }
            }
            if (mask[i]) { if (c <= 2) out[i] = 0; } else if (c >= 6) out[i] = 1;
          }
        }
        mask.set(out);
      }
    }

    /* 4 条大致沿 y 方向伸展的沼泽带（横向排布 => 从左向右依次跋涉的路线感） */
    var bands = [];
    var nb = 4, b, j, cy, cx, r;
    for (b = 0; b < nb; b++) {
      bands.push({
        cx: (b + 0.5) / nb * COLS + (rng() - 0.5) * 12,
        phase: rng() * 6.2832,
        amp: 4 + rng() * 6,
        halfw: 6 + rng() * 5
      });
    }
    for (b = 0; b < bands.length; b++) {
      var bd = bands[b];
      var nMud = 8 + ((rng() * 4) | 0);
      for (j = 0; j < nMud; j++) {
        cy = 5 + rng() * (ROWS - 10);
        cx = bd.cx + Math.sin(cy * 0.045 + bd.phase) * bd.amp + (rng() - 0.5) * bd.halfw * 1.5;
        r = 2 + rng() * 4;                              /* 泥潭名义直径 4~12 块 */
        stampBlob(mudM, clampC(cx, r, COLS), clampC(cy, r, ROWS),
          r * (0.75 + rng() * 0.6), r * (0.75 + rng() * 0.6), rng() * 6.2832);
        blobCenters.push({ tx: cx, ty: cy });
      }
      var nW = 2 + ((rng() * 2) | 0);
      for (j = 0; j < nW; j++) {
        cy = 6 + rng() * (ROWS - 12);
        cx = bd.cx + Math.sin(cy * 0.045 + bd.phase) * bd.amp * 0.7 + (rng() - 0.5) * bd.halfw * 0.8;
        r = 3.4 + rng() * 4;                            /* 水潭更少更大 */
        stampBlob(waterM, clampC(cx, r, COLS), clampC(cy, r, ROWS),
          r * (0.8 + rng() * 0.5), r * (0.8 + rng() * 0.5), rng() * 6.2832);
      }
    }
    /* 带外零散小片，避免机械感 */
    for (j = 0; j < 7; j++) {
      cy = 6 + rng() * (ROWS - 12); cx = 6 + rng() * (COLS - 12); r = 2 + rng() * 3.5;
      stampBlob(mudM, clampC(cx, r, COLS), clampC(cy, r, ROWS),
        r * (0.8 + rng() * 0.5), r * (0.8 + rng() * 0.5), rng() * 6.2832);
    }
    for (j = 0; j < 3; j++) {
      cy = 8 + rng() * (ROWS - 16); cx = 8 + rng() * (COLS - 16); r = 3 + rng() * 3;
      stampBlob(waterM, clampC(cx, r, COLS), clampC(cy, r, ROWS), r, r * (0.8 + rng() * 0.4), rng() * 6.2832);
    }

    smooth(waterM);
    smooth(mudM);

    var i, tx, ty, oy2, ox2;
    for (i = 0; i < terrain.length; i++) {
      if (waterM[i]) terrain[i] = T_WATER;
      else if (mudM[i]) terrain[i] = T_MUD;
    }
    /* 只保留真正落在泥面上的中心点（供中央大泡） */
    for (i = blobCenters.length - 1; i >= 0; i--) {
      var btx = Math.max(0, Math.min(COLS - 1, Math.round(blobCenters[i].tx)));
      var bty = Math.max(0, Math.min(ROWS - 1, Math.round(blobCenters[i].ty)));
      if (terrain[bty * COLS + btx] === T_MUD) blobCenters[i] = { x: btx * TILE + 16, y: bty * TILE + 16 };
      else blobCenters.splice(i, 1);
    }

    /* 湿草过渡带：紧邻一圈必湿，第二圈按噪声散布 */
    var wet1 = new Uint8Array(COLS * ROWS);
    for (ty = 1; ty < ROWS - 1; ty++) {
      for (tx = 1; tx < COLS - 1; tx++) {
        i = ty * COLS + tx;
        if (terrain[i] !== T_GRASS) continue;
        var near = false;
        for (oy2 = -1; oy2 <= 1 && !near; oy2++) {
          for (ox2 = -1; ox2 <= 1; ox2++) {
            if (!ox2 && !oy2) continue;
            var nt = terrain[i + oy2 * COLS + ox2];
            if (nt === T_MUD || nt === T_WATER) { near = true; break; }
          }
        }
        if (near) { wet1[i] = 1; terrain[i] = T_WET; }
      }
    }
    for (ty = 1; ty < ROWS - 1; ty++) {
      for (tx = 1; tx < COLS - 1; tx++) {
        i = ty * COLS + tx;
        if (terrain[i] !== T_GRASS) continue;
        var nearW = false;
        for (oy2 = -1; oy2 <= 1 && !nearW; oy2++) {
          for (ox2 = -1; ox2 <= 1; ox2++) {
            if (!ox2 && !oy2) continue;
            if (wet1[i + oy2 * COLS + ox2]) { nearW = true; break; }
          }
        }
        if (nearW && hash2(tx, ty, 911) < 0.62) terrain[i] = T_WET;
      }
    }

    /* 左->右两条蜿蜒可通行走廊：把走廊上的水填成泥（泥可通行、慢，水不可通行） */
    var p1 = rng() * 6.2832, p2 = rng() * 6.2832;
    function carveWater(tx, py) {
      for (var oy3 = -3; oy3 <= 3; oy3++) {
        var tyc = Math.round(py) + oy3;
        if (tyc < 0 || tyc >= ROWS) continue;
        if (Math.abs(tyc + 0.5 - py) <= 2.7) {
          var ii = tyc * COLS + tx;
          if (terrain[ii] === T_WATER) terrain[ii] = T_MUD;
        }
      }
    }
    for (tx = 0; tx < COLS; tx++) {
      carveWater(tx, ROWS * 0.24 + Math.sin(tx * 0.05 + p1) * 11);
      carveWater(tx, ROWS * 0.76 + Math.sin(tx * 0.045 + p2) * 13);
    }

    /* 水深（被水邻居数）、泥水接触标志、泥面噪声、草地角点网格 */
    for (ty = 0; ty < ROWS; ty++) {
      for (tx = 0; tx < COLS; tx++) {
        i = ty * COLS + tx;
        if (terrain[i] === T_WATER) {
          var c8 = 0;
          for (oy2 = -1; oy2 <= 1; oy2++) {
            for (ox2 = -1; ox2 <= 1; ox2++) {
              if (!ox2 && !oy2) continue;
              var nx = tx + ox2, ny = ty + oy2;
              if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
              if (terrain[ny * COLS + nx] === T_WATER) c8++;
            }
          }
          waterShade[i] = c8;
        }
        var ct = 0, oy4, ox4;
        for (oy4 = -1; oy4 <= 1; oy4++) {
          for (ox4 = -1; ox4 <= 1; ox4++) {
            if (!oy4 && !ox4) continue;
            var qx = tx + ox4, qy = ty + oy4;
            if (qx < 0 || qy < 0 || qx >= COLS || qy >= ROWS) continue;
            var qt = terrain[qy * COLS + qx];
            if (qt === T_WATER) ct |= 1;
            else if (qt === T_MUD) ct |= 2;
          }
        }
        contact[i] = ct;
        mudNoise[i] = vnoise(tx * 0.16, ty * 0.16, 73);
      }
    }
    for (ty = 0; ty <= ROWS; ty++) {
      for (tx = 0; tx <= COLS; tx++) {
        gVar[ty * (COLS + 1) + tx] = vnoise(tx * 0.13, ty * 0.13, 31);
        gDry[ty * (COLS + 1) + tx] = vnoise(tx * 0.075, ty * 0.075, 57);
      }
    }
    /* 泥/水存在场：角点 = 周围 4 图块平均（草 0 / 湿草 0.5 / 泥水 1），
       像素级双线性插值取阈值 => 边界图块自动圆角/内切，凸角更圆、凹角外扩 */
    function tileField(tx2, ty2) {
      if (tx2 < 0 || ty2 < 0 || tx2 >= COLS || ty2 >= ROWS) return 0;
      var t5 = terrain[ty2 * COLS + tx2];
      return t5 >= T_MUD ? 1 : (t5 === T_WET ? 0.5 : 0);
    }
    for (ty = 0; ty <= ROWS; ty++) {
      for (tx = 0; tx <= COLS; tx++) {
        fieldF[ty * (COLS + 1) + tx] = (tileField(tx - 1, ty - 1) + tileField(tx, ty - 1) + tileField(tx - 1, ty) + tileField(tx, ty)) * 0.25;
        var tw = 0;
        if (tx > 0 && ty > 0 && terrain[(ty - 1) * COLS + tx - 1] >= T_WET) tw++;
        if (tx < COLS && ty > 0 && terrain[(ty - 1) * COLS + tx] >= T_WET) tw++;
        if (tx > 0 && ty < ROWS && terrain[ty * COLS + tx - 1] >= T_WET) tw++;
        if (tx < COLS && ty < ROWS && terrain[ty * COLS + tx] >= T_WET) tw++;
        fieldW[ty * (COLS + 1) + tx] = tw * 0.25;
      }
    }
  })();

  /* ================= 分块离屏预渲染（惰性生成 + 缓存） ================= */
  var chunkCache = new Array(CW * CH);
  var cGrassLo = [102, 114, 70], cGrassHi = [140, 144, 86], cDry = [164, 148, 86];
  var cWetLo = [70, 80, 48], cWetHi = [86, 94, 52], cWetMud = [88, 80, 48];
  var cMudLo = [72, 54, 38], cMudHi = [106, 80, 52];
  var cWaEdge = [46, 90, 78], cWaDeep = [24, 60, 56];

  function blerp(arr, tx, ty, fx, fy) {
    var W1 = COLS + 1, i = ty * W1 + tx;
    var a = arr[i], b = arr[i + 1], c = arr[i + W1], d = arr[i + W1 + 1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  }

  function shadowRect(g, x, y, w) {
    g.fillStyle = 'rgba(22,26,12,0.32)';
    g.fillRect(x - (w >> 1), y, w, 2);
  }
  function tuftGrass(g, x, y, tx, ty) {           /* 高草丛 */
    shadowRect(g, x, y + 1, 8);
    var i;
    g.fillStyle = 'rgb(64,80,42)';
    g.fillRect(x - 3, y - 2, 7, 2);
    for (i = 0; i < 5; i++) {
      var hh = (5 + hash2(tx, ty, 200 + i) * 7) | 0;
      var xo = x - 3 + i * 2 + ((hash2(tx, ty, 210 + i) * 2) | 0) - 1;
      g.fillStyle = 'rgb(84,102,56)';
      g.fillRect(xo, y - 1 - hh, 1, hh);
      g.fillStyle = 'rgb(128,144,82)';
      g.fillRect(xo, y - 1 - hh, 1, 2);
    }
  }
  function tuftDry(g, x, y, tx, ty) {             /* 枯草簇 */
    shadowRect(g, x, y + 1, 7);
    g.fillStyle = 'rgb(96,84,46)';
    g.fillRect(x - 2, y - 2, 5, 2);
    for (var i = 0; i < 4; i++) {
      var hh = (3 + hash2(tx, ty, 220 + i) * 6) | 0;
      var xo = x - 3 + i * 2;
      var lean = hash2(tx, ty, 230 + i) < 0.5 ? -1 : 1;
      g.fillStyle = 'rgb(148,130,72)';
      g.fillRect(xo, y - 1 - hh, 1, hh);
      g.fillStyle = 'rgb(176,158,96)';
      g.fillRect(xo + lean, y - 1 - hh, 1, 1);
    }
  }
  function flower(g, x, y, tx, ty) {              /* 小野花 白/黄 */
    shadowRect(g, x, y + 1, 4);
    var white = hash2(tx, ty, 240) < 0.55;
    g.fillStyle = 'rgb(74,96,52)';
    g.fillRect(x, y - 6, 1, 5);
    g.fillStyle = white ? 'rgb(236,238,228)' : 'rgb(232,206,100)';
    g.fillRect(x - 1, y - 7, 3, 1);
    g.fillRect(x, y - 8, 1, 3);
    g.fillStyle = white ? 'rgb(224,196,84)' : 'rgb(122,94,40)';
    g.fillRect(x, y - 7, 1, 1);
  }
  function shrub(g, x, y, tx, ty) {               /* 矮灌木 */
    shadowRect(g, x, y + 1, 12);
    for (var i = 0; i < 3; i++) {
      var mx = x - 4 + i * 4 + ((hash2(tx, ty, 250 + i) * 3) | 0) - 1;
      var my = y - 3 - ((hash2(tx, ty, 260 + i) * 3) | 0);
      g.fillStyle = 'rgb(60,78,44)';
      g.fillRect(mx - 3, my - 3, 7, 4);
      g.fillStyle = 'rgb(80,100,52)';
      g.fillRect(mx - 2, my - 5, 5, 3);
      g.fillStyle = 'rgb(102,122,62)';
      g.fillRect(mx - 2, my - 5, 3, 1);
    }
  }
  function stone(g, x, y, tx, ty) {               /* 灰石块 */
    g.fillStyle = 'rgba(22,26,12,0.35)';
    g.fillRect(x - 4, y, 9, 2);
    g.fillStyle = 'rgb(122,124,116)';
    g.fillRect(x - 3, y - 5, 7, 5);
    g.fillStyle = 'rgb(158,160,148)';
    g.fillRect(x - 3, y - 6, 5, 2);
    g.fillStyle = 'rgb(86,88,82)';
    g.fillRect(x - 3, y - 1, 7, 1);
    g.fillRect(x + 3, y - 4, 1, 3);
  }
  function lilyPad(g, x, y) {                     /* 睡莲叶 */
    g.fillStyle = 'rgba(12,42,38,0.55)';
    g.fillRect(x - 1, y + 4, 8, 1);
    g.fillStyle = 'rgb(48,96,54)';
    g.fillRect(x, y, 6, 4);
    g.fillRect(x + 1, y - 1, 4, 1);
    g.fillRect(x + 1, y + 4, 4, 1);
    g.fillStyle = 'rgb(84,134,72)';
    g.fillRect(x + 1, y, 3, 1);
  }

  function renderChunk(ccx, ccy) {
    var cv = document.createElement('canvas');
    cv.width = CPX; cv.height = CPX;
    var g = cv.getContext('2d');
    var img = g.createImageData(CPX, CPX);
    var data = img.data;
    var txBase = ccx * CHUNK, tyBase = ccy * CHUNK;
    var px, py, tx, ty, ti, lx, ly;

    /* --- 地表纹理逐像素写入 --- */
    for (py = 0; py < CPX; py++) {
      var wy = tyBase * TILE + py;
      ty = wy >> 5;
      var fy = (wy & 31) * 0.03125;
      var rowO = py * CPX * 4;
      for (px = 0; px < CPX; px++) {
        var wx = txBase * TILE + px;
        tx = wx >> 5;
        var o = rowO + px * 4;
        var r, gg, bb;
        if (tx >= COLS || ty >= ROWS) {
          data[o] = 20; data[o + 1] = 24; data[o + 2] = 15; data[o + 3] = 255;
          continue;
        }
        var fx = (wx & 31) * 0.03125;
        ti = ty * COLS + tx;
        var tp = terrain[ti];
        /* 泥/水存在场 S：像素级等值线决定本体范围（边界图块圆角/内切，不再整块填充）
           湿草存在场 W2：湿草圈外缘同样子块级圆化
           共享两层中频噪声扰动 => 等值线碎化，边缘出现小弯，消除长直线段 */
        var n1 = (vnoise(wx * 0.045, wy * 0.045, 424) - 0.5) * 0.24;
        var n2 = (vnoise(wx * 0.1, wy * 0.1, 425) - 0.5) * 0.12;
        var S0 = blerp(fieldF, tx, ty, fx, fy);          /* 未扰动场：泡沫/湿边窄带判定用，避免扰动误撒 */
        var S = S0 + n1 + n2;
        var W2 = blerp(fieldW, tx, ty, fx, fy) + n1 * 0.8 + n2 * 0.8;
        var vv = blerp(gVar, tx, ty, fx, fy);
        var wetR = cWetLo[0] + (cWetHi[0] - cWetLo[0]) * (0.2 + vv * 0.5);
        var wetG = cWetLo[1] + (cWetHi[1] - cWetLo[1]) * (0.2 + vv * 0.5);
        var wetB = cWetLo[2] + (cWetHi[2] - cWetLo[2]) * (0.2 + vv * 0.5);
        /* 棋盘 + 哈希混合的抖动因子（2px 棋盘感，过渡带 1~2 格宽） */
        var dth = hash2(wx >> 1, wy >> 1, 7777) * 0.62 + ((((wx >> 1) + (wy >> 1)) & 1) * 0.38);
        var foamPix = false;
        if (tp === T_WATER) {
          var watTh = (contact[ti] & 2) ? 0.9 : 0.8;      /* 邻泥时水线内收，与泥之间留出浅滩湿缝 */
          if (S >= watTh) {
            var s8 = waterShade[ti] / 8;
            var wvv = 0.97 + vv * 0.06;                   /* 图块间平滑微差，避免 tile 色阶 */
            r = (cWaEdge[0] + (cWaDeep[0] - cWaEdge[0]) * s8) * wvv;
            gg = (cWaEdge[1] + (cWaDeep[1] - cWaEdge[1]) * s8) * wvv;
            bb = (cWaEdge[2] + (cWaDeep[2] - cWaEdge[2]) * s8) * wvv;
            if (S0 >= 0.8 && S0 < 0.865 && hash2(wx, wy, 515) < 0.48) {   /* 点状泡沫：只贴水线内侧 */
              r = 204; gg = 226; bb = 202; foamPix = true;
            }
          } else if (S >= 0.54 && dth < (S - 0.54) / (watTh - 0.54)) {
            var s8b = (waterShade[ti] / 8) * 0.55;          /* 岸线浅水与湿草的棋盘抖动 */
            r = (cWaEdge[0] + (cWaDeep[0] - cWaEdge[0]) * s8b) * 1.12;
            gg = (cWaEdge[1] + (cWaDeep[1] - cWaEdge[1]) * s8b) * 1.12;
            bb = (cWaEdge[2] + (cWaDeep[2] - cWaEdge[2]) * s8b) * 1.12;
          } else {
            r = wetR; gg = wetG; bb = wetB;                 /* 水图块边角收成湿草 */
          }
        } else if (tp === T_MUD) {
          if (S >= 0.78) {
            var mn = mudNoise[ti];
            r = cMudLo[0] + (cMudHi[0] - cMudLo[0]) * mn;
            gg = cMudLo[1] + (cMudHi[1] - cMudLo[1]) * mn;
            bb = cMudLo[2] + (cMudHi[2] - cMudLo[2]) * mn;
            if (S0 < 0.815) { r *= 0.8; gg *= 0.76; bb *= 0.74; }   /* 贴边一圈窄窄的深色湿边 */
          } else if (S >= 0.54 && dth < (S - 0.54) / 0.24) {
            var mn2 = mudNoise[ti];
            r = (cMudLo[0] + (cMudHi[0] - cMudLo[0]) * mn2) * 0.92;
            gg = (cMudLo[1] + (cMudHi[1] - cMudLo[1]) * mn2) * 0.92;
            bb = (cMudLo[2] + (cMudHi[2] - cMudLo[2]) * mn2) * 0.92;
          } else {
            r = wetR; gg = wetG; bb = wetB;
          }
        } else if (tp === T_WET) {
          var drW = blerp(gDry, tx, ty, fx, fy);
          r = wetR; gg = wetG; bb = wetB;
          if (drW > 0.72) {
            var kw = Math.min(1, (drW - 0.72) * 2.6) * 0.7;
            r += (cWetMud[0] - r) * kw; gg += (cWetMud[1] - gg) * kw; bb += (cWetMud[2] - bb) * kw;
          }
          if (S > 0.55 && hash2(wx >> 1, wy >> 1, 778) < (S - 0.55) * 3.4) {   /* 向泥/水侧的抖动泥点 */
            r = 82; gg = 63; bb = 44;
          } else if (W2 < 0.66 && hash2(wx >> 1, wy >> 1, 780) < (0.66 - W2) * 2.2) {   /* 外缘向草侧的抖动草点 */
            r = cGrassLo[0] + (cGrassHi[0] - cGrassLo[0]) * vv;
            gg = cGrassLo[1] + (cGrassHi[1] - cGrassLo[1]) * vv;
            bb = cGrassLo[2] + (cGrassHi[2] - cGrassLo[2]) * vv;
          }
        } else {
          var dr = blerp(gDry, tx, ty, fx, fy);
          var wetMix = W2 >= 0.4 ? Math.min(1, (W2 - 0.4) * 3.6) : 0;
          if (dth < wetMix) {
            r = wetR; gg = wetG; bb = wetB;               /* 贴湿草圈处的棋盘抖动 */
          } else {
            r = cGrassLo[0] + (cGrassHi[0] - cGrassLo[0]) * vv;
            gg = cGrassLo[1] + (cGrassHi[1] - cGrassLo[1]) * vv;
            bb = cGrassLo[2] + (cGrassHi[2] - cGrassLo[2]) * vv;
            if (dr < 0.28) { var kdk = (0.28 - dr) * 0.8; r -= kdk * 12; gg -= kdk * 10; bb -= kdk * 6; }
            if (dr > 0.62) {
              var kd = Math.min(1, (dr - 0.62) * 2.7) * 0.85;
              r += (cDry[0] - r) * kd; gg += (cDry[1] - gg) * kd; bb += (cDry[2] - bb) * kd;
            }
            if (S > 0.13 && hash2(wx >> 1, wy >> 1, 779) < (S - 0.13) * 1.7) {   /* 草地侧的湿草抖动点 */
              r = wetR; gg = wetG; bb = wetB;
            }
          }
        }
        var jb = hash2(wx >> 1, wy >> 1, 9001);
        var jp = hash2(wx, wy, 9002);
        var jt = (jb - 0.5) * 13 + (jp - 0.5) * 6;
        if (foamPix) jt = 0;                                /* 泡沫点保持干净 */
        else if (tp === T_WATER) jt *= 0.4;
        r += jt; gg += jt; bb += jt * 0.8;
        data[o] = r < 0 ? 0 : r > 255 ? 255 : r;
        data[o + 1] = gg < 0 ? 0 : gg > 255 ? 255 : gg;
        data[o + 2] = bb < 0 ? 0 : bb > 255 ? 255 : bb;
        data[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);

    /* 泡沫/湿边已并入地表像素级绘制（上游像素级等值线渲染）；此处仅保留装饰所需的范围变量 */
    var txEnd = Math.min(COLS, txBase + CHUNK), tyEnd = Math.min(ROWS, tyBase + CHUNK);

    /* --- 静态装饰（带影子 + 上移，2.5D 高度感） --- */
    for (ty = tyBase; ty < tyEnd; ty++) {
      for (tx = txBase; tx < txEnd; tx++) {
        ti = ty * COLS + tx;
        lx = (tx - txBase) * TILE; ly = (ty - tyBase) * TILE;
        var h1 = hash2(tx, ty, 101);
        var bx = (lx + 4 + hash2(tx, ty, 102) * 18) | 0;
        var by = (ly + 12 + hash2(tx, ty, 103) * 14) | 0;
        var tp3 = terrain[ti];
        if (tp3 === T_GRASS) {
          if (h1 < 0.13) tuftGrass(g, bx, by, tx, ty);
          else if (h1 < 0.21) tuftDry(g, bx, by, tx, ty);
          else if (h1 < 0.26) flower(g, bx, by, tx, ty);
          else if (h1 < 0.285) shrub(g, bx, by, tx, ty);
          else if (h1 < 0.297) stone(g, bx, by, tx, ty);
          else if (h1 < 0.5) {
            g.fillStyle = hash2(tx, ty, 110) < 0.5 ? 'rgba(58,70,38,0.55)' : 'rgba(158,164,100,0.5)';
            g.fillRect(bx, by, 3, 1);
          }
        } else if (tp3 === T_WET) {
          if (h1 < 0.09) tuftDry(g, bx, by, tx, ty);
          else if (h1 < 0.22) {
            g.fillStyle = 'rgba(52,60,34,0.6)';
            g.fillRect(bx, by, 3, 1);
          }
        } else if (tp3 === T_MUD) {
          if (h1 < 0.2) {
            g.fillStyle = 'rgba(56,42,30,0.9)';
            g.fillRect(bx, by, 3, 1);
            if (hash2(tx, ty, 113) < 0.5) g.fillRect(bx + 2, by + 1, 2, 1);
          } else if (h1 < 0.26) {
            g.fillStyle = 'rgba(126,98,66,0.8)';
            g.fillRect(bx, by, 2, 1);
          }
        } else if (tp3 === T_WATER) {
          if (waterShade[ti] >= 5 && h1 < 0.08) {
            lilyPad(g, (lx + 10 + hash2(tx, ty, 104) * 8) | 0, (ly + 10 + hash2(tx, ty, 105) * 8) | 0);
          }
        }
      }
    }
    return cv;
  }

  /* ================= 相机（由游戏主循环驱动平滑跟随） ================= */
  var cam = { x: 0, y: 0 };
  function clampCam() {
    cam.x = Math.max(0, Math.min(WORLD_W - VIEW_W, cam.x));
    cam.y = Math.max(0, Math.min(WORLD_H - VIEW_H, cam.y));
  }
  function setCamera(x, y) { cam.x = x; cam.y = y; clampCam(); }
  setCamera(WORLD_W * 0.42, WORLD_H * 0.5 - VIEW_H / 2);
  function setViewSize(w, h) { VIEW_W = w | 0; VIEW_H = h | 0; clampCam(); }

  /* ================= 动态元素绘制 ================= */
  function drawBubble(x, y, r) {                  /* 泥面气泡：暗色鼓包 + 亮边 */
    x = Math.round(x); y = Math.round(y);
    var w = Math.max(2, Math.round(r * 2)), h = Math.max(2, Math.round(r * 1.3));
    ctx.fillStyle = 'rgba(28,18,10,0.5)';
    ctx.fillRect(x - (w >> 1), y - (h >> 1), w, h);
    ctx.fillStyle = 'rgba(172,142,104,0.85)';
    ctx.fillRect(x - (w >> 1) + 1, y - (h >> 1), Math.max(1, w - 2), Math.max(1, h >> 2));
  }
  function drawReed(x, y, tx, ty, t) {            /* 芦苇/香蒲：两帧轻摆 */
    x = Math.round(x); y = Math.round(y);
    var h1 = hash2(tx, ty, 404);
    var hgt = (10 + h1 * 8) | 0;
    var sway = (((t * 1.7 + h1 * 10) | 0) % 2) === 0;
    var dx = sway ? 1 : -1;
    ctx.fillStyle = 'rgba(12,36,32,0.55)';
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillStyle = h1 < 0.5 ? 'rgb(96,120,64)' : 'rgb(110,124,68)';
    var half = hgt >> 1;
    ctx.fillRect(x, y - half, 1, half);
    ctx.fillRect(x + (dx >> 1), y - hgt, 1, hgt - half);
    ctx.fillStyle = 'rgb(84,106,56)';
    ctx.fillRect(x - 1, y - half - 1, 2, 1);
    ctx.fillRect(x + 1, y - half + 2, 2, 1);
    if (hash2(tx, ty, 405) < 0.45) {
      ctx.fillStyle = 'rgb(106,72,42)';
      ctx.fillRect(x + dx - 1, y - hgt - 4, 2, 4);
      ctx.fillStyle = 'rgb(148,108,62)';
      ctx.fillRect(x + dx - 1, y - hgt - 5, 2, 1);
    } else {
      ctx.fillStyle = 'rgb(132,148,84)';
      ctx.fillRect(x + dx, y - hgt - 1, 1, 2);
    }
  }

  /* ================= 小地图底图 ================= */
  var mmBase = document.createElement('canvas');
  mmBase.width = COLS; mmBase.height = ROWS;
  (function () {
    var mg = mmBase.getContext('2d');
    var mi = mg.createImageData(COLS, ROWS);
    var md = mi.data;
    for (var i = 0; i < terrain.length; i++) {
      var o = i * 4, t4 = terrain[i], c;
      if (t4 === T_WATER) c = [38, 78, 70];
      else if (t4 === T_MUD) c = [118, 88, 56];
      else if (t4 === T_WET) c = [88, 96, 58];
      else c = [110, 120, 76];
      md[o] = c[0]; md[o + 1] = c[1]; md[o + 2] = c[2]; md[o + 3] = 255;
    }
    mg.putImageData(mi, 0, 0);
  })();

  /* ================= 主渲染（游戏主循环每帧调用；overlayFn 用于在小地图上叠加玩家/青稞） ================= */
  var frame = 0;
  function render(t, overlayFn) {
    frame++;
    var camXi = Math.round(cam.x), camYi = Math.round(cam.y);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#141a10';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    var cx0 = Math.floor(cam.x / CPX), cx1 = Math.floor((cam.x + VIEW_W - 0.001) / CPX);
    var cy0 = Math.floor(cam.y / CPX), cy1 = Math.floor((cam.y + VIEW_H - 0.001) / CPX);
    var ccx, ccy, ci, cv;
    for (ccy = cy0; ccy <= cy1; ccy++) {
      for (ccx = cx0; ccx <= cx1; ccx++) {
        if (ccx < 0 || ccy < 0 || ccx >= CW || ccy >= CH) continue;
        ci = ccy * CW + ccx;
        cv = chunkCache[ci];
        if (!cv) { cv = renderChunk(ccx, ccy); chunkCache[ci] = cv; }
        ctx.drawImage(cv, ccx * CPX - camXi, ccy * CPX - camYi);
      }
    }

    var tx0 = Math.max(0, (camXi >> 5) - 1), ty0 = Math.max(0, (camYi >> 5) - 1);
    var tx1 = Math.min(COLS - 1, ((camXi + VIEW_W) >> 5) + 1);
    var ty1 = Math.min(ROWS - 1, ((camYi + VIEW_H) >> 5) + 1);
    var tx, ty, i, k;

    /* 水面波光：两帧交替的浅色划痕 */
    var shim = ((t * 2.4) | 0) % 2;
    var dashes = [];
    ctx.fillStyle = 'rgba(180,218,198,0.5)';
    for (ty = ty0; ty <= ty1; ty++) {
      for (tx = tx0; tx <= tx1; tx++) {
        i = ty * COLS + tx;
        if (terrain[i] !== T_WATER) continue;
        for (k = 0; k < 2; k++) {
          var ha = hash2(tx, ty, 500 + k);
          if (ha < 0.55) {
            var on = (((hash2(tx, ty, 510 + k) * 2) | 0) + shim) % 2;
            if (on) {
              var wx = tx * TILE + 3 + ((ha * 24) | 0);
              var wy = ty * TILE + 4 + ((hash2(tx, ty, 520 + k) * 22) | 0);
              ctx.fillRect(wx - camXi, wy - camYi, 4, 1);
              dashes.push(wx - camXi, wy - camYi);
            }
          }
        }
      }
    }
    ctx.fillStyle = 'rgba(228,244,222,0.6)';
    for (i = 0; i < dashes.length; i += 2) ctx.fillRect(dashes[i] + 1, dashes[i + 1] - 2, 2, 1);

    /* 泥潭气泡：每块泥地低概率、错相循环 */
    for (ty = ty0; ty <= ty1; ty++) {
      for (tx = tx0; tx <= tx1; tx++) {
        i = ty * COLS + tx;
        if (terrain[i] !== T_MUD) continue;
        var hb = hash2(tx, ty, 601);
        if (hb < 0.12) {
          var cyc = 2.2 + hb * 12;
          var p = ((t + hb * 31) % cyc) / cyc;
          if (p > 0.05 && p < 0.75) {
            var bxp = tx * TILE + 5 + ((hash2(tx, ty, 602) * 18) | 0);
            var byp = ty * TILE + 27 - p * 17;
            drawBubble(bxp - camXi, byp - camYi, 1 + p * 1.7);
          }
        }
      }
    }
    /* 泥潭中央偶尔冒大泡 */
    for (i = 0; i < blobCenters.length; i++) {
      var bcx = blobCenters[i].x, bcy = blobCenters[i].y;
      if (bcx < camXi - 32 || bcy < camYi - 32 || bcx > camXi + VIEW_W + 32 || bcy > camYi + VIEW_H + 32) continue;
      var pb = ((t + i * 1.9) % 4.5) / 4.5;
      if (pb > 0.05 && pb < 0.72) drawBubble(bcx - camXi, bcy + 4 - pb * 12, 1.5 + pb * 3);
    }

    /* 芦苇/香蒲：只长在水陆交界的水图块 */
    for (ty = ty0; ty <= ty1; ty++) {
      for (tx = tx0; tx <= tx1; tx++) {
        i = ty * COLS + tx;
        if (terrain[i] !== T_WATER) continue;
        if (hash2(tx, ty, 401) >= 0.34) continue;
        var lw2 = tx > 0 && terrain[i - 1] !== T_WATER;
        var le2 = tx < COLS - 1 && terrain[i + 1] !== T_WATER;
        var ln2 = ty > 0 && terrain[i - COLS] !== T_WATER;
        var ls2 = ty < ROWS - 1 && terrain[i + COLS] !== T_WATER;
        if (!lw2 && !le2 && !ln2 && !ls2) continue;
        var hr = hash2(tx, ty, 402), hr2 = hash2(tx, ty, 403);
        var rxp, ryp;
        if (lw2) { rxp = tx * TILE + 6 + hr * 4; ryp = ty * TILE + 6 + hr2 * 20; }
        else if (le2) { rxp = tx * TILE + 23 + hr * 4; ryp = ty * TILE + 6 + hr2 * 20; }
        else if (ln2) { rxp = tx * TILE + 5 + hr * 22; ryp = ty * TILE + 7 + hr2 * 4; }
        else { rxp = tx * TILE + 5 + hr * 22; ryp = ty * TILE + 21 + hr2 * 4; }
        drawReed(rxp - camXi, ryp - camYi, tx, ty, t);
      }
    }

    /* 小地图：三色底图 + 当前视野框 */
    mmCtx.imageSmoothingEnabled = false;
    mmCtx.drawImage(mmBase, 0, 0, 128, 128);
    var mrx = cam.x / WORLD_W * 128, mry = cam.y / WORLD_H * 128;
    var mrw = Math.max(4, VIEW_W / WORLD_W * 128), mrh = Math.max(3, VIEW_H / WORLD_H * 128);
    mmCtx.strokeStyle = 'rgba(246,242,220,0.95)';
    mmCtx.lineWidth = 1;
    mmCtx.strokeRect(Math.round(mrx) + 0.5, Math.round(mry) + 0.5, Math.round(mrw), Math.round(mrh));
    if (typeof overlayFn === 'function') overlayFn(mmCtx);
  }

  /* ================= 对外集成接口 window.CAOGAO_MAP ================= */
  window.CAOGAO_MAP = {
    TILE: TILE, COLS: COLS, ROWS: ROWS,
    VIEW_W: VIEW_W, VIEW_H: VIEW_H, WORLD_W: WORLD_W, WORLD_H: WORLD_H,
    camera: cam,
    terrainAt: function (tx, ty) {
      tx = Math.floor(tx); ty = Math.floor(ty);
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return 'grass';
      var v = terrain[ty * COLS + tx];
      return v === T_WATER ? 'water' : v === T_MUD ? 'mud' : v === T_WET ? 'wet' : 'grass';
    },
    isWater: function (tx, ty) {
      tx = Math.floor(tx); ty = Math.floor(ty);
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
      return terrain[ty * COLS + tx] === T_WATER;
    },
    isMud: function (tx, ty) {
      tx = Math.floor(tx); ty = Math.floor(ty);
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
      return terrain[ty * COLS + tx] === T_MUD;
    },
    isSolid: function (tx, ty) {
      tx = Math.floor(tx); ty = Math.floor(ty);
      if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
      return terrain[ty * COLS + tx] === T_WATER;
    },
    worldToScreen: function (wx, wy) { return { x: wx - cam.x, y: wy - cam.y }; },
    screenToWorld: function (sx, sy) { return { x: sx + cam.x, y: sy + cam.y }; },
    setCamera: setCamera,
    setViewSize: setViewSize,
    render: function (t, fn) { render(typeof t === 'number' ? t : performance.now() / 1000, fn); }
  };
  return { dispose: function () { deleteGlobal('CAOGAO_MAP'); } };
}
/* ================= 模块二：红军战士像素精灵（mount 化：函数体与源文件逐字节一致，仅 IIFE 启动方式改为延迟挂载） ================= */
function mountRedArmySprite(rootEl) {
  /* rootEl 为遮罩内挂载容器；精灵帧数据 FRAME_DATA 原样保留 */
'use strict';
var W=26,H=34;
var PAL={"O":"#241e18","U":"#5a6478","u":"#454e60","H":"#6e7a90","W":"#8f9ab0","S":"#d9a06a","s":"#b07d50","R":"#d23a30","r":"#f0685a","B":"#4a3421","b":"#6e3a2a","c":"#8a5038","G":"#8a744a","g":"#695633","M":"#7d838c"};
var FRAME_DATA={"idle":[["..........................","..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSOSSSSOSSO.......","..OBBOcOsSSSSSSSSsOc......","..OBBOcOSSSSSSSSSsOc......","..OBBOcccOssssssOccc......","..OBBObbbOssssssObbb......","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuuUO.....",".....OUuUUUUUBBUuuuUO.....",".....OSsBBBBMMBBBBsSO.....",".....OSsUUUUUUUUuusSO.....","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................","..........................",".........................."],["..........................","..........................","..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSOSSSSOSSO.......","..OBBOcOsSSSSSSSSsOc......","..OBBOcOSSSSSSSSSsOc......","..OBBOcccOssssssOccc......","..OBBObbbOssssssObbb......","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuuUO.....",".....OUuUUUUUBBUuuuUO.....",".....OSsBBBBMMBBBBsSO.....",".....OSsUUUUUUUUuusSO.....","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................",".........................."],["..........................","..........................","..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSsSSSSOsSO.......","..OBBOcOsSSSSSSSSsOc......","..OBBOcOSSSSSSSSSsOc......","..OBBOcccOssssssOccc......","..OBBObbbOssssssObbb......","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuuUO.....",".....OUuUUUUUBBUuuuUO.....",".....OSsBBBBMMBBBBsSO.....",".....OSsUUUUUUUUuusSO.....","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................",".........................."],["..........................","..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSOSSSSOSSO.......","..OBBOcOsSSSSSSSSsOc......","..OBBOcOSSSSSSSSSsOc......","..OBBOcccOssssssOccc......","..OBBObbbOssssssObbb......","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuuUO.....",".....OUuUUUUUBBUuuuUO.....",".....OSsBBBBMMBBBBsSO.....",".....OSsUUUUUUUUuusSO.....","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................","..........................",".........................."]],"walkDown":[["..........................","..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSOSSSSOSSO.......","..OBBOcOsSSSSSSSSsOc......","..OBBOcOSSSSSSSSSsOc......","..OBBOcccOssssssOccc......","..OBBObbbOssssssObbb......","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OSsUUUBBUUUuuuUO.....",".....OSsUUUUUBBUuuuUO.....",".......OBBBBMMBBBBuUO.....",".......OUUUUUUUUuuSsO.....","......OuuuuuuuuuuuSsO.....",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..OUUUUO......",".......Ouuuu..OuuuuO......",".......OUUUU..OGGGGO......",".......Ouuuu..OggggO......","......OGGGGO..............","......OggggO..............","..........................",".........................."],["..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSOSSSSOSSO.......","..OBBOcOsSSSSSSSSsOc......","..OBBOcOSSSSSSSSSsOc......","..OBBOcccOssssssOccc......","..OBBObbbOssssssObbb......","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuuUO.....",".....OUuUUUUUBBUuuuUO.....",".....OSsBBBBMMBBBBsSO.....","......OuUUUUUUUUuO........","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................","..........................","..........................",".........................."],["..........................","..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSOSSSSOSSO.......","..OBBOcOsSSSSSSSSsOc......","..OBBOcOSSSSSSSSSsOc......","..OBBOcccOssssssOccc......","..OBBObbbOssssssObbb......","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuSsO.....",".....OUuUUUUUBBUuusSO.....",".....OSsBBBBMMBBBBO.......",".....OSsUUUUUUUUuuO.......",".....OSsuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......","......OUUUUO..WWWWO.......","......OuuuuO..uuuuO.......","......OGGGGO..UUUUO.......","......OggggO..uuuuO.......","..............OGGGGO......","..............OggggO......","..........................",".........................."],["..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSOSSSSOSSO.......","..OBBOcOsSSSSSSSSsOc......","..OBBOcOSSSSSSSSSsOc......","..OBBOcccOssssssOccc......","..OBBObbbOssssssObbb......","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuuUO.....",".....OUuUUUUUBBUuuuUO.....",".....OSsBBBBMMBBBBsSO.....","......OuUUUUUUUUuO........","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................","..........................","..........................",".........................."]],"walkUp":[["..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","........OHUUUuuuuO........",".......OuuuuuuuuuuO.......",".......OBBBBBBBBBBOMMO....",".......OBBBBBBBBBBOMMO....","........OBBBBBBBBOMMO.....","......OOOOOOOOOOOOOO......",".....OcccbbbbbbbbbBBO.....",".....OcbbbbbbbbbbbBBO.....",".....OUHUUUUUUUUuuuUO.....",".....OUuUUUUUUUUBBuUO.....",".....OSsUUUUUUUBBUuuUO....",".....OSsUUUUUUBBUuuuUO....",".......OBBBBBBBBBBuUO.....",".......OUUUUUUUUuuSsO.....","......OuuuuuuuuuuuSsO.....",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..OUUUUO......",".......Ouuuu..OuuuuO......",".......OUUUU..OGGGGO......",".......Ouuuu..OggggO......","......OGGGGO..............","......OggggO..............","..........................",".........................."],["..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","........OHUUUuuuuO........",".......OuuuuuuuuuuO.......",".......OBBBBBBBBBBOMMO....",".......OBBBBBBBBBBOMMO....","........OBBBBBBBBOMMO.....","......OOOOOOOOOOOOOO......",".....OcccbbbbbbbbbBBO.....",".....OcbbbbbbbbbbbBBO.....",".....OUHUUUUUUUUuuuUO.....",".....OUuUUUUUUUUBBuUO.....",".....OUuUUUUUUUBBUuuUO....",".....OUuUUUUUUBBUuuuUO....",".....OSsBBBBBBBBBBsSO.....","......OuUUUUUUUUuO........","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................","..........................","..........................",".........................."],["..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","........OHUUUuuuuO........",".......OuuuuuuuuuuO.......",".......OBBBBBBBBBBOMMO....",".......OBBBBBBBBBBOMMO....","........OBBBBBBBBOMMO.....","......OOOOOOOOOOOOOO......",".....OcccbbbbbbbbbBBO.....",".....OcbbbbbbbbbbbBBO.....",".....OUHUUUUUUUUuuuUO.....",".....OUuUUUUUUUUBBuUO.....",".....OUuUUUUUUBBUusSO.....",".....OUuUUUUBBUUuusSO.....",".....OSsBBBBBBBBBBO.......",".....OSsUUUUUUUUuuO.......",".....OSsuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......","......OUUUUO..WWWWO.......","......OuuuuO..uuuuO.......","......OGGGGO..UUUUO.......","......OggggO..uuuuO.......","..............OGGGGO......","..............OggggO......","..........................",".........................."],["..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","........OHUUUuuuuO........",".......OuuuuuuuuuuO.......",".......OBBBBBBBBBBOMMO....",".......OBBBBBBBBBBOMMO....","........OBBBBBBBBOMMO.....","......OOOOOOOOOOOOOO......",".....OcccbbbbbbbbbBBO.....",".....OcbbbbbbbbbbbBBO.....",".....OUHUUUUUUUUuuuUO.....",".....OUuUUUUUUUUBBuUO.....",".....OUuUUUUUUUBBUuuUO....",".....OUuUUUUUUBBUuuuUO....",".....OSsBBBBBBBBBBsSO.....","......OuUUUUUUUUuO........","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................","..........................","..........................",".........................."]],"walkSide":[["..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","...OM...OUUUUUUUO.........","...OM...OUUUUUUBBBO.......","...OM..OuussSSSSsO........","...OM..OuSSSSSOSSSO.......",".......OsSSSSSssO.........","...Obbc.OssssssO..........","...Obcc..OssssO...........","...Obbc..OUUuuRRuO........",".....OUUUUUUUUUUO.........",".....OuBBUUUUUuUO.........",".....OuUUBBUUUuuO.........",".....OuUUUUBBUuuO.........",".....OBBBBBBBBSsO.........",".....OuUUUUUUUssO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........",".......Ouuu.UUUUO.........","......Ouuu..UUUUO.........","......Ouu...WWWWO.........",".....Ouu.....WWWWO........",".....Ouu.....uuuuO........","....OGGGO....uuuuO........","....OgggO....OuuuuO.......",".............OuuuuO.......",".............OGGGGO.......",".............OggggO.......","..........................",".........................."],["..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","...OM...OUUUUUUUO.........","...OM...OUUUUUUBBBO.......","...OM..OuussSSSSsO........","...OM..OuSSSSSOSSSO.......",".......OsSSSSSssO.........","...Obbc.OssssssO..........","...Obcc..OssssO...........","...Obbc..OUUuuRRuO........",".....OUUUUUUUUUUO.........",".....OuBBUUUUUuUO.........",".....OuUUBBUUUuuO.........",".....OuUUUUBBUuuO.........",".....OBBBBBBBBSsO.........",".....OuUUUUUUUssO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........","........OuuuUUUUO.........","........OuuuUUUUO.........","........OuuuWWWWO.........","........OuuuWuuuO.........","........OuuuWWWWO.........",".......OGGGOuuuuO.........",".......OgggOuuuuO.........","..........OGGGGGGO........","..........OgggggggO.......","..........................","..........................","..........................",".........................."],["..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","...OM...OUUUUUUUO.........","...OM...OUUUUUUBBBO.......","...OM..OuussSSSSsO........","...OM..OuSSSSSOSSSO.......",".......OsSSSSSssO.........","...Obbc.OssssssO..........","...Obcc..OssssO...........","...Obbc..OUUuuRRuO........",".....OUUUUUUUUUUO.........",".....OuBBUUUUUuUO.........",".....OuUUBBUUUuuO.........",".....OuUUUUBBUuuO.........",".....OBBBBBBBBSsO.........",".....OuUUUUUUUssO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........",".......OUUU.uuuuO.........","......OUUU..uuuuO.........","......OUU...WWWWO.........",".....OUU.....WWWWO........",".....OUU.....uuuuO........","....OGGGO....uuuuO........","....OgggO....OuuuuO.......",".............OuuuuO.......",".............OGGGGO.......",".............OggggO.......","..........................",".........................."],["..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","...OM...OUUUUUUUO.........","...OM...OUUUUUUBBBO.......","...OM..OuussSSSSsO........","...OM..OuSSSSSOSSSO.......",".......OsSSSSSssO.........","...Obbc.OssssssO..........","...Obcc..OssssO...........","...Obbc..OUUuuRRuO........",".....OUUUUUUUUUUO.........",".....OuBBUUUUUuUO.........",".....OuUUBBUUUuuO.........",".....OuUUUUBBUuuO.........",".....OBBBBBBBBSsO.........",".....OuUUUUUUUssO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........","........OuuuUUUUO.........","........OuuuUUUUO.........","........OuuuWWWWO.........","........OuuuWuuuO.........","........OuuuWWWWO.........",".......OGGGOuuuuO.........",".......OgggOuuuuO.........","..........OGGGGGGO........","..........OgggggggO.......","..........................","..........................","..........................",".........................."]],"march":[["..........................","..........................","...OMMO....OOOO...........","...OMMO...OUUUUO..........","...OMMO..OUUUUUUO.........","...OMMO.OUUUUUUUO.........","...OMMOOUUUUUUBBBO........","...OMMOOuussSSSSsO........","...OMMOOuSSSSSOSSSO.......","...OMMMOsSSSSSssO.........","...OBBBOOssssssO..........","...OBBBO.OssssO...........","...OBBBO.OUUuuURRuuO......",".....OUUUUUUUUUUO.........",".....OuUUUUUUUUUSSO.......",".....OuUUUUUUuUSSsO.......",".....OuUUUUUUUuuuO........",".....OBBBBBBBBMMO.........",".....OuUUUUUUUUuO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","......Ouuu..UUUUO.........",".....Ouuu...UUUUO.........","....Ouuu....UUUUO.........","....Ouuu....WWWWO.........","...Ouuu.....WWWWO.........","...Ouuu.....uuuuO.........","..OGGGO.....uuuuO.........","..OgggO.....OuuuuO........","............OGGGGO........","............OggggO........","..........................","..........................",".........................."],["..........................","...OMMO....OOOO...........","...OMMO...OUUUUO..........","...OMMO..OUUUUUUO.........","...OMMO.OUUUUUUUO.........","...OMMOOUUUUUUBBBO........","...OMMOOuussSSSSsO........","...OMMOOuSSSSSOSSSO.......","...OMMMOsSSSSSssO.........","...OBBBOOssssssO..........","...OBBBO.OssssO...........","...OBBBO.OUUuuURRuuO......",".....OUUUUUUUUUUO.........",".....OuUUUUUUUUuO.........",".....OuUUUUUUUUuO.........",".....OuUUUUUUSSuO.........",".....OBBBBBBBSsMMO........",".....OuUUUUUUUUuO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........","........OuuuUUUUO.........","........OuuuUUUUO.........","........OuuuWWWWO.........","........OuuuWuuuO.........","........OuuuWWWWO.........",".......OGGGOuuuuO.........",".......OgggOuuuuO.........","..........OGGGGGGO........","..........OgggggggO.......","..........................","..........................","..........................",".........................."],["..........................","..........................","...OMMO....OOOO...........","...OMMO...OUUUUO..........","...OMMO..OUUUUUUO.........","...OMMO.OUUUUUUUO.........","...OMMOOUUUUUUBBBO........","...OMMOOuussSSSSsO........","...OMMOOuSSSSSOSSSO.......","...OMMMOsSSSSSssO.........","...OBBBOOssssssO..........","...OBBBO.OssssO...........","...OBBBO.OUUuuURRuuO......",".....OUUUUUUUUUUO.........",".....OuUUUUUUUUuO.........","....OSSuUUUUUUUuuO........",".....OuUUUUUUUuuuO........",".....OBBBBBBBBMMO.........",".....OuUUUUUUUUuO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","......OUUU..uuuuO.........",".....OUUU...uuuuO.........","....OUUU....uuuuO.........","....OUUU....WWWWO.........","...OUUU.....WWWWO.........","...OUUU.....uuuuO.........","..OGGGO.....uuuuO.........","..OgggO.....OuuuuO........","............OGGGGO........","............OggggO........","..........................","..........................",".........................."],["..........................","...OMMO....OOOO...........","...OMMO...OUUUUO..........","...OMMO..OUUUUUUO.........","...OMMO.OUUUUUUUO.........","...OMMOOUUUUUUBBBO........","...OMMOOuussSSSSsO........","...OMMOOuSSSSSOSSSO.......","...OMMMOsSSSSSssO.........","...OBBBOOssssssO..........","...OBBBO.OssssO...........","...OBBBO.OUUuuURRuuO......",".....OUUUUUUUUUUO.........",".....OuUUUUUUUUuO.........",".....OuUUUUUUUUuO.........",".....OuUUUUUUSSuO.........",".....OBBBBBBBSsMMO........",".....OuUUUUUUUUuO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........","........OuuuUUUUO.........","........OuuuUUUUO.........","........OuuuWWWWO.........","........OuuuWuuuO.........","........OuuuWWWWO.........",".......OGGGOuuuuO.........",".......OgggOuuuuO.........","..........OGGGGGGO........","..........OgggggggO.......","..........................","..........................","..........................",".........................."]],"mud":[["..........................","..........................","..........................","..........................","...........OOOO...........",".....OM...OUUUUO..........",".....OM..OUUUUUUO.........",".....OM.OUUUUUUUO.........",".....OM.OUUUUUUUBBBO......",".....OM.OuussSSSSsO.......",".....OM.OuSSSSSOSSSO......",".....OM.OsSSSSSssO........","....ObbcOssssssO..........","....Obcc.OssssO...........",".OS.Obbc.OUUuuURRuO.......",".OSs...OUUUUUUUUUUO.SsO...","..OuU..OuUUUUUUuuuO.SsO...","...Ou...OuUUUUUUuuuO......",".......OBBBBBBMMBBO.......",".......OuUUUUUUuuuO.......",".......OuUUUUUUuuuO.......","........OuUUUUUUuO........","........OuUUUUUUuO........","........Ouu..UUUUO........",".......Ouu...UUUUO........","......Ouu.....WWWWO.......",".....Ouu......uuuuO.......","....Ouu.......uuuuO.......","....Ouu.......uuuuO.......","..OGGGO.......OuuuuO......","..OgggO.......OGGGGO......","..............OggggO......",".....g..........g.........",".........................."],["..........................","..........................","..........................","..........................","...........OOOO...........",".....OM...OUUUUO..........",".....OM..OUUUUUUO.........",".....OM.OUUUUUUUO.........",".....OM.OUUUUUUUBBBO......",".....OM.OuussSSSSsO.......",".....OM.OuSSSSSOSSSO......",".....OM.OsSSSSSssO........","....ObbcOssssssO..........","....Obcc.OssssO...........",".OS.Obbc.OUUuuURRuO.......",".OSs...OUUUUUUUUUUO.SsO...","..OuU..OuUUUUUUuuuO.SsO...","...Ou...OuUUUUUUuuuO......",".......OBBBBBBMMBBO.......",".......OuUUUUUUuuuO.......",".......OuUUUUUUuuuO.......","........OuUUUUUUuO........","........OuUUUUUUuO........","........Ouu..UUUUO........",".......Ouu...UUUUO........","......Ouu.....WWWWO.......",".....Ouu......uuuuO.......","....OGGGO.....uuuuO.......","....OgggO.....OuuuuO......","....g........OGGGGO.......",".............OggggO.......","..........................","..........................",".........................."],["..........................","..........................","..........................","..........................","...........OOOO...........",".....OM...OUUUUO..........",".....OM..OUUUUUUO.........",".....OM.OUUUUUUUO.........",".....OM.OUUUUUUUBBBO......",".....OM.OuussSSSSsO.......",".....OM.OuSSSSSOSSSO......",".....OM.OsSSSSSssO........","....ObbcOssssssO..........","....Obcc.OssssO...........",".OS.Obbc.OUUuuURRuO.......",".OSs...OUUUUUUUUUUO.SsO...","..OuU..OuUUUUUUuuuO.SsO...","...Ou...OuUUUUUUuuuO......",".......OBBBBBBMMBBO.......",".......OuUUUUUUuuuO.......",".......OuUUUUUUuuuO.......","........OuUUUUUUuO........","........OuUUUUUUuO........","........Ouu..UUUUO........","........Ouu..UUUUO........",".......Ouu...WWWWO........",".......Ouu...uuuuO........",".....OGGGO...OuuuuO.......",".....OgggO...OuuuuO.......",".............OGGGGO.......",".............OggggO.......","..........................","..........................",".........................."],["..........................","..........................","..........................","..........................","...........OOOO...........",".....OM...OUUUUO..........",".....OM..OUUUUUUO.........",".....OM.OUUUUUUUO.........",".....OM.OUUUUUUUBBBO......",".....OM.OuussSSSSsO.......",".....OM.OuSSSSSOSSSO......",".....OM.OsSSSSSssO........","....ObbcOssssssO..........","....Obcc.OssssO...........",".OS.Obbc.OUUuuURRuO.......",".OSs...OUUUUUUUUUUO.SsO...","..OuU..OuUUUUUUuuuO.SsO...","...Ou...OuUUUUUUuuuO......",".......OBBBBBBMMBBO.......",".......OuUUUUUUuuuO.......",".......OuUUUUUUuuuO.......","........OuUUUUUUuO........","........OuUUUUUUuO........",".........Ouu.UUUUO........",".........Ouu.UUUUO........",".........Ouu.WWWWO........",".........Ouu.uuuuO........",".........Ouu.uuuuO........",".........Ouu.uuuuO........",".............OuuuuO.......",".............OGGGGO.......",".............OggggO.......","..........................",".........................."],["..........................","..........................","..........................","..........................","...........OOOO...........",".....OM...OUUUUO..........",".....OM..OUUUUUUO.........",".....OM.OUUUUUUUO.........",".....OM.OUUUUUUUBBBO......",".....OM.OuussSSSSsO.......",".....OM.OuSSSSSOSSSO......",".....OM.OsSSSSSssO........","....ObbcOssssssO..........","....Obcc.OssssO...........",".OS.Obbc.OUUuuURRuO.......",".OSs...OUUUUUUUUUUO.SsO...","..OuU..OuUUUUUUuuuO.SsO...","...Ou...OuUUUUUUuuuO......",".......OBBBBBBMMBBO.......",".......OuUUUUUUuuuO.......",".......OuUUUUUUuuuO.......","........OuUUUUUUuO........","........OuUUUUUUuO........","........Ouuu.UUUUO........","........Ouuu.UUUUO........","........Ouuu.WWWWO........",".......Ouuu..WWWWO........","......Ouuu...uuuuO........",".....OGGGO...uuuuO........",".....OgggO...OuuuuO.......","...........OGGGGO.........","...........OggggO.........","..........................",".........................."],["..........................","..........................","..........................","..........................","...........OOOO...........",".....OM...OUUUUO..........",".....OM..OUUUUUUO.........",".....OM.OUUUUUUUO.........",".....OM.OUUUUUUUBBBO......",".....OM.OuussSSSSsO.......",".....OM.OuSSSSSOSSSO......",".....OM.OsSSSSSssO........","....ObbcOssssssO..........","....Obcc.OssssO...........",".OS.Obbc.OUUuuURRuO.......",".OSs...OUUUUUUUUUUO.SsO...","..OuU..OuUUUUUUuuuO.SsO...","...Ou...OuUUUUUUuuuO......",".......OBBBBBBMMBBO.......",".......OuUUUUUUuuuO.......",".......OuUUUUUUuuuO.......","........OuUUUUUUuO........","........OuUUUUUUuO........","........Ouu..UUUUO........",".......Ouu...UUUUO........","......Ouu.....WWWWO.......",".....Ouu......uuuuO.......","....Ouu.......uuuuO.......","...Ouuu.......uuuuO.......","...Ouuu.......OuuuuO......","..OGGGO.......OGGGGO......","..OgggO.......OggggO......","...g...........g..........",".........................."]],"wade":[["..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","...OM...OUUUUUUUO.........","...OM...OUUUUUUBBBO.......","...OM..OuussSSSSsO........","...OM..OuSSSSSOSSSO.......",".......OsSSSSSssO.........","...Obbc.OssssssO..........","...Obcc..OssssO...........","...Obbc..OUUuuRRuO........",".....OUUUUUUUUUUO.........",".....OuUUUUUUUUSSO........",".....OuUUUUUUUuSsO........",".....OuUUUUUUUUuuO........",".....OBBBBBBBBMMO.........",".....OuUUUUUUUUuO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........",".......OUUU.uuuuO.........","......OUUU..uuuuO.........","......OUU...WWWWO.........",".....OUU.....WWWWO........",".....OUU.....uuuuO........","....OGGGO....uuuuO........","....OgggO....OuuuuO.......",".............OuuuuO.......",".............OGGGGO.......",".............OggggO.......","..........................",".........................."],["..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","...OM...OUUUUUUUO.........","...OM...OUUUUUUBBBO.......","...OM..OuussSSSSsO........","...OM..OuSSSSSOSSSO.......",".......OsSSSSSssO.........","...Obbc.OssssssO..........","...Obcc..OssssO...........","...Obbc..OUUuuRRuO........",".....OUUUUUUUUUUO.........",".....OuUUUUUUUUuO.........",".....OuUUUUUUUUuO.........",".....OuUUUUUUSSuO.........",".....OBBBBBBSSMMO.........",".....OuUUUUUUUUuO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........",".......Ouuu.UUUUO.........","......Ouuu..UUUUO.........","......Ouu...WWWWO.........",".....Ouu.....WWWWO........",".....Ouu.....uuuuO........","....OGGGO....uuuuO........","....OgggO....OuuuuO.......",".............OuuuuO.......",".............OGGGGO.......",".............OggggO.......","..........................",".........................."],["..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","...OM...OUUUUUUUO.........","...OM...OUUUUUUBBBO.......","...OM..OuussSSSSsO........","...OM..OuSSSSSOSSSO.......",".......OsSSSSSssO.........","...Obbc.OssssssO..........","...Obcc..OssssO...........","...Obbc..OUUuuRRuO........",".....OUUUUUUUUUUO.........",".....OuUUUUUUUUuO.........","....OSSuUUUUUUUuuO........",".....OuUUUUUUUUuuO........",".....OBBBBBBBBMMO.........",".....OuUUUUUUUUuO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........",".......OUUU.uuuuO.........","......OUUU..uuuuO.........","......OUU...WWWWO.........",".....OUU.....WWWWO........",".....OUU.....uuuuO........","....OGGGO....uuuuO........","....OgggO....OuuuuO.......",".............OuuuuO.......",".............OGGGGO.......",".............OggggO.......","..........................",".........................."],["..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUUUUUO.........","...OM...OUUUUUUUO.........","...OM...OUUUUUUBBBO.......","...OM..OuussSSSSsO........","...OM..OuSSSSSOSSSO.......",".......OsSSSSSssO.........","...Obbc.OssssssO..........","...Obcc..OssssO...........","...Obbc..OUUuuRRuO........",".....OUUUUUUUUUUO.........",".....OuUUUUUUUUuO.........",".....OuUUUUUUUUSSO........",".....OuUUUUUUUusSO........",".....OBBBBBBBBMMO.........",".....OuUUUUUUUUuO.........","......OuuuuuuuuuuO........",".......OuUUUUUUUuO........","........OuUUUUUUO.........",".......Ouuu.UUUUO.........","......Ouuu..UUUUO.........","......Ouu...WWWWO.........",".....Ouu.....WWWWO........",".....Ouu.....uuuuO........","....OGGGO....uuuuO........","....OgggO....OuuuuO.......",".............OuuuuO.......",".............OGGGGO.......",".............OggggO.......","..........................",".........................."]],"salute":[["..........................","..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBO.......","..OMMO.OssSSSSSSssO.......","..OMMO.OSSOSSSSOSSO.......","..OBBOcOsSSSSSSSSsOSsO....","..OBBOcOSSSSSSSSSsOSsO....","..OBBOcccOssssssO..UUO....","..OBBObbbOssssssO..UUO....","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuuUO.....",".....OUuUUUUUBBUuuuUO.....",".....OSsBBBBMMBBBBBUO.....",".....OSsUUUUUUUUuuuUO.....","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................","..........................",".........................."],["..........................","..........................","..OMO......OOOO...........","..OMMO....OUUUUO..........","..OMMO...OUUrRUUO.........","..OMMO..OUUUURRUUUO.......","..OMMO.OBBBBBBBBBBOSsO....","..OMMO.OssSSSSSSssOSsO....","..OMMO.OSSOSSSSOSSOUUO....","..OBBOcOsSSSSSSSSsOUUO....","..OBBOcOSSSSSSSSSsOUUO....","..OBBOcccOssssssO..UUO....","..OBBObbbOssssssO..UUO....","..ObcOUBBRRuuuuRRuuUOcbO..","..ObbOUuUBBUUUUUuuuUObbO..",".....OUuUUUBBUUUuuuUO.....",".....OUuUUUUUBBUuuuUO.....",".....OSsBBBBMMBBBBBUO.....",".....OSsUUUUUUUUuuuUO.....","......OuuuuuuuuuuuuO......",".......OuUUUUUUUUuO.......",".......OUUUU..UUUUO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OWWWW..WWWWO.......",".......Ouuuu..uuuuO.......",".......OUUUU..UUUUO.......","......OGGGGO..OGGGGO......","......OggggO..OggggO......","..........................","..........................",".........................."]],"rest":[["..........................","..........................","..........................","..........................","..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUrRUUO.........","........OUUURRUUUO........",".......OBBBBBBBBBBO.......",".......OssOSSSSOssO.......",".......OsSSSSSSSSsO.......",".......ccOssssssOcc.......",".......bbOssssObb.........","..ObcOUHHUUUUUUMMuuUOcbO..","..ObbOUuUUUUUUBBUuuuUObbO.",".....OUuUUUBBSSSuuuUO.....",".....OUuUBBUUUUUuuuUO.....",".....OUBBUUUUUUUUuuUO.....","......OuuUUUUUUUUuuO......",".....OUUuuuuuuuuUUO.......",".....OUWWuuuuuuuuWWUO.....",".....OuWWuuuuuuuuWWuO.....","......OuWuuuuuuuuWuO......",".......OuuuuuuuuuuO.......","......OGGggggggggGGO......","......OggggggggggggO......",".......OggggggggO.........","..........................","..........................","..........................","..........................",".........................."],["..........................","..........................","..........................","..........................","..........................","..........................","..........................","...........OOOO...........","..........OUUUUO..........",".........OUUrRUUO.........","........OUUURRUUUO........",".......OBBBBBBBBBBO.......",".......OssOSSSSOssO.......",".......OsSSSSSSSSsO.......",".......ccOssssssOcc.......",".......bbOssssObb.........","..ObcOUHHUUUUUUMMuuUOcbO..","..ObbOUuUUUUUUBBUuuuUObbO.",".....OUuUUUBBSSSuuuUO.....",".....OUuUBBUUUUUuuuUO.....",".....OUBBUUUUUUUUuuUO.....","......OuuUUUUUUUUuuO......",".....OUUuuuuuuuuUUO.......",".....OUWWuuuuuuuuWWUO.....",".....OuWWuuuuuuuuWWuO.....","......OuWuuuuuuuuWuO......",".......OuuuuuuuuuuO.......","......OGGggggggggGGO......","......OggggggggggggO......",".......OggggggggO.........","..........................","..........................","..........................",".........................."]]};
function makeFrame(rows){var c=document.createElement("canvas");c.width=W;c.height=H;var g=c.getContext("2d");for(var y=0;y<H;y++){var row=rows[y]||"";for(var x=0;x<W;x++){var ch=row.charAt(x);if(!ch||ch==="."){continue;}var col=PAL[ch];if(!col){continue;}g.fillStyle=col;g.fillRect(x,y,1,1);}}return c;}
var anims={};
for(var k in FRAME_DATA){if(Object.prototype.hasOwnProperty.call(FRAME_DATA,k)){anims[k]={frames:FRAME_DATA[k].map(makeFrame)};}}
window.RED_ARMY_SPRITE={SCALE:1,W:W,H:H,FPS:8,anims:anims,
  draw:function(ctx,name,fi,x,y,flip){var a=anims[name];if(!a||!a.frames.length){return false;}var n=a.frames.length;var i=((fi%n)+n)%n;var c=a.frames[i];ctx.save();if(flip){ctx.translate(x+W,y);ctx.scale(-1,1);ctx.drawImage(c,0,0);}else{ctx.drawImage(c,x,y);}ctx.restore();return true;}
};
  return { dispose: function () { deleteGlobal('RED_ARMY_SPRITE'); } };
}
/* ================= 模块三：游戏主控（mount 化 + 完成回调/running 标志/监听跟踪；任务逻辑与源文件逐字节一致） ================= */
function mountGame(rootEl, opts) {
  'use strict';
  var MAP = window.CAOGAO_MAP, SPR = window.RED_ARMY_SPRITE;
  if (!MAP || !SPR) return;

  /* ===== 模块化改造新增：完成回调 / 主游戏记分 / 关闭上报挂钩 ===== */
  var __opts = opts || {};
  var __finished = false;
  function __finish() {
    if (__finished) return;
    __finished = true;
    var result = { collected: collected, elapsedSec: Math.round(gameTime * 10) / 10, total: plants.length, win: collected >= TARGET, target: TARGET };
    try {
      /* 主游戏兼容：GameState 可能是顶层 const（不在 window 上），两种宿主都解析 */
      var GS = null;
      if (window.GameState && window.GameState.recordBattleScore) GS = window.GameState;
      else if (typeof GameState !== 'undefined' && GameState && GameState.recordBattleScore) GS = GameState;
      if (__opts.nodeId !== undefined && __opts.nodeId !== null && GS && (!__opts.successOnly || result.win)) {
        GS.recordBattleScore(__opts.nodeId, Math.max(60, Math.min(95, 55 + collected * 5)), '青稞采集');
      }
    } catch (e) {}
    if (typeof __opts.onDone === 'function') { try { __opts.onDone(result); } catch (e) {} }
  }
  var ROOT = document.getElementById('caogao-crossing');
  var canvas = document.getElementById('cc-canvas');
  var ctx = canvas.getContext('2d');
  var TILE = MAP.TILE, COLS = MAP.COLS, ROWS = MAP.ROWS;
  var WORLD_W = MAP.WORLD_W, WORLD_H = MAP.WORLD_H;
  var questEl = document.getElementById('cc-quest');
  var terrEl = document.getElementById('cc-terrain');
  var bannerEl = document.getElementById('cc-banner');
  var sndBtn = document.getElementById('cc-sound');
  var btnHarvest = document.getElementById('cc-btn-harvest');
  var hintEl = document.getElementById('cc-touch-hint');

  /* ---------- 基本参数 ---------- */
  var TARGET = 8, HARVEST_RANGE = 44, HARVEST_DUR = 1.4, REGROW_SEC = 45;
  var SPEED_WALK = 70, SPEED_MARCH = 108, MUD_K = 0.45, WET_K = 0.88;
  var BARLEY_SEED = 19351012;
  var IS_TOUCH = (typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) ||
                 ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  if (/touch=1/.test(location.search)) IS_TOUCH = true;
  if (/touch=0/.test(location.search)) IS_TOUCH = false;
  var terrNames = { grass: '草甸', wet: '湿草', mud: '泥潭', water: '水潭' };

  /* ---------- 视口（DPR 上限 2；触屏 420 宽逻辑分辨率保帧率） ---------- */
  var VIEW_W = 480, VIEW_H = 300, DPR = 1;
  var ZOOMS = [1, 1.25, 1.5], zoomIdx = 1;
  function computeView() {
    var z = ZOOMS[zoomIdx];
    DPR = Math.min(2, window.devicePixelRatio || 1);
    if (IS_TOUCH) {
      var vw = Math.max(1, window.innerWidth), vh = Math.max(1, window.innerHeight);
      VIEW_W = Math.round(420 / z);
      VIEW_H = Math.max(240, Math.min(620, Math.round(VIEW_W * vh / vw)));
    } else {
      VIEW_W = Math.round(480 / z); VIEW_H = Math.round(300 / z);
    }
    canvas.width = Math.round(VIEW_W * DPR);
    canvas.height = Math.round(VIEW_H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    MAP.setViewSize(VIEW_W, VIEW_H);
    if (player) MAP.setCamera(player.x - VIEW_W / 2, player.y - VIEW_H / 2);
  }
  function setZoom(i) {
    var n = Math.max(0, Math.min(ZOOMS.length - 1, i));
    if (n === zoomIdx) return;
    zoomIdx = n;
    computeView();
  }
  canvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    setZoom(zoomIdx + (e.deltaY > 0 ? -1 : 1));
  }, { passive: false });
  function applyMode() {
    if (ROOT.classList) ROOT.classList.toggle('touch', IS_TOUCH);
    computeView();
  }

  /* ---------- 音频（WebAudio 合成，静音开关） ---------- */
  function hostMuted() { return typeof AudioControl43 !== 'undefined' && AudioControl43.muted === true; }
  var audio = { ctx: null, muted: false };
  function ensureAudio() {
    if (hostMuted()) return;
    if (!audio.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) { try { audio.ctx = new AC(); } catch (e) { audio.ctx = null; } }
    }
    if (audio.ctx && audio.ctx.state === 'suspended') { try { audio.ctx.resume(); } catch (e) {} }
  }
  function tone(freq, at, dur, vol) {
    var ac = audio.ctx; if (!ac) return;
    var o = ac.createOscillator(), gn = ac.createGain();
    o.type = 'triangle'; o.frequency.value = freq;
    gn.gain.setValueAtTime(0.0001, at);
    gn.gain.exponentialRampToValueAtTime(vol, at + 0.015);
    gn.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(gn); gn.connect(ac.destination);
    o.start(at); o.stop(at + dur + 0.03);
  }
  function sndHarvest() {
    if (hostMuted() || audio.muted || !audio.ctx || audio.ctx.state !== 'running') return;
    var t0 = audio.ctx.currentTime;
    tone(880, t0, 0.10, 0.16); tone(1318.5, t0 + 0.07, 0.15, 0.13);
  }
  function sndQuest() {
    if (hostMuted() || audio.muted || !audio.ctx || audio.ctx.state !== 'running') return;
    var t0 = audio.ctx.currentTime;
    tone(659.3, t0, 0.12, 0.14); tone(880, t0 + 0.10, 0.12, 0.14); tone(1318.5, t0 + 0.20, 0.22, 0.15);
  }
  sndBtn.addEventListener('click', function () {
    audio.muted = !audio.muted;
    sndBtn.textContent = audio.muted ? '声音:关' : '声音:开';
    if (!audio.muted) ensureAudio();
    sndBtn.blur();
  });

  /* ---------- 青稞像素画（手写像素矩阵，11 色，一丛 4 株，16x20，两帧轻摆 + 短茬状态） ---------- */
  var B_PAL = {
    g: '#8a9a4a', G: '#66763a', l: '#a9b85c',
    y: '#d9b44a', Y: '#e8cd7a', u: '#9aa84a',
    d: '#7a5c38', D: '#57422a', m: '#93744c', h: '#b09254', H: '#8a6f42'
  };
  var B_A = [
    ".........w......",
    "........w.......",
    ".........Y......",
    ".........y......",
    "........gY......",
    "....w...g.y.....",
    ".....Y..g.u.w...",
    "....gy..g...gY..",
    "....gY..g...gy..",
    "....g.y.g...gY..",
    "....g.u.gl..g.y.",
    "...lg..ug...g.u.",
    "....g..ug...g...",
    "....G.gug..lg...",
    "....g.g.g...g...",
    "....G.G.g...G...",
    "..dDd.dDd.dDd...",
    ".dDDmDDmDDmDDd..",
    "..DDmDDmDDmDD...",
    "...DDDDDDDDDD..."
  ];
  var B_STUB = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "....h...h...h...",
    "....h.h.h...h...",
    "....H.h.H...h...",
    "....H.h.H...H...",
    "..dDd.dDd.dDd...",
    ".dDDmDDmDDmDDd..",
    "..DDmDDmDDmDD...",
    "...DDDDDDDDDD..."
  ];
  function bake(rows) {
    var c = document.createElement('canvas'); c.width = 16; c.height = 20;
    var g = c.getContext('2d');
    for (var y = 0; y < 20; y++) {
      var row = rows[y] || '';
      for (var x = 0; x < 16; x++) {
        var ch = row.charAt(x);
        if (!ch || ch === '.') continue;
        var col = B_PAL[ch];
        if (!col) continue;
        g.fillStyle = col; g.fillRect(x, y, 1, 1);
      }
    }
    return c;
  }
  function mirror(src) {
    var c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    var g = c.getContext('2d');
    g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
    return c;
  }
  /* 两帧轻摆：穗头（地面以上 16px）整体左右 1px，土壤不动 */
  function swayOf(src, dx) {
    var c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    var g = c.getContext('2d');
    g.drawImage(src, 0, 0, 16, 16, dx, 0, 16, 16);
    g.drawImage(src, 0, 16, 16, 4, 0, 16, 16, 4);
    return c;
  }
  var baseA = bake(B_A), baseB = mirror(baseA);
  var stubA = bake(B_STUB), stubB = mirror(stubA);
  var barleyFrames = [
    [swayOf(baseA, -1), swayOf(baseA, 1)],
    [swayOf(baseB, -1), swayOf(baseB, 1)]
  ];
  var stubFrames = [stubA, stubB];

  /* ---------- 玩家（出生点：世界中部 5x5 全为草甸/湿草的安全点） ---------- */
  function findSpawn() {
    var cx = (COLS / 2) | 0, cy = (ROWS / 2) | 0;
    for (var r = 0; r < 50; r++) {
      for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        var tx = cx + dx, ty = cy + dy, ok = true;
        for (var oy = -2; oy <= 2 && ok; oy++) for (var ox = -2; ox <= 2; ox++) {
          var t = MAP.terrainAt(tx + ox, ty + oy);
          if (t !== 'grass' && t !== 'wet') { ok = false; break; }
        }
        if (ok) return { x: tx * TILE + 16, y: ty * TILE + 22 };
      }
    }
    return { x: WORLD_W / 2, y: WORLD_H / 2 };
  }
  var spawnPoint = findSpawn();
  var player = { x: spawnPoint.x, y: spawnPoint.y, dir: 'down', anim: 'idle', frame: 0, moving: false, marching: false };

  /* ---------- 青稞布局：固定种子生成 10-14 簇（每簇 4-8 株，簇间距 >= 6 图块，避开泥心/水潭） ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var plants = [], clusterCount = 0;
  function goodClusterTile(tx, ty) {
    if (tx < 3 || ty < 3 || tx > COLS - 4 || ty > ROWS - 4) return false;
    var t0 = MAP.terrainAt(tx, ty);
    if (t0 !== 'grass' && t0 !== 'wet') return false;
    for (var oy = -2; oy <= 2; oy++) for (var ox = -2; ox <= 2; ox++) {
      var t = MAP.terrainAt(tx + ox, ty + oy);
      if (t === 'water' || t === 'mud') return false;
    }
    return true;
  }
  function placeCluster(tx, ty, n, rng) {
    var placed = 0, guard = 0;
    while (placed < n && guard < 50) {
      guard++;
      var a = rng() * 6.2832, rr = 5 + rng() * 30;
      var px = tx * TILE + 16 + Math.cos(a) * rr;
      var py = ty * TILE + 20 + Math.sin(a) * rr * 0.8;
      var t = MAP.terrainAt((px / TILE) | 0, (py / TILE) | 0);
      if (t !== 'grass' && t !== 'wet') continue;
      if (Math.abs(px - player.x) < 30 && Math.abs(py - player.y) < 30) continue;
      var near = false;
      for (var j = plants.length - 1, jEnd = Math.max(-1, plants.length - 14); j > jEnd; j--) {
        var qx = plants[j].x - px, qy = plants[j].y - py;
        if (qx * qx + qy * qy < 150) { near = true; break; }
      }
      if (near) continue;
      plants.push({ id: plants.length, x: px, y: py, v: rng() < 0.5 ? 0 : 1, state: 'ripe', fade: 1, regrowAt: 0 });
      placed++;
    }
  }
  function ensureNearby(centers, rng) {
    var best = 1e18, i, p;
    for (i = 0; i < plants.length; i++) {
      p = plants[i];
      var dx = p.x - player.x, dy = p.y - player.y;
      var d2 = dx * dx + dy * dy;
      if (d2 < best) best = d2;
    }
    if (best <= 340 * 340) return;
    for (var r = 5; r <= 18; r++) {
      for (var dy2 = -r; dy2 <= r; dy2++) for (var dx2 = -r; dx2 <= r; dx2++) {
        if (Math.max(Math.abs(dx2), Math.abs(dy2)) !== r) continue;
        var tx = ((player.x / TILE) | 0) + dx2, ty = ((player.y / TILE) | 0) + dy2;
        if (!goodClusterTile(tx, ty)) continue;
        var tooClose = false;
        for (i = 0; i < centers.length; i++) {
          var cx = centers[i].tx - tx, cy = centers[i].ty - ty;
          if (cx * cx + cy * cy < (r > 12 ? 16 : 36)) { tooClose = true; break; }
        }
        if (tooClose) continue;
        centers.push({ tx: tx, ty: ty });
        placeCluster(tx, ty, 6, rng);
        clusterCount = centers.length;
        return;
      }
    }
  }
  function genBarley() {
    var rng = mulberry32(BARLEY_SEED);
    var centers = [], tries = 0;
    while (centers.length < 14 && tries < 7000) {
      tries++;
      var tx = 4 + ((rng() * (COLS - 8)) | 0);
      var ty = 4 + ((rng() * (ROWS - 8)) | 0);
      if (!goodClusterTile(tx, ty)) continue;
      var ok = true, i;
      for (i = 0; i < centers.length; i++) {
        var ddx = centers[i].tx - tx, ddy = centers[i].ty - ty;
        if (ddx * ddx + ddy * ddy < 36) { ok = false; break; }
      }
      if (!ok) continue;
      centers.push({ tx: tx, ty: ty });
      placeCluster(tx, ty, 4 + ((rng() * 5) | 0), rng);
    }
    clusterCount = centers.length;
    ensureNearby(centers, rng);
  }

  /* ---------- 碰撞 / 方向 ---------- */
  function canStand(x, y) {
    if (x < 12 || y < 18 || x > WORLD_W - 12 || y > WORLD_H - 4) return false;
    var pts = [[-5, 1], [5, 1], [-5, 5], [5, 5], [0, 6]];
    for (var i = 0; i < pts.length; i++) {
      if (MAP.isSolid((x + pts[i][0]) / TILE, (y + pts[i][1]) / TILE)) return false;
    }
    return true;
  }
  function dirOf(vx, vy, prev) {
    if (Math.abs(vx) > Math.abs(vy)) return vx > 0 ? 'right' : 'left';
    if (Math.abs(vy) > Math.abs(vx)) return vy > 0 ? 'down' : 'up';
    return prev;
  }

  /* ---------- 输入：键盘（WASD/方向键/Shift/E/空格/Q/R） ---------- */
  var keys = {};
  var harvest = { active: false, t: 0, plant: null };
  var saluteT = 0;
  var rest = { active: false };
  function tryHarvest() {
    if (harvest.active || saluteT > 0) return;
    var p = nearestRipe(HARVEST_RANGE);
    if (p) startHarvest(p);
  }
  function startHarvest(p) {
    harvest.active = true; harvest.t = 0; harvest.plant = p;
    rest.active = false; saluteT = 0;
    var dx = p.x - player.x, dy = p.y - player.y;
    player.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    player.moving = false; player.marching = false;
  }
  onWin('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if (k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright' || k === ' ') e.preventDefault();
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
    keys[k] = true;
    if (e.repeat) return;
    ensureAudio();
    if (k === 'e' || k === ' ') tryHarvest();
    else if (k === 'q') { if (saluteT <= 0 && !harvest.active) { saluteT = 1.6; rest.active = false; } }
    else if (k === 'r') { if (!harvest.active) { rest.active = !rest.active; saluteT = 0; } }
    else if (k === 'z') { setZoom((zoomIdx + 1) % ZOOMS.length); }
  });
  onWin('keyup', function (e) { keys[(e.key || '').toLowerCase()] = false; });
  onWin('blur', function () {
    for (var k in keys) keys[k] = false;
    joy.id = null; joy.active = false; joy.nx = 0; joy.ny = 0; joy.mag = 0; joy.kx = 0; joy.ky = 0;
  });

  /* ---------- 输入：触屏（左半屏动态摇杆 + 右下采摘按钮 + 点按采摘） ---------- */
  var joy = { id: null, active: false, ox: 0, oy: 0, nx: 0, ny: 0, mag: 0, kx: 0, ky: 0 };
  var tap = null;
  function evtLogical(e) {
    var r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * VIEW_W / Math.max(1, r.width), y: (e.clientY - r.top) * VIEW_H / Math.max(1, r.height) };
  }
  canvas.addEventListener('pointerdown', function (e) {
    ensureAudio();
    var pnt = evtLogical(e);
    if (IS_TOUCH && e.pointerType !== 'mouse' && pnt.x < VIEW_W * 0.55 && joy.id === null) {
      joy.id = e.pointerId; joy.active = true;
      joy.ox = pnt.x; joy.oy = pnt.y;
      joy.nx = 0; joy.ny = 0; joy.mag = 0; joy.kx = 0; joy.ky = 0;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      e.preventDefault();
      return;
    }
    tap = { id: e.pointerId, x: pnt.x, y: pnt.y, moved: false };
  });
  canvas.addEventListener('pointermove', function (e) {
    if (joy.id === e.pointerId) {
      var pnt = evtLogical(e);
      var dx = pnt.x - joy.ox, dy = pnt.y - joy.oy;
      var d = Math.hypot(dx, dy);
      if (d > 0.001) { joy.nx = dx / d; joy.ny = dy / d; }
      joy.mag = d <= 5 ? 0 : Math.min(1, (d - 5) / 33);
      var cl = Math.min(d, 38);
      joy.kx = d > 0.001 ? joy.nx * cl : 0;
      joy.ky = d > 0.001 ? joy.ny * cl : 0;
      e.preventDefault();
      return;
    }
    if (tap && tap.id === e.pointerId) {
      var p2 = evtLogical(e);
      if (Math.abs(p2.x - tap.x) > 9 || Math.abs(p2.y - tap.y) > 9) tap.moved = true;
    }
  });
  function endPointer(e) {
    if (joy.id === e.pointerId) {
      joy.id = null; joy.active = false; joy.nx = 0; joy.ny = 0; joy.mag = 0; joy.kx = 0; joy.ky = 0;
      return;
    }
    if (tap && tap.id === e.pointerId) {
      if (!tap.moved) tapHarvest(tap.x, tap.y);
      tap = null;
    }
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  function tapHarvest(sx, sy) {
    var w = MAP.screenToWorld(sx, sy);
    var best = null, bd = 20 * 20, i, p;
    for (i = 0; i < plants.length; i++) {
      p = plants[i];
      if (p.state !== 'ripe' || p.fade < 1) continue;
      var dx = p.x - w.x, dy = (p.y - 10) - w.y;
      var d2 = dx * dx + dy * dy;
      if (d2 <= bd) { bd = d2; best = p; }
    }
    if (!best) best = nearestRipe(HARVEST_RANGE);
    if (!best || harvest.active || saluteT > 0) return;
    var pdx = best.x - player.x, pdy = best.y - player.y;
    if (pdx * pdx + pdy * pdy <= HARVEST_RANGE * HARVEST_RANGE) startHarvest(best);
  }
  btnHarvest.addEventListener('pointerdown', function (e) {
    e.preventDefault(); e.stopPropagation();
    ensureAudio();
    tryHarvest();
  });
  btnHarvest.addEventListener('click', function (e) { e.preventDefault(); btnHarvest.blur(); });
  document.getElementById('cc-zin').addEventListener('click', function () { setZoom(zoomIdx + 1); });
  document.getElementById('cc-zout').addEventListener('click', function () { setZoom(zoomIdx - 1); });
  /* 禁止页面滚动 / 双击缩放 / 长按菜单（仅限本组件范围） */
  onDoc('touchmove', function (e) {
    if (e.target && e.target.closest && e.target.closest('#caogao-crossing')) e.preventDefault();
  }, { passive: false });
  canvas.addEventListener('dblclick', function (e) { e.preventDefault(); });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  onDoc('gesturestart', function (e) { e.preventDefault(); });
  onWin('touchstart', function onTS() {
    window.removeEventListener('touchstart', onTS);
    if (!IS_TOUCH) { IS_TOUCH = true; applyMode(); }
  }, { passive: true });

  /* ---------- 采摘逻辑 ---------- */
  var collected = 0, bannerShown = false, harvestEvents = 0;
  var nearPlant = null;
  function nearestRipe(range) {
    var best = null, bd = range * range;
    for (var i = 0; i < plants.length; i++) {
      var p = plants[i];
      if (p.state !== 'ripe' || p.fade < 1) continue;
      var dx = p.x - player.x, dy = (p.y - 2) - player.y;
      var d2 = dx * dx + dy * dy;
      if (d2 <= bd) { bd = d2; best = p; }
    }
    return best;
  }
  function finishHarvest(p, silent) {
    if (!p || p.state !== 'ripe') { harvest.active = false; harvest.plant = null; return; }
    p.state = 'stubble'; p.fade = 1; p.regrowAt = gameTime + REGROW_SEC;
    collected++; harvestEvents++;
    spawnChaff(p);
    addFloat(p.x, p.y - 24, '+1 青稞');
    if (!silent) sndHarvest();
    harvest.active = false; harvest.plant = null;
    updateQuest();
  }
  function forceHarvest(idx) {
    var p = null, i;
    if (typeof idx === 'number' && plants[idx]) p = plants[idx];
    if (!p) {
      var bd = 1e18;
      for (i = 0; i < plants.length; i++) {
        var q = plants[i];
        if (q.state !== 'ripe') continue;
        var dx = q.x - player.x, dy = q.y - player.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < bd) { bd = d2; p = q; }
      }
    }
    if (!p || p.state !== 'ripe') return false;
    if (harvest.active && harvest.plant === p) { harvest.active = false; harvest.plant = null; }
    finishHarvest(p, true);
    return true;
  }
  function updateQuest() {
    if (collected >= TARGET) questEl.textContent = '青稞 ' + collected + ' · 已集齐';
    else questEl.textContent = '青稞 ' + collected + '/' + TARGET;
    if (collected >= TARGET && !bannerShown) {
      bannerShown = true;
      bannerEl.classList.add('show');
      sndQuest();
      __finish();   /* 模块化改造新增：集满即结束上报（onDone + 自动记分） */
      setTimeout(function () { bannerEl.classList.remove('show'); }, 4200);
    }
  }

  /* ---------- 粒子 / 飘字 ---------- */
  var particles = [], floats = [];
  function spawnMud() {
    if (particles.length > 70) return;
    for (var i = 0; i < 2; i++) {
      particles.push({
        x: player.x + (Math.random() * 10 - 5), y: player.y + 2,
        vx: Math.random() * 36 - 18, vy: -30 - Math.random() * 34, g: 190,
        life: 0.45 + Math.random() * 0.2,
        c: Math.random() < 0.5 ? 'rgba(74,58,38,0.9)' : 'rgba(110,84,54,0.9)',
        s: Math.random() < 0.5 ? 2 : 1
      });
    }
  }
  function spawnChaff(p) {
    for (var i = 0; i < 6 && particles.length < 80; i++) {
      particles.push({
        x: p.x + Math.random() * 10 - 5, y: p.y - 14 - Math.random() * 6,
        vx: Math.random() * 36 - 18, vy: -18 - Math.random() * 30, g: 80,
        life: 0.6 + Math.random() * 0.3,
        c: i % 2 ? '#e8cd7a' : '#d9b44a',
        s: Math.random() < 0.4 ? 2 : 1
      });
    }
  }
  function addFloat(x, y, text) { floats.push({ x: x, y: y, text: text, t: 0 }); }

  /* ---------- 更新 ---------- */
  var gameTime = 0, walkT = 0, mudPartT = 0;
  function inputVector() {
    var ix = 0, iy = 0;
    if (keys['a'] || keys['arrowleft']) ix -= 1;
    if (keys['d'] || keys['arrowright']) ix += 1;
    if (keys['w'] || keys['arrowup']) iy -= 1;
    if (keys['s'] || keys['arrowdown']) iy += 1;
    if (ix || iy) {
      var m = Math.hypot(ix, iy);
      return { x: ix / m, y: iy / m, mag: 1, analog: false };
    }
    if (joy.active && joy.mag > 0.12) return { x: joy.nx, y: joy.ny, mag: joy.mag, analog: true };
    return null;
  }
  function update(dt) {
    gameTime += dt;
    var i, p;
    for (i = 0; i < plants.length; i++) {
      p = plants[i];
      if (p.state === 'stubble' && gameTime >= p.regrowAt) { p.state = 'ripe'; p.fade = 0; }
      if (p.state === 'ripe' && p.fade < 1) p.fade = Math.min(1, p.fade + dt / 0.9);
    }
    if (saluteT > 0) { saluteT -= dt; if (saluteT < 0) saluteT = 0; }
    if (harvest.active) {
      harvest.t += dt;
      if (harvest.t >= HARVEST_DUR) finishHarvest(harvest.plant, false);
      player.moving = false; player.marching = false;
    } else {
      var inp = inputVector();
      if (inp && rest.active) rest.active = false;
      if (inp && saluteT <= 0) {
        var here = MAP.terrainAt(player.x / TILE, player.y / TILE);
        var k = here === 'mud' ? MUD_K : here === 'wet' ? WET_K : 1;
        var marching = !!keys['shift'] && here !== 'mud' && !inp.analog;
        var spd = (marching ? SPEED_MARCH : SPEED_WALK) * k * inp.mag;
        var nx = player.x + inp.x * spd * dt, ny = player.y + inp.y * spd * dt;
        if (canStand(nx, player.y)) player.x = nx;   /* 分轴滑动碰撞：水潭被挡 */
        if (canStand(player.x, ny)) player.y = ny;
        player.dir = dirOf(inp.x, inp.y, player.dir);
        player.moving = true; player.marching = marching;
        walkT += dt;
        if (here === 'mud') {
          mudPartT -= dt;
          if (mudPartT <= 0) { spawnMud(); mudPartT = 0.16; }
        }
      } else {
        player.moving = false; player.marching = false;
      }
    }
    nearPlant = nearestRipe(HARVEST_RANGE);
    if (btnHarvest.classList) btnHarvest.classList.toggle('near', !!nearPlant);
    var tn = '地形 · ' + (terrNames[MAP.terrainAt(player.x / TILE, player.y / TILE)] || '草甸');
    if (terrEl.textContent !== tn) terrEl.textContent = tn;
    /* 相机平滑跟随（lerp），始终夹取在世界边界内 */
    var tx = player.x - VIEW_W / 2, ty = player.y - VIEW_H * 0.55;
    var kk = 1 - Math.exp(-dt * 5);
    MAP.setCamera(MAP.camera.x + (tx - MAP.camera.x) * kk, MAP.camera.y + (ty - MAP.camera.y) * kk);
    for (i = particles.length - 1; i >= 0; i--) {
      var q = particles[i];
      q.life -= dt;
      if (q.life <= 0) { particles.splice(i, 1); continue; }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    }
    for (i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.15) floats.splice(i, 1); }
  }

  /* ---------- 绘制 ---------- */
  function animState() {
    if (harvest.active) return { name: 'mud', fi: 2 + Math.min(2, (harvest.t / HARVEST_DUR * 3) | 0) };  /* 复用 mud 第 2-4 帧弯腰 */
    if (rest.active) return { name: 'rest', fi: ((gameTime * 2) | 0) % 2 };
    if (saluteT > 0) return { name: 'salute', fi: ((gameTime * 3) | 0) % 2 };
    var here = MAP.terrainAt(player.x / TILE, player.y / TILE);
    if (here === 'mud') return player.moving ? { name: 'mud', fi: ((walkT * 6) | 0) % 6 } : { name: 'mud', fi: 0 };
    if (player.moving) {
      if (player.marching) return { name: 'march', fi: ((walkT * 8) | 0) % 4 };
      var name = player.dir === 'down' ? 'walkDown' : player.dir === 'up' ? 'walkUp' : 'walkSide';
      return { name: name, fi: ((walkT * 9) | 0) % 4, flip: player.dir === 'left' };
    }
    return { name: 'idle', fi: ((gameTime * 3) | 0) % 4 };
  }
  function drawPlayer(camXi, camYi) {
    var px = Math.round(player.x), py = Math.round(player.y);
    ctx.fillStyle = 'rgba(22,26,12,0.32)';
    ctx.fillRect(px - 7 - camXi, py - camYi, 14, 2);
    var a = animState();
    player.anim = a.name; player.frame = a.fi;
    SPR.draw(ctx, a.name, a.fi, px - 13 - camXi, py - 31 - camYi, a.flip);
  }
  function drawPlant(p, camXi, camYi) {
    var sx = Math.round(p.x) - 8 - camXi, sy = Math.round(p.y) - 19 - camYi;
    ctx.fillStyle = 'rgba(22,26,12,0.30)';
    ctx.fillRect(Math.round(p.x) - 7 - camXi, Math.round(p.y) - camYi, 14, 2);
    if (p.state === 'ripe') {
      var fi = ((gameTime * 2 + p.id) | 0) % 2;
      if (p.fade < 1) ctx.globalAlpha = Math.max(0.05, p.fade);
      ctx.drawImage(barleyFrames[p.v][fi], sx, sy);
      ctx.globalAlpha = 1;
    } else {
      ctx.drawImage(stubFrames[p.v], sx, sy);
    }
  }
  function drawHighlight(p, camXi, camYi) {
    var a = 0.62 + 0.38 * Math.sin(gameTime * 6);
    var x = Math.round(p.x) - 10 - camXi, y = Math.round(p.y) - 22 - camYi;
    var w = 20, h = 25, L = 5, T = 2;
    ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
    ctx.fillRect(x, y, L, T); ctx.fillRect(x, y, T, L);
    ctx.fillRect(x + w - L, y, L, T); ctx.fillRect(x + w - T, y, T, L);
    ctx.fillRect(x, y + h - T, L, T); ctx.fillRect(x, y + h - L, T, L);
    ctx.fillRect(x + w - L, y + h - T, L, T); ctx.fillRect(x + w - T, y + h - L, T, L);
    ctx.font = 'bold 10px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    var label = IS_TOUCH ? '采摘' : 'E 采摘';
    var tx0 = Math.round(p.x) - camXi, ty0 = Math.round(p.y) - 27 - camYi;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,16,8,0.85)';
    ctx.strokeText(label, tx0, ty0);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(label, tx0, ty0);
  }
  function drawParticles(camXi, camYi) {
    for (var i = 0; i < particles.length; i++) {
      var q = particles[i];
      ctx.fillStyle = q.c;
      ctx.fillRect(Math.round(q.x) - camXi, Math.round(q.y) - camYi, q.s, q.s);
    }
  }
  function drawFloats(camXi, camYi) {
    ctx.font = 'bold 10px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    for (var i = 0; i < floats.length; i++) {
      var f = floats[i];
      var pr = f.t / 1.15;
      var a = pr < 0.15 ? pr / 0.15 : 1 - Math.max(0, (pr - 0.55) / 0.45);
      var x = Math.round(f.x) - camXi, y = Math.round(f.y - pr * 22) - camYi;
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,16,8,0.85)';
      ctx.strokeText(f.text, x, y);
      ctx.fillStyle = '#fff3c4';
      ctx.fillText(f.text, x, y);
      ctx.globalAlpha = 1;
    }
  }
  function drawJoystick() {
    if (!joy.active || joy.id === null) return;
    ctx.beginPath(); ctx.arc(joy.ox, joy.oy, 34, 0, 6.2832);
    ctx.fillStyle = 'rgba(16,20,12,0.30)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(240,236,214,0.55)'; ctx.stroke();
    ctx.beginPath(); ctx.arc(joy.ox + joy.kx, joy.oy + joy.ky, 14, 0, 6.2832);
    ctx.fillStyle = 'rgba(240,236,214,0.55)'; ctx.fill();
  }
  function minimapOverlay(mg) {
    mg.fillStyle = '#e8cd7a';
    for (var i = 0; i < plants.length; i++) {
      var p = plants[i];
      if (p.state !== 'ripe') continue;
      mg.fillRect((p.x / WORLD_W * 128) | 0, (p.y / WORLD_H * 128) | 0, 1, 1);
    }
    mg.fillStyle = '#ffffff';
    mg.fillRect(Math.round(player.x / WORLD_W * 128) - 1, Math.round(player.y / WORLD_H * 128) - 1, 2, 2);
  }
  function draw() {
    var cam = MAP.camera, camXi = Math.round(cam.x), camYi = Math.round(cam.y);
    MAP.render(gameTime, minimapOverlay);
    var list = [], i;
    for (i = 0; i < plants.length; i++) {
      var p = plants[i];
      if (p.x < camXi - 40 || p.x > camXi + VIEW_W + 40 || p.y < camYi - 40 || p.y > camYi + VIEW_H + 40) continue;
      list.push(p);
    }
    list.push(player);
    list.sort(function (a, b) { return a.y - b.y; });
    for (i = 0; i < list.length; i++) {
      if (list[i] === player) drawPlayer(camXi, camYi);
      else drawPlant(list[i], camXi, camYi);
    }
    if (nearPlant && !harvest.active) drawHighlight(nearPlant, camXi, camYi);
    drawParticles(camXi, camYi);
    drawFloats(camXi, camYi);
    if (harvest.active && harvest.plant) {
      var pw = 34, ph = 5, hbx = Math.round(player.x) - (pw >> 1) - camXi, hby = Math.round(player.y) - 48 - camYi;
      var pr = Math.max(0, Math.min(1, harvest.t / HARVEST_DUR));
      ctx.fillStyle = 'rgba(14,18,10,0.78)'; ctx.fillRect(hbx - 1, hby - 1, pw + 2, ph + 2);
      ctx.fillStyle = '#2a2016'; ctx.fillRect(hbx, hby, pw, ph);
      ctx.fillStyle = '#ffd977'; ctx.fillRect(hbx, hby, Math.round(pw * pr), ph);
      ctx.strokeStyle = 'rgba(222,216,182,0.55)'; ctx.lineWidth = 1; ctx.strokeRect(hbx + 0.5, hby + 0.5, pw - 1, ph - 1);
    }
    drawJoystick();
  }
  function snapCamera() {
    MAP.setCamera(player.x - VIEW_W / 2, player.y - VIEW_H / 2 - 8);
  }

  /* ---------- 初始化 + 唯一主循环 ---------- */
  applyMode();
  genBarley();
  updateQuest();
  snapCamera();
  if (IS_TOUCH) {
    hintEl.style.opacity = '0.95';
    setTimeout(function () { hintEl.style.opacity = '0'; }, 6000);
  }
  onWin('resize', function () { computeView(); });
  /* ===== 模块化改造新增：running 标志 + 可取消 rAF（close 时置 running=false） ===== */
  var running = true, rafId = 0;
  draw();   /* 先出首帧：rAF 被节流的环境也能立刻看到场景 */
  var lastT = performance.now();
  function tick(now) {
    if (!running) return;
    var dt = Math.min(0.05, Math.max(0.001, (now - lastT) / 1000));
    lastT = now;
    update(dt);
    if (!running) return;   /* update 内可能触发 onDone -> close */
    draw();
    rafId = requestAnimationFrame(tick);
  }
  rafId = requestAnimationFrame(tick);

  /* ---------- 自动化测试接口 window.CAOGAO_CROSSING ---------- */
  window.CAOGAO_CROSSING = {
    version: '1.0.0',
    player: player,
    barley: {
      get total() { return plants.length; },
      get collected() { return collected; }
    },
    nearest: function () {
      var p = nearestRipe(HARVEST_RANGE);
      if (!p) return null;
      return { idx: p.id, x: Math.round(p.x), y: Math.round(p.y), dist: Math.round(Math.hypot(p.x - player.x, p.y - player.y)) };
    },
    forceHarvest: forceHarvest,
    teleport: function (x, y) {
      player.x = Math.max(12, Math.min(WORLD_W - 12, x));
      player.y = Math.max(18, Math.min(WORLD_H - 4, y));
      harvest.active = false; harvest.plant = null; saluteT = 0; rest.active = false;
      player.moving = false; player.marching = false;
      snapCamera();
    },
    debug: {
      plants: plants,
      spawn: spawnPoint,
      seed: BARLEY_SEED,
      target: TARGET,
      harvestRange: HARVEST_RANGE,
      clusters: function () { return clusterCount; },
      touch: function () { return IS_TOUCH; },
      stats: {
        get total() { return plants.length; },
        get collected() { return collected; },
        get harvestEvents() { return harvestEvents; },
        get ripe() { var n = 0; for (var i = 0; i < plants.length; i++) if (plants[i].state === 'ripe') n++; return n; }
      }
    }
  };

  /* ===== 模块化改造新增：暴露 stop/finish，供 GrasslandCollect.close() 调用 ===== */
  return {
    finish: __finish,
    stop: function () {
      running = false;
      if (rafId) { try { cancelAnimationFrame(rafId); } catch (e) {} rafId = 0; }
      if (audio.ctx) { try { audio.ctx.close(); } catch (e) {} audio.ctx = null; }
    }
  };
}


/* ---------- open / close（模块化改造新增） ---------- */
var state = null;

/* 打开子游戏：nodeId 用于主游戏记分；onDone(result) 在本局结束时回调一次 */
function open(nodeId, onDone, options) {
  if (state) close();   /* 防重入：已打开先关闭（未结束的一局会先补发 onDone） */
  __listeners = [];

  var overlay = document.createElement('div');
  overlay.id = 'gcm-overlay';
  overlay.innerHTML = '<style>' + OVERLAY_CSS + '</style>'
    + '<div class="gcm-op">SIDE OPERATION · 青稞采集</div>'
    + '<button type="button" class="gcm-exit" title="退出青稞采集">✕ 退出 · ESC</button>'
    + '<div class="gcm-shell"><div id="caogao-crossing">' + STYLE_HTML + STAGE_HTML + '</div></div>';
  document.body.appendChild(overlay);

  var exitBtn = overlay.querySelector('.gcm-exit');
  if (exitBtn) exitBtn.addEventListener('click', function () { close(); });
  /* 主游戏一致性：Esc 退出（与其他子游戏相同；未集满按进度记分） */
  onDoc('keydown', function (e) { if ((e.key || '').toLowerCase() === 'escape') { e.preventDefault(); e.stopPropagation(); close(); } });

  var s = { overlay: overlay, listeners: __listeners, game: null };
  state = s;
  try {
    /* 依次挂载：像素地图 -> 红军精灵 -> 游戏主控（主控依赖前两者的全局接口）。
       画布等 DOM 查询保持全局 id（主游戏页面无同名 id，见 README 约束）。 */
    mountPixelMap(overlay);
    mountRedArmySprite(overlay);
    s.game = mountGame(overlay, { nodeId: nodeId, onDone: onDone, successOnly: !!options?.successOnly });
  } catch (err) {
    try { close(); } catch (e2) {}
    throw err;
  }
  return true;
}

/* 关闭子游戏：停止主循环 -> 补发完成上报 -> 解绑监听 -> 移除遮罩 -> 清理全局名 */
function close() {
  var s = state;
  if (!s) return;
  state = null;
  var mine = s.listeners;
  __listeners = [];   /* 与本会话解耦（onDone 内若再次 open，不影响旧会话清理） */
  if (s.game) {
    try { s.game.stop(); } catch (e) {}
    try { s.game.finish(); } catch (e) {}
  }
  removeListeners(mine);
  if (s.overlay && s.overlay.parentNode) s.overlay.parentNode.removeChild(s.overlay);
  deleteGlobal('CAOGAO_MAP');
  deleteGlobal('RED_ARMY_SPRITE');
  deleteGlobal('CAOGAO_CROSSING');
}

window.GrasslandCollect = {
  version: VERSION,
  open: open,
  close: close
};
})();
