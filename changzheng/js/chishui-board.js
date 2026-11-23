/* The campaign, walking task and preview use the same board and simulation. */
(() => {
  const T = window.ChishuiTactics;
  const resource = 'chishuiTacticsV2';
  const roundNames = ['一渡', '二渡', '三渡', '四渡'];
  const force = id => T.forces.find(f => f.id === id);
  const region = id => T.regions[id][0].split(' · ').at(-1);
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const project = ([lon, lat]) => [Math.round(44 + (lon - 104.85) * 253), Math.round(27 + (28.82 - lat) * 169)];
  const regionPoint = id => project(T.regions[id].slice(1));
  const game = () => typeof GameState !== 'undefined' ? GameState : null;
  const button = (action, label, extra = '') => `<button type="button" data-cs="${action}" ${extra}>${label}</button>`;
  const selected = value => `aria-pressed="${!!value}"`;
  const profile = () => (typeof PlayerProfiles40 !== 'undefined' ? PlayerProfiles40.id : 'default') + ':' + !!window.MainlineDemo?.active;
  let active = null;

  function mapMarkup(board) {
    const { geo, facts, state } = board;
    const fordPoint = id => { const row = geo[T.fords[id]?.geo]; return row ? project([row.lon, row.lat]) : null; };
    const path = (points, cls) => points.length > 1 ? `<polyline class="${cls}" points="${points.map(point => point.join(',')).join(' ')}"/>` : '';
    const point = (xy, label, offset = [0, -13], cls = '') => `<g class="cs-point ${cls}"><circle cx="${xy[0]}" cy="${xy[1]}" r="4"/><text x="${xy[0] + offset[0]}" y="${xy[1] + offset[1]}">${label}</text></g>`;
    const waters = [
      [[105.03, 28.33], [105.46, 28.52], [106.10, 28.69], [106.85, 28.59], [107.60, 28.80]],
      [[105.39, 27.03], [105.83, 26.99], [106.31, 27.13], [106.78, 27.16], [107.23, 27.21], [107.62, 27.30]],
      [[104.94, 26.61], [105.10, 26.88], [105.29, 27.07], [105.27, 27.35]]
    ];
    const redRiver = [[105.16, 27.99], [105.44, 27.98], [105.68, 27.88], [106.01, 27.83], [106.3738, 27.8604], [106.34, 28.02], [106.1648, 28.1562], [106.0401, 28.1412], [106.0026, 28.2764], [105.80, 28.43], [105.74, 28.59]];
    const offsets = { tucheng: [-16,-13], taiping: [-67,20], erlang: [19,7], maotai: [14,21] };
    const places = [[105.66,28.04,'叙永'],[105.81,28.19,'古蔺'],[105.05,27.87,'扎西'],[106.88,28.04,'娄山关'],[106.92,27.73,'遵义'],[106.09,27.53,'鲁班场'],[106.10,27.45,'苟坝'],[106.64,26.65,'贵阳']];
    const history = (facts?.timeline || []).slice(0, board.replay).flatMap(f => f.route.map(item => typeof item === 'string' ? fordPoint(item) : project(item))).filter(Boolean);
    const player = [project([106.92,27.73]), ...state.history.map(h => fordPoint(h.ford)).filter(Boolean)];
    const positions = new Map();
    for (const piece of state.forces) {
      if (!positions.has(piece.location)) positions.set(piece.location, []);
      positions.get(piece.location).push(piece);
    }
    const pieces = [...positions].map(([id, occupants]) => {
      const [x,y] = regionPoint(id);
      return `<g><circle class="cs-sector" cx="${x}" cy="${y}" r="${17 + occupants.length * 3}"/>${occupants.map((p,i) => `<rect class="cs-piece" x="${x + (i - (occupants.length-1)/2) * 11 - 4}" y="${y - 11}" width="8" height="8" rx="1"><title>${force(p.id).name} · ${region(id)}</title></rect>`).join('')}</g>`;
    }).join('');
    return `<svg class="cs-map" viewBox="0 0 790 435" role="img" aria-label="四渡赤水推演示意图，显示渡口、当前兵力和两条路线">
      <defs><pattern id="cs-grid" width="45" height="45" patternUnits="userSpaceOnUse"><path d="M45 0H0V45" fill="none" stroke="#776952" stroke-opacity=".14"/></pattern></defs>
      <rect width="790" height="435" fill="#e7dbba"/><rect width="790" height="435" fill="url(#cs-grid)"/>
      <g class="cs-contours" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => `<path d="M${-42 + i*26} -20 Q${167+i*19} ${170+i*9} ${26+i*27} 260 T${80+i*28} 470 M${562+i*28} -30 Q${426+i*29} 177 ${604+i*25} 282 T${535+i*28} 463"/>`).join('')}</g>
      ${waters.map(line => path(line.map(project), 'cs-water')).join('')}${path(redRiver.map(project), 'cs-river')}
      <g class="cs-water-label"><text x="505" y="48">长 江</text><text x="593" y="283">乌 江</text><text x="43" y="323">金 沙 江</text><text x="277" y="182">赤 水 河</text></g>
      ${pieces}${places.map(([lon,lat,name]) => point(project([lon,lat]), name, name === '鲁班场' ? [-57,-7] : name === '苟坝' ? [9,6] : [0,-13])).join('')}
      ${path(history,'cs-history')}${path(player,'cs-player')}
      ${history.length ? `<circle class="cs-history-stop" cx="${history.at(-1)[0]}" cy="${history.at(-1)[1]}" r="5"/>` : ''}
      ${Object.entries(T.fords).map(([id, f]) => {const xy = fordPoint(id); return xy ? point(xy,f.name,offsets[id],board.draft.ford === id ? 'cs-ford cs-chosen' : 'cs-ford') : '';}).join('')}
      <g class="cs-compass"><path d="M749 63l-7 18 7-4 7 4z"/><text x="749" y="54">北</text></g>
      </svg>`;
  }

  function report(board) {
    const last = board.state.history.at(-1);
    if (!last) return '<div class="cs-empty">提交第一轮行动后，这里会展开敌方判断和调令。</div>';
    const marks = Object.entries(last.observed).filter(([, weight]) => weight > 0).map(([id]) => region(id));
    const orders = last.orders.map(item => `${force(item.id).name} → ${region(item.target)}（第 ${item.due} 日）`);
    const arrived = last.arrived.map(item => `${force(item.id).name}已抵达${region(item.target)}`);
    return `<div class="cs-causal">
      <section><b>01 / 敌方观测</b><p>${marks.length ? marks.join('、')+'出现活动迹象。' : '未收到新的明显活动信号。'}</p></section>
      <section><b>02 / 下达调令</b><p>${orders.length ? orders.join('；') : '本轮没有新的跨区调令。'}</p></section>
      <section><b>03 / 实际抵达</b><p>${arrived.length ? arrived.join('；') : '本轮没有调令抵达。'}</p></section>
    </div><p class="cs-muted">${last.verified ? '核验结果：青杠坡原回报低估守备，已调整行动准备。' : board.state.round === 1 ? '未复核青杠坡回报，队伍承担了额外压力。' : `本次由${T.fords[last.ford].name}渡河。`} 队伍状态 −${last.strain}，补给 −${last.cost}（模拟值）。</p>`;
  }

  function cardMarkup(board) {
    const committed = board.state.history.at(-1)?.committed || [];
    return T.forces.map(f => {
      const piece = board.state.forces.find(p => p.id === f.id), split = committed.find(c => c.id === f.id);
      const top = Object.entries(piece.beliefs).sort((a,b) => b[1]-a[1]);
      return `<details class="cs-force"><summary><span><b>${f.name}</b><small>${f.focus}</small></span><span class="cs-force-state">${piece.pending ? `调令在途 · 第 ${piece.pending.due} 日` : `驻${region(piece.location)}`}</span></summary>
        <p>本区 ${piece.location === f.home ? f.size : split?.reserve || 0} / 出界 ${piece.location === f.home ? 0 : split?.strength || 0}（模拟值） · 调令 ${f.delay} 日</p>
        ${piece.pending ? `<p>调往${region(piece.pending.target)}，尚未抵达。</p>` : ''}
        ${top.length ? `<div class="cs-beliefs">${top.map(([id, value]) => `<label><span>${region(id)}</span><meter min="0" max="100" value="${value}">${value}%</meter><span>${Math.round(value)}%</span></label>`).join('')}</div>` : '<p>首轮行动后显示判断分布。</p>'}</details>`;
    }).join('');
  }

  function historyMarkup(board) {
    const f = board.facts;
    if (!f) return '';
    return `<section class="cs-section" id="cs-history"><div class="cs-section-head"><div><span>档案 02</span><h3>推演路线与史实</h3></div>${button('replay','播放史实路线')}</div>
      <div class="cs-steps">${f.timeline.map((step,i) => `<article ${board.replay === i+1 ? 'class="cs-now"' : ''}><small>${safe(step.date)}</small><h4>${safe(step.title)}</h4><p>${safe(step.text)}</p>${step.round && board.state.history[step.round-1] ? `<p class="cs-compare">你的第 ${step.round} 轮：${T.fords[board.state.history[step.round-1].ford].name} · ${board.state.history[step.round-1].arrived.length} 支敌军抵达新驻区</p>` : ''}<a href="${safe(f.sources[step.refId][1])}" target="_blank" rel="noopener">${safe(f.sources[step.refId][0])} ↗</a></article>`).join('')}</div>
      <details class="cs-quiz"><summary>史实研判 · ${f.learning.length} 题</summary>${f.learning.map((step,i) => `<fieldset><legend>${safe(step.question)}</legend><p>${safe(step.text)}</p>${step.options.map((option,j) => button(`answer:${i}:${j}`,safe(option),selected(board.answers[i] === j))).join('')}<p data-answer="${i}" role="status"></p></fieldset>`).join('')}</details></section>`;
  }

  function render(board, focus) {
    const { root, state, draft } = board;
    const last = state.history.at(-1), r = Math.min(state.round,3), finished = state.round >= 4 || state.outcome === 'failed';
    const scroller = root.querySelector('.cs-scroll'), scroll = scroller?.scrollTop || 0;
    const opened = [...root.querySelectorAll('.cs-force')].map(item => item.open);
    const quizOpen = root.querySelector('.cs-quiz')?.open;
    const forecast = board.cipher && draft.ford && !finished ? T.resolve(state,draft)?.history.at(-1) : null;
    const forecastText = forecast ? `教学译报纸 · 按目前方案，预计有 ${forecast.orders.length} 道新调令，渡口压力 ${forecast.pressure}（模拟值）。` : '';
    root.innerHTML = `<header class="cs-header"><div><span>第 04 章 / 长征推演档案</span><h2 id="cs-title">四渡赤水 <i>·</i> 战役推演室</h2></div>${button('close','返回场景 · Esc','data-close')}</header>
      <div class="cs-scroll"><div class="cs-overview"><nav aria-label="行动阶段">${roundNames.map((name,i) => `<span class="${i===r?'cs-current':i<state.round?'cs-past':''}">${String(i+1).padStart(2,'0')} ${name}</span>`).join('')}</nav><div class="cs-metrics"><span>模拟日 <b>${state.day}</b></span><span>补给 <b>${state.supply}</b></span><span>队伍状态 <b>${state.readiness}</b></span></div></div>
      ${!board.geo ? `<div class="cs-loading" role="status">${board.error ? '渡口资料未能载入。'+button('load','重试') : '正在展开赤水河推演图…'}</div>` : `<div class="cs-layout">
      <section class="cs-chart"><div class="cs-section-head"><div><span>战区图 / 川滇黔</span><h3>赤水河两岸</h3></div><button type="button" data-cs="toggle-history" ${selected(board.replay)}>史实路线</button></div>
        <div class="cs-paper">${mapMarkup(board)}</div><div class="cs-legend"><span>● 推演路线</span><span>━ 史实示意</span><span>▪ 敌方驻区</span></div><p class="cs-map-note">渡口采用现代地物锚点，水系、行军线与驻区为教学示意。地物数据 © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors（ODbL）</a>。</p></section>
      <section class="cs-orders"><span class="cs-kicker">${finished?'行动回报':`本轮指令 / ${roundNames[r]}`}</span><h3>${finished ? state.outcome === 'won' ? '机动窗口已打开' : '机动窗口尚未打开' : ['核对情报，选择渡口','观察调令，择机东进','制造信号，隐藏主力','穿过空隙，调开滇军'][r]}</h3>
        <p>${finished ? state.outcome === 'won' ? '滇军已调离原防区，队伍仍有行动能力。' : !state.supply || !state.readiness ? '本局补给或队伍状态耗尽。' : '四轮已结束，滇军仍未抵达贵阳方向。可复盘后重演。' : T.sides[r]}</p>
        ${finished ? `<div class="cs-order-actions">${state.outcome === 'won' ? button('complete',`记录成绩 ${T.score(state)} · 返回`,'class="cs-primary"') : ''}${button('reset','重新推演')}</div>` : `<fieldset><legend>01 / 选主力渡口</legend><div class="cs-options">${Object.entries(T.fords).map(([id,f]) => button(`ford:${id}`,f.name,selected(id===draft.ford))).join('')}</div></fieldset>
        <fieldset><legend>02 / 选择信号（可选，最多两项）</legend><div class="cs-options">${Object.entries(T.signals).filter(([,a]) => !a.last||r===3).map(([id,a]) => button(`signal:${id}`,`<b>${a.label}</b><small>${a.note}</small>`,`${selected(draft.signals.includes(id))} ${draft.signals.length>=2&&!draft.signals.includes(id)?'disabled':''}`)).join('')}</div></fieldset>
        <fieldset><legend>03 / 核验与时机</legend><div class="cs-options">${button('scout',r===0?'复核青杠坡 · +1 日':'派出侦察 · +1 日',selected(draft.scout))}${button('days',draft.days===3?'观察调令 · 3 日':'快速机动 · 2 日',`title="切换行动天数" ${selected(draft.days===3)}`)}</div></fieldset>
        ${board.cipher ? `<p class="cs-scout-note">${forecastText || '已取得教学译报纸。选定渡口后可预览本轮情报。'}</p>` : ''}
        <details class="cs-custom"><summary>补充指令（选填）</summary><textarea aria-label="补充行动指令" maxlength="300" placeholder="可用自己的话说明为什么这样安排">${safe(draft.custom)}</textarea><small>行动按上方选项结算。补充文字可用于 AI 解析和映像检索。</small></details>
        <div class="cs-order-actions">${button('submit','执行本轮行动','class="cs-primary"'+(!draft.ford?' disabled':''))}${button('example','填入示范方案')}</div>`}
      </section></div>
      <section class="cs-section"><div class="cs-section-head"><div><span>观察 01</span><h3>敌军调动与后果</h3></div>${last && typeof DecisionCinema !== 'undefined' ? button('film','检索本轮映像') : ''}</div>${report(board)}${last?.custom ? '<p class="cs-muted" data-cs-analysis></p>' : ''}<div class="cs-forces">${cardMarkup(board)}</div></section>${historyMarkup(board)}`}
      </div><footer class="cs-footer" role="status">${safe(board.note || '原创教学推演 · 防区、调令和数值为玩法设定，不代表历史部署。')}</footer>`;
    root.querySelector('.cs-scroll').scrollTop = scroll;
    root.querySelectorAll('.cs-force').forEach((item,i) => { item.open = !!opened[i]; });
    root.querySelector('.cs-custom')?.toggleAttribute('open',!!board.customOpen);
    if (quizOpen) root.querySelector('.cs-quiz')?.setAttribute('open','');
    for (const [index, value] of Object.entries(board.answers)) showAnswer(board,index,value);
    if (board.analysis) root.querySelector('[data-cs-analysis]')?.append(board.analysis);
    if (focus) (root.querySelector(`[data-cs="${focus}"]:not(:disabled)`) || root.querySelector('[data-cs="example"]') || root.querySelector('[data-cs="close"]')).focus({preventScroll:true});
  }

  function save(board) {
    const gs = game();
    if (!gs) return;
    gs.storyPreparations ||= {};
    gs.storyPreparations[resource] = { version: 2, history: board.state.history };
    gs.save();
  }

  function close(board = active) {
    if (!board || board !== active) return;
    active = null;
    if (typeof DecisionCinema !== 'undefined' && DecisionCinema.root && board.root.contains(DecisionCinema.root)) DecisionCinema.close();
    board.abort.abort();
    clearTimeout(board.timer);
    board.root.remove();
    if (board.trigger?.isConnected) board.trigger.focus({preventScroll:true});
  }

  async function load(board) {
    const url = new URL('../assets/', scriptURL);
    try {
      const [geo, facts] = await Promise.all(['geography/chishui-crossings.json', 'chapters92/source-facts.json'].map(path => fetch(new URL(path,url),{signal:board.abort.signal}).then(response => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })));
      if (active !== board) return;
      if (!geo.slice(0,4).every(row => Number.isFinite(row?.lon) && Number.isFinite(row?.lat)) || geo.length < 4 || !facts.chishui?.timeline?.length) throw new Error('Invalid Chishui data');
      board.geo = geo;
      board.facts = facts.chishui;
      if (typeof LEARNING_TASKS !== 'undefined') LEARNING_TASKS[4] = { kind:'战役路线研判', source: board.facts.sources.campaign[1], steps: board.facts.learning };
    } catch { board.error = true; }
    if (active === board) render(board);
  }

  function archive(board) {
    if (board.state.outcome !== 'won') return;
    const gs = game();
    const score = T.score(board.state), rating = score >= 90 ? '虚实相生' : '机动突围';
    if (gs) {
      const key = 'sidu67_4';
      gs.storyPreparations ||= {};
      if (!(gs.storyPreparations[key]?.score >= score)) gs.storyPreparations[key] = { score, rating, completedAt:new Date().toISOString() };
      gs.recordBattleScore(4,score,rating);
      delete gs.storyPreparations[resource];
      gs.save();
    }
    close(board);
    board.onComplete?.();
  }

  function command(last) {
    return [`${T.fords[last.ford].name}渡河`, ...last.signals.map(id => T.signals[id].label), last.scout?'复核情报':'',last.custom].filter(Boolean).join('；');
  }

  function submit(board) {
    if (board.draft.custom.trim() && typeof StudentInput66 !== 'undefined') {
      const checked = StudentInput66.check(board.draft.custom,300);
      if (!checked.ok) { board.root.querySelector('.cs-footer').textContent = checked.message; return; }
      board.draft.custom = checked.text;
    }
    const next = T.resolve(board.state,board.draft);
    if (!next) return;
    const last = next.history.at(-1), text = command(last);
    board.state = next;
    board.draft = newDraft();
    board.customOpen = false;
    board.analysis = '';
    board.note = `${roundNames[next.round-1]}已记录。${last.orders.length} 道新调令，${last.arrived.length} 支部队抵达新驻区。`;
    save(board);
    game()?.recordStrategicDecision?.({ nodeId:4, nodeName:board.node.name, command:text, videoKind:last.custom?'custom_decision':'fixed_decision', videoHandled:true, modules:last.signals, resourceDelta:{food:-last.cost,stamina:-last.strain}, outcome:'教学推演已记录' });
    render(board,next.outcome==='won'?'complete':next.outcome==='failed'?'reset':'example');
    if (!last.custom || typeof apiRequest !== 'function') return;
    const display = text => {
      if (active !== board || board.owner !== profile() || board.state !== next) return;
      board.analysis = text;
      const output = board.root.querySelector('[data-cs-analysis]');
      if (output) output.textContent = text;
    };
    display('正在解析补充指令，推演可继续。');
    Promise.resolve().then(() => apiRequest('/battle/parse',{command:text},15000,board.abort.signal)).then(result => {
      const hint = result?.narrative_hint || result?.description || result?.suggestion;
      display(typeof hint === 'string' && !result.degraded ? `AI 解析 · ${hint}` : 'AI 未返回补充解析，本轮结算已记录。');
    }).catch(() => display('AI 未返回补充解析，本轮结算已记录。'));
  }

  function refreshMap(board) {
    board.root.querySelector('.cs-map').outerHTML = mapMarkup(board);
    board.root.querySelector('[data-cs="toggle-history"]').setAttribute('aria-pressed',String(!!board.replay));
    board.root.querySelectorAll('.cs-steps article').forEach((row,i) => row.classList.toggle('cs-now',i+1===board.replay));
  }

  function showAnswer(board, index, value) {
    const output = board.root.querySelector(`[data-answer="${index}"]`);
    if (output) output.textContent = value === board.facts.learning[index].answer ? '判断正确。' : '再看看本题材料与行动条件。';
  }

  function handle(board, target) {
    const [action, key, value] = target.dataset.cs.split(':');
    const draft = board.draft;
    if (board.owner !== profile()) return close(board);
    if (action === 'close') return close(board);
    if (action === 'load') { board.error = false; render(board); return load(board); }
    if (action === 'submit') return submit(board);
    if (action === 'complete') return archive(board);
    if (action === 'film') {
      const last = board.state.history.at(-1);
      return DecisionCinema.play(board.node,command(last),{kind:last.custom?'custom_decision':'fixed_decision',userInitiated:true,container:board.root,isCurrent:()=>active===board && board.owner===profile()});
    }
    if (action === 'toggle-history' || action === 'replay') {
      clearTimeout(board.timer);
      const end = board.facts.timeline.length;
      const animate = action === 'replay' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
      board.replay = animate ? 1 : action === 'toggle-history' && board.replay ? 0 : end;
      if (action === 'replay') board.root.querySelector('.cs-paper').scrollIntoView({block:'nearest'});
      refreshMap(board);
      if (animate) {
        const step = () => { if (active !== board || board.replay >= end) return; board.replay++; refreshMap(board); board.timer = setTimeout(step,1100); };
        board.timer = setTimeout(step,1100);
      }
      return;
    }
    if (action === 'answer') {
      board.answers[key] = Number(value);
      target.parentElement.querySelectorAll('button').forEach(option => option.setAttribute('aria-pressed',String(option===target)));
      showAnswer(board,key,Number(value));
      return;
    }
    if (action === 'reset') { board.state = T.create(); board.draft = newDraft(); board.note = ''; board.analysis = ''; save(board); }
    if (action === 'example') { const sample = T.plans[board.state.round]; board.draft = {...draft,...sample,signals:[...sample.signals]}; }
    if (action === 'ford') draft.ford = key;
    if (action === 'signal') draft.signals = draft.signals.includes(key) ? draft.signals.filter(id => id!==key) : [...draft.signals,key];
    if (action === 'scout') draft.scout = !draft.scout;
    if (action === 'days') draft.days = draft.days === 3 ? 2 : 3;
    render(board,target.dataset.cs);
  }

  const scriptURL = document.currentScript.src;
  const newDraft = () => ({ ford:'', signals:[], days:2, scout:false, custom:'' });
  function open(node = {id:4,name:'四渡赤水'}, onComplete) {
    close();
    const root = document.createElement('dialog');
    root.className = 'chishui-board';
    root.setAttribute('aria-labelledby','cs-title');
    const board = active = { root,node,onComplete, owner:profile(), cipher:!!game()?.storyPreparations?.cipher73_4?.score, state:T.restore(game()?.storyPreparations?.[resource]), draft:newDraft(), replay:0, answers:{}, abort:new AbortController(), trigger:document.activeElement };
    root.addEventListener('click',event => {const target=event.target.closest('button[data-cs]'); if(target && !target.disabled) handle(board,target);});
    root.addEventListener('input',event => { if(event.target.tagName==='TEXTAREA') board.draft.custom=event.target.value; });
    root.addEventListener('toggle',event => {if(event.target.classList.contains('cs-custom') && event.target.isConnected) board.customOpen = event.target.open;},true);
    root.addEventListener('cancel',event => {event.preventDefault();close(board);});
    root.addEventListener('close',() => close(board));
    document.body.append(root);
    render(board);
    root.showModal();
    load(board);
    return true;
  }

  window.ChishuiBoard = {
    open(node, onComplete) {
      close();
      return window.ChishuiField?.open(node, onComplete) ?? open(node, onComplete);
    },
    close() { window.ChishuiField?.close(); close(); },
    openClassic(node, onComplete) { window.ChishuiField?.close(); return open(node, onComplete); }
  };
})();
