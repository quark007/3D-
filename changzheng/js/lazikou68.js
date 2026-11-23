/* Original teaching exercise: Lazikou Pass fire support (parabolic throw).
   Abstract cloth-bundle tokens only: no gore, no real weapon parameters. */
window.Lazikou68={
  supports(id){return [10].includes(Number(id));},
  definitions:{
    10:{title:'腊子口 · 火力准备',
      gravity:980,windScale:60,preview:.5,ammo:5,hp:3,
      angleRange:[10,80],powerRange:[380,1150],powerK:6,grabRadius:140,dragMin:44,
      thrower:{x:120,y:560},bunker:{x:1008,y:352,w:104,h:86},groundY:690,
      intro:'火力准备推演：用 5 发集束手榴弹压制腊子口桥头碉堡。从投掷点向外拖拽出角度与力度，或用键盘：←→ 调角度、↑↓ 调力度、空格投掷（Shift 加大步进）。每发投掷前风力变化（-3～+3 档），虚线为前 0.5 秒弹道预览、已计入风力。碉堡 3 次直接命中摧毁，且需至少保留 1 发弹药掩护突击。',
      success:'天险的突破口打开了，侧翼攀崖队已经到位',
      fail:'正面火力不足，等待侧翼消息，重新组织进攻',
      hist:'1935 年 9 月 17 日，红军发起腊子口战斗：正面强攻的同时，突击队以手榴弹压制桥头碉堡，苗族小战士「云贵川」攀上绝壁迂回崖顶，最终突破天险、打开北上陕北的通道。本页投掷物与爆炸均为抽象教学符号，风力档位、弹药数量、碉堡耐久与分数均为教学设定，不含真实武器参数。'}
  },
  create(id,random=Math.random){const d=this.definitions[Number(id)]||this.definitions[10];
    return {id:Number(id),d,angle:45,power:900,ammo:d.ammo,shots:0,hits:0,bunkerAlive:true,
      wind:random()*6-3,time:0,accumulator:0,projectile:null,trail:[],particles:[],waves:[],landing:null,
      status:'ready',reason:'',events:[]};},
  fire(s){if(s.status!=='playing'||s.projectile||s.ammo<=0)return false;
    const a=s.angle*Math.PI/180,t=s.d.thrower;
    s.projectile={x:t.x,y:t.y,vx:Math.cos(a)*s.power,vy:-Math.sin(a)*s.power};
    s.trail=[];s.landing=null;s.ammo--;s.shots++;s.events.push('throw');return true;},
  burst(s,x,y){s.waves.push({x,y,life:.5});
    for(let i=0;i<14;i++){const a=i*Math.PI*2/14,sp=50+i*5;
      s.particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-30,g:340,life:.55,spark:true});}},
  hitBunker(s,x,y){
    s.hits++;this.burst(s,x,y);
    for(let i=0;i<9;i++)s.particles.push({x,y,vx:(Math.random()-.5)*170,vy:-Math.random()*130-30,g:520,life:.9,block:true});
    s.events.push('hit');
    if(s.hits>=s.d.hp){const B=s.d.bunker;s.bunkerAlive=false;
      this.burst(s,B.x+B.w/2,B.y+B.h/2);s.events.push('destroy');
      if(s.ammo>=1)this.finish(s,true,s.d.success);
      else this.finish(s,false,'碉堡已摧毁，但已无弹药掩护突击——'+s.d.fail);}
  },
  afterResolve(s){s.wind=Math.random()*6-3;
    if(s.status==='playing'&&s.bunkerAlive&&s.ammo<=0)this.finish(s,false,s.d.fail);},
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.projectile=null;s.events.push(won?'win':'lose');},
  step(s,dt=1/120){
    if(s.status!=='playing')return;s.time+=dt;
    const p=s.projectile,g=s.d.gravity,wa=s.wind*s.d.windScale,B=s.d.bunker;
    if(p){
      const ox=p.x,oy=p.y;
      p.x+=p.vx*dt+wa*dt*dt/2;p.y+=p.vy*dt+g*dt*dt/2;p.vx+=wa*dt;p.vy+=g*dt;
      s.trail.push({x:p.x,y:p.y});if(s.trail.length>280)s.trail.shift();
      if(s.bunkerAlive&&p.x>=B.x&&p.x<=B.x+B.w&&p.y>=B.y&&p.y<=B.y+B.h){
        s.projectile=null;this.hitBunker(s,p.x,p.y);this.afterResolve(s);
      }else if(p.y>=s.d.groundY||p.x>1320||p.x<-20){
        let lx=p.x,ly=p.y;
        if(p.y>=s.d.groundY){const u=p.y===oy?1:(s.d.groundY-oy)/(p.y-oy);lx=ox+(p.x-ox)*u;ly=s.d.groundY;}
        s.landing={x:Math.max(-20,Math.min(1320,lx)),y:Math.min(ly,s.d.groundY)};
        s.projectile=null;this.burst(s,s.landing.x,s.landing.y);s.events.push('thud');this.afterResolve(s);
      }
    }
    for(const q of s.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=q.g*dt;q.life-=dt;}
    s.particles=s.particles.filter(q=>q.life>0);
    for(const w of s.waves)w.life-=dt;s.waves=s.waves.filter(w=>w.life>0);
  },
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.1,seconds));
    while(s.accumulator+1e-9>=1/120){this.step(s);s.accumulator-=1/120;}},
  rating(s,retries){const required=s.d?.hp||3;return retries===0&&s.shots<=required?{score:95,rating:'神投手'}:retries<=1&&s.shots<=required+1?{score:85,rating:'精准压制'}:{score:70,rating:'险胜突破'};},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('lazikou68-style'))return;const el=document.createElement('style');el.id='lazikou68-style';el.textContent=`
    .lazikou68-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:96dvh;margin:auto;padding:0;background:#101114;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .lazikou68-dialog::backdrop{background:#05070ae6}
    .lazikou68-dialog header{display:flex;gap:12px;align-items:flex-start;justify-content:space-between;padding:14px 18px 13px;border-bottom:1px solid #2a2d31;background:#131518}
    .lazikou68-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;letter-spacing:.02em;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:12px}
    .lazikou68-sub{margin:3px 0 0;padding-left:13px;font-size:12px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .lazikou68-body{padding:13px 18px 16px}
    .lazikou68-dialog p{margin:6px 0}
    .lazikou68-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer;letter-spacing:.04em;transition:background .12s ease,border-color .12s ease}
    .lazikou68-dialog button:hover:not(:disabled){background:#22262b;border-color:#6a6e74}
    .lazikou68-dialog button:disabled{opacity:.4;cursor:default}
    .lazikou68-dialog button[data-start]{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .lazikou68-dialog button[data-start]:hover:not(:disabled){background:#ffd95c;border-color:#ffd95c}
    .lazikou68-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .lazikou68-stage{position:relative;width:min(82.2dvh,100%);aspect-ratio:16/9;margin:0 auto}
    .lazikou68-stage canvas{display:block;width:100%;height:100%;background:#101114;border:1px solid #3a3d42;touch-action:none}
    .lazikou68-hud{display:flex;gap:8px;flex-wrap:wrap;align-items:center;border-bottom:1px dashed #2a2d31;padding-bottom:8px}
    .lazikou68-hud span{background:#14161a;border:1px solid #2a2d31;border-radius:2px;padding:3px 12px;font-variant-numeric:tabular-nums;letter-spacing:.03em;color:#d5d8d2;font-size:13px}
    .lazikou68-hud span[data-warn]{color:#ff8d75;border-color:#6a3a30}
    .lazikou68-brief{border:1px solid #2a2d31;border-left:3px solid #ffcf24;background:#14161a;padding:12px 13px;margin:0 0 12px}
    .lazikou68-brief::before{content:'任务简报 · BRIEFING';display:block;font-size:12px;letter-spacing:.2em;color:#8b8e93;margin-bottom:4px}
    .lazikou68-brief p{margin:0;font-size:14px;color:#d5d8d2}
    .lazikou68-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:11px}
    .lazikou68-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .lazikou68-dialog [hidden]{display:none!important}
    .challenge-item.lob68-entry{cursor:pointer;border:1px solid #3f4247;border-radius:3px;padding:13px;background:#14161a;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}
    .challenge-item.lob68-entry:hover,.challenge-item.lob68-entry:focus-visible{transform:translateY(-2px);border-color:#ffcf24;box-shadow:0 6px 18px rgba(0,0,0,.45)}
    .lazikou68-note{font-size:13px;color:#8f948d}
    .lazikou68-dialog details.lazikou68-note{border-top:1px solid #2a2d31;margin-top:12px;padding-top:8px}
    .lazikou68-dialog details.lazikou68-note summary{cursor:pointer;color:#a8ada4}
    .lazikou68-shake{animation:lazikou68-shake .18s linear}@keyframes lazikou68-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}
    @media(prefers-reduced-motion:reduce){.lazikou68-shake{animation:none}}
    @media(max-width:600px){.lazikou68-dialog{font-size:13px}.lazikou68-stage{width:100%}.lazikou68-dialog button{padding:7px 12px}}`;
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='lazikou68-dialog';dialog.setAttribute('aria-labelledby','lazikou68-title');
    dialog.innerHTML='<header><div><h2 id="lazikou68-title"></h2><p class="lazikou68-sub">Fire Support · Lazikou Pass · 1935</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="lazikou68-body"><div class="lazikou68-brief"><p data-intro></p></div>'
      +'<div class="lazikou68-stage"><canvas width="1280" height="720" tabindex="0" aria-label="腊子口火力准备画面。左右方向键调整角度，上下调整力度，空格投掷；也可从投掷点向外拖拽瞄准后松手。直接命中桥头碉堡三次即摧毁，摧毁时需至少保留一发弹药掩护突击。"></canvas></div>'
      +'<p class="lazikou68-hud" data-hud><span data-hud-ammo></span><span data-hud-angle></span><span data-hud-power></span><span data-hud-wind></span><span data-hud-hits></span></p><p class="lazikou68-status" role="status" aria-live="polite"></p>'
      +'<div class="lazikou68-actions"><button data-start>▶ 开始火力准备</button><button data-pause disabled>‖ 暂停</button><button data-mute>♪ 声音</button><button data-retry>↻ 重新准备</button><button data-complete hidden>记录成绩 · 完成本章</button></div>'
      +'<p class="lazikou68-note">虚线只显示前 0.5 秒弹道（已计入当前风力）；风向箭头与档位在 HUD，每发投掷前刷新。触屏从投掷点拖拽至少 44 像素后松手即投掷。碉堡 3 次直接命中摧毁；摧毁时若已无剩余弹药，同样无法完成突击。</p>'
      +'<details class="lazikou68-note"><summary>史实与练习说明</summary><p data-hist></p><p>本小游戏为原创教学推演：峡谷剪影、投掷弹道、风力与评分均为练习规则，不构成对历史指挥的评价。</p></details></div>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,drag=null,recorded=false,ac=null,master=null,audioMuted=null,animT=0;
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const noise=(dur,vol)=>{if(!ac)return;try{const b=ac.createBuffer(1,Math.max(1,ac.sampleRate*dur|0),ac.sampleRate),data=b.getChannelData(0);
      for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);
      const n=ac.createBufferSource(),ng=ac.createGain();n.buffer=b;ng.gain.value=vol;n.connect(ng);ng.connect(master);n.start();}catch{/* Optional audio. */}};
    const sound=kind=>{
      if(!ac||ac.state!=='running'||this.muted())return;
      try{
        const now=ac.currentTime;
        const tone=(type,f0,f1,t0,dur,vol)=>{const o=ac.createOscillator(),g=ac.createGain();o.type=type;
          o.frequency.setValueAtTime(f0,now+t0);o.frequency.exponentialRampToValueAtTime(Math.max(30,f1),now+t0+dur);
          g.gain.setValueAtTime(vol,now+t0);g.gain.exponentialRampToValueAtTime(.001,now+t0+dur+.05);
          o.connect(g);g.connect(master);o.start(now+t0);o.stop(now+t0+dur+.08);};
        if(kind==='throw'){tone('triangle',880,240,0,.55,.02);tone('sine',1400,700,0,.4,.012);}
        else if(kind==='hit'){tone('sine',110,45,0,.2,.11);noise(.16,.09);}
        else if(kind==='thud'){tone('sine',90,40,0,.2,.08);noise(.14,.06);}
        else if(kind==='destroy'){tone('sine',70,32,0,.34,.13);tone('square',160,60,0,.25,.03);noise(.3,.12);}
        else if(kind==='win'){tone('triangle',523,523,0,.16,.07);tone('triangle',784,784,.17,.24,.08);}
        else if(kind==='lose'){tone('sine',220,70,0,.5,.07);}
      }catch{/* Sound must never block the exercise. */}
    };
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{
      q('[data-hud-ammo]').textContent='弹药 '+'▰'.repeat(s.ammo)+'▱'.repeat(Math.max(0,s.d.ammo-s.ammo));
      q('[data-hud-angle]').textContent=`角度 ${s.angle}°`;
      q('[data-hud-power]').textContent=`力度 ${Math.round((s.power-s.d.powerRange[0])/(s.d.powerRange[1]-s.d.powerRange[0])*100)}%`;
      const wspan=q('[data-hud-wind]');
      wspan.textContent=`风力 ${s.wind>0.05?'→':s.wind<-0.05?'←':'·'} ${Math.abs(s.wind).toFixed(1)} 档`;
      wspan.toggleAttribute('data-warn',Math.abs(s.wind)>=2);
      q('[data-hud-hits]').textContent=`命中 ${s.hits}/${s.d.hp}`;
      q('[data-start]').hidden=s.status!=='ready';q('[data-pause]').disabled=s.status!=='playing';
      q('[data-pause]').textContent=manualPause?'▶ 继续':'‖ 暂停';
      q('[data-mute]').textContent=this.muted()?'♪ 开启声音':'♪ 全部静音';
      q('[data-mute]').setAttribute('aria-pressed',String(this.muted()));
      q('[data-complete]').hidden=s.status!=='won';
      const text=s.status==='ready'?'选好角度与力度再投掷；看清风向箭头与虚线预览。':s.status==='won'?this.rating(s,retries).rating+' · '+s.reason:s.status==='lost'?s.reason:manualPause||this.paused()?'火力准备已暂停。':s.projectile?'手榴弹飞行中……':s.ammo===0?'最后一发已出手。':'调整角度与力度，投掷压制碉堡。';
      if(q('.lazikou68-status').textContent!==text)q('.lazikou68-status').textContent=text;
    };
    const doFire=()=>{gesture();if(manualPause||this.paused()||s.status!=='playing')return;this.fire(s);sync();};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};
    q('[data-pause]').onclick=()=>{gesture();manualPause=!manualPause;last=0;sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);this.session=s;manualPause=false;drag=null;recorded=false;last=0;sync();draw();q('[data-start]').focus();};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.rating(s,retries),key='lazikou68_'+node.id;GameState.storyPreparations||={};const old=GameState.storyPreparations[key];if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,shots:s.shots,hits:s.hits,retries,completedAt:new Date().toISOString()};GameState.recordBattleScore(node.id,result.score,result.rating);if(GameState.save()===false){recorded=false;if(typeof GameUI!=='undefined')GameUI.showToast('成绩尚未保存，请重试记录。');return;}close();if(typeof onComplete==='function')onComplete();};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),ox=r.left+(r.width-1280*scale)/2,oy=r.top+(r.height-720*scale)/2;return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale};};
    canvas.onpointerdown=e=>{if(s.status!=='playing'||s.projectile||manualPause||this.paused()||e.button>0)return;
      const p=point(e);if(Math.hypot(p.x-s.d.thrower.x,p.y-s.d.thrower.y)>s.d.grabRadius)return;
      gesture();drag={id:e.pointerId,sx:p.x,sy:p.y,moved:0};canvas.setPointerCapture(e.pointerId);canvas.focus();e.preventDefault();};
    canvas.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;const p=point(e),T=s.d.thrower;
      drag.moved=Math.max(drag.moved,Math.hypot(p.x-drag.sx,p.y-drag.sy));
      const dx=Math.max(1,p.x-T.x),dy=Math.max(0,T.y-p.y);
      s.angle=Math.round(Math.max(s.d.angleRange[0],Math.min(s.d.angleRange[1],Math.atan2(dy,dx)*180/Math.PI)));
      s.power=Math.round(Math.max(s.d.powerRange[0],Math.min(s.d.powerRange[1],Math.hypot(dx,dy)*s.d.powerK))/5)*5;sync();};
    canvas.onpointerup=e=>{if(!drag||drag.id!==e.pointerId)return;const far=drag.moved>=s.d.dragMin;drag=null;canvas.releasePointerCapture(e.pointerId);if(far)doFire();sync();};
    canvas.onpointercancel=()=>{drag=null;};canvas.onlostpointercapture=()=>{drag=null;};
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      if(e.target!==canvas)return;
      const n=e.shiftKey?5:1;
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter'].includes(e.key)){
        e.preventDefault();e.stopPropagation();
        if(e.repeat&&(e.key===' '||e.key==='Enter'))return;
        if(e.key==='ArrowLeft')s.angle=Math.min(s.d.angleRange[1],s.angle+n);
        if(e.key==='ArrowRight')s.angle=Math.max(s.d.angleRange[0],s.angle-n);
        if(e.key==='ArrowUp')s.power=Math.min(s.d.powerRange[1],s.power+n*10);
        if(e.key==='ArrowDown')s.power=Math.max(s.d.powerRange[0],s.power-n*10);
        if(e.key===' '||e.key==='Enter')doFire();
        sync();}};
    dialog.addEventListener('keydown',key);
    const wrapText=(text,max)=>{const out=[];let cur='';for(const ch of String(text)){if(cur&&ctx.measureText(cur+ch).width>max){out.push(cur);cur=ch;}else cur+=ch;}if(cur)out.push(cur);return out.length?out:[''];};
    const buildBackdrop=d=>{
      const bg=document.createElement('canvas');bg.width=1280;bg.height=720;const b=bg.getContext('2d');
      let seed=68;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      const sky=b.createLinearGradient(0,0,0,720);sky.addColorStop(0,'#201233');sky.addColorStop(.42,'#4c2140');sky.addColorStop(.68,'#8c3b34');sky.addColorStop(.84,'#c96a35');sky.addColorStop(1,'#e89a55');
      b.fillStyle=sky;b.fillRect(0,0,1280,720);
      const sun=b.createRadialGradient(640,296,20,640,296,330);sun.addColorStop(0,'rgba(255,205,130,.5)');sun.addColorStop(1,'rgba(255,205,130,0)');b.fillStyle=sun;b.fillRect(310,-34,660,660);
      b.fillStyle='rgba(255,224,160,.7)';b.beginPath();b.arc(640,296,32,0,Math.PI*2);b.fill();
      for(let i=0;i<14;i++){b.fillStyle='rgba(58,26,50,'+(0.1+rnd()*.16).toFixed(2)+')';b.beginPath();b.ellipse(rnd()*1280,60+rnd()*280,110+rnd()*160,12+rnd()*18,rnd()*.5,0,Math.PI*2);b.fill();}
      b.fillStyle='rgba(74,36,64,.7)';
      b.beginPath();b.moveTo(0,214);b.lineTo(120,246);b.lineTo(238,188);b.lineTo(340,258);b.lineTo(430,312);b.lineTo(436,720);b.lineTo(0,720);b.closePath();b.fill();
      b.beginPath();b.moveTo(1280,168);b.lineTo(1150,218);b.lineTo(1064,166);b.lineTo(966,252);b.lineTo(884,320);b.lineTo(878,720);b.lineTo(1280,720);b.closePath();b.fill();
      b.fillStyle='rgba(255,180,110,.1)';b.fillRect(0,300,1280,60);
      b.fillStyle='#241426';
      b.beginPath();b.moveTo(0,392);b.lineTo(64,470);b.lineTo(120,548);b.lineTo(208,556);b.lineTo(268,606);b.lineTo(330,648);b.lineTo(342,720);b.lineTo(0,720);b.closePath();b.fill();
      b.beginPath();b.moveTo(1280,300);b.lineTo(1180,382);b.lineTo(1122,428);b.lineTo(1008,452);b.lineTo(962,510);b.lineTo(952,720);b.lineTo(1280,720);b.closePath();b.fill();
      b.strokeStyle='rgba(0,0,0,.3)';b.lineWidth=2;
      for(let i=0;i<22;i++){const cx2=rnd()<.5?rnd()*330:950+rnd()*330,cy2=380+rnd()*320;b.beginPath();b.moveTo(cx2,cy2);b.lineTo(cx2+8+rnd()*14,cy2-5-rnd()*9);b.stroke();}
      const water=b.createLinearGradient(0,646,0,720);water.addColorStop(0,'#3a2030');water.addColorStop(1,'#170d18');b.fillStyle=water;b.fillRect(0,646,1280,74);
      b.strokeStyle='rgba(255,190,120,.16)';b.lineWidth=1.5;
      for(let i=0;i<14;i++){b.beginPath();b.moveTo(80+i*86,664+(i%3)*14);b.lineTo(122+i*86,662+(i%3)*14);b.stroke();}
      b.strokeStyle='#2c2026';b.lineWidth=2.5;
      for(let j=0;j<3;j++){b.beginPath();b.moveTo(332,598+j*10);b.quadraticCurveTo(660,676+j*10,1006,462+j*10);b.stroke();}
      for(let i=1;i<24;i++){const u=i/24,px3=(1-u)*(1-u)*332+2*(1-u)*u*660+u*u*1006,py3=(1-u)*(1-u)*598+2*(1-u)*u*676+u*u*462;
        b.strokeStyle='rgba(60,44,50,.8)';b.lineWidth=1.5;b.beginPath();b.moveTo(px3,py3-20);b.lineTo(px3,py3);b.stroke();}
      const T=d.thrower;
      b.strokeStyle='rgba(255,207,36,.4)';b.lineWidth=1.5;b.setLineDash([4,6]);b.beginPath();b.arc(T.x,T.y,22,0,Math.PI*2);b.stroke();b.setLineDash([]);
      b.fillStyle='rgba(220,225,210,.42)';b.font='12px sans-serif';b.fillText('投掷点 THROW',T.x-34,T.y+42);
      b.fillStyle='rgba(0,0,0,.35)';b.fillRect(0,0,1280,2);b.fillRect(0,718,1280,2);b.fillRect(0,0,2,720);b.fillRect(1278,0,2,720);
      return bg;
    };
    const bg=buildBackdrop(s.d);
    const drawBunker=()=>{
      const B=s.d.bunker,hp=s.d.hp;
      ctx.fillStyle='rgba(0,0,0,.4)';ctx.fillRect(B.x+5,B.y+8,B.w,B.h);
      ctx.fillStyle=s.bunkerAlive?'#4a3b30':'#39302a';ctx.fillRect(B.x,B.y,B.w,B.h);
      ctx.fillStyle=s.bunkerAlive?'#5a4a3b':'#453a30';ctx.fillRect(B.x,B.y,B.w,14);
      ctx.strokeStyle='#2a211a';ctx.lineWidth=2;ctx.strokeRect(B.x,B.y,B.w,B.h);
      ctx.strokeStyle='rgba(0,0,0,.28)';ctx.lineWidth=1;
      for(let r=1;r<4;r++){const y=B.y+r*B.h/4;ctx.beginPath();ctx.moveTo(B.x+1,y);ctx.lineTo(B.x+B.w-1,y);ctx.stroke();
        for(let c=0;c<3;c++){const x=B.x+((c+(r%2?.5:0))*.75+.125)*B.w;ctx.beginPath();ctx.moveTo(x,y-B.h/4+2);ctx.lineTo(x,y-2);ctx.stroke();}}
      ctx.fillStyle='#171310';ctx.fillRect(B.x+B.w*.2,B.y+B.h*.34,B.w*.6,10);
      ctx.fillRect(B.x+B.w*.42,B.y+B.h*.66,B.w*.16,B.h*.34);
      if(s.bunkerAlive){
        const crack=(pts)=>{ctx.strokeStyle='rgba(18,12,9,.85)';ctx.lineWidth=2;ctx.beginPath();
          pts.forEach((p,i)=>{const x=B.x+p[0]*B.w,y=B.y+p[1]*B.h;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();};
        if(s.hits>=1)crack([[.3,.08],[.38,.32],[.3,.52],[.38,.78]]);
        if(s.hits>=2)crack([[.72,.12],[.62,.4],[.72,.64],[.6,.9]]);
        if(s.hits>=1){ctx.strokeStyle='rgba(18,12,9,.7)';ctx.lineWidth=1.5;ctx.beginPath();
          ctx.moveTo(B.x+.38*B.w,B.y+.32*B.h);ctx.lineTo(B.x+.5*B.w,B.y+.42*B.h);
          ctx.moveTo(B.x+.62*B.w,B.y+.4*B.h);ctx.lineTo(B.x+.55*B.w,B.y+.55*B.h);ctx.stroke();}
      }else{
        ctx.fillStyle='#241c16';ctx.beginPath();ctx.moveTo(B.x,B.y+16);
        ctx.lineTo(B.x+18,B.y+4);ctx.lineTo(B.x+40,B.y+14);ctx.lineTo(B.x+62,B.y+2);ctx.lineTo(B.x+84,B.y+12);ctx.lineTo(B.x+B.w,B.y+6);
        ctx.lineTo(B.x+B.w,B.y+B.h);ctx.lineTo(B.x,B.y+B.h);ctx.closePath();ctx.fill();
        ctx.fillStyle='#5a4c40';for(let i=0;i<7;i++)ctx.fillRect(B.x+6+i*14,B.y+B.h-4-(i%3)*5,9,6);
      }
      const fx=B.x+B.w/2,fy=B.y;
      ctx.strokeStyle='#3a2f24';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(fx,fy);ctx.lineTo(fx,fy-52);ctx.stroke();
      const wv=Math.sin(animT*4)*4;
      ctx.fillStyle=s.bunkerAlive?'#e5484d':'#7a3336';
      ctx.beginPath();ctx.moveTo(fx,fy-52);
      if(s.bunkerAlive){ctx.lineTo(fx+34,fy-46+wv);ctx.lineTo(fx,fy-38);}else{ctx.lineTo(fx+16,fy-40);ctx.lineTo(fx+4,fy-30);}
      ctx.closePath();ctx.fill();
      ctx.fillStyle='rgba(232,230,223,.72)';ctx.font='12px sans-serif';ctx.fillText('桥头碉堡 BUNKER · 目标',B.x-16,B.y-66);
      for(let i=0;i<hp;i++){const px3=B.x+8+i*17;
        if(s.bunkerAlive&&i<hp-s.hits){ctx.fillStyle='#ffcf24';ctx.fillRect(px3,B.y+B.h+9,12,6);}
        else{ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=1;ctx.strokeRect(px3+.5,B.y+B.h+9.5,11,5);}}
    };
    const draw=()=>{
      if(!ctx)return;
      const d=s.d,B=d.bunker,T=d.thrower,a=s.angle*Math.PI/180,wa=s.wind*d.windScale;
      animT+=1/60;
      ctx.clearRect(0,0,1280,720);ctx.drawImage(bg,0,0);
      const speed=Math.abs(wa),dir=wa>=0?1:-1;
      ctx.strokeStyle='rgba(255,214,150,.14)';ctx.lineWidth=1.5;
      for(let i=0;i<6;i++){const off=(animT*(24+speed*8)*dir+i*237)%1400,x=((off%1400)+1400)%1400-70,y=80+i*50;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+dir*(24+speed*3),y+2);ctx.stroke();}
      if(s.status==='playing'&&!s.projectile&&!manualPause&&!this.paused()){
        ctx.setLineDash([7,9]);ctx.strokeStyle='rgba(255,207,36,.8)';ctx.lineWidth=2;ctx.beginPath();
        for(let t=0;t<=d.preview+1e-9;t+=.025){
          const x=T.x+Math.cos(a)*s.power*t+wa*t*t/2,y=T.y-Math.sin(a)*s.power*t+d.gravity*t*t/2;
          t===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
        ctx.stroke();ctx.setLineDash([]);}
      ctx.strokeStyle='rgba(255,224,160,.5)';ctx.lineWidth=2;ctx.beginPath();
      s.trail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
      if(s.projectile){const p=s.projectile;ctx.fillStyle='#26221c';ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='#8a7a58';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x-6,p.y-4);ctx.lineTo(p.x+6,p.y+4);ctx.moveTo(p.x-6,p.y+4);ctx.lineTo(p.x+6,p.y-4);ctx.stroke();}
      drawBunker();
      ctx.strokeStyle='#1b1815';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(T.x,T.y);ctx.lineTo(T.x,T.y-24);ctx.stroke();
      ctx.fillStyle='#1b1815';ctx.beginPath();ctx.arc(T.x,T.y-30,6,0,Math.PI*2);ctx.fill();
      ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(T.x,T.y-18);ctx.lineTo(T.x+Math.cos(a)*14,T.y-18-Math.sin(a)*14);ctx.stroke();
      if(!s.projectile&&s.status==='playing'){ctx.fillStyle='#26221c';ctx.beginPath();ctx.arc(T.x+Math.cos(a)*17,T.y-18-Math.sin(a)*17,4.5,0,Math.PI*2);ctx.fill();}
      for(const p of s.particles){ctx.globalAlpha=Math.max(0,Math.min(1,p.life*(p.block?1.4:2)));
        if(p.block){ctx.fillStyle='#6b5c4e';ctx.fillRect(p.x-3,p.y-3,6,6);}else{ctx.fillStyle='#ffcf24';ctx.fillRect(p.x-2,p.y-2,4,4);}}
      ctx.globalAlpha=1;
      for(const w of s.waves){ctx.globalAlpha=Math.max(0,w.life/.5);ctx.strokeStyle='#ffcf24';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w.x,w.y,6+(1-w.life/.5)*66,0,Math.PI*2);ctx.stroke();}
      ctx.globalAlpha=1;
      ctx.fillStyle='rgba(232,230,223,.55)';ctx.font='12px sans-serif';ctx.fillText('教学推演 · 抽象符号 · 数值为教学设定',26,30);
      const pw=216,ph=70,px2=1052,py2=14;
      ctx.fillStyle='rgba(8,10,12,.66)';ctx.fillRect(px2,py2,pw,ph);
      ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.strokeRect(px2,py2,pw,ph);
      ctx.fillStyle='#ffcf24';ctx.fillRect(px2,py2,3,ph);
      ctx.fillStyle='#e8e6df';ctx.font='12px sans-serif';ctx.fillText('弹药 AMMO',px2+12,py2+18);
      for(let i=0;i<d.ammo;i++){const bx=px2+88+i*19;
        if(i<s.ammo){ctx.fillStyle='#ffcf24';ctx.fillRect(bx,py2+9,13,9);}
        else{ctx.strokeStyle='rgba(255,255,255,.28)';ctx.strokeRect(bx+.5,py2+9.5,12,8);}}
      ctx.fillStyle='#e8e6df';ctx.font='12px sans-serif';ctx.fillText('命中 HITS',px2+12,py2+40);
      ctx.fillStyle='#ffcf24';ctx.font='bold 13px sans-serif';ctx.fillText(s.hits+'/'+d.hp,px2+88,py2+40);
      ctx.fillStyle='#e8e6df';ctx.font='12px sans-serif';ctx.fillText('风 WIND',px2+12,py2+60);
      const wv2=s.wind>0.05?'→':s.wind<-0.05?'←':'·';
      ctx.fillStyle=Math.abs(s.wind)>=2?'#e5484d':'#ffcf24';ctx.font='bold 13px sans-serif';ctx.fillText(wv2+' '+Math.abs(s.wind).toFixed(1)+' 档',px2+88,py2+60);
      if(s.status==='ready'){
        ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(8,10,12,.8)';ctx.fillRect(370,236,540,212);ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;ctx.strokeRect(370,236,540,212);ctx.fillStyle='#ffcf24';ctx.fillRect(370,236,3,212);
        ctx.fillStyle='#f2f0e9';ctx.font='bold 17px sans-serif';ctx.fillText('火力准备 FIRE SUPPORT',392,272);
        ctx.fillStyle='#b8bcb4';ctx.font='13px sans-serif';
        ctx.fillText('从投掷点向外拖拽瞄准；或 ←→ 调角度、↑↓ 调力度',392,304);
        ctx.fillText('空格投掷，Shift 加大步进；触屏拖拽 ≥44 像素松手投出',392,328);
        ctx.fillText('虚线为前 0.5 秒弹道预览，已计入当前风力（-3～+3 档）',392,352);
        ctx.fillText('碉堡 3 次直接命中摧毁；摧毁时需剩余至少 1 发弹药',392,376);
        ctx.fillStyle='#ffcf24';ctx.font='bold 13px sans-serif';ctx.fillText('共 5 发集束手榴弹 · 点「开始火力准备」进入',392,414);
      }
      if(s.status==='playing'&&manualPause){
        ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(8,10,12,.8)';ctx.fillRect(470,310,340,90);ctx.strokeStyle='#4a4d52';ctx.strokeRect(470,310,340,90);
        ctx.textAlign='center';
        ctx.fillStyle='#f2f0e9';ctx.font='bold 20px sans-serif';ctx.fillText('已暂停 PAUSED',640,348);
        ctx.fillStyle='#b8bcb4';ctx.font='13px sans-serif';ctx.fillText('点「继续」恢复火力准备',640,378);
        ctx.textAlign='left';
      }
      if(s.status==='won'||s.status==='lost'){
        ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,1280,720);
        const ok=s.status==='won';
        ctx.textAlign='center';
        ctx.fillStyle=ok?'#7ed491':'#ff8d75';ctx.font='bold 40px sans-serif';ctx.fillText(ok?'突破成功':'进攻受挫',640,310);
        ctx.fillStyle='#8b8e93';ctx.font='13px sans-serif';ctx.fillText(ok?'BREAKTHROUGH':'HOLD FIRE',640,334);
        ctx.fillStyle='#ffcf24';ctx.fillRect(560,350,160,2);
        ctx.fillStyle='#e8e6df';ctx.font='14px sans-serif';
        const lines=wrapText(s.reason,560);
        lines.forEach((ln,i)=>ctx.fillText(ln,640,388+i*24));
        if(ok){const r=this.rating(s,retries);ctx.fillStyle='#ffcf24';ctx.font='bold 15px sans-serif';ctx.fillText(r.rating+' · '+r.score+' 分',640,388+lines.length*24+12);}
        ctx.textAlign='left';
      }
    };
    let hudAt=0;const frame=now=>{
      if(closed)return;
      if(!dialog.isConnected||!current()){close();return;}
      if(ac){const m=this.muted();if(m!==audioMuted){master.gain.value=m?0:1;audioMuted=m;if(m)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000);
      last=now;
      if(s.status!=='playing'){
        for(const p of s.particles){p.x+=p.vx/120;p.y+=p.vy/120;p.vy+=p.g/120;p.life-=1/120;}
        s.particles=s.particles.filter(p=>p.life>0);
        for(const w of s.waves)w.life-=1/120;s.waves=s.waves.filter(w=>w.life>0);}
      for(const event of s.events.splice(0)){sound(event);
        if(event==='hit'||event==='destroy'){canvas.classList.remove('lazikou68-shake');void canvas.offsetWidth;canvas.classList.add('lazikou68-shake');}}
      draw();if(now-hudAt>100||s.status!=='playing'){sync();hudAt=now;}raf=requestAnimationFrame(frame);
    };sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
