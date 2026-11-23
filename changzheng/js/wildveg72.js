/* fictional data cards73: no appearance-based edibility rules. */
/* batch73 hardened: optional success-only, owner scoped, save before callback. */
/* 草地食堂 · 野菜辨识 wildveg72 —— 第三批 P5（隔离区开发，待统一接线）
   60 秒 12 题快答：资料完整 / 等待核对 / 标记风险。体力 5 格，答错扣 1。
   合规角标常驻：现实中请勿依据本游戏辨识野菜。
   存档：storyPreparations['wildveg72_9'] 高分覆盖 + recordBattleScore(9)。 */
window.Wildveg72={
  supports(id){return [9].includes(Number(id));},
  PLANTS:[{"n":"荠菜 · 教学资料","en":"SHEPHERD'S PURSE","lv":"safe","hint":"本关资料标记 A：资料条目完整","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"灰灰菜 · 教学资料","en":"GOOSEFOOT","lv":"cooked","hint":"本关资料标记 B：出处还需核对","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"苦菜 · 教学资料","en":"BITTER HERB","lv":"safe","hint":"本关资料标记 A：资料条目完整","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"车前草 · 教学资料","en":"PLANTAIN","lv":"cooked","hint":"本关资料标记 B：出处还需核对","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"马齿苋 · 教学资料","en":"PURSLANE","lv":"cooked","hint":"本关资料标记 B：出处还需核对","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"断肠草 · 教学资料","en":"GELSEMIUM","lv":"poison","hint":"本关资料标记 C：记录不足，应标记风险","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"毒芹 · 教学资料","en":"POISON HEMLOCK","lv":"poison","hint":"本关资料标记 C：记录不足，应标记风险","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"乌头 · 教学资料","en":"ACONITE","lv":"poison","hint":"本关资料标记 C：记录不足，应标记风险","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"曼陀罗 · 教学资料","en":"DATURA","lv":"poison","hint":"本关资料标记 C：记录不足，应标记风险","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"野芹菜 · 教学资料","en":"WILD CELERY","lv":"cooked","hint":"本关资料标记 B：出处还需核对","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"蒲公英 · 教学资料","en":"DANDELION","lv":"safe","hint":"本关资料标记 A：资料条目完整","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"野韭菜 · 教学资料","en":"WILD CHIVE","lv":"safe","hint":"本关资料标记 A：资料条目完整","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"蕨菜 · 教学资料","en":"FIDDLEHEAD","lv":"cooked","hint":"本关资料标记 B：出处还需核对","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"},{"n":"蘑菇 · 教学资料","en":"MUSHROOM","lv":"poison","hint":"本关资料标记 C：记录不足，应标记风险","hist":"这是虚构资料分组，不表示现实植物的可食性；图形不是鉴定图。"}],
  OPTIONS:['资料完整','等待核对','标记风险'],
  DISCLAIMER:'原创资料分类练习：不代表现实植物的可食性。现实中请勿依据本游戏辨识野菜。',
  create(id,random){
    let seed=(Number(id)*104729+720)>>>0;const rnd=typeof random==='function'?random:()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    const pool=[...this.PLANTS];const deck=[];
    while(deck.length<12&&pool.length){deck.push(pool.splice(Math.floor(rnd()*pool.length),1)[0]);}
    return {id:Number(id),rnd,deck,idx:0,stamina:5,combo:0,score:0,correct:0,timeLeft:60,t:0,status:'ready',reason:'',lastAnswer:null,accumulator:0};
  },
  answer(s,choice){
    if(s.status!=='playing')return false;
    const card=s.deck[s.idx];if(!card)return false;
    const correct=choice==='eat'&&card.lv==='safe'||choice==='cook'&&card.lv==='cooked'||choice==='avoid'&&card.lv==='poison';
    s.lastAnswer={card,choice,correct};
    if(correct){s.combo++;s.correct++;const bonus=Math.min(10,(s.combo-1)*2);s.score+=10+bonus;s.msg='答对：'+card.n+'。'+card.hint;}
    else{s.combo=0;s.stamina--;s.score=Math.max(0,s.score-15);s.msg='答错：'+card.n+' 应'+(card.lv==='safe'?'资料完整':card.lv==='cooked'?'等待核对':'标记风险')+'。'+card.hint;}
    s.idx++;
    if(s.stamina<=0)this.finish(s,false,'资料核对次数不足，请重新研读卡片。');
    else if(s.idx>=s.deck.length)this.finish(s,true,'十二份资料核对完成，已整理研学记录。');
    return correct;
  },
  finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;},
  step(s,dt=1/120){if(s.status!=='playing')return;s.t+=dt;s.timeLeft-=dt;if(s.timeLeft<=0){s.timeLeft=0;this.finish(s,s.stamina>0,'时间到。'+(s.stamina>0?'保住了体力。':''));}},
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.1,seconds||0));let n=0;while(s.accumulator>=1/120&&n<24){this.step(s,1/120);s.accumulator-=1/120;n++;}},
  rating(s){const sc=Math.max(0,s.score);return sc>=90?{score:sc,rating:'百草明辨'}:sc>=75?{score:sc,rating:'慎食安营'}:sc>=60?{score:sc,rating:'饥不择食之戒'}:{score:sc,rating:'重新辨识'};},
  muted(){return (typeof AudioControl43!=='undefined'&&AudioControl43.muted===true)||(()=>{try{return ['1','true'].includes(localStorage.getItem('cz_mute43'))}catch{return false}})();},
  paused(){return !!window.__czPaused||(typeof document!=='undefined'&&(document.hidden||!!document.querySelector?.('.decision-film-overlay,.npc-overlay.open,.experience-overlay')));},
  style(){
    if(document.getElementById('wildveg72-style'))return;
    const el=document.createElement('style');el.id='wildveg72-style';
    el.textContent='.wildveg72-dialog{width:min(1040px,96vw);max-width:96vw;background:#101a12;color:#e2e8d2;border:1px solid #3f5a44;border-radius:14px;padding:16px 18px;font:15px/1.5 \'Microsoft YaHei\',sans-serif}'
    +'.wildveg72-dialog h2{margin:0;font-size:clamp(19px,3vw,26px);color:#d8e6b8}.wildveg72-dialog header{display:flex;justify-content:space-between;align-items:center;gap:10px}'
    +'.wildveg72-dialog button{font:inherit;min-height:44px;padding:8px 14px;background:#22381f;color:#e8f0d8;border:1px solid #6f8a5f;border-radius:8px;cursor:pointer}'
    +'.wildveg72-dialog button:disabled{opacity:.45}.wildveg72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}'
    +'.wildveg72-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.wildveg72-opts{display:flex;gap:10px;justify-content:center;margin:10px 0}'
    +'.wildveg72-opts button{font-size:17px;padding:10px 22px}.wildveg72-note{font-size:13px;color:#a8b89a;margin:6px 0}.wildveg72-status{min-height:1.5em;color:#ffe9a1;margin:4px 0}'
    +'.wildveg72-dialog details{margin:6px 0;font-size:12px;color:#93a68d}.wildveg72-disc{font-size:12px;color:#ffd9a1;background:rgba(13,14,16,.78);padding:4px 10px;border-radius:6px;display:inline-block}'
    +'.wildveg72-dialog canvas{display:block;width:min(100%,calc(min(62dvh,720px)*1.77778));aspect-ratio:16/9;height:auto;margin:0 auto;background:#0c140e;touch-action:none;border-radius:8px;box-shadow:0 0 0 1px #2c3e2e}';
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='wildveg72-dialog';
    dialog.innerHTML='<header><div><h2>草地食堂 · 野菜辨识</h2><span class="xjg-sub" style="font-size:12px;letter-spacing:.18em;color:#8b9e8b">GRASSLAND MESS · 慎食</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="野菜辨识画面。判断植物是资料完整、等待核对还是标记风险。"></canvas><p class="wildveg72-status" role="status" aria-live="polite"></p><div class="wildveg72-opts"><button data-opt="eat">资料完整 · 1</button><button data-opt="cook">等待核对 · 2</button><button data-opt="avoid">标记风险 · 3</button></div><div class="wildveg72-actions"><button data-start>开始辨识 · QUIZ</button><button data-pause disabled>暂停</button><button data-retry>重来</button><button data-complete hidden>记录成绩 · 完成</button></div><p class="wildveg72-disc"></p><details class="wildveg72-note"><summary>史实与练习说明</summary><p data-hist></p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');
    let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,recorded=false,manualPause=false;
    this.session=s;
    q('[data-intro]').textContent='60 秒 12 题：阅读资料标记，归入资料完整、等待核对或标记风险。答错扣体力，体力耗尽即失败。';
    q('.wildveg72-disc').textContent=this.DISCLAIMER;
    q('[data-hist]').textContent='红军过草地靠野菜充饥，也有人因误食毒草牺牲。本题库为教学设定，分类标签仅用于本关资料练习。';
        const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);try{dialog.close()}catch{}dialog.remove();if(this.session===s)this.session=null;if(this.closeActive===close)this.closeActive=null;this.practiceMode73='normal';if(trigger?.isConnected)trigger.focus();};this.closeActive=close;dialog.addEventListener('close',close);
    q('[data-close]').onclick=close;
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    const kd=e=>{if(e.key==='Escape'){close();return;}
      if(s.status==='playing'){if(e.key==='1')this.answer(s,'eat');if(e.key==='2')this.answer(s,'cook');if(e.key==='3')this.answer(s,'avoid');upd();}};
    dialog.addEventListener('keydown',kd);
    for(const b of dialog.querySelectorAll('[data-opt]'))b.onclick=()=>{this.answer(s,b.dataset.opt);upd();};
    q('[data-start]').onclick=()=>{s.status='playing';q('[data-start]').disabled=true;q('[data-pause]').disabled=false;canvas.focus();upd();};
    q('[data-pause]').onclick=e=>{manualPause=!manualPause;e.target.textContent=manualPause?'继续':'暂停';};
    q('[data-retry]').onclick=()=>{retries++;s=this.create(node.id);recorded=false;this.session=s;q('[data-start]').disabled=false;q('[data-pause]').disabled=true;q('[data-complete]').hidden=true;manualPause=false;upd();};
    q('[data-complete]').onclick=()=>{if(closed||recorded||s.status!=='won'||!current())return;const result=this.rating(s);if(!window.StarfireBook73?.record('veg',node.id,result,s)){if(typeof GameUI!=='undefined')GameUI.showToast('成绩未保存，请从正式入口打开或稍后重试。');return;}recorded=true;close();onComplete?.({won:true,...result});};
    const plantShape=(card,i)=>{
      /* 程序化植物剪影：按索引变化叶形 */
      ctx.save();ctx.translate(640,300);
      const hue=70+(i%4)*8;
      ctx.strokeStyle=`hsl(${hue},30%,60%)`;ctx.fillStyle=`hsl(${hue},32%,30%)`;ctx.lineWidth=3;
      ctx.beginPath();ctx.moveTo(0,140);ctx.lineTo(0,-40);ctx.stroke();
      const leaves=4+i%3;for(let k=0;k<leaves;k++){const a=Math.PI*(.25+.5*k/(Math.max(1,leaves-1)));ctx.save();ctx.rotate(a);ctx.beginPath();ctx.ellipse(70,0,64,22,0,0,Math.PI*2);ctx.fill();ctx.restore();}
      if(i%3===0){ctx.fillStyle='hsl(65,25%,55%)';for(let k=0;k<5;k++){const a=k/5*Math.PI*2;ctx.beginPath();ctx.arc(Math.cos(a)*46,-90+Math.sin(a)*46,12,0,Math.PI*2);ctx.fill();}}
      ctx.restore();
    };
    const draw=()=>{
      ctx.fillStyle='#0c140e';ctx.fillRect(0,0,1280,720);
      const card=s.deck[Math.min(s.idx,s.deck.length-1)];
      if(card){plantShape(card,s.idx);
        ctx.textAlign='center';
        ctx.fillStyle='#e2e8d2';ctx.font='bold 30px sans-serif';ctx.fillText(card.n,640,500);
        ctx.fillStyle='#8b9e8b';ctx.font='12px sans-serif';ctx.fillText(card.en,640,522);
        ctx.fillStyle='#b8c8a8';ctx.font='14px sans-serif';ctx.fillText('「'+card.hint+'」',640,556);
        ctx.textAlign='left';}
      /* HUD 左上：体力/连击；右上：题号/时刻 */
      ctx.fillStyle='rgba(13,14,16,.9)';ctx.beginPath();ctx.moveTo(28,22);ctx.lineTo(328,22);ctx.lineTo(328,104);ctx.lineTo(40,104);ctx.lineTo(28,92);ctx.closePath();ctx.fill();
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('草地食堂',46,44);ctx.fillStyle='#8b9e8b';ctx.font='11px sans-serif';ctx.fillText('GRASSLAND MESS',124,44);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('体力 STAMINA',46,72);
      for(let k=0;k<5;k++){ctx.fillStyle=k<s.stamina?'#7dc47f':'#3a3d42';ctx.fillRect(160+k*24,62,18,12);}
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('连击 COMBO',46,94);ctx.fillStyle='#ffcf24';ctx.font='900 15px sans-serif';ctx.fillText('×'+s.combo,160,94);
      ctx.fillStyle='rgba(13,14,16,.9)';ctx.beginPath();ctx.moveTo(952,22);ctx.lineTo(1252,22);ctx.lineTo(1252,104);ctx.lineTo(964,104);ctx.lineTo(952,92);ctx.closePath();ctx.fill();
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('辨识进度',970,44);ctx.fillStyle='#8b9e8b';ctx.font='11px sans-serif';ctx.fillText('QUIZ',1054,44);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('题号 CARD',970,72);ctx.fillStyle='#7ecbff';ctx.font='900 16px sans-serif';ctx.fillText(Math.min(s.idx+1,12)+' / 12',1080,72);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('时刻 TIME',970,94);ctx.fillStyle=s.timeLeft<10?'#e5484d':'#ffcf24';ctx.font='900 16px sans-serif';ctx.fillText(Math.ceil(s.timeLeft)+'s',1080,94);
      if(s.lastAnswer&&s.idx>0){ctx.fillStyle='rgba(13,14,16,.78)';ctx.fillRect(340,600,600,64);
        ctx.fillStyle=s.lastAnswer.correct?'#7dc47f':'#e5484d';ctx.font='bold 15px sans-serif';ctx.fillText((s.lastAnswer.correct?'✔ ':'✘ ')+(s.lastAnswer.card?s.lastAnswer.card.n:''),360,626);
        ctx.fillStyle='#d3d6db';ctx.font='13px sans-serif';ctx.fillText(s.msg.slice(0,38),360,650);}
      if(s.status==='won'||s.status==='lost'){ctx.fillStyle='rgba(6,8,10,.55)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(13,14,16,.92)';ctx.fillRect(320,250,640,180);ctx.strokeStyle=s.status==='won'?'#ffcf24':'#e5484d';ctx.lineWidth=2;ctx.strokeRect(320,250,640,180);
        ctx.textAlign='center';ctx.fillStyle='#ffcf24';ctx.font='bold 40px sans-serif';ctx.fillText(this.rating(s).rating,640,318);
        ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(this.rating(s).score+' 分 · 答对 '+s.correct+' 题',640,356);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText(s.reason,640,386);ctx.textAlign='left';}
    };
    const upd=()=>{q('.wildveg72-status').textContent=s.msg||'阅读本关资料标记，再选择归档类别。';
      q('[data-complete]').hidden=s.status!=='won';};
    const frame=now=>{if(closed)return;if(!current()||!dialog.isConnected){close();return;}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000);
      last=now;draw();upd();raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);upd();
    return true;
  },
  close(){this.closeActive?.();}
};
