/* Documentary chrome; original walking, dialogue and tasks remain the chapter authority. */
(() => {
 'use strict';let epoch=0,loading=null,entryOwner=null;
 const owner=()=>typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:'local';
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const button=(text,run)=>{const b=el('button',text);b.type='button';b.onclick=run;return b;};
 function close(){epoch++;loading?.close();loading?.remove();loading=null;document.body.classList.remove('documentary92-active');}
 function repairPreviewProgress(){
  // Only undo completion produced by the superseded92 shortcut, preserving real task records and choices.
  const g=GameState,p=g.storyPreparations||{},actual=p.marchStory83;
  const rows=Object.entries(p).filter(([k,v])=>/^documentary92_/.test(k)&&v?.phase==='complete'&&!v.progressRepaired93);
  const invalid=rows.map(([k])=>Number(k.split('_').at(-1))).filter(id=>!actual?.tasks?.['chapter-'+id+'/main-task']?.completed);
  if(!rows.length)return;
  const prior=g.medalRecords,was=g.gameCompleted,oldChapters=actual?.completedChapters;
  if(actual)actual.completedChapters=(actual.completedChapters||[]).filter(id=>!invalid.includes(id));
  g.medalRecords=(prior||[]).filter(m=>!invalid.includes(m.nodeId));if(invalid.includes(12))g.gameCompleted=false;
  rows.forEach(([,r])=>r.progressRepaired93=true);
  if(g.save()===false){g.medalRecords=prior;g.gameCompleted=was;if(actual)actual.completedChapters=oldChapters;rows.forEach(([,r])=>delete r.progressRepaired93);return;}
  if(invalid.length){RouteMap.completedNodeIds=new Set(g.medalRecords.map(m=>m.nodeId));RouteMap.currentNodeId=(GAME_NODES.find(n=>!RouteMap.completedNodeIds.has(n.id))||GAME_NODES.at(-1)).id;RouteMap.focusIndex=RouteMap.currentNodeId-1;RouteMap.renderNodes();RouteMap.updateProgress();RouteMap.updateNavButtons?.();}
 }
 // 序章与章节入口都是原生 modal dialog，同时 showModal() 会叠成两层浮窗。
 // 选完角色后二者只差 60ms 先后触发，这里让章节入口排队等序章关掉再继续。
 function waitForPrologue(){
  const modal=document.querySelector('dialog[open].snow63-dialog');
  if(!modal)return Promise.resolve();
  return new Promise(resolve=>{
   let done=false;
   const fire=()=>{if(done)return;done=true;clearInterval(poll);resolve();};
   modal.addEventListener('close',fire,{once:true});
   const poll=setInterval(()=>{if(!modal.isConnected||!modal.open)fire();},600);
  });
 }
 function savedSummary(id){
  try{
   const s=window.CZMarchSave?.read?.();if(!s)return null;
   const prefix=`chapter-${id}/`,rows=Object.entries(s.tasks||{}).filter(([key,value])=>key.startsWith(prefix)&&value?.completed);
   const here=s.location?.chapterId===Number(id),scene=here?window.CZMarchWorldManifest?.scenes?.find(item=>item.sceneId===s.location.sceneId):null;
   return {here,completed:rows.length,scene:scene?.title||s.location?.sceneId||'',completedChapter:(s.completedChapters||[]).includes(Number(id))};
  }catch{return null;}
 }
 function promptEntry(id,node,summary){
  return new Promise(resolve=>{
   const d=el('dialog',undefined,'experience-entry93');loading=d;
   d.append(el('h2',`第${id}章 · ${node.name}`));
   if(summary?.here)d.append(el('p',`上次停在「${summary.scene}」，本章已记录 ${summary.completed} 项交谈、协作或见证。`));
   else if(summary?.completed)d.append(el('p',`本章已记录 ${summary.completed} 项内容，上次行走位置不在本章。`));
   else d.append(el('p','本章还没有行走记录，将从开头进入。'));
   if(summary?.completedChapter)d.append(el('p','本章已经完成，可随时回访；回访不会重复结算。'));
   d.append(el('p','「从本章开头开始」只重置站立位置，已完成的交谈、任务与决策都会保留。','march83-note'));
   const finish=value=>{d.dataset.choice=value;d.close();};
   if(summary?.here)d.append(button('继续上次进度',()=>finish('resume')));
   d.append(button(summary?.here?'从本章开头开始':'开始本章剧情',()=>finish('fresh')));
   d.append(button('返回地图',()=>finish('')));
   d.addEventListener('cancel',event=>{event.preventDefault();finish('');});
   d.addEventListener('close',()=>{d.remove();if(loading===d)loading=null;resolve(d.dataset.choice||null);},{once:true});
   document.body.append(d);d.showModal();
  });
 }
 async function open(id){
  await waitForPrologue();
  id=Number(id);repairPreviewProgress();
  if(!GAME_NODES.some(n=>n.id===id)||RouteMap.isNodeLocked(id)){GameUI.showToast('请先完成当前关卡的剧情与任务，再继续下一程。');return false;}
  if(!GameState.character){GameUI.showCharSelect();return false;}
  if(loading)return false;
  entryOwner=owner();const token=++epoch,d=el('dialog',undefined,'experience-entry93');loading=d;
  const node=GAME_NODES.find(n=>n.id===id);d.append(el('h2',node.name),el('p','正在读取本章存档，请稍候…'));
  const status=el('p','本章完成前，下一程保持锁定。');status.setAttribute('role','status');d.append(status,button('返回地图',close));document.body.append(d);d.addEventListener('cancel',e=>{e.preventDefault();close();});d.showModal();
  try{
   await window.CZBoot92?.loadArchives?.();
   if(token!==epoch||entryOwner!==owner()||!GameState.character)return false;
   if(typeof window.CZMarchEntry?.launch!=='function')throw Error('剧情模块尚未准备好，请重试。');
   const summary=savedSummary(id);
   d.close();d.remove();
   // 首次进入没有任何行走记录时，「将从开头进入」是废话确认，直接放行；
   // 只有真的存过进度才需要让玩家选「继续 / 从头」。
   const hasProgress=!!(summary?.here||summary?.completed);
   const choice=hasProgress?await promptEntry(id,node,summary):'fresh';
   if(choice===null||token!==epoch||entryOwner!==owner()||!GameState.character)return false;
   if(choice==='')return false;
   const ok=await window.CZMarchEntry.launch(id,{fresh:choice==='fresh'});if(ok!==true)throw Error('本章场景未能打开，请重新开始体验。');return true;
  }catch(e){
   if(token===epoch){
    const retry=el('dialog',undefined,'experience-entry93');loading=retry;
    retry.append(el('h2',node.name),el('p',e.message||'读取未完成，请重试。'));
    const again=button('重新读取',()=>{retry.dataset.retry='1';retry.close();});
    retry.append(again,button('返回地图',()=>{retry.dataset.retry='';retry.close();}));
    retry.addEventListener('cancel',event=>{event.preventDefault();retry.close();});
    retry.addEventListener('close',()=>{const again=retry.dataset.retry==='1';retry.remove();if(loading===retry)loading=null;if(again)open(id);},{once:true});
    document.body.append(retry);retry.showModal();
   }
   return false;
  }
 }
 function install(){
  if(typeof GameUI==='undefined'||window.Documentary92.installed)return;window.Documentary92.installed=true;
  GameUI.showDungeonPanel=node=>open(node.id);
  const start=GameUI.startWithChar;GameUI.startWithChar=function(){const r=start.apply(this,arguments);setTimeout(()=>{if(GameState.character&&!window.CZMarchStory?.active)open(RouteMap.currentNodeId);},560);return r;};
  for(const name of ['load','clear','selectCharacter']){const old=GameState[name];if(typeof old==='function')GameState[name]=function(){close();const result=old.apply(this,arguments);repairPreviewProgress();return result;};}
  const enter=GameShell.enter;GameShell.enter=function(){const saved=!!GameState.character,r=enter.apply(this,arguments);if(saved)open(RouteMap.currentNodeId);return r;};
  const label=()=>{const b=document.querySelector('#chapterBanner .field-chapter-enter');if(b){b.replaceChildren(document.createTextNode('开始体验'));const arrow=el('span','→');arrow.setAttribute('aria-hidden','true');b.append(arrow);}};
  if(typeof FieldEditorial!=='undefined'){const update=FieldEditorial.update;FieldEditorial.update=function(){const r=update.apply(this,arguments);label();return r;};}label();
  document.querySelectorAll('.hud-stat').forEach(n=>n.style.setProperty('display','none','important'));
  const details=button('行军物资',()=>{const d=el('dialog',undefined,'supplies93');d.append(el('h2','行军物资与队伍记录'),el('p','现有教学模拟资源，不代表历史人数或实际物资数量。'));const list=el('dl');for(const [key,name]of Object.entries({food:'口粮储备',troops:'队伍状态',morale:'同行士气',ammo:'扩展练习物资'}))list.append(el('dt',name),el('dd',GameState.resources[key]+' / 100'));d.append(list,button('返回场景',()=>d.close()));document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();});details.className='supplies-trigger93';document.querySelector('.hud-right')?.append(details);
  const morse=document.getElementById('titleMorse');if(morse)morse.onclick=async()=>{await window.CZBoot92?.loadArchives?.();if(typeof MorseTraining!=='undefined')MorseTraining.open();};
  const demo=document.getElementById('titleDemo');if(demo){demo.textContent='先走一段';demo.onclick=async()=>{await window.CZBoot92?.loadArchives?.();return window.MainlineDemo.start();};}
  const highlights=document.getElementById('titleHighlights');if(highlights){highlights.textContent='听一段电报';highlights.onclick=()=>{const d=el('dialog',undefined,'supplies93'),line=INTEL_MESSAGES[2];d.append(el('h2','听一段电报'),el('p','教学示例 · 非真实密电'),el('p',line.morse),el('p',line.meaning),button('设备朗读释文',()=>{window.speechSynthesis?.cancel();const u=new SpeechSynthesisUtterance(line.meaning);u.lang='zh-CN';window.speechSynthesis?.speak(u);}),button('返回主菜单',()=>d.close()));document.body.append(d);d.addEventListener('close',()=>{window.speechSynthesis?.cancel();d.remove();},{once:true});d.showModal();};}
  const check=document.getElementById('titleBff');if(check)check.textContent='检查可选云服务';
  GameUI.checkBffHealth=async()=>false;
  if(typeof PlayerSettings!=='undefined')PlayerSettings.apply();
  repairPreviewProgress();
  window.addEventListener('pagehide',close,{once:true});
 }
 window.Documentary92={enabled:false,installed:false,open,close,install,repairPreviewProgress};
 if(window.CZBoot92)window.CZBoot92.whenReady(install);else if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
