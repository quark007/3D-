/* Original rhythm exercise: celebratory drumming only, no battlefield content. */
window.HuishiDrum67={
  supports(id){return [12].includes(Number(id));},
  definitions:{
    12:{title:'会师腰鼓 · 会宁 1936',bpm:84,lead:2.5,approach:1.6,
      intro:'四轨安塞腰鼓：↑←↓→ 对应四条鼓道，鼓点落到鼓线时按对应键或点下方鼓面。连击越多，会师场面越热闹。',
      success:'鼓声不断，彩旗满天——三大主力会师！',
      lanes:[{x:340},{x:560},{x:780},{x:1000}],
      keys:['ArrowUp','ArrowLeft','ArrowDown','ArrowRight'],labels:['↑','←','↓','→'],names:['低鼓','高鼓','边鼓','铜镲'],
      bars:[
        '0-------','0---1---','0-------','0---1---',
        '0-1-0-1-','2---0-0-','0-1-0-1-','2-3-0---',
        '0-0-1-1-','2---0---','0-1-0-1-','2-3-1---',
        '0101010-','2323-0-0','01010101','23-30101',
        '0-010-01','2-1-3-0-','0101-101','2323-232',
        '01230123','0-1-2-3-','01012323','0123----'
      ],
      hist:'1936 年 10 月，红一、红二、红四方面军先后在甘肃会宁与将台堡会师，长征胜利结束。安塞腰鼓是陕北民间鼓乐，此处作为会师庆典的教学化表达。'
    }
  },
  stepInt(d){return 60/d.bpm/2;},
  expandChart(d){const step=this.stepInt(d),notes=[];d.bars.forEach((row,b)=>{row.split('').forEach((ch,i)=>{if(ch!=='-')notes.push({t:d.lead+(b*8+i)*step,lane:Number(ch),judged:null});});});return notes;},
  judgeDelta(dt){const a=Math.abs(dt);return a<=.07?'perfect':a<=.14?'good':null;},
  scoreOf(counts){const total=counts.perfect+counts.good+counts.miss;if(!total)return 0;return Math.round((counts.perfect+counts.good*.6)/total*100);},
  rating(s,retries){return retries===0&&s.counts.miss===0?{score:95,rating:'鼓动山河'}:retries<=1?{score:85,rating:'欢庆会师'}:{score:70,rating:'鼓声相闻'};},
  muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
  paused(){return document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay');},
  style(){if(document.getElementById('drum67-style'))return;const el=document.createElement('style');el.id='drum67-style';el.textContent=`
    .drum67-dialog{box-sizing:border-box;width:min(1100px,96vw);max-height:96dvh;margin:auto;padding:18px;background:#241c14;color:#efe4cc;border:1px solid #ad9361;border-radius:16px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif}
    .drum67-dialog::backdrop{background:#0d0804e6}.drum67-dialog h2{margin:0;font-size:clamp(19px,3vw,28px);color:#ead7ac}.drum67-dialog p{margin:7px 0}.drum67-dialog header,.drum67-actions,.drum67-pads{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.drum67-dialog header{justify-content:space-between}.drum67-dialog button{font:inherit;background:#3d3020;color:#f4e6c6;border:1px solid #a38c60;border-radius:11px;padding:8px 14px;min-height:42px;cursor:pointer}.drum67-dialog button:disabled{opacity:.45;cursor:default}.drum67-dialog :focus-visible{outline:3px solid #e4b96b;outline-offset:2px}.drum67-dialog canvas{display:block;width:min(82.2dvh,100%);aspect-ratio:16/9;height:auto;margin:0 auto;background:#241c14;touch-action:none;border-radius:6px}.drum67-pads button{flex:1;min-width:64px;font-size:22px;padding:12px 0}.drum67-status{min-height:1.5em;color:#ffdea1}.drum67-actions{margin-top:8px}.drum67-dialog [hidden]{display:none!important}.challenge-item.drum67-entry{cursor:pointer;border:1px solid #ab905c;border-radius:8px;padding:13px;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}.challenge-item.drum67-entry:hover,.challenge-item.drum67-entry:focus-visible{transform:translateY(-2px);border-color:#e4c98a;box-shadow:0 5px 16px rgba(0,0,0,.4)}.drum67-note{font-size:13px;color:#c4c5ae}@media(max-width:600px){.drum67-dialog{padding:12px;font-size:13px}.drum67-dialog canvas{max-height:36dvh}.drum67-pads button{min-width:52px;font-size:18px}.drum67-dialog button{padding:7px 12px}}`;
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='drum67-dialog';dialog.setAttribute('aria-labelledby','drum67-title');
    const labels=this.definitions[12].labels,pads=labels.map((l,i)=>'<button data-pad="'+i+'" aria-label="第'+(i+1)+'轨 '+this.definitions[12].names[i]+'">'+l+'</button>').join('');
    dialog.innerHTML='<header><h2 id="drum67-title"></h2><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="会师腰鼓节奏画面。鼓点落到鼓线时按对应方向键。"></canvas><div class="drum67-pads" role="group" aria-label="四轨鼓面按钮">'+pads+'</div><p data-hud></p><p class="drum67-status" role="status" aria-live="polite"></p><div class="drum67-actions"><button data-start>开始击鼓</button><button data-pause disabled>暂停</button><button data-mute>声音</button><button data-retry>重新击鼓</button><button data-report hidden>生成庆典特刊</button><button data-complete hidden>记录成绩 · 完成本章</button></div><p class="drum67-note">↑←↓→ 四键对应四轨；鼓点落线瞬间击打为「完美」。全程无失误 95 分，重开一次内完成 85 分，之后 70 分。曲谱为原创教学谱，非历史乐谱。</p><details class="drum67-note"><summary>史实与练习说明</summary><p data-hist></p><p>本小游戏为原创节奏练习：谱面、速度、分数均为教学设定。庆典特刊来自游戏内已有的长征年报功能，解锁条件以年报模块为准。</p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');const d=this.definitions[node.id];let notes=this.expandChart(d),retries=0,raf=0,last=0,closed=false,manualPause=false,recorded=false,ac=null,master=null,audioMuted=null;
    const s={id:Number(node.id),d,notes,counts:{perfect:0,good:0,miss:0},combo:0,maxCombo:0,startAt:0,playing:false,status:'ready',reason:'',flashes:[],confetti:[],flags:0};this.session=s;
    let backIdx=0,comboPop=0,lastComboShown=0;const nowT=()=>(performance.now()-s.startAt)/1000;
    q('h2').textContent=d.title;q('[data-intro]').textContent=d.intro;q('[data-hist]').textContent=d.hist;
    const drum=(lane,when,g)=>{if(!ac||ac.state!=='running'||this.muted())return;try{const now=ac.currentTime,w=Math.max(0,when-now);if(w>1.2)return;const t=now+w,o=ac.createOscillator(),o2=ac.createOscillator(),g1=ac.createGain();if(lane===3){const b=ac.createBuffer(1,ac.sampleRate*.3,ac.sampleRate),data=b.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/data.length,1.6);const n=ac.createBufferSource(),ng=ac.createGain();n.buffer=b;ng.gain.setValueAtTime(g,now);ng.gain.exponentialRampToValueAtTime(.001,t+.3);const hp=ac.createBiquadFilter();hp.type='highpass';hp.frequency.value=5200;n.connect(hp);hp.connect(ng);ng.connect(master);n.start(t);n.stop(t+.32);return;}const f0=lane===0?130:lane===1?210:300,decay=lane===2?.16:.26;o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f0*(lane===0?.36:.5),t+decay);o2.frequency.setValueAtTime(f0*2.01,t);o2.frequency.exponentialRampToValueAtTime(f0,t+decay*.5);g1.gain.setValueAtTime(g,t);g1.gain.exponentialRampToValueAtTime(.001,t+decay);o.connect(g1);o2.connect(g1);g1.connect(master);o.start(t);o2.start(t);o.stop(t+decay+.02);o2.stop(t+decay+.02);}catch{/* Sound must never block the exercise. */}};
    const gesture=()=>{try{if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(C){ac=new C();master=ac.createGain();master.connect(ac.destination);this.audioContext=ac;}}if(ac){master.gain.value=this.muted()?0:1;if(this.muted())ac.suspend().catch(()=>{});else ac.resume().catch(()=>{});}}catch{/* Optional audio. */}};
    const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);dialog.removeEventListener('keydown',key);dialog.remove();if(ac)ac.close().catch(()=>{});if(this.closeActive===close){this.closeActive=null;this.session=null;this.audioContext=null;}if(trigger?.isConnected)trigger.focus();};this.closeActive=close;
    const sync=()=>{const c=s.counts,left=s.notes.filter(n=>!n.judged).length,q2=q('[data-hud]');q2.textContent=s.playing?`连击 ${s.combo} · 最大 ${s.maxCombo} · 完美 ${c.perfect} / 良好 ${c.good} / 失误 ${c.miss} · 剩余 ${left}/${s.notes.length}`:`谱面 ${s.notes.length} 个鼓点 · BPM ${d.bpm}`;q('[data-start]').hidden=s.status!=='ready';q('[data-pause]').disabled=!s.playing;q('[data-pause]').textContent=manualPause?'继续击鼓':'暂停';q('[data-mute]').textContent=this.muted()?'开启声音':'全部静音';q('[data-report]').hidden=s.status!=='won';q('[data-complete]').hidden=s.status!=='won';let text=s.status==='ready'?'点「开始击鼓」，先听两秒前奏鼓点再上手。':s.status==='won'?this.rating(s,retries).rating+' · '+s.reason:s.status==='paused'?manualPause?'击鼓已暂停。':'等待继续……':s.reason;if(!s.playing&&s.status==='ready')text=text;q('.drum67-status').textContent=text;};
    const finish=won=>{if(s.status!=='ready'&&s.status!=='playing')return;s.status=won?'won':'ended';s.playing=false;if(won)s.reason=this.scoreOf(s.counts)+' 分 · 准确率 '+s.acc+'% · 最大连击 '+s.maxCombo;sync();};
    const hit=lane=>{if(!s.playing||manualPause||this.paused())return;const t=nowT();let best=null,bestAbs=.15;for(const n of s.notes){if(n.judged||n.lane!==lane)continue;const dt=t-n.t;if(dt>.15)continue;const a=Math.abs(dt);if(a<bestAbs){bestAbs=a;best=n;}}
      if(!best)return;const v=this.judgeDelta(t-best.t);if(!v)return;best.judged=v;s.counts[v]++;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);s.flashes.push({lane,life:.22,good:v==='good'});drum(lane,ac?ac.currentTime:0,.1);
      if(s.combo>0&&s.combo%10===0){for(let k=0;k<22;k++)s.confetti.push({x:200+Math.random()*880,y:-10-Math.random()*60,vx:(Math.random()-.5)*120,vy:60+Math.random()*160,life:1.6,c:['#e0523f','#e8b23c','#5f9e6e','#d9d2b8'][k%4]});}
      sync();};
    q('[data-mute]').onclick=()=>{if(typeof AudioControl43!=='undefined')AudioControl43.toggle();else try{localStorage.setItem('cz_mute43',String(!this.muted()));}catch{}gesture();sync();};q('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',close);
    q('[data-start]').onclick=()=>{gesture();s.status='playing';s.playing=true;manualPause=false;s.pauseAt=0;backIdx=0;s.startAt=performance.now();last=0;canvas.focus();sync();};q('[data-pause]').onclick=()=>{if(!s.playing)return;manualPause=!manualPause;if(manualPause)s.pauseAt=performance.now();else if(s.pauseAt){s.startAt+=performance.now()-s.pauseAt;s.pauseAt=0;}last=0;sync();};
    q('[data-retry]').onclick=()=>{gesture();retries++;notes=this.expandChart(d);s.notes=notes;s.counts={perfect:0,good:0,miss:0};s.combo=0;s.maxCombo=0;s.confetti=[];s.flashes=[];s.status='playing';s.playing=true;manualPause=false;s.pauseAt=0;recorded=false;backIdx=0;s.startAt=performance.now();last=0;sync();q('[data-complete]').hidden=true;q('[data-report]').hidden=true;};
    q('[data-report]').onclick=()=>{if(typeof WitnessReport65!=='undefined'&&typeof WitnessReport65.open==='function')WitnessReport65.open();else if(typeof GameUI!=='undefined')GameUI.showToast('年报模块尚未加载，暂无法生成特刊。');};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.rating(s,retries),key='drum67_'+node.id;GameState.storyPreparations||={};const old=GameState.storyPreparations[key];if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,accuracy:s.acc,maxCombo:s.maxCombo,retries,completedAt:new Date().toISOString()};GameState.recordBattleScore(node.id,result.score,result.rating);GameState.save();close();if(typeof onComplete==='function')onComplete();};
    for(let i=0;i<4;i++)q('[data-pad="'+i+'"]').addEventListener('pointerdown',e=>{e.preventDefault();gesture();hit(i);});
    const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}const lane=d.keys.indexOf(e.key);if(lane>=0){e.preventDefault();e.stopPropagation();if(!e.repeat)hit(lane);}};dialog.addEventListener('keydown',key);
    const draw=()=>{
      if(!ctx)return;ctx.clearRect(0,0,1280,720);
      /* 会宁黄昏天幕 */
      const sky=ctx.createLinearGradient(0,0,0,250);sky.addColorStop(0,'#1c0f08');sky.addColorStop(1,'#4a2a12');ctx.fillStyle=sky;ctx.fillRect(0,0,1280,250);
      const hor=ctx.createRadialGradient(640,210,20,640,210,430);hor.addColorStop(0,'rgba(240,170,90,.32)');hor.addColorStop(1,'rgba(240,170,90,0)');ctx.fillStyle=hor;ctx.fillRect(210,0,860,270);
      ctx.fillStyle='#1a1009';ctx.beginPath();ctx.moveTo(0,232);for(let x=0;x<=1280;x+=44)ctx.lineTo(x,196+Math.sin(x*.008+1)*26);ctx.lineTo(1280,268);ctx.lineTo(0,268);ctx.fill();
      /* 会宁城楼与城墙剪影 */
      ctx.fillStyle='#140b06';ctx.fillRect(430,182,420,36);ctx.fillRect(606,124,68,94);ctx.beginPath();ctx.moveTo(592,124);ctx.lineTo(640,98);ctx.lineTo(688,124);ctx.closePath();ctx.fill();ctx.fillRect(622,172,36,46);
      ctx.fillStyle='#241408';for(let x=436;x<846;x+=60)ctx.fillRect(x,182,3,36);
      /* 灯笼串 */
      ctx.strokeStyle='rgba(200,160,90,.4)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(60,54);ctx.quadraticCurveTo(640,98,1220,54);ctx.stroke();
      for(let i=0;i<6;i++){const lx=150+i*196,ly=64+Math.sin((s.playing?nowT():0)*1.3+i)*6+16;
        const lg=ctx.createRadialGradient(lx,ly,4,lx,ly,42);lg.addColorStop(0,'rgba(240,120,80,.5)');lg.addColorStop(1,'rgba(240,120,80,0)');ctx.fillStyle=lg;ctx.fillRect(lx-44,ly-44,88,88);
        ctx.fillStyle='#d84a35';ctx.beginPath();ctx.ellipse(lx,ly,13,16,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#e8b23c';ctx.fillRect(lx-6,ly-20,12,5);ctx.fillRect(lx-6,ly+15,12,5);ctx.strokeStyle='#e8b23c';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(lx,ly+20);ctx.lineTo(lx,ly+28);ctx.stroke();}
      /* 舞台地面与追光 */
      ctx.fillStyle='#171009';ctx.fillRect(0,246,1280,474);
      for(const sx of [190,1090]){const beam=ctx.createLinearGradient(sx,0,sx+(640-sx)*.85,720);beam.addColorStop(0,'rgba(240,200,120,.10)');beam.addColorStop(1,'rgba(240,200,120,0)');ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(sx-40,120);ctx.lineTo(sx+40,120);ctx.lineTo(sx+300,720);ctx.lineTo(sx-300,720);ctx.closePath();ctx.fill();}
      /* 连击弹跳 */
      if(s.combo>lastComboShown)comboPop=1;lastComboShown=s.combo;comboPop=Math.max(0,comboPop-1/40);
      if(s.combo>=2){ctx.textAlign='center';ctx.globalAlpha=Math.min(1,.4+comboPop*.6);ctx.fillStyle='#f4dfae';ctx.font='bold '+(30+comboPop*14)+'px sans-serif';ctx.fillText('连击 × '+s.combo,640,178);ctx.globalAlpha=1;ctx.textAlign='left';}
      const t=nowT();const live=s.playing&&!manualPause&&!this.paused();
      /* 四条鼓道 */
      for(let li=0;li<4;li++){const x=d.lanes[li].x;
        const g2=ctx.createLinearGradient(x-72,0,x+72,0);g2.addColorStop(0,'rgba(0,0,0,.4)');g2.addColorStop(.3,'rgba(96,66,32,.6)');g2.addColorStop(.5,'rgba(128,90,46,.62)');g2.addColorStop(.7,'rgba(96,66,32,.6)');g2.addColorStop(1,'rgba(0,0,0,.4)');ctx.fillStyle=g2;ctx.fillRect(x-72,0,144,660);
        ctx.strokeStyle='rgba(228,185,107,.4)';ctx.lineWidth=2;ctx.strokeRect(x-72,0,144,660);
        ctx.fillStyle='rgba(0,0,0,.32)';ctx.fillRect(x-72,0,144,36);
        ctx.strokeStyle='rgba(210,170,110,.10)';ctx.lineWidth=1;for(let py=118;py<560;py+=92){ctx.beginPath();ctx.moveTo(x-66,py);ctx.lineTo(x+66,py);ctx.stroke();}
        /* 鼓面（命中弹跳） */
        const fl2=s.flashes.find(f=>f.lane===li);
        const dr=26+(fl2?fl2.life*1.5:0);
        ctx.fillStyle='#8a5a2a';ctx.beginPath();ctx.arc(x,600,dr+5,0,Math.PI*2);ctx.fill();
        const skin=ctx.createRadialGradient(x-8,592,4,x,600,dr);skin.addColorStop(0,'#efdcae');skin.addColorStop(1,'#c9a86a');ctx.fillStyle=skin;ctx.beginPath();ctx.arc(x,600,dr,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='#6b4423';for(let k=0;k<8;k++){const a=k*Math.PI/4+.4;ctx.beginPath();ctx.arc(x+Math.cos(a)*(dr-4),600+Math.sin(a)*(dr-4),1.6,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='#e8d5a5';ctx.font='14px sans-serif';ctx.fillText(d.names[li]+' '+d.labels[li],x-32,652);}
      /* 判定鼓线（呼吸） */
      ctx.strokeStyle='rgba(240,223,178,.18)';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(230,600);ctx.lineTo(1110,600);ctx.stroke();
      ctx.strokeStyle='rgba(240,223,178,'+(0.5+0.25*Math.sin((s.playing?nowT():0)*4)).toFixed(2)+')';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(230,600);ctx.lineTo(1110,600);ctx.stroke();
      /* 鼓点 */
      let missed=false;
      for(const n of s.notes){if(n.judged)continue;const dt=n.t-t;if(dt>2)break;if(dt<-0.15){if(live){n.judged='miss';s.counts.miss++;s.combo=0;missed=true;}continue;}
        const y=600-(dt/d.approach)*560;if(y<-40)continue;const x=d.lanes[n.lane].x;const near=Math.max(0,1-Math.abs(dt)/.35);
        if(near>0){ctx.strokeStyle='rgba(255,225,150,'+(near*.7).toFixed(2)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,26+(1-near)*10,0,Math.PI*2);ctx.stroke();}
        ctx.fillStyle=['#c85a3c','#d8a13c','#6f9e5a','#7c8ec8'][n.lane];ctx.beginPath();ctx.arc(x,y,24,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f4e6c6';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#241c14';ctx.font='bold 20px sans-serif';ctx.fillText(d.labels[n.lane],x-7,y+7);}
      if(missed)sync();
      for(const f of s.flashes){const x=d.lanes[f.lane].x;ctx.globalAlpha=Math.max(0,f.life/.22);ctx.strokeStyle=f.good?'#e8b23c':'#ffe9a8';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x,600,34+(1-f.life/.22)*26,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;s.flashes=s.flashes.filter(f=>(f.life-=1/60)>0);
      for(const c of s.confetti){ctx.globalAlpha=Math.min(1,c.life);ctx.fillStyle=c.c;ctx.fillRect(c.x,c.y,8,12);}ctx.globalAlpha=1;
      for(const c of s.confetti){c.x+=c.vx/60;c.y+=c.vy/60;c.vy+=140/60;c.life-=1/60;}s.confetti=s.confetti.filter(c=>c.life>0&&c.y<740);
      const vig=ctx.createRadialGradient(640,360,320,640,360,780);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.34)');ctx.fillStyle=vig;ctx.fillRect(0,0,1280,720);
      ctx.font='20px sans-serif';ctx.fillStyle='rgba(238,228,191,.8)';ctx.fillText('教学谱 · BPM '+d.bpm+' · ↑←↓→',26,702);
    };
    let hudAt=0;const frame=now=>{if(closed)return;if(!dialog.isConnected||!current()){close();return;}if(ac){const muted=this.muted();if(muted!==audioMuted){master.gain.value=muted?0:1;audioMuted=muted;if(muted)ac.suspend().catch(()=>{});}}
      if(s.playing&&!manualPause&&!this.paused()){const t=nowT();
        if(ac&&ac.state==='running'&&!this.muted()){while(backIdx<s.notes.length&&s.notes[backIdx].t<=t+.35){const n=s.notes[backIdx];if(!n.judged||n.judged==='miss')drum(n.lane,ac.currentTime+Math.max(0,n.t-t),.05);backIdx++;}}
        const lastN=s.notes[s.notes.length-1];if(lastN&&t>lastN.t+1.2){s.acc=this.scoreOf(s.counts);finish(true);}
      }
      last=now;
      draw();if(now-hudAt>80){sync();hudAt=now;}raf=requestAnimationFrame(frame);
    };sync();draw();q('[data-start]').focus();raf=requestAnimationFrame(frame);return true;
  }
};
