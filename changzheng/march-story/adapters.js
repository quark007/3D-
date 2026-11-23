/* Explicit compatibility adapters. Closing an overlay is NEVER a success signal. */
(() => {
  'use strict';
  /* Engines whose explicit "record result" action invokes the callback with no arguments.
     Wuqi68 fires onComplete() only after the exercise is won and the score saved. */
  /* Lazikou68（第10章火力准备）的 onComplete 只在其成绩成功写入存档后触发，无 win/won 参数；
     Press72 同理。Grassland30（第9章草地三十天）与 NightMarch72（第9章夜行军纵队番外）同为
     “记录成绩成功后才无参回调”。这些都属“成功才回调”，不是“调用回调即成功”。 */
  const noArgSuccess = new Set(['SiduBluff67','HuishiDrum67','Scout67','Campfire68','Wuqi68','Gouba72','PoemScroll72','Press72','Yihai72','ChapterTasks54','Lazikou68','Grassland30','NightMarch72']);
  const rootsSelector='dialog,[role="dialog"],[aria-modal="true"],#gcm-overlay,#journeyChapter';
  async function legacy(row, signal) {
    const env=window.CZMarchEnv(), engine=row.host==='ChapterTasks54'&&typeof ChapterTasks54!=='undefined'?ChapterTasks54:row.host==='JourneyChapter'&&typeof JourneyChapter!=='undefined'?JourneyChapter:window[row.host], node=env.nodes.find(n=>n.id===row.chapterId);
    if(!engine?.open)return {status:'error',reason:'模块未加载：'+row.host};
    if(env.route?.isNodeLocked(row.chapterId))return {status:'error',reason:'尚未抵达此章'};
    if(!env.story.unlocked(row.chapterId))return {status:'error',reason:'请先完成本章必要交谈'};
    if(typeof CoopHotseat66!=='undefined' && CoopHotseat66.active() && !CoopHotseat66.allowed('action'))return {status:'error',reason:'请先按热座规则交接至当前行动岗位'};
    const before=new Set(document.querySelectorAll(rootsSelector)),owned=new Set();let settled=false,watch,timer;
    return new Promise(resolve=>{
      const collect=()=>{for(const d of document.querySelectorAll(rootsSelector))if(!before.has(d)){owned.add(d);if(d.tagName!=='DIALOG'){d.style.zIndex='10001';d.dataset.marchOwned='true';if(d.id==='journeyChapter'){d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');}}for(const b of d.querySelectorAll('[data-close],.gcm-exit'))if(b.textContent!=='返回场景 · Esc')b.textContent='返回场景 · Esc';for(const b of d.querySelectorAll('button'))if(b.textContent==='保存并返回地图')b.textContent='保存并返回场景';if(row.host==='JourneyChapter')d.querySelectorAll('.npc-story-card,.npc-story-recap,.npc-story-completed').forEach(n=>n.remove());}};
      const stop=()=>{try{if(typeof engine.closeActive==='function')engine.closeActive();else if(row.host==='JourneyChapter')engine.close(false);else engine.close?.();}catch{/* Still remove owned shell. */}for(const d of owned){if(d.tagName==='DIALOG'&&d.open)d.close();d.remove();}};
      const finish=r=>{if(settled)return;settled=true;watch?.disconnect();clearInterval(timer);signal.removeEventListener('abort',abort);document.removeEventListener('keydown',escape);stop();resolve(r);};
      const abort=()=>finish({status:'cancelled'});
      const escape=e=>{if(row.host==='JourneyChapter'&&e.key==='Escape'&&!document.querySelector('dialog[open]')){e.preventDefault();e.stopPropagation();abort();}};
      const done=result=>{
        if(signal.aborted || env.owner!==window.CZMarchEnv().owner)return finish({status:'cancelled'});
        const won=result?.won===true || result?.win===true || (result===undefined && noArgSuccess.has(row.host));
        finish({status:won?'completed':result?.won===false || result?.win===false ? 'failed':'error',reason:won?undefined:'模块未返回明确成功信号'});
      };
      watch=new MutationObserver(()=>{collect();queueMicrotask(()=>{
        if(settled)return;if(owned.size && ![...owned].some(n=>n.isConnected && (n.tagName!=='DIALOG'||n.open)))finish({status:'cancelled'});
      });});watch.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
      signal.addEventListener('abort',abort,{once:true});
      if(row.host==='JourneyChapter')document.addEventListener('keydown',escape);
      try{
        const sf=window.StarfireBook73?.entries.find(e=>e.node===row.chapterId&&e.icon===row.icon);
        let opened;
        if(row.host==='StarfireScenes73')opened=engine.open(row.icon,node,'normal',done);
        else opened=engine.open(row.host==='GrasslandCollect'?node.id:node,done,row.host==='GrasslandCollect'?{successOnly:true}:undefined);
        collect();
        if(opened===false)return finish({status:'error',reason:'模块前置条件尚未满足'});
        // Preserve existing per-engine touch accessibility without opening a second brief.
        if(sf && row.host!=='StarfireScenes73'){
          const d=[...owned].find(n=>n.tagName==='DIALOG'&&n.querySelector('canvas'));
          if(d){window.StarfireBook73.materials(sf,d);window.StarfireBook73.accessible(sf,engine,d);}
        }
        if(!owned.size && !settled)return finish({status:'error',reason:'模块未创建可交互界面'});
        if(!settled)timer=setInterval(()=>{if(env.owner!==window.CZMarchEnv().owner)finish({status:'cancelled'});},250);
      }catch(error){finish({status:'error',reason:String(error.message)});}
    });
  }
  /* 第11章「直罗镇 · 番外接应」：真实旧引擎 Zhiluo70.openCard()。旧引擎无回调，
     render() 调用的是模块内局部 persist（包装导出属性拦不到），因此以两个显式证据判定成功：
     ① 会话内三关全部通关（session.status==='won' 且 levelIdx 为最后一关）；
     ② 旧引擎 persist 写入 storyPreparations.zhiluo_extra（completedAt 变化）。
     任一出现即显式成功；关闭/取消/未全胜都不算成功。番外保留独立年代标注，不占主线图鉴。 */
  async function zhiluo70(row, signal) {
    const env=window.CZMarchEnv(),engine=window.Zhiluo70;
    if(!engine?.openCard)return {status:'error',reason:'模块未加载：Zhiluo70'};
    if(env.route?.isNodeLocked(row.chapterId))return {status:'error',reason:'尚未抵达此章'};
    const before=new Set(document.querySelectorAll('dialog'));
    const savedBefore=env.state.storyPreparations?.zhiluo_extra?.completedAt||null;let won=false;
    return new Promise(resolve=>{
      let ended=false;const owned=new Set();const observer=new MutationObserver(scan);
      /* 会话证据轮询：不依赖 DOM 变更时序，结算面板停留期间也能捕获三关全胜。 */
      const poll=setInterval(()=>{if(ended)return;const s=engine.session;if(s&&s.status==='won'&&s.levelIdx===(engine.LEVELS?.length||3)-1)won=true;},300);
      const done=status=>{if(ended)return;ended=true;clearInterval(poll);observer.disconnect();signal.removeEventListener('abort',abort);resolve({status});};
      const abort=()=>{for(const d of owned)if(d.isConnected&&d.open)d.close();done('cancelled');};
      function scan(){
        const s=engine.session;
        if(s&&s.status==='won'&&s.levelIdx===(engine.LEVELS?.length||3)-1)won=true;
        for(const d of document.querySelectorAll('dialog'))if(!before.has(d))owned.add(d);
        if(owned.size&&![...owned].some(d=>d.isConnected&&d.open)){
          if(env.state.storyPreparations?.zhiluo_extra?.completedAt&&env.state.storyPreparations.zhiluo_extra.completedAt!==savedBefore)won=true;
          done(won?'completed':'cancelled');
        }
      }
      observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});signal.addEventListener('abort',abort,{once:true});
      try{engine.openCard();scan();if(!owned.size&&!ended)done('error');}
      catch(error){done('error');window.CZMarchUI.note(error.message);}
    });
  }
  /* 第11章「扎根陕北」：旧副本派发的真实学习任务（js/game-ui.js showLearningTask → LEARNING_TASKS[11]）。
     原完成回调指向 GameUI.completeDungeon（旧整章通关+勋章），行走剧情里章节推进由出口统一处理，
     因此临时改道该回调为任务完成信号；整理行记（ChapterTasks54）保持独立任务，不再串联。 */
  async function legacyChoice11(row, signal) {
    const env=window.CZMarchEnv();
    if(typeof GameUI==='undefined'||typeof GameUI.showLearningTask!=='function')return {status:'error',reason:'模块未加载：GameUI.showLearningTask'};
    const node=env.nodes.find(n=>n.id===row.chapterId);
    /* LEARNING_TASKS 是 classic script 顶层 const（词法全局），不在 window 上，不能查 window.LEARNING_TASKS。 */
    const learningTasks=typeof LEARNING_TASKS!=='undefined'?LEARNING_TASKS:undefined;
    if(!node||!learningTasks?.[node.id])return {status:'error',reason:'本章学习任务资料缺失'};
    if(env.route?.isNodeLocked(row.chapterId))return {status:'error',reason:'尚未抵达此章'};
    if(!env.story.unlocked(row.chapterId))return {status:'error',reason:'请先完成本章必要交谈'};
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action'))return {status:'error',reason:'请先按热座规则交接至当前行动岗位'};
    const before=new Set(document.querySelectorAll(rootsSelector)),previous=GameUI.completeDungeon;
    const owned=new Set();let settled=false,watch;
    return new Promise(resolve=>{
      const finish=r=>{if(settled)return;settled=true;if(GameUI.completeDungeon===done)GameUI.completeDungeon=previous;watch?.disconnect();signal.removeEventListener('abort',abort);document.removeEventListener('keydown',escape);resolve(r);};
      const abort=()=>finish({status:'cancelled'});
      const escape=e=>{if(e.key!=='Escape')return;e.preventDefault();e.stopPropagation();document.getElementById('learningTaskOverlay')?.remove();};
      const done=()=>{if(signal.aborted||env.owner!==window.CZMarchEnv().owner)return finish({status:'cancelled'});finish({status:'completed'});};
      const collect=()=>{for(const d of document.querySelectorAll(rootsSelector))if(!before.has(d)){owned.add(d);for(const b of d.querySelectorAll('button'))if(b.textContent==='返回地图')b.textContent='返回场景 · Esc';}};
      watch=new MutationObserver(()=>{collect();queueMicrotask(()=>{if(settled)return;if(owned.size&&![...owned].some(n=>n.isConnected))finish({status:'cancelled'});});});
      watch.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      signal.addEventListener('abort',abort,{once:true});document.addEventListener('keydown',escape);
      try{GameUI.completeDungeon=done;GameUI.showLearningTask(node,true);collect();if(!owned.size&&!settled)return finish({status:'error',reason:'模块未创建可交互界面'});}
      catch(error){if(GameUI.completeDungeon===done)GameUI.completeDungeon=previous;finish({status:'error',reason:String(error.message)});}
    });
  }
  /* 第10章旧章内任务（悬崖攀爬 qte / 战术突破 choice）：恢复 js/game-ui.js 原章节调度链。
     qte → GameUI.startQTE（连点攀爬QTE，停手回滑、滑到0判负）；choice → 原战前抉择（休整/急行军）
     → 指挥所战术磁贴与指令解析 → 确认行动 → 战况动画 → 同一条 QTE。真实胜利链终点是
     completeDungeon（档案卡关闭后），行走剧情里章节推进由出口统一处理，因此临时改道该回调为
     任务完成信号，不执行旧主线的勋章发放与路线解锁。战报/结算/AI解析均有本地降级，断网可完成。
     失败（回滑到0/判负）进原失败面板，可重试；取消/退出不算成功。 */
  const chapterOverlays=['prebattleOverlay','commandOverlay','battleAnimLayer','qteOverlay','telegramOverlay','settlementOverlay','archiveOverlay','defeatOverlay'];
  async function chapterDispatch10(row, signal) {
    const env=window.CZMarchEnv();
    if(typeof GameUI==='undefined'||typeof GameUI.startQTE!=='function'||typeof GameUI.showCommandPost!=='function'||typeof GameUI.showPreBattleChoice!=='function'||typeof GameUI.completeDungeon!=='function')return {status:'error',reason:'模块未加载：js/game-ui.js 旧章节调度链'};
    const node=env.nodes.find(n=>n.id===row.chapterId);
    if(!node)return {status:'error',reason:'旧章节调度缺少节点数据'};
    if(env.route?.isNodeLocked(row.chapterId))return {status:'error',reason:'尚未抵达此章'};
    if(!env.story.unlocked(row.chapterId))return {status:'error',reason:'请先完成本章必要交谈'};
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action'))return {status:'error',reason:'请先按热座规则交接至当前行动岗位'};
    const icon=row.icon||(row.storyId.endsWith('legacy-qte-1')?'qte':row.storyId.endsWith('legacy-choice-1')?'choice':null);
    if(!icon)return {status:'error',reason:'未识别的旧章节挑战：'+row.storyId};
    const previous=GameUI.completeDungeon,raised=new Map();
    let settled=false,defeatSeen=false;
    /* 旧覆盖层(z-index 230)会被行走世界(march83-root, z-index 10000)盖住——会话内提升，收尾恢复原值。 */
    const raise=()=>{for(const id of chapterOverlays){const el=document.getElementById(id);if(!el)continue;if(!raised.has(el))raised.set(el,el.style.zIndex||'');if(el.classList.contains('open'))el.style.zIndex='10001';}};
    return new Promise(resolve=>{
      const finish=r=>{if(settled)return;settled=true;clearInterval(poll);clearTimeout(verify);watch.disconnect();
        if(GameUI.completeDungeon===done)GameUI.completeDungeon=previous;
        for(const [el,z] of raised){el.style.zIndex=z;if(!z)el.style.removeProperty('z-index');}
        signal.removeEventListener('abort',abort);document.removeEventListener('keydown',escape,true);resolve(r);};
      const anyOpen=()=>chapterOverlays.some(id=>document.getElementById(id)?.classList.contains('open'));
      const abort=()=>{if(settled)return;try{GameUI.abortLevel?.('返回场景');}catch{/* 引擎清理失败时仍收尾覆盖层 */}for(const id of chapterOverlays)document.getElementById(id)?.classList.remove('open');finish({status:'cancelled'});};
      const escape=e=>{if(e.key!=='Escape')return;
        if(document.querySelector('#telegramOverlay.open,#settlementOverlay.open,#archiveOverlay.open,#defeatOverlay.open'))return;
        e.preventDefault();e.stopPropagation();abort();};
      const done=(...args)=>{const nodeArg=args[0];if(settled)return;
        if(signal.aborted||env.owner!==window.CZMarchEnv().owner)return finish({status:'cancelled'});
        if(nodeArg&&Number(nodeArg.id)!==Number(row.chapterId))return previous.apply(GameUI,args);
        finish({status:'completed'});};
      /* 原胜利链各段同步衔接（战报→结算→档案），无观察空窗；prebattle→指挥所回调有500ms间隙，
         观察到全部关闭后再等700ms复核一次，避免把间隙误判为取消。 */
      const outcome=()=>finish(defeatSeen?{status:'failed',reason:'本关未通过，可重新尝试。'}:{status:'cancelled'});
      let verify=null;
      const scheduleVerify=()=>{if(verify)return;verify=setTimeout(()=>{verify=null;if(settled)return;if(!anyOpen())outcome();},700);};
      const poll=setInterval(()=>{if(settled)return;raise();if(!anyOpen())scheduleVerify();},300);
      const watch=new MutationObserver(()=>{raise();if(document.getElementById('defeatOverlay')?.classList.contains('open'))defeatSeen=true;});
      watch.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
      signal.addEventListener('abort',abort,{once:true});
      document.addEventListener('keydown',escape,true);
      try{
        GameUI.completeDungeon=done;
        if(icon==='qte')GameUI.startQTE(node,typeof GameUI.localParseCommand==='function'?GameUI.localParseCommand('攀爬 悬崖 迂回 桥头'):null);
        else GameUI.showPreBattleChoice(node,()=>GameUI.showCommandPost(node));
        raise();
        if(!settled&&!anyOpen())return finish({status:'error',reason:'旧章节流程未能打开交互界面'});
      }catch(error){finish({status:'error',reason:String(error.message)});}
    });
  }
  /* 第12章「三军汇聚」：js/game-ui.js 原指挥所会师推演（LEVEL_CONFIG[12] 副标题「第一视角 · 三军汇聚」，
     nodeLevelMap[12]=huining/reunion；battleMode=meeting：战术磁贴/指令 → 确认行动 → 会师战报 → 结算 → 档案卡）。
     原胜利链终点 completeDungeon 由行走层临时改道为任务完成信号——不发旧主线勋章、不解锁旧路线、
     不触发 markGameCompleted 最终结算（章节推进统一由场景出口处理，其余必需任务未完成不得结算）。
     会师战报/结算/AI 解析全部沿用原本地降级，断网可完成；判负进原失败面板可重试；取消/退出不算成功。 */
  const chapterOverlays12=['commandOverlay','battleAnimLayer','telegramOverlay','settlementOverlay','archiveOverlay','defeatOverlay'];
  async function commandPost12(row, signal) {
    const env=window.CZMarchEnv();
    if(typeof GameUI==='undefined'||typeof GameUI.showCommandPost!=='function'||typeof GameUI.completeDungeon!=='function')return {status:'error',reason:'模块未加载：js/game-ui.js 指挥所链'};
    const node=env.nodes.find(n=>n.id===row.chapterId);
    if(!node)return {status:'error',reason:'旧章节调度缺少节点数据'};
    if(env.route?.isNodeLocked(row.chapterId))return {status:'error',reason:'尚未抵达此章'};
    if(!env.story.unlocked(row.chapterId))return {status:'error',reason:'请先完成本章必要交谈'};
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action'))return {status:'error',reason:'请先按热座规则交接至当前行动岗位'};
    const previous=GameUI.completeDungeon,originalZ=new Map();
    let settled=false,defeatSeen=false;
    return new Promise(resolve=>{
      const finish=r=>{if(settled)return;settled=true;clearInterval(poll);clearTimeout(verify);watch.disconnect();
        if(GameUI.completeDungeon===done)GameUI.completeDungeon=previous;
        for(const [el,z] of originalZ){el.style.zIndex=z;if(!z)el.style.removeProperty('z-index');}
        signal.removeEventListener('abort',abort);document.removeEventListener('keydown',escape,true);resolve(r);};
      const anyOpen=()=>chapterOverlays12.some(id=>document.getElementById(id)?.classList.contains('open'));
      const raise=()=>{for(const id of chapterOverlays12){const el=document.getElementById(id);if(!el)continue;if(!originalZ.has(el))originalZ.set(el,el.style.zIndex||'');if(el.classList.contains('open')||el.classList.contains('battle-anim-stage'))el.style.zIndex='10001';}};
      const abort=()=>{if(settled)return;try{GameUI.abortLevel?.('返回场景');}catch{/* 引擎清理失败时仍收尾覆盖层 */}for(const id of chapterOverlays12)document.getElementById(id)?.classList.remove('open');finish({status:'cancelled'});};
      const escape=e=>{if(e.key!=='Escape')return;
        if(document.querySelector('#telegramOverlay.open,#settlementOverlay.open,#archiveOverlay.open,#defeatOverlay.open'))return;
        e.preventDefault();e.stopPropagation();abort();};
      const done=(...args)=>{const nodeArg=args[0];if(settled)return;
        if(signal.aborted||env.owner!==window.CZMarchEnv().owner)return finish({status:'cancelled'});
        if(nodeArg&&Number(nodeArg.id)!==Number(row.chapterId))return previous.apply(GameUI,args);
        finish({status:'completed'});};
      /* 原胜利链各段同步衔接（战报→结算→档案），无观察空窗；指挥所关闭（返回/收报后中止）观察到全部关闭
         后再等 700ms 复核一次，避免把过渡间隙误判为取消。 */
      const outcome=()=>finish(defeatSeen?{status:'failed',reason:'本关未通过，可重新尝试。'}:{status:'cancelled'});
      let verify=null;
      const scheduleVerify=()=>{if(verify)return;verify=setTimeout(()=>{verify=null;if(settled)return;if(!anyOpen())outcome();},700);};
      const poll=setInterval(()=>{if(settled)return;raise();if(!anyOpen())scheduleVerify();},300);
      const watch=new MutationObserver(()=>{raise();if(document.getElementById('defeatOverlay')?.classList.contains('open'))defeatSeen=true;});
      watch.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
      signal.addEventListener('abort',abort,{once:true});
      document.addEventListener('keydown',escape,true);
      try{
        GameUI.completeDungeon=done;
        GameUI.showCommandPost(node);raise();
        if(!settled&&!anyOpen())return finish({status:'error',reason:'旧章节流程未能打开交互界面'});
      }catch(error){finish({status:'error',reason:String(error.message)});}
    });
  }
  /* 第9章「探路行军」：js/game-ui.js 原指挥所泥沼行军推演（LEVEL_CONFIG[9] 副标题「第一视角 · 泥沼行军」，
     nodeLevelMap[9]=grassland/marsh_crossing；battleMode=marsh：战术磁贴/指令 → 确认行动 → 战况动画
     → 跋涉草地 QTE（连点跋涉，停手回滑陷入泥沼判负）→ 战报 → 结算 → 档案卡）。原胜利链终点
     completeDungeon 由行走层临时改道为任务完成信号——不发旧主线勋章、不解锁旧路线、
     不触发整章通关（章节推进统一由场景出口处理）。战报/结算/AI 解析全部沿用原本地降级，
     断网可完成；判负进原失败面板可重试；取消/退出不算成功。 */
  const chapterOverlays9=['commandOverlay','battleAnimLayer','qteOverlay','telegramOverlay','settlementOverlay','archiveOverlay','defeatOverlay'];
  async function chapterDispatch9(row, signal) {
    const env=window.CZMarchEnv();
    if(typeof GameUI==='undefined'||typeof GameUI.showCommandPost!=='function'||typeof GameUI.completeDungeon!=='function')return {status:'error',reason:'模块未加载：js/game-ui.js 指挥所链'};
    const node=env.nodes.find(n=>n.id===row.chapterId);
    if(!node)return {status:'error',reason:'旧章节调度缺少节点数据'};
    if(env.route?.isNodeLocked(row.chapterId))return {status:'error',reason:'尚未抵达此章'};
    if(!env.story.unlocked(row.chapterId))return {status:'error',reason:'请先完成本章必要交谈'};
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action'))return {status:'error',reason:'请先按热座规则交接至当前行动岗位'};
    const previous=GameUI.completeDungeon,originalZ=new Map();
    let settled=false,defeatSeen=false;
    return new Promise(resolve=>{
      const finish=r=>{if(settled)return;settled=true;clearInterval(poll);clearTimeout(verify);watch.disconnect();
        if(GameUI.completeDungeon===done)GameUI.completeDungeon=previous;
        for(const [el,z] of originalZ){el.style.zIndex=z;if(!z)el.style.removeProperty('z-index');}
        signal.removeEventListener('abort',abort);document.removeEventListener('keydown',escape,true);resolve(r);};
      const anyOpen=()=>chapterOverlays9.some(id=>document.getElementById(id)?.classList.contains('open'));
      const raise=()=>{for(const id of chapterOverlays9){const el=document.getElementById(id);if(!el)continue;if(!originalZ.has(el))originalZ.set(el,el.style.zIndex||'');if(el.classList.contains('open')||el.classList.contains('battle-anim-stage'))el.style.zIndex='10001';}};
      const abort=()=>{if(settled)return;try{GameUI.abortLevel?.('返回场景');}catch{/* 引擎清理失败时仍收尾覆盖层 */}for(const id of chapterOverlays9)document.getElementById(id)?.classList.remove('open');finish({status:'cancelled'});};
      const escape=e=>{if(e.key!=='Escape')return;
        if(document.querySelector('#telegramOverlay.open,#settlementOverlay.open,#archiveOverlay.open,#defeatOverlay.open'))return;
        e.preventDefault();e.stopPropagation();abort();};
      const done=(...args)=>{const nodeArg=args[0];if(settled)return;
        if(signal.aborted||env.owner!==window.CZMarchEnv().owner)return finish({status:'cancelled'});
        if(nodeArg&&Number(nodeArg.id)!==Number(row.chapterId))return previous.apply(GameUI,args);
        finish({status:'completed'});};
      /* 原胜利链各段同步衔接（战报→结算→档案），无观察空窗；指挥所/QTE 关闭（返回/中止）观察到
         全部关闭后再等 700ms 复核一次，避免把过渡间隙误判为取消。 */
      const outcome=()=>finish(defeatSeen?{status:'failed',reason:'本关未通过，可重新尝试。'}:{status:'cancelled'});
      let verify=null;
      const scheduleVerify=()=>{if(verify)return;verify=setTimeout(()=>{verify=null;if(settled)return;if(!anyOpen())outcome();},700);};
      const poll=setInterval(()=>{if(settled)return;raise();if(!anyOpen())scheduleVerify();},300);
      const watch=new MutationObserver(()=>{raise();if(document.getElementById('defeatOverlay')?.classList.contains('open'))defeatSeen=true;});
      watch.observe(document.body,{attributes:true,attributeFilter:['class'],subtree:true});
      signal.addEventListener('abort',abort,{once:true});
      document.addEventListener('keydown',escape,true);
      try{
        GameUI.completeDungeon=done;
        GameUI.showCommandPost(node);raise();
        if(!settled&&!anyOpen())return finish({status:'error',reason:'旧章节流程未能打开交互界面'});
      }catch(error){finish({status:'error',reason:String(error.message)});}
    });
  }
  /* 第12章「全程协作推演」：真实旧引擎 LongMarchRun69.open()（js/run69.js 肉鸽推演）。
     旧引擎无外部回调：一局结束时 persist() 把 run69_result（won/score/rating/completedAt）写入现有存档。
     打开前记录旧 completedAt；面板关闭后出现更新的结果时按 won 判定：true=完成，false=失败可重试；
     中途关闭（无新结果）=取消。Run 是可选系统：局内胜利只记录本任务，不推进/不覆盖主线章节。 */
  async function run69(row, signal) {
    const env=window.CZMarchEnv(),engine=window.LongMarchRun69;
    if(!engine?.open)return {status:'error',reason:'模块未加载：LongMarchRun69'};
    if(env.route?.isNodeLocked(row.chapterId))return {status:'error',reason:'尚未抵达此章'};
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action'))return {status:'error',reason:'请先按热座规则交接至当前行动岗位'};
    const before=env.state.storyPreparations?.run69_result?.completedAt||null;
    return new Promise(resolve=>{
      let ended=false;const owner=env.owner;
      const finish=r=>{if(ended)return;ended=true;clearInterval(timer);observer.disconnect();signal.removeEventListener('abort',abort);resolve(r);};
      const abort=()=>{try{engine.close();}catch{/* 关闭失败也照常收尾 */}finish({status:'cancelled'});};
      const evaluate=()=>{if(ended)return;
        if(!engine.dialog||!engine.dialog.isConnected){
          const result=window.CZMarchEnv().state.storyPreparations?.run69_result;
          if(result&&result.completedAt&&result.completedAt!==before&&window.CZMarchEnv().owner===owner)return finish(result.won===true?{status:'completed',score:result.score}:{status:'failed',reason:'推演未走完全程，可重开一局再试。'});
          return finish({status:'cancelled'});}};
      const observer=new MutationObserver(()=>queueMicrotask(evaluate));
      observer.observe(document.body,{childList:true,subtree:true});
      const timer=setInterval(()=>{if(window.CZMarchEnv().owner!==owner)abort();},500);
      signal.addEventListener('abort',abort,{once:true});
      try{engine.open();evaluate();if(!ended&&(!engine.dialog||!engine.dialog.isConnected))return finish({status:'error',reason:'推演面板未能打开'});}
      catch(error){finish({status:'error',reason:String(error.message)});}
    });
  }
  async function system(row, signal) {
    // Alternate modes with combat/attrition use a scoped cooperative scenario, never Run's global gate bypass.
    if(row.replacement)return window.CZMarchCooperation.start(row,signal);
    if(row.slug==='zhiluo')return zhiluo70(row,signal);
    if(row.slug==='run')return run69(row,signal);
    /* 第9章草地行程协作/夜行军纵队番外：恢复真实旧引擎，复用 legacy 通道
       （两引擎均为 open(node,done) 成功才无参回调，已加入 noArgSuccess）。 */
    if(row.slug==='grassland30'||row.slug==='night')return legacy(row,signal);
    if(row.slug==='daily'){
      const pick=window.Daily68?.pick(),item=pick?.item,{d,body,foot}=window.CZMarchUI.dialog(row.title,signal);let result={status:'cancelled'};
      body.append(window.CZMarchUI.el('p',item?'今日建议：'+item.name+'。到场景内找到相应地点完成练习后，才会记录今日同行。':'当前没有可推荐的练习，可先继续主线。'));
      if(item)foot.append(window.CZMarchUI.button('前往今日同行的场景',()=>{const target=window.CZMarchRegistry.create().rows.find(r=>r.chapterId===item.node&&r.host===item.engine);if(!target)return;if(window.CZMarchSave.transact(s=>s.dailyTarget={storyId:target.storyId,day:window.Daily68.dayKey()})){result={status:'cancelled',targetGameId:target.storyId};d.close();}}));
      return new Promise(resolve=>d.addEventListener('close',()=>resolve(result),{once:true}));
    }
    const env=window.CZMarchEnv(),before=new Set(document.querySelectorAll('dialog'));
    const fn=row.slug==='prologue'?()=>env.snow.open({replay:!!env.snow.state().completed}) :
      row.slug==='newsroom'?()=>Newsroom65.hub() : row.slug==='morse'?()=>MorseTraining.open() :
      row.slug==='spark'?()=>window.Spark69.openPanel() : row.slug==='correspondent'?()=>window.Correspondent69.openPanel():row.slug==='snow-letter'?()=>window.CZVoiceRuntime84.openSnowLetter():row.slug==='report'?()=>{const d=Education43.dialog('我的长征年报');WitnessReport65.mount(d);return d;}:null;
    if(!fn)return {status:'error',reason:'尚无已核实的系统启动签名：'+row.slug};
    return new Promise(resolve=>{
      let ended=false;const owned=new Set();const observer=new MutationObserver(scan);
      const done=()=>{if(ended)return;ended=true;observer.disconnect();signal.removeEventListener('abort',abort);resolve({status:'cancelled'});};
      const abort=()=>{for(const d of owned)if(d.isConnected&&d.open)d.close();done();};
      function scan(){for(const d of document.querySelectorAll('dialog'))if(!before.has(d))owned.add(d);if(owned.size&&![...owned].some(d=>d.isConnected&&d.open))done();}
      observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});signal.addEventListener('abort',abort,{once:true});
      try{fn();scan();if(!owned.size)done();}catch(error){done();window.CZMarchUI.note(error.message);}
    });
  }
  async function start(row, signal, context={}) {
    if(signal.aborted)return {status:'cancelled'};
    if(row.chapterId===10&&row.kind==='legacy-task'&&!row.mechanic)return chapterDispatch10(row,signal);
    if(row.storyId==='chapter-9/legacy-drag-1')return chapterDispatch9(row,signal);
    if(row.storyId==='chapter-9/legacy-choice-1')return legacyChoice11(row,signal);
    if(row.storyId==='chapter-11/legacy-choice-1')return legacyChoice11(row,signal);
    if(row.storyId==='chapter-12/legacy-drag-1')return commandPost12(row,signal);
    if(row.storyId==='chapter-12/legacy-choice-1')return legacyChoice11(row,signal);
    if(row.kind==='decision')return window.CZMarchDecision.start(row,signal);
    if(row.kind==='dialogue')return window.CZMarchUI.dialogue(row,signal,context.checkpoint);
    if(['hero','history'].includes(row.kind))return window.CZMarchUI.read(row,signal);
    if(row.kind==='system')return system(row,signal);
    if(row.kind==='ration')return window.CZMarchRation.start(row,signal,context);
    if(row.kind==='iframe')return window.CZMarchFrame.start(row,signal);
    if(row.kind==='scene3d')return window.CZMarchScene3D.start(row,signal);
    if(row.mechanic)return window.CZMarchCooperation.start(row,signal,context);
    return legacy(row,signal);
  }
  window.CZMarchAdapters={start,legacy,system,zhiluo70,legacyChoice11,chapterDispatch10,chapterDispatch9,commandPost12,run69,noArgSuccess};
})();
