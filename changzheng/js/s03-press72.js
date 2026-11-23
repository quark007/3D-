/* Hadapu newspaper keyword circling: hand-drawn vintage layout, no scanned originals.
   Players circle three keywords to discover the Shaanbei base area. */
window.Press72=(function(){
  const QUOTE='毛泽东看完报纸兴奋地说：好了！我们快到陕北根据地了。报纸记载：陕北二十三县大部赤化，刘志丹拥有数万红军武装。';
  const HIST='1935年9月，红军抵达甘肃哈达铺，在当地邮政所找到天津《大公报》。从报纸报道中读到陕北存在刘志丹领导的陕甘根据地这条关键情报，由此确定长征落脚点转向陕北。';
  const KEYWORDS=['陕北','刘志丹','根据地'];
  /* 仿旧版面文字：竖排栏目。关键词嵌在栏目文本内；干扰文字为自编市井新闻。 */
  const COLUMNS=[
    {head:'要闻',items:[
      '徐海东部转战陕北山区连克数镇','晋西商路货滞','刘志丹赤卫武装活动频繁',
      '陇东邮路恢复','关中旱象缓解','陕北二十三县大部赤化','川北盐价波动','湘赣公路通车']},
    {head:'时评',items:[
      '西北剿匪形势之观察','论陕北根据地之成因','赈务会议闭幕',
      '陕棉出口新章','平汉路客运增班','陇海沿线秋收展望']},
    {head:'市况',items:[
      '沪公债收盘持平','津市粮食到货增多','汉口纱价上扬',
      '西安皮货市况','兰州水烟减产','并州铜元行市','湘米运沪激增']}
  ];
  /* 每条文本里可含关键词（判定按子串），无预先高亮 */
  function create(id){
    return {id:Number(id),d:definitions[10],
      circles:[],status:'ready',reason:'',events:[],mistakes:0,found:{}};
  }
  /* 圈选判定：矩形框（x,y,w,h 逻辑像素）与关键词出现区域相交即识中 */
  function keywordHits(s,box){
    const hits=[];
    KEYWORDS.forEach(kw=>{
      if(s.found[kw])return;
      // 由布局函数保证的关键词矩形集在 buildLayout 中预生成
      (s.layout[kw]||[]).forEach(r=>{if(intersect(box,r))hits.push(kw);});
    });
    return [...new Set(hits)];
  }
  function intersect(a,b){return !(a.x>b.x+b.w||b.x>a.x+a.w||a.y>b.y+b.h||b.y>a.y+a.h);}
  /* 稳定布局：竖排栏位（右起），每条新闻一行文字（横排简化展示，符合手绘排版自制原则） */
  function buildLayout(s){
    const kwUse={'陕北':2,'刘志丹':1,'根据地':1}; // 埋点次数
    const rects={};KEYWORDS.forEach(k=>rects[k]=[]);
    const items=[];let y=90;
    // 栏序右→左
    const colOrder=[...COLUMNS];
      colOrder.forEach((col,ci)=>{
      col.items.forEach(text=>{
        const x=980-ci*250;
        // 优先匹配尚未埋满的关键词，避免「陕北根据地」被「陕北」抢先吞掉
        let kwIn=null;
        for(const kw of KEYWORDS){if(text.includes(kw)&&rects[kw].length<kwUse[kw]){kwIn=kw;break;}}
        if(!kwIn){for(const kw of KEYWORDS){if(text.includes(kw)){kwIn=kw;break;}}}
        const row={text,x,y,w:225,h:26};
        if(kwIn){
          if(rects[kwIn].length<kwUse[kwIn]){
            const off=text.indexOf(kwIn);
            row.kw=kwIn;
            rects[kwIn].push({x:x+14*off,y:y+4,w:14*kwIn.length,h:20});
          }
        }
        items.push(row);
        y+=34;
      });
      y=90;
    });
    s.layout=rects;s.items=items;
    return s;
  }
  function circle(s,box){
    const hits=keywordHits(s,box);
    if(hits.length){hits.forEach(k=>{s.found[k]=true;});s.events.push('hit');}
    else {s.mistakes++;s.events.push('miss');}
    s.circles.push({...box,hits:hits.length>0});
    if(KEYWORDS.every(k=>s.found[k]))this.finish(s,true,'三个关键词连成一条情报：陕北有根据地——红军的去向，就此确定。');
    return hits;
  }
  function finish(s,won,reason){if(s.status!=='playing')return;s.status=won?'won':'lost';s.reason=reason;s.events.push(won?'win':'lose');}
  function rating(s){
    if(s.status!=='won')return{score:70,rating:'翻检未竟'};
    return s.mistakes===0?{score:95,rating:'一目了然'}:s.mistakes<=3?{score:85,rating:'沙里淘金'}:{score:75,rating:'细读方得'};
  }
  function persist(s,nodeId){
    const result=rating(s);
    try{if(typeof GameState!=='undefined'){
      GameState.storyPreparations=GameState.storyPreparations||{};
      const key='press72_10',old=GameState.storyPreparations[key];
      if(!old||old.score<result.score)GameState.storyPreparations[key]={...result,miss:s.mistakes,completedAt:new Date().toISOString()};
      if(typeof GameState.recordBattleScore==='function')GameState.recordBattleScore(nodeId||10,result.score,result.rating);
      if(typeof GameState.save==='function')GameState.save();}}catch{}
    return result;
  }
  const definitions={10:{title:'哈达铺读报 · 一张报纸定去向',
    intro:'1935年9月，甘肃哈达铺。在邮政所找到的一叠旧《大公报》里，藏着红军落脚点的答案。拖动圈选出三处关键词：陕北、刘志丹、根据地。',
    success:'三个关键词连成一条情报：陕北有根据地——红军的去向，就此确定。',
    hist:HIST}};
  function style(){
    if(document.getElementById('press72-style'))return;
    const el=document.createElement('style');el.id='press72-style';el.textContent=`
    .press72-dialog{box-sizing:border-box;width:min(1060px,96vw);max-height:96dvh;margin:auto;padding:0;background:#101315;color:#e8e6df;border:1px solid #3f4247;border-radius:4px;overflow:auto;font:15px/1.55 'Microsoft YaHei',sans-serif}
    .press72-dialog::backdrop{background:#05070ae6}
    .press72-dialog header{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #2a2d31;background:#131619}
    .press72-dialog h2{margin:0;font-size:clamp(18px,2.6vw,24px);font-weight:700;color:#f2f0e9;border-left:3px solid #ffcf24;padding-left:10px}
    .press72-sub{margin:3px 0 0;padding-left:13px;font-size:10px;letter-spacing:.22em;color:#8b8e93;text-transform:uppercase}
    .press72-body{padding:12px 18px}
    .press72-dialog canvas{display:block;width:100%;height:auto;background:#e8dcc0;border:1px solid #3a3d42;border-radius:2px;cursor:crosshair;touch-action:none}
    .press72-hud{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px dashed #2a2d31;padding-bottom:8px}
    .press72-hud span{background:#14171a;border:1px solid #2a2d31;border-radius:2px;padding:3px 10px;font-size:13px;color:#cfd2cf}
    .press72-hud span.got{border-color:#3a5a40;color:#9fd08a}
    .press72-status{min-height:1.5em;color:#ffd98a;border-left:3px solid #ffcf24;padding-left:9px;margin:0 18px}
    .press72-actions{display:flex;gap:8px;flex-wrap:wrap;padding:10px 18px 12px}
    .press72-dialog button{font:inherit;background:#191c20;color:#e8e6df;border:1px solid #4a4d52;border-radius:2px;padding:8px 14px;min-height:40px;cursor:pointer}
    .press72-dialog button:hover{background:#22262b}
    .press72-dialog button.primary{background:#ffcf24;border-color:#ffcf24;color:#141310;font-weight:700}
    .press72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}
    .press72-note{font-size:12px;color:#8f948d;padding:0 18px 12px}
    .press72-dialog [hidden]{display:none!important}
    @media(max-width:600px){.press72-dialog{font-size:13px}}`;
    document.head.append(el);
  }
  function open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    style();
    const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='press72-dialog';dialog.setAttribute('aria-labelledby','press72-t');
    dialog.innerHTML='<header><div><h2 id="press72-t"></h2><p class="press72-sub">Hadapu Press Reading · Sept 1935</p></div><button data-close>返回地图 · Esc</button></header>'
      +'<div class="press72-body"><p data-intro></p><canvas data-paper width="1240" height="500" tabindex="0" aria-label="仿旧报纸版面。按住拖动圈选文字，找出三处关键词：陕北、刘志丹、根据地。"></canvas></div>'
      +'<div class="press72-hud" data-hud><span data-k1>① 陕北</span><span data-k2>② 刘志丹</span><span data-k3>③ 根据地</span></div>'
      +'<p class="press72-status" role="status" aria-live="polite"></p>'
      +'<div class="press72-actions"><button data-start class="primary">▶ 展开报纸</button><button data-complete hidden>记录成绩 · 完成本章</button></div>'
      +'<p class="press72-note">版面为手绘自制仿旧排版（非原件扫描）。圈错无惩罚，可反复圈选。</p>';
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel);
    let s=create(node.id);this.session=s;this.buildLayout(s);
    let recorded=false,closed=false;
    q('h2').textContent=definitions[10].title;
    q('[data-intro]').textContent=definitions[10].intro;
    const close=()=>{if(closed)return;closed=true;dialog.remove();if(trigger&&trigger.isConnected)trigger.focus();};
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    q('[data-close]').onclick=close;
    const status=t=>{q('.press72-status').textContent=t;};
    const hud=()=>{q('[data-k1]').className=s.found['陕北']?'got':'';q('[data-k2]').className=s.found['刘志丹']?'got':'';q('[data-k3]').className=s.found['根据地']?'got':'';};
    const draw=()=>{
      const cv=q('[data-paper]'),c=cv.getContext('2d');
      c.fillStyle='#e8dcc0';c.fillRect(0,0,1240,500);
      // 做旧：斑驳与折痕
      c.fillStyle='rgba(120,90,40,.06)';
      for(let i=0;i<40;i++){c.beginPath();c.ellipse((i*173)%1240,(i*97)%500,26+(i%3)*10,14,0,0,Math.PI*2);c.fill();}
      c.strokeStyle='rgba(90,60,20,.18)';c.beginPath();c.moveTo(620,0);c.lineTo(640,500);c.stroke();
      c.strokeStyle='rgba(90,60,20,.12)';c.beginPath();c.moveTo(0,250);c.lineTo(1240,240);c.stroke();
      // 报头（自绘仿宋）
      c.fillStyle='#2b2317';c.font='900 34px SimSun,serif';c.fillText('大 公 報',470,52);
      c.font='12px SimSun,serif';c.fillText('天津 · 民國二十四年九月 · （本版為教學手繪仿舊排版）',330,74);
      // 栏目与条目（关键词不预先高亮）
      c.fillStyle='#2b2317';
      s.items.forEach((row,i)=>{
        if(i%8===0)c.font='700 15px SimSun,serif';else c.font='13px SimSun,serif';
        c.fillText(row.text,row.x,row.y+18);
      });
      // 用户圈选（红笔）
      s.circles.forEach(cr=>{
        c.strokeStyle=cr.hits?'rgba(151,55,42,.95)':'rgba(151,55,42,.45)';
        c.lineWidth=2.5;
        c.beginPath();c.ellipse(cr.x+cr.w/2,cr.y+cr.h/2,cr.w/2+8,cr.h/2+7,0,0,Math.PI*2);c.stroke();
      });
    };
    /* 拖圈 */
    const cv=q('[data-paper]');
    let drag=null;
    const toLocal=e=>{const r=cv.getBoundingClientRect();const sc=r.width/1240;
      return {x:(e.clientX-r.left)/sc,y:(e.clientY-r.top)/sc};};
    cv.addEventListener('pointerdown',e=>{if(s.status!=='playing')return;const p=toLocal(e);drag=p;cv.setPointerCapture(e.pointerId);e.preventDefault();cv.focus();});
    cv.addEventListener('pointermove',e=>{if(!drag)return;const p=toLocal(e);
      // 即时预览圈
      draw();
      const c=cv.getContext('2d');c.strokeStyle='rgba(151,55,42,.8)';c.lineWidth=2.5;
      c.beginPath();c.ellipse((drag.x+p.x)/2,(drag.y+p.y)/2,Math.abs(p.x-drag.x)/2+8,Math.abs(p.y-drag.y)/2+7,0,0,Math.PI*2);c.stroke();});
    const up=e=>{if(!drag)return;const p=toLocal(e);
      const box={x:Math.min(drag.x,p.x),y:Math.min(drag.y,p.y),w:Math.abs(p.x-drag.x),h:Math.abs(p.y-drag.y)};
      drag=null;
      if(box.w<14&&box.h<14){status('按住拖出一个圈，把关键词整个套住。');return;}
      const hits=circle.call(mod,s,box);
      if(hits.length){status('圈中了：'+hits.join('、')+(KEYWORDS.every(k=>s.found[k])?' —— 情报齐了！':'（继续找其余关键词）'));}
      else status('这一处没有关键词，再翻翻别的栏目。');
      hud();draw();};
    cv.addEventListener('pointerup',up);
    cv.addEventListener('pointercancel',()=>{drag=null;draw();});
    q('[data-start]').onclick=()=>{s.status='playing';q('[data-start]').hidden=true;status('拖动圈出关键词。提示：三个栏目都翻翻。');};
    q('[data-complete]').onclick=()=>{if(recorded||s.status!=='won'||!current())return;recorded=true;persist(s,node.id);close();if(typeof onComplete==='function')onComplete();};
    const iv=setInterval(()=>{if(closed){clearInterval(iv);return;}
      if(s.status==='won'){q('[data-complete]').hidden=false;status('情报确定：北上陕北。'+QUOTE.split('。')[0]+'。');}
    },400);
    draw();
    return true;
  }
  const mod={QUOTE,KEYWORDS,COLUMNS,HIST,definitions,supports(id){return [10].includes(Number(id));},
    create,buildLayout,keywordHits,circle,finish,rating,persist,style,open,
    muted(){if(typeof AudioControl43!=='undefined')return AudioControl43.muted===true;try{return localStorage.getItem('cz_mute43')==='true';}catch{return false;}},
    paused(){return typeof document!=='undefined'&&(document.hidden||!!document.querySelector('.decision-film-overlay,.decision-cinema-overlay,.npc-overlay.open,.experience-overlay'))}};
  return mod;
})();
