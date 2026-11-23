/* Original wargame exercise: abstract tokens only, no gore and no real parameters.
   吴起镇 · 切尾巴之战：原创教学推演，骑兵为抽象剪影，无血腥表现；史实注脚见 details。 */
window.Wuqi68={
  supports(id){return [11].includes(Number(id));},
  definitions:{
    11:{title:'切尾巴之战 · 吴起镇',columnRate:.012,
      intro:'兵棋推演（洛河川道三线）：先选兵种，再点虚线阵地布防；突击排可直接点川道任意位置投放。顶住三波骑兵冲击，掩护中央机关纵队进抵吴起镇。',
      success:'尾追之敌已被击退、歼灭，中央机关纵队安全进抵吴起镇——长征的最后一仗，圆满收官。',
      lanes:[{y:238},{y:392},{y:546}],
      slots:[{lane:0,x:430},{lane:0,x:720},{lane:1,x:430},{lane:1,x:720},{lane:2,x:430},{lane:2,x:720}],
      crossing:{x:165},
      column:{hp:100,drain:16},
      waves:[
        {count:6,hp:18,speed:51,gap:1.05,fast:false},
        {count:9,hp:29,speed:57,gap:.9,fast:false},
        {count:15,hp:40,speed:63,gap:.75,fastRatio:.6}
      ],
      units:{
        mg:{name:'机枪阵地',cost:30,rate:.55,range:270,dmg:11,hp:130},
        wall:{name:'拒马',cost:25,rate:0,range:0,dmg:0,hp:240,slow:.35,slowRange:95},
        squad:{name:'突击排',cost:50,rate:.8,range:160,dmg:9,hp:90,life:14}
      },
      buildTime:10,startFunds:100,killIncome:6,waveIncome:40,
      hist:'1935 年 10 月 19 日，中央红军进抵吴起镇，长征即将收官；10 月 21 日，彭德怀指挥在吴起镇附近川道设伏，歼灭尾追的国民党骑兵一个团、击溃另外三个团——这是中央红军长征的最后一仗，俗称「切尾巴」之战。战后毛泽东赠诗彭德怀：「谁敢横刀立马，唯我彭大将军」。本推演骑兵均以抽象剪影表现，不画坠马等细节；兵力、射程、波次与分数均为练习规则，不代表历史数量与战法。'
    }
  },
  /* 全线战备 FULL CAMPAIGN：五项前站经验加成，全部 typeof 容错读取，缺失即未达成（灰字降级），绝不报错 */
  buffs(){
    const rd=k=>{try{if(typeof GameState==='undefined'||!GameState)return false;const sp=GameState.storyPreparations;if(!sp)return false;const r=sp[k];return !!r&&typeof r.score==='number'&&r.score>=70;}catch{return false;}};
    const gb=id=>{try{if(typeof GameState==='undefined'||!GameState||typeof GameState.getBattleScore!=='function')return false;const v=GameState.getBattleScore(id);if(v===null||v===undefined)return false;const sc=typeof v==='number'?v:v.score;return typeof sc==='number'&&sc>=60;}catch{return false;}};
    const list=[
      {key:'xjg',name:'湘江防线经验',desc:'初始兵力 +15',ok:rd('xjg67_2'),miss:'未达成 · 可回 earlier 站点练习'},
      {key:'xudong',name:'佯动经验',desc:'第一波骑兵速度 -15%',ok:rd('sidu67_4'),miss:'未达成 · 可回 earlier 站点练习'},
      {key:'scout',name:'情报先行',desc:'每波敌骑出场前 2 秒显示行进箭头预警',ok:rd('scout67_5'),miss:'未达成 · 可回 earlier 站点练习'},
      {key:'drum',name:'战鼓助威',desc:'击破敌骑兵力收益 +2',ok:rd('drum67_12'),miss:'未达成 · 可回 earlier 站点练习'},
      {key:'gun',name:'体力与枪法',desc:'机枪伤害 +2（第2/9站任一练习 ≥60，含采集/狙击）',ok:gb(9)||gb(2),miss:'未达成 · 可回 earlier 站点练习'}
    ];
    const flags={};for(const b of list)flags[b.key]=b.ok;
    return {list,flags};
  },
  create(id){const d=this.definitions[id],bf=this.buffs();return {id:Number(id),d,funds:d.startFunds+(bf.flags.xjg?15:0),buffs:bf.flags,buffList:bf.list,wave:0,phase:'build',buildLeft:d.buildTime,spawn:{list:[],timer:0},enemies:[],slots:d.slots.map(()=>null),temps:[],column:{hp:d.column.hp,progress:0},kills:0,lost:0,time:0,accumulator:0,particles:[],status:'ready',reason:'',events:[]};},
  deploy(s,i,type){const d=s.d,u=d.units[type];if(!u||i<0||i>=s.slots.length||s.slots[i]||s.funds<u.cost||s.status!=='playing')return false;s.slots[i]={type,cost:u.cost,dmg:u.dmg+(type==='mg'&&s.buffs&&s.buffs.gun?2:0),rate:u.rate,range:u.range,hp:u.hp,maxHp:u.hp,slow:u.slow||1,slowRange:u.slowRange||0,life:u.life||0,cool:0,flash:0,halo:.6};s.funds-=u.cost;s.events.push('place');return true;},
  refund(s,i){const u=s.slots[i];if(!u||s.status!=='playing')return false;s.funds+=Math.ceil(u.cost/2);s.slots[i]=null;s.events.push('place');return true;},
  reserve(s,lane,x){const d=s.d,u=d.units.squad;if(lane<0||lane>=d.lanes.length||s.funds<u.cost||s.status!=='playing')return false;s.temps.push({type:'squad',lane,x:Math.max(210,Math.min(1150,x)),dmg:u.dmg,rate:u.rate,range:u.range,hp:u.hp,maxHp:u.hp,life:u.life,cool:0,flash:0,halo:.6});s.funds-=u.cost;s.events.push('place');return true;},
  startWave(s){const d=s.d,w=d.waves[s.wave],cut=(s.buffs&&s.buffs.xudong&&s.wave===0)?.85:1;s.spawn.list=[];for(let i=0;i<w.count;i++)s.spawn.list.push({t:i*w.gap,hp:w.hp,speed:w.speed*cut,fast:w.fast===true?true:(w.fastRatio?(i%5)<Math.round(w.fastRatio*5):false),lane:(i*2+s.wave)%d.lanes.length,x:1280});s.spawn.timer=0;s.phase='combat';s.events.push('wave');},
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');},
  step(s,dt=1/120){
    if(s.status!=='playing')return;const d=s.d;s.time+=dt;
    if(s.phase==='build'){s.buildLeft-=dt;if(s.buildLeft<=0)this.startWave(s);}
    else if(s.phase==='combat'){
      s.spawn.timer+=dt;while(s.spawn.list.length&&s.spawn.list[0].t<=s.spawn.timer){const m=s.spawn.list.shift();s.enemies.push({...m});}
      for(const e of s.enemies){let slow=1;for(let i=0;i<s.slots.length;i++){const u=s.slots[i];if(u&&u.type==='wall'&&d.slots[i].lane===e.lane&&Math.abs(e.x-d.slots[i].x)<=u.slowRange)slow=Math.min(slow,u.slow);}for(const u of s.temps)if(u.lane===e.lane&&u.type==='wall')slow=Math.min(slow,u.slow);e.x-=e.speed*slow*dt;}
      for(let i=0;i<s.slots.length;i++){const u=s.slots[i];if(!u)continue;if(u.type==='wall')continue;u.cool-=dt;if(u.cool>0)continue;const pos=d.slots[i];const target=s.enemies.filter(e=>e.lane===pos.lane&&e.x>=pos.x-10&&e.x-pos.x<=u.range).sort((a,b)=>a.x-b.x)[0];if(target){target.hp-=u.dmg;u.cool=u.rate;u.flash=.08;u.tx=target.x;u.ty=d.lanes[pos.lane].y;s.events.push('shot');}}
      for(const u of s.temps){u.life-=dt;u.cool-=dt;if(u.type!=='wall'&&u.cool<=0){const target=s.enemies.filter(e=>e.lane===u.lane&&e.x>=u.x-10&&e.x-u.x<=u.range).sort((a,b)=>a.x-b.x)[0];if(target){target.hp-=u.dmg;u.cool=u.rate;u.flash=.08;u.tx=target.x;u.ty=d.lanes[u.lane].y;s.events.push('shot');}}}
      for(const e of s.enemies){if(e.hp<=0){s.kills++;s.funds+=d.killIncome+(s.buffs&&s.buffs.drum?2:0);e.dead=true;for(let k=0;k<8;k++)s.particles.push({x:e.x,y:d.lanes[e.lane].y,vx:(Math.random()-.5)*90,vy:(Math.random()-.7)*90,life:.4});s.events.push('kill');}}
      s.enemies=s.enemies.filter(e=>{if(e.dead)return false;if(e.x<=d.crossing.x){s.column.hp-=d.column.drain;s.lost++;for(let k=0;k<10;k++)s.particles.push({x:d.crossing.x+16,y:d.lanes[e.lane].y,vx:(Math.random()-.2)*120,vy:(Math.random()-.7)*120,life:.45});s.events.push('breach');return false;}return true;});
      if(s.column.hp<=0){this.finish(s,false,'防线被骑兵突破，机关纵队遇袭。可重新推演，调整拒马与突击排的部署。');return;}
      s.column.progress=Math.min(1,s.column.progress+d.columnRate*dt);
      if(!s.spawn.list.length&&!s.enemies.length){s.funds+=d.waveIncome;s.wave++;if(s.wave>=d.waves.length)this.finish(s,true,d.success);else{s.phase='build';s.buildLeft=d.buildTime;s.events.push('wave');}}
    }
    s.temps=s.temps.filter(u=>u.life>0&&u.hp>0);
      for(const u of s.slots)if(u){u.flash=Math.max(0,u.flash-dt);u.halo=Math.max(0,(u.halo||0)-dt);}for(const u of s.temps){u.flash=Math.max(0,u.flash-dt);u.halo=Math.max(0,(u.halo||0)-dt);}
    for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}s.particles=s.particles.filter(p=>p.life>0);
  },
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.25,seconds));while(s.accumulator+1e-9>=1/120){this.step(s);s.accumulator-=1/120;}},
  rating(s,retries){return retries===0&&s.column.hp>=s.d.column.hp?{score:95,rating:'横刀立马'}:retries<=1?{score:85,rating:'切掉尾巴'}:{score:70,rating:'完成任务'};},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('wuqi68-style'))return;const el=document.createElement('style');el.id='wuqi68-style';el.textContent=`
    .wuqi68-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:96dvh;margin:auto;padding:14px 16px;background:#101114;color:#e8e2d2;border:1px solid #4a4d52;border-radius:2px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif;background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.012) 0 2px,transparent 2px 6px)}
    .wuqi68-dialog::backdrop{background:#04050acc}
    .wuqi68-dialog h2{margin:0;font-size:clamp(18px,2.6vw,26px);color:#f2f3f4;font-weight:800;letter-spacing:.02em}
    .xjg-sub{font-size:12px;letter-spacing:.18em;color:#8b8e93}
    .wuqi68-dialog p{margin:6px 0}
    .wuqi68-dialog header,.wuqi68-actions,.wuqi68-builds{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .wuqi68-dialog header{justify-content:space-between}
    .wuqi68-dialog button{font:inherit;background:#1a1c20;color:#e8e2d2;border:1px solid #4a4d52;border-radius:0;padding:8px 14px;min-height:42px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:border-color .12s,background .12s,transform .12s}
    .wuqi68-dialog button:hover{border-color:#8b8e93;transform:translateY(-1px)}
    .wuqi68-dialog button:disabled{opacity:.45;cursor:default;transform:none}
    .wuqi68-dialog button[aria-pressed="true"]{border-color:#ffcf24;box-shadow:inset 0 0 0 1px #ffcf24;background:#26231a}
    .wuqi68-dialog [data-start]{background:#ffcf24;border-color:#ffcf24;color:#111;font-weight:800;clip-path:polygon(13px 0,100% 0,calc(100% - 13px) 100%,0 100%)}
    .wuqi68-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .xjg-stage{position:relative;width:min(82.2dvh,100%);aspect-ratio:16/9;margin:0 auto}
    .wuqi68-dialog canvas{display:block;width:100%;height:100%;background:#171208;touch-action:none;box-shadow:0 0 0 1px #2c2e33}
    .xjg-dp{position:absolute;left:12px;bottom:12px;display:flex;align-items:baseline;gap:6px;background:rgba(16,17,20,.9);border:1px solid #4a4d52;border-left:3px solid #ffcf24;padding:4px 13px;clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)}
    .xjg-dp-n{font-size:24px;font-weight:900;color:#ffcf24;font-variant-numeric:tabular-nums;line-height:1}
    .xjg-dp-l{font-size:12px;letter-spacing:.14em;color:#8b8e93}
    .xjg-dp.dp-pop .xjg-dp-n{animation:xjg-dp-pop .18s steps(2,end)}
    @keyframes xjg-dp-pop{50%{transform:translateY(-3px);color:#fff}}
    .wuqi68-buffs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0 2px;padding:8px 12px;border:1px solid #4a4d52;border-left:3px solid #ffcf24;background:#14151a}
    .wuqi68-buffs>b{flex-basis:100%;font-size:13px;letter-spacing:.16em;color:#ffcf24}
    .wq-bf{display:inline-flex;gap:6px;align-items:baseline;border:1px solid #4a4d52;padding:3px 8px;font-size:13px}
    .wq-bf.wq-on{border-color:#8a7433;background:#221f14}
    .wq-bf.wq-on .wq-bf-d{color:#ffcf24}
    .wq-bf.wq-off{opacity:.8}
    .wq-bf.wq-off .wq-bf-d{color:#7c7f84}
    .wq-bf-n{color:#e8e2d2;font-weight:700}
    .wuqi68-builds{margin-top:8px}
    .wuqi68-builds button{flex:1;min-width:116px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 6px;position:relative}
    .wuqi68-builds button::after{content:'';position:absolute;right:0;top:0;border-style:solid;border-width:0 14px 14px 0;border-color:transparent #ffcf24 transparent transparent;opacity:0}
    .wuqi68-builds button[aria-pressed="true"]::after{opacity:1}
    .xjg-bn{display:inline-flex;align-items:center;gap:4px;font-weight:700}
    .xjg-ico{font-size:1.15em;line-height:1;color:#ffcf24}
    .xjg-cost{font-size:13px;color:#9a9c9f;font-variant-numeric:tabular-nums;letter-spacing:.08em}
    .wuqi68-builds button.dp-no{filter:saturate(.4);opacity:.75}
    .wuqi68-builds button.dp-no .xjg-cost{color:#e5484d;font-weight:700}
    .wuqi68-dialog [data-hud]{color:#9a9c9f;font-size:13px}
    .wuqi68-dialog [data-hud] b{color:#ffcf24;font-weight:800;font-variant-numeric:tabular-nums}
    .wuqi68-status{min-height:1.5em;color:#9a9c9f}
    .wuqi68-actions{margin-top:6px}
    .wuqi68-dialog [hidden]{display:none!important}
    .challenge-item.wuqi68-entry{cursor:pointer;border:1px solid #ab905c;border-radius:8px;padding:13px;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.challenge-item.wuqi68-entry:hover,.challenge-item.wuqi68-entry:focus-visible{transform:translateY(-2px);border-color:#e4c98a;box-shadow:0 5px 16px rgba(0,0,0,.4)}
    .wuqi68-note{font-size:13px;color:#9a9c9f}
    .wuqi68-note{font-size:13px;color:#9a9c9f}
    .wuqi68-shake{animation:wuqi68-shake .18s linear}@keyframes wuqi68-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}
    @media(prefers-reduced-motion:reduce){.wuqi68-shake{animation:none}.xjg-dp.dp-pop .xjg-dp-n{animation:none}.wuqi68-dialog button:hover{transform:none}}
    @media(max-width:600px){.wuqi68-dialog{padding:12px;font-size:13px}.xjg-stage{width:100%}.wuqi68-builds button{min-width:96px}.xjg-dp-n{font-size:20px}.wuqi68-dialog button{padding:7px 12px}}`;
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='wuqi68-dialog';dialog.setAttribute('aria-labelledby','wuqi68-title');
    dialog.innerHTML='<header><div><h2 id="wuqi68-title"></h2><span class="xjg-sub">OPERATION · 切尾巴之战</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><div class="xjg-stage"><canvas width="1280" height="720" tabindex="0" aria-label="吴起镇塔防画面。键盘 1-4 选择兵种，点击可部署格布防，突击排点川道任意位置投放；悬停可预览攻击范围。"></canvas><div class="xjg-dp"><span class="xjg-dp-n" data-dp>100</span><span class="xjg-dp-l">兵力 DP</span></div></div><p data-hud></p><div class="wuqi68-buffs" data-buffs role="group" aria-label="全线战备加成面板"></div><div class="wuqi68-builds" role="group" aria-label="选择兵种"><button data-unit="mg"></button><button data-unit="wall"></button><button data-unit="squad"></button><button data-unit="refund"></button></div><p class="wuqi68-status" role="status" aria-live="polite"></p><div class="wuqi68-actions"><button data-start>作战开始 · OPERATION START</button><button data-next hidden>提前发起 · ENTER</button><button data-pause disabled>暂停</button><button data-mute>声音</button><button data-retry>重新推演</button><button data-complete hidden>记录成绩 · 完成本章</button></div><p class="wuqi68-note">机枪阵地远程射击，拒马迟滞骑兵（对骑兵收益大），突击排限时堵口。击破与过关补充兵力；机关纵队血条见画面左上面板。抽象兵棋符号，无血腥表现。</p><details class="wuqi68-note"><summary>史实与推演说明</summary><p data-hist></p><p>本小游戏为原创教学推演：兵力、射程、波次、分数与重开次数均为练习规则，不代表历史数量与战法。阵地选择不构成对历史指挥的评价。</p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null,build='mg',lastShot=0,hover={on:false,x:0,y:0},lastFunds=-1,dpEl=q('.xjg-dp'),dpN=q('[data-dp]');
    /* 离屏精灵（C 档：代码内生成贴图，无外部素材） */
    const sprite=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');fn(x);return c;};
    const bag=(x,px,py,w,h,base)=>{x.fillStyle=base;x.beginPath();x.ellipse(px+w/2,py+h/2,w/2,h/2.4,0,0,Math.PI*2);x.fill();x.strokeStyle='rgba(0,0,0,.28)';x.lineWidth=1;x.stroke();};
    const sprMG=sprite(56,58,x=>{for(let r=0;r<2;r++)for(let i=0;i<3;i++)bag(x,4+i*17,40+r*9,16,9,r?'#5f5544':'#6a5f4a');x.strokeStyle='#26221c';x.lineWidth=3;x.beginPath();x.moveTo(28,44);x.lineTo(20,24);x.moveTo(28,44);x.lineTo(38,26);x.moveTo(28,44);x.lineTo(28,30);x.stroke();x.strokeStyle='#141210';x.lineWidth=5;x.beginPath();x.moveTo(18,22);x.lineTo(50,12);x.stroke();x.fillStyle='#20281f';x.beginPath();x.arc(38,30,7,0,Math.PI*2);x.fill();x.fillStyle='#161c14';x.fillRect(33,36,10,12);x.beginPath();x.arc(38,28,4.5,0,Math.PI*2);x.fill();});
    const sprWall=sprite(56,58,x=>{for(let i=0;i<3;i++)bag(x,4+i*17,46,16,9,'#6a5f4a');x.strokeStyle='#4a3a22';x.lineWidth=6;x.lineCap='round';x.beginPath();x.moveTo(6,44);x.lineTo(50,18);x.moveTo(6,18);x.lineTo(50,44);x.stroke();x.strokeStyle='#6b5636';x.lineWidth=2.5;x.beginPath();x.moveTo(8,42);x.lineTo(48,20);x.moveTo(8,20);x.lineTo(48,42);x.stroke();x.fillStyle='#33291a';for(const px of [14,28,42]){x.fillRect(px-2,20,4,14);x.beginPath();x.moveTo(px-4,20);x.lineTo(px,9);x.lineTo(px+4,20);x.closePath();x.fill();}});
    const sprSquad=sprite(56,58,x=>{x.fillStyle='#2c3324';x.beginPath();x.arc(20,18,6,0,Math.PI*2);x.fill();x.fillRect(14,24,12,20);x.beginPath();x.arc(34,20,6,0,Math.PI*2);x.fill();x.fillRect(28,26,12,18);x.strokeStyle='#1c1812';x.lineWidth=2.5;x.beginPath();x.moveTo(44,8);x.lineTo(44,46);x.stroke();x.fillStyle='#b8503f';x.beginPath();x.moveTo(45,9);x.lineTo(56,14);x.lineTo(45,20);x.fill();});
    /* 骑兵剪影：骑手+马，两种奔跑姿态；fast 带红巾 */
    const sprCav=(pose,fast)=>sprite(48,46,x=>{const c=fast?'#4c3527':'#3b3325';x.fillStyle=c;
      x.beginPath();x.ellipse(23,29,13,6.5,0,0,Math.PI*2);x.fill();
      x.beginPath();x.moveTo(14,27);x.lineTo(5,15);x.lineTo(9,12);x.lineTo(18,25);x.closePath();x.fill();
      x.beginPath();x.ellipse(6,13,4.5,3,.3,0,Math.PI*2);x.fill();
      x.strokeStyle=c;x.lineWidth=3;x.lineCap='round';x.beginPath();
      if(pose===0){x.moveTo(14,33);x.lineTo(6,42);x.moveTo(30,34);x.lineTo(40,42);x.moveTo(20,34);x.lineTo(16,42);x.moveTo(34,33);x.lineTo(32,42);}
      else{x.moveTo(14,33);x.lineTo(10,42);x.moveTo(30,34);x.lineTo(27,42);x.moveTo(22,34);x.lineTo(25,42);x.moveTo(34,33);x.lineTo(30,42);}
      x.stroke();
      x.fillStyle=fast?'#54372a':'#44392a';x.fillRect(18,12,9,13);
      x.beginPath();x.arc(22.5,8,4,0,Math.PI*2);x.fill();
      x.strokeStyle='#2a2418';x.lineWidth=2.5;x.beginPath();x.moveTo(24,16);x.lineTo(12,24);x.moveTo(26,15);x.lineTo(36,26);x.stroke();
      if(fast){x.fillStyle='#b8503f';x.fillRect(15,9,14,3);}});
    const sprCavA1=sprCav(0,false),sprCavA2=sprCav(1,false),sprCavF1=sprCav(0,true),sprCavF2=sprCav(1,true);
    /* 固定装饰：枯草/碎石/沟壑/星点（确定性，逐帧不变） */
    let seed=68;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
    const deco=s.d.lanes.map(l=>Array.from({length:16},()=>({x:250+rnd()*1000,y:l.y-40+rnd()*80,k:rnd()})));
    const gullies=Array.from({length:26},()=>({x:rnd()*1280,b:(rnd()-.5)*70,w:1+rnd()*2.4,a:.05+rnd()*.09}));
    const stars=Array.from({length:30},()=>({x:rnd()*1280,y:rnd()*110,r:.5+rnd()*1,tw:rnd()*6}));
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const renderBuffs=()=>{const box=q('[data-buffs]');box.innerHTML='<b>全线战备 · FULL CAMPAIGN</b>'+s.buffList.map(b=>'<span class="wq-bf '+(b.ok?'wq-on':'wq-off')+'"><span class="wq-bf-n">'+b.name+'</span><span class="wq-bf-d">'+(b.ok?b.desc:b.miss)+'</span></span>').join('');};
    renderBuffs();
    const unitBtns={};for(const key of ['mg','wall','squad']){const b=q('[data-unit="'+key+'"]'),u=s.d.units[key];b.innerHTML='<span class="xjg-bn"><span class="xjg-ico">'+({mg:'⌖',wall:'✕',squad:'⚑'})[key]+'</span>'+u.name+'</span><span class="xjg-cost">'+u.cost+' DP</span>';unitBtns[key]=b;}
    q('[data-unit="refund"]').innerHTML='<span class="xjg-bn"><span class="xjg-ico">♻</span>回收阵地</span><span class="xjg-cost">半价 · RETREAT</span>';
    const sound=kind=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime;if(kind==='shot'){if(now-lastShot<.09)return;lastShot=now;}const o=ac.createOscillator(),g=ac.createGain();o.type=kind==='breach'?'sawtooth':'triangle';const f=kind==='breach'?70:kind==='wave'?220:kind==='win'?660:kind==='lose'?140:kind==='place'?320:150;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f/(kind==='win'?1:2.6)),now+(kind==='wave'?.5:.24));g.gain.setValueAtTime(kind==='shot'?.045:.09,now);g.gain.exponentialRampToValueAtTime(.001,now+.3);o.connect(g);g.connect(master);o.start();o.stop(now+.32);if(kind==='breach'||kind==='shot'){const b=ac.createBuffer(1,ac.sampleRate*.12,ac.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const n=ac.createBufferSource(),ng=ac.createGain();n.buffer=b;ng.gain.value=kind==='breach'?.09:.05;n.connect(ng);ng.connect(master);n.start();}}catch{/* Sound must never block the exercise. */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{const left=s.spawn.list.length+s.enemies.length;
      if(Math.round(s.funds)!==lastFunds){if(lastFunds>=0){dpEl.classList.remove('dp-pop');void dpEl.offsetWidth;dpEl.classList.add('dp-pop');}lastFunds=Math.round(s.funds);}
      dpN.textContent=Math.round(s.funds);
      q('[data-hud]').innerHTML=`第 <b>${Math.min(s.wave+1,3)}/3</b> 波 · 纵队 <b>${Math.max(0,Math.round(s.column.hp))}%</b> · 渡川 <b>${Math.round(s.column.progress*100)}%</b> · 场上敌骑 <b>${left}</b>`;
      for(const key in unitBtns){unitBtns[key].setAttribute('aria-pressed',String(build===key));unitBtns[key].classList.toggle('dp-no',s.funds<s.d.units[key].cost);}
      q('[data-unit="refund"]').setAttribute('aria-pressed',String(build==='refund'));
      q('[data-start]').hidden=s.status!=='ready';q('[data-next]').hidden=!(s.status==='playing'&&s.phase==='build');q('[data-pause]').disabled=s.status!=='playing';q('[data-pause]').textContent=manualPause?'继续 · RESUME':'暂停 · PAUSE';q('[data-mute]').textContent=this.muted()?'声音 ON':'声音 OFF';q('[data-complete]').hidden=s.status!=='won';const text=s.status==='ready'?'选好兵种、布好拒马，再开始推演。':s.status==='won'?this.rating(s,retries).rating+' · '+s.reason:s.status==='lost'?s.reason:manualPause||this.paused()?'推演已暂停。':s.phase==='build'?'构筑阶段：'+Math.ceil(s.buildLeft)+' 秒后骑兵来袭，抓紧布防。':s.enemies.length?'阻击中……注意纵队血条。':'敌骑尚未出现。';if(q('.wuqi68-status').textContent!==text)q('.wuqi68-status').textContent=text;};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};q('[data-next]').onclick=()=>{if(s.status==='playing'&&s.phase==='build'){s.buildLeft=0;sync();}};q('[data-pause]').onclick=()=>{gesture();manualPause=!manualPause;last=0;sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);this.session=s;manualPause=false;recorded=false;last=0;renderBuffs();sync();draw();q('[data-start]').focus();};
    for(const key of ['mg','wall','squad','refund'])q('[data-unit="'+key+'"]').onclick=()=>{build=key;sync();};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.rating(s,retries),key='wuqi68_'+node.id;GameState.storyPreparations=GameState.storyPreparations||{};const old=GameState.storyPreparations[key];if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,hp:Math.round(s.column.hp),retries,completedAt:new Date().toISOString()};if(typeof GameState.recordBattleScore==='function')GameState.recordBattleScore(node.id,result.score,result.rating);if(typeof GameState.save==='function')if(GameState.save()===false){recorded=false;if(typeof GameUI!=='undefined')GameUI.showToast('成绩尚未保存，请重试记录。');return;}close();if(typeof onComplete==='function')onComplete();};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),ox=r.left+(r.width-1280*scale)/2,oy=r.top+(r.height-720*scale)/2;return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale};};
    canvas.onpointerdown=e=>{if(s.status!=='playing'||manualPause||this.paused()||e.button>0)return;const p=point(e);gesture();canvas.focus();e.preventDefault();
      let si=-1,best=75;for(let i=0;i<s.d.slots.length;i++){const dist=Math.hypot(p.x-s.d.slots[i].x,p.y-s.d.lanes[s.d.slots[i].lane].y);if(dist<best){best=dist;si=i;}}
      if(build==='refund'){if(si>=0&&s.slots[si])this.refund(s,si);}
      else if(build==='squad'){const lane=s.d.lanes.findIndex(l=>Math.abs(p.y-l.y)<70);if(lane>=0)this.reserve(s,lane,p.x);}
      else if(si>=0&&!s.slots[si])this.deploy(s,si,build);
      sync();};
    canvas.onpointermove=e=>{const p=point(e);hover.on=true;hover.x=p.x;hover.y=p.y;};
    canvas.onpointerleave=()=>{hover.on=false;};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.target!==canvas)return;if(['1','2','3','4'].includes(e.key)){build=['mg','wall','squad','refund'][Number(e.key)-1];sync();return;}if(e.key==='Enter'&&s.phase==='build'){s.buildLeft=0;sync();}};dialog.addEventListener('keydown',key);
    const rr=(x,y,w,h,r)=>{ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();};
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);
      /* 黄昏天幕（黄土高原暮色） */
      const sky=ctx.createLinearGradient(0,0,0,196);sky.addColorStop(0,'#332a19');sky.addColorStop(.55,'#6e5a35');sky.addColorStop(1,'#8f7443');ctx.fillStyle=sky;ctx.fillRect(0,0,1280,196);
      for(const st of stars){ctx.globalAlpha=.22+.3*Math.abs(Math.sin(s.time*.7+st.tw));ctx.fillStyle='#f4ecd6';ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
      const glow=ctx.createRadialGradient(1042,64,8,1042,64,84);glow.addColorStop(0,'rgba(244,225,170,.75)');glow.addColorStop(1,'rgba(244,225,170,0)');ctx.fillStyle=glow;ctx.fillRect(950,0,190,190);ctx.fillStyle='#f2e3b2';ctx.beginPath();ctx.arc(1042,64,20,0,Math.PI*2);ctx.fill();
      /* 洛河对岸塬峁剪影 + 洛河窄带 */
      ctx.fillStyle='#241b0d';ctx.beginPath();ctx.moveTo(0,172);for(let x=0;x<=1280;x+=44)ctx.lineTo(x,132+Math.sin(x*.008+2.4)*24+Math.sin(x*.023+1)*7);ctx.lineTo(1280,178);ctx.lineTo(1280,192);ctx.lineTo(0,192);ctx.fill();
      const riv=ctx.createLinearGradient(0,168,0,196);riv.addColorStop(0,'#5d6a52');riv.addColorStop(1,'#414c3d');ctx.fillStyle=riv;ctx.fillRect(0,168,1280,28);
      for(let i=0;i<12;i++){const gx=(i*113+s.time*24)%1300-10;ctx.fillStyle='rgba(226,236,204,.16)';ctx.fillRect(gx,173+(i%4)*5,30,2);}
      /* 川道地面：黄土渐变 + 沟壑纹 */
      const ground=ctx.createLinearGradient(0,196,0,720);ground.addColorStop(0,'#71603c');ground.addColorStop(.45,'#645433');ground.addColorStop(1,'#4c3f27');ctx.fillStyle=ground;ctx.fillRect(0,196,1280,524);
      for(const g of gullies){ctx.strokeStyle='rgba(28,20,9,'+g.a.toFixed(3)+')';ctx.lineWidth=g.w;ctx.beginPath();ctx.moveTo(g.x,198);ctx.quadraticCurveTo(g.x+g.b,460,g.x+g.b*2.4,718);ctx.stroke();}
      /* 左带：吴起镇（机关纵队驻地） */
      const town=ctx.createLinearGradient(0,0,192,0);town.addColorStop(0,'#1d1509');town.addColorStop(1,'#2f2313');ctx.fillStyle=town;ctx.fillRect(0,0,192,720);
      for(let row=0;row<2;row++)for(let i=0;i<3;i++){const bx=26+i*50,by=150+row*180;ctx.fillStyle='#140f06';ctx.beginPath();ctx.moveTo(bx,by+46);ctx.lineTo(bx,by+18);ctx.arc(bx+17,by+18,17,Math.PI,0);ctx.lineTo(bx+34,by+46);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(244,214,140,.25)';ctx.beginPath();ctx.moveTo(bx+9,by+42);ctx.lineTo(bx+9,by+24);ctx.arc(bx+17,by+24,8,Math.PI,0);ctx.lineTo(bx+25,by+42);ctx.closePath();ctx.fill();}
      ctx.strokeStyle='#3a2c16';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(158,64);ctx.lineTo(158,120);ctx.stroke();ctx.fillStyle='#b8503f';ctx.beginPath();ctx.moveTo(158,64);ctx.lineTo(186,72);ctx.lineTo(158,84);ctx.fill();
      ctx.fillStyle='#3a2f1e';ctx.fillRect(60,60,8,52);ctx.fillStyle='#57452a';ctx.fillRect(24,44,80,28);ctx.strokeStyle='#2c2314';ctx.strokeRect(24,44,80,28);ctx.fillStyle='#e8d5a5';ctx.font='bold 17px sans-serif';ctx.fillText('吴起镇',36,66);
      /* 河滩过渡 */
      const beach=ctx.createLinearGradient(192,0,236,0);beach.addColorStop(0,'#3b3320');beach.addColorStop(1,'#55462b');ctx.fillStyle=beach;ctx.fillRect(192,0,44,720);
      ctx.fillStyle='#514630';ctx.fillRect(186,0,6,720);ctx.fillStyle='#6a5c3e';ctx.fillRect(186,0,2,720);
      /* 三条川道 */
      for(let li=0;li<s.d.lanes.length;li++){const y=s.d.lanes[li].y;
        const g2=ctx.createLinearGradient(0,y-46,0,y+46);g2.addColorStop(0,'#6a5a3c');g2.addColorStop(.5,'#5f5034');g2.addColorStop(1,'#4e4128');ctx.fillStyle=g2;ctx.fillRect(236,y-46,1044,92);
        ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(236,y-46,1044,4);ctx.fillRect(236,y+42,1044,4);
        ctx.strokeStyle='rgba(230,205,150,.15)';ctx.lineWidth=2;ctx.setLineDash([16,30]);ctx.beginPath();ctx.moveTo(250,y);ctx.lineTo(1270,y);ctx.stroke();ctx.setLineDash([]);
        for(const dd of deco[li]){if(dd.k<.55){ctx.strokeStyle='rgba(160,140,72,.5)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(dd.x,dd.y+3);ctx.lineTo(dd.x-3,dd.y-4);ctx.moveTo(dd.x,dd.y+3);ctx.lineTo(dd.x+1,dd.y-5);ctx.moveTo(dd.x,dd.y+3);ctx.lineTo(dd.x+4,dd.y-3);ctx.stroke();}else{ctx.fillStyle='rgba(46,38,24,.8)';ctx.beginPath();ctx.ellipse(dd.x,dd.y,4,2.6,dd.k,0,Math.PI*2);ctx.fill();}}
        ctx.fillStyle='rgba(8,6,3,.55)';ctx.fillRect(236,y-46,52,92);
        ctx.lineWidth=2;ctx.strokeStyle='#8a4434';ctx.beginPath();ctx.moveTo(252,y-38);ctx.lineTo(252,y-16);ctx.stroke();ctx.fillStyle='#b8503f';ctx.beginPath();ctx.moveTo(252,y-38);ctx.lineTo(268,y-33);ctx.lineTo(252,y-28);ctx.fill();
        ctx.fillStyle='#e8d5a5';ctx.font='13px sans-serif';ctx.fillText('川道 '+(li+1),272,y-22);}
      /* AK：切角助手 */
      const cut=(x,y,w,h,c)=>{ctx.beginPath();ctx.moveTo(x+c,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+c);ctx.closePath();};
      const fanRange=(x,y,r)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,r,-Math.PI/3,Math.PI/3);ctx.closePath();ctx.fillStyle='#7ecbff33';ctx.fill();ctx.strokeStyle='#7ecbff';ctx.lineWidth=1.5;ctx.stroke();};
      const circRange=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#7ecbff33';ctx.fill();ctx.strokeStyle='#7ecbff';ctx.lineWidth=1.5;ctx.stroke();};
      /* 可部署格（6 锚点不动，绘制菱形贴附） */
      let hovSlot=-1,hovLane=-1;
      if(hover.on&&s.status==='playing'){let best=50;for(let i=0;i<s.d.slots.length;i++){const pos=s.d.slots[i],dist=Math.hypot(hover.x-pos.x,hover.y-s.d.lanes[pos.lane].y);if(dist<best){best=dist;hovSlot=i;}}
        if(build==='squad')hovLane=s.d.lanes.findIndex(l=>Math.abs(hover.y-l.y)<70);}
      for(let i=0;i<s.d.slots.length;i++){const pos=s.d.slots[i],u=s.slots[i],ly=s.d.lanes[pos.lane].y;
        const deployable=build==='mg'||build==='wall',active=deployable&&s.status==='playing',hovHere=hover.on&&i===hovSlot;
        ctx.beginPath();ctx.moveTo(pos.x,ly-44);ctx.lineTo(pos.x+44,ly);ctx.lineTo(pos.x,ly+44);ctx.lineTo(pos.x-44,ly);ctx.closePath();
        if(!u){ctx.fillStyle=active?(hovHere?'#4a3a1ecc':'#3d331ecc'):'#2e2818cc';ctx.fill();ctx.strokeStyle=hovHere&&active?'#ffcf24':'#8a7a58';ctx.lineWidth=hovHere&&active?2:1.5;ctx.stroke();}
        else{ctx.fillStyle='#3a3120cc';ctx.fill();ctx.strokeStyle='#8a7a58';ctx.lineWidth=1.5;ctx.stroke();}
        if(!u&&active&&hovHere&&s.funds>=s.d.units[build].cost){if(build==='mg')fanRange(pos.x,ly,270);else circRange(pos.x,ly,95);}
        if(!u)continue;
        if(u.halo>0){ctx.strokeStyle='rgba(255,207,36,'+(u.halo/.6).toFixed(2)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(pos.x,ly,30+(0.6-u.halo)*26,0,Math.PI*2);ctx.stroke();}
        const spr=u.type==='mg'?sprMG:u.type==='wall'?sprWall:sprSquad;ctx.drawImage(spr,pos.x-28,ly-40);
        if(u.flash>0){ctx.strokeStyle='rgba(255,233,168,'+(u.flash/.08).toFixed(2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pos.x,ly,34,0,Math.PI*2);ctx.stroke();}
        if(u.tx!==null&&u.tx!==undefined&&u.flash>0){ctx.strokeStyle='rgba(255,207,36,'+(u.flash/.08*.9).toFixed(2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pos.x+22,ly-20);ctx.lineTo(u.tx,u.ty);ctx.stroke();}
        ctx.fillStyle='#10161c';rr(pos.x-24,ly+26,48,7,3);ctx.fill();ctx.fillStyle=u.hp/u.maxHp>.4?'#7dc47f':'#d96455';rr(pos.x-24,ly+26,48*Math.max(0,u.hp/u.maxHp),7,3);ctx.fill();}
      /* 突击排（临时）+ 悬停投放预览 */
      if(hover.on&&build==='squad'&&s.status==='playing'&&s.funds>=s.d.units.squad.cost&&hovLane>=0)fanRange(Math.max(210,Math.min(1150,hover.x)),s.d.lanes[hovLane].y,160);
      for(const u of s.temps){const ly=s.d.lanes[u.lane].y;ctx.globalAlpha=Math.max(.35,Math.min(1,u.life/4));ctx.drawImage(sprSquad,u.x-28,ly-40);ctx.globalAlpha=1;
        if(u.tx!==null&&u.tx!==undefined&&u.flash>0){ctx.strokeStyle='rgba(255,207,36,'+(u.flash/.08*.9).toFixed(2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(u.x+20,ly-20);ctx.lineTo(u.tx,u.ty);ctx.stroke();}
        ctx.fillStyle='#10161c';rr(u.x-20,ly+22,40,6,3);ctx.fill();ctx.fillStyle='#7dc47f';rr(u.x-20,ly+22,40*Math.max(0,u.hp/u.maxHp),6,3);ctx.fill();}
      /* 情报先行 buff：敌骑出场前 2 秒行进箭头预警（纯视觉） */
      if(s.buffs&&s.buffs.scout&&s.status==='playing'&&s.phase==='combat'){for(const m of s.spawn.list){const dl=m.t-s.spawn.timer;if(dl>2)continue;const ly=s.d.lanes[m.lane].y,ax=1230,al=.35+.65*Math.abs(Math.sin(s.time*6));
        ctx.globalAlpha=al;ctx.fillStyle='#ffcf24';
        ctx.beginPath();ctx.moveTo(ax-14,ly-9);ctx.lineTo(ax,ly-16);ctx.lineTo(ax,ly-2);ctx.closePath();ctx.fill();
        ctx.beginPath();ctx.moveTo(ax,ly-9);ctx.lineTo(ax+14,ly-16);ctx.lineTo(ax+14,ly-2);ctx.closePath();ctx.fill();
        ctx.globalAlpha=1;ctx.fillStyle='#ffcf24';ctx.font='12px sans-serif';ctx.fillText('骑兵将至',ax-24,ly-24);}}
      /* 敌骑：3px 红血条 + 精英标（两种奔跑姿态） */
      const wNow=s.d.waves[Math.max(0,Math.min(s.d.waves.length-1,s.wave))];
      for(const e of s.enemies){const ly=s.d.lanes[e.lane].y,pose=Math.floor(s.time*7+e.x*.03)%2;const spr=e.fast?(pose?sprCavF2:sprCavF1):(pose?sprCavA2:sprCavA1);
        ctx.drawImage(spr,e.x-24,ly-38);
        ctx.fillStyle='#10161c';ctx.fillRect(e.x-14,ly-48,28,4);ctx.fillStyle='#e5484d';ctx.fillRect(e.x-14,ly-48,28*Math.max(0,e.hp)/wNow.hp,4);
        if(e.fast){ctx.fillStyle='#ffcf24';ctx.beginPath();ctx.moveTo(e.x+16,ly-48);ctx.lineTo(e.x+23,ly-48);ctx.lineTo(e.x+19.5,ly-42);ctx.closePath();ctx.fill();}}
      /* 命中火花 */
      for(const p of s.particles){ctx.globalAlpha=Math.max(0,p.life/.4);ctx.fillStyle='#ffcf24';ctx.fillRect(p.x,p.y,4,4);}ctx.globalAlpha=1;
      /* 左上战况面板（纵队战力 / 机关渡川） */
      ctx.fillStyle='rgba(13,14,16,.9)';cut(16,14,368,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(16,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('吴起战况',34,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('TACTICAL  STATUS',116,36);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('纵队战力',34,58);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('LIFE',86,58);
      ctx.fillStyle='#1a1c20';cut(140,46,188,14,4);ctx.fill();ctx.fillStyle='#e5484d';cut(140,46,188*Math.max(0,s.column.hp)/100,14,4);ctx.fill();
      ctx.fillStyle='#e5484d';ctx.font='900 16px sans-serif';ctx.textAlign='right';ctx.fillText(Math.max(0,Math.round(s.column.hp))+'%',368,59);ctx.textAlign='left';
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('机关渡川',34,84);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('CROSSING',86,84);
      ctx.fillStyle='#1a1c20';cut(140,72,188,14,4);ctx.fill();ctx.fillStyle='#ffcf24';cut(140,72,188*s.column.progress,14,4);ctx.fill();
      ctx.fillStyle='#ffcf24';ctx.font='900 16px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(s.column.progress*100)+'%',368,85);ctx.textAlign='left';
      /* 右上 ENEMY / WAVE 面板 */
      const total=wNow.count,left=s.spawn.list.length+s.enemies.length;
      ctx.fillStyle='rgba(13,14,16,.9)';cut(1046,14,218,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#e5484d';ctx.fillRect(1046,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('敌骑残余',1064,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('ENEMY',1126,36);
      ctx.fillStyle='#f2f3f4';ctx.font='900 20px sans-serif';ctx.fillText(left+' / '+total,1064,60);
      for(let k=0;k<total;k++){ctx.fillStyle=k<left?'#e5484d':'#3a3d42';ctx.fillRect(1140+(k%10)*10,46+(Math.floor(k/10))*10,6,6);}
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('WAVE',1064,82);ctx.fillStyle='#ffcf24';ctx.font='900 14px sans-serif';ctx.fillText(Math.min(s.wave+1,3)+' / 3',1102,82);
      if(s.status==='playing'&&s.phase==='build'){ctx.fillStyle='#ffcf24';ctx.font='12px sans-serif';ctx.fillText('NEXT WAVE IN '+Math.ceil(s.buildLeft)+'s',1150,82);}
      /* 暗角 + 角标 */
      const vig=ctx.createRadialGradient(640,360,330,640,360,780);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.38)');ctx.fillStyle=vig;ctx.fillRect(0,0,1280,720);
      ctx.fillStyle='rgba(13,14,16,.78)';cut(16,678,252,42,8);ctx.fill();
      ctx.font='13px sans-serif';ctx.fillStyle='#f5e7c0';ctx.fillText('切尾巴之战 · 吴起镇 1935',30,695);
      ctx.font='12px sans-serif';ctx.fillStyle='#d3d6db';ctx.fillText('抽象兵棋符号 · 无血腥表现',30,711);
      /* 胜负大字层 */
      if(s.status==='won'||s.status==='lost'){const won=s.status==='won';ctx.fillStyle='rgba(6,8,10,.55)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(13,14,16,.92)';cut(300,240,680,168,16);ctx.fill();ctx.strokeStyle=won?'#ffcf24':'#e5484d';ctx.lineWidth=2;ctx.stroke();
        ctx.textAlign='center';ctx.fillStyle=won?'#ffcf24':'#e5484d';ctx.font='bold 44px sans-serif';ctx.fillText(won?'任务完成':'防线被突破',640,312);
        ctx.fillStyle='#8b8e93';ctx.font='13px sans-serif';ctx.fillText(won?'M I S S I O N   A C C O M P L I S H E D':'M I S S I O N   F A I L E D',640,338);
        const rt=this.rating(s,retries);ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(rt.rating+' · '+rt.score+' 分',640,372);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText(s.reason,640,394);ctx.textAlign='left';}
    };
    let hudAt=0;const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000);last=now;
      for(const event of s.events.splice(0)){sound(event);if(event==='breach'){canvas.classList.remove('wuqi68-shake');void canvas.offsetWidth;canvas.classList.add('wuqi68-shake');}}
      draw();if(now-hudAt>100||s.status!=='playing'){sync();hudAt=now;}raf=requestAnimationFrame(frame);
    };sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
