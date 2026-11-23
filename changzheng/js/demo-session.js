/* The same loaded page can enter/leave a separate memory-only demonstration. */
(()=>{
  const clone=value=>JSON.parse(JSON.stringify(value));
  const data=object=>Object.fromEntries(Object.entries(object).filter(([,v])=>typeof v!=='function'&&v!==undefined).map(([k,v])=>[k,clone(v)]));
  // A shareable URL is navigation, never consent to load somebody's demo progress.
  // Only an explicit demo action in this tab may authorize a reload into a demo.
  const INTENT_KEY='cz_demo_intent110',MODES=new Set(['1','mainline','story','exhibit']);
  const owner=()=>typeof PlayerProfiles40!=='undefined'?String(PlayerProfiles40.id):'default';
  const demo=window.MainlineDemo={ready:false,active:false,defaults:null,snapshot:null,
    captureDefaults(state){if(!this.defaults)this.defaults=data(state);},
    rememberIntent(mode){try{sessionStorage.setItem(INTENT_KEY,JSON.stringify({owner:owner(),mode}));}catch{}},
    clearIntent(){try{sessionStorage.removeItem(INTENT_KEY);}catch{}},
    requested(){try{const q=new URLSearchParams(location.search).get('demo'),saved=JSON.parse(sessionStorage.getItem(INTENT_KEY)||'null');return MODES.has(q)&&saved?.owner===owner()&&saved.mode===q;}catch{return false;}},
    prepare(){
      if(this.active)return;
      this.previous=window.localStorage;this.descriptor=Object.getOwnPropertyDescriptor(window,'localStorage');
      const store=Object.create(null),own=key=>Object.prototype.hasOwnProperty.call(store,key);
      const methods={getItem:key=>own(key)?store[key]:null,setItem:(key,value)=>{store[key]=String(value);},removeItem:key=>{delete store[key];},clear:()=>{for(const key of Object.keys(store))delete store[key];},key:index=>Object.keys(store)[index]??null};
      for(const [name,method] of Object.entries(methods))Object.defineProperty(store,name,{value:method});Object.defineProperty(store,'length',{get:()=>Object.keys(store).length});
      const settings=this.previous.getItem('changzheng_settings');if(settings)store.setItem('changzheng_settings',settings);
      try {
      Object.defineProperty(window,'localStorage',{value:store,configurable:true});this.active=true;window.CZ_DEMO_SESSION=true;
      store.setItem('changzheng_state',JSON.stringify({schemaVersion:2,characterId:'soldier',resources:{troops:85,ammo:70,food:65,morale:80},skills:{morse:true},medalRecords:[{nodeId:1,score:80,rating:'演示预置',svg:''}]}));
      } catch(error) {Object.defineProperty(window,'localStorage',this.descriptor||{value:this.previous,configurable:true});this.active=false;window.CZ_DEMO_SESSION=false;throw error;}

    },
    closeTasks(){
      if(typeof DecisionCinema!=='undefined')DecisionCinema.close();
      if(typeof JourneyChapter!=='undefined'&&JourneyChapter.root)JourneyChapter.close();
      if(typeof PressureChallenge!=='undefined'&&PressureChallenge.root)PressureChallenge.close();
      if(typeof ChishuiSandbox!=='undefined'&&ChishuiSandbox.root)ChishuiSandbox.close();
      GameUI.closeNpcChat?.();GameUI.closeCommandPost?.();GameUI.closeDungeonPanel?.();GameUI.stopNpcVoice?.();
      GameUI.settlementSession=(GameUI.settlementSession||0)+1;GameUI.qteActive=false;
      for(const key of ['qteSlideTimer','qteBloodTimer','qteStallTimer','qteTypewriterTimer','telegramTypewriterTimer','_historyTypewriterTimer','settlementRequestTimer']){clearInterval(GameUI[key]);clearTimeout(GameUI[key]);}
      document.querySelectorAll('[class*="-overlay"].open').forEach(el=>el.classList.remove('open'));
      if(typeof ExperienceSystem!=='undefined'){ExperienceSystem.epoch++;ExperienceSystem.close?.();ExperienceSystem.stopAudio?.(true);}
    },
    map(snapshot){if(typeof RouteMap==='undefined')return;const completed=snapshot?.completed||(GameState.medalRecords||[]).map(x=>x.nodeId);RouteMap.completedNodeIds=new Set(completed);RouteMap.currentNodeId=snapshot?.current||GAME_NODES.find(n=>!RouteMap.completedNodeIds.has(n.id))?.id||12;RouteMap.focusIndex=snapshot?.focus??RouteMap.currentNodeId-1;RouteMap.renderNodes?.();RouteMap.renderLines?.();RouteMap.updateProgress?.();RouteMap.updateNavButtons?.();},
    async start(options={}){
      const firstDemo=!options.exhibit&&new URLSearchParams(location.search).get('demo')==='1';const dialogueDemo=firstDemo||new URLSearchParams(location.search).get('demo')==='story';
      if(!this.ready&&typeof NpcStory.load==='function')await NpcStory.load();
      if(!this.ready){const button=document.getElementById('titleDemo');button.disabled=true;button.textContent='正在整理剧情…';await new Promise(resolve=>{const timer=setTimeout(resolve,4000);document.addEventListener('npc-story-ready',()=>{clearTimeout(timer);resolve();},{once:true});});button.disabled=false;button.textContent='快速体验（3 分钟）';if(!this.ready){GameUI.showToast?.('固定剧情尚未就绪，请稍后再试');return;}}
      if(!this.active){this.rememberIntent(options.exhibit?'exhibit':(new URLSearchParams(location.search).get('demo')||'mainline'));this.closeTasks();this.snapshot={state:data(GameState),turns:clone(NpcDialogueFlow.records),companions:typeof CompanionBoard!=='undefined'?clone(CompanionBoard.records):null,pressure:typeof PressureChallenge!=='undefined'?clone(Object.fromEntries(['state','key','demo','node','scenario','draft'].map(key=>[key,PressureChallenge[key]??null]))):null,route:GameUI.currentRoute,experienceNode:typeof ExperienceSystem!=='undefined'?ExperienceSystem.nodeId:1,experience:typeof ExperienceSystem!=='undefined'?clone(ExperienceSystem.state):null,map:typeof RouteMap!=='undefined'?{completed:[...RouteMap.completedNodeIds],current:RouteMap.currentNodeId,focus:RouteMap.focusIndex}:null};this.prepare();}
      this.closeTasks();Object.assign(GameState,clone(this.defaults||data(GameState)));GameState.load();GameState.saveFailed=false;GameUI.journalEntries=GameState.journalEntries;GameUI.renderJournal?.();GameUI.renderMedalWall?.();
      NpcDialogueFlow.records={};NpcStory.current=null;NpcStory.pendingTask=null;
      if(typeof CompanionBoard!=='undefined')CompanionBoard.records={};
      if(typeof PressureChallenge!=='undefined')Object.assign(PressureChallenge,{state:null,key:null,demo:false,node:null,scenario:null,draft:''});
      if(typeof ExperienceSystem!=='undefined')ExperienceSystem.state=ExperienceCore.empty();
      for(const script of NpcStory.scripts.filter(s=>s.part===1&&!(dialogueDemo&&s.nodeId===(firstDemo?1:2)))){const role=NpcStory.role(),npc=NpcStoryCore.participants(script,role).find(id=>id!=='narrator')||'narrator',key=NpcDialogueFlow.id(script,role);NpcDialogueFlow.records[key]=[];for(let round=0;round<8;round++){const choice=NpcDialogueFlow.options(script,role,npc)[0];if(choice)NpcDialogueFlow.records[key].push({...choice,round:round+1});}}
      if(firstDemo){GameState.medalRecords=[];GameState.save();}this.map();GameUI.switchRoute?.('map');const url=new URL(location.href);url.searchParams.set('demo',options.exhibit?'exhibit':firstDemo?'1':dialogueDemo?'story':'mainline');try{history.replaceState(history.state,'',url);}catch{}GameShell.enter();document.body.classList.add('demo-mode');
      document.querySelector('.demo-banner')?.remove();const banner=document.createElement('aside');banner.className='demo-banner';banner.append(document.createTextNode('内存演示 · 预置进度，不改正式存档 '));const back=document.createElement('button');back.textContent='返回正式征程';back.onclick=()=>this.exit();banner.append(back);document.body.append(banner);
      if(options.exhibit)return true;
      const node=GAME_NODES.find(n=>n.id===(firstDemo?1:2));GameUI.showDungeonPanel(node);if(firstDemo)NpcStory.startGate(node);else if(!dialogueDemo)GameUI.enterDungeon();
    },
    exit(){
      this.clearIntent();if(!this.active)return;try{this.closeTasks();}finally{Object.defineProperty(window,'localStorage',this.descriptor||{value:this.previous,configurable:true});this.active=false;window.CZ_DEMO_SESSION=false;}
      Object.assign(GameState,clone(this.snapshot?.state||this.defaults));if(!this.snapshot)GameState.load();GameUI.journalEntries=GameState.journalEntries;
      NpcDialogueFlow.records=this.snapshot?clone(this.snapshot.turns):{};if(!this.snapshot)NpcDialogueFlow.load();NpcStory.current=null;NpcStory.pendingTask=null;
      if(typeof CompanionBoard!=='undefined'){if(this.snapshot?.companions)CompanionBoard.records=clone(this.snapshot.companions);else CompanionBoard.load();}
      if(typeof PressureChallenge!=='undefined')Object.assign(PressureChallenge,this.snapshot?.pressure?clone(this.snapshot.pressure):{state:null,key:null,demo:false,node:null,scenario:null,draft:''});
      if(typeof ExperienceSystem!=='undefined'){ExperienceSystem.state=this.snapshot?.experience?clone(this.snapshot.experience):ExperienceCore.empty();if(!this.snapshot)ExperienceSystem.load();ExperienceSystem.updateDock?.();}
      this.map(this.snapshot?.map);if(typeof ExperienceSystem!=='undefined'){ExperienceSystem.nodeId=this.snapshot?.experienceNode||(typeof RouteMap!=='undefined'?RouteMap.currentNodeId:1);ExperienceSystem.applySceneState?.();}GameUI.switchRoute?.(this.snapshot?.route||'map');GameUI.updateResourceHUD?.();GameUI.renderJournal?.();GameUI.renderMedalWall?.();document.querySelector('.demo-banner')?.remove();document.body.classList.remove('demo-mode');const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(history.state,'',url);this.snapshot=null;GameShell.show();
    }
  };
  document.addEventListener('DOMContentLoaded',()=>{if(!demo.active)demo.captureDefaults(GameState);},{once:true});
  document.addEventListener('npc-story-ready',()=>{demo.ready=true;if(demo.active&&!window.DemoMode?.starting&&!window.DemoMode?.active())demo.start();},{once:true});
  if(MODES.has(new URLSearchParams(location.search).get('demo'))){
    if(demo.requested())try{demo.prepare();}catch{window.CZ_DEMO_ERROR=true;}
    else{demo.clearIntent();const url=new URL(location.href);url.searchParams.delete('demo');history.replaceState(history.state,'',url);}
  }else demo.clearIntent();
})();
