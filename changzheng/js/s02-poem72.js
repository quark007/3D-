/* Loushan Pass poem-scroll restoration: drag hanzi tiles to rebuild verses.
   Verse texts are curriculum standard; one character must never change. */
window.PoemScroll72=(function(){
  /* 三句均为义务教育语文课标收录篇目原句，一字不改 */
  const VERSES=[
    {poem:'忆秦娥·娄山关',line:'雄关漫道真如铁',line2:'而今迈步从头越',src:'1935年2月，红军二渡赤水攻克娄山关后作。'},
    {poem:'七律·长征',line:'红军不怕远征难',line2:'万水千山只等闲',src:'1935年10月，长征即将胜利结束时作。'},
    {poem:'清平乐·六盘山',line:'不到长城非好汉',line2:'屈指行程二万',src:'1935年10月，翻越六盘山时作。'}
  ];
  const QUOTE='1935年2月，红军二渡赤水，攻克娄山关，毛泽东写下《忆秦娥·娄山关》；长征途中又写下《七律·长征》《清平乐·六盘山》，三首均为中小学语文课标收录篇目。';
  function shuffle(arr,rng){const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor((rng?rng():Math.random())*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function create(id){
    return {id:Number(id),round:0,mistakes:0,done:[false,false,false],advancing:false,
      slots:[],tiles:[],status:'ready',reason:'',events:[]};
  }
  /* 生成一轮的槽位与字块（两行合并为连续槽位，字块乱序） */
  function buildRound(s,rng){
    const v=VERSES[s.round];
    const chars=(v.line+v.line2).split('');
    const need=[];const pool={};
    chars.forEach(c=>{pool[c]=(pool[c]||0)+1;});
    s.slots=chars.map(c=>({want:c,fill:null}));
    let tiles=[];
    Object.entries(pool).forEach(([c,n])=>{for(let i=0;i<n;i++)tiles.push({ch:c,used:false});});
    s.tiles=shuffle(tiles,rng);
    return s;
  }
  /* 尝试把字块放到槽位：正确则落位；错误则计错并退回（无失败惩罚） */
  function place(s,tileIdx,slotIdx){
    const t=s.tiles[tileIdx],sl=s.slots[slotIdx];
    if(!t||t.used||!sl||sl.fill)return false;
    if(sl.want===t.ch){t.used=true;sl.fill=t.ch;s.events.push('ok');return true;}
    s.mistakes++;s.events.push('no');return false;
  }
  function roundDone(s){return s.slots.length>0&&s.slots.every(x=>x.fill===x.want);}
  function nextRound(s){
    if(!roundDone(s))return false;
    s.done[s.round]=true;s.round++;
    if(s.round>=VERSES.length){this.finish(s,true,'三句诗词全部复原——长卷尽展，豪情自见。');return true;}
    this.buildRound(s);return true;
  }
  function finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');}
  function rating(s){
    if(s.status!=='won')return{score:70,rating:'临帖功成'};
    return s.mistakes===0?{score:95,rating:'挥毫而就'}:s.mistakes<=4?{score:85,rating:'笔走龙蛇'}:{score:75,rating:'临帖功成'};
  }
  function persist(s,nodeId){
    const result=rating(s);
    try{
      if(typeof GameState!=='undefined'){
        GameState.storyPreparations=GameState.storyPreparations||{};
        const key='poem72_3',old=GameState.storyPreparations[key];
        if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,mistakes:s.mistakes,completedAt:new Date().toISOString()};
        if(typeof GameState.recordBattleScore==='function')GameState.recordBattleScore(nodeId||3,result.score,result.rating);
        if(typeof GameState.save==='function')GameState.save();
      }
    }catch{}
    return result;
  }
  const definitions={3:{title:'娄山关诗卷 · 诗词复原',
    intro:'把打散的字块拖回卷轴，复原毛泽东长征诗词名句。三句拼对，长卷尽展。',
    success:'雄关漫道真如铁，而今迈步从头越。',
    hist:QUOTE}};
  function style(){
    if(document.getElementById('poem72-style'))return;
    const el=document.createElement('style');el.id='poem72-style';el.textContent=`
    .poem72-dialog{box-sizing:border-box;width:min(880px,96vw);max-height:96dvh;margin:auto;padding:0;background:#101315;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .poem72-dialog::backdrop{background:#05070ae6}
    .poem72-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #2a2d31;background:#131619}
    .poem72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .poem72-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .poem72-body{padding:12px 18px}
    .poem72-canvas{display:block;width:min(100%,640px);height:auto;margin:0 auto;border:1px solid #3a3d42;border-radius:2px}
    .poem72-round{border:1px solid #2a2d31;border-left:3px solid #ffcf24;background:#14171a;padding:10px 12px;margin:10px 0}
    .poem72-label{font-size:10px;letter-spacing:.2em;color:#8b8e93;text-transform:uppercase;margin:2px 0 8px}
    .poem72-board{display:grid;grid-template-columns:repeat(9,1fr);gap:6px;max-width:640px}
    .poem72-slot{aspect-ratio:1;border:1px dashed #4a4d52;background:#191c20;border-radius:2px;display:flex;align-items:center;justify-content:center;font:600 22px/1 'KaiTi','STKaiti',serif;color:#ffcf24;cursor:pointer;min-height:44px}
    .poem72-slot.filled{border-style:solid;border-color:#6a6e74;cursor:default;color:#efe6cf;background:#1d2024}
    .poem72-tiles{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;max-width:640px}
    .poem72-tile{width:48px;height:48px;border:1px solid #4a4d52;background:#efe6cf;color:#352e23;border-radius:2px;font:600 24px/1 'KaiTi','STKaiti',serif;display:flex;align-items:center;justify-content:center;cursor:grab;box-shadow:0 2px 5px rgba(0,0,0,.35)}
    .poem72-tile.used{opacity:.15;cursor:default;box-shadow:none}
    .poem72-tile:hover:not(.used){border-color:#97372a;transform:translateY(-3px);box-shadow:0 4px 10px rgba(83,62,38,.3)}
    .poem72-tile{transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease}
    .poem72-slot{transition:border-color .12s ease,background .12s ease}
    .poem72-slot:not(.filled):hover{border-color:#ffcf24;background:#20242a}
    .poem72-note{font-size:12px;color:#8f948d}
    .poem72-booktip{color:#9fd08a}
    .poem72-actions{display:flex;gap:8px;flex-wrap:wrap;padding:0 18px 14px}
    .poem72-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer}
    .poem72-dialog button:hover{background:#22262b}
    .poem72-dialog button.primary{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .poem72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .poem72-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:9px;margin:0 18px}
    .poem72-dialog [hidden]{display:none!important}
    @media(max-width:600px){.poem72-board{grid-template-columns:repeat(9,1fr);gap:3px}.poem72-slot{min-height:34px;font-size:17px}.poem72-tile{width:38px;height:38px;font-size:19px}}`;
    document.head.append(el);
  }
  function speak(text){
    try{if(typeof speechSynthesis==='undefined')return false;
      const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';u.rate=.8;
      speechSynthesis.cancel();speechSynthesis.speak(u);return true;}catch{return false;}
  }
  function open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='poem72-dialog';dialog.setAttribute('aria-labelledby','poem72-t');
    dialog.innerHTML='<header><div><h2 id="poem72-t"></h2><p class="poem72-sub">Loushan Pass · Verse Restoration</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="poem72-body"><p data-intro></p><canvas class="poem72-canvas" width="640" height="120" aria-hidden="true"></canvas><div data-round></div></div>'
      +'<p class="poem72-status" role="status" aria-live="polite"></p>'
      +'<div class="poem72-actions"><button data-start class="primary">▶ 开始复原</button><button data-speak hidden>♪ 朗诵本句</button><button data-complete hidden>记录成绩 · 完成本章</button></div>'
      +'<p class="poem72-note" style="padding:0 18px 12px">字块可反复拖拽、点选放置，无失败惩罚。诗句原文出自义务教育语文课本，一字不改。</p>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel);
    let s=create(node.id),recorded=false,closed=false;
    this.session=s;
    q('h2').textContent=definitions[3].title;
    q('[data-intro]').textContent=definitions[3].intro;
    const close=()=>{if(closed)return;closed=true;try{speechSynthesis.cancel();}catch{}dialog.remove();if(trigger&&trigger.isConnected)trigger.focus();};
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    q('[data-close]').onclick=close;
    const drawScroll=()=>{
      const cv=q('.poem72-canvas'),c=cv.getContext('2d');
      const g=c.createLinearGradient(0,0,0,120);g.addColorStop(0,'#2b3038');g.addColorStop(1,'#171a20');
      c.fillStyle=g;c.fillRect(0,0,640,120);
      // 娄山关远山剪影（薄暮）
      c.fillStyle='#232833';c.beginPath();c.moveTo(0,120);
      for(let i=0;i<=16;i++)c.lineTo(i*40,70+Math.sin(i*1.3)*26);
      c.lineTo(640,120);c.fill();
      // 宣纸卷轴（随进度展开）
      const prog=(s.done.filter(Boolean).length*2+(roundDone(s)?1:0))/3;
      const w=520*prog+40;
      c.fillStyle='#e8dcc0';c.fillRect(640-w,18,w,84);
      c.strokeStyle='#97372a';c.lineWidth=3;
      c.strokeRect(640-w,18,w,84);
      c.fillStyle='#97372a';c.fillRect(640-w-8,10,8,100);c.fillRect(640-2,10,8,100);
      if(prog>0){c.fillStyle='#352e23';c.font='16px KaiTi,serif';
        c.fillText('雄关漫道真如铁',640-w+18,50);
        if(prog>1/3)c.fillText('红军不怕远征难',640-w+18,76);}
    };
    let picked=-1;
    const renderRound=()=>{
      if(s.status!=='playing'){renderEnd();return;}
      const v=VERSES[s.round];
      q('[data-round]').innerHTML='<div class="poem72-round"><p class="poem72-label">ROUND '+(s.round+1)+'/3 · '+v.poem+' · <span class="poem72-booktip">【出自义务教育语文课本】</span></p>'
        +'<div class="poem72-board" data-board></div>'
        +'<div class="poem72-tiles" data-tiles></div>'
        +'<p class="poem72-note">'+v.src+'</p></div>';
      const board=q('[data-board]'),tiles=q('[data-tiles]');
      s.slots.forEach((sl,i)=>{
        const d=document.createElement('button');d.type='button';d.className='poem72-slot'+(sl.fill?' filled':'');d.dataset.slot=i;
        d.textContent=sl.fill||'';d.setAttribute('aria-label','第'+(i+1)+'字'+(sl.fill?'已填 '+sl.fill:'空位'));
        board.append(d);
      });
      s.tiles.forEach((t,i)=>{
        const d=document.createElement('button');d.type='button';d.className='poem72-tile'+(t.used?' used':'');d.dataset.tile=i;d.textContent=t.ch;
        d.draggable=!t.used;d.setAttribute('aria-label','字块 '+t.ch);
        tiles.append(d);
      });
      // 交互：点选字块→点槽位（同时支持 drag）
      tiles.querySelectorAll('.poem72-tile:not(.used)').forEach(b=>{
        b.onclick=()=>{if(picked>=0)tiles.querySelector('[data-tile="'+picked+'"]')?.classList.remove('picked');
          picked=Number(b.dataset.tile);b.classList.add('picked');status('选中「'+b.textContent+'」，点击卷轴空位放入');};
        b.ondragstart=e=>{picked=Number(b.dataset.tile);e.dataTransfer.setData('text/plain',b.textContent);};
      });
      board.querySelectorAll('.poem72-slot:not(.filled)').forEach(d=>{
        d.onclick=()=>tryPlace(Number(d.dataset.slot));
        d.ondragover=e=>e.preventDefault();
        d.ondrop=e=>{e.preventDefault();tryPlace(Number(d.dataset.slot));};
      });
      drawScroll();
    };
    const tryPlace=(slotIdx)=>{
      if(picked<0){status('先点选一个字块（或直接拖拽）');return;}
      if(s.advancing)return; // 900ms 转场进行中，忽略后续落字（防 setTimeout 叠加多次 nextRound）
      const ok=place(s,picked,slotIdx);
      if(ok){picked=-1;status('');
        if(roundDone(s)&&!s.advancing){
          const v=VERSES[s.round];
          speak(v.line+'，'+v.line2);
          status('本句复原 ✓ ——「'+v.line+'，'+v.line2+'」（出自义务教育语文课本）');
          s.advancing=true;
          setTimeout(()=>{if(closed){return;}s.advancing=false;nextRound.call(mod,s);renderRound();drawScroll();q('[data-speak]').hidden=s.status!=='playing';},900);
        }
        renderRound();
      } else status('「'+s.tiles[picked].ch+'」不属于这个位置，再看看格律。');
    };
    const renderEnd=()=>{
      q('[data-round]').innerHTML='<div class="poem72-round"><p class="poem72-label">COMPLETE · 长征诗词长卷尽展</p>'
        +'<p style="font:600 20px/1.8 KaiTi,serif;color:#efe6cf">雄关漫道真如铁，而今迈步从头越。<br>红军不怕远征难，万水千山只等闲。<br>不到长城非好汉，屈指行程二万。</p>'
        +'<p class="poem72-booktip">三句均出自义务教育语文课本 · 已解锁「长征诗词」图鉴</p></div>';
      drawScroll();speak('雄关漫道真如铁，而今迈步从头越。红军不怕远征难，万水千山只等闲。不到长城非好汉，屈指行程二万。');
    };
    const status=t=>{q('.poem72-status').textContent=t;};
    q('[data-start]').onclick=()=>{s.status='playing';mod.buildRound(s);q('[data-start]').hidden=true;q('[data-speak]').hidden=false;renderRound();status('把字块拖到卷轴空位——先点字块，再点空位亦可。');};
    q('[data-speak]').onclick=()=>{if(s.status!=='playing')return;const v=VERSES[s.round];speak(v.line+'，'+v.line2);};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;persist(s,node.id);close();if(typeof onComplete==='function')onComplete();};
    const tick=()=>{if(s.status==='won'&&q('[data-complete]').hidden){q('[data-complete]').hidden=false;}};
    const iv=setInterval(()=>{if(closed){clearInterval(iv);return;}tick();},400);
    drawScroll();
    return true;
  }
  const mod={VERSES,definitions,supports(id){return [3].includes(Number(id));},create,buildRound,place,roundDone,nextRound,finish,rating,persist,style,open,
    muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
    paused(){return typeof document!=='undefined'&&(document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay'))}};
  return mod;
})();
