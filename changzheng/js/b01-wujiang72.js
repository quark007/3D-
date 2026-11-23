/* Original coverage exercise: abstract tokens only, no gore and no real parameters.
   B01 乌江浮桥 · 反向塔防（掩护作业）——挂节点 6，主会话接线 icon 'bridge'。
   玩法：对岸 2 座敌炮持续轰击江面工兵；玩家【不攻击炮台】，只用三段掩护槽（左/中/右江段）
   压制敌炮——被压制的江段内敌炮哑火 2 秒，随后各自冷却 6 秒。工兵班组自动推进打桩，
   架通 10 根桩即胜；90 秒限时限渡。工兵被命中不伤亡，退回上一根桩重新推进。
   存档：storyPreparations['wujiang72_6'] + recordBattleScore(6,...)。 */
window.Wujiang72={
  supports(id){return [6].includes(Number(id));},
  SEGS:['左段','中段','右段'],
  definitions:{
    6:{title:'乌江浮桥 · 突破天险',
      intro:'掩护推演：工兵班组乘竹筏自左岸向江心推进打桩，对岸敌炮不断轰击江面。你不攻击炮台——敌炮装填时按 1/2/3（或点江段按钮）压制对应江段，令其哑火 2 秒，随后冷却 6 秒；红圈是炮弹落点预警。架通 10 根桩即胜，限时 90 秒。',
      success:'浮桥架通，渡江通道打开——主力部队由此跨越乌江天险。',
      fail:'命令限时限渡，重新组织架桥。',
      time:90,piles:10,start:190,gap:90,speed:26,
      warn:1.2,blast:80,silence:2,cool:6,charge:.9,scatter:130,
      pauseT:1.2,retry:1.0,retryJ:.7,idleJ:.9,
      guns:[{x:1146,y:318,idle:6.3,first:1.6,tag:'甲'},{x:1172,y:486,idle:8.7,first:4.2,tag:'乙'}],
      hist:'1935 年 1 月，中央红军突破乌江天险：先头部队乘竹筏强渡，工兵在火力掩护下渡江打桩架设浮桥，保障主力过江。突破乌江是红军长征以来跨越的第一道天然屏障，也是红军工兵首次完成较大规模的架桥作业。'}
  },
  pileX(d,k){return d.start+k*d.gap;},
  segmentAt(d,x){const l=d.start,r=d.start+d.piles*d.gap;if(x<=l)return 0;if(x>=r)return 2;return Math.min(2,Math.floor((x-l)/((r-l)/3)));},
  rand(s){s._seed=(s._seed*1103515245+12345)%2147483648;return s._seed/2147483648;},
  create(id){const d=this.definitions[Number(id)];return {id:Number(id),d,status:'ready',reason:'',events:[],time:0,piles:0,broken:0,retries:0,
    eng:{x:d.start,pause:0},shells:[],segs:[0,1,2].map(()=>({silent:0,cool:0})),active:-1,
    batteries:d.guns.map(g=>({tag:g.tag,x:g.x,y:g.y,idle:g.idle,state:'idle',timer:g.first,tx:0,seg:-1,puff:0})),
    particles:[],_seed:193501,accumulator:0};},
  /* 压制：三段互斥；切换会使旧段立即进入冷却。 */
  suppress(s,i){
    if(s.status!=='playing')return false;
    i=Number(i);if(!(i>=0&&i<s.segs.length))return false;
    if(s.active===i)return false;
    const g=s.segs[i];if(g.cool>0)return false;
    if(s.active>=0){const o=s.segs[s.active];o.silent=0;o.cool=s.d.cool;}
    s.active=i;g.silent=s.d.silence;g.cool=0;s.events.push('cover');return true;
  },
  finish(s,won,reason){if(s.status!=='playing')return false;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');return true;},
  splash(s,x){
    s.particles.push({kind:'ring',x,y:470,r:8,vr:230,life:.38,max:.38});
    for(let k=0;k<7;k++){const dx=(this.rand(s)-.5)*160,vy=-(60+this.rand(s)*160);
      s.particles.push({kind:'drop',x,y:470,vx:dx,vy,life:.5+this.rand(s)*.25,max:.75});}
  },
  step(s,dt=1/120){
    if(s.status!=='playing')return;const d=s.d;
    dt=Math.max(0,Math.min(.1,dt||0));s.time+=dt;
    /* 三段掩护槽：哑火窗口 → 冷却 */
    for(let i=0;i<s.segs.length;i++){const g=s.segs[i];
      if(g.silent>0){g.silent-=dt;if(g.silent<=1e-9){g.silent=0;g.cool=d.cool;if(s.active===i)s.active=-1;}}
      else if(g.cool>0){g.cool=Math.max(0,g.cool-dt);if(g.cool<1e-9)g.cool=0;}}
    /* 工兵推进打桩（被命中退回上一桩，不伤亡） */
    const e=s.eng;
    if(e.pause>0)e.pause=Math.max(0,e.pause-dt);
    else{e.x+=d.speed*dt;
      if(s.piles<d.piles&&e.x>=this.pileX(d,s.piles+1)){
        s.piles++;e.x=this.pileX(d,s.piles);s.events.push('pile');
        if(s.piles>=d.piles){this.finish(s,true,d.success);return;}}}
    /* 敌炮：装填 → 发射 / 遭压制哑火（不摧毁、无战果） */
    for(const b of s.batteries){
      if(b.puff>0)b.puff=Math.max(0,b.puff-dt);
      if(b.state==='idle'){b.timer-=dt;
        if(b.timer<=0){b.state='charge';b.timer=d.charge;
          const lead=d.speed*(d.charge+d.warn);
          b.tx=Math.max(d.start+26,Math.min(d.start+d.piles*d.gap-26,e.x+lead+(this.rand(s)-.5)*2*d.scatter));
          b.seg=this.segmentAt(d,b.tx);s.events.push('aim');}}
      else{
        if(s.segs[b.seg].silent>0){b.state='idle';b.timer=d.retry+this.rand(s)*d.retryJ;b.puff=.6;s.events.push('silenced');}
        else{b.timer-=dt;
          if(b.timer<=0){b.state='idle';b.timer=b.idle+this.rand(s)*d.idleJ;
            if(s.segs[b.seg].silent>0){b.puff=.6;s.events.push('silenced');}
            else{s.shells.push({x:b.tx,warn:d.warn,seg:b.seg});b.puff=.4;s.events.push('fire');}}}}
    }
    /* 炮弹预警与落水爆炸 */
    for(const sh of s.shells){sh.warn-=dt;
      if(sh.warn<=0){sh.dead=true;s.events.push('boom');
        this.splash(s,sh.x);
        if(Math.abs(e.x-sh.x)<=d.blast){s.broken++;e.pause=d.pauseT;e.x=s.piles>0?this.pileX(d,s.piles):d.start;s.events.push('interrupt');}}}
    s.shells=s.shells.filter(sh=>!sh.dead);
    for(const p of s.particles){p.life-=dt;
      if(p.kind==='ring')p.r+=p.vr*dt;else{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=520*dt;}}
    s.particles=s.particles.filter(p=>p.life>0);
    /* 限时限渡 */
    if(s.time>=d.time&&s.status==='playing')this.finish(s,false,d.fail);
  },
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.1,seconds||0));let guard=0;
    while(s.accumulator+1e-9>=1/120&&guard++<40){this.step(s,1/120);s.accumulator-=1/120;}},
  rating(s,retries){const b=s.broken||0,r=Number(retries)||0;
    return r===0&&b===0?{score:95,rating:'神工飞架'}:b<=3?{score:85,rating:'冒弹架桥'}:{score:70,rating:'完成任务'};},
  persist(s){const key='wujiang72_'+s.id,result=this.rating(s,s.retries);
    GameState.storyPreparations||={};
    const old=GameState.storyPreparations[key];
    if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,broken:s.broken,seconds:Math.round(s.time),retries:s.retries||0,completedAt:new Date().toISOString()};
    GameState.recordBattleScore(s.id,result.score,result.rating);
    if(typeof GameState.save==='function')GameState.save();
    return result;},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return !!window.__czPaused||(typeof document!=='undefined'&&(document.hidden||!!document.querySelector?.('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay')));},
  style(){if(document.getElementById('wuj72-style'))return;const el=document.createElement('style');el.id='wuj72-style';el.textContent=`
    .wuj72-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:96dvh;margin:auto;padding:0;background:#101315;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .wuj72-dialog::backdrop{background:#05070ae6}
    .wuj72-dialog header{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:14px 18px 13px;border-bottom:1px solid #2a2d31;background:#131619}
    .wuj72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;letter-spacing:.02em;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:12px}
    .wuj72-sub{margin:3px 0 0;padding-left:13px;font-size:12px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .wuj72-body{padding:13px 18px 16px}
    .wuj72-dialog p{margin:6px 0}
    .wuj72-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 14px;min-height:42px;cursor:pointer;letter-spacing:.04em;transition:background .12s ease,border-color .12s ease}
    .wuj72-dialog button:hover:not(:disabled){background:#22262b;border-color:#6a6e74}
    .wuj72-dialog button:disabled{opacity:.4;cursor:default}
    .wuj72-dialog button[data-start]{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .wuj72-dialog button[data-start]:hover:not(:disabled){background:#ffd95c;border-color:#ffd95c}
    .wuj72-dialog button[aria-pressed="true"]{border-color:#ffcf24;box-shadow:inset 0 0 0 1px #ffcf24;background:#26231a}
    .wuj72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .wuj72-dialog canvas{display:block;width:min(100%,max(240px,calc((100dvh - 340px)*1.7778)));aspect-ratio:16/9;height:auto;margin:0 auto;background:#131b19;border:1px solid #3a3d42;touch-action:none}
    .wuj72-hud{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px dashed #2a2d31;padding-bottom:8px;margin:8px 0 0}
    .wuj72-hud span{background:#14171a;border:1px solid #2a2d31;border-radius:2px;padding:3px 12px;font-variant-numeric:tabular-nums;letter-spacing:.03em;color:#d5d8d2;font-size:13px}
    .wuj72-hud span[data-warn]{color:#e8a06a;border-color:#6a4630}
    .wuj72-segs{display:flex;gap:8px;margin:8px 0 0}
    .wuj72-segs button{flex:1;min-width:96px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:52px}
    .wuj72-segs button.cool{opacity:.55}
    .wuj72-sn{font-weight:700}.wuj72-sn i{font-style:normal;color:#ffcf24;margin-left:6px}
    .wuj72-ss{font-size:12px;color:#8b8e93;font-variant-numeric:tabular-nums}
    .wuj72-cd{width:100%;height:3px;background:#232a30;border-radius:2px;overflow:hidden;margin-top:2px}
    .wuj72-cd i{display:block;height:100%;background:#ffcf24;transition:width .2s linear}
    .wuj72-segs button.silencing .wuj72-cd i{background:#9fd08a}
    .wuj72-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:11px}
    .wuj72-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .wuj72-note{font-size:13px;color:#8f948d}
    .wuj72-dialog details.wuj72-note{border-top:1px solid #2a2d31;margin-top:12px;padding-top:8px}
    .wuj72-dialog details.wuj72-note summary{cursor:pointer;color:#a8ada4}
    .wuj72-shake{animation:wuj72-shake .18s linear}@keyframes wuj72-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}
    @media(prefers-reduced-motion:reduce){.wuj72-shake{animation:none}}
    @media(max-width:600px){.wuj72-dialog{font-size:13px}.wuj72-dialog canvas{max-width:100%}.wuj72-dialog button{padding:7px 12px}.wuj72-segs button{min-width:80px}}`;
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='wuj72-dialog';dialog.setAttribute('aria-labelledby','wuj72-title');
    dialog.innerHTML='<header><div><h2 id="wuj72-title"></h2><p class="wuj72-sub">Wujiang Pontoon · Cover Operation · 1935.1</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="wuj72-body"><div class="wuj72-brief"><p data-intro></p></div>'
      +'<canvas width="1280" height="720" tabindex="0" aria-label="乌江浮桥掩护画面。按 1、2、3 或点击江段按钮压制对应江段，敌炮哑火后工兵安全架桩；红圈为炮弹落点预警。工兵自动推进，架通 10 根桩获胜，限时 90 秒。"></canvas>'
      +'<p class="wuj72-hud" data-hud><span data-hud-piles></span><span data-hud-time></span><span data-hud-eng></span><span data-hud-broken></span></p>'
      +'<div class="wuj72-segs" role="group" aria-label="掩护压制江段选择"><button data-seg="0"></button><button data-seg="1"></button><button data-seg="2"></button></div>'
      +'<p class="wuj72-status" role="status" aria-live="polite"></p>'
      +'<div class="wuj72-actions"><button data-start>▶ 开始架桥</button><button data-pause disabled>‖ 暂停</button><button data-mute>♪ 声音</button><button data-retry>↻ 重新架桥</button><button data-complete hidden>记录成绩 · 完成本章</button></div>'
      +'<p class="wuj72-note">你不攻击敌炮——只有「压制」与「哑火」，没有击毁炮台的画面。工兵被命中不伤亡，退回上一根桩重新推进；红圈为落点预警，波浪线表示该江段正处于压制中。</p>'
      +'<details class="wuj72-note"><summary>史实与练习说明</summary><p data-hist></p><p>本小游戏为原创教学推演：炮击参数、时长、评分与重开次数均为练习设定，不代表历史细节与战果。画面为抽象纪实剪影，不含伤亡表现。</p></details></div>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');
    let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null,lastAt={};
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    let RM=false;try{RM=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;}catch{/* 可选能力 */}
    /* 离屏背景：乌江天险纪实剪影（确定性，逐帧不变） */
    const buildBackdrop=d=>{
      const bg=document.createElement('canvas');bg.width=1280;bg.height=720;const b=bg.getContext('2d');
      let seed=72;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const sky=b.createLinearGradient(0,0,0,368);sky.addColorStop(0,'#6e6a56');sky.addColorStop(.62,'#5a5a4e');sky.addColorStop(1,'#4b4f4a');b.fillStyle=sky;b.fillRect(0,0,1280,368);
      const haze=b.createLinearGradient(0,120,0,300);haze.addColorStop(0,'rgba(214,196,150,.10)');haze.addColorStop(1,'rgba(214,196,150,0)');b.fillStyle=haze;b.fillRect(0,120,1280,180);
      b.fillStyle='#3c4542';b.beginPath();b.moveTo(150,320);for(let x=150;x<=1280;x+=46)b.lineTo(x,288+Math.sin(x*.005+2.1)*30);b.lineTo(1280,368);b.lineTo(150,368);b.fill();
      b.fillStyle='#333b39';b.beginPath();b.moveTo(60,338);for(let x=60;x<=1280;x+=40)b.lineTo(x,316+Math.sin(x*.008+.4)*20);b.lineTo(1280,370);b.lineTo(60,370);b.fill();
      const water=b.createLinearGradient(0,336,0,676);water.addColorStop(0,'#27453f');water.addColorStop(.45,'#1b3634');water.addColorStop(1,'#122628');b.fillStyle=water;b.fillRect(0,336,1280,340);
      b.strokeStyle='rgba(178,206,196,.09)';b.lineWidth=1.5;
      for(let i=0;i<26;i++){const y=352+i*12.4,wx=rnd()*1180,ww=60+rnd()*160;b.beginPath();b.moveTo(wx,y);b.quadraticCurveTo(wx+ww/2,y+3,wx+ww,y);b.stroke();}
      /* 左岸悬崖 + 滩头（我岸） */
      b.fillStyle='#211f19';b.beginPath();b.moveTo(0,208);b.lineTo(64,238);b.lineTo(120,282);b.lineTo(158,318);b.lineTo(190,344);b.lineTo(190,676);b.lineTo(0,676);b.closePath();b.fill();
      b.fillStyle='rgba(226,214,180,.08)';b.beginPath();b.moveTo(0,208);b.lineTo(64,238);b.lineTo(120,282);b.lineTo(158,318);b.lineTo(190,344);b.lineTo(185,350);b.lineTo(0,218);b.closePath();b.fill();
      b.fillStyle='#26221a';b.beginPath();b.moveTo(0,560);b.quadraticCurveTo(120,560,190,588);b.lineTo(190,676);b.lineTo(0,676);b.closePath();b.fill();
      b.fillStyle='#453622';for(let i=0;i<3;i++)b.fillRect(36,606+i*7,104,6);
      b.strokeStyle='rgba(122,132,96,.5)';b.lineWidth=1.5;
      for(let i=0;i<18;i++){const rx=196+rnd()*30,ry=560+rnd()*90;b.beginPath();b.moveTo(rx,ry);b.quadraticCurveTo(rx-3,ry-12,rx-5,ry-20);b.stroke();}
      /* 右岸悬崖（天险·敌岸）+ 炮台崖台 */
      b.fillStyle='#1e1d17';b.beginPath();b.moveTo(1090,676);b.lineTo(1090,352);b.lineTo(1122,300);b.lineTo(1146,244);b.lineTo(1190,168);b.lineTo(1232,92);b.lineTo(1280,40);b.lineTo(1280,676);b.closePath();b.fill();
      b.fillStyle='rgba(226,214,180,.09)';b.beginPath();b.moveTo(1090,352);b.lineTo(1122,300);b.lineTo(1146,244);b.lineTo(1190,168);b.lineTo(1232,92);b.lineTo(1280,40);b.lineTo(1280,58);b.lineTo(1226,110);b.lineTo(1186,182);b.lineTo(1142,254);b.lineTo(1118,306);b.lineTo(1094,356);b.closePath();b.fill();
      for(const g of d.guns){b.fillStyle='#2a271e';b.fillRect(g.x-30,g.y+12,60,10);}
      b.fillStyle='#191813';for(let i=0;i<5;i++){b.beginPath();b.ellipse(1096+rnd()*30,600+rnd()*60,8+rnd()*10,4+rnd()*4,rnd(),0,Math.PI*2);b.fill();}
      /* 江段分隔与段名 */
      const l=d.start,r=d.start+d.piles*d.gap,w=(r-l)/3;
      b.strokeStyle='rgba(215,225,218,.12)';b.setLineDash([6,10]);b.lineWidth=1.5;
      for(let i=1;i<3;i++){b.beginPath();b.moveTo(l+i*w,346);b.lineTo(l+i*w,650);b.stroke();}
      b.setLineDash([]);
      b.fillStyle='rgba(215,225,218,.28)';b.font='13px sans-serif';
      ['一','二','三'].forEach((t,i)=>b.fillText('江段·'+t,l+i*w+w/2-30,368));
      b.fillStyle='rgba(0,0,0,.35)';b.fillRect(0,0,1280,2);b.fillRect(0,718,1280,2);b.fillRect(0,0,2,720);b.fillRect(1278,0,2,720);
      return bg;
    };
    const bg=buildBackdrop(s.d);
    const CFG={cover:[240,.18,.05,0],aim:[170,.12,.03,0],fire:[80,.3,.1,.1],silenced:[420,.2,.035,.06],boom:[58,.42,.12,.16],pile:[130,.14,.08,.05],interrupt:[200,.32,.09,.08],win:[660,.5,.09,0],lose:[130,.5,.1,0]};
    const sound=kind=>{if(!ac||ac.state!=='running'||this.muted())return;try{const c=CFG[kind];if(!c)return;const now=ac.currentTime;
      if((kind==='boom'||kind==='fire')&&now-(lastAt[kind]||0)<.15)return;lastAt[kind]=now;
      const o=ac.createOscillator(),g=ac.createGain();o.type=kind==='win'?'triangle':'sawtooth';
      const f=c[0];o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,kind==='win'?f:kind==='pile'?f*1.5:f*.6),now+c[1]);
      g.gain.setValueAtTime(c[2],now);g.gain.exponentialRampToValueAtTime(.001,now+c[1]+.06);o.connect(g);g.connect(master);o.start();o.stop(now+c[1]+.08);
      if(c[3]>0){const buf=ac.createBuffer(1,ac.sampleRate*.14,ac.sampleRate),dta=buf.getChannelData(0);for(let i=0;i<dta.length;i++)dta[i]=(Math.random()*2-1)*(1-i/dta.length);const n=ac.createBufferSource(),ng=ac.createGain();n.buffer=buf;ng.gain.value=c[3];n.connect(ng);ng.connect(master);n.start();}}catch{/* 声音永不阻塞推演 */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* 可选音频 */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const segBtns=[0,1,2].map(i=>q('[data-seg="'+i+'"]'));
    segBtns.forEach((b,i)=>{b.innerHTML='<span class="wuj72-sn">'+this.SEGS[i]+' <i>'+(i+1)+'</i></span><span class="wuj72-ss">就绪</span>';b.onclick=()=>{gesture();if(this.suppress(s,i))sync();};});
    const sync=()=>{
      q('[data-hud-piles]').textContent='桥桩 '+s.piles+'/'+s.d.piles;
      const left=Math.max(0,s.d.time-s.time),tl=q('[data-hud-time]');
      tl.textContent='倒计时 '+Math.ceil(left)+'s';tl.toggleAttribute('data-warn',left<=15&&s.status==='playing');
      q('[data-hud-eng]').textContent='工兵 '+(s.eng.pause>0?'重组中':this.SEGS[this.segmentAt(s.d,s.eng.x)]);
      const bk=q('[data-hud-broken]');bk.textContent='中断 '+s.broken;bk.toggleAttribute('data-warn',s.broken>0);
      segBtns.forEach((b,i)=>{const g=s.segs[i],ss=b.querySelector('.wuj72-ss');
        let bar=b.querySelector('.wuj72-cd i');
        if(!bar){const cd=document.createElement('span');cd.className='wuj72-cd';cd.innerHTML='<i></i>';b.append(cd);bar=cd.firstChild;}
        if(g.silent>0){ss.textContent='压制中 '+Math.ceil(g.silent)+'s';bar.style.width=Math.round(g.silent/s.d.silence*100)+'%';b.classList.add('silencing');}
        else{b.classList.remove('silencing');
          if(g.cool>0){ss.textContent='冷却 '+Math.ceil(g.cool)+'s';bar.style.width=Math.round(g.cool/s.d.cool*100)+'%';}
          else{ss.textContent='就绪';bar.style.width='0%';}}
        b.setAttribute('aria-pressed',String(s.active===i));b.classList.toggle('cool',g.silent<=0&&g.cool>0);});
      q('[data-start]').hidden=s.status!=='ready';q('[data-pause]').disabled=s.status!=='playing';
      q('[data-pause]').textContent=manualPause?'▶ 继续架桥':'‖ 暂停';
      q('[data-mute]').textContent=this.muted()?'♪ 开启声音':'♪ 全部静音';
      q('[data-complete]').hidden=s.status!=='won';
      let text;
      if(s.status==='ready')text='工兵整装待发。留意敌炮装填：出现橙色落点标记即按对应数字键压制该江段。';
      else if(s.status==='won')text=this.rating(s,retries).rating+' · '+s.reason;
      else if(s.status==='lost')text=s.reason;
      else if(manualPause||this.paused())text='推演已暂停。';
      else{const chg=s.batteries.filter(b=>b.state==='charge');
        if(s.shells.length)text='炮弹来袭——红圈即落点，工兵无法躲闪，压制要在敌炮开火前。';
        else if(chg.length)text='敌炮·'+chg.map(b=>b.tag).join('、')+'正在装填，目标'+chg.map(b=>this.SEGS[b.seg]).join('、')+'——按对应键压制！';
        else text='工兵架桥推进中……留意敌炮节奏。';}
      if(q('.wuj72-status').textContent!==text)q('.wuj72-status').textContent=text;};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};
    q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};
    q('[data-pause]').onclick=()=>{gesture();manualPause=!manualPause;last=0;sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);s.retries=retries;this.session=s;manualPause=false;recorded=false;last=0;sync();draw();q('[data-start]').focus();};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;this.persist(s);close();if(typeof onComplete==='function')onComplete();};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),ox=r.left+(r.width-1280*scale)/2,oy=r.top+(r.height-720*scale)/2;return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale};};
    canvas.onpointerdown=e=>{if(s.status!=='playing'||manualPause||this.paused()||e.button>0)return;const p=point(e);gesture();canvas.focus();e.preventDefault();
      this.suppress(s,this.segmentAt(s.d,p.x));sync();};
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      const tag=e.target&&e.target.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
      if(e.ctrlKey||e.altKey||e.metaKey)return;
      if(['1','2','3'].includes(e.key)){e.preventDefault();e.stopPropagation();if(this.suppress(s,Number(e.key)-1))sync();}};
    dialog.addEventListener('keydown',key);
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);ctx.drawImage(bg,0,0);
      const d=s.d,t=s.time,l=d.start,r=d.start+d.piles*d.gap;
      /* 流水动态高光 */
      if(!RM){ctx.strokeStyle='rgba(190,216,205,.14)';ctx.lineWidth=1.5;
        for(let i=0;i<9;i++){const y=360+i*34,wx=((t*26+i*173)%1380)-80;ctx.beginPath();ctx.moveTo(wx,y);ctx.quadraticCurveTo(wx+30,y+3,wx+62,y);ctx.stroke();}}
      /* 已架桥面与桩 */
      if(s.piles>0){const deckEnd=this.pileX(d,s.piles);
        ctx.fillStyle='#51402a';ctx.fillRect(l,452,deckEnd-l,12);
        ctx.strokeStyle='rgba(28,20,10,.6)';ctx.lineWidth=1;
        for(let x=l+10;x<deckEnd;x+=22){ctx.beginPath();ctx.moveTo(x,453);ctx.lineTo(x,463);ctx.stroke();}
        ctx.fillStyle='rgba(255,240,200,.10)';ctx.fillRect(l,452,deckEnd-l,3);}
      for(let i=1;i<=s.piles;i++){const px=this.pileX(d,i);
        ctx.fillStyle='#3d3020';ctx.fillRect(px-3,456,6,52);ctx.fillStyle='rgba(230,214,170,.16)';ctx.fillRect(px-3,456,2,52);}
      if(s.status==='won'){ctx.strokeStyle='#2c2114';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(r,452);ctx.lineTo(r,414);ctx.stroke();
        ctx.fillStyle='#a03a2e';ctx.beginPath();ctx.moveTo(r,414);ctx.lineTo(r+26,420);ctx.lineTo(r,428);ctx.closePath();ctx.fill();}
      /* 压制段白色波浪线 */
      for(let i=0;i<3;i++){const g=s.segs[i];if(g.silent<=0)continue;
        const sl=l+i*(r-l)/3,sr=sl+(r-l)/3;
        ctx.strokeStyle='rgba(242,246,240,.6)';ctx.lineWidth=2.5;ctx.beginPath();
        for(let x=sl+8;x<=sr-8;x+=14){const yy=430+Math.sin(x*.045+(RM?0:t*3.2)+i)*5;x<=sl+8?ctx.moveTo(x,yy):ctx.lineTo(x,yy);}
        ctx.stroke();ctx.strokeStyle='rgba(242,246,240,.16)';ctx.lineWidth=7;ctx.stroke();}
      /* 敌炮（剪影，只哑火不摧毁） */
      for(const b of s.batteries){
        ctx.fillStyle='#14130f';ctx.fillRect(b.x-18,b.y+10,36,9);
        ctx.beginPath();ctx.moveTo(b.x-13,b.y+10);ctx.lineTo(b.x-8,b.y-12);ctx.lineTo(b.x+8,b.y-12);ctx.lineTo(b.x+13,b.y+10);ctx.closePath();ctx.fill();
        const ang=Math.atan2(464-b.y,(b.tx||640)-b.x);
        ctx.strokeStyle='#14130f';ctx.lineWidth=5;ctx.beginPath();
        ctx.moveTo(b.x+Math.cos(ang)*6,b.y-10+Math.sin(ang)*6);ctx.lineTo(b.x+Math.cos(ang)*30,b.y-10+Math.sin(ang)*30);ctx.stroke();
        if(b.state==='charge'){const p=1-Math.max(0,b.timer)/d.charge;
          ctx.strokeStyle='rgba(208,138,74,.85)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(b.x,b.y-12,17,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.stroke();
          const pulse=RM?.75:.55+.35*Math.sin(t*9);
          ctx.fillStyle='rgba(206,110,70,'+pulse.toFixed(2)+')';
          ctx.beginPath();ctx.moveTo(b.tx,398);ctx.lineTo(b.tx-7,386);ctx.lineTo(b.tx+7,386);ctx.closePath();ctx.fill();
          ctx.strokeStyle='rgba(206,110,70,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(b.tx,398);ctx.lineTo(b.tx,468);ctx.stroke();}
        if(b.puff>0){const a=b.puff/.6;
          for(let k=0;k<3;k++){ctx.fillStyle='rgba(236,236,226,'+Math.max(0,a*(.5-k*.13)).toFixed(2)+')';
            ctx.beginPath();ctx.arc(b.x+Math.cos(ang)*34+k*7-6,b.y-14-k*9-(.6-b.puff)*16,5+k*2.6,0,Math.PI*2);ctx.fill();}
          if(b.puff>.42){ctx.fillStyle='rgba(240,240,232,.92)';ctx.font='12px sans-serif';ctx.fillText('哑火',b.x-11,b.y-28);}}}
      /* 工兵班组（竹筏 + 3 人剪影） */
      const ex=s.eng.x;
      ctx.fillStyle='#42341f';ctx.fillRect(ex-36,478,72,9);ctx.fillRect(ex-30,490,60,6);
      ctx.strokeStyle='rgba(20,14,8,.7)';ctx.lineWidth=1;ctx.strokeRect(ex-36,478,72,9);
      ctx.fillStyle='#5a462c';ctx.fillRect(ex+16,446,5,34);
      ctx.fillStyle='#16140e';
      ctx.beginPath();ctx.arc(ex-18,450,4.6,0,Math.PI*2);ctx.fill();ctx.fillRect(ex-23,454,10,24);
      ctx.beginPath();ctx.arc(ex+2,446,4.8,0,Math.PI*2);ctx.fill();ctx.fillRect(ex-3,450,11,26);
      ctx.beginPath();ctx.arc(ex+20,451,4.4,0,Math.PI*2);ctx.fill();ctx.fillRect(ex+15,455,10,23);
      ctx.strokeStyle='#16140e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(ex+24,452);ctx.lineTo(ex+33,440);ctx.stroke();
      if(s.eng.pause>0){ctx.fillStyle='rgba(236,226,196,.85)';ctx.font='12px sans-serif';ctx.fillText('退回上一桩 · 重新组织',ex-58,438);}
      /* 落点红圈预警 */
      for(const sh of s.shells){const p=1-Math.max(0,sh.warn)/d.warn,rad=16+30*p;
        const blink=RM?.8:(.55+.45*Math.sin(t*12));
        ctx.strokeStyle='rgba(198,66,52,'+blink.toFixed(2)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(sh.x,470,rad,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='rgba(198,66,52,.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(sh.x,470,rad*.55,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='rgba(198,66,52,.9)';ctx.fillRect(sh.x-1.5,468.5,3,3);
        ctx.strokeStyle='rgba(198,66,52,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(sh.x,470,rad+6,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.stroke();}
      /* 水花粒子 */
      for(const p of s.particles){
        if(p.kind==='ring'){ctx.strokeStyle='rgba(226,238,232,'+Math.max(0,p.life/p.max*.7).toFixed(2)+')';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.stroke();}
        else{ctx.fillStyle='rgba(210,226,220,'+Math.max(0,p.life/p.max*.8).toFixed(2)+')';ctx.fillRect(p.x-1.5,p.y-1.5,3,3);}}
      /* AK HUD 左上：架桥战况 */
      const cut=(x,y,w,h,c)=>{ctx.beginPath();ctx.moveTo(x+c,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+c);ctx.closePath();};
      ctx.fillStyle='rgba(13,15,17,.9)';cut(16,14,300,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(16,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('乌江架桥',34,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('BRIDGE PARTY · 1935.1',104,36);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('桥桩',34,60);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('PILES',66,60);
      ctx.fillStyle='#1a1c20';cut(108,48,138,14,4);ctx.fill();ctx.fillStyle='#ffcf24';cut(108,48,138*s.piles/d.piles,14,4);ctx.fill();
      ctx.fillStyle='#ffcf24';ctx.font='900 14px sans-serif';ctx.textAlign='right';ctx.fillText(s.piles+'/'+d.piles,316,61);ctx.textAlign='left';
      const left=Math.max(0,d.time-s.time);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('限时',34,86);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('TIME',66,86);
      ctx.fillStyle=left<=15?'#d08a4a':'#f2f3f4';ctx.font='900 17px sans-serif';ctx.textAlign='right';ctx.fillText(Math.ceil(left)+'s',316,89);ctx.textAlign='left';
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('工兵 '+(s.eng.pause>0?'重组中':this.SEGS[this.segmentAt(d,s.eng.x)]),108,86);
      /* AK HUD 右上：敌炮状态（只报装填/哑火，无战果） */
      ctx.fillStyle='rgba(13,15,17,.9)';cut(988,14,276,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#c24034';ctx.fillRect(988,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('敌炮状态',1006,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('ENEMY GUNS',1078,36);
      s.batteries.forEach((b,i)=>{const y=62+i*26;
        ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('炮台·'+b.tag,1006,y);
        let st='待机',col='#9a9c9f';
        if(b.state==='charge'){st='装填中';col='#d08a4a';}
        else if(b.puff>0){st='哑火';col='#cfd6cc';}
        ctx.fillStyle=col;ctx.font='bold 12px sans-serif';ctx.fillText(st,1080,y);
        if(b.state==='charge'){const p=1-Math.max(0,b.timer)/d.charge;
          ctx.fillStyle='#1a1c20';cut(1136,y-10,110,12,3);ctx.fill();ctx.fillStyle='#d08a4a';cut(1136,y-10,110*p,12,3);ctx.fill();}});
      /* 暗角 + 角标 */
      const vig=ctx.createRadialGradient(640,360,320,640,360,790);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.36)');ctx.fillStyle=vig;ctx.fillRect(0,0,1280,720);
      ctx.font='13px sans-serif';ctx.fillStyle='rgba(240,217,166,.8)';ctx.fillText('乌江浮桥 · CROSSING THE WUJIANG · 1935.1',26,694);
      ctx.font='12px sans-serif';ctx.fillStyle='rgba(139,142,147,.85)';ctx.fillText('掩护作业 · 只压制不攻坚 · 无伤亡表现',26,710);
      if(s.status==='ready'){
        ctx.fillStyle='rgba(4,6,6,.42)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(10,12,12,.86)';ctx.fillRect(330,176,620,318);ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.strokeRect(330,176,620,318);ctx.fillStyle='#ffcf24';ctx.fillRect(330,176,3,318);
        ctx.fillStyle='#f2f0e9';ctx.font='bold 17px sans-serif';ctx.fillText('掩护架桥 · 指引',356,212);
        ctx.fillStyle='#b8bcb4';ctx.font='13px sans-serif';
        ctx.fillText('工兵班组自动从左岸向江心推进，每 90px 打一根桩，架通 10 根即胜',356,246);
        ctx.fillText('敌炮装填时出现橙色落点标记；炮弹落点有 1.2 秒红圈预警',356,274);
        ctx.fillText('按 1/2/3（或点江段按钮）压制对应江段：敌炮哑火 2 秒，随后冷却 6 秒',356,302);
        ctx.fillText('同一时刻只能压制一段；工兵被命中会退回上一根桩重新推进',356,330);
        ctx.fillText('限时 90 秒。你无法摧毁敌炮——不与炮台对攻，只为架桥争取时间',356,358);
        ctx.fillStyle='#ffcf24';ctx.font='bold 13px sans-serif';ctx.fillText('白色波浪线 = 该江段压制生效中 · 点「开始架桥」出发',356,392);}
      if(s.status==='playing'&&manualPause){
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(10,12,12,.85)';ctx.fillRect(470,310,340,90);ctx.strokeStyle='#4a4d52';ctx.strokeRect(470,310,340,90);
        ctx.textAlign='center';ctx.fillStyle='#f2f0e9';ctx.font='bold 20px sans-serif';ctx.fillText('已暂停 PAUSED',640,348);
        ctx.fillStyle='#b8bcb4';ctx.font='13px sans-serif';ctx.fillText('点「继续架桥」恢复作业',640,378);ctx.textAlign='left';}
      if(s.status==='won'||s.status==='lost'){
        ctx.fillStyle='rgba(4,6,8,.55)';ctx.fillRect(0,0,1280,720);
        const won=s.status==='won';
        ctx.fillStyle='rgba(13,15,17,.94)';cut(330,246,620,166,16);ctx.fill();ctx.strokeStyle=won?'#ffcf24':'#c24034';ctx.lineWidth=2;ctx.stroke();
        ctx.textAlign='center';
        ctx.fillStyle=won?'#ffcf24':'#e0a08a';ctx.font='bold 40px sans-serif';ctx.fillText(won?'渡江通道打开':'渡江未成',640,314);
        ctx.fillStyle='#8b8e93';ctx.font='13px sans-serif';ctx.fillText(won?'CHANNEL OPEN':'MISSION FAILED',640,338);
        ctx.fillStyle='#e8e6df';ctx.font='14px sans-serif';ctx.fillText(s.reason,640,368);
        if(won){const rt=this.rating(s,retries);ctx.fillStyle='#ffcf24';ctx.font='bold 15px sans-serif';ctx.fillText(rt.rating+' · '+rt.score+' 分',640,394);}
        ctx.textAlign='left';}
    };
    let hudAt=0;const frame=now=>{
      if(closed)return;
      if(!dialog.isConnected||!current()){close();return;}
      if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,Math.max(0,Math.min(.1,(now-last)/1000)));
      last=now;
      for(const event of s.events.splice(0)){sound(event);
        if(event==='interrupt'||event==='boom'){canvas.classList.remove('wuj72-shake');void canvas.offsetWidth;canvas.classList.add('wuj72-shake');}}
      draw();if(now-hudAt>100||s.status!=='playing'){sync();hudAt=now;}
      raf=requestAnimationFrame(frame);
    };
    sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
