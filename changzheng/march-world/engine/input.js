/* march-world 内部模块：键盘 WASD/方向键 + 触屏摇杆 + 点击/触摸移动。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};

  function create(container, hooks) {
    if(M.controls86)return M.controls86.create(container,hooks);
    const state = { keys: new Set(), joy: null, joyVec: { x: 0, y: 0 }, enabled: true, touch: false };
    const el = {};
    const disposers = [];
    const on = (t, e, f, o) => { t.addEventListener(e, f, o); disposers.push(() => t.removeEventListener(e, f, o)); };

    /* ---- 键盘 ---- */
    const KEYMAP = { KeyW: 'n', ArrowUp: 'n', KeyS: 's', ArrowDown: 's', KeyA: 'w', ArrowLeft: 'w', KeyD: 'e', ArrowRight: 'e' };
    on(window, 'keydown', ev => {
      if (ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
      const d = KEYMAP[ev.code];
      if (d) { state.keys.add(d); ev.preventDefault(); hooks.onDir && hooks.onDir(); }
      else if ((ev.code === 'KeyE' || ev.code === 'Space' || ev.code === 'Enter') && state.enabled) { ev.preventDefault(); hooks.onInteract && hooks.onInteract(); }
    });
    on(window, 'keyup', ev => { const d = KEYMAP[ev.code]; if (d) state.keys.delete(d); });
    on(window, 'blur', () => state.keys.clear());

    /* ---- 触屏摇杆 + 交互按钮（仅触屏设备显示） ---- */
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      state.touch = true;
      const joy = document.createElement('div'); joy.className = 'czmw-joy'; joy.hidden = true;
      joy.innerHTML = '<div class="czmw-joy-base"><div class="czmw-joy-knob"></div></div>';
      const btn = document.createElement('button'); btn.className = 'czmw-act'; btn.type = 'button'; btn.hidden = true; btn.textContent = '交互';
      container.append(joy, btn); el.joy = joy; el.knob = joy.querySelector('.czmw-joy-knob'); el.base = joy.querySelector('.czmw-joy-base'); el.btn = btn;
      let joyId = null, origin = null;
      on(btn, 'click', () => hooks.onInteract && hooks.onInteract());
      on(container, 'touchstart', ev => {
        if (!state.enabled) return;
        for (const t of ev.changedTouches) {
          const r = container.getBoundingClientRect(), x = t.clientX - r.left, y = t.clientY - r.top;
          if (x < r.width * 0.45 && y > r.height * 0.42 && joyId === null) {
            joyId = t.identifier; origin = { x, y }; joy.hidden = false;
            el.base.style.left = (x - 56) + 'px'; el.base.style.top = (y - 56) + 'px'; setKnob(0, 0); ev.preventDefault();
          }
        }
      }, { passive: false });
      on(container, 'touchmove', ev => {
        for (const t of ev.changedTouches) if (t.identifier === joyId && origin) {
          const r = container.getBoundingClientRect();
          let dx = t.clientX - r.left - origin.x, dy = t.clientY - r.top - origin.y;
          const len = Math.hypot(dx, dy), max = 44;
          if (len > max) { dx *= max / len; dy *= max / len; }
          state.joyVec = { x: dx / max, y: dy / max }; setKnob(dx, dy); ev.preventDefault();
        }
      }, { passive: false });
      const end = ev => { for (const t of ev.changedTouches) if (t.identifier === joyId) { joyId = null; origin = null; state.joyVec = { x: 0, y: 0 }; joy.hidden = true; } };
      on(container, 'touchend', end); on(container, 'touchcancel', end);
      function setKnob(dx, dy) { el.knob.style.transform = `translate(${dx}px,${dy}px)`; }
    }

    /* ---- 点击/点按移动（鼠标与触屏空白区） ---- */
    let downAt = null;
    on(container, 'pointerdown', ev => { if (state.enabled && ev.button !== 2) downAt = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
    on(container, 'pointerup', ev => {
      if (!downAt || !state.enabled) { downAt = null; return; }
      const d = Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y), dt = performance.now() - downAt.t; downAt = null;
      if (d < 8 && dt < 500 && hooks.onTap) {
        const r = container.getBoundingClientRect();
        hooks.onTap(ev.clientX - r.left, ev.clientY - r.top);
      }
    });

    return {
      /* 当前输入方向向量（世界坐标系：x 东、y 南） */
      vector() {
        if (!state.enabled) return { x: 0, y: 0 };
        let x = 0, y = 0; const k = state.keys;
        if (k.has('n')) y -= 1; if (k.has('s')) y += 1; if (k.has('w')) x -= 1; if (k.has('e')) x += 1;
        x += state.joyVec.x; y += state.joyVec.y;
        const l = Math.hypot(x, y); return l > 1 ? { x: x / l, y: y / l } : { x, y };
      },
      hasKeyboard() { return state.keys.size > 0; },
      showAction(show, label) { if (el.btn) { el.btn.hidden = !show; if (label) el.btn.textContent = label; } },
      setEnabled(v) { if(state.enabled===v)return;state.enabled = v; if (!v) { state.keys.clear(); state.joyVec = { x: 0, y: 0 }; } },
      isTouch: () => state.touch,
      dispose() { disposers.forEach(f => f()); Object.values(el).forEach(n => n && n.remove && n.remove()); }
    };
  }

  M.input = { create };
})();
