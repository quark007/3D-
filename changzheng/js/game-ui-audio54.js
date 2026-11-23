/* Extracted GameUI audio methods. All instance state remains on GameUI. */
const GameUIAudio54 = {
playDecryptAmbient() {
    try {
      if (this._decryptAmbientOsc) return;
      if (!this.decryptAudioCtx) {
        this.decryptAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.decryptAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = 60;
      gain.gain.value = 0.015;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this._decryptAmbientOsc = osc;
      this._decryptAmbientGain = gain;
    } catch (e) {}
  },
stopDecryptAmbient() {
    try {
      if (this._decryptAmbientOsc) {
        this._decryptAmbientGain.gain.setTargetAtTime(0, this.decryptAudioCtx.currentTime, 0.1);
        this._decryptAmbientOsc.stop(this.decryptAudioCtx.currentTime + 0.2);
        this._decryptAmbientOsc = null;
        this._decryptAmbientGain = null;
      }
    } catch (e) {}
  },
playDecryptBeep(freq, duration) {
    try {
      if (!this.decryptAudioCtx) {
        this.decryptAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.decryptAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  },
_playDefeatTone() {
    try {
      Promise.resolve(this.defeatToneContext?.close()).catch(()=>{});
      const ctx = this.defeatToneContext = new (window.AudioContext || window.webkitAudioContext)();
      const finish = () => { if (this.defeatToneContext === ctx) this.defeatToneContext = null; Promise.resolve(ctx.close()).catch(()=>{}); };
      setTimeout(finish, 1800);
      [392, 330].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.38;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.6);
      });
    } catch (e) { /* 静默降级，不影响流程 */ }
  },
_playVictoryTransition(onComplete) {
    const overlay = document.getElementById('qteOverlay');
    const duration = 1500; // 1.5秒过渡
    const epoch=this.qteTransitionEpoch;

    // 1. 剧烈震动
    overlay.classList.add('shaking', 'victory-shake');

    // 2. 白屏闪烁
    const flash = document.createElement('div');
    flash.className = 'victory-flash';
    document.body.appendChild(flash);
    void flash.offsetWidth; // reflow
    flash.classList.add('active');

    // 3. Web Audio 合成冲锋号
    this._playChargeHorn();

    // 4. 动画结束后回调
    this.qteTransitionTimer=setTimeout(() => {
      if(epoch!==this.qteTransitionEpoch)return;
      overlay.classList.remove('shaking', 'victory-shake');
      flash.classList.remove('active');
      this.qteFlashTimer=setTimeout(() => {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 300);
      if (typeof onComplete === 'function') onComplete();
    }, duration);
  },
_playChargeHorn() {
    try {
      Promise.resolve(this.chargeHornContext?.close()).catch(()=>{});
      const ctx = this.chargeHornContext=new (window.AudioContext || window.webkitAudioContext)();
      const finish=()=>{if(this.chargeHornContext===ctx)this.chargeHornContext=null;Promise.resolve(ctx.close()).catch(()=>{});};
      setTimeout(finish,3000);
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6 冲锋号音阶
      let delay = 0;
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        if(i===notes.length-1)osc.onended=finish;
        osc.stop(ctx.currentTime + delay + 0.5);
        delay += 0.35;
      });
    } catch (e) {
      console.warn('[Web Audio] 冲锋号播放失败:', e);
    }
  },
