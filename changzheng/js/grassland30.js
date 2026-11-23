/* Grassland 30-day company management: day loop over rations/pace/night, abstract tokens only.
   Narratives quoted verbatim from game-data.js (GRASSLAND_RESULTS) with source comments. */
window.Grassland30=(function(){
  const CREW=[
    {id:'s1',name:'张铁柱',status:'healthy'},{id:'s2',name:'李小顺',status:'healthy'},
    {id:'s3',name:'王冬生',status:'weak'},{id:'s4',name:'赵小苗',status:'wounded'},
    {id:'s5',name:'刘大壮',status:'weak'}];
  const STATUS_LABEL={healthy:'健康',weak:'虚弱',wounded:'伤员',gone:'掉队'};
  const WEATHERS=['晴','沼泽','暴雨','寒潮','敌侦察影'];
  const WEATHER_W=[3,2,2,2,1];
  const RATION_PER_PERSON_MAX=20; // 对齐 game-data.js 常量
  /* 以下四段 narrative 逐字引自 js/game-data.js 的 GRASSLAND_RESULTS（测试会做源文件逐字校验） */
  const N_BALANCED='你把青稞面尽可能均匀地分给了每一个人。草地七天七夜，没有人倒下。伤员咬着牙走完了全程，虚弱的同志互相搀扶。走出草地的那一刻，五个人一个不少——这就是生死与共的意思。';
  const N_ZERO='你把青稞面分给了大部分人，但有人一口也没分到。草地里，没有粮食的人走着走着就掉队了，再也没回来。你不知道他倒在了哪片泥沼旁，只知道他最后的话是："同志们先走，我歇歇就跟上。"';
  const N_WOUNDED='伤员分到的青稞面太少了。他的伤口愈合需要体力，但饥饿让他的身体一天天垮下去。走出草地时，他的腿伤已经严重感染，不得不被人抬着走。';
  const N_LIMITED='每个人都分到了口粮，但储备仍然紧张。队伍安排轮流照料伤员，缩短休整间隔，并继续寻找补给。这是本次虚构任务的推演结果。';
  const MILESTONES={
    7:{text:'炊事班的老班长把缝衣针弯成鱼钩（课文《金色的鱼钩》的影子）。今晚的鱼汤格外鲜，伤员碗里多了一勺。',fx:{morale:3}},
    15:{text:'沼泽边发现一小片青稞田，收割要花半天。快走还是收割？',choice:[
      {label:'收割 · 收获 +6 粮食',fx:{food:6,morale:1}},
      {label:'赶路 · 不冒被泥沼拖住的风险',fx:{morale:-1}}]},
    20:{text:'有人用党证包着几根火柴，一根都没舍得用（课文《七根火柴》的影子）。火种还在，希望就在。',fx:{morale:4}},
    25:{text:'远处传来隐隐枪声，侦察员说敌骑在草地边缘游荡。是否改变路线？',choice:[
      {label:'绕远 · 稳妥但多耗 3 粮食',fx:{food:-3,morale:1}},
      {label:'照直走 · 赌敌人没发现',fx:{morale:-2,risk:'enemy'}}]}
  };
  function pickWeighted(list,weights,rng){let t=weights.reduce((a,b)=>a+b,0),v=rng()*t;for(let i=0;i<list.length;i++){v-=weights[i];if(v<0)return list[i];}return list[0];}
  function calcRationTotal(food){return Math.max(20,Math.round(food/2));} // 对齐 game-data.js
  function alive(s){return s.crew.filter(m=>m.status!=='gone');}
  function woundedCount(s){return s.crew.filter(m=>m.status==='wounded').length;}
  function goneCount(s){return s.crew.filter(m=>m.status==='gone').length;}
  function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
  const definitions={9:{title:'草地三十天 · 连队管理',
    intro:'连队管理推演：30 天分粮守夜，带全部队员走出草地。每天看晨报、做分配、应对突发；伤员多分一口，队伍就多一分生机。',
    success:'五个人一个不少——「生死与共」。三十天草地，你把队伍完完整整地带了出来！',
    hist:'松潘草地是长征中最残酷的自然考验。红军没有足够的粮食，却选择平均分配、互相谦让——把最后一口干粮让给最需要的战友。（本推演人物取自站内教学设定，见穿越草地节点分粮章节。）'}};
  function create(id){
    return {id:Number(id),d:definitions[id],day:1,phase:'brief',food:100,troops:100,morale:70,weather:null,
      crew:CREW.map(m=>({...m})),lost:[],log:[],today:null,pendingChoice:null,
      nightMode:null,nightResult:null,carrier:'cook',streakBalanced:0,retries:0,
      status:'ready',reason:'',events:[]};
  }
  function rollWeather(s,rng){s.weather=pickWeighted(WEATHERS,WEATHER_W,rng||Math.random);return s.weather;}
  /* 一天结算：decisions={ration:{wounded,combat,reserve},carrier,pace}，rng 可注入；method 调用（this=模块） */
  function applyDay(s,decisions,rng){
    rng=rng||Math.random;const notes=[];
    const total=calcRationTotal(s.food);
    const per=Math.max(1,alive(s).length);
    const woundedShare=decisions.ration.wounded/Math.max(1,woundedCount(s));
    const minShare=Math.min(decisions.ration.wounded,decisions.ration.combat,decisions.ration.reserve);
    s.food=clamp(s.food-(4+(decisions.pace==='slow'?2:decisions.pace==='normal'?1:0)),0,100);
    if(s.weather==='暴雨'){s.morale=clamp(s.morale-3,0,100);s.food=clamp(s.food-2,0,100);notes.push({t:'暴雨下了整夜，干柴全湿了，火堆只剩一点红。大家背靠背坐着熬到天亮。'});}
    if(s.weather==='寒潮'){s.morale=clamp(s.morale-2,0,100);notes.push({t:'寒潮来袭，伤员的毯子又薄了一层。',woundedRisk:true});}
    if(s.weather==='敌侦察影'&&decisions.pace==='fast'){s.morale=clamp(s.morale-6,0,100);notes.push({t:'快行军撞上了敌侦察影，队伍在泥沼里狂奔半日才甩掉。'});}
    if(s.weather==='沼泽'&&decisions.pace==='fast'){const pool=alive(s).filter(x=>x.status==='healthy');if(pool.length){const m=pool[Math.floor(rng()*pool.length)];m.status='weak';notes.push({t:m.name+'为了赶路陷入泥沼，被拖出来时踉踉跄跄——降为虚弱。'});}}
    // 分粮结算（映射 game-data.js GRASSLAND_RESULTS 四种结果）
    if(minShare>=8){s.morale=clamp(s.morale+10,0,100);s.streakBalanced++;notes.push({t:N_BALANCED,quote:true});}
    else if(woundedCount(s)>0&&woundedShare<5){s.troops=clamp(s.troops-3,0,100);s.morale=clamp(s.morale-3,0,100);
      notes.push({t:N_WOUNDED,quote:true});
      const w=s.crew.find(m=>m.status==='wounded');
      if(w&&rng()<0.3){w.status='gone';s.lost.push(w.name+'（伤情恶化，被抬着走完了最后的路）');notes.push({t:w.name+'再也没能自己站起来。'});}}
    else if(total/per<5){s.troops=clamp(s.troops-2,0,100);s.morale=clamp(s.morale-8,0,100);
      notes.push({t:N_ZERO,quote:true});
      const pool=alive(s);if(pool.length&&rng()<0.4){const m=pool[Math.floor(rng()*pool.length)];m.status='gone';s.lost.push(m.name+'（断了粮，倒在了泥沼边）');}}
    else{s.morale=clamp(s.morale-2,0,100);notes.push({t:N_LIMITED,quote:true});}
    if(decisions.carrier==='wounded'&&woundedCount(s)>0)s.morale=clamp(s.morale+2,0,100);
    if(decisions.carrier==='self'&&decisions.pace==='fast')s.troops=clamp(s.troops-1,0,100);
    const ms=MILESTONES[s.day];
    if(ms&&!ms.choice){s.morale=clamp(s.morale+(ms.fx.morale||0),0,100);s.food=clamp(s.food+(ms.fx.food||0),0,100);notes.push({t:ms.text,milestone:true});}
    if(ms&&ms.choice){s.pendingChoice=ms;notes.push({t:ms.text,milestone:true});}
    s.today={day:s.day,weather:s.weather,total,notes};
    if(s.food<=0&&s.morale<10)this.finish(s,false,'粮食见了底，士气也垮了——队伍没能走出草地。重新推演，把每一份青稞面都用在刀刃上。');
    return notes;
  }
  function resolveChoice(s,idx){
    const ms=s.pendingChoice;if(!ms||!ms.choice||!ms.choice[idx])return[];
    const fx=ms.choice[idx].fx,notes=[];
    s.morale=clamp(s.morale+(fx.morale||0),0,100);s.food=clamp(s.food+(fx.food||0),0,100);
    if(fx.risk==='enemy'&&Math.random()<0.5){s.troops=clamp(s.troops-3,0,100);notes.push({t:'还是被敌骑咬上了尾巴，丢弃了部分辎重才脱身。'});}
    else notes.push({t:'执行：'+ms.choice[idx].label});
    s.pendingChoice=null;
    return notes;
  }
  function night(s,done){
    if(typeof Campfire68!=='undefined'&&Campfire68&&typeof Campfire68.open==='function'){
      s.nightMode='game';let doneOnce=false,timer=0,observer=null;
      const cleanup=()=>{clearTimeout(timer);observer?.disconnect();};
      const fin=v=>{if(doneOnce)return;doneOnce=true;cleanup();s.nightResult=v;s.morale=clamp(s.morale+(v>0?2:-1),0,100);done?.(v);};
      try{const opened=Campfire68.open({id:9},()=>fin(6));if(opened===false)fin(0);
        if(!doneOnce){timer=setTimeout(()=>fin(0),120000);const child=typeof document!=='undefined'?document.querySelector('.fire68-dialog[open]'):null;
          if(child&&typeof MutationObserver!=='undefined'){observer=new MutationObserver(()=>{if(!child.isConnected)fin(0);});observer.observe(document.body,{childList:true,subtree:true});}}
      }catch{fin(0);}
      return()=>{doneOnce=true;cleanup();};
    }
    s.nightMode='text';
    if(s.weather==='暴雨'){s.morale=clamp(s.morale-3,0,100);s.nightResult=0;}
    else{s.morale=clamp(s.morale+1,0,100);s.nightResult=2;}
    done?.(s.nightResult);return()=>{};
  }
  function nextDay(s){
    if(goneCount(s)>=3){this.finish(s,false,'减员过半，队伍再也走不动了。草地吞下了太多同志——重新推演，学会取舍。');return;}
    s.day++;
    if(s.day>30){this.finish(s,true,s.d.success);return;}
    s.phase='brief';s.today=null;s.nightMode=null;s.nightResult=null;
  }
  function finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');}
  function rating(s){
    const gone=goneCount(s);
    if(s.status!=='won')return{score:60,rating:'未走出草地'};
    return gone===0?{score:95,rating:'草地大学'}:gone<=2?{score:85,rating:'走出草地'}:{score:70,rating:'减员过半抵达'};
  }
  function persist(s,nodeId){
    const result=rating(s);let saved=false;
    try{
      if(typeof GameState!=='undefined'){
        GameState.storyPreparations=GameState.storyPreparations||{};
        const key='g30_9',old=GameState.storyPreparations[key];
        if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,gone:goneCount(s),day:s.day,retries:s.retries||0,completedAt:new Date().toISOString()};
        if(typeof GameState.recordBattleScore==='function')GameState.recordBattleScore(nodeId||9,result.score,result.rating);
        if(typeof GameState.save==='function')saved=GameState.save()!==false;
      }
    }catch{}
    return {...result,saved};
  }
  const definitions2=definitions;
  function style(){
    if(document.getElementById('g30-style'))return;
    const el=document.createElement('style');el.id='g30-style';el.textContent=`
    .g30-dialog{box-sizing:border-box;width:min(760px,96vw);max-height:96dvh;margin:auto;padding:0;background:#101315;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .g30-dialog::backdrop{background:#05070ae6}
    .g30-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #2a2d31;background:#131619}
    .g30-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .g30-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .g30-body{padding:12px 18px}
    .g30-dialog p{margin:6px 0}
    .g30-intro{padding:10px 18px 0;color:#d5d8d2}
    .g30-dialog canvas{display:block;width:min(100%,560px);height:auto;margin:0 auto;background:#10130f;border:1px solid #3a3d42;border-radius:2px}
    .g30-hud{font-variant-numeric:tabular-nums;color:#c8ccc6;letter-spacing:.03em;border-bottom:1px dashed #2a2d31;padding:8px 18px;margin:0}
    .g30-panel{border:1px solid #2a2d31;border-left:3px solid #ffcf24;background:#14171a;padding:10px 12px;margin:8px 0}
    .g30-label{margin:2px 0 8px;font-size:10px;letter-spacing:.2em;color:#8b8e93;text-transform:uppercase}
    .g30-line{color:#d5d8d2;font-size:14px}
    .g30-quote{border-left:2px solid #6a6e74;padding-left:8px;color:#bfc4bb}
    .g30-deltas{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 8px}
    .g30-delta{border:1px solid #2a2d31;background:#191c20;border-radius:2px;padding:2px 9px;font-size:12px;font-variant-numeric:tabular-nums}
    .g30-delta.up{color:#9fd08a;border-color:#3a5a40}
    .g30-delta.down{color:#ff8d75;border-color:#6a3a30}
    .g30-mile{color:#ffcf24}
    .g30-weather b{color:#ffd98a}
    .g30-crew{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .g30-tag{border:1px solid #2a2d31;background:#191c20;border-radius:2px;padding:2px 8px;font-size:12px;color:#c8ccc6}
    .g30-weak{border-color:#6a5a30;color:#ffd98a}
    .g30-wounded{border-color:#6a3a30;color:#ff8d75}
    .g30-gone{border-color:#333;color:#6b6e73;text-decoration:line-through}
    .g30-sl{display:block;margin:8px 0}
    .g30-sl span{display:block;font-size:13px;color:#c8ccc6;margin-bottom:2px}
    .g30-sl input[type=range]{width:100%;accent-color:#ffcf24}
    .g30-choices button{margin:4px 8px 4px 0}
    .g30-big{font-size:34px;font-weight:900;margin:6px 0}
    .g30-big.ok{color:#7ed491}.g30-big.bad{color:#ff8d75}
    .g30-lost{color:#ff8d75}
    .g30-actions{display:flex;gap:8px;flex-wrap:wrap;padding:0 18px 12px}
    .g30-actions button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer;letter-spacing:.04em;transition:background .12s ease,border-color .12s ease}
    .g30-actions button:hover{background:#22262b;border-color:#6a6e74}
    .g30-actions button.primary{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .g30-actions button.primary:hover{background:#ffd95c}
    .g30-dialog button:focus-visible,.g30-dialog input:focus-visible,.g30-dialog summary:focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .g30-note{font-size:12px;color:#8f948d;padding:0 18px 12px}
    .g30-dialog details.g30-note{border-top:1px solid #2a2d31;margin:0 18px;padding:8px 0 12px}
    .g30-dialog [hidden]{display:none!important}
    @media(max-width:600px){.g30-dialog{font-size:13px}.g30-actions button{padding:7px 10px}}`;
    document.head.append(el);
  }
  function open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='g30-dialog';dialog.setAttribute('aria-labelledby','g30-title');
    dialog.innerHTML='<header><div><h2 id="g30-title"></h2><p class="g30-sub">Grassland 30 Days · Company Command</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<p class="g30-intro" data-intro></p>'
      +'<canvas data-scene width="1280" height="200" aria-hidden="true"></canvas>'
      +'<p class="g30-hud" data-hud role="status" aria-live="polite"></p>'
      +'<div class="g30-body" data-body></div>'
      +'<div class="g30-actions" data-actions></div>'
      +'<p class="g30-note">叙事引自站内「分粮抉择」章节（见史实与练习说明）；人物为教学虚构。</p>'
      +'<details class="g30-note"><summary>史实与练习说明</summary><p data-hist></p><p>本玩法为原创管理推演：天气、事件与数值均为教学设定，不对应真实部署；牺牲仅以文字记名，不做过程描写。</p></details>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel);
    let s=this.create(node.id);this.session=s;
    let ration={wounded:8,combat:8,reserve:8},recorded=false,closed=false,retries=0,cancelNight=()=>{};
    q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;q('[data-hist]').textContent=s.d.hist;
    const close=()=>{if(closed)return;closed=true;cancelNight();cancelAnimationFrame(raf);dialog.remove();if(this.closeActive===close){this.closeActive=null;this.session=null;}if(trigger&&trigger.isConnected)trigger.focus();};
    this.closeActive=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('close',close);
    q('[data-close]').onclick=close;
    const drawScene=(now)=>{
      const cv=q('[data-scene]');const c=cv.getContext&&cv.getContext('2d');if(!c)return;
      const t=Number.isFinite(now)?now:0;
      const g=c.createLinearGradient(0,0,0,200);g.addColorStop(0,'#2a1f1a');g.addColorStop(1,'#101710');c.fillStyle=g;c.fillRect(0,0,1280,200);
      c.fillStyle='#182218';for(let i=0;i<9;i++){c.beginPath();c.ellipse(80+i*140,150+((i%3)-1)*18,110,30,0,0,Math.PI*2);c.fill();}
      c.strokeStyle='rgba(140,170,120,.25)';for(let i=0;i<30;i++){const x=20+i*42;c.beginPath();c.moveTo(x,196);c.lineTo(x-4,180);c.moveTo(x,196);c.lineTo(x+4,181);c.stroke();}
      c.fillStyle='#0d120d';[[300,150],[640,142],[980,152]].forEach(([x,y])=>{c.beginPath();c.moveTo(x-42,y);c.lineTo(x,y-44);c.lineTo(x+42,y);c.closePath();c.fill();});
      const glow=clamp(s.morale/100,.25,1);
      const flick=Number.isFinite(now)?1+.06*Math.sin(t/140)+.04*Math.sin(t/67):1; // 火光摇曳（静态调用时=1）
      const fg=c.createRadialGradient(640,178,4,640,178,(90*glow+20)*flick);fg.addColorStop(0,'rgba(255,176,80,'+(0.45*glow*flick).toFixed(2)+')');fg.addColorStop(1,'rgba(255,176,80,0)');
      c.fillStyle=fg;c.fillRect(520,80,240,120);
      if(s.weather==='暴雨'){c.strokeStyle='rgba(170,200,230,.25)';const drift=Number.isFinite(now)?(t/22)%26:0;
        for(let i=0;i<40;i++){const x=((i*97)%1280+drift*(i%2?1:-1)+1280)%1280,y=((i*53)%200+(Number.isFinite(now)?(t/16)%200:0))%200;c.beginPath();c.moveTo(x,y);c.lineTo(x-3,y+12);c.stroke();}}
    };
    let raf=0;
    const reducedMo=()=>{try{return!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch{return false;}};
    const loop=(now)=>{if(closed||!dialog.isConnected)return;drawScene(now);raf=requestAnimationFrame(loop);};
    if(!reducedMo())raf=requestAnimationFrame(loop);
    const hud=()=>{q('[data-hud]').textContent=`第 ${Math.min(s.day,30)}/30 天 · 粮食 ${Math.round(s.food)} · 兵力 ${Math.round(s.troops)} · 士气 ${Math.round(s.morale)} · 伤员 ${woundedCount(s)} · 掉队 ${goneCount(s)}`;};
    const crewList=()=>'<div class="g30-crew">'+s.crew.map(m=>'<span class="g30-tag g30-'+m.status+'">'+m.name+' · '+STATUS_LABEL[m.status]+'</span>').join('')+'</div>';
    const actions=btns=>{q('[data-actions]').innerHTML=btns.map(b=>'<button type="button" data-act="'+b.k+'"'+(b.primary?' class="primary"':'')+'>'+b.t+'</button>').join('');
      q('[data-actions]').querySelectorAll('button').forEach(b=>b.onclick=()=>onAct(b.dataset.act));};
    const renderBrief=()=>{
      s.phase='brief';this.rollWeather(s);
      q('[data-body]').innerHTML='<div class="g30-panel"><p class="g30-label">晨报 · DAILY BRIEF · 第 '+s.day+' 天</p>'
        +'<p class="g30-weather">天气判定：<b>'+s.weather+'</b></p>'
        +'<p class="g30-line">'+(s.weather==='暴雨'?'暴雨将至，干柴难觅，注意火种与粮食霉损。':s.weather==='寒潮'?'气温骤降，伤员最怕这一夜。':s.weather==='沼泽'?'前路泥沼连片，快行军容易陷进去。':s.weather==='敌侦察影'?'侦察员发现敌骑在草地边缘游荡，快行军有暴露风险。':'难得的晴日，队伍抓紧赶路。')+'</p>'+crewList()+'</div>';
      drawScene();hud();actions([{k:'decide',t:'做分配 · PLAN'}]);
    };
    const renderDecide=()=>{
      s.phase='decide';const total=this.calcRationTotal(s.food);
      const slider=k=>'<label class="g30-sl"><span>'+({wounded:'伤员份额',combat:'战力份额',reserve:'储备份额'}[k])+' <b data-v="'+k+'">'+ration[k]+'</b> 份</span>'
        +'<input type="range" min="0" max="'+RATION_PER_PERSON_MAX+'" value="'+ration[k]+'" data-r="'+k+'"></label>';
      q('[data-body]').innerHTML='<div class="g30-panel"><p class="g30-label">分粮 · RATION · 今日共 '+total+' 份（粮食÷2，保底 20）</p>'
        +slider('wounded')+slider('combat')+slider('reserve')
        +'<p class="g30-line">负重人选：<label><input type="radio" name="g30c" value="wounded" '+(s.carrier==='wounded'?'checked':'')+'> 伤员轻装</label>　<label><input type="radio" name="g30c" value="cook" '+(s.carrier==='cook'?'checked':'')+'> 炊事员分担</label>　<label><input type="radio" name="g30c" value="self" '+(s.carrier==='self'?'checked':'')+'> 自己来背</label></p>'
        +'<p class="g30-line">行军速度：<label><input type="radio" name="g30p" value="fast"> 快</label>　<label><input type="radio" name="g30p" value="normal" checked> 常速</label>　<label><input type="radio" name="g30p" value="slow"> 慢（伤员跟得上）</label></p>'
        +'<p class="g30-line g30-sum">合计 '+(ration.wounded+ration.combat+ration.reserve)+' 份</p>'
        +crewList()+'</div>';
      drawScene();
      q('[data-body]').querySelectorAll('[data-r]').forEach(inp=>{inp.oninput=()=>{ration[inp.dataset.r]=Number(inp.value);
        const b=q('[data-body]');const sum=ration.wounded+ration.combat+ration.reserve;
        b.querySelector('[data-v="wounded"]').textContent=ration.wounded;
        b.querySelector('[data-v="combat"]').textContent=ration.combat;
        b.querySelector('[data-v="reserve"]').textContent=ration.reserve;
        b.querySelector('.g30-sum').textContent='合计 '+sum+' 份'+(sum>total?'（超出今日 '+total+' 份，提交时按比例折算）':'');};});
      actions([{k:'commit',t:'扎营 · CAMP',primary:true}]);
    };
    const renderDay=()=>{
      s.phase='event';
      const notes=s.today?s.today.notes:[];const pc=s.pendingChoice;
      const d=s.today&&s.today.deltas;
      const deltaChips=d?['food','troops','morale'].map(k=>{const v=d[k];if(!v)return '';
        const good=k==='food'?v>0:v>0;const nm={food:'粮食',troops:'兵力',morale:'士气'}[k];
        return '<span class="g30-delta '+(v>0?'up':'down')+'">'+nm+' '+(v>0?'+':'')+v+'</span>';}).join(''):'';
      q('[data-body]').innerHTML='<div class="g30-panel"><p class="g30-label">今日结算 · DAY '+s.day+' RESULT</p>'
        +(deltaChips?'<div class="g30-deltas">'+deltaChips+'</div>':'')
        +notes.map(n=>'<p class="g30-line'+(n.quote?' g30-quote':'')+(n.milestone?' g30-mile':'')+'">'+n.t+'</p>').join('')
        +(pc?'<p class="g30-label">抉择 · CHOICE</p><div class="g30-choices">'+pc.choice.map((c,i)=>'<button type="button" data-ch="'+i+'">'+c.label+'</button>').join('')+'</div>':'')
        +crewList()+'</div>';
      drawScene();hud();
      if(pc){q('[data-body]').querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{
        const more=this.resolveChoice(s,Number(b.dataset.ch));
        const wrap=q('[data-body] .g30-choices');if(wrap)wrap.remove();
        const panel=q('[data-body] .g30-panel'),crew=panel.querySelector('.g30-crew');
        more.forEach(n=>{const p=document.createElement('p');p.className='g30-line';p.textContent=n.t;panel.insertBefore(p,crew);});
        if(!s.pendingChoice)actions([{k:'night',t:'宿营 · NIGHT'}]);
      });}
      actions(pc?[]:[{k:'night',t:'宿营 · NIGHT'}]);
    };
    const renderNight=()=>{
      s.phase='night';const ok=s.nightResult>0;
      q('[data-body]').innerHTML='<div class="g30-panel"><p class="g30-label">宿营 · NIGHT'+(s.nightMode==='game'?' · 守火战绩':'')+'</p>'
        +'<p class="g30-line">'+(s.nightMode==='game'?(ok?'火种守住了，营地难得的暖和。':'守火失利，这一夜格外冷。'):ok?'夜色平静，哨位交替，营地安稳。':'雨夜的营地又冷又湿，大家挤着取暖。')+'</p>'
        +crewList()+'</div>';
      drawScene();actions([{k:'next',t:'第 '+(Math.min(s.day+1,30))+' 天 · NEXT DAY'}]);
    };
    const renderEnd=()=>{
      const r=this.rating(s);
      q('[data-body]').innerHTML='<div class="g30-panel g30-end"><p class="g30-big '+(s.status==='won'?'ok':'bad')+'">'+(s.status==='won'?'走出草地':'没能走出')+'</p>'
        +'<p class="g30-line">'+s.reason+'</p>'
        +'<p class="g30-label">过草地名单 · ROSTER</p>'
        +'<p class="g30-line">走出来的：'+alive(s).map(m=>m.name).join('、')+'</p>'
        +(s.lost.length?'<p class="g30-line g30-lost">没能走出来的：'+s.lost.join('；')+'</p>':'<p class="g30-line">五个人一个不少。</p>')
        +'<p class="g30-line"><b>'+r.rating+' · '+r.score+' 分</b></p>'
        +'<p class="g30-note">人物为教学虚构。</p></div>';
      drawScene();actions(s.status==='won'?[{k:'complete',t:'记录成绩 · 完成本章',primary:true}]:[{k:'retry',t:'重新推演 · RETRY'}]);
    };
    const renderStart=()=>{
      q('[data-body]').innerHTML='<div class="g30-panel"><p class="g30-label">简报 · BRIEFING</p><p class="g30-line">'+s.d.intro+'</p>'+crewList()+'</div>';
      drawScene();hud();actions([{k:'start',t:'▶ 开始管理',primary:true}]);
      dialog.querySelector('[data-act="start"]').focus();
    };
    const render=()=>{
      hud();
      if(s.status==='ready')renderStart();
      else if(s.status==='won'||s.status==='lost')renderEnd();
      else if(s.phase==='brief')renderBrief();
      else if(s.phase==='decide')renderDecide();
      else if(s.phase==='event')renderDay();
      else if(s.phase==='nightwait')renderNightWait();
      else if(s.phase==='night')renderNight();
    };
    const renderNightWait=()=>{
      q('[data-body]').innerHTML='<div class="g30-panel"><p class="g30-label">宿营 · NIGHT · 守火进行中</p>'
        +'<p class="g30-line">夜色深沉，火堆旁的守夜人正盯住每一处雨渍……完成守火后回到这里。</p>'+crewList()+'</div>';
      drawScene();actions([]);
    };
    const onAct=k=>{if(closed)return;if(!current()){close();return;}
      if(k==='start'){s.status='playing';render();}
      else if(k==='decide')renderDecide();
      else if(k==='commit'){
        const total=this.calcRationTotal(s.food);
        const carrier=(dialog.querySelector('[name="g30c"]:checked')||{value:s.carrier}).value;
        const pace=(dialog.querySelector('[name="g30p"]:checked')||{value:'normal'}).value;
        s.carrier=carrier;
        let {wounded,combat,reserve}=ration;const sum=wounded+combat+reserve;
        if(sum>total&&sum>0){const f=total/sum;wounded=Math.round(wounded*f);combat=Math.round(combat*f);reserve=Math.max(0,total-wounded-combat);}
        const before={food:s.food,troops:s.troops,morale:s.morale};
        this.applyDay(s,{ration:{wounded,combat,reserve},carrier,pace});
        s.today.deltas={food:Math.round(s.food-before.food),troops:Math.round(s.troops-before.troops),morale:Math.round(s.morale-before.morale)};
        if(s.status!=='playing'){render();return;}
        renderDay();
      }
      else if(k==='night'){
        if(s.phase==='nightwait'||s.phase==='night')return; // 守火进行中/已宿营，防双开
        s.nightResult=null;
        if(typeof Campfire68!=='undefined'&&Campfire68&&typeof Campfire68.open==='function'){s.phase='nightwait';render();}
        cancelNight=this.night(s,()=>{if(closed||!dialog.isConnected||!current())return;s.phase='night';render();});
      }
      else if(k==='next'){this.nextDay(s);render();}
      else if(k==='retry'){retries++;s=this.create(node.id);s.retries=retries;this.session=s;ration={wounded:8,combat:8,reserve:8};render();}
      else if(k==='complete'){if(recorded||s.status!=='won'||!current())return;recorded=true;const result=this.persist(s,node.id);if(result.saved===false){recorded=false;if(typeof GameUI!=='undefined')GameUI.showToast('成绩尚未保存，请重试记录。');return;}close();if(typeof onComplete==='function')onComplete();}
    };
    render();
    return true;
  }
  return{CREW,STATUS_LABEL,WEATHERS,MILESTONES,N_BALANCED,N_ZERO,N_WOUNDED,N_LIMITED,calcRationTotal,
    supports(id){return [9].includes(Number(id));},definitions,
    create,rollWeather,applyDay,resolveChoice,night,nextDay,finish,rating,persist,style,
    muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
    paused(){return typeof document!=='undefined'&&(document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay'));},
    open};
})();
