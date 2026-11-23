/* Exact transcript and speaker matching for the current user-supplied bank. */
(() => {
 'use strict';
 const config=()=>window.CZVoiceBank84||{root:'audio/competition-v11/',manifest:'audio/competition-v11/audio-manifest.json',revision:'84',snowLetter:[]};
 function role(row){const value=row.roleId||String(row.key||row.id||'').split('-')[0];return ['common','extra'].includes(value)?'gen':value;}
 function pick(rows,text,speaker){const matches=rows.filter(r=>!r.auditionOnly&&r.text===text),rank=rs=>rs.sort((a,b)=>(b.priority||0)-(a.priority||0))[0];return rank(matches.filter(r=>role(r)===speaker))||rank(matches.filter(r=>['gen',''].includes(role(r))));}
 function sequence(rows,text,speaker){const one=pick(rows,text,speaker);if(one)return [one];const lines=text.split('\n').map(s=>s.trim()).filter(Boolean),clips=lines.map(t=>pick(rows,t,speaker));return clips.length&&clips.every(Boolean)?clips:[];}
 function playLetter(rows,host,status){
  if(typeof GameUI==='undefined')return;GameUI.stopNpcVoice();const token=GameUI.npcVoiceToken,store=typeof GameState!=='undefined'?GameState.storyPreparations:null;let index=0;
  const valid=()=>host.isConnected&&GameUI.npcVoiceToken===token&&GameUI.npcVoiceEnabled!==false&&!(typeof AudioControl43!=='undefined'&&AudioControl43.muted)&&(typeof GameState==='undefined'||GameState.storyPreparations===store);
  const next=()=>{if(!valid())return;if(index===rows.length){status.textContent='定稿回信播放完毕';return;}const row=rows[index++],audio=new Audio(config().root+row.file);GameUI.npcAudioElement=audio;status.textContent='正在播放 '+index+' / '+rows.length;audio.onended=next;audio.onerror=()=>{if(valid())status.textContent='此段音频未能读取，请重试。';};audio.play().catch(()=>{if(valid())status.textContent='播放未开始，请点播放重试。';});};
  if(!valid()){status.textContent='请先关闭全部静音并开启剧情配音';return;}next();
 }
 function openSnowLetter(){
  if(typeof Education43==='undefined')return;const d=Education43.dialog('时空信箱 · 斯诺主题配音回信'),rows=config().snowLetter,status=document.createElement('p');status.setAttribute('role','status');
  const note=document.createElement('p');note.textContent='定稿配音文本 · 红军战士的文学演绎回信，非真实历史来信。引文按所提供配音稿呈现，不替代史实档案。';d.append(note);
  for(const row of rows){const p=document.createElement('p');p.textContent=(row.speaker||'红军战士')+'：'+row.text;d.append(p);}
  const play=Education43.button('播放八段定稿回信',()=>playLetter(rows,d,status)),stop=Education43.button('停止配音',()=>{GameUI.stopNpcVoice();status.textContent='配音已停止';});d.append(play,stop,status);
  d.addEventListener('close',()=>GameUI.stopNpcVoice(),{once:true});return d;
 }
 function install(){if(typeof GameUI==='undefined')return;const mount=()=>{const area=document.querySelector('#mailboxOverlay .mailbox-write-area');if(area&&!area.querySelector('[data-voice84-letter]')){const b=Education43.button('斯诺主题 · 听定稿回信',openSnowLetter);b.dataset.voice84Letter='true';area.append(b);}};const old=GameUI.openMailbox;GameUI.openMailbox=function(...args){const r=old.apply(this,args);mount();return r;};document.getElementById('mailboxCloseBtn')?.addEventListener('click',()=>GameUI.stopNpcVoice());}
 window.CZVoiceRuntime84={config,pick,sequence,playLetter,openSnowLetter};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
