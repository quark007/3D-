/* Registry is derived from live authoring data, never a second handwritten plot. */
(() => {
  'use strict';
  const engines = {
    mortar:['MortarGame','js/mortar-game.js','mortar_'], bluff:['SiduBluff67','js/sidu-bluff67.js','sidu67_'],
    guard:['XiangjiangGuard67','js/xiangjiang-guard67.js','xjg67_'], drum:['HuishiDrum67','js/huishi-drum67.js','drum67_'],
    scout:['Scout67','js/scout67.js','scout67_'], collect:['GrasslandCollect','js/grassland-collect.module.js',''],
    snipe:['Sniper1937','js/sniper-1937.module.js',''], lob:['Lazikou68','js/lazikou68.js','lazikou68_'],
    fire:['Campfire68','js/campfire68.js','fire68_'], snow:['SnowRun68','js/snowrun68.js','snow68_'],
    final:['Wuqi68','js/wuqi68.js','wuqi68_'], ration:['Grassland30','js/grassland30.js','g30_'],
    lamp:['Gouba72','js/s01-gouba72.js','gouba72_'], poem:['PoemScroll72','js/s02-poem72.js','poem72_'],
    press:['Press72','js/s03-press72.js','press72_'], pontoon:['Wujiang72','js/b01-wujiang72.js','wujiang72_'],
    ferry:['Ferry72','js/b02-ferry72.js','ferry72_'], yihai:['Yihai72','js/a02-yihai72.js','yihai72_']
  };
  // These engines contain shooting, damage/attrition or attack loops. Keep their narrative purpose,
  // use separate noncombat interactions; never merely hide weapons or a health bar.
  // 第9章草地三十天（Grassland30，仅 supports node 9）与第10章火力准备（Lazikou68，仅 supports node 10）
  // 按本章接入任务恢复真实引擎，不再走协作替代；其余条目维持非战斗替代。
  const alternatives = {mortar:'dispatch',guard:'dispatch',snipe:'route',final:'route',snow:'route',pontoon:'assembly',ferry:'dispatch',chains:'assembly',aid:'dispatch'};
  const replacementTitles={mortar:'观测与渡口调度',guard:'湘江接应 · 分批转运',snipe:'1937番外 · 观察与疏导',lob:'腊子口 · 联络与通路准备',final:'吴起镇 · 接应路线核验',ration:'草地同行 · 分粮交接',snow:'雪山互助 · 观察择路',pontoon:'浮桥通行 · 连接与检查',ferry:'大渡河 · 渡运调度',chains:'泸定桥 · 铁索铺板协作',aid:'湘江接应 · 物资转运'};
  const slugs = {1:'ruijin',2:'xiangjiang',3:'zunyi',4:'chishui',5:'jinsha',6:'dadu',7:'luding',8:'snowmount',9:'grassland',10:'lazikou',11:'wuqi',12:'huining'};
  function create() {
    const e = window.CZMarchEnv(), rows = [], chapters = [];
    function add(chapterId, suffix, data) {
      const storyId = `chapter-${chapterId}/${suffix}`;
      rows.push({chapterId, storyId, gameId:storyId, sceneId:`chapter-${chapterId}/scene-${slugs[chapterId]}`, anchorId:`chapter-${chapterId}/anchor-${suffix.replaceAll('/','-')}`,
        prerequisites:[], main:false, kind:'game', verification:'source-inspected; browser-pending', ...data});
    }
    for (const n of e.nodes) {
      chapters.push({chapterId:n.id, title:n.name, date:n.date, sceneId:`chapter-${n.id}/scene-${slugs[n.id]}`});
      for (const script of e.story?.scripts.filter(s=>s.nodeId === n.id) || []) {
        const roles=['commander','logistics','soldier','medic'];
        const participants = [...new Set(roles.flatMap(role=>e.core.participants(script,role)))];
        for (const npcId of participants) add(n.id, `dialogue-${script.id}-${npcId}`, {kind:'dialogue',scriptId:script.id,part:script.part,npcId,roles:roles.filter(role=>e.core.participants(script,role).includes(npcId)),title:`${script.title} · ${e.core.names[npcId] || npcId}`,
          main:script.part === 1, source:'assets/npc-scripts/scripts-v1.json', start:'NpcDialogueFlow.options/choose; NpcStoryCore.opening',
          completion:'explicit dialogue finish after actual required turns', prerequisites:script.part===6?['opening-dialogue','main-task']:script.part>1?['opening-dialogue']:[],saveField:'changzheng_npc_dialogue_v1 (existing profile-scoped)'});
      }
      add(n.id, 'main-task', {main:true, kind:'cooperation', mechanic:n.id === 3 ? 'evidence' : n.id === 12 ? 'rhythm' : [1,6,9].includes(n.id) ? 'dispatch' : [4,5,8,11].includes(n.id) ? 'route' : 'assembly',
        title:n.id === 3 ? '核对资料 · 保障传递' : n.id === 12 ? '会师协作 · 同行回望' : `${n.name} · 岗位协作`, source:'march-story/cooperation.js',
        start:'CZMarchCooperation.start', prerequisites:['opening-dialogue'], completion:'validated task model + explicit confirm',saveField:'storyPreparations.marchStory83'});
      const occurrence = {};
      // 第10章按接入任务恢复旧章内真实玩法：qte=悬崖攀爬、choice=战术突破，走 js/game-ui.js
      // 原章节调度链（指挥所战术决策 → 战况动画 → QTE → 战报 → 结算），不再是协作替代模型。
      const legacyRestored = n.id === 10;
      for (const ch of n.challenges || []) {
        const index = occurrence[ch.icon] = (occurrence[ch.icon] || 0) + 1;
        const sf = window.StarfireBook73?.entries.find(v=>v.node === n.id && v.icon === ch.icon);
        const info = engines[ch.icon];
        const oldHost = sf?.host || info?.[0];
        if (!oldHost) {
          add(n.id, `legacy-${ch.icon}-${index}`, {kind:'legacy-task',title:ch.name,source:'js/game-ui.js',start:legacyRestored?'js/game-ui.js legacy chapter dispatch ('+(ch.icon === 'qte' ? 'GameUI.startQTE · 悬崖攀爬QTE' : 'GameUI.showCommandPost · 指挥所战术决策')+' → 原胜利链)':'legacy chapter dispatch',
            mechanic:legacyRestored?null:(ch.icon === 'qte' ? 'rhythm' : ch.icon === 'drag' ? 'assembly' : 'dispatch'), completion:legacyRestored?'js/game-ui.js 原胜利链（战报→结算→档案）抵达 completeDungeon；行走层拦截为任务完成信号，不发勋章、不推旧路线':'noncombat task model',saveField:'storyPreparations.marchStory83',prerequisites:['opening-dialogue']});
          continue;
        }
        add(n.id, `game-${ch.icon}`, {title:replacementTitles[ch.icon] || ch.name,legacyTitle:ch.name, icon:ch.icon, host:oldHost, source:sf ? (sf.host === 'StarfireScenes73' ? 'js/starfire-scenes73.js' : window.CZMarchSourceMap?.[sf.host] || 'js/starfire73.js') : info[1],
          start:sf?.host === 'StarfireScenes73' ? `StarfireScenes73.open('${ch.icon}',node,'normal',callback)` : `${oldHost}.open(${ch.icon === 'collect' ? 'node.id' : 'node'},callback)`,
          mechanic:alternatives[ch.icon] || null, replacement:!!alternatives[ch.icon], period:ch.icon === 'snipe' ? '1937年番外 · 不属于当前节点事件' : sf?.period,
          completion:alternatives[ch.icon]?'validated cooperative model + explicit confirm':['collect','snipe'].includes(ch.icon) ? 'callback result.win === true' : 'explicit successful record callback',
          saveField:sf?.key || (info?.[2] ? info[2] + n.id : 'battleScores (legacy); storyPreparations.marchStory83 (adapted)'), prerequisites:['opening-dialogue']});
      }
      for (const lab of window.OptionalLab71?.entries.filter(v=>v.nodes.includes(n.id)) || []) add(n.id, `workshop-${lab.id}`, {title:lab.title,host:lab.host,source:window.CZMarchSourceMap?.[lab.host] || 'js/optional-lab71.js',
        start:`${lab.host}.open(node,callback)`, completion:'callback result.won === true', saveField:`storyPreparations.mini71_${lab.id}_${n.id}`,prerequisites:['opening-dialogue']});
      for (const hero of e.heroes?.rows.filter(v=>v.node === n.id) || []) add(n.id, `hero-${hero.id}`, {kind:'hero',heroId:hero.id,title:hero.title,source:'js/snow-prologue63.js',
        start:'existing authored lines; explicit reading completion',completion:'all reading pages + explicit collect',saveField:'storyPreparations.snow63.heroes',period:hero.kind});
      add(n.id,'history',{kind:'history',title:'本章史实与来源',source:'js/game-history-data.js',start:'read existing NODE_HISTORY_DATA',completion:'reading only; no progress award',saveField:null});
      add(n.id,'scene3d',{kind:'scene3d',title:'3D剧情地点模拟体验',source:'js/world3d.js',start:'CZMarchScene3D.start(row,signal)',completion:'three.js scene mounted and viewed; optional, no chapter progress',saveField:'storyPreparations.marchStory83; existing 3D view state'});
      add(n.id,'exit',{kind:'exit',title:n.id === 12 ? '旅途回顾' : '继续下一站',source:'march-story/story.js',start:'CZMarchStory.interact',completion:'main task + opening dialogue',saveField:'existing medals + marchStory83.completedChapters'});
    }
    const systems = [
      ['prologue','序章 · 让世界看见长征','SnowPrologue63','js/snow-prologue63.js','reading'],
      ['run','全程协作推演','LongMarchRun69','js/run69.js','route'],
      ['grassland30','草地行程协作','Grassland30','js/grassland30.js','dispatch'],
      ['zhiluo','直罗镇 · 番外接应','Zhiluo70','js/zhiluo70.js','dispatch'],
      ['night','夜行军纵队 · 番外','NightMarch72','js/a01-night72.js','route'],
      ['newsroom','真相编辑部','Newsroom65','js/newsroom65.js','reading'],
      ['morse','摩斯学堂','MorseTraining','js/morse-academy.js','reading'],
      ['correspondent','随军记者','Correspondent69','js/correspondent69.js','reading'],
      ['spark','星火传承档案','Spark69','js/spark69.js','reading']
    ];
    for (const [slug,title,host,source,mechanic] of systems) add(slug === 'night' || slug === 'grassland30' ? 9 : slug === 'zhiluo' ? 11 : slug === 'run' ? 12 : 1, `extra-${slug}`, {kind:'system',slug,title,host,source,mechanic,
      replacement:['run','zhiluo'].includes(slug),start:'explicit system adapter',completion:'explicit result; optional',saveField:'existing system field + storyPreparations.marchStory83'});
    add(1,'extra-daily',{kind:'system',slug:'daily',title:'今日行程 · 可选同行',host:'Daily68',anchorId:'chapter-1/anchor-extra-spark',source:'js/daily68.js',start:'Daily68.pick; registered scene navigation; actual completion marks day',completion:'actual selected task completed, never navigation/close',saveField:'existing daily_YYYY-MM-DD + marchStory83.dailyTarget'});
    add(12,'extra-report',{kind:'system',slug:'report',title:'我的长征年报',host:'WitnessReport65',anchorId:'chapter-12/anchor-history',source:'js/witness-report65.js',start:'Education43.dialog + WitnessReport65.mount',completion:'existing report eligibility; read/export only',saveField:'existing report and hero records'});
    add(1,'extra-snow-letter',{kind:'system',slug:'snow-letter',title:'时空信箱 · 斯诺定稿配音回信',host:'CZVoiceRuntime84',anchorId:'chapter-1/anchor-extra-prologue',source:'js/voice-runtime84.js',start:'CZVoiceRuntime84.openSnowLetter()',completion:'reading/listening only; closing never completes chapter',saveField:'no new progress or reward'});
    for(const [slug,title,signal] of window.CZMarchFrame?.games || [])add(1,'archive-'+slug,{kind:'iframe',title,path:'minigames/'+slug+'.html',source:'minigames/'+slug+'.html',start:'CZMarchFrame.start; local iframe',completion:'same origin + iframe source + session nonce + '+signal,saveField:'storyPreparations.marchStory83'});
    const tasks=typeof ChapterTasks54!=='undefined'?ChapterTasks54:null;
    for(const [id,d]of Object.entries(tasks?.definitions || {}))add(Number(id),'chapter-task54',{title:d.title,host:'ChapterTasks54',source:'js/chapter-tasks54.js',start:'ChapterTasks54.open(node,callback)',completion:'explicit validated task callback',saveField:'storyPreparations.challenge54_'+id,prerequisites:['opening-dialogue']});
    add(1,'journey-full',{kind:'game',title:'星夜启程 · 原六阶段完整岗位协作',host:'JourneyChapter',anchorId:'chapter-1/anchor-main-task',source:'js/game-journey.js',start:'JourneyChapter.open(node,onMarchComplete) (new optional callback; legacy open(node) preserved)',completion:'all six original stages + six crossing segments + explicit finish callback',completesMain:true,saveField:'storyPreparations.journey83_1; existing global resources',prerequisites:['opening-dialogue']});
    add(9,'ration-native',{kind:'ration',title:'青稞面分配 · 原分粮资料与算法',anchorId:'chapter-9/anchor-main-task',source:'js/game-ui.js',start:'CZMarchRation.start; original GRASSLAND_SOLDIERS, calcRationTotal, GameUI.calcRationResult',completion:'validated allocation + explicit saved confirmation',completesMain:true,saveField:'existing rationRecords + marchStory83 task draft',prerequisites:['opening-dialogue']});
    for(const row of rows){
      row.exit='取消/关闭返回原场景；失败可重试；完成须明确成功回传';
      row.activeStart=row.start;
      if(row.mechanic&&row.kind!=='system' || row.replacement){row.legacyStart=row.start;row.activeStart='CZMarchCooperation.start(row,signal,context)';row.legacySaveField=row.saveField;row.saveField='storyPreparations.marchStory83.tasks['+row.storyId+']';}
      if(row.kind==='dialogue')row.exit='记录交谈后返回；Esc取消不确认整段完成，已选对白仍沿用原逐轮记录';
      if(row.kind==='exit')row.exit='未满足主线前置则留在原场景；满足后切换下一章或会师回顾';
      if(row.kind==='system'&&!row.replacement)row.activeStart=({prologue:'SnowPrologue63.open({replay})',newsroom:'Newsroom65.hub()',morse:'MorseTraining.open()',correspondent:'Correspondent69.openPanel()',spark:'Spark69.openPanel()',daily:'Daily68.pick(); set dailyTarget; navigate; real target completion calls markDone',report:'Education43.dialog(); WitnessReport65.mount(dialog)','snow-letter':'CZVoiceRuntime84.openSnowLetter()'})[row.slug]||row.start;
    }
    /* 第11章旧玩法恢复：切尾巴之战、扎根陕北、直罗镇番外改回真实旧入口（标题不动，启动与信号恢复原操作）。
       本章岗位协作主任务仍走协作模型；档案修复、整理行记本就直接调用真实引擎。 */
    for(const row of rows){
      if(row.chapterId!==11)continue;
      if(row.storyId==='chapter-11/game-final'){row.mechanic=null;row.replacement=false;row.start='Wuqi68.open(node,callback)';row.activeStart=row.start;row.completion='记录成绩回调（无参；仅真实胜利且成绩写入存档后触发）';row.saveField='wuqi68_11 (旧成绩) + storyPreparations.marchStory83.tasks[chapter-11/game-final]';}
      else if(row.storyId==='chapter-11/legacy-choice-1'){row.mechanic=null;row.start='GameUI.showLearningTask(node, true) · 旧学习任务 LEARNING_TASKS[11]（整理行记保持独立任务故不再串联；完成回调由适配器改道，不再触发旧 completeDungeon 整章通关）';row.activeStart='GameUI.showLearningTask(node, true)';row.saveField='storyPreparations.marchStory83.tasks[chapter-11/legacy-choice-1]';}
      else if(row.storyId==='chapter-11/extra-zhiluo'){row.replacement=false;row.start='Zhiluo70.openCard() · 旧番外战棋（三关全胜时旧引擎写 storyPreparations.zhiluo_extra，适配器据此记为完成）';row.activeStart='Zhiluo70.openCard()';row.saveField='storyPreparations.zhiluo_extra (旧成绩) + storyPreparations.marchStory83.tasks[chapter-11/extra-zhiluo]';}
    }
    /* 第12章旧玩法恢复：三军汇聚=原指挥所会师推演（LEVEL_CONFIG[12] 副标题「第一视角 · 三军汇聚」，
       nodeLevelMap[12]=huining/reunion、battleMode=meeting）；战略部署=旧学习任务 LEARNING_TASKS[12]
       （会师历史档案：会宁与将台堡分别记录）；全程协作推演=LongMarchRun69 真实引擎（可选系统，
       局内胜利不推进主线章节）。完成信号在行走层改道：不发旧勋章、不解锁旧路线、不触发最终结算。 */
    for(const row of rows){
      if(row.chapterId!==12)continue;
      if(row.storyId==='chapter-12/legacy-drag-1'){row.mechanic=null;row.start='GameUI.showCommandPost(node) · 原指挥所会师推演（战术磁贴/指令 → 确认行动 → 会师战报 → 结算 → 档案卡），完成回调由行走层改道为任务完成信号';row.activeStart='GameUI.showCommandPost(node)';row.saveField='storyPreparations.marchStory83.tasks[chapter-12/legacy-drag-1]';}
      else if(row.storyId==='chapter-12/legacy-choice-1'){row.mechanic=null;row.start='GameUI.showLearningTask(node, true) · 旧学习任务 LEARNING_TASKS[12]（会师历史档案：会宁与将台堡分别记录、不当同一地点），完成回调由行走层改道，不触发旧整章通关';row.activeStart='GameUI.showLearningTask(node, true)';row.saveField='storyPreparations.marchStory83.tasks[chapter-12/legacy-choice-1]';}
      else if(row.storyId==='chapter-12/extra-run'){row.replacement=false;row.start='LongMarchRun69.open() · 旧全程推演引擎（一局结束 persist 写 run69_result；won===true 记为完成）';row.activeStart='LongMarchRun69.open()';row.completion='explicit run69_result.won===true; optional';row.saveField='storyPreparations.run69_result (旧成绩) + storyPreparations.marchStory83.tasks[chapter-12/extra-run]';}
    }
    /* 第9章旧玩法恢复：探路行军=原指挥所泥沼行军推演（LEVEL_CONFIG[9] 副标题「第一视角 · 泥沼行军」，
       nodeLevelMap[9]=grassland/marsh_crossing；battleMode=marsh：战术磁贴/指令 → 确认行动 → 战况动画
       → 跋涉草地QTE → 战报 → 结算 → 档案卡）；生存抉择=旧学习任务 LEARNING_TASKS[9]（草地物资协作·分粮决策）；
       草地行程协作/夜行军纵队两个番外系统入口改回真实旧引擎（替换标记已从 systems 摘除）。
       草地三十天经 alternatives 摘除直接走真实引擎通道，标题保留原改编名（与第10章一致）。
       完成信号在行走层改道：不发旧勋章、不解锁旧路线，章节推进统一由场景出口处理；
       草地三十天两处入口共享旧成绩槽 g30_9，任务完成各自记录。 */
    for(const row of rows){
      if(row.chapterId!==9)continue;
      if(row.storyId==='chapter-9/legacy-drag-1'){row.mechanic=null;row.start='GameUI.showCommandPost(node) · 原指挥所泥沼行军推演（战术磁贴/指令 → 确认行动 → 战况动画 → 跋涉草地QTE → 战报 → 结算 → 档案卡），完成回调由行走层改道为任务完成信号';row.activeStart='GameUI.showCommandPost(node)';row.saveField='storyPreparations.marchStory83.tasks[chapter-9/legacy-drag-1]';}
      else if(row.storyId==='chapter-9/legacy-choice-1'){row.mechanic=null;row.start='GameUI.showLearningTask(node, true) · 旧学习任务 LEARNING_TASKS[9]（草地物资协作：断粮绝境下的分粮决策），完成回调由行走层改道，不触发旧整章通关';row.activeStart='GameUI.showLearningTask(node, true)';row.saveField='storyPreparations.marchStory83.tasks[chapter-9/legacy-choice-1]';}
      else if(row.storyId==='chapter-9/extra-grassland30'){row.start='Grassland30.open(node,callback) · 旧草地三十天引擎（三十天分粮守夜，胜利记录后回调）；与本章草地三十天挑战共享旧成绩槽 g30_9';row.activeStart=row.start;row.completion='explicit no-arg success callback; optional';row.saveField='storyPreparations.g30_9 (旧成绩) + storyPreparations.marchStory83.tasks[chapter-9/extra-grassland30]';}
      else if(row.storyId==='chapter-9/extra-night'){row.start='NightMarch72.open(node,callback) · 旧夜行军纵队引擎（无声夜行军，胜利记录后回调）';row.activeStart=row.start;row.completion='explicit no-arg success callback; optional';row.saveField='storyPreparations.march72_9 (旧成绩) + storyPreparations.marchStory83.tasks[chapter-9/extra-night]';}
    }
    const focus={1:['JourneyChapter'],2:['Stretcher71'],3:['Gouba72','PoemScroll72'],4:['SiduBluff67'],5:['Scout67'],6:['Yihai72'],7:['BridgeWorkshop71'],8:['Stretcher71'],9:['GrasslandCollect','Campfire68'],10:['Press72'],11:['ArchiveRestore71'],12:['HuishiDrum67']};
    for(const ch of chapters){
      const candidates=rows.filter(r=>r.chapterId===ch.chapterId&&focus[ch.chapterId]?.includes(r.host)&&!r.mechanic);
      candidates.forEach(r=>{r.featured=true;r.completesMain=true;});
      add(ch.chapterId,'ai-decision',{kind:'decision',title:'DeepSeek · 行动研判与影像',source:'march-story/decision.js',start:'CZMarchDecision.start',prerequisites:['opening-dialogue'],completion:'explicit recorded decision',saveField:'storyPreparations.marchStory83'});
    }
    return {version:2,chapters,rows:rows.filter(r=>!(r.kind==='legacy-task'&&r.mechanic)&&!(r.kind==='game'&&r.replacement)&&!(r.kind==='cooperation'&&rows.some(x=>x.chapterId===r.chapterId&&x.featured)))};
  }
  function itinerary(registry,chapterId,role){
    const local=registry.rows.filter(r=>r.chapterId===chapterId&&(!r.roles||r.roles.includes(role))),steps=[];
    const dialogue=part=>{const group=local.filter(r=>r.kind==='dialogue'&&r.part===part);if(group.length)steps.push({id:`chapter-${chapterId}/stage-${part}`,title:group[0].title.split(' · ')[0],kind:'dialogue',phase:part<4?0:2,rows:group});};
    dialogue(1);
    const main=local.find(r=>r.kind==='cooperation');if(main)steps.push({id:main.storyId,title:main.title,kind:'task',phase:1,rows:[main,...local.filter(r=>r.completesMain)]});
    for(const r of local.filter(r=>r.featured))steps.push({id:r.storyId,title:r.title,kind:'task',phase:1,rows:[r]});
    for(const r of local.filter(r=>r.kind==='decision'))steps.push({id:r.storyId,title:r.title,kind:'task',phase:1,rows:[r]});
    dialogue(6);
    return steps;
  }
  window.CZMarchRegistry = {create,itinerary,engines,alternatives,slugs};
})();
