const PlayerSettings = {
  values:{sound:true,music:true,vibration:false,notes:true,englishPrologue:false},
  syncSwitchState(input){
    const state=input.closest('.setting-item')?.querySelector('.switch-state');
    if(state)state.textContent=input.checked?'开':'关';
  },
  apply(){
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;document.body.classList.toggle('no-vibration',!this.values.vibration||reduced);if(reduced)this.values.vibration=false;
    document.body.classList.toggle('hide-history-notes',!this.values.notes);
    document.querySelectorAll('#settingsPanel .switch input[data-key]').forEach(input=>this.syncSwitchState(input));
    if(!this.values.sound){GameUI.stopNpcVoice?.();window.speechSynthesis?.cancel();if(typeof ExperienceSystem!=='undefined')ExperienceSystem.stopAudio?.();}
    if(!this.values.music){GameUI.stopDecryptAmbient?.();if(typeof ExperienceSystem!=='undefined'&&ExperienceSystem.ambient){Promise.resolve(ExperienceSystem.ambient.close()).catch(()=>{});ExperienceSystem.ambient=null;}}
    const wantEn=this.values.englishPrologue===true;
    if(typeof I18nSnow65!=='undefined'&&I18nSnow65.lang()!==(wantEn?'en':'zh'))I18nSnow65.setLang(wantEn?'en':'zh');
    document.querySelectorAll('input[data-snow65-lang]').forEach(cb=>{cb.checked=wantEn;this.syncSwitchState(cb);});
  },
  englishToggle(){
    const wrap=document.createElement('div');wrap.className='setting-item';
    const span=document.createElement('span');span.className='setting-name';span.textContent='English Prologue';
    const lab=document.createElement('label');lab.className='switch';
    const cb=document.createElement('input');cb.type='checkbox';cb.checked=this.values.englishPrologue===true;cb.dataset.snow65Lang='1';
    cb.setAttribute('aria-label','English Prologue，开 = 英文开场旁白');
    const slider=document.createElement('span');slider.className='slider';
    const state=document.createElement('span');state.className='switch-state';state.setAttribute('aria-hidden','true');state.textContent=cb.checked?'开':'关';
    const control=document.createElement('div');control.className='setting-control';
    lab.append(cb,slider);control.append(lab,state);wrap.append(span,control);
    cb.onchange=()=>{this.values.englishPrologue=cb.checked;try{localStorage.setItem('changzheng_settings',JSON.stringify(this.values));}catch{}this.apply();this.syncSwitchState(cb);};
    return wrap;
  },
  install(){
    try{const saved=JSON.parse(localStorage.getItem('changzheng_settings')||'{}');for(const key of Object.keys(this.values))if(typeof saved[key]==='boolean')this.values[key]=saved[key];}catch{}
    const list=document.querySelector('#settingsPanel .settings-list');
    const switches=document.querySelectorAll('#settingsPanel .setting-item .switch input');
    const anchor=switches.length?switches[switches.length-1].closest('.setting-item'):null;
    const panelItem=this.englishToggle();
    if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',panelItem);else if(list)list.append(panelItem);
    const extras=document.querySelector('.title-extras-panel');
    if(extras)extras.append(this.englishToggle());
    document.querySelectorAll('#settingsPanel .switch input[data-key]').forEach((input)=>{
      const key=input.dataset.key;if(!(key in this.values))return;
      input.checked=this.values[key];this.syncSwitchState(input);
      input.setAttribute('aria-label',input.closest('.setting-item')?.querySelector('.setting-name')?.textContent.replace(/\s+/g,' ').trim()||key);
      input.onchange=()=>{this.values[key]=input.checked;try{localStorage.setItem('changzheng_settings',JSON.stringify(this.values));}catch{}this.apply();this.syncSwitchState(input);};
    });
    for(const name of ['playDecryptBeep','playTelegramSound','playTelegraphBeep','_playChargeHorn','playNpcVoice','playWebSpeech','playNarrationSpeech']){const fn=GameUI[name];if(fn)GameUI[name]=function(){if(PlayerSettings.values.sound)return fn.apply(this,arguments);};}
    const ambient=GameUI.playDecryptAmbient;if(ambient)GameUI.playDecryptAmbient=function(){if(PlayerSettings.values.music)return ambient.apply(this,arguments);};
    if(typeof ExperienceSystem!=='undefined'){for(const name of ['playClip','speak']){const fn=ExperienceSystem[name];ExperienceSystem[name]=function(){if(PlayerSettings.values.sound)return fn.apply(this,arguments);};}const fn=ExperienceSystem.toggleAmbient;ExperienceSystem.toggleAmbient=function(){if(PlayerSettings.values.music)return fn.apply(this,arguments);};}
    const style=document.createElement('style');style.textContent='.no-vibration .shaking{animation:none!important}.hide-history-notes .card-detail-source,.hide-history-notes .card-narration-source{display:none!important}';document.head.append(style);this.apply();
  }
};
document.addEventListener('DOMContentLoaded',()=>PlayerSettings.install());
