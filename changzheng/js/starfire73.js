/* Third-batch integration, independent learning collection and per-scene heritage mode. */
window.StarfireBook73={
 entries:[
  {icon:'bridge',node:1,host:'Bridge72',key:'bridge72_1',title:'于都河浮桥 · 星夜架桥',period:'1934年10月 · 出发',item:'架桥札记',kind:'工程教学',hint:'选择材料搭建、试载；第三段拆解回收。键1—4选材料，空格试载。'},
  {icon:'blanket',node:2,host:'Blanket72',key:'blanket72_2',title:'半条被子 · 夜宿沙洲',period:'1934年11月 · 沿途回望',item:'半条被子',kind:'军民情深',hint:'不拿屋中物件，完成帮助乡亲的事项；出发时选择留下半条被子。'},
  {icon:'aid',node:2,host:'StarfireScenes73',key:'aid73_2',title:'战地药箱 · 湘江接应',period:'1934年11月 · 接应',item:'接应记录',kind:'原创教学',hint:'方向键移动，E分配教学药包，F护送；护送回左侧接应点。'},
  {icon:'zunyi',node:3,host:'Zunyi72',key:'zunyi72_3',title:'遵义会议 · 抉择二十分钟',period:'1935年1月 · 转折',item:'复盘提纲',kind:'史料研读',hint:'阅读卡片，选择并排序三组研学线索；数字键1—5落卡，退格撤回。不是对历史指挥作评分。'},
  {icon:'cipher',node:4,host:'StarfireScenes73',key:'cipher73_4',title:'军委二局 · 密电破局',period:'1935年转战期间 · 情报研学',item:'教学译报纸',kind:'原创符号',hint:'按教学符号表填写三段短句；数字键落字，退格撤回，Enter核对。非真实密电。'},
  {icon:'lantern',node:4,host:'Lantern72',key:'lantern72_4',title:'苟坝马灯 · 夜路寻道',period:'1935年3月 · 延伸研学',item:'马灯行记',kind:'创作回望',hint:'方向键或WASD提灯前行，按E交互；留意光照、添油点与路标。'},
  {icon:'nightlamp',normalOnly:true,node:4,host:'Gouba72',key:'gouba72_3',title:'苟坝夜灯 · 马灯密室',period:'1935年3月 · 延伸研学',item:'夜灯谜笺',kind:'密室解谜',hint:'同一夜的第二盏灯：在灯光照亮的线索间穿行，还原深夜密谈的决断；键盘与点击皆可。'},
  {icon:'alliance',node:5,host:'StarfireScenes73',key:'alliance73_5',title:'彝海结盟 · 倾听与信任',period:'1935年5月 · 独立回望',item:'信任约定',kind:'创作对白',hint:'倾听、解释、核对并遵守约定。本场景是独立研学回望，不把结盟混同于金沙江节点。'},
  {icon:'chains',node:7,host:'StarfireScenes73',key:'chains73_7',title:'飞夺泸定桥 · 铁索冲锋',period:'1935年5月 · 攀索教学',item:'桥板见证',kind:'动作练习',hint:'A/D移动，S俯身，空格跳跃，B铺板；先观察扫射预告。'},
  {icon:'fish',node:9,host:'Fishhook72',key:'fishhook72_9',title:'金色的鱼钩 · 老班长',period:'草地故事 · 文学阅读',item:'鱼钩阅读卡',kind:'经典课文',hint:'鱼影靠近浮标时拉杆，再把鱼汤与青稞分给同行小战士；按界面按钮操作。'},
  {icon:'veg',node:9,host:'Wildveg72',key:'wildveg72_9',title:'草地食堂 · 野菜辨识',period:'草地研学 · 资料辨识',item:'资料核对卡',kind:'资料教学',hint:'依据本关虚构资料标记作三类归档。图形不是植物鉴定图，不能用于现实采食。'},
  {icon:'matches',node:9,host:'StarfireScenes73',key:'matches73_9',title:'七根火柴 · 守护火种',period:'草地故事 · 文学阅读',item:'火种见证',kind:'经典课文',hint:'四段行程兼顾支援、遮蔽与保留火种；出发前读清每种安排的代价。'}
 ],
 state(){return typeof GameState!=='undefined'?GameState:window.GameState;},
 supportsIcon(icon){return this.entries.some(e=>e.icon===icon);},
 best(entry,mode='normal'){const v=this.state()?.storyPreparations?.[entry.key+(mode==='hardcore'?'_hard':'')];return Number.isFinite(v?.score)?v:null;},
 unlocked(entry){return (this.best(entry)?.score||0)>=60;},
 notify(text){if(typeof GameUI!=='undefined')GameUI.showToast(text);},
 record(icon,id,result,s){
  const e=this.entries.find(v=>v.icon===icon&&v.node===Number(id)),g=this.state();if(!e||!g||s.status!=='won'||!Number.isFinite(result?.score))return false;
  const hard=(s.mode==='hardcore'||s.practiceMode73==='hardcore');if(hard&&(!this.unlocked(e)||result.score<90)){this.notify('传承难度需先完成研学模式，且本次评价达到90分；可重新练习。');return false;}
  const key=e.key+(hard?'_hard':''),old=g.storyPreparations?.[key],battles=g.battleScores;g.storyPreparations??={};
  if(result.score<60){this.notify('本次练习还未达标，可重新练习后收录见证。');return false;}
  const row={score:Math.max(0,Math.min(100,result.score)),rating:String(result.rating||'完成研学'),mode:hard?'hardcore':'normal',completedAt:new Date().toISOString()};
  const history=[...(Array.isArray(old?.history)?old.history:[]),row].slice(-10);
  g.storyPreparations[key]={...(old&&old.score>=row.score?old:row),last:row,history};
  // Preserve the six imported engines' normal-score channel; new text scenes stay independent.
  if(e.host!=='StarfireScenes73'&&!hard){const rows=Array.isArray(battles)?battles:[],best=rows.find(r=>r.nodeId===Number(id));if(!best||best.score<row.score)g.battleScores=[...rows.filter(r=>r.nodeId!==Number(id)),{nodeId:Number(id),score:row.score,rating:row.rating}];}
  try{if(g.save()===false)throw Error('save');}catch{if(old===undefined)delete g.storyPreparations[key];else g.storyPreparations[key]=old;g.battleScores=battles;return false;}
  return true;
 },
 launch(icon,node){
  const e=this.entries.find(v=>v.icon===icon&&v.node===Number(node?.id));if(!e)return false;
  if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){this.notify('尚未抵达此站，请先完成当前章节。');return false;}
  if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.launch(icon,node)};NpcStory.startGate(node);return false;}
  const d=document.createElement('dialog');d.className='starfire73-brief';d.setAttribute('aria-label',e.title);d.innerHTML='<small>星火研学 / LEARNING JOURNEY</small><h2></h2><p data-period></p><p data-hint></p><p>研学模式完成后，解锁本场景的传承难度。传承关闭提示、缩短部分时限或降低容错，需达到90分才记录徽章。</p><div class="sf73-actions"><button data-normal>研学模式 · 开始</button><button data-hard>传承难度</button><button data-close>返回</button></div>';
  d.querySelector('h2').textContent=e.title;d.querySelector('[data-period]').textContent=e.period+' · '+e.kind;d.querySelector('[data-hint]').textContent=e.hint;d.querySelector('[data-hard]').disabled=!!e.normalOnly||!this.unlocked(e);if(e.normalOnly)d.querySelector('[data-hard]').textContent='本场景开放研学模式';
  const trigger=document.activeElement,owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active;let started=false;
  const close=()=>{d.remove();if(trigger?.isConnected)trigger.focus();};d.addEventListener('close',close,{once:true});d.addEventListener('cancel',ev=>{ev.preventDefault();d.close();});d.querySelector('[data-close]').onclick=()=>d.close();
  const start=mode=>{if(started||owner!==(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)||demo!==!!window.MainlineDemo?.active)return;const engine=window[e.host];if(!engine){this.notify('场景未加载，请刷新后重试。');return;}if(mode==='hardcore'&&(e.normalOnly||!this.unlocked(e)))return;started=true;d.close();
   const done=result=>{if(e.icon==='nightlamp'&&engine.session?.status==='won'){const score=engine.rating(engine.session);if(!this.record(e.icon,node.id,score,engine.session))return;result={...score,won:true};}if(result?.won!==true)return;this.notify('见证与成绩已记入研学图鉴。主线章节进度不变。');};
   if(e.host==='StarfireScenes73')engine.open(e.icon,node,mode,done);
   else{engine.closeActive?.();engine.practiceMode73=mode;engine.open(node,done);const dialog=[...document.querySelectorAll('dialog[open]')].at(-1);if(dialog){dialog.classList.toggle('starfire-hard73',mode==='hardcore');const tag=document.createElement('p');tag.className='sf73-mode';tag.textContent=(mode==='hardcore'?'传承难度 · 90分记录徽章':'研学模式')+' · '+e.kind+' · 对白与场景均为研学改编';dialog.querySelector('header')?.after(tag);if(e.icon==='nightlamp')dialog.querySelector('[data-complete]').textContent='记录成绩 · 收录见证';this.materials(e,dialog);this.accessible(e,engine,dialog);}}
  };
  d.querySelector('[data-normal]').onclick=()=>start('normal');d.querySelector('[data-hard]').onclick=()=>start('hardcore');document.body.append(d);d.showModal();return true;
 },
 accessible(entry,engine,dialog){
  const canvas=dialog.querySelector('canvas'),box=document.createElement('div');box.className='sf73-access';canvas.after(box);let stamp='',raf=0;const captures=new Map();
  const paused=()=>dialog.querySelector('[data-pause]')?.textContent.startsWith('继续')||engine.paused?.();
  const key=(value,type='keydown')=>canvas.dispatchEvent(new KeyboardEvent(type,{key:value,bubbles:true,cancelable:true}));
  const tap=(x,y)=>{const r=canvas.getBoundingClientRect();canvas.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+x*r.width/1280,clientY:r.top+y*r.height/720,bubbles:true,button:0}));};
  const add=(text,run,hold)=>{const b=document.createElement('button');b.textContent=text;b.onclick=run;if(hold){b.onpointerdown=ev=>{ev.preventDefault();captures.set(ev.pointerId,{target:b,key:hold});b.setPointerCapture(ev.pointerId);key(hold);};for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,ev=>{key(hold,'keyup');captures.delete(ev.pointerId);});}box.append(b);};
  const block=ev=>{if(!paused()||ev.key==='Escape'||ev.key==='Tab'||ev.target.closest('[data-close],[data-pause],[data-retry],[data-mute]'))return;ev.preventDefault();ev.stopImmediatePropagation();};
  for(const name of ['click','keydown','pointerdown'])dialog.addEventListener(name,block,true);
  const clear=()=>{for(const [id,c]of captures){key(c.key,'keyup');try{if(c.target.hasPointerCapture(id))c.target.releasePointerCapture(id);}catch{/* Already released. */}}captures.clear();if(engine.session?.keys)engine.session.keys={};};
  window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  const frame=()=>{if(!dialog.isConnected){clear();window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);engine.closeActive=null;engine.session=null;engine.practiceMode73='normal';return;}const s=engine.session;if(!s)return;const next=JSON.stringify([s.status,s.round,s.phase,s.stage,s.idx,s.chain,s.tasks?.map(t=>t.done)]);if(next!==stamp){const hadFocus=box.contains(document.activeElement),focusIndex=[...box.querySelectorAll('button')].indexOf(document.activeElement);stamp=next;box.replaceChildren();
   if(entry.icon==='zunyi')for(const [i,c]of s.hand.entries())add((i+1)+' · '+c.claim,()=>key(String(i+1)));
   if(entry.icon==='bridge')for(let i=0;i<s.cells.length;i++)add('桥位 '+(i+1),()=>tap(140+(i+.5)*engine.CELL,450));
   if(entry.icon==='lantern'){for(const [label,k]of [['←','ArrowLeft'],['↑','ArrowUp'],['↓','ArrowDown'],['→','ArrowRight']])add(label,()=>{},k);add('交互 · E',()=>key('e'));}
   if(entry.icon==='blanket'){for(const t of s.tasks.filter(t=>t.round===s.round&&!t.done))add(t.verb,()=>tap(t.x,t.y));if(s.round===3){s.pack.forEach((it,i)=>{add(it.name+' · 带走',()=>{key(String(i+1));key('t');});});add('剪开被子 · 留下一半',()=>key('c'));}}
   if(entry.icon==='veg'){const p=document.createElement('p');p.textContent=s.deck[s.idx]?.hint||'资料核对完成';box.append(p);}
   if(entry.icon==='fish'){if(s.phase==='fish'){add('浮标左移',()=>{},'ArrowLeft');add('浮标右移',()=>{},'ArrowRight');add('下杆 / 拉杆',()=>key(' '));}if(s.phase==='share'){for(let i=0;i<3;i++){add('同行者'+(i+1)+' · 鱼汤',()=>key(String(i+1)));add('同行者'+(i+1)+' · 青稞',()=>key(String(i+4)));}add('确认分配',()=>key('Enter'));}}
  if(hadFocus){const buttons=box.querySelectorAll('button');(buttons[Math.max(0,Math.min(focusIndex,buttons.length-1))]||canvas).focus({preventScroll:true});}}box.querySelectorAll('button').forEach(b=>b.disabled=paused()||s.status!=='playing');raf=requestAnimationFrame(frame);};
  const old=engine.closeActive;engine.closeActive=()=>{cancelAnimationFrame(raf);clear();window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);old?.();engine.closeActive=null;engine.session=null;engine.practiceMode73='normal';};frame();
 },
 materials(entry,dialog){
  const intro=dialog.querySelector('[data-intro]');if(intro)intro.textContent=entry.hint+' 本场景为研学改编，游戏数值与对白不作为原始史料。';
  const host=dialog.querySelector('[data-hist]');if(!host)return;
  const stories=typeof Education43!=='undefined'?Education43.stories:[];
  const card=entry.icon==='blanket'?stories?.[0]:entry.icon==='fish'?stories?.[1]:null;
  const history=typeof NODE_HISTORY_DATA!=='undefined'?NODE_HISTORY_DATA[entry.node]:null;
  host.textContent=card?card.kind+'：'+card.text:history?.historyText||'本场景为原创研学改编。界面中的对白、路线、数值和任务不等同于原始史料。史实请查本章的史实档案。';
  if(card?.source){const link=document.createElement('a');link.href=card.source[1];link.textContent=card.source[0];link.target='_blank';link.rel='noopener noreferrer';host.append(document.createElement('br'),link);}
  if(entry.icon==='veg'){host.textContent='本关使用虚构资料分组，不依据外形、颜色或气味作食用判断。现实中不采食不认识的野生植物。';const link=document.createElement('a');link.href='https://ynsjkj.yn.gov.cn/html/2026/jikongkepu_0706/2411.html';link.textContent='资料：云南省疾控局 · 野生植物辨识误区';link.target='_blank';link.rel='noopener noreferrer';host.append(document.createElement('br'),link);}
 },
 decorate(){
  for(const e of this.entries){if(e.host==='StarfireScenes73')continue;const engine=window[e.host];if(!engine||engine.decorated73)continue;engine.decorated73=true;const original=engine.create;
   engine.create=function(...args){const s=original.apply(this,args);s.practiceMode73=this.practiceMode73==='hardcore'?'hardcore':'normal';if(s.practiceMode73==='hardcore'){
    if(Number.isFinite(s.timeLeft))s.timeLeft*=.7;if(Number.isFinite(s.stamina))s.stamina=Math.min(3,s.stamina);
    if(e.icon==='blanket'){s.d={...s.d,windowT:s.d.windowT*.7,touchDiscipline:s.d.touchDiscipline*1.5};for(const r of Object.values(s.rounds)){r.len*=.7;for(const w of r.windows){w.start*=.7;w.dur*=.7;}}}
   }return s;};
   if(e.icon==='lantern'||e.icon==='bridge'||e.icon==='fish'){const step=engine.step;engine.step=function(s,...args){const out=step.call(this,s,...args);if(s.practiceMode73==='hardcore'){if(e.icon==='lantern')s.r*=.72;if(e.icon==='bridge'&&s.disarmLeft>25)s.disarmLeft=25;if(e.icon==='fish'&&s.window>.35)s.window=.35;}return out;};}
   if(e.icon==='zunyi'){const hint=engine.hint;engine.hint=function(s){return s.practiceMode73==='hardcore'?false:hint.call(this,s);};}
  }
 },
 catalog(){
  const d=document.createElement('dialog');d.className='starfire73-catalog';d.setAttribute('aria-label','星火研学图鉴');d.innerHTML='<header><div><small>星星之火 / WITNESS COLLECTION</small><h2>星火研学 · 见证记录本</h2></div><button data-close>返回 · Esc</button></header><p>按研学脉络回望12个场景。新对白为创作，经典课文与原始史料分开标注；练习分数不评价历史人物。</p><div class="sf73-library"></div><details open><summary>星火勋章 · 只读总览</summary><div data-medals></div></details>';
  const grid=d.querySelector('.sf73-library');for(const e of this.entries){const best=this.best(e),hard=this.best(e,'hardcore'),card=document.createElement('article');card.className='sf73-card';const title=document.createElement('h3');title.textContent=e.title;const meta=document.createElement('small');meta.textContent=e.period+' · '+e.kind;const item=document.createElement('p');item.textContent=best?'已收录：'+e.item+' · '+best.score+'分 · '+best.rating:'待见证：'+e.item;const badge=document.createElement('p');badge.className='sf73-badge';badge.textContent=hard?'✦ 传承徽章 · '+hard.score+'分':'○ 传承徽章未点亮';const action=document.createElement('button');action.textContent=best?'重温与挑战':'查看本场景';action.onclick=()=>{d.close();const node=typeof GAME_NODES!=='undefined'?GAME_NODES.find(n=>n.id===e.node):{id:e.node};this.launch(e.icon,node);};card.append(meta,title,item,badge,action);grid.append(card);}
  if(window.Medal72)window.Medal72.renderBar(d.querySelector('[data-medals]'));
  const trigger=document.activeElement;d.querySelector('[data-close]').onclick=()=>d.close();d.addEventListener('close',()=>{d.remove();if(trigger?.isConnected)trigger.focus();},{once:true});document.body.append(d);d.showModal();return d;
 },
 install(){if(this.installed)return;this.installed=true;this.decorate();}
};
if(typeof document!=='undefined'&&document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.StarfireBook73.install(),{once:true});else if(typeof document!=='undefined')window.StarfireBook73.install();
