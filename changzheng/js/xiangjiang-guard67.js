/* Original wargame exercise: abstract tokens only, no gore and no real parameters. */
window.XiangjiangGuard67={
  supports(id){return [2].includes(Number(id));},
  definitions:{
    2:{title:'渡口阻击 · 血战湘江',columnRate:.012,
      intro:'兵棋推演：先选兵种，再点虚线阵地布防；预备队可直接点通道任意位置投放。顶住四波进攻，掩护纵队渡江。',
      success:'纵队渡江完毕，防线任务完成。每一分坚持都为渡江多争一分把握。',
      lanes:[{y:238},{y:392},{y:546}],
      slots:[{lane:0,x:430},{lane:0,x:720},{lane:1,x:430},{lane:1,x:720},{lane:2,x:430},{lane:2,x:720}],
      crossing:{x:165},
      column:{hp:100,drain:18},
      waves:[
        {count:6,hp:30,speed:34,gap:1.3,fast:false},
        {count:9,hp:48,speed:38,gap:1.1,fast:false},
        {count:12,hp:66,speed:42,gap:.95,fast:false},
        {count:15,hp:84,speed:46,gap:.85,fast:true}
      ],
      units:{
        mg:{name:'机枪位',cost:30,rate:.55,range:270,dmg:11,hp:130},
        wall:{name:'工事',cost:40,rate:0,range:0,dmg:0,hp:240,slow:.45,slowRange:95},
        squad:{name:'预备队',cost:55,rate:.8,range:160,dmg:9,hp:90,life:14}
      },
      buildTime:10,startFunds:100,killIncome:6,waveIncome:40,
      hist:'湘江战役发生于 1934 年 11 月 27 日至 12 月 1 日。据党史出版物记载，中央红军由长征出发时的 8.6 万余人锐减至 3 万余人；担任后卫的红 34 师师长陈树湘伤重被俘后断肠明志，其事迹见本站支线《陈树湘》。'
    }
  },
  create(id){const d=this.definitions[id];return {id:Number(id),d,funds:d.startFunds,wave:0,phase:'build',buildLeft:d.buildTime,spawn:{list:[],timer:0},enemies:[],slots:d.slots.map(()=>null),temps:[],column:{hp:d.column.hp,progress:0},kills:0,lost:0,time:0,accumulator:0,particles:[],status:'ready',reason:'',events:[]};},
  deploy(s,i,type){const d=s.d,u=d.units[type];if(!u||i<0||i>=s.slots.length||s.slots[i]||s.funds<u.cost||s.status!=='playing')return false;s.slots[i]={type,cost:u.cost,dmg:u.dmg,rate:u.rate,range:u.range,hp:u.hp,maxHp:u.hp,slow:u.slow||1,slowRange:u.slowRange||0,life:u.life||0,cool:0,flash:0,halo:.6};s.funds-=u.cost;s.events.push('place');return true;},
  refund(s,i){const u=s.slots[i];if(!u||s.status!=='playing')return false;s.funds+=Math.ceil(u.cost/2);s.slots[i]=null;s.events.push('place');return true;},
  reserve(s,lane,x){const d=s.d,u=d.units.squad;if(lane<0||lane>=d.lanes.length||s.funds<u.cost||s.status!=='playing')return false;s.temps.push({type:'squad',lane,x:Math.max(210,Math.min(1150,x)),dmg:u.dmg,rate:u.rate,range:u.range,hp:u.hp,maxHp:u.hp,life:u.life,cool:0,flash:0,halo:.6});s.funds-=u.cost;s.events.push('place');return true;},
  startWave(s){const d=s.d,w=d.waves[s.wave];s.spawn.list=[];for(let i=0;i<w.count;i++)s.spawn.list.push({t:i*w.gap,hp:w.hp,speed:w.speed,fast:w.fast,lane:(i*2+s.wave)%d.lanes.length,x:1280});s.spawn.timer=0;s.phase='combat';s.events.push('wave');},
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');},
  step(s,dt=1/120){
    if(s.status!=='playing')return;const d=s.d;s.time+=dt;
    if(s.phase==='build'){s.buildLeft-=dt;if(s.buildLeft<=0)this.startWave(s);}
    else if(s.phase==='combat'){
      s.spawn.timer+=dt;while(s.spawn.list.length&&s.spawn.list[0].t<=s.spawn.timer){const m=s.spawn.list.shift();s.enemies.push({...m});}
      for(const e of s.enemies){let slow=1;for(let i=0;i<s.slots.length;i++){const u=s.slots[i];if(u&&u.type==='wall'&&d.slots[i].lane===e.lane&&Math.abs(e.x-d.slots[i].x)<=u.slowRange)slow=Math.min(slow,u.slow);}for(const u of s.temps)if(u.lane===e.lane&&u.type==='wall')slow=Math.min(slow,u.slow);e.x-=e.speed*slow*dt;}
      for(let i=0;i<s.slots.length;i++){const u=s.slots[i];if(!u)continue;if(u.type==='wall')continue;u.cool-=dt;if(u.cool>0)continue;const pos=d.slots[i];const target=s.enemies.filter(e=>e.lane===pos.lane&&e.x>=pos.x-10&&e.x-pos.x<=u.range).sort((a,b)=>a.x-b.x)[0];if(target){target.hp-=u.dmg;u.cool=u.rate;u.flash=.08;u.tx=target.x;u.ty=d.lanes[pos.lane].y;s.events.push('shot');}}
      for(const u of s.temps){u.life-=dt;u.cool-=dt;if(u.type!=='wall'&&u.cool<=0){const target=s.enemies.filter(e=>e.lane===u.lane&&e.x>=u.x-10&&e.x-u.x<=u.range).sort((a,b)=>a.x-b.x)[0];if(target){target.hp-=u.dmg;u.cool=u.rate;u.flash=.08;u.tx=target.x;u.ty=d.lanes[u.lane].y;s.events.push('shot');}}}
      for(const e of s.enemies){if(e.hp<=0){s.kills++;s.funds+=d.killIncome;e.dead=true;for(let k=0;k<8;k++)s.particles.push({x:e.x,y:d.lanes[e.lane].y,vx:(Math.random()-.5)*90,vy:(Math.random()-.7)*90,life:.4});s.events.push('kill');}}
      s.enemies=s.enemies.filter(e=>{if(e.dead)return false;if(e.x<=d.crossing.x){s.column.hp-=d.column.drain;s.lost++;for(let k=0;k<10;k++)s.particles.push({x:d.crossing.x+16,y:d.lanes[e.lane].y,vx:(Math.random()-.2)*120,vy:(Math.random()-.7)*120,life:.45});s.events.push('breach');return false;}return true;});
      if(s.column.hp<=0){this.finish(s,false,'纵队渡江受阻，防线被突破。可重新推演，调整阵地与预备队的使用。');return;}
      s.column.progress=Math.min(1,s.column.progress+d.columnRate*dt);
      if(!s.spawn.list.length&&!s.enemies.length){s.funds+=d.waveIncome;s.wave++;if(s.wave>=d.waves.length)this.finish(s,true,d.success);else{s.phase='build';s.buildLeft=d.buildTime;s.events.push('wave');}}
    }
    s.temps=s.temps.filter(u=>u.life>0&&u.hp>0);
      for(const u of s.slots)if(u){u.flash=Math.max(0,u.flash-dt);u.halo=Math.max(0,(u.halo||0)-dt);}for(const u of s.temps){u.flash=Math.max(0,u.flash-dt);u.halo=Math.max(0,(u.halo||0)-dt);}
    for(const p of s.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}s.particles=s.particles.filter(p=>p.life>0);
  },
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.25,seconds));while(s.accumulator+1e-9>=1/120){this.step(s);s.accumulator-=1/120;}},
  rating(s,retries){return retries===0&&s.column.hp>=s.d.column.hp?{score:95,rating:'钢铁防线'}:retries<=1?{score:85,rating:'血肉长城'}:{score:70,rating:'完成任务'};},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('xjg67-style'))return;const el=document.createElement('style');el.id='xjg67-style';el.textContent=`
    .xjg67-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:96dvh;margin:auto;padding:14px 16px;background:#101114;color:#e8e2d2;border:1px solid #4a4d52;border-radius:2px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif;background-image:repeating-linear-gradient(45deg,rgba(255,255,255,.012) 0 2px,transparent 2px 6px)}
    .xjg67-dialog::backdrop{background:#04050acc}
    .xjg67-dialog h2{margin:0;font-size:clamp(18px,2.6vw,26px);color:#f2f3f4;font-weight:800;letter-spacing:.02em}
    .xjg-sub{font-size:12px;letter-spacing:.18em;color:#8b8e93}
    .xjg67-dialog p{margin:6px 0}
    .xjg67-dialog header,.xjg67-actions,.xjg67-builds{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .xjg67-dialog header{justify-content:space-between}
    .xjg67-dialog button{font:inherit;background:#1a1c20;color:#e8e2d2;border:1px solid #4a4d52;border-radius:0;padding:8px 14px;min-height:42px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:border-color .12s,background .12s,transform .12s}
    .xjg67-dialog button:hover{border-color:#8b8e93;transform:translateY(-1px)}
    .xjg67-dialog button:disabled{opacity:.45;cursor:default;transform:none}
    .xjg67-dialog button[aria-pressed="true"]{border-color:#ffcf24;box-shadow:inset 0 0 0 1px #ffcf24;background:#26231a}
    .xjg67-dialog [data-start]{background:#ffcf24;border-color:#ffcf24;color:#111;font-weight:800;clip-path:polygon(13px 0,100% 0,calc(100% - 13px) 100%,0 100%)}
    .xjg67-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .xjg-stage{position:relative;width:min(82.2dvh,100%);aspect-ratio:16/9;margin:0 auto}
    .xjg67-dialog canvas{display:block;width:100%;height:100%;background:#0d1526;touch-action:none;box-shadow:0 0 0 1px #2c2e33}
    .xjg-dp{position:absolute;left:12px;bottom:12px;display:flex;align-items:baseline;gap:6px;background:rgba(16,17,20,.9);border:1px solid #4a4d52;border-left:3px solid #ffcf24;padding:4px 13px;clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)}
    .xjg-dp-n{font-size:24px;font-weight:900;color:#ffcf24;font-variant-numeric:tabular-nums;line-height:1}
    .xjg-dp-l{font-size:12px;letter-spacing:.14em;color:#8b8e93}
    .xjg-dp.dp-pop .xjg-dp-n{animation:xjg-dp-pop .18s steps(2,end)}
    @keyframes xjg-dp-pop{50%{transform:translateY(-3px);color:#fff}}
    .xjg67-builds{margin-top:8px}
    .xjg67-builds button{flex:1;min-width:116px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 6px;position:relative}
    .xjg67-builds button::after{content:'';position:absolute;right:0;top:0;border-style:solid;border-width:0 14px 14px 0;border-color:transparent #ffcf24 transparent transparent;opacity:0}
    .xjg67-builds button[aria-pressed="true"]::after{opacity:1}
    .xjg-bn{display:inline-flex;align-items:center;gap:4px;font-weight:700}
    .xjg-ico{font-size:1.15em;line-height:1;color:#ffcf24}
    .xjg-cost{font-size:13px;color:#9a9c9f;font-variant-numeric:tabular-nums;letter-spacing:.08em}
    .xjg67-builds button.dp-no{filter:saturate(.4);opacity:.75}
    .xjg67-builds button.dp-no .xjg-cost{color:#e5484d;font-weight:700}
    .xjg67-dialog [data-hud]{color:#9a9c9f;font-size:13px}
    .xjg67-dialog [data-hud] b{color:#ffcf24;font-weight:800;font-variant-numeric:tabular-nums}
    .xjg67-status{min-height:1.5em;color:#9a9c9f}
    .xjg67-actions{margin-top:6px}
    .xjg67-dialog [hidden]{display:none!important}
    .challenge-item.xjg67-entry{cursor:pointer;border:1px solid #ab905c;border-radius:8px;padding:13px;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.challenge-item.xjg67-entry:hover,.challenge-item.xjg67-entry:focus-visible{transform:translateY(-2px);border-color:#e4c98a;box-shadow:0 5px 16px rgba(0,0,0,.4)}
    .xjg67-note{font-size:13px;color:#9a9c9f}
    .xjg67-shake{animation:xjg67-shake .18s linear}@keyframes xjg67-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}
    @media(prefers-reduced-motion:reduce){.xjg67-shake{animation:none}.xjg-dp.dp-pop .xjg-dp-n{animation:none}.xjg67-dialog button:hover{transform:none}}
    @media(max-width:600px){.xjg67-dialog{padding:12px;font-size:13px}.xjg-stage{width:100%}.xjg67-builds button{min-width:96px}.xjg-dp-n{font-size:20px}.xjg67-dialog button{padding:7px 12px}}`;
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='xjg67-dialog';dialog.setAttribute('aria-labelledby','xjg67-title');
    dialog.innerHTML='<header><div><h2 id="xjg67-title"></h2><span class="xjg-sub">OPERATION · 渡口阻击</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><div class="xjg-stage"><canvas width="1280" height="720" tabindex="0" aria-label="渡口阻击塔防画面。键盘 1-4 选择兵种，点击可部署格布防，预备队点通道任意位置投放；悬停可预览攻击范围。"></canvas><div class="xjg-dp"><span class="xjg-dp-n" data-dp>100</span><span class="xjg-dp-l">兵力 DP</span></div></div><p data-hud></p><div class="xjg67-builds" role="group" aria-label="选择兵种"><button data-unit="mg"></button><button data-unit="wall"></button><button data-unit="squad"></button><button data-unit="refund"></button></div><p class="xjg67-status" role="status" aria-live="polite"></p><div class="xjg67-actions"><button data-start>作战开始 · OPERATION START</button><button data-next hidden>提前发起 · ENTER</button><button data-pause disabled>暂停</button><button data-mute>声音</button><button data-retry>重新推演</button><button data-complete hidden>记录成绩 · 完成本章</button></div><p class="xjg67-note">机枪位远程射击，工事迟滞敌兵，预备队限时堵口。击破与过关补充兵力；纵队血条见画面左上面板。抽象兵棋符号，无血腥表现。</p><details class="xjg67-note"><summary>史实与推演说明</summary><p data-hist></p><p>本小游戏为原创教学推演：兵力、射程、波次、分数与重开次数均为练习规则，不代表历史数量与战法。阵地选择不构成对历史指挥的评价。</p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null,build='mg',lastShot=0,hover={on:false,x:0,y:0},lastFunds=-1,dpEl=q('.xjg-dp'),dpN=q('[data-dp]');
    /* 离屏精灵（C 档：代码内生成贴图，无外部素材） */
    const sprite=(w,h,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');fn(x);return c;};
    const bag=(x,px,py,w,h,base)=>{x.fillStyle=base;x.beginPath();x.ellipse(px+w/2,py+h/2,w/2,h/2.4,0,0,Math.PI*2);x.fill();x.strokeStyle='rgba(0,0,0,.28)';x.lineWidth=1;x.stroke();};
    const sprMG=sprite(56,58,x=>{for(let r=0;r<2;r++)for(let i=0;i<3;i++)bag(x,4+i*17,40+r*9,16,9,r?'#5f5544':'#6a5f4a');x.strokeStyle='#26221c';x.lineWidth=3;x.beginPath();x.moveTo(28,44);x.lineTo(20,24);x.moveTo(28,44);x.lineTo(38,26);x.moveTo(28,44);x.lineTo(28,30);x.stroke();x.strokeStyle='#141210';x.lineWidth=5;x.beginPath();x.moveTo(18,22);x.lineTo(50,12);x.stroke();x.fillStyle='#20281f';x.beginPath();x.arc(38,30,7,0,Math.PI*2);x.fill();x.fillStyle='#161c14';x.fillRect(33,36,10,12);x.beginPath();x.arc(38,28,4.5,0,Math.PI*2);x.fill();});
    const sprWall=sprite(56,58,x=>{for(let r=0;r<4;r++)for(let i=0;i<4-(r%2);i++)bag(x,6+i*13+(r%2)*6,12+r*10,13,10,r%2?'#665c48':'#6a5f4a');});
    const sprSquad=sprite(56,58,x=>{x.fillStyle='#2c3324';x.beginPath();x.arc(20,18,6,0,Math.PI*2);x.fill();x.fillRect(14,24,12,20);x.beginPath();x.arc(34,20,6,0,Math.PI*2);x.fill();x.fillRect(28,26,12,18);x.strokeStyle='#1c1812';x.lineWidth=2.5;x.beginPath();x.moveTo(44,8);x.lineTo(44,46);x.stroke();x.fillStyle='#b8503f';x.beginPath();x.moveTo(45,9);x.lineTo(56,14);x.lineTo(45,20);x.fill();});
    const sprEnemy=fast=>sprite(34,48,x=>{const c=fast?'#5f5744':'#46505c';x.fillStyle=c;x.fillRect(11,20,12,16);x.beginPath();x.arc(17,13,6.5,0,Math.PI*2);x.fill();x.fillRect(9,9,16,4);x.fillRect(12,34,5,12);x.fillRect(18,34,5,12);x.strokeStyle='#20242b';x.lineWidth=2.5;x.beginPath();x.moveTo(24,16);x.lineTo(31,38);x.stroke();if(fast){x.fillStyle='#b8503f';x.beginPath();x.moveTo(11,22);x.lineTo(2,26);x.lineTo(11,30);x.fill();}});
    const sprEN=sprEnemy(false),sprEF=sprEnemy(true);
    /* 固定装饰：草丛/碎石/星点（确定性，逐帧不变） */
    let seed=42;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
    const deco=s.d.lanes.map(l=>Array.from({length:16},()=>({x:250+rnd()*1000,y:l.y-40+rnd()*80,k:rnd()})));
    const stars=Array.from({length:46},()=>({x:rnd()*1280,y:rnd()*150,r:.5+rnd()*1.1,tw:rnd()*6}));
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const unitBtns={};for(const key of ['mg','wall','squad']){const b=q('[data-unit="'+key+'"]'),u=s.d.units[key];b.innerHTML='<span class="xjg-bn"><span class="xjg-ico">'+({mg:'⌖',wall:'▤',squad:'⚑'})[key]+'</span>'+u.name+'</span><span class="xjg-cost">'+u.cost+' DP</span>';unitBtns[key]=b;}
    q('[data-unit="refund"]').innerHTML='<span class="xjg-bn"><span class="xjg-ico">♻</span>回收阵地</span><span class="xjg-cost">半价 · RETREAT</span>';
    const sound=kind=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime;if(kind==='shot'){if(now-lastShot<.09)return;lastShot=now;}const o=ac.createOscillator(),g=ac.createGain();o.type=kind==='breach'?'sawtooth':'triangle';const f=kind==='breach'?70:kind==='wave'?220:kind==='win'?660:kind==='lose'?140:kind==='place'?320:150;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f/(kind==='win'?1:2.6)),now+(kind==='wave'?.5:.24));g.gain.setValueAtTime(kind==='shot'?.045:.09,now);g.gain.exponentialRampToValueAtTime(.001,now+.3);o.connect(g);g.connect(master);o.start();o.stop(now+.32);if(kind==='breach'||kind==='shot'){const b=ac.createBuffer(1,ac.sampleRate*.12,ac.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const n=ac.createBufferSource(),ng=ac.createGain();n.buffer=b;ng.gain.value=kind==='breach'?.09:.05;n.connect(ng);ng.connect(master);n.start();}}catch{/* Sound must never block the exercise. */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{const left=s.spawn.list.length+s.enemies.length;
      if(Math.round(s.funds)!==lastFunds){if(lastFunds>=0){dpEl.classList.remove('dp-pop');void dpEl.offsetWidth;dpEl.classList.add('dp-pop');}lastFunds=Math.round(s.funds);}
      dpN.textContent=Math.round(s.funds);
      q('[data-hud]').innerHTML=`第 <b>${Math.min(s.wave+1,4)}/4</b> 波 · 纵队 <b>${Math.max(0,Math.round(s.column.hp))}%</b> · 渡江 <b>${Math.round(s.column.progress*100)}%</b> · 场上敌兵 <b>${left}</b>`;
      for(const key in unitBtns){unitBtns[key].setAttribute('aria-pressed',String(build===key));unitBtns[key].classList.toggle('dp-no',s.funds<s.d.units[key].cost);}
      q('[data-unit="refund"]').setAttribute('aria-pressed',String(build==='refund'));
      q('[data-start]').hidden=s.status!=='ready';q('[data-next]').hidden=!(s.status==='playing'&&s.phase==='build');q('[data-pause]').disabled=s.status!=='playing';q('[data-pause]').textContent=manualPause?'继续 · RESUME':'暂停 · PAUSE';q('[data-mute]').textContent=this.muted()?'声音 ON':'声音 OFF';q('[data-complete]').hidden=s.status!=='won';const text=s.status==='ready'?'选好兵种、布好阵地，再开始推演。':s.status==='won'?this.rating(s,retries).rating+' · '+s.reason:s.status==='lost'?s.reason:manualPause||this.paused()?'推演已暂停。':s.phase==='build'?'构筑阶段：'+Math.ceil(s.buildLeft)+' 秒后敌兵来袭，抓紧布防。':s.enemies.length?'阻击中……注意纵队血条。':'敌兵尚未出现。';if(q('.xjg67-status').textContent!==text)q('.xjg67-status').textContent=text;};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};q('[data-next]').onclick=()=>{if(s.status==='playing'&&s.phase==='build'){s.buildLeft=0;sync();}};q('[data-pause]').onclick=()=>{gesture();manualPause=!manualPause;last=0;sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);this.session=s;manualPause=false;recorded=false;last=0;sync();draw();q('[data-start]').focus();};
    for(const key of ['mg','wall','squad','refund'])q('[data-unit="'+key+'"]').onclick=()=>{build=key;sync();};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.rating(s,retries),key='xjg67_'+node.id;GameState.storyPreparations||={};const old=GameState.storyPreparations[key];if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,hp:Math.round(s.column.hp),retries,completedAt:new Date().toISOString()};GameState.recordBattleScore(node.id,result.score,result.rating);GameState.save();close();if(typeof onComplete==='function')onComplete();};
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
      /* 夜空 */
      const sky=ctx.createLinearGradient(0,0,0,240);sky.addColorStop(0,'#0b1322');sky.addColorStop(1,'#1a2a3f');ctx.fillStyle=sky;ctx.fillRect(0,0,1280,240);
      for(const st of stars){ctx.globalAlpha=.4+.5*Math.abs(Math.sin(s.time*.7+st.tw));ctx.fillStyle='#dfe6ee';ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,Math.PI*2);ctx.fill();}
      ctx.globalAlpha=1;
      const glow=ctx.createRadialGradient(1085,72,6,1085,72,70);glow.addColorStop(0,'rgba(232,226,200,.85)');glow.addColorStop(1,'rgba(232,226,200,0)');ctx.fillStyle=glow;ctx.fillRect(1010,0,150,150);ctx.fillStyle='#e8e2c8';ctx.beginPath();ctx.arc(1085,72,22,0,Math.PI*2);ctx.fill();
      /* 远山两层 */
      ctx.fillStyle='#141f30';ctx.beginPath();ctx.moveTo(190,205);for(let x=190;x<=1280;x+=40)ctx.lineTo(x,175+Math.sin(x*.006+1.2)*34);ctx.lineTo(1280,240);ctx.lineTo(190,240);ctx.fill();
      ctx.fillStyle='#1a2938';ctx.beginPath();ctx.moveTo(190,228);for(let x=190;x<=1280;x+=36)ctx.lineTo(x,205+Math.sin(x*.009+4)*26);ctx.lineTo(1280,248);ctx.lineTo(190,248);ctx.fill();
      /* 地面基底 */
      ctx.fillStyle='#151d15';ctx.fillRect(0,228,1280,492);
      /* 江面（左带）：夜航渡口 */
      const riv=ctx.createLinearGradient(0,0,190,0);riv.addColorStop(0,'#132c3a');riv.addColorStop(1,'#25505e');ctx.fillStyle=riv;ctx.fillRect(0,0,192,720);
      ctx.strokeStyle='rgba(190,220,235,.30)';ctx.lineWidth=2;for(let i=0;i<10;i++){const y=30+i*70,off=(s.time*22+i*47)%60;ctx.beginPath();ctx.moveTo(8+((i%3)*14),y);ctx.quadraticCurveTo(60+off*.3,y+4,150,y);ctx.stroke();}
      const moon=ctx.createLinearGradient(40,0,120,0);moon.addColorStop(0,'rgba(220,235,240,.12)');moon.addColorStop(1,'rgba(220,235,240,0)');ctx.fillStyle=moon;ctx.fillRect(40,0,80,720);
      ctx.fillStyle='#51616c';ctx.fillRect(186,0,6,720);ctx.fillStyle='#6b7c86';ctx.fillRect(186,0,2,720);
      /* 木牌渡口 + 停靠木筏 */
      ctx.fillStyle='#3a2f1e';ctx.fillRect(96,86,8,46);ctx.fillStyle='#57452a';ctx.fillRect(64,70,74,26);ctx.strokeStyle='#2c2314';ctx.strokeRect(64,70,74,26);ctx.fillStyle='#e8d5a5';ctx.font='bold 17px sans-serif';ctx.fillText('渡 口',74,90);
      for(const ry of [150,420,580]){ctx.fillStyle='#4a3b24';ctx.fillRect(120,ry,58,10);ctx.fillRect(128,ry+10,42,5);ctx.strokeStyle='#2c2314';ctx.strokeRect(120,ry,58,10);}
      /* 滩头过渡 */
      const beach=ctx.createLinearGradient(192,0,236,0);beach.addColorStop(0,'#3b3527');beach.addColorStop(1,'#242f22');ctx.fillStyle=beach;ctx.fillRect(192,0,44,720);
      /* 三条战壕通道 */
      for(let li=0;li<s.d.lanes.length;li++){const y=s.d.lanes[li].y;
        const g2=ctx.createLinearGradient(0,y-46,0,y+46);g2.addColorStop(0,'#4a4132');g2.addColorStop(.5,'#413a2c');g2.addColorStop(1,'#332e24');ctx.fillStyle=g2;ctx.fillRect(236,y-46,1044,92);
        ctx.fillStyle='rgba(0,0,0,.30)';ctx.fillRect(236,y-46,1044,4);ctx.fillRect(236,y+42,1044,4);
        ctx.strokeStyle='rgba(190,170,120,.16)';ctx.lineWidth=2;ctx.setLineDash([16,30]);ctx.beginPath();ctx.moveTo(250,y);ctx.lineTo(1270,y);ctx.stroke();ctx.setLineDash([]);
        for(const dd of deco[li]){if(dd.k<.55){ctx.strokeStyle='rgba(96,112,70,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(dd.x,dd.y+3);ctx.lineTo(dd.x-3,dd.y-4);ctx.moveTo(dd.x,dd.y+3);ctx.lineTo(dd.x+1,dd.y-5);ctx.moveTo(dd.x,dd.y+3);ctx.lineTo(dd.x+4,dd.y-3);ctx.stroke();}else{ctx.fillStyle='rgba(40,36,28,.8)';ctx.beginPath();ctx.ellipse(dd.x,dd.y,4,2.6,dd.k,0,Math.PI*2);ctx.fill();}}
        ctx.fillStyle='rgba(8,10,8,.55)';ctx.fillRect(236,y-46,52,92);
        ctx.fillStyle='#b8503f';ctx.beginPath();ctx.moveTo(252,y-38);ctx.lineTo(252,y-16);ctx.stroke();ctx.lineWidth=2;ctx.strokeStyle='#8a4434';ctx.beginPath();ctx.moveTo(252,y-38);ctx.lineTo(252,y-16);ctx.stroke();ctx.fillStyle='#b8503f';ctx.beginPath();ctx.moveTo(252,y-38);ctx.lineTo(268,y-33);ctx.lineTo(252,y-28);ctx.fill();
        ctx.fillStyle='#e8d5a5';ctx.font='13px sans-serif';ctx.fillText('通道 '+(li+1),272,y-22);}
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
        if(!u){ctx.fillStyle=active?(hovHere?'#33465acc':'#2b3a49cc'):'#23252acc';ctx.fill();ctx.strokeStyle=hovHere&&active?'#ffcf24':'#6a6e74';ctx.lineWidth=hovHere&&active?2:1.5;ctx.stroke();}
        else{ctx.fillStyle='#2a3440cc';ctx.fill();ctx.strokeStyle='#6a6e74';ctx.lineWidth=1.5;ctx.stroke();}
        if(!u&&active&&hovHere&&s.funds>=s.d.units[build].cost){if(build==='mg')fanRange(pos.x,ly,270);else circRange(pos.x,ly,95);}
        if(!u)continue;
        if(u.halo>0){ctx.strokeStyle='rgba(255,207,36,'+(u.halo/.6).toFixed(2)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(pos.x,ly,30+(0.6-u.halo)*26,0,Math.PI*2);ctx.stroke();}
        const spr=u.type==='mg'?sprMG:u.type==='wall'?sprWall:sprSquad;ctx.drawImage(spr,pos.x-28,ly-40);
        if(u.flash>0){ctx.strokeStyle='rgba(255,233,168,'+(u.flash/.08).toFixed(2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(pos.x,ly,34,0,Math.PI*2);ctx.stroke();}
        if((u.tx!==null&&u.tx!==undefined)&&u.flash>0){ctx.strokeStyle='rgba(255,207,36,'+(u.flash/.08*.9).toFixed(2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pos.x+22,ly-20);ctx.lineTo(u.tx,u.ty);ctx.stroke();}
        ctx.fillStyle='#10161c';rr(pos.x-24,ly+26,48,7,3);ctx.fill();ctx.fillStyle=u.hp/u.maxHp>.4?'#7dc47f':'#d96455';rr(pos.x-24,ly+26,48*Math.max(0,u.hp/u.maxHp),7,3);ctx.fill();}
      /* 预备队（临时）+ 悬停投放预览 */
      if(hover.on&&build==='squad'&&s.status==='playing'&&s.funds>=55&&hovLane>=0)fanRange(Math.max(210,Math.min(1150,hover.x)),s.d.lanes[hovLane].y,160);
      for(const u of s.temps){const ly=s.d.lanes[u.lane].y;ctx.globalAlpha=Math.max(.35,Math.min(1,u.life/4));ctx.drawImage(sprSquad,u.x-28,ly-40);ctx.globalAlpha=1;
        if((u.tx!==null&&u.tx!==undefined)&&u.flash>0){ctx.strokeStyle='rgba(255,207,36,'+(u.flash/.08*.9).toFixed(2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(u.x+20,ly-20);ctx.lineTo(u.tx,u.ty);ctx.stroke();}
        ctx.fillStyle='#10161c';rr(u.x-20,ly+22,40,6,3);ctx.fill();ctx.fillStyle='#7dc47f';rr(u.x-20,ly+22,40*Math.max(0,u.hp/u.maxHp),6,3);ctx.fill();}
      /* 敌兵：3px 红血条 + 精英标 */
      for(const e of s.enemies){const ly=s.d.lanes[e.lane].y;ctx.drawImage(e.fast?sprEF:sprEN,e.x-17,ly-30);
        const wMax=s.d.waves[Math.max(0,Math.min(3,s.wave))].hp;ctx.fillStyle='#10161c';ctx.fillRect(e.x-14,ly-40,28,4);ctx.fillStyle='#e5484d';ctx.fillRect(e.x-14,ly-40,28*Math.max(0,e.hp)/wMax,4);
        if(e.fast){ctx.fillStyle='#ffcf24';ctx.beginPath();ctx.moveTo(e.x+16,ly-40);ctx.lineTo(e.x+23,ly-40);ctx.lineTo(e.x+19.5,ly-34);ctx.closePath();ctx.fill();}}
      /* 命中火花 */
      for(const p of s.particles){ctx.globalAlpha=Math.max(0,p.life/.4);ctx.fillStyle='#ffcf24';ctx.fillRect(p.x,p.y,4,4);}ctx.globalAlpha=1;
      /* 左上战况面板（LIFE / CROSSING） */
      ctx.fillStyle='rgba(13,14,16,.9)';cut(16,14,368,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(16,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('湘江战况',34,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('TACTICAL  STATUS',116,36);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('纵队战力',34,58);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('LIFE',86,58);
      ctx.fillStyle='#1a1c20';cut(128,46,200,14,4);ctx.fill();ctx.fillStyle='#e5484d';cut(128,46,200*Math.max(0,s.column.hp)/100,14,4);ctx.fill();
      ctx.fillStyle='#e5484d';ctx.font='900 16px sans-serif';ctx.textAlign='right';ctx.fillText(Math.max(0,Math.round(s.column.hp))+'%',368,59);ctx.textAlign='left';
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('渡江进度',34,84);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('CROSSING',86,84);
      ctx.fillStyle='#1a1c20';cut(128,72,200,14,4);ctx.fill();ctx.fillStyle='#ffcf24';cut(128,72,200*s.column.progress,14,4);ctx.fill();
      ctx.fillStyle='#ffcf24';ctx.font='900 16px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(s.column.progress*100)+'%',368,85);ctx.textAlign='left';
      /* 右上 ENEMY / WAVE 面板 */
      const total=s.d.waves[Math.min(3,s.wave)].count,left=s.spawn.list.length+s.enemies.length;
      ctx.fillStyle='rgba(13,14,16,.9)';cut(1046,14,218,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#e5484d';ctx.fillRect(1046,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('敌兵残余',1064,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('ENEMY',1126,36);
      ctx.fillStyle='#f2f3f4';ctx.font='900 20px sans-serif';ctx.fillText(left+' / '+total,1064,60);
      for(let k=0;k<total;k++){ctx.fillStyle=k<left?'#e5484d':'#3a3d42';ctx.fillRect(1140+(k%10)*10,46+(Math.floor(k/10))*10,6,6);}
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('WAVE',1064,82);ctx.fillStyle='#ffcf24';ctx.font='900 14px sans-serif';ctx.fillText(Math.min(s.wave+1,4)+' / 4',1102,82);
      if(s.status==='playing'&&s.phase==='build'){ctx.fillStyle='#ffcf24';ctx.font='12px sans-serif';ctx.fillText('NEXT WAVE IN '+Math.ceil(s.buildLeft)+'s',1150,82);}
      /* 暗角 + 角标 */
      const vig=ctx.createRadialGradient(640,360,330,640,360,780);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.38)');ctx.fillStyle=vig;ctx.fillRect(0,0,1280,720);
      ctx.font='13px sans-serif';ctx.fillStyle='rgba(240,217,166,.8)';ctx.fillText('渡口阻击 · OPERATION XIANGJIANG',26,694);
      ctx.font='12px sans-serif';ctx.fillStyle='rgba(139,142,147,.85)';ctx.fillText('抽象兵棋符号 · 无血腥表现',26,710);
      /* 胜负大字层 */
      if(s.status==='won'||s.status==='lost'){const won=s.status==='won';ctx.fillStyle='rgba(6,8,10,.55)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(13,14,16,.92)';cut(300,240,680,168,16);ctx.fill();ctx.strokeStyle=won?'#ffcf24':'#e5484d';ctx.lineWidth=2;ctx.stroke();
        ctx.textAlign='center';ctx.fillStyle=won?'#ffcf24':'#e5484d';ctx.font='bold 44px sans-serif';ctx.fillText(won?'任务完成':'防线突破',640,312);
        ctx.fillStyle='#8b8e93';ctx.font='13px sans-serif';ctx.fillText(won?'M I S S I O N   A C C O M P L I S H E D':'M I S S I O N   F A I L E D',640,338);
        const rt=this.rating(s,retries);ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(rt.rating+' · '+rt.score+' 分',640,372);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText(s.reason,640,394);ctx.textAlign='left';}
    };
    let hudAt=0;const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000);last=now;
      for(const event of s.events.splice(0)){sound(event);if(event==='breach'){canvas.classList.remove('xjg67-shake');void canvas.offsetWidth;canvas.classList.add('xjg67-shake');}}
      draw();if(now-hudAt>100||s.status!=='playing'){sync();hudAt=now;}raf=requestAnimationFrame(frame);
    };sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
