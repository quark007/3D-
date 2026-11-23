/* batch73 hardened: optional success-only, owner scoped, save before callback. */
/* 苟坝马灯 · 夜路寻道 lantern72 —— 第三批 P1（隔离区开发，待统一接线）
   视野半径解谜：光圈 140px 每 15 秒缩 8%，两处添油恢复；5 史料点、3 说服要点 QTE、3 死路折返计次。
   挂接：四渡赤水节点(4)。存档：storyPreparations['lantern72_4'] + recordBattleScore(4)。 */
window.Lantern72={
  supports(id){return [4].includes(Number(id));},
  ROAD:[[80,600],[300,480],[560,520],[820,380],[1120,300]],
  BRANCHES:[{from:0,to:[380,300]},{from:1,to:[700,620]},{from:2,to:[950,520]}],
  RELICS:[[214,540,'先核对材料出处。'],[340,390,'听取不同意见。'],[630,570,'把推测标注为推测。'],[885,450,'对照信息，再作研判。'],[970,560,'在研学中重新回望选择。']],
  OIL:[[560,520],[820,380]],
  STONES:[{x:980,y:340,seq:['ArrowUp','ArrowUp','ArrowDown'],label:'敌情有变'},{x:1040,y:320,seq:['ArrowLeft','ArrowRight','ArrowUp'],label:'集中兵力'},{x:1085,y:300,seq:['ArrowDown','ArrowDown','ArrowUp'],label:'慎重初战'}],
  GOAL:{x:1150,y:280},
  create(id,random){
    return {id:Number(id),x:80,y:600,r:140,t:0,timeLeft:90,relics:0,relicGot:RELIC_MARKER(),stones:0,stoneLit:[false,false,false],
      qte:null,qteIdx:0,foldbacks:0,inBranch:BRANCH_MARKER(),oilUsed:[false,false],
      status:'ready',reason:'',keys:{},accumulator:0,msg:'提灯夜行：WASD/方向键移动，靠近石碑按 E。'};
    function RELIC_MARKER(){return [false,false,false,false,false];}
    function BRANCH_MARKER(){return [false,false,false];}
  },
  step(s,dt=1/120){
    if(s.status!=='playing')return;
    s.t+=dt;s.timeLeft-=dt;
    if(s.timeLeft<=0){s.timeLeft=0;this.finish(s,false,'夜太深，没能赶到小院。');return;}
    s.r=140*Math.pow(.92,Math.floor(s.t/15));
    const v=160*dt;let dx=0,dy=0;
    if(s.keys.up)dy-=1;if(s.keys.down)dy+=1;if(s.keys.left)dx-=1;if(s.keys.right)dx+=1;
    if(dx||dy){const l=Math.hypot(dx,dy);s.x+=dx/l*v;s.y+=dy/l*v;}
    s.x=Math.max(20,Math.min(1260,s.x));s.y=Math.max(20,Math.min(700,s.y));
    for(let i=0;i<this.RELICS.length;i++)if(!s.relicGot[i]&&Math.hypot(s.x-this.RELICS[i][0],s.y-this.RELICS[i][1])<50){s.relicGot[i]=true;s.relics++;s.msg='研学线索：'+this.RELICS[i][2];}
    for(let i=0;i<this.OIL.length;i++)if(!s.oilUsed[i]&&Math.hypot(s.x-this.OIL[i][0],s.y-this.OIL[i][1])<40){s.oilUsed[i]=true;s.t=0;s.msg='添灯油——光圈复明。';}
    for(let i=0;i<this.BRANCHES.length;i++){const b=this.BRANCHES[i];const near=Math.hypot(s.x-b.to[0],s.y-b.to[1])<46;
      if(near&&!s.inBranch[i]){s.inBranch[i]=true;s.foldbacks++;s.msg='此路不通，须折返。';}
      if(!near&&Math.hypot(s.x-b.to[0],s.y-b.to[1])>120)s.inBranch[i]=false;}
    if(s.qte){s.qte.left-=dt;if(s.qte.left<=0){s.qte=null;s.qteIdx=0;s.msg='迟了——再试一次。';}}
    if(s.stones>=3&&Math.hypot(s.x-this.GOAL.x,s.y-this.GOAL.y)<50){
      const score=this.calcScore(s);this.finish(s,score>=60,'赶到小院，灯还亮着。');}
  },
  calcScore(s){return Math.max(0,Math.round(60+s.relics*5+s.stones*6+s.timeLeft*.5-s.foldbacks*3));},
  interact(s){
    if(s.status!=='playing')return false;
    for(let i=0;i<this.STONES.length;i++){const st=this.STONES[i];
      if(!s.stoneLit[i]&&Math.hypot(s.x-st.x,s.y-st.y)<52){
        if(!s.qte){s.qte={i,left:2.5};s.qteIdx=0;s.msg='按提示键序：'+st.seq.map(k=>({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'}[k])).join(' ');}
        return true;}}
    return false;
  },
  qteKey(s,key){
    if(!s.qte)return false;const st=this.STONES[s.qte.i];
    if(st.seq[s.qteIdx]===key){s.qteIdx++;s.qte.left=Math.min(s.qte.left+.4,2.5);
      if(s.qteIdx>=st.seq.length){s.stoneLit[s.qte.i]=true;s.stones++;s.qte=null;s.qteIdx=0;s.msg='点亮「'+st.label+'」。';}
      return true;}
    s.qte=null;s.qteIdx=0;s.msg='键序错了——重新靠近再试。';return false;
  },
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.score=this.calcScore(s);},
  advance(s,seconds,keys){s.keys=keys||s.keys;s.accumulator+=Math.max(0,Math.min(.1,seconds||0));let n=0;while(s.accumulator>=1/120&&n<24){this.step(s,1/120,s.keys);s.accumulator-=1/120;n++;}},
  rating(s){const sc=Number.isFinite(s.score)?s.score:0;return sc>=90?{score:sc,rating:'灯下之悟'}:sc>=75?{score:sc,rating:'夜路坚定'}:sc>=60?{score:sc,rating:'星火不灭'}:{score:sc,rating:'重新提灯'};},
  muted(){return (typeof AudioControl43!=='undefined'&&AudioControl43.muted===true)||(()=>{try{return ['1','true'].includes(localStorage.getItem('cz_mute43'))}catch{return false}})();},
  paused(){return !!window.__czPaused||(typeof document!=='undefined'&&(document.hidden||!!document.querySelector?.('.decision-film-overlay,.npc-overlay.open,.experience-overlay')));},
  style(){
    if(document.getElementById('lantern72-style'))return;
    const el=document.createElement('style');el.id='lantern72-style';
    el.textContent='.lantern72-dialog{width:min(1100px,96vw);max-width:96vw;background:#070a0d;color:#d8cdb5;border:1px solid #4a4030;border-radius:14px;padding:16px 18px;font:15px/1.5 \'Microsoft YaHei\',sans-serif}'
    +'.lantern72-dialog h2{margin:0;font-size:clamp(19px,3vw,26px);color:#e8c87a}.lantern72-dialog header{display:flex;justify-content:space-between;align-items:center;gap:10px}'
    +'.lantern72-dialog button{font:inherit;min-height:44px;padding:8px 14px;background:#2a2416;color:#f0dfae;border:1px solid #8a7440;border-radius:8px;cursor:pointer}'
    +'.lantern72-dialog button:disabled{opacity:.45}.lantern72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}'
    +'.lantern72-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.lantern72-note{font-size:13px;color:#a89878;margin:6px 0}.lantern72-status{min-height:1.5em;color:#ffe9a1;margin:4px 0}'
    +'.lantern72-dialog details{margin:6px 0;font-size:12px;color:#94835f}'
    +'.lantern72-dialog canvas{display:block;width:min(100%,calc(min(62dvh,720px)*1.77778));aspect-ratio:16/9;height:auto;margin:0 auto;background:#05070a;touch-action:none;border-radius:8px;box-shadow:0 0 0 1px #3c3626}';
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='lantern72-dialog';
    dialog.innerHTML='<header><div><h2>苟坝马灯 · 夜路</h2><span class="xjg-sub" style="font-size:12px;letter-spacing:.18em;color:#94835f">GOUBA LANTERN · 1935</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="苟坝马灯夜路画面。方向键移动，靠近石碑按 E 完成键序，点亮三个说服要点后抵达小院。"></canvas><p class="lantern72-status" role="status" aria-live="polite"></p><div class="lantern72-actions"><button data-start>提灯出发 · GO</button><button data-pause disabled>暂停</button><button data-retry>重新提灯</button><button data-complete hidden>记录成绩 · 完成</button></div><p class="lantern72-note">抽象剪影，无伤亡表现。</p><details class="lantern72-note"><summary>史实与练习说明</summary><p data-hist></p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');
    let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,recorded=false,manualPause=false;
    this.session=s;
    q('[data-intro]').textContent='1935 年 3 月，苟坝。多数人主张进攻打鼓新场，毛泽东同志深夜提马灯走小道去说服周恩来。灯油有限，路要靠自己照亮。';
    q('[data-hist]').textContent='苟坝会议（1935 年 3 月 10-12 日）：讨论是否进攻打鼓新场，毛泽东同志独持异议，深夜提马灯走访周恩来，次日会议撤销进攻计划。本页地形与数值为教学设定。';
        const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);try{dialog.close()}catch{}dialog.remove();if(this.session===s)this.session=null;if(this.closeActive===close)this.closeActive=null;this.practiceMode73='normal';if(trigger?.isConnected)trigger.focus();};this.closeActive=close;dialog.addEventListener('close',close);
    q('[data-close]').onclick=close;
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    const KEYMAP={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right'};
    const kd=e=>{
      if(e.key==='Escape'){close();return;}
      if(s.qte){if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();this.qteKey(s,e.key);upd();return;}}
      if(KEYMAP[e.key]){e.preventDefault();s.keys[KEYMAP[e.key]]=true;}
      if(e.key==='e'||e.key==='E'||e.key===' ')this.interact(s);
      upd();};
    const ku=e=>{if(KEYMAP[e.key])s.keys[KEYMAP[e.key]]=false;};
    dialog.addEventListener('keydown',kd);dialog.addEventListener('keyup',ku);
    canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)*1280/r.width,y=(e.clientY-r.top)*720/r.height;
      for(const st of this.STONES)if(Math.hypot(s.x-st.x,s.y-st.y)<52){this.interact(s);} });
    q('[data-start]').onclick=()=>{s.status='playing';q('[data-start]').disabled=true;q('[data-pause]').disabled=false;canvas.focus();upd();};
    q('[data-pause]').onclick=e=>{manualPause=!manualPause;e.target.textContent=manualPause?'继续':'暂停';};
    q('[data-retry]').onclick=()=>{retries++;s=this.create(node.id);recorded=false;this.session=s;q('[data-start]').disabled=false;q('[data-pause]').disabled=true;q('[data-complete]').hidden=true;manualPause=false;upd();};
    q('[data-complete]').onclick=()=>{if(closed||recorded||s.status!=='won'||!current())return;const result=this.rating(s);if(!window.StarfireBook73?.record('lantern',node.id,result,s)){if(typeof GameUI!=='undefined')GameUI.showToast('成绩未保存，请从正式入口打开或稍后重试。');return;}recorded=true;close();onComplete?.({won:true,...result});};
    const seg=(a,b)=>{ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();};
    const draw=()=>{
      ctx.fillStyle='#05070a';ctx.fillRect(0,0,1280,720);
      /* 光圈内的世界 */
      ctx.save();
      const g=ctx.createRadialGradient(s.x,s.y,10,s.x,s.y,Math.max(30,s.r));
      g.addColorStop(0,'rgba(255,217,160,.32)');g.addColorStop(.7,'rgba(120,90,40,.10)');g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.beginPath();ctx.arc(s.x,s.y,Math.max(30,s.r),0,Math.PI*2);ctx.clip();
      ctx.fillStyle='#0d1210';ctx.fillRect(0,0,1280,720);
      ctx.strokeStyle='#6b5a34';ctx.lineWidth=26;ctx.lineCap='round';
      for(let i=0;i<this.ROAD.length-1;i++)seg(this.ROAD[i],this.ROAD[i+1]);
      ctx.strokeStyle='#4a3f28';ctx.lineWidth=18;
      for(const b of this.BRANCHES)seg(this.ROAD[b.from],b.to);
      ctx.fillStyle='#3a4a3a';
      for(let k=0;k<26;k++){const fx=(k*173)%1280,fy=(k*97)%720;if(Math.hypot(fx-s.x,fy-s.y)<s.r+40)ctx.fillRect(fx,fy,3,3);}
      for(let i=0;i<this.RELICS.length;i++)if(!s.relicGot[i]&&Math.hypot(this.RELICS[i][0]-s.x,this.RELICS[i][1]-s.y)<s.r){
        ctx.fillStyle='#e8c87a';ctx.beginPath();ctx.arc(this.RELICS[i][0],this.RELICS[i][1],8,0,Math.PI*2);ctx.fill();}
      for(let i=0;i<this.OIL.length;i++)if(!s.oilUsed[i]&&Math.hypot(this.OIL[i][0]-s.x,this.OIL[i][1]-s.y)<s.r){
        ctx.fillStyle='#ffcf24';ctx.fillRect(this.OIL[i][0]-7,this.OIL[i][1]-9,14,18);ctx.fillStyle='#8a7440';ctx.fillRect(this.OIL[i][0]-3,this.OIL[i][1]-14,6,5);}
      for(let i=0;i<this.STONES.length;i++){const st=this.STONES[i];
        if(Math.hypot(st.x-s.x,st.y-s.y)<s.r){ctx.fillStyle=s.stoneLit[i]?'#ffd9a0':'#5a5648';ctx.fillRect(st.x-12,st.y-34,24,34);
          if(s.stoneLit[i]){ctx.fillStyle='rgba(255,207,36,.5)';ctx.beginPath();ctx.arc(st.x,st.y-44,10,0,Math.PI*2);ctx.fill();}}}
      if(s.stones>=3&&Math.hypot(this.GOAL.x-s.x,this.GOAL.y-s.y)<s.r){
        ctx.fillStyle='#1a2430';ctx.fillRect(this.GOAL.x-30,this.GOAL.y-46,60,46);
        ctx.fillStyle='#ffd9a0';ctx.fillRect(this.GOAL.x-4,this.GOAL.y-40,8,20);ctx.fillRect(this.GOAL.x-16,this.GOAL.y-28,32,5);}
      ctx.restore();
      /* 光晕本体 */
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(s.x,s.y,Math.max(30,s.r),0,Math.PI*2);ctx.fill();
      /* 提灯人剪影 */
      ctx.fillStyle='#0a0c08';ctx.beginPath();ctx.arc(s.x,s.y-14,9,0,Math.PI*2);ctx.fill();ctx.fillRect(s.x-7,s.y-6,14,22);
      ctx.fillStyle='#ffcf24';ctx.fillRect(s.x+6,s.y-10,6,8);
      /* HUD */
      ctx.fillStyle='rgba(13,14,16,.9)';ctx.beginPath();ctx.moveTo(28,22);ctx.lineTo(330,22);ctx.lineTo(330,108);ctx.lineTo(40,108);ctx.lineTo(28,96);ctx.closePath();ctx.fill();
      ctx.fillStyle='#e8c87a';ctx.fillRect(28,22,3,86);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('苟坝夜路',46,44);ctx.fillStyle='#94835f';ctx.font='11px sans-serif';ctx.fillText('NIGHT PATH',124,44);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('灯油 OIL',46,72);
      ctx.fillStyle='#1a1c20';ctx.fillRect(120,62,150,12);ctx.fillStyle='#ffcf24';ctx.fillRect(120,62,150*Math.max(0,(s.r/140)),12);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('史料 RELICS',46,96);ctx.fillStyle='#7ecbff';ctx.font='900 15px sans-serif';ctx.fillText(s.relics+' / 5',130,96);
      ctx.fillStyle='rgba(13,14,16,.9)';ctx.beginPath();ctx.moveTo(950,22);ctx.lineTo(1252,22);ctx.lineTo(1252,108);ctx.lineTo(962,108);ctx.lineTo(950,96);ctx.closePath();ctx.fill();
      ctx.fillStyle='#e5484d';ctx.fillRect(950,22,3,86);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('夜行进度',968,44);ctx.fillStyle='#94835f';ctx.font='11px sans-serif';ctx.fillText('MARCH',1052,44);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('要点 STONES',968,72);ctx.fillStyle='#ffd9a0';ctx.font='900 15px sans-serif';ctx.fillText(s.stones+' / 3',1072,72);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('时刻 TIME',968,96);ctx.fillStyle=s.timeLeft<15?'#e5484d':'#ffcf24';ctx.font='900 15px sans-serif';ctx.fillText(Math.ceil(s.timeLeft)+'s',1072,96);
      /* QTE 提示 */
      if(s.qte){const st=this.STONES[s.qte.i];ctx.fillStyle='rgba(13,14,16,.9)';ctx.fillRect(540,150,200,54);
        ctx.textAlign='center';ctx.fillStyle='#ffd9a0';ctx.font='bold 13px sans-serif';ctx.fillText('「'+st.label+'」键序：',640,172);
        ctx.fillStyle='#ffcf24';ctx.font='900 20px sans-serif';
        ctx.fillText(st.seq.slice(0,s.qteIdx).map(k=>({ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'}[k])).join(' ')+'  '+st.seq.slice(s.qteIdx).map(k=>'·').join(' '),640,196);ctx.textAlign='left';}
      if(s.status==='won'||s.status==='lost'){ctx.fillStyle='rgba(2,3,5,.7)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(10,12,14,.94)';ctx.fillRect(320,250,640,180);ctx.strokeStyle=s.status==='won'?'#ffcf24':'#e5484d';ctx.lineWidth=2;ctx.strokeRect(320,250,640,180);
        ctx.textAlign='center';ctx.fillStyle='#ffd9a0';ctx.font='bold 40px sans-serif';ctx.fillText(this.rating(s).rating,640,318);
        ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(this.rating(s).score+' 分',640,356);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText(s.reason,640,386);ctx.textAlign='left';}
    };
    const upd=()=>{q('.lantern72-status').textContent=s.msg||'';
      q('[data-complete]').hidden=s.status!=='won';};
    const frame=now=>{if(closed)return;if(!current()||!dialog.isConnected){close();return;}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000,s.keys);
      last=now;draw();upd();raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);upd();
    return true;
  },
  close(){this.closeActive?.();}
};
