/* Dadu river crossing: steering a ferry through rapids, shells and reefs.
   Seventeen heroes, one boat, three lanes; no shooting — steering only. */
window.Ferry72=(function(){
  const HIST='1935年5月25日，红军在安顺场强渡大渡河。十七勇士乘一只木船，在激流与对岸火力冲击下冲向北岸，为红军主力渡河打开通道。（教学推演：水流、落点与时间均为练习设定；人物以剪影表现。）';
  function create(id,rng){
    rng=rng||Math.random;
    const lanes=[240,440,640];
    return {id:Number(id),d:definitions[id],
      boat:{x:150,y:440,vx:0,vy:0,lane:1},
      lanes,rocks:buildRocks(lanes,rng),shells:[],rapids:[],
      dist:0,goalX:1160,time:0,duration:60,inv:0,passengers:17,
      status:'ready',reason:'',events:[],rng,wobbleT:0};
  }
  function buildRocks(lanes,rng){
    const rocks=[];
    // 每水道 2 块礁石，彼此错开且保证有安全道
    lanes.forEach((ly,li)=>{
      for(let k=0;k<2;k++)rocks.push({x:300+li*220+k*330+rng()*120,y:ly+((rng()<.5?-1:1)*40),r:26});
    });
    return rocks;
  }
  /* 炮弹落点：预警 1.2s（红圈收束）→ 爆炸判定（当前船位在圈内且 inv=0 → 减员一名勇士、击退） */
  function spawnShell(s){
    const r=s.rng();
    s.shells.push({x:220+s.dist+rng2(s)*900+r,y:s.lanes[Math.floor(r*3)],t:1.2,r:56});
    function rng2(st){return st.rng();}
  }
  function moveLane(s,dir){
    if(s.status!=='playing')return;
    const idx=s.lanes.indexOf(nearestLane(s));
    const ni=Math.max(0,Math.min(s.lanes.length-1,idx+dir));
    s.boat.y=s.lanes[ni];s.events.push('row');
  }
  function nearestLane(s){let best=s.lanes[0],bd=1e9;s.lanes.forEach(l=>{const d=Math.abs(l-s.boat.y);if(d<bd){bd=d;best=l;}});return best;}
  function step(s,dt,keys){
    if(s.status!=='playing')return;
    const d=s.d;s.time+=dt;s.inv=Math.max(0,s.inv-dt);
    // 前进：激流基础速 + 划桨
    let spd=95;
    if(keys.row)spd+=45;
    s.dist+=spd*dt;
    s.boat.x=150+s.dist;
    // 水流摆动（船身纵向漂移）
    s.wobbleT+=dt;
    s.boat.y+=Math.sin(s.wobbleT*1.7)*8*dt;
    // 变道
    if(keys.up)moveLane(s,-1),keys.up=false;
    if(keys.down)moveLane(s,1),keys.down=false;
    // 礁石碰撞：击退+减员（无敌帧内不重复）
    if(s.inv<=0){
      const rock=s.rocks.find(o=>Math.hypot(s.boat.x-o.x,s.boat.y-o.y)<o.r+14);
      if(rock){s.inv=1.2;s.passengers=Math.max(12,s.passengers-1);s.dist=Math.max(0,s.dist-60);s.events.push('rock');}
    }
    // 炮弹
    s.shellT=(s.shellT||0)+dt;
    if(s.shellT>2.2){s.shellT=0;spawnShell(s);}
    s.shells=s.shells.filter(sh=>{
      sh.t-=dt;
      if(sh.t<=0){
        if(s.inv<=0&&Math.hypot(s.boat.x-sh.x,s.boat.y-sh.y)<sh.r){s.inv=1.2;s.passengers=Math.max(12,s.passengers-1);s.dist=Math.max(0,s.dist-60);s.events.push('shell');}
        return false;}
      return true;
    });
    // 胜负
    if(s.boat.x>=s.goalX){this.finish(s,true,s.passengers>=17?'十七勇士全部登岸——渡河通道打开了。':'勇士们登岸，一人未少，只是船身斑驳。');return;}
    if(s.passengers<=12){this.finish(s,false,'船身受损过重，被迫靠岸整修。重新推演：提前变道，落点预警的红圈要躲开。');return;}
    if(s.time>=s.duration){this.finish(s,false,'激流耗尽了时间，船仍未抵岸。重新推演：按住划桨抢时机。');return;}
  }
  function finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');}
  function rating(s){
    if(s.status!=='won')return{score:70,rating:'未抵北岸'};
    return s.passengers===17&&s.time<=40?{score:95,rating:'浪尖飞舟'}:s.passengers===17?{score:85,rating:'十七勇士'}:{score:75,rating:'强渡成功'};
  }
  function persist(s,nodeId){
    const result=rating(s);
    try{if(typeof GameState!=='undefined'){
      GameState.storyPreparations=GameState.storyPreparations||{};
      const key='ferry72_6',old=GameState.storyPreparations[key];
      if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,aboard:s.passengers,seconds:Math.round(s.time),completedAt:new Date().toISOString()};
      if(typeof GameState.recordBattleScore==='function')GameState.recordBattleScore(nodeId||6,result.score,result.rating);
      if(typeof GameState.save==='function')GameState.save();}}catch{}
    return result;
  }
  const definitions={6:{title:'大渡河强渡 · 十七勇士',
    intro:'1935年5月25日，安顺场。你操控渡船穿过激流：↑/W 与 ↓/S 变水道，按住 空格 划桨提速；礁石与炮弹落点都会撞伤船身。十七勇士，一人不能少。',
    success:'十七勇士全部登岸——渡河通道打开了。',
    hist:HIST}};
  function style(){
    if(document.getElementById('ferry72-style'))return;
    const el=document.createElement('style');el.id='ferry72-style';el.textContent=`
    .ferry72-dialog{box-sizing:border-box;width:min(1000px,96vw);max-height:96dvh;margin:auto;padding:0;background:#0a0d10;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .ferry72-dialog::backdrop{background:#05070ae6}
    .ferry72-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #20262c;background:#0d1013}
    .ferry72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .ferry72-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .ferry72-body{padding:12px 18px}
    .ferry72-dialog canvas{display:block;width:100%;height:auto;background:#0c151c;border:1px solid #2a2d31;border-radius:2px;touch-action:none}
    .ferry72-hud{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px dashed #20262c;padding-bottom:8px}
    .ferry72-hud span{background:#12161a;border:1px solid #232a30;border-radius:2px;padding:3px 10px;font-variant-numeric:tabular-nums;font-size:13px;color:#cfd2cf}
    .ferry72-hud span.warn{border-color:#6a3a30;color:#ff8d75}
    .ferry72-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:9px;margin:0 18px}
    .ferry72-actions{display:flex;gap:8px;flex-wrap:wrap;padding:10px 18px 12px}
    .ferry72-dialog button{font:inherit;background:#141a20;color:#e8e6df;border:1px solid #3a4148;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer}
    .ferry72-dialog button:hover:not(:disabled){background:#1b232a}
    .ferry72-dialog button.primary{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .ferry72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .ferry72-note{font-size:12px;color:#8f948d;padding:0 18px 12px}
    .ferry72-dialog [hidden]{display:none!important}
    @media(max-width:600px){.ferry72-dialog{font-size:13px}}`;
    document.head.append(el);
  }
  function open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='ferry72-dialog';dialog.setAttribute('aria-labelledby','ferry72-t');
    dialog.innerHTML='<header><div><h2 id="ferry72-t"></h2><p class="ferry72-sub">Anshunchang Crossing · May 25, 1935</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="ferry72-body"><p data-intro></p><canvas data-river width="1280" height="720" tabindex="0" aria-label="大渡河强渡画面。上下键变水道，空格划桨。躲避礁石与炮弹落点，抵达北岸。"></canvas></div>'
      +'<div class="ferry72-hud" data-hud><span data-crew>船上 17 人</span><span data-prog>航程 0%</span><span data-time>用时 0/60 秒</span></div>'
      +'<p class="ferry72-status" role="status" aria-live="polite"></p>'
      +'<div class="ferry72-actions"><button data-start class="primary">▶ 解缆启渡</button><button data-retry>↻ 重新启渡</button><button data-complete hidden>记录成绩 · 完成本章</button></div>'
      +'<p class="ferry72-note">三道水道：贴上/居中/贴下。炮弹落点有红圈预警，提前变道。船身减员到 12 人即失败——十七勇士，一人不能少。人物剪影，无血腥。</p>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel);
    let s=create(node.id);this.session=s;
    let closed=false,keys={row:false,up:false,down:false};
    q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.remove();if(trigger&&trigger.isConnected)trigger.focus();};
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    q('[data-close]').onclick=close;
    const status=t=>{q('.ferry72-status').textContent=t;};
    const hud=()=>{
      q('[data-crew]').textContent='船上 '+s.passengers+' 人';
      q('[data-crew]').className=s.passengers<17?'warn':'';
      q('[data-prog]').textContent='航程 '+Math.min(100,Math.round(s.dist/s.d.goalX*100))+'%';
      q('[data-time]').textContent='用时 '+Math.round(s.time)+'/'+s.d.duration+' 秒';
    };
    const draw=now=>{
      const c=q('[data-river]').getContext('2d');
      c.fillStyle='#0c151c';c.fillRect(0,0,1280,720);
      // 两岸悬崖
      c.fillStyle='#131a14';c.beginPath();c.moveTo(0,0);c.lineTo(110,0);c.lineTo(60,720);c.lineTo(0,720);c.fill();
      c.beginPath();c.moveTo(1280,0);c.lineTo(1190,0);c.lineTo(1240,720);c.lineTo(1280,720);c.fill();
      // 水道参考线
      s.lanes.forEach((ly,i)=>{c.strokeStyle='rgba(150,190,210,.10)';c.lineWidth=1.5;
        c.beginPath();c.moveTo(120,ly);c.lineTo(1170,ly);c.stroke();});
      // 流水条纹
      c.strokeStyle='rgba(140,190,215,.14)';
      for(let i=0;i<14;i++){const wx=((i*137)-(now?now/22:0)%1280+1280*3)%1280;
        c.beginPath();c.moveTo(wx,90+i*40);c.lineTo(wx+60,88+i*40);c.stroke();}
      // 礁石
      s.rocks.forEach(o=>{c.fillStyle='#1c2320';c.beginPath();c.arc(o.x,o.y,o.r,0,Math.PI*2);c.fill();
        c.strokeStyle='rgba(220,230,240,.25)';c.lineWidth=2;c.beginPath();c.arc(o.x,o.y,o.r+4,Math.PI*1.1,Math.PI*1.9);c.stroke();});
      // 炮弹落点预警
      s.shells.forEach(sh=>{
        const p=1-sh.t/1.2;
        c.strokeStyle='rgba(229,72,77,'+(0.4+0.5*p).toFixed(2)+')';c.lineWidth=2.5;
        c.beginPath();c.arc(sh.x,sh.y,sh.r*(1-p*0.7),0,Math.PI*2);c.stroke();
        c.fillStyle='rgba(229,72,77,'+(0.10+0.2*p).toFixed(2)+')';c.fill();
      });
      // 渡船（木船+勇士剪影）
      const bx=s.boat.x,by=s.boat.y;
      const rock=Number.isFinite(now)?Math.sin(now/160)*2:0;
      c.save();c.translate(bx,by+rock);
      c.fillStyle='#4a3a24';c.beginPath();c.moveTo(-30,0);c.quadraticCurveTo(0,16,32,0);c.lineTo(24,-8);c.lineTo(-24,-8);c.closePath();c.fill();
      c.strokeStyle='#2b2114';c.lineWidth=2;c.stroke();
      for(let i=0;i<5;i++){c.fillStyle='#11150f';c.fillRect(-18+i*9,-16,6,10);}
      c.restore();
      if(s.inv>0&&Math.floor((now||0)/100)%2===0){c.strokeStyle='rgba(255,207,36,.85)';c.lineWidth=3;
        c.beginPath();c.arc(bx,by,34,0,Math.PI*2);c.stroke();}
      // 北岸目标
      if(bx>1000){c.fillStyle='rgba(255,207,36,.15)';c.fillRect(1170,200,70,360);}
      c.fillStyle='#ffcf24';c.font='12px sans-serif';c.fillText('北岸 LANDING',1168,192);
      // 暗角
      const vig=c.createRadialGradient(640,360,260,640,360,780);
      vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.42)');c.fillStyle=vig;c.fillRect(0,0,1280,720);
    };
    let raf=0,last=0;
    const loop=now=>{if(closed)return;
      if(last&&s.status==='playing')this.step(s,Math.max(0,Math.min(.1,(now-last)/1000)),keys);
      last=now;draw(now);hud();
      if(s.status!=='playing')sync();
      raf=requestAnimationFrame(loop);};
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      const k=e.key.toLowerCase();
      if(['arrowup','w'].includes(k)){e.preventDefault();keys.up=e.type==='keydown';}
      else if(['arrowdown','s'].includes(k)){e.preventDefault();keys.down=e.type==='keydown';}
      else if(k===' '){e.preventDefault();keys.row=e.type==='keydown';}
    };
    dialog.addEventListener('keydown',key);dialog.addEventListener('keyup',key);
    /* 窗口失焦清键，防卡键 */
    window.addEventListener('blur',()=>{keys.row=keys.up=keys.down=false;});
    const sync=()=>{
      q('[data-start]').hidden=s.status!=='ready';
      q('[data-complete]').hidden=s.status!=='won';
      if(s.status==='won')status('本章完成 · '+this.rating(s).rating);
      else if(s.status==='lost')status(s.reason);
    };
    q('[data-start]').onclick=()=>{s.status='playing';last=0;q('[data-start]').hidden=true;
      status('激流推船——上下键变道避礁，落点红圈提前躲。');cvFocus();};
    q('[data-retry]').onclick=()=>{s=create(node.id);this.session=s;keys={row:false,up:false,down:false};
      status('重新启渡。');q('[data-start]').hidden=false;sync();draw(0);};
    const cvFocus=()=>q('[data-river]').focus();
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;this.persist(s,node.id);close();if(typeof onComplete==='function')onComplete();};
    let recorded=false;
    draw(0);hud();q('[data-start]').focus();
    raf=requestAnimationFrame(loop);
    return true;
  }
  return{HIST,definitions,supports(id){return [6].includes(Number(id));},create,step,moveLane,spawnShell,finish,rating,persist,style,open};
})();
