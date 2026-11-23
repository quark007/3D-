/* batch73 hardened: optional success-only, owner scoped, save before callback. */
/* 遵义会议 · 抉择（zunyi72）：论辩卡牌练习。口径：纠正'左'倾军事路线、肯定灵活机动的战略方针、调整军事指挥；不展开敏感人事细节，人物均为剪影。 */
window.Zunyi72={
  supports(id){return [3].includes(Number(id));},
  definitions:{
    3:{title:'遵义会议 · 抉择',
      flameBase:12,flameMin:8,flameMax:16,flameCorrect:2,flameWrong:-4,
      correctPts:15,orderPts:10,sweepBonus:15,hintCost:5,
      cards:{
        1:{topic:'军事路线检讨',en:'LINE REVIEW',cards:[
          {id:'a1',claim:'正视失利，检讨军事路线',good:true,seq:1,hist:'通道会议以来，直面失利、检讨路线渐成共识。'},
          {id:'a2',claim:'以阵地战对垒御敌',good:false,hist:'阵地对垒拼消耗，第五次反"围剿"屡败，教训犹在。'},
          {id:'a3',claim:'依靠险要死守待援',good:false,hist:'险要可守一时而不可久恃，死守正中敌军合围之计。'},
          {id:'a4',claim:'改取运动战、机动歼敌',good:true,seq:2,hist:'运动战是红军所长，以己之长击敌之短。'},
          {id:'a5',claim:'集中兵力把握战机',good:true,seq:3,hist:'集中优势兵力，方能在运动中捕捉和创造战机。'}
        ]},
        2:{topic:'转移方向',en:'NEXT MOVE',cards:[
          {id:'b1',claim:'转向湘西、按原计划会合',good:false,hist:'湘西方向敌已重兵设防，原计划难以实现，需另择新路。'},
          {id:'b2',claim:'退回中央苏区打回来',good:false,hist:'来路已被重兵封锁，回师旧区等于自投罗网。'},
          {id:'b3',claim:'避实击虚、机动作战',good:true,seq:1,hist:'避实击虚，方能跳出数十万敌军的围堵。'},
          {id:'b4',claim:'北渡长江、开辟新苏区',good:true,seq:2,hist:'会议决定北渡长江，在成都西南或西北图新发展。'},
          {id:'b5',claim:'依靠险要、就地死守',good:false,hist:'孤城难守，死守只会陷入层层合围。'}
        ]},
        3:{topic:'指挥调整',en:'COMMAND',cards:[
          {id:'c1',claim:'指挥方法一仍其旧',good:false,hist:'屡败之后仍循旧辙，战场态势难以扭转。'},
          {id:'c2',claim:'检讨教训、调整军事指挥',good:true,seq:1,hist:'会议对军事指挥作出调整，指挥更加集中统一。'},
          {id:'c3',claim:'决议既定、坚决执行',good:true,seq:2,hist:'决议既定，全军统一意志、坚决执行。'},
          {id:'c4',claim:'各部各行其是',good:false,hist:'分散指挥、各自为战，行动无法形成合力。'},
          {id:'c5',claim:'争论不休、议而不决',good:false,hist:'战机稍纵即逝，久议不决必误大事。'}
        ]}
      },
      compare:{
        1:{real:'会议纠正了\'左\'倾军事路线的错误。'},
        2:{real:'会议肯定了灵活机动的战略方针。'},
        3:{real:'会议对军事指挥作了调整。'},
        closing:'遵义会议（1935年1月15日—17日）是党的历史上一个生死攸关的转折点。'
      },
      intro:'1935 年 1 月 15—17 日，贵州遵义。共三轮议题，每轮摊开 5 张主张卡：选出其中正确的 2—3 张，按先后排成「决议链」。落对一张灯焰变亮，落错骤暗并给出反方史实短评；可回退重排，但计提示次数。三轮全对点亮「转折之火」。',
      hist:'遵义会议于 1935 年 1 月 15 日至 17 日在贵州遵义召开，集中解决了当时具有决定意义的军事和组织问题，是党的历史上一个生死攸关的转折点。本游戏按通行口径表述：纠正\'左\'倾军事路线、肯定灵活机动的战略方针、调整军事指挥；不展开具体人事细节。卡片、灯焰与计分均为教学设定，人物均为剪影。'
    }
  },
  correctChain(s,round){const def=this.definitions[s.id];return def.cards[round].cards.filter(c=>c.good).slice().sort((a,b)=>a.seq-b.seq).map(c=>c.id);},
  deal(s,round){const list=this.definitions[s.id].cards[round].cards.map(c=>({...c,placed:false,flagged:false}));
    for(let i=list.length-1;i>0;i--){const j=Math.floor(s.rnd()*(i+1));const t=list[i];list[i]=list[j];list[j]=t;}return list;},
  create(id,random=Math.random){
    const s={id:Number(id),d:this.definitions[id],rnd:random,status:'ready',round:1,t:0,elapsed:0,
      hand:[],chain:[],flame:this.definitions[id].flameBase,
      feedback:{text:'',kind:'',t:0},hints:0,hintMark:null,
      results:[],reason:'',events:[],accumulator:0,sparkle:0};
    s.hand=this.deal(s,1);return s;
  },
  flameOf(s){const d=s.d;let f=d.flameBase;
    for(const id of s.chain){const c=s.hand.find(c=>c.id===id);if(c)f+=c.good?d.flameCorrect:d.flameWrong;}
    return Math.max(d.flameMin,Math.min(d.flameMax,f));},
  place(s,cardId){
    if(s.status!=='playing')return false;
    const c=s.hand.find(c=>c.id===cardId&&!c.placed);
    if(!c)return false;
    c.placed=true;s.chain.push(cardId);
    s.flame=this.flameOf(s);
    if(c.good){s.feedback={text:c.hist,kind:'good',t:0};s.events.push('place-good');}
    else{c.flagged=true;s.feedback={text:c.hist,kind:'bad',t:0};s.events.push('place-bad');}
    s.hintMark=null;return true;
  },
  retract(s){
    if(s.status!=='playing'||!s.chain.length)return false;
    const id=s.chain.pop();const c=s.hand.find(c=>c.id===id);
    if(c){c.placed=false;c.flagged=false;}
    s.hints++;s.flame=this.flameOf(s);s.hintMark=null;
    s.feedback={text:'回退重排一张（计提示一次）。',kind:'note',t:0};s.events.push('retract');return true;
  },
  hint(s){
    if(s.status!=='playing')return false;
    s.hints++;
    const inChain=id=>s.chain.includes(id);
    const wrong=s.chain.map(id=>s.hand.find(c=>c.id===id)).find(c=>c&&!c.good);
    if(wrong){s.hintMark=wrong.id;s.feedback={text:'提示：这张主张站不住——'+wrong.hist,kind:'bad',t:0};}
    else{const need=this.correctChain(s,s.round).find(id=>!inChain(id));
      if(need){s.hintMark=need;s.feedback={text:'提示：决议链还缺一张正确主张。',kind:'note',t:0};}
      else s.feedback={text:'提示：正确主张都已在链上，检查先后顺序后形成决议。',kind:'note',t:0};}
    s.events.push('hint');return true;
  },
  orderedCount(s){
    const corr=this.correctChain(s,s.round);
    const seqs=s.chain.map(id=>{if(!corr.includes(id))return null;const c=s.hand.find(c=>c.id===id);return c?c.seq:null;}).filter(v=>v!==null);
    const dp=seqs.map(()=>1);
    for(let i=1;i<seqs.length;i++)for(let j=0;j<i;j++)if(seqs[j]<seqs[i])dp[i]=Math.max(dp[i],dp[j]+1);
    return seqs.length?Math.max(...dp):0;
  },
  confirm(s){
    if(s.status!=='playing')return false;
    const corr=this.correctChain(s,s.round);
    const matched=s.chain.filter(id=>corr.includes(id)).length;
    const ordered=this.orderedCount(s);
    const exact=s.chain.length===corr.length&&corr.every((id,i)=>s.chain[i]===id);
    s.results.push({round:s.round,topic:s.d.cards[s.round].topic,chain:s.chain.slice(),matched,ordered,exact,firstTry:exact});
    s.events.push('confirm');
    if(s.round>=3){s.status='won';s.reason=s.d.compare.closing;s.sparkle=1;s.feedback={text:'三轮论辩结束，点「记录成绩」保存。',kind:'good',t:0};s.events.push('win');}
    else{s.round++;s.hand=this.deal(s,s.round);s.chain=[];s.flame=s.d.flameBase;s.hintMark=null;s.feedback={text:'决议已记，进入下一议题。',kind:'note',t:0};}
    return true;
  },
  rating(s){
    const d=this.definitions[s.id]||s.d;
    let correct=0,ordered=0;
    for(const r of s.results){correct+=r.matched;ordered+=r.ordered;}
    const sweep=s.results.length===3&&s.results.every(r=>r.exact)?d.sweepBonus:0;
    const score=Math.max(0,correct*d.correctPts+ordered*d.orderPts+sweep-s.hints*d.hintCost);
    const rating=score>=90?'转折之路':score>=75?'集思明辨':score>=60?'星火不熄':'再启论辩';
    return {correct,ordered,sweep,hints:s.hints,score,rating};
  },
  step(s,dt=1/120){
    if(s.status!=='playing'&&s.status!=='won')return;
    s.elapsed+=dt;s.t+=dt;s.feedback.t+=dt;
    if(s.sparkle>0&&s.status==='won')s.sparkle=Math.min(3,s.sparkle+dt*.8);
  },
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.1,seconds));while(s.accumulator+1e-9>=1/120){this.step(s);s.accumulator-=1/120;}},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{const v=localStorage.getItem('cz_mute43');return v==='1'||v==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('zunyi72-style'))return;const el=document.createElement('style');el.id='zunyi72-style';el.textContent=`
    .zunyi72-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:94dvh;margin:auto;padding:14px 16px;background:#121016;color:#e9e4f0;border:1px solid #4a4d52;border-radius:2px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif}
    .zunyi72-dialog::backdrop{background:#04060acc}.zunyi72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,26px);color:#f2f3f4;font-weight:800}.zunyi72-dialog p{margin:6px 0}.zunyi72-dialog header,.zunyi72-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.zunyi72-dialog header{justify-content:space-between}
    .zunyi72-dialog button{font:inherit;background:#1a1c20;color:#e9e4f0;border:1px solid #4a4d52;border-radius:0;padding:8px 14px;min-height:44px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:border-color .12s,transform .12s}.zunyi72-dialog button:hover{border-color:#8b8e93;transform:translateY(-1px)}.zunyi72-dialog button:disabled{opacity:.45;cursor:default;transform:none}
    .zunyi72-dialog [data-start]{background:#ffcf24;border-color:#ffcf24;color:#111;font-weight:800;clip-path:polygon(13px 0,100% 0,calc(100% - 13px) 100%,0 100%)}
    .zunyi72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .zunyi72-dialog canvas{display:block;width:min(100%,calc(min(62dvh,720px)*1.77778))!important;height:auto;aspect-ratio:16/9;max-width:100%;margin:0 auto;background:#121016;touch-action:none;border-radius:2px;box-shadow:0 0 0 1px #2c2e33}
    .zunyi72-status{min-height:1.5em;color:#ffdea1}.zunyi72-actions{margin-top:6px}.zunyi72-dialog [hidden]{display:none!important}
    .zunyi72-note{font-size:13px;color:#9a9c9f}
    @media(prefers-reduced-motion:reduce){.zunyi72-dialog button:hover{transform:none}}@media(max-width:600px){.zunyi72-dialog{padding:12px;font-size:13px}.zunyi72-dialog canvas{width:100%}}`;
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
    const dialog=document.createElement('dialog');dialog.className='zunyi72-dialog';dialog.setAttribute('aria-labelledby','zunyi72-title');
    dialog.innerHTML='<header><div><h2 id="zunyi72-title"></h2><span class="xjg-sub" style="font-size:12px;letter-spacing:.18em;color:#8b8e93">THE TURNING POINT · 抉择</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="遵义会议抉择画面。每轮从五张主张卡中选出正确的两到三张，按先后排成决议链，然后形成决议。"></canvas><p data-hud></p><p class="zunyi72-status" role="status" aria-live="polite"></p><div class="zunyi72-actions"><button data-start>开始论辩 · DEBATE</button><button data-hint disabled>提示 · 计次</button><button data-retract disabled>回退重排 · 计提示</button><button data-confirm disabled>形成决议 · RESOLVE</button><button data-pause disabled>暂停</button><button data-mute>声音</button><button data-retry>重新论辩</button><button data-complete hidden>记录成绩 · 收录见证</button></div><p class="zunyi72-note">正确卡 15 分、顺序 10 分、三轮全对一次性 +15、每次提示 −5。键 1-5 落卡，退格回退。抽象剪影与符号，无肖像。</p><details class="zunyi72-note"><summary>史实注脚</summary><p data-hist></p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null,click=null;
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const sound=kind=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=kind==='place-bad'?'sawtooth':'sine';const f=kind==='place-good'?620:kind==='place-bad'?150:kind==='hint'?380:kind==='retract'?260:kind==='confirm'?520:kind==='win'?660:110;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f/(kind==='win'?1:2.2)),now+.22);g.gain.setValueAtTime(.07,now);g.gain.exponentialRampToValueAtTime(.001,now+.28);o.connect(g);g.connect(master);o.start();o.stop(now+.3);}catch{/* Sound must never block the exercise. */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;this.practiceMode73='normal';}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{const def=s.d;
      q('[data-hud]').textContent=`议题 ${s.round}/3 · ${def.cards[s.round]?def.cards[s.round].topic:'已收束'} · 灯焰 ${s.flame.toFixed(0)}px · 已选 ${s.chain.length}/5 · 提示已用 ${s.hints}`;
      q('[data-start]').hidden=s.status!=='ready';
      q('[data-hint]').disabled=s.status!=='playing';q('[data-retract]').disabled=s.status!=='playing'||!s.chain.length;
      q('[data-confirm]').disabled=s.status!=='playing';q('[data-pause]').disabled=s.status!=='playing';
      q('[data-pause]').textContent=manualPause?'继续论辩':'暂停';
      q('[data-mute]').textContent=this.muted()?'开启声音':'全部静音';q('[data-complete]').hidden=s.status!=='won';
      const text=s.status==='ready'?'点「开始论辩」。先读五张主张卡，再决定哪几张进决议链、先后如何。':s.status==='won'?this.rating(s).rating+' · '+s.reason:manualPause||this.paused()?'论辩已暂停。':s.feedback.text||'落对变亮，落错骤暗——灯焰不会说谎。';
      if(q('.zunyi72-status').textContent!==text)q('.zunyi72-status').textContent=text;};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};
    q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};q('[data-pause]').onclick=()=>{manualPause=!manualPause;last=0;sync();};
    q('[data-hint]').onclick=()=>{gesture();this.hint(s);sync();};
    q('[data-retract]').onclick=()=>{gesture();this.retract(s);sync();};
    q('[data-confirm]').onclick=()=>{gesture();this.confirm(s);sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);recorded=false;this.session=s;manualPause=false;recorded=false;last=0;click=null;sync();draw();q('[data-start]').focus();};
    q('[data-complete]').onclick=()=>{if(closed||recorded||s.status!=='won'||!current())return;const result=this.rating(s);if(!window.StarfireBook73?.record('zunyi',node.id,result,s)){if(typeof GameUI!=='undefined')GameUI.showToast('成绩未保存，请从正式入口打开或稍后重试。');return;}recorded=true;close();onComplete?.({won:true,...result});};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),ox=r.left+(r.width-1280*scale)/2,oy=r.top+(r.height-720*scale)/2;return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale};};
    const SLOT={x:225,y:128,w:166,h:84,gap:12},HAND={x:130,y:566,w:180,h:104,gap:26};
    const cardAt=(base,i)=>({x:base.x+i*(base.w+base.gap),y:base.y,w:base.w,h:base.h});
    canvas.onpointerdown=e=>{if(s.status!=='playing'||manualPause||this.paused()||e.button>0)return;const p=point(e);gesture();canvas.focus();e.preventDefault();click=p;sync();};
    const handleClick=p=>{
      for(let i=0;i<s.hand.length;i++){const a=cardAt(HAND,i);if(p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h){this.place(s,s.hand[i].id);return;}}
      for(let i=0;i<s.chain.length;i++){const a=cardAt(SLOT,i);if(p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h){while(s.chain.length>i)this.retract(s);return;}}
    };
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      if(e.target!==canvas||s.status!=='playing')return;
      if(['1','2','3','4','5'].includes(e.key)){const i=Number(e.key)-1;if(s.hand[i])this.place(s,s.hand[i].id);sync();}
      else if(e.key==='Backspace'){e.preventDefault();this.retract(s);sync();}
      else if(e.key==='Enter'){e.preventDefault();this.confirm(s);sync();}};
    dialog.addEventListener('keydown',key);
    const cutP=(x,y,w,h,c)=>{ctx.beginPath();ctx.moveTo(x+c,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+c);ctx.closePath();};
    const drawCard=(a,c,idx,mode)=>{ /* mode: hand|slot */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(a.x,a.y,a.w,a.h,10);ctx.fill();
      const marked=s.hintMark===c.id;
      ctx.strokeStyle=mode==='slot'?(c.good?'#ffcf24':c.flagged?'#e5484d':'#7ecbff'):(marked?'#ffcf24':'#4a4d52');
      ctx.lineWidth=marked&&!(reduced)?2.5:1.5;cutP(a.x,a.y,a.w,a.h,10);ctx.stroke();
      ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.fillText(mode==='hand'?'键 '+(idx+1):'第'+(idx+1)+'张',a.x+10,a.y+20);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 13px sans-serif';
      const claim=c.claim.length>10?c.claim.slice(0,10):c.claim;const rest=c.claim.length>10?c.claim.slice(10):'';
      ctx.fillText(claim,a.x+10,a.y+44);if(rest)ctx.fillText(rest,a.x+10,a.y+62);
      if(mode==='slot'){ctx.fillStyle=c.good?'#ffdea1':'#e5484d';ctx.font='bold 13px sans-serif';ctx.fillText(c.good?'✓ 采纳':c.flagged?'✗ 存疑':'已落',a.x+10,a.y+a.h-10);}};
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);const def=s.d;
      ctx.fillStyle='#101114';ctx.fillRect(0,0,1280,720);
      /* 俯视会议桌 */
      ctx.fillStyle='#17141c';ctx.fillRect(0,110,1280,450);
      const tb=ctx.createLinearGradient(0,240,0,560);tb.addColorStop(0,'#33261a');tb.addColorStop(1,'#241a12');
      ctx.fillStyle=tb;ctx.beginPath();ctx.ellipse(640,400,400,150,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#4d4230';ctx.lineWidth=3;ctx.stroke();
      /* 座椅与剪影（无面孔） */
      for(let i=0;i<11;i++){const ang=Math.PI*(0.08+0.84*i/10);const cx=640+Math.cos(ang)*470,cy=400+Math.sin(ang)*205;
        ctx.fillStyle='#1c1922';ctx.beginPath();ctx.ellipse(cx,cy,26,20,0,0,Math.PI*2);ctx.fill();
        if(i%3!==2){ctx.fillStyle='#0b0c10';ctx.beginPath();ctx.arc(cx,cy-26,10,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx,cy-10,15,10,0,0,Math.PI*2);ctx.fill();}}
      /* 桌心油灯：火苗 8–16px，反馈即时可见 */
      const flick=reduced?0:Math.sin(s.elapsed*9)*0.8;
      const fh=s.flame+flick;
      const glow=ctx.createRadialGradient(640,392,4,640,392,36+fh*7);glow.addColorStop(0,'rgba(255,207,36,'+(0.18+fh/40).toFixed(2)+')');glow.addColorStop(1,'rgba(255,207,36,0)');
      ctx.fillStyle=glow;ctx.fillRect(640-160,392-160,320,320);
      ctx.fillStyle='#3a3020';ctx.fillRect(628,400,24,10);ctx.fillStyle='#55492f';ctx.fillRect(633,388,14,14);
      ctx.fillStyle='#ffcf24';ctx.beginPath();ctx.moveTo(636,388);ctx.quadraticCurveTo(640,388-fh,644,388);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.ellipse(640,386,3,3,0,0,Math.PI*2);ctx.fill();
      /* 决议链槽位 */
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('决议链 · RESOLUTION CHAIN',225,120);
      for(let i=0;i<5;i++){const a=cardAt(SLOT,i);
        ctx.fillStyle='rgba(13,14,16,.55)';cutP(a.x,a.y,a.w,a.h,10);ctx.fill();
        ctx.strokeStyle='#3a3d44';ctx.setLineDash([5,4]);ctx.lineWidth=1;cutP(a.x,a.y,a.w,a.h,10);ctx.stroke();ctx.setLineDash([]);}
      s.chain.forEach((id,i)=>{const c=s.hand.find(c=>c.id===id);if(c)drawCard(cardAt(SLOT,i),c,i,'slot');});
      /* 反馈条 */
      if(s.feedback.text){const bad=s.feedback.kind==='bad';
        ctx.fillStyle='rgba(13,14,16,.78)';cutP(130,522,1020,26,8);ctx.fill();
        ctx.fillStyle=bad?'#e5a1a4':s.feedback.kind==='good'?'#ffdea1':'#9a9c9f';ctx.font='13px sans-serif';
        ctx.fillText((bad?'反方短评：':s.feedback.kind==='good'?'史实回响：':'')+s.feedback.text,142,540);}
      /* 手牌 */
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('主张卡 · PROPOSALS（点卡落链）',130,558);
      s.hand.forEach((c,i)=>{if(!c.placed)drawCard(cardAt(HAND,i),c,i,'hand');});
      /* 左上面板：议题 AGENDA + 灯焰 FLAME */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(16,14,330,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;cutP(16,14,330,96,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(16,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('议题',34,36);ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.fillText('AGENDA',74,36);
      ctx.fillStyle='#7ecbff';ctx.font='900 18px sans-serif';ctx.fillText(s.round+'/3',34,62);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText(def.cards[s.round]?def.cards[s.round].topic:'收束',86,60);ctx.fillStyle='#8b8e93';ctx.fillText(def.cards[s.round]?def.cards[s.round].en:'DONE',86,76);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('灯焰',34,92);ctx.fillStyle='#8b8e93';ctx.fillText('FLAME',66,92);
      ctx.fillStyle='#1a1c20';cutP(150,80,150,14,4);ctx.fill();
      ctx.fillStyle='#ffcf24';cutP(150,80,150*(s.flame-def.flameMin)/(def.flameMax-def.flameMin),14,4);ctx.fill();
      /* 右上面板：提示 HINTS */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(1010,14,254,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';cutP(1010,14,254,96,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(1010,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('提示',1028,36);ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.fillText('HINTS',1072,36);
      ctx.fillStyle='#e5484d';ctx.font='900 20px sans-serif';ctx.fillText('已用 '+s.hints,1028,64);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('每次 −5 分',1028,86);ctx.fillStyle='#8b8e93';ctx.fillText('回退重排也计提示',1088,86);
      /* 转折之火：三轮全对点睛 */
      if(s.status==='won'&&s.results.every(r=>r.exact)&&!reduced){
        ctx.fillStyle='rgba(255,207,36,.85)';
        for(let i=0;i<14;i++){const ph=(s.elapsed*1.4+i*.37)%1;const sx=640+Math.sin(i*2.7)*26*(1+ph);const sy=380-ph*180;
          ctx.globalAlpha=Math.max(0,1-ph);ctx.fillRect(sx,sy,3,3);ctx.globalAlpha=1;}}
      /* 结算对照卡 */
      if(s.status==='won'){const r=this.rating(s);
        ctx.fillStyle='rgba(6,8,10,.55)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(13,14,16,.92)';ctx.fillRect(190,120,900,470);ctx.strokeStyle='#ffcf24';ctx.lineWidth=2;ctx.strokeRect(190,120,900,470);
        ctx.textAlign='center';ctx.fillStyle='#ffcf24';ctx.font='bold 34px sans-serif';ctx.fillText('史实对照卡 · HISTORY CHECK',640,166);
        ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.fillText('YOUR CHAIN  vs  THE REAL RESOLUTION',640,188);
        let y=232;
        for(const res of s.results){
          ctx.textAlign='left';ctx.fillStyle='#7ecbff';ctx.font='bold 15px sans-serif';ctx.fillText('议题'+res.round+' · '+res.topic+(res.exact?'　✓ 全对':'　△ 再核对'),216,y);
          ctx.fillStyle='#e9e4f0';ctx.font='13px sans-serif';
          ctx.fillText('你的决议链：'+(res.chain.map(id=>def.cards[res.round].cards.find(c=>c.id===id).claim).join(' → ')||'（空）'),240,y+24);
          ctx.fillStyle='#9a9c9f';ctx.fillText('真实决议要点：'+def.compare[res.round].real,240,y+44);y+=76;}
        ctx.textAlign='center';ctx.fillStyle='#f2f3f4';ctx.font='bold 19px sans-serif';ctx.fillText(r.rating+' · '+r.score+' 分',640,y+8);
        ctx.fillStyle='#ffdea1';ctx.font='bold 14px sans-serif';ctx.fillText(def.compare.closing,640,y+34);
        ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('点「记录成绩 · 收录见证」保存。',640,y+58);ctx.textAlign='left';}
    };
    const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}
      if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&(s.status==='playing'||s.status==='won'))this.advance(s,(now-last)/1000);last=now;
      if(click){handleClick(click);click=null;sync();}
      for(const event of s.events.splice(0)){sound(event);sync();}
      draw();if(now-(frame.hudAt||0)>100||s.status!=='playing'){sync();frame.hudAt=now;}raf=requestAnimationFrame(frame);};
    sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
