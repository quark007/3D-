/* Night march column: snake variant — lead walker controls, column follows,
   enemy searchlight sweeps cut the tail. No attacking, survival only. */
window.NightMarch72=(function(){
  function create(id,rng){
    rng=rng||Math.random;
    const segs=[];const start={x:160,y:360};
    // 初始队伍 5 节
    for(let i=0;i<5;i++)segs.push({x:start.x-i*22,y:start.y});
    return {id:Number(id),d:definitions[id],
      segs,strays:[],lights:[],obstacles:buildRock(rng),
      moon:0,dir:0,turn:0,time:0,recruited:0,lostN:0,inv:0,
      status:'ready',reason:'',events:[],rng};
  }
  function buildRock(rng){
    const rocks=[];for(let i=0;i<9;i++)rocks.push({x:200+Math.floor(rng()*980),y:80+Math.floor(rng()*500),r:26+Math.floor(rng()*22)});
    return rocks;
  }
  const definitions={'march':{title:'夜行军纵队 · 无声前行',
    intro:'月夜山路，一路纵队无声前行。操控队首收拢掉队散兵（队伍变长），躲避敌机探照光——被照中，队尾一截就会掉队。目标：带着至少 12 节纵队抵达东侧山口。',
    success:'纵队走出山谷——没有一个人被丢在夜里。',
    hist:'红军夜间山地行军成一路纵队，前后紧跟、禁止喧哗、禁止明火；敌机夜间侦察投放探照灯，灯光扫过即有暴露风险。（教学推演：地形与事件均为练习设定。）',
    goal:12,duration:75}};
  function segCount(s){return s.segs.length;}
  /* 掉队散兵生成（时间驱动，rng 注入） */
  function spawnStray(s){
    if(s.strays.length>=3)return;
    const r=s.rng();
    s.strays.push({x:900+r*280,y:100+r*460,t:26});
  }
  /* 敌机探照灯：周期入场，扇形扫掠 */
  function spawnLight(s){
    if(s.lights.length>=1)return;
    s.lights.push({x:1280,y:80+Math.floor(s.rng()*540),ang:Math.PI, sweep:(s.rng()<.5?1:-1)*(0.5+s.rng()*0.4), t:9});
  }
  function step(s,dt,keys){
    if(s.status!=='playing')return;
    const d=s.d;s.time+=dt;s.inv=Math.max(0,s.inv-dt);
    // 队首移动（方向键），速度 130；撞岩止步
    const head=s.segs[0];
    let mx=(keys.right?1:0)-(keys.left?1:0),my=(keys.down?1:0)-(keys.up?1:0);
    const mag=Math.hypot(mx,my);
    if(mag>0){
      const nx=head.x+mx/mag*130*dt,ny=head.y+my/mag*130*dt;
      const hitRock=s.obstacles.some(o=>Math.hypot(nx-o.x,ny-o.y)<o.r+10);
      if(!hitRock&&nx>14&&nx<1266&&ny>40&&ny<690){head.x=nx;head.y=ny;}
    }
    // 月光扇形跟随队首朝向
    if(mag>0)s.dir=Math.atan2(my,mx);
    // 跟随链：每节追前一节，保持 22px
    for(let i=1;i<s.segs.length;i++){
      const a=s.segs[i-1],b=s.segs[i];
      const dx=a.x-b.x,dy=a.y-b.y,dist=Math.hypot(dx,dy);
      if(dist>22){b.x+=dx/dist*(dist-22);b.y+=dy/dist*(dist-22);}
    }
    // 收拢散兵
    s.strays=s.strays.filter(st=>{
      st.t-=dt;
      if(Math.hypot(head.x-st.x,head.y-st.y)<24){
        s.recruited++;
        // 队尾复制两节（散兵归队+他带的一名同伴）
        const tail=s.segs[s.segs.length-1],prev=s.segs[s.segs.length-2]||tail;
        for(let k=0;k<2;k++)s.segs.push({x:tail.x-(tail.x-prev.x)*0+ (k+1)*2,y:tail.y+(k+1)*22});
        s.events.push('recruit');return false;}
      return st.t>0;
    });
    // 探照灯
    s.lights=s.lights.filter(L=>{
      L.t-=dt;L.ang+=L.sweep*dt;
      if(L.t<=0)return false;
      // 命中判定：任一节在扇形半径内且角度差 < 0.35rad 且不在月光反差掩体（岩石后豁免）
      let hitIdx=-1;
      for(let i=0;i<s.segs.length;i++){const p=s.segs[i];
        const dx=p.x-L.x,dy=p.y-L.y,dist=Math.hypot(dx,dy);
        if(dist>330)continue;
        let diff=Math.abs(((Math.atan2(dy,dx)-L.ang+Math.PI*3)%(Math.PI*2))-Math.PI);
        if(diff<0.35&&!s.obstacles.some(o=>Math.hypot(p.x-o.x,p.y-o.y)<o.r)){hitIdx=i;break;}
      }
      if(hitIdx>=0&&s.inv<=0){
        s.inv=1.4;s.events.push('spotted');
        const cut=Math.max(2,Math.floor(s.segs.length*0.25));
        const keep=Math.max(3,s.segs.length-cut);
        s.lostN+=s.segs.length-keep;
        s.segs=s.segs.slice(0,keep);
      }
      return true;
    });
    // 散兵/敌机按时间入场
    s.spawnT=(s.spawnT||0)+dt;
    if(s.spawnT>4){s.spawnT=0;spawnStray(s);if(s.time>8)spawnLight(s);}
    // 胜负：队首到东侧山口且 ≥12 节；队伍 <3 全散
    if(head.x>=1210){this.finish(s,true,segCount(s)>=d.goal?d.success:'纵队抵达山口，但人数已不足一个班。重新推演，收拢更多战友再出发。');return;}
    if(segCount(s)<3){this.finish(s,false,'队伍被打散在夜里。多绕岩石背光走，别在开阔地逗留。');return;}
    if(s.time>=d.duration){this.finish(s,false,'天将破晓，未能抵达山口。重新推演，规划更直接的路线。');return;}
  }
  function finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');}
  function rating(s){
    if(s.status!=='won')return{score:70,rating:'夜路未竟'};
    const n=segCount(s);
    return s.lostN===0?{score:95,rating:'寸步不失'}:s.lostN<=4?{score:85,rating:'整队而出'}:{score:75,rating:'抵达山口'};
  }
  function persist(s,nodeId){
    const result=rating(s);
    try{if(typeof GameState!=='undefined'){
      GameState.storyPreparations=GameState.storyPreparations||{};
      const key='march72_'+(nodeId||'x'),old=GameState.storyPreparations[key];
      if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,lost:s.lostN,recruited:s.recruited,completedAt:new Date().toISOString()};
      /* 番外彩点：不挂主线节点记分（调用方未传 nodeId 时不记 battleScores） */
      if(nodeId&&typeof GameState.recordBattleScore==='function')GameState.recordBattleScore(nodeId,result.score,result.rating);
      if(typeof GameState.save==='function')GameState.save();}}catch{}
    return result;
  }
  function style(){
    if(document.getElementById('march72-style'))return;
    const el=document.createElement('style');el.id='march72-style';el.textContent=`
    .march72-dialog{box-sizing:border-box;width:min(1000px,96vw);max-height:96dvh;margin:auto;padding:0;background:#0a0d0a;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .march72-dialog::backdrop{background:#030406f2}
    .march72-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #1e221d;background:#0d100d}
    .march72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .march72-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .march72-body{padding:12px 18px}
    .march72-dialog canvas{display:block;width:100%;height:auto;background:#060907;border:1px solid #2a2d31;border-radius:2px;touch-action:none}
    .march72-hud{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px dashed #1e221d;padding-bottom:8px}
    .march72-hud span{background:#12160f;border:1px solid #232820;border-radius:2px;padding:3px 10px;font-variant-numeric:tabular-nums;font-size:13px;color:#cfd2cf}
    .march72-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:9px;margin:0 18px}
    .march72-actions{display:flex;gap:8px;flex-wrap:wrap;padding:10px 18px 12px}
    .march72-dialog button{font:inherit;background:#161a12;color:#e8e6df;border:1px solid #3d4232;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer}
    .march72-dialog button:hover:not(:disabled){background:#1e2418}
    .march72-dialog button.primary{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .march72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .march72-note{font-size:12px;color:#8f948d;padding:0 18px 12px}
    .march72-dialog [hidden]{display:none!important}
    @media(max-width:600px){.march72-dialog{font-size:13px}}`;
    document.head.append(el);
  }
  function open(node,onComplete){
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node?.id||0)&&node?.id){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&node?.id&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='march72-dialog';dialog.setAttribute('aria-labelledby','march72-t');
    dialog.innerHTML='<header><div><h2 id="march72-t"></h2><p class="march72-sub">Night Column March · Silent</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="march72-body"><p data-intro></p><canvas data-field width="1280" height="720" tabindex="0" aria-label="夜行军画面。方向键操控队首，收拢散兵，躲避探照灯。"></canvas></div>'
      +'<div class="march72-hud" data-hud><span data-n>纵队 5 节</span><span data-rec>收拢 0</span><span data-lost>掉队 0</span><span data-t>用时 0/75 秒</span></div>'
      +'<p class="march72-status" role="status" aria-live="polite"></p>'
      +'<div class="march72-actions"><button data-start class="primary">▶ 开始夜行</button><button data-retry>↻ 重新夜行</button><button data-complete hidden>记录成绩</button></div>'
      +'<p class="march72-note">岩石背光可避探照；队伍越长转向容错越低。抽象剪影，无任何攻击交互。</p>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel);
    let s=create('march');this.session=s;
    let closed=false,keys={up:false,down:false,left:false,right:false};
    q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);window.removeEventListener('blur',clearKeys);document.removeEventListener('visibilitychange',clearKeys);dialog.remove();if(trigger&&trigger.isConnected)trigger.focus();};
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    q('[data-close]').onclick=close;
    const status=t=>{q('.march72-status').textContent=t;};
    const hud=()=>{q('[data-n]').textContent='纵队 '+segCount(s)+' 节';q('[data-rec]').textContent='收拢 '+s.recruited;
      q('[data-lost]').textContent='掉队 '+s.lostN;q('[data-t]').textContent='用时 '+Math.round(s.time)+'/'+s.d.duration+' 秒';};
    const draw=()=>{
      const c=q('[data-field]').getContext('2d');
      c.fillStyle='#060907';c.fillRect(0,0,1280,720);
      // 山廓剪影
      c.fillStyle='#0b0f0a';for(let i=0;i<7;i++){c.beginPath();c.moveTo(i*210-60,720);c.lineTo(i*210+90,380+((i%2)*90));c.lineTo(i*210+260,720);c.closePath();c.fill();}
      // 岩石
      s.obstacles.forEach(o=>{c.fillStyle='#11150e';c.beginPath();c.arc(o.x,o.y,o.r,0,Math.PI*2);c.fill();
        c.strokeStyle='#1b2118';c.stroke();});
      // 散兵（微弱呼吸点）
      s.strays.forEach(st=>{c.fillStyle='rgba(159,208,138,'+(0.5+0.3*Math.sin(s.time*3)).toFixed(2)+')';
        c.beginPath();c.arc(st.x,st.y,7,0,Math.PI*2);c.fill();});
      // 纵队（深色剪影+队首微光）
      s.segs.forEach((p,i)=>{
        c.fillStyle=i===0?'#c8b98f':'#232820';
        c.beginPath();c.arc(p.x,p.y,i===0?10:8,0,Math.PI*2);c.fill();
        if(i===0){c.strokeStyle='rgba(255,207,36,.7)';c.lineWidth=2;c.stroke();}
      });
      // 月光扇形（队首朝向）
      const head=s.segs[0];
      const moon=c.createRadialGradient(head.x,head.y,20,head.x,head.y,240);
      moon.addColorStop(0,'rgba(210,225,240,.16)');moon.addColorStop(1,'rgba(210,225,240,0)');
      c.fillStyle=moon;c.beginPath();c.moveTo(head.x,head.y);c.arc(head.x,head.y,240,s.dir-0.6,s.dir+0.6);c.closePath();c.fill();
      // 探照灯（冷白扇形）
      s.lights.forEach(L=>{
        const beam=c.createRadialGradient(L.x,L.y,10,L.x,L.y,330);
        beam.addColorStop(0,'rgba(230,240,255,.35)');beam.addColorStop(1,'rgba(230,240,255,0)');
        c.fillStyle=beam;c.beginPath();c.moveTo(L.x,L.y);c.arc(L.x,L.y,330,L.ang-0.35,L.ang+0.35);c.closePath();c.fill();
        c.fillStyle='#dfe9f5';c.beginPath();c.arc(L.x,L.y,8,0,Math.PI*2);c.fill();
      });
      // 山口（东侧目标）
      c.fillStyle='rgba(255,207,36,.18)';c.fillRect(1210,300,60,180);
      c.fillStyle='#ffcf24';c.font='12px sans-serif';c.fillText('山口 EXIT',1216,292);
      // 暗角
      const vig=c.createRadialGradient(640,360,280,640,360,800);
      vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.5)');c.fillStyle=vig;c.fillRect(0,0,1280,720);
    };
    let raf=0,last=0;
    const loop=now=>{if(closed)return;
      if(last&&s.status==='playing')this.step(s,Math.max(0,Math.min(.1,(now-last)/1000)),keys);
      last=now;draw();hud();
      if(s.status!=='playing')sync();
      raf=requestAnimationFrame(loop);};
    const keymap={arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
    const key=e=>{
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      const m=keymap[e.key.toLowerCase()];
      if(!m)return;e.preventDefault();
      keys[m]=e.type==='keydown';
    };
    dialog.addEventListener('keydown',key);dialog.addEventListener('keyup',key);
    /* 窗口失焦清键，防卡键（按住的移动键在切走后仍生效） */
    const clearKeys=()=>{keys.up=keys.down=keys.left=keys.right=false;};window.addEventListener('blur',clearKeys);document.addEventListener('visibilitychange',clearKeys);
    /* close 内已有 closed 守卫，blur 清理随 dialog.remove 后事件自然失效 */
    const sync=()=>{
      q('[data-start]').hidden=s.status!=='ready';
      q('[data-complete]').hidden=!(s.status==='won');
      if(s.status==='won')status('本章完成 · '+this.rating(s).rating);
      else if(s.status==='lost')status(s.reason);
    };
    q('[data-start]').onclick=()=>{s.status='playing';last=0;q('[data-start]').hidden=true;
      status('无声前行。收拢绿点散兵，岩石后可避探照。');cvFocus();};
    q('[data-retry]').onclick=()=>{s=create('march');this.session=s;keys={up:false,down:false,left:false,right:false};
      status('重新夜行。');q('[data-start]').hidden=false;sync();draw();};
    const cvFocus=()=>q('[data-field]').focus();
    let recorded=false;q('[data-complete]').onclick=()=>{try{if(s.status!=='won'||recorded||!current())return;recorded=true;this.persist(s,node&&node.id);status('成绩已记录。');close();if(typeof onComplete==='function')onComplete();}catch{}};
    const iv=setInterval(()=>{if(closed){clearInterval(iv);return;}sync();},400);
    draw();hud();q('[data-start]').focus();
    raf=requestAnimationFrame(loop);
    return true;
  }
  return{definitions,supports(id){return id==='march';},create,step,segCount,finish,rating,persist,style,open};
})();
