/* Chapter 4 command map, shared by the game and the local preview. */
(() => {
  const M=window.ChishuiManeuver;
  const key='chishuiManeuverV1';
  const xy=id=>M.places[id].slice(1);
  const name=id=>M.places[id][0];
  const game=()=>typeof GameState==='undefined'?null:GameState;
  const owner=()=>`${typeof PlayerProfiles40==='undefined'?'default':PlayerProfiles40.id}:${!!window.MainlineDemo?.active}`;
  function squadPosition(unit) {
    const [x,y]=xy(unit.at);
    if(!unit.leg)return [x,y];
    const [tx,ty]=xy(unit.leg.to),duration=M.edge(unit.at,unit.leg.to)[2];
    const part=1-unit.leg.left/duration;
    return [x+(tx-x)*part,y+(ty-y)*part];
  }
  const text=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  const button=(id,label,attrs='')=>`<button type="button" data-cf="${id}" ${attrs}>${label}</button>`;
  const relief=new URL('../assets/geography/chishui-relief.webp',document.currentScript.src).href;
  let active;

  function guide(b) {
    const s=b.state, main=s.squads.main, screen=s.squads.screen;
    if(s.outcome==='won')return ['结算','记录结果，或打开行军记录对照敌军何时封口。'];
    if(s.outcome==='failed')return ['复盘','展开行军记录，找出在哪里耽搁或接敌，再重开尝试。'];
    if(b.scouting)return ['核验敌情','点一个亮圈，派出侦察。推进后，留意回报写的是哪个地点、哪个时段。'];
    if(!s.tick&&!main.route.length)return ['先给主力连线','主力已经选中。点地图上发亮的「茅台东岸」给主力定下第一站，再点「推进半日」。'];
    if(!s.wentWest)return ['第一步 · 西渡','主力要先过茅台。逐点连线可预排多段路线，虚线表示尚未走完的计划。'];
    if(!s.wentEast){
      if(s.guardDue>s.tick)return ['第二步 · 盯住调令','敌军还在渡口附近。比较守军开始西调的时段与主力到达时间，必要时停在山脊。'];
      if(!s.feintUsed&&screen.at==='gulin')return ['第二步 · 选择时机','牵制分队已到位。可释放信号调开二郎滩守军，也可把主力转向耗时更长的太平渡。'];
      return ['第二步 · 东返','比较二郎滩与太平渡。可派牵制分队去古蔺，也可先核验一个渡口。旧目击不代表现在仍有守军。'];
    }
    return ['第三步 · 摆脱追兵','主力已经东返。看最新敌情，选择东岸山口或南侧谷地，把主力带到南下通道。'];
  }

  function chart(b) {
    const s=b.state,u=s.squads[b.squad],finished=s.outcome!=='active';
    const reachable=b.scouting?M.crossing:new Set(M.destinations(u.route.at(-1)||u.leg?.to||u.at,b.squad));
    function line(points, style) {
      if(points.length<2)return '';
      const path=points.map(point=>point.join(',')).join(' ');
      const arrows=points.slice(1).map(([x,y],i)=>{
        const [fromX,fromY]=points[i], dx=x-fromX, dy=y-fromY;
        if(Math.hypot(dx,dy)<24)return '';
        const angle=Math.atan2(dy,dx)*180/Math.PI;
        return `<path class="cf-arrow" d="M-7-5 L4 0 -7 5Z" transform="translate(${fromX+dx*.62} ${fromY+dy*.62}) rotate(${angle})"/>`;
      }).join('');
      return `<g class="cf-line ${style}" aria-hidden="true"><polyline class="cf-line-shadow" points="${path}"/><polyline class="cf-line-ink" points="${path}"/>${arrows}</g>`;
    }
    const contacts=Object.entries(finished?Object.fromEntries(Object.entries(s.enemy).map(([id,u])=>[id,{at:u.at,tick:s.tick}])):s.sightings);
    const main=s.squads.main, screen=s.squads.screen;
    const firstHint=!s.tick&&!main.route.length&&!b.scouting&&b.squad==='main';
    const plan=unit=>[squadPosition(unit),...(unit.leg?[xy(unit.leg.to)]:[]),...unit.route.map(xy)];
    return `<svg class="cf-map" viewBox="0 0 780 370" aria-label="三渡接四渡推演地图">
      <rect width="780" height="370" fill="#303c2e"/><image href="${relief}" width="780" height="370" preserveAspectRatio="none"/>
      <rect width="780" height="370" fill="#16271c" opacity=".13"/>
      <path d="M417 -7l7 19-2 18 9 20-10 16-22 17-1 12 12 19-13 19 10 19-6 20 12 13 11 12-5 16 13 18 7 27-10 16 4 18-14 20 5 18 14 20-2 22 16 14" fill="none" stroke="#7fa7af" stroke-width="8" stroke-linejoin="round"/><path d="M417 -7l7 19-2 18 9 20-10 16-22 17-1 12 12 19-13 19 10 19-6 20 12 13 11 12-5 16 13 18 7 27-10 16 4 18-14 20 5 18 14 20-2 22 16 14" fill="none" stroke="#c9ddd7" stroke-width="2" stroke-linejoin="round"/>
      <text class="cf-river" x="412" y="159" transform="rotate(71 412 159)">赤 水 河</text>
      ${contacts.map(([,seen])=>{const [x,y]=xy(seen.at);return `<ellipse class="cf-zone ${seen.tick===s.tick?'cf-zone-now':''}" cx="${x}" cy="${y}" rx="54" ry="31"/>`;}).join('')}
      <text class="cf-map-caption" x="30" y="40">川南 / 赤水河西岸</text><text class="cf-map-caption" x="498" y="40">黔北 / 赤水河东岸</text>
      ${M.edges.map(([a,c,n,river])=>{const [x,y]=xy(a),[xx,yy]=xy(c);return `<line class="${river?'cf-crossing':'cf-road'}" x1="${x}" y1="${y}" x2="${xx}" y2="${yy}"/><text class="cf-cost" x="${(x+xx)/2}" y="${(y+yy)/2-5}">${n>1?n+' 时段':''}</text>`;}).join('')}
      ${b.showHistory?line(['camp','east','west','ridge','gulin'].map(xy),'cf-historical')+line(['gulin','erW','erE','pass','exit'].map(xy),'cf-historical'):''}
      ${line(s.screenTrail.map(xy),'cf-screen-trail')}
      ${line([...s.mainTrail.map(xy),...(main.leg?[squadPosition(main)]:[])],'cf-trail')}
      ${firstHint?line(['camp','east'].map(xy),'cf-first-march'):''}
      ${line(plan(main),'cf-main-plan')}${line(plan(screen),'cf-screen-plan')}
      ${Object.entries(M.places).map(([id,[label,x,y]])=>{
        const enabled=reachable.has(id) && !finished;
        return `<g class="cf-node ${enabled?'cf-reachable':''}" data-place="${id}" role="button" tabindex="${enabled?0:-1}" aria-disabled="${!enabled}" aria-label="${label}"><circle class="cf-hit" cx="${x}" cy="${y}" r="22"/><circle cx="${x}" cy="${y}" r="${enabled?8:5}"/><text x="${x}" y="${y+29}">${label}</text>${s.checked[id]!==undefined?`<text class="cf-check" x="${x}" y="${y-17}">已查 · ${s.checked[id]}</text>`:''}</g>`;
      }).join('')}
      ${Object.entries(s.squads).map(([id,p])=>{
        const [x,y]=squadPosition(p), offset=id==='screen'?-12:12, previous=b.previous?.[id];
        const motion=previous && (previous[0]!==x || previous[1]!==y) && !matchMedia('(prefers-reduced-motion: reduce)').matches;
        return `<g class="cf-token cf-${id}" aria-hidden="true" transform="translate(${x} ${y})">${motion?`<animateTransform attributeName="transform" type="translate" from="${previous.join(' ')}" to="${x} ${y}" dur=".25s"/>`:''}<rect x="${offset-10}" y="-24" width="20" height="19" rx="3"/><text x="${offset}" y="-10">${id==='main'?'主':'牵'}</text></g>`;
      }).join('')}
      ${contacts.map(([id,seen])=>{const [x,y]=xy(seen.at);return `<g class="cf-contact ${seen.tick===s.tick?'cf-fresh':''}" aria-hidden="true"><path d="M${x-24} ${y-24}l8-8 8 8-8 8z"/><text x="${x-16}" y="${y-21}">${id==='guard'?'守':'追'}</text></g>`;}).join('')}
      </svg>`;
  }

  function render(b,focus) {
    const s=b.state,u=s.squads[b.squad],finished=s.outcome!=='active';
    const scroll=b.root.querySelector('.cs-scroll')?.scrollTop||0;
    const logOpen=finished||b.root.querySelector('.cf-log')?.open;
    const helpOpen=b.root.querySelector('.cf-help')?.open;
    const [guideTitle,guideText]=guide(b);
    const route=[u.at,...(u.leg?[u.leg.to]:[]),...u.route].map(name).join(' → ');
    const start=b.scouting?'选择要核验的渡口或山口。回报只能确认抵达当时的情况。':`从${name(u.route.at(-1)||u.leg?.to||u.at)}继续连线。亮圈表示下一处可到达的地点。`;
    b.root.innerHTML=`<header class="cs-header"><div><span>第 04 章 / 半日推演</span><h2 id="cf-title">赤水河 <i>·</i> 东返窗口</h2></div>${button('close','保存并返回 · Esc','data-close')}</header>
      <div class="cs-scroll"><div class="cf-strip"><b>${s.challenge?'变局 / 情报迟到':'标准局 / 三渡接四渡'}</b><span>时段 <strong>${s.tick}</strong></span><span>余粮 <strong>${s.supply}</strong></span><span>队伍状态 <strong>${s.readiness}/4</strong></span><span>${s.wentEast?'已东返 · 前往南下通道':s.wentWest?'已西渡 · 寻找东返机会':'第一步 · 主力先过茅台'}</span></div>
      <div class="cf-guide"><div><b>${guideTitle}</b><p>${guideText}</p></div><details class="cf-help" ${helpOpen?'open':''}><summary>玩法指南</summary><ol><li>选主力或牵制分队，拖过亮圈或逐点连线。实线是主力走过的路。</li><li>推进半日消耗一份补给。停在安全地点等回报，或核验渡口后改令。</li><li>点地图上的「南下通道」只是下令。主力完成西渡、东返并实际抵达才获胜。</li></ol></details></div>
      <div class="cf-layout"><section class="cs-chart cf-chart"><div class="cs-section-head"><div><span>作战地图 / 教学示意</span><h3>赤水河两岸态势</h3><a class="cf-review-link" href="films/chishui-review/" target="_blank" rel="noopener">▶ 四渡赤水 · 卫星沙盘复盘</a></div>${button('history',b.showHistory?'收起史实路线':'显示史实路线',`aria-pressed="${!!b.showHistory}"`)}</div>
      <div class="cs-paper">${chart(b)}</div><p class="cf-route-legend"><span class="cf-key-done">主力已走</span><span class="cf-key-main">主力计划</span><span class="cf-key-screen-done">牵制已走</span><span class="cf-key-screen">牵制计划</span>${!s.tick&&!s.squads.main.route.length&&!b.scouting&&b.squad==='main'?'<span class="cf-key-first">第一段引导</span>':''}${b.showHistory?'<span class="cf-key-history">史实方向示意</span>':''}</p><p class="cf-legend"><span>◆ 本时段敌情</span><span>◇ 最后目击</span> · 空白地区仍未知</p>
      <div class="cf-status" role="status">${text(b.message||s.event||`主力在${name(s.squads.main.at)}。可继续推进或改令。`)}</div>
      </section><aside class="cs-orders cf-orders"><span class="cs-kicker">行军命令</span><h3>${finished?(s.outcome==='won'?'队伍已脱离围堵':'本次机动中断'):'先部署，再推进'}</h3>
      ${finished ? `<p>展开行军记录，核对接敌位置与情报到达时机。</p><div class="cs-order-actions">${s.outcome==='won'?button('complete','记录结果 · 返回','class="cs-primary"'):''}${button('retry','重开本局')}${button('variant',s.challenge?'重开标准局':'试试情报迟到的变局')}</div>`:
      `<p>主力需西渡、东返，再抵达南下通道。每次推进消耗一份补给，途中可重画尚未出发的路线。</p>
      <div class="cs-order-actions">${button('main','主力纵队',`aria-pressed="${b.squad==='main'&&!b.scouting}"`)}${button('screen','牵制分队',`aria-pressed="${b.squad==='screen'&&!b.scouting}"`)}</div>
      <p class="cf-route">${route}${u.leg?`<br><small>正在行进 · 还需 ${u.leg.left} 时段到达${name(u.leg.to)}</small>`:''}</p><p>${start}</p><div class="cs-order-actions">${button('undo','撤掉末点',u.route.length?'':'disabled')}${button('hold',u.leg?'停在下一落脚点':'原地待命',u.route.length?'':'disabled')}</div>
      <div class="cs-order-actions">${button('scout',s.rumor?`侦察回报 · 时段 ${s.rumor.due}`:`派侦察 · 余 ${s.scouts} 次`,`${s.scouts?'':'disabled'} aria-pressed="${b.scouting}"`)}${button('feint',s.feintUsed?'西调信号已部署':'在古蔺留下迹象',s.squads.screen.at==='gulin'&&!s.squads.screen.leg&&!s.feintUsed?'':'disabled')}</div>
      ${s.rules>=2&&s.wentWest&&!s.wentEast?`<div class="cs-order-actions">${button('swift','快速东渡',`aria-pressed="${s.pace==='swift'}"`)}${button('covered','隐蔽东渡',`aria-pressed="${s.pace==='covered'}"`)}</div><p>${s.pace==='covered'?'隐蔽东渡多花一时段和一份补给，减少暴露。':'快速东渡按地图时间行进，追兵可能追向暴露的渡口。'}</p>`:''}
      ${!s.feintUsed&&s.squads.screen.at!=='gulin'?'<p>牵制分队抵达古蔺方向后可释放信号。</p>':''}
      <div class="cs-order-actions">${button('advance','推进半日','class="cs-primary"')}${button('fast','推进至下份战报')}${s.tick===0?button('variant',s.challenge?'切回标准局':'挑战：情报迟到'):''}</div>`}
      ${b.checkpoint>=0?`<div class="cs-order-actions">${button('rewind','回到上次推进前')}</div>`:''}
      ${finished&&s.log.length&&typeof DecisionCinema!=='undefined'?`<div class="cs-order-actions">${button('film','回看本章映像')}</div>`:''}
      </aside></div>
      <details class="cs-section cf-log" ${logOpen?'open':''}><summary>行军记录 · ${s.log.length} 个时段</summary><ol>${[...s.log].reverse().map(r=>`<li><b>时段 ${r.tick}</b> · ${text(r.event)}${finished?` <small>守军：${name(r.positions.guard)} · 追兵：${name(r.positions.pursuit)}</small>`:''}</li>`).join('')}</ol></details>
      <details class="cs-section cf-log"><summary>史实对照</summary><p>中央红军三渡赤水，把敌军主力引向河西，随后折返东渡，向南机动。<a href="https://www.81.cn/2018byzt/2018-07/31/content_9238267.htm" target="_blank" rel="noopener">中国军网《四渡赤水战役》 ↗</a></p><p>本关路线、补给、守军部署和半日节奏是教学推演设定。</p>${game()?button('classic','查看完整四渡档案与旧版推演'):''}</details></div>
      <footer class="cs-footer">底纹依据 SRTM 高程渲染。河道、路线与敌情为教学示意，未与底纹地理配准。</footer>`;
    b.root.querySelector('.cs-scroll').scrollTop=scroll;
    b.previous=null;
    if(focus) b.root.querySelector(focus)?.focus({preventScroll:true});
  }

  function save(b) {
    const gs=game();
    if(!gs || owner()!==b.owner)return;
    gs.storyPreparations||={};gs.storyPreparations[key]={rules:b.state.rules,challenge:b.state.challenge,actions:b.actions,checkpoint:b.checkpoint};gs.save();
  }

  function record(b,command) {
    if(!M.queue(b.state,command))return false;
    b.actions.push(command);save(b);return true;
  }

  function close() {
    const b=active;if(!b)return;
    active=null;
    if(typeof DecisionCinema!=='undefined'&&b.root.contains(DecisionCinema.root)) DecisionCinema.close();
    b.root.remove();if(b.trigger?.isConnected)b.trigger.focus({preventScroll:true});
  }

  function archive(b) {
    if(b.state.outcome!=='won')return;
    const gs=game(),s=b.state,score=Math.min(100,75+s.readiness*4+s.supply),rating='完成东返机动';
    if(gs){
      const old=gs.storyPreparations.sidu67_4;
      if(!(old?.score>=score))gs.storyPreparations.sidu67_4={score,rating,completedAt:new Date().toISOString()};
      gs.storyPreparations.chishuiManeuverResult={score,route:s.mainTrail,turns:s.tick};
      delete gs.storyPreparations[key];gs.recordBattleScore(4,score,rating);
    }
    close();b.onComplete?.();
  }

  function place(b,id) {
    if(owner()!==b.owner)return close();
    const u=b.state.squads[b.squad];
    const command=b.scouting?{type:'scout',at:id}:{type:'route',squad:b.squad,path:[...u.route,id]};
    if(!record(b,command))return;
    if(b.scouting){b.message=`已派侦察核验${name(id)}。推进后等待回报。`;b.scouting=false;}
    else b.message=`${M.titles[b.squad]}已加入途经点：${name(id)}。`;
    render(b,`[data-place="${id}"]`);
  }

  function click(b,id) {
    if(owner()!==b.owner||id==='close')return close();
    if(id==='complete')return archive(b);
    if(id==='classic')return window.ChishuiBoard.openClassic(b.node,b.onComplete);
    if(id==='film')return DecisionCinema.play(b.node,`四渡赤水，主力经${b.state.mainTrail.map(name).join('、')}转移`,{kind:'fixed_decision',userInitiated:true,container:b.root,isCurrent:()=>active===b});
    b.message='';
    if(id==='retry'||id==='variant'){b.state=M.create(id==='variant'?!b.state.challenge:b.state.challenge);b.actions=[];b.checkpoint=-1;b.scouting=false;save(b);}
    if(id==='main'||id==='screen'){b.squad=id;b.scouting=false;}
    if(id==='history')b.showHistory=!b.showHistory;
    if(id==='scout')b.scouting=!b.scouting;
    if(id==='swift'||id==='covered')record(b,{type:'pace',value:id});
    if(id==='undo'||id==='hold')record(b,{type:'route',squad:b.squad,path:id==='hold'?[]:b.state.squads[b.squad].route.slice(0,-1)});
    if(id==='feint'&&record(b,{type:'feint'}))b.message='牵制分队将在下一时段留下诱导迹象。';
    if(id==='rewind'&&b.checkpoint>=0){b.actions=b.actions.slice(0,b.checkpoint);b.state=M.restore(b.state.challenge,b.actions,b.state.rules);b.checkpoint=-1;b.scouting=false;save(b);}
    if(id==='advance'||id==='fast'){
      b.checkpoint=b.actions.length;b.scouting=false;
      b.previous=Object.fromEntries(Object.entries(b.state.squads).map(([id,u])=>[id,squadPosition(u)]));
      for(let i=0;i<(id==='fast'?3:1);i++){
        if(!M.step(b.state))break;
        b.actions.push({type:'step'});
        if(b.state.event || Object.values(b.state.squads).every(u=>!u.leg&&!u.route.length)&&!b.state.rumor)break;
      }
      save(b);
    }
    render(b,`[data-cf="${id}"]:not(:disabled)`);
  }

  function open(node={id:4,name:'四渡赤水'},onComplete) {
    close();
    const root=document.createElement('dialog');root.className='chishui-board chishui-field';root.setAttribute('aria-labelledby','cf-title');
    const saved=game()?.storyPreparations?.[key],actions=Array.isArray(saved?.actions)?saved.actions.slice(0,400):[];
    const b=active={node,onComplete,root,owner:owner(),trigger:document.activeElement,squad:'main',scouting:false,actions,
      state:M.restore(!!saved?.challenge,actions,saved&&saved.rules!==2?1:2),checkpoint:Number.isInteger(saved?.checkpoint)&&saved.checkpoint<actions.length?saved.checkpoint:-1};
    root.addEventListener('click',ev=>{
      const button=ev.target.closest('[data-cf]');if(button&&!button.disabled)return click(b,button.dataset.cf);
      const point=ev.target.closest('[data-place]');if(point&&performance.now()>(b.ignoreClick||0))place(b,point.dataset.place);
    });
    root.addEventListener('keydown',ev=>{const p=ev.target.closest('[data-place]');if(p&&[' ','Enter'].includes(ev.key)){ev.preventDefault();place(b,p.dataset.place);}});
    root.addEventListener('pointerdown',ev=>{const p=ev.target.closest('.cf-reachable');if(!ev.isPrimary||ev.button!==0)return;b.ignoreClick=0;if(!b.scouting&&p)b.drag={id:ev.pointerId,point:p.dataset.place,x:ev.clientX,y:ev.clientY,moved:false};});
    root.addEventListener('pointermove',ev=>{
      const d=b.drag;if(d?.id!==ev.pointerId||!ev.buttons)return;
      if(!d.moved&&Math.hypot(ev.clientX-d.x,ev.clientY-d.y)>6){d.moved=true;root.setPointerCapture(ev.pointerId);place(b,d.point);}
      if(d.moved){const p=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.cf-reachable');if(p&&p.dataset.place!==d.point){d.point=p.dataset.place;place(b,d.point);}}
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(event,ev=>{if(b.drag?.id===ev.pointerId){if(b.drag.moved)b.ignoreClick=performance.now()+250;b.drag=null;}});
    root.addEventListener('cancel',ev=>{ev.preventDefault();if(active===b)close();});root.addEventListener('close',()=>{if(active===b)close();});
    document.body.append(root);render(b);root.showModal();return true;
  }

  window.ChishuiField={open,close};
})();
