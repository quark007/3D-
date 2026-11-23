/* Independent optional teaching cards. Never changes mainline scores or chapter progress. */
(() => {
  'use strict';
  const entries = [
    {id:'stretcher',nodes:[2,8],host:'Stretcher71',title:'双人担架 · 一起走',desc:'协调抬举，稳妥完成接应',symbol:'↔'},
    {id:'circuit',nodes:[3],host:'RadioCircuit71',title:'战地电台 · 断线重连',desc:'转动线路，找到真正接通的路径',symbol:'⌁'},
    {id:'warehouse',nodes:[1],host:'SupplySokoban71',title:'补给仓库 · 让出一条路',desc:'推移物资箱，整理交接通道',symbol:'▣'},
    {id:'ropes',nodes:[5],host:'RopeUntangle71',title:'绳结解围 · 整理携行绳',desc:'调整连接点，让交叉的绳线舒展',symbol:'⋈'},
    {id:'archive',nodes:[11],host:'ArchiveRestore71',title:'档案修复 · 拼回这一页',desc:'拼合原创教学纸页，完成后细读',symbol:'▤'},
    {id:'bridge',nodes:[7],host:'BridgeWorkshop71',title:'木桥工坊 · 让队伍通过',desc:'搭建、试载、加固，观察结构变化',symbol:'⌒'}
  ];
  let observer;
  const state = () => typeof GameState !== 'undefined' ? GameState : window.GameState;
  const notify = text => {
    if (typeof GameUI !== 'undefined' && GameUI.showToast) GameUI.showToast(text);
    else {
      const status=document.querySelector('.mini71-status');
      if(status)status.textContent=text;
    }
  };
  const best = (entry,nodeId) => state()?.storyPreparations?.['mini71_'+entry.id+'_'+nodeId];
  function launch(id,nodeId) {
    const entry=entries.find(e=>e.id===id&&e.nodes.includes(Number(nodeId)));
    const node=typeof GAME_NODES !== 'undefined'?GAME_NODES.find(n=>n.id===Number(nodeId)):null;
    if(!entry||!node)return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){
      notify('尚未抵达此站，请先完成当前章节。');return false;
    }
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){
      NpcStory.pendingTask={nodeId:node.id,run:()=>launch(id,node.id)};
      NpcStory.startGate(node);return false;
    }
    const engine=window[entry.host];
    if(!engine||typeof engine.open!=='function'){
      notify('教学工坊暂未载入，请刷新页面后重试。');return false;
    }
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null;
    const demo=!!window.MainlineDemo?.active;
    engine.open(node,result=>{
      if(owner!==(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)||demo!==!!window.MainlineDemo?.active)return;
      if(result?.won===true){render();notify('练习成绩已记入本机存档，可再次挑战。');}
    });
    return true;
  }
  function style(){
    if(document.getElementById('mini71-lab-style'))return;
    const s=document.createElement('style');s.id='mini71-lab-style';
    s.textContent=`.mini71-lab{margin:20px 0 8px;padding:18px 0 0;border-top:1px solid #8a7c5f66;color:#3f4335}.mini71-lab h4{margin:0 0 5px;font:600 17px/1.5 "Microsoft YaHei",sans-serif;letter-spacing:1px}.mini71-note{margin:0 0 12px;font-size:12px;line-height:1.7;color:#74694f}.mini71-card{box-sizing:border-box;display:flex!important;align-items:center;gap:12px;width:100%;min-height:76px;padding:14px!important;margin:8px 0!important;text-align:left;background:#243b30!important;color:#f0e5ce!important;border:1px solid #b89a645c!important;border-radius:12px!important;cursor:pointer;box-shadow:none!important}.mini71-card:hover{background:#314c3e!important;border-color:#c6a46b!important}.mini71-card:focus-visible{outline:3px solid #c6a46b;outline-offset:3px}.mini71-symbol{display:grid;place-items:center;flex:none;width:44px;height:44px;border:1px solid #c6a46b66;border-radius:9px;font:28px/1 serif;color:#d7bc88}.mini71-copy{display:flex;flex-direction:column;gap:5px;min-width:0}.mini71-title{font-size:15px;font-weight:600;line-height:1.5}.mini71-desc,.mini71-best{font-size:12px;line-height:1.6;color:#c9c3ad}.mini71-best{color:#dfc48c}.mini71-status:empty{display:none}@media(max-width:700px){.mini71-card{gap:10px;padding:12px!important}.mini71-title{font-size:14px}.mini71-lab{margin-top:15px}}@media(prefers-reduced-motion:reduce){.mini71-card{transition:none!important}}`;
    document.head.append(s);
  }
  function render(){
    const mount=document.getElementById('panelChallenges');
    const nodeId=Number(document.getElementById('dungeonPanel')?.dataset.nodeId);
    if(!mount||!nodeId)return;
    const selected=entries.filter(e=>e.nodes.includes(nodeId));
    let section=mount.querySelector('.mini71-lab');
    if(section&&Number(section.dataset.nodeId)!==nodeId){section.remove();section=null;}
    if(!selected.length){section?.remove();return;}
    if(!section){
      style();section=document.createElement('section');section.className='mini71-lab';section.dataset.nodeId=nodeId;
      const heading=document.createElement('h4');heading.textContent='可选教学工坊';
      const note=document.createElement('p');note.className='mini71-note';note.textContent='独立练习 · 成绩单独保存，不影响主线进度或队伍资源';
      section.append(heading,note);
      for(const entry of selected){
        const button=document.createElement('button');button.type='button';button.className='mini71-card';button.dataset.mini71=entry.id;
        const icon=document.createElement('span');icon.className='mini71-symbol';icon.textContent=entry.symbol;icon.setAttribute('aria-hidden','true');
        const copy=document.createElement('span');copy.className='mini71-copy';
        for(const [className,text]of [['mini71-title',entry.title],['mini71-desc',entry.desc],['mini71-best','']]){const line=document.createElement('span');line.className=className;line.textContent=text;copy.append(line);}
        button.append(icon,copy);button.addEventListener('click',()=>launch(entry.id,nodeId));section.append(button);
      }
      const status=document.createElement('p');status.className='mini71-status';status.setAttribute('role','status');section.append(status);mount.append(section);
    }
    for(const entry of selected){
      const record=best(entry,nodeId),line=section.querySelector('[data-mini71="'+entry.id+'"] .mini71-best');
      const text=Number.isFinite(record?.bestScore)?'历史最佳 '+record.bestScore+' 分 · '+(record.rating||'练习已记录'):'尚未练习 · 点击开始';
      if(line&&line.textContent!==text)line.textContent=text;
    }
  }
  function install(){
    if(observer)return;
    const mount=document.getElementById('panelChallenges');
    if(!mount)return;
    observer=new MutationObserver(render);observer.observe(mount,{childList:true});render();
  }
  window.OptionalLab71={entries,launch,render,install};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
