/* Gouba night lamp: single-screen lamp-light escape-room, March 10 1935.
   Light-radius gating: items outside the lamp glow cannot be interacted with. */
window.Gouba72=(function(){
  const QUOTE='周恩来回忆：毛主席回去一想，还是不放心，半夜提着马灯又到我那里来，叫我把命令暂时晚一点发，还是想一想。我接受了毛主席的意见，一早再开会，把大家说服了。';
  /* 电报三段：正确顺序（收报时间线） */
  const TELEGRAM=[
    {t:'中革军委来电：各军团向打鼓新场集结，拟于明日拂晓总攻。',n:'片段一 · 军委电'},
    {t:'侦察报告：滇军孙渡纵队、黔军犹国才部正向打鼓新场方向急进。',n:'片段二 · 侦察报'},
    {t:'周浑元、吴奇伟两纵队由黔西仁怀一带压来，距打鼓新场不足百里。',n:'片段三 · 敌情通报'}
  ];
  const TELEGRAM_ORDER=[0,1,2]; // 集结令→增兵→压来：风险层层递进
  const MAP_MARKS=['北：川军防线','东：黔军合围','南：滇军纵队'];
  function create(id){
    return {id:Number(id),d:definitions[3],
      lamp:{x:640,y:430},radius:210,stage:'room',doorOpen:false,
      clues:{telegram:false,map:false,oil:false},
      telegram:{picked:[],ok:false,panel:null},
      mapSeen:false,oilDone:false,holding:false,
      walked:0,status:'ready',reason:'',events:[],mistakes:0};
  }
  /* 光照判定：点击点到灯心距离 ≤ 半径 才可交互 */
  function lit(s,x,y){return Math.hypot(x-s.lamp.x,y-s.lamp.y)<=s.radius;}
  /* 电报拼序：picked 依次为正确顺序返回 true（错误不惩罚，可重选） */
  function telegramPick(s,idx){
    if(s.clues.telegram||s.telegram.ok)return true;
    const expect=TELEGRAM_ORDER[s.telegram.picked.length];
    if(idx===expect){s.telegram.picked.push(idx);
      if(s.telegram.picked.length===TELEGRAM_ORDER.length){s.telegram.ok=true;s.clues.telegram=true;s.events.push('clue');}
      return true;}
    s.mistakes++;s.telegram.picked=[];s.events.push('no');return false;
  }
  function mapSee(s){if(!s.clues.map){s.clues.map=true;s.mapSeen=true;s.events.push('clue');}return true;}
  function addOil(s){if(s.clues.oil)return true;if(!lit(s,1080,470))return false;
    s.oilDone=true;s.clues.oil=true;s.radius=340;s.events.push('oil');return true;}
  function door(s){return s.clues.telegram&&s.clues.map&&s.clues.oil;}
  function tryDoor(s){
    if(!door(s)){s.events.push('locked');return {ok:false,msg:'还看不分明，先把桌上的军情弄清楚。'};}
    s.stage='walk';s.events.push('walk');return {ok:true};
  }
  function takeLamp(s){s.holding=true;s.events.push('lamp');return true;}
  function walkStep(s,dt){if(s.stage!=='walk')return;s.walked+=dt;
    if(s.walked>=4){this.finish(s,true,'马灯的光走过了夜路——作战命令暂缓下发。次日复会，红军掉头西进，跳出了合围。');}}
  function finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');}
  function rating(s){return s.status==='won'?{score:95,rating:'马灯不灭'}:{score:70,rating:'夜犹未明'};}
  function persist(s,nodeId){
    const result=rating(s);
    try{if(typeof GameState!=='undefined'){
      GameState.storyPreparations=GameState.storyPreparations||{};
      const key='gouba72_3',old=GameState.storyPreparations[key];
      if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,clues:3,completedAt:new Date().toISOString()};
      if(typeof GameState.recordBattleScore==='function')GameState.recordBattleScore(nodeId||3,result.score,result.rating);
      if(typeof GameState.save==='function')GameState.save();}}catch{}
    return result;
  }
  const definitions={3:{title:'苟坝夜灯 · 马灯密室',
    intro:'1935年3月10日深夜，贵州苟坝。作战命令即将下发，风险却看不分明。提起马灯，在光照范围内查清三条军情，再出门夜行。',
    success:'马灯的光走过了夜路——作战命令暂缓下发。次日复会，红军掉头西进，跳出了合围。',
    hist:'1935年3月10日深夜，贵州苟坝。苟坝会议多数人同意攻打打鼓新场，毛泽东判断此战风险极大、坚决反对。会后他放心不下，独自提马灯沿田埂小路连夜前往周恩来住处，劝说暂缓下发作战命令。次日复会，说服众人取消作战计划，避免红军陷入敌军合围。'}};
  function style(){
    if(document.getElementById('gouba72-style'))return;
    const el=document.createElement('style');el.id='gouba72-style';el.textContent=`
    .gouba72-dialog{box-sizing:border-box;width:min(1000px,96vw);max-height:96dvh;margin:auto;padding:0;background:#0c0d10;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .gouba72-dialog::backdrop{background:#030406f2}
    .gouba72-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #22252a;background:#0f1114}
    .gouba72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .gouba72-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .gouba72-body{padding:12px 18px}
    .gouba72-dialog canvas{display:block;width:100%;height:auto;background:#050608;border:1px solid #2a2d31;border-radius:2px;cursor:pointer;touch-action:none}
    .gouba72-hud{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px dashed #2a2d31;padding-bottom:8px}
    .gouba72-hud span{background:#14171a;border:1px solid #2a2d31;border-radius:2px;padding:3px 10px;font-size:13px;color:#cfd2cf}
    .gouba72-hud span.got{border-color:#3a5a40;color:#9fd08a}
    .gouba72-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:9px;margin:0 18px}
    .gouba72-actions{display:flex;gap:8px;flex-wrap:wrap;padding:10px 18px 12px}
    .gouba72-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer}
    .gouba72-dialog button:hover{background:#22262b}
    .gouba72-dialog button.primary{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .gouba72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .gouba72-subdlg{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(3,4,6,.72)}
    .gouba72-subbox{width:min(680px,92vw);background:#14171a;border:1px solid #4a4d52;border-left:3px solid #ffcf24;border-radius:2px;padding:14px 16px}
    .gouba72-subbox h3{margin:0 0 8px;font-size:16px;color:#f2f0e9}
    .gouba72-frag{display:block;width:100%;text-align:left;margin:6px 0;background:#191c20;border:1px solid #4a4d52;color:#d5d8d2;padding:9px 12px;font:inherit;cursor:pointer}
    .gouba72-frag:hover{border-color:#ffcf24}
    .gouba72-frag.picked{border-color:#9fd08a;color:#9fd08a}
    .gouba72-subbox p{font-size:13px;color:#cfd2cf;margin:6px 0}
    .gouba72-subbox .gouba72-src{color:#9fd08a;font-size:12px;margin-top:10px}
    .gouba72-note{font-size:12px;color:#8f948d;padding:0 18px 12px}
    .gouba72-dialog [hidden]{display:none!important}
    @media(max-width:600px){.gouba72-dialog{font-size:13px}}`;
    document.head.append(el);
  }
  function open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='gouba72-dialog';dialog.setAttribute('aria-labelledby','gouba72-t');
    dialog.innerHTML='<header><div><h2 id="gouba72-t"></h2><p class="gouba72-sub">Gouba Night Lamp · March 10, 1935</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="gouba72-body"><canvas data-room width="1280" height="720" tabindex="0" aria-label="苟坝深夜作战小屋。马灯光斑内可点击查看：桌上的电报碎片、油布地形图、屋角油罐、房门与马灯。暗处不可见。"></canvas></div>'
      +'<div class="gouba72-hud" data-hud><span data-c1>线索一 · 军情电报</span><span data-c2>线索二 · 合围地形</span><span data-c3>线索三 · 灯油添满</span></div>'
      +'<p class="gouba72-status" role="status" aria-live="polite"></p>'
      +'<div class="gouba72-actions"><button data-start class="primary">▶ 提灯入夜</button><button data-complete hidden>记录成绩 · 完成本章</button></div>'
      +'<p class="gouba72-note">光斑外的暗处无法查看。点击物品收集线索；三线齐明，房门自开。</p>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel);
    let s=create(node.id);this.session=s;
    let recorded=false,closed=false,sub=null;
    q('h2').textContent=definitions[3].title;
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.remove();if(trigger&&trigger.isConnected)trigger.focus();};
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    q('[data-close]').onclick=close;
    const status=t=>{q('.gouba72-status').textContent=t;};
    const hud=()=>{q('[data-c1]').className=s.clues.telegram?'got':'';q('[data-c2]').className=s.clues.map?'got':'';q('[data-c3]').className=s.clues.oil?'got':'';};
    const reduced=()=>{try{return!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch{return false;}};
    /* 房间静物（逻辑坐标） */
    const items={
      telegram:{x:520,y:430,label:'毛边电报碎片'},
      map:{x:330,y:300,label:'油布地形图'},
      oil:{x:1080,y:470,label:'粗陶油罐'},
      door:{x:1210,y:360,label:'房门'},
      lamp:{x:640,y:430,label:'马灯'}
    };
    const hit=(mx,my,x,y,r)=>Math.hypot(mx-x,my-y)<=r;
    /* 绘制：全暗 + 灯光斑内景物（用离屏景层再叠暗幕） */
    let scene=null;
    const paintScene=()=>{
      scene=document.createElement('canvas');scene.width=1280;scene.height=720;
      const c=scene.getContext('2d');
      c.fillStyle='#14110c';c.fillRect(0,0,1280,720);
      c.fillStyle='#1c1712';c.fillRect(0,300,1280,340); // 墙裙
      c.fillStyle='#241c14';c.fillRect(0,560,1280,160); // 地面
      // 木门（右侧）
      c.fillStyle=door(s)?'#4a3b26':'#332a1c';c.fillRect(1150,300,110,260);
      c.strokeStyle='#191510';c.lineWidth=3;c.strokeRect(1150,300,110,260);
      c.fillStyle='#8a7a58';c.beginPath();c.arc(1162,432,5,0,Math.PI*2);c.fill();
      // 方桌
      c.fillStyle='#3a2f20';c.fillRect(420,470,440,26);c.fillRect(440,496,18,80);c.fillRect(820,496,18,80);
      // 马灯（底座）
      c.fillStyle='#5a4a2e';c.fillRect(s.lamp.x-14,s.lamp.y-30,28,34);
      c.fillStyle='#2b2318';c.fillRect(s.lamp.x-10,s.lamp.y-44,20,14);
      // 电报碎片（桌上）
      c.fillStyle='#d9cfae';c.save();c.translate(520,452);c.rotate(-.06);c.fillRect(-52,-14,104,26);c.restore();
      // 油布地图（墙上）
      c.fillStyle='#5c543a';c.fillRect(280,250,120,86);c.strokeStyle='#7a6f4a';c.strokeRect(280,250,120,86);
      // 油罐（屋角）
      c.fillStyle='#4a3c2a';c.beginPath();c.ellipse(1080,492,26,34,0,0,Math.PI*2);c.fill();
      // 长凳
      c.fillStyle='#332a1c';c.fillRect(180,520,150,18);
    };
    const draw=(now)=>{
      if(!scene)paintScene();
      const c=q('[data-room]').getContext('2d');
      c.clearRect(0,0,1280,720);
      c.drawImage(scene,0,0);
      // 暗幕（挖洞）
      c.save();
      c.fillStyle='#030304ee';
      c.beginPath();c.rect(0,0,1280,720);
      const flick=(Number.isFinite(now)&&!reduced())?1+.05*Math.sin(now/90)+.03*Math.sin(now/41):1;
      c.arc(s.lamp.x,s.lamp.y,s.radius*flick,0,Math.PI*2,true);
      c.fill();
      // 光斑暖光
      const warm=c.createRadialGradient(s.lamp.x,s.lamp.y,6,s.lamp.x,s.lamp.y,s.radius*flick);
      warm.addColorStop(0,'rgba(255,190,90,.30)');warm.addColorStop(.7,'rgba(255,170,70,.12)');warm.addColorStop(1,'rgba(255,170,70,0)');
      c.fillStyle=warm;c.beginPath();c.arc(s.lamp.x,s.lamp.y,s.radius*flick,0,Math.PI*2);c.fill();
      c.restore();
      // 提灯行走段：换夜景
      if(s.stage==='walk'){
        c.fillStyle='#050608';c.fillRect(0,0,1280,720);
        c.fillStyle='#0e1410';for(let i=0;i<7;i++){c.beginPath();c.moveTo(i*220-40,720);c.lineTo(i*220+70,430+((i%2)*60));c.lineTo(i*220+200,720);c.closePath();c.fill();}
        const wx=(s.walked/4)*1280*0.82+80;
        c.fillStyle='#0a0c0a';c.fillRect(0,640,1280,80);
        // 背影剪影提灯
        c.fillStyle='#11150f';c.fillRect(wx-16,560,32,80);
        c.beginPath();c.arc(wx,544,12,0,Math.PI*2);c.fill();
        const lw=c.createRadialGradient(wx+30,596,4,wx+30,596,110*flick);
        lw.addColorStop(0,'rgba(255,190,90,.4)');lw.addColorStop(1,'rgba(255,190,90,0)');
        c.fillStyle=lw;c.beginPath();c.arc(wx+30,596,110*flick,0,Math.PI*2);c.fill();
        c.fillStyle='#5a4a2e';c.fillRect(wx+24,584,14,22);
      }
    };
    let raf=0;
    const loop=(now)=>{if(closed)return;draw(now);raf=requestAnimationFrame(loop);};
    /* 交互 */
    const clickAt=(mx,my)=>{
      if(s.status!=='playing'||s.stage!=='room')return;
      if(!lit(s,mx,my)){status('灯光不及之处，看不分明。先挪灯，或添油。');s.events.push('dark');return;}
      if(hit(mx,my,items.telegram.x,items.telegram.y,70)){openTelegram();return;}
      if(hit(mx,my,items.map.x,items.map.y,80)){subOpen('map');return;}
      if(hit(mx,my,items.oil.x,items.oil.y,60)){addOil(s)?status('灯油添满，光晕扩大——墙角与房门亮了起来。'):status('够不着油罐。把灯提过去。');hud();return;}
      if(hit(mx,my,items.door.x,items.door.y,80)){
        const r=tryDoor(s);status(r.ok?'':r.msg);return;}
      if(hit(mx,my,items.lamp.x,items.lamp.y,60)){takeLamp(s);status('提起马灯——光照随你移动。点击新位置放下。');return;}
      s.lamp.x=mx;s.lamp.y=Math.min(my,540);status('灯放稳了。');
    };
    const subOpen=(kind)=>{
      sub=document.createElement('div');sub.className='gouba72-subdlg';
      if(kind==='map'){
        sub.innerHTML='<div class="gouba72-subbox"><h3>油布地形图 · 打鼓新场方向</h3>'
          +MAP_MARKS.map(m=>'<p>▲ '+m+'</p>').join('')
          +'<p style="color:#ff8d75">三面合围，唯西面赤水河一线可机动。</p>'
          +'<p class="gouba72-src">线索二入手：地形风险确认。</p><button data-x>收起地图</button></div>';
        s.clues.map=true;s.events.push('clue');
      }
      document.body.append(sub);
      sub.querySelector('[data-x]').onclick=()=>{sub.remove();sub=null;hud();draw();};
      hud();
    };
    const openTelegram=()=>{
      if(s.clues.telegram){status('电报已读：敌军正向打鼓新场增兵。');return;}
      sub=document.createElement('div');sub.className='gouba72-subdlg';
      sub.innerHTML='<div class="gouba72-subbox"><h3>拼接电报 · 按发报顺序点击三段</h3><div data-frags>'
        +TELEGRAM.map((t,i)=>'<button class="gouba72-frag" data-i="'+i+'">'+t.n+'：'+t.t+'</button>').join('')
        +'</div><p data-tg-status>顺序即军情：先看清令，再看变数。</p></div>';
      document.body.append(sub);
      sub.querySelectorAll('.gouba72-frag').forEach(b=>b.onclick=()=>{
        const idx=Number(b.dataset.i);
        const ok=telegramPick(s,idx);
        if(ok){b.classList.add('picked');b.disabled=true;
          if(s.clues.telegram){sub.querySelector('[data-tg-status]').textContent='三条线索连起来了：敌军正向打鼓新场增兵——此仗凶险。';
            setTimeout(()=>{if(sub){sub.remove();sub=null;}hud();status('线索一入手：军情电报已拼明。');},700);}
        } else {sub.querySelector('[data-tg-status]').textContent='顺序不对，重头再拼。';b.disabled=false;
          sub.querySelectorAll('.gouba72-frag').forEach(x=>x.classList.remove('picked'));}
      });
    };
    const cv=q('[data-room]');
    const toLocal=e=>{const r=cv.getBoundingClientRect();const sc=r.width/1280;
      return {x:(e.clientX-r.left)/sc,y:(e.clientY-r.top)/sc};};
    cv.addEventListener('pointerdown',e=>{const p=toLocal(e);e.preventDefault();cv.focus();clickAt(p.x,p.y);});
    const sync=()=>{hud();
      q('[data-start]').hidden=s.status!=='ready';
      q('[data-complete]').hidden=s.status!=='won';
      if(s.status==='won')status('本章完成 · '+this.rating(s).rating);};
    q('[data-start]').onclick=()=>{s.status='playing';sync();status('深夜。马灯是唯一的光——点击光斑内的物件。');
      if(!reduced())raf=requestAnimationFrame(loop);else draw();};
    /* 首次渲染（ready 态也画房间做背景） */
    hud();draw();
    if(!reduced())raf=requestAnimationFrame(loop);
    q('[data-start]').focus();
    /* 通关收口：persist(node.id) + 关弹窗 + onComplete（recorded/current 双守卫） */
    const win=()=>{try{if(s.status!=='won'||recorded||!current())return;recorded=true;this.persist(s,node.id);close();if(typeof onComplete==='function')onComplete();}catch{}};
    q('[data-complete]').onclick=win;
    /* walk 阶段推进走定时器（draw 按 stage 分支渲染夜路） */
    const wl=setInterval(()=>{if(closed){clearInterval(wl);return;}
      if(s.stage==='walk'){this.walkStep(s,1/30);
        if(s.status==='won'){sync();}}
    },33);
    return true;
  }
  return{QUOTE,TELEGRAM,TELEGRAM_ORDER,MAP_MARKS,definitions,supports(id){return [3,4].includes(Number(id));},
    create,lit,telegramPick,mapSee,addOil,door,tryDoor,takeLamp,walkStep,finish,rating,persist,style,open,
    muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
    paused(){return typeof document!=='undefined'&&(document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay'))}};
})();
