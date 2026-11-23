/* batch73 hardened: optional success-only, owner scoped, save before callback. */
/* 半条被子 · 夜宿沙洲（blanket72）：夜宿克制与行装分配练习，人物均为剪影，无肖像。 */
window.Blanket72={
  supports(id){return [2].includes(Number(id));},
  definitions:{
    2:{title:'半条被子 · 夜宿沙洲',windowT:4,objectsPerRound:4,roundLen:16,
      restraintPts:8,taskPts:6,itemPts:5,mistakePts:5,
      disciplineMax:100,touchDiscipline:20,taskDiscipline:8,
      objects:[
        {key:'rice',name:'米缸',en:'RICE JAR',x:250,y:430},
        {key:'wood',name:'柴堆',en:'FIREWOOD',x:430,y:552},
        {key:'coin',name:'银元',en:'SILVER',x:845,y:520},
        {key:'egg',name:'鸡蛋',en:'EGGS',x:1035,y:440}
      ],
      tasks:[
        {key:'water',name:'水缸见底',verb:'挑水',en:'CARRY WATER',x:185,y:315,round:1},
        {key:'curtain',name:'门缝漏风',verb:'挂草帘',en:'HANG STRAW',x:1095,y:335,round:1},
        {key:'needle',name:'伤员脚裂',verb:'递针线',en:'PASS NEEDLE',x:640,y:300,round:2}
      ],
      items:[
        {key:'blanket',name:'被子',en:'QUILT',cuttable:true},
        {key:'straw',name:'草鞋',en:'SANDALS'},
        {key:'food',name:'干粮袋',en:'RATION BAG'},
        {key:'umbrella',name:'雨伞',en:'UMBRELLA'}
      ],
      reminders:['班长低声说：老乡的东西，一样也不能动。','班长说：咱们是红军，纪律比什么都重。','班长说：放回去。不拿群众一针一线，是纪律。'],
      intro:'1934 年 11 月，湖南汝城沙洲村，徐解秀家的堂屋。夜宿两轮：发光的老物件忍住不碰（克制即得分），「该做的事」热点要在天亮前点掉。天亮行装：把四件自有物品分进「留下 / 带走」——被子该怎么留，想一想。',
      success:'天亮了，队伍要出发。半条被子留在了沙洲村。',
      hist:'据统编教材与党史出版物：「半条被子」的故事发生在 1934 年 11 月长征途中的湖南汝城县沙洲村——三名女红军借宿村民徐解秀家，临别时把仅有的一条被子剪成两半，留下半条，并说「等革命胜利了，我们会回来看您」。本练习的物件、数值与计分均为教学设定，人物均为剪影。'
    }
  },
  create(id,random=Math.random){
    const d=this.definitions[id];
    const shuffle=list=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));const t=a[i];a[i]=a[j];a[j]=t;}return a;};
    const rounds={};
    for(const r of [1,2])rounds[r]={windows:shuffle(d.objects).map((o,i)=>({key:o.key,start:i*d.windowT,dur:d.windowT,state:'pending',outcome:null})),len:d.objectsPerRound*d.windowT};
    return {id:Number(id),d,rnd:random,status:'ready',round:1,t:0,elapsed:0,discipline:d.disciplineMax,
      restrained:0,mistakes:0,kindness:0,reminderIdx:0,flash:'',flashT:0,
      rounds,tasks:d.tasks.map(t=>({...t,done:false,missed:false})),
      pack:d.items.map(it=>({...it,zone:null})),cut:false,cutAnim:0,confirmed:false,reason:'',events:[],accumulator:0};
  },
  activeWindow(s){const r=s.rounds[s.round];if(!r||s.round>2)return null;return r.windows.find(w=>w.state==='active')||null;},
  tap(s,x,y){
    if(s.status!=='playing'||s.round>2)return null;const d=s.d;
    const w=this.activeWindow(s);
    if(w){const o=d.objects.find(o=>o.key===w.key);
      if(Math.abs(x-o.x)<=64&&Math.abs(y-o.y)<=52){w.state='done';w.outcome='touched';s.mistakes++;
        s.discipline=Math.max(0,s.discipline-d.touchDiscipline);
        s.flash=d.reminders[s.reminderIdx++%d.reminders.length];s.flashT=3;s.events.push('touch');return 'object';}}
    for(const t of s.tasks){if(t.round!==s.round||t.done)continue;
      if(Math.abs(x-t.x)<=58&&Math.abs(y-t.y)<=44){t.done=true;s.kindness++;
        s.discipline=Math.min(d.disciplineMax,s.discipline+d.taskDiscipline);
        s.flash='做完了「'+t.verb+'」，心里踏实了。';s.flashT=2.4;s.events.push('task');return 'task';}}
    return null;
  },
  place(s,key,zone){
    if(s.status!=='playing'||s.round!==3||s.confirmed)return false;
    const it=s.pack.find(p=>p.key===key);
    if(!it||(zone!=='leave'&&zone!=='take'))return false;
    it.zone=zone;s.events.push('place');return true;
  },
  cut(s){
    if(s.status!=='playing'||s.round!==3||s.confirmed||s.cut)return false;
    const b=s.pack.find(p=>p.key==='blanket');
    if(!b||!b.zone)return false;
    s.cut=true;s.cutAnim=1.2;s.events.push('cut');return true;
  },
  judgePack(s){return s.pack.reduce((n,it)=>n+(it.key==='blanket'?(s.cut?1:0):(it.zone==='take'?1:0)),0);},
  setout(s){
    if(s.status!=='playing'||s.round!==3||s.confirmed)return false;
    s.confirmed=true;s.status='won';s.reason=s.d.success;s.events.push('win');return true;
  },
  evaluate(s){const d=s.d;const correct=this.judgePack(s);
    const score=Math.max(0,s.restrained*d.restraintPts+s.kindness*d.taskPts+correct*d.itemPts-s.mistakes*d.mistakePts);
    return {restrained:s.restrained,kindness:s.kindness,correct,mistakes:s.mistakes,score};},
  step(s,dt=1/120){
    if(s.status!=='playing')return;const d=s.d;s.elapsed+=dt;s.t+=dt;
    s.flashT=Math.max(0,s.flashT-dt);s.cutAnim=Math.max(0,s.cutAnim-dt);
    if(s.round<=2){const r=s.rounds[s.round];
      for(const w of r.windows){
        if(w.state==='pending'&&s.t>=w.start)w.state='active';
        else if(w.state==='active'&&s.t>=w.start+w.dur){w.state='done';w.outcome='restrained';s.restrained++;s.events.push('restrained');}}
      if(s.t>=r.len){for(const t of s.tasks)if(t.round===s.round&&!t.done)t.missed=true;
        s.round++;s.t=0;s.events.push('round');}}
  },
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.1,seconds));while(s.accumulator+1e-9>=1/120){this.step(s);s.accumulator-=1/120;}},
  rating(s){const e=this.evaluate(s);const rating=e.score>=90?'鱼水情深':e.score>=75?'纪律如铁':e.score>=60?'温暖同眠':'再宿一夜';return {...e,rating};},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{const v=localStorage.getItem('cz_mute43');return v==='1'||v==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('blanket72-style'))return;const el=document.createElement('style');el.id='blanket72-style';el.textContent=`
    .blanket72-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:94dvh;margin:auto;padding:14px 16px;background:#151009;color:#ede4d2;border:1px solid #4a4d52;border-radius:2px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif}
    .blanket72-dialog::backdrop{background:#04060acc}.blanket72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,26px);color:#f2f3f4;font-weight:800}.blanket72-dialog p{margin:6px 0}.blanket72-dialog header,.blanket72-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.blanket72-dialog header{justify-content:space-between}
    .blanket72-dialog button{font:inherit;background:#1a1c20;color:#ede4d2;border:1px solid #4a4d52;border-radius:0;padding:8px 14px;min-height:44px;cursor:pointer;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px);transition:border-color .12s,transform .12s}.blanket72-dialog button:hover{border-color:#8b8e93;transform:translateY(-1px)}.blanket72-dialog button:disabled{opacity:.45;cursor:default;transform:none}
    .blanket72-dialog [data-start]{background:#ffcf24;border-color:#ffcf24;color:#111;font-weight:800;clip-path:polygon(13px 0,100% 0,calc(100% - 13px) 100%,0 100%)}
    .blanket72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .blanket72-dialog canvas{display:block;width:min(100%,calc(min(62dvh,720px)*1.77778))!important;height:auto;aspect-ratio:16/9;max-width:100%;margin:0 auto;background:#151009;touch-action:none;border-radius:2px;box-shadow:0 0 0 1px #2c2e33}
    .blanket72-status{min-height:1.5em;color:#ffdea1}.blanket72-actions{margin-top:6px}.blanket72-dialog [hidden]{display:none!important}
    .blanket72-note{font-size:13px;color:#9a9c9f}.blanket72-shake{animation:blanket72-shake .18s linear}@keyframes blanket72-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}
    @media(prefers-reduced-motion:reduce){.blanket72-shake{animation:none}.blanket72-dialog button:hover{transform:none}}@media(max-width:600px){.blanket72-dialog{padding:12px;font-size:13px}.blanket72-dialog canvas{width:100%}}`;
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
    const dialog=document.createElement('dialog');dialog.className='blanket72-dialog';dialog.setAttribute('aria-labelledby','blanket72-title');
    dialog.innerHTML='<header><div><h2 id="blanket72-title"></h2><span class="xjg-sub" style="font-size:12px;letter-spacing:.18em;color:#8b8e93">HALF QUILT · 夜宿沙洲</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="半条被子画面。夜宿两轮：发光的老物件不要去碰，该做的事热点要点掉；天亮把四件行装分进留下与带走两区，被子可以剪成两半。"></canvas><p data-hud></p><p class="blanket72-status" role="status" aria-live="polite"></p><div class="blanket72-actions"><button data-start>开始夜宿 · STAY THE NIGHT</button><button data-setout hidden>出发 · SET OUT</button><button data-pause disabled>暂停</button><button data-mute>声音</button><button data-retry>重新夜宿</button><button data-complete hidden>记录成绩 · 收录见证</button></div><p class="blanket72-note">克制得分 8、小事 6、分配每件 5、失误 −5；纪律条碰物下降、做好事回升。键 1-4 选物品，L 留下 / T 带走 / C 剪被。抽象剪影，无肖像。</p><details class="blanket72-note"><summary>史实注脚</summary><p data-hist></p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(node.id),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null,click=null,sel=-1,mouse=null;
    this.session=s;q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const sound=kind=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();o.type=kind==='touch'?'sawtooth':'sine';const f=kind==='task'?660:kind==='restrained'?520:kind==='cut'?880:kind==='round'?440:kind==='win'?660:kind==='place'?300:110;o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,f/(kind==='win'?1:2.2)),now+.22);g.gain.setValueAtTime(.07,now);g.gain.exponentialRampToValueAtTime(.001,now+.28);o.connect(g);g.connect(master);o.start();o.stop(now+.3);}catch{/* Sound must never block the exercise. */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;this.practiceMode73='normal';}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{const e=s.status==='won'?this.evaluate(s):null;
      q('[data-hud]').textContent=`第 ${s.round}/3 夜段 · 纪律 ${Math.round(s.discipline)}/100 · 民情 ${s.kindness}/3 · 克制 ${s.restrained}/8 · 失误 ${s.mistakes}`+(e?` · 得分 ${e.score}`:'');
      q('[data-start]').hidden=s.status!=='ready';q('[data-setout]').hidden=!(s.status==='playing'&&s.round===3);
      q('[data-pause]').disabled=s.status!=='playing';q('[data-pause]').textContent=manualPause?'继续夜宿':'暂停';
      q('[data-mute]').textContent=this.muted()?'开启声音':'全部静音';q('[data-complete]').hidden=s.status!=='won';
      const text=s.status==='ready'?'点「开始夜宿」。发光的老物件忍住不碰，「该做的事」热点要尽快点掉。':s.status==='won'?this.rating(s).rating+' · '+s.reason:s.round===3?'把四件行装分进「留下 / 带走」，想清楚了再「出发」。被子，可以剪成两半。':manualPause||this.paused()?'夜宿已暂停。':s.flashT>0?s.flash:'忍住不碰，就是纪律。该做的事，别拖到天亮。';
      if(q('.blanket72-status').textContent!==text)q('.blanket72-status').textContent=text;};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};
    q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';last=0;canvas.focus();sync();};q('[data-pause]').onclick=()=>{manualPause=!manualPause;last=0;sync();};
    q('[data-setout]').onclick=()=>{gesture();this.setout(s);sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;s=this.create(node.id);recorded=false;this.session=s;manualPause=false;recorded=false;last=0;click=null;sel=-1;sync();draw();q('[data-start]').focus();};
    q('[data-complete]').onclick=()=>{if(closed||recorded||s.status!=='won'||!current())return;const result=this.rating(s);if(!window.StarfireBook73?.record('blanket',node.id,result,s)){if(typeof GameUI!=='undefined')GameUI.showToast('成绩未保存，请从正式入口打开或稍后重试。');return;}recorded=true;close();onComplete?.({won:true,...result});};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),ox=r.left+(r.width-1280*scale)/2,oy=r.top+(r.height-720*scale)/2;return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale};};
    const SLOTS=[{x:250,y:392},{x:480,y:392},{x:710,y:392},{x:940,y:392}],SW=170,SH=112;
    const ZONES={leave:{x:150,y:578,w:420,h:104,label:'留下',en:'LEAVE'},take:{x:710,y:578,w:420,h:104,label:'带走',en:'TAKE'}};
    const packHit=p=>{
      for(let i=0;i<SLOTS.length;i++){const a=SLOTS[i];if(p.x>=a.x&&p.x<=a.x+SW&&p.y>=a.y&&p.y<=a.y+SH)return {kind:'item',i};}
      for(const z of ['leave','take']){const a=ZONES[z];if(p.x>=a.x&&p.x<=a.x+a.w&&p.y>=a.y&&p.y<=a.y+a.h)return {kind:'zone',zone:z};}
      if(s.pack[0].zone&&!s.cut&&Math.hypot(p.x-640,p.y-548)<=38)return {kind:'scissors'};
      return null;};
    canvas.onpointerdown=e=>{if(s.status!=='playing'||manualPause||this.paused()||e.button>0)return;const p=point(e);gesture();canvas.focus();e.preventDefault();
      if(s.round===3){const h=packHit(p);
        if(h&&h.kind==='item')sel=h.i;
        else if(h&&h.kind==='zone'&&sel>=0){this.place(s,s.pack[sel].key,h.zone);sel=-1;}
        else if(h&&h.kind==='scissors')this.cut(s);}
      else click={x:p.x,y:p.y};sync();};
    canvas.onpointermove=e=>{mouse=point(e);};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
      if(e.target!==canvas||s.round!==3||s.status!=='playing')return;
      if(['1','2','3','4'].includes(e.key)){sel=Number(e.key)-1;sync();}
      else if(e.key==='l'||e.key==='L'){if(sel>=0){this.place(s,s.pack[sel].key,'leave');sel=-1;sync();}}
      else if(e.key==='t'||e.key==='T'){if(sel>=0){this.place(s,s.pack[sel].key,'take');sel=-1;sync();}}
      else if(e.key==='c'||e.key==='C'){this.cut(s);sync();}};
    dialog.addEventListener('keydown',key);
    const cutP=(x,y,w,h,c)=>{ctx.beginPath();ctx.moveTo(x+c,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h-c);ctx.lineTo(x+w-c,y+h);ctx.lineTo(x,y+h);ctx.lineTo(x,y+c);ctx.closePath();};
    const silhouette=(x,y,scale,seated)=>{ctx.fillStyle='#0a0c10';ctx.beginPath();ctx.ellipse(x,y-(seated?46:76)*scale,15*scale,15*scale,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();if(seated){ctx.ellipse(x,y-22*scale,24*scale,26*scale,0,0,Math.PI*2);}else{ctx.moveTo(x-20*scale,y);ctx.quadraticCurveTo(x-16*scale,y-64*scale,x,y-64*scale);ctx.quadraticCurveTo(x+16*scale,y-64*scale,x+20*scale,y);}ctx.closePath();ctx.fill();};
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);const d=s.d,night=s.round<=2;
      /* 堂屋：后墙 + 地面 */
      ctx.fillStyle=night?'#171208':'#241a10';ctx.fillRect(0,0,1280,340);
      const gr=ctx.createLinearGradient(0,300,0,720);gr.addColorStop(0,night?'#211609':'#332413');gr.addColorStop(1,night?'#120c06':'#1d1309');ctx.fillStyle=gr;ctx.fillRect(0,300,1280,420);
      /* 窗：夜色 / 天亮 */
      const dawn=s.round===3;
      const sky=ctx.createLinearGradient(0,140,0,280);sky.addColorStop(0,dawn?'#4a5f86':'#0a1018');sky.addColorStop(1,dawn?'#c9a15e':'#15202c');ctx.fillStyle=sky;ctx.fillRect(500,140,190,150);
      ctx.strokeStyle='#0c0a07';ctx.lineWidth=8;ctx.strokeRect(500,140,190,150);ctx.beginPath();ctx.moveTo(595,140);ctx.lineTo(595,290);ctx.moveTo(500,215);ctx.lineTo(690,215);ctx.stroke();
      if(!dawn){ctx.fillStyle='#e8e2d2';ctx.beginPath();ctx.arc(645,175,13,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0a1018';ctx.beginPath();ctx.arc(651,170,11,0,Math.PI*2);ctx.fill();}
      /* 火塘微动画 */
      const flick=reduced?0:Math.sin(s.elapsed*7)*3;
      const glowR=(s.round===3?70:120)+flick*4;
      const glow=ctx.createRadialGradient(640,600,10,640,600,glowR);glow.addColorStop(0,'rgba(255,170,60,.4)');glow.addColorStop(1,'rgba(255,170,60,0)');ctx.fillStyle=glow;ctx.fillRect(640-glowR,600-glowR,glowR*2,glowR*2);
      ctx.fillStyle='#2a2018';ctx.beginPath();ctx.ellipse(640,612,64,20,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#3a2c1a';for(let k=0;k<4;k++){ctx.save();ctx.translate(640,608);ctx.rotate(k*Math.PI/4);ctx.fillRect(-30,-4,60,7);ctx.restore();}
      const fh=20+flick*.6;ctx.fillStyle='#ffcf24';ctx.beginPath();ctx.moveTo(624,604);ctx.quadraticCurveTo(640,604-fh,656,604);ctx.closePath();ctx.fill();
      ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.ellipse(640,602,7,6,0,0,Math.PI*2);ctx.fill();
      /* 剪影：徐解秀与三名女红军 */
      silhouette(760,624,1.05,true);silhouette(500,632,1,true);
      if(s.round<3){silhouette(340,628,.95,true);silhouette(430,634,.9,true);silhouette(880,630,.95,true);}
      else{silhouette(340,626,.95,false);silhouette(430,630,.9,false);silhouette(880,628,.95,false);}
      if(s.round<=2){
        /* 发光物件：4 秒渐亮，只有当前窗口物件亮 */
        for(const o of d.objects){
          const win=s.rounds[s.round].windows.find(x=>x.key===o.key&&x.state!=='pending');
          const isAct=!!win&&win.state==='active';
          const prog=isAct?Math.max(0,Math.min(1,(s.t-win.start)/win.dur)):0;
          const a=isAct?.14+.4*prog:0;
          if(a>0){const g2=ctx.createRadialGradient(o.x,o.y,4,o.x,o.y,30+24*prog);g2.addColorStop(0,'rgba(255,207,36,'+a.toFixed(2)+')');g2.addColorStop(1,'rgba(255,207,36,0)');ctx.fillStyle=g2;ctx.fillRect(o.x-70,o.y-70,140,140);}
          ctx.fillStyle='#0a0c10';ctx.strokeStyle='#4d4230';ctx.lineWidth=1.5;
          if(o.key==='rice'){ctx.beginPath();ctx.ellipse(o.x,o.y,26,32,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
          else if(o.key==='wood'){for(let k=0;k<3;k++){ctx.fillRect(o.x-30+k*4,o.y-12+k*10,58,9);}ctx.strokeRect(o.x-30,o.y-14,58,32);}
          else if(o.key==='coin'){ctx.beginPath();ctx.ellipse(o.x,o.y,20,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(o.x-4,o.y-6,8,4,0,0,Math.PI*2);ctx.stroke();}
          else{ctx.beginPath();ctx.ellipse(o.x,o.y,22,14,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
          ctx.fillStyle='rgba(13,14,16,.78)';cutP(o.x-46,o.y+36,92,24,6);ctx.fill();
          ctx.fillStyle=isAct?'#ffdea1':'#8b8e93';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(o.name+' '+o.en,o.x,o.y+52);ctx.textAlign='left';
        }
        /* 拿取气泡：鼠标接近当前物件 */
        const act=this.activeWindow(s);
        if(act&&mouse){const o=d.objects.find(o=>o.key===act.key);
          if(Math.hypot(mouse.x-o.x,mouse.y-o.y)<96){ctx.fillStyle='rgba(13,14,16,.9)';cutP(o.x+40,o.y-64,120,34,8);ctx.fill();ctx.strokeStyle='#e5484d';cutP(o.x+40,o.y-64,120,34,8);ctx.stroke();
            ctx.fillStyle='#e5484d';ctx.font='bold 13px sans-serif';ctx.fillText('拿取？（别碰）',o.x+52,o.y-42);}}
        /* 该做的事热点 */
        for(const t of s.tasks){if(t.round!==s.round)continue;
          const pulse=reduced?0:Math.sin(s.elapsed*4)*6;
          ctx.strokeStyle=t.done?'#7dc47f':'#7ecbff';ctx.lineWidth=2;ctx.setLineDash([6,5]);
          ctx.beginPath();ctx.arc(t.x,t.y,34+pulse,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
          ctx.fillStyle=t.done?'rgba(125,196,127,.3)':'rgba(126,203,255,.22)';ctx.beginPath();ctx.arc(t.x,t.y,26,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='rgba(13,14,16,.78)';cutP(t.x-70,t.y+40,140,26,6);ctx.fill();
          ctx.fillStyle=t.done?'#7dc47f':'#7ecbff';ctx.font='bold 13px sans-serif';ctx.textAlign='center';
          ctx.fillText(t.done? t.verb+' · 已做' : t.name+'→'+t.verb,t.x,t.y+58);ctx.textAlign='left';}
      }else{
        /* 第 3 轮：行装分配 */
        ctx.fillStyle='rgba(13,14,16,.9)';cutP(16,120,420,32,8);ctx.fill();
        ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('天亮行装 · 四件物品分进两区',30,141);
        ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.fillText('DAWN PACKING',330,141);
        s.pack.forEach((it,i)=>{const a=SLOTS[i],on=sel===i;
          ctx.fillStyle='rgba(13,14,16,.9)';cutP(a.x,a.y,SW,SH,10);ctx.fill();
          ctx.strokeStyle=on?'#ffcf24':'#4a4d52';ctx.lineWidth=on?2.5:1.5;cutP(a.x,a.y,SW,SH,10);ctx.stroke();
          const cx=a.x+SW/2,cy=a.y+62;
          ctx.strokeStyle='#ffdea1';ctx.lineWidth=2.5;ctx.fillStyle='rgba(255,207,36,.12)';
          if(it.key==='blanket'){
            if(s.cut){const prog=1-s.cutAnim/1.2;const sweep=reduced?0:prog;
              ctx.fillStyle='rgba(255,207,36,.3)';ctx.fillRect(cx-56,cy-26,56,52);
              ctx.fillStyle='rgba(126,203,255,.3)';ctx.fillRect(cx,cy-26,56,52);
              ctx.strokeStyle='#ffdea1';ctx.strokeRect(cx-56,cy-26,112,52);ctx.beginPath();ctx.moveTo(cx,cy-26);ctx.lineTo(cx,cy+26);ctx.stroke();
              if(s.cutAnim>0&&!reduced){ctx.strokeStyle='rgba(255,255,255,'+(s.cutAnim/1.2).toFixed(2)+')';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(cx-70-sweep*40,cy-40+sweep*80);ctx.lineTo(cx+40+sweep*30,cy-40+sweep*10);ctx.stroke();}
            }else{ctx.fillRect(cx-52,cy-22,104,44);ctx.strokeRect(cx-52,cy-22,104,44);ctx.beginPath();ctx.moveTo(cx-52,cy-6);ctx.lineTo(cx+52,cy-6);ctx.stroke();}
          }else if(it.key==='straw'){ctx.beginPath();ctx.ellipse(cx-22,cy,20,11,-.3,0,Math.PI*2);ctx.ellipse(cx+22,cy+4,20,11,.3,0,Math.PI*2);ctx.fill();ctx.stroke();}
          else if(it.key==='food'){ctx.beginPath();ctx.moveTo(cx-24,cy-24);ctx.quadraticCurveTo(cx,cy-36,cx+24,cy-24);ctx.lineTo(cx+16,cy+26);ctx.lineTo(cx-16,cy+26);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy-34);ctx.lineTo(cx,cy-42);ctx.stroke();}
          else{ctx.beginPath();ctx.arc(cx,cy-6,30,Math.PI,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(cx,cy-6);ctx.lineTo(cx,cy+28);ctx.moveTo(cx,cy+28);ctx.quadraticCurveTo(cx+10,cy+30,cx+12,cy+20);ctx.stroke();}
          ctx.fillStyle='#f2f3f4';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(it.name,cx,a.y+18);ctx.textAlign='left';
          ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(it.zone?(it.zone==='leave'?'→留下 LEAVE':'→带走 TAKE'):(it.key==='blanket'&&s.cut?'已剪半 · 半留半带':'未分配 · 键'+(i+1)),cx,a.y+SH-8);ctx.textAlign='left';});
        for(const z of ['leave','take']){const a=ZONES[z];
          ctx.fillStyle='rgba(13,14,16,.9)';cutP(a.x,a.y,a.w,a.h,12);ctx.fill();
          ctx.strokeStyle=z==='leave'?'#ffcf24':'#7ecbff';ctx.lineWidth=2;cutP(a.x,a.y,a.w,a.h,12);ctx.stroke();
          ctx.fillStyle=z==='leave'?'#ffdea1':'#7ecbff';ctx.font='bold 15px sans-serif';ctx.fillText(a.label+' · '+a.en,a.x+18,a.y+30);
          const put=s.pack.filter(p=>p.zone===z);
          ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';
          ctx.fillText(put.length?put.map(p=>p.key==='blanket'&&s.cut?'被子(半条)':p.name).join('、'):'（空）点物品后点此区',a.x+18,a.y+58);
          if(z==='leave'&&s.cut){ctx.fillStyle='rgba(255,207,36,.3)';ctx.fillRect(a.x+a.w-70,a.y+22,44,30);ctx.strokeStyle='#ffdea1';ctx.strokeRect(a.x+a.w-70,a.y+22,44,30);}
          if(z==='take'&&s.cut){ctx.fillStyle='rgba(126,203,255,.3)';ctx.fillRect(a.x+a.w-70,a.y+22,44,30);ctx.strokeStyle='#7ecbff';ctx.strokeRect(a.x+a.w-70,a.y+22,44,30);}}
        if(s.pack[0].zone&&!s.cut){const pulse=reduced?0:Math.sin(s.elapsed*5)*4;
          ctx.strokeStyle='#e5484d';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(640,548,26+pulse,0,Math.PI*2);ctx.stroke();
          ctx.strokeStyle='#e5484d';ctx.beginPath();ctx.moveTo(628,536);ctx.lineTo(652,560);ctx.moveTo(652,536);ctx.lineTo(628,560);ctx.stroke();
          ctx.fillStyle='rgba(13,14,16,.78)';cutP(568,586,144,24,6);ctx.fill();ctx.fillStyle='#e5484d';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('剪刀 · 剪半（C）',640,602);ctx.textAlign='left';}
        else if(s.cut){ctx.fillStyle='#7dc47f';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('半条留下 · 半条带走',640,552);ctx.textAlign='left';}
      }
      /* 左上面板：纪律 DISCIPLINE + 时刻 DAWN */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(16,14,330,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';ctx.lineWidth=1;cutP(16,14,330,96,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(16,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('夜宿沙洲',34,36);ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.fillText('HALF QUILT',122,36);
      const disc=Math.max(0,Math.min(100,s.discipline));
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('纪律',34,58);ctx.fillStyle='#8b8e93';ctx.fillText('DISCIPLINE',66,58);
      ctx.fillStyle='#1a1c20';cutP(150,46,150,14,4);ctx.fill();
      ctx.fillStyle=disc>=70?'#7dc47f':disc>=40?'#ffcf24':'#e5484d';cutP(150,46,150*disc/100,14,4);ctx.fill();
      ctx.fillStyle=disc>=70?'#7dc47f':disc>=40?'#ffcf24':'#e5484d';ctx.font='900 16px sans-serif';ctx.textAlign='right';ctx.fillText(String(Math.round(disc)),318,59);ctx.textAlign='left';
      const prog=Math.min(1,((s.round-1)+(s.round<=2?Math.min(1,s.t/s.rounds[s.round].len):(s.confirmed?1:0)))/3);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('时刻',34,84);ctx.fillStyle='#8b8e93';ctx.fillText('DAWN',66,84);
      ctx.fillStyle='#1a1c20';cutP(150,72,150,14,4);ctx.fill();ctx.fillStyle='#7ecbff';cutP(150,72,150*prog,14,4);ctx.fill();
      ctx.fillStyle='#7ecbff';ctx.font='900 16px sans-serif';ctx.textAlign='right';ctx.fillText(Math.round(prog*100)+'%',318,85);ctx.textAlign='left';
      /* 右上面板：民情 KINDNESS */
      ctx.fillStyle='rgba(13,14,16,.9)';cutP(1010,14,254,96,12);ctx.fill();ctx.strokeStyle='#4a4d52';cutP(1010,14,254,96,12);ctx.stroke();ctx.fillStyle='#ffcf24';ctx.fillRect(1010,14,3,96);
      ctx.fillStyle='#f2f3f4';ctx.font='bold 14px sans-serif';ctx.fillText('民情',1028,36);ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.fillText('KINDNESS',1072,36);
      ctx.fillStyle='#7ecbff';ctx.font='900 20px sans-serif';ctx.fillText(s.kindness+'/3',1028,64);
      ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('克制 '+s.restrained+'/8',1108,52);ctx.fillText('失误 '+s.mistakes,1108,76);
      /* 底部提示条 */
      ctx.fillStyle='rgba(13,14,16,.78)';cutP(16,690,1248,22,8);ctx.fill();
      ctx.fillStyle=s.flashT>0?'#ffdea1':'#9a9c9f';ctx.font='13px sans-serif';
      ctx.fillText(s.flashT>0?s.flash:(s.round<=2?'教学模拟：发光的老物件不要碰；「该做的事」热点要点掉。':'把物品分进两区后「出发」。被子——剪成两半。'),26,705);
      /* 结算覆盖层 */
      if(s.status==='won'){const e=this.evaluate(s),r=this.rating(s);
        ctx.fillStyle='rgba(6,8,10,.55)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(13,14,16,.92)';ctx.fillRect(240,200,800,290);ctx.strokeStyle='#ffcf24';ctx.lineWidth=2;ctx.strokeRect(240,200,800,290);
        ctx.textAlign='center';ctx.fillStyle='#ffcf24';ctx.font='bold 40px sans-serif';ctx.fillText('半条被子',640,262);
        ctx.fillStyle='#8b8e93';ctx.font='12px sans-serif';ctx.fillText('H A L F   A   Q U I L T',640,286);
        ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(r.rating+' · '+r.score+' 分',640,322);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText('克制 '+e.restrained+'/8 · 小事 '+e.kindness+'/3 · 分配 '+e.correct+'/4 · 失误 '+e.mistakes,640,348);
        ctx.fillStyle='#e8e2d2';ctx.font='15px sans-serif';ctx.fillText('三名女红军把仅有的一条被子剪成两半——半条留给徐解秀。',640,388);
        ctx.fillStyle='#ffdea1';ctx.font='bold 15px sans-serif';ctx.fillText('「等革命胜利了，我们会回来看您。」',640,416);
        ctx.fillStyle='#9a9c9f';ctx.font='12px sans-serif';ctx.fillText('点「记录成绩 · 收录见证」保存。',640,452);ctx.textAlign='left';}
    };
    const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}
      if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000);last=now;
      if(click){this.tap(s,click.x,click.y);click=null;}
      for(const event of s.events.splice(0)){sound(event);
        if(event==='touch'||event==='round'){canvas.classList.remove('blanket72-shake');void canvas.offsetWidth;canvas.classList.add('blanket72-shake');}
        sync();}
      draw();if(now-(frame.hudAt||0)>100||s.status!=='playing'){sync();frame.hudAt=now;}raf=requestAnimationFrame(frame);};
    sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
