/* Yihai alliance: ritual sequence interaction (Simon-says), May 1935.
   Fixed ritual order per historical record; wrong step resets courteously. */
window.Yihai72=(function(){
  /* 仪式四步：顺序锁定，与史料一致 */
  const STEPS=[
    {key:'water',name:'彝海取水',en:'STEP 1 · FETCH WATER',note:'取彝海湖水入木碗——以水代酒，是当年盟誓的约定。'},
    {key:'blood',name:'公鸡滴血',en:'STEP 2 · DROP OF BLOOD',note:'公鸡滴血入碗，立誓为凭。'},
    {key:'oath',name:'对天盟誓',en:'STEP 3 · OATH',note:'刘伯承与小叶丹面向湖水、对天盟誓：结为兄弟，有福同享，有难同当。'},
    {key:'drink',name:'举碗共饮',en:'STEP 4 · DRINK TOGETHER',note:'举碗共饮盟誓水——彝海结盟成，红军顺利通过彝区。'}
  ];
  const HIST='1935年5月，刘伯承与彝族首领小叶丹在彝海边，遵循彝族传统仪式，杀鸡滴血、以湖水代酒，歃血结盟，结为兄弟，保障红军顺利通过彝区。彝海结盟是红军执行民族政策的典范，是中国民族团结史上的一段佳话。';
  function create(id){
    return {id:Number(id),d:definitions['yihai'],progress:0,mistakes:0,
      status:'ready',reason:'',events:[]};
  }
  /* 按序点击：正确推进；错误温和重置回第一步 */
  function pick(s,key){
    if(s.status!=='playing')return {ok:false,msg:'先开始结盟仪式。'};
    const expect=STEPS[s.progress];
    if(key===expect.key){
      s.progress++;s.events.push('step');
      if(s.progress>=STEPS.length){this.finish(s,true,'结盟礼成——彝海作证，红军顺利通过彝区。');}
      return {ok:true};
    }
    s.mistakes++;s.progress=0;s.events.push('reset');
    return {ok:false,msg:'仪式不合礼，请重新开始。'};
  }
  function finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');}
  function rating(s){
    if(s.status!=='won')return{score:70,rating:'礼犹未尽'};
    return s.mistakes===0?{score:95,rating:'一诺千金'}:s.mistakes<=2?{score:85,rating:'诚心可鉴'}:{score:75,rating:'礼成'};
  }
  function persist(s,nodeId){
    const result=rating(s);
    try{if(typeof GameState!=='undefined'){
      GameState.storyPreparations=GameState.storyPreparations||{};
      const key='yihai72_'+(nodeId||'x'),old=GameState.storyPreparations[key];
      if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,mistakes:s.mistakes,completedAt:new Date().toISOString()};
      if(nodeId&&typeof GameState.recordBattleScore==='function')GameState.recordBattleScore(nodeId,result.score,result.rating);
      if(typeof GameState.save==='function')GameState.save();}}catch{}
    return result;
  }
  const definitions={'yihai':{title:'彝海结盟 · 歃血为盟',
    intro:'1935年5月，彝海湖畔。按彝族传统礼仪的顺序完成结盟仪式：取水、滴血、盟誓、共饮。顺序不可调换。',
    success:'结盟礼成——彝海作证，红军顺利通过彝区。',
    hist:HIST}};
  function style(){
    if(document.getElementById('yihai72-style'))return;
    const el=document.createElement('style');el.id='yihai72-style';el.textContent=`
    .yihai72-dialog{box-sizing:border-box;width:min(900px,96vw);max-height:96dvh;margin:auto;padding:0;background:#0e1210;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .yihai72-dialog::backdrop{background:#05070ae6}
    .yihai72-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #223026;background:#101512}
    .yihai72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .yihai72-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .yihai72-body{padding:12px 18px}
    .yihai72-dialog canvas{display:block;width:100%;height:auto;background:#121a16;border:1px solid #3a3d42;border-radius:2px;touch-action:none}
    .yihai72-nodes{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin:12px 0}
    .yihai72-node{width:150px;min-height:96px;border:1px solid #3d4232;background:#161c14;border-radius:3px;cursor:pointer;padding:10px;text-align:center;transition:border-color .12s ease,transform .12s ease}
    .yihai72-node:hover:not(:disabled){border-color:#ffcf24;transform:translateY(-2px)}
    .yihai72-node:disabled{opacity:.42;cursor:default}
    .yihai72-node .yihai72-ic{font-size:26px}
    .yihai72-node .yihai72-t{display:block;font:600 14px/1.6 SimSun,serif;color:#efe6cf;margin-top:4px}
    .yihai72-node .yihai72-e{display:block;font-size:9px;letter-spacing:.14em;color:#8b8e93;text-transform:uppercase}
    .yihai72-node.done{border-color:#3a5a40}
    .yihai72-node.done .yihai72-t{color:#9fd08a}
    .yihai72-node.next{border-color:#ffcf24}
    .yihai72-note-card{border:1px solid #223026;border-left:3px solid #ffcf24;background:#141a15;padding:9px 12px;margin:8px auto;max-width:620px;font-size:13px;color:#cfd2cf;min-height:3.2em}
    .yihai72-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:9px;margin:0 18px}
    .yihai72-actions{display:flex;gap:8px;flex-wrap:wrap;padding:10px 18px 12px}
    .yihai72-dialog button{font:inherit;background:#161c14;color:#e8e6df;border:1px solid #3d4232;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer}
    .yihai72-dialog button:hover:not(:disabled){background:#1e2418}
    .yihai72-dialog button.primary{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .yihai72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .yihai72-note{font-size:12px;color:#8f948d;padding:0 18px 12px}
    .yihai72-dialog [hidden]{display:none!important}
    @media(max-width:600px){.yihai72-node{width:calc(50% - 6px);min-height:84px}}`;
    document.head.append(el);
  }
  function open(node,onComplete){
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node?.id||0)&&node?.id){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&node?.id&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='yihai72-dialog';dialog.setAttribute('aria-labelledby','yihai72-t');
    dialog.innerHTML='<header><div><h2 id="yihai72-t"></h2><p class="yihai72-sub">Yihai Alliance · May 1935</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="yihai72-body"><p data-intro></p><canvas data-scene width="840" height="190" aria-hidden="true"></canvas>'
      +'<div class="yihai72-nodes" data-nodes></div><div class="yihai72-note-card" data-note>按史料顺序点击仪式节点。</div></div>'
      +'<p class="yihai72-status" role="status" aria-live="polite"></p>'
      +'<div class="yihai72-actions"><button data-start class="primary">▶ 开始结盟</button><button data-retry>↻ 重行仪式</button><button data-complete hidden>记录成绩</button></div>'
      +'<p class="yihai72-note">每一步附文化注释卡；顺序错误将温和重置（无惩罚计分影响评语）。仪式刻画尊重史料、不做猎奇演绎。</p>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel);
    let s=create('yihai');this.session=s;
    let recorded=false,closed=false;
    q('h2').textContent=s.d.title;q('[data-intro]').textContent=s.d.intro;
    const close=()=>{if(closed)return;closed=true;dialog.remove();if(trigger&&trigger.isConnected)trigger.focus();};
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    q('[data-close]').onclick=close;
    const status=t=>{q('.yihai72-status').textContent=t;};
    const drawScene=()=>{
      const c=q('[data-scene]').getContext('2d');
      const g=c.createLinearGradient(0,0,0,190);g.addColorStop(0,'#1a2620');g.addColorStop(1,'#0e1411');
      c.fillStyle=g;c.fillRect(0,0,840,190);
      c.fillStyle='#16211b';c.beginPath();c.moveTo(0,120);
      for(let i=0;i<=12;i++)c.lineTo(i*70,86+Math.sin(i*1.4)*22);c.lineTo(840,120);c.lineTo(840,190);c.lineTo(0,190);c.fill();
      c.fillStyle='#1d2c24';c.fillRect(0,130,840,60);
      c.strokeStyle='rgba(190,215,200,.18)';c.lineWidth=1.5;
      for(let i=0;i<6;i++){c.beginPath();c.moveTo(90+i*120,158+(i%2)*4);c.lineTo(130+i*120,156+(i%2)*4);c.stroke();}
      // 两人剪影对湖而立
      c.fillStyle='#0d120e';
      c.fillRect(360,96,16,58);c.beginPath();c.arc(368,90,9,0,Math.PI*2);c.fill();
      c.fillRect(464,96,16,58);c.beginPath();c.arc(472,90,9,0,Math.PI*2);c.fill();
      if(s.progress>=1){c.fillStyle='#8a6a3a';c.fillRect(408,132,22,16);}
      if(s.progress>=4){const gl=c.createRadialGradient(416,128,4,416,128,60);
        gl.addColorStop(0,'rgba(255,207,36,.25)');gl.addColorStop(1,'rgba(255,207,36,0)');
        c.fillStyle=gl;c.fillRect(356,68,120,90);}
    };
    const render=()=>{
      q('[data-nodes]').innerHTML=STEPS.map((st,i)=>{
        const done=i<s.progress,next=i===s.progress&&s.status==='playing';
        return '<button type="button" class="yihai72-node'+(done?' done':'')+(next?' next':'')+'" data-step="'+st.key+'"'+(s.status!=='playing'?' disabled':'')+'>'
          +'<span class="yihai72-ic">'+({water:'🥣',blood:'🐔',oath:'宣誓',drink:'共饮'}[st.key])+'</span>'
          +'<span class="yihai72-t">'+(done?'✓ ':'')+(i+1)+'. '+st.name+'</span>'
          +'<span class="yihai72-e">'+st.en+'</span></button>';
      }).join('');
      const cur=STEPS[Math.min(s.progress,STEPS.length-1)];
      q('[data-note]').textContent=s.progress>=STEPS.length?'四步礼成。'+s.reason:cur.note;
      q('[data-nodes]').querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{
        if(s.status!=='playing')return;
        const r=pick.call(mod,s,b.dataset.step);
        status(r.ok?(s.progress>=STEPS.length?'':('第 '+s.progress+' 步完成 · 下一步：'+(STEPS[s.progress]?STEPS[s.progress].name:''))):r.msg);
        render();drawScene();
        if(s.status==='won'){q('[data-complete]').hidden=false;
          if(!current()){status(s.reason+'（当前会话与开始时不一致，仅作练习不记成绩。）');}}
      });
    };
    q('[data-start]').onclick=()=>{s.status='playing';q('[data-start]').hidden=true;render();status('礼序第一步：'+STEPS[0].name+'。');};
    q('[data-retry]').onclick=()=>{s=create('yihai');this.session=s;q('[data-complete]').hidden=true;render();drawScene();status('重行仪式。');};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;this.persist(s,node?node.id:null);close();if(typeof onComplete==='function')onComplete();};
    drawScene();render();
    q('[data-start]').focus();
    return true;
  }
  const mod={STEPS,HIST,definitions,supports(id){return id==='yihai';},create,pick,finish,rating,persist,style,open,
    muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
    paused(){return typeof document!=='undefined'&&(document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay'))}};
  return mod;
})();