playTelegramSound() {
    try {
      if (this._telegramBgOsc) return;
      if (!this.telegramAudioCtx) {
        this.telegramAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      // 持续低频背景嗡嗡声
      const ctx = this.telegramAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 120;
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this._telegramBgOsc = osc;
      this._telegramBgGain = gain;
    } catch (e) {}
  },
stopTelegramSound() {
    try {
      if (this._telegramBgOsc) {
        this._telegramBgGain.gain.setTargetAtTime(0, this.telegramAudioCtx.currentTime, 0.1);
        this._telegramBgOsc.stop(this.telegramAudioCtx.currentTime + 0.2);
        this._telegramBgOsc = null;
        this._telegramBgGain = null;
      }
    } catch (e) {}
  },
playTelegraphBeep() {
    try {
      const now=performance.now();
      if(now-(this._lastTelegraphBeepAt||0)<150)return;
      this._lastTelegraphBeepAt=now;
      if (!this.telegramAudioCtx) {
        this.telegramAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = this.telegramAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = 800 + Math.random() * 200;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch (e) {}
  },
pickVoice(voiceType = 'narrator') {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // 只保留中文声音
    const zhVoices = voices.filter(v => /zh|cmn|Chinese/i.test(v.lang));
    if (zhVoices.length === 0) return null;

    // 音色偏好关键词：沉稳男声/新闻播报/纪录片解说风格
    const deepMaleKeywords = /Yunxi|Yunjian|Yunyang|Kangkang|Male|男|Deep|News|Documentary/i;
    const maleVoice = zhVoices.find(v => deepMaleKeywords.test(v.name) && !/Female|女/i.test(v.name));
    if (maleVoice) return maleVoice;

    // 兜底：任意中文男声；再兜底：第一个中文声音
    const anyMale = zhVoices.find(v => !/Female|女/i.test(v.name));
    return anyMale || zhVoices[0];
  },
applyVoiceProfile(utter, voiceType = 'narrator') {
    utter.lang = 'zh-CN';
    const voice = this.pickVoice(voiceType);
    if (voice) utter.voice = voice;

    // 浏览器系统音色降级：中速、接近原音调；不把降调当作沉重感。
    const profiles = {
      narrator:  { rate: 0.94, pitch: 0.96 },
      commander: { rate: 0.98, pitch: 0.96 },
      soldier:   { rate: 0.98, pitch: 1.0 },
      medic:     { rate: 0.96, pitch: 1.0 },
    };
    const p = profiles[voiceType] || profiles.narrator;
    utter.rate = p.rate;
    utter.pitch = p.pitch;
  },
playNarrationSpeech() {
    const text = this._narrationText;
    if (!text) { this.showToast('还没有解说内容'); return; }
    if (!window.speechSynthesis) { this.showToast('当前浏览器不支持语音合成'); return; }

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    this.applyVoiceProfile(utter, 'narrator');
    const btn = document.getElementById('cardNarrationPlayBtn');
    utter.onend = () => { if (btn) btn.textContent = '▶ 播放'; };
    window.speechSynthesis.speak(utter);
    if (btn) btn.textContent = '⏸ 播放中';
  },
autoPlayConclusionVoice() {
    const conclusion = document.getElementById('settlementConclusion').textContent;
    if (!conclusion || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(conclusion);
    this.applyVoiceProfile(utter, 'narrator');

    const btn = document.getElementById('settlementVoiceBtn');
    utter.onend = () => {
      this.settlementVoicePlaying = false;
      if (btn) { btn.classList.remove('playing'); btn.textContent = '语音播报'; }
    };
    utter.onerror = () => {
      this.settlementVoicePlaying = false;
      if (btn) { btn.classList.remove('playing'); btn.textContent = '语音播报'; }
    };

    window.speechSynthesis.speak(utter);
    this.settlementVoicePlaying = true;
    if (btn) { btn.classList.add('playing'); btn.textContent = '停止播报'; }
  },
toggleConclusionVoice() {
    const btn = document.getElementById('settlementVoiceBtn');
    const conclusion = document.getElementById('settlementConclusion').textContent;

    if (this.settlementVoicePlaying) {
      // 停止播报
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      this.settlementVoicePlaying = false;
      btn.classList.remove('playing');
      btn.textContent = '语音播报';
      return;
    }

    if (!conclusion || !window.speechSynthesis) {
      this.showToast('语音播报不可用');
      return;
    }

    const utter = new SpeechSynthesisUtterance(conclusion);
    this.applyVoiceProfile(utter, 'narrator'); // 淘汰默认音色，用沉稳男声

    utter.onend = () => {
      this.settlementVoicePlaying = false;
      btn.classList.remove('playing');
      btn.textContent = '语音播报';
    };

    utter.onerror = () => {
      this.settlementVoicePlaying = false;
      btn.classList.remove('playing');
      btn.textContent = '语音播报';
    };

    window.speechSynthesis.speak(utter);
    this.settlementVoicePlaying = true;
    btn.classList.add('playing');
    btn.textContent = '停止播报';
  },
async playNpcVoice(roleId, emotion, text) {
    if (!this.npcVoiceEnabled || !text) return;
    this.stopNpcVoice();
    const token = this.npcVoiceToken = (this.npcVoiceToken || 0) + 1;
    // Fixed clips must match every spoken word, never select an unrelated clip by emotion.
    if (!this.npcVoiceManifest) {
      this.npcVoiceManifestPromise??=(async()=>{try{const config=window.CZVoiceBank84||{root:'audio/competition-v12/',manifest:'audio/competition-v12/audio-manifest.json',revision:'86e43134cd6b6bfe'},r=await fetch(config.manifest+'?v='+config.revision,{cache:'no-cache'});if(!r.ok)return [];return (await r.json()).map(row=>({...row,url:config.root+row.file}));}catch{return [];}})();
      try{const rows=await this.npcVoiceManifestPromise;if(rows.length)this.npcVoiceManifest=rows;else{this.npcVoiceManifest=null;this.npcVoiceManifestPromise=null;}}catch{this.npcVoiceManifest=null;this.npcVoiceManifestPromise=null;}
    }
    if (token !== this.npcVoiceToken) return;
    const matches = (this.npcVoiceManifest||[]).filter(item => item.text === text);
    const exact = window.CZVoiceRuntime84?window.CZVoiceRuntime84.pick(matches,text,roleId):matches.find(item=>String(item.key||item.id).startsWith(roleId+'-')) || matches[0];
    if (exact) {
      const audio = new Audio(exact.url);
      this.npcAudioElement = audio;
      try { await audio.play(); } catch (_) { if(token===this.npcVoiceToken&&this.npcAudioElement===audio&&this.npcVoiceEnabled)this.offerSystemVoice(roleId, emotion, text,token); }
    } else this.offerSystemVoice(roleId,emotion,text,token);
  },
offerSystemVoice(roleId,emotion,text,token){
    if(token!==this.npcVoiceToken||!this.npcVoiceEnabled)return;const host=document.getElementById('npcSuggestActions');if(!host)return;
    host.querySelector('.npc-voice-fallback')?.remove();const button=document.createElement('button');button.className='npc-voice-fallback';button.textContent='此句暂用字幕 · 可选系统朗读';button.onclick=()=>{if(token===this.npcVoiceToken)this.playWebSpeech(roleId,emotion,text);};host.append(button);
  },
playWebSpeech(roleId, emotion, text) {
    if (!text || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(text);
    this.applyVoiceProfile(utter, roleId === 'narrator' ? 'narrator' : 'soldier');
    utter.rate = ['tragic','defeat'].includes(emotion) ? 0.92 : emotion==='tense'?0.99:0.96;
    utter.pitch = roleId==='chen_xiaoman'?1.0:0.97;
    window.speechSynthesis.speak(utter);
  },
stopNpcVoice() {
    this.npcVoiceToken = (this.npcVoiceToken || 0) + 1;
    document.querySelectorAll('.npc-voice-fallback').forEach(b=>b.remove());
    if (this.npcAudioElement) {
      this.npcAudioElement.pause();
      this.npcAudioElement = null;
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }
};
