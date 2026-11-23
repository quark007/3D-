/*!
 * 长征·星火 —— 敌后狙击 · 1937（子游戏模块）
 * =========================================================================
 * 用途
 *   将独立小游戏《敌后狙击 · 1937》封装为可导入《长征·星火》主游戏的单文件
 *   JS 模块（无任何依赖）。1937 年秋红军改编八路军后的敌后第一战：玩家在
 *   黄昏村口阵地操作准星狙击进犯日军分队（士兵 100 分 / 军官 250 分 / 机枪手
 *   150 分，爆头双倍），弹仓 8 发、共三波每波 60 秒，守住阵地或阵地失守即
 *   出结算卡。自带 WebAudio 合成音效、触屏点按射击与「装填」按钮。
 *
 * 作者接入方式（主游戏侧三步）
 *   1) 把本文件复制到 changzheng/js/ 目录；
 *   2) index.html 中加入 <script src="js/sniper-1937.module.js"></script>
 *      （与 grassland-collect.module.js 同构，可同时加载、互不冲突；本模块
 *      加载时不执行任何游戏逻辑，惰性启动）；
 *   3) 在需要触发的地方调用（节点 2 = 血战湘江之后改编八路军的首战，也可
 *      作为独立番外入口）：
 *        Sniper1937.open(2, function (r) {
 *          // r = { score, kills, headshots, shots, accuracy, hp }
 *        });
 *      中途用 Sniper1937.close() 退出（不结算、不记分）。
 *
 * 与主游戏 GameState 的自动对接
 *   本局结束（三波守住的 end(true) 或阵地失守 end(false)，即游戏内结算卡
 *   出现时）自动执行：
 *     1) 回调 onDone(result())（onDone 非函数则跳过；每局结算各回调一次）；
 *     2) 若全局存在 GameState.recordBattleScore 且 open() 传入了 nodeId，
 *        自动调用：
 *          胜利：recordBattleScore(nodeId, max(40, min(95, round(score/40))), '敌后狙击')
 *          失败且 hp<30：先按上式取值，再减半（向下取整），下限仍为 40。
 *   注意：点「✕ 退出」中途离场视为放弃，不触发 onDone、不记分。
 *
 * 对外 API
 *   window.Sniper1937 = { open(nodeId, onDone), close(), version }
 *   - open()：创建全屏遮罩（position:fixed，z-index 9999，暗色背景居中一个
 *     1000px 容器），注入原 <style>、.sn-stage 与游戏必需的 #snStatus 状态行
 *     （.sn-legal 说明行不注入，见 README），随后挂载游戏；
 *     重复调用 open 会先自动 close 上一局（防重入）。
 *   - close()：置主循环 running=false 并取消 rAF、断开 ResizeObserver、
 *     关闭 AudioContext、解绑 window/document 级监听、移除遮罩与全局名。
 *
 * 全局命名说明
 *   游戏本体代码全部在闭包内。open 期间存在原游戏的调试接口全局名
 *   window.SNIPER1937_DEBUG（get/list/force/fire/result/start，可用于自动化
 *   测试），close 时删除；游戏内的 window.SNIPER1937._onDone 嵌入钩子语义
 *   原样保留。均与主游戏 GAME_NODES / GameState / GameUI 不冲突。
 *
 * 来源与改造点
 *   由 sniper-1937.html 打包生成。背景预渲染、敌兵绘制（drawSoldier）、
 *   主循环、结算卡、像素逻辑与源文件逐字节一致（构建脚本做了"逆向替换
 *   还原 = 原函数体"校验）；仅按模块化要求改造：IIFE 改为 mount 延迟挂载、
 *   document/window 级监听改为可解绑的跟踪式绑定（onWin/onDoc）、主循环
 *   增加 running 标志、ResizeObserver 存柄、end() 内新增 __finish 完成回调、
 *   遮罩与「✕ 退出」按钮。注入 DOM 不含 <meta> 与 .sn-head / .sn-legal 说明。
 * 版本 1.0.0    生成日期 2026-10-24
 * ========================================================================= */
