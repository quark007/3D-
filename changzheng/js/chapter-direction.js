/* Explicit task guidance, separate from historical claims and outcome rules. */
const ChapterDirection={watchers:new WeakMap(),
 goals:{1:'核对携行与岗位分工，照应战友，完成渡河协作。',2:'辨明渡江条件，让掩护、联络与转移衔接。',3:'核对史料，区分事实与判断，再组织集体研判。',4:'先侦察，再拼接行动；留意反复佯动带来的代价。',5:'协调渡运、警戒和队列，利用有限条件保持秩序。',6:'观察水情与渡运条件，安排掩护和协作。',7:'在时间压力下兼顾行军节奏、突击与接应。',8:'分配体力与保暖条件，保持互助和行军节奏。',9:'分配有限口粮，核对路线，照应每位战友。',10:'观察隘口条件，协调正面牵制与侧翼行动。',11:'组织警戒、联络和休整，回看资源消耗。',12:'完成联络与岗位协作，回顾一路选择留下的变化。'},
 /* [R5 2026-10-28] brief 改为函数：轮数口径从章节规则（NpcStory.describe()）生成，不再写死“8轮”。 */
 hints:{brief(){const rule=(typeof NpcStory!=='undefined'&&NpcStory.describe)?NpcStory.describe():'每章完成8轮';return `① 点击“与战友交谈”，每轮选择一句话，${rule}固定剧情。② 点击“进入本章任务”。③ 完成任务并确认结算，地图才会解锁下一站。自由交谈不计轮数；3D只供观察，不用找隐藏物品。`;},plan:'① 点选行动模块，或在输入框写清具体安排。② 点击解析，查看资源代价和行动顺序。③ 确认执行。等待解析时不用重复点击；3D不影响任务进度。',learning:'① 阅读资料，点选本页行动方案，或输入自己的安排并点击记录。② 完成下方“阅读判断”。③ 点“确认安排，继续本章”。记录方案不会自动过关；方案和判断都完成后才能继续。',supplies:'① 拖动每名战士的分粮滑块，留意剩余份数。② 根据各人的状况调整分配。③ 点击“确认分配”，看完结果再点“继续行军”。',sandbox:'① 先在左侧地图选择另一处目标。② 点行动模块放入托盘，安排侦察、掩护与机动顺序，也可以直接输入安排。③ 点“执行行动”，完成四轮后查看复盘。',journey:'按当前步骤完成操作，再点击下方确认按钮。进度会自动保存在本浏览器；“保存并返回”可稍后继续。'},
 journeyHints:[
  '第1步 / 6 · 点击物资旁的＋或−，保留至少1份口粮与1份饮水，负重不超过12格。搭配好后点“确认行装”。',
  '第2步 / 6 · 先点托盘中的一项，再点下方对应位置；也可以拖放。已放内容可点击撤回。三项全部正确后点“完成协作”。',
  '第3步 / 6 · 点快捷短句或自己写计划，再点“解析我的计划”。看到解析结果后，点“采用这份计划”。',
  '第4步 / 6 · 阅读眼前事件，选择一项处置；三次事件处理完后，点“前往于都渡河协作”。',
  '第5步 / 6 · 指针进入金色区域时，点击行动按钮或按空格；成功6次后查看复盘。跟不上节奏可点“辅助模式”，每次完成一段。',
  '第6步 / 6 · 查看资源变化与行路记录，再点完成本章的按钮返回地图。AI点评为选读，不必等待它才过关。'
 ],
 reveal(host,guide){const available=[...host.querySelectorAll('button:not(:disabled),textarea,input,select')].filter(el=>!guide.contains(el)&&!el.closest('.story-fold,.npc-story-recap,.world3d-frame,.chapter-screening,.npc-story-card')&&el.getClientRects().length);const target=available.find(el=>el.matches('#btnEnter,.journey-cargo-item,.journey-input,.chapter-plan-choice,.command-input,.learning-question button'))||available.find(el=>el.matches('.journey-button,.learning-confirm-next,.chapter-plan-submit'))||available[0];if(!target)return;target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});target.focus({preventScroll:true});},
 decorate(host,node,phase='plan'){
  if(!host||!node||!this.goals[Number(node.id)])return;host.dataset.chapter=String(node.id);
  host.querySelectorAll(':scope > .chapter-direction').forEach(el=>el.remove());
  let help=host.querySelector(':scope > .task-help-trigger');
  if(!help){help=document.createElement('button');help.type='button';help.className='task-help-trigger';help.textContent='? 本步怎么玩';host.prepend(help);}
  help.setAttribute('aria-label',`第${node.id}章操作帮助：${this.goals[node.id]}`);
  const copy=()=>{const raw=phase==='journey'&&typeof JourneyChapter!=='undefined'?(this.journeyHints[JourneyChapter.state?.stage]||this.hints.journey):(this.hints[phase]||this.hints.plan);return typeof raw==='function'?raw():raw;};
  help.onclick=()=>{if(typeof PlayerOnboarding!=='undefined')PlayerOnboarding.context(node,this.goals[node.id]+'\n\n'+copy(),()=>this.reveal(host,help));};
  let watcher=this.watchers.get(host);if(!watcher){watcher={node,phase};watcher.observer=new MutationObserver(()=>{if(host.isConnected&&!host.querySelector(':scope > .task-help-trigger'))this.decorate(host,watcher.node,watcher.phase);});watcher.observer.observe(host,{childList:true});this.watchers.set(host,watcher);}watcher.node=node;watcher.phase=phase;
 },
 install(){if(this.installed)return;this.installed=true;
  document.querySelectorAll('.map-first-guide').forEach(el=>el.remove());

  if(typeof GameUI!=='undefined')for(const [name,selector,phase] of [['showDungeonPanel','#dungeonPanel','brief'],['showPreBattleChoice','#prebattleOverlay .prebattle-content','plan'],['showCommandPost','#commandOverlay .command-content','plan'],['showLearningTask','#learningTaskOverlay .learning-workspace','learning'],['showRationAlloc','#rationOverlay .ration-content','supplies'],['showZunyiWarRoom','#zunyiChapterOverlay .zunyi-chapter','learning']]){const run=GameUI[name];if(!run)continue;GameUI[name]=function(node){const result=run.apply(this,arguments);ChapterDirection.decorate(document.querySelector(selector),node,phase);return result;};}
  if(typeof JourneyChapter!=='undefined'){const run=JourneyChapter.render;JourneyChapter.render=function(){const result=run.apply(this,arguments);ChapterDirection.decorate(this.root?.querySelector('.journey-workspace'),this.node||{id:1},'journey');return result;};}
  if(typeof ChishuiSandbox!=='undefined'){const run=ChishuiSandbox.render;ChishuiSandbox.render=function(){const result=run.apply(this,arguments);ChapterDirection.decorate(this.root?.querySelector('.sandbox-console'),this.node||{id:4},'sandbox');return result;};}
 }
};document.addEventListener('DOMContentLoaded',()=>ChapterDirection.install());
