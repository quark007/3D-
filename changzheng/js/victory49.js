/* Final celebration: bounded SVG/CSS animation, no render loop or model download. */
const Victory49={
  art(){
    const sparks=Array.from({length:18},(_,i)=>`<circle class="v49-spark" cx="${120+i*55}" cy="${210+(i*97)%350}" r="${i%3+1}" style="--i:${i}"/>`).join('');
    const rays=Array.from({length:12},(_,i)=>`<path d="M600 260 L600 74" transform="rotate(${i*30} 600 260)"/>`).join('');
    return `<svg viewBox="0 0 1200 680" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="红星照耀群山，金色征途汇聚，红旗迎风展开。原创长征精神主题艺术动画，非测绘地图。"><defs><radialGradient id="v49-sun"><stop stop-color="#f8d980" stop-opacity=".32"/><stop offset="1" stop-color="#f8d980" stop-opacity="0"/></radialGradient><linearGradient id="v49-gold" x2="1" y2="1"><stop stop-color="#fff0ba"/><stop offset="1" stop-color="#bd883f"/></linearGradient><linearGradient id="v49-red"><stop stop-color="#f34c37"/><stop offset="1" stop-color="#8b1e27"/></linearGradient></defs><circle class="v49-aura" cx="600" cy="260" r="290" fill="url(#v49-sun)"/><g class="v49-rays" stroke="#f0cb7c" stroke-width="1" opacity=".18">${rays}</g><path fill="#182e32" d="M0 470L95 310 175 400 290 238 390 370 465 275 600 422 710 235 825 362 940 275 1080 423 1200 320V680H0Z"/><path fill="#254043" d="M0 570L150 410 240 495 390 350 510 487 675 398 790 500 975 380 1200 540V680H0Z"/><path fill="#101f25" d="M0 620L170 500 310 589 480 475 680 580 840 475 1010 570 1200 455V680H0Z"/><path class="v49-route v49-route-shadow" d="M-30 640Q170 570 275 592T452 500Q520 450 593 480T780 421Q850 395 908 354T1080 303"/><path class="v49-route" d="M-30 640Q170 570 275 592T452 500Q520 450 593 480T780 421Q850 395 908 354T1080 303"/>${sparks}<g class="v49-star"><path fill="url(#v49-gold)" d="M600 139L626 211 703 214 643 262 662 337 600 295 538 337 557 262 497 214 574 211Z"/><path fill="#bd302d" d="M600 164L620 222 681 225 634 262 648 321 600 287 552 321 566 262 519 225 580 222Z"/></g><g class="v49-flag"><path d="M925 182V394" stroke="#e8c77d" stroke-width="5"/><path d="M928 185Q974 166 1017 189T1114 184L1100 284Q1055 303 1014 282T928 280Z" fill="url(#v49-red)"/><path d="M951 207L957 224 975 225 961 236 965 253 951 243 936 253 941 236 927 225 945 224Z" fill="#f7d589" transform="translate(19 0) scale(.9)"/></g><g fill="#efca7c" opacity=".85"><circle cx="275" cy="592" r="5"/><circle cx="593" cy="480" r="5"/><circle cx="780" cy="421" r="5"/><circle cx="1080" cy="303" r="7"/></g></svg>`;
  },
  open(){
    if(typeof GameState==='undefined'||!GameState.gameCompleted)return false;
    if(this.dialog?.open){this.dialog.focus();return true;}
    const previous=document.activeElement,d=document.createElement('dialog');d.className='victory49';d.setAttribute('aria-labelledby','victory49-title');
    d.innerHTML=`<header><span>长征 · 星火 / 征途纪念</span><button type="button" data-close aria-label="退出胜利展示，返回地图">退出 ×</button></header><main><section class="v49-scene">${this.art()}<div class="v49-copy"><p>1934 — 1936 · 信念如炬</p><h1 id="victory49-title">星火不灭<span>征途永续</span></h1><p class="v49-subtitle">你已完成十二章征程。把沿途的勇气，带向新的出发。</p></div></section><section class="v49-film" hidden><video controls playsinline preload="none" poster="assets/victory49/poster.jpg" aria-label="长征通关纪念影片"></video><div class="v49-video-tools"><button type="button" data-back>返回胜利画面</button><button type="button" data-fullscreen>全屏播放</button></div></section></main><footer><p class="v49-status" role="status">原创主题动画 · AI生成纪念影片，非历史影像；游戏体验不改变真实历史。</p><div><button type="button" class="v49-play" data-play>▶ 播放通关纪念影片</button><button type="button" data-close>退出 · 返回地图</button></div></footer>`;
    const video=d.querySelector('video'),scene=d.querySelector('.v49-scene'),film=d.querySelector('.v49-film'),status=d.querySelector('.v49-status');this.dialog=d;this.previous=previous;
    /* 结局三分支：按星火勋章燎原点数决定终章措辞与渲染层级（0-7 微光 / 8-14 不灭 / 15+ 燎原） */
    try{
      const ov=(typeof Medal72!=='undefined')?Medal72.overview():null;
      if(ov){const n=ov.earned,tier=n>=15?3:n>=8?2:1;
        d.classList.add('v49-tier-'+tier);
        const h1=d.querySelector('#victory49-title'),sub=d.querySelector('.v49-subtitle'),copy=d.querySelector('.v49-copy');
        if(tier===1&&h1){h1.firstChild.nodeValue='星火初燃';}
        if(tier===3&&h1){h1.firstChild.nodeValue='星火燎原';}
        if(sub&&tier!==2)sub.textContent=tier===1?'点点微光，已照亮脚下的路。把沿途拾起的勇气，带向新的出发。':'满天星火，汇成燎原之势。这条路会记住每一步。';
        if(copy){const p=document.createElement('p');p.className='v49-sparkline';p.textContent=`燎原进度 ${n} / ${ov.total} · 守夜人 ${Number.isFinite(ov.nightwatch)?ov.nightwatch:0} 天`;copy.append(p);}
      }
    }catch{/* 勋章模块未加载时不影响结算画面 */}

    const stop=()=>{video.pause();video.removeAttribute('src');video.load();};
    const exitFullscreen=()=>{if(document.fullscreenElement&&d.contains(document.fullscreenElement))document.exitFullscreen?.().catch(()=>{});};
    const back=()=>{exitFullscreen();stop();scene.hidden=false;film.hidden=true;d.classList.remove('v49-watching');d.querySelector('[data-play]').focus();};
    d.querySelectorAll('[data-close]').forEach(button=>{button.onclick=()=>d.close();});
    d.querySelector('[data-back]').onclick=back;
    d.querySelector('[data-play]').onclick=()=>{
      scene.hidden=true;film.hidden=false;d.classList.add('v49-watching');status.textContent='AI生成纪念影片 · 非历史影像。可使用播放器控件调整音量、进度或全屏。';
      if(!video.getAttribute('src'))video.src='assets/victory49/victory-film.mp4';
      video.muted=typeof AudioControl43!=='undefined'&&AudioControl43.muted;
      video.play()?.catch(()=>{status.textContent='请点击播放器中的播放按钮继续；可随时返回或退出。';});
    };
    d.querySelector('[data-fullscreen]').onclick=()=>{
      try{if(video.requestFullscreen)video.requestFullscreen().catch(()=>{status.textContent='此浏览器未允许全屏，请使用播放器自带的全屏按钮。';});else if(video.webkitEnterFullscreen)video.webkitEnterFullscreen();else status.textContent='可使用播放器自带的全屏按钮，或横屏观看。';}catch{status.textContent='请使用播放器自带的全屏按钮，或横屏观看。';}
    };
    video.addEventListener('error',()=>{status.textContent='影片暂未加载成功。请返回胜利画面后重试；也可随时退出，通关进度已保存。';});
    const memory=()=>{let message='';try{message=typeof SnowPrologue63!=='undefined'?SnowPrologue63.state().message||'':'';}catch{}if(!d.querySelector('[data-first-message]')){const block=document.createElement('blockquote');block.dataset.firstMessage='';block.textContent=message?'出发前，你写下：'+message:'这段征途已经走过。愿你记得出发时的初心。';block.style.cssText='padding:20px;background:#23382d;color:#fff1d4;font-size:20px;line-height:1.8';film.append(block);}status.textContent='旅途终点 · 回望出发前的初心';};
    video.addEventListener('ended',memory);
    d.addEventListener('close',()=>{exitFullscreen();stop();d.remove();if(this.dialog===d)this.dialog=null;if(previous?.isConnected)previous.focus();},{once:true});
    if(typeof WitnessReport65!=='undefined')WitnessReport65.mount(d.querySelector('footer'));Victory49.chronicle?.mount?.(d.querySelector('footer'));document.body.append(d);d.showModal();d.querySelector('[data-play]').focus();return true;
  },
  install(){
    const host=document.getElementById('rewardEntries');if(!host||host.querySelector('[data-victory49]'))return;
    const button=document.createElement('button');button.type='button';button.dataset.victory49='';button.textContent='重看通关庆典';button.onclick=()=>this.open();host.append(button);
  }
};document.addEventListener('DOMContentLoaded',()=>Victory49.install());
/* 史官评语：通关复盘。BFF /history/chronicle 优先（3秒预算），失败/超时走本地确定性模板；仅研学评述，非历史文献。 */
Victory49.chronicle={
 declaration:'史官评语由系统生成，属研学创作评述，非历史文献。',
 references:[['共产党员网 · 遵义会议和红军长征的胜利','https://fuwu.12371.cn/2016/07/22/ARTI1469154834425831.shtml'],['人民网党史频道 · 回忆飞夺泸定桥之战','https://cpc.people.com.cn/n1/2022/0721/c443712-32481508.html']],
 timeout:3000,
 payload(){
  const res=(typeof GameState!=='undefined'&&GameState.resources)||{};
  const num=v=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(0,n):0;};
  let heroes=0;if(typeof SnowPrologue63!=='undefined'){try{heroes=Object.values(SnowPrologue63.state().heroes||{}).filter(h=>h&&h.completed).length;}catch{heroes=0;}}
  const trace=(typeof GameState!=='undefined'&&GameState.decisionTrace)||[];
  return {decisions:trace.map(r=>({node:String(r?.nodeId??'').slice(0,40),choice:String(r?.command||'').slice(0,200),summary:String(r?.nodeName||'').slice(0,80)})).slice(0,200),resources:{ammo:num(res.ammo),food:num(res.food),morale:num(res.morale),troops:num(res.troops)},heroes};
 },
 localText(p){
  const places=(p.decisions||[]).map(d=>d.summary).filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).slice(0,3);
  return '史官曰：此番研学，共录决策'+(p.decisions||[]).length+'条'+(p.heroes?`，沿途见证故事${p.heroes}则`:'')+'。'
   +places.map(s=>`行至${s}，亦有取舍。`).join('')
   +'湘江之渡见坚韧，遵义之会明方向，泸定之桥验勇毅，会宁之师成大局。'
   +`行囊所记：弹药${p.resources.ammo}、粮秣${p.resources.food}、士气${p.resources.morale}、兵力${p.resources.troops}，皆为模拟数值。`
   +'以上每一步均已对照真实史实逐条研阅；演练取舍不改真实历史分毫。愿征途所记，助你读懂二万五千里的信念与艰难。';
 },
 async request(p){if(typeof apiRequest!=='function')return null;try{return await apiRequest('/history/chronicle',p,this.timeout);}catch{return null;}},
 save(text,mode){
  if(typeof window!=='undefined'&&window.CZ_DEMO_SESSION)return;
  if(typeof GameState==='undefined'||!GameState)return;
  const host=GameState.storyPreparations;
  if(!host||typeof host!=='object'||Array.isArray(host))GameState.storyPreparations={};
  GameState.storyPreparations.chronicle49={version:1,text:String(text).slice(0,600),mode:mode==='model'?'model':'local',at:new Date().toISOString()};
  try{GameState.save();}catch{}
 },
 panel(title){
  if(typeof Education43!=='undefined'&&Education43.dialog)return Education43.dialog(title);
  const d=document.createElement('dialog');d.className='victory49-chronicle';const h=document.createElement('header'),t=document.createElement('h2'),close=document.createElement('button');close.type='button';close.textContent='关闭';close.onclick=()=>d.close();t.textContent=title;h.append(t,close);d.append(h);
  d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);try{d.showModal();}catch{}
  return d;
 },
 referencesInto(host){
  if(typeof Education43!=='undefined'&&Education43.references){Education43.references(host,this.references);return;}
  const div=document.createElement('div');div.className='education43-sources';const strong=document.createElement('strong');strong.textContent='参考来源';div.append(strong);
  for(const [label,url] of this.references){const a=document.createElement('a');a.textContent=label;a.href=url;a.target='_blank';a.rel='noopener noreferrer';div.append(a);}
  host.append(div);
 },
 open(){
  if(typeof GameState==='undefined'||!GameState.gameCompleted)return null;
  const d=this.panel('史官评语 · 通关复盘');d.classList.add('chronicle49');
  const notice=document.createElement('p');notice.className='education43-notice';notice.textContent=this.declaration;
  const status=document.createElement('p');status.setAttribute('role','status');status.textContent='正在研阅你的征途记录…（3秒内未响应将转为本地生成）';
  const body=document.createElement('article');
  d.append(notice,status,body);
  const payload=this.payload();
  const finish=(text,mode)=>{
   body.replaceChildren();
   const tag=document.createElement('p');tag.className='chronicle49-mode';tag.textContent=mode==='model'?'AI 生成评语 · 逐条对照史实，仍请核对出处':'本地生成 · 确定性模板（服务未响应）';
   const content=document.createElement('p');content.textContent=text;content.style.whiteSpace='pre-line';
   body.append(tag,content);this.referencesInto(body);
   if(status.isConnected)status.textContent='';
   this.save(text,mode);
   return d;
  };
  this.request(payload).then(res=>{
   if(res&&typeof res.text==='string'&&res.text.trim())finish(res.text,res.mode==='model'?'model':'local');
   else finish(this.localText(payload),'local');
  }).catch(()=>finish(this.localText(payload),'local'));
  return d;
 },
 mount(host){
  if(!host||host.querySelector('[data-chronicle49]'))return;
  const b=document.createElement('button');b.type='button';b.dataset.chronicle49='';b.textContent='史官评语 · 通关复盘';
  b.onclick=()=>this.open();
  if(typeof GameState==='undefined'||!GameState.gameCompleted)b.disabled=true;
  host.append(b);
 }
};
