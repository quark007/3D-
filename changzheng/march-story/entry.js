/* Prefer real A scenes once all chapter manifests exist; preserve legacy fallback and explicit developer mode. */
(() => {
  'use strict';
  async function launch(chapterId,{fresh=false}={}){
    const world=window.CZMarchWorld;
    if(!world){window.CZMarchUI.note('立体场景尚未由A方接入。现有剧情和小游戏仍可从原入口游玩。');return false;}
    let root=document.getElementById('march83-root');if(!root){root=document.createElement('section');root.id='march83-root';root.setAttribute('aria-label','长征立体剧情场景');document.body.append(root);}
    const e=window.CZMarchEnv();
    try{
      if(typeof GameShell!=='undefined')GameShell.lock(false);
      if(typeof PlayerOnboarding!=='undefined')PlayerOnboarding.close();
      e.ui?.closeDungeonPanel?.();
      root.hidden=false;
      const actual=window.CZMarchWorldManifest || world.manifest;
      const metadata=window.CZMarchBindings83;
      const sceneManifest=actual?{...actual,bindings:metadata?.bindings || {},ground:metadata?.ground || {},scenes:actual.scenes.map(s=>({...s,spawn:metadata?.spawnOverrides?.[s.sceneId] || s.spawn}))}:undefined;
      return await window.CZMarchStory.boot({container:root,world,chapterId,sceneManifest,fresh:fresh===true});
    }catch(error){window.CZMarchStory.destroy();window.CZMarchUI.note(error.message);return false;}
  }
  const prefer=()=>!window.CZMarchEntry.legacyMode && window.CZMarchWorldManifest?.scenes?.length>=12;
  async function navigate(match){
    if(window.CZMarchStory.active){window.CZMarchUI.note('先返回场景，再沿线索寻找交互地点。');return false;}
    const e=window.CZMarchEnv();if(e.route?.isNodeLocked(match.chapterId)){window.CZMarchUI.note('尚未抵达此站，请先继续当前章节。');return false;}
    const ok=await launch(match.chapterId);if(ok){const line=document.querySelector('#march83-root [data-march-status]');if(line)line.textContent='请在场景里寻找「'+match.title+'」的交互点；靠近后确认交互。';}return ok;
  }
  function install(){
    const e=window.CZMarchEnv();if(!e.ui || e.ui.march83Installed)return;e.ui.march83Installed=true;
    for(const method of ['clear','load','selectCharacter']){const fn=e.state?.[method];if(typeof fn!=='function')continue;e.state[method]=function(...args){if(window.CZMarchStory.mounted)window.CZMarchStory.destroy({savePosition:method==='selectCharacter'});return fn.apply(this,args);};}
    const original=e.ui.showDungeonPanel;
    e.ui.showDungeonPanel=function(node){
      const ready=window.CZMarchWorldManifest?.scenes?.length>=12 && typeof window.CZMarchWorld?.mount==='function';
      if(ready && !window.CZMarchEntry.legacyMode)return launch(node.id);
      const value=original.apply(this,arguments),host=document.querySelector('#dungeonPanel .panel-body');
      if(host&&!host.querySelector('.march83-entry')){
        const b=window.CZMarchUI.button('走进立体剧情场景',()=>launch(node.id));b.className='march83-entry';
        b.title=window.CZMarchWorld?'角色行走、NPC交谈与场景任务':'等待A方场景模块；原有入口照常可用';host.prepend(b);
      }return value;
    };
    const find=predicate=>window.CZMarchRegistry.create().rows.find(predicate);
    const wrap=(object,name,lookup)=>{if(typeof object?.[name]!=='function')return;const previous=object[name];object[name]=function(...args){if(!prefer())return previous.apply(this,args);const row=lookup(...args);if(!row){window.CZMarchUI.note('此入口尚无场景映射，请查看接入清单。');return false;}return navigate(row);};};
    wrap(window.OptionalLab71,'launch',(id,nodeId)=>find(r=>r.chapterId===Number(nodeId)&&r.storyId.endsWith('/workshop-'+id)));
    wrap(window.StarfireBook73,'launch',(icon,node)=>find(r=>r.chapterId===Number(node.id)&&r.icon===icon));
    const archive=window.ArchiveUI74;
    if(archive?.launch){const previous=archive.launch;archive.launch=function(entry){if(!prefer()||entry.group==='replays')return previous.call(this,entry);const row=find(r=>r.chapterId===entry.node&&(r.icon===entry.icon||r.storyId.endsWith('/workshop-'+entry.icon)||r.host===entry.host));if(row)return navigate(row);window.CZMarchUI.note('此档案为只读记录，暂无对应场景动作。');return false;};}
    if(window.Daily68?.openGame){const previous=window.Daily68.openGame;window.Daily68.openGame=function(item){if(!prefer())return previous.call(this,item);const row=find(r=>r.chapterId===item.node&&r.host===item.engine);if(!row)return false;if(!window.CZMarchSave.transact(s=>s.dailyTarget={storyId:row.storyId,day:window.Daily68.dayKey()}))return false;return navigate(row);};}
  }
  window.CZMarchEntry={launch,navigate,install,legacyMode:false};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
