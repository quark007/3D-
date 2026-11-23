/* Original arcade exercise: turn-based map deduction only, never real military parameters. 原创推演练习，数值均为教学设定。 */
window.SiduBluff67={
  supports(id){return Number(id)===4;},
  /* 渡口自北向南：土城、太平渡、二郎滩、茅台（坐标为画布设定值）。 */
  FORDS:[{name:'土城',x:742,y:140},{name:'太平渡',x:612,y:330},{name:'二郎滩',x:722,y:492},{name:'茅台',x:652,y:648}],
  /* 史实渡口：一渡土城（元厚亦可）、二渡太平渡（二郎滩亦可）、三渡茅台、四渡二郎滩（太平渡亦可）。 */
  history:[['土城','元厚'],['太平渡','二郎滩'],['茅台'],['二郎滩','太平渡']],
  /* 敌军三个纵队的方位标记（兵棋风格示意，非真实部署）。 */
  ENEMY:[{name:'何键',x:170,y:330,ux:1,uy:0},{name:'吴奇伟',x:1085,y:150,ux:-.707,uy:.707},{name:'周浑元',x:1115,y:470,ux:-1,uy:0}],
  briefing(round){return ['一渡 · 1935年1月末：土城战斗后，敌军各纵队向赤水河合围逼近，需迅速渡河摆脱追击。','二渡 · 1935年2月中下旬：敌军主力被引向川南，黔北空虚，红军回师东渡赤水。','三渡 · 1935年3月中旬：红军经茅台西渡赤水，再入川南调动敌军。','四渡 · 1935年3月下旬：敌军再次向川南集结，红军秘密东渡，南渡乌江跳出重围。'][round-1]||'';},
  create(){return {rounds:[],round:1,main:null,lamp:null,lastCrossing:null,mode:'main',status:'ready',blockedThisRound:0,pending:null,lastBlock:null,resolveTimer:0,anim:0,morale:70,troops:100,events:[],log:[],roundMsg:''};},
  /* 敌军封锁权重（纯函数，结算面板透明展示）：基础1.0 + 本轮点灯2.2 + 上一轮实际渡河1.2 + 噪声0~0.8。 */
  weights(sel,random=Math.random){return this.FORDS.map((_,i)=>1+(sel.lamp===i?2.2:0)+(sel.lastCrossing===i?1.2:0)+random()*0.8);},
  simulate(sel,random=Math.random){const ws=this.weights(sel,random);let block=0;for(let i=1;i<ws.length;i++)if(ws[i]>ws[block])block=i;return {ws,block};},
  resolve(sel,random=Math.random){const r=this.simulate(sel,random);return {ws:r.ws,block:r.block,blocked:r.block===sel.main};},
  rating(score){const v=Math.max(0,Math.min(100,Math.round(score)));return v>=95?{score:v,rating:'用兵如神'}:v>=80?{score:v,rating:'虚实相生'}:v>=60?{score:v,rating:'跳出重围'}:{score:v,rating:'再演一次'};},
  /* 计分：基础60；与史实渡口一致每渡+10；每次被堵-8；结果夹在0~100。 */
  score(rounds){let bonus=0,penalty=0;for(let i=0;i<rounds.length;i++){if((this.history[i]||[]).includes(this.FORDS[rounds[i].ford].name))bonus+=10;penalty+=8*(rounds[i].blocked||0);}return {...this.rating(60+bonus-penalty),bonus,penalty};},
  pick(s,i){if(s.status!=='plan'||!(i>=0&&i<=3))return false;if(s.mode==='main'){if(s.main===i)return false;s.main=i;s.mode='lamp';}else{if(s.lamp===i)return false;s.lamp=i;s.events.push('lamp');}return true;},
  attempt(s,random=Math.random){if(s.status!=='plan'||(s.main===null||s.main===undefined)||(s.lamp===null||s.lamp===undefined))return false;const r=this.resolve({main:s.main,lamp:s.lamp,lastCrossing:s.lastCrossing},random);s.pending=r;s.lastBlock=r.block;s.resolveTimer=0;s.status='resolve';s.log.push({round:s.round,attempt:s.blockedThisRound+1,main:s.main,lamp:s.lamp,ws:r.ws.map(v=>Math.round(v*10)/10),block:r.block,blocked:r.blocked});return true;},
  /* 每次尝试固定 2 秒解析动画（敌军箭头压向 AI 判断的渡口），随后进入本轮结算浮层。 */
  step(s,dt=1/60){s.anim+=dt;if(s.status!=='resolve')return;s.resolveTimer+=dt;if(s.resolveTimer<2)return;s.status='settle';s.events.push(s.pending.blocked?'blocked':'success');},
  continueRound(s){if(s.status!=='settle'||!s.pending)return false;const p=s.pending;if(p.blocked){s.blockedThisRound++;s.troops=Math.max(20,s.troops-7);s.pending=null;if(s.blockedThisRound>=2)this.land(s,'再损兵力后，部队强行突过河去。');else{s.status='plan';s.main=null;s.lamp=null;s.roundMsg='渡河被堵！敌军压向'+this.FORDS[p.block].name+'，本轮损兵。可重演本轮一次：可更换主力渡口或佯动渡口。';}}else{s.morale=Math.min(100,s.morale+6);this.land(s,'渡河成功，士气提升。');}return true;},
  land(s,lead){s.rounds.push({round:s.round,ford:s.main,blocked:s.blockedThisRound});s.lastCrossing=s.main;const done=s.round>=4;s.round++;s.main=null;s.lamp=null;s.blockedThisRound=0;s.mode='main';s.pending=null;if(done){s.status='won';s.roundMsg='';}else{s.status='plan';s.roundMsg=lead+this.briefing(s.round);}},
  begin(s){if(s.status!=='ready')return false;s.status='plan';s.roundMsg=this.briefing(1)+' 推演提示：点灯佯动可误导敌军，佯动与渡河常不在同一渡口。';return true;},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('sidu-style'))return;const el=document.createElement('style');el.id='sidu-style';el.textContent=`
    .sidu-dialog{box-sizing:border-box;width:min(1100px,96vw);max-width:96vw;max-height:96dvh;margin:auto;padding:18px;background:#1c2733;color:#efe4cc;border:1px solid #ad9361;border-radius:16px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif}
    .sidu-dialog::backdrop{background:#070b0ee6}.sidu-dialog h2{margin:0;font-size:clamp(19px,3vw,28px);color:#ead7ac}.sidu-dialog h3{margin:0 0 6px;color:#ead7ac}.sidu-dialog p{margin:7px 0}.sidu-dialog header,.sidu-actions,.sidu-controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.sidu-dialog header{justify-content:space-between}.sidu-dialog button{font:inherit;background:#2e4152;color:#f4e6c6;border:1px solid #a38c60;border-radius:11px;padding:8px 14px;min-height:42px;cursor:pointer}.sidu-dialog button:disabled{opacity:.45;cursor:default}.sidu-dialog :focus-visible{outline:3px solid #e4b96b;outline-offset:2px}.sidu-stage{position:relative}.sidu-dialog canvas{display:block;width:min(82.2dvh,100%);aspect-ratio:16/9;height:auto;margin:0 auto;background:#e9e2c8;touch-action:none;border-radius:6px}.sidu-float{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#22303de8;border:1px solid #ad9361;border-radius:13px;padding:14px 18px;max-width:min(560px,90%);text-align:center}.sidu-float h3{font-size:19px}.sidu-float p{margin:4px 0;font-size:13px;color:#d8cba4}.sidu-controls{gap:8px}.sidu-modes,.sidu-fords{display:flex;gap:6px;flex-wrap:wrap}.sidu-dialog button.sidu-picked{background:#4b6b52;border-color:#e4b96b}.sidu-note{font-size:13px;color:#c4c5ae}.sidu-status{min-height:1.5em;color:#ffdea1}.sidu-actions{margin-top:8px}.sidu-dialog [hidden]{display:none!important}.sidu-final{background:#22303d;border:1px solid #ad9361;border-radius:12px;padding:13px;margin-top:8px}.sidu-table{border-collapse:collapse;width:100%;font-size:14px;margin:6px 0}.sidu-table th,.sidu-table td{border:1px solid #6d7a86;padding:5px 8px;text-align:center}.challenge-item.sidu-entry{cursor:pointer;border:1px solid #ab905c;border-radius:8px;padding:13px;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.challenge-item.sidu-entry:hover,.challenge-item.sidu-entry:focus-visible{transform:translateY(-2px);border-color:#e4c98a;box-shadow:0 5px 16px rgba(0,0,0,.4)}.sidu-shake{animation:sidu-shake .18s linear}@keyframes sidu-shake{25%{transform:translate(4px,-2px)}75%{transform:translate(-3px,2px)}}@media(prefers-reduced-motion:reduce){.sidu-shake{animation:none}}@media(max-width:600px){.sidu-dialog{padding:12px;font-size:13px}.sidu-dialog canvas{max-height:36dvh}.sidu-controls{gap:4px}.sidu-dialog button{padding:7px 12px}.sidu-dialog h2{font-size:19px}.sidu-table{font-size:13px}.sidu-float{padding:12px 13px}}`;
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();
    if(window.ChishuiBoard){this.closeActive=()=>window.ChishuiBoard.close();return window.ChishuiBoard.open(node,onComplete);}
    this.style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dialog=document.createElement('dialog');dialog.className='sidu-dialog';dialog.setAttribute('aria-labelledby','sidu-title');
    dialog.innerHTML='<header><h2 id="sidu-title">四渡赤水 · 迷雾渡河</h2><button data-close>返回地图 · Esc</button></header><p data-intro>声东击西推演：每渡先点选一个主力渡河渡口，再点一处「点灯佯动」误导敌军。敌军会压向权重最高的渡口：基础 1.0，点灯 +2.2，上一轮实际渡河 +1.2，判断噪声 0~0.8，权重全程透明。被堵可重演本轮一次。四渡完成即结算。</p><div class="sidu-stage"><canvas width="1280" height="720" tabindex="0" aria-label="四渡赤水推演图。左右方向键在渡口间移动选择，上下方向键切换主力或佯动，回车确认；也可直接点击渡口。"></canvas><div class="sidu-float" data-float hidden><h3 data-float-title></h3><p data-float-w></p><p data-float-sub></p><button data-continue>继续</button></div></div><p data-hud></p><div class="sidu-controls"><div class="sidu-modes" role="group" aria-label="选择模式"><button data-mode="main" aria-pressed="true">选主力</button><button data-mode="lamp" aria-pressed="false">点灯佯动</button></div><div class="sidu-fords" role="group" aria-label="渡口"><button data-ford="0">土城</button><button data-ford="1">太平渡</button><button data-ford="2">二郎滩</button><button data-ford="3">茅台</button></div><button data-go disabled>开始渡河</button></div><p class="sidu-status" role="status" aria-live="polite"></p><div class="sidu-actions"><button data-start>开始推演</button><button data-retry>重新推演</button><button data-mute>声音</button><button data-complete hidden>记录成绩 · 完成本章</button></div><div class="sidu-final" data-final hidden></div><p class="sidu-note">计分：四渡全部成功为基础 60 分；与史实渡口一致（一渡土城〔元厚亦可〕、二渡太平渡〔二郎滩亦可〕、三渡茅台、四渡二郎滩〔太平渡亦可〕）每渡 +10；每次被堵 -8。95 分以上「用兵如神」，80 分以上「虚实相生」，60 分以上「跳出重围」。方向键选渡口，上下键切换主力/佯动，回车确认，Esc 返回。</p><details class="sidu-note"><summary>史实与练习说明</summary><p>本小游戏为原创教学推演，不是历史作战复原；渡口方位、敌军纵队位置、封锁权重与兵力士气数值均为教学简化设定，不代表真实兵力与战术参数。</p><p>史实注脚：1935年1-3月，中央红军以一渡土城、二渡太平渡、二郎滩、三渡茅台、四渡二郎滩、太平渡跳出国军重围，毛泽东称此为其得意之笔。</p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');let s=this.create(),raf=0,last=0,closed=false,recorded=false,ac=null,master=null,audioMuted=null,cursor=0;
    this.session=s;
    const sound=(kind)=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime;
      if(kind==='lamp'){const b=ac.createBuffer(1,Math.floor(ac.sampleRate*.06),ac.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,2);const n=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();n.buffer=b;f.type='highpass';f.frequency.value=1200;g.gain.value=.12;n.connect(f);f.connect(g);g.connect(master);n.start(now);}
      else if(kind==='success'){const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(110,now);o.frequency.exponentialRampToValueAtTime(55,now+.28);g.gain.setValueAtTime(.14,now);g.gain.exponentialRampToValueAtTime(.001,now+.34);o.connect(g);g.connect(master);o.start(now);o.stop(now+.36);const t=ac.createOscillator(),tg=ac.createGain();t.type='triangle';t.frequency.setValueAtTime(392,now+.12);t.frequency.setValueAtTime(523,now+.30);tg.gain.setValueAtTime(.0001,now);tg.gain.setValueAtTime(.07,now+.14);tg.gain.setValueAtTime(.07,now+.34);tg.gain.exponentialRampToValueAtTime(.001,now+.56);t.connect(tg);tg.connect(master);t.start(now+.12);t.stop(now+.6);}
      else if(kind==='blocked'){const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(70,now);o.frequency.exponentialRampToValueAtTime(38,now+.4);g.gain.setValueAtTime(.16,now);g.gain.exponentialRampToValueAtTime(.001,now+.45);o.connect(g);g.connect(master);o.start(now);o.stop(now+.5);}
    }catch{/* Sound must never block the exercise. */}};
    const applyMute=()=>{if(!ac)return;const m=this.muted();master.gain.value=m?0:1;if(m)ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});};
    const gesture=()=>{try{if(this.muted()){applyMute();return;}if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac)applyMute();}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{
      q('[data-hud]').textContent=`第 ${s.round}/4 渡 · 主力 ${(s.main===null||s.main===undefined)?'—':this.FORDS[s.main].name} · 佯动 ${(s.lamp===null||s.lamp===undefined)?'—':this.FORDS[s.lamp].name} · 士气 ${Math.round(s.morale)} · 兵力 ${Math.round(s.troops)}%`;
      for(const b of dialog.querySelectorAll('[data-mode]')){b.setAttribute('aria-pressed',String(s.mode===b.dataset.mode));b.disabled=s.status!=='plan';}
      for(const b of dialog.querySelectorAll('[data-ford]')){const i=Number(b.dataset.ford);b.classList.toggle('sidu-picked',s.mode==='main'?s.main===i:s.lamp===i);b.disabled=s.status!=='plan';}
      q('[data-go]').disabled=s.status!=='plan'||(s.main===null||s.main===undefined)||(s.lamp===null||s.lamp===undefined);
      q('[data-start]').hidden=s.status!=='ready';
      q('[data-complete]').hidden=s.status!=='won';
      const fl=q('[data-float]');
      if(s.status==='settle'&&s.pending){if(fl.hidden){fl.hidden=false;const p=s.pending,cn=['一','二','三','四'][s.round-1]||'';q('[data-float-title]').textContent=p.blocked?'被堵！敌军纵队压向 '+this.FORDS[p.block].name:'第'+cn+'渡成功 · 经 '+this.FORDS[s.main].name+' 渡河';q('[data-float-w]').textContent='敌军权重：'+p.ws.map((w,i)=>this.FORDS[i].name+' '+w.toFixed(1)).join(' · ')+' → 封锁 '+this.FORDS[p.block].name;q('[data-float-sub]').textContent=p.blocked?(s.blockedThisRound>=1?'部队再损兵力后，将强行突渡。':'本轮损兵。可重演本轮一次：可更换主力渡口或佯动渡口。'):'渡河成功，士气提升。';}}
      else if(!fl.hidden)fl.hidden=true;
      if(s.status==='won'){const fin=q('[data-final]');if(fin.hidden){fin.hidden=false;const r=this.score(s.rounds);fin.innerHTML='<h3>推演结算 · '+r.score+' 分 · '+r.rating+'</h3><table class="sidu-table"><thead><tr><th>轮次</th><th>你的渡口</th><th>史实渡口</th><th>被堵</th><th>对照</th></tr></thead><tbody>'+s.rounds.map((rd,idx)=>{const hist=this.history[idx]||[],hit=hist.includes(this.FORDS[rd.ford].name);return '<tr><td>第'+(idx+1)+'渡</td><td>'+this.FORDS[rd.ford].name+'</td><td>'+hist.join(' / ')+'</td><td>'+(rd.blocked?rd.blocked+' 次':'—')+'</td><td>'+(hit?'✓':'✗')+'</td></tr>';}).join('')+'</tbody></table><p class="sidu-note">敌军AI：封锁 argmax(基础1.0 + 点灯佯动2.2 + 上一轮实际渡河1.2 + 噪声0~0.8)，权重全程透明可查。</p><p class="sidu-note">史实注脚：1935年1-3月，中央红军以一渡土城、二渡太平渡、二郎滩、三渡茅台、四渡二郎滩、太平渡跳出国军重围，毛泽东称此为其得意之笔。</p><p class="sidu-note">渡口方位与兵力均为教学简化设定。</p>';}}
      let text;if(s.status==='ready')text='点击「开始推演」查看敌情简报。';else if(s.status==='resolve')text='敌军纵队正在判断我军动向……';else if(s.status==='settle')text='本轮推演结算。';else if(s.status==='won')text='推演完成 · '+this.score(s.rounds).rating;else{const hint=(s.main===null||s.main===undefined)?'点选主力渡河渡口。':(s.lamp===null||s.lamp===undefined)?'点选点灯佯动的渡口。':'可点「开始渡河」。';text=(s.roundMsg||'')+(s.roundMsg?' ':'')+hint;}
      if(q('.sidu-status').textContent!==text)q('.sidu-status').textContent=text;
    };
    for(const b of dialog.querySelectorAll('[data-mode]'))b.onclick=()=>{if(s.status!=='plan')return;s.mode=b.dataset.mode;sync();};
    for(const b of dialog.querySelectorAll('[data-ford]'))b.onclick=()=>{gesture();if(this.pick(s,Number(b.dataset.ford))){cursor=Number(b.dataset.ford);sync();}};
    q('[data-go]').onclick=()=>{gesture();if(this.attempt(s))sync();};
    q('[data-continue]').onclick=()=>{gesture();if(this.continueRound(s))sync();};
    q('[data-start]').onclick=()=>{gesture();if(this.begin(s)){last=0;canvas.focus();sync();}};
    q('[data-retry]').onclick=()=>{gesture();s=this.create();this.session=s;s.status='plan';s.roundMsg=this.briefing(1)+' 推演提示：点灯佯动可误导敌军，佯动与渡河常不在同一渡口。';recorded=false;cursor=0;last=0;const fin=q('[data-final]');fin.hidden=true;fin.innerHTML='';sync();canvas.focus();};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};
    q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.score(s.rounds),key='sidu67_'+node.id;GameState.storyPreparations||={};const old=GameState.storyPreparations[key];if(!old||old.score<result.score)GameState.storyPreparations[key]={score:result.score,rating:result.rating,completedAt:new Date().toISOString()};GameState.recordBattleScore(node.id,result.score,result.rating);GameState.save();close();if(typeof onComplete==='function')onComplete();};
    const point=e=>{const r=canvas.getBoundingClientRect(),scale=Math.min(r.width/1280,r.height/720),ox=r.left+(r.width-1280*scale)/2,oy=r.top+(r.height-720*scale)/2;return{x:(e.clientX-ox)/scale,y:(e.clientY-oy)/scale};};
    canvas.onpointerdown=e=>{if(s.status!=='plan'||e.button>0)return;const p=point(e),i=this.FORDS.findIndex(f=>Math.hypot(p.x-f.x,p.y-f.y)<62);if(i<0)return;gesture();cursor=i;this.pick(s,i);sync();e.preventDefault();};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}if(e.target!==canvas)return;
      if(e.key==='Enter'||e.key===' '){if(s.status==='settle'){e.preventDefault();e.stopPropagation();q('[data-continue]').click();return;}if(s.status==='plan'){e.preventDefault();e.stopPropagation();this.pick(s,cursor);sync();return;}}
      if(s.status!=='plan')return;
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();cursor=(cursor+(e.key==='ArrowRight'?1:3))%4;sync();}
      else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();s.mode=s.mode==='main'?'lamp':'main';sync();}};
    dialog.addEventListener('keydown',key);
    const chev=(px,py,ux,uy)=>{ctx.beginPath();ctx.moveTo(px-ux*6-uy*8,py-uy*6+ux*8);ctx.lineTo(px+ux*7,py+uy*7);ctx.lineTo(px-ux*6+uy*8,py-uy*6-ux*8);ctx.stroke();};
    const arrow=(x0,y0,x1,y1)=>{const dx=x1-x0,dy=y1-y0,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len;ctx.strokeStyle='#a04a3c';ctx.fillStyle='#a04a3c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1-ux*16,y1-uy*16);ctx.stroke();ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x1-ux*18-uy*9,y1-uy*18+ux*9);ctx.lineTo(x1-ux*18+uy*9,y1-uy*18-ux*9);ctx.closePath();ctx.fill();};
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);
      const paper=ctx.createLinearGradient(0,0,0,720);paper.addColorStop(0,'#e9e2c8');paper.addColorStop(1,'#dcd4b4');ctx.fillStyle=paper;ctx.fillRect(0,0,1280,720);
      ctx.fillStyle='#c9cfab';ctx.beginPath();ctx.moveTo(0,130);ctx.quadraticCurveTo(230,40,440,140);ctx.quadraticCurveTo(290,210,0,220);ctx.fill();
      ctx.fillStyle='#bdc79e';ctx.beginPath();ctx.moveTo(1280,100);ctx.quadraticCurveTo(1050,30,880,150);ctx.quadraticCurveTo(1070,220,1280,230);ctx.fill();
      ctx.fillStyle='#cfd5b2';ctx.beginPath();ctx.moveTo(0,570);ctx.quadraticCurveTo(270,470,530,590);ctx.quadraticCurveTo(260,670,0,690);ctx.fill();
      ctx.fillStyle='#c2cda4';ctx.beginPath();ctx.moveTo(1280,610);ctx.quadraticCurveTo(1030,510,770,630);ctx.quadraticCurveTo(1030,700,1280,720);ctx.fill();
      ctx.strokeStyle='#b3b08c66';ctx.lineWidth=1;for(let i=0;i<5;i++){ctx.beginPath();for(let x=0;x<=1280;x+=32){const y=80+i*125+Math.sin(x*.01+i*1.7)*18;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}
      const river=()=>{ctx.beginPath();ctx.moveTo(660,-30);ctx.quadraticCurveTo(790,60,742,140);ctx.quadraticCurveTo(695,245,612,330);ctx.quadraticCurveTo(532,415,722,492);ctx.quadraticCurveTo(900,560,652,648);ctx.quadraticCurveTo(500,710,540,760);};
      ctx.lineCap='round';ctx.lineJoin='round';river();ctx.strokeStyle='#5d848d';ctx.lineWidth=54;ctx.stroke();river();ctx.strokeStyle='#8fb3ba';ctx.lineWidth=40;ctx.stroke();river();ctx.strokeStyle='#b3d0d366';ctx.lineWidth=16;ctx.stroke();
      ctx.fillStyle='#ffffff1c';for(let i=0;i<3;i++){const off=reduced?0:Math.sin(s.anim*.25+i*2.1)*70;ctx.beginPath();ctx.ellipse(640+off,120+i*220,730,52,0,0,Math.PI*2);ctx.fill();}
      for(const col of this.ENEMY){const cy=col.y-27;let tx=null,ty=null,alpha=1;
        if(s.status==='resolve'&&s.pending){const p=Math.min(1,s.resolveTimer/2),f=this.FORDS[s.pending.block];tx=col.x+(f.x-col.x)*p*.8;ty=cy+(f.y-cy)*p*.8;}
        else if((s.lastBlock!==null&&s.lastBlock!==undefined)){const f=this.FORDS[s.lastBlock];tx=col.x+(f.x-col.x)*.8;ty=cy+(f.y-cy)*.8;alpha=.35;}
        ctx.globalAlpha=alpha;if((tx!==null&&tx!==undefined))arrow(col.x+col.ux*70,cy+col.uy*70,tx,ty);ctx.globalAlpha=1;
        ctx.fillStyle='#5c4436';ctx.fillRect(col.x-54,cy-15,108,30);ctx.strokeStyle='#d8c6a1';ctx.lineWidth=1.5;ctx.strokeRect(col.x-54,cy-15,108,30);
        ctx.fillStyle='#f4e6c6';ctx.font='16px "Microsoft YaHei",sans-serif';ctx.textAlign='center';ctx.fillText(col.name+'纵队',col.x,cy+6);
        ctx.strokeStyle='#5c4436';ctx.lineWidth=3;for(let k=0;k<3;k++)chev(col.x+col.ux*(62+k*14+(reduced?0:(s.anim*26)%14)),cy+col.uy*(62+k*14+(reduced?0:(s.anim*26)%14)),col.ux,col.uy);}
      ctx.textAlign='center';
      for(let i=0;i<this.FORDS.length;i++){const f=this.FORDS[i];
        /* 桥板：沿河向的木板桥 */
        const bx=f.x-60,by=f.y-18,bdx=120/7,bdy=36/7;
        ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+120,by+36);ctx.stroke();
        ctx.strokeStyle='#7a6a4f';ctx.lineWidth=7;for(let p=0;p<=7;p++){ctx.beginPath();ctx.moveTo(bx+p*bdx,by+p*bdy-9);ctx.lineTo(bx+p*bdx-6,by+p*bdy+9);ctx.stroke();}
        ctx.fillStyle='#5c4436';ctx.fillRect(bx-8,by-14,14,28);ctx.fillRect(bx+114,by+22,14,28);
        /* 名牌（带投影） */
        ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(f.x-34,f.y-43,72,26);
        ctx.fillStyle='#2f3a46';ctx.fillRect(f.x-36,f.y-46,72,26);ctx.strokeStyle='#d8c6a1';ctx.lineWidth=1.5;ctx.strokeRect(f.x-36,f.y-46,72,26);
        ctx.fillStyle='#f4e6c6';ctx.font='18px "Microsoft YaHei",sans-serif';ctx.fillText(f.name,f.x,f.y-27);
        if(s.main===i){const pr=reduced?0:Math.sin(s.anim*4)*4;if(!reduced){ctx.strokeStyle='#b03a2e';ctx.lineWidth=4;ctx.beginPath();ctx.arc(f.x,f.y+2,44+pr,0,Math.PI*2);ctx.stroke();}ctx.fillStyle='#b03a2e';ctx.fillRect(f.x+40,f.y-44,54,22);ctx.fillStyle='#fff';ctx.font='15px "Microsoft YaHei",sans-serif';ctx.fillText('主力',f.x+67,f.y-28);}
        if(s.lamp===i){const fl=reduced?0:Math.sin(s.anim*6)*1.5,lx=f.x+12,ly=f.y+18+fl;
          const lglow=ctx.createRadialGradient(lx,ly,3,lx,ly,46);lglow.addColorStop(0,'rgba(240,190,100,.45)');lglow.addColorStop(1,'rgba(240,190,100,0)');ctx.fillStyle=lglow;ctx.fillRect(lx-46,ly-46,92,92);
          ctx.fillStyle='#e4b96b';ctx.beginPath();ctx.moveTo(lx,ly-8);ctx.lineTo(lx-7,ly+2);ctx.lineTo(lx+7,ly+2);ctx.closePath();ctx.fill();ctx.strokeStyle='#a3813a';ctx.lineWidth=2;ctx.strokeRect(lx-8,ly+4,16,18);ctx.fillStyle='#6e5312';ctx.font='14px "Microsoft YaHei",sans-serif';ctx.fillText('佯动点灯',f.x+52,f.y+42);}
        if(s.lastCrossing===i){ctx.fillStyle='#4a4436';ctx.font='13px "Microsoft YaHei",sans-serif';ctx.fillText('上一渡',f.x,f.y+66);}
        if(cursor===i&&s.status==='plan'){ctx.setLineDash([5,5]);ctx.strokeStyle='#2f3a46';ctx.lineWidth=2;ctx.beginPath();ctx.arc(f.x,f.y+2,52,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}}
      ctx.strokeStyle='#4a4436';ctx.lineWidth=2;ctx.beginPath();ctx.arc(1218,64,26,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#4a4436';ctx.beginPath();ctx.moveTo(1218,44);ctx.lineTo(1211,66);ctx.lineTo(1218,60);ctx.lineTo(1225,66);ctx.closePath();ctx.fill();ctx.font='14px "Microsoft YaHei",sans-serif';ctx.fillText('北',1218,104);
      /* 图名卷轴 */
      ctx.fillStyle='rgba(58,53,42,.92)';ctx.fillRect(420,12,440,46);ctx.strokeStyle='#d8c6a1';ctx.lineWidth=1.5;ctx.strokeRect(420,12,440,46);ctx.strokeStyle='rgba(216,198,161,.5)';ctx.strokeRect(425,17,430,36);
      ctx.fillStyle='#f4e6c6';ctx.font='bold 20px "Microsoft YaHei",sans-serif';ctx.fillText('四 渡 赤 水 · 迷 雾 渡 河',640,42);
      /* 回合朱印 */
      ctx.fillStyle='#b03a2e';ctx.beginPath();ctx.arc(48,40,25,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(48,40,20,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 15px "Microsoft YaHei",sans-serif';ctx.fillText((['一','二','三','四'][Math.min(3,s.round-1)]||'')+'渡',48,46);
      /* 落款朱印 */
      ctx.save();ctx.translate(1200,668);ctx.rotate(-0.10);ctx.fillStyle='rgba(176,58,46,.88)';ctx.fillRect(-26,-26,52,52);ctx.strokeStyle='rgba(255,255,255,.65)';ctx.lineWidth=1.5;ctx.strokeRect(-21,-21,42,42);ctx.fillStyle='#fff';ctx.font='bold 16px "Microsoft YaHei",sans-serif';ctx.fillText('星',-8,0);ctx.fillText('火',-8,18);ctx.restore();
      ctx.textAlign='left';ctx.font='14px "Microsoft YaHei",sans-serif';ctx.fillStyle='#6b6248';ctx.fillText('教学推演 · 渡口方位与数值均为教学简化设定 · 上为北',26,700);
    };
    let hudAt=0;const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}
      if(ac){const m=this.muted();if(m!==audioMuted){master.gain.value=m?0:1;audioMuted=m;if(m)ac.suspend().catch(()=>{});/* Resume only from a later player gesture. */}}
      if(last&&!this.paused())this.step(s,Math.min(.25,(now-last)/1000));last=now;
      for(const event of s.events.splice(0)){sound(event);if(event==='blocked'){canvas.classList.remove('sidu-shake');void canvas.offsetWidth;canvas.classList.add('sidu-shake');}}
      draw();if(now-hudAt>100||s.status!=='plan'){sync();hudAt=now;}raf=requestAnimationFrame(frame);
    };sync();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
