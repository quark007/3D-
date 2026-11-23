/* Original stealth exercise: abstract night-recon tokens, no real parameters. */
window.Scout67={
  supports(id){return [5].includes(Number(id));},
  definitions:{
    5:{title:'夜探渡口 · 巧渡金沙江',guardSpeed:55,chaseSpeed:95,playerSpeed:150,
      range:170,fov:65,alertFill:1.2,catchDist:24,
      intro:'潜行推演：方向键/WASD 移动，或按住画面拖动。避开七名哨兵的视线扇区，躲进草丛可隐身，集齐三份敌情后返回左下角江边木船撤离。被发现会被哨兵追捕。',
      success:'三份敌情到手，人船俱获——干部团智取皎平渡！',
      playerStart:{x:86,y:596},
      intel:[{id:'troops',name:'敌兵力部署',x:586,y:112},{id:'guns',name:'火力点位置',x:1128,y:236},{id:'boats',name:'渡船与船工',x:1076,y:560}],
      extract:{x:96,y:640},
      bushes:[{x:300,y:180,r:64},{x:470,y:430,r:70},{x:820,y:120,r:60},{x:940,y:400,r:66},{x:640,y:560,r:62},{x:150,y:380,r:58}],
      walls:[{x:390,y:220,w:170,h:60},{x:700,y:250,w:150,h:56},{x:1180,y:80,w:90,h:120},{x:60,y:60,w:120,h:70}],
      guards:[
        {path:[{x:340,y:90},{x:900,y:90},{x:900,y:180},{x:340,y:180}],start:0},
        {path:[{x:640,y:330},{x:1180,y:330},{x:1180,y:470},{x:640,y:470}],start:1},
        {path:[{x:560,y:590},{x:1220,y:620}],start:0},
        {path:[{x:230,y:190},{x:230,y:560}],start:0},
        {path:[{x:420,y:470},{x:960,y:470}],start:1},
        {path:[{x:1060,y:80},{x:1060,y:310}],start:0},
        {path:[{x:260,y:610},{x:540,y:640}],start:0}
      ],
      hist:'1935 年 5 月，刘伯承率干部团先遣队化装突袭、智取皎平渡：先夺渡口缴得 2 只木船，后又寻得 7 只木船与 37 名船工，数万红军凭此北渡金沙江，跳出重围。'
    }
  },
  blocked(d,x1,y1,x2,y2){const dist=Math.hypot(x2-x1,y2-y1),n=Math.max(1,Math.ceil(dist/8));for(let i=1;i<n;i++){const t=i/n,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t;for(const w of d.walls)if(x>w.x&&x<w.x+w.w&&y>w.y&&y<w.y+w.h)return true;}return false;},
  inBush(d,x,y){for(const b of d.bushes)if(Math.hypot(x-b.x,y-b.y)<=b.r)return true;return false;},
  free(d,x,y){return !d.walls.some(w=>x>w.x-12&&x<w.x+w.w+12&&y>w.y-12&&y<w.y+w.h+12);},
  seen(d,g,px,py,hiddenNow){
    const dx=px-g.x,dy=py-g.y,dist=Math.hypot(dx,dy);
    if(dist>d.range||dist<6)return false;
    const diff=Math.abs(((Math.atan2(dy,dx)-g.dir+Math.PI*3)%(Math.PI*2))-Math.PI);
    if(diff>d.fov*Math.PI/360)return false;
    if(hiddenNow)return false;
    return !this.blocked(d,g.x,g.y,px,py);
  },
  guardStep(d,g,dt,s){
    if(g.state==='chase'){
      const dx=s.player.x-g.x,dy=s.player.y-g.y,dist=Math.hypot(dx,dy);
      g.dir=Math.atan2(dy,dx);
      if(dist>2){const nx=g.x+dx/dist*d.chaseSpeed*dt,ny=g.y+dy/dist*d.chaseSpeed*dt;
        if(this.free(d,nx,ny)){g.x=nx;g.y=ny;}
        else if(this.free(d,nx,g.y))g.x=nx;
        else if(this.free(d,g.x,ny))g.y=ny;}
      g.alert=1;
      if(dist<d.catchDist){s.status='caught';s.reason='被哨兵抓住，侦察中断。可重新潜入，多利用草丛与背身。';s.events.push('caught');}
      return;
    }
    if(g.state==='suspicious'){
      g.timer-=dt;
      const dx=g.lastX-g.x,dy=g.lastY-g.y,dist=Math.hypot(dx,dy);
      if(g.timer>0.7){if(dist>2)g.dir=Math.atan2(dy,dx);}
      else if(dist>26){g.dir=Math.atan2(dy,dx);const nx=g.x+dx/dist*d.guardSpeed*1.25*dt,ny=g.y+dy/dist*d.guardSpeed*1.25*dt;
        if(this.free(d,nx,ny)){g.x=nx;g.y=ny;}
        else if(this.free(d,nx,g.y))g.x=nx;
        else if(this.free(d,g.x,ny))g.y=ny;}
      else g.dir+=dt*.8;
      if(g.timer<=0){g.state='patrol';g.alert=Math.min(g.alert,.5);}
      return;
    }
    const wp=g.path[g.wp],dx=wp.x-g.x,dy=wp.y-g.y,dist=Math.hypot(dx,dy);
    if(dist<8){g.pause=(g.pause||0)-dt;if(g.pause<=0){g.wp=(g.wp+1)%g.path.length;g.pause=.9;}return;}
    const want=Math.atan2(dy,dx);let diff=want-g.dir;
    while(diff>Math.PI)diff-=Math.PI*2;while(diff<-Math.PI)diff+=Math.PI*2;
    g.dir+=Math.max(-3*dt,Math.min(3*dt,diff));
    g.x+=Math.cos(g.dir)*d.guardSpeed*dt;g.y+=Math.sin(g.dir)*d.guardSpeed*dt;
  },
  step(s,dt=1/120,keys){
    if(s.status!=='playing')return;const d=s.d;s.time+=dt;
    let mx=(keys.right?1:0)-(keys.left?1:0),my=(keys.down?1:0)-(keys.up?1:0);
    if((keys.px!==null&&keys.px!==undefined)){const dx=keys.px-s.player.x,dy=keys.py-s.player.y,dist=Math.hypot(dx,dy);if(dist>10){mx=dx/dist;my=dy/dist;}else{mx=0;my=0;}}
    const mag=Math.hypot(mx,my);
    if(mag>0){const nx=s.player.x+mx/mag*d.playerSpeed*dt,ny=s.player.y+my/mag*d.playerSpeed*dt;
      if(!d.walls.some(w=>nx>w.x-12&&nx<w.x+w.w+12&&ny>w.y-12&&ny<w.y+w.h+12)&&nx>14&&nx<1266&&ny>14&&ny<648){s.player.x=nx;s.player.y=ny;}
      else if(!d.walls.some(w=>s.player.x>w.x-12&&s.player.x<w.x+w.w+12&&ny>w.y-12&&ny<w.y+w.h+12)&&ny>14&&ny<648){s.player.y=ny;}
      else if(!d.walls.some(w=>nx>w.x-12&&nx<w.x+w.w+12&&s.player.y>w.y-12&&s.player.y<w.y+w.h+12)&&nx>14&&nx<1266){s.player.x=nx;}}
    const hidden=this.inBush(d,s.player.x,s.player.y);s.hidden=hidden;
    for(const g of s.guards){
      const seen=this.seen(d,g,s.player.x,s.player.y,hidden);
      if(seen){g.alert=Math.min(1,g.alert+d.alertFill*dt);g.lastX=s.player.x;g.lastY=s.player.y;
        if(g.state==='patrol'){g.state='suspicious';g.timer=1.0;}
        if(g.alert>=1&&g.state!=='chase'){g.state='chase';s.alerts++;s.events.push('spotted');}}
      else if(g.state==='chase'){g.state='suspicious';g.timer=2.2;}
      else if(g.alert>0){g.alert=Math.max(0,g.alert-dt*.6);if(g.state!=='suspicious'&&g.alert>.45){g.state='suspicious';g.timer=1.6;}}
      this.guardStep(d,g,dt,s);
      if(s.status!=='playing')return;
    }
    for(const it of s.intel){if(!it.got&&Math.hypot(s.player.x-it.x,s.player.y-it.y)<26){it.got=true;s.events.push('intel');}}
    if(s.intel.every(i=>i.got)&&Math.hypot(s.player.x-d.extract.x,s.player.y-d.extract.y)<34){this.finish(s,true,d.success);return;}
    s.clock=(s.clock||0)+dt;
  },
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'caught';s.reason=reason;s.events.push(won?'win':'caught');},
  create(id){const d=this.definitions[id];return {id:Number(id),d,player:{...d.playerStart},guards:d.guards.map(g=>{const a=g.path[g.start],b2=g.path[(g.start+1)%g.path.length];return {path:g.path,wp:g.start,x:a.x,y:a.y,dir:Math.atan2(b2.y-a.y,b2.x-a.x),alert:0,state:'patrol',timer:0,pause:0};}),intel:d.intel.map(i=>({...i,got:false})),alerts:0,time:0,hidden:false,status:'ready',reason:'',events:[]};},
  rating(s,retries){return retries===0&&s.alerts===0?{score:95,rating:'神行夜探'}:s.alerts<=1&&retries<=1?{score:85,rating:'胆大心细'}:{score:70,rating:'完成任务'};},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('scout67-style'))return;const el=document.createElement('style');el.id='scout67-style';el.textContent=`
    .scout67-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:96dvh;margin:auto;padding:0;background:#101315;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .scout67-dialog::backdrop{background:#05070ae6}
    .scout67-dialog header{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:14px 18px 13px;border-bottom:1px solid #2a2d31;background:#131619}
    .scout67-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;letter-spacing:.02em;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:12px}
    .scout67-sub{margin:3px 0 0;padding-left:13px;font-size:12px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .scout67-body{padding:13px 18px 16px}
    .scout67-dialog p{margin:6px 0}
    .scout67-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer;letter-spacing:.04em;transition:background .12s ease,border-color .12s ease}
    .scout67-dialog button:hover:not(:disabled){background:#22262b;border-color:#6a6e74}
    .scout67-dialog button:disabled{opacity:.4;cursor:default}
    .scout67-dialog button[data-start]{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .scout67-dialog button[data-start]:hover:not(:disabled){background:#ffd95c;border-color:#ffd95c}
    .scout67-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .scout67-dialog canvas{display:block;width:min(100%,max(240px,calc((100dvh - 310px)*1.7778)));aspect-ratio:16/9;height:auto;margin:0 auto;background:#0c110d;border:1px solid #3a3d42;touch-action:none}
    .scout67-hud{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px dashed #2a2d31;padding-bottom:8px}
    .scout67-hud span{background:#14171a;border:1px solid #2a2d31;border-radius:2px;padding:3px 12px;font-variant-numeric:tabular-nums;letter-spacing:.03em;color:#d5d8d2;font-size:13px}
    .scout67-hud span[data-warn]{color:#ff8d75;border-color:#6a3a30}
    .scout67-hud span[data-hud-hidden]{color:#9fd08a;border-color:#3a5a40}
    .scout67-brief{border:1px solid #2a2d31;border-left:3px solid #ffcf24;background:#14171a;padding:12px 13px;margin:0 0 12px}
    .scout67-brief::before{content:'任务简报 · BRIEFING';display:block;font-size:12px;letter-spacing:.2em;color:#8b8e93;margin-bottom:4px}
    .scout67-brief p{margin:0;font-size:14px;color:#d5d8d2}
    .scout67-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:11px}
    .scout67-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .scout67-dialog [hidden]{display:none!important}
    .challenge-item.scout67-entry{cursor:pointer;border:1px solid #3f4247;border-radius:3px;padding:13px;background:#14171a;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}
    .challenge-item.scout67-entry:hover,.challenge-item.scout67-entry:focus-visible{transform:translateY(-2px);border-color:#ffcf24;box-shadow:0 6px 18px rgba(0,0,0,.45)}
    .scout67-note{font-size:13px;color:#8f948d}
    .scout67-dialog details.scout67-note{border-top:1px solid #2a2d31;margin-top:12px;padding-top:8px}
    .scout67-dialog details.scout67-note summary{cursor:pointer;color:#a8ada4}
    .scout67-shake{animation:scout67-shake .18s linear}@keyframes scout67-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}
    @media(prefers-reduced-motion:reduce){.scout67-shake{animation:none}}
    @media(max-width:600px){.scout67-dialog{font-size:13px}.scout67-dialog canvas{max-width:100%}.scout67-dialog button{padding:7px 12px}}`;
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='scout67-dialog';dialog.setAttribute('aria-labelledby','scout67-title');
    dialog.innerHTML='<header><div><h2 id="scout67-title"></h2><p class="scout67-sub">Night Recon · Jinsha River Crossing · 1935</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="scout67-body"><div class="scout67-brief"><p data-intro></p></div>'
      +'<canvas width="1280" height="720" tabindex="0" aria-label="夜探渡口潜行画面。方向键或 WASD 移动侦察兵，避开哨兵视线，收集三份敌情后返回左下角木船撤离。"></canvas>'
      +'<p class="scout67-hud" data-hud><span data-hud-intel></span><span data-hud-alerts></span><span data-hud-time></span><span data-hud-hidden hidden>已隐身</span></p><p class="scout67-status" role="status" aria-live="polite"></p>'
      +'<div class="scout67-actions"><button data-start>▶ 开始潜入</button><button data-pause disabled>‖ 暂停</button><button data-mute>♪ 声音</button><button data-retry>↻ 重新潜入</button><button data-complete hidden>记录成绩 · 完成本章</button></div>'
      +'<p class="scout67-note">哨兵扇形为视野：变黄即起疑、变红即追捕；草丛内不会被发觉。金点为敌情，全图共三处；集齐后沿虚线指引返回左下角江边木船即可撤离。</p>'
      +'<details class="scout67-note"><summary>史实与练习说明</summary><p data-hist></p><p>本小游戏为原创潜行练习：哨兵路线、视野参数、分数与重开次数均为教学设定，不对应真实部署。</p></details></div>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null,keys={up:false,down:false,left:false,right:false,px:null,py:null},ptr=null,pickups=[],gotPrev=0;
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const buildBackdrop=d=>{
      const bg=document.createElement('canvas');bg.width=1280;bg.height=720;const b=bg.getContext('2d');
      let seed=67;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const base=b.createLinearGradient(0,0,0,720);base.addColorStop(0,'#0c130f');base.addColorStop(.82,'#141e16');base.addColorStop(1,'#101a13');
      b.fillStyle=base;b.fillRect(0,0,1280,720);
      for(let i=0;i<30;i++){b.fillStyle=i%2?'rgba(190,220,190,.03)':'rgba(0,0,0,.12)';b.beginPath();b.ellipse(rnd()*1280,rnd()*640,90+rnd()*80,34+rnd()*26,rnd()*3,0,Math.PI*2);b.fill();}
      for(let i=0;i<700;i++){b.fillStyle=rnd()>.5?'rgba(255,255,255,.035)':'rgba(0,0,0,.06)';b.fillRect(rnd()*1280,rnd()*655,2,2);}
      for(const w of d.walls){
        b.fillStyle='rgba(0,0,0,.32)';b.fillRect(w.x+5,w.y+7,w.w,w.h);
        b.fillStyle='#4e4232';b.fillRect(w.x,w.y,w.w,w.h);
        b.fillStyle='#5d5040';b.fillRect(w.x,w.y,w.w,w.h*.34);
        b.strokeStyle='#2c2418';b.lineWidth=2;b.strokeRect(w.x,w.y,w.w,w.h);
        b.strokeStyle='rgba(255,255,255,.07)';b.beginPath();b.moveTo(w.x+3,w.y+3);b.lineTo(w.x+w.w-3,w.y+3);b.stroke();
      }
      for(const bs of d.bushes){
        b.fillStyle='#27422b';for(let k=0;k<8;k++){b.beginPath();b.ellipse(bs.x+Math.cos(k)*bs.r*.45,bs.y+Math.sin(k*2.1)*bs.r*.4,bs.r*.42,bs.r*.3,k,0,Math.PI*2);b.fill();}
        b.fillStyle='#315230';for(let k=0;k<5;k++){b.beginPath();b.ellipse(bs.x+Math.cos(k+1)*bs.r*.3,bs.y+Math.sin(k*1.7)*bs.r*.28,bs.r*.3,bs.r*.22,k,0,Math.PI*2);b.fill();}
        b.strokeStyle='rgba(150,200,140,.14)';b.lineWidth=1;b.beginPath();b.arc(bs.x,bs.y,bs.r*.72,Math.PI*1.1,Math.PI*1.9);b.stroke();
      }
      const water=b.createLinearGradient(0,660,0,720);water.addColorStop(0,'#1c3548');water.addColorStop(1,'#0f1f2c');
      b.fillStyle=water;b.fillRect(0,660,1280,60);
      b.strokeStyle='rgba(140,190,220,.16)';b.lineWidth=1.5;
      for(let i=0;i<16;i++){b.beginPath();b.moveTo(30+i*80,678+(i%2)*14);b.lineTo(66+i*80,676+(i%2)*14);b.stroke();}
      b.fillStyle='rgba(200,225,255,.07)';b.beginPath();b.ellipse(1150,692,130,11,0,0,Math.PI*2);b.fill();
      b.fillStyle='rgba(220,238,255,.1)';b.beginPath();b.ellipse(1150,692,60,6,0,0,Math.PI*2);b.fill();
      b.strokeStyle='rgba(120,180,160,.35)';b.lineWidth=2;b.beginPath();b.moveTo(0,660);b.lineTo(1280,660);b.stroke();
      b.fillStyle='#5d4a30';for(let i=0;i<6;i++){b.fillRect(60+i*19,652,15,44);b.strokeStyle='rgba(0,0,0,.4)';b.strokeRect(60+i*19,652,15,44);}
      b.strokeStyle='rgba(232,200,106,.2)';b.setLineDash([4,6]);b.beginPath();b.arc(d.playerStart.x,d.playerStart.y,20,0,Math.PI*2);b.stroke();b.setLineDash([]);
      b.fillStyle='rgba(220,225,210,.42)';b.font='12px sans-serif';b.fillText('出发点 START',d.playerStart.x-32,d.playerStart.y+40);
      b.strokeStyle='rgba(110,150,110,.32)';b.lineWidth=1.5;
      for(let i=0;i<26;i++){const rx=24+i*49+((i*37)%13),ry=650+((i*29)%7);b.beginPath();b.moveTo(rx,ry);b.lineTo(rx-3,ry-13);b.moveTo(rx+3,ry);b.lineTo(rx+5,ry-11);b.stroke();}
      b.fillStyle='rgba(0,0,0,.35)';b.fillRect(0,0,1280,2);b.fillRect(0,718,1280,2);b.fillRect(0,0,2,720);b.fillRect(1278,0,2,720);
      return bg;
    };
    const bg=buildBackdrop(s.d);
    const sound=kind=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=kind==='caught'?'sawtooth':'sine';const f=kind==='intel'?520:kind==='win'?660:kind==='spotted'?190:kind==='caught'?90:150;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f/(kind==='win'?1:2.4)),now+.25);g.gain.setValueAtTime(.09,now);g.gain.exponentialRampToValueAtTime(.001,now+.3);o.connect(g);g.connect(master);o.start();o.stop(now+.32);}catch{/* Optional audio. */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const clearKeys=()=>{keys.up=keys.down=keys.left=keys.right=false;keys.px=keys.py=null;};
    const onBlur=()=>clearKeys();window.addEventListener('blur',onBlur);
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.removeEventListener('keyup',key);window.removeEventListener('blur',onBlur);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{const left=s.intel.filter(i=>!i.got).length;q('[data-hud-intel]').textContent=`敌情 ${s.intel.length-left}/3`;const al=q('[data-hud-alerts]');al.textContent=`暴露 ${s.alerts}`;al.toggleAttribute('data-warn',s.alerts>0);q('[data-hud-time]').textContent=`用时 ${Math.round(s.time)} 秒`;q('[data-hud-hidden]').hidden=!s.hidden;q('[data-start]').hidden=s.status!=='ready';q('[data-pause]').disabled=s.status!=='playing';q('[data-pause]').textContent=manualPause?'▶ 继续潜入':'‖ 暂停';q('[data-mute]').textContent=this.muted()?'♪ 开启声音':'♪ 全部静音';q('[data-complete]').hidden=s.status!=='won';const text=s.status==='ready'?'看清哨兵巡逻路线与视野扇区，再开始潜入。':s.status==='won'?this.rating(s,retries).rating+' · '+s.reason:s.reason? s.reason:manualPause||this.paused()?'潜入已暂停。':s.hidden?'你在草丛中，哨兵看不见你。':s.guards.some(g=>g.state==='chase')?'被发现了！快拉开距离或钻草丛。':'移动中……留意扇形视野。';if(q('.scout67-status').textContent!==text)q('.scout67-status').textContent=text;};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};q('[data-pause]').onclick=()=>{manualPause=!manualPause;last=0;sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);this.session=s;manualPause=false;recorded=false;last=0;clearKeys();pickups=[];gotPrev=0;sync();draw();q('[data-start]').focus();};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.rating(s,retries),key='scout67_'+node.id;GameState.storyPreparations||={};const old=GameState.storyPreparations[key];if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,alerts:s.alerts,seconds:Math.round(s.time),retries,completedAt:new Date().toISOString()};GameState.recordBattleScore(node.id,result.score,result.rating);GameState.save();close();if(typeof onComplete==='function')onComplete();};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),ox=r.left+(r.width-1280*scale)/2,oy=r.top+(r.height-720*scale)/2;return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale};};
    canvas.onpointerdown=e=>{if(s.status!=='playing'||manualPause||this.paused()||e.button>0)return;const p=point(e);gesture();ptr=e.pointerId;keys.px=p.x;keys.py=p.y;canvas.setPointerCapture(e.pointerId);canvas.focus();e.preventDefault();};
    canvas.onpointermove=e=>{if(ptr!==e.pointerId)return;const p=point(e);keys.px=p.x;keys.py=p.y;};
    canvas.onpointerup=e=>{if(ptr!==e.pointerId)return;ptr=null;keys.px=null;keys.py=null;canvas.releasePointerCapture(e.pointerId);};canvas.onpointercancel=()=>{ptr=null;keys.px=null;keys.py=null;};canvas.onlostpointercapture=()=>{ptr=null;keys.px=null;keys.py=null;};
    const keymap={arrowup:'up',arrowdown:'down',arrowleft:'left',arrowright:'right',w:'up',s:'down',a:'left',d:'right'};
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      const tag=e.target&&e.target.tagName;if(tag==='INPUT'||tag==='TEXTAREA')return;
      if(e.ctrlKey||e.altKey||e.metaKey)return;
      const m=keymap[e.key.toLowerCase()];
      if(!m)return;
      e.preventDefault();e.stopPropagation();
      keys[m]=e.type==='keydown';
    };
    dialog.addEventListener('keydown',key);dialog.addEventListener('keyup',key);
    const wrapText=(text,max)=>{const out=[];let cur='';for(const ch of String(text)){if(cur&&ctx.measureText(cur+ch).width>max){out.push(cur);cur=ch;}else cur+=ch;}if(cur)out.push(cur);return out.length?out:[''];};
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);ctx.drawImage(bg,0,0);
      ctx.strokeStyle='rgba(170,210,235,.13)';ctx.lineWidth=1.5;
      for(let i=0;i<5;i++){const wx=((s.time*14+i*260)%1320)-20,wy=676+(i%2)*16;ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+34,wy-1);ctx.stroke();}
      for(let i=0;i<10;i++){const fx=140+((i*331)%1020)+Math.sin(s.time*.7+i*2.1)*22,fy=120+((i*197)%480)+Math.cos(s.time*.53+i*1.7)*18,fa=.25+.2*Math.sin(s.time*2.2+i);
        ctx.fillStyle='rgba(220,235,150,'+Math.max(0,fa).toFixed(2)+')';ctx.beginPath();ctx.arc(fx,fy,1.6,0,Math.PI*2);ctx.fill();}
      for(const g of s.guards){
        const base=g.state==='chase'?'224,84,58':g.alert>.45?'230,180,70':'205,220,240';
        const cone=ctx.createRadialGradient(g.x,g.y,10,g.x,g.y,s.d.range);
        cone.addColorStop(0,'rgba('+base+',.32)');cone.addColorStop(.7,'rgba('+base+',.16)');cone.addColorStop(1,'rgba('+base+',0)');
        ctx.fillStyle=cone;ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.arc(g.x,g.y,s.d.range,g.dir-s.d.fov*Math.PI/360,g.dir+s.d.fov*Math.PI/360);ctx.closePath();ctx.fill();
        ctx.fillStyle='rgba('+base+',.22)';ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.arc(g.x,g.y,60,g.dir-10*Math.PI/180,g.dir+10*Math.PI/180);ctx.closePath();ctx.fill();
        ctx.strokeStyle='rgba('+base+',.18)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(g.x,g.y,s.d.range,g.dir-s.d.fov*Math.PI/360,g.dir+s.d.fov*Math.PI/360);ctx.stroke();
        if(g.state!=='patrol'){ctx.strokeStyle='rgba('+base+',.8)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(g.x,g.y,17,0,Math.PI*2);ctx.stroke();}
      }
      const ready=s.intel.every(i=>i.got);
      for(const it of s.intel){
        if(it.got)continue;
        const ig=ctx.createRadialGradient(it.x,it.y,3,it.x,it.y,34);ig.addColorStop(0,'rgba(232,200,106,.5)');ig.addColorStop(1,'rgba(232,200,106,0)');ctx.fillStyle=ig;ctx.fillRect(it.x-34,it.y-34,68,68);
        ctx.strokeStyle='rgba(232,200,106,.55)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(it.x,it.y,17+Math.sin(s.time*5)*3,0,Math.PI*2);ctx.stroke();
        ctx.fillStyle='#e8c86a';ctx.beginPath();ctx.arc(it.x,it.y,12,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#241c0c';ctx.font='bold 13px sans-serif';ctx.fillText('密',it.x-6,it.y+5);
        ctx.fillStyle='rgba(232,200,106,.78)';ctx.font='12px sans-serif';ctx.fillText(it.name,it.x-30,it.y+34);
      }
      if(ready){
        ctx.save();ctx.strokeStyle='rgba(232,200,106,.42)';ctx.setLineDash([3,9]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(s.player.x,s.player.y);ctx.lineTo(s.d.extract.x,s.d.extract.y);ctx.stroke();ctx.restore();
        const ang=Math.atan2(s.d.extract.y-s.player.y,s.d.extract.x-s.player.x);
        ctx.save();ctx.translate(s.player.x+Math.cos(ang)*30,s.player.y+Math.sin(ang)*30);ctx.rotate(ang);ctx.fillStyle='rgba(232,200,106,.85)';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(-4,-6);ctx.lineTo(-4,6);ctx.closePath();ctx.fill();ctx.restore();
      }
      if(ready){const eg=ctx.createRadialGradient(s.d.extract.x,s.d.extract.y,6,s.d.extract.x,s.d.extract.y,70);eg.addColorStop(0,'rgba(126,212,145,.25)');eg.addColorStop(1,'rgba(126,212,145,0)');ctx.fillStyle=eg;ctx.fillRect(s.d.extract.x-70,s.d.extract.y-70,140,140);}
      const beam=ready?'#7ed491':'#d8b25a';
      ctx.strokeStyle=beam;ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.arc(s.d.extract.x,s.d.extract.y,30+(ready?Math.sin(s.time*4)*4:0),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle='#8a7a58';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(s.d.extract.x-6,s.d.extract.y-14);ctx.lineTo(s.d.extract.x-6,s.d.extract.y-42);ctx.stroke();
      ctx.fillStyle=ready?'#4caf6d':'#b8503f';ctx.beginPath();ctx.moveTo(s.d.extract.x-6,s.d.extract.y-42);ctx.lineTo(s.d.extract.x+16,s.d.extract.y-35);ctx.lineTo(s.d.extract.x-6,s.d.extract.y-28);ctx.fill();
      ctx.fillStyle='#6b4f30';ctx.beginPath();ctx.moveTo(s.d.extract.x-26,s.d.extract.y+2);ctx.lineTo(s.d.extract.x+26,s.d.extract.y+2);ctx.lineTo(s.d.extract.x+17,s.d.extract.y+15);ctx.lineTo(s.d.extract.x-17,s.d.extract.y+15);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#3a2b18';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle=ready?'#c8e6b8':'#cfe0c8';ctx.font='12px sans-serif';ctx.fillText(ready?'可撤离 ✓':'撤离点 EXTRACT',s.d.extract.x-40,s.d.extract.y+32);
      for(const g of s.guards){
        ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(g.x,g.y+10,12,5,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#1a140c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(g.x,g.y);ctx.lineTo(g.x+Math.cos(g.dir)*20,g.y+Math.sin(g.dir)*20);ctx.stroke();
        ctx.fillStyle=g.state==='chase'?'#c84a3a':g.alert>.45?'#dcb04a':'#d8c9a2';ctx.beginPath();ctx.arc(g.x,g.y,13,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.arc(g.x-Math.cos(g.dir)*4,g.y-Math.sin(g.dir)*4,6,0,Math.PI*2);ctx.fill();
        if(g.state==='chase'||g.state==='suspicious'){
          ctx.fillStyle=g.state==='chase'?'#ff8d75':'#ffd98a';ctx.font='bold 15px sans-serif';
          ctx.fillText(g.state==='chase'?'!':'?',g.x-5,g.y-30);
        }
        if(g.alert>0&&g.state!=='chase'){ctx.strokeStyle='rgba(230,180,70,.9)';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(g.x,g.y,22,-Math.PI/2,-Math.PI/2+g.alert*Math.PI*2);ctx.stroke();}
      }
      const halo=ctx.createRadialGradient(s.player.x,s.player.y,4,s.player.x,s.player.y,28);
      halo.addColorStop(0,'rgba(255,240,200,.16)');halo.addColorStop(1,'rgba(255,240,200,0)');ctx.fillStyle=halo;ctx.fillRect(s.player.x-28,s.player.y-28,56,56);
      if(s.hidden){ctx.strokeStyle='rgba(143,208,138,.6)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.player.x,s.player.y,16+Math.sin(s.time*6)*2,0,Math.PI*2);ctx.stroke();}
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(s.player.x,s.player.y+9,11,4.5,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=s.hidden?'#8fd08a':'#e05540';ctx.beginPath();ctx.arc(s.player.x,s.player.y,12,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.55)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='#fff';ctx.font='bold 13px sans-serif';ctx.fillText('侦',s.player.x-6,s.player.y+5);
      if(s.hidden){ctx.fillStyle='rgba(18,52,28,.85)';ctx.fillRect(s.player.x-26,s.player.y-44,52,18);ctx.strokeStyle='#8fd08a';ctx.lineWidth=1;ctx.strokeRect(s.player.x-26,s.player.y-44,52,18);ctx.fillStyle='#c9f0c4';ctx.font='12px sans-serif';ctx.fillText('已隐身',s.player.x-19,s.player.y-31);}
      if(s.guards.some(g=>g.state==='chase')&&s.status==='playing'){
        const a=.62+Math.sin(s.time*6)*.22;
        ctx.fillStyle='rgba(150,38,26,'+a.toFixed(2)+')';ctx.fillRect(460,16,360,32);
        ctx.fillStyle='#ffe8dd';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.fillText('被发现了！拉开距离或钻草丛',640,37);ctx.textAlign='left';
      }
      const vig=ctx.createRadialGradient(640,360,300,640,360,790);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.35)');ctx.fillStyle=vig;ctx.fillRect(0,0,1280,720);
      let danger=0;for(const g of s.guards)if(g.alert>danger)danger=g.alert;
      if(danger>.15&&s.status==='playing'){const dv=ctx.createRadialGradient(640,360,320,640,360,780);dv.addColorStop(0,'rgba(180,40,25,0)');dv.addColorStop(1,'rgba(180,40,25,'+(danger*.3).toFixed(3)+')');ctx.fillStyle=dv;ctx.fillRect(0,0,1280,720);}
      ctx.fillStyle='rgba(220,225,210,.5)';ctx.font='12px sans-serif';ctx.fillText('教学模拟 · 草丛隐身 · 扇形为哨兵视野 · 集齐金点后返回左下角木船',26,30);
      if(s.status==='ready'){
        ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(0,0,1280,720);
        ctx.strokeStyle='rgba(205,220,240,.28)';ctx.lineWidth=1.5;ctx.setLineDash([2,9]);
        for(const g of s.guards){ctx.beginPath();ctx.moveTo(g.path[0].x,g.path[0].y);for(const p of g.path)ctx.lineTo(p.x,p.y);if(g.path.length>2)ctx.closePath();ctx.stroke();}
        ctx.setLineDash([]);
        ctx.fillStyle='rgba(8,10,12,.76)';ctx.fillRect(370,238,540,190);ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.strokeRect(370,238,540,190);ctx.fillStyle='#ffcf24';ctx.fillRect(370,238,3,190);
        ctx.fillStyle='#f2f0e9';ctx.font='bold 17px sans-serif';ctx.fillText('潜行指引 NIGHT RECON',392,274);
        ctx.fillStyle='#b8bcb4';ctx.font='13px sans-serif';
        ctx.fillText('方向键 / WASD 移动，或按住画面拖动',392,306);
        ctx.fillText('扇形是哨兵视野：变黄起疑、变红追捕',392,330);
        ctx.fillText('草丛内不会被发觉；营房隔断视线',392,354);
        ctx.fillText('金点 = 敌情（共 3 处），集齐后返回左下角木船',392,378);
        ctx.fillStyle='#ffcf24';ctx.font='bold 13px sans-serif';ctx.fillText('白色虚线 = 哨兵巡逻路线 · 点「开始潜入」出发',392,408);
      }
      if(s.status==='playing'&&manualPause){
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(8,10,12,.8)';ctx.fillRect(470,310,340,90);ctx.strokeStyle='#4a4d52';ctx.strokeRect(470,310,340,90);
        ctx.textAlign='center';
        ctx.fillStyle='#f2f0e9';ctx.font='bold 20px sans-serif';ctx.fillText('已暂停 PAUSED',640,348);
        ctx.fillStyle='#b8bcb4';ctx.font='13px sans-serif';ctx.fillText('点「继续潜入」恢复行动',640,378);
        ctx.textAlign='left';
      }
      if(s.status==='won'||s.status==='caught'){
        ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,1280,720);
        const ok=s.status==='won';
        ctx.textAlign='center';
        ctx.fillStyle=ok?'#7ed491':'#ff8d75';ctx.font='bold 40px sans-serif';ctx.fillText(ok?'任务完成':'行动暴露',640,314);
        ctx.fillStyle='#8b8e93';ctx.font='13px sans-serif';ctx.fillText(ok?'MISSION ACCOMPLISHED':'MISSION FAILED',640,338);
        ctx.fillStyle='#ffcf24';ctx.fillRect(560,354,160,2);
        ctx.fillStyle='#e8e6df';ctx.font='14px sans-serif';
        const lines=wrapText(s.reason,560);
        lines.forEach((ln,i)=>ctx.fillText(ln,640,392+i*24));
        if(ok){const r=this.rating(s,retries);ctx.fillStyle='#ffcf24';ctx.font='bold 15px sans-serif';ctx.fillText(r.rating+' · '+r.score+' 分',640,392+lines.length*24+12);}
        ctx.textAlign='left';
      }
      for(const p of pickups){
        if(p.spark){ctx.fillStyle='rgba(232,200,106,'+Math.max(0,p.life).toFixed(2)+')';ctx.fillRect(p.x+p.vx*(p.max-p.life),p.y+p.vy*(p.max-p.life),3,3);}
        else{ctx.fillStyle='rgba(232,200,106,'+Math.min(1,p.life).toFixed(2)+')';ctx.font='bold 13px sans-serif';ctx.fillText(p.text,p.x-30,p.y-34-(p.max-p.life)*24);}
      }
      const got=s.intel.filter(i=>i.got);
      const ph=30+got.length*20+8,pw=254,px2=1012,py2=14;
      ctx.fillStyle='rgba(8,10,12,.62)';ctx.fillRect(px2,py2,pw,ph);
      ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.strokeRect(px2,py2,pw,ph);
      ctx.fillStyle='#ffcf24';ctx.fillRect(px2,py2,3,ph);
      ctx.fillStyle='#e8e6df';ctx.font='12px sans-serif';ctx.fillText('敌情 INTEL',px2+12,py2+19);
      ctx.textAlign='right';ctx.fillStyle='#ffcf24';ctx.font='bold 13px sans-serif';ctx.fillText(got.length+'/3',px2+pw-10,py2+19);ctx.textAlign='left';
      got.forEach((it,i)=>{ctx.fillStyle='#9fd08a';ctx.font='12px sans-serif';ctx.fillText('✓ '+it.name,px2+12,py2+37+i*20);});
    };
    let hudAt=0;const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.step(s,Math.max(0,Math.min(.1,(now-last)/1000)),keys);last=now;
      for(const event of s.events.splice(0)){sound(event);if(event==='caught'||event==='spotted'){canvas.classList.remove('scout67-shake');void canvas.offsetWidth;canvas.classList.add('scout67-shake');}}
      const gotNow=s.intel.filter(i=>i.got).length;
      if(gotNow>gotPrev){const it=s.intel.find(i=>i.got&&!i.claimed);if(it){it.claimed=true;pickups.push({x:it.x,y:it.y,text:'✓ '+it.name,life:1.6,max:1.6});for(let k=0;k<10;k++)pickups.push({x:it.x,y:it.y,spark:true,vx:(Math.random()-.5)*150,vy:-Math.random()*110-30,life:.7,max:.7});}gotPrev=gotNow;}
      else if(gotNow<gotPrev)gotPrev=gotNow;
      for(const p of pickups)p.life-=1/60;pickups=pickups.filter(p=>p.life>0);
      draw();if(now-hudAt>100||s.status!=='playing'){sync();hudAt=now;}raf=requestAnimationFrame(frame);
    };sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
