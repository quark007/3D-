/* march-world 内部模块：第三人称角色——移动、碰撞滑动、贴地、远近比例、行走/待机动画。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};
  const SPEED = 9.5;         /* 世界单位/秒 */
  const RADIUS = 0.62;       /* 碰撞半径 */
  const ROLES={
    commander:{role:'commander',name:'红军连长',short:'连长',coat:'#465944',hat:'#354333',leg:'#4b5142',pack:'#755638'},
    logistics:{role:'logistics',name:'后勤补给员',short:'后勤',coat:'#9b8058',hat:'#756b4c',leg:'#625443',pack:'#61573d'},
    soldier:{role:'soldier',name:'普通红军战士',short:'战士',coat:'#60777b',hat:'#4e6666',leg:'#4a5c5e',pack:'#857b5e'},
    medic:{role:'medic',name:'红军女医护',short:'医护',coat:'#d5ccae',hat:'#677662',leg:'#606954',pack:'#eee2c4'}
  };

  function create(scene, grid, spawn, roleId='soldier') {
    const profile=ROLES[roleId]||ROLES.soldier;
    const style = {...scene.playerStyle,...profile};
    const frames = M.painter.figureFrames(style);
    const p = {
      x: spawn && Number.isFinite(spawn.x) ? spawn.x : scene.spawn.x,
      y: spawn && Number.isFinite(spawn.y) ? spawn.y : scene.spawn.y,
      facing: normFacing(spawn && spawn.facing != null ? spawn.facing : scene.spawn.facing),
      moving: false, t: 0, path: null, pathI: 0, accumulator: 0
    };
    if (!M.path.walkableAt(grid, p.x, p.y, RADIUS)) { const s = scene.spawn; p.x = s.x; p.y = s.y; }

    function normFacing(f) {
      if (typeof f === 'string') { return { n: -Math.PI / 2, s: Math.PI / 2, e: 0, w: Math.PI }[f] ?? Math.PI / 2; }
      return Number.isFinite(f) ? f : Math.PI / 2;
    }
    function dir4(a) { /* 弧度 → 四方向 */
      const d = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      if (d > Math.PI * 1.75 || d <= Math.PI * 0.25) return 'e';
      if (d <= Math.PI * 0.75) return 's';
      if (d <= Math.PI * 1.25) return 'w';
      return 'n';
    }
    function tryMove(nx, ny) {
      if (M.path.walkableAt(grid, nx, ny, RADIUS)) { p.x = nx; p.y = ny; return; }
      if (M.path.walkableAt(grid, nx, p.y, RADIUS)) { p.x = nx; return; }   /* 沿墙滑动 */
      if (M.path.walkableAt(grid, p.x, ny, RADIUS)) { p.y = ny; }
    }
    return {
      roleId:profile.role,roleName:profile.name,roleShort:profile.short,
      headPoint(cam){const pr=M.proj.project(cam,p.x,p.y,0),s=M.proj.depthScale(p.y,scene.world.h)*cam.zoom/12.5;return{x:pr.x,y:pr.y-40*s-6};},
      get x() { return p.x; }, get y() { return p.y; }, get facing() { return p.facing; },
      get moving() { return p.moving; },
      setPos(x, y, facing) { p.x = x; p.y = y; if (facing != null) p.facing = normFacing(facing); p.path = null; },
      moveTo(path) { p.path = path; p.pathI = 0; },
      stopPath() { p.path = null; },
      /* Preserve wall-clock walking speed at 10–30 FPS, while collision stays at 60 Hz. */
      advance(dt,vec){
        p.accumulator=Math.min(.1,p.accumulator+Math.max(0,dt));
        while(p.accumulator+1e-9>=1/60){this.update(1/60,vec);p.accumulator-=1/60;}
      },
      update(dt, vec) {
        let vx = 0, vy = 0;
        if (p.path) { /* 点击移动沿路径 */
          const t = p.path[p.pathI];
          if (!t) { p.path = null; }
          else {
            const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
            if (d < 0.35) { p.pathI++; if (p.pathI >= p.path.length) p.path = null; }
            else { vx = dx / d; vy = dy / d; }
          }
        } else if (vec && (vec.x || vec.y)) { vx = vec.x; vy = vec.y; }
        p.moving = !!(vx || vy);
        if (p.moving) {
          p.facing = Math.atan2(vy, vx);
          tryMove(p.x + vx * SPEED * dt, p.y + vy * SPEED * dt);
          /* 被墙挡住时取消寻路，避免顶着墙走 */
          if (p.path && !M.path.walkableAt(grid, p.x + vx * 0.7, p.y + vy * 0.7, RADIUS) && !M.path.walkableAt(grid, p.x + vx * 0.7, p.y, RADIUS) && !M.path.walkableAt(grid, p.x, p.y + vy * 0.7, RADIUS)) p.path = null;
        }
        p.t += dt;
      },
      draw(ctx, cam) {
        const pr = M.proj.project(cam, p.x, p.y, 0);
        const s = M.proj.depthScale(p.y, scene.world.h) * cam.zoom / 12.5;
        const dir = dir4(p.facing), set = frames[dir];
        const list = p.moving ? set.walk : set.idle;
        const img = list[Math.floor(p.t * (p.moving ? 9 : 2.2)) % list.length];
        const w = 38 * s, h = 40 * s;
        /* 贴地阴影 */
        ctx.save();
        ctx.fillStyle = 'rgba(30,28,22,0.28)';
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y, w * 0.3, h * 0.07, 0, 0, 7); ctx.fill();
        ctx.drawImage(img, pr.x - w / 2, pr.y - h + h * 0.06, w, h);
        ctx.restore();
      },
      sortY: () => p.y
    };
  }

  M.player = { create, SPEED, RADIUS, ROLES };
})();
