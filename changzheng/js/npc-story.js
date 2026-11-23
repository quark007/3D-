/* Authored fictional dialogue, scoped to chapter and task stage. */
const NpcStory={
  scripts:[],current:null,
  role(){return GameState.character?.id||GameState.character||'soldier';},
  get(node,part){return this.scripts.find(s=>s.nodeId===Number(node)&&s.part===part);},
  context(){const id=GameUI.npcCurrentRole;const next=(this.current?.fallback||[]).find(l=>l.npcId===id&&NpcStoryCore.allowed(l,{npcId:id}));return {role:this.role(),command:GameUI.pendingCommand||'',taskHint:next?NpcStoryCore.say(next,{role:this.role()}):'',nodeId:this.current?.nodeId};},
  requestContext(){return this.current?{script_id:this.current.id,task_context:{role:this.role(),nodeId:this.current.nodeId,part:this.current.part,strategy:typeof Campaign55!=='undefined'?Campaign55.memory():[]}}:{};},
  fixedOptions(){
    const s=this.current,id=GameUI.npcCurrentRole;if(!s)return [];
    const partner=({commander:'he_wen',logistics:'logistics_1',medic:'medic_1',soldier:'wang_gui'})[this.role()];
    const rows=(s.responses||[]).filter(l=>(l.npcId===id||(l.npcId==='role_partner'&&partner===id))&&NpcStoryCore.allowed({...l,npcId:id},{...this.context(),npcId:id})&&!['history','boundary','anachronism','unclear','plan','other'].includes(l.intent));
    const labels={comfort:'我给你打打气',fear:'我心里还有些担忧',support:'有什么需要我搭手的？',status:'说说眼前的任务',clarify:'我们再核实一下',disagree:'我还有不同想法'};
    const seen=new Set(),out=[];for(const l of rows){if(seen.has(l.intent)||out.length>=3)continue;seen.add(l.intent);out.push({label:labels[l.intent]||l.label,reply:NpcStoryCore.say(l,this.context())});}
    if(!out.length){const l=[...(s.fallback||[]),...(s.closing||[])].find(l=>(l.npcId===id||(l.npcId==='role_partner'&&partner===id))&&NpcStoryCore.allowed({...l,npcId:id},{npcId:id}));if(l)out.push({label:'我再确认一下安排',reply:NpcStoryCore.say(l,this.context())});}return out;
  },
  /* [R5 2026-10-28] 章节轮数规则的唯一来源：键为 `${nodeId}:${part}`，未命中用默认值。
     教程（player-onboarding）、章节提示（chapter-direction）、帮助（education43）、
     摩斯学堂（morse-academy/morse-training）、行军抉择（pressure-challenge）以及本文件
     的进度条/按钮/无障碍文本一律从这两个字段读取，不再散落写死的“8轮”。 */
  ROUND_RULES:{'1:1':3},ROUND_DEFAULT:8,
  required(script){const s=script||{};return this.ROUND_RULES[s.nodeId+':'+s.part]??this.ROUND_DEFAULT;},
  describe(){const first=this.required({nodeId:1,part:1});return first===this.ROUND_DEFAULT?`每章完成${first}轮`:`第一章完成${first}轮、其余各章完成${this.ROUND_DEFAULT}轮`;},
  unlocked(nodeId){const script=this.get(nodeId,1);return !!script&&NpcDialogueFlow.count(script,this.role())>=this.required(script);},
  startGate(node){if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){GameUI.showToast('此站尚未解锁，先完成前一章任务');return;}const script=this.get(node.id,1);if(!script)return;this.current=script;const id=NpcStoryCore.participants(script,this.role()).find(id=>id!=='narrator')||'narrator';GameUI.openNpcChat(id,NpcStoryCore.scenes[node.id],node);},
  updateGate(nodeId){
    const panel=document.getElementById('dungeonPanel');if(Number(panel?.dataset.nodeId)!==Number(nodeId))return;
    const button=document.getElementById('btnEnter'),script=this.get(nodeId,1);if(!button||!script)return;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(nodeId))return;
    const count=NpcDialogueFlow.count(script,this.role());button.disabled=false;button.textContent=count<this.required(script)?`与战友交谈 · ${count}/${this.required(script)}`:'对话已完成 · 进入任务';
    const host=panel.querySelector('.panel-body');if(count>=this.required(script))this.foldCompleted(host,nodeId);
    document.querySelectorAll('.npc-story-gate-progress').forEach(e=>{if(Number(e.dataset.nodeId)===Number(nodeId))e.textContent=count<this.required(script)?`行动准备 · ${count}/${this.required(script)}：确认职责、照应同伴、核验携行`:'行动准备已完成 · 可进入任务，或继续深入交谈';});
  },
  showChoices(){
    const host=document.getElementById('npcSuggestActions'),restoreChoiceFocus=host.contains(document.activeElement);host.replaceChildren();if(!this.current)return;
    const script=this.current,count=NpcDialogueFlow.count(script,this.role());
    const overlay=document.getElementById('npcOverlay');if(overlay&&!overlay.querySelector('.npc-history-toggle')){const history=document.createElement('button');history.className='npc-history-toggle';history.textContent='查看对话记录';history.onclick=()=>{const expanded=overlay.classList.toggle('npc-history-expanded');history.textContent=expanded?'返回当前对白':'查看对话记录';history.setAttribute('aria-expanded',String(expanded));};overlay.querySelector('.npc-header')?.append(history);}
    document.getElementById('npcOverlay')?.classList.toggle('npc-fixed-mode',this.mode!=='free');
    const total=this.required(script);
    const hint=document.createElement('small');hint.className='npc-fixed-hint';hint.textContent=script.nodeId===1&&script.part===1&&this.mode!=='free'?`行动准备 ${Math.min(count,total)}/${total} · ${count>=total?'可先行动，也可继续深入阅读':'确认职责 → 照应同伴 → 核验携行'}`:this.mode==='free'?'自由交谈不计入剧情解锁轮数':count<total?`剧情对话 ${count}/${total} · 第${count+1}轮：选择你要说的话`:`剧情对话 ${total}/${total} · 本段交谈完成`;host.append(hint);
    const track=document.createElement('div');track.className='npc-dialogue-progress';track.setAttribute('aria-label',`已完成${count}轮，共${total}轮`);for(let i=0;i<total;i++){const pip=document.createElement('span');pip.className=i<count?'done':i===count?'current':'';track.append(pip);}host.append(track);
    if(this.mode!=='free')for(const [index,option] of NpcDialogueFlow.options(script,this.role(),GameUI.npcCurrentRole).entries()){
      const b=document.createElement('button');b.className='npc-fixed-choice';b.textContent=`${index+1}. ${option.label}`;b.onclick=()=>{const selected=NpcDialogueFlow.choose(script,this.role(),GameUI.npcCurrentRole,index,count);if(!selected)return;this.interruptPending();GameUI.renderNpcPlayerMessage(selected.label);GameUI.renderNpcAiMessage({reply:selected.reply,emotion_tag:'calm',instant:true});this.showChoices();this.updateGate(script.nodeId);if(typeof DecisionCinema!=='undefined'){const session=GameUI.npcSession;DecisionCinema.emit('fixed_dialogue',{nodeId:script.nodeId,text:selected.label,context:selected.reply,part:script.part,round:count+1,isCurrent:()=>GameUI.npcSession===session&&document.getElementById('npcOverlay')?.classList.contains('open')});}};host.append(b);
    }
    if(this.mode!=='free'&&count){const undo=document.createElement('button');undo.className='npc-previous-choice';undo.textContent='返回上一个选项';undo.disabled=typeof StoryConsequences!=='undefined'&&!!StoryConsequences.row(script.nodeId);undo.title=undo.disabled?'任务已按此对话执行，保留已结算结果。':'撤回最近一轮，重新选择';undo.onclick=()=>{if(!NpcDialogueFlow.undo(script,this.role()))return;this.interruptPending();GameUI.npcChatHistory=[];document.getElementById('npcChatFlow').replaceChildren();const turns=NpcDialogueFlow.turns(script,this.role());GameUI.renderNpcAiMessage({reply:turns.at(-1)?.reply||NpcStoryCore.opening(script,GameUI.npcCurrentRole,this.context()),emotion_tag:'calm',instant:true,replay:true});this.showChoices();this.updateGate(script.nodeId);};host.append(undo);}
    const back=document.createElement('button');back.className='npc-fixed-return';back.disabled=count<this.required(script);back.textContent=count<this.required(script)?`完成准备后行动（${count}/${this.required(script)}）`:script.part===1&&this.unlocked(script.nodeId)?'对话完成 · 进入本章任务':'本段完成 · 返回剧情';back.onclick=()=>{if(NpcDialogueFlow.count(script,this.role())<this.required(script))return;GameUI.closeNpcChat();if(script.part===1&&this.unlocked(script.nodeId)){const pending=this.pendingTask;this.pendingTask=null;if(pending&&pending.nodeId===script.nodeId)pending.run();else if(Number(document.getElementById('dungeonPanel')?.dataset.nodeId)===script.nodeId)GameUI.enterDungeon();}};host.append(back);
    const mode=document.createElement('button');mode.className='npc-mode-switch';mode.textContent=this.mode==='free'?'返回固定剧情（继续解锁）':'单独自由交谈（不计轮数）';mode.onclick=()=>{this.interruptPending();this.mode=this.mode==='free'?'fixed':'free';this.showChoices();if(this.mode==='free')document.getElementById('npcInput').focus();};host.append(mode);
    if(restoreChoiceFocus){const target=this.mode==='free'?document.getElementById('npcInput'):host.querySelector('.npc-fixed-choice,.npc-fixed-return:not(:disabled)')||mode;target?.focus({preventScroll:true});}
  },
  interruptPending(){
    GameUI.npcRequestId=(GameUI.npcRequestId||0)+1;GameUI.npcSubmitting=false;GameUI.hideNpcTypingIndicator();
    document.querySelector('#npcChatFlow .npc-typing-content')?.parentElement?.click();clearInterval(GameUI.npcTypewriterTimer);GameUI.npcIsTyping=false;GameUI.stopNpcVoice();
  },
  focusTask(host){
    if(!host)return;
    requestAnimationFrame(()=>{if(!host.isConnected)return;const candidates=[...host.querySelectorAll('h3,h2,h1,textarea,input,button:not(.npc-mode-switch)')].filter(el=>!el.closest('.story-fold,.npc-story-card,.npc-story-recap,.npc-story-completed,.story-preparation'));const target=candidates.find(el=>/^H[1-3]$/.test(el.tagName))||candidates[0]||host;target.setAttribute('tabindex','-1');target.style.scrollMarginTop='20px';target.scrollIntoView({block:'nearest',behavior:'instant'});target.focus({preventScroll:true});});
  },
  foldCompleted(host,nodeId){
    if(!host||!this.unlocked(nodeId))return;
    const fold=()=>{if(!host.isConnected)return;for(const card of host.querySelectorAll(':scope > .npc-story-card')){const details=document.createElement('details');details.className='npc-story-completed story-fold';const summary=document.createElement('summary');summary.textContent='战友交谈已完成 · 展开回看';card.before(details);details.append(summary,card);}};
    fold();(typeof requestAnimationFrame==='function'?requestAnimationFrame:queueMicrotask)(fold);
  },
  attach(host,node,part=1){
    if(!host||!node)return;host.querySelectorAll(':scope > .npc-story-card,:scope > .npc-story-recap,:scope > .npc-story-completed,:scope > .story-fold').forEach(e=>e.remove());
    const script=this.get(node.id,part);if(!script)return;
    if(part>1&&this.unlocked(node.id)){
      const recap=document.createElement('details');recap.className='npc-story-recap story-fold';const summary=document.createElement('summary');summary.textContent='战友交谈已完成 · 展开回看';recap.append(summary);
      const row=document.createElement('div');for(const id of NpcStoryCore.participants(script,this.role())){const b=document.createElement('button');b.textContent=NpcStoryCore.names[id];b.onclick=()=>{this.current=script;this.returnHost=host;GameUI.openNpcChat(id,NpcStoryCore.scenes[node.id],node);};row.append(b);}recap.append(row);host.prepend(recap);(typeof requestAnimationFrame==='function'?requestAnimationFrame:queueMicrotask)(()=>{if(recap.isConnected&&recap.parentElement===host)host.prepend(recap);});return;
    }
    const card=document.createElement('section');card.className='npc-story-card';
    const title=document.createElement('strong');title.textContent=`选项剧情对话 · ${script.title}`;card.append(title);
    const intro=document.createElement('p');intro.className='npc-story-intro';const gate=this.get(node.id,1)||script;intro.textContent=part===1?(node.id===1?`先完成${this.required(script)}轮必要准备，即可进入第一件协作行动；完整8轮可继续深入阅读。`:`每轮选择一句话，听战友回应；完成${this.required(script)}轮后解锁本章任务。`)+'中途退出保留进度，自由交谈不计轮数。':`本段采用${this.required(script)}轮连续选项对话。章节任务解锁需先完成本章开场的${this.required(gate)}轮交谈。`;card.append(intro);
    if(part===1){const progress=document.createElement('p');progress.className='npc-story-gate-progress';progress.dataset.nodeId=node.id;const count=NpcDialogueFlow.count(script,this.role());progress.textContent=count<this.required(script)?`行动准备 · ${count}/${this.required(script)}：确认职责、照应同伴、核验携行`:'行动准备已完成 · 可进入任务，或继续深入交谈';card.append(progress);}
    const row=document.createElement('div');row.className='npc-story-actions';
    const participants=NpcStoryCore.participants(script,this.role());
    const primary=participants.find(id=>id!=='narrator')||participants[0];
    if(primary){const start=document.createElement('button');start.className='npc-story-start';start.textContent='开始选项剧情对话';start.onclick=()=>{this.current=script;GameUI.openNpcChat(primary,NpcStoryCore.scenes[script.nodeId],node);};card.append(start);}
    for(const id of participants){
      const b=document.createElement('button');b.textContent=NpcStoryCore.names[id];b.onclick=()=>{this.current=script;GameUI.openNpcChat(id,NpcStoryCore.scenes[script.nodeId],node);};row.append(b);
    }
    card.append(row);host.prepend(card);
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='本章对话剧本 · 预览其他片段';details.append(summary);
    for(const other of this.scripts.filter(s=>s.nodeId===Number(node.id)&&s.id!==script.id)){
      const group=document.createElement('div'),label=document.createElement('small');label.textContent=other.title;group.append(label);
      for(const id of NpcStoryCore.participants(other,this.role())){const b=document.createElement('button');b.textContent=NpcStoryCore.names[id];b.onclick=()=>{this.current=other;GameUI.openNpcChat(id,NpcStoryCore.scenes[other.nodeId],node);document.getElementById('npcRoleLabel').textContent+=' · 剧本预览，不计入经历';};group.append(b);}details.append(group);
    }card.append(details);this.foldCompleted(host,node.id);
  },
  install(){if(this.installed)return;this.installed=true;
    NpcDialogueFlow.load();
    for(const [id,name] of Object.entries(NpcStoryCore.names)){
      if(!NPC_ROLES[id])NPC_ROLES[id]={name,label:'虚构任务角色'};
      if(!NPC_PORTRAITS[id])NPC_PORTRAITS[id]=NPC_PORTRAITS.he_wen;
      if(!ROLE_TO_NPC_ID[id])ROLE_TO_NPC_ID[id]=id;
    }
    NPC_ROLES.wang_gui.label='约40岁 · 老班长 · 虚构角色';NPC_ROLES.chen_xiaoman.label='17岁 · 青年战士 · 虚构角色';NPC_ROLES.he_wen.label='约27岁 · 指导员 · 虚构角色';ROLE_TO_NPC_ID.enemy_messenger='enemy_messenger';
    const open=GameUI.openNpcChat;GameUI.openNpcChat=function(id,level,node){
      if(!NpcStory.current||NpcStory.current.nodeId!==Number(node?.id))NpcStory.current=NpcStory.get(node?.id,1);
      if(this.qteActive){NpcStory.paused=this.qteCurrentNode;this.qteActive=false;clearTimeout(this.qteStallTimer);}
      const r=open.call(this,id,level,node);const s=NpcStory.current;NpcStory.usedChoices=new Set();NpcStory.mode='fixed';NpcStory.dialogueStep=0;if(s)document.getElementById('npcRoleLabel').textContent=`${(NPC_ROLES[id]?.label || id)} · ${s.id} ${s.title}`;NpcStory.showChoices();this.npcOpeningMessage(id);return r;
    };
    GameUI.npcOpeningMessage=async function(id){if(this.npcCurrentRole!==id||this.npcChatHistory.length)return;const s=NpcStory.current;if(s){this.renderNpcAiMessage({reply:NpcStoryCore.opening(s,id,NpcStory.context()),emotion_tag:'calm',instant:true,replay:NpcDialogueFlow.count(s,NpcStory.role())>0});for(const turn of NpcDialogueFlow.turns(s,NpcStory.role())){this.renderNpcPlayerMessage(turn.label,true);this.renderNpcAiMessage({reply:turn.reply,emotion_tag:'calm',instant:true,replay:true});}const flow=document.getElementById('npcChatFlow');flow.scrollTop=flow.scrollHeight;}};
    const send=GameUI.sendNpcMessage;GameUI.sendNpcMessage=async function(){
      if(this.npcSubmitting||this.npcIsTyping)return;
      const input=document.getElementById('npcInput'),message=input.value.trim();if(!message)return;
      const script=NpcStory.current,session=this.npcSession,before=this.npcChatHistory.length,reply=NpcStoryCore.practicalReply(message,NpcStory.context());
      // Typed messages use the player's chosen model, even while fixed options remain open.
      const result=await send.apply(this,arguments);
      if(script&&session===this.npcSession&&this.npcChatHistory.length>before&&typeof DecisionCinema!=='undefined'){
        const last=this.npcChatHistory.filter(row=>row.role!=='player').at(-1);
        DecisionCinema.emit('custom_dialogue',{nodeId:script.nodeId,text:message,context:last?.text||reply||script.title,isCurrent:()=>this.npcSession===session&&document.getElementById('npcOverlay')?.classList.contains('open')});
      }return result;
    };
    const local=GameUI.localNpcReply;GameUI.localNpcReply=function(message){return NpcStory.current&&NpcStory.mode!=='free'?NpcStoryCore.select(NpcStory.current,this.npcCurrentRole,String(message||''),NpcStory.context()).text:local.call(this,message);};
    const close=GameUI.closeNpcChat;GameUI.closeNpcChat=function(){const r=close.apply(this,arguments);if(NpcStory.paused&&this.qteCurrentNode===NpcStory.paused&&!this.qteCompletedLocked&&document.getElementById('qteOverlay')?.classList.contains('open')){this.qteActive=true;this.qteLastClickTime=Date.now();this._startQteStallTimer();}NpcStory.paused=null;if(NpcStory.returnHost){NpcStory.focusTask(NpcStory.returnHost);NpcStory.returnHost=null;}return r;};
    const hooks={showDungeonPanel:['#dungeonPanel .panel-body',1],showPreBattleChoice:['.prebattle-content',2],showCommandPost:['.command-body',4],showRationAlloc:['.ration-body',2],showSettlement:['.settlement-body',6]};
    for(const [name,[selector,part]] of Object.entries(hooks)){const fn=GameUI[name];if(!fn)continue;GameUI[name]=function(node){const result=fn.apply(this,arguments);NpcStory.attach(document.querySelector(selector)||document.querySelector('#dungeonPanel'),node,part);if(name==='showDungeonPanel')NpcStory.updateGate(node.id);return result;};}
    const qte=GameUI.startQTE;GameUI.startQTE=function(node){const r=qte.apply(this,arguments),host=document.querySelector('.qte-hud');host?.querySelector('.npc-qte-talk')?.remove();const b=document.createElement('button');b.className='npc-qte-talk';b.textContent='暂停 · 战友提醒';b.onclick=()=>{const s=NpcStory.get(node.id,5);if(!s)return;NpcStory.current=s;const id=NpcStoryCore.participants(s,NpcStory.role()).find(id=>id!=='narrator')||'narrator';this.openNpcChat(id,NpcStoryCore.scenes[node.id],node);};host?.append(b);return r;};
    if(typeof JourneyChapter!=='undefined'){const fn=JourneyChapter.render;JourneyChapter.render=function(){const changed=this.npcFocusRoot!==this.root||this.npcFocusStage!==this.state.stage;const r=fn.apply(this,arguments);NpcStory.attach(this.workspace,{id:1,name:'中央苏区出发'},[2,3,4,5,5,6][this.state.stage]||1);if(changed&&NpcStory.unlocked(1))NpcStory.focusTask(this.workspace);this.npcFocusRoot=this.root;this.npcFocusStage=this.state.stage;return r;};}
    if(typeof ChishuiSandbox!=='undefined'){const fn=ChishuiSandbox.render;ChishuiSandbox.render=function(){const r=fn.apply(this,arguments);const s=this.state;NpcStory.attach(this.root?.querySelector('.sandbox-console'),this.node,s.round>=4?6:s.round>1?5:s.position===1?2:s.position===2?4:3);return r;};}
    const enter=GameUI.enterDungeon;GameUI.enterDungeon=function(){const nodeId=Number(this.dungeonPanel?.dataset.nodeId),node=GAME_NODES.find(n=>n.id===nodeId);if(node&&!NpcStory.unlocked(nodeId)){NpcStory.startGate(node);return;}return enter.apply(this,arguments);};
    const protect=(obj,name)=>{const fn=obj[name];if(!fn)return;const selectors={showPreBattleChoice:'.prebattle-content',showCommandPost:'.command-content',showRationAlloc:'.ration-body',showLearningTask:'.learning-content',showZunyiWarRoom:'.zunyi-chapter'};obj[name]=function(node){const run=()=>{const r=fn.apply(this,arguments);const host=name==='open'?typeof JourneyChapter!=='undefined'&&obj===JourneyChapter?this.workspace:this.root?.querySelector('.sandbox-console'):document.querySelector(selectors[name]||'.npc-no-target');if(host)NpcStory.focusTask(host);return r;};if(node?.id&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run};NpcStory.startGate(node);return;}return run();};};
    for(const name of ['showPreBattleChoice','showCommandPost','showRationAlloc','showLearningTask','showZunyiWarRoom','startQTE','completeDungeon'])protect(GameUI,name);
    if(typeof JourneyChapter!=='undefined')protect(JourneyChapter,'open');if(typeof ChishuiSandbox!=='undefined')protect(ChishuiSandbox,'open');
    const clear=GameState.clear;if(clear)GameState.clear=function(){NpcDialogueFlow.clear();return clear.apply(this,arguments);};
  }
};
NpcStory.load=function(){if(this.loading)return this.loading;this.loading=(async()=>{try{const data=window.CZ_NPC_SCRIPTS||await fetch('assets/npc-scripts/scripts-v1.json').then(r=>{if(!r.ok)throw Error(r.status);return r.json();});if(!Array.isArray(data.scripts)||!data.scripts.length)throw Error('剧本内容为空');this.scripts=data.scripts;this.install();document.dispatchEvent(new Event('npc-story-ready'));return true;}catch(error){this.loading=null;console.error('NPC剧本加载失败',error);return false;}})();return this.loading;};
document.addEventListener('DOMContentLoaded',()=>NpcStory.load());
