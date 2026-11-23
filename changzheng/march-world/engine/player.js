/* march-world 内部模块：第三人称角色——移动、碰撞滑动、贴地、远近比例、行走/待机动画。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};
  const SPEED = 9.5;         /* 世界单位/秒 */
  const RUN_SPEED = SPEED * 1.6;
  const BACKWARD_SPEED = SPEED * .65;
  const JUMP_DURATION = .64;
  const JUMP_HEIGHT = .76;
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
      moving: false, running: false, backing: false, t: 0, path: null, pathI: 0, accumulator: 0, jumpTime: JUMP_DURATION
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
      headPoint(cam){const pr=M.proj.project(cam,p.x,p.y,this.jumpHeight),s=M.proj.depthScale(p.y,scene.world.h)*cam.zoom/12.5;return{x:pr.x,y:pr.y-40*s-6};},
      get x() { return p.x; }, get y() { return p.y; }, get facing() { return p.facing; },
      get moving() { return p.moving; },
      get running() { return p.running; },
      get backing() { return p.backing; },
      get airborne() { return p.jumpTime < JUMP_DURATION; },
      get jumpHeight() {
        const progress = p.jumpTime / JUMP_DURATION;
        return 4 * JUMP_HEIGHT * progress * (1 - progress);
      },
      jump() {
        if (this.airborne) return;
        p.jumpTime = 0;
        p.path = null;
      },
      setPos(x, y, facing) { p.x = x; p.y = y; if (facing != null) p.facing = normFacing(facing); p.path = null; p.jumpTime = JUMP_DURATION; },
      moveTo(path) { p.path = path; p.pathI = 0; },
      stopPath() { p.path = null; p.moving = p.running = p.backing = false; },
      /* Preserve wall-clock walking speed at 10–30 FPS, while collision stays at 60 Hz. */
      advance(dt, vec, run = false, backward = false) {
        p.accumulator=Math.min(.1,p.accumulator+Math.max(0,dt));
        while(p.accumulator+1e-9>=1/60){this.update(1/60,vec,run,backward);p.accumulator-=1/60;}
      },
      update(dt, vec, run = false, backward = false) {
        p.jumpTime = Math.min(JUMP_DURATION, p.jumpTime + dt);
        const backing = !p.path && backward;
        let vx = 0, vy = 0, waypointDistance = Infinity;
        if (p.path) { /* 点击移动沿路径 */
          const t = p.path[p.pathI];
          if (!t) { p.path = null; }
          else {
            const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
            if (d < (grid.clearance ? .04 : .35)) { p.pathI++; if (p.pathI >= p.path.length) p.path = null; }
            else { vx = dx / d; vy = dy / d; if (grid.clearance) waypointDistance = d; }
          }
        } else if (vec && backing) {
          // Backward input stays relative to the actor, including diagonal steps.
          const cos = Math.cos(p.facing), sin = Math.sin(p.facing);
          vx = -cos * vec.y - sin * vec.x;
          vy = -sin * vec.y + cos * vec.x;
        } else if (vec) { vx = vec.x; vy = vec.y; }
        p.moving = !!(vx || vy);
        p.backing = p.moving && backing;
        p.running = p.moving && !p.backing && run;
        if (p.moving) {
          if (!p.backing) p.facing = Math.atan2(vy, vx);
          const speed = p.backing ? BACKWARD_SPEED : p.running ? RUN_SPEED : SPEED;
          const lastX = p.x, lastY = p.y;
          const step = Math.min(speed * dt, waypointDistance);
          tryMove(p.x + vx * step, p.y + vy * step);
          /* 被墙挡住时取消寻路，避免顶着墙走 */
          if (p.path) {
            const stuck = grid.clearance ? p.x === lastX && p.y === lastY :
              !M.path.walkableAt(grid, p.x + vx * 0.7, p.y + vy * 0.7, RADIUS) &&
              !M.path.walkableAt(grid, p.x + vx * 0.7, p.y, RADIUS) &&
              !M.path.walkableAt(grid, p.x, p.y + vy * 0.7, RADIUS);
            if (stuck) p.path = null;
          }
        }
        p.t += dt * (p.running ? 1.5 : p.backing ? .8 : 1);
      },
      draw(ctx, cam) {
        const pr = M.proj.project(cam, p.x, p.y, 0);
        const s = M.proj.depthScale(p.y, scene.world.h) * cam.zoom / 12.5;
        const dir = dir4(p.facing), set = frames[dir];
        const list = p.moving ? set.walk : set.idle;
        const frame = Math.floor(p.t * (p.moving ? 9 : 2.2)) % list.length;
        const img = list[p.backing && p.moving ? list.length - 1 - frame : frame];
        const w = 38 * s, h = 40 * s;
        const lifted = M.proj.project(cam, p.x, p.y, this.jumpHeight);
        /* 贴地阴影 */
        ctx.save();
        ctx.fillStyle = 'rgba(30,28,22,0.28)';
        ctx.beginPath(); ctx.ellipse(pr.x, pr.y, w * 0.3, h * 0.07, 0, 0, 7); ctx.fill();
        ctx.drawImage(img, pr.x - w / 2, lifted.y - h + h * 0.06, w, h);
        ctx.restore();
      },
      sortY: () => p.y
    };
  }

  M.player = { create, SPEED, RADIUS, ROLES, JUMP_DURATION };
})();