(function () {
'use strict';

var VERSION = '1.0.0';

/* ---------- 注入用 DOM 片段：原 sniper-1937.html 的 <style>、<div class="sn-stage"> 与功能性状态行（逐字节一致；不含 meta / .sn-head / .sn-legal 说明行） ---------- */
var STYLE_HTML = "<style>\n#sniper-1937{--sn-bg:#100d08;--sn-panel:#1c140c;--sn-cream:#f2e8d0;--sn-dim:#c7b58f;--sn-gold:#d4a842;--sn-red:#b3282d;--sn-redhi:#e0563e;--sn-line:#6a5535;\n  font-family:'KaiTi','STKaiti','Noto Serif SC','SimSun',serif;color:var(--sn-cream);max-width:1000px;margin:0 auto;}\n#sniper-1937 .sn-head{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline;margin:0 0 8px;padding-bottom:8px;border-bottom:1px solid #3a2d1c;}\n#sniper-1937 h2{margin:0;font-weight:600;font-size:20px;letter-spacing:3px;color:var(--sn-gold);}\n#sniper-1937 .sn-tag{font-size:12px;color:var(--sn-dim);letter-spacing:1px;}\n#sniper-1937 .sn-stage{position:relative;border:1px solid var(--sn-line);background:#0e0a06;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.4);}\n#sniper-1937 canvas{display:block;width:100%;aspect-ratio:16/9;cursor:none;touch-action:none;user-select:none;-webkit-user-select:none;}\n#sniper-1937 .sn-hud{position:absolute;inset:0;pointer-events:none;font-family:inherit;}\n#sniper-1937 .sn-hud[hidden]{display:none;}\n#sniper-1937 .sn-hud-tl{position:absolute;top:10px;left:12px;background:rgba(20,14,9,.72);border:1px solid var(--sn-line);border-radius:3px;padding:7px 11px;font-size:13px;letter-spacing:1px;line-height:1.7;}\n#sniper-1937 .sn-score{color:var(--sn-gold);font-weight:600;font-size:15px;}\n#sniper-1937 .sn-hptrack{width:120px;height:8px;background:#2a2016;border-radius:4px;margin-top:3px;overflow:hidden;}\n#sniper-1937 .sn-hpfill{height:100%;width:100%;background:linear-gradient(90deg,#7e6a2a,#d4a842);transition:width .2s;border-radius:4px;}\n#sniper-1937 .sn-hpfill.low{background:linear-gradient(90deg,#6e1f1c,#d84a3a);}\n#sniper-1937 .sn-hud-tr{position:absolute;top:10px;right:12px;background:rgba(20,14,9,.72);border:1px solid var(--sn-line);border-radius:3px;padding:7px 11px;font-size:13px;letter-spacing:1px;text-align:right;line-height:1.7;}\n#sniper-1937 .sn-hud-bl{position:absolute;left:12px;bottom:10px;background:rgba(20,14,9,.72);border:1px solid var(--sn-line);border-radius:3px;padding:7px 11px;font-size:13px;letter-spacing:2px;}\n#sniper-1937 .sn-bullet{display:inline-block;width:7px;height:15px;margin-right:4px;vertical-align:middle;background:linear-gradient(180deg,#e8cd7a,#a3762a);border-radius:1px;}\n#sniper-1937 .sn-bullet.off{background:transparent;border:1px solid #5a4a30;}\n#sniper-1937 .sn-reloadtxt{color:var(--sn-redhi);font-size:12px;margin-left:6px;letter-spacing:1px;}\n#sniper-1937 .sn-wave{position:absolute;top:12%;left:50%;transform:translateX(-50%);font-size:19px;letter-spacing:5px;color:#ffe9a8;text-shadow:2px 2px 0 rgba(0,0,0,.9);opacity:0;transition:opacity .3s;pointer-events:none;}\n#sniper-1937 .sn-wave.show{opacity:1;}\n#sniper-1937 .sn-dmg{position:absolute;inset:0;background:rgba(160,32,32,.32);opacity:0;pointer-events:none;transition:opacity .35s;}\n#sniper-1937 .sn-dmg.show{opacity:1;transition:opacity .05s;}\n#sniper-1937 .sn-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(16,10,6,.9),rgba(10,7,4,.95));display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;}\n#sniper-1937 .sn-overlay[hidden]{display:none;}\n#sniper-1937 .sn-card{max-width:640px;width:100%;border:1px solid var(--sn-gold);background:linear-gradient(180deg,#221709,#171009);padding:20px 24px;box-shadow:0 0 0 4px rgba(212,168,66,.08),0 14px 40px rgba(0,0,0,.5);}\n#sniper-1937 .sn-card h3{margin:0 0 4px;font-weight:600;font-size:19px;color:var(--sn-gold);letter-spacing:3px;}\n#sniper-1937 .sn-card .sn-sub{font-size:12px;color:var(--sn-dim);letter-spacing:2px;margin-bottom:12px;}\n#sniper-1937 .sn-card p{font-size:13px;line-height:1.8;margin:8px 0;}\n#sniper-1937 .sn-card .sn-note{font-size:11px;color:var(--sn-dim);}\n#sniper-1937 .sn-rows{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;}\n#sniper-1937 .sn-rows th{width:82px;text-align:left;color:var(--sn-dim);font-weight:400;padding:7px 10px 7px 0;vertical-align:top;border-bottom:1px solid #332717;}\n#sniper-1937 .sn-rows td{padding:7px 0;border-bottom:1px solid #332717;line-height:1.6;}\n#sniper-1937 .sn-rows .sn-hist{color:#a08c62;}\n#sniper-1937 .sn-verdict{display:flex;gap:12px;align-items:baseline;margin:10px 0 2px;}\n#sniper-1937 .sn-bigscore{font-size:30px;color:var(--sn-gold);font-weight:600;}\n#sniper-1937 .sn-actions{display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;}\n#sniper-1937 button{font-family:inherit;font-size:13px;letter-spacing:2px;padding:8px 18px;background:transparent;border:1px solid var(--sn-golddim,#8a744a);color:var(--sn-gold);cursor:pointer;border-radius:2px;}\n#sniper-1937 button.sn-primary{background:linear-gradient(180deg,#a02c22,#7e1f1a);border-color:#c96a4a;color:#ffe9d0;}\n#sniper-1937 button:hover{filter:brightness(1.25);}\n#sniper-1937 .sn-foot{display:flex;flex-wrap:wrap;gap:6px 18px;align-items:baseline;margin-top:9px;}\n#sniper-1937 .sn-status{font-size:12px;color:var(--sn-dim);min-height:18px;flex:1 1 240px;}\n#sniper-1937 .sn-legal{font-size:11px;color:#7a6a4e;letter-spacing:1px;}\n#sniper-1937 .sn-mobile-reload{display:none;position:absolute;right:14px;bottom:16px;width:62px;height:62px;border-radius:50%;border:2px solid rgba(255,233,168,.85);background:rgba(30,26,14,.72);color:#ffe9a8;font:inherit;font-size:14px;letter-spacing:1px;align-items:center;justify-content:center;touch-action:none;}\n#sniper-1937.touch .sn-mobile-reload{display:flex;}\n#sniper-1937.touch #sn-keys-hint{display:none;}\n</style>";
var STAGE_HTML = "<div class=\"sn-stage\">\n  <canvas id=\"sn-canvas\" width=\"480\" height=\"300\"></canvas>\n  <div class=\"sn-hud\" id=\"snHud\" hidden>\n    <div class=\"sn-hud-tl\">得分 <span class=\"sn-score\" id=\"snScore\">0</span><br>阵地\n      <div class=\"sn-hptrack\"><div class=\"sn-hpfill\" id=\"snHpFill\"></div></div>\n    </div>\n    <div class=\"sn-hud-tr\">波次 <span id=\"snWave\">1/3</span><br>时间 <span id=\"snTime\">60</span>s</div>\n    <div class=\"sn-hud-bl\"><span id=\"snAmmo\"></span><span id=\"snReloadTxt\" class=\"sn-reloadtxt\" hidden>装填中…</span></div>\n    <div class=\"sn-wave\" id=\"snWaveBanner\"></div>\n    <div class=\"sn-dmg\" id=\"snDmg\"></div>\n  </div>\n  <div class=\"sn-overlay\" id=\"snOverlay\"><div class=\"sn-card\" id=\"snCard\"></div></div>\n  <button class=\"sn-mobile-reload\" id=\"snBtnReload\" type=\"button\" tabindex=\"-1\">装填</button>\n  <button id=\"snMute\" type=\"button\" tabindex=\"-1\" style=\"position:absolute;top:8px;right:8px;font:inherit;font-size:11px;letter-spacing:1px;color:#e8e4d0;background:rgba(20,14,9,.72);border:1px solid #6a5535;padding:4px 9px;cursor:pointer;z-index:2;\">声音:开</button>\n</div>\n";
var FOOT_HTML = "<div class=\"sn-foot\">\n  <div class=\"sn-status\" id=\"snStatus\" role=\"status\" aria-live=\"polite\">等待开始。</div>\n</div>\n";

/* ---------- 遮罩样式（模块新增，snm- 前缀避免与主游戏/其他模块冲突） ---------- */
var OVERLAY_CSS = '#snm-overlay{position:fixed;left:0;top:0;right:0;bottom:0;z-index:9999;background:rgba(4,5,8,0.94);background-image:repeating-linear-gradient(45deg,rgba(255,255,255,0.015) 0 2px,transparent 2px 6px);display:flex;align-items:center;justify-content:center;padding:14px;}'
  + '#snm-overlay .snm-shell{width:1000px;max-width:96vw;max-height:94vh;overflow:auto;border:1px solid #4a4d52;}'
  + '#snm-overlay .snm-op{position:absolute;top:12px;left:16px;z-index:1;font:11px/1 "Microsoft YaHei","PingFang SC",sans-serif;letter-spacing:0.18em;color:#8b8e93;background:rgba(16,17,20,0.88);border:1px solid #4a4d52;border-left:3px solid #ffcf24;padding:8px 12px;}'
  + '#snm-overlay .snm-exit{position:absolute;top:12px;right:16px;z-index:1;font:bold 13px/1 "Microsoft YaHei","PingFang SC",sans-serif;letter-spacing:2px;color:#ffcf24;background:#101114;border:1px solid #ffcf24;padding:9px 14px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:border-color .12s,transform .12s;}'
  + '#snm-overlay .snm-exit:hover{transform:translateY(-1px);border-color:#ffe27a;}';

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
/* ================= 游戏 IIFE（mount 化：函数体除标注"模块化改造"处外与源文件逐字节一致） ================= */
function mountGame(rootEl, opts) {
  'use strict';
  var root=document.getElementById('sniper-1937');
  var cv=root.querySelector('#sn-canvas'), ctx=cv.getContext('2d');
  var hud=root.querySelector('#snHud'), overlay=root.querySelector('#snOverlay'), card=root.querySelector('#snCard');
  var elScore=root.querySelector('#snScore'), elHp=root.querySelector('#snHpFill');
  var elWave=root.querySelector('#snWave'), elTime=root.querySelector('#snTime');
  var elAmmo=root.querySelector('#snAmmo'), elReloadTxt=root.querySelector('#snReloadTxt');
  var elBanner=root.querySelector('#snWaveBanner'), elDmg=root.querySelector('#snDmg');
  var elStatus=root.querySelector('#snStatus'), btnReload=root.querySelector('#snBtnReload');
  var RM=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W=480,H=300,scale=1;
  var IS_TOUCH=(typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches)||('ontouchstart' in window);
  if(IS_TOUCH) root.classList.add('touch');

  /* ===== 模块化改造新增：完成回调 / 主游戏记分 / 原始 _onDone 钩子（由 end(win) 调用） ===== */
  var __opts = opts || {};
  var __ro = null;
  function __finish(win) {
    var r = null;
    try { r = result(); } catch (e) { r = null; }
    if (!r) return;
    try { r.win = !!win; } catch (e) {}
    try {
      /* 主游戏兼容：GameState 可能是顶层 const（不在 window 上），两种宿主都解析 */
      var GS = null;
      if (window.GameState && window.GameState.recordBattleScore) GS = window.GameState;
      else if (typeof GameState !== 'undefined' && GameState && GameState.recordBattleScore) GS = GameState;
      if (__opts.nodeId !== undefined && __opts.nodeId !== null && GS) {
        var sc = Math.max(40, Math.min(95, Math.round(r.score / 40)));
        if (!win && r.hp < 30) sc = Math.max(40, Math.floor(sc / 2));
        GS.recordBattleScore(__opts.nodeId, sc, '敌后狙击');
      }
    } catch (e) {}
    try { if (typeof __opts.onDone === 'function') __opts.onDone(r); } catch (e) {}
    try { if (window.SNIPER1937 && window.SNIPER1937._onDone) window.SNIPER1937._onDone(r); } catch (e) {}
  }

  /* ================= 音频 ================= */
  var AC=null,muted=false,master=null,noiseBuf=null;
  function hostMuted(){return typeof AudioControl43!=='undefined'&&AudioControl43.muted===true;}
  function ac(){
    if(hostMuted())return null;
    if(!AC){ try{
      AC=new (window.AudioContext||window.webkitAudioContext)();
      var comp=AC.createDynamicsCompressor(); comp.threshold.value=-16; comp.ratio.value=5;
      master=AC.createGain(); master.gain.value=0.7; master.connect(comp); comp.connect(AC.destination);
      var len=AC.sampleRate*1.5; noiseBuf=AC.createBuffer(1,len,AC.sampleRate);
      var d=noiseBuf.getChannelData(0); for(var i=0;i<len;i++)d[i]=Math.random()*2-1;
    }catch(e){AC=null;} }
    if(AC&&AC.state==='suspended'){ try{ AC.resume().catch(function(){}); }catch(e){} }
    return AC;
  }
  function noiseSrc(){var s=AC.createBufferSource();s.buffer=noiseBuf;s.loop=true;return s;}
  function shotSnd(){ var a=ac(); if(!a||muted)return; var t=a.currentTime;
    var n=noiseSrc(),f=a.createBiquadFilter(),g=a.createGain();
    f.type='lowpass'; f.frequency.setValueAtTime(3400,t); f.frequency.exponentialRampToValueAtTime(220,t+0.16);
    g.gain.setValueAtTime(0.55,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.2);
    n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t+0.22);
    var o=a.createOscillator(),og=a.createGain();
    o.type='sine'; o.frequency.setValueAtTime(120,t); o.frequency.exponentialRampToValueAtTime(45,t+0.12);
    og.gain.setValueAtTime(0.4,t); og.gain.exponentialRampToValueAtTime(0.001,t+0.16);
    o.connect(og); og.connect(master); o.start(t); o.stop(t+0.18); }
  function thockSnd(){ var a=ac(); if(!a||muted)return; var t=a.currentTime;
    var n=noiseSrc(),f=a.createBiquadFilter(),g=a.createGain();
    f.type='lowpass'; f.frequency.value=260;
    g.gain.setValueAtTime(0.5,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.14);
    n.connect(f); f.connect(g); g.connect(master); n.start(t); n.stop(t+0.16); }
  function dingSnd(hi){ var a=ac(); if(!a||muted)return; var t=a.currentTime;
    var o=a.createOscillator(),g=a.createGain();
    o.type='triangle'; o.frequency.value=hi?1046:784;
    g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.16,t+0.01); g.gain.exponentialRampToValueAtTime(0.001,t+0.3);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+0.32); }
  function clickSnd(hi){ var a=ac(); if(!a||muted)return; var t=a.currentTime;
    var o=a.createOscillator(),g=a.createGain();
    o.type='square'; o.frequency.value=hi?880:520;
    g.gain.setValueAtTime(0.08,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.05);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+0.06); }
  function hurtSnd(){ var a=ac(); if(!a||muted)return; var t=a.currentTime;
    var o=a.createOscillator(),g=a.createGain();
    o.type='sawtooth'; o.frequency.setValueAtTime(160,t); o.frequency.exponentialRampToValueAtTime(60,t+0.3);
    g.gain.setValueAtTime(0.3,t); g.gain.exponentialRampToValueAtTime(0.001,t+0.34);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+0.36); }
  function jingle(win){ var a=ac(); if(!a||muted)return; var t=a.currentTime;
    var seq=win?[[392,0],[523,0.2],[659,0.4]]:[[196,0],[147,0.28]];
    for(var i=0;i<seq.length;i++){(function(f,d){var o=a.createOscillator(),g=a.createGain();
      o.type='sine'; o.frequency.value=f;
      g.gain.setValueAtTime(0.0001,t+d); g.gain.linearRampToValueAtTime(0.14,t+d+0.03); g.gain.exponentialRampToValueAtTime(0.001,t+d+0.6);
      o.connect(g); g.connect(master); o.start(t+d); o.stop(t+d+0.65);})(seq[i][0],seq[i][1]);} }

  /* ================= 背景（预渲染：黄昏村落） ================= */
  var bg=document.createElement('canvas'); bg.width=W; bg.height=H;
  (function(){
    var b=bg.getContext('2d');
    var sky=b.createLinearGradient(0,0,0,200);
    sky.addColorStop(0,'#1c140f'); sky.addColorStop(0.5,'#4e2f1a'); sky.addColorStop(1,'#a06a34');
    b.fillStyle=sky; b.fillRect(0,0,W,200);
    b.fillStyle='rgba(255,210,140,0.14)';
    b.beginPath(); b.ellipse(140,60,140,10,0,0,6.2832); b.fill();
    b.beginPath(); b.ellipse(360,90,170,9,0,0,6.2832); b.fill();
    b.fillStyle='#efe0b8'; b.beginPath(); b.arc(392,54,14,0,6.2832); b.fill();
    b.fillStyle='rgba(255,230,180,0.35)'; b.beginPath(); b.arc(392,54,26,0,6.2832); b.fill();
    b.fillStyle='#3a2a1a'; b.beginPath(); b.moveTo(0,170);
    b.quadraticCurveTo(90,128,200,158); b.quadraticCurveTo(320,182,480,150);
    b.lineTo(480,210); b.lineTo(0,210); b.closePath(); b.fill();
    /* 村落剪影：两座屋 + 院墙 */
    function house(x,y,w,h,roofH){
      b.fillStyle='#332417'; b.fillRect(x,y,w,h);
      b.fillStyle='#241a10'; b.beginPath(); b.moveTo(x-6,y); b.lineTo(x+w/2,y-roofH); b.lineTo(x+w+6,y); b.closePath(); b.fill();
      b.fillStyle='#d9a860'; b.fillRect(x+Math.round(w*0.24),y+Math.round(h*0.3),Math.round(w*0.2),Math.round(h*0.32));
      b.fillStyle='#141a10'; b.fillRect(x+Math.round(w*0.58),y+Math.round(h*0.34),Math.round(w*0.2),Math.round(h*0.45));
    }
    house(52,102,74,54,26); house(356,96,80,58,28);
    b.fillStyle='#2c2014'; b.fillRect(0,150,480,8);
    b.fillStyle='#241a10'; b.fillRect(238,132,20,26);
    /* 地面 */
    var gr=b.createLinearGradient(0,158,0,300);
    gr.addColorStop(0,'#4c3a20'); gr.addColorStop(1,'#2a2013');
    b.fillStyle=gr; b.fillRect(0,158,480,142);
    b.fillStyle='rgba(120,96,54,0.35)';
    for(var i=0;i<40;i++){ b.fillRect((i*53)%480,164+(i*37)%130,3,1); }
    /* 土路 */
    b.fillStyle='#3c2e1a'; b.beginPath();
    b.moveTo(0,238); b.quadraticCurveTo(240,218,480,242); b.lineTo(480,300); b.lineTo(0,300); b.closePath(); b.fill();
    /* 沙袋掩体×3 */
    function sandbags(cx,baseY,n){
      for(var r2=0;r2<3;r2++){ for(var i2=0;i2<n-r2;i2++){
        var sx=cx-(n-r2)*7+i2*14, sy=baseY-r2*7;
        b.fillStyle='#6a5a3e'; b.fillRect(sx,sy,13,6);
        b.fillStyle='#54462e'; b.fillRect(sx,sy+4,13,2);
        b.fillStyle='#7d6c4c'; b.fillRect(sx+1,sy,11,1);
      } }
    }
    sandbags(96,232,5); sandbags(252,226,4); sandbags(404,236,5);
    /* 前沿战壕口 */
    b.fillStyle='#171009'; b.fillRect(158,282,64,18); b.fillRect(318,284,58,16);
    b.fillStyle='#0e0a06'; b.fillRect(158,282,64,6); b.fillRect(318,284,58,5);
  })();

  /* ================= 敌兵绘制（程序化像素，无血腥：中弹即倒地+尘土） ================= */
  function drawSoldier(g,x,y,pose,dir,type,ph){
    /* x,y=脚底中心；type: 'soldier'|'officer'|'gunner' */
    var uni=type==='officer'?'#4c5040':'#616852', uniD=type==='officer'?'#383c30':'#4a5040',
        uniL=type==='officer'?'#5e6450':'#7a8068',
        hat=type==='officer'?'#2e2a20':'#565c4a',
        hatB=type==='officer'?'#b08d2f':'#454b3a';
    g.save(); g.translate(Math.round(x),Math.round(y));
    if(dir<0) g.scale(-1,1);
    function R(px,py,w,h,c){ g.fillStyle=c; g.fillRect(px,py,w,h); }
    if(pose==='fall1'||pose==='fall2'||pose==='fall3'){
      var k=pose==='fall1'?0:pose==='fall2'?1:2;
      if(k===0){ R(-7,-4,14,4,uni); R(-6,-12,9,8,uniD); R(-8,-16,10,5,hat); R(-3,-8,3,3,'#d9a06a'); }
      else if(k===1){ R(-10,-4,17,4,uni); R(2,-8,8,6,uniD); R(8,-11,8,4,hat); R(1,-6,3,3,'#d9a06a'); }
      else { R(-13,-3,22,3,uniD); R(9,-6,7,3,hat); R(-15,-2,4,2,'#54462e'); }
      g.restore(); return;
    }
    var bob=(pose==='walk2')?1:0, legSplit=(pose==='walk1')?2:(pose==='walk2'?-2:0);
    var crouch=(pose==='half')?10:0;
    var fy=-bob+crouch;                                  /* 整体纵向偏移 */
    if(pose==='aim'){ R(-2,-9,16,2,'rgba(224,86,60,0.55)'); }  /* 机枪手瞄准红线 */
    /* 腿（绑腿感：上下两段） */
    R(-5,fy-10,3,10,uniD); R(2,fy-10,3,10,uniD);
    R(-5+legSplit,fy-6,3,2,uniL); R(2+legSplit,fy-6,3,2,uniL);
    R(-5,fy,3,2,'#3c2e1a'); R(2,fy,3,2,'#3c2e1a');
    /* 躯干 */
    R(-6,fy-19,12,9,uni); R(-6,fy-19,12,2,uniL);
    R(-6,fy-13,12,3,uniD);
    R(-1,fy-19,2,9,'#4a3421');                            /* 背带 */
    if(type==='officer'){ R(4,fy-18,3,3,'#b08d2f'); }     /* 肩章 */
    /* 头 + 钢盔/军帽 */
    R(-3,fy-25,6,5,'#d9a06a'); R(-3,fy-22,6,1,'#b07d50');
    R(-2,fy-23,1,1,'#1a1611');
    if(type==='officer'){ R(-4,fy-28,9,3,'#2e2a20'); R(-4,fy-25,9,1,hatB); }
    else { R(-4,fy-28,9,4,hat); R(-5,fy-25,11,1,hatB); R(-4,fy-27,9,1,'#6a705a'); }
    /* 武器 / 机枪 */
    if(type==='gunner'){
      R(-9,fy-14,14,3,'#3c3c40'); R(-10,fy-11,2,6,'#2e2e32');
      R(4,fy-15,9,2,'#4a4a50'); R(12,fy-14,3,1,'#2e2e32');
    } else {
      var ra=pose==='aim'?-6:0;
      R(3,fy-16+ra,2,10,'#4a3421'); R(3,fy-18+ra,2,4,'#4a3421'); R(3,fy-20+ra,7,2,'#3c3c40');
    }
    if(ph!==undefined){ R(-1,fy-14+Math.sin(ph)*1,1,1,'rgba(0,0,0,0)'); }
    g.restore();
  }

  /* ================= 状态 ================= */
  var MAG=8, WAVE_SEC=60, GUN_DMG=15, GUN_AIM=2.6;
  var WAVES=[
    {interval:1.6,exposure:1.9,gunner:0,officer:0.12,walker:0.2,maxAlive:2},
    {interval:1.25,exposure:1.5,gunner:0.25,officer:0.14,walker:0.3,maxAlive:3},
    {interval:1.0,exposure:1.2,gunner:0.35,officer:0.15,walker:0.35,maxAlive:4}
  ];
  var S=null;
  function freshState(){ return {
    mode:'ready', t:0, score:0, hp:100, ammo:MAG, reloading:0, shots:0, hits:0, headshots:0,
    kills:{soldier:0,officer:0,gunner:0},
    wave:0, waveT:0, spawnT:1.2, targets:[], parts:[], floats:[],
    px:W/2, py:H/2, recoil:0, shakeT:0, waveBannerT:0, betweenT:0, done:false
  };}
  function rnd(a,b){ return a+Math.random()*(b-a); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  S=freshState();

  var COVERS=[ {x:89,y:200,kind:'window'},{x:396,y:198,kind:'window'},{x:96,y:228,kind:'sand'},
               {x:252,y:222,kind:'sand'},{x:404,y:232,kind:'sand'},{x:186,y:280,kind:'trench'},{x:330,y:282,kind:'trench'} ];
  function spawnTarget(typeHint){
    var wv=WAVES[S.wave-1];
    var type='soldier', roll=Math.random();
    if(typeHint) type=typeHint;
    else if(roll<wv.officer) type='officer';
    else if(roll<wv.officer+wv.gunner) type='gunner';
    var t={type:type, state:'rise', t:0, dir:Math.random()<0.5?1:-1, ph:rnd(0,6.28)};
    if(type==='walker'){ t.x=S.wave===2&&Math.random()<0.5?480:-0; t.y=252+rnd(0,26); t.state='walk'; t.vx=(t.x===0?1:-1)*rnd(26,40); }
    else {
      var c=COVERS[(Math.random()*COVERS.length)|0];
      t.x=c.x; t.y=c.y+(c.kind==='window'?-44:c.kind==='trench'?-2:0);
      t.state='rise';
    }
    t.exposure=wv.exposure*rnd(0.85,1.2);
    S.targets.push(t);
  }
  function tBox(t){ /* 命中盒：返回 {x,y,w,h,headH} */
    if(t.type==='walker'){ return {x:t.x-8,y:t.y-24,w:16,h:24,headH:7}; }
    var h=(t.state==='half')?14:26;
    return {x:t.x-8,y:t.y-h,w:16,h:h,headH:6};
  }
  function scoreOf(t,head){
    var base=t.type==='officer'?250:t.type==='gunner'?150:100;
    return head?base*2:base;
  }

  function setStatus(s,cls){ elStatus.textContent=s; elStatus.className='sn-status'+(cls?' sn-'+cls:''); }
  function updateHud(){
    elScore.textContent=S.score;
    elHp.style.width=clamp(S.hp,0,100)+'%'; elHp.className='sn-hpfill'+(S.hp<35?' low':'');
    elWave.textContent=S.wave+'/3'; elTime.textContent=Math.ceil(S.waveT);
    var pips=''; for(var i=0;i<MAG;i++) pips+='<span class="sn-bullet'+(i<S.ammo?'':' off')+'"></span>';
    elAmmo.innerHTML=pips; elReloadTxt.hidden=!(S.reloading>0);
  }
  function addFloat(x,y,txt,color){ S.floats.push({x:x,y:y,txt:txt,c:color||'#ffe9a8',t:0}); if(S.floats.length>10)S.floats.shift(); }
  function dust(x,y,n){ for(var i=0;i<n;i++) S.parts.push({x:x,y:y,vx:rnd(-1.6,1.6),vy:rnd(-2.4,-0.4),g:0.08,life:rnd(0.4,0.9),age:0,r:rnd(1,2.6),c:'#b9a98c'}); }

  function fire(){
    if(S.mode!=='playing'||S.reloading>0)return;
    if(S.ammo<=0){ clickSnd(false); setStatus('弹仓已空——按 R 或点「装填」'); return; }
    S.ammo--; S.shots++; S.recoil=1; shotSnd(); updateHud();
    var hx=S.px, hy=S.py, hit=null, head=false;
    for(var i=S.targets.length-1;i>=0;i--){ var t=S.targets[i];
      if(t.state==='fall'||t.state==='gone')continue;
      var b=tBox(t);
      if(hx>=b.x&&hx<=b.x+b.w&&hy>=b.y&&hy<=b.y+b.h){ hit=t; head=(hy<=b.y+b.headH); break; } }
    if(hit){
      var sc=scoreOf(hit,head); S.score+=sc; S.hits++; if(head)S.headshots++;
      S.kills[hit.type]++;
      hit.state='fall'; hit.t=0;
      dust(hx,hy+2,6); thockSnd(); dingSnd(head);
      addFloat(hit.x,hit.y-30,(head?'爆头 +':'+')+sc,head?'#ffd977':'#f2e8d0');
      setStatus(head?'爆头！干净利落的一枪。':'命中！目标倒地。','hit');
      if(hit.type==='gunner') setStatus('机枪火力点被拔除，阵地压力解除。','hit');
    } else { dust(hx,clamp(hy,160,296),4); }
    if(S.ammo===0) autoReload();
  }
  function autoReload(){ if(S.reloading>0||S.ammo===MAG)return; S.reloading=1.15; elReloadTxt.hidden=false; clickSnd(true); }
  function finishReload(){ S.ammo=MAG; elReloadTxt.hidden=true; clickSnd(true); clickSnd(false); updateHud(); }

  function endWave(){
    if(S.wave>=3){ end(true); return; }
    S.betweenT=2.4; elBanner.textContent='第 '+(S.wave+1)+' 波 · 敌兵增援上来';
    elBanner.classList.add('show'); S.waveBannerT=2.2;
  }
  function end(win){
    if(S.mode==='won'||S.mode==='lost')return;
    S.mode=win?'won':'lost'; hud.hidden=true;
    jingle(win);
    card.innerHTML=win?winCard():failCard(); overlay.hidden=false;
    setStatus(win?'战斗段结束：阵地守住了。':'战斗段受挫：'+(S.hp<=0?'阵地失守':'时间到'),win?'hit':'bad');
    /* ===== 模块化改造新增：onDone + 自动记分 + 原始 _onDone 钩子，见 __finish ===== */
    __finish(win);
  }
  function result(){ return { score:S.score, kills:S.kills.soldier+S.kills.officer+S.kills.gunner,
    headshots:S.headshots, shots:S.shots, accuracy:S.shots?Math.round(S.hits/S.shots*100):0, hp:Math.round(S.hp) }; }
  function winCard(){
    var r=result();
    var verdict=r.score>=2500?['神枪手',r.score]:r.score>=1600?['优秀',r.score]:r.score>=900?['合格',r.score]:['需复盘',r.score];
    var rows=[
      ['战果',r.kills+' 名敌兵 · 爆头 '+r.headshots+' 次','史实对照：八路军以精准射击与夜袭著称，讲究每一发子弹的效率（史实可查）'],
      ['命中率',r.accuracy+'% · 用弹 '+r.shots+' 发','史实对照：敌后弹药奇缺，八路军倡导「一颗子弹消灭一个敌人」（史实可查）'],
      ['阵地守备','剩余阵地值 '+r.hp+'/100','史实对照：掩护群众转移的阻击战，重在迟滞与安全撤离（推演对比）']
    ];
    return '<h3>敌后狙击 — 战斗段结算</h3><div class="sn-sub">玩家推演 × 史实对照（虚构教学模拟，不改变真实历史）</div>'
      +'<div class="sn-verdict"><span class="sn-bigscore">'+verdict[1]+'</span><span>'+verdict[0]+'</span></div>'
      +'<table class="sn-rows">'+rows.map(function(r2){return '<tr><th>'+r2[0]+'</th><td>'+r2[1]+'<br><span class="sn-hist">'+r2[2]+'</span></td></tr>';}).join('')+'</table>'
      +'<div class="sn-actions"><button type="button" class="sn-primary" id="snRetry">再战一局</button><button type="button" id="snBrief">返回简报</button></div>';
  }
  function failCard(){
    var r=result();
    return '<h3>敌后狙击 — 阵地失守</h3><div class="sn-sub">玩家推演 × 史实对照（虚构教学模拟，不改变真实历史）</div>'
      +'<div class="sn-verdict"><span class="sn-bigscore">'+r.score+'</span><span>需复盘</span></div>'
      +'<table class="sn-rows"><tr><th>火力压制</th><td>机枪火力点未能及时拔除（推演）<br><span class="sn-hist">史实对照：敌后作战强调先打火力点与指挥官（史实可查）</span></td></tr>'
      +'<tr><th>后果推演</th><td>转移队伍暴露于火力之下（推演）<br><span class="sn-hist">史实对照：阻击战的使命是掩护群众安全转移（推演对比）</span></td></tr></table>'
      +'<p>战术提示：优先打机枪手（头顶感叹号）；军官出现时间短、分值高；子弹有限，等准星贴近再打。</p>'
      +'<div class="sn-actions"><button type="button" class="sn-primary" id="snRetry">再战一局</button><button type="button" id="snBrief">返回简报</button></div>';
  }
  function startCard(){
    return '<h3>敌后狙击 · 1937</h3><div class="sn-sub">像素射击 · 三波防御 · 建议时长 3 分钟</div>'
      +'<p>1937 年秋，红军改编为八路军开赴华北前线。你奉命在村口阻击进犯的日军分队，掩护乡亲们沿山路转移。</p>'
      +'<p><b>打法</b>：移动准星瞄准，点击开火——士兵 100 分、军官 250 分（出现时间极短）、机枪手 150 分（会压制你的阵地，头顶出现红色标示时必须优先拔掉）；爆头双倍得分。弹仓 8 发，打空按 R 装填。共三波，每波 60 秒，守住阵地。</p>'
      +'<p class="sn-note" id="sn-keys-hint">键盘：方向键移动准星，空格开火，R 装填，M 静音；手机：点按屏幕即瞄准+射击，右下角「装填」。</p>'
      +'<p class="sn-note">虚构教学模拟：敌我双方均为虚构像素形象，无血腥画面，不指向任何真实人物与民族，不改变真实历史。</p>'
      +'<div class="sn-actions"><button type="button" class="sn-primary" id="snStart">进入阵地</button></div>';
  }

  /* ================= 输入 ================= */
  function toLocal(e){ var r=cv.getBoundingClientRect(); return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H}; }
  cv.addEventListener('pointermove',function(e){ var p=toLocal(e); S.px=p.x; S.py=p.y; });
  cv.addEventListener('pointerdown',function(e){ var p=toLocal(e); S.px=p.x; S.py=p.y; ac(); fire(); e.preventDefault(); });
  onDoc('keydown',function(e){
    var tg=e.target&&e.target.tagName; if(/INPUT|TEXTAREA|SELECT|BUTTON/.test(tg||''))return;
    var k=(e.key||'').toLowerCase();
    if(k==='r'){ if(S.mode==='playing')autoReload(); }
    if(k==='m'){ muted=!muted; var mb=root.querySelector('#snMute'); if(mb)mb.textContent=muted?'声音：关':'声音：开'; }
    if(S.mode!=='playing')return;
    var step=e.shiftKey?24:10, moved=true;
    if(k==='arrowleft')S.px=clamp(S.px-step,0,W);
    else if(k==='arrowright')S.px=clamp(S.px+step,0,W);
    else if(k==='arrowup')S.py=clamp(S.py-step,0,H);
    else if(k==='arrowdown')S.py=clamp(S.py+step,0,H);
    else if(k===' '||k==='spacebar'){ac();fire();}
    else moved=false;
    if(moved)e.preventDefault();
  });
  btnReload.addEventListener('pointerdown',function(e){ e.preventDefault(); ac(); if(S.mode==='playing')autoReload(); });
  card.addEventListener('click',function(e){ var t=e.target;
    if(t&&t.id==='snStart')startGame();
    if(t&&t.id==='snRetry')startGame();
    if(t&&t.id==='snBrief'){ card.innerHTML=startCard(); }
  });
  root.querySelector('#snMute').addEventListener('click',function(){ muted=!muted; this.textContent=muted?'声音：关':'声音：开'; });

  /* ================= 主循环 ================= */
  var last=performance.now();
  function frame(now){
    if(!running)return;   /* 模块化改造新增：close 后立即停止 */
    var dt=Math.min(0.05,(now-last)/1000); last=now; S.t+=dt;
    if(S.mode==='playing'){
      if(S.betweenT>0){ S.betweenT-=dt;
        if(S.betweenT<=0){ S.wave++; S.waveT=WAVE_SEC; S.spawnT=0.6; updateHud(); } }
      else {
        S.waveT-=dt;
        if(S.waveT<=0){ if(S.wave>=3){ end(true); } else { endWave(); } }
        else {
          S.spawnT-=dt;
          var wv=WAVES[S.wave-1], alive=0;
          for(var ai=0;ai<S.targets.length;ai++){ var st=S.targets[ai].state; if(st!=='fall'&&st!=='gone')alive++; }
          if(S.spawnT<=0&&alive<wv.maxAlive){ spawnTarget(); S.spawnT=wv.interval*rnd(0.8,1.2); }
        }
      }
      if(S.reloading>0){ S.reloading-=dt; if(S.reloading<=0)finishReload(); }
      for(var i=S.targets.length-1;i>=0;i--){ var t=S.targets[i]; t.t+=dt;
        if(t.state==='rise'){ if(t.t>0.25){t.state='up';t.t=0;} }
        else if(t.state==='up'){ if(t.type==='gunner'){ if(t.t>GUN_AIM){ t.t=0; if(S.hp>0&&!RM)S.shakeT=0.25; S.hp-=GUN_DMG; elDmg.classList.add('show'); setTimeout(function(){elDmg.classList.remove('show');},120); hurtSnd(); updateHud(); if(S.hp<=0){ end(false); } } }
          else if(t.t>t.exposure){ t.state='crouch'; t.t=0; } }
        else if(t.state==='crouch'){ if(t.t>0.25){ S.targets.splice(i,1); } }
        else if(t.state==='walk'){ t.x+=t.vx*dt; if(t.x<-16||t.x>W+16){ S.targets.splice(i,1); } }
        else if(t.state==='fall'){ if(t.t>0.9){ S.targets.splice(i,1); } }
        else if(t.state==='aim'){ /* gunner 已开火后保持 */ if(t.t>3.4){ t.t=0; } }
      }
      if(S.waveBannerT>0){ S.waveBannerT-=dt; if(S.waveBannerT<=0)elBanner.classList.remove('show'); }
      if(S.wave>0&&S.waveT>0&&Math.ceil(S.waveT)!==elTime.textContent)elTime.textContent=Math.ceil(S.waveT);
    }
    for(var pi=S.parts.length-1;pi>=0;pi--){ var p=S.parts[pi]; p.age+=dt; p.vy+=p.g*dt*60; p.x+=p.vx*dt*60; p.y+=p.vy*dt*60; if(p.age>=p.life)S.parts.splice(pi,1); }
    for(var fi=S.floats.length-1;fi>=0;fi--){ var f=S.floats[fi]; f.t+=dt; f.y-=18*dt; if(f.t>1.1)S.floats.splice(fi,1); }
    S.recoil=Math.max(0,S.recoil-dt*4); S.shakeT=Math.max(0,S.shakeT-dt);
    draw();
    rafId=requestAnimationFrame(frame);
  }

  function draw(){
    ctx.setTransform(scale,0,0,scale,0,0);
    var shx=S.shakeT>0?rnd(-2.5,2.5):0, shy=S.shakeT>0?rnd(-2,2):0;
    ctx.translate(shx,shy);
    ctx.drawImage(bg,0,0,W,H);
    /* 目标按 y 排序绘制 */
    var list=S.targets.slice().sort(function(a,b){return a.y-b.y;});
    for(var i=0;i<list.length;i++){ var t=list[i];
      var pose, half=(t.state==='rise'&&t.t<0.25);
      if(t.state==='fall'){ pose=t.t<0.15?'fall1':t.t<0.35?'fall2':'fall3'; }
      else if(t.state==='rise'||t.state==='crouch'){ pose='half'; }
      else if(t.state==='walk'){ pose=(((t.t*6)|0)%2)?'walk1':'walk2'; }
      else if(t.type==='gunner'&&t.state==='up'){ pose=(t.t<GUN_AIM)?'aim':'aim'; }
      else pose='up';
      var vis=true;
      if(t.state==='crouch'&&t.t>0.15)vis=false;
      if(vis){
        var yoff=(t.state==='rise')?(1-Math.min(1,t.t/0.25))*10:0;
        if(t.state==='crouch')yoff=Math.min(10,t.t/0.25*10);
        drawSoldier(ctx,t.x,t.y+yoff,pose,t.type==='walker'?(t.vx>0?1:-1):1,t.type,t.ph);
        /* 机枪手威胁标示 */
        if(t.type==='gunner'&&t.state==='up'&&t.t<GUN_AIM){
          var bl=Math.sin(S.t*10)>0;
          if(bl){ ctx.fillStyle='#e0563e'; ctx.fillRect(Math.round(t.x)-2,Math.round(t.y)-40,4,4);
            ctx.fillStyle='#e0563e'; ctx.fillRect(Math.round(t.x)-1,Math.round(t.y)-35,2,3); }
        }
      }
    }
    for(var pi=0;pi<S.parts.length;pi++){ var p=S.parts[pi],al=1-p.age/p.life;
      ctx.globalAlpha=al; ctx.fillStyle=p.c; ctx.fillRect(p.x,p.y,p.r,p.r); }
    ctx.globalAlpha=1;
    for(var fi=0;fi<S.floats.length;fi++){ var f2=S.floats[fi],fa=1-f2.t/1.1;
      ctx.globalAlpha=Math.max(0,fa); ctx.fillStyle=f2.c;
      ctx.font='9px sans-serif'; ctx.textAlign='center';
      ctx.fillText(f2.txt,Math.round(f2.x),Math.round(f2.y)); }
    ctx.globalAlpha=1; ctx.textAlign='left';
    /* 步枪剪影 + 枪口火光 */
    var rx=W-64, ry=H-6;
    ctx.fillStyle='#241a10'; ctx.fillRect(rx,ry-26,7,26);
    ctx.fillStyle='#171009'; ctx.fillRect(rx+2,ry-40,5,16);
    ctx.fillStyle='#3c3c40'; ctx.fillRect(rx+3,ry-52,3,13);
    if(S.recoil>0.55){ ctx.fillStyle='rgba(255,220,140,0.9)'; ctx.fillRect(rx+2,ry-58,5,6); ctx.fillStyle='rgba(255,160,80,0.5)'; ctx.fillRect(rx,ry-62,9,5); }
    /* 准星 */
    if(S.mode==='playing'){
      var cx2=Math.round(S.px),cy2=Math.round(S.py),gap=Math.round(4+S.recoil*7);
      ctx.strokeStyle='rgba(242,232,200,0.95)'; ctx.lineWidth=1.6;
      ctx.beginPath();
      ctx.moveTo(cx2-gap-6,cy2); ctx.lineTo(cx2-gap,cy2);
      ctx.moveTo(cx2+gap,cy2); ctx.lineTo(cx2+gap+6,cy2);
      ctx.moveTo(cx2,cy2-gap-6); ctx.lineTo(cx2,cy2-gap);
      ctx.moveTo(cx2,cy2+gap); ctx.lineTo(cx2,cy2+gap+6);
      ctx.stroke();
      ctx.fillStyle='rgba(224,86,62,0.95)'; ctx.fillRect(cx2-1,cy2-1,2,2);
    }
  }

  function startGame(){
    S=freshState(); S.mode='playing'; S.wave=1; S.waveT=WAVE_SEC; S.spawnT=0.8;
    overlay.hidden=true; hud.hidden=false;
    ac(); updateHud();
    elBanner.textContent='第 1 波 · 敌兵出现在村口'; elBanner.classList.add('show'); S.waveBannerT=2;
    setStatus('开始。方向键移动准星、空格开火（也可用鼠标瞄准点击）；优先拔掉机枪手（红色标示）。','hit');
  }

  card.innerHTML=startCard();

  function resize(){ var r=cv.getBoundingClientRect(); if(!r.width)return;
    var dpr=Math.min(2,window.devicePixelRatio||1);
    cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.width*9/16*dpr);
    scale=cv.width/W;
  }
  if(window.ResizeObserver){ __ro=new ResizeObserver(resize); __ro.observe(cv); } else { onWin('resize',resize); }
  resize();
  /* ===== 模块化改造新增：running 标志 + 可取消 rAF（close 时置 running=false） ===== */
  var running=true, rafId=0;
  rafId=requestAnimationFrame(frame);

  window.SNIPER1937_DEBUG={ get:function(){ return {mode:S.mode,score:S.score,hp:S.hp,ammo:S.ammo,wave:S.wave,targets:S.targets.length,shots:S.shots,hits:S.hits}; },
    list:function(){ return S.targets.map(function(t){ return {type:t.type,x:Math.round(t.x),y:Math.round(t.y),state:t.state}; }); },
    force:function(type){ spawnTarget(type); },
    fire:fire, result:result, start:startGame };

  /* ===== 模块化改造新增：暴露 stop，供模块 close() 调用（running=false / 取消 rAF / 断开 ResizeObserver / 关闭 AudioContext） ===== */
  return {
    stop: function () {
      running = false;
      if (rafId) { try { cancelAnimationFrame(rafId); } catch (e) {} rafId = 0; }
      if (__ro) { try { __ro.disconnect(); } catch (e) {} __ro = null; }
      if (AC) { try { var closing=AC.close(); if(closing&&closing.catch)closing.catch(function(){}); } catch (e) {} AC = null; master = null; noiseBuf = null; }
    }
  };
}


