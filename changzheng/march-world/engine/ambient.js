/* march-world 内部模块：轻量环境动画——雪、雾、旗帜、水面闪光、炊烟。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};

  function create(scene, view) {
    const kind = scene.ambient && scene.ambient.kind;
    const parts = [];
    let t = 0;
    if (kind === 'snow') for (let i = 0; i < 130; i++) parts.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 1.6, v: 0.02 + Math.random() * 0.035, ph: Math.random() * 9 });
    if (kind === 'mist') for (let i = 0; i < 9; i++) parts.push({ x: Math.random(), y: 0.35 + Math.random() * 0.6, s: 60 + Math.random() * 120, v: 0.004 + Math.random() * 0.006, ph: Math.random() * 9 });
    if (kind === 'dust') for (let i = 0; i < 30; i++) parts.push({ x: Math.random(), y: Math.random(), s: 1 + Math.random() * 2, v: 0.008 + Math.random() * 0.012, ph: Math.random() * 9 });

    function update(dt) { t += dt; }
    /* 世界空间水面闪光（在地形层之后、实体之前由 renderer 调用） */
    function drawWater(ctx, cam) {
      if (!scene.terrain || !scene.terrain.waters || !scene.terrain.waters.length) return;
      const P = scene.palette;
      ctx.save();
      for (const w of scene.terrain.waters) {
        for (let i = 0; i < (w.sparkles || 8); i++) {
          const ph = t * 1.4 + i * 2.2, a = (Math.sin(ph) + 1) / 2;
          const bx = w.pts[0][0] + ((w.pts[2] ? w.pts[2][0] : w.pts[1][0]) - w.pts[0][0]) * ((i * 0.37 + t * 0.01) % 1);
          const by = w.pts[0][1] + ((w.pts[2] ? w.pts[2][1] : w.pts[1][1]) - w.pts[0][1]) * ((i * 0.61) % 1);
          const pr = M.proj.project(cam, bx, by, 0);
          ctx.globalAlpha = 0.12 + a * 0.22; ctx.strokeStyle = '#fdf6e3'; ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(pr.x - 10 * a, pr.y); ctx.lineTo(pr.x + 10 * a, pr.y); ctx.stroke();
        }
      }
      ctx.restore();
    }
    /* 屏幕空间粒子/雾 */
    function drawOverlay(ctx, cam) {
      const W = cam.viewW, H = cam.viewH;
      ctx.save();
      if (kind === 'snow') {
        ctx.fillStyle = 'rgba(248,250,252,0.85)';
        for (const p of parts) {
          const x = ((p.x + Math.sin(t * 0.7 + p.ph) * 0.03) % 1) * W, y = ((p.y + t * p.v) % 1) * H;
          ctx.globalAlpha = 0.35 + (p.s % 1) * 0.5;
          ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill();
        }
      } else if (kind === 'mist') {
        for (const p of parts) {
          const x = ((p.x + t * p.v) % 1.3 - 0.15) * W, y = p.y * H + Math.sin(t * 0.3 + p.ph) * 8;
          const g = ctx.createRadialGradient(x, y, 4, x, y, p.s);
          g.addColorStop(0, 'rgba(226,230,224,0.16)'); g.addColorStop(1, 'rgba(226,230,224,0)');
          ctx.fillStyle = g; ctx.fillRect(x - p.s, y - p.s, p.s * 2, p.s * 2);
        }
      } else if (kind === 'dust') {
        ctx.fillStyle = 'rgba(216,196,150,0.5)';
        for (const p of parts) {
          const x = ((p.x + t * p.v) % 1) * W, y = (p.y + Math.sin(t * 0.5 + p.ph) * 0.02) * H;
          ctx.globalAlpha = 0.14 + (p.s % 1) * 0.12;
          ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill();
        }
      }
      ctx.restore();
    }
    /* 炊烟/火堆粒子：scene.ambient.smokes = [{x,y}]（世界坐标） */
    function drawSmoke(ctx, cam) {
      const smokes = scene.ambient && scene.ambient.smokes || [];
      ctx.save();
      for (const s of smokes) {
        for (let i = 0; i < 5; i++) {
          const k = ((t * 0.22 + i * 0.2) % 1);
          const pr = M.proj.project(cam, s.x + Math.sin(t * 0.8 + i * 2) * 0.5 * k, s.y, 1 + k * 5);
          ctx.globalAlpha = 0.2 * (1 - k);
          ctx.fillStyle = '#d8d4c8';
          ctx.beginPath(); ctx.arc(pr.x, pr.y, 3 + k * 9, 0, 7); ctx.fill();
        }
      }
      ctx.restore();
    }
    return { update, drawWater, drawOverlay, drawSmoke };
  }

  M.ambient = { create };
})();