/* batch73 hardened: optional success-only, owner scoped, save before callback. */
/* 金色的鱼钩 · fishhook72 —— 第三批 P4（隔离区开发，待统一接线）
   两段式：A 垂钓 90 秒（缝衣针弯钩，无倒刺易脱钩）；B 分食（三名小战士 + 拒绝分配的老班长）。
   存档：storyPreparations['fishhook72_9'] 高分覆盖 + recordBattleScore(9) 。 */
window.Fishhook72={
  supports(id){return [9].includes(Number(id));},
  definitions:{
    9:{title:'金色的鱼钩',intro:'过草地时，炊事班长用缝衣针弯成鱼钩钓鱼，让三名小战士吃上鱼汤。先垂钓，再把鱼汤与青稞面分给三个孩子——老班长自己，永远不吃。',hist:'取材于统编教材课文《金色的鱼钩》：长征过草地，炊事班长照顾三名生病的小战士，用缝衣针弯成鱼钩钓鱼充饥，自己只嚼鱼骨、吃草根，最终长眠草地。本页人物均为抽象剪影，投掷物与数值均为教学设定。'}
  },
  kinds:{slow:{v:40,p:.9},mid:{v:70,p:.7},fast:{v:110,p:.45}},
  create(id,random){
    let seed=(Number(id)*7919+72)>>>0;const rnd=typeof random==='function'?random:()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const d=this.definitions[id]||this.definitions[9];
    const fish=[];for(let i=0;i<6;i++){const ks=Object.keys(this.kinds);const k=ks[i%3];fish.push({k,x:120+rnd()*1040,y:300+rnd()*320,dir:rnd()<.5?1:-1,scared:0});}
    return {id:Number(id),d,rnd,fish,bobber:{x:640},timeLeft:90,t:0,window:0,near:null,caught:0,casts:0,misses:0,scare:0,
      hunger:[3+Math.floor(rnd()*3),3+Math.floor(rnd()*3),3+Math.floor(rnd()*3)],
      soup:0,flour:2,alloc:[0,0,0],oldBan:0,msg:'鱼影靠近浮标时按 空格 拉杆。',phase:'fish',
      status:'ready',reason:'',accumulator:0};
  },
  nearBobber(s){return s.fish.find(f=>f.scared<=0&&Math.abs(f.x-s.bobber.x)<24&&f.y>240);},
  cast(s){
    if(s.status!=='playing')return false;
    if(s.phase!=='fish')return false;
    s.casts++;const f=s.window>0?s.near:null;
    if(!f){s.misses++;s.window=0;s.msg='拉杆落空，鱼影散开。';for(const x of s.fish)if(Math.abs(x.x-s.bobber.x)<90)x.scared=2;s.scare=2;return false;}
    if(s.rnd()<this.kinds[f.k].p){s.caught++;s.soup++;s.msg='钓上一尾！鱼汤 +1';s.window=0;s.near=null;s.fish=s.fish.filter(x=>x!==f);}
    else{s.misses++;s.window=0;s.near=null;s.msg='脱钩了——针弯的钩没有倒刺。';f.scared=2;s.scare=2;}
    return true;
  },
  give(s,i,kind){
    if(s.status!=='playing'||s.phase!=='share')return false;
    if(i===-1){s.oldBan++;s.msg='老班长摆摆手："我不饿，孩子们吃。"（分给老班长不计分）';return false;}
    if(kind==='soup'){if(s.soup<=0)return false;s.soup--;s.alloc[i]++;}
    else if(kind==='flour'){if(s.flour<=0)return false;s.flour--;s.alloc[i]++;}
    else return false;
    s.msg='递给孩子一碗。';return true;
  },
  confirmShare(s){
    if(s.status!=='playing'||s.phase!=='share')return false;
    const waste=(s.soup>0||s.flour>0)?0:10;
    const avg=(s.alloc[0]+s.alloc[1]+s.alloc[2])/3;
    const vari=Math.abs(s.alloc[0]-avg)+Math.abs(s.alloc[1]-avg)+Math.abs(s.alloc[2]-avg);
    const balance=Math.max(0,Math.round(30-vari*6));
    const fed=s.hunger.map((h,i)=>s.alloc[i]>=h?1:0).reduce((a,b)=>a+b,0);
    const score=Math.max(0,s.caught*10+balance+waste+fed*5-s.oldBan*2);
    s.share={balance,waste,fed};s.score=score;
    this.finish(s,score>=60,'三个孩子'+(fed===3?'都安定了':'还饿着')+'。'+(waste?'没有浪费一点食物。':'还剩下了食物。'));
    return true;
  },
  step(s,dt=1/120){
    if(s.status!=='playing')return;
    s.t+=dt;
    if(s.phase==='fish'){
      s.timeLeft-=dt;if(s.timeLeft<=0){s.timeLeft=0;this.toShare(s);return;}
      const mv=(s.keys&&s.keys.right?1:0)-(s.keys&&s.keys.left?1:0);
      s.bobber.x=Math.max(60,Math.min(1220,s.bobber.x+mv*300*dt));
      for(const f of s.fish){
        if(f.scared>0){f.scared-=dt;continue;}
        f.x+=this.kinds[f.k].v*f.dir*dt;
        if(f.x<60){f.x=60;f.dir=1;}if(f.x>1220){f.x=1220;f.dir=-1;}
      }
      s.near=this.nearBobber(s);
      s.window=s.near?Math.max(0,s.window-dt):0;
      if(s.window<=0&&s.near)s.window=.6;
      if(s.scare>0)s.scare-=dt;
    }
  },
  toShare(s){s.phase='share';s.msg='分食：按 1/2/3 把鱼汤递给孩子，按 4/5/6 递青稞面；Enter 确认开饭。';},
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.window=0;},
  advance(s,seconds,keys){s.keys=keys||s.keys;s.accumulator+=Math.max(0,Math.min(.1,seconds||0));let n=0;while(s.accumulator>=1/120&&n<24){this.step(s,1/120,s.keys);s.accumulator-=1/120;n++;}},
  rating(s){const sc=Number.isFinite(s.score)?s.score:0;return sc>=90?{score:sc,rating:'金色的鱼钩'}:sc>=75?{score:sc,rating:'针弯成钩'}:sc>=60?{score:sc,rating:'鱼汤暖营'}:{score:sc,rating:'塘边再试'};},
  muted(){return (typeof AudioControl43!=='undefined'&&AudioControl43.muted===true)||(()=>{try{return ['1','true'].includes(localStorage.getItem('cz_mute43'))}catch{return false}})();},
  paused(){return !!window.__czPaused||(typeof document!=='undefined'&&(document.hidden||!!document.querySelector?.('.decision-film-overlay,.npc-overlay.open,.experience-overlay')));},
  style(){
    if(document.getElementById('fishhook72-style'))return;
    const el=document.createElement('style');el.id='fishhook72-style';
    el.textContent='.fishhook72-dialog{width:min(1100px,96vw);max-width:96vw;background:#0e1620;color:#e8e2d2;border:1px solid #3a4a5a;border-radius:14px;padding:16px 18px;font:15px/1.5 \'Microsoft YaHei\',sans-serif}'
    +'.fishhook72-dialog h2{margin:0;font-size:clamp(19px,3vw,26px);color:#ead7ac}.fishhook72-dialog header{display:flex;justify-content:space-between;align-items:center;gap:10px}'
    +'.fishhook72-dialog button{font:inherit;min-height:44px;padding:8px 14px;background:#233648;color:#f4e6c6;border:1px solid #7d8fa5;border-radius:8px;cursor:pointer}'
    +'.fishhook72-dialog button:disabled{opacity:.45;cursor:default}.fishhook72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}'
    +'.fishhook72-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.fishhook72-note{font-size:13px;color:#b9c4c9;margin:6px 0}'
    +'.fishhook72-status{min-height:1.5em;color:#ffdea1;margin:4px 0}.fishhook72-dialog details{margin:6px 0;font-size:12px;color:#9fb2ba}'
    +'.fishhook72-dialog canvas{display:block;width:min(100%,calc(min(62dvh,720px)*1.77778));aspect-ratio:16/9;height:auto;margin:0 auto;background:#0a1420;touch-action:none;border-radius:8px;box-shadow:0 0 0 1px #2c3e4e}';
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='fishhook72-dialog';
    dialog.innerHTML='<header><div><h2>金色的鱼钩</h2><span class="xjg-sub" style="font-size:12px;letter-spacing:.18em;color:#8b8e93">GOLDEN FISH HOOK · 草地炊事</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="金色的鱼钩画面。鱼影靠近浮标按空格拉杆；随后把鱼汤与青稞面分给三名小战士，老班长不吃。"></canvas><p class="fishhook72-status" role="status" aria-live="polite"></p><div class="fishhook72-actions"><button data-start>开始垂钓 · FISH</button><button data-share hidden>收竿 · 进入分食</button><button data-pause disabled>暂停</button><button data-mute>声音</button><button data-retry>重来</button><button data-complete hidden>记录成绩 · 完成</button></div><p class="fishhook72-note">抽象剪影，无伤亡表现。钓鱼为教学推演。</p><details class="fishhook72-note"><summary>史实与练习说明</summary><p data-hist></p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');
    let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,recorded=false,manualPause=false;
    this.session=s;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
        const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);try{dialog.close()}catch{}dialog.remove();if(this.session===s)this.session=null;if(this.closeActive===close)this.closeActive=null;this.practiceMode73='normal';window.removeEventListener('blur',releaseKeys);document.removeEventListener('visibilitychange',releaseKeys);if(trigger?.isConnected)trigger.focus();};this.closeActive=close;dialog.addEventListener('close',close);
    q('[data-close]').onclick=close;
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    const keys={};const releaseKeys=()=>{for(const k of Object.keys(keys))delete keys[k];};window.addEventListener('blur',releaseKeys);document.addEventListener('visibilitychange',releaseKeys);const kd=e=>{
      if(e.key==='Escape'){close();return;}
      if(e.key===' '||e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key==='a'||e.key==='d'){e.preventDefault();}
      if(e.key===' ')this.cast(s);
      if(e.key==='ArrowLeft'||e.key==='a')keys.left=true;
      if(e.key==='ArrowRight'||e.key==='d')keys.right=true;
      if(s.phase==='share'){
        if(['1','2','3'].includes(e.key))this.give(s,Number(e.key)-1,'soup');
        if(['4','5','6'].includes(e.key))this.give(s,Number(e.key)-4,'flour');
        if(e.key==='0')this.give(s,-1,'soup');
        if(e.key==='Enter')this.confirmShare(s);
      }
      upd();
    };
    const ku=e=>{if(e.key==='ArrowLeft'||e.key==='a')keys.left=false;if(e.key==='ArrowRight'||e.key==='d')keys.right=false;};
    dialog.addEventListener('keydown',kd);dialog.addEventListener('keyup',ku);
    canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();if(s.phase==='fish'){s.bobber.x=(e.clientX-r.left)*1280/r.width;this.cast(s);}else{const i=Math.floor(((e.clientX-r.left)*1280/r.width-340)/200);if(i>=0&&i<3)this.give(s,i,e.shiftKey?'flour':'soup');}upd();});
    q('[data-start]').onclick=()=>{s.status='playing';q('[data-start]').disabled=true;q('[data-pause]').disabled=false;q('[data-share]').hidden=false;canvas.focus();upd();};
    q('[data-share]').onclick=()=>{if(s.phase==='fish')this.toShare(s);upd();};
    q('[data-pause]').onclick=e=>{manualPause=!manualPause;e.target.textContent=manualPause?'继续':'暂停';};
    q('[data-mute]').onclick=()=>{try{localStorage.setItem('cz_mute43',this.muted()?'0':'1')}catch{};upd();};
    q('[data-retry]').onclick=()=>{retries++;s=this.create(node.id);recorded=false;this.session=s;q('[data-start]').disabled=false;q('[data-pause]').disabled=true;q('[data-complete]').hidden=true;q('[data-share]').hidden=true;manualPause=false;upd();};
    q('[data-complete]').onclick=()=>{if(closed||recorded||s.status!=='won'||!current())return;const result=this.rating(s);if(!window.StarfireBook73?.record('fish',node.id,result,s)){if(typeof GameUI!=='undefined')GameUI.showToast('成绩未保存，请从正式入口打开或稍后重试。');return;}recorded=true;close();onComplete?.({won:true,...result});};
    const draw=()=>{
      ctx.fillStyle='#0a1420';ctx.fillRect(0,0,1280,720);
      if(s.phase==='fish'){
        /* 水面 */
        const g=ctx.createLinearGradient(0,220,0,720);g.addColorStop(0,'#12283c');g.addColorStop(1,'#0a1a28');ctx.fillStyle=g;ctx.fillRect(0,220,1280,500);
        ctx.strokeStyle='rgba(126,203,255,.15)';ctx.lineWidth=1;for(let y=250;y<700;y+=46){ctx.beginPath();for(let x=0;x<=1280;x+=64){const off=Math.sin((x*.02)+(y*.1)+s.t*1.4)*5;ctx.lineTo(x,y+off);}ctx.stroke();}
        for(const f of s.fish){const fy=f.y+Math.sin(s.t*2+f.x*.01)*4;if(f.scared>0)continue;ctx.fillStyle=f.k==='fast'?'#3d6d8c':f.k==='mid'?'#35607d':'#2d5470';ctx.beginPath();ctx.ellipse(f.x,fy,26*(f.k==='fast'?1:f.k==='mid'?.9:.8),10,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(f.x+20*f.dir,fy);ctx.lineTo(f.x+34*f.dir,fy-8);ctx.lineTo(f.x+34*f.dir,fy+8);ctx.closePath();ctx.fill();}
        /* 浮标 */
        const by=214;ctx.strokeStyle='#8b6d3f';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s.bobber.x,by);ctx.lineTo(s.bobber.x,by+44);ctx.stroke();
        ctx.fillStyle=s.window>0?'#ffcf24':'#e5484d';ctx.beginPath();ctx.arc(s.bobber.x,by+50,8,0,Math.PI*2);ctx.fill();
        if(s.window>0){ctx.fillStyle='#ffdea1';ctx.font='bold 13px sans-serif';ctx.fillText('拉杆！',s.bobber.x+14,by+40);}
      }else{
        /* 分食：三个小战士 + 老班长 */
        for(let i=0;i<3;i++){const x=340+i*200;ctx.fillStyle='rgba(13,20,30,.9)';this.cutP(ctx,x,300,180,220,12);ctx.fill();ctx.strokeStyle='#3a4a5a';this.cutP(ctx,x,300,180,220,12);ctx.stroke();
          ctx.fillStyle='#9fc3d8';ctx.font='bold 15px sans-serif';ctx.fillText('小战士 '+(i+1),x+18,332);
          const lv=Math.min(3,s.alloc[i]);ctx.fillStyle=lv>=s.hunger[i]?'#7dc47f':'#ffcf24';for(let k=0;k<Math.min(6,Math.max(lv,1));k++)ctx.fillRect(x+18+k*22,344,16,10);
          ctx.fillStyle='#5f88a5';ctx.beginPath();ctx.arc(x+90,420,26,0,Math.PI*2);ctx.fill();ctx.fillRect(x+62,444,56,60);
          ctx.fillStyle='#0a1420';ctx.fillRect(x+80,458,20,26);}
        ctx.fillStyle='rgba(13,20,30,.9)';this.cutP(ctx,950,300,260,220,12);ctx.fill();ctx.strokeStyle='#8b6d3f';this.cutP(ctx,950,300,260,220,12);ctx.stroke();
        ctx.fillStyle='#ead7ac';ctx.font='bold 15px sans-serif';ctx.fillText('老班长（不吃）',968,332);
        ctx.fillStyle='#c9b48a';ctx.beginPath();ctx.arc(1078,420,28,0,Math.PI*2);ctx.fill();ctx.fillRect(1048,446,60,64);
        ctx.fillStyle='#ffcf24';ctx.font='13px sans-serif';ctx.fillText('把鱼汤留给孩子',968,540);
      }
      /* HUD 左上：鱼获/时刻；右上：阶段 */
      ctx.fillStyle='rgba(13,14,16,.9)';this.cutP(ctx,16,14,300,86,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;this.cutP(ctx,16,14,300,86,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(16,14,3,86);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('草地炊事',34,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText('CAMP COOK',110,36);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText(s.phase==='fish'?'鱼获 FISH':'鱼汤 SOUP',34,60);ctx.fillStyle='#7ecbff';ctx.font='900 16px sans-serif';ctx.fillText(String(s.phase==='fish'?s.caught:s.soup),200,60);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText(s.phase==='fish'?'时刻 TIME':'青稞面 FLOUR',34,84);ctx.fillStyle='#ffcf24';ctx.font='900 16px sans-serif';ctx.fillText(s.phase==='fish'?Math.ceil(s.timeLeft)+'s':String(s.flour),200,84);
      ctx.fillStyle='rgba(13,14,16,.9)';this.cutP(ctx,966,14,298,86,12);ctx.fill();ctx.strokeStyle='#4a4d52';this.cutP(ctx,966,14,298,86,12);ctx.stroke();ctx.fillStyle='#e5484d';ctx.fillRect(966,14,3,86);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText(s.phase==='fish'?'缝衣针弯钩':'分食时刻',984,36);ctx.fillStyle='#8b8e93';ctx.font='11px sans-serif';ctx.fillText(s.phase==='fish'?'BENT NEEDLE HOOK':'SHARE THE SOUP',1094,36);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('脱钩 MISS',984,60);ctx.fillStyle='#e5484d';ctx.font='900 16px sans-serif';ctx.fillText(String(s.misses),1140,60);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('老班长拒收',984,84);ctx.fillStyle='#ead7ac';ctx.font='900 16px sans-serif';ctx.fillText(String(s.oldBan),1140,84);
      /* 底部说明底衬 */
      ctx.fillStyle='rgba(13,14,16,.78)';this.cutP(ctx,16,678,300,28,8);ctx.fill();ctx.font='12px sans-serif';ctx.fillStyle='#d3d6db';ctx.fillText('抽象剪影 · 教学推演 · 无伤亡表现',30,696);
      if(s.status==='won'||s.status==='lost'){ctx.fillStyle='rgba(6,8,10,.55)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(13,14,16,.92)';ctx.fillRect(320,250,640,180);ctx.strokeStyle=s.status==='won'?'#ffcf24':'#e5484d';ctx.lineWidth=2;ctx.strokeRect(320,250,640,180);
        ctx.textAlign='center';ctx.fillStyle='#ffcf24';ctx.font='bold 40px sans-serif';ctx.fillText(this.rating(s).rating,640,318);
        ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(this.rating(s).score+' 分',640,356);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText(s.reason,640,386);ctx.textAlign='left';}
    };
    const upd=()=>{q('.fishhook72-status').textContent=s.msg+(s.status==='won'||s.status==='lost'?' —— 可记录成绩。':'');
      if(s.status==='won'||s.status==='lost'){q('[data-complete]').hidden=s.status!=='won';q('[data-share]').hidden=true;}};
    const frame=now=>{if(closed)return;if(!current()||!dialog.isConnected){close();return;}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000,keys);
      last=now;draw();upd();raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);upd();
    return true;
  },
  cutP(ctx,x,y,w,h,n){ctx.beginPath();ctx.moveTo(x+n,y);ctx.lineTo(x+w-n,y);ctx.lineTo(x+w,y+n);ctx.lineTo(x+w,y+h-n);ctx.lineTo(x+w-n,y+h);ctx.lineTo(x+n,y+h);ctx.lineTo(x,y+h-n);ctx.lineTo(x,y+n);ctx.closePath();},
  close(){this.closeActive?.();}
};
