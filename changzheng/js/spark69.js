/* Spark legacy meta-layer: embers currency + gallery (verbatim from站内史实库) + run event-card injection.
   Gallery texts are read at runtime from NODE_HISTORY_DATA (game-history-data.js, 知识库审校文本). */
window.Spark69=(function(){
  const PREFIXES=['xjg67_','scout67_','sidu67_','drum67_','snow68_','lazikou68_','wuqi68_','fire68_','g30_','run69_','daily_'];
  /* 解锁型事件卡：文本逐字取自 js/education43.js 阅读卡（出处见注释），仅配选择效果，不改史实结局；schema 对齐 LongMarchRun69.registerEventCards({id,title,text,choices:[{label,effect}]}) */
  const EVENT_CARDS=[
    {id:'half-quilt',title:'半条被子',text:'1934年11月，红军经过湖南汝城沙洲村。三位女红军临别时，将仅有的被子分出一半留给徐解秀。',choices:[
      {label:'向老乡道谢并留下承诺',effect:{morale:4}},{label:'把仅有的干粮也留下',effect:{food:-3,morale:6}}]},
    {id:'golden-hook',title:'金色的鱼钩',text:'课文以老班长照顾伤病战友为线索，写出艰苦条件中的责任与关怀。',choices:[
      {label:'学老班长把稠的分给伤员',effect:{food:-2,morale:5}},{label:'记下这份责任，行军提速',effect:{morale:2}}]},
    {id:'monument',title:'丰碑 · 军需处长',text:'李本深笔下的军需处长把御寒条件留给战友，自己承受严寒。故事的力量在于担当。',choices:[
      {label:'检查全连御寒装备再出发',effect:{morale:3,food:-1}},{label:'把大衣让给哨兵',effect:{morale:5}}]}
  ];
  /* 图鉴 12 格：解锁挂对应小游戏达标；文本运行时取 NODE_HISTORY_DATA（审校史实），无则用站内措辞 */
  const GALLERY=[
    {node:1,unlock:{key:'daily_done',min:1}},{node:2,unlock:{key:'xjg67_2',min:70}},
    {node:3,unlock:{key:'sidu67_4',min:70}},{node:4,unlock:{key:'sidu67_4',min:85}},
    {node:5,unlock:{key:'scout67_5',min:70}},{node:6,unlock:{key:'scout67_5',min:85}},
    {node:7,unlock:{key:'fire68_9',min:70}},{node:8,unlock:{key:'snow68_8',min:70}},
    {node:9,unlock:{key:'fire68_9',min:85}},{node:10,unlock:{key:'lazikou68_10',min:70}},
    {node:11,unlock:{key:'wuqi68_11',min:70}},{node:12,unlock:{key:'drum67_12',min:70}}
  ];
  let inited=false,meta=null,panel=null,lastEmbers=-1;
  function store(){
    try{if(typeof GameState!=='undefined')return GameState;}catch{}
    if(window.GameState)return window.GameState;
    if(!globalThis.__sparkMem)globalThis.__sparkMem={sparkMeta:{embers:0,unlocks:[],modifiers:{}}};
    return globalThis.__sparkMem;
  }
  function meta0(){const g=store();if(!g.sparkMeta||typeof g.sparkMeta!=='object')g.sparkMeta={embers:0,unlocks:[],modifiers:{}};if(!Array.isArray(g.sparkMeta.unlocks))g.sparkMeta.unlocks=[];if(!g.sparkMeta.modifiers||typeof g.sparkMeta.modifiers!=='object')g.sparkMeta.modifiers={};return g.sparkMeta;}
  function tier(score){return score>=90?5:score>=80?3:score>=70?2:score>=1?1:0;}
  function sp(){try{const g=store();return g.storyPreparations&&typeof g.storyPreparations==='object'?g.storyPreparations:{};}catch{return{};}}
  function bs(){try{const g=store();return Array.isArray(g.battleScores)?g.battleScores:[];}catch{return[];}}
  /* 火种公式：事件卡/每日卡按档位（≥90→5,≥80→3,≥70→2,其余→1）+ battleScores 每条 1。幂等：纯读函数。 */
  function calculateEmbers(){
    const sp0=sp();let e=0;
    for(const[k,v]of Object.entries(sp0)){
      if(!PREFIXES.some(p=>k.startsWith(p)))continue;
      if(v&&Number.isFinite(v.score))e+=tier(v.score);
    }
    e+=new Set(bs().map(b=>Number(b.nodeId)).filter(Number.isFinite)).size;
    return e;
  }
  function isUnlocked(u){
    const sp0=sp();
    if(u.key==='daily_done'){return Object.keys(sp0).some(k=>k.startsWith('daily_'));}
    const v=sp0[u.key];
    return!!(v&&Number.isFinite(v.score)&&v.score>=u.min);
  }
  function unlockedCount(){return GALLERY.filter(g=>isUnlocked(g.unlock)).length;}
  function bestScore(key){const v=sp()[key];return v&&Number.isFinite(v.score)?v.score:null;}
  function galleryText(node){
    try{
      if(typeof NODE_HISTORY_DATA!=='undefined'&&NODE_HISTORY_DATA[node]&&NODE_HISTORY_DATA[node].historyText)
        return{ok:true,text:NODE_HISTORY_DATA[node].historyText,source:NODE_HISTORY_DATA[node].historySource||'站内史实库'};
    }catch{}
    return{ok:false,text:'该章节尚无通过本地审校的史料条目。',source:''};
  }
  function injectRunCards(){
    try{
      const m=meta0();
      if(m.unlocks.includes('cards')&&typeof LongMarchRun69!=='undefined'&&typeof LongMarchRun69.registerEventCards==='function')
        LongMarchRun69.registerEventCards(EVENT_CARDS.slice());
    }catch{}
  }
  function setHardcore(on){
    const m=meta0();m.modifiers.hardcore=!!on;
    try{if(typeof LongMarchRun69!=='undefined'&&typeof LongMarchRun69.setHardcore==='function')LongMarchRun69.setHardcore(!!on);}catch{}
    try{const g=store();if(typeof g.save==='function')g.save();}catch{}
  }
  function syncEmbers(){
    const m=meta0();const want=calculateEmbers();
    if(want>m.embers)m.embers=want; // 火种只增不减
    return m.embers;
  }
  function refreshUnlocks(){
    const m=meta0();
    GALLERY.forEach(g=>{if(isUnlocked(g.unlock)&&!m.unlocks.includes('gallery_'+g.node))m.unlocks.push('gallery_'+g.node);});
    if(unlockedCount()>=6&&!m.unlocks.includes('cards'))m.unlocks.push('cards');
    injectRunCards();
    try{const g=store();if(typeof g.save==='function')g.save();}catch{}
    return m;
  }
  function style(){
    if(document.getElementById('spark69-style'))return;
    const el=document.createElement('style');el.id='spark69-style';el.textContent=`
    .spark69-fab{position:fixed;left:16px;bottom:110px;z-index:1200;min-width:52px;min-height:44px;padding:8px 14px;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;font:14px/1.4 'Microsoft YaHei',sans-serif;cursor:pointer;letter-spacing:.04em;transition:background .12s ease,border-color .12s ease;box-shadow:0 2px 8px rgba(0,0,0,.35)}
    .spark69-fab:hover{background:#22262b;border-color:#6a6e74}
    .spark69-fab:focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .spark69-dialog{box-sizing:border-box;width:min(860px,96vw);max-height:96dvh;margin:auto;padding:0;background:#101315;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .spark69-dialog::backdrop{background:#05070ae6}
    .spark69-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #2a2d31;background:#131619}
    .spark69-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .spark69-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .spark69-embers{display:flex;align-items:baseline;gap:10px;padding:14px 18px;border-bottom:1px solid #2a2d31}
    .spark69-embers b{font-size:42px;font-weight:900;color:#ffcf24;font-variant-numeric:tabular-nums;line-height:1}
    .spark69-embers span{font-size:10px;letter-spacing:.2em;color:#8b8e93;text-transform:uppercase}
    .spark69-cols{display:flex;gap:12px;flex-wrap:wrap;padding:12px 18px}
    .spark69-col{flex:1 1 240px;border:1px solid #2a2d31;border-left:3px solid #ffcf24;background:#14171a;padding:10px 12px}
    .spark69-col h3{margin:0 0 6px;font-size:13px;color:#f2f0e9;letter-spacing:.06em}
    .spark69-col small{display:block;font-size:10px;letter-spacing:.16em;color:#8b8e93;margin-bottom:8px;text-transform:uppercase}
    .spark69-item{border:1px solid #2a2d31;background:#191c20;border-radius:2px;padding:8px 10px;margin:6px 0;font-size:13px;color:#cfd2cf}
    .spark69-items{display:grid;grid-template-columns:1fr 1fr;gap:2px 8px}
    .spark69-items .spark69-item{margin:2px 0;font-size:12px;padding:6px 8px}
    .spark69-pop{animation:spark69-pop .6s cubic-bezier(.2,1.6,.4,1)}
    @keyframes spark69-pop{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}
    @media(prefers-reduced-motion:reduce){.spark69-pop{animation:none}}
    .spark69-item.locked{opacity:.45}
    .spark69-item b{color:#f2f0e9}
    .spark69-item .spark69-src{display:block;font-size:11px;color:#8f948d;margin-top:4px}
    .spark69-card{cursor:pointer}
    .spark69-card:hover{border-color:#6a6e74}
    .spark69-card.on{border-color:#ffcf24}
    .spark69-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:#cfd2cf}
    .spark69-note{font-size:11px;color:#8f948d;padding:8px 18px 14px;border-top:1px solid #2a2d31}
    .spark69-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:7px 12px;min-height:38px;cursor:pointer}
    .spark69-dialog button:hover{background:#22262b;border-color:#6a6e74}
    .spark69-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .spark69-float{position:fixed;left:64px;bottom:116px;z-index:1300;color:#ffcf24;font-weight:900;pointer-events:none;animation:spark69-rise 1.4s ease forwards}
    @keyframes spark69-rise{to{transform:translateY(-26px);opacity:0}}
    @media(prefers-reduced-motion:reduce){.spark69-float{animation:none}}
    .spark69-dialog [hidden]{display:none!important}
    @media(max-width:600px){.spark69-dialog{font-size:13px}}`;
    document.head.append(el);
  }
  function openPanel(){
    style();syncEmbers();const m=refreshUnlocks();
    if(panel){const old=panel;panel=null;old.close?.();old.remove();}
    panel=document.createElement('dialog');panel.className='spark69-dialog';panel.setAttribute('aria-labelledby','spark69-t');
    const gal=GALLERY.map(g=>{
      const on=m.unlocks.includes('gallery_'+g.node)||isUnlocked(g.unlock),t=galleryText(g.node);
      const tip=on?(t.text.length>86?t.text.slice(0,86)+'…':t.text):(g.unlock.key==='daily_done'?'完成 1 次每日挑战解锁':'对应推演达到 '+g.unlock.min+' 分解锁');
      return '<div class="spark69-item'+(on?'':' locked')+'" title="'+tip.replace(/"/g,'&quot;')+'"><b>'+'第'+g.node+'站 · '+(on?(t.ok?'已解锁':'待接入'):'尚未解锁')+'</b>'
        +(on?'<span class="spark69-src">'+tip+(t.source?' · 来源：'+t.source:'')+'</span>':'<span class="spark69-src">'+tip+'</span>')+'</div>';
    }).join('');
    panel.innerHTML='<header><div><h2 id="spark69-t">星火传承</h2><p class="spark69-sub">Spark Legacy · Meta Progress</p></div><button data-close>关闭 · Esc</button></header>'
      +'<div class="spark69-embers"><b data-embers class="'+(m.embers>lastEmbers?'spark69-pop':'')+'">'+m.embers+'</b><span>火种 EMBERS<br>只增不减 · 永久生效</span></div>'
      +'<div class="spark69-cols">'
      +'<div class="spark69-col"><h3>事件卡注入</h3><small>Event Cards → Long March Run</small>'
      +(m.unlocks.includes('cards')?EVENT_CARDS.map(c=>'<div class="spark69-item spark69-card on"><b>'+c.title+'</b> · '+c.choices.length+' 选项<span class="spark69-src">文本出自站内阅读卡（education43）</span></div>').join(''):'<div class="spark69-item locked">图鉴解锁 6 格后，注入 3 张新事件卡到「长征 Run」。</div>')+'</div>'
      +'<div class="spark69-col"><h3>史实图鉴</h3><small>Gallery · '+unlockedCount()+'/12 · 文本出自站内审校史实库</small><div class="spark69-items">'+gal+'</div></div>'
      +'<div class="spark69-col"><h3>二周目特权</h3><small>Modifiers</small>'
      +'<div class="spark69-item"><label class="spark69-toggle"><input type="checkbox" data-hardcore '+(m.modifiers.hardcore?'checked':'')+(typeof LongMarchRun69==='undefined'?' disabled':'')+'> 史实模式 · Run 局内不可重试</label><span class="spark69-src">只改规则，不改史实表述。</span></div>'
      +'</div></div>'
      +'<p class="spark69-note">火种由全部推演成绩自动换算（公式见 js/spark69.js 头注）；图鉴文本逐字引用站内审校史实库（NODE_HISTORY_DATA）。</p>';
    const openedPanel=panel,ownerAtOpen=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null;document.body.append(panel);panel.showModal();
    panel.querySelector('[data-close]').onclick=()=>panel.close();
    panel.addEventListener('cancel',e=>{e.preventDefault();panel.close();});
    panel.addEventListener('close',()=>{lastEmbers=meta0().embers;openedPanel.remove();if(panel===openedPanel)panel=null;});
    panel.querySelector('[data-hardcore]').onchange=e=>{if(ownerAtOpen!==(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)){openedPanel.close();return;}setHardcore(e.target.checked);};
  }
  function floatEmbers(){
    try{const f=document.createElement('div');f.className='spark69-float';f.textContent='+'+meta0().embers+' 火种';document.body.append(f);setTimeout(()=>f.remove(),1500);}catch{}
  }
  function init(){
    if(inited)return;inited=true;style();
    const fab=document.createElement('button');
    fab.type='button';fab.className='spark69-fab';fab.textContent='星火 ✦';
    fab.setAttribute('aria-label','打开星火传承面板（火种、史实图鉴与二周目特权）');
    fab.onclick=()=>{const before=meta0().embers;openPanel();const after=meta0().embers;if(after>before)floatEmbers();};
    document.body.append(fab);
    syncEmbers();refreshUnlocks();
  }
  return{PREFIXES,EVENT_CARDS,GALLERY,calculateEmbers,isUnlocked,unlockedCount,injectRunCards,setHardcore,syncEmbers,refreshUnlocks,galleryText,tierOf:tier,meta0,openPanel,init};
})();
if(typeof document!=='undefined'){
  const autoInit=()=>{try{window.Spark69.init();}catch{}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoInit);
  else autoInit();
}
