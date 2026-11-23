/* Start screen owns navigation; the underlying game keeps its authored task gates. */
const S65T=(k,v)=>typeof I18nSnow65!=='undefined'?I18nSnow65.t(k,v):k;
const GameShell={
  lock(active){document.body.classList.toggle('title-locked',active);for(const child of document.body.children)if(child.id!=='titleScreen'&&!child.matches('.award-demo-overlay,.experience-overlay')&&!['SCRIPT','STYLE','DIALOG'].includes(child.tagName))child.inert=active;},
  isBlocked(target){return document.body.classList.contains('title-locked')&&!target?.closest?.('#titleScreen,.award-demo-overlay,.experience-overlay,dialog');},
  show(){document.getElementById('titleScreen').hidden=false;document.body.classList.add('at-title');const line=document.querySelector('.title-line');if(line)line.innerHTML=S65T('start.subtitle');const saved=!!GameState.character,button=document.getElementById('titleStart');let label=button.querySelector('.title-start-label');if(!label){label=document.createElement('span');label.className='title-start-label';const arrow=document.createElement('span');arrow.className='title-start-arrow';arrow.textContent='→';button.replaceChildren(label,arrow);}label.textContent=window.CZ_DEMO_SESSION?S65T('start.demo'):saved?S65T('start.continue'):S65T('start.new');document.getElementById('titleRestart').hidden=!saved||window.CZ_DEMO_SESSION===true;
  /* [R6 2026-10-28] 继续游戏恢复信息：第几站 · 岗位 · 下一步环节。只用真实数据；
     剧本未加载完成时下一步回退为「与战友交谈」（保守且总是正确的第一动作）。 */
  let sub=document.querySelector('.title-start-sub');
  if(!sub){sub=document.createElement('p');sub.className='title-start-sub';sub.setAttribute('role','note');button.after(sub);}
  if(window.CZ_DEMO_SESSION||!saved){sub.hidden=true;sub.textContent='';}
  else{try{
    const nodeId=(typeof RouteMap!=='undefined'&&RouteMap.currentNodeId)||1;
    const node=typeof GAME_NODES!=='undefined'?GAME_NODES.find(n=>n.id===nodeId):null;
    const script=typeof NpcStory!=='undefined'?NpcStory.get(nodeId,1):null;
    let next='与战友交谈';
    if(script&&typeof NpcDialogueFlow!=='undefined'){
      const count=NpcDialogueFlow.count(script,NpcStory.role());
      if(count>=NpcStory.required(script))next='进入本章任务';
    }
    sub.hidden=false;
    sub.textContent=`继续：第 ${nodeId} 站 · ${GameState.character?.name||'已选岗位'}${node?` · ${node.name}`:''} · 下一步：${next}`;
  }catch(e){sub.hidden=true;}}},
  enter(){document.getElementById('titleScreen').hidden=true;document.body.classList.remove('at-title');document.getElementById('introOverlay').style.display='none';if(GameState.character){GameUI.skipToIntro();GameUI.updateResourceHUD();if(typeof PlayerOnboarding!=='undefined')PlayerOnboarding.offer();}else GameUI.showCharSelect();},
  async connect(){if(typeof BffConnection!=='undefined')return BffConnection.connect();const b=document.getElementById('titleBff'),status=document.getElementById('titleBffStatus');if(b.disabled)return;b.disabled=true;status.textContent='正在检测本地服务…';try{let health=await apiHealth(2500);if(!health){await GameUI.autoConnectBff();health=await apiHealth(2500);}status.textContent=health?(health.model_configured?'BFF已连接 · 模型已配置，实际生成状态以请求结果为准':'BFF已连接 · 模型尚未配置'):'尚未连接，可继续固定剧情；维护者请启动本地BFF。';}catch{status.textContent='连接暂未完成，可继续固定剧情。';}finally{b.disabled=false;}},
  foldTask(host){if(!host)return;for(const card of host.querySelectorAll(':scope > .npc-story-card')){if(card.closest('details'))continue;const fold=document.createElement('details');fold.className='story-fold';const summary=document.createElement('summary');summary.textContent='战友交谈已完成 · 展开回看';card.before(fold);fold.append(summary,card);}const target=host.querySelector('h1,h2,h3,textarea,button');target?.scrollIntoView({block:'start'});},
  install(){
    if(this.installed)return;this.installed=true;
    const show=this.show;this.show=function(){this.lock(true);return show.apply(this,arguments);};const enter=this.enter;this.enter=function(){this.lock(false);return enter.apply(this,arguments);};
    if(typeof I18nSnow65!=='undefined')I18nSnow65.onChange(()=>{const ts=document.getElementById('titleScreen');if(ts&&!ts.hidden)this.show();});
    document.getElementById('titleStart').onclick=()=>this.enter();document.getElementById('titleBff').onclick=()=>this.connect();
    document.getElementById('titleDemo').onclick=()=>window.MainlineDemo.start().catch(()=>GameUI.showToast('演示初始化未完成，可继续正式剧情或稍后重试'));
    document.getElementById('titleHighlights').onclick=()=>GameUI.showAwardDemo();
    const blocked=target=>this.isBlocked(target);
    for(const type of ['click','pointerdown','keydown'])document.addEventListener(type,event=>{if(blocked(event.target)){event.preventDefault();event.stopImmediatePropagation();}},true);
    document.addEventListener('focusin',event=>{if(blocked(event.target))document.getElementById('titleStart').focus();});
    document.getElementById('titleRestart').onclick=()=>{const dialog=document.createElement('dialog');dialog.className='morse-training';const p=document.createElement('p');p.textContent='重新开始会清除这台浏览器的征程、关系与任务存档，保留声音等设置。';const cancel=document.createElement('button');cancel.textContent='保留当前征程';cancel.onclick=()=>dialog.close();const restart=document.createElement('button');restart.textContent='清除存档并重新开始';restart.onclick=()=>{GameState.clear();location.reload();};dialog.append(p,cancel,restart);document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();};
    const map=document.getElementById('mapContainer'),toggle=document.createElement('button');toggle.className='map-collapse';toggle.textContent='收起行记';toggle.setAttribute('aria-expanded','true');toggle.onclick=()=>{const wide=document.body.classList.toggle('map-wide');toggle.textContent=wide?'展开行记':'收起行记';toggle.setAttribute('aria-expanded',String(!wide));requestAnimationFrame(()=>MapView.refit());};map.append(toggle);
    const home=document.createElement('button');home.className='game-home';home.textContent='主菜单';home.onclick=()=>this.show();document.querySelector('.hud-left').append(home);
    const attribution=document.createElement('small');attribution.className='map-attribution';attribution.textContent='底图审图号 GS(2023)2767 · 路线节点为教学标注';map.append(attribution);
    const chapter=GameUI.showDungeonPanel;if(chapter)GameUI.showDungeonPanel=function(){if(!GameState.character){this.showCharSelect();return;}return chapter.apply(this,arguments);};
    const demo=document.querySelector('#chapterBanner .showcase-entry');if(!demo){const b=document.createElement('button');b.className='showcase-entry';b.textContent='快速体验（3 分钟）';b.onclick=()=>window.MainlineDemo.start().catch(()=>GameUI.showToast('演示初始化未完成，请稍后重试'));document.getElementById('chapterBanner').append(b);}
    const clear=GameState.clear;GameState.clear=function(){const result=clear.apply(this,arguments);RouteMap.resetNodes();GameUI.journalEntries=[];if(typeof ExperienceSystem!=='undefined')ExperienceSystem.state=ExperienceCore.empty();return result;};
    this.show();window.dispatchEvent(new Event('cz-game-ready'));
  }
};
document.addEventListener('DOMContentLoaded',()=>GameShell.install());
