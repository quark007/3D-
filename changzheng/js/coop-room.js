/* 双人协作一关（新增入口，不替换单机主线）
   两台浏览器各自扮演「指挥 / 给养」，通过 BFF 内存房间完成一关「战前抉择 + 草地分粮」。
   文案与数值复用现有 game-data.js / game-state.js 规则；不读写单机存档（GameState）。 */
(() => {
  'use strict';
  const STORE_KEY = 'cz_coop_room_v1';
  const POLL_MS = 2000;
  const SOLDIERS_FALLBACK = [
    { id: 's1', name: '张铁柱', statusLabel: '健康', desc: '壮实的老兵，能扛能走' },
    { id: 's2', name: '李小顺', statusLabel: '健康', desc: '年轻力壮，行军速度快' },
    { id: 's3', name: '王冬生', statusLabel: '虚弱', desc: '连日饥饿，脚步踉跄' },
    { id: 's4', name: '赵小苗', statusLabel: '伤员', desc: '左腿有伤，行走困难' },
    { id: 's5', name: '刘大壮', statusLabel: '虚弱', desc: '发过烧，勉强跟着走' }
  ];
  const soldiers = () => (typeof GRASSLAND_SOLDIERS !== 'undefined' ? GRASSLAND_SOLDIERS : SOLDIERS_FALLBACK);
  const perMax = () => (typeof RATION_PER_PERSON_MAX !== 'undefined' ? RATION_PER_PERSON_MAX : 20);
  const apiBase = () => (typeof API_BASE !== 'undefined' ? API_BASE : 'http://127.0.0.1:8000');

  /* —— 纯函数（供 tests/coop-room.test.cjs 复用，不触 DOM） —— */
  function normalizeCode(input) { return String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); }
  function validCode(input) { return /^[A-Z0-9]{4}$/.test(normalizeCode(input)); }
  function sumAlloc(alloc) { return Object.values(alloc || {}).reduce((a, b) => a + (Number(b) || 0), 0); }
  function clampAlloc(alloc, perPersonMax, total) {
    const out = {};
    for (const s of SOLDIERS_FALLBACK) out[s.id] = Math.max(0, Math.min(perPersonMax, Math.floor(Number(alloc[s.id]) || 0)));
    if (sumAlloc(out) > total) return null; // 调用方提示“青稞面不够了”
    return out;
  }

  async function api(path, options = {}) {
    const resp = await fetch(apiBase() + path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    let body = null;
    try { body = await resp.json(); } catch { /* 保持 null，下面统一报错 */ }
    if (!resp.ok) {
      const detail = body && body.detail;
      throw Error((detail && (detail.message || detail.code)) || `服务返回 ${resp.status}`);
    }
    return body;
  }

  const CoopRoom = {
    normalizeCode, validCode, sumAlloc, clampAlloc,
    state: { code: null, role: null, room: null, timer: null, alloc: {}, busy: false },

    install() {
      const host = document.querySelector('.title-actions') || document.querySelector('.title-links');
      if (!host || host.querySelector('[data-coop-entry]')) return;
      const entry = document.createElement('button');
      entry.type = 'button'; entry.dataset.coopEntry = 'true'; entry.className = 'coop-entry-btn';
      entry.textContent = '双人协作一关';
      entry.setAttribute('aria-label', '双人协作一关：两台浏览器分别扮演指挥与给养');
      entry.addEventListener('click', () => this.openHome());
      host.append(entry);
    },

    el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; },
    btn(label, onclick, primary) {
      const b = this.el('button', 'coop-btn' + (primary ? ' primary' : ''), label);
      b.type = 'button'; b.addEventListener('click', onclick); return b;
    },

    dialog() {
      let d = document.getElementById('coopRoomDialog');
      if (!d) {
        d = document.createElement('dialog'); d.id = 'coopRoomDialog'; d.className = 'coop-dialog';
        d.addEventListener('close', () => this.stopPolling());
        document.body.append(d);
      }
      return d;
    },
    show(title) {
      const d = this.dialog(); this.stopPolling();
      d.replaceChildren();
      const h = this.el('header', 'coop-head');
      h.append(this.el('h2', '', title));
      const x = this.el('button', 'coop-close', '×'); x.type = 'button'; x.setAttribute('aria-label', '关闭');
      x.addEventListener('click', () => d.close()); h.append(x);
      const body = this.el('div', 'coop-body');
      d.append(h, body);
      if (!d.open) d.showModal();
      return body;
    },

    /* ========== 首页：创建 / 加入 / 回房 ========== */
    openHome() {
      const body = this.show('双人协作一关');
      body.append(this.el('p', 'coop-note', '两台浏览器各选一职：指挥负责战前抉择，给养负责草地分粮。两人都提交后一起结算。本关不读写单机 12 站存档。'));
      body.append(this.btn('创建房间 · 我当指挥', () => this.create(), true));
      const joinRow = this.el('div', 'coop-join-row');
      const input = this.el('input', 'coop-code-input'); input.placeholder = '输入 4 位房间码'; input.maxLength = 4;
      input.setAttribute('aria-label', '房间码');
      input.addEventListener('input', () => { input.value = normalizeCode(input.value); });
      joinRow.append(input, this.btn('加入房间 · 我当给养', () => this.join(normalizeCode(input.value))));
      body.append(joinRow);
      const saved = this.readSaved();
      if (saved && saved.code) {
        body.append(this.btn(`回到房间 ${saved.code}（我仍是${saved.role === 'commander' ? '指挥' : '给养'}）`, () => this.resume(saved.code, saved.role)));
      }
    },

    readSaved() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch { return null; } },
    save(code, role) { try { localStorage.setItem(STORE_KEY, JSON.stringify({ code, role })); } catch { } },

    async guard(fn) {
      if (this.state.busy) return; this.state.busy = true;
      try { await fn(); } catch (e) { this.toast(e.message); } finally { this.state.busy = false; }
    },
    toast(msg) {
      const n = this.dialog().querySelector('.coop-toast') || this.el('p', 'coop-toast');
      n.textContent = msg; n.setAttribute('role', 'alert');
      this.dialog().querySelector('.coop-body').prepend(n);
    },

    async create() {
      await this.guard(async () => {
        const room = await api('/coop/room', { method: 'POST', body: JSON.stringify({ role: 'commander' }) });
        this.state.code = room.code; this.state.role = 'commander'; this.state.room = room;
        this.save(room.code, 'commander');
        this.render();
      });
    },
    async join(code) {
      if (!validCode(code)) return this.toast('请输入 4 位房间码（字母或数字）');
      await this.guard(async () => {
        const room = await api(`/coop/room/${code}/join`, { method: 'POST' });
        this.state.code = room.code; this.state.role = 'supply'; this.state.room = room;
        this.save(room.code, 'supply');
        this.render();
      });
    },
    async resume(code, role) {
      await this.guard(async () => {
        this.state.code = code; this.state.role = role;
        this.state.room = await api(`/coop/room/${code}`);
        this.render();
      });
    },

    startPolling() {
      this.stopPolling();
      this.state.timer = setInterval(async () => {
        try {
          this.state.room = await api(`/coop/room/${this.state.code}`);
          this.render();
        } catch (e) {
          this.stopPolling();
          this.toast('房间已失效（30 分钟无操作会销毁），请重新创建。');
        }
      }, POLL_MS);
    },
    stopPolling() { if (this.state.timer) { clearInterval(this.state.timer); this.state.timer = null; } },

    /* ========== 渲染主流程 ========== */
    render() {
      const room = this.state.room; if (!room) return;
      if (room.settled) return this.renderResult(room);
      const me = room[this.state.role], otherRole = this.state.role === 'commander' ? 'supply' : 'commander';
      if (!room.supply.joined) return this.renderLobby(room);
      if (me.submitted) return this.renderWaiting(room, room[otherRole].joined);
      return this.renderAction(room);
    },

    renderLobby(room) {
      const body = this.show('房间已建好 · 等战友加入');
      body.append(this.el('p', 'coop-note', '把这个房间码发给另一台浏览器（开始页 → 双人协作一关 → 加入房间）：'));
      body.append(this.el('div', 'coop-code', room.code));
      body.append(this.el('p', 'coop-note', `你是「指挥」。给养加入后，你先做战前抉择；30 分钟无操作房间销毁。`));
      body.append(this.btn('刷新状态', () => this.resume(this.state.code, this.state.role)));
      this.startPolling();
    },

    renderWaiting(room, otherJoined) {
      const body = this.show('已提交 · 等战友的决定');
      body.append(this.el('p', 'coop-note', otherJoined ? '对方还没提交，提交后立即一起结算。' : '对方还没加入房间，把房间码发给战友：'));
      if (!otherJoined) body.append(this.el('div', 'coop-code', room.code));
      this.startPolling();
    },

    renderAction(room) {
      if (this.state.role === 'commander') return this.renderCommander(room);
      return this.renderSupply(room);
    },

    renderCommander(room) {
      const body = this.show('战前抉择 · 你是指挥');
      body.append(this.el('p', 'coop-note', '兵力充足，可据情选择。你的决定会与战友的分粮一起结算，结算文字分别写明两条决定的资源变化。'));
      const rest = this.btn('就地休整', () => this.submitCommander('rest'), true);
      const march = this.btn('急行军', () => this.submitCommander('march'), false);
      body.append(rest, march);
      body.append(this.el('p', 'coop-note', '就地休整：粮食 -15，士气 +20，体力恢复满。急行军：体力 -30，粮食 -5，士气 -5。'));
    },
    async submitCommander(choice) {
      await this.guard(async () => {
        this.state.room = await api(`/coop/room/${this.state.code}/action`, {
          method: 'POST', body: JSON.stringify({ role: 'commander', choice })
        });
        this.render();
      });
    },

    renderSupply(room) {
      const body = this.show('草地分粮 · 你是给养');
      const total = room.rationTotal;
      const hint = this.el('p', 'coop-note', `拖动滑块为每名战士分配青稞面（0-${perMax()}份）。总量 ${total} 份，至少给一名战士分粮。`);
      body.append(hint);
      if (!Object.keys(this.state.alloc).length) soldiers().forEach(s => { this.state.alloc[s.id] = 0; });
      const remaining = this.el('p', 'coop-remaining');
      const list = this.el('div', 'coop-soldiers');
      const updateRemaining = () => {
        const used = sumAlloc(this.state.alloc);
        remaining.textContent = `已分 ${used} / ${total} 份 · 剩余 ${total - used} 份`;
        submit.disabled = used === 0 || used > total;
        hint.classList.toggle('coop-warn', used > total);
      };
      for (const s of soldiers()) {
        const row = this.el('div', 'coop-soldier');
        const head = this.el('div', 'coop-soldier-head');
        head.append(this.el('strong', '', `${s.name} · ${s.statusLabel}`), this.el('small', '', s.desc || ''));
        const slider = this.el('input', 'coop-slider');
        slider.type = 'range'; slider.min = 0; slider.max = perMax(); slider.value = this.state.alloc[s.id];
        slider.setAttribute('aria-label', `${s.name} 分配份数`);
        const num = this.el('span', 'coop-num', String(this.state.alloc[s.id]));
        slider.addEventListener('input', () => {
          this.state.alloc[s.id] = Math.floor(Number(slider.value));
          num.textContent = slider.value;
          updateRemaining();
        });
        row.append(head, slider, num);
        list.append(row);
      }
      const submit = this.btn('提交分粮方案', () => this.submitSupply(), true);
      body.append(list, remaining, submit);
      updateRemaining();
    },
    async submitSupply() {
      const alloc = clampAlloc(this.state.alloc, perMax(), this.state.room.rationTotal);
      if (!alloc) return this.toast('青稞面不够了！调整分配后再提交');
      await this.guard(async () => {
        this.state.room = await api(`/coop/room/${this.state.code}/action`, {
          method: 'POST', body: JSON.stringify({ role: 'supply', allocations: alloc })
        });
        this.state.alloc = {};
        this.render();
      });
    },

    renderResult(room) {
      const body = this.show('一关结算 · 两条决定都已生效');
      const r = room.result;
      body.append(this.el('p', 'coop-result-title', `给养分粮结果：${r.supply.title}（${r.supply.effectLabel}）`));
      body.append(this.el('p', 'coop-note', r.supply.narrative));
      const text = this.el('pre', 'coop-result-text', r.text);
      body.append(text);
      body.append(this.btn('返回开始页（房间 30 分钟后自动销毁）', () => {
        this.stopPolling();
        try { localStorage.removeItem(STORE_KEY); } catch { }
        this.dialog().close();
        this.state = { code: null, role: null, room: null, timer: null, alloc: {}, busy: false };
      }, true));
    }
  };

  window.CoopRoom = CoopRoom;
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => CoopRoom.install(), { once: true });
    else CoopRoom.install();
  }
})();