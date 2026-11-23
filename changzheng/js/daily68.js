/* Daily ops card: zero-intrusion, self-injects above #panelChallenges. 不推进章节进度。 */
window.Daily68={
  /* 轮换表：周一~周六（0=周日走周六），全部 typeof 容错，引擎缺席则跳格 */
  POOL:[
    {key:'wildveg72_9',node:9,engine:'Wildveg72',icon:'🌿',name:'野菜资料辨识',kind:'native'},
    {key:'xjg67_2',node:2,engine:'XiangjiangGuard67',icon:'🛡️',name:'渡口阻击',kind:'native'},
    {key:'sidu67_4',node:4,engine:'SiduBluff67',icon:'🌫️',name:'迷雾渡河',kind:'native'},
    {key:'scout67_5',node:5,engine:'Scout67',icon:'👁️',name:'夜探渡口',kind:'native'},
    {key:'fire68_9',node:9,engine:'Campfire68',icon:'🔥',name:'夜营守火种',kind:'native'},
    {key:'drum67_12',node:12,engine:'HuishiDrum67',icon:'🥁',name:'会师腰鼓',kind:'native'}
  ],
  dayKey(d=new Date()){const p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());},
  pick(day=new Date()){let idx=day.getDay();if(idx===0)idx=6;idx=(idx-1)%this.POOL.length;
    /* 未解锁顺延：RouteMap 锁或引擎缺席 → 下一个（最多绕一圈） */
    for(let k=0;k<this.POOL.length;k++){const c=this.POOL[(idx+k)%this.POOL.length];
      const eng=typeof globalThis[c.engine]!=='undefined';
      const unlocked=!eng||c.kind!=='native'||(typeof RouteMap==='undefined'||!RouteMap.isNodeLocked(c.node));
      if(eng&&unlocked)return {item:c,deferred:k>0};}
    return {item:null,deferred:false};},
  streak(){
    try{
      const sp=(typeof GameState!=='undefined'&&GameState.storyPreparations)||{};
      let n=0;const today=new Date();
      for(let back=0;;back++){const d=new Date(today);d.setDate(d.getDate()-back);
        const rec=sp['daily_'+this.dayKey(d)];
        if(rec){n++;continue;}
        if(back===0)continue;           /* 今天还没打：不算断 */
        break;
      }
      const dots=[];for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);dots.push(!!sp['daily_'+this.dayKey(d)]);}
      return {n,dots};
    }catch{return {n:0,dots:[false,false,false,false,false,false,false]};}
  },
  markDone(nodeId,score,rating){
    try{
      if(typeof GameState==='undefined'||!GameState)return;
      GameState.storyPreparations||={};
      const key='daily_'+this.dayKey(),old=GameState.storyPreparations[key],value=Math.max(0,Math.min(100,Number(score)||70));if(!old||value>old.score)GameState.storyPreparations[key]={nodeId,score:value,rating:rating||'今日完成',completedAt:new Date().toISOString()};
      GameState.save();
    }catch{/* 存档失败不阻塞 */}
    this.render();
  },
  openGame(item){
    const Eng=globalThis[item.engine];if(!Eng||typeof Eng.open!=='function')return false;const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active;let finished=false;
    const done=(r)=>{if(finished||r?.won===false||r?.win===false||owner!==(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)||demo!==!!window.MainlineDemo?.active)return;finished=true;
      /* 从引擎 result 提取成绩：native 引擎读 storyPreparations 最新值 */
      let score=70,rating='今日完成';
      try{const sp=GameState.storyPreparations&&GameState.storyPreparations[item.key];if(sp){score=sp.score;rating=sp.rating;}}catch{}
      this.markDone(item.node,score,rating);};
    if(item.kind==='native')return Eng.open({id:item.node},done);/* 用自己的回调替代 completeDungeon——不推章节 */
    return true;
  },
  style(){if(document.getElementById('daily68-style'))return;const el=document.createElement('style');el.id='daily68-style';el.textContent=`
    .daily68-card{grid-column:1/-1;display:flex;align-items:center;gap:14px;background:#fbf4e4;border:1px solid #97372a;border-left:4px solid #97372a;padding:12px 16px;cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;position:relative}
    .daily68-card:hover,.daily68-card:focus-visible{transform:translateY(-2px);box-shadow:0 6px 16px rgba(83,62,38,.2)}
    .daily68-ico{font-size:30px;line-height:1}
    .daily68-body{flex:1;min-width:0}
    .daily68-t1{font:600 16px/1.5 SimSun,serif;color:#352e23}
    .daily68-t1 .daily68-tag{font:11px/1 sans-serif;color:#fff;background:#97372a;padding:3px 7px;margin-right:8px;letter-spacing:2px;vertical-align:2px}
    .daily68-t2{font:12px/1.7 sans-serif;color:#675d4d}
    .daily68-dots{display:flex;gap:4px;margin-top:4px}
    .daily68-dot{width:9px;height:9px;border-radius:50%;background:#d8ccb0}
    .daily68-dot.on{background:#c8892c}
    .daily68-n{font:900 22px/1 SimSun,serif;color:#97372a;text-align:center;min-width:64px}
    .daily68-n small{display:block;font:11px/1.6 sans-serif;color:#8a7a5a;letter-spacing:1px}
    .daily68-done{position:absolute;right:14px;top:10px;font:11px/1 sans-serif;color:#3c6b45;letter-spacing:2px}
    .daily68-arrow{color:#97372a;font:13px/1 sans-serif}
    @media(max-width:560px){.daily68-card{flex-wrap:wrap;gap:8px}.daily68-n{min-width:auto}}`;
    document.head.append(el);
  },
  render(){
    if(typeof document==='undefined'||typeof document.getElementById!=='function')return;
    const host=document.getElementById('panelChallenges');if(!host)return;
    let card=host.querySelector('.daily68-card');
    const picked=this.pick();if(!picked.item){if(card)card.remove();return;}
    const {item}=picked;
    const done=(()=>{try{return !!GameState.storyPreparations['daily_'+this.dayKey()];}catch{return false;}})();
    const best=(()=>{try{const b=GameState.storyPreparations[item.key];return b&&Number.isFinite(b.score)?b.score+' 分 · '+b.rating:'';}catch{return '';}})();
    const {n,dots}=this.streak();
    const wk=['日','一','二','三','四','五','六'][new Date().getDay()];
    if(!card){card=document.createElement('div');card.className='daily68-card challenge-item';card.tabIndex=0;card.setAttribute('role','button');host.prepend(card);}
    const markup='<span class="daily68-ico">'+item.icon+'</span><div class="daily68-body"><div class="daily68-t1"><span class="daily68-tag">今日行程 DAILY OPS</span>'+item.name+' · 星期'+wk+(picked.deferred?'（顺延）':'')+'</div><div class="daily68-t2">'+(done?'今日已完成 ✓ ':'今日推荐：')+item.name+(best?' · 历史最佳 '+best:' · 尚无成绩')+'</div><div class="daily68-dots" aria-label="最近七天">'+dots.map(d=>'<span class="daily68-dot'+(d?' on':'')+'"></span>').join('')+'</div></div><div class="daily68-n">'+(n||0)+'<small>连续天数 STREAK</small></div>'+(done?'<span class="daily68-done">已完成 ✓</span>':'<span class="daily68-arrow">点击开始 ▸</span>');
    if(card._daily68Markup!==markup){card.innerHTML=markup;card._daily68Markup=markup;}
    const run=()=>this.openGame(item);
    card.onclick=run;card.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();run();}};
  },
  install(){
    if(typeof document==='undefined'||typeof document.getElementById!=='function')return;
    this.style();
    const boot=()=>{const host=document.getElementById('panelChallenges');if(!host)return;this.render();};
    boot();
    if(this._mo)this._mo.disconnect();
    /* 防抖 + 弹窗过滤：子游戏运行时的高频 DOM 变更不触发整卡重建 */
    let pend=0;
    this._mo=new MutationObserver(()=>{
      if(!document.getElementById('panelChallenges'))return;
      if(document.querySelector('dialog[open]'))return;
      if(pend)return;pend=1;
      setTimeout(()=>{pend=0;if(document.getElementById('panelChallenges')&&!document.querySelector('dialog[open]'))this.render();},250);
    });
    this._mo.observe(document.body,{childList:true,subtree:true});
  }
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.Daily68.install());
else window.Daily68.install();
