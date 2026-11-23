/* Deterministic teaching simulation. All strength, probability and time values are game units. */
(() => {
  const regions = {
    west: ['川南 · 古蔺与叙永', 105.80, 28.24], north: ['川南 · 长江防线', 106.43, 28.49],
    east: ['黔北 · 遵义', 106.92, 27.75], border: ['滇东北 · 扎西', 105.05, 27.87],
    south: ['黔中 · 贵阳', 106.64, 26.65], hunan: ['黔东 · 湘西方向', 107.56, 27.42]
  };
  const fords = {
    tucheng: { name: '土城', geo: 3, region: 'west', exposure: 12 },
    taiping: { name: '太平渡', geo: 0, region: 'east', exposure: 10 },
    erlang: { name: '二郎滩', geo: 2, region: 'east', exposure: 8 },
    maotai: { name: '茅台', geo: 1, region: 'west', exposure: 7 }
  };
  const forces = [
    { id: 'sichuan', name: '川军', home: 'north', focus: '守长江防线', reach: .42, delay: 2, size: 16 },
    { id: 'guizhou', name: '黔军', home: 'east', focus: '守黔北通道', reach: .35, delay: 2, size: 13 },
    { id: 'yunnan', name: '滇军 · 孙渡部', home: 'border', focus: '守滇东北，接警驰援', reach: .25, delay: 3, size: 17 },
    { id: 'hunan', name: '湘军', home: 'hunan', focus: '守黔湘边界', reach: .19, delay: 3, size: 10 },
    { id: 'xue', name: '中央军 · 薛岳部', home: 'south', focus: '优先响应黔中警报', reach: .76, delay: 2, size: 14 },
    { id: 'zhou', name: '中央军 · 周浑元部', home: 'west', focus: '追踪赤水河西侧信号', reach: .67, delay: 3, size: 12 },
    { id: 'wu', name: '中央军 · 吴奇伟部', home: 'east', focus: '追踪黔北与渡口信号', reach: .70, delay: 2, size: 11 }
  ];
  const signals = {
    bridge: { label: '公开架桥', note: '让侦察兵看到北进准备', target: 'north', power: 7, cost: 4 },
    radio: { label: '电台佯动', note: '在川南制造指挥部活动信号', target: 'west', power: 9, cost: 5 },
    screen: { label: '江北牵制', note: '在江北维持部队活动迹象', target: 'east', power: 7, cost: 4 },
    alarm: { label: '贵阳示警', note: '制造黔中告急信号 · 第四轮可用', target: 'south', power: 11, cost: 6, last: true },
    silent: { label: '无线电静默', note: '减少本次渡口活动暴露', target: null, power: 0, cost: 2 }
  };
  const plans = [
    { ford: 'tucheng', signals: ['silent'], scout: true, days: 2 },
    { ford: 'taiping', signals: ['bridge'], scout: false, days: 2 },
    { ford: 'maotai', signals: ['bridge', 'radio'], scout: false, days: 2 },
    { ford: 'erlang', signals: ['alarm', 'silent'], scout: false, days: 3 }
  ];
  const sides = [
    '青杠坡回报尚未复核。先判断情报是否足以支持原计划。',
    '上一轮的命令可能还在路上。看清哪一侧已变、哪一侧还没变。',
    '让对手看见可信信号，同时保留真实行军路线。',
    '第四渡只是窗口。还要确认滇军是否已调离滇东北。'
  ];
  const regionIds = Object.keys(regions);
  const create = () => ({ version: 2, round: 0, day: 0, supply: 72, readiness: 86, history: [],
    forces: forces.map(f => ({ id: f.id, location: f.home, pending: null, beliefs: {} })) });

  function observe(force, previous, signal, lastFord) {
    const weights = regionIds.map(id => {
      const prior = (previous[id] || 0) / 100;
      const allegiance = id === force.home ? 1.35 : force.reach;
      const exposure = fords[lastFord]?.region === id ? .65 : 0;
      const alarm = id === 'south' && force.id === 'yunnan' && signal.south ? 2.6 : 1;
      return (1 + signal[id] + 3 * prior + exposure) * allegiance * alarm;
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    return Object.fromEntries(regionIds.map((id, index) => [id, 100 * weights[index] / total]));
  }

  function resolve(state, plan) {
    if (state.round >= 4 || state.supply <= 0 || state.readiness <= 0 || !Object.hasOwn(fords, plan.ford)) return null;
    const ford = fords[plan.ford], day = state.day;
    const chosen = [...new Set(plan.signals)].filter(id => Object.hasOwn(signals, id) && (!signals[id].last || state.round === 3)).slice(0, 2);
    const repeated = state.history.at(-1)?.signals || [];
    const days = plan.days === 3 ? 3 : 2;
    const advance = days + (plan.scout ? 1 : 0);
    const observed = Object.fromEntries(regionIds.map(id => [id, 0]));
    if (!chosen.includes('silent')) observed[ford.region] += 2;
    for (const id of chosen) {
      const tactic = signals[id];
      if (tactic.target) observed[tactic.target] += tactic.power * (repeated.includes(id) ? .55 : 1);
    }
    const orders = [], arrived = [];
    const nextForces = state.forces.map((piece, index) => {
      const force = forces[index], next = { ...piece, beliefs: observe(force, piece.beliefs, observed, state.history.at(-1)?.ford) };
      const [target, probability] = Object.entries(next.beliefs).sort((a, b) => b[1] - a[1])[0];
      if (!piece.pending && target !== piece.location && probability >= (target === force.home ? 23 : 30)) {
        next.pending = { target, due: day + force.delay };
        orders.push({ id: force.id, ...next.pending });
      }
      if (next.pending?.due <= day + advance) {
        next.location = next.pending.target;
        arrived.push({ id: force.id, ...next.pending });
        next.pending = null;
      }
      return next;
    });
    const committed = nextForces.map((piece, index) => {
      const force = forces[index];
      const share = piece.location === force.home ? 1 : piece.id === 'yunnan' ? .66 : force.reach;
      const strength = Math.round(force.size * share);
      return { id: piece.id, location: piece.location, strength, reserve: force.size - strength };
    });
    const pressure = committed.filter(piece => piece.location === ford.region).reduce((sum, piece) => sum + piece.strength, ford.exposure);
    const verified = state.round === 0 && plan.scout;
    const strain = Math.max(5, Math.round(pressure * (plan.scout ? .33 : .55))) + (state.round === 0 && !verified ? 14 : 0);
    const cost = 7 + (days - 2) * 3 + (plan.scout ? 4 : 0) + chosen.reduce((sum, id) => sum + signals[id].cost, 0);
    const supply = Math.max(0, state.supply - cost), readiness = Math.max(0, state.readiness - strain);
    const yunnanMoved = nextForces.find(piece => piece.id === 'yunnan').location === 'south';
    const history = [...state.history, { ford: plan.ford, signals: chosen, scout: !!plan.scout, days, custom: String(plan.custom || '').trim().slice(0, 300), observed, orders, arrived, pressure, strain, cost, verified, committed }];
    const round = state.round + 1;
    return { ...state, supply, readiness, round, day: day + advance, forces: nextForces, history,
      outcome: supply === 0 || readiness === 0 ? 'failed' : round < 4 ? 'active' : yunnanMoved ? 'won' : 'failed' };
  }

  function restore(saved) {
    let state = create();
    if (saved?.version === 2 && Array.isArray(saved.history)) {
      for (const plan of saved.history.slice(0, 4)) {
        if (!plan || !Array.isArray(plan.signals)) break;
        const next = resolve(state, plan);
        if (!next) break;
        state = next;
      }
    }
    return state;
  }

  function score(state) {
    return state.outcome === 'won' ? Math.min(100, 60 + Math.round(state.supply * .55 + state.readiness * .4)) : 0;
  }

  window.ChishuiTactics = { regions, fords, forces, signals, plans, sides, create, resolve, restore, score };
})();
