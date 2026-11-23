/* =============================================================
 * bgm-manager.js —— 长征星火 BGM 管理器（零依赖单文件，window.BGM 单例）
 * 与项目既有 js/bgm65.js 的关系：init() 默认 suppressLegacy() 停用旧版轮询方案，避免双音乐。
 * =============================================================
 BGM：雪山魂塑，循环。
 音频优先级：旁白/动画音效 ＞ BGM
 触发旁白、动画、弹窗：BGM 1.5s平滑降到5%；
 旁白/动画结束、弹窗关闭：1.5s平滑回升至20%~25%继续循环；
 所有转场淡入淡出≥2s，不硬切；不直接切断背景音乐，只做音量压低。
 * ============================================================= */
(function(global){
'use strict';

const DEFAULT_MAIN = 'audio/bgm/xueshan-hunsu-main-loop.mp3';
const DEFAULT_CLIMAX = 'audio/bgm/xueshan-hunsu-climax.mp3';
const MUTE_KEY = 'cz_mute43'; // 与项目全局静音开关 AudioControl43 同键（js/education43.js:70）
const EQ_STEPS = 16;          // 等功率交叉淡变采样点数

function clamp01(v){ return v<0?0:v>1?1:v; }
function nowMs(){ return (global.performance&&performance.now)?performance.now():Date.now(); }

const BGM = {
  /* ---- 配置（init 可覆盖） ---- */
  mainUrl: DEFAULT_MAIN,
  climaxUrl: DEFAULT_CLIMAX,
  baseVolume: 0.22,
  duckVolume: 0.05,
  duckRampMs: 1500,
  crossfadeMs: 2000,
  holdAfterClimaxMs: 8000,
  fadeOutMs: 6000,

  /* ---- 运行状态 ---- */
  inited: false, started: false, starting: false,
  engine: null,                 // 'webaudio' | 'html'
  ctx: null, master: null,      // Web Audio: AudioContext / 主 GainNode
  tracks: {},                   // {main, climax}
  currentTrack: null,           // 'main' | 'climax'
  scene: null,                  // 'prologue' | 'main' | 'settlement'
  muted: false,
  ducks: new Set(),             // duck 引用计数（reason 集合）
  gesture: false, pendingStart: false, pendingTrack: null,
  _holdUntil: 0, _resolved: false, _holdT: 0, _muteT: 0,
  _masterFade: null, _xfade: null, _masterVol: 0, _raf: 0,
  _hidden: false,

  /* ================= 初始化 ================= */
  init(opts){
    opts = opts||{};
    if(this.inited && this.started) return this; // 已在播放：单例，拒绝重复 init
    if(typeof opts.mainUrl==='string' && opts.mainUrl) this.mainUrl = opts.mainUrl;
    if(typeof opts.climaxUrl==='string' && opts.climaxUrl) this.climaxUrl = opts.climaxUrl;
    if(Number.isFinite(opts.baseVolume)) this.baseVolume = clamp01(opts.baseVolume);
    if(Number.isFinite(opts.duckVolume)) this.duckVolume = clamp01(opts.duckVolume);
    if(Number.isFinite(opts.duckRampMs) && opts.duckRampMs>0) this.duckRampMs = opts.duckRampMs;
    if(Number.isFinite(opts.crossfadeMs) && opts.crossfadeMs>=0) this.crossfadeMs = opts.crossfadeMs;
    if(Number.isFinite(opts.holdAfterClimaxMs) && opts.holdAfterClimaxMs>=0) this.holdAfterClimaxMs = opts.holdAfterClimaxMs;
    if(Number.isFinite(opts.fadeOutMs) && opts.fadeOutMs>0) this.fadeOutMs = opts.fadeOutMs;

    // 全局静音：读项目既有开关的持久化值（AudioControl43，localStorage 'cz_mute43'）
    try{ if(global.localStorage && global.localStorage.getItem(MUTE_KEY)==='true') this.muted = true; }catch(e){}
    // 双向同步：接管 AudioControl43.toggle（monkey-patch，项目惯用包装风格，见 snow-prologue63.js:85）
    this._hookAudioControl();
    // 停用旧版 bgm65 轮询，避免两套 BGM 同时出声（可用 opts.keepLegacy=true 保留）
    if(!opts.keepLegacy) this.suppressLegacy();

    if(!this.inited){
      this.inited = true;
      this._installGesture();
      this._installAutoListeners();
    }
    this._prepareEngine();
    try{this.start();}catch{/* Gesture or decode may still be pending. */}
    return this;
  },

  _prepareEngine(){
    const Ctx = global.AudioContext || global.webkitAudioContext;
    if(Ctx){
      try{
        if(!this.ctx){ this.ctx = new Ctx(); }
        if(!this.master){
          this.master = this.ctx.createGain();
          this.master.gain.value = 0;
          this.master.connect(this.ctx.destination);
        }
        this.engine = 'webaudio';
        this._preloadWebAudio();
        return;
      }catch(e){ /* 落入 HTMLAudio 降级 */ }
    }
    this.engine = 'html';
    this.ctx = null; this.master = null;
    this._prepareHtml();
  },

  _preloadWebAudio(){
    const decode = (url)=>fetch(url).then(r=>{ if(!r.ok) throw new Error('HTTP '+r.status); return r.arrayBuffer(); })
      .then(buf=>new Promise((res,rej)=>{
        let p; try{ p=this.ctx.decodeAudioData(buf,res,rej); }catch(e){ return rej(e); }
        if(p && typeof p.then==='function') p.then(res,rej);
      }));
    decode(this.mainUrl).then(buffer=>{
      this._ensureTrack('main', buffer);
    }).catch(()=>{
      // 主循环解码失败：整体降级为 HTMLAudioElement 引擎（交给浏览器解码）
      console.warn('[BGM] Web Audio 解码失败，降级 HTMLAudio 引擎');
      try{ this.ctx.close(); }catch(e){}
      this.ctx=null; this.master=null; this.engine='html'; this.tracks={};
      this._prepareHtml();
    });
    decode(this.climaxUrl).then(buffer=>{
      this._ensureTrack('climax', buffer);
    }).catch(()=>{
      this._ensureTrack('climax', null); // 高潮曲缺失：标记不可用，playClimax 自动回退主循环
      console.warn('[BGM] 高潮曲不可用：', this.climaxUrl);
    });
  },

  _ensureTrack(name, buffer){
    const prev = this.tracks[name];
    if(prev && prev.gain && this.master){
      prev.buffer = buffer||prev.buffer; prev.ready = !!prev.buffer; return prev;
    }
    const t = { buffer: buffer||null, ready: !!buffer, source: null, gain: null, audio: null };
    if(this.engine==='webaudio' && this.master){
      t.gain = this.ctx.createGain(); t.gain.gain.value = 0; t.gain.connect(this.master);
    }
    this.tracks[name] = t;
    return t;
  },

  _prepareHtml(){
    const mk = (url, name)=>{
      const a = new global.Audio(url);
      a.loop = (name!=='climax');
      a.preload = 'auto';
      a.volume = 0;
      a.onended = ()=>{ if(name==='climax' && this.currentTrack==='climax' && !this._resolved) this.climaxResolve(); };
      return { audio:a, ready:true, gain:null, buffer:null, source:null };
    };
    const main = this.tracks.main;
    this.tracks.main = (main && main.audio && main.audio.src.indexOf(this.mainUrl)>=0) ? main : mk(this.mainUrl,'main');
    const climax = this.tracks.climax;
    this.tracks.climax = (climax && climax.audio && climax.audio.src.indexOf(this.climaxUrl)>=0) ? climax : mk(this.climaxUrl,'climax');
  },

  /* ================= 手势解锁（autoplay 策略） ================= */
  _installGesture(){
    const h = ()=>{
      this.gesture = true;
      document.removeEventListener('pointerdown', h);
      document.removeEventListener('keydown', h);
      document.removeEventListener('touchstart', h);
      if(this.engine==='webaudio' && this.ctx) this.ctx.resume().catch(()=>{});
      if(this.pendingStart){ this.pendingStart = false; this.start(); }
    };
    document.addEventListener('pointerdown', h, {passive:true});
    document.addEventListener('keydown', h);
    document.addEventListener('touchstart', h, {passive:true});
  },

  _installAutoListeners(){
    // 项目内建事件兜底：支线完成事件（snow-prologue63.js:118 dispatch）→ 高潮收束
    document.addEventListener('cz:hero-completed', ()=>{ this.playClimax(); this.climaxResolve(); });
    // 页面隐藏时压低、回来自动恢复（不硬切）
    document.addEventListener('visibilitychange', ()=>{
      this._hidden = document.hidden;
      if(this.engine==='webaudio') this._syncMaster(this._hidden?800:this.duckRampMs);
    });
  },

  /* ================= 启动 ================= */
  start(){
    if(this.started || this.starting) return;
    if(!this.inited) this.init();
    if(!this.gesture){ this.pendingStart = true; return; } // 等首次手势后自动续接
    this.starting = true;
    const done = ()=>{
      this.started = true;
      this.currentTrack = 'main';
      const pt = this.pendingTrack; this.pendingTrack = null;
      this.starting = false;
      if(pt==='climax') this.playClimax();
      else if(this.engine==='html') this._runTick();
    };
    if(this.engine==='webaudio'){
      Promise.resolve(this.ctx.resume()).then(()=>{
        const ok = this._startSource('main');
        if(!ok){ // 主轨 Web Audio 不可用 → 降级 HTML 引擎重试
          try{ this.ctx.close(); }catch(e){}
          this.ctx=null; this.master=null; this.engine='html'; this.tracks={};
          this._prepareHtml();
        }
        if(this.engine==='webaudio'){
          const t = this.tracks.main;
          this._ramp(t.gain.gain, 1, this.crossfadeMs);
          this._ramp(this.master.gain, this._desiredVolume(), this.crossfadeMs); // 2s 淡入
          this._masterVol = this._desiredVolume();
        }else{
          this._masterVol = 0;
          this._setMaster(this._desiredVolume(), this.crossfadeMs);
          const a = this.tracks.main.audio;
          a.volume = 0;
          a.play().catch(()=>{});
        }
        done();
      }).catch(()=>{ this.starting = false; });
    }else{
      this._masterVol = 0;
      this._setMaster(this._desiredVolume(), this.crossfadeMs);
      const a = this.tracks.main.audio;
      a.volume = 0;
      a.play().then(()=>{}, ()=>{});
      done();
    }
  },

  /* ================= 音量目标 ================= */
  _desiredVolume(){
    if(this.muted || this._hidden) return 0;
    if(nowMs() < this._holdUntil) return this.baseVolume; // 高潮收束 hold 期：维持 baseVolume 烘托
    return this.ducks.size ? this.duckVolume : this.baseVolume;
  },
  _syncMaster(ms){
    if(this.engine!=='webaudio' || !this.master) { if(this.engine==='html') this._setMaster(this._desiredVolume(), ms); return; }
    const to = this._desiredVolume();
    this._ramp(this.master.gain, to, ms);
  },

  /* ================= duck / unduck（引用计数，1.5s 线性） ================= */
  duck(reason){
    if(!reason) return;
    if(!this.inited) this.init();
    this.ducks.add(String(reason)); // Set：重复 duck 同 reason 幂等
    this._syncMaster(this.duckRampMs);
  },
  unduck(reason){
    if(!reason) return;
    this.ducks.delete(String(reason));
    this._syncMaster(this.duckRampMs);
  },

  /* ================= 场景切换（同曲目不动，异曲目 2s 等功率交叉淡变） ================= */
  setScene(name){
    if(!this.inited) this.init();
    this.scene = name; // 'prologue' | 'main' | 'settlement' —— 三场景共用主循环曲
    if(!this.started) return;
    if(this.currentTrack!=='main') this._switchTo('main', this.crossfadeMs);
  },

  /* ================= 高潮曲 ================= */
  playClimax(){
    if(!this.inited) this.init();
    if(!this.started){ this.pendingTrack = 'climax'; if(!this.gesture) return; }
    this._resolved = false;
    this._holdUntil = 0;
    clearTimeout(this._holdT);
    const ok = this._switchTo('climax', this.crossfadeMs); // 高潮曲不 loop
    if(!ok && this.currentTrack!=='climax') return; // 高潮曲缺失：保持主循环，不中断
    this._syncMaster(this.duckRampMs);
  },
  climaxResolve(opts){
    opts = opts||{};
    if(this.currentTrack!=='climax') return;
    const hold = Number.isFinite(opts.holdMs) ? opts.holdMs : this.holdAfterClimaxMs;
    this._resolved = true;
    clearTimeout(this._holdT);
    this._holdUntil = nowMs() + hold;            // hold 期内维持/回升 baseVolume 烘托情绪
    this._syncMaster(this.duckRampMs);
    this._holdT = setTimeout(()=>{
      this._holdUntil = 0;
      if(this.currentTrack==='climax') this._switchTo('main', this.fadeOutMs); // fadeOutMs 时长交叉淡变回主循环
      this._syncMaster(this.fadeOutMs);
    }, hold);
  },

  /* ================= 全局静音 ================= */
  setMuted(muted, fromControl){
    muted = !!muted;
    if(!this.inited) this.init();
    this.muted = muted;
    try{ global.localStorage && global.localStorage.setItem(MUTE_KEY, String(muted)); }catch(e){}
    if(!fromControl){
      const AC = typeof AudioControl43!=='undefined'?AudioControl43:global.AudioControl43;
      if(AC && AC.muted !== muted){ AC.muted = muted; try{ AC.apply && AC.apply(); }catch(e){} }
    }
    if(this.engine==='webaudio' && this.ctx){
      clearTimeout(this._muteT);
      if(muted){
        this._ramp(this.master.gain, 0, 250);
        this._muteT = setTimeout(()=>{ if(this.muted && this.ctx) this.ctx.suspend().catch(()=>{}); }, 300);
      }else{
        this.ctx.resume().catch(()=>{});
        this._ramp(this.master.gain, this._desiredVolume(), this.duckRampMs);
      }
    }
    // html 引擎：tick 依 _desiredVolume() 归零后自动 pause，解除后自动 play
  },

  _hookAudioControl(){
    const AC = typeof AudioControl43!=='undefined'?AudioControl43:global.AudioControl43;
    if(!AC || AC.__bgmHooked) return;
    AC.__bgmHooked = true;
    const apply=AC.apply;if(typeof apply==='function')AC.apply=function(){const r=apply.apply(this,arguments);BGM.setMuted(AC.muted,true);return r;};
    const toggle = AC.toggle;
    AC.toggle = function(){
      const r = toggle.apply(this, arguments);
      try{ BGM.setMuted(AC.muted, true); }catch(e){}
      return r;
    };
  },

  /* ================= 旧版 bgm65 停用 ================= */
  suppressLegacy(){
    try{
      const L = global.Bgm65;
      if(!L) return false;
      clearInterval(L.timer);
      if(L.audio){ L.audio.pause(); try{ L.audio.src=''; }catch(e){} L.audio = null; }
      L.start = function(){}; L.install = function(){}; L.switchTrack = function(){};
      return true;
    }catch(e){ return false; }
  },

  /* ================= 调试 ================= */
  getState(){
    return {
      inited: this.inited, started: this.started, engine: this.engine,
      muted: this.muted, duckReasons: Array.from(this.ducks),
      currentTrack: this.currentTrack, scene: this.scene,
      targetVolume: this._desiredVolume(), gesture: this.gesture,
      hidden: this._hidden
    };
  },

  /* ================= 内部：Web Audio ================= */
  _ramp(param, to, ms){
    const t = this.ctx.currentTime;
    param.cancelScheduledValues(t);       // 取消旧 ramp 防抖
    param.setValueAtTime(param.value, t); // 从当前值重新出发
    if(ms<=0){ param.setValueAtTime(to, t); return; }
    param.linearRampToValueAtTime(to, t + ms/1000);
  },
  _startSource(name){
    const t = this.tracks[name];
    if(!t || !t.buffer || !this.master) return false;
    if(t.source){ try{ t.source.stop(); }catch(e){} t.source = null; }
    const s = this.ctx.createBufferSource();
    s.buffer = t.buffer;
    s.loop = (name!=='climax');
    s.connect(t.gain);
    s.onended = ()=>{
      if(t.source===s) t.source = null;
      if(name==='climax' && this.currentTrack==='climax' && !this._resolved) this.climaxResolve();
    };
    s.start();
    t.source = s;
    return true;
  },
  _switchTo(name, ms){
    if(this.currentTrack===name) return true;
    if(this.engine==='webaudio'){
      const to = this.tracks[name];
      if(!to || !to.buffer){ console.warn('[BGM] 音轨不可用，保持当前曲目：', name); return false; }
      const now = this.ctx.currentTime;
      this._startSource(name);
      const tg = to.gain.gain;
      tg.cancelScheduledValues(now); tg.setValueAtTime(0, now);
      for(let i=1;i<=EQ_STEPS;i++){ const p=i/EQ_STEPS; tg.linearRampToValueAtTime(Math.sin(p*Math.PI/2), now + ms*p/1000); }
      const fromName = this.currentTrack, from = this.tracks[fromName];
      if(from && from!==to && from.source){
        const fg = from.gain.gain, v = fg.value;
        fg.cancelScheduledValues(now); fg.setValueAtTime(v, now);
        for(let i=1;i<=EQ_STEPS;i++){ const p=i/EQ_STEPS; fg.linearRampToValueAtTime(v*Math.cos(p*Math.PI/2), now + ms*p/1000); }
        const src = from.source;
        setTimeout(()=>{ if(this.currentTrack!==fromName && from.source===src){ try{ src.stop(); }catch(e){} from.source=null; } }, ms+120);
      }
      this.currentTrack = name;
      return true;
    }
    // HTML 引擎：rAF 等功率交叉淡变
    const to = this.tracks[name];
    if(!to || !to.audio){ console.warn('[BGM] 音轨不可用，保持当前曲目：', name); return false; }
    to.audio.loop = (name!=='climax');
    to.audio.volume = 0;
    const p = to.audio.play(); if(p && p.catch) p.catch(()=>{});
    const fromName = this.currentTrack;
    this._xfade = { from: fromName, to: name, at: nowMs(), ms: Math.max(1,ms) };
    this.currentTrack = name;
    return true;
  },

  /* ================= 内部：HTML 引擎 rAF 补间 ================= */
  _setMaster(to, ms){
    this._masterFade = { from: this._masterVol, to: to, at: nowMs(), ms: Math.max(1,ms) };
  },
  _runTick(){
    if(this._raf) return;
    const step = ()=>{
      if(this.engine!=='html') { this._raf = 0; return; }
      const t0 = nowMs();
      // 主音量补间
      if(this._masterFade){
        const f = this._masterFade, p = Math.min(1, (t0-f.at)/f.ms);
        this._masterVol = f.from + (f.to-f.from)*p;
        if(p>=1) this._masterFade = null;
      }
      // 交叉淡变权重（等功率）
      let wMain = this.currentTrack==='main'?1:0, wClimax = this.currentTrack==='climax'?1:0;
      if(this._xfade){
        const x = this._xfade, p = Math.min(1, (t0-x.at)/x.ms);
        const g0 = Math.cos(p*Math.PI/2), g1 = Math.sin(p*Math.PI/2);
        if(x.from==='main') wMain = g0; else if(x.to==='main') wMain = g1; else wMain = 0;
        if(x.from==='climax') wClimax = g0; else if(x.to==='climax') wClimax = g1; else wClimax = 0;
        if(p>=1){
          this._xfade = null;
          const f = this.tracks[x.from];
          if(f && f.audio && !f.audio.paused) f.audio.pause();
        }
      }
      for(const nm in this.tracks){
        const tr = this.tracks[nm];
        if(!tr || !tr.audio) continue;
        tr.audio.volume = clamp01((nm==='main'?wMain:wClimax) * this._masterVol);
      }
      // 静音/隐藏到位后暂停；解除后自动续播（AudioControl43.apply 可能 pause 过本元素）
      if(this._masterVol<=0.001 && !this._xfade){
        for(const nm in this.tracks){ const tr=this.tracks[nm]; if(tr && tr.audio && !tr.audio.paused) tr.audio.pause(); }
      }else{
        const cur = this.tracks[this.currentTrack];
        if(cur && cur.audio && cur.audio.paused && !cur.audio.ended){ const pp=cur.audio.play(); if(pp&&pp.catch) pp.catch(()=>{}); }
      }
      if(this.started || this._xfade || this._masterFade) this._raf = requestAnimationFrame(step);
      else this._raf = 0;
    };
    this._raf = requestAnimationFrame(step);
  }
};

/* 自动初始化：defer 脚本在 DOMContentLoaded 前执行完毕，此处兜底默认参数自启。
   需要自定义参数时，在本文件之后、DOMContentLoaded 之前手动调用 BGM.init({...})。 */
document.addEventListener('DOMContentLoaded', ()=>{
  try{ if(!BGM.getState().inited) BGM.init(); }catch(e){ console.warn('[BGM] init 失败', e); }
});

global.BGM = BGM;
})(typeof window!=='undefined'?window:globalThis);
