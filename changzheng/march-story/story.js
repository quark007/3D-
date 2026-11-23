/* B-side orchestration only. A owns all terrain, camera, walking and collision. */
(() => {
  'use strict';
  const methods=['mount','snapshot','pause','resume','applyState','destroy'];
  const directoryGroup={game:'互动游戏',iframe:'互动游戏','legacy-task':'互动游戏',system:'研学系统',hero:'研学系统',ration:'研学系统',scene3d:'3D与史实',history:'3D与史实'};
  const directoryLabel={game:'互动游戏',iframe:'档案练习','legacy-task':'旧版练习',system:'研学系统',hero:'人物故事',ration:'口粮计划',scene3d:'3D场景',history:'史实来源'};
  let epoch=0, world=null, registry=null, manifest=null, root=null, scene=null, active=null, owner=null, preparations=null,role=null,timer=null,listener=null,controller=null;
  let mounts=Promise.resolve(),mounting=0,overlays=null;
  const save=()=>window.CZMarchSave, env=()=>window.CZMarchEnv();
  const rows=()=>registry?.rows || [];
  const diagnostic=text=>{const n=root?.querySelector('[data-march-status]');if(n)n.textContent=text;else window.CZMarchUI.note(text);};
  const sameJourney=()=>owner===env().owner&&!!env().state?.character&&env().state.storyPreparations===preparations&&env().story?.role()===role;
  const current=token=>token===epoch && sameJourney() && !!world;
  function bindings(row){return {...row,...manifest?.bindings?.[row.storyId]};}
  function list(chapterId,sceneId){return rows().filter(r=>r.chapterId===chapterId).map(bindings).filter(r=>r.sceneId===sceneId);}
  function sceneRecord(chapterId,sceneId){return manifest.scenes.find(s=>s.chapterId===chapterId&&s.sceneId===sceneId);}
  let guided=null, guideTarget=null;
  function progress(chapterId=scene?.chapterId){
    if(!registry||!chapterId)return {steps:[],index:0,completed:0,next:null};
    const state=save().read();
    const steps=window.CZMarchRegistry.itinerary(registry,chapterId,role).map(step=>{const script=step.kind==='dialogue'?env().story.get(chapterId,step.rows[0].part):null,turnsReady=!script||env().flow.count(script,role)>=env().story.required(script);return {...step,rows:step.rows.map(bindings),completed:turnsReady&&step.rows.some(r=>state.tasks[r.storyId]?.completed)};});
    const index=steps.findIndex(s=>!s.completed);
    return {steps,index:index<0?steps.length:index,completed:steps.filter(s=>s.completed).length,next:index<0?null:steps[index]};
  }
  function prepared(chapterId){
    const s=save().read();
    return s.completedChapters.includes(chapterId) || (env().story.unlocked(chapterId) && rows().some(r=>r.chapterId===chapterId&&r.kind==='dialogue'&&r.part===1&&(!r.roles||r.roles.includes(role))&&s.tasks[r.storyId]?.completed));
  }
  function blocked(row){
    const s=save().read();
    if(env().route?.isNodeLocked(row.chapterId))return '先完成上一站主线';
    if(row.roles&&!row.roles.includes(env().story.role()))return '这是其他岗位的交谈视角';
    if((row.kind==='exit'||(row.prerequisites||[]).includes('opening-dialogue'))&&!prepared(row.chapterId))return '先完成必要交谈，并点击「记录交谈」';
    const plan=progress(row.chapterId),index=plan.steps.findIndex(step=>step.rows.some(r=>r.storyId===row.storyId));
    if(row.kind==='exit'&&plan.next)return '待完成：'+plan.next.title+'。请跟随当前任务指引。';
    if(index>plan.index&&!plan.steps[index].completed)return '先完成：'+plan.next.title+'，再进行这一项。';
    if((row.prerequisites||[]).includes('main-task')&&!s.completedChapters.includes(row.chapterId)&&!s.tasks[`chapter-${row.chapterId}/main-task`]?.completed)return '先完成本章岗位协作任务';
    if(row.kind==='hero'){const h=env().heroes.rows.find(h=>h.id===row.heroId);if(!h||!env().heroes.available(h))return '先完成序章，解锁对应故事';}
    return '';
  }
  function positionHint(hint){
    const host=hint.parentElement,r=host.getBoundingClientRect(),box=hint.getBoundingClientRect();
    if(!r.width||!box.width)return;
    const blockers=[...host.querySelectorAll('.czmw-player-pin86,.czmw-guide87,details,button')].filter(n=>!hint.contains(n)&&!n.hidden&&n.getClientRects().length).map(n=>{const a=n.getBoundingClientRect(),pad=n.classList.contains('czmw-player-pin86')?45:10;return {left:a.left-r.left-pad,top:a.top-r.top-pad,right:a.right-r.left+pad,bottom:a.bottom-r.top+pad};});
    const candidates=[[16,14],[r.width-box.width-16,14],[16,r.height-box.height-18],[r.width-box.width-16,r.height-box.height-18]].map(([x,y])=>({x:Math.max(8,x),y:Math.max(8,y)}));
    const score=p=>blockers.reduce((sum,b)=>sum+Math.max(0,Math.min(p.x+box.width,b.right)-Math.max(p.x,b.left))*Math.max(0,Math.min(p.y+box.height,b.bottom)-Math.max(p.y,b.top)),0);
    candidates.sort((a,b)=>score(a)-score(b));const best=candidates[0];hint.style.left=best.x+'px';hint.style.top=best.y+'px';
  }
  function guide(){
    if(!scene||!root||!world)return;
    const local=list(scene.chapterId,scene.sceneId),plan=progress();
    const candidates=plan.next?.rows||[];
    const primary=candidates.find(r=>r.sceneId===scene.sceneId&&r.npcId!=='narrator'&&allowed(r))||candidates.find(r=>r.sceneId===scene.sceneId&&allowed(r))||(!plan.next?local.find(r=>r.kind==='exit'&&allowed(r)):null);
    const picked=guided&&local.find(r=>r.storyId===guided&&allowed(r));
    const target=picked||primary;guided=picked?.storyId||null;guideTarget=target||null;
    const a=target&&scene.anchors.find(a=>a.anchorId===target.anchorId),node=root.querySelector('[data-march-guide]');
    const hint=root.querySelector('.march93-task-hint');if(hint){
      const set=(key,text)=>{const n=hint.querySelector('[data-hint93='+key+']');if(n&&n.textContent!==text)n.textContent=text;};
      set('count','本章任务 '+plan.completed+' / '+plan.steps.length);
      set('goal',plan.next?'当前任务 · '+plan.next.title:'本章任务已完成 · 前往出口');
      const row=plan.next?.rows.find(r=>r.npcId!=='narrator')||plan.next?.rows[0];
      set('how',!row?'到出口确认本章见证后，才能进入下一程。':row.kind==='dialogue'?'走到标记人物附近，完成必要交谈后点击「记录交谈」。':'走到标记地点，完成里面的游戏或协作任务，再返回场景。');
      set('rule',plan.next?'当前任务未完成时，下一任务点与章节出口保持锁定。':'可选支线仍可继续探索与回看。');positionHint(hint);
    }
    root.querySelectorAll('[data-march-step]').forEach((n,i)=>{const group=plan.steps.filter(s=>s.phase===i);n.dataset.state=group.every(s=>s.completed)?'done':i===plan.next?.phase?'current':'locked';n.setAttribute('aria-current',n.dataset.state==='current'?'step':'false');});
    const count=root.querySelector('[data-march-count]');if(count)count.textContent=`本章任务 ${plan.completed} / ${plan.steps.length}`;
    const meter=root.querySelector('[data-march-meter]');if(meter){meter.max=plan.steps.length||1;meter.value=plan.completed;meter.setAttribute('aria-label','本章必做任务完成进度');}
    if(!a||!node){world.setGuide?.(null);return;}
    const p=world.snapshot(),distance=Math.hypot(a.x-p.x,a.y-p.y),near=distance<3.4;
    const objectiveText=(picked?'正在跟踪 · ':plan.next?`第 ${plan.index+1} 项 · `:'本章已完成 · ')+target.title;if(node.textContent!==objectiveText)node.textContent=objectiveText;
    const detail=root.querySelector('[data-march-distance]');if(detail)detail.textContent=near?(navigator.maxTouchPoints>0?'已到附近 · 点「交互」':'已到附近 · 按 E 或点「交互」'):`沿浅金路线前往 · 约 ${Math.ceil(distance)} 个场景单位`;
    const go=root.querySelector('[data-march-go]');if(go){go.textContent=near?'与目标交互':'沿路线前往';go.disabled=!!active||mounting>0;}
    world.setGuide?.({anchorId:a.anchorId,label:target.title});
  }
  function followGuide(){
    if(active||mounting)return diagnostic('请先结束当前交互，再继续前行。');
    if(!guideTarget)return diagnostic('暂未找到可前往的目标，请查看场景线索。');
    const a=scene.anchors.find(a=>a.anchorId===guideTarget.anchorId),p=world.snapshot();
    if(a&&Math.hypot(a.x-p.x,a.y-p.y)<3.4)return run(guideTarget);
    if(world.walkToGuide?.()!==true)diagnostic('此处暂未找到通路，请用摇杆沿道路靠近目标后重试。');
    else diagnostic('正在沿路线前往；使用摇杆、方向键或点击地面可随时改道。到达后确认交互。');
  }
  function safeSpawn(target,p){
    const g=manifest.ground?.[target.sceneId];if(!g || !p)return p || target.spawn || null;
    const cells=atob(g.cells);for(let i=0;i<8;i++){const angle=i/8*Math.PI*2,x=Math.floor(p.x+Math.cos(angle)*g.radius),y=Math.floor(p.y+Math.sin(angle)*g.radius);if(x<0||y<0||x>=g.w||y>=g.h||cells.charCodeAt(y*g.w+x)!==1)return target.spawn;}
    return p;
  }
  function allowed(row){return !blocked(row);}
  function view(){
    const state=save().read(),local=list(scene.chapterId,scene.sceneId);
    const plan=progress(),completedAnchors=[...new Set(local.map(r=>r.anchorId))].filter(id=>{const linked=plan.steps.filter(step=>step.rows.some(r=>r.anchorId===id&&r.sceneId===scene.sceneId));return linked.length?linked.every(s=>s.completed):local.some(r=>r.anchorId===id&&state.tasks[r.storyId]?.completed);});
    return {enabledAnchorIds:[...new Set(local.filter(allowed).map(r=>r.anchorId))],
      completedAnchorIds:completedAnchors,
      openPassageIds:(scene.passages||[]).filter(p=>!p.requiresMain || prepared(scene.chapterId)&&state.tasks[`chapter-${scene.chapterId}/main-task`]?.completed).map(p=>p.id)};
  }
  function checkpoint(){
    if(!scene || !world || !sameJourney())return false;
    let p;try{p=save().position(world.snapshot());}catch{return false;}
    if(!p || p.chapterId!==scene.chapterId || p.sceneId!==scene.sceneId)return false;
    const previous=save().read().location;
    if(env().state.saveFailed!==true && previous && JSON.stringify(previous)===JSON.stringify(p))return true;
    return save().transact(s=>{s.location=p;s.locations[p.sceneId]=p;s.chapterId=p.chapterId;},owner);
  }
  async function mount(chapterId,sceneId,spawn=null){
    const token=epoch, target=sceneRecord(chapterId,sceneId);if(!target)throw Error('A方场景清单缺少 '+sceneId);
    const anchors=target.anchors || [],local=list(chapterId,sceneId);
    for(const a of anchors)if(!a.anchorId || !['npc','task','exit'].includes(a.kind) || !Number.isFinite(a.x) || !Number.isFinite(a.y))throw Error('A方锚点缺少稳定ID或有效地面坐标');
    // AI 行动研判是界面层可选入口，没有地面交互锚点；把它算进校验会让每一章
    // 都因 chapter-N/ai-decision 被硬拦在场景外。其余对话/任务/出口仍严格校验。
    for(const r of local)if(r.kind!=='decision'&&!anchors.some(a=>a.anchorId===r.anchorId))throw Error('A方锚点未映射：'+r.storyId+' → '+r.anchorId);
    // Serialize async mounts so a late completion cannot replace a newer scene.
    mounting++;
    const task=mounts.catch(()=>{}).then(async()=>{
      if(!current(token))return;
      await world.mount(root.querySelector('.march83-world'),{chapterId,sceneId,spawn:safeSpawn(target,spawn || save().read().locations[sceneId] || target.spawn),anchors,roleId:env().state.character.id});
      if(!current(token))return;
      scene=target;guided=null;world.applyState(view());if(!checkpoint())diagnostic('场景已载入，但位置未能保存。请检查存储空间。');
      root.querySelector('[data-march-title]').textContent=registry.chapters.find(c=>c.chapterId===chapterId)?.title || '';
      guide();
      const next=local.find(r=>r.kind==='dialogue'&&r.part===1&&allowed(r));
      diagnostic(env().story.unlocked(chapterId)?'到岗位协作地点继续本章任务；沿途还可寻找可选故事。':'先找到'+(next?.title.split(' · ').at(-1)||'战友')+'，完成本章必要交谈。点击地面行走，靠近后按 E 或点交互。');
    });mounts=task;try{await task;}finally{mounting=Math.max(0,mounting-1);if(current(token))guide();}
  }
  async function finishChapter(chapterId){
    const e=env(),g=e.state,already=save().read().completedChapters.includes(chapterId);
    if(!already&&progress(chapterId).next)return diagnostic('待完成：'+progress(chapterId).next.title+'。请先跟随任务指引。');
    if(!already&&!prepared(chapterId))return diagnostic('请先与本章NPC完成必要交谈，并点击「记录交谈」。');
    if(!already&&!save().read().tasks[`chapter-${chapterId}/main-task`]?.completed)return diagnostic('请先到岗位协作地点完成本章任务。');
    if(!save().read().completedChapters.includes(chapterId)){
      const medals=JSON.parse(JSON.stringify(g.medalRecords||[])),completed=g.gameCompleted;
      const ok=save().transact(s=>{
        s.completedChapters.push(chapterId);
        if(!g.medalRecords.some(m=>m.nodeId===chapterId))g.medalRecords.push({nodeId:chapterId,score:0,rating:'协作见证 · 非战斗评分',svg:''});
        if(chapterId===12)g.gameCompleted=true;
      },owner);
      if(!ok){g.medalRecords=medals;g.gameCompleted=completed;return diagnostic('完成记录未保存，请重试；尚未推进章节。');}
      e.route?.completeNode(chapterId);
    }
    // Existing medals remain the authoritative chapter progression, including non-contiguous old saves.
    if(e.route){const ids=new Set((g.medalRecords||[]).map(m=>m.nodeId)),next=(e.nodes.find(n=>!ids.has(n.id))||e.nodes.at(-1)).id;e.route.completedNodeIds=ids;if(e.route.currentNodeId!==next){e.route.currentNodeId=next;e.route.updateProgress?.();e.route.updateNavButtons?.();}}
    if(chapterId===12){if(typeof Victory49!=='undefined'){Victory49.open();return;}return recap();}
    const next=manifest.scenes.find(s=>s.chapterId===chapterId+1);if(!next)return diagnostic('下一章场景尚未由A方交付，当前进度已保存。');
    await mount(chapterId+1,next.sceneId);
  }
  async function recap(){
    const token=epoch;active={controller:new AbortController()};world.pause('dialogue');const {d,body,foot}=window.CZMarchUI.dialog('一路同行 · 旅途回顾',controller.signal);
    const {el,button}=window.CZMarchUI,s=save().read();body.append(el('p','你在研学场景中完成的协作，不改变历史上的重大结果。以下仅记录本人的选择与见证。'));
    for(const c of registry.chapters){const done=s.completedChapters.includes(c.chapterId) || env().route?.completedNodeIds.has(c.chapterId);body.append(el('p',(done?'已走过 · ':'待继续 · ')+c.title));}
    const message=env().snow?.state().message;if(message)body.append(el('h3','出发前的初心'),el('blockquote',message));
    const count=Object.values(s.tasks).filter(t=>t.completed).length;body.append(el('p',`已记录 ${count} 项交谈、协作与可选见证。支线可以继续回访。`));foot.append(button('回到会师场景',()=>d.close()));
    await new Promise(resolve=>d.addEventListener('close',resolve,{once:true}));if(current(token)){active=null;world.resume('dialogue');}
  }
  async function run(row){
    if(mounting)return diagnostic('场景正在切换，请稍候。');
    if(!scene || row.chapterId!==scene.chapterId || bindings(row).sceneId!==scene.sceneId)return diagnostic('请先走到此任务所属的场景。');
    if(active)return diagnostic('当前交谈或练习尚未结束，请先返回场景。');
    if(!allowed(row))return diagnostic(blocked(row));
    if(row.kind==='exit')return finishChapter(row.chapterId);
    const token=epoch,reason=row.kind==='dialogue'||row.kind==='hero'||row.kind==='history'?'dialogue':'minigame';
    if(!checkpoint())return diagnostic('位置无法保存，本次未启动；请检查浏览器存储。');
    const location=save().read().location,attemptId=crypto.randomUUID?.() || `session-${Date.now()}-${token}`;
    if(!save().transact(s=>{s.pending={id:attemptId,taskId:row.storyId};},owner))return diagnostic('任务检查点未保存，请重试。');
    const taskController=new AbortController(),abort=()=>taskController.abort();controller.signal.addEventListener('abort',abort,{once:true});
    active={id:attemptId,abort,controller:taskController};world.pause(reason);
    let result;
    try{
      const progress=save().read().tasks[row.storyId]?.progress || {};
      result=await window.CZMarchAdapters.start(row,taskController.signal,{progress,checkpoint:snapshot=>{
        if(!current(token))return false;
        return save().transact(s=>{const t=s.tasks[row.storyId] ||= {completed:false,attempts:[],progress:{}};const decision=t.progress?.decision;if(snapshot)t.progress=snapshot;if(decision&&!t.progress.decision)t.progress.decision=decision;},owner);
      }});
      if(!current(token)||taskController.signal.aborted){if(active&&active.id===attemptId){active=null;try{world.resume(reason);}catch{/* 场景已切换时无需恢复 */}}return;}
      const status=['completed','failed','cancelled','error'].includes(result?.status)?result.status:'error';
      if(!save().finish(row.storyId,attemptId,status,owner,row.completesMain?[`chapter-${row.chapterId}/main-task`]:[]))return diagnostic('任务结果未能保存，请重新进入记录；当前章节未推进。');
      const daily=save().read().dailyTarget;
      if(status==='completed' && daily?.storyId===row.storyId && daily.day===window.Daily68?.dayKey())window.Daily68.markDone(row.chapterId,result.score,'今日协作已完成');
      if(status==='completed' && row.kind==='hero'){
        const h=env().heroes.rows.find(h=>h.id===row.heroId),state=env().snow.state();
        const prior=state.heroes[h.id];if(!prior?.completed){state.heroes[h.id]={completed:true,completedAt:new Date().toISOString(),item:h.item};
          if(env().state.save()===false){if(prior===undefined)delete state.heroes[h.id];else state.heroes[h.id]=prior;diagnostic('阅读已保存，图鉴同步失败，下次可重新收录。');}
          else {env().state.unlockHistoryCard(h.id);document.dispatchEvent(new CustomEvent('cz:hero-completed',{detail:{id:h.id}}));}}
      }
      const after=save().position(world.snapshot());
      if(!after || after.sceneId!==location.sceneId || after.x!==location.x || after.y!==location.y)await mount(location.chapterId,location.sceneId,location);
      if(current(token)){if(status==='completed'&&guided===row.storyId)guided=null;world.applyState(view());guide();diagnostic(status==='completed'?'已记录见证，回到原位置继续前行。':status==='cancelled'?'已返回原位置，本次未通关。':`本次未完成，可重新尝试。${result?.reason || ''}`);}
    }catch(error){if(current(token)){save().finish(row.storyId,attemptId,'error',owner);diagnostic('本次未完成：'+error.message+'。可重新交互。');}}
    finally{controller?.signal.removeEventListener('abort',abort);if(active&&active.id===attemptId)active=null;if(current(token)){world.resume(reason);guide();if(result?.targetGameId){const target=rows().find(r=>r.gameId===result.targetGameId);if(target)queueMicrotask(()=>{if(current(token))window.CZMarchEntry.navigate(target);});}}}
  }
  async function choose(local,title='此处可以做什么'){
    if(local.length===1)return run(local[0]);
    if(active)return;
    const token=epoch,{el,button,dialog}=window.CZMarchUI,{d,body}=dialog(title,controller.signal);world.pause('dialogue');
    active={controller:new AbortController()};let selected=null;const group=el('div',undefined,'march83-tasklist'),s=save().read();
    for(const r of local){const b=button((s.tasks[r.storyId]?.completed?'已见证 · ':'')+r.title,()=>{selected=r;d.close();});b.disabled=!allowed(r);if(b.disabled){b.title=blocked(r);group.append(b,el('small',blocked(r),'march83-note'));}else group.append(b);}body.append(group);
    await new Promise(resolve=>d.addEventListener('close',resolve,{once:true}));if(!current(token))return;active=null;world.resume('dialogue');if(selected)return run(selected);
  }
  async function interact(event){
    if(mounting)return;
    const d=event.detail;if(!scene || !d || d.chapterId!==scene.chapterId || d.sceneId!==scene.sceneId)return diagnostic('忽略非当前场景交互：'+String(d?.anchorId || '缺少锚点'));
    const point=scene.anchors.find(a=>a.anchorId===d.anchorId),position=world.snapshot(),range=world._?.anchors?.NEAR||4.5;
    if(point&&Math.hypot(point.x-position.x,point.y-position.y)>range+.25)return diagnostic('请先走到任务点附近，再确认交互。');
    const local=list(d.chapterId,d.sceneId).filter(r=>r.anchorId===d.anchorId),passage=(scene.passages||[]).find(p=>p.anchorId===d.anchorId);
    if(passage){if(active)return;if(passage.requiresMain && (!prepared(d.chapterId)||!save().read().tasks[`chapter-${d.chapterId}/main-task`]?.completed))return diagnostic('先完成本章协作，再继续前行。');checkpoint();return mount(d.chapterId,passage.toSceneId,passage.spawn);}
    if(!local.length)return diagnostic('未知剧情锚点：'+d.anchorId+'。请核对A/B映射清单。');
    return choose(local);
  }
  async function boot({container,world:adapter,sceneManifest,chapterId,fresh=false}={}){
    destroy();const token=epoch;
    if(!container || !methods.every(m=>typeof adapter?.[m]==='function'))throw Error('缺少A方真实CZMarchWorld接口或场景容器');
    const e=env();if(!e.state?.character)throw Error('请先在原游戏选择岗位');
    if(!await e.story.load())throw Error('本地剧情剧本未就绪');
    if(token!==epoch)return false;
    registry=window.CZMarchRegistry.create();manifest=sceneManifest || adapter.manifest || window.CZMarchWorldManifest;
    if(!Array.isArray(manifest?.scenes) || !manifest.scenes.length)throw Error('A方须提供场景锚点清单CZMarchWorldManifest，不能用接口桩代替最终场景');
    for(const c of registry.chapters)if(!manifest.scenes.some(s=>s.chapterId===c.chapterId))throw Error('A方尚缺第'+c.chapterId+'章场景');
    owner=e.owner;preparations=e.state.storyPreparations ||= {};role=e.story.role();world=adapter;controller=new AbortController();root=container;
    const s=save().read(),interrupted=!!s.pending,restart=fresh===true;if(!save().recover())throw Error('无法保存上次中断的任务');
    const targetId=chapterId || (s.location?s.chapterId:e.route?.currentNodeId || 1);
    if(e.route?.isNodeLocked(targetId))throw Error('此站尚未抵达');
    const target=!restart&&s.location?.chapterId===targetId?sceneRecord(targetId,s.location.sceneId):manifest.scenes.find(scene=>scene.chapterId===targetId);
    if(!target)throw Error('当前场景未映射');
    root.hidden=false;root.classList.add('march83-shell');root.replaceChildren();const {el,button}=window.CZMarchUI,head=el('header',undefined,'march83-hud'),label=el('strong');label.dataset.marchTitle='';
    // The overview only marks a walking target; it never launches a task remotely.
    head.append(label,el('small','斜俯视研学 · 对白为创作，史实单独标注'),button('玩法目录',()=>directory()),button('任务与线索',()=>overview()),button('返回路线图',()=>destroy()));const stage=el('div',undefined,'march83-world'),foot=el('footer',undefined,'march83-bottom'),status=el('p','场景载入中……'),goal=el('strong');goal.dataset.marchGuide='';status.dataset.marchStatus='';status.setAttribute('role','status');const steps=el('nav',undefined,'march87-steps');steps.setAttribute('aria-label','本章必需步骤');for(const text of ['01 交谈准备','02 本章任务','03 反馈回顾']){const n=el('span',text);n.dataset.marchStep='';steps.append(n);}const detail=el('small');detail.dataset.marchDistance='';const go=button('沿路线前往',followGuide);go.dataset.marchGo='';const objective=el('div',undefined,'march87-objective');objective.append(goal,detail);const count=el('small',undefined,'march89-count');count.dataset.marchCount='';const meter=el('progress');meter.dataset.marchMeter='';meter.className='march89-meter';steps.append(count);foot.append(steps,meter,objective,go,status);const expand=button('任务详情',()=>{const expanded=foot.classList.toggle('march90-expanded');expand.setAttribute('aria-expanded',String(expanded));expand.textContent=expanded?'收起详情':'任务详情';});expand.className='march90-details';expand.setAttribute('aria-expanded','false');foot.append(expand);root.append(head,stage,foot);
    const hint=el('aside',undefined,'march93-task-hint');hint.setAttribute('aria-label','当前任务提示');
    const hintHead=el('header'),hintCount=el('strong','任务提示');hintCount.dataset.hint93='count';
    const hintBody=el('div'),hintGoal=el('h3'),hintHow=el('p'),hintRule=el('p');hintGoal.dataset.hint93='goal';hintHow.dataset.hint93='how';hintRule.dataset.hint93='rule';hintBody.append(hintGoal,hintHow,hintRule);
    let compact=!!window.matchMedia?.('(max-width:700px)').matches;hintBody.hidden=compact;
    const hintToggle=button(compact?'展开':'收起',()=>{compact=!compact;hintBody.hidden=compact;hintToggle.textContent=compact?'展开':'收起';hintToggle.setAttribute('aria-expanded',String(!compact));positionHint(hint);});hintToggle.setAttribute('aria-expanded',String(!compact));hintToggle.setAttribute('aria-label','展开或收起当前任务提示');hintHead.append(hintCount,hintToggle);hint.append(hintHead,hintBody);stage.append(hint);
    listener=ev=>{interact(ev).catch(error=>diagnostic(error.message));};window.addEventListener('czmarch:interact',listener);
    await mount(targetId,target.sceneId,restart?target.spawn:s.location?.sceneId===target.sceneId?s.location:null);
    if(!current(token))return false;
    if(restart)diagnostic('已从本章开头进入；此前的交谈、任务与决策记录均已保留。');
    else if(interrupted)diagnostic('上次交谈或练习被刷新中断，已返回原场景与位置。已保存的准备进度仍保留，可重新交互继续或重试。');
    timer=setInterval(()=>{if(!sameJourney()){destroy();return;}if(!active){checkpoint();guide();}},1500);
    const syncOverlay=()=>{if(!world)return;const opened=document.querySelector('dialog[open],#npcOverlay.open,.learning-overlay.open,.decision-film-overlay,.decision-cinema-overlay,.experience-overlay');if(opened)world.pause('overlay');else world.resume('overlay');};
    let overlayQueued=false;overlays=new MutationObserver(records=>{if(!records.some(r=>r.type==='attributes'?r.target.matches?.('dialog,#npcOverlay,.learning-overlay,.experience-overlay'):Array.from(r.addedNodes).concat(Array.from(r.removedNodes)).some(n=>n.nodeType===1&&(n.matches?.('dialog,#npcOverlay,.learning-overlay,.decision-film-overlay,.decision-cinema-overlay,.experience-overlay')||n.querySelector?.('dialog')))))return;if(overlayQueued)return;overlayQueued=true;queueMicrotask(()=>{overlayQueued=false;syncOverlay();});});overlays.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open','class']});syncOverlay();
    window.addEventListener('pagehide',checkpoint);document.addEventListener('visibilitychange',visibility);visibility();return true;
  }
  function visibility(){if(!world)return;if(document.hidden){checkpoint();world.pause('hidden');}else world.resume('hidden');}
  async function overview(){
    if(active || !scene||mounting)return;const token=epoch,{el,button,dialog}=window.CZMarchUI,{d,body}=dialog('本章任务与剧情线索',controller.signal);world.pause('dialogue');active={controller:new AbortController()};
    const all=rows().filter(r=>r.chapterId===scene.chapterId&&(!r.roles||r.roles.includes(role))).map(bindings),state=save().read();
    const plan=progress(),required=new Set(plan.steps.flatMap(s=>s.rows.map(r=>r.storyId)));
    body.append(el('p','依次完成每段交谈、操作任务、反馈与回顾。路线始终指向当前未完成项，全部主线任务完成后再前往下一站。','march83-clues'));
    const card=(r,title,done,number)=>{
      const c=el('article',undefined,'march87-clue-card march89-task'),reason=blocked(r);c.dataset.taskState=done?'done':reason?'locked':number||guided===r.storyId?'current':'available';
      c.append(el('small',(number?String(number).padStart(2,'0')+' · ':'')+(done?'已完成':reason?'待解锁':number?'进行中':'可选 · 可跟踪')),el('strong',title),el('p',done?'本项已记录，可回访。':reason||'沿路线到达地点，确认交互后完成这一项。'));
      const b=button(done?'回访这项内容':'跟踪这项任务',()=>{guided=r.storyId;d.close();});b.disabled=!!reason||r.sceneId!==scene.sceneId;b.title=reason||'在场景中显示通路，不远程启动任务';c.append(b);return c;
    };
    body.append(el('h3',`本章主线 · ${plan.completed}/${plan.steps.length}`));const main=el('div',undefined,'march87-clue-grid march89-timeline');
    plan.steps.forEach((step,i)=>{const r=step.rows.find(r=>r.npcId!=='narrator')||step.rows[0],item=card(r,step.title,step.completed,i+1);
      if(step.kind==='task'&&step.rows.length>1){const choices=el('details'),summary=el('summary','查看其他执行方式');choices.append(summary);for(const alternate of step.rows.slice(1)){const b=button(alternate.title,()=>{guided=alternate.storyId;d.close();});b.disabled=!!blocked(alternate);choices.append(b);}item.append(choices);}main.append(item);});
    const exit=all.find(r=>r.kind==='exit');if(exit)main.append(card(exit,exit.title,!plan.next&&state.completedChapters.includes(scene.chapterId),plan.steps.length+1));body.append(main);
    body.append(el('h3','可选故事与练习'));const optional=el('div',undefined,'march87-clue-grid');
    for(const r of all.filter(r=>!required.has(r.storyId)&&r.kind!=='exit'))optional.append(card(r,r.title,!!state.tasks[r.storyId]?.completed));body.append(optional);
    body.append(button('恢复当前主线任务指引',()=>{guided=null;d.close();}));
    for(const s of manifest.scenes.filter(s=>s.chapterId===scene.chapterId&&s.sceneId!==scene.sceneId))body.append(el('p','前往其他场景：'+s.sceneId+'，沿场景出口继续。'));
    body.append(button('返回场景寻找交互点',()=>d.close()));await new Promise(resolve=>d.addEventListener('close',resolve,{once:true}));if(current(token)){active=null;world.resume('dialogue');guide();}
  }
  async function directory(){
    if(active || !scene || mounting)return;
    const token=epoch,{el,button,dialog}=window.CZMarchUI,{d,body,foot}=dialog('玩法目录',controller.signal);
    world.pause('dialogue');active={controller:new AbortController()};
    const state=save().read();
    const all=rows().filter(r=>directoryGroup[r.kind]&&(!r.roles||r.roles.includes(role))).map(bindings);
    const allDone=all.filter(r=>state.tasks[r.storyId]?.completed).length;
    body.append(el('p',`这里汇总行走场景中的可选玩法。全部 ${all.length} 项，已完成 ${allDone} 项；选择当前场景的项目会在路线中显示浅金通路，不会远程跳过行走或交谈。`,'march83-clues'));
    const toolbar=el('div',undefined,'march94-dir-toolbar'),pick=el('label','查看章节'),select=el('select');pick.append(select);toolbar.append(pick);body.append(toolbar);
    const list=el('div');body.append(list);
    const card=(r,chapterId)=>{
      const done=!!state.tasks[r.storyId]?.completed,currentChapter=chapterId===scene.chapterId,here=currentChapter&&r.sceneId===scene.sceneId,reason=currentChapter?blocked(r):'',tracking=here&&!reason&&guided===r.storyId;
      const status=done?'已完成':tracking?'正在跟踪':!currentChapter?`第 ${chapterId} 章`:reason?'待解锁':here?'可体验':'本章其他场景';
      const c=el('article',undefined,'march87-clue-card march89-task');c.dataset.taskState=done?'done':reason||!here?'locked':tracking?'current':'available';
      c.append(el('small',`${directoryLabel[r.kind]} · ${status}`),el('strong',r.title),el('p',done?'已记录，可回到任务点回访。':reason||(here?'任务点在本场景。点「在场景中定位」后沿浅金路线前往。':!currentChapter?`位于第 ${chapterId} 章场景，抵达该章后可体验。`:'位于本章另一场景，需沿场景出口前往。')));
      const b=button(done?'定位回访':'在场景中定位',()=>{guided=r.storyId;diagnostic('已定位：'+r.title);d.close();});
      b.disabled=!here||!!reason;b.title=reason||(!currentChapter?`需先抵达第 ${chapterId} 章`:!here?'需先沿本章出口前往该场景':'在场景中显示通路，不远程启动任务');
      c.append(b);return c;
    };
    const render=chapterId=>{
      list.replaceChildren();
      const chapter=registry.chapters.find(c=>c.chapterId===chapterId),chapterRows=all.filter(r=>r.chapterId===chapterId),done=chapterRows.filter(r=>state.tasks[r.storyId]?.completed).length;
      list.append(el('p',`${chapter?.title || '第 '+chapterId+' 章'} · 可选玩法 ${chapterRows.length} 项，已完成 ${done} 项。`,'march83-note'));
      if(!chapterRows.length)return list.append(el('p','本章暂无额外玩法，继续主线即可。'));
      for(const group of ['互动游戏','研学系统','3D与史实']){
        const items=chapterRows.filter(r=>directoryGroup[r.kind]===group);if(!items.length)continue;
        const section=el('section',undefined,'march94-dir-group'),grid=el('div',undefined,'march87-clue-grid');
        section.append(el('h3',`${group} · ${items.length}`));for(const r of items)grid.append(card(r,chapterId));section.append(grid);list.append(section);
      }
    };
    for(const c of registry.chapters){const option=el('option',`第${c.chapterId}章 · ${c.title}`);option.value=String(c.chapterId);select.append(option);}
    select.value=String(scene.chapterId);select.onchange=()=>render(Number(select.value));render(scene.chapterId);
    foot.append(button('恢复主线任务指引',()=>{guided=null;d.close();}),button('返回场景',()=>d.close()));
    await new Promise(resolve=>d.addEventListener('close',resolve,{once:true}));
    if(current(token)){active=null;world.resume('dialogue');guide();}
  }
  function destroy({savePosition=true}={}){
    if(savePosition&&world&&scene&&sameJourney())checkpoint();
    epoch++;controller?.abort();active?.controller.abort();active=null;clearInterval(timer);timer=null;overlays?.disconnect();overlays=null;
    if(listener)window.removeEventListener('czmarch:interact',listener);listener=null;
    window.removeEventListener('pagehide',checkpoint);document.removeEventListener('visibilitychange',visibility);
    env().ui?.stopNpcVoice?.();if(world){try{world.resume('dialogue');world.resume('minigame');world.resume('hidden');world.resume('overlay');world.destroy();}catch{/* Teardown remains idempotent. */}}
    guided=null;guideTarget=null;world=null;scene=null;controller=null;preparations=null;role=null;
    if(root){root.replaceChildren();root.classList.remove('march83-shell');root.hidden=true;root=null;}
  }
  window.CZMarchStory={boot,destroy,checkpoint,interact,run,overview,directory,progress,get active(){return !!active;},get mounted(){return !!scene;},get registry(){return registry;}};
})();
