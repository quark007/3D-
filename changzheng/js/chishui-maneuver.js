/* Fictional half-day scenario on a schematic graph. Saved orders are replayed through these rules. */
(() => {
  const places = {
    camp: ['黔北集结地', 610, 337], east: ['茅台东岸', 479, 296], west: ['茅台西岸', 367, 295],
    gulin: ['古蔺方向', 108, 160], ridge: ['西岸山脊', 283, 167], woods: ['西岸林道', 198, 287],
    erW: ['二郎滩西岸', 346, 99], erE: ['二郎滩东岸', 488, 93], pass: ['东岸山口', 619, 142],
    taiW: ['太平渡西岸', 328, 215], taiE: ['太平渡东岸', 483, 200], ravine: ['南侧谷地', 599, 244],
    reserve: ['黔北追兵来路', 711, 55], exit: ['南下通道', 732, 307]
  };
  const edges = [
    ['camp','east',1], ['east','west',1,'west'], ['west','ridge',1], ['west','woods',1],
    ['ridge','gulin',1], ['woods','gulin',1], ['ridge','erW',1], ['erW','erE',1,'east'],
    ['woods','taiW',1], ['taiW','taiE',2,'east'], ['erE','pass',1], ['pass','exit',1],
    ['taiE','ravine',1], ['ravine','exit',1], ['reserve','pass',1], ['pass','ravine',1],
    ['erW','gulin',1], ['erE','ravine',2]
  ];
  const crossing = new Set(['erE','taiE','pass','ravine','erW','taiW']);
  const edge = (a,b) => edges.find(([x,y]) => x===a && y===b || x===b && y===a);
  const destinations = (from, squad) => edges.flatMap(([a,b]) => a===from ? [b] : b===from ? [a] : []).filter(id => id!=='reserve' && (squad!=='screen'||id!=='exit'));
  const name = id => places[id][0];
  const titles = { main:'主力纵队', screen:'牵制分队', guard:'渡口守军', pursuit:'黔北追兵' };
  const unit = at => ({at, route:[], leg:null});

  function create(challenge = false, rules = 2) {
    return { challenge, rules, pace:'swift', tick:0, supply:12, readiness:4, scouts:1, rumor:null, feintAt:null, feintUsed:false,
      squads:{main:unit('camp'),screen:unit('west')}, enemy:{guard:unit('erE'),pursuit:unit('reserve')},
      sightings:{guard:{at:'erE',tick:-2}}, checked:{}, mainTrail:['camp'], screenTrail:['west'], wentWest:false, wentEast:false,
      log:[], event:'敌方渡口报告已经过时。先为主力或牵制分队画路线。', outcome:'active' };
  }

  function queue(s, command) {
    if(s.outcome!=='active') return false;
    if(s.rules>=2 && command.type==='pace' && ['swift','covered'].includes(command.value)) {
      s.pace=command.value; return true;
    }
    if(command.type==='route' && Object.hasOwn(s.squads,command.squad) && Array.isArray(command.path) && command.path.length<=16) {
      const u=s.squads[command.squad];
      let last=u.leg?.to || u.at;
      for(const id of command.path){ if(!destinations(last,command.squad).includes(id))return false; last=id; }
      u.route=[...command.path]; return true;
    }
    if(command.type==='scout' && s.scouts && crossing.has(command.at)) {
      s.scouts--; s.rumor={at:command.at,due:s.tick+(s.challenge?2:1)}; return true;
    }
    if(command.type==='feint' && s.squads.screen.at==='gulin' && !s.squads.screen.leg && !s.feintUsed) {
      s.feintAt=s.tick+1; s.feintUsed=true; return true;
    }
    return false;
  }

  function move(u, covered = false) {
    if(!u.leg && u.route.length){
      const to=u.route.shift(), way=edge(u.at,to), concealed=covered&&way[3]==='east'&&['erE','taiE'].includes(to);
      const duration=way[2]+(concealed?1:0);
      u.leg={from:u.at,to,left:duration,duration,concealed};
    }
    if(!u.leg) return null;
    const leg=u.leg;
    if(--leg.left>0)return {...leg,arrived:false};
    u.at=leg.to;u.leg=null;return {...leg,arrived:true};
  }

  function step(s) {
    if(s.outcome!=='active')return false;
    const events=[];
    s.tick++;s.supply--;
    if(s.feintAt===s.tick) {s.supply--;s.guardDue=s.tick+2;events.push('西侧活动被发现。渡口守军接到西调命令，预计两时段后开始移动。');}
    if(s.guardDue===s.tick){s.enemy.guard.route=['erW','gulin'];events.push('守军开始西调。调令已执行，渡口是否能走仍取决于双方到达时间。');}
    if(s.pursuitOrder?.due===s.tick){
      const target=s.pursuitOrder.target, pursuit=s.enemy.pursuit;
      pursuit.route=pursuit.at===target?[]:pursuit.at==='reserve'&&target==='ravine'?['pass','ravine']:[target];
      events.push(`截报：追兵收到暴露线索，正向${name(target)}搜寻。`);
      s.pursuitOrder=null;
    } else if(s.tick===(s.challenge?(s.rules>=2?6:7):8) && s.enemy.pursuit.at==='reserve' && !s.enemy.pursuit.route.length){
      s.enemy.pursuit.route=['pass'];events.push('截报：黔北追兵已向东岸山口机动。');
    }
    const enemyBefore=Object.fromEntries(Object.entries(s.enemy).map(([id,u])=>[id,u.at]));
    const enemyMoves=Object.fromEntries(Object.entries(s.enemy).map(([id,u])=>[id,move(u)]));
    const screen=s.feintAt===s.tick ? null : move(s.squads.screen);
    if(screen?.arrived)s.screenTrail.push(screen.to);
    if(screen?.arrived && screen.to==='gulin' && !s.feintUsed) events.push('牵制分队抵达古蔺方向，可以留下诱导迹象。');
    const m=s.squads.main;
    const covered=s.rules>=2&&s.pace==='covered';
    if(covered&&!m.leg&&edge(m.at,m.route[0])?.[3]==='east'&&['erE','taiE'].includes(m.route[0])){
      s.supply--;events.push('主力借地形隐蔽东渡，多用一时段并消耗一份补给。');
    }
    const main=move(m,covered);
    const contact=Object.entries(s.enemy).find(([id,u])=>u.at===m.at || (main && enemyMoves[id] && main.from===enemyMoves[id].to && main.to===enemyMoves[id].from));
    if(contact){
      const [id,u]=contact;s.readiness-=2;m.route=[];
      s.sightings[id]={at:u.at,tick:s.tick};
      if(main){m.at=main.from;m.leg=null;}
      events.push(`${titles[id]}在${name(enemyBefore[id])}一带与你接触。主力停止推进并折回来路，队伍状态 −2。`);
    } else if(main?.arrived){
      s.mainTrail.push(main.to);
      const way=edge(main.from,main.to);
      if(way[3]==='west' && main.to==='west')s.wentWest=true;
      if(way[3]==='east' && s.wentWest && ['erE','taiE'].includes(main.to)){
        s.wentEast=true;
        if(s.rules>=2 && !main.concealed && !s.crossingSpotted){
          s.crossingSpotted=true;
          s.pursuitOrder={due:s.tick+(s.challenge?1:2),target:main.to==='taiE'?'ravine':'pass'};
          events.push(`东渡动静暴露。追兵可能转向${name(s.pursuitOrder.target)}。`);
        }
      }
    }
    for(const [id,u] of Object.entries(s.enemy)){
      if(u.at===s.squads.screen.at || edge(m.at,u.at) && ['erW','erE','taiW','taiE'].includes(m.at))s.sightings[id]={at:u.at,tick:s.tick};
    }
    if(s.rumor?.due===s.tick){
      const at=s.rumor.at, nearby=Object.entries(s.enemy).filter(([,u])=>u.at===at || u.leg?.to===at);
      s.checked[at]=s.tick;
      for(const [id,u] of nearby)s.sightings[id]={at:u.at,tick:s.tick};
      events.push(`侦察回报：${name(at)}${nearby.length?`发现${nearby.map(([id])=>titles[id]).join('、')}`:'目前未见敌军'}。这是本时段的观察。`);
      s.rumor=null;
    }
    if(m.at==='exit' && s.wentEast && !contact && s.readiness>0 && s.supply>=0)s.outcome='won';
    else if(s.supply<=0 || s.readiness<=0)s.outcome='failed';
    if(s.outcome==='won')events.push('主力已越过赤水并抵达南下通道，仍保有后续行军能力。');
    if(s.outcome==='failed')events.push(s.readiness<=0?'主力已无力继续机动。':'补给耗尽，主力仍未抵达南下通道。');
    s.event=events.join(' ');
    s.log.push({tick:s.tick,at:m.at,event:s.event || `主力抵达或停留在${name(m.at)}。`,positions:Object.fromEntries(Object.entries(s.enemy).map(([id,u])=>[id,u.at]))});
    return true;
  }

  function restore(challenge, actions, rules = 2) {
    const s=create(challenge,rules);
    for(const action of actions){if(action.type==='step' ? !step(s) : !queue(s,action))break;}
    return s;
  }
  window.ChishuiManeuver={places,edges,titles,edge,destinations,crossing,create,queue,step,restore};
})();
