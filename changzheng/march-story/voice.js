/* Reuse the current authored voice manifest. Never substitute a similar but different line. */
(() => {
  'use strict';let generation=0;
  function stop(){generation++;window.CZMarchEnv().ui?.stopNpcVoice?.();}
  function exactSequence(rows,text,role){
    if(window.CZVoiceRuntime84)return window.CZVoiceRuntime84.sequence(rows,text,role);
    const pick=line=>rows.find(r=>r.text===line&&String(r.key||r.id).startsWith(role+'-'))||rows.find(r=>r.text===line);
    const whole=pick(text);if(whole)return [whole];
    const lines=text.split('\n').map(s=>s.trim()).filter(Boolean),clips=lines.map(pick);
    return clips.length && clips.every(Boolean)?clips:[];
  }
  async function manifest(){
    const ui=window.CZMarchEnv().ui;if(ui.npcVoiceManifest?.length)return ui.npcVoiceManifest;
    if(typeof fetch!=='function')return [];
    const config=window.CZVoiceBank84||{root:'audio/competition-v11/',manifest:'audio/competition-v11/audio-manifest.json',revision:'84'};
    ui.npcVoiceManifestPromise ||= fetch(config.manifest+'?v='+config.revision).then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(rows=>rows.map(r=>({...r,url:config.root+r.file}))).catch(()=>[]);
    let rows;try{rows=await ui.npcVoiceManifestPromise;}catch{rows=[];}if(rows.length)ui.npcVoiceManifest=rows;else ui.npcVoiceManifestPromise=null;return rows;
  }
  function automatic(){try{return localStorage.getItem('cz_march_autovoice86')!=='false';}catch{return true;}}
  function mount(parent,text,role='narrator',{auto=false}={}){
    const {el,button}=window.CZMarchUI,bar=el('details',undefined,'march83-voice'),status=el('small','选择对白后自动播放；可关闭自动配音');status.setAttribute('role','status');const summary=el('summary','配音 · '+(automatic()?'选择后自动播放':'手动播放'));bar.append(summary);
    async function playAudio(){
      stop();const token=generation,env=window.CZMarchEnv(),voiceToken=env.ui.npcVoiceToken,owner=env.owner,preparations=env.state.storyPreparations;
      if(env.muted){status.textContent='全部静音已开启';return;}
      if(env.ui.npcVoiceEnabled===false){status.textContent='剧情配音已关闭，可在声音设置中开启';return;}
      status.textContent='正在匹配原配音……';const rows=env.ui.npcVoiceManifest?.length?env.ui.npcVoiceManifest:await manifest();
      const valid=()=>generation===token&&env.ui.npcVoiceToken===voiceToken&&bar.isConnected&&window.CZMarchEnv().owner===owner&&env.state.storyPreparations===preparations&&!!env.state.character&&!window.CZMarchEnv().muted;
      if(!valid())return;const clips=exactSequence(rows,text,role);
      if(!clips.length){summary.textContent='本段暂无录音 · 可选朗读';status.textContent='此段暂无精确录音，可选择设备系统朗读';return;}
      let index=0;const next=()=>{
        if(!valid()||index>=clips.length){if(valid())status.textContent='原配音播放完毕';return;}
        const clip=clips[index++],audio=new Audio(clip.url || (window.CZVoiceBank84?.root||'audio/competition-v11/')+clip.file);env.ui.npcAudioElement=audio;
        status.textContent='原配音 · '+index+'/'+clips.length;audio.onended=next;audio.onerror=()=>{if(valid())status.textContent='录音未能读取，可选择设备系统朗读';};
        audio.play().catch(()=>{if(valid()){bar.open=true;status.textContent='浏览器尚未允许播放，请点“重播当前配音”后继续。';}});
      };next();
    }
    const play=button('重播当前配音',playAudio),label=el('label',undefined,'march86-auto-voice'),check=el('input');check.type='checkbox';check.checked=automatic();check.onchange=()=>{try{localStorage.setItem('cz_march_autovoice86',String(check.checked));}catch{/* Playback still works without preference storage. */}summary.textContent='配音 · '+(check.checked?'选择后自动播放':'手动播放');if(check.checked)void playAudio();else{stop();status.textContent='已关闭自动配音，可手动重播。';}};label.append(check,document.createTextNode('选择后自动播放'));
    const system=button('设备系统朗读',()=>{stop();const env=window.CZMarchEnv();if(env.muted){status.textContent='全部静音已开启';return;}if(!window.speechSynthesis){status.textContent='此设备没有可用的系统朗读';return;}status.textContent='系统朗读 · 非预录语音';env.ui?.playWebSpeech?.(role,'calm',text);});
    bar.append(label,play,system,button('停止声音',()=>{stop();status.textContent='声音已停止';}),status);parent.append(bar);
    if(auto&&automatic())void playAudio();else if(automatic())void manifest();
    return bar;
  }
  window.CZMarchVoice={mount,stop,exactSequence,automatic};
})();
