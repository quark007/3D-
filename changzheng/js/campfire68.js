/* Original campfire exercise: raindrops and firewood only, no combat content. */
window.Campfire68={
  supports(id){return [9].includes(Number(id));},
  definitions:{
    9:{title:'夜营守火种 · 松潘草地',round:45,fuelMax:100,drain:8,patchLife:6,woodGain:15,woodCool:8,
      spawnFrom:1.2,spawnTo:0.7,patchMax:5,
      intro:'草地夜雨：点击火堆周围的雨水渍扑灭（60 秒不处理会浸灭火种），空格或「添柴」加火（8 秒冷却）。撑到天亮即胜利。',
      success:'天亮了，火种守住了。每一处雨渍都扑在前面，队伍才有一口热青稞面。',
      fail:'火种熄灭了，队伍摸黑熬到天明。再来一次，看好每一处雨点。',
      hist:'松潘草地气候潮湿、柴草难觅，火种是过草地的生命线；据党史出版物记载，红军战士用油布与身体护火过草地。本推演的雨渍节奏与火种数值均为教学设定。'
    }
  },
  create(id,random=Math.random){const d=this.definitions[id];return {id:Number(id),d,rnd:random,fuel:d.fuelMax,left:d.round,elapsed:0,patches:[],spawnT:d.spawnFrom,extinguished:0,soaked:0,addCool:0,flame:0,status:'ready',reason:'',events:[],accumulator:0};},
  spawnPatch(s){const d=s.d,a=s.rnd()*Math.PI*2,r=90+s.rnd()*150;const x=640+Math.cos(a)*r*1.25,y=470+Math.sin(a)*r*0.72;if(s.patches.length>=d.patchMax)return false;s.patches.push({x:Math.max(300,Math.min(1010,x)),y:Math.max(330,Math.min(640,y)),age:0});s.events.push('spawn');return true;},
  douse(s,x,y){let best=null,bd=38;for(const p of s.patches){const dist=Math.hypot(x-p.x,y-p.y);if(dist<bd){bd=dist;best=p;}}if(!best||s.status!=='playing')return false;s.patches.splice(s.patches.indexOf(best),1);s.extinguished++;s.events.push('douse');return true;},
  addWood(s){if(s.addCool>0||s.status!=='playing')return false;s.addCool=s.d.woodCool;s.fuel=Math.min(s.d.fuelMax,s.fuel+s.d.woodGain);s.events.push('wood');return true;},
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');},
  step(s,dt=1/120,act){
    if(s.status!=='playing')return;const d=s.d;s.elapsed+=dt;s.left-=dt;
    s.flame=(s.flame||0)+dt;
    if(s.left<=0){this.finish(s,true,d.success);return;}
    if(s.fuel<=0){this.finish(s,false,d.fail);return;}
    s.spawnT-=dt;if(s.spawnT<=0){this.spawnPatch(s);const p=(d.round-s.left)/d.round;s.spawnT=d.spawnFrom+(d.spawnTo-d.spawnFrom)*p;}
    for(let i=s.patches.length-1;i>=0;i--){const p=s.patches[i];p.age+=dt;if(p.age>=d.patchLife){s.patches.splice(i,1);s.fuel-=d.drain;s.soaked++;s.events.push('steam');if(s.fuel<=0){this.finish(s,false,d.fail);return;}}}
    if(act&&act.click){this.douse(s,act.click.x,act.click.y);act.click=null;}
    if(act&&act.addWood){this.addWood(s);act.addWood=false;}
    s.addCool=Math.max(0,s.addCool-dt);
  },
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.1,seconds));while(s.accumulator+1e-9>=1/120){this.step(s);s.accumulator-=1/120;}},
  rating(s){return s.fuel>=80?{score:95,rating:'守夜人'}:s.fuel>=50?{score:85,rating:'火种不熄'}:{score:70,rating:'挨过一夜'};},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('fire68-style'))return;const el=document.createElement('style');el.id='fire68-style';el.textContent=`
    .fire68-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:96dvh;margin:auto;padding:14px 16px;background:#10160f;color:#e8e2d2;border:1px solid #4a4d52;border-radius:2px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif}
    .fire68-dialog::backdrop{background:#04060acc}.fire68-dialog h2{margin:0;font-size:clamp(18px,2.6vw,26px);color:#f2f3f4;font-weight:800}.fire68-dialog p{margin:6px 0}.fire68-dialog header,.fire68-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.fire68-dialog header{justify-content:space-between}
    .fire68-dialog button{font:inherit;background:#1a1c20;color:#e8e2d2;border:1px solid #4a4d52;border-radius:0;padding:8px 14px;min-height:42px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:border-color .12s,transform .12s}.fire68-dialog button:hover{border-color:#8b8e93;transform:translateY(-1px)}.fire68-dialog button:disabled{opacity:.45;cursor:default;transform:none}
    .fire68-dialog [data-start]{background:#ffcf24;border-color:#ffcf24;color:#111;font-weight:800;clip-path:polygon(13px 0,100% 0,calc(100% - 13px) 100%,0 100%)}
    .fire68-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .fire68-dialog canvas{display:block;width:min(82.2dvh,100%);aspect-ratio:16/9;height:auto;margin:0 auto;background:#10160f;touch-action:none;border-radius:2px;box-shadow:0 0 0 1px #2c2e33}
    .fire68-status{min-height:1.5em;color:#ffdea1}.fire68-actions{margin-top:6px}.fire68-dialog [hidden]{display:none!important}
    .challenge-item.fire68-entry{cursor:pointer;border:1px solid #ab905c;border-radius:8px;padding:13px;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.challenge-item.fire68-entry:hover,.challenge-item.fire68-entry:focus-visible{transform:translateY(-2px);border-color:#e4c98a;box-shadow:0 5px 16px rgba(0,0,0,.4)}
    .fire68-note{font-size:13px;color:#9a9c9f}.fire68-shake{animation:fire68-shake .18s linear}@keyframes fire68-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}
    @media(prefers-reduced-motion:reduce){.fire68-shake{animation:none}.fire68-dialog button:hover{transform:none}}@media(max-width:600px){.fire68-dialog{padding:12px;font-size:13px}.fire68-dialog canvas{width:100%}}`;
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
    const dialog=document.createElement('dialog');dialog.className='fire68-dialog';dialog.setAttribute('aria-labelledby','fire68-title');
    dialog.innerHTML='<header><div><h2 id="fire68-title"></h2><span class="xjg-sub" style="font-size:12px;letter-spacing:.18em;color:#8b8e93">NIGHT WATCH · 守火种</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="夜营守火种画面。点击雨水渍扑灭，空格或添柴按钮加火，撑到天亮。"></canvas><p data-hud></p><p class="fire68-status" role="status" aria-live="polite"></p><div class="fire68-actions"><button data-start>开始守夜 · NIGHT WATCH</button><button data-wood disabled>添柴 · 空格</button><button data-pause disabled>暂停</button><button data-mute>声音</button><button data-retry>重新守夜</button><button data-complete hidden>记录成绩 · 完成本章</button></div><p class="fire68-note">雨渍 6 秒不处理浸灭火种 8 点；添柴 +15、冷却 8 秒。火光范围随火种增减。抽象符号，无伤亡表现。</p><details class="fire68-note"><summary>史实与练习说明</summary><p data-hist></p><p>本小游戏为原创守夜练习：雨渍节奏、火种数值、分数与重开次数均为教学设定。</p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null,click=null,addReq=false,lastWood=0;
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const sound=kind=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=kind==='lose'?'sawtooth':'sine';const f=kind==='douse'?420:kind==='wood'?300:kind==='spawn'?520:kind==='win'?660:kind==='steam'?180:110;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f/(kind==='win'?1:2.2)),now+.22);g.gain.setValueAtTime(.07,now);g.gain.exponentialRampToValueAtTime(.001,now+.28);o.connect(g);g.connect(master);o.start();o.stop(now+.3);}catch{/* Sound must never block the exercise. */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{q('[data-hud]').textContent=`火种 ${Math.max(0,Math.round(s.fuel))}/100 · 扑灭 ${s.extinguished} · 浸湿 ${s.soaked} · 天亮 ${Math.max(0,Math.ceil(s.left))}s · 添柴 ${s.addCool>0?Math.ceil(s.addCool)+'s':'就绪'}`;q('[data-start]').hidden=s.status!=='ready';q('[data-wood]').disabled=s.status!=='playing'||s.addCool>0;q('[data-pause]').disabled=s.status!=='playing';q('[data-pause]').textContent=manualPause?'继续守夜':'暂停';q('[data-mute]').textContent=this.muted()?'开启声音':'全部静音';q('[data-complete]').hidden=s.status!=='won';const text=s.status==='ready'?'点「开始守夜」；雨渍出现后尽快点掉。':s.status==='won'?this.rating(s).rating+' · '+s.reason:s.status==='lost'?s.reason:manualPause||this.paused()?'守夜已暂停。':s.patches.length>=4?'雨渍很多！优先点最老的。':'雨渍出现就点掉，别攒。';if(q('.fire68-status').textContent!==text)q('.fire68-status').textContent=text;};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};q('[data-pause]').onclick=()=>{manualPause=!manualPause;last=0;sync();};
    q('[data-wood]').onclick=()=>{gesture();addReq=true;sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);this.session=s;manualPause=false;recorded=false;last=0;click=null;addReq=false;sync();draw();q('[data-start]').focus();};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.rating(s),key='fire68_'+node.id;GameState.storyPreparations||={};const old=GameState.storyPreparations[key];if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,fuel:Math.round(s.fuel),retries,completedAt:new Date().toISOString()};GameState.recordBattleScore(node.id,result.score,result.rating);if(GameState.save()===false){recorded=false;if(typeof GameUI!=='undefined')GameUI.showToast('成绩尚未保存，请重试记录。');return;}close();if(typeof onComplete==='function')onComplete();};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),ox=r.left+(r.width-1280*scale)/2,oy=r.top+(r.height-720*scale)/2;return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale};};
    canvas.onpointerdown=e=>{if(s.status!=='playing'||manualPause||this.paused()||e.button>0)return;const p=point(e);gesture();click={x:p.x,y:p.y};canvas.focus();e.preventDefault();};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.target!==canvas)return;if(e.key===' '||e.key==='Enter'){e.preventDefault();e.stopPropagation();if(!e.repeat)addReq=true;sync();}};dialog.addEventListener('keydown',key);
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);
      const sky=ctx.createLinearGradient(0,0,0,400);sky.addColorStop(0,'#0d1410');sky.addColorStop(1,'#182418');ctx.fillStyle=sky;ctx.fillRect(0,0,1280,400);
      ctx.fillStyle='#131f13';ctx.fillRect(0,300,1280,420);
      ctx.fillStyle='#0f1a0f';for(let i=0;i<8;i++){ctx.beginPath();ctx.ellipse(90+i*160,320+((i%3)-1)*40,120,42,0,0,Math.PI*2);ctx.fill();}
      /* 帐篷剪影 ×3 */
      for(const t of [[210,320],[1060,320],[640,205]]){ctx.fillStyle='#1a2416';ctx.beginPath();ctx.moveTo(t[0]-70,t[1]+60);ctx.lineTo(t[0],t[1]-38);ctx.lineTo(t[0]+70,t[1]+60);ctx.closePath();ctx.fill();ctx.fillStyle='#0e150d';ctx.beginPath();ctx.moveTo(t[0]-14,t[1]+60);ctx.lineTo(t[0],t[1]+16);ctx.lineTo(t[0]+14,t[1]+60);ctx.fill();}
      /* 地面 */
      const gr=ctx.createLinearGradient(0,360,0,720);gr.addColorStop(0,'#1b2717');gr.addColorStop(1,'#101810');ctx.fillStyle=gr;ctx.fillRect(0,360,1280,360);
      /* 火光光晕（半径随火种值） */
      const glowR=120+s.fuel*1.6;const glow=ctx.createRadialGradient(640,470,20,640,470,glowR);glow.addColorStop(0,'rgba(255,170,60,.5)');glow.addColorStop(1,'rgba(255,170,60,0)');ctx.fillStyle=glow;ctx.fillRect(640-glowR,470-glowR,glowR*2,glowR*2);
      /* 火堆 */
      ctx.fillStyle='#3a2c1a';for(let k=0;k<5;k++){ctx.save();ctx.translate(640,470);ctx.rotate(k*Math.PI*2/5);ctx.fillRect(-24,-4,48,7);ctx.restore();}
      const fh=26+Math.sin(s.flame*9)*5+s.fuel*.06;const fw=20+Math.sin(s.flame*7+2)*3;
      ctx.fillStyle='#ffcf24';ctx.beginPath();ctx.moveTo(640-fw,470);ctx.quadraticCurveTo(640-fw*.4,470-fh*.7,640+Math.sin(s.flame*11)*4,470-fh);ctx.quadraticCurveTo(640+fw*.4,470-fh*.6,640+fw,470);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.moveTo(640-fw*.45,470);ctx.quadraticCurveTo(640,470-fh*.55,640+fw*.45,470);ctx.closePath();ctx.fill();
      /* 雨渍 */
      for(const p of s.patches){const urgency=p.age/s.d.patchLife;
        ctx.fillStyle='rgba(10,20,26,.75)';ctx.beginPath();ctx.ellipse(p.x,p.y,30,17,0,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle='rgba(140,190,210,'+(0.3+urgency*.5).toFixed(2)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y,30+Math.sin(s.elapsed*5)*2,17,0,0,Math.PI*2);ctx.stroke();
        ctx.strokeStyle='rgba(140,190,210,'+(urgency*.6).toFixed(2)+')';ctx.beginPath();ctx.ellipse(p.x,p.y,20*urgency+6,11*urgency+4,0,0,Math.PI*2);ctx.stroke();}
      /* 白汽（被浸湿时出现，用事件粒子代替） */
      /* 前景细雨丝 */
      if(!reduced){ctx.strokeStyle='rgba(160,190,210,.20)';ctx.lineWidth=1;for(let i=0;i<28;i++){const rx=(i*127+s.elapsed*380)%1280,ry=(i*211+s.elapsed*520)%720;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx-4,ry+14);ctx.stroke();}}
      /* AK 面板：切角助手 */
      const cutP=(x,y,w,h,c)=>{ctx.beginPath();ctx.moveTo(x+c,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+c);ctx.closePath();};
      /* 左上：守夜战况双条面板（火种 FUEL / 天亮 DAWN） */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(16,14,330,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;cutP(16,14,330,96,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(16,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('守夜战况',34,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('NIGHT STATUS',122,36);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('火种',34,58);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('FUEL',66,58);
      ctx.fillStyle='#1a1c20';cutP(102,46,198,14,4);ctx.fill();ctx.fillStyle=s.fuel<30?'#e5484d':'#ffcf24';cutP(102,46,198*Math.max(0,s.fuel)/100,14,4);ctx.fill();
      ctx.fillStyle=s.fuel<30?'#e5484d':'#ffcf24';ctx.font='900 16px sans-serif';ctx.textAlign='right';ctx.fillText(Math.max(0,Math.round(s.fuel))+'%',342,59);ctx.textAlign='left';
      const dawnPct=1-Math.max(0,Math.min(1,s.left/s.d.round));
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('天亮',34,84);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('DAWN',66,84);
      ctx.fillStyle='#1a1c20';cutP(102,72,198,14,4);ctx.fill();ctx.fillStyle='#7ecbff';cutP(102,72,198*dawnPct,14,4);ctx.fill();
      ctx.fillStyle='#7ecbff';ctx.font='900 16px sans-serif';ctx.textAlign='right';ctx.fillText(Math.max(0,Math.ceil(s.left))+'s',342,85);ctx.textAlign='left';
      /* 右上：雨渍战况面板（扑灭/浸湿/添柴） */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(1010,14,254,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';cutP(1010,14,254,96,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(1010,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('雨渍扑灭',1028,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('DOUSED',1112,36);
      ctx.fillStyle='#7dc47f';ctx.font='900 20px sans-serif';ctx.fillText(String(s.extinguished),1028,64);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('浸湿 SOAKED · '+s.soaked,1082,52);
      ctx.fillStyle=s.addCool>0?'#8b8e93':'#ffcf24';ctx.font='12px sans-serif';ctx.fillText(s.addCool>0?'添柴 WOOD · '+Math.ceil(s.addCool)+'s':'添柴 WOOD · 就绪',1082,76);
      ctx.font='15px sans-serif';ctx.fillStyle='#e8e2d2';ctx.fillText('教学模拟 · 点击雨渍 · 空格添柴',26,704);
      /* 胜负大字层 */
      if(s.status==='won'||s.status==='lost'){const won=s.status==='won';ctx.fillStyle='rgba(6,8,10,.55)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(13,14,16,.92)';ctx.fillRect(300,240,680,168);ctx.strokeStyle=won?'#ffcf24':'#e5484d';ctx.lineWidth=2;ctx.strokeRect(300,240,680,168);
        ctx.textAlign='center';ctx.fillStyle=won?'#ffcf24':'#e5484d';ctx.font='bold 44px sans-serif';ctx.fillText(won?'天亮了':'火种熄灭',640,312);
        ctx.fillStyle='#8b8e93';ctx.font='13px sans-serif';ctx.fillText(won?'N I G H T   S U R V I V E D':'F I R E   L O S T',640,338);
        const rt=this.rating(s);ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(rt.rating+' · '+rt.score+' 分',640,372);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText(s.reason,640,396);ctx.textAlign='left';}
    };
    const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000);last=now;
      if(addReq){this.addWood(s);addReq=false;}
      if(click){this.douse(s,click.x,click.y);click=null;}
      for(const event of s.events.splice(0)){sound(event);if(event==='lose'){canvas.classList.remove('fire68-shake');void canvas.offsetWidth;canvas.classList.add('fire68-shake');}}
      draw();if(now-(frame.hudAt||0)>100||s.status!=='playing'){sync();frame.hudAt=now;}raf=requestAnimationFrame(frame);
    };sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
