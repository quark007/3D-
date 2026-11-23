/* Edge-AI war correspondent: data-driven post-chapter debrief with offline fallback.
   Fictional character; AI output is advisory. Pure helpers are exposed for node tests. */
window.Correspondent69=(function(){
  const NODE_NAMES={2:'渡口阻击',4:'迷雾渡河',5:'夜探渡口',8:'雪山速降',9:'青稞采集',10:'腊子口·火力准备',11:'切尾巴之战',12:'会师腰鼓'};
  const CHIPS=['湘江为什么这么惨烈？','草地上最难的是什么？','到达陕北意味着什么？'];
  const FALLBACK_LINES=[
    '（合上采访本）这一路走来，数字会说话，人心更会。你打的每一分我都记在本子上。',
    '我在旁边看着呢：你们每一步都走得不虚。接下来的路，还是一步一个脚印。',
    '行军最怕的不是强敌，是松劲。你这份成绩单，放在哪个连队都拿得出手。',
    '别人问我红军凭什么走下来——我让他们来看你的推演记录。',
    '（压低声音）说真的，这一段的订阅率最高。战士们都想知道你怎么打的。',
    '铁脚板是走出来的，好成绩是磨出来的。下一站我还跟着你。',
    '我把你的路线画在地图上了：每一次选择，都是活生生的取舍。',
    '稿子标题我都想好了——《星火是这样燎原的》。就差你下一仗了。',
    '队伍在看你。你稳，队伍就稳。',
    '别小看这些推演：当年没有地图没有情报，全靠一双脚板一张嘴。',
    '（撕下一页纸）这几行记录送你：有始有终，方为行军。',
    '历史书上的一行字，是无数个这样的夜晚走出来的。你走得很认真。',
    '我把伤员的名字记下了，把掉的队也记下了——记下来，就不会忘。',
    '士气这个东西看不见摸不着，可你刚才那一仗，全连都看见了。',
    '粮食、弹药、脚板，三样都得省着用。你管得不错。',
    '下一站的敌情我不清楚，但我清楚你——你不会乱来。',
    '记者的笔要慢一点才准。你打你的，我写我的，咱们比比谁先到陕北。',
    '（朝北边努努嘴）听说前面就是咱们要到的地界了。走，一起。',
    '这一页我留了个空白，给你下一段旅程留标题。',
    '记住喽：历史不看烟花，看脚印。你的脚印很正。'
  ];
  const BLACKLIST=[/歼[灭击]\s*\d+/,/毙[伤俘]\s*\d+/,/全歼\s*\d+/,/击毙\s*\d+/,/尸体/,/残肢/,/血肉模糊/,/横尸/];
  let seen=null,history=[],busy=false,dialog=null,badge=null,inited=false,timer=0,typing=0;
  const ls={get(k,d){try{const v=localStorage.getItem(k+':'+owner());return v===null||v===undefined?d:JSON.parse(v);}catch{return d;}},set(k,v){try{localStorage.setItem(k+':'+owner(),JSON.stringify(v));}catch{}}};
  function tierOf(score){return score>=90?5:score>=80?3:score>=70?2:score>=1?1:0;}
  let profile=null,requestEpoch=0;
  function owner(){return String(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:'default')+':'+!!window.MainlineDemo?.active;}
  function ensureOwner(){const now=owner();if(profile!==now){profile=now;seen=null;history=[];busy=false;requestEpoch++;if(dialog)dialog.close();}return now;}
  function loadSeen(){ensureOwner();if(seen)return seen;seen=new Set(ls.get('corr69_seen',[]));return seen;}
  function currentScores(){try{if(typeof GameState!=='undefined'&&Array.isArray(GameState.battleScores))return GameState.battleScores;}catch{}return[];}
  function diffScores(list){
    list=list||currentScores();const s=loadSeen(),fresh=[];
    for(const it of list){const id=Number(it&&it.nodeId);if(Number.isFinite(id)&&!s.has(id)){s.add(id);fresh.push({nodeId:id,name:NODE_NAMES[id]||('节点'+id),score:Math.round(it.score||0),rating:it.rating||''});}}
    if(fresh.length)ls.set('corr69_seen',[...s]);
    return fresh;
  }
  function remarkByScore(score){return score>=95?'这个成绩我能写进头版。':score>=85?'稳，值得专门写一笔。':'完成就是胜利，我如实记下。';}
  function resourceRemark(r){
    if(!r||typeof r!=='object')return'队伍情况我先记个概要。';
    const bad=[];
    if((r.troops|0)<60)bad.push('减员不小');
    if((r.food|0)<20)bad.push('粮食快见底');
    if((r.morale|0)<50)bad.push('士气得想法子提一提');
    return bad.length?('我也看到难处了：'+bad.join('、')+'。当年最难的时候，靠的就是互相拉一把。'):'队伍状态还行，弹药粮食都还压得住阵脚。';
  }
  function buildOpening(ctx){
    ctx=ctx||{};const fresh=ctx.fresh||[],r=ctx.resources||null,parts=['（记者翻开采访本）同志，可算逮着你了。'];
    if(fresh.length)fresh.forEach(f=>parts.push(`${f.name}打出 ${f.score} 分——「${f.rating}」。${remarkByScore(f.score)}`));
    else parts.push('你的推演记录我都翻过了，一笔一笔记着呢。');
    parts.push(resourceRemark(r));
    parts.push('先说明：我是随军记者，虚构人物，专门把你们这一路写下来。想问什么随便问，我来答；答不准的，送你去站内史实库。');
    return parts.join('\n');
  }
  function hash(str){let h=0;for(let i=0;i<str.length;i++)h=(h*31+str.charCodeAt(i))>>>0;return h;}
  function ctxKey(ctx){try{return JSON.stringify({f:(ctx.fresh||[]).map(f=>f.nodeId+'_'+f.score),r:ctx.resources?[(ctx.resources.troops|0)>60,(ctx.resources.food|0)<20,(ctx.resources.morale|0)<50]:null});}catch{return'x';}}
  function pickFallback(ctx){return FALLBACK_LINES[hash(ctxKey(ctx))%FALLBACK_LINES.length];}
  function applySafety(text,ctx){const t=String(text||'');return BLACKLIST.some(re=>re.test(t))?pickFallback(ctx):t;}
  function callAI(message,hist,ctx){
    return new Promise(res=>{
      let done=false;
      const finish=r=>{if(done)return;done=true;clearTimeout(to);res(r);};
      const to=setTimeout(()=>finish({ok:false,reason:'timeout',text:pickFallback(ctx)}),(typeof window!=='undefined'&&window.CORR69_TIMEOUT)||8000);
      try{
        if(!window.EdgeAI||typeof window.EdgeAI.chat!=='function'){finish({ok:false,reason:'absent',text:pickFallback(ctx)});return;}
        Promise.resolve(window.EdgeAI.chat({npcId:'correspondent',sceneId:'fupan',message,history:hist})).then(r=>{
          if(r&&r.ok&&(r.text||r.fallback)){const raw=String(r.text||r.fallback),text=applySafety(raw,ctx);finish(text!==raw?{ok:false,ai:false,reason:'content',text}:{ok:true,ai:!!r.text,text});}
          else finish({ok:false,reason:r&&r.reason||'no',text:pickFallback(ctx)});
        }).catch(()=>finish({ok:false,reason:'err',text:pickFallback(ctx)}));
      }catch(e){finish({ok:false,reason:'err',text:pickFallback(ctx)});}
    });
  }
  function reducedMotion(){try{return!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}catch{return false;}}
  function style(){
    if(document.getElementById('corr69-style'))return;
    const el=document.createElement('style');el.id='corr69-style';el.textContent=`
    .corr69-fab{position:fixed;right:16px;bottom:110px;z-index:1200;min-width:52px;min-height:44px;padding:8px 14px;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;font:14px/1.4 'Microsoft YaHei',sans-serif;cursor:pointer;letter-spacing:.04em;transition:background .12s ease,border-color .12s ease;box-shadow:0 2px 8px rgba(0,0,0,.35)}
    .corr69-fab:hover{background:#22262b;border-color:#6a6e74}
    .corr69-fab:focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .corr69-fab::after{content:'';position:absolute;top:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:#ffcf24;opacity:0;transform:scale(.4);transition:opacity .12s ease,transform .12s ease}
    .corr69-fab.corr69-on::after{opacity:1;transform:scale(1)}
    .corr69-dialog{box-sizing:border-box;width:min(560px,94vw);max-height:92dvh;margin:auto;padding:0;background:#101315;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:hidden;font:14px/1.55 'Microsoft YaHei',sans-serif;display:flex;flex-direction:column}
    .corr69-dialog::backdrop{background:#05070ae6}
    .corr69-dialog header{display:flex;align-items:flex-start;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #2a2d31;background:#131619}
    .corr69-dialog h2{margin:0;font-size:18px;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .corr69-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .corr69-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:7px 12px;min-height:38px;cursor:pointer}
    .corr69-dialog button:hover{background:#22262b;border-color:#6a6e74}
    .corr69-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .corr69-log{flex:1;min-height:260px;max-height:46dvh;overflow:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}
    .corr69-msg{max-width:88%;padding:8px 11px;border:1px solid #3a3d42;background:#14171a;border-radius:2px;white-space:pre-wrap;word-break:break-word}
    .corr69-msg.rep{align-self:flex-start;border-left:3px solid #ffcf24}
    .corr69-msg.me{align-self:flex-end;background:#1c2024;color:#cfd2cf}
    .corr69-msg.corr69-note-line{background:none;border:none;color:#8f948d;font-size:12px;align-self:center;padding:2px}
    .corr69-chips{display:flex;gap:8px;flex-wrap:wrap;padding:0 16px 10px}
    .corr69-chips button{min-height:34px;padding:5px 10px;font-size:13px}
    .corr69-form{display:flex;gap:8px;padding:0 16px 14px}
    .corr69-form input{flex:1;font:inherit;background:#14171a;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 10px}
    .corr69-form input:focus-visible{outline:3px solid #ffcf24;outline-offset:1px}
    .corr69-foot{padding:6px 16px 10px;font-size:11px;color:#8f948d;border-top:1px solid #2a2d31}
    .corr69-dialog [hidden]{display:none!important}
    @keyframes corr69-blink{50%{opacity:.2}}
    .corr69-typing::after{content:'…';animation:corr69-blink 1s steps(1) infinite}
    @media(prefers-reduced-motion:reduce){.corr69-typing::after{animation:none}}`;
    document.head.append(el);
  }
  function pushMessage(role,text,instant){
    if(!dialog)return null;
    const log=dialog.querySelector('.corr69-log');
    const div=document.createElement('div');
    div.className='corr69-msg '+(role==='note'?'corr69-note-line':role);
    log.append(div);
    while(log.children.length>40)log.firstElementChild.remove(); // 长对话防溢出
    log.scrollTop=log.scrollHeight;
    if(role==='note'||instant||reducedMotion()){div.textContent=text;return div;}
    div.classList.add('corr69-typing');
    let i=0;clearInterval(typing);
    typing=setInterval(()=>{i+=2;div.textContent=text.slice(0,i);
      if(i>=text.length){clearInterval(typing);div.textContent=text;div.classList.remove('corr69-typing');}
      log.scrollTop=log.scrollHeight;},16);
    return div;
  }
  function pushHistory(role,text){history.push({role,content:text});if(history.length>16)history=history.slice(-16);ls.set('corr69_hist',history);}
  function buildContext(fresh){
    let r=null;try{if(typeof GameState!=='undefined'&&GameState.resources)r={troops:GameState.resources.troops,food:GameState.resources.food,morale:GameState.resources.morale};}catch{}
    return{fresh:fresh||[],resources:r};
  }
  function openPanel(fresh){
    ensureOwner();if(dialog){try{dialog.querySelector('.corr69-form input')?.focus();}catch{} return;} // 已开面板：聚焦即可，重复 showModal 会抛 InvalidStateError
    style();
    dialog=document.createElement('dialog');dialog.className='corr69-dialog';dialog.setAttribute('aria-labelledby','corr69-t');
    dialog.innerHTML='<header><div><h2 id="corr69-t">随军记者</h2><p class="corr69-sub">War Correspondent · Debrief</p></div><button data-close>关闭 · Esc</button></header>'
      +'<div class="corr69-log" role="log" aria-live="polite"></div>'
      +'<div class="corr69-chips">'+CHIPS.map(c=>'<button type="button" data-chip>'+c+'</button>').join('')+'</div>'
      +'<form class="corr69-form"><input type="text" maxlength="120" placeholder="向记者提问…" aria-label="向记者提问"><button type="submit">发送</button></form>'
      +'<p class="corr69-foot">AI 生成 · 供学习参考 · 记者为虚构人物，史实表述以站内史实库为准</p>';
    document.body.append(dialog);dialog.showModal();
    dialog.querySelector('[data-close]').onclick=()=>dialog.close();
    dialog.addEventListener('cancel',e=>{e.preventDefault();dialog.close();});
    dialog.addEventListener('close',()=>{clearInterval(typing);requestEpoch++;busy=false;const old=dialog;dialog=null;old?.remove();});
    dialog.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>ask(b.textContent));
    dialog.querySelector('.corr69-form').onsubmit=e=>{e.preventDefault();const inp=dialog.querySelector('input');const v=inp.value.trim();if(v)ask(v);inp.value='';};
    const ctx=buildContext(fresh||[]);
    pushHistory('assistant',buildOpening(ctx));
    pushMessage('rep',buildOpening(ctx));
    if(fresh&&fresh.length&&fresh[0].name&&badge)badge.classList.remove('corr69-on');
    try{dialog.querySelector('.corr69-form input').focus();}catch{}
  }
  function ask(text){
    if(!dialog||busy)return;
    busy=true;const target=dialog,epoch=++requestEpoch,profileAtStart=owner();
    pushHistory('user',text);pushMessage('me',text,true);
    const typingDiv=pushMessage('rep','（记者在整理笔记……）');
    const ctx=buildContext([]);
    callAI(text,history.slice(-8),ctx).then(r=>{
      if(epoch!==requestEpoch||target!==dialog||profileAtStart!==owner())return;busy=false;
      if(dialog){
        const log=dialog.querySelector('.corr69-log');
        if(typingDiv&&typingDiv.parentNode===log)log.removeChild(typingDiv);
        pushHistory('assistant',r.text);pushMessage('note',r.ai?'本机模型生成 · 供学习参考':'本地预设回复 · 模型未就绪或不可用',true);pushMessage('rep',r.text);
      }
    });
  }
  function init(){
    if(inited)return;inited=true;ensureOwner();
    style();
    badge=document.createElement('button');
    badge.type='button';badge.className='corr69-fab';badge.textContent='记者 ✍';
    badge.setAttribute('aria-label','打开随军记者复盘（虚构人物，AI 生成内容供学习参考）');
    badge.onclick=()=>openPanel(loadSeen().size?[]:diffScores());
    document.body.append(badge);
    timer=setInterval(()=>{try{
      if(document.hidden)return;
      const fresh=diffScores();
      if(fresh.length){badge.classList.add('corr69-on');badge.title='记者带来了 '+fresh.length+' 条新见闻';}
    }catch{}},5000);
  }
  function _reset(){requestEpoch++;profile=owner();seen=null;history=[];busy=false;ls.set('corr69_seen',[]);ls.set('corr69_hist',[]);}
  return{NODE_NAMES,FALLBACK_LINES,CHIPS,diffScores,buildOpening,pickFallback,applySafety,callAI,openPanel,ask,init,tierOf,resourceRemark,_reset,
    _test:{get seen(){return seen?[...seen]:[];},get history(){return history;},get busy(){return busy;}}};
})();
if(typeof document!=='undefined'){
  const autoInit=()=>{try{window.Correspondent69.init();}catch{}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoInit);
  else autoInit();
}
