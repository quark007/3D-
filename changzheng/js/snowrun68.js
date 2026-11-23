/* Original snow-run exercise: silhouettes only, no injury depiction. 一步不能停。 */
window.SnowRun68={
  supports(id){return [8].includes(Number(id));},
  definitions:{
    8:{title:'雪山速降 · 一步不能停',speed:150,goal:9200,timeCap:90,
      gravity:1400,jumpV:560,skierX:300,maxCrevasse:100,helpTime:1,distances:400,
      intro:'夹金山上一步不能停：跳过冰裂缝、俯身躲风雪、扶起每一位掉队的战友。队伍 8 人，每人 2 点体力；摔倒会消耗体力，体力耗尽的战友会坐进雪堆。摔倒累计 3 次、同时 3 人掉队或超时，队伍就被风雪吹散。',
      success:'翻过垭口，风雪在身后。回头数一数——八个人，一个都不少。',
      fail:'风雪太大，队伍被吹散，重新集结再试。',
      hist:'1935 年 6 月，中央红军翻越夹金山（海拔约 4119 米）。据党史出版物记载，红军以绳索相连、相互搀扶翻山，「一步不能停，停下就再也起不来」。本推演的地形、体力与数值均为教学设定。'
    }
  },
  /* 地形生成：游标纪律——任意危险起点间隔 ≥200px；裂缝宽度 ≤ 跳跃清距（150×0.8s=120 ≥ maxCrevasse 100） */
  generate(d,rnd){
    const segs=[],obstacles=[];let x=400,h=0,nextAllow=0;
    const gap=(a,b)=>a+rnd()*(b-a);
    segs.push({x0:0,x1:400,h0:0,h1:0,type:'flat'});
    while(x<d.goal+600){
      if(x<nextAllow){const len=nextAllow-x+40;segs.push({x0:x,x1:x+len,h0:h,h1:h,type:'flat'});x+=len;continue;}
      const roll=rnd(),kind=roll<0.25?'rocks':roll<0.45?'crevasse':roll<0.65?'slope':roll<0.85?'storm':'flat';
      if(kind==='flat'){const len=gap(300,460);segs.push({x0:x,x1:x+len,h0:h,h1:h,type:'flat'});nextAllow=x+len+100;x+=len;}
      else if(kind==='rocks'){const len=gap(380,480),n=2+(rnd()*2|0);for(let k=0;k<n;k++)obstacles.push({kind:'rock',x:x+80+k*140,r:26});segs.push({x0:x,x1:x+len,h0:h,h1:h,type:'flat'});nextAllow=x+len+200;x+=len;}
      else if(kind==='crevasse'){const w=60+rnd()*(d.maxCrevasse-60);segs.push({x0:x,x1:x+w,h0:h,h1:h,type:'crevasse'});obstacles.push({kind:'crevasse',x:x,w});x+=w+60;segs.push({x0:x-60,x1:x,h0:h,h1:h,type:'flat'});nextAllow=x+220;}
      else if(kind==='slope'){const len=gap(360,520),dh=(rnd()<.5?-1:1)*gap(30,70);segs.push({x0:x,x1:x+len,h0:h,h1:h+dh,type:'slope'});h+=dh;nextAllow=x+len+140;x+=len;}
      else {const len=gap(480,600);segs.push({x0:x,x1:x+len,h0:h,h1:h,type:'storm'});obstacles.push({kind:'gust',x:x+140,w:160});obstacles.push({kind:'gust',x:x+400,w:160});nextAllow=x+len+200;x+=len;}
    }
    segs.push({x0:x,x1:x+400,h0:h,h1:h,type:'flat'});
    return {segs,obstacles,goalX:d.goal};
  },
  groundAt(d,segs,wx){for(const sg of segs){if(wx>=sg.x0&&wx<=sg.x1){if(sg.type==='crevasse')return null;return sg.h0+(sg.h1-sg.h0)*((wx-sg.x0)/(sg.x1-sg.x0||1));}}return 0;},
  create(id,random=Math.random){
    const d=this.definitions[id],gen=this.generate(d,random);
    return {id:Number(id),d,rnd:random,segs:gen.segs,obstacles:gen.obstacles,goalX:gen.goalX,
      x:0,air:0,jumpV:0,duck:false,inv:0,time:0,
      members:Array.from({length:8},()=>({st:2,state:'ok',downAt:0})),drops:0,helped:0,helpT:0,morale:8,
      snow:[],status:'ready',reason:'',events:[],accumulator:0,lastJump:false};
  },
  trip(s,reasonKind){
    if(s.inv>0)return;s.inv=1;
    const alive=s.members.filter(m=>m.state==='ok');
    if(alive.length){const m=alive[(s.rnd()*alive.length)|0];m.st--;if(m.st<=0){m.state='down';m.downAt=s.x+s.d.distances;s.drops++;s.events.push('down');}else s.events.push('trip');}
    s.events.push('shake');
  },
  helpTry(s,dt,keys){
    const down=s.members.find(m=>m.state==='down'&&m.downAt<=s.x+60);
    if(down&&keys.help){s.helpT+=dt;if(s.helpT>=s.d.helpTime){down.state='ok';down.st=1;s.helped++;s.morale=Math.min(10,s.morale+1);s.helpT=0;s.events.push('help');}}
    else s.helpT=0;
  },
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');},
  step(s,dt=1/120,keys){
    if(s.status!=='playing')return;const d=s.d;s.time+=dt;s.inv=Math.max(0,s.inv-dt);
    if(s.drops>=3){this.finish(s,false,d.fail);return;}
    if(s.time>=d.timeCap){this.finish(s,false,'风雪太大，队伍被吹散，重新集结再试。');return;}
    s.x+=d.speed*dt;
    if(s.x>=s.goalX){this.finish(s,true,d.success);return;}
    const grounded=s.air<=0;
    const gh=this.groundAt(d,s.segs,s.x);
    /* 跳跃 */
    if(keys.jump&&!s.lastJump&&grounded){s.jumpV=d.jumpV;s.air=0.001;}
    s.lastJump=!!keys.jump;
    if(s.air>0){s.jumpV-=d.gravity*dt;s.air+=s.jumpV*dt;if(s.air<=0){s.air=0;s.jumpV=0;}}
    s.duck=!!keys.duck&&!s.air;
    /* 裂缝：贴地且脚下无地面 → 摔倒并弹到对岸 */
    if(grounded&&gh===null){this.trip(s);s.x+=60;s.air=0.001;s.jumpV=120;}
    /* 石块：贴地且重叠 */
    for(const o of s.obstacles){if(o.kind!=='rock')continue;if(Math.abs(o.x-s.x)<o.r+12&&s.air<=8&&s.inv<=0){this.trip(s);break;}}
    /* 风雪块：不俯身撞上 */
    for(const o of s.obstacles){if(o.kind!=='gust')continue;if(s.x>o.x&&s.x<o.x+o.w&&!s.duck&&s.inv<=0){this.trip(s);break;}}
    /* 扶起 */
    this.helpTry(s,dt,keys);
    /* 同时掉队 3 人 */
    if(s.members.filter(m=>m.state==='down').length>=3){this.finish(s,false,'三名战友同时掉队，队伍被迫停下集结——重来，看好每一个人。');return;}
    for(const m of s.members)if(m.state==='down'&&m.downAt<s.x-200)m.downAt=s.x+120;/* 掉队者始终在前方等待 */
  },
  advance(s,seconds,keys){s.accumulator+=Math.max(0,Math.min(.1,seconds));while(s.accumulator+1e-9>=1/120){this.step(s,1/120,keys);s.accumulator-=1/120;}},
  rating(s){const downNow=s.members.filter(m=>m.state==='down').length;
    return s.drops===0?{score:95,rating:'铁脚板'}:(s.drops<=1&&downNow===0)?{score:85,rating:'同行者'}:{score:70,rating:'抵达垭口'};},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('snowrun68-style'))return;const el=document.createElement('style');el.id='snowrun68-style';el.textContent=`
    .snowrun68-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:96dvh;margin:auto;padding:14px 16px;background:#0e1420;color:#e8e2d2;border:1px solid #4a4d52;border-radius:2px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif}
    .snowrun68-dialog::backdrop{background:#04050acc}.snowrun68-dialog h2{margin:0;font-size:clamp(18px,2.6vw,26px);color:#f2f3f4;font-weight:800}.snowrun68-dialog p{margin:6px 0}.snowrun68-dialog header,.snowrun68-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.snowrun68-dialog header{justify-content:space-between}
    .snowrun68-dialog button{font:inherit;background:#1a1c20;color:#e8e2d2;border:1px solid #4a4d52;border-radius:0;padding:8px 14px;min-height:42px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:border-color .12s,transform .12s}.snowrun68-dialog button:hover{border-color:#8b8e93;transform:translateY(-1px)}.snowrun68-dialog button:disabled{opacity:.45;cursor:default;transform:none}
    .snowrun68-dialog [data-start]{background:#ffcf24;border-color:#ffcf24;color:#111;font-weight:800;clip-path:polygon(13px 0,100% 0,calc(100% - 13px) 100%,0 100%)}
    .snowrun68-dialog [data-help]{min-width:120px}
    .snowrun68-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .snowrun68-dialog canvas{display:block;width:min(82.2dvh,100%);aspect-ratio:16/9;height:auto;margin:0 auto;background:#0e1420;touch-action:none;border-radius:2px;box-shadow:0 0 0 1px #2c2e33}
    .snowrun68-status{min-height:1.5em;color:#ffdea1}.snowrun68-actions{margin-top:6px}.snowrun68-dialog [hidden]{display:none!important}
    .challenge-item.snow68-entry{cursor:pointer;border:1px solid #ab905c;border-radius:8px;padding:13px;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.challenge-item.snow68-entry:hover,.challenge-item.snow68-entry:focus-visible{transform:translateY(-2px);border-color:#e4c98a;box-shadow:0 5px 16px rgba(0,0,0,.4)}
    .snowrun68-note{font-size:13px;color:#9a9c9f}.snowrun68-shake{animation:snowrun68-shake .18s linear}@keyframes snowrun68-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}
    @media(prefers-reduced-motion:reduce){.snowrun68-shake{animation:none}.snowrun68-dialog button:hover{transform:none}}@media(max-width:600px){.snowrun68-dialog{padding:12px;font-size:13px}.snowrun68-dialog canvas{width:100%}}`;
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dialog=document.createElement('dialog');dialog.className='snowrun68-dialog';dialog.setAttribute('aria-labelledby','snowrun68-title');
    dialog.innerHTML='<header><div><h2 id="snowrun68-title"></h2><span class="xjg-sub" style="font-size:12px;letter-spacing:.18em;color:#8b8e93">SNOW RUN · 一步不能停</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="雪山速降画面。空格或 W 跳冰裂缝，S 俯身躲风雪，靠近掉队战友按住 Shift 一秒扶起。"></canvas><p data-hud></p><p class="snowrun68-status" role="status" aria-live="polite"></p><div class="snowrun68-actions"><button data-start>开始速降 · SNOW RUN</button><button data-help disabled>扶起战友 · 长按 SHIFT</button><button data-pause disabled>暂停</button><button data-mute>声音</button><button data-retry>重新速降</button><button data-complete hidden>记录成绩 · 完成本章</button></div><p class="snowrun68-note">↑/W/空格 跳跃，↓/S 俯身，SHIFT 长按扶起（触屏用屏幕按钮）。摔倒消耗队员体力，体力耗尽掉队；摔倒累计 3 次或同时 3 人掉队即失败。抽象剪影，无伤亡表现。</p><details class="snowrun68-note"><summary>史实与练习说明</summary><p data-hist></p><p>本小游戏为原创速降练习：地形、体力、分数与重开次数均为教学设定。</p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null,keys={jump:false,duck:false,help:false},touchHelp=false,lastJump=false;
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const sound=kind=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=kind==='lose'?'sawtooth':kind==='trip'?'square':'sine';const f=kind==='trip'?170:kind==='down'?120:kind==='help'?520:kind==='jump'?240:kind==='win'?660:110;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f/(kind==='win'?1:2.4)),now+.22);g.gain.setValueAtTime(.08,now);g.gain.exponentialRampToValueAtTime(.001,now+.28);o.connect(g);g.connect(master);o.start();o.stop(now+.3);}catch{/* Sound must never block the exercise. */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{const down=s.members.filter(m=>m.state==='down').length;q('[data-hud]').textContent=`里程 ${Math.round(s.x)}/${Math.round(s.goalX)}m · 队列 ${s.members.filter(m=>m.state==='ok').length}/8 · 掉队 ${down} · 扶回 ${s.helped} · 用时 ${Math.round(s.time)}s`;q('[data-start]').hidden=s.status!=='ready';q('[data-help]').disabled=s.status!=='playing';q('[data-pause]').disabled=s.status!=='playing';q('[data-pause]').textContent=manualPause?'继续速降':'暂停';q('[data-mute]').textContent=this.muted()?'开启声音':'全部静音';q('[data-complete]').hidden=s.status!=='won';const text=s.status==='ready'?'点「开始速降」；看清裂缝与风雪，战友都在身后。':s.status==='won'?this.rating(s).rating+' · '+s.reason:s.status==='lost'?s.reason:manualPause||this.paused()?'速降已暂停。':s.inv>0?'摔了一跤——稳住，一步不能停！':down>0?'有战友掉队了！靠近红色人形，长按 SHIFT 扶起。':'滑行中……注意前方裂缝与风雪。';if(q('.snowrun68-status').textContent!==text)q('.snowrun68-status').textContent=text;};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};q('[data-pause]').onclick=()=>{manualPause=!manualPause;last=0;sync();};
    q('[data-help]').onclick=()=>{keys.help=true;setTimeout(()=>{keys.help=false;},900);sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);this.session=s;manualPause=false;recorded=false;last=0;keys={jump:false,duck:false,help:false};sync();draw();q('[data-start]').focus();};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.rating(s),key='snow68_'+node.id;GameState.storyPreparations||={};const old=GameState.storyPreparations[key];if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,drops:s.drops,helped:s.helped,retries,completedAt:new Date().toISOString()};GameState.recordBattleScore(node.id,result.score,result.rating);if(GameState.save()===false){recorded=false;if(typeof GameUI!=='undefined')GameUI.showToast('成绩尚未保存，请重试记录。');return;}close();if(typeof onComplete==='function')onComplete();};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720);return{x:(e.clientX-r.left)/scale,y:(e.clientY-r.top)/scale};};
    canvas.onpointerdown=e=>{if(s.status!=='playing'||manualPause||this.paused()||e.button>0)return;const p=point(e);gesture();canvas.focus();e.preventDefault();if(p.y<420){keys.jump=true;setTimeout(()=>{keys.jump=false;},80);}else{keys.duck=true;}};
    canvas.onpointerup=()=>{keys.duck=false;};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.target!==canvas)return;const k=(e.key||'').toLowerCase();
      if(k==='arrowup'||k==='w'||k===' '){e.preventDefault();e.stopPropagation();keys.jump=e.type==='keydown';}
      else if(k==='arrowdown'||k==='s'){e.preventDefault();e.stopPropagation();keys.duck=e.type==='keydown';}
      else if(k==='shift'){e.preventDefault();e.stopPropagation();keys.help=e.type==='keydown';}};dialog.addEventListener('keydown',key);dialog.addEventListener('keyup',key);
    /* 绘制 */
    const drawSkier=(sx,sy,pose,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.arc(sx,sy-26,6,0,Math.PI*2);ctx.fill();ctx.fillRect(sx-5,sy-20,10,12);if(pose==='duck')ctx.fillRect(sx-5,sy-14,12,8);else{ctx.fillRect(sx-6,sy-8,4,8);ctx.fillRect(sx+2,sy-8,4,8);}ctx.fillRect(sx-12,sy-1,26,3);};
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);const d=s.d;
      const dusk=ctx.createLinearGradient(0,0,0,300);dusk.addColorStop(0,'#2a1e2e');dusk.addColorStop(.6,'#5a3a3a');dusk.addColorStop(1,'#8a5a44');ctx.fillStyle=dusk;ctx.fillRect(0,0,1280,340);
      /* 三层视差远山 */
      for(let L=0;L<3;L++){const off=s.x*(0.15+L*0.15);ctx.fillStyle=['#3a2c3a','#4a3440','#5c4248'][L];ctx.beginPath();ctx.moveTo(0,340);for(let px=0;px<=1280;px+=40){ctx.lineTo(px,180+L*40+Math.sin((px+off)*.004+L*2)*50+Math.cos((px+off)*.011+L)*22);}ctx.lineTo(1280,340);ctx.closePath();ctx.fill();}
      /* 地面与雪原（世界坐标→屏幕） */
      const cam=s.x-300;const groundScreen=wx=>{const gh=this.groundAt(d,s.segs,wx);return gh===null?null:430+gh;};
      ctx.fillStyle='#dfe6ee';ctx.beginPath();let pen=false;for(let sx=0;sx<=1280;sx+=8){const wx=cam+sx,gh=groundScreen(wx);if(gh===null){pen=false;continue;}const sy=gh+120;pen?ctx.lineTo(sx,sy):(ctx.moveTo(sx,sy),pen=true);}ctx.lineTo(1280,720);ctx.lineTo(0,720);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#b8c4d4';ctx.lineWidth=2;pen=false;for(let sx=0;sx<=1280;sx+=8){const wx=cam+sx,gh=groundScreen(wx);if(gh===null){pen=false;continue;}const sy=gh+120;pen?ctx.lineTo(sx,sy):(ctx.moveTo(sx,sy),pen=true);}ctx.stroke();
      /* 裂缝提示（红缘） */
      for(const o of s.obstacles){if(o.kind!=='crevasse')continue;const sx=o.x-cam;if(sx<-60||sx>1340)continue;ctx.strokeStyle='rgba(229,72,77,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(sx,groundScreen(o.x)+118);ctx.lineTo(sx+o.w,groundScreen(o.x+o.w)+118);ctx.stroke();}
      /* 石块 */
      for(const o of s.obstacles){if(o.kind!=='rock')continue;const sx=o.x-cam;if(sx<-40||sx>1320)continue;ctx.fillStyle='#6b7484';ctx.beginPath();ctx.arc(sx,groundScreen(o.x)+108,o.r*.7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#8a94a4';ctx.beginPath();ctx.arc(sx-4,groundScreen(o.x)+104,o.r*.4,0,Math.PI*2);ctx.fill();}
      /* 风雪块（暴风段竖纹） */
      for(const o of s.obstacles){if(o.kind!=='gust')continue;const sx=o.x-cam;if(sx>1340||sx+o.w<-40)continue;ctx.fillStyle='rgba(200,215,235,.24)';ctx.fillRect(sx,groundScreen(o.x)+40,o.w,90);ctx.strokeStyle='rgba(200,215,235,.4)';for(let k=0;k<6;k++){ctx.beginPath();ctx.moveTo(sx+k*o.w/6,groundScreen(o.x)+44);ctx.lineTo(sx+k*o.w/6-14,groundScreen(o.x)+126);ctx.stroke();}}
      /* 掉队战友（红色坐姿 + ! 气泡） */
      for(const m of s.members){if(m.state!=='down')continue;const sx=m.downAt-cam;if(sx<-40||sx>1320)continue;const gy=groundScreen(m.downAt)+110;ctx.fillStyle='#e5484d';ctx.beginPath();ctx.arc(sx,gy-22,6,0,Math.PI*2);ctx.fill();ctx.fillRect(sx-5,gy-16,10,10);ctx.fillRect(sx-8,gy-6,16,4);ctx.fillStyle='#ffcf24';ctx.font='bold 14px sans-serif';ctx.fillText('!',sx-3,gy-32);}
      /* 垭口旗 */
      const fx=s.goalX-cam;if(fx>-40&&fx<1320){const gy=groundScreen(s.goalX)+110;ctx.strokeStyle='#e8e2d2';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(fx,gy);ctx.lineTo(fx,gy-56);ctx.stroke();ctx.fillStyle='#c8372a';ctx.beginPath();ctx.moveTo(fx,gy-56);ctx.lineTo(fx+30,gy-46);ctx.lineTo(fx,gy-36);ctx.fill();}
      /* 滑雪者 */
      const sx=300,sy=groundScreen(s.x)+110-(s.air||0);const flick=s.inv>0&&Math.sin(s.time*30)>0;
      if(!flick)drawSkier(sx,sy-(s.duck?6:0),s.duck?'duck':'up',s.duck?'#8fb4cc':'#f2f3f4');
      /* 雪粒子 */
      if(!reduced){ctx.fillStyle='rgba(255,255,255,.5)';for(let i=0;i<24;i++){const px=(i*173-s.time*160)%1280,py=(i*97+s.time*60)%720;ctx.fillRect((px+1280)%1280,py,2,2);}}
      /* AK 面板：切角助手 */
      const cutP=(x,y,w,h,c)=>{ctx.beginPath();ctx.moveTo(x+c,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+c);ctx.closePath();};
      /* 左上：小队 SQUAD 面板（头像+体力+里程进度条） */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(16,14,432,84,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;cutP(16,14,432,84,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(16,14,3,84);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('小队',34,34);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('SQUAD · 一步不能停',62,34);
      for(let i=0;i<8;i++){const m=s.members[i],mx=36+i*48;ctx.fillStyle=m.state==='down'?'#e5484d':'#dfe6ee';ctx.beginPath();ctx.arc(mx,50,7,0,Math.PI*2);ctx.fill();for(let p2=0;p2<2;p2++){ctx.fillStyle=p2<m.st?'#7dc47f':'#3a3d42';ctx.fillRect(mx-8+p2*9,60,7,4);}}
      const marchPct=Math.max(0,Math.min(1,s.x/s.goalX));
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('里程',34,82);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('MARCH',64,82);
      ctx.fillStyle='#1a1c20';cutP(104,70,240,14,4);ctx.fill();ctx.fillStyle='#ffcf24';cutP(104,70,240*marchPct,14,4);ctx.fill();
      ctx.fillStyle='#ffcf24';ctx.font='900 14px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(marchPct*100)+'%',440,82);ctx.textAlign='left';
      /* 右上：行军战况面板（士气/扶回/掉队） */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(1010,14,254,84,12);ctx.fill();ctx.strokeStyle='#4a4d52';cutP(1010,14,254,84,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(1010,14,3,84);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('行军战况',1028,34);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('MARCH STATUS',1112,34);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('士气 MORALE',1028,56);ctx.fillStyle='#ffcf24';ctx.font='900 14px sans-serif';ctx.fillText(s.morale+'/10',1216,56);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('扶回 HELPED',1028,76);ctx.fillStyle='#7dc47f';ctx.font='900 14px sans-serif';ctx.fillText(String(s.helped),1216,76);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('掉队 DOWN',1028,92);ctx.fillStyle=s.drops>0?'#e5484d':'#7dc47f';ctx.font='900 14px sans-serif';ctx.fillText(String(s.members.filter(m=>m.state==='down').length),1216,92);
      ctx.fillStyle='rgba(13,14,16,.78)';cutP(16,684,268,26,8);ctx.fill();ctx.font='15px sans-serif';ctx.fillStyle='#e8e2d2';ctx.fillText('教学模拟 · 抽象剪影 · 无伤亡表现',30,701);
      /* 暴风预警 */
      const storm=s.obstacles.find(o=>o.kind==='gust'&&o.x-s.x>0&&o.x-s.x<420);
      if(storm){ctx.fillStyle='rgba(229,72,77,.9)';ctx.font='bold 14px sans-serif';ctx.textAlign='right';ctx.fillText('⚠ 暴风段临近 · 俯身（↓/S）',1264,116);ctx.textAlign='left';}
      /* 胜负大字层 */
      if(s.status==='won'||s.status==='lost'){const won=s.status==='won';ctx.fillStyle='rgba(6,8,10,.55)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(13,14,16,.92)';ctx.fillRect(300,240,680,168);ctx.strokeStyle=won?'#ffcf24':'#e5484d';ctx.lineWidth=2;ctx.strokeRect(300,240,680,168);
        ctx.textAlign='center';ctx.fillStyle=won?'#ffcf24':'#e5484d';ctx.font='bold 44px sans-serif';ctx.fillText(won?'翻过垭口':'队伍被吹散',640,312);
        ctx.fillStyle='#8b8e93';ctx.font='13px sans-serif';ctx.fillText(won?'S U M M I T   R E A C H E D':'R E G R O U P   R E Q U I R E D',640,338);
        const rt=this.rating(s);ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(rt.rating+' · '+rt.score+' 分',640,372);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText(s.reason,640,394);ctx.textAlign='left';}
    };
    const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000,keys);last=now;
      for(const event of s.events.splice(0)){sound(event);if(event==='trip'||event==='lose'){canvas.classList.remove('snowrun68-shake');void canvas.offsetWidth;canvas.classList.add('snowrun68-shake');}}
      draw();if(now-(frame.hudAt||0)>100||s.status!=='playing'){sync();frame.hudAt=now;}raf=requestAnimationFrame(frame);
    };sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
