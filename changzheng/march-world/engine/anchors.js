/* march-world 内部模块：锚点实体——NPC/任务/出口的摆放、接近检测、交互提示与事件派发。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};
  const NEAR = 3.4; /* 触发提示距离（世界单位） */

  /* NPC 造型：按角色名给稳定配色 */
  const NPC_STYLES = {
    he_wen: { role:'commander',coat: '#5c6650', hat: '#4c5443', pack: '#6e6250' },            /* 指导员 */
    wang_gui: { coat: '#6e6250', hat: '#5c5142', pack: '#7a6a50' },          /* 老班长 */
    chen_xiaoman: { role:'soldier',coat: '#66706b', hat: '#566057', pack: '#77694d' },      /* 青年战士 */
    medic_1: { role:'medic',coat: '#7a7568', hat: '#6b6557', pack: '#9a8f78', skin: '#d0a983' },
    logistics_1: { role:'logistics',coat: '#6b5f4a', hat: '#5a4f3e', pack: '#8a7a58' },
    liaison_1: { coat: '#5f6b62', hat: '#4e5850', pack: '#6e6250' },
    boatman_1: { civilian:true,coat: '#7a6248', hat: '#66543c', pack: '#8a7658', skin: '#bd9468' },
    guide_1: { coat: '#6d5c46', hat: '#3f382e', pack: '#7a6a50' },
    civilian_1: { civilian:true,coat: '#7d6a52', hat: '#665845', pack: '#93805f' },
    narrator: { coat: '#5c6650', hat: '#4c5443', pack: '#6e6250' }
  };
  function npcKey(anchorId, label) {
    const m = /dialogue-\d+-\d+-([a-z0-9_]+)/.exec(anchorId || '');
    if (m && NPC_STYLES[m[1]]) return m[1];
    for (const k of Object.keys(NPC_STYLES)) if ((label || '').includes(k)) return k;
    return m ? m[1] : 'narrator';
  }

  function create(scene, container) {
    const layer = document.createElement('div');
    layer.className = 'czmw-labels'; container.append(layer);
    const hud = document.createElement('div');
    hud.className = 'czmw-tip czmw-fps-tip';
    hud.hidden = true;
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-hidden', 'true');
    const hudText = document.createElement('span');
    const hudAction = document.createElement('b');
    hud.append(hudText, hudAction);
    layer.append(hud);
    const anchors = (scene.anchors || []).map(a => {
      const el = document.createElement('div');
      el.className = 'czmw-tip czmw-tip-' + a.kind;
      el.innerHTML = `<i></i><span></span><b></b>`;
      el.querySelector('span').textContent = a.label || '';
      el.hidden = true; layer.append(el);
      const ent = {
        ...a, el, icon:el.querySelector('i'), action:el.querySelector('b'),
        enabled: true, completed: false, near: false,
        npc: a.kind === 'npc' ? { frames: M.painter.figureFrames(NPC_STYLES[npcKey(a.anchorId, a.label)] || NPC_STYLES.narrator), t: Math.random() * 9 } : null,
        marker: a.kind !== 'npc' ? M.painter.spriteFor({ type: a.kind === 'exit' ? 'gate' : /渡|船/.test(a.label)?'boat':/火|夜营/.test(a.label)?'campfire':/会议|资料|读报|诗|档案/.test(a.label)?'table':/粮|补给|物资/.test(a.label)?'grain':'crate', w: 3, h: 3.6, seed: 5 }, scene.palette) : null
      };
      return ent;
    });
    let view = { enabledAnchorIds: null, completedAnchorIds: [] },guideId=null,paintCtx=null,paintCam=null;const entities=[];

    function applyState(v) {
      view = { enabledAnchorIds: Array.isArray(v && v.enabledAnchorIds) ? v.enabledAnchorIds : null, completedAnchorIds: (v && v.completedAnchorIds) || [] };
      for (const a of anchors) {
        a.enabled = !view.enabledAnchorIds || view.enabledAnchorIds.includes(a.anchorId);
        a.completed = view.completedAnchorIds.includes(a.anchorId);
      }
    }
    function nearest(px, py) {
      const preferred=anchors.find(a=>a.anchorId===guideId&&a.enabled&&Math.hypot(a.x-px,a.y-py)<NEAR);if(preferred)return preferred;let best = null, bd = NEAR;
      for (const a of anchors) {
        if (!a.enabled) continue;
        const d = Math.hypot(a.x - px, a.y - py);
        if (d < bd) { bd = d; best = a; }
      }
      return best;
    }
    let hudAnchor = null, wasFirstPerson = false;
    const actionText = a => navigator.maxTouchPoints > 0 && innerWidth <= 900 ? '点「交互」'
      : a.kind === 'npc' ? 'E 交谈' : a.kind === 'exit' ? 'E 前往' : 'E 查看';

    return {
      anchors,
      applyState,
      setGuide(id){guideId=id;},
      update(px, py, paused) {
        const n = paused ? null : nearest(px, py);
        for (const a of anchors) a.near = a === n;
        return n;
      },
      drawEntity(ctx, cam, worldH) { /* 返回供排序绘制的实体描述 */
        if(entities.length){paintCtx=ctx;paintCam=cam;return entities;}paintCtx=ctx;paintCam=cam;const out = entities;
        for (const a of anchors) {
          const pr = M.proj.project(cam, a.x, a.y, 0);
          const s = M.proj.depthScale(a.y, worldH) * cam.zoom / 12.5;
          out.push({
            y: a.y, draw: () => {
              const ctx=paintCtx,cam=paintCam,pr=M.proj.project(cam,a.x,a.y,0),s=cam.zoom/12.5;
              if(pr.x < -100 || pr.x > cam.viewW+100 || pr.y < -30 || pr.y > cam.viewH+160)return;
              if (!a.enabled && !a.completed) return;if(a.npc&&a.anchorId!==guideId&&anchors.some(other=>other!==a&&other.npc&&other.enabled&&Math.hypot(other.x-a.x,other.y-a.y)<1.5&&(other.anchorId===guideId||anchors.indexOf(other)<anchors.indexOf(a))))return;
              if (a.npc) {
                const direction=/medic|医|卫生/.test(a.anchorId+a.label)?'w':/logistics|补给|班长/.test(a.anchorId+a.label)?'e':'s';const fr = a.npc.frames[direction].idle;
                const img = fr[Math.floor((a.npc.t += 0.016) * 2.2) % fr.length];
                const w = (img.width/3) * s, h = (img.height/3) * s;
                ctx.fillStyle = 'rgba(30,28,22,0.25)';
                ctx.beginPath(); ctx.ellipse(pr.x, pr.y, w * 0.3, h * 0.07, 0, 0, 7); ctx.fill();
                ctx.drawImage(img, pr.x - w / 2, pr.y - h + h * 0.06, w, h);
              } else if (a.marker) {
                const w = a.marker.wU * cam.zoom, h = a.marker.hU * cam.zoom;
                ctx.drawImage(a.marker.c, pr.x - w / 2 - 4 * s, pr.y - h - 4 * s, w + 8 * s, h + 8 * s);
              }
              ctx.globalAlpha = 1;
              /* 提示圈：靠近时脉冲；完成时静态 */
              if (a.enabled && (a.near || a.anchorId===guideId)) {
                const t = performance.now() / 1000;
                const r = (a.near ? 2.6 + Math.sin(t * 5) * 0.35 : 1.9) * s * 5;
                ctx.strokeStyle = a.near ? 'rgba(240,214,140,0.95)' : (a.completed ? 'rgba(190,200,180,0.5)' : 'rgba(240,214,140,0.55)');
                ctx.lineWidth = a.near ? 3 : 2;
                ctx.beginPath(); ctx.ellipse(pr.x, pr.y, r, r * 0.42, 0, 0, 7); ctx.stroke();
              }
              if (a.completed && a.near) {
                ctx.fillStyle = 'rgba(120,160,110,0.95)';
                ctx.font = `bold ${Math.max(11, 13 * s)}px sans-serif`;
                ctx.textAlign = 'center'; ctx.fillText('✓', pr.x, pr.y - 46 * s);
              }
            }
          });
        }
        return out;
      },
      /* 每帧刷新 HTML 标签位置；仅 near 或 常驻exit 显示 */
      layout(cam, project, firstPerson, near) {
        if (firstPerson !== wasFirstPerson) hud.hidden = !firstPerson;
        const active = firstPerson && near?.enabled ? near : null;
        if (hudAnchor !== active) {
          hudAnchor = active;
          if (active) {
            hudText.textContent = active.label;
            hudAction.textContent = actionText(active);
          }
          hud.classList.toggle('is-visible', Boolean(active));
          hud.setAttribute('aria-hidden', String(!active));
        }
        if (firstPerson) {
          if (!wasFirstPerson) for (const a of anchors) a.el.hidden = true;
          wasFirstPerson = true;
          return;
        }
        wasFirstPerson = false;
        for (const a of anchors) {
          const show = a.enabled && a.near;
          if(a.el.hidden===show)a.el.hidden = !show;
          if (!show) continue;
          const pr = project(a.x, a.y, 0);
          const icon = a.kind === 'npc' ? '💬' : a.kind === 'exit' ? '➜' : '✦';
          const action = actionText(a);
          if (a.icon.textContent !== icon) a.icon.textContent = icon;
          if (a.action.textContent !== action) a.action.textContent = action;
          const measureKey = cam.viewW + ':' + action;
          if (a.measureKey !== measureKey) {
            a.measureKey = measureKey;
            a.half = a.el.offsetWidth / 2;
            a.height = a.el.offsetHeight;
          }
          const left = Math.min(a.half + 8, cam.viewW / 2);
          const bottom = Math.max(0, cam.viewH - 8);
          const top = Math.min(bottom, Math.max(80, a.height + 8));
          const x = Math.round(Math.max(left, Math.min(cam.viewW - left, pr.x)));
          const y = Math.round(Math.max(top, Math.min(bottom, pr.y - 70 * cam.zoom / 12.5)));
          const transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
          if(a.transform!==transform){a.el.style.transform=transform;a.transform=transform;}
        }
      },
      dispose() { layer.remove(); }
    };
  }

  M.anchors = { create, NEAR, npcKey, NPC_STYLES };
})();