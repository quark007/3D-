const DecisionCinema={
  catalog:null,root:null,session:0,requestId:0,lastKey:'',lastTime:0,recent:new Map(),
  shotKey(clip){return typeof DecisionCinemaCore.identity==='function'?DecisionCinemaCore.identity(clip):String(clip.shotId||clip.id);},
  remember(id,clip){const key=this.shotKey(clip),list=this.recent.get(id)||[];this.recent.set(id,[...list.filter(x=>x!==key),key].slice(-6));},
  base(){return (typeof API_BASE==='string'?API_BASE:'http://localhost:8000').replace(/\/$/,'');},
  mediaBase(){return ['czstar.cc.cd','47.243.68.243'].includes(location.hostname)?location.origin+'/api':this.base();},
  async check(){const status=document.getElementById('decisionVideoStatus');if(!status)return;if(['127.0.0.1','localhost','[::1]'].includes(new URL(this.base(),location.href).hostname)&&!window.CZ_LOCAL_BFF_PROBE){status.textContent='未检测 · 不影响主线剧情；需要时点击测试播放。';return;}status.textContent='正在检查视频连接…';const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);try{const r=await fetch(this.base()+'/media/catalog',{signal:controller.signal});if(!r.ok)throw Error('status');const data=await r.json();status.textContent=data.ready?`视频源 ${data.bucket||''} · ${data.count}个目录条目。`+(data.auth_mode==='offline'?'本地视频已配置，无需OBS联网授权。':data.auth_mode==='private'?'服务端凭证已配置，播放时验证读取权限。':(data.expires_at&&Number.isFinite(Date.parse(data.expires_at))?`临时授权有效至${new Date(data.expires_at).toLocaleString('zh-CN')}。`:'临时授权到期时间尚未提供，播放时检查读取权限。')):(data.message||'视频读取授权未就绪或已到期，请更新服务端授权。');}catch{status.textContent='尚未连上视频服务，请先连接 AI 服务后重试。';}finally{clearTimeout(timer);}},
  async load(){if(this.catalog)return this.catalog;const r=await fetch('assets/obs-video-catalog.json?v=20261022audit50',{cache:'no-cache'});if(!r.ok)throw Error('catalog');return this.catalog=await r.json();},
  emit(kind,entry={}){return this.play({id:entry.nodeId},entry.text||entry.command,{...entry,kind});},
  chapterDecisionControls(host,node,options={}){
    const state=options.state||{draft:'',savedCommand:'',savedKind:''};
    const section=document.createElement('section');section.className='chapter-video-decisions';
    const heading=document.createElement('h3');heading.textContent='本章行动方案';
    const note=document.createElement('p');note.className='chapter-plan-note';note.textContent='点选预设即可记录，也可以直接输入自己的安排。记录方案不会跳过本章；完成下方阅读判断后，再点击确认继续。';
    section.append(heading,note);
    const plans={3:['核对史料来源后，再组织集体研判','整理军事与组织问题，核实不同材料'],8:['先核对保暖被服，再分担负重结伴行军','保持前后联络，照应体力下降的战友并短暂休整'],9:['观察泥泞落脚点，保持联络结伴前行','核对剩余口粮，再商量与战友分享干粮'],11:['先核对到达人员和物资，再安排休整','与当地群众说明来意，做好接洽和物资交接'],12:['核对各部来向资料，整理会师与接应记录','按现有条件分担保障任务，照应来往战友']}[node.id]||['先核对现有条件，再商量分工与联络','按岗位分担携行，照应同行战友'];
    const presets=[];
    const label=document.createElement('label');label.textContent='你的自定义决策';
    const input=document.createElement('textarea');input.className='chapter-plan-input';input.maxLength=300;input.rows=4;input.value=state.draft||'';input.placeholder='例如：先检查保暖物资，再和战友分担负重。';input.setAttribute('aria-label','本章自定义行动方案');input.autocomplete='off';label.append(input);
    const status=document.createElement('p');status.className='chapter-plan-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const counter=document.createElement('small');counter.className='chapter-plan-counter';
    const refresh=()=>{counter.textContent=`${input.value.length}/300字`;for(const b of presets){const selected=state.savedKind==='fixed_decision'&&state.savedCommand===b.dataset.plan&&input.value.trim()===state.savedCommand;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}options.onChange?.(state);};
    const commit=(command,kind)=>{
      const text=String(command||'').trim();
      if(!text){status.textContent='请写下行动安排，或选择上方任一预设方案。';input.focus();return false;}
      try{
        if(state.savedCommand!==text||state.savedKind!==kind)GameState.recordStrategicDecision({nodeId:node.id,nodeName:node.name,command:text,videoKind:kind,phase:'proposed',outcome:'本章行动提案已记录，尚未执行'});
        state.draft=text;state.savedCommand=text;state.savedKind=kind;input.value=text;
        status.textContent='✓ 方案已记录，可继续完成下方阅读判断。映像匹配在后台进行，就绪后可自行点击观看。';refresh();return true;
      }catch{status.textContent='本次方案未能记录，输入内容已保留，请再试一次。';return false;}
    };
    for(const text of plans){const b=document.createElement('button');b.type='button';b.className='chapter-plan-preset';b.dataset.plan=text;b.textContent=text;b.setAttribute('aria-pressed','false');b.onclick=()=>commit(text,'fixed_decision');presets.push(b);section.append(b);}
    input.oninput=()=>{state.draft=input.value;status.textContent=input.value.trim()===state.savedCommand&&state.savedCommand?'✓ 当前方案已记录。':'草稿已保留，修改后请点击“记录我的决策”再继续。';refresh();};
    input.addEventListener('keydown',event=>{if(!['Tab','Escape'].includes(event.key))event.stopPropagation();});
    const submit=document.createElement('button');submit.type='button';submit.className='chapter-plan-submit';submit.textContent='记录我的决策并匹配视频';submit.onclick=()=>commit(input.value,'custom_decision');
    section.append(label,counter,submit,status);
    status.textContent=state.savedCommand&&input.value.trim()===state.savedCommand?'✓ 当前方案已记录，内容仍可修改。':'先点选一个方案，或直接填写后记录。';
    refresh();host.append(section);return section;
  },
  installGameplay(){
    if(typeof GameUI!=='undefined'){
      const open=GameUI.showPreBattleChoice;if(open)GameUI.showPreBattleChoice=function(node){this.videoPrebattleNode=node;return open.apply(this,arguments);};
      const choose=GameUI.handlePreBattleChoice;if(choose)GameUI.handlePreBattleChoice=function(choice){const node=this.videoPrebattleNode;const result=choose.apply(this,arguments);if(node)DecisionCinema.emit('fixed_decision',{nodeId:node.id,text:choice==='rest'?'就地休整，核对补给与队伍状态':'保持联络，按任务安排继续行军'});return result;};
    }
    const ration=GameState.setRationResult;if(ration)GameState.setRationResult=function(nodeId){const result=ration.apply(this,arguments);DecisionCinema.emit('fixed_decision',{nodeId,text:'按分配方案分享口粮，照应同行战友'});return result;};
    if(typeof JourneyChapter!=='undefined'){
      const record=JourneyChapter.record;if(record)JourneyChapter.record=function(label){const result=record.apply(this,arguments);const events=this.eventData?.flatMap(e=>e.options.map(o=>o.label))||[];if(events.includes(label)||['行装确认','岗位协作完成','渡河协作完成'].includes(label))DecisionCinema.emit('fixed_decision',{nodeId:1,text:({行装确认:'清点口粮饮水和携行物资',岗位协作完成:'分担物资并核对分工联络',渡河协作完成:'按分工完成渡运接应'})[label]||label});return result;};
      const chat=JourneyChapter.sendChat;if(chat)JourneyChapter.sendChat=async function(){const message=this.state?.chatDraft?.trim(),session=this.session,before=this.state?.chat?.length||0;const result=await chat.apply(this,arguments);if(message&&this.session===session&&this.root&&this.state.chat.length>before+1)DecisionCinema.emit('custom_dialogue',{nodeId:1,text:message,context:this.state.chat.at(-1)?.text||'',isCurrent:()=>this.session===session&&!!this.root});return result;};
    }
  },
  async retrieve(catalog,id,text,options){
    const kind=options.kind||'custom_decision',role=GameState.character?.id||GameState.character||'soldier';
    if(!Array.isArray(catalog?.assets)||!catalog.assets.length)return {clips:[],mode:'none',reason:'视频目录暂未就绪，可继续任务。'};
    if(kind.includes('decision'))catalog={...catalog,assets:catalog.assets.filter(a=>a.collection==='original210')};
    if(!kind.includes('decision')&&id===7&&typeof window!=='undefined'&&window.CZ_LOCAL_MEDIA_COLLECTIONS?.includes('ldq35'))return {...DecisionCinemaCore.match(catalog,id,text,{role,recent:this.recent.get(id)||[]}),mode:kind.startsWith('fixed_')?'fixed':'local',reason:'按本章行动匹配剧情分镜。'};
    if(kind.startsWith('fixed_'))return DecisionCinemaCore.fixed(catalog,id,text,{...options,role,recent:this.recent.get(id)||[]});
    const cacheKey=JSON.stringify([typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:'default',this.base(),id,kind,role,String(text).trim(),String(options.context||''),catalog.assets.map(a=>a.id)]);
    this.modelMatches??=new Map();const cached=this.modelMatches.get(cacheKey);
    if(cached&&Date.now()-cached.time<600000)return {...cached.match,cached:true};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),48000);this.retrievalAbort?.abort();this.retrievalAbort=controller;
    try{
      const response=await fetch(this.base()+'/media/select',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({node_id:id,kind,text:String(text).slice(0,1200),context:String(options.context||'').slice(0,1600),role:typeof role==='string'?role:'soldier',library:kind.includes('decision')?'original210':'all'}),signal:controller.signal});
      if(!response.ok)throw Error('retrieval');const result=await response.json();
      if(!Array.isArray(result.ids))throw Error('ids');
      if(kind.includes('decision')&&result.mode!=='model')return {clips:[],mode:'unavailable',reason:'AI 检索暂未完成，请重试；当前任务与决策已保留。'};
      const clips=[...new Set(result.ids)].slice(0,3).map(key=>catalog.assets.find(a=>a.id===key&&a.source_kind!=='diagram'&&a.eligible&&!a.library_only&&(!a.allowed_roles||a.allowed_roles.includes(role))&&a.nodes.includes(id))).filter(Boolean);
      const match={clips,mode:result.mode,reason:result.reason};
      if(result.mode==='model'&&clips.length){if(this.modelMatches.size>=64)this.modelMatches.delete(this.modelMatches.keys().next().value);this.modelMatches.set(cacheKey,{time:Date.now(),match});}
      return match;
    }catch{if(kind.includes('decision'))return {clips:[],mode:'unavailable',reason:'AI 检索暂未完成，请重试；当前任务与决策已保留。'};try{const local=DecisionCinemaCore.match(catalog,id,text,{role,recent:this.recent.get(id)||[]});return {...local,mode:'local',reason:'AI 视频检索暂未完成，使用本章有限规则匹配。'};}catch{return {clips:[],mode:'local',reason:'本章映像暂未就绪，可继续文字任务。'};}}finally{clearTimeout(timer);}
  },
  close(){this.lastKey='';this.lastTime=0;this.retrievalAbort?.abort();document.querySelectorAll('.decision-film-pending').forEach(el=>el.remove());this.session++;this.requestId++;this.cleanup?.();this.cleanup=null;if(this.root){const video=this.root.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load();}this.root.remove();this.root=null;}this.returnFocus?.focus?.({preventScroll:true});},
  async play(node,command,options={}){
    const id=Number(node?.id||node);if(!id||!String(command||'').trim())return;
    if(!options.isCurrent&&!(options.kind||'').startsWith('fixed_')){
      const origin=document.activeElement?.closest?.('.learning-overlay,.sandbox-overlay,.command-overlay,.zunyi-overlay,.zunyi-chapter-overlay,.award-demo-overlay,.journey-overlay,.pressure-overlay');
      if(origin){
        const opened=origin.classList.contains('open'),commandSession=origin.matches('.command-overlay')&&typeof GameUI!=='undefined'?GameUI.commandSession:null;
        options={...options,isCurrent:()=>origin.isConnected&&!origin.hidden&&origin.getAttribute('aria-hidden')!=='true'&&(!opened||origin.classList.contains('open'))&&(commandSession===null||commandSession===GameUI.commandSession)};
      }
    }
    const key=`${id}:${options.kind||'custom_decision'}:${command}`;if(options.dedupe!==false&&key===this.lastKey&&Date.now()-this.lastTime<1500)return;
    this.lastKey=key;this.lastTime=Date.now();
    const request=++this.requestId;
    let catalog;try{catalog=await this.load();}catch{return;}
    if((options.kind||'custom_decision').includes('decision'))catalog={...catalog,assets:(catalog.assets||[]).filter(a=>a.collection==='original210')};
    if(!catalog.assets?.length)return {clips:[],mode:'none',reason:'视频目录暂未就绪，可继续任务。'};
    if(request!==this.requestId||(options.isCurrent&&!options.isCurrent()))return;
    this.retrievalAbort?.abort();document.querySelectorAll('.decision-film-pending').forEach(el=>el.remove());
    const initiatingFocus=document.activeElement,container=options.container?.isConnected?options.container:document.body;
    const offer=(match,label='本段映像已就绪 · 点击观看')=>{document.querySelectorAll('.decision-film-ready').forEach(el=>el.remove());const ready=document.createElement('button');ready.className='decision-film-pending decision-film-ready';ready.textContent=label;ready.onclick=()=>{ready.remove();this.play(node,command,{...options,userInitiated:true,preparedMatch:match,dedupe:false});};const host=options.container?.isConnected?container:options.kind?.includes('dialogue')&&document.getElementById('npcOverlay')?.classList.contains('open')?document.getElementById('npcSuggestActions'):null;if(host){ready.classList.add('decision-film-inline');host.append(ready);}else document.body.append(ready);};
    let pending;
    try {
    if(options.userInitiated&&!options.preparedMatch){pending=document.createElement('div');pending.className='decision-film-overlay decision-film-loading';pending.setAttribute('role','dialog');const panel=document.createElement('section');panel.className='decision-film-panel';const title=document.createElement('h2');title.textContent='正在检索与你的决策对应的映像';const text=document.createElement('p');text.textContent=String(command);const status=document.createElement('p');status.setAttribute('role','status');status.textContent=(options.kind||'').startsWith('fixed_')?'正在匹配预设决策的视频…':'AI 正在按章节与你的决策检索映像，可返回继续任务。';const back=document.createElement('button');back.textContent='返回行动结果';back.onclick=()=>{pending?.remove();pending=null;options.userInitiated=false;};panel.append(title,text,status,back);pending.append(panel);container.append(pending);}
    else if(!(options.kind||'').startsWith('fixed_')){pending=document.createElement('div');pending.className='decision-film-pending';pending.setAttribute('role','status');pending.textContent='AI 正在检索本章对应视频，可继续当前操作…';container.append(pending);}
    if(!options.userInitiated&&!options.preparedMatch&&options.kind==='custom_dialogue'){const preview=DecisionCinemaCore.match(catalog,id,command,{role:GameState.character?.id||'soldier',requirePrimary:true,recent:this.recent.get(id)||[]});if(preview.clips.length){pending?.remove();offer({...preview,mode:'local',reason:'规则即时初选，AI 复核尚未完成。'},'规则初选已就绪 · 可先预览（ AI 复核中）');}}
    let match=options.preparedMatch||await this.retrieve(catalog,id,command,options);pending?.remove();
    if(!options.preparedMatch&&(options.kind||'').includes('decision')&&!(options.kind||'').startsWith('fixed_')&&(match.mode==='unavailable'||!match.clips.length)){
      const local=DecisionCinemaCore.match(catalog,id,command,{role:GameState.character?.id||'soldier',recent:this.recent.get(id)||[]});
      if(local.clips.length)match={...local,mode:'local',reason:'AI 检索未完成，先按本章行动匹配本地素材。'};
    }
    const recent=this.recent.get(id)||[];
    if(!options.preparedMatch&&(options.kind||'').startsWith('fixed_')&&match.clips.length&&match.clips.every(clip=>recent.includes(this.shotKey(clip)))){
      const alternate=(options.kind||'').startsWith('fixed_')?DecisionCinemaCore.fixed(catalog,id,command,{...options,role:GameState.character?.id||'soldier',recent}):DecisionCinemaCore.match(catalog,id,command,{role:GameState.character?.id||'soldier',requirePrimary:true,recent});
      const fresh=alternate.clips.filter(clip=>!recent.includes(this.shotKey(clip)));
      if(fresh.length)match={...alternate,clips:fresh,mode:(options.kind||'').startsWith('fixed_')?'fixed':'local',reason:'优先选择本章尚未观看、且符合本次行动的镜头。'};
    }
    if(!options.userInitiated&&match.clips.length&&match.clips.every(clip=>recent.includes(this.shotKey(clip))))match={...match,clips:[],reason:'本章匹配镜头刚刚看过，继续文字剧情；可在片库主动回看。'};
    if(request!==this.requestId||(options.isCurrent&&!options.isCurrent()))return;
    if(!match.clips.length){document.querySelectorAll('.decision-film-ready').forEach(el=>el.remove());if(typeof GameUI!=='undefined')GameUI.showToast?.(match.reason||'没有贴合本段内容的视频，继续当前剧情。');if(match.mode==='unavailable'){const retry=document.createElement('button');retry.className='decision-film-pending decision-film-ready';retry.textContent='AI 视频检索未完成 · 点击重试';retry.onclick=()=>{retry.remove();this.play(node,command,{...options,userInitiated:true,dedupe:false});};container.append(retry);}return match;}
    if(!options.userInitiated){
      offer(match,match.mode==='model'?'AI 复核 · 点击观看':'本段映像已就绪 · 点击观看');return match;
    }
    this.close();this.lastKey=key;this.lastTime=Date.now();this.returnFocus=initiatingFocus?.isConnected?initiatingFocus:document.activeElement;const token=this.session;
    const root=document.createElement('div');root.className='decision-film-overlay';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','自定义行动预演');root.tabIndex=-1;
    const panel=document.createElement('section');panel.className='decision-film-panel';
    const head=document.createElement('header'),heading=document.createElement('h2');heading.textContent='你的行动 · 剧情映像';
    const back=document.createElement('button');back.textContent=options.kind?.includes('dialogue')?'继续对话':'继续任务';back.onclick=()=>this.close();head.append(heading,back);
    const plan=document.createElement('p');plan.className='decision-film-plan';plan.textContent=String(command).slice(0,240);
    const video=document.createElement('video');video.controls=true;video.autoplay=true;video.muted=typeof AudioControl43!=='undefined'&&AudioControl43.muted;video.playsInline=true;video.preload='metadata';
    const status=document.createElement('p');status.className='decision-film-status';status.setAttribute('role','status');
    const note=document.createElement('small');note.textContent=(match.mode==='model'?'AI 语义检索':match.mode==='fixed'?'固定剧情映射':'本章规则匹配 · 非 AI 检索')+' · '+(match.reason||'')+' 场景示意，不是历史影像，不表示行动已执行或成功。';
    const nav=document.createElement('div');nav.className='decision-film-nav';
    const retry=document.createElement('button');retry.textContent='重播当前片段';const next=document.createElement('button');next.textContent='下一段';
    const sound=document.createElement('button');sound.textContent=video.muted?'开启原片声音':'关闭原片声音';sound.onclick=()=>{if(typeof AudioControl43!=='undefined'&&AudioControl43.muted){status.textContent='当前已全部静音，可先在声音设置中恢复声音。';return;}video.muted=!video.muted;sound.textContent=video.muted?'开启原片声音':'关闭原片声音';};nav.append(retry,next,sound);
    panel.append(head,plan,video,status,nav,note);root.append(panel);container.append(root);this.root=root;root.focus({preventScroll:true});
    let index=0,timer,failed=false,retried=false;video.addEventListener('playing',()=>this.remember(id,match.clips[index]));this.cleanup=()=>{clearTimeout(timer);video.onerror=null;video.onended=null;video.onloadeddata=null;};
    const start=(alternate=false)=>{clearTimeout(timer);failed=false;if(!alternate)retried=false;const clip=match.clips[index];status.textContent=`${index+1}/${match.clips.length} · AI视频素材 · ${clip.title}`;
      // Action playback uses uploaded footage only; a numbered SVG is a different library.
      if(clip.poster&&/\.(?:jpe?g|png|webp)(?:\?|$)/i.test(clip.poster))video.poster=clip.poster;else video.removeAttribute('poster');
      video.src=clip.localSrc||`${alternate?this.base():this.mediaBase()}/media/videos/${encodeURIComponent(clip.id)}${alternate?'?retry=1':''}`;
      sound.disabled=false;sound.textContent=video.muted?'开启原片声音':'关闭原片声音';video.load();video.play().catch(()=>{if(!failed&&token===this.session)status.textContent='请点击视频播放键，开启有声播放。';});next.disabled=index>=match.clips.length-1;timer=setTimeout(()=>{if(token===this.session&&video.readyState<2)status.textContent='视频载入较慢，可以重试或继续任务。';},10000);};
    video.onloadeddata=()=>clearTimeout(timer);video.onerror=()=>{clearTimeout(timer);failed=true;if(!retried&&token===this.session){retried=true;start(true);return;}status.textContent='视频暂时无法读取，请点击重播重试，或继续任务；决策已保留。';};
    video.onended=()=>{if(index<match.clips.length-1){index++;start();}else status.textContent='本次行动映像播放完毕，可继续任务。';};retry.onclick=()=>start();next.onclick=()=>{if(index<match.clips.length-1){index++;start();}};
    root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();clearTimeout(timer);this.close();}if(e.key==='Tab'){const buttons=[...panel.querySelectorAll('button:not(:disabled),video')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
    start();return match;
    } catch(error) {
      if(request===this.requestId){this.lastKey='';this.lastTime=0;document.querySelectorAll('.decision-film-ready').forEach(el=>el.remove());}
      return {clips:[],mode:'local',reason:'本章映像暂未就绪，可继续文字任务。'};
    } finally { pending?.remove(); }
  },
  install(){
    const check=document.getElementById('decisionVideoCheck');if(check)check.onclick=()=>this.check();this.check();
    if(this.installed)return;this.installed=true;
    this.installGameplay();
    const record=GameState.recordStrategicDecision;GameState.recordStrategicDecision=function(entry){const result=record.apply(this,arguments);const nodeId=entry.nodeId==='award-demo-zunyi'?3:Number(entry.nodeId);if(nodeId&&entry.command&&!entry.videoHandled)requestAnimationFrame(()=>DecisionCinema.play({id:nodeId},entry.command,{kind:entry.videoKind||'custom_decision'}));return result;};
    if(typeof JourneyChapter!=='undefined')for(const [method,field] of [['analyzePlan','plan'],['analyzeDecision','decisionDraft']]){const run=JourneyChapter[method];JourneyChapter[method]=async function(){const command=this.state?.[field]?.trim(),session=this.session,before=method==='analyzePlan'?this.state?.analysis:this.state?.decisionPreview;const result=await run.apply(this,arguments);const after=method==='analyzePlan'?this.state?.analysis:this.state?.decisionPreview;const valid=after!==before&&(method==='analyzePlan'?after&&this.state?.actions?.length:after&&after.intent!=='unclear');if(command&&session===this.session&&this.root&&valid&&this.state[field]?.trim()===command)DecisionCinema.play({id:1},command,{isCurrent:()=>!!this.root&&session===this.session});return result;};}
  }
};
/* Bundled chunks are module-scoped; the start bundle needs the player across that boundary. */
window.DecisionCinema=DecisionCinema;
document.addEventListener('DOMContentLoaded',()=>DecisionCinema.install());