/* ---------- open / close（模块化改造新增） ---------- */
var state = null;

/* 打开子游戏：nodeId 用于主游戏记分；onDone(result) 在本局结算（end）时回调 */
function open(nodeId, onDone) {
  if (state) close();   /* 防重入：已打开先关闭 */
  __listeners = [];

  var overlay = document.createElement('div');
  overlay.id = 'snm-overlay';
  overlay.innerHTML = '<style>' + OVERLAY_CSS + '</style>'
    + '<div class="snm-op">SIDE OPERATION · 敌后狙击 · 1937</div>'
    + '<button type="button" class="snm-exit" title="退出敌后狙击">✕ 退出 · ESC</button>'
    + '<div class="snm-shell"><div id="sniper-1937">' + STYLE_HTML + STAGE_HTML + FOOT_HTML + '</div></div>';
  document.body.appendChild(overlay);

  var exitBtn = overlay.querySelector('.snm-exit');
  if (exitBtn) exitBtn.addEventListener('click', function () { close(); });
  /* 主游戏一致性：Esc 退出（中途退出不结算，与 ✕ 相同） */
  onDoc('keydown', function (e) { if ((e.key || '').toLowerCase() === 'escape') { e.preventDefault(); e.stopPropagation(); close(); } });

  var s = { overlay: overlay, listeners: __listeners, game: null };
  state = s;
  try {
    /* 挂载游戏（DOM 查询保持全局 id：#sniper-1937 / #sn-canvas 等，主游戏页面无同名 id） */
    s.game = mountGame(overlay, { nodeId: nodeId, onDone: onDone });
  } catch (err) {
    try { close(); } catch (e2) {}
    throw err;
  }
  return true;
}

/* 关闭子游戏：停止主循环 -> 解绑监听 -> 移除遮罩 -> 清理全局名。
   中途退出不结算：onDone 与记分仅由游戏内 end(win) 触发。 */
function close() {
  var s = state;
  if (!s) return;
  state = null;
  var mine = s.listeners;
  __listeners = [];   /* 与本会话解耦（若 onDone 内又 open 了新会话，不影响旧会话清理） */
  if (s.game) {
    try { s.game.stop(); } catch (e) {}
  }
  removeListeners(mine);
  if (s.overlay && s.overlay.parentNode) s.overlay.parentNode.removeChild(s.overlay);
  deleteGlobal('SNIPER1937_DEBUG');
}

window.Sniper1937 = {
  version: VERSION,
  open: open,
  close: close
};
})();
