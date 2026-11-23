/* batch73 hardened: optional success-only, owner scoped, save before callback. */
/* 于都河浮桥 · bridge72 —— 第三批 P3（隔离区开发，待统一接线）
   工程解谜：门板跨2承重2、长木跨3承重3、缆绳+2、木桩+1；部队双列过桥每格载荷2。
   第2关水流漂移（连续≥3格无缆绳锚定即漂）；第3关架好后40秒内拆解回收。
   挂接：于都出发节点(1)。存档：storyPreparations['bridge72_1'] + recordBattleScore(1)。 */
window.Bridge72={
  supports(id){return [1].includes(Number(id));},
  CELL:20,
  STAGES:[
    {width:120,inv:{door:4,plank:3,rope:2,pile:3},current:false,dismantle:false},
    {width:160,inv:{door:5,plank:4,rope:3,pile:4},current:true,dismantle:false},
    {width:200,inv:{door:6,plank:5,rope:4,pile:5},current:true,dismantle:true}
  ],
  MATS:{door:{span:2,cap:2,label:'门板'},plank:{span:3,cap:3,label:'长木'},rope:{span:1,cap:0,label:'缆绳'},pile:{span:1,cap:0,label:'木桩'}},
  LOAD:2,
  bridgePoint(t,u=0){return {x:190+900*t,y:493-95*t+u*48,scale:1-.12*t};},
  bridgeHit(x,y,n){
    if(!Number.isFinite(x)||!Number.isFinite(y)||!n)return -1;
    const t=(x-190)/900;if(t<0||t>=1)return -1;
    const p=this.bridgePoint(t);if(Math.abs(y-p.y)>48)return -1;
    return Math.min(n-1,Math.floor(t*n));
  },
  create(id){
    return {id:Number(id),stage:0,cells:[],inv:{},sel:'door',status:'ready',reason:'',
      phase:'build',crossT:0,breakAt:-1,disarmLeft:0,retries:0,score:0,msg:'选材料，点桥面放置；搭通后按「过桥」。',
      accumulator:0,cleared:0,utilTotal:0,gidSeq:0};
  },
  beginStage(s){
    const st=this.STAGES[s.stage];s.cells=new Array(st.width/this.CELL).fill(null);
    s.piles={};s.ropes={};s.inv={...st.inv};s.phase='build';s.breakAt=-1;s.crossT=0;
    s.msg='第 '+(s.stage+1)+' 关：'+(st.current?'水流湍急，注意缆绳锚定。':'把桥搭通对岸。');
  },
  start(s){if(s.status!=='playing')return false;s.status='playing';this.beginStage(s);return true;},
  place(s,type,idx){
    if(s.phase!=='build'||s.status!=='playing')return false;
    const st=this.STAGES[s.stage],m=this.MATS[type];if(!m)return false;
    if(s.inv[type]<=0){s.msg='「'+m.label+'」用完了。';return false;}
    if(idx<0||idx+m.span>st.width/this.CELL){s.msg='超出桥面。';return false;}
    if(type==='rope'||type==='pile'){
      /* 缆绳/木桩是附着件：可放在桥面板上或空位，但不可与另一附着件重叠 */
      if(s.ropes[idx]||s.piles[idx]){s.msg='这里已有附着件。';return false;}
    }else{
      for(let k=0;k<m.span;k++){if(s.cells[idx+k]||s.piles[idx+k]||s.ropes[idx+k]){s.msg='这段已有材料。';return false;}}
    }
    s.inv[type]--;
    if(type==='pile'){s.piles[idx]=1;}
    else if(type==='rope'){s.ropes[idx]=1;}
    else{const gid=++s.gidSeq;for(let k=0;k<m.span;k++)s.cells[idx+k]={t:type,g:gid};}
    return true;
  },
  remove(s,idx){
    if(s.phase!=='build'||s.status!=='playing')return false;
    if(s.piles[idx]){delete s.piles[idx];s.inv.pile++;return true;}
    if(s.ropes[idx]){delete s.ropes[idx];s.inv.rope++;return true;}
    const cell=s.cells[idx];if(cell){
      let i0=idx;while(i0>0&&s.cells[i0-1]&&s.cells[i0-1].g===cell.g)i0--;
      const span=this.MATS[cell.t].span;
      for(let k=i0;k<i0+span;k++)delete s.cells[k];
      s.inv[cell.t]++;return true;}
    return false;
  },
  capacity(s,i){
    let c=0;const cell=s.cells[i];if(cell)c+=this.MATS[cell.t].cap;
    if(s.piles[i])c+=1;
    if(s.ropes[i])c+=2;
    return c;
  },
  solve(s){
    const n=s.cells.length,st=this.STAGES[s.stage];
    let worst=-1,reason='';
    for(let i=0;i<n;i++){if(!s.cells[i]){worst=i;reason='第 '+(i+1)+' 格缺口';break;}}
    if(worst<0)for(let i=0;i<n;i++){if(this.capacity(s,i)<this.LOAD){worst=i;reason='第 '+(i+1)+' 格承重不足';break;}}
    if(worst<0&&st.current){
      let run=0,anchored=false;
      for(let i=0;i<n;i++){run=s.cells[i]?run+1:0;
        if(run>=3&&!Object.keys(s.ropes).some(r=>r>=i-2&&r<=i)){worst=i-2;reason='连续三格无缆绳，会被水流冲漂';break;}}
    }
    return {ok:worst<0,worst,reason};
  },
  cross(s){
    if(s.phase!=='build'||s.status!=='playing')return false;
    const v=this.solve(s);
    if(!v.ok){s.breakAt=v.worst;s.msg='桥体断裂！'+v.reason+'（重搭）';s.retries++;s.phase='rebuild';return false;}
    s.phase='cross';s.crossT=0;s.msg='部队通过——桥很稳。';return true;
  },
  afterCross(s){
    const st=this.STAGES[s.stage];
    const used=Object.values(s.inv).reduce((a,b)=>a+b,0),tot=Object.values(st.inv).reduce((a,b)=>a+b,0);
    s.utilTotal+=Math.round(used/tot*20);
    s.cleared=s.stage+1;
    if(s.stage>=this.STAGES.length-1){this.finish(s,true,'三段浮桥皆成，夜渡于都河。');}
    else{s.stage++;this.beginStage(s);}
  },
  dismantle(s){
    if(s.phase!=='disarmWait'&&s.phase!=='disarm')return false;
    s.phase='disarmed';s.utilTotal+=10;s.msg='天亮前拆完，桥料归还乡亲。';
    this.afterCross(s);return true;
  },
  step(s,dt=1/120){
    if(s.status!=='playing')return;
    if(s.phase==='cross'){s.crossT+=dt;if(s.crossT>2.4){
      if(this.STAGES[s.stage].dismantle){s.phase='disarmWait';s.disarmLeft=40;s.msg='部队过河——天快亮了，40 秒内拆解回收！';}
      else this.afterCross(s);}return;}
    if(s.phase==='rebuild'){s.crossT+=dt;if(s.crossT>1.2){s.phase='build';s.msg='重整桥料再搭。';}return;}
    if(s.phase==='disarmWait'||s.phase==='disarm'){s.disarmLeft-=dt;
      if(s.disarmLeft<=0){this.finish(s,false,'天亮了，桥没来得及拆完——被敌机发现。');}}
  },
  beginDisarm(s){if(s.phase!=='disarmWait')return false;s.phase='disarm';return true;},
  finish(s,won,reason){
    if(s.status!=='playing')return;
    const stC=s.cleared||0;
    const score=Math.max(0,Math.round(50*stC+s.utilTotal-s.retries*8));
    s.status=won?'won':'lost';s.reason=reason;s.score=score;
  },
  advance(s,seconds){s.accumulator+=Math.max(0,Math.min(.1,seconds||0));let n=0;while(s.accumulator>=1/120&&n<24){this.step(s,1/120);s.accumulator-=1/120;n++;}},
  rating(s){const sc=Number.isFinite(s.score)?s.score:0;return sc>=90?{score:sc,rating:'星夜工兵'}:sc>=75?{score:sc,rating:'众志成城'}:sc>=60?{score:sc,rating:'河上通途'}:{score:sc,rating:'重返渡口'};},
  muted(){return (typeof AudioControl43!=='undefined'&&AudioControl43.muted===true)||(()=>{try{return ['1','true'].includes(localStorage.getItem('cz_mute43'))}catch{return false}})();},
  paused(){return !!window.__czPaused||(typeof document!=='undefined'&&(document.hidden||!!document.querySelector?.('.decision-film-overlay,.npc-overlay.open,.experience-overlay')));},
  style(){
    if(document.getElementById('bridge72-style'))return;
    const el=document.createElement('style');el.id='bridge72-style';
    el.textContent='.bridge72-dialog{width:min(1100px,96vw);max-width:96vw;background:#0d1622;color:#dbe4ec;border:1px solid #3a5064;border-radius:14px;padding:16px 18px;font:15px/1.5 \'Microsoft YaHei\',sans-serif}'
    +'.bridge72-dialog h2{margin:0;font-size:clamp(19px,3vw,26px);color:#cfe2f5}.bridge72-dialog header{display:flex;justify-content:space-between;align-items:center;gap:10px}'
    +'.bridge72-dialog button{font:inherit;min-height:44px;padding:8px 14px;background:#1d3346;color:#e6f0fa;border:1px solid #5f88a5;border-radius:8px;cursor:pointer}'
    +'.bridge72-dialog button:disabled{opacity:.45}.bridge72-dialog :focus-visible{outline:3px solid #ffcf24;outline-offset:2px}'
    +'.bridge72-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}.bridge72-note{font-size:13px;color:#9fb4c4;margin:6px 0}.bridge72-status{min-height:1.5em;color:#ffe9a1;margin:4px 0}'
    +'.bridge72-dialog details{margin:6px 0;font-size:12px;color:#8ba0b0}.bridge72-mats{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}'
    +'.bridge72-mats button.sel{border-color:#ffcf24;box-shadow:0 0 0 2px rgba(255,207,36,.35)}'
    +'.bridge72-dialog canvas{display:block;width:min(100%,calc(min(62dvh,720px)*1.77778));aspect-ratio:16/9;height:auto;margin:0 auto;background:#0d1b2a;touch-action:none;border-radius:8px;box-shadow:0 0 0 1px #24435c}';
    document.head.append(el);
  },
  open(node,onComplete){
    if(!node||!this.supports(node.id))return false;
    if(typeof RouteMap!=='undefined'&&RouteMap.isNodeLocked(node.id)){if(typeof GameUI!=='undefined')GameUI.showToast('尚未抵达此站，请先完成前面的章节。');return false;}
    if(typeof NpcStory!=='undefined'&&!NpcStory.unlocked(node.id)){NpcStory.pendingTask={nodeId:node.id,run:()=>this.open(node,onComplete)};NpcStory.startGate(node);return false;}
    if(typeof CoopHotseat66!=='undefined'&&CoopHotseat66.active()&&!CoopHotseat66.allowed('action')){CoopHotseat66.enter('action',()=>this.open(node,onComplete));return false;}
    this.closeActive?.();this.style();const owner=typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null,demo=!!window.MainlineDemo?.active,current=()=>owner===(typeof PlayerProfiles40!=='undefined'?PlayerProfiles40.id:null)&&demo===!!window.MainlineDemo?.active,trigger=document.activeElement;
    const dialog=document.createElement('dialog');dialog.className='bridge72-dialog';
    const assetRoot=new URL('../assets/bridge-banks-v5/',document.querySelector('script[src*="bridge72"]')?.src||new URL('js/bridge72.js',document.baseURI));
    dialog.innerHTML='<header><div><h2>于都河 · 星夜架桥</h2><span class="xjg-sub" style="font-size:12px;letter-spacing:.18em;color:#8ba0b0">YUDU PONTOON · 1934</span></div><button data-close>返回地图 · Esc</button></header><p data-intro></p><canvas width="1280" height="720" tabindex="0" aria-label="于都河浮桥画面。选择材料点击桥面放置，搭通后过桥；第三关限时拆解。"></canvas><div class="bridge72-mats"><button data-mat="door">门板 ×0</button><button data-mat="plank">长木 ×0</button><button data-mat="rope">缆绳 ×0</button><button data-mat="pile">木桩 ×0</button><button data-erase>拆下 · 右键</button></div><p class="bridge72-status" role="status" aria-live="polite"></p><div class="bridge72-actions"><button data-start>星夜开工 · BUILD</button><button data-cross disabled>过桥 · TEST</button><button data-disarm hidden>拆解回收 · DISMANTLE</button><button data-pause disabled>暂停</button><button data-retry>重来</button><button data-complete hidden>记录成绩 · 完成</button></div><p class="bridge72-note">抽象符号，无伤亡表现。</p><details class="bridge72-note"><summary>史实与练习说明</summary><p data-hist></p></details>';
    const skin=document.createElement('style');skin.textContent=`
    .bridge72-dialog{box-sizing:border-box;width:min(1320px,98vw);max-width:98vw;max-height:96dvh;overflow:auto;border:7px ridge #665842;border-radius:3px;padding:22px;color:#30291d;background:radial-gradient(ellipse at 10% 10%,#fff4d855,transparent 55%),repeating-linear-gradient(13deg,#59462906 0 1px,transparent 1px 8px),#dac9a4;box-shadow:0 20px 80px #000a,inset 0 0 55px #7e582c55;font-family:'Microsoft YaHei',serif}
    .bridge72-dialog::backdrop{background:#090e16d9}.bridge72-dialog header{border-bottom:1px solid #8e7657;padding-bottom:14px}.bridge72-dialog h2{font-family:KaiTi,STKaiti,serif;font-size:clamp(24px,3vw,38px);color:#2b241b}.bridge72-dialog .xjg-sub{color:#756044!important;letter-spacing:.12em!important}.bridge72-dialog [data-intro]{color:#51432e;font-size:14px;line-height:1.8}
    .bridge72-dialog button{border:1px solid #6f5738;border-radius:3px;color:#342619;background:linear-gradient(100deg,#e0c99d,#bf9c68);box-shadow:inset 0 0 0 2px #f0dcad66,0 2px 3px #35271540;min-height:46px}.bridge72-dialog button:hover:not(:disabled){filter:brightness(1.08)}.bridge72-dialog button:disabled{opacity:.45}.bridge72-dialog [data-close]{background:#303d3e;color:#f2e5c7}.bridge72-mats button.sel{border-color:#823a28;background:#c3a16b;box-shadow:inset 0 0 0 2px #823a28;color:#211b13}
    .bridge72-layout{display:grid;grid-template-columns:minmax(0,1fr) 245px;gap:20px;align-items:stretch}.bridge72-stage{min-width:0}.bridge72-dialog canvas{width:min(100%,calc(50dvh * 1.77778));max-width:100%;border-radius:1px;border:5px ridge #736950;box-sizing:border-box;box-shadow:0 3px 12px #392a2055}.bridge72-journal{padding:20px 18px;background:repeating-linear-gradient(transparent 0 43px,#7f684326 43px 44px),#efe4c9;border:1px solid #b39a70;box-shadow:3px 4px 0 #b8a584,6px 7px 9px #392a2033;transform:rotate(.35deg)}.bridge72-journal h3{font:30px KaiTi,STKaiti,serif;margin:0 0 16px;border-bottom:2px solid #756345;padding-bottom:12px}.bridge72-journal p{line-height:1.9;color:#493a27}.bridge72-journal [data-journal]{white-space:pre-line;font-size:15px;line-height:2.5}.bridge72-dialog .bridge72-note{color:#756345}.bridge72-dialog .bridge72-status{border-left:3px solid #8a4430;background:#f7ecd14d;padding:10px 14px;color:#3d3020}.bridge72-dialog details{color:#685537}.bridge72-mats{gap:7px}.bridge72-actions{padding-top:10px;border-top:1px solid #9b8057}
    @media(max-width:760px){.bridge72-dialog{padding:12px;border-width:3px}.bridge72-layout{grid-template-columns:1fr;gap:12px}.bridge72-journal{padding:12px;transform:none}.bridge72-journal h3{font-size:23px;margin-bottom:5px}.bridge72-journal [data-journal]{font-size:13px;line-height:1.9}.bridge72-journal p{margin:4px 0}.bridge72-dialog header{align-items:flex-start}.bridge72-dialog [data-close]{font-size:12px;padding:6px}.bridge72-mats button,.bridge72-actions button{flex:1 1 95px;font-size:13px;padding:8px}.bridge72-dialog canvas{border-width:3px}}
    `;dialog.append(skin);
    const skinV5=document.createElement('link');skinV5.rel='stylesheet';skinV5.href=new URL('skin.css',assetRoot).href;dialog.append(skinV5);
    const layout=document.createElement('div');layout.className='bridge72-layout';
    const stage=document.createElement('section');stage.className='bridge72-stage';
    const board=dialog.querySelector('canvas'),materials=dialog.querySelector('.bridge72-mats');board.before(layout);layout.append(stage);stage.append(board,materials);
    const journal=document.createElement('aside');journal.className='bridge72-journal';journal.innerHTML='<h3>作战笔记</h3><p>于都河畔 · 星夜开工</p><p>先铺通桥面，再检查承重。<br>急流路段要用缆绳锚定。</p><div data-journal aria-live="polite"></div><p class="bridge72-note">门板跨2格 · 长木跨3格<br>缆绳承重+2 · 木桩承重+1<br>每格需要承重2</p>';layout.append(journal);
    document.body.append(dialog);dialog.showModal();
    const q=sel=>dialog.querySelector(sel),canvas=q('canvas'),ctx=canvas.getContext('2d');
    let s=this.create(node.id),raf=0,last=0,closed=false,recorded=false,manualPause=false,eraseMode=false;
    this.session=s;
    /* 开工前显示材料与桥格预览；开工仍通过原入口进入playing状态。 */
    this.beginStage(s);s.status='ready';
    q('[data-intro]').textContent='1934 年 10 月，于都。乡亲们拆下门板捐作桥料，工兵星夜架桥、天亮前拆去。门板跨 2 格承重 2，长木跨 3 格承重 3，缆绳 +2、木桩 +1；部队双列过桥，每格载荷 2。';
    q('[data-hist]').textContent='中央红军 1934 年 10 月 17-20 日夜渡于都河开始长征。乡亲们捐门板、床板作桥料，工兵夜间架桥、拂晓前拆除以免被敌机侦察发现。本页工程数值为教学设定。';
        const close=()=>{if(closed)return;closed=true;cancelAnimationFrame(raf);try{dialog.close()}catch{}dialog.remove();if(this.session===s)this.session=null;if(this.closeActive===close)this.closeActive=null;this.practiceMode73='normal';if(trigger?.isConnected)trigger.focus();};this.closeActive=close;dialog.addEventListener('close',close);
    q('[data-close]').onclick=close;
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    const kd=e=>{if(e.key==='Escape'){close();return;}
      if(e.key==='1')sel('door');if(e.key==='2')sel('plank');if(e.key==='3')sel('rope');if(e.key==='4')sel('pile');
      if(e.key===' '){e.preventDefault();tryCross();}upd();};
    dialog.addEventListener('keydown',kd);
    const sel=t=>{s.sel=t;eraseMode=false;for(const b of dialog.querySelectorAll('[data-mat]'))b.classList.toggle('sel',b.dataset.mat===t);};
    for(const b of dialog.querySelectorAll('[data-mat]'))b.onclick=()=>sel(b.dataset.mat);
    q('[data-erase]').onclick=()=>{eraseMode=!eraseMode;q('[data-erase]').classList.toggle('sel',eraseMode);};
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{
      if(manualPause||this.paused()||s.status!=='playing'||s.phase!=='build')return;
      const r=canvas.getBoundingClientRect(),border=parseFloat(getComputedStyle(canvas).borderLeftWidth)||0;
      const x=(e.clientX-r.left-border)*1280/(r.width-2*border),y=(e.clientY-r.top-border)*720/(r.height-2*border);
      const idx=this.bridgeHit(x,y,s.cells.length);
      if(idx<0){s.msg='请点两岸之间的横向桥格；从左向右搭建。';upd();return;}
      if(eraseMode||e.button===2)this.remove(s,idx);else this.place(s,s.sel,idx);upd();});
    const tryCross=()=>{if(this.cross(s)){upd();}else{upd();}};
    q('[data-start]').onclick=()=>{s.status='playing';this.start(s);q('[data-start]').disabled=true;q('[data-pause]').disabled=false;q('[data-cross]').disabled=false;canvas.focus();upd();};
    q('[data-cross]').onclick=tryCross;
    q('[data-disarm]').onclick=()=>{this.beginDisarm(s);this.dismantle(s);upd();};
    q('[data-pause]').onclick=e=>{manualPause=!manualPause;e.target.textContent=manualPause?'继续':'暂停';};
    q('[data-retry]').onclick=()=>{const rs=s.retries;s=this.create(node.id);recorded=false;s.retries=rs;s.status='playing';this.start(s);this.session=s;upd();};
    q('[data-complete]').onclick=()=>{if(closed||recorded||s.status!=='won'||!current())return;const result=this.rating(s);if(!window.StarfireBook73?.record('bridge',node.id,result,s)){if(typeof GameUI!=='undefined')GameUI.showToast('成绩未保存，请从正式入口打开或稍后重试。');return;}recorded=true;close();onComplete?.({won:true,...result});};
    const riverArt=new Image();riverArt.src=new URL('river-banks.png',assetRoot).href;
    const soldierArt=new Image();soldierArt.src=new URL('soldier-walk.png',assetRoot).href;
    const timberArt=new Image();timberArt.src=new URL('../bridge-real-v2/damp-timber-v4.png',assetRoot).href;
    const timberLayer=document.createElement('canvas');timberLayer.width=1280;timberLayer.height=720;
    let timberKey='',timberSheet=null;
    const textureDeck=()=>{
      if(!timberArt.complete||!timberArt.naturalWidth)return false;
      if(!timberSheet){timberSheet=document.createElement('canvas');timberSheet.width=timberArt.naturalHeight;timberSheet.height=timberArt.naturalWidth;const tc=timberSheet.getContext('2d');tc.translate(timberSheet.width,0);tc.rotate(Math.PI/2);tc.drawImage(timberArt,0,0);}
      const n=s.cells.length,key=n+':'+s.cells.map(c=>c?c.t+c.g:'_').join(',');
      if(key!==timberKey){
        timberKey=key;const c=timberLayer.getContext('2d');c.clearRect(0,0,1280,720);
        for(let i=n-1;i>=0;i--){if(!s.cells[i])continue;
          const x0=190+900*i/n,x1=190+900*(i+1)/n;
          const sy=((i*137+s.cells[i].g*53)%650)/1000*timberSheet.height,sh=timberSheet.height*.24;
          for(let x=Math.ceil(x0);x<x1;x++){
            const t=(x+.5-190)/900,p=this.bridgePoint(t),v=(x-x0)/(x1-x0);
            c.drawImage(timberSheet,v*(timberSheet.width-3),sy,Math.max(1,timberSheet.width/(x1-x0)),sh,x,p.y-48,1.3,96);
          }
          c.beginPath();for(const [j,u] of [[i/n,-1],[i/n,1],[(i+1)/n,1],[(i+1)/n,-1]]){const p=this.bridgePoint(j,u);c.lineTo(p.x,p.y);}c.closePath();
          const grad=c.createLinearGradient(0,430,0,550);grad.addColorStop(0,'#13273855');grad.addColorStop(.5,'#eab46d12');grad.addColorStop(1,'#080d1377');c.fillStyle=grad;c.fill();
        }
      }
      ctx.drawImage(timberLayer,0,0);return true;
    };
    const draw=()=>{
      const st=this.STAGES[s.stage],n=s.cells.length,bx=190,by=460,cw=900,cellW=cw/n;
      const sky=ctx.createLinearGradient(0,0,0,720);sky.addColorStop(0,'#071324');sky.addColorStop(.55,'#142a39');sky.addColorStop(1,'#071c27');ctx.fillStyle=sky;ctx.fillRect(0,0,1280,720);for(let j=0;j<36;j++){ctx.fillStyle='rgba(221,228,213,'+(.15+(j%4)*.1)+')';ctx.fillRect((j*173+83)%1280,115+(j*37)%190,2,2);}ctx.fillStyle='#101f27';ctx.beginPath();ctx.moveTo(0,380);for(let j=0;j<=1280;j+=40)ctx.lineTo(j,310+Math.sin(j*.009)*35+Math.cos(j*.023)*16);ctx.lineTo(1280,440);ctx.lineTo(0,440);ctx.fill();
      /* 岸 */
      ctx.fillStyle='#1a2a1e';ctx.fillRect(0,380,140,340);ctx.fillRect(140+cw,380,1280-140-cw,340);
      /* 河 + 月光带 */
      const g=ctx.createLinearGradient(0,380,0,720);g.addColorStop(0,'#14324c');g.addColorStop(1,'#0a1a28');ctx.fillStyle=g;ctx.fillRect(bx,380,cw,340);
      ctx.fillStyle='rgba(200,220,255,.05)';ctx.fillRect(bx,380,60,340);
      for(let y=400;y<700;y+=34){ctx.strokeStyle='rgba(126,203,255,.10)';ctx.beginPath();
        for(let x=bx;x<=bx+cw;x+=40){ctx.lineTo(x,y+Math.sin(x*.05+y*.2+(s.phase==='cross'?s.crossT*6:0))*4);}ctx.stroke();}
      if(riverArt.complete&&riverArt.naturalWidth){ctx.drawImage(riverArt,0,0,1280,720);const time=performance.now()/1000;ctx.save();ctx.globalAlpha=.1;ctx.strokeStyle='#b8d2db';for(let j=0;j<24;j++){const y=350+j*11,x=280+Math.sin(time*.6+j*1.7)*70;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+20+(j%5)*14,y);ctx.stroke();}ctx.restore();}
      /* 绘制与命中共享 bridgePoint：由远到近绘制，木料不透明。 */
      const point=(t,u)=>this.bridgePoint(t,u);
      const line=(a,b,color,width=1)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();};
      const quad=(i,color)=>{const a=point(i/n,-1),b=point(i/n,1),c=point((i+1)/n,1),d=point((i+1)/n,-1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.lineTo(d.x,d.y);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='#d8c59a77';ctx.lineWidth=1;ctx.stroke();};
      const textured=textureDeck();
      for(let i=n-1;i>=0;i--){
        const cell=s.cells[i],t=(i+.5)/n,p=point(t,0);
        if(cell){
          const near=point(i/n,0),far=point((i+1)/n,0),wood=ctx.createLinearGradient(0,far.y,0,near.y);
          wood.addColorStop(0,cell.t==='door'?'#433426':'#5a432c');wood.addColorStop(.4,'#8a6a43');wood.addColorStop(1,'#54402d');if(!textured)quad(i,wood);
          const edgeA=point(i/n,-1),edgeB=point(i/n,1);
          line({...edgeA,y:edgeA.y-1},{...edgeB,y:edgeB.y-1},'#c0aa7c88',Math.max(.8,2*p.scale));
          line(edgeA,edgeB,'#211910bb',Math.max(1,2*p.scale));
          const frontA=point(i/n,1),frontB=point((i+1)/n,1);
          line({x:frontA.x,y:frontA.y+5},{x:frontB.x,y:frontB.y+5},'#241c14',8*p.scale);
          for(const side of [-1,1]){
            const a=point(i/n,side),b=point((i+1)/n,side);
            line(a,b,'#33351e',9*p.scale);line({x:a.x,y:a.y-2},{x:b.x,y:b.y-2},'#a5a16b',3*p.scale);
            const knot=point((i+.55)/n,side);line({x:knot.x-2,y:knot.y-5},{x:knot.x+1,y:knot.y+4},'#c1ac79',2);
          }
          for(const u of [-.86,.86]){const nail=point((i+.2)/n,u);ctx.fillStyle='#282a28';ctx.beginPath();ctx.arc(nail.x,nail.y,Math.max(1,2.3*p.scale),0,Math.PI*2);ctx.fill();}
        }else{quad(i,'rgba(180,211,220,.10)');ctx.fillStyle='#f4e4ba';ctx.font=Math.max(11,19*p.scale)+'px sans-serif';ctx.textAlign='center';ctx.fillText(String(i+1),p.x,p.y);ctx.textAlign='left';}
        if(s.piles[i]||s.ropes[i])for(const u of [-1,1]){
          const foot=point(t,u),h=60*foot.scale,top={x:foot.x,y:foot.y-h};
          line(foot,top,'#2b2218',Math.max(3,12*foot.scale));line({x:foot.x-2*foot.scale,y:foot.y}, {x:top.x-2*foot.scale,y:top.y},'#ab8654',Math.max(1,3*foot.scale));
          if(s.ropes[i]){for(let k=0;k<3;k++)line({x:foot.x-9*foot.scale,y:top.y+10*foot.scale+k*4*foot.scale},{x:foot.x+9*foot.scale,y:top.y+12*foot.scale+k*4*foot.scale},'#cab58a',Math.max(1,3*foot.scale));const end=point(Math.min(1,t+.12),u);line({x:top.x,y:top.y+14*foot.scale},end,'#c6ae7c',Math.max(1,3*foot.scale));}
        }
        if(s.breakAt===i){quad(i,'rgba(189,62,38,.42)');}
      }
      /* 双列行走：真正的四帧人物，脚底与桥面共用投影。 */
      const drawSoldier=(progress,lane,index,walking)=>{
        const p=point(progress,lane),height=150*p.scale,frame=walking?Math.floor(s.crossT*24+index*.7)%4:1;
        ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(p.x,p.y+2,22*p.scale,6*p.scale,0,0,Math.PI*2);ctx.fill();
        if(soldierArt.complete&&soldierArt.naturalWidth){
          const fw=soldierArt.naturalWidth/2,fh=soldierArt.naturalHeight/2;
          ctx.drawImage(soldierArt,(frame%2)*fw+fw*.16,Math.floor(frame/2)*fh,fw*.72,fh,p.x-height*.36,p.y-height,height*.72,height);
        }else{ctx.fillStyle='#758382';ctx.fillRect(p.x-10*p.scale,p.y-height*.83,20*p.scale,height*.68);ctx.fillStyle='#bca78c';ctx.beginPath();ctx.arc(p.x,p.y-height*.9,12*p.scale,0,Math.PI*2);ctx.fill();}
      };
      if(s.phase==='cross'){
        for(const lane of [-.47,.43])for(let j=0;j<4;j++){
          const progress=(s.crossT/2.4)*1.65-.25-j*.085;
          drawSoldier(Math.max(-.10,Math.min(1.12,progress)),lane,j,progress>-.1&&progress<1.12);
        }
      }else{
        drawSoldier(-.09,-.47,0,false);drawSoldier(1.09,-.47,1,false);
      }
      ctx.font='18px serif';ctx.fillStyle='#f3dfb5';ctx.textAlign='center';
      for(const [t,label] of [[-.08,'出发岸'],[1.08,'接应岸']]){const p=point(t,0);ctx.fillStyle='#101e24bb';ctx.fillRect(p.x-48,p.y+65,96,30);ctx.fillStyle='#f3dfb5';ctx.fillText(label,p.x,p.y+86);}ctx.textAlign='left';
      /* 拆桥倒计时 */
      if(s.phase==='disarmWait'||s.phase==='disarm'){ctx.fillStyle='rgba(13,14,16,.9)';ctx.fillRect(500,120,280,44);
        ctx.fillStyle='#ffcf24';ctx.font='900 22px sans-serif';ctx.textAlign='center';
        ctx.fillText('拆解倒计时 '+Math.ceil(s.disarmLeft)+'s',640,150);ctx.textAlign='left';}
      ctx.fillStyle='rgba(9,17,22,.7)';ctx.fillRect(24,22,280,46);ctx.fillStyle='#f2e6c9';ctx.font='20px serif';ctx.fillText('于都夜渡 · 第 '+(s.stage+1)+' 段',42,52);
      if(s.status==='won'||s.status==='lost'){ctx.fillStyle='rgba(4,8,12,.6)';ctx.fillRect(0,0,1280,720);
        ctx.fillStyle='rgba(10,14,18,.94)';ctx.fillRect(320,250,640,180);ctx.strokeStyle=s.status==='won'?'#ffcf24':'#e5484d';ctx.lineWidth=2;ctx.strokeRect(320,250,640,180);
        ctx.textAlign='center';ctx.fillStyle='#cfe2f5';ctx.font='bold 40px sans-serif';ctx.fillText(this.rating(s).rating,640,318);
        ctx.fillStyle='#f2f3f4';ctx.font='bold 20px sans-serif';ctx.fillText(this.rating(s).score+' 分',640,356);
        ctx.fillStyle='#9a9c9f';ctx.font='13px sans-serif';ctx.fillText(s.reason,640,386);ctx.textAlign='left';}
    };
    const upd=()=>{
      q('[data-journal]').textContent='第 '+(s.stage+1)+' 段 / '+this.STAGES.length+' 段\n桥面铺设 '+s.cells.filter(Boolean).length+' / '+s.cells.length+' 格\n缆绳锚定 '+Object.keys(s.ropes||{}).length+' 处\n木桩加固 '+Object.keys(s.piles||{}).length+' 处';
      q('.bridge72-status').textContent=s.msg||'';
      const selected=q('[data-mat="'+s.sel+'"]');for(const b of dialog.querySelectorAll('[data-mat]'))b.classList.toggle('sel',b===selected&&!eraseMode);q('[data-erase]').classList.toggle('sel',eraseMode);
      for(const b of dialog.querySelectorAll('[data-mat]')){const t=b.dataset.mat;
        b.textContent=this.MATS[t].label+' ×'+(s.inv[t]??0);}
      q('[data-cross]').disabled=!(s.status==='playing'&&s.phase==='build');
      const st=this.STAGES[s.stage];
      q('[data-disarm]').hidden=!(s.phase==='disarmWait'||s.phase==='disarm');
      q('[data-complete]').hidden=s.status!=='won';};
    const frame=now=>{if(closed)return;if(!current()||!dialog.isConnected){close();return;}
      if(last&&!manualPause&&!this.paused()&&s.status==='playing')this.advance(s,(now-last)/1000/(s.phase==='cross'?4:1));
      last=now;draw();upd();raf=requestAnimationFrame(frame);};
    raf=requestAnimationFrame(frame);upd();
    return true;
  },
  close(){this.closeActive?.();}
};
