/* Zhiluo small tactics: Into-the-Breach style puzzle, enemy intents always public.
   Levels are hand-verified solvable; tests drive the exact winning sequences.
   Rebuilt 2026-10-25 after file loss; includes all prior fixes (action budget,
   immediate win on push-kill, keyboard controls, idempotent result panel). */
window.Zhiluo70=(function(){
  /* 地形：'.'草 '#'岩(不可通行) '~'水(敌入即灭/我方不可入)。坐标 (x,y)，0 起。 */
  const LEVELS=[
    {id:'l1',title:'第 1 关 · 湘南突围',brief:'教学关：敌兵沿川道东行。把敌兵推进水塘即可。突击手每回合可移动 1 格并使用 1 次推移。',
      goal:{type:'clear',turns:8},
      grid:['........','........','........','........','...e~...','........','........','........'],
      my:[{type:'assault',x:5,y:4},{type:'mg',x:1,y:4},{type:'medic',x:2,y:5}],
      enemies:[{x:3,y:4,script:['E','E','stay','stay','stay','stay','stay','stay']}]},
    {id:'l2',title:'第 2 关 · 直罗镇设伏',brief:'1935 年 11 月，直罗镇战役——党中央落脚陕北的「奠基礼」。东侧水塘是伏击位：把西来的敌兵推下去，顶住 4 回合。',
      goal:{type:'survive',turns:4},
      grid:['........','........','........','..e...~.','........','.....e..','........','........'],
      my:[{type:'assault',x:4,y:4},{type:'mg',x:2,y:6},{type:'medic',x:3,y:6}],
      enemies:[{x:2,y:3,script:['E','E','E','E']},{x:5,y:5,script:['W','W','W','W']}]},
    {id:'l3',title:'第 3 关 · 山城堡',brief:'1936 年 11 月，山城堡战役——长征最后一战余音。三个敌兵、三处水塘：逐个推移，全歼即胜。',
      goal:{type:'clear',turns:8},
      grid:['........','........','........','........','.~e.e.~~','........','...e....','...~....'],
      my:[{type:'assault',x:4,y:3},{type:'mg',x:1,y:2},{type:'medic',x:5,y:2}],
      enemies:[{x:2,y:4,script:['stay','stay','stay','stay','stay','stay','stay','stay']},
               {x:4,y:4,script:['E','E','stay','stay','stay','stay','stay','stay']},
               {x:3,y:6,script:['stay','stay','stay','stay','stay','stay','stay','stay']}]}
  ];
  const TYPE_LABEL={assault:'突击手',mg:'机枪手',medic:'卫生员'};
  function tile(s,x,y){return(x<0||x>7||y<0||y>7)?'#':s.grid[y][x];}
  function walkable(s,x,y,who){const t=tile(s,x,y);if(t==='#')return false;if(t==='~')return who==='enemy';return true;}
  function enemyAt(s,x,y){return s.enemies.find(e=>e.gone===false&&e.x===x&&e.y===y);}
  function myAt(s,x,y){return s.my.find(u=>u.gone===false&&u.x===x&&u.y===y);}
  function createLevel(i){
    const lv=LEVELS[i];const grid=lv.grid.map(r=>r.split(''));
    return {lv:lv,levelIdx:i,grid:grid,turn:1,status:'playing',reason:'',
      my:lv.my.map(u=>({...u,down:false,gone:false,moved:false,acted:false})),
      enemies:lv.enemies.map(e=>({...e,gone:false,suppressed:false,intent:null})),
      selected:0,skillMode:null,history:[],log:[],events:[]};
  }
  function computeIntents(s){
    for(const e of s.enemies){
      if(e.gone){e.intent=null;continue;}
      e.suppressed=false;
      const step=s.lv.enemies[s.enemies.indexOf(e)].script[Math.min(s.turn-1,e.script.length-1)]||'stay';
      const d={E:[1,0],W:[-1,0],N:[0,-1],S:[0,1]}[step]||[0,0];
      const tx=e.x+d[0],ty=e.y+d[1];
      if(d[0]===0&&d[1]===0){e.intent={dx:0,dy:0,label:'stay'};}
      else if(tile(s,tx,ty)==='~'){e.intent={dx:0,dy:0,label:'stay'};} // 脚本避水：驻足
      else if(tile(s,tx,ty)==='#'||(tx<0||tx>7||ty<0||ty>7)){e.intent={dx:0,dy:0,label:'stay'};}
      else{e.intent={dx:d[0],dy:d[1],label:step};}
    }
    return s;
  }
  function playerMove(s,i,dx,dy){
    if(s.status!=='playing')return false;
    const u=s.my[i];if(!u||u.gone||u.down||u.moved)return false;
    const nx=u.x+dx,ny=u.y+dy;
    if(!walkable(s,nx,ny,'my'))return false;
    if(enemyAt(s,nx,ny)||myAt(s,nx,ny))return false;
    u.x=nx;u.y=ny;u.moved=true;return true;
  }
  /* 技能：assault=推移相邻敌兵（dir 为推移方向）；mg=压制十字一线 3 格内首个敌兵（intent 作废）；medic=拉起相邻倒地友军 */
  function playerSkill(s,i,dir){
    if(s.status!=='playing')return false;
    const u=s.my[i];if(!u||u.gone||u.down||u.acted)return false;
    const d={E:[1,0],W:[-1,0],N:[0,-1],S:[0,1]}[dir]||null;if(!d)return false;
    if(u.type==='assault'){
      const e=enemyAt(s,u.x+d[0],u.y+d[1]);if(!e)return false;
      const tx=e.x+d[0],ty=e.y+d[1];
      if(tile(s,tx,ty)==='~'){e.gone=true;u.acted=true;s.log.push('敌兵被推入水塘，退出战斗。');s.events.push('push');checkEnd(s);return true;}
      else if(walkable(s,tx,ty,'enemy')&&!enemyAt(s,tx,ty)&&!myAt(s,tx,ty)){e.x=tx;e.y=ty;u.acted=true;s.log.push('敌兵被推移一格。');s.events.push('push');checkEnd(s);return true;}
      else return false;
    }
    if(u.type==='mg'){
      for(let k=1;k<=3;k++){const e=enemyAt(s,u.x+d[0]*k,u.y+d[1]*k);
        if(e){e.suppressed=true;e.intent={dx:0,dy:0,label:'stay'};u.acted=true;s.log.push('机枪压制：敌兵本回合计划作废。');s.events.push('mg');return true;}}
      return false;
    }
    if(u.type==='medic'){
      const a=s.my.find(m=>m!==u&&m.down&&!m.gone&&(Math.abs(m.x-u.x)+Math.abs(m.y-u.y))===1);
      if(!a)return false;a.down=false;u.acted=true;s.log.push('卫生员拉起了'+TYPE_LABEL[a.type]+'。');s.events.push('medic');return true;
    }
    return false;
  }
  function checkEnd(s){
    const lv=s.lv.goal;
    if(s.my.some(u=>u.gone)){s.status='lost';s.reason='有队员撤出了战斗——直罗镇的伏击容不得减员。重新推演，用推移让敌人打不到人。';s.events.push('lose');return;}
    if(lv.type==='clear'&&s.enemies.every(e=>e.gone)){s.status='won';s.reason='伏击圈收口，敌兵全数退出战斗。';s.events.push('win');return;}
    if(lv.type==='survive'&&s.turn>=lv.turns){s.status='won';s.reason='顶住了规定回合，镇口安然无恙——「奠基礼」如期举行。';s.events.push('win');return;}
  }
  function endTurn(s){
    if(s.status!=='playing')return s;
    for(const e of s.enemies){
      if(e.gone||!e.intent||e.intent.label==='stay')continue;
      const tx=e.x+e.intent.dx,ty=e.y+e.intent.dy;
      if(tile(s,tx,ty)==='~'){e.gone=true;s.log.push('敌兵按预定路线走进水塘，退出战斗。');continue;}
      const m=myAt(s,tx,ty);
      if(m){if(m.down){m.gone=true;s.log.push(TYPE_LABEL[m.type]+'二次被扑，撤出战斗。');}else{m.down=true;s.log.push(TYPE_LABEL[m.type]+'被扑倒在地。');}s.events.push('hit');}
      else if(walkable(s,tx,ty,'enemy')&&!enemyAt(s,tx,ty)){e.x=tx;e.y=ty;}
    }
    if(s.status==='playing')checkEnd(s);
    if(s.status==='playing'){s.turn++;computeIntents(s);for(const u of s.my){u.moved=false;u.acted=false;}}
    return s;
  }
  function levelScore(s){
    if(s.status!=='won')return 70;
    return s.my.every(u=>!u.down)?95:85;
  }
  function persist(results){
    try{
      if(typeof GameState!=='undefined'){
        GameState.storyPreparations=GameState.storyPreparations||{};
        const key='zhiluo_extra',old=GameState.storyPreparations[key];
        if(!Array.isArray(results)||results.length!==LEVELS.length||Array.from(results).some(v=>!Number.isFinite(v)))return false;const score=Math.min(...results);
        if(!old||old.score<score)GameState.storyPreparations[key]={score,rating:score>=95?'运筹帷幄':'过关',levelsCleared:results.length,completedAt:new Date().toISOString()};
        if(typeof GameState.save==='function')GameState.save();
        /* 刻意不调用 recordBattleScore：番外战棋不占主线图鉴节点 */
      }
    }catch{}
  }
  /* ===== UI ===== */
  function style(){
    if(document.getElementById('zhiluo70-style'))return;
    const el=document.createElement('style');el.id='zhiluo70-style';el.textContent=`
    .zhiluo-card{cursor:pointer;border:1px solid #b9ac8d;border-left:3px solid #97372a;border-radius:0;padding:12px;background:#f6efdd;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}
    .zhiluo-card:hover,.zhiluo-card:focus-visible{border-color:#97372a;background:#fbf4e4;transform:translateY(-2px);box-shadow:0 5px 14px rgba(83,62,38,.18)}
    .zhiluo-card p{color:#352e23}
    .zhiluo-dialog{box-sizing:border-box;width:min(900px,96vw);max-height:96dvh;margin:auto;padding:0;background:#101315;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.5 'Microsoft YaHei',sans-serif}
    .zhiluo-dialog::backdrop{background:#05070ae6}
    .zhiluo-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #2a2d31;background:#131619}
    .zhiluo-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .zhiluo-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .zhiluo-body{padding:12px 18px;display:flex;gap:14px;flex-wrap:wrap}
    .zhiluo-dialog canvas{max-width:100%;height:auto;background:#0c0f0c;border:1px solid #3a3d42;border-radius:2px;touch-action:none}
    .zhiluo-side{flex:1 1 260px;min-width:240px}
    .zhiluo-panel{border:1px solid #2a2d31;border-left:3px solid #ffcf24;background:#14171a;padding:8px 10px;margin:6px 0}
    .zhiluo-panel p{margin:4px 0;font-size:13px;color:#d5d8d2}
    .zhiluo-label{margin:2px 0 6px;font-size:10px;letter-spacing:.2em;color:#8b8e93;text-transform:uppercase}
    .zhiluo-unit{display:inline-block;border:1px solid #2a2d31;background:#191c20;border-radius:2px;padding:3px 8px;margin:2px;font-size:12px;color:#cfd2cf;cursor:pointer}
    .zhiluo-unit.sel{border-color:#ffcf24;color:#ffcf24}
    .zhiluo-unit.down{color:#ff8d75;border-color:#6a3a30}
    .zhiluo-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:7px 12px;min-height:38px;cursor:pointer;margin:2px}
    .zhiluo-dialog button:hover{background:#22262b;border-color:#6a6e74}
    .zhiluo-dialog button:disabled{opacity:.38;cursor:default}
    .zhiluo-dialog button:disabled:hover{background:#191c20;border-color:#4a4d52}
    .zhiluo-dialog button:focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .zhiluo-dialog button.primary{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .zhiluo-dialog [hidden]{display:none!important}
    .zhiluo-note{font-size:12px;color:#8f948d;padding:0 18px 12px}
    @media(max-width:600px){.zhiluo-dialog{font-size:13px}}`;
    document.head.append(el);
  }
  let dialog=null,levelResults=[],activeOwner=null,trigger=null;
  const owner=()=>String(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:'default')+':'+!!window.MainlineDemo?.active;
  function openCard(){
    if(dialog){return;} // 已开不重复 showModal（对已开 dialog 调用会抛 InvalidStateError）
    style();trigger=document.activeElement;if(activeOwner!==owner()){levelResults=[];activeOwner=owner();}s=null;
    dialog=document.createElement('dialog');dialog.className='zhiluo-dialog';dialog.setAttribute('aria-labelledby','zhiluo-t');
    dialog.innerHTML='<header><div><h2 id="zhiluo-t">直罗镇 · 设伏</h2><p class="zhiluo-sub">Ambush Tactics · Enemy Intent Public</p></div><button data-close>关闭 · Esc</button></header>'
      +'<p class="zhiluo-note">番外战棋：敌方下一步永远公开预告（红色箭头）。用推移让敌人落水、用压制打断计划。键盘：方向键移动、Shift+方向技能、Q 切换单位、E 结束回合。</p>'
      +'<div class="zhiluo-body" data-stage></div><p class="zhiluo-note">番外推演，不计入主线图鉴节点。</p>';
    document.body.append(dialog);dialog.showModal();
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();
    dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});
    dialog.addEventListener('close',()=>{const old=dialog;dialog=null;old?.remove();s=null;if(trigger?.isConnected)trigger.focus();});
    dialog.addEventListener('keydown',e=>{
      if(s===null||e.target.closest('button,input,select,textarea'))return;
      const map={ArrowUp:'N',ArrowDown:'S',ArrowLeft:'W',ArrowRight:'E'};
      const d=map[e.key];
      if(d){
        e.preventDefault();
        const vec={N:[0,-1],S:[0,1],W:[-1,0],E:[1,0]}[d];
        if(e.shiftKey){if(playerSkill(s,s.selected,d))render();}
        else if(playerMove(s,s.selected,vec[0],vec[1]))render();
        return;
      }
      if(e.key==='q'||e.key==='Q'){e.preventDefault();s.selected=(s.selected+1)%s.my.length;render();return;}
      if(e.key==='e'||e.key==='E'||e.key==='Enter'){
        if(s.status==='playing'){e.preventDefault();endTurn(s);render();}
      }
    });
    showLevelSelect();
  }
  function showLevelSelect(){
    s=null;const st=dialog.querySelector('[data-stage]');
    st.innerHTML='<div class="zhiluo-side">'+LEVELS.map((l,i)=>'<div class="zhiluo-panel"><p class="zhiluo-label">LEVEL '+(i+1)+'</p><p><b>'+l.title+'</b></p><p>'+l.brief+'</p><button data-lv="'+i+'" class="primary">进入 · START</button></div>').join('')+'</div>';
    st.querySelectorAll('[data-lv]').forEach(b=>b.onclick=()=>startLevel(Number(b.dataset.lv)));
  }
  let s=null,view=null;
  function startLevel(i){
    s=createLevel(i);computeIntents(s);render();dialog.querySelector('[data-board]')?.focus();
  }
  function draw(){
    const cv=dialog.querySelector('[data-board]');const c=cv.getContext('2d');
    const T=72;c.clearRect(0,0,8*T+16,8*T+16);
    for(let y=0;y<8;y++)for(let x=0;x<8;x++){
      const t=tile(s,x,y);
      c.fillStyle=t==='~'?'#173343':t==='#'?'#26241f':'#1c241a';
      c.fillRect(8+x*T,8+y*T,T-2,T-2);
      c.strokeStyle='#2c2f2c';c.strokeRect(8+x*T+0.5,8+y*T+0.5,T-2,T-2);
      if(t==='~'){c.strokeStyle='rgba(120,180,220,.4)';c.beginPath();c.moveTo(8+x*T+10,8+y*T+T/2);c.lineTo(8+x*T+T-14,8+y*T+T/2);c.stroke();}
    }
    for(const e of s.enemies){
      if(e.gone)continue;
      const px=8+e.x*T+T/2,py=8+e.y*T+T/2;
      c.fillStyle='#4a3a35';c.beginPath();c.arc(px,py,T*0.32,0,Math.PI*2);c.fill();
      c.strokeStyle='#e5484d';c.lineWidth=2;c.stroke();
      if(e.intent&&e.intent.label!=='stay'){
        c.strokeStyle='rgba(229,72,77,.9)';c.lineWidth=3;
        c.beginPath();c.moveTo(px,py);c.lineTo(px+e.intent.dx*T*0.8,py+e.intent.dy*T*0.8);c.stroke();
        const tx=8+(e.x+e.intent.dx)*T+T/2,ty=8+(e.y+e.intent.dy)*T+T/2;
        c.strokeStyle='rgba(229,72,77,.55)';c.strokeRect(8+(e.x+e.intent.dx)*T+2,8+(e.y+e.intent.dy)*T+2,T-6,T-6);
      }
    }
    for(let i=0;i<s.my.length;i++){
      const u=s.my[i];if(u.gone)continue;
      const px=8+u.x*T+T/2,py=8+u.y*T+T/2;
      c.save();if(u.down){c.translate(px,py);c.rotate(Math.PI/2);c.translate(-px,-py);}
      c.fillStyle=i===s.selected?'#ffcf24':'#c84a3a';c.beginPath();c.arc(px,py,T*0.3,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.5;c.stroke();
      if(i===s.selected&&!u.down){c.strokeStyle='rgba(255,207,36,.85)';c.lineWidth=2.5;c.beginPath();c.arc(px,py,T*0.42,0,Math.PI*2);c.stroke();}
      c.fillStyle='#141310';c.font='bold 13px sans-serif';c.textAlign='center';
      c.fillText({assault:'突',mg:'机',medic:'医'}[u.type],px,py+5);c.restore();
      if(u.down){c.fillStyle='#ff8d75';c.font='bold 11px sans-serif';c.textAlign='left';c.fillText('倒',px+T*0.22,py-T*0.22);}
    }
    c.textAlign='left';
  }
  function render(){
    const st=dialog.querySelector('[data-stage]');
    if(!dialog.querySelector('[data-board]')){
      st.innerHTML='<canvas data-board tabindex="0" width="592" height="592" aria-label="直罗镇战棋棋盘，8×8 格，敌方下一步以红色箭头公开预告"></canvas>'
        +'<div class="zhiluo-side" data-side></div>';
      const cv=st.querySelector('[data-board]');
      cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect();
        const sc=r.width/592;
        const x=Math.floor((e.clientX-r.left-8*sc)/(72*sc)),y=Math.floor((e.clientY-r.top-8*sc)/(72*sc));
        if(x>=0&&x<8&&y>=0&&y<8)clickTile(x,y);});
    }
    draw();
    const side=st.querySelector('[data-side]');
    const u=s.my[s.selected];
    const spent=m=>m.moved||m.acted;
    const unitTag=m=>m.gone?'（撤出）':m.down?'（倒地）':spent(m)?'（已行动）':'';
    const busy=s.status!=='playing'||u.down||u.gone;
    side.innerHTML='<div class="zhiluo-panel"><p class="zhiluo-label">'+s.lv.title+'</p><p>'+s.lv.brief+'</p>'
      +'<p>回合 <b>'+Math.min(s.turn,s.lv.goal.turns)+'</b>/'+s.lv.goal.turns+' · 目标：'+(s.lv.goal.type==='clear'?'全歼敌兵':'坚守 '+s.lv.goal.turns+' 回合')+'</p></div>'
      +'<div class="zhiluo-panel"><p class="zhiluo-label">我方 · UNITS（点击/Q 切换）</p>'
      +s.my.map((m,i)=>'<span class="zhiluo-unit'+(i===s.selected?' sel':'')+(m.down?' down':'')+(m.gone?' hidden':'')+'" data-u="'+i+'">'+TYPE_LABEL[m.type]+unitTag(m)+'</span>').join('')+'</div>'
      +'<div class="zhiluo-panel"><p class="zhiluo-label">行动 · ACTIONS（每回合移动/技能各一次）</p>'
      +'<div>'+['N','S','W','E'].map(d=>'<button data-mv="'+d+'"'+(busy||u.moved?' disabled':'')+'>'+{N:'↑ 北',S:'↓ 南',W:'← 西',E:'→ 东'}[d]+'</button>').join('')+'</div>'
      +'<div>'+(['assault','mg','medic'].includes(u.type)?[['N','推/压 ↑'],['S','推/压 ↓'],['W','推/压 ←'],['E','推/压 →']].map(d=>'<button data-sk="'+d[0]+'"'+(busy||u.acted?' disabled':'')+'>'+d[1]+'</button>').join(''):'')+'</div>'
      +'<p class="zhiluo-label" style="margin-top:6px">战报</p><p>'+ (s.log.slice(-3).join('<br>')||'——') +'</p></div>';
    side.querySelectorAll('[data-u]').forEach(b=>b.onclick=()=>{s.selected=Number(b.dataset.u);render();});
    side.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const d={N:[0,-1],S:[0,1],W:[-1,0],E:[1,0]}[b.dataset.mv];playerMove(s,s.selected,d[0],d[1])&&render();});
    side.querySelectorAll('[data-sk]').forEach(b=>b.onclick=()=>{playerSkill(s,s.selected,b.dataset.sk)&&render();});
    const done=s.status!=='playing';if(s.status==='won'&&activeOwner===owner()){levelResults[s.levelIdx]=levelScore(s);if(levelResults.filter(Number.isFinite).length===LEVELS.length)persist(levelResults);}
    let foot='<button data-end class="primary">'+(done?'查看结果':'结束回合 · END TURN')+'</button><button data-retry>重开本关</button><button data-menu>选关</button>';
    if(done&&s.status==='won'&&s.levelIdx<LEVELS.length-1)foot+='<button data-next>下一关 · NEXT</button>';
    side.insertAdjacentHTML('beforeend','<div class="zhiluo-panel" data-foot>'+foot+'</div>');
    const f=side.querySelector('[data-foot]');
    f.querySelector('[data-end]').onclick=()=>{if(done){showResult();return;}endTurn(s);render();};
    f.querySelector('[data-retry]').onclick=()=>startLevel(s.levelIdx);
    f.querySelector('[data-menu]').onclick=showLevelSelect;
    const nx=f.querySelector('[data-next]');if(nx)nx.onclick=()=>startLevel(s.levelIdx+1);
  }
  function clickTile(x,y){
    const m=myAt(s,x,y);if(m){s.selected=s.my.indexOf(m);render();return;}
    const u=s.my[s.selected];
    const dx=x-u.x,dy=y-u.y;
    if(Math.abs(dx)+Math.abs(dy)===1){if(playerMove(s,s.selected,dx,dy)){render();return;}}
  }
  function showResult(){
    if(dialog.querySelector('.zhiluo-result'))return; // 幂等：结果面板只挂一次
    const r=levelScore(s);
    const st=dialog.querySelector('[data-stage]');
    st.insertAdjacentHTML('beforeend','<div class="zhiluo-side"><div class="zhiluo-panel zhiluo-result"><p class="zhiluo-label">RESULT</p><p style="font-size:22px;font-weight:900;color:'+(s.status==='won'?'#7ed491':'#ff8d75')+'">'+(s.status==='won'?'任务完成':'任务失败')+' · '+r+' 分</p><p>'+s.reason+'</p></div></div>');
  }
  function injectCard(){
    const panel=document.getElementById('panelChallenges');if(!panel||panel.querySelector('.zhiluo-card'))return;
    const card=document.createElement('div');
    card.className='zhiluo-card';card.tabIndex=0;card.setAttribute('role','button');
    card.innerHTML='<p style="margin:0 0 4px;font-size:10px;letter-spacing:.2em;color:#97372a">EXTRA · 番外战棋</p><p style="margin:0;font-weight:700;font-family:SimSun,serif">♟ 直罗镇 · 设伏</p><p style="margin:4px 0 0;font-size:12px;color:#7a6f57">敌方意图全公开的解谜战棋，三关。不占主线节点。</p>';
    card.onclick=()=>openCard();card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openCard();}};
    panel.prepend(card);
  }
  function init(){
    if(window.__zhiluoInit)return;window.__zhiluoInit=true;style();
    injectCard();let pending=false;new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;injectCard();});}).observe(document.body,{childList:true,subtree:true});
  }
  if(typeof document!=='undefined'){
    const autoInit=()=>{try{init();}catch{}};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoInit);else autoInit();
  }
  return{LEVELS,TYPE_LABEL,createLevel,computeIntents,playerMove,playerSkill,endTurn,levelScore,persist,loadLevel:i=>{s=createLevel(i);computeIntents(s);return s;},get session(){return s;},openCard,init,tile};
})();
