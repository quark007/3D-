/* 长征 Run · 全程推演 roguelike module. Teaching-fiction squad, abstract silhouettes only.
   Self-contained: style(), install() into #panelChallenges, no edits to existing files. */
window.LongMarchRun69={
  version:'69.0.1',
  owner(){return String(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:'default')+':'+!!window.MainlineDemo?.active;},
  store(){return typeof GameState!=='undefined'?GameState:window.GameState;},
  setHardcore(on){this.hardcore=!!on;},
  persist(){const g=this.store(),s=this.session;if(!g||!s||this._owner!==this.owner())return false;if(this._lastSaved&&g.run69===undefined){this.session=null;this._lastSaved=null;return false;}try{g.run69=JSON.parse(this.serialize(s));this._lastSaved=true;if(s.status!=='running'){const r=this.settle(s),key='run69_result';g.storyPreparations||={};if(!g.storyPreparations[key]||g.storyPreparations[key].score<r.score)g.storyPreparations[key]={score:r.score,rating:r.rating,won:r.won,spark:r.sparkOut,completedAt:new Date().toISOString()};}return g.save?.()!==false;}catch{return false;}},
  RULES:{marchCost:5,winFood:6,winMorale:6,winSpark:2,bossSpark:4,foodCap:120,moraleCap:100,foodStart:60,moraleStart:70,campPool:20,healCost:10},
  /* ---- adapter table: all dispatch is typeof-tolerant; missing engines skip their pool ---- */
  engines:{
    xjg:{mods:['XiangjiangGuard67'],node:{id:2},kind:'node',type:'battle',title:'血战湘江 · 掩护渡江',en:'XIANGJIANG GUARD',
      hist:'1934 年 11 月，中央红军在湘江战役中突破第四道封锁线，付出重大牺牲。'},
    sidu:{mods:['SiduBluff67'],node:{id:4},kind:'node',type:'battle',title:'四渡赤水 · 声东击西',en:'FOUR CROSSINGS',
      hist:'1935 年 1—3 月，中央红军四渡赤水，灵活机动摆脱敌军围堵。'},
    scout:{mods:['Scout67'],node:{id:5},kind:'node',type:'battle',title:'夜探渡口 · 巧渡金沙江',en:'NIGHT RECON',
      hist:'1935 年 5 月，红军巧渡金沙江，跳出重围。'},
    drum:{mods:['HuishiDrum67'],node:{id:12},kind:'node',type:'boss',title:'会师鼓 · 鼓动山河',en:'JUNCTION DRUM',
      hist:'1936 年 10 月，三大主力会师，长征胜利结束。'},
    snow:{mods:['SnowRun68'],node:{id:8},kind:'node',type:'battle',title:'雪山速降 · 一步不停',en:'SNOW RUN',
      hist:'1935 年 6 月，红军翻越夹金山等雪山，克服高寒与物资困难。'},
    lazikou:{mods:['Lazikou68'],node:{id:10},kind:'node',type:'boss',title:'腊子口 · 火力准备',en:'LAZIKOU PASS',
      hist:'1935 年 9 月，红军突破腊子口天险，继续向陕甘前进。'},
    wuqi:{mods:['Wuqi68'],node:{id:11},kind:'node',type:'boss',title:'吴起镇 · 落脚陕北',en:'WUQI TOWN',
      hist:'1935 年 10 月，中央红军到达陕北吴起镇。'},
    campfire:{mods:['Campfire68'],node:{id:9},kind:'node',type:'camp',title:'夜营守火种 · 松潘草地',en:'CAMPFIRE WATCH',
      hist:'1935 年 8 月，红军夜营草地，以篝火与哨位守护生命。'},
    grass:{mods:['GrasslandCollect'],node:9,kind:'result',type:'battle',title:'过草地 · 青稞采集',en:'FORAGE',
      hist:'1935 年 8 月，红军穿越松潘草地，以青稞充饥、挖野菜度荒。'},
    snipe:{mods:['Sniper1937'],node:2,kind:'result',type:'battle',title:'敌后狙击 · 1937（番外推演）',en:'SIDE OP 1937',
      hist:'番外教学推演：1937 年秋，红军改编八路军开赴华北前线。'}
  },
  engineOf(key){const def=this.engines[key];if(!def)return null;return def.mods.map(n=>globalThis[n]).find(m=>m&&typeof m.open==='function')||null;},
  pickEngine(prefs,used){for(const k of prefs){if(used.includes(k))continue;if(this.engineOf(k))return k;}for(const k of prefs){if(this.engineOf(k))return k;}return null;},
  /* ---- gate bypass: save originals, replace, caller restores in finally ---- */
  bypassGates(){
    const saved={};
    const R=typeof RouteMap!=='undefined'?RouteMap:null;
    if(R&&typeof R.isNodeLocked==='function'){saved.routeMap=R;saved.isNodeLocked=R.isNodeLocked;R.isNodeLocked=()=>false;}
    const N=typeof NpcStory!=='undefined'?NpcStory:null;
    if(N&&typeof N.unlocked==='function'){saved.npcStory=N;saved.unlocked=N.unlocked;N.unlocked=()=>true;}
    const C=typeof CoopHotseat66!=='undefined'?CoopHotseat66:null;
    if(C&&typeof C.active==='function'){saved.coop=C;saved.active=C.active;C.active=()=>false;}
    return saved;
  },
  restoreGates(saved){
    if(!saved)return;
    if(saved.routeMap&&saved.isNodeLocked)saved.routeMap.isNodeLocked=saved.isNodeLocked;
    if(saved.npcStory&&saved.unlocked)saved.npcStory.unlocked=saved.unlocked;
    if(saved.coop&&saved.active)saved.coop.active=saved.active;
  },
  /* dispatch: never calls completeDungeon; second arg is always our own callback */
  dispatch(engineKey,onWin){
    const def=this.engines[engineKey];if(!def)return false;
    const eng=this.engineOf(engineKey);if(!eng)return false;
    const state=this.session,owner=this.owner();let delivered=false;const ok=()=>{if(delivered||this.session!==state||owner!==this.owner())return;delivered=true;if(typeof onWin==='function')onWin();};
    const saved=this.bypassGates();
    try{
      const opened=def.kind==='result'?eng.open(def.node,r=>{if(r?.win===true)ok();}):eng.open({...def.node},r=>{if(r?.won!==false)ok();});if(opened===false)return false;
    }finally{this.restoreGates(saved);}
    return true;
  },
  /* ---- seeded rng ---- */
  rng(seed){let s=(Number(seed)>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};},
  /* ---- map: 3 chapters x 3 layers, 2-3 nodes each, every node reaches final boss ---- */
  buildMap(seed){
    const rand=this.rng(seed);
    const used=[];
    const plan=[
      {ch:0,battle:['xjg','sidu','scout','grass','snipe','snow']},
      {ch:0,battle:['sidu','xjg','scout','grass','snipe','snow'],camp:['campfire'],extra:true},
      {ch:0,boss:['scout','sidu','xjg','lazikou','drum','wuqi']},
      {ch:1,battle:['snow','grass','xjg','sidu','scout','snipe']},
      {ch:1,camp:['campfire'],battle:['grass','snow','xjg','sidu','scout','snipe']},
      {ch:1,boss:['lazikou','drum','wuqi','scout','sidu','xjg']},
      {ch:2,battle:['snipe','grass','snow','xjg','sidu','scout']},
      {ch:2,battle:['scout','sidu','xjg','snow','grass','snipe'],camp:['campfire'],extra:true},
      {ch:2,boss:['drum','wuqi','lazikou','scout','sidu','xjg']}
    ];
    const shuffle=arr=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
    const layers=plan.map((slot,L)=>{
      const nodes=[];
      const push=(type,engineKey)=>{
        const def=engineKey?this.engines[engineKey]:null;
        const titles={battle:'遭遇推演',event:'沿途见闻',camp:'夜营休整',boss:'关口推演'};
        const ens={battle:'SKIRMISH',event:'STORY',camp:'CAMP',boss:'CHECKPOINT'};
        nodes.push({uid:'n'+L+'-'+nodes.length,layer:L,chapter:slot.ch,type,engine:type==='event'?null:engineKey,
          title:def?def.title:titles[type],en:def?def.en:ens[type]});
      };
      if(slot.boss){
        const k1=this.pickEngine(slot.boss,used);if(k1)used.push(k1);
        const rest=slot.boss.filter(k=>k!==k1);
        const k2=this.pickEngine(rest,used);
        if(k1){push('boss',k1);push(k2?'boss':'event',k2);}
        else{push('event',null);push('event',null);}
      }else{
        if(slot.battle){const k=this.pickEngine(slot.battle,used);if(k)used.push(k);push(k?'battle':'event',k);}
        if(slot.camp){const k=this.pickEngine(slot.camp,used);if(k)used.push(k);push(k?'camp':'event',k);}
        push('event',null);
        if(slot.extra&&nodes.length<3&&rand()<.5)push('event',null);
      }
      return {chapter:slot.ch,nodes:shuffle(nodes)};
    });
    for(let L=0;L<layers.length-1;L++){
      const from=layers[L].nodes,to=layers[L+1].nodes;
      to.forEach(t=>{const f=from[Math.floor(rand()*from.length)];f.next=(f.next||[]);t.prev=(t.prev||[]);if(!f.next.includes(t.uid)){f.next.push(t.uid);t.prev.push(f.uid);}});
      from.forEach(f=>{if(!(f.next&&f.next.length)){const t=to[Math.floor(rand()*to.length)];f.next=[t.uid];t.prev=(t.prev||[]);if(!t.prev.includes(f.uid))t.prev.push(f.uid);}});
    }
    layers.forEach(l=>l.nodes.forEach(n=>{n.next=n.next||[];n.prev=n.prev||[];}));
    const chapters=[
      {name:'出发 · 突破封锁',en:'BREAKOUT 1934-35'},
      {name:'雪山草地',en:'SNOW & GRASSLAND 1935'},
      {name:'会师',en:'JUNCTION 1936'}
    ];
    return {seed:seed>>>0,chapters,layers,finalBoss:layers[layers.length-1].nodes[0].uid};
  },
  nodeOf(state,uid){for(const l of state.map.layers)for(const n of l.nodes)if(n.uid===uid)return n;return null;},
  defaultCrew(){return [
    {name:'冯战士',role:'突击手',state:'ready'},
    {name:'郑机枪手',role:'火力手',state:'ready'},
    {name:'秦卫生员',role:'救护员',state:'ready'},
    {name:'蒋炊事员',role:'炊事员',state:'ready'},
    {name:'周班长',role:'指挥员',state:'ready'}
  ];},
  EPITAPHS:[
    '他把干粮留给了战友，把火种留给了队伍。',
    '雪山记住了这副担架上的名字。',
    '篝火边，从此少了一双打草鞋的手。',
    '走出草地的那天，花名册上永远留着他的位置。',
    '他把步枪擦亮，交给了身边的战友。'
  ],
  newRun(seed){
    seed=Number.isFinite(Number(seed))?Number(seed)>>>0:(Date.now()>>>0);
    const map=this.buildMap(seed);
    const state={v:1,seed,status:'running',hardcore:this.hardcore===true||this.store()?.sparkMeta?.modifiers?.hardcore===true,map,
      current:{layer:0,uid:null,kind:'map'},
      choices:map.layers[0].nodes.map(n=>n.uid),
      crew:this.defaultCrew(),
      food:this.RULES.foodStart,morale:this.RULES.moraleStart,spark:0,
      lost:[],failCounts:{},cleared:[],usedCards:[],
      log:[{t:'start',text:'推演开始：1934 年金秋，教学虚构小队从中央苏区出发。'}]};
    this._owner=this.owner();this._lastSaved=null;this.session=state;return state;
  },
  startNode(state,uid){
    if(!state||state.status!=='running')return null;
    if(!state.choices.includes(uid))return null;
    const node=this.nodeOf(state,uid);if(!node)return null;
    state.current={layer:node.layer,uid,kind:node.type};
    return node;
  },
  advance(state){
    if(!state.current.uid)return {done:false};
    if(!state.cleared.includes(state.current.uid))state.cleared.push(state.current.uid);
    const outgoing=this.nodeOf(state,state.current.uid)?.next||[];const last=state.current.layer>=state.map.layers.length-1;
    state.current.uid=null;
    if(last){state.status='won';state.current={layer:state.map.layers.length-1,uid:null,kind:'settle'};state.choices=[];
      state.log.push({t:'end',text:'三大主力会师——推演通关（据党史出版物记载：1936 年 10 月）。'});return {done:true};}
    state.current.layer+=1;
    state.choices=state.map.layers[state.current.layer].nodes.filter(n=>outgoing.includes(n.uid)).map(n=>n.uid);
    state.food=Math.max(0,state.food-this.RULES.marchCost);
    if(state.food===0)state.morale=Math.max(0,state.morale-4);
    return {done:false};
  },
  takeCasualty(state,attempt){
    const ready=state.crew.find(c=>c.state==='ready');
    if(attempt<=1&&ready){ready.state='wounded';state.morale=Math.max(0,state.morale-4);return {member:ready,kind:'wound'};}
    const victim=state.crew.find(c=>c.state==='wounded')||ready;
    if(!victim)return null;
    victim.state='lost';
    state.lost.push({name:victim.name,line:this.EPITAPHS[state.lost.length%this.EPITAPHS.length]});
    state.morale=Math.max(0,state.morale-8);
    return {member:victim,kind:'loss'};
  },
  resolveBattle(state,won){
    if(!state||state.status!=='running')return {type:'idle'};
    const node=this.nodeOf(state,state.current.uid);
    if(!node)return {type:'idle'};
    if(won){
      state.food=Math.min(this.RULES.foodCap,state.food+this.RULES.winFood);
      state.morale=Math.min(this.RULES.moraleCap,state.morale+this.RULES.winMorale);
      state.spark+=node.type==='boss'?this.RULES.bossSpark:this.RULES.winSpark;
      state.log.push({t:'win',text:`「${node.title}」推演成功。`});
      this.advance(state);
      return {type:'win',node:node.title};
    }
    const attempt=(state.failCounts[node.uid]||0)+1;
    state.failCounts[node.uid]=attempt;
    const hit=this.takeCasualty(state,attempt);
    const name=hit?hit.member.name:'';
    if(hit&&hit.kind==='loss')state.log.push({t:'loss',text:`「${node.title}」再次受挫，${name} 长眠于征途。`});
    else state.log.push({t:'wound',text:`「${node.title}」推演受挫，${name} 重伤。`});
    if(state.crew.every(c=>c.state==='lost')){
      state.status='dead';
      state.log.push({t:'wipe',text:'小队全员失去行动能力，推演结束。'});
      return {type:'wipe',name};
    }
    if(state.hardcore)this.advance(state);return {type:hit&&hit.kind==='loss'?'loss':'wound',name};
  },
  drawCard(state,rand){
    const pool=this.eventCards();if(!pool.length)return null;
    let list=pool.filter(c=>!state.usedCards.includes(c.id));
    if(!list.length){state.usedCards=[];list=pool;}
    const r=typeof rand==='function'?rand:Math.random;
    const card=list[Math.floor(r()*list.length)%list.length];
    state.usedCards.push(card.id);
    return card;
  },
  applyEventChoice(state,card,idx){
    const ch=card&&Array.isArray(card.choices)?card.choices[idx]:null;
    if(!ch)return null;
    const e=ch.effect||{};
    state.food=Math.max(0,Math.min(this.RULES.foodCap,state.food+(Number(e.food)||0)));
    state.morale=Math.max(0,Math.min(this.RULES.moraleCap,state.morale+(Number(e.morale)||0)));
    state.spark=Math.max(0,state.spark+(Number(e.spark)||0));
    const cured=[];
    for(let i=0;i<(Number(e.cure)||0);i++){
      const w=state.crew.find(c=>c.state==='wounded');
      if(!w)break;w.state='ready';cured.push(w.name);
    }
    state.log.push({t:'event',text:`「${card.title}」${ch.reply||''}`});
    return {cured};
  },
  applyCamp(state,alloc){
    const pool=Math.min(this.RULES.campPool,state.food);
    const cl=n=>Math.max(0,Math.min(pool,Math.round(Number(n)||0)));
    let heal=cl(alloc&&alloc.heal),stamina=cl(alloc&&alloc.stamina),reserve=cl(alloc&&alloc.reserve);
    let over=heal+stamina+reserve-pool;
    if(over>0){const c1=Math.min(reserve,over);reserve-=c1;over-=c1;}
    if(over>0){const c2=Math.min(stamina,over);stamina-=c2;over-=c2;}
    if(over>0){heal-=over;over=0;}
    state.food=Math.max(0,state.food-(heal+stamina));
    const cured=[];
    const cures=Math.floor(heal/this.RULES.healCost);
    for(let i=0;i<cures;i++){
      const w=state.crew.find(c=>c.state==='wounded');
      if(!w)break;w.state='ready';cured.push(w.name);
    }
    const gain=Math.floor(stamina/5)*2;
    state.morale=Math.min(this.RULES.moraleCap,state.morale+gain);
    state.log.push({t:'camp',text:`夜营休整：救治 ${heal} 份、体力 ${stamina} 份、储备 ${reserve} 份。${cured.length?'治好了 '+cured.join('、')+'。':''}`});
    return {healed:cured,moraleGain:gain,consumed:heal+stamina,reserve};
  },
  settle(state){
    const alive=state.crew.filter(c=>c.state!=='lost').length;
    const wounded=state.crew.filter(c=>c.state==='wounded').length;
    const won=state.status==='won';
    const total=state.map.layers.reduce((a,l)=>a+l.nodes.length,0);
    const score=Math.min(100,Math.max(0,Math.round(won
      ?45+state.morale*.35+state.spark*2+alive*6-wounded*2
      :15+state.spark*2+state.morale*.1+alive*2)));
    const rating=won?(score>=88?'三军过后尽开颜':score>=70?'会师凯旋':'星火抵达'):'星火不熄 · 未竟之路';
    const lostLine='本局你失去了：'+(state.lost.length?state.lost.map(l=>l.name).join('、'):'无');
    const report=[lostLine,
      `途经推演 ${state.cleared.length} / ${total} 处。`,
      `小队：${alive-wounded} 人可行动、${wounded} 人重伤、${state.lost.length} 人牺牲。`,
      `剩余干粮 ${state.food} 份 · 队伍士气 ${state.morale} · 携行火种 ${state.spark}。`,
      won?'据党史出版物记载：1936 年 10 月，三大主力会师，长征胜利结束。':'推演虽止，火种仍在——每一次讲述都是继续。'];
    for(const l of state.lost)report.push(`${l.name}——${l.line}`);
    report.push('本模块为教学虚构推演：小队为抽象剪影，不对应真实个人；选择不改变真实历史。');
    return {score,rating,report,sparkOut:Math.round(state.spark+(won?10:0)),won,alive,wounded,lostCount:state.lost.length};
  },
  serialize(state){return JSON.stringify(state);},
  deserialize(str){
    try{const s=JSON.parse(str);
      if(!s||typeof s!=='object'||!s.map||!Array.isArray(s.map.layers)||s.map.layers.length!==9||!Array.isArray(s.map.chapters)||s.map.chapters.length!==3||!Array.isArray(s.crew)||s.crew.length!==5||!Array.isArray(s.lost)||!['running','won','dead'].includes(s.status))return null;
      if(!s.map.layers.every((l,i)=>Array.isArray(l.nodes)&&l.nodes.length>=2&&l.nodes.length<=3&&l.nodes.every(n=>n.layer===i&&typeof n.uid==='string'&&n.uid.length<50&&typeof n.title==='string'&&n.title.length<200&&Array.isArray(n.next)&&Array.isArray(n.prev)&&['battle','event','camp','boss'].includes(n.type))))return null;
      if(!s.current||!Number.isInteger(s.current.layer)||s.current.layer<0||s.current.layer>8||!Array.isArray(s.choices)||!Array.isArray(s.cleared)||!Array.isArray(s.usedCards)||!Array.isArray(s.log)||s.log.length>500||!s.failCounts||typeof s.failCounts!=='object')return null;
      if(!s.crew.every(c=>['ready','wounded','lost'].includes(c.state)&&typeof c.name==='string'&&c.name.length<40))return null;
      if(!['food','morale','spark'].every(k=>Number.isFinite(s[k])&&s[k]>=0&&s[k]<=100000))return null;
      const ids=new Set(s.map.layers.flatMap(l=>l.nodes.map(n=>n.uid)));if(ids.size!==s.map.layers.reduce((n,l)=>n+l.nodes.length,0)||s.choices.some(id=>!ids.has(id))||s.current.uid!==null&&!ids.has(s.current.uid))return null;
      return s;
    }catch{return null;}
  },
  /* ---- event cards: 2-3 choices each, effects = food/morale/crew/spark ---- */
  extraCards:[],
  BASE_CARDS:[
    {id:'beizia',title:'半条被子 · 沙洲村',en:'HALF A QUILT',kind:'史实',note:'据党史出版物记载',
     text:'1934 年 11 月，队伍夜宿湖南汝城沙洲村。女红军借宿徐解秀家，见主家只有一件蓑衣挡寒，临别时把仅有的被子剪开，留下半条。',
     choices:[
      {label:'剪开被子，留下半条',effect:{morale:8,food:-2},reply:'「红军是共产党领导的队伍，有被子也要留给老百姓半条。」'},
      {label:'把随身的辣椒面留给主家御寒',effect:{morale:5,food:-3},reply:'主家攥着辣椒面，把队伍送出村口。'},
      {label:'留下铜板，约定革命再见',effect:{morale:4,spark:1},reply:'铜板压在桌角，约定写进了岁月里。'}]},
    {id:'yugou',title:'金色的鱼钩',en:'GOLDEN FISH HOOK',kind:'课文文学改编',note:'课文文学改编 · 据党史出版物记载',
     text:'过草地时，老班长用缝衣针弯成鱼钩钓鱼，把鱼汤留给伤病员，自己嚼草根、咽鱼骨，守住「把人带出草地」的承诺。',
     choices:[
      {label:'把鱼汤端给重伤的战友',effect:{cure:1,morale:4},reply:'伤员喝下热汤，队伍多了一双能走路的脚。'},
      {label:'全队分着喝，谁也不许多让',effect:{morale:6,food:2},reply:'一碗汤转了一圈，人人只抿一小口。'},
      {label:'连夜再磨一枚鱼钩',effect:{food:5},reply:'第二枚鱼钩天亮前下了水。'}]},
    {id:'huaichai',title:'七根火柴',en:'SEVEN MATCHES',kind:'课文文学改编',note:'课文文学改编 · 据党史出版物记载',
     text:'暴雨倾泻的草地上，一位无名战士用党证包着七根火柴护在胸口，托付给战友后安然闭上了眼睛。',
     choices:[
      {label:'一根一根数着用，火种交给全队',effect:{spark:3,morale:4},reply:'七根火柴在篝火旁传成一圈光。'},
      {label:'先烤干伤员湿透的绑腿',effect:{cure:1,spark:1},reply:'火苗先暖了伤员的脚，再暖了全队的排头。'}]},
    {id:'fengbei',title:'丰碑 · 军需处长',en:'MONUMENT',kind:'课文文学改编',note:'课文文学改编 · 据党史出版物记载',
     text:'掌管棉衣的军需处长把冬衣一件件发出去，自己穿着单衣守在风雪里，成为云中山上的一座丰碑。',
     choices:[
      {label:'把最后一件棉衣送到哨位',effect:{morale:10},reply:'哨位上的战士接过了棉衣，也接过了那份分量。'},
      {label:'连夜为全队赶打草绳裹脚',effect:{morale:5,food:-2},reply:'一捆捆草绳传下去，脚上的热气多了一层。'}]},
    {id:'laoshanjie',title:'老山界 · 夜翻大山',en:'OLD MOUNTAIN PASS',kind:'课文文学改编',note:'课文文学改编 · 据党史出版物记载',
     text:'悬崖上的之字形火把一路排到天上，队伍就在半山一尺多宽的路上睡觉，半夜冷醒，再向上走。',
     choices:[
      {label:'点燃火把，轮流唱歌壮气',effect:{morale:6},reply:'歌声在山谷里一层层递了上去。'},
      {label:'静默缓行，节省灯油',effect:{food:-2,morale:3,spark:1},reply:'队伍贴着崖壁，一步一步挪过了隘口。'}]},
    {id:'ganliang',title:'一袋干粮',en:'A BAG OF RATIONS',kind:'课文文学改编',note:'课文文学改编 · 据党史出版物记载',
     text:'小红军的干粮袋被磨破，粮食悄悄掉进河里，她瞒着大家采野菜充饥，脸色一天天发白。',
     choices:[
      {label:'把干粮匀一份给她，不许推辞',effect:{morale:7,food:-2,cure:1},reply:'她说什么也不要，最后收下了半把青稞面。'},
      {label:'教全队认野菜，掺着青稞面吃',effect:{food:4},reply:'一锅野菜汤，全队都添了半碗。'}]},
    {id:'yihai',title:'彝海结盟',en:'YIHAI ALLIANCE',kind:'史实',note:'据党史出版物记载',
     text:'1935 年 5 月，刘伯承与果基小叶丹在彝海边歃血为盟，红军沿途宣传民族平等，顺利通过彝区。',
     choices:[
      {label:'以诚相待，按盟约过境',effect:{morale:8,food:2},reply:'彝家兄弟护送队伍，一路引路到岔口。'},
      {label:'留下工作团，宣传民族平等',effect:{spark:2,morale:4},reply:'海子边的火堆成了长久的记忆。'}]},
    {id:'zunyi',title:'遵义会议 · 转折',en:'ZUNYI CONFERENCE',kind:'史实',note:'据党史出版物记载',
     text:'1935 年 1 月，会议在深夜的油灯下结束，队伍重新明确了前进的方向，成为党的历史上生死攸关的转折点。',
     choices:[
      {label:'组织整训，传达会议精神',effect:{morale:10,spark:1},reply:'方向明确了，脚步也齐了。'},
      {label:'轻装再出发，掩埋多余辎重',effect:{food:3,morale:2},reply:'背上的分量轻了，心里的方向重了。'}]},
    {id:'nitan',title:'草地泥潭',en:'BOG CROSSING',kind:'史实',note:'据党史出版物记载',
     text:'草地深处泥潭无边，向导叮嘱：原地踏步会越陷越深，结组互拉才过得去。',
     choices:[
      {label:'结绳成组，互相拉拽',effect:{morale:4,food:-2},reply:'绳子把每个人的命拴在了一起。'},
      {label:'绕行远路，多走一天',effect:{food:-4,morale:2},reply:'多走一天，少踏一片险滩。'}]},
    {id:'qingke',title:'青稞收割',en:'BARLEY HARVEST',kind:'史实',note:'据党史出版物记载',
     text:'地里青稞已熟。红军按市价留下银元与借条，才开镰收割——借条上写着「革命胜利后照数归还」。',
     choices:[
      {label:'细收细打，颗粒归袋',effect:{food:6},reply:'粮袋沉了，行军的底气也足了。'},
      {label:'先给重伤员熬青稞糊',effect:{food:3,cure:1},reply:'稠稠的一碗青稞糊，先端到伤员面前。'}]},
    {id:'jiajinshan',title:'夹金山风雪',en:'JIAJIN MOUNTAIN',kind:'史实',note:'据党史出版物记载',
     text:'六月飞雪，山风卷着冰碴。老乡叮嘱：上午翻山，不许停留，一坐下去就再也起不来。',
     choices:[
      {label:'按老乡说的时辰强越',effect:{morale:4,food:-3,spark:1},reply:'正午的山口，队伍一个不少地翻了过去。'},
      {label:'挖雪洞暂避风头',effect:{food:-1,morale:1},reply:'雪洞里挤了一夜，天亮继续走。'}]},
    {id:'kuaiban',title:'宣传队快板',en:'FRONT CLAPPERS',kind:'史实',note:'据党史出版物记载',
     text:'宣传员把行军编成快板，一声「同志哥，加把劲」，队伍的脚步立刻齐了三分。',
     choices:[
      {label:'跟着快板齐声唱起来',effect:{morale:6,spark:1},reply:'竹板一响，歌声压过了风声。'},
      {label:'把快板词教给新战士',effect:{morale:4},reply:'新战士学会的第一课是打快板。'}]},
    {id:'daduhe',title:'强渡大渡河',en:'DADU RIVER',kind:'史实',note:'据党史出版物记载',
     text:'1935 年 5 月，十七勇士分乘木船，在弹雨中抢渡安顺场，为继续前进打开通道。',
     choices:[
      {label:'组织火力掩护渡河',effect:{spark:2,morale:6},reply:'对岸滩头插上了红旗。'},
      {label:'动员船工，连夜摆渡',effect:{food:2,morale:3,spark:1},reply:'老船工把舵，一夜往返了七趟。'}]},
    {id:'luding',title:'飞夺泸定桥',en:'LUDING BRIDGE',kind:'史实',note:'据党史出版物记载',
     text:'红四团昼夜兼程二百四十里，冒着桥头火光夺下铁索桥，夺取了渡河通道。',
     choices:[
      {label:'昼夜兼程，抢先夺桥',effect:{spark:3,food:-4,morale:5},reply:'草鞋磨穿了底，铁索留住了路。'},
      {label:'扎筏另寻渡口',effect:{food:-2,morale:2},reply:'稳扎稳打，另辟一条水路。'}]},
    {id:'gouhuo',title:'篝火晚会 · 草地之夜',en:'BONFIRE NIGHT',kind:'史实',note:'据党史出版物记载',
     text:'篝火旁，战士们把皮带煮成汤，互相讲家乡的故事，把明天的路讲亮了一点。',
     choices:[
      {label:'讲一个苏区秋收的故事',effect:{morale:8},reply:'故事讲完，篝火也更旺了。'},
      {label:'把最后一把青稞面捐给伤员灶',effect:{food:-3,morale:5,cure:1},reply:'伤员灶上多了一碗糊糊。'}]},
    {id:'loushanguan',title:'娄山关西风',en:'LOUSHAN PASS',kind:'史实',note:'据党史出版物记载',
     text:'「雄关漫道真如铁，而今迈步从头越。」词里写的，正是脚下这条要走第二遍的路。',
     choices:[
      {label:'齐诵《忆秦娥·娄山关》',effect:{morale:5,spark:1},reply:'西风烈，长空雁叫，队伍再上关口。'},
      {label:'再查一遍装备与草鞋',effect:{morale:3},reply:'绳绳结结都重新打过，翻山不出岔子。'}]},
    {id:'qingzhuang',title:'轻装令',en:'LIGHTEN THE LOAD',kind:'史实',note:'据党史出版物记载',
     text:'湘江之后部队下令：能背的背，能舍的舍。笨重的机器沉入江底，脚步却轻快起来。',
     choices:[
      {label:'销毁笨重机器，轻装前进',effect:{morale:2,food:2,spark:1},reply:'辎重沉了江，速度提了起来。'},
      {label:'把辎重托付给可靠老乡',effect:{morale:4,food:1},reply:'老乡拍着胸口：东西在，人在。'}]},
    {id:'hongqi',title:'缝一面红旗',en:'SEWING A FLAG',kind:'史实',note:'据党史出版物记载',
     text:'听说前方就要会师，卫生员连夜缝了一面小红旗，针脚密得像要把心愿缝进去。',
     choices:[
      {label:'把红旗传给前锋班',effect:{morale:6,spark:2},reply:'红旗插在排头，全队都看见了。'},
      {label:'把它拆成五条绑腿，人手一条',effect:{morale:8,spark:1},reply:'一条绑腿一份念想，谁也不掉队。'}]}
  ],
  registerEventCards(arr){
    if(!Array.isArray(arr))return 0;
    let added=0;
    const ids=new Set(this.BASE_CARDS.concat(this.extraCards).map(c=>c.id));
    for(const c of arr){
      if(!c||typeof c.id!=='string'||!c.id||typeof c.title!=='string'||!c.title)continue;
      if(!Array.isArray(c.choices)||c.choices.length<2||c.choices.length>3)continue;
      if(!c.choices.every(ch=>ch&&typeof ch.label==='string'))continue;
      if(ids.has(c.id))continue;
      this.extraCards.push({id:c.id,title:c.title,en:c.en||'CUSTOM EVENT',kind:c.kind||'教师自定义',
        note:c.note||'据党史出版物记载',text:c.text||'',choices:c.choices.map(ch=>({label:ch.label,effect:ch.effect||{},reply:ch.reply||''}))});
      ids.add(c.id);added++;
    }
    return added;
  },
  eventCards(){return this.BASE_CARDS.concat(this.extraCards);},
  /* ---- settlement is data-only; UI reads settle() ---- */
  /* ================= UI ================= */
  style(){
    if(typeof document==='undefined'||document.getElementById('run69-style'))return;
    const el=document.createElement('style');el.id='run69-style';el.textContent=`
    .run69-dialog{box-sizing:border-box;width:min(1080px,96vw);max-height:94dvh;margin:auto;padding:0;background:rgba(16,17,20,.96);color:#e8e6df;border:1px solid #4a4d52;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .run69-dialog::backdrop{background:rgba(5,7,10,.88)}
    .run69-dialog header{position:sticky;top:0;z-index:2;display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #2a2d31;background:#131519}
    .run69-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;letter-spacing:.02em;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .run69-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.14em;color:#8b8e93;text-transform:uppercase}
    .run69-body{padding:12px 18px 18px}
    .run69-panel{position:relative;background:rgba(20,22,26,.82);border:1px solid #4a4d52;padding:12px 14px 12px 17px;margin:0 0 10px;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
    .run69-panel::before{content:'';position:absolute;left:0;top:12px;bottom:0;width:3px;background:#ffcf24}
    .run69-k{display:block;font-size:14px;font-weight:700;color:#f2f0e9;letter-spacing:.03em}
    .run69-e{display:block;font-size:9px;letter-spacing:.14em;color:#8b8e93;text-transform:uppercase;margin-top:1px}
    .challenge-item.run69-entry .run69-k{font:600 15px/1.5 SimSun,serif;color:#352e23}
    .challenge-item.run69-entry .run69-e{color:#97372a}
    .challenge-item.run69-entry .run69-note{color:#7a6f57}
    .run69-hud{display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;margin-bottom:10px}
    .run69-hud span{background:#14171a;border:1px solid #2a2d31;border-left:3px solid #4a4d52;border-radius:2px;padding:4px 12px;font-variant-numeric:tabular-nums;letter-spacing:.03em;color:#d5d8d2;font-size:13px;min-height:38px;display:inline-flex;flex-direction:column;justify-content:center}
    .run69-hud span b{color:#ffcf24;font-weight:700;font-variant-numeric:tabular-nums}
    .run69-hud span[data-accent]{border-left-color:#ffcf24}
    .run69-hud span[data-warn]{color:#ff8d75;border-color:#6a3a30;border-left-color:#ff8d75}
    .run69-crew{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
    .run69-crew .run69-mate{display:inline-flex;gap:8px;align-items:center;background:#14171a;border:1px solid #2a2d31;border-radius:2px;padding:5px 10px;min-height:44px}
    .run69-crew svg{width:26px;height:26px;stroke:#8b8e93;fill:none;stroke-width:2.4}
    .run69-crew .run69-mate[data-wounded]{border-color:#6a5a30}.run69-crew .run69-mate[data-wounded] svg{stroke:#dcb04a}
    .run69-crew .run69-mate[data-lost]{opacity:.55;border-color:#5a2c26}.run69-crew .run69-mate[data-lost] svg{stroke:#8a544c}
    .run69-crew small{display:block;font-size:10px;color:#8b8e93;letter-spacing:.1em;text-transform:uppercase}
    .run69-chapters{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}
    .run69-chapter{background:rgba(20,22,26,.6);border:1px solid #2a2d31;padding:10px}
    .run69-layer{margin:0 0 10px}
    .run69-layer:last-child{margin-bottom:0}
    .run69-layer-k{display:flex;gap:6px;align-items:baseline;margin-bottom:5px}
    .run69-layer-k .run69-e{display:inline;margin:0}
    .run69-node{display:flex;gap:8px;align-items:center;width:100%;box-sizing:border-box;min-height:44px;text-align:left;font:inherit;font-size:13px;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:7px 10px;margin:0 0 5px;cursor:pointer;transition:border-color .12s ease,background .12s ease;touch-action:manipulation}
    .run69-node:hover:not(:disabled){background:#22262b;border-color:#ffcf24}
    .run69-node:disabled{opacity:.38;cursor:default}
    .run69-node em{font-style:normal;font-size:10px;letter-spacing:.1em;color:#8b8e93;text-transform:uppercase}
    .run69-node[data-type=battle] em{color:#d5b06a}
    .run69-node[data-type=boss] em{color:#ff8d75}
    .run69-node[data-type=camp] em{color:#9fc98a}
    .run69-node[data-avail]{border-color:#ffcf24;background:#1e1f18}
    .run69-node[data-done]{opacity:.55}
    .run69-node[data-done]::after{content:'✓';margin-left:auto;color:#9fd08a}
    .run69-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:9px;margin:8px 0}
    .run69-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .run69-dialog button{font:inherit;font-size:14px;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 14px;min-height:44px;cursor:pointer;letter-spacing:.04em;transition:background .12s ease,border-color .12s ease;touch-action:manipulation}
    .run69-dialog button:hover:not(:disabled){background:#22262b;border-color:#6a6e74}
    .run69-dialog button:disabled{opacity:.4;cursor:default}
    .run69-dialog button[data-start]{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .run69-dialog button[data-start]:hover:not(:disabled){background:#ffd95c;border-color:#ffd95c}
    .run69-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .run69-note{font-size:12px;color:#8f948d}
    .run69-cardtext{margin:6px 0;font-size:14px;color:#d5d8d2}
    .run69-srcline{font-size:11px;color:#8b8e93;border-top:1px dashed #2a2d31;padding-top:6px;margin-top:8px}
    .run69-choices{display:flex;flex-direction:column;gap:6px;margin-top:10px}
    .run69-choices button{text-align:left}
    .run69-slider{display:grid;grid-template-columns:96px 1fr 56px;gap:10px;align-items:center;margin:8px 0}
    .run69-slider input[type=range]{width:100%;min-height:44px;accent-color:#ffcf24;touch-action:none}
    .run69-slider output{font-variant-numeric:tabular-nums;color:#ffcf24;text-align:right}
    .run69-score{font-size:clamp(30px,5vw,44px);font-weight:700;color:#ffcf24;font-variant-numeric:tabular-nums;line-height:1.1}
    .run69-report{list-style:none;margin:8px 0;padding:0}
    .run69-report li{padding:5px 0 5px 10px;border-left:2px solid #2a2d31;margin:0 0 4px;color:#d5d8d2;font-size:14px}
    .run69-report li[data-lost-line]{border-left-color:#c8503f;color:#ffb3a6}
    .run69-ember{vertical-align:middle}
    .run69-dialog [hidden]{display:none!important}
    .challenge-item.run69-entry{position:relative;display:flex;gap:12px;align-items:center;cursor:pointer;background:#f6efdd;border:1px solid #b9ac8d;border-radius:0;padding:12px 14px 12px 17px;margin:0 0 10px;transition:border-color .12s ease,background .12s ease,transform .12s ease}
    .challenge-item.run69-entry::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:#97372a}
    .challenge-item.run69-entry:hover,.challenge-item.run69-entry:focus-visible{border-color:#97372a;background:#fbf4e4;transform:translateY(-2px);box-shadow:0 5px 14px rgba(83,62,38,.18)}
    .challenge-item.run69-entry .run69-entry-icon{flex:0 0 auto}
    @keyframes run69-pulse{0%,100%{opacity:.75}50%{opacity:1}}
    .run69-anim{animation:run69-pulse 2.4s ease-in-out infinite}
    @media(prefers-reduced-motion:reduce){.run69-anim{animation:none}.challenge-item.run69-entry:hover,.challenge-item.run69-entry:focus-visible{transform:none}.run69-dialog button,.challenge-item.run69-entry{transition:none}}
    @media(max-width:720px){.run69-chapters{grid-template-columns:1fr}.run69-slider{grid-template-columns:84px 1fr 48px}}
    `;
    document.head.append(el);
  },
  ember(canvas){
    if(typeof document==='undefined')return {stop(){}};
    const ctx=canvas.getContext&&canvas.getContext('2d');if(!ctx)return {stop(){}};
    const w=canvas.width||44,h=canvas.height||30,dpr=Math.min(2,typeof devicePixelRatio==='number'?devicePixelRatio:1);
    if(dpr>1){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);}
    let raf=0,last=0,parts=[],t=0;
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paint=dt=>{
      ctx.clearRect(0,0,w,h);
      ctx.fillStyle='#191c20';ctx.fillRect(0,0,w,h);
      t+=dt;
      if(!reduced&&dt>0&&Math.random()<dt*14)parts.push({x:w/2+(Math.random()-.5)*8,y:h-4,vy:-14-Math.random()*22,vx:(Math.random()-.5)*10,life:1});
      ctx.fillStyle='#ffcf24';ctx.beginPath();ctx.ellipse(w/2,h-4,5,7+Math.sin(t*5)*1.2,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,143,117,.5)';ctx.beginPath();ctx.ellipse(w/2,h-3,2.4,3.4,0,0,Math.PI*2);ctx.fill();
      for(const p of parts){p.life-=dt*1.1;p.x+=p.vx*dt;p.y+=p.vy*dt;ctx.fillStyle='rgba(255,207,36,'+Math.max(0,p.life).toFixed(2)+')';ctx.fillRect(p.x,p.y,2,2);}
      parts=parts.filter(p=>p.life>0);
    };
    if(reduced){paint(0);return {stop(){}};}
    const frame=now=>{if(!canvas.isConnected)return;const dt=Math.max(0,Math.min(.1,(now-last)/1000));last=now;paint(dt);raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);
    return {stop(){cancelAnimationFrame(raf);}};
  },
  install(){
    if(this._installed)return;this._installed=true;
    this.style();
    const tryInsert=()=>{
      if(typeof document==='undefined')return;
      const panel=document.getElementById('panelChallenges');if(!panel)return;
      if(panel.querySelector('[data-run69-entry]'))return;
      const card=document.createElement('div');
      card.className='challenge-item run69-entry';card.setAttribute('data-run69-entry','1');
      card.setAttribute('role','button');card.tabIndex=0;
      card.setAttribute('aria-label','长征 Run 全程推演：打开肉鸽模式');
      card.innerHTML='<span class="run69-entry-icon"><canvas class="run69-ember" width="44" height="30" aria-hidden="true"></canvas></span>'
        +'<span><span class="run69-k">长征 Run · 全程推演</span>'
        +'<span class="run69-e">Full March Roguelike · Campaign Run</span>'
        +'<span class="run69-note">三段征程 · 每层择路而行 · 战斗失败减员，全队走完即为通关（教学虚构推演）。</span></span>';
      const run=()=>this.open();
      card.onclick=run;
      card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
      panel.prepend(card);
      const cv=card.querySelector('canvas');
      if(cv)this.ember(cv);
    };
    tryInsert();
    let pending=false;
    this.observer=new MutationObserver(()=>{
      if(pending)return;pending=true;
      (typeof requestAnimationFrame==='function'?requestAnimationFrame:fn=>setTimeout(fn,0))(()=>{pending=false;tryInsert();});
    });
    this.observer.observe(document.body,{childList:true,subtree:true});
  },
  open(){
    if(typeof document==='undefined')return;
    this.style();
    if(this.dialog&&this.dialog.isConnected){this.render();return;}
    const dialog=document.createElement('dialog');
    dialog.className='run69-dialog';dialog.setAttribute('aria-labelledby','run69-title');
    dialog.innerHTML='<header><div><h2 id="run69-title">长征 Run · 全程推演</h2>'
      +'<p class="run69-sub">Full March Roguelike · Teaching Deduction</p></div>'
      +'<button type="button" data-close>关闭 · Esc</button></header><div class="run69-body" data-body></div>';
    document.body.append(dialog);
    dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    dialog.querySelector('[data-close]').onclick=()=>this.close();
    this.dialog=dialog;this.ui={view:'map',card:null,lastResult:null,camp:{heal:0,stamina:0,reserve:0}};
    if(this._owner!==this.owner()||this._lastSaved&&this.store()?.run69===undefined)this.session=null;
    const saved=this.store()?.run69,restored=saved?this.deserialize(JSON.stringify(saved)):null;
    if(!this.session&&restored){this.session=restored;this._owner=this.owner();if(restored.current.uid){restored.choices=[restored.current.uid];restored.current.uid=null;}}
    if(!this.session)this.newRun();
    dialog.showModal();
    this.render();
  },
  close(){
    this.persist();if(this.dialog){this.dialog.remove();this.dialog=null;}
    if(this.ui&&this.emberStop){this.emberStop.stop();this.emberStop=null;}
  },
  /* ---------- rendering ---------- */
  el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;},
  TYPE_K:{battle:'战斗',event:'事件',camp:'营地',boss:'关口'},
  TYPE_EN:{battle:'BATTLE',event:'EVENT',camp:'CAMP',boss:'BOSS'},
  render(){
    if(!this.dialog)return;
    const body=this.dialog.querySelector('[data-body]');if(!body)return;
    body.replaceChildren();
    if(this._owner!==this.owner()){this.close();this.session=null;return;}this.persist();
    const s=this.session;if(!s){body.append(this.el('p','run69-note','推演尚未开始。'));return;}
    if(s.status!=='running'){this.renderSettle(body);return;}
    body.append(this.renderHud(s));
    const view=this.ui.view;
    if(view==='battle')this.renderBattle(body,s);
    else if(view==='event')this.renderEvent(body,s);
    else if(view==='camp')this.renderCamp(body,s);
    else this.renderMap(body,s);
    body.append(this.renderStatus());
  },
  statusText(){
    const lr=this.ui.lastResult;
    if(lr){
      if(lr.type==='win')return `「${lr.node}」推演成功，队伍继续前进。`;
      if(lr.type==='auto')return '引擎未加载，本节点按教学推演自动通过。';
      if(lr.type==='wound')return `推演受挫：${lr.name} 重伤。同房间再次失败将有人牺牲。`;
      if(lr.type==='loss')return `推演再次受挫：${lr.name} 牺牲了。${'本局你失去了：'+lr.name}`;
      if(lr.type==='wipe')return '小队全员失去行动能力，推演结束。';
    }
    const s=this.session;
    if(s&&s.status==='running'&&s.current.uid===null)return '选择本层要前往的节点。每层择路而行，最终抵达会师关口。';
    return '按提示继续推演。';
  },
  renderStatus(){
    const p=this.el('p','run69-status',this.statusText());
    p.setAttribute('role','status');p.setAttribute('aria-live','polite');
    return p;
  },
  renderHud(s){
    const hud=this.el('div','run69-hud');
    const chip=(k,en,val,accent,warn)=>{
      const sp=this.el('span','',null);if(accent)sp.setAttribute('data-accent','1');if(warn)sp.setAttribute('data-warn','1');
      sp.append(this.el('b','',val),Object.assign(this.el('small',null,en),{className:'run69-e'}));
      return sp;
    };
    hud.append(chip(null,'GRAIN 干粮',s.food),chip(null,'MORALE 士气',s.morale),chip(null,'SPARK 火种',s.spark,true),
      chip(null,'LAYER 行程',`${s.current.layer+1}/${s.map.layers.length}`));
    const crew=this.el('div','run69-crew');
    const small=this.el('small','run69-e','Fictional Squad · 教学虚构小队（抽象剪影）');
    crew.append(small);
    for(const m of s.crew){
      const d=this.el('span','run69-mate');
      if(m.state==='wounded')d.setAttribute('data-wounded','1');
      if(m.state==='lost')d.setAttribute('data-lost','1');
      d.innerHTML='<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="13" r="7"/><path d="M6 36c0-8 6-12 14-12s14 4 14 12"/></svg>';
      const txt=this.el('span');
      txt.append(this.el('b','',m.name),this.el('small','run69-e',m.state==='ready'?'READY 就绪':m.state==='wounded'?'WOUNDED 重伤':'LOST 牺牲'));
      d.append(txt);crew.append(d);
    }
    const wrap=this.el('div');wrap.append(hud,crew);return wrap;
  },
  nodeButton(n,s){
    const b=this.el('button','run69-node');
    b.type='button';b.setAttribute('data-type',n.type);
    const done=s.cleared.includes(n.uid);
    const avail=s.choices.includes(n.uid);
    if(done)b.setAttribute('data-done','1');
    if(avail&&!done)b.setAttribute('data-avail','1');
    b.disabled=!avail||done;
    const tag=this.el('em',null,`${this.TYPE_K[n.type]} ${this.TYPE_EN[n.type]}`);
    const name=this.el('span',null,done?`${n.title}（已通过）`:n.title);
    b.append(tag,name);
    if(avail&&!done)b.onclick=()=>this.pickNode(n.uid);
    return b;
  },
  renderMap(body,s){
    const grid=this.el('div','run69-chapters');
    for(let ci=0;ci<3;ci++){
      const chap=this.el('div','run69-chapter');
      chap.append(this.el('span','run69-k',s.map.chapters[ci].name),this.el('span','run69-e',s.map.chapters[ci].en));
      s.map.layers.forEach((layer,li)=>{
        if(layer.chapter!==ci)return;
        const lay=this.el('div','run69-layer');
        const head=this.el('div','run69-layer-k');
        head.append(this.el('span','run69-k',`第 ${li+1} 层`),this.el('span','run69-e',`LAYER ${li+1}`));
        lay.append(head);
        for(const n of layer.nodes)lay.append(this.nodeButton(n,s));
        chap.append(lay);
      });
      grid.append(chap);
    }
    body.append(grid);
    const actions=this.el('div','run69-actions');
    const restart=this.el('button',null,'重新推演 · NEW RUN');
    restart.type='button';restart.onclick=()=>{this.newRun();this.ui.view='map';this.ui.lastResult=null;this.render();};
    actions.append(restart);
    body.append(actions);
  },
  pickNode(uid){
    const s=this.session;const node=this.startNode(s,uid);
    if(!node)return;
    this.ui.lastResult=null;
    if(node.type==='battle'||node.type==='boss')this.ui.view='battle';
    else if(node.type==='event'){this.ui.card=this.drawCard(s);this.ui.view='event';}
    else if(node.type==='camp'){this.ui.camp={heal:0,stamina:0,reserve:0};this.ui.view='camp';}
    this.render();
  },
  renderBattle(body,s){
    const node=this.nodeOf(s,s.current.uid);if(!node){this.ui.view='map';this.render();return;}
    const def=node.engine?this.engines[node.engine]:null;
    const panel=this.el('div','run69-panel');
    panel.append(this.el('span','run69-k',node.title),this.el('span','run69-e',node.en));
    if(def)panel.append(this.el('p','run69-cardtext',`${def.hist}（据党史出版物记载）`));
    else panel.append(this.el('p','run69-cardtext','此节点对应的推演引擎未加载，将按教学推演自动通过。'));
    panel.append(this.el('p','run69-note','推演失败：一人重伤；同一节点再次失败：一人牺牲（仅留姓名与挽联）。门禁将临时放行并在返回后恢复。'));
    body.append(panel);
    const actions=this.el('div','run69-actions');
    const go=this.el('button',null,def?'开始推演 · START':'自动通过 · SKIP');
    go.type='button';if(def)go.setAttribute('data-start','1');
    go.onclick=()=>{
      const uid=s.current.uid;go.disabled=true;const won=()=>{if(!this.dialog||this.session!==s||s.current.uid!==uid)return;this.ui.lastResult=this.resolveBattle(s,true);this.ui.view='map';this.render();};
      const dispatched=def?this.dispatch(node.engine,won):false;
      if(!dispatched){this.ui.lastResult={type:'auto'};won();}
    };
    const back=this.el('button',null,'返回选路 · BACK');
    back.type='button';back.onclick=()=>{s.current.uid=null;this.ui.view='map';this.render();};
    actions.append(go,back);body.append(actions);
  },
  renderEvent(body,s){
    const card=this.ui.card;
    if(!card){this.ui.view='map';this.render();return;}
    const panel=this.el('div','run69-panel');
    panel.append(this.el('span','run69-k',card.title),this.el('span','run69-e',card.en||'STORY EVENT'));
    if(card.text)panel.append(this.el('p','run69-cardtext',card.text));
    panel.append(this.el('p','run69-srcline',(card.kind?card.kind+' · ':'')+(card.note||'据党史出版物记载')+' · 效果为教学推演设定'));
    body.append(panel);
    const box=this.el('div','run69-choices');
    card.choices.forEach((ch,i)=>{
      const b=this.el('button',null,ch.label);b.type='button';
      b.onclick=()=>{
        this.applyEventChoice(s,card,i);
        const r=this.advance(s);
        this.ui.lastResult=r.done?{type:'win',node:card.title}:null;
        this.ui.view='map';this.ui.card=null;this.render();
      };
      box.append(b);
    });
    body.append(box);
    const actions=this.el('div','run69-actions');
    const back=this.el('button',null,'返回选路 · BACK');
    back.type='button';back.onclick=()=>{s.current.uid=null;this.ui.view='map';this.render();};
    actions.append(back);body.append(actions);
  },
  renderCamp(body,s){
    const panel=this.el('div','run69-panel');
    panel.append(this.el('span','run69-k','夜营 · 干粮分配'),this.el('span','run69-e','CAMP · RATION ALLOCATION'));
    const pool=Math.min(this.RULES.campPool,s.food);
    panel.append(this.el('p','run69-cardtext',`今晚可支配干粮 ${pool} 份（合计不得超过）。救治每 ${this.RULES.healCost} 份治愈一名重伤员；体力每 5 份提升士气；储备留作后程。`));
    body.append(panel);
    const alloc=this.ui.camp;
    const rows=[
      {key:'heal',k:'救治',en:'MEDICAL',max:pool},
      {key:'stamina',k:'体力',en:'STAMINA',max:pool},
      {key:'reserve',k:'储备',en:'RESERVE',max:pool}
    ];
    const sumEl=this.el('p','run69-status','合计 0 / '+pool+' 份');sumEl.setAttribute('role','status');sumEl.setAttribute('aria-live','polite');
    const confirm=this.el('button',null,'确认分配 · CONFIRM');confirm.type='button';confirm.setAttribute('data-start','1');
    const syncSum=()=>{
      const total=alloc.heal+alloc.stamina+alloc.reserve;
      sumEl.textContent=`合计 ${total} / ${pool} 份`;
      const over=total>pool;
      confirm.disabled=over;
      sumEl.setAttribute('data-warn',over?'1':'');
    };
    for(const row of rows){
      const line=this.el('div','run69-slider');
      const lab=this.el('span');lab.append(this.el('span','run69-k',row.k),this.el('span','run69-e',row.en));
      const input=this.el('input');input.type='range';input.min='0';input.max=String(pool);input.step='1';input.value=String(alloc[row.key]);
      input.setAttribute('aria-label',row.k+'份数');
      const out=this.el('output',null,String(alloc[row.key]));
      input.oninput=()=>{alloc[row.key]=Number(input.value);out.textContent=input.value;syncSum();};
      line.append(lab,input,out);body.append(line);
    }
    body.append(sumEl);
    const actions=this.el('div','run69-actions');
    confirm.onclick=()=>{
      this.applyCamp(s,alloc);
      const r=this.advance(s);
      this.ui.lastResult=r.done?{type:'win',node:'夜营休整'}:null;
      this.ui.view='map';this.render();
    };
    const back=this.el('button',null,'返回选路 · BACK');
    back.type='button';back.onclick=()=>{s.current.uid=null;this.ui.view='map';this.render();};
    actions.append(confirm,back);body.append(actions);
    syncSum();
  },
  renderSettle(body){
    const s=this.session,r=this.settle(s);
    const panel=this.el('div','run69-panel');
    panel.append(this.el('span','run69-k',r.won?'推演通关 · 会师':'推演结束'),this.el('span','run69-e',r.won?'Run Complete · Junction':'Run Ended'));
    const score=this.el('p','run69-score',String(r.score));
    score.append(Object.assign(this.el('span','run69-e',` / 100 · ${r.rating}`),{style:'font-size:12px;margin-left:8px'}));
    panel.append(score);
    body.append(panel);
    const rep=this.el('div','run69-panel');
    rep.append(this.el('span','run69-k','战报'),this.el('span','run69-e','AFTER-ACTION REPORT'));
    const ul=this.el('ul','run69-report');
    r.report.forEach((line,i)=>{
      const li=this.el('li',null,line);
      if(line.startsWith('本局你失去了：'))li.setAttribute('data-lost-line','1');
      ul.append(li);
    });
    rep.append(ul);
    rep.append(this.el('p','run69-note',`火种产出：${r.sparkOut} 点，可留存于本机记录。`));
    body.append(rep);
    const actions=this.el('div','run69-actions');
    const again=this.el('button',null,'重新推演 · NEW RUN');
    again.type='button';again.setAttribute('data-start','1');
    again.onclick=()=>{this.newRun();this.ui.view='map';this.ui.lastResult=null;this.render();};
    actions.append(again);body.append(actions);
    this.renderStatusAfter=body;
    body.append(this.renderStatus());
  }
};
/* auto-install in browser; inert in Node tests */
if(typeof document!=='undefined'){
  const boot=()=>{try{window.LongMarchRun69.install();}catch{/* optional entry card. */}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
}
