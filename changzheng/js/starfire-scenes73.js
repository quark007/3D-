/* Five original teaching simulations. All quantities are game units, never medical or engineering advice. */
window.StarfireScenes73={
 definitions:{
  matches:{node:9,title:'七根火柴 · 守护火种',subtitle:'FIRE IN THE RAIN',intro:'四段草地夜行，只有七根火柴。安排支援、遮蔽与护送，既照应同行者，也把火种留给队伍。',keys:'用下方三个选项或数字1—3作出选择。'},
  cipher:{node:4,title:'军委二局 · 密电破局',subtitle:'SIGNAL AND EVIDENCE',intro:'依照本关教学符号表还原三段练习短句。符号和电文均为原创，不是真实密电，也不代替摩斯学堂。',keys:'数字1—6填入词语，Backspace撤回，Enter核对。'},
  alliance:{node:5,title:'彝海结盟 · 倾听与信任',subtitle:'LISTEN BEFORE YOU ANSWER',intro:'在独立回望中练习倾听、核对与尊重。下列对白均为创作，不是历史人物原话，不改变真实结盟的结果。',keys:'用三个选项或数字1—3回应。'},
  chains:{node:7,title:'飞夺泸定桥 · 铁索冲锋',subtitle:'ACROSS THE CHAINS',intro:'观察扫射预告，调整步伐、跃过缺口或铺上桥板。失败只表现为停止练习、重新组织，不表现坠落或伤亡。',keys:'A/D或左右键移动，S或下键俯身，Space跳跃，B铺板。'},
  aid:{node:2,title:'战地药箱 · 湘江接应',subtitle:'CARE AND COORDINATION',intro:'规划接应路线，避开有预告的危险格。教学药包数量有限，也可护送回接应点；所有资源均为游戏单位。',keys:'方向键移动，E使用教学药包，F护送；返回左侧接应点自动登记。'}
 },
 cipherTable:[['●','前'],['▲','方'],['■','桥'],['◆','畔'],['☆','会'],['□','合']],
 messages:[[0,1,4,5],[2,3,4,5],[0,1,2,3]],
 questions:[
  {text:'创作对白：你们为何来到这里？',options:['先说明来意，再听取大家的顾虑','不作说明便匆忙通过','只谈自己的困难'],good:0},
  {text:'创作对白：彼此语言与习俗不同，怎样交流？',options:['要求所有人只按自己的方式办事','耐心请教，核对彼此理解','跳过沟通，凭猜测行动'],good:1},
  {text:'创作对白：有人对物资使用产生误会。',options:['把疑问搁置，继续赶路','只强调自己没有恶意','一起核对约定，说明物资用途'],good:2},
  {text:'创作对白：承诺之后，怎样让信任延续？',options:['遵守约定，遇到变化及时协商','把口头承诺当成全部工作','由一方替所有人作决定'],good:0}
 ],
 supports(kind,id){return this.definitions[kind]?.node===Number(id);},
 create(kind,mode='normal'){
  if(!this.definitions[kind])throw new RangeError('Unknown teaching scene');
  const s={kind,mode,status:'ready',time:0,accumulator:0,errors:0,round:0,hints:0,message:'读完提示后开始。',moves:0};
  if(kind==='matches')Object.assign(s,{matches:7,warmth:80,rescues:0,log:[]});
  if(kind==='cipher')Object.assign(s,{answer:[],timeLeft:mode==='hardcore'?32:50});
  if(kind==='alliance')Object.assign(s,{trust:mode==='hardcore'?10:30,correct:0});
  if(kind==='chains')Object.assign(s,{x:90,height:0,vy:0,health:mode==='hardcore'?2:4,planks:3,laid:[],hits:0,hitPeriod:-1,crouch:false,gaps:[[360,410],[650,720],[920,980]]});
  if(kind==='aid')Object.assign(s,{x:0,y:2,lastMove:-1,medicine:mode==='hardcore'?3:4,health:mode==='hardcore'?2:4,hitPeriod:-1,carried:null,delivered:[],walls:[[3,1],[3,2]],people:[{id:0,x:2,y:1,need:2,label:'优先接应'},{id:1,x:6,y:1,need:2,label:'优先接应'},{id:2,x:4,y:3,need:1,label:'等待接应'}]});
  return s;
 },
 win(s){s.status='won';s.message='练习完成。可以记录成绩，再回到本章继续研学。';},
 act(s,action,value){
  if(s.status!=='playing')return false;
  if(s.kind==='matches'&&action==='choose'){
   if(![0,1,2].includes(value))return false;
   const cost=[1,2,0][value];if(s.matches<cost){s.message='火柴不足，请调整安排。';return false;}
   s.matches-=cost;s.warmth=Math.min(100,s.warmth-(s.mode==='hardcore'?20:15)+[6,28,-12][value]);s.rescues+=Number(value===1);s.log.push(value);s.round++;
   if(s.warmth<=0){s.status='lost';s.message='队伍需要重新整备，请重新安排遮蔽和支援。';}
   else if(s.round===4){if(s.matches>=3&&s.rescues>=1)this.win(s);else{s.status='lost';s.message='还需要兼顾同行者与保留火种。请重新安排四段行程。';}}
   else s.message=['把火种护在干燥处，继续前行。','完成一次支援，重新整理队形。','利用遮蔽整备，不消耗火柴。'][value];return true;
  }
  if(s.kind==='cipher'){
   if(action==='token'&&Number.isInteger(value)&&value>=0&&value<6&&s.answer.length<4){s.answer.push(value);return true;}
   if(action==='undo'){s.answer.pop();return true;}
   if(action==='check'){
    if(s.answer.length!==4){s.message='先按顺序填满四个词位。';return false;}
    if(s.answer.every((v,i)=>v===this.messages[s.round][i])){s.round++;s.answer=[];s.timeLeft=s.mode==='hardcore'?32:50;s.message='练习短句核对正确，继续核对下一段。';if(s.round===3)this.win(s);}
    else{s.errors++;s.timeLeft=Math.max(0,s.timeLeft-6);s.message='顺序还未对应。请依照符号表逐位核对。';}return true;
   }
  }
  if(s.kind==='alliance'&&action==='choose'&&[0,1,2].includes(value)){
   const good=value===this.questions[s.round].good;s.correct+=Number(good);s.errors+=Number(!good);s.trust=Math.max(0,Math.min(100,s.trust+(good?23:-12)));s.round++;
   if(s.round===4){if(s.trust>=70)this.win(s);else{s.status='lost';s.message='请重新练习倾听与核对；这不改变真实历史。';}}
   else s.message=good?'认真回应，让彼此多一分理解。':'先停下来澄清，再继续沟通。';return true;
  }
  if(s.kind==='chains'){
   if(action==='jump'&&s.height<=.01){s.vy=440;return true;}
   if(action==='plank'){const index=s.gaps.findIndex((g,i)=>!s.laid.includes(i)&&Math.abs(s.x-g[0])<115);if(index>=0&&s.planks>0){s.laid.push(index);s.planks--;s.message='桥板已经铺稳。';return true;}s.message='靠近未铺板的缺口再试。';}
  }
  if(s.kind==='aid'){
   if(action==='move'){
    const delta={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[value];if(!delta||s.time-s.lastMove<.12)return false;
    const x=s.x+delta[0],y=s.y+delta[1];if(x<0||x>6||y<0||y>4||s.walls.some(p=>p[0]===x&&p[1]===y))return false;s.x=x;s.y=y;s.lastMove=s.time;s.moves++;
    if(x===0&&y===2&&s.carried!==null){s.delivered.push(s.carried);s.carried=null;s.message='已返回接应点，登记一次护送。';if(s.delivered.length===3)this.win(s);}return true;
   }
   const person=s.people.find(p=>p.x===s.x&&p.y===s.y&&!s.delivered.includes(p.id)&&s.carried!==p.id);
   if(action==='escort'&&person&&s.carried===null){s.carried=person.id;s.message='已结成护送，请沿路线返回左侧接应点。';return true;}
   if(action==='aid'&&person){if(s.medicine<person.need){s.message='教学药包不足，可以选择护送回接应点。';return false;}s.medicine-=person.need;s.delivered.push(person.id);s.message='完成一次教学接应安排。';if(s.delivered.length===3)this.win(s);return true;}
  }
  return false;
 },
 step(s,dt,input={}){
  if(s.status!=='playing')return;s.accumulator+=Math.max(0,Math.min(.1,Number(dt)||0));
  while(s.accumulator>=1/120&&s.status==='playing'){
   const d=1/120;s.accumulator-=d;s.time+=d;
   if(s.kind==='matches'){s.warmth-=d*(s.mode==='hardcore'?1.2:.7);if(s.warmth<=0){s.status='lost';s.message='整备不足，请重新安排火种与遮蔽。';}}
   if(s.kind==='cipher'){s.timeLeft-=d;if(s.timeLeft<=0){s.status='lost';s.message='核对时间结束，可以重新练习。';}}
   if(s.kind==='chains'){
    s.crouch=!!input.down;s.x=Math.max(70,Math.min(1170,s.x+((input.right?1:0)-(input.left?1:0))*(s.crouch?80:140)*d));
    s.height=Math.max(0,s.height+s.vy*d);s.vy=s.height>0?s.vy-980*d:0;
    const phase=s.time%1.5,period=Math.floor(s.time/1.5);if(phase>1.12&&phase<1.3&&s.x>250&&!s.crouch&&s.hitPeriod!==period){s.health--;s.hits++;s.hitPeriod=period;s.message='受到压制，请根据预告调整姿态。';}
    if(s.health<=0){s.status='lost';s.message='停止试练，重新组织掩护与推进。';}
    if(s.gaps.some((g,i)=>s.x>g[0]&&s.x<g[1]&&!s.laid.includes(i)&&s.height<8)){s.status='lost';s.message='缺口前先停步，铺板或掌握起跳时机。';}
    if(s.status==='playing'&&s.x>=1160)this.win(s);
   }
   if(s.kind==='aid'){
    const phase=s.time%3,period=Math.floor(s.time/3),danger=this.hazard(s);if(phase>2.1&&s.x===danger[0]&&s.y===danger[1]&&s.hitPeriod!==period){s.health--;s.hitPeriod=period;s.message='请避开已预告的危险格。';}
    if(s.health<=0||s.time>(s.mode==='hardcore'?120:180)){s.status='lost';s.message='停止本次练习，重新规划接应路线。';}
   }
  }
 },
 hazard(s){const positions=[[3,0],[4,2],[2,3]];return positions[Math.floor(s.time/3)%3];},
 rating(s){
  let excellent=false,good=false;
  if(s.kind==='matches'){excellent=s.rescues>=2&&s.matches>=3;good=s.matches>=3;}
  if(s.kind==='cipher'){excellent=s.errors===0;good=s.errors<=2;}
  if(s.kind==='alliance'){excellent=s.correct===4;good=s.correct>=3;}
  if(s.kind==='chains'){excellent=s.hits===0;good=s.hits<=1;}
  if(s.kind==='aid'){excellent=s.health===(s.mode==='hardcore'?2:4)&&s.delivered.slice(0,2).every(id=>id<2);good=s.health>=2;}
  const score=excellent?95:good?85:70;return {score,rating:score===95?'星火相传':score===85?'稳妥见证':'完成研学'};
 },
 describe(s){
  if(s.kind==='matches')return `第 ${Math.min(4,s.round+1)}/4 段 · 火柴 ${s.matches}/7 · 整备 ${Math.max(0,Math.round(s.warmth))} · 支援 ${s.rescues} 次`;
  if(s.kind==='cipher')return `第 ${Math.min(3,s.round+1)}/3 段 · 剩余 ${Math.ceil(s.timeLeft)} 秒 · 核对错误 ${s.errors} 次`;
  if(s.kind==='alliance')return `第 ${Math.min(4,s.round+1)}/4 次交流 · 信任 ${s.trust}/100 · 回应 ${s.correct} 次`;
  if(s.kind==='chains')return `推进 ${Math.min(100,Math.round((s.x-90)/1070*100))}% · 余板 ${s.planks} · 掩护 ${s.health} · ${(s.time%1.5)>.8?'扫射预告：俯身':'观察 · 推进'}`;
  return `接应 ${s.delivered.length}/3 · 教学药包 ${s.medicine} · 防护 ${s.health} · ${Math.floor(s.time)} 秒`;
 },
 draw(ctx,s){
  const night=['matches','cipher'].includes(s.kind);ctx.fillStyle=night?'#111e28':'#839389';ctx.fillRect(0,0,1280,720);
  for(let layer=0;layer<3;layer++){ctx.fillStyle=['#526d72','#354f51','#233d3e'][layer];ctx.beginPath();ctx.moveTo(0,720);for(let x=0;x<=1280;x+=32)ctx.lineTo(x,220+layer*100+Math.sin(x*.006+layer)*55);ctx.lineTo(1280,720);ctx.fill();}
  if(s.kind==='cipher'){
   ctx.fillStyle='#131d1b';ctx.fillRect(0,0,1280,210);ctx.fillRect(0,0,160,720);ctx.fillRect(1150,0,130,720);ctx.fillStyle='#654f34';ctx.fillRect(210,460,850,170);ctx.fillStyle='#d9c89f';ctx.fillRect(320,260,640,260);ctx.strokeStyle='#a6936b';for(let y=290;y<500;y+=30){ctx.beginPath();ctx.moveTo(345,y);ctx.lineTo(935,y);ctx.stroke();}ctx.fillStyle='#d7ac56';ctx.beginPath();ctx.ellipse(1030,400,40,70,0,0,7);ctx.fill();
  }else if(s.kind==='chains'){
   ctx.fillStyle='#698b96';ctx.fillRect(0,570,1280,150);for(let row=0;row<13;row++){ctx.strokeStyle=row<4?'#c5bda0':'#4a5656';ctx.lineWidth=row<4?3:1;ctx.beginPath();ctx.moveTo(70,510+row*4);ctx.quadraticCurveTo(640,580+Math.sin(s.time*2)*7,1200,510+row*4);ctx.stroke();}
   for(let x=90;x<1180;x+=30){if(s.gaps.some((g,i)=>x>g[0]&&x<g[1]&&!s.laid.includes(i)))continue;ctx.fillStyle='#827052';ctx.fillRect(x,514,25,22);}
   ctx.fillStyle='#323a35';ctx.fillRect(1160,280,120,250);if(s.time%1.5>.8){ctx.strokeStyle='#c97455';ctx.setLineDash([12,12]);ctx.beginPath();ctx.moveTo(1190,435);ctx.lineTo(240,510);ctx.stroke();ctx.setLineDash([]);}this.person(ctx,s.x,510-s.height,s.crouch);
  }else if(s.kind==='aid'){
   const size=104,ox=265,oy=100;for(let y=0;y<5;y++)for(let x=0;x<7;x++){ctx.fillStyle=s.walls.some(p=>p[0]===x&&p[1]===y)?'#293e34':(x+y)%2?'#8d9b7a':'#a0aa86';ctx.fillRect(ox+x*size,oy+y*size,size-4,size-4);}
   const h=this.hazard(s);ctx.strokeStyle=s.time%3>2.1?'#c7644d':'#d4b15f';ctx.lineWidth=5;ctx.strokeRect(ox+h[0]*size+5,oy+h[1]*size+5,size-15,size-15);ctx.fillStyle='#d1c799';ctx.fillRect(ox+5,oy+2*size+5,size-15,size-15);
   for(const p of s.people)if(!s.delivered.includes(p.id)&&s.carried!==p.id){this.person(ctx,ox+p.x*size+45,oy+p.y*size+72,false,'#dbca99');ctx.fillStyle='#26362c';ctx.font='20px sans-serif';ctx.fillText(p.need===2?'优先':'接应',ox+p.x*size+23,oy+p.y*size+25);}
   this.person(ctx,ox+s.x*size+45,oy+s.y*size+72,false,'#903c30');if(s.carried!==null)this.person(ctx,ox+s.x*size+68,oy+s.y*size+72,true,'#dfd6b6');
  }else{
   ctx.fillStyle=s.kind==='alliance'?'#6f9294':'#293b37';ctx.fillRect(0,520,1280,200);this.person(ctx,450,540,false);this.person(ctx,730,540,false,'#5e5142');this.person(ctx,820,540,false,'#c2b090');
   if(s.kind==='matches'){const glow=ctx.createRadialGradient(640,485,5,640,485,220);glow.addColorStop(0,'#daa54d99');glow.addColorStop(1,'#daa54d00');ctx.fillStyle=glow;ctx.fillRect(400,260,480,440);ctx.fillStyle='#edc975';ctx.beginPath();ctx.moveTo(615,540);ctx.quadraticCurveTo(670,510,640,450);ctx.quadraticCurveTo(600,500,615,540);ctx.fill();for(let i=0;i<7;i++){ctx.fillStyle=i<s.matches?'#dec99b':'#637368';ctx.fillRect(450+i*52,620,35,7);}}
  }
 },
 person(ctx,x,y,crouch=false,color='#d1c6a5'){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y-(crouch?25:65),12,0,7);ctx.fill();ctx.fillRect(x-10,y-(crouch?18:50),20,crouch?15:32);ctx.strokeStyle=color;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x,y-18);ctx.lineTo(x-15,y);ctx.moveTo(x,y-18);ctx.lineTo(x+15,y);ctx.stroke();},
 close(){this.closeActive?.();},
 open(kind,node,mode='normal',onDone){
  if(!this.supports(kind,node?.id))return false;
  if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id))return false;
  if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(kind,node,mode,onDone)};NpcStory.startGate(node);return false;}
  this.close();const trigger=document.activeElement,owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active;
  const current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active;
  const d=document.createElement('dialog');d.className='starfire73-game';d.setAttribute('aria-label',this.definitions[kind].title);
  d.innerHTML='<header><div><small></small><h2></h2></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0"></canvas><p data-stats></p><div data-content></div><p role="status" aria-live="polite"></p><nav class="sf73-actions"><button data-start>开始研学</button><button data-pause>暂停</button><button data-reset>重新练习</button><button data-sound>声音</button><button data-save hidden>记录成绩</button></nav><details><summary>操作与材料说明</summary><p data-keys></p><p>原创轻量教学模拟 · 人物为剪影；数值为练习规则。不是实时史实影像、真实密电或现实医疗方案。</p></details>';
  document.body.append(d);d.showModal();const q=x=>d.querySelector(x),canvas=q('canvas'),ctx=canvas.getContext('2d');
  let s=this.create(kind,mode),closed=false,paused=false,recorded=false,last=0,raf=0,ac=null,uiStamp='';const held=new Map(),captures=new Map(),listeners=[];this.session=s;
  const on=(target,event,fn)=>{target.addEventListener(event,fn);listeners.push(()=>target.removeEventListener(event,fn));};
  const muted=()=>typeof AudioControl43!=='undefined'?AudioControl43.muted===true:localStorage.getItem('cz_mute43')==='true';
  const sound=()=>{if(muted())return;try{const C=window.AudioContext||window.webkitAudioContext;if(!ac&&C)ac=new C();if(!ac)return;ac.resume().catch(()=>{});const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=420;g.gain.setValueAtTime(.035,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.1);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.12);}catch{/* Optional audio. */}};
  const release=()=>{held.clear();for(const [id,target]of captures){try{if(target.hasPointerCapture(id))target.releasePointerCapture(id);}catch{/* Capture already released. */}}captures.clear();};const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);release();listeners.splice(0).forEach(fn=>fn());ac?.close().catch(()=>{});d.remove();if(this.closeActive===close){this.closeActive=null;this.session=null;this._ui=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
  q('h2').textContent=this.definitions[kind].title;q('small').textContent=this.definitions[kind].subtitle+' · '+(mode==='hardcore'?'传承难度':'研学模式');q('[data-intro]').textContent=this.definitions[kind].intro;q('[data-keys]').textContent=this.definitions[kind].keys;canvas.setAttribute('aria-label',this.definitions[kind].keys);
  const act=(a,v)=>{if(paused||document.hidden||closed||!current())return false;const changed=this.act(s,a,v);if(changed)sound();render();return changed;};
  const button=(text,a,v,hold)=>{const b=document.createElement('button');b.textContent=text;b.type='button';b.onclick=()=>act(a,v);if(hold){on(b,'pointerdown',e=>{e.preventDefault();held.set(e.pointerId,hold);captures.set(e.pointerId,b);b.setPointerCapture(e.pointerId);});for(const event of ['pointerup','pointercancel','lostpointercapture'])on(b,event,e=>{held.delete(e.pointerId);captures.delete(e.pointerId);});}q('[data-content]').append(b);};
  const render=()=>{
   q('[data-stats]').textContent=this.describe(s);const message=paused?'已暂停，计时与输入冻结。':s.message;if(q('[role=status]').textContent!==message)q('[role=status]').textContent=message;
   q('[data-start]').hidden=s.status!=='ready';q('[data-save]').hidden=s.status!=='won';q('[data-pause]').textContent=paused?'继续':'暂停';
   const stamp=[s.kind,s.round,s.status,s.answer?.join(',')].join('|');if(stamp!==uiStamp){uiStamp=stamp;q('[data-content]').replaceChildren();
    if(kind==='matches'){['护送火种 · 耗1根','支援战友 · 耗2根','遮蔽整备 · 不耗火柴'].forEach((t,i)=>button(t,'choose',i));}
    if(kind==='alliance'&&s.round<4){const p=document.createElement('p');p.textContent=this.questions[s.round].text;q('[data-content]').append(p);this.questions[s.round].options.forEach((t,i)=>button(t,'choose',i));}
    if(kind==='cipher'&&s.round<3){const p=document.createElement('p');p.className='sf73-code';p.textContent=this.messages[s.round].map(i=>this.cipherTable[i][0]).join('　')+' → '+s.answer.map(i=>this.cipherTable[i][1]).join(' ');q('[data-content]').append(p);this.cipherTable.forEach(([symbol,text],i)=>button(`${i+1} · ${symbol} = ${text}`,'token',i));button('撤回','undo');button('核对','check');}
    if(kind==='chains'){button('←','none',null,'left');button('→','none',null,'right');button('俯身','none',null,'down');button('跳跃','jump');button('铺板 · B','plank');}
    if(kind==='aid'){for(const [label,dir]of [['←','left'],['↑','up'],['↓','down'],['→','right']])button(label,'move',dir,dir);button('教学药包 · E','aid');button('护送 · F','escort');}
   }
   q('[data-content]').querySelectorAll('button').forEach(b=>b.disabled=paused||s.status!=='playing');
  };
  on(q('[data-close]'),'click',close);on(d,'cancel',e=>{e.preventDefault();close();});on(d,'close',close);
  on(q('[data-start]'),'click',()=>{if(closed)return;s.status='playing';last=0;sound();canvas.focus();render();});
  on(q('[data-pause]'),'click',()=>{paused=!paused;last=0;release();render();});
  on(q('[data-reset]'),'click',()=>{release();s=this.create(kind,mode);this.session=s;recorded=false;paused=false;last=0;uiStamp='';render();});
  on(q('[data-sound]'),'click',()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else localStorage.setItem('cz_mute43',String(!muted()));if(muted())ac?.suspend().catch(()=>{});else sound();});
  on(q('[data-save]'),'click',()=>{if(closed||recorded||!current()||s.status!=='won')return;const result=this.rating(s);if(!window.StarfireBook73?.record(kind,node.id,result,s)){q('[role=status]').textContent='保存失败，请保留窗口后重试。';return;}recorded=true;close();onDone?.({won:true,...result});});
  on(d,'keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();close();return;}if(e.key==='Tab'||e.target.matches('input,textarea,select'))return;if(paused||s.status!=='playing')return;
   const key=e.key.toLowerCase(),dirs={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'up',w:'up',arrowdown:'down',s:'down'};
   if(dirs[key]&&['chains','aid'].includes(kind)){e.preventDefault();held.set('key-'+key,dirs[key]);if(kind==='aid')act('move',dirs[key]);}
   if(kind==='chains'&&key===' '){e.preventDefault();act('jump');}if(kind==='chains'&&key==='b')act('plank');if(kind==='aid'&&key==='e')act('aid');if(kind==='aid'&&key==='f')act('escort');
   if(/^[1-6]$/.test(key)&&['matches','alliance','cipher'].includes(kind)){e.preventDefault();act(kind==='cipher'?'token':'choose',Number(key)-1);}
   if(kind==='cipher'&&['Enter','Backspace'].includes(e.key)){e.preventDefault();act(e.key==='Enter'?'check':'undo');}
  });on(d,'keyup',e=>held.delete('key-'+e.key.toLowerCase()));on(window,'blur',release);on(document,'visibilitychange',()=>{release();last=0;});
  const frame=now=>{if(closed)return;if(!current()||!d.isConnected){close();return;}const dt=last?Math.max(0,Math.min(.1,(now-last)/1000)):0;last=now;if(!paused&&!document.hidden){const input=Object.fromEntries([...held.values()].map(v=>[v,true]));if(kind==='aid'&&held.size)act('move',[...held.values()][0]);this.step(s,dt,input);}if(muted()&&ac?.state==='running')ac.suspend().catch(()=>{});if(ctx)this.draw(ctx,s);render();raf=requestAnimationFrame(frame);};
  this._ui={dialog:d,act,get:()=>s};render();canvas.focus();raf=requestAnimationFrame(frame);return true;
 }
};
