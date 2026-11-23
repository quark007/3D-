/* march-world 内部模块：碰撞栅格 + A* 寻路（点击移动用）。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};

  function inPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* 构建 1 单位分辨率可走栅格：walkable 多边形内 且 不在阻挡形内 */
  function buildGrid(scene) {
    const W = Math.ceil(scene.world.w), H = Math.ceil(scene.world.h);
    const cells = new Uint8Array(W * H);
    const walk = scene.walkable && scene.walkable.length ? scene.walkable : [[[0, 0], [scene.world.w, 0], [scene.world.w, scene.world.h], [0, scene.world.h]]];
    const blocked = scene.blocked || [];
    const strictPlayable = scene.strictPlayable;
    const contains = (x, y) => walk.some(p => inPoly(x, y, p));
    const clearance = strictPlayable && ((x, y, radius) => {
      if (!contains(x, y)) return false;
      for (let i = 0; i < 16; i++) {
        const angle = Math.PI * i / 8;
        if (!contains(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius)) return false;
      }
      return !blocked.some(({ rect }) => {
        const [left, top, w, h] = rect;
        const dx = Math.max(left - x, x - left - w, 0), dy = Math.max(top - y, y - top - h, 0);
        return dx * dx + dy * dy <= radius * radius;
      });
    });
    for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) {
      const x = gx + 0.5, y = gy + 0.5;
      if (clearance) { cells[gy * W + gx] = +clearance(x, y, .62); continue; }
      let ok = contains(x, y);
      if (ok) for (const b of blocked) {
        if (b.circle) { const dx = x - b.circle[0], dy = y - b.circle[1]; if (dx * dx + dy * dy < (b.circle[2] + 0.45) ** 2) { ok = false; break; } }
        else if (b.rect) { const r = b.rect; if (x > r[0] - 0.45 && x < r[0] + r[2] + 0.45 && y > r[1] - 0.45 && y < r[1] + r[3] + 0.45) { ok = false; break; } }
        else if (b.poly && inPoly(x, y, b.poly)) { ok = false; break; }
      }
      cells[gy * W + gx] = ok ? 1 : 0;
    }
    return { W, H, cells, clearance };
  }

  /* 实时碰撞查询（含半径采样），供逐帧移动使用 */
  function walkableAt(grid, x, y, r) {
    const R = r || 0.55;
    if (grid.clearance) return grid.clearance(x, y, R);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2, px = x + Math.cos(a) * R, py = y + Math.sin(a) * R;
      const gx = Math.floor(px), gy = Math.floor(py);
      if (gx < 0 || gy < 0 || gx >= grid.W || gy >= grid.H || !grid.cells[gy * grid.W + gx]) return false;
    }
    return true;
  }

  /* A*（8 向，禁止切角） */
  function findPath(grid, sx, sy, tx, ty) {
    const { W, H, cells } = grid;
    const s = { x: Math.floor(sx), y: Math.floor(sy) }, t = nearestFree(grid, Math.floor(tx), Math.floor(ty));
    if (!t) return null;
    if (!free(grid, s.x, s.y)) { const n = nearestFree(grid, s.x, s.y); if (!n) return null; s.x = n.x; s.y = n.y; }
    const open = [{ x: s.x, y: s.y, g: 0, f: 0, p: null }], seen = new Map(), key = (x, y) => y * W + x;
    const goalKey = key(t.x, t.y); seen.set(key(s.x, s.y), open[0]);
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = null, guard = W * H * 4;
    while (open.length && guard-- > 0) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (key(cur.x, cur.y) === goalKey) { found = cur; break; }
      for (const [dx, dy, cost] of DIRS) {
        const nx = cur.x + dx, ny = cur.y + dy;
        if (!free(grid, nx, ny)) continue;
        if (dx && dy && (!free(grid, cur.x + dx, cur.y) || !free(grid, cur.x, cur.y + dy))) continue; /* 禁止切角 */
        if (grid.clearance && !lineFree(grid, { x: cur.x + .5, y: cur.y + .5 }, { x: nx + .5, y: ny + .5 })) continue;
        const g = cur.g + cost, k = key(nx, ny), h = Math.hypot(t.x - nx, t.y - ny);
        const prev = seen.get(k);
        if (!prev || g < prev.g) { const node = { x: nx, y: ny, g, f: g + h, p: cur }; seen.set(k, node); open.push(node); }
      }
    }
    if (!found) return null;
    const out = [];
    for (let n = found; n; n = n.p) out.push({ x: n.x + 0.5, y: n.y + 0.5 });
    out.reverse(); out[out.length - 1] = { x: t.x + 0.5, y: t.y + 0.5 };
    return smooth(grid, out);
  }
  function free(grid, x, y) { return x >= 0 && y >= 0 && x < grid.W && y < grid.H && !!grid.cells[y * grid.W + x]; }
  function nearestFree(grid, x, y) {
    if (free(grid, x, y)) return { x, y };
    if (grid.clearance) {
      let nearest = null, distance = Infinity;
      for (let gy = 0; gy < grid.H; gy++) for (let gx = 0; gx < grid.W; gx++) {
        if (!free(grid, gx, gy) || !walkableAt(grid, gx + .5, gy + .5, .62)) continue;
        const squared = (gx - x) ** 2 + (gy - y) ** 2;
        if (squared < distance) { nearest = { x: gx, y: gy }; distance = squared; }
      }
      return nearest;
    }
    for (let r = 1; r < 14; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (free(grid, x + dx, y + dy)) return { x: x + dx, y: y + dy };
    }
    return null;
  }
  function smooth(grid, path) {
    if (path.length < 3) return path;
    const out = [path[0]]; let i = 0;
    while (i < path.length - 1) {
      let j = path.length - 1;
      for (; j > i + 1; j--) if (lineFree(grid, path[i], path[j])) break;
      out.push(path[j]); i = j;
    }
    return out;
  }
  function lineFree(grid, a, b) {
    const d = Math.hypot(b.x - a.x, b.y - a.y), steps = Math.ceil(d * 2);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      if (grid.clearance ? !grid.clearance(x, y, .62) : !free(grid, Math.floor(x), Math.floor(y))) return false;
    }
    return true;
  }

  M.path = { buildGrid, walkableAt, findPath, inPoly };
})();