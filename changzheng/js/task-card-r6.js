/* R6 2026-10-28: 统一「当前任务卡」——主线与可选挑战同一张卡，只渲染真实数据：
   站点与目标（ChapterDirection.goals）、完成条件与剩余轮数（NpcStory.ROUND_RULES 体系）、
   一个上下文主按钮（与战友交谈 → 进入/继续本章任务）、保存说明、可选挑战折叠（约几分钟 /
   保存什么 / 不计主线资源）。不发明数值；移动端显示（≤700px），桌面布局零变化。 */
const TaskCardR6={
 installed:false,el:null,observer:null,
 goal(id){return (typeof ChapterDirection!=='undefined'&&ChapterDirection.goals[id])||'完成本站剧情与任务，确认结算后前往下一站。';},
 node(){
  const id=typeof RouteMap!=='undefined'?RouteMap.currentNodeId:1;
  return (typeof GAME_NODES!=='undefined'?GAME_NODES.find(n=>n.id===id):null)||{id,name:'中央苏区·出发'};
 },
 stage(){
  const node=this.node();
  const script=(typeof NpcStory!=='undefined'&&typeof NpcDialogueFlow!=='undefined')?NpcStory.get(node.id,1):null;
  const locked=typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id);
  const count=script?NpcDialogueFlow.count(script,NpcStory.role()):0;
  const required=script?NpcStory.required(script):null;
  const panelOpen=document.getElementById('dungeonPanel')?.classList.contains('open');
  if(locked)return {key:'locked',text:'完成条件：先完成前一站的任务并确认结算，本站才会解锁。'};
  if(!script||(required ?? null)===null)return {key:'talk',text:'当前环节：与战友交谈。完成章节要求的固定剧情后进入本章任务。',count:0,required:null};
  if(count<required)return {key:'talk',text:`当前环节：与战友交谈（${count}/${required} 轮）。完成 ${required} 轮后进入本章任务。`,count,required};
  if(panelOpen)return {key:'resume',text:'当前环节：本章任务进行中。完成本步操作并按页面按钮继续；确认结算后解锁下一站。'};
  return {key:'enter',text:'当前环节：对话已完成，可进入本章任务。完成任务并确认结算后解锁下一站。'};
 },
 refresh(){
  const card=this.el;if(!card||!card.isConnected)return;
  try{
   const node=this.node(),st=this.stage();
   card.querySelector('.task-r6-title').textContent=`第 ${node.id} 站 · ${node.name}`;
   card.querySelector('.task-r6-goal').textContent='目标：'+this.goal(node.id);
   card.querySelector('.task-r6-cond').textContent=st.text;
   const btn=card.querySelector('.task-r6-primary');
   const labels={locked:'当前站未解锁',resume:'继续当前任务',enter:'进入本章任务',
    talk:st=>(st.required ?? null)===null?'与战友交谈':`与战友交谈（${st.count}/${st.required}）`};
   const label=typeof labels[st.key]==='function'?labels[st.key](st):labels[st.key];
   btn.textContent=label;btn.dataset.stage=st.key;btn.disabled=st.key==='locked';
   btn.onclick=()=>{
    const id=typeof RouteMap!=='undefined'?RouteMap.currentNodeId:1;
    const node=(typeof GAME_NODES!=='undefined'?GAME_NODES.find(n=>n.id===id):null);
    if(btn.dataset.stage==='talk'&&typeof NpcStory!=='undefined'&&node){NpcStory.startGate(node);return;}
    if((btn.dataset.stage==='enter'||btn.dataset.stage==='resume')&&typeof GameUI!=='undefined')GameUI.enterDungeon();
   };
  }catch(e){/* 卡片刷新失败不影响游戏 */}
 },
 install(){
  if(this.installed)return;this.installed=true;
  const footer=document.querySelector('.map-footer');if(!footer)return;
  const card=document.createElement('section');card.className='task-card-r6';card.setAttribute('aria-label','当前任务');
  card.innerHTML='<h3 class="task-r6-title"></h3>'
   +'<p class="task-r6-goal"></p>'
   +'<p class="task-r6-cond"></p>'
   +'<div class="task-r6-row"><button type="button" class="task-r6-primary"></button>'
   +'<details class="task-r6-extras"><summary>可选挑战 · 不计入主线资源</summary><div class="task-r6-extra-list"></div></details></div>'
   +'<p class="task-r6-save">进度自动保存在本机浏览器；每站确认结算后写入存档。</p>';
  const list=card.querySelector('.task-r6-extra-list');
  /* 只列真实存在的可选玩法，标注「约几分钟/保存什么/不影响主线资源」。 */
  const extras=[
   ['限时抉择 · 行军抉择','可选 · 约几分钟 · 保存抉择记录，不影响主线资源',
    ()=>{const id=typeof RouteMap!=='undefined'?RouteMap.currentNodeId:1;if(typeof PressureChallenge!=='undefined')Promise.resolve(PressureChallenge.open(id,{preview:true})).catch(()=>{});}],
   ['通信训练 · 摩斯学堂','可选 · 随时可学 · 保存译报资格与课程进度',
    ()=>{if(typeof MorseTraining!=='undefined')MorseTraining.open();}]
  ];
  for(const [name,meta,run] of extras){
   const row=document.createElement('button');row.type='button';row.className='task-r6-extra';
   row.innerHTML=`<strong></strong><small></small>`;
   row.querySelector('strong').textContent=name;row.querySelector('small').textContent=meta;
   row.onclick=()=>{card.querySelector('.task-r6-extras').open=false;run();};
   list.append(row);
  }
  footer.prepend(card);this.el=card;this.refresh();
  /* 刷新时机：站点变化（nodeNavPos 文本）+ 面板开合（dungeonPanel class）+ 对话轮数（updateGate）。 */
  const pos=document.getElementById('nodeNavPos');
  if(pos&&typeof MutationObserver==='function'){
   this.observer=new MutationObserver(()=>this.refresh());
   this.observer.observe(pos,{childList:true,characterData:true,subtree:true});
  }
  const panel=document.getElementById('dungeonPanel');
  if(panel&&typeof MutationObserver==='function'){
   const po=new MutationObserver(()=>this.refresh());
   po.observe(panel,{attributes:true,attributeFilter:['class']});
  }
  if(typeof NpcStory!=='undefined'){
   const gate=NpcStory.updateGate;
   NpcStory.updateGate=function(){const r=gate.apply(this,arguments);TaskCardR6.refresh();return r;};
  }
  window.addEventListener('cz-game-ready',()=>this.refresh(),{once:true});
 }
};
document.addEventListener('DOMContentLoaded',()=>TaskCardR6.install());
