/* Chapter-specific decision windows. Time pauses for film, NPC chat and hidden tabs. */
const PressureChallenge={
  epoch:0,root:null,state:null,preview:null,busy:false,
  el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;},
  button(text,run,cls=''){const b=this.el('button',text,cls);b.type='button';b.onclick=run;return b;},
  bindKeys(root,close){root.tabIndex=-1;root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key!=='Tab')return;const all=[...root.querySelectorAll('button:not(:disabled),textarea,input,select,summary,a[href]')];const first=all[0],last=all.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===root)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===root)){e.preventDefault();first?.focus();}});root.focus({preventScroll:true});},
  async data(){return this.manifest??=await fetch('assets/pressure-scenarios.json').then(r=>{if(!r.ok)throw Error('scenarios');return r.json();});},
  save(){if(this.state&&!this.demo)try{localStorage.setItem(this.key,JSON.stringify(this.state));}catch{}},
  close(){this.interpretAbort?.abort();this.epoch++;clearInterval(this.interval);this.save();this.root?.remove();this.root=null;this.preview=null;this.busy=false;},
  async open(nodeId,{preview=false,timed=true}={}){
    const node=GAME_NODES.find(n=>n.id===Number(nodeId));if(!node)return;
    if(!preview&&(!NpcStory.unlocked(node.id)||RouteMap.isNodeLocked(node.id))){const rule=(typeof NpcStory!=='undefined'&&NpcStory.required)?NpcStory.required({nodeId:node.id,part:1}):8;GameUI.showToast(`先完成本章开场${rule}轮对话，再进入行军抉择。`);NpcStory.startGate(node);return;}
    this.close();const epoch=this.epoch;let data;try{data=await this.data();}catch{GameUI.showToast('行军情境加载失败，请刷新后重试。');return;}if(epoch!==this.epoch)return;
    this.node=node;this.demo=preview;this.scenario=data.scenarios.find(s=>s.nodeId===node.id);if(!this.scenario)return;
    this.key=`cz_pressure_v1_${node.id}_${NpcStory.role()}`;let saved;
    if(!preview)try{saved=JSON.parse(localStorage.getItem(this.key));}catch{}
    this.state=PressureCore.validate(saved,node.id)?saved:PressureCore.create(node.id,{food:GameState.resources.food,stamina:GameState.stamina},timed);this.state.done=this.state.round>=3;
    this.root=this.el('div',undefined,'pressure-overlay');this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','本章行军抉择');document.body.append(this.root);this.render();this.bindKeys(this.root,()=>this.close());this.lastTick=performance.now();
    this.interval=setInterval(()=>this.tick(),250);
  },
  paused(){return document.hidden||document.querySelector('.decision-film-overlay,.npc-overlay.open,.experience-overlay');},
  tick(){const now=performance.now(),elapsed=(now-this.lastTick)/1000;this.lastTick=now;if(!this.root||!this.state.started||this.state.done||!this.state.timed)return;
    const pause=this.paused();const clock=this.root.querySelector('[data-clock]');if(pause){if(clock)clock.textContent='计时已暂停';return;}
    const previous=Math.ceil(this.state.remaining);this.state.remaining=Math.max(0,this.state.remaining-elapsed);if(clock)clock.textContent=`${Math.ceil(this.state.remaining)} 秒`;
    this.root.dataset.urgent=this.state.remaining<12?'true':'false';if(previous!==Math.ceil(this.state.remaining))this.save();
    if(this.state.remaining===0)this.commit([],{'timeout':true});
  },
  render(){
    const root=this.root;if(!root)return;root.replaceChildren();root.dataset.strain=this.state.resources.stamina<30||this.state.resources.supplies<20?'high':'normal';
    const shell=this.el('section',undefined,'pressure-shell'),header=this.el('header');header.append(this.el('span',this.demo?'路演体验 · 独立推演，不写入主线存档':'行军抉择 · 本章小组任务'),this.button(this.demo?'退出演示':'保存并返回',()=>this.close(),'pressure-quiet'));shell.append(header);
    shell.append(this.el('p',`${this.node.date} / ${this.node.name}`,'pressure-kicker'),this.el('h1',this.scenario.title));
    const history=GameUI.getDecisionHistoryContext(this.node);const anchor=this.el('details',undefined,'pressure-history');anchor.append(this.el('summary','史实坐标 · 真实历史独立保留'),this.el('p',history.history));shell.append(anchor);
    const metrics=this.el('div',undefined,'pressure-metrics');for(const [key,label] of [['supplies','补给余量'],['stamina','小组体力'],['trust','协作程度'],['uncertainty','信息不确定性']]){const card=this.el('div');card.append(this.el('small',label),this.el('strong',String(this.state.resources[key])));metrics.append(card);}shell.append(metrics);
    shell.append(this.el('p',`已用行动时间 ${this.state.minutes} / 60 分钟 · 本次虚构小组的模拟指标，非历史统计`,'pressure-muted'));
    if(this.state.done){this.renderResult(shell);root.append(shell);return;}
    if(!this.state.started){
      shell.append(this.el('h2','时间、体力与互助，怎样取舍？'),this.el('p','三轮连续处置，没有标准答案。上一轮留下的资源和信息状态，会影响下一轮。紧迫模式每轮有45秒作出安排；错过窗口会付出行动时间和资源代价，不会编造历史伤亡。','pressure-intro'));
      const actions=this.el('div',undefined,'pressure-start');for(const [label,timed] of [['紧迫行军 · 每轮45秒',true],['稳步研判 · 不限现实时间',false]])actions.append(this.button(label,()=>{this.state.timed=timed;this.state.started=true;this.lastTick=performance.now();this.save();this.render();}));shell.append(actions);root.append(shell);return;
    }
    const step=this.scenario.rounds[this.state.round],row=this.el('div',undefined,'pressure-round');row.append(this.el('span',`第 ${this.state.round+1} / 3 轮 · ${step.title}`),this.el('strong',this.state.timed?`${Math.ceil(this.state.remaining)} 秒`:'稳步研判'));row.lastElementChild.dataset.clock='';shell.append(row);
    shell.append(this.el('p',step.text,'pressure-situation'));
    const last=this.state.history.at(-1);if(last)shell.append(this.el('p',last.timeout?'上一轮：错过窗口，整顿与等待消耗了余量。':`上一轮留下的后果：${this.changes(last.effects)}。`,'pressure-consequence'));
    const options=this.el('div',undefined,'pressure-options'),expectedRound=this.state.round;for(const choice of step.choices){const b=this.button('',()=>this.commit([choice.id],{expectedRound}));b.append(this.el('strong',choice.label),this.el('small',this.changes(choice.effects)));b.disabled=this.busy;options.append(b);}shell.append(options);
    const free=this.el('section',undefined,'pressure-custom'),label=this.el('label','你的自定义安排'),input=this.el('textarea');input.maxLength=300;input.placeholder='例如：先复核消息，再请战友分担物资，保持前后联络。';input.value=this.draft||'';input.oninput=()=>{this.draft=input.value;this.preview=null;};label.append(input);free.append(label,this.button(this.busy?'AI 正在解释取舍…':'解释我的方案',()=>this.interpret()));
    if(this.preview){const preview=this.preview;free.append(this.el('p',(preview.mode==='model'?'AI 解释：':'本地有限规则：')+preview.reason));if(preview.ids.length){const names=preview.ids.map(id=>step.choices.find(c=>c.id===id)?.label).filter(Boolean);free.append(this.el('p','对应行动：'+names.join(' → ')),this.button('确认取舍，执行这一轮',()=>this.commit(preview.ids,{text:this.draft,mode:preview.mode,expectedRound})));}else free.append(this.el('p','请明确行动步骤，或选择上方方案。'));}shell.append(free);
    shell.append(this.el('small','阅读视频、与战友交谈和等待模型时暂停倒计时。确认后记录行动，不能退回本轮覆盖原选择。','pressure-muted'));root.append(shell);
  },
  changes(e){return Object.entries(e).map(([k,v])=>`${({supplies:'补给',stamina:'体力',trust:'协作',uncertainty:'不确定性',minutes:'行动耗时'})[k]} ${v>0?'+':''}${v}${k==='minutes'?'分钟':''}`).join(' · ');},
  async interpret(){const text=(this.draft||'').trim();if(text.length<6){GameUI.showToast('请至少用6个字写清你的安排。');return;}if(this.busy)return;const epoch=this.epoch,round=this.state.round;this.busy=true;this.render();this.interpretAbort=new AbortController();let result;try{result=await apiRequest('/strategy/interpret',{node_id:this.node.id,round,text},22000,this.interpretAbort.signal);}catch{result=null;}if(epoch!==this.epoch||!this.root)return;this.busy=false;if(round!==this.state.round||text!==this.draft?.trim()){this.render();return;}this.preview=result||{ids:[],mode:'local',reason:'本次解释未完成，可重试或直接选择预设方案。'};this.render();},
  commit(ids,{text='',mode='fixed',timeout=false,expectedRound=this.state.round}={}){
    if(expectedRound!==this.state.round||this.state.done||this.busy&&!timeout)return;if(timeout){this.interpretAbort?.abort();this.busy=false;}const step=this.scenario.rounds[this.state.round],command=text||ids.map(id=>step.choices.find(c=>c.id===id)?.label).filter(Boolean).join('，');
    const modules=ids.map(id=>({verify:'intel',advance:'mobility',assist:'collective'})[id]);const counter=typeof ExperienceCore!=='undefined'&&typeof ExperienceSystem!=='undefined'?ExperienceCore.counter(ExperienceSystem.state,{nodeId:this.node.id,command,modules}):{risk:0};
    const row=PressureCore.commit(this.state,this.scenario,ids,{text:command,mode,timeout,counter:counter.risk||0});if(!row)return;this.preview=null;this.draft='';this.save();
    const delta={};for(const key of ['supplies','stamina','trust','uncertainty'])delta[key]=row.after.resources[key]-row.before.resources[key];
    if(!this.demo){
      GameState.recordStrategicDecision({nodeId:this.node.id,nodeName:this.scenario.title+' · 小组推演',command:row.command,modules,phase:'committed',videoHandled:true,resourceDelta:delta,counter:counter.text||'',outcome:timeout?'错过当前决策窗口':'完成本轮取舍',causalNodes:[{label:'情境',type:'decision',value:step.text},{label:'你的安排',type:'decision',value:row.command},{label:'小组资源变化',type:'effect',value:this.changes(row.effects)},{label:'累计行动时间',type:'outcome',value:`${this.state.minutes}/60 分钟`}]});
      if(ids.includes('assist')){const script=NpcStory.get(this.node.id,1),partner=script&&NpcStoryCore.participants(script,NpcStory.role()).find(id=>!['narrator','enemy_messenger'].includes(id));ExperienceSystem.remember({id:`pressure-help-${this.node.id}-${row.round}`,npcId:partner||'squad',nodeId:this.node.id,type:'support',note:`在本章小组推演第${row.round}轮实际选择：${row.command}`,delta:3});}
    }
    this.render();if(!timeout){const epoch=this.epoch;DecisionCinema.emit(mode==='fixed'?'fixed_decision':'custom_decision',{nodeId:this.node.id,text:row.command,context:step.text,isCurrent:()=>!!this.root&&epoch===this.epoch});}
  },
  renderResult(host){
    host.append(this.el('h2','这一程，你留下的取舍'),this.el('p',`协作与保障评分 ${PressureCore.score(this.state)} 分 · 评分只针对本次虚构任务，不评价历史人物或真实战役。`,'pressure-consequence'));
    const timeline=this.el('div',undefined,'pressure-causal');for(const row of this.state.history){const card=this.el('article');card.append(this.el('small',`第${row.round}轮 · ${row.mode==='model'?'AI 解释':row.mode==='fixed'?'预设行动':'有限规则'}${row.timeout?' · 窗口超时':''}`),this.el('h3',row.command),this.el('p',this.changes(row.effects)));const other=this.el('details');other.append(this.el('summary','回看未选分支 · 从当时状态计算'));for(const branch of row.alternatives)other.append(this.el('p',`${branch.label}：${this.changes(branch.effects)}；从当时状态出发，补给会到${branch.resources.supplies}、体力${branch.resources.stamina}，累计耗时${branch.minutes}分钟。该分支不是已发生的经历。`));card.append(other);timeline.append(card);}host.append(timeline);
    const actions=this.el('div',undefined,'pressure-start');actions.append(this.button('保存我的行军决策卡',()=>this.exportCard()),this.button('查看战友关系',()=>{const nodeId=this.node.id;this.close();ExperienceSystem.nodeId=nodeId;ExperienceSystem.open('bonds');}),this.button('练习另一套方案（不写主线）',()=>this.open(this.node.id,{preview:true})),this.button('返回本章任务',()=>this.close()));host.append(actions);
    host.append(this.el('p',this.demo?'本次为独立演示，未增加主线关系、资源或通关进度。':'本轮记录可在“因果”与“行记”中复盘；重新打开本章会保留本次结果。','pressure-muted'));
  },
  exportCard(){
    const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;const c=canvas.getContext('2d');const g=c.createLinearGradient(0,0,1080,1440);g.addColorStop(0,'#702c2b');g.addColorStop(.5,'#222b32');g.addColorStop(1,'#122630');c.fillStyle=g;c.fillRect(0,0,1080,1440);c.strokeStyle='#c5a26b';c.strokeRect(52,52,976,1336);c.fillStyle='#ecd6aa';c.font='32px SimSun';c.fillText('★ 长征 · 星火 / 我的行军抉择',90,130);c.font='bold 62px SimSun';c.fillText(this.scenario.title,90,240);c.font='100px system-ui';c.fillText(String(PressureCore.score(this.state)),90,390);c.font='26px system-ui';c.fillText('本次虚构协作与保障评分',270,375);
    const wrap=(text,x,y,width,line)=>{let row='';for(const ch of text){if(c.measureText(row+ch).width>width){c.fillText(row,x,y);row=ch;y+=line;}else row+=ch;}if(row)c.fillText(row,x,y);return y+line;};let y=490;
    for(const row of this.state.history){c.fillStyle='#e1b77a';c.font='26px system-ui';c.fillText(`第 ${row.round} 轮`,90,y);y+=46;c.fillStyle='#f2e5cf';c.font='29px SimSun';y=wrap(row.command.slice(0,100),90,y,890,43);c.fillStyle='#b8c4bc';c.font='21px system-ui';y=wrap(this.changes(row.effects),90,y+10,890,34)+35;}
    c.fillStyle='#d0b98f';c.font='23px system-ui';wrap('坚定信念 · 实事求是 · 团结互助 · 艰苦奋斗',90,1240,890,38);c.font='20px system-ui';wrap('基于本机实际选择生成。场景与小组推演为虚构，真实长征进程独立保留。',90,1310,890,30);const a=document.createElement('a');a.download='长征星火-我的行军抉择.png';a.href=canvas.toDataURL('image/png');a.click();
  },
  showcase(){
    document.getElementById('showcaseEntry')?.remove();const root=this.el('div',undefined,'pressure-overlay');root.id='showcaseEntry';root.setAttribute('role','dialog');root.setAttribute('aria-label','路演体验入口');const shell=this.el('section',undefined,'pressure-shell');shell.append(this.el('p','长征 · 星火 / 约三分钟体验路线','pressure-kicker'),this.el('h1','在有限的时间里，作出你的取舍'),this.el('p','一段山河、一组战友、三轮抉择。体验时间压力、行动因果与协作代价；演示不会覆盖主线存档。','pressure-intro'));
    const actions=this.el('div',undefined,'showcase-steps');actions.append(this.button('01 · 看15秒预告',()=>{root.remove();ExperienceSystem.open('trailer');}),this.button('02 · 进入赤水限时抉择',()=>{root.remove();this.open(4,{preview:true});}),this.button('03 · 查看我的行记与分享',()=>{root.remove();ExperienceSystem.open('poster');}));shell.append(actions,this.button('返回游戏',()=>root.remove(),'pressure-quiet'));root.append(shell);document.body.append(root);this.bindKeys(root,()=>root.remove());
  },
  install(){
    if(this.installed||typeof ExperienceSystem==='undefined'||!ExperienceSystem.installed)return;this.installed=true;
    const start=this.button('限时抉择',()=>this.open(document.getElementById('dungeonPanel')?.classList.contains('open')?Number(document.getElementById('dungeonPanel').dataset.nodeId):RouteMap.currentNodeId||1));ExperienceSystem.dock?.append(start);
    const banner=document.getElementById('chapterBanner');banner?.append(this.button('评委 · 3分钟走主线',()=>window.MainlineDemo.start().catch(()=>GameUI.showToast('演示初始化未完成，可继续正式剧情或稍后重试')),'showcase-entry'));
    const clear=GameState.clear;GameState.clear=function(){try{PressureChallenge.close();for(const key of Object.keys(localStorage))if(key.startsWith('cz_pressure_v1_'))localStorage.removeItem(key);}catch{this.saveFailed=true;}return clear.apply(this,arguments);};
    for(const b of ExperienceSystem.dock?.querySelectorAll('button')||[])if(b.textContent==='战友')b.textContent='战友关系';
  }
};
document.addEventListener('DOMContentLoaded',()=>PressureChallenge.install());
