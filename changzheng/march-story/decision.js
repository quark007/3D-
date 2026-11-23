/* Per-dialogue action plan: fixed presets, free text, or both, then the matched film. */
(() => {
  'use strict';
  const plans = {
    1: ['先清点物资并核验情报，再按分工保持联络出发', '先整队行军，照应身边战友分担行装', '先侦察前方道路，再机动转移'],
    2: ['先侦察敌情，再掩护伤员转移并保持联络', '先控制渡口，按船只分批渡河，岸上保持联络', '以火力掩护主力渡河，再转移'],
    3: ['先核对资料与来源，再组织集体研判', '先整理会议材料，分清史料与推测', '先安排基层传达与分工，再听会议结论'],
    4: ['先侦察通道，再机动转移并释放佯动', '先核对船只与渡河条件，再分批渡河', '先以小分队佯动牵制，主力寻隙转移'],
    5: ['先核对船只与渡口条件，再分批渡江', '先控制渡口两岸，再昼夜渡运', '先侦察渡口，再机动转移'],
    6: ['先侦察对岸火力，再组织强攻与火力掩护', '先清点物资与弹药，再保持联络分批前进', '先以火力压制对岸，再掩护队伍前进'],
    7: ['先观察铁索与桥头，组织攀索与火力掩护', '先侦察桥头，再组织攀索前进', '先检查桥板与铁索，安排后续照料'],
    8: ['先核对保暖物资与负重，结伴行军互相照应', '先侦察山口道路，再分批前进', '先照应体力下降的战友，短暂休整再前进'],
    9: ['先清点携带的物资与水壶，再商量分配', '先侦察泥沼落脚点，结伴前进', '先照应体力下降的战友，短暂休整'],
    10: ['先侦察山口与侧翼，再组织强攻与火力掩护', '先以正面火力牵制，小分队机动转移', '先核对攀爬装备与分工，再保持联络前进'],
    11: ['先核对到达物资，再安排休整', '先核对资料与分工，再与当地联络', '先清点物资并保持联络，再休整'],
    12: ['先核对资料与分工，再保持联络', '先清点物资并安排照料，再迎接战友', '先核对资料与来源，再安排后续保障']
  };
  const drafts = new Map();
  const text = value => String(value || '').trim().slice(0, 300);
  const taskId = row => row?.storyId || (row ? `chapter-${row.chapterId}/dialogue-${row.scriptId}` : '');
  const chapter = row => Number(row?.chapterId) || 1;
  function presets(chapterId, scriptId) {
    const authored = scriptId ? window.CZMarchDecisionPlans?.[String(scriptId)] : null;
    const list = Array.isArray(authored) ? authored : plans[Number(chapterId)];
    return Array.isArray(list) ? list.slice() : plans[1].slice();
  }
  function compose(preset, custom) {
    const fixed = text(preset), free = text(custom);
    if (!fixed && !free) return null;
    return { preset: fixed, text: free, command: fixed && free ? `${fixed}；补充：${free}` : fixed || free, kind: free ? 'custom_decision' : 'fixed_decision' };
  }
  function saved(row) {
    try {
      const entry = window.CZMarchSave?.read?.().tasks?.[taskId(row)]?.progress?.decision;
      if (!entry || typeof entry !== 'object') return null;
      const command = text(entry.command);
      if (!command || !['fixed_decision', 'custom_decision'].includes(entry.kind)) return null;
      return { preset: text(entry.preset), text: text(entry.text), command, kind: entry.kind, at: String(entry.at || '') };
    } catch { return null; }
  }
  function remember(row, entry) {
    const id = taskId(row);
    if (!id) return false;
    try {
      return window.CZMarchSave.transact(state => {
        const task = state.tasks[id] ||= { completed: false, attempts: [], progress: {} };
        task.progress.decision = { preset: entry.preset, text: entry.text, command: entry.command, kind: entry.kind, at: new Date().toISOString() };
      });
    } catch { return false; }
  }
  function record(row, entry) {
    try {
      if (typeof GameState === 'undefined' || typeof GameState.recordStrategicDecision !== 'function') return;
      const node = (window.CZMarchEnv?.().nodes || []).find(item => Number(item.id) === chapter(row));
      GameState.recordStrategicDecision({ nodeId: chapter(row), nodeName: node?.name || `第${chapter(row)}章`, command: entry.command, videoKind: entry.kind, phase: 'proposed', outcome: '本段行动提案已记录，尚未执行', videoHandled: true });
    } catch (error) { console.info('[march-decision] 决策记录未写入', error); }
  }
  function play(row, entry, host) {
    const cinema = typeof DecisionCinema !== 'undefined' ? DecisionCinema : window.DecisionCinema;
    if (!cinema?.play) return null;
    const dialog = host?.closest?.('dialog');
    return cinema.play({ id: chapter(row) }, entry.command, {
      kind: entry.kind, userInitiated: true, dedupe: false, container: dialog || host,
      isCurrent: () => !!dialog && dialog.isConnected && dialog.open
    });
  }
  function attach(host, row) {
    if (!host || !row || row.kind !== 'decision' || !plans[Number(row.chapterId)]) return null;
    const id = taskId(row), previous = saved(row);
    const state = drafts.get(id) || { preset: previous?.preset || '', text: previous?.text || '' };
    drafts.set(id, state);
    const section = document.createElement('section');
    section.className = 'march94-decision';
    const heading = document.createElement('h3'); heading.textContent = 'DeepSeek · 本章行动决策';
    const note = document.createElement('p'); note.className = 'march94-note';
    note.textContent = '以下方案对应这一段交谈的具体任务。点选一个预设，或写下自己的安排；提交后自动检索并播放本章剧情映像。未提交也可以继续当前内容，不影响完成本项。';
    section.append(heading, note);
    const presetsHost = document.createElement('div'); presetsHost.className = 'march94-presets';
    presetsHost.setAttribute('role', 'group'); presetsHost.setAttribute('aria-label', '预设行动方案');
    const buttons = [];
    const label = document.createElement('label'); label.className = 'march94-label'; label.textContent = '自定义安排（选填，300字以内）';
    const input = document.createElement('textarea'); input.className = 'march94-input'; input.maxLength = 300; input.rows = 3;
    input.value = state.text; input.placeholder = '例如：先核对现有条件，再和战友分担负重。'; input.autocomplete = 'off';
    const meta = document.createElement('small'); meta.className = 'march94-meta';
    const status = document.createElement('p'); status.className = 'march94-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const submit = document.createElement('button'); submit.type = 'button'; submit.className = 'march94-submit'; submit.textContent = '提交决策 · 播放剧情映像';
    const refresh = () => {
      for (const button of buttons) {
        const selected = state.preset === button.dataset.preset;
        button.classList.toggle('selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      }
      meta.textContent = `${input.value.length}/300字 · ${state.preset && state.text ? '预设与自定义将合并检索' : state.preset ? '按固定方案匹配' : state.text ? '按自定义安排检索' : '先选择或填写一项'}`;
    };
    for (const plan of presets(row.chapterId, row.scriptId)) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'march94-preset';
      button.dataset.preset = plan; button.textContent = plan; button.setAttribute('aria-pressed', 'false');
      button.onclick = () => { state.preset = state.preset === plan ? '' : plan; drafts.set(id, state); refresh(); };
      buttons.push(button); presetsHost.append(button);
    }
    input.oninput = () => { state.text = input.value; drafts.set(id, state); refresh(); };
    input.addEventListener('keydown', event => { if (!['Tab', 'Escape'].includes(event.key)) event.stopPropagation(); });
    submit.onclick = () => {
      const entry = compose(state.preset, state.text);
      if (!entry) { status.textContent = '请先选择一个预设方案，或写下自己的安排。'; input.focus(); return; }
      state.preset = entry.preset; state.text = entry.text; drafts.set(id, state); refresh();
      const stored = remember(row, entry);
      record(row, entry);
      status.textContent = stored ? '已记录本段决策，正在检索并播放剧情映像…' : '决策已保留在本次交谈中，但存档写入未完成；仍可播放本次映像。';
      try {
        const pending = play(row, entry, host);
        if (pending?.then) pending.then(match => {
          if (!match) return;
          status.textContent = match.clips?.length ? '决策已记录，剧情映像已打开；关闭映像后可继续当前内容。' : '决策已记录；本次没有匹配到可播放映像。' + (match.reason || '');
        }).catch(() => { status.textContent = '决策已记录；剧情映像暂时无法播放，可继续对白。'; });
      } catch { status.textContent = '决策已记录；剧情映像暂时无法播放，可继续对白。'; }
    };
    label.append(input);
    section.append(presetsHost, label, meta, submit, status);
    status.textContent = previous ? '已记录过本段决策，可修改后重新提交。' : '';
    refresh();
    host.append(section);
    return section;
  }
  async function start(row,signal){
    const {d,body,foot}=window.CZMarchUI.dialog(row.title,signal);let result={status:'cancelled'};
    attach(body,row);
    foot.append(window.CZMarchUI.button('记录研判 · 返回场景',()=>{if(!saved(row)){window.CZMarchUI.note('请先提交本章行动方案。');return;}result={status:'completed'};d.close();}));
    return new Promise(resolve=>d.addEventListener('close',()=>resolve(result),{once:true}));
  }
  window.CZMarchDecision = { presets, compose, saved, remember, record, play, attach, start };
})();
