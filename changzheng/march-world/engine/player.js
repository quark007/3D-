/* march-world 内部模块：第三人称角色——移动、碰撞滑动、贴地、远近比例、行走/待机动画。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};
  const WALK_SPEED = 1.5;    /* C 键步行：米/秒 */
  const SPEED = 4;           /* 普通慢跑：米/秒 */
  const RUN_SPEED = 7;       /* Shift 冲刺：米/秒 */
  const BACKWARD_SPEED = 1.6;
  const ACCELERATION = 10;   /* 起步与转向加速度：米/秒² */
  const DECELERATION = 14;   /* 松键后的减速度：米/秒² */
  const TURN_RATE = 11;
  const STOP_SPEED = .035;
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
      moving: false, running: false, walking: false, backing: false,
      vx: 0, vy: 0, speed: 0, t: 0, path: null, pathI: 0, accumulator: 0, jumpTime: JUMP_DURATION
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
      get walking() { return p.walking; },
      get backing() { return p.backing; },
      get speed() { return p.speed; },
      get velocity() { return { x: p.vx, y: p.vy }; },
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
      setPos(x, y, facing) {
        p.x = x; p.y = y; if (facing != null) p.facing = normFacing(facing);
        p.path = null; p.vx = p.vy = p.speed = 0; p.accumulator = 0; p.jumpTime = JUMP_DURATION;
        p.moving = p.running = p.walking = p.backing = false;
      },
      moveTo(path) { p.path = path; p.pathI = 0; },
      stopPath() { p.path = null; },
      halt() {
        p.path = null; p.vx = p.vy = p.speed = 0; p.accumulator = 0;
        p.moving = p.running = p.walking = p.backing = false;
      },
      /* 固定 60Hz 碰撞；加速度、松键减速和转向都基于实际速度，而不是输入开关。 */
      advance(dt, vec, run = false, backward = false, walk = false) {
        p.accumulator=Math.min(.1,p.accumulator+Math.max(0,dt));
        while(p.accumulator+1e-9>=1/60){this.update(1/60,vec,run,backward,walk);p.accumulator-=1/60;}
      },
      update(dt, vec, run = false, backward = false, walk = false) {
        p.jumpTime = Math.min(JUMP_DURATION, p.jumpTime + dt);
        const backing = !p.path && backward, walking = walk && !run;
        let dx = 0, dy = 0, amount = 0, pathDistance = Infinity;
        while (p.path) { /* 点击移动沿路径，终点前按制动距离减速 */
          const t = p.path[p.pathI];
          if (!t) { p.path = null; break; }
          const tx = t.x - p.x, ty = t.y - p.y, d = Math.hypot(tx, ty);
          if (d < .12) { p.pathI++; if (p.pathI >= p.path.length) p.path = null; continue; }
          dx = tx / d; dy = ty / d; amount = 1; pathDistance = d; break;
        }
        if (!p.path && vec) {
          let vx = vec.x, vy = vec.y;
          if (backing) {
            // Backward input stays relative to the actor, including diagonal steps.
            const cos = Math.cos(p.facing), sin = Math.sin(p.facing);
            vx = -cos * vec.y - sin * vec.x;
            vy = -sin * vec.y + cos * vec.x;
          }
          const length = Math.hypot(vx, vy);
          if (length > .001) { dx = vx / length; dy = vy / length; amount = Math.min(1, length); }
        }
        let targetSpeed = amount * (backing ? BACKWARD_SPEED : walking ? WALK_SPEED : run ? RUN_SPEED : SPEED);
        if (Number.isFinite(pathDistance)) targetSpeed = Math.min(targetSpeed, Math.sqrt(Math.max(0, pathDistance - .08) * 2 * DECELERATION));
        const targetVx = dx * targetSpeed, targetVy = dy * targetSpeed;
        const changeX = targetVx - p.vx, changeY = targetVy - p.vy, change = Math.hypot(changeX, changeY);
        const maxChange = (targetSpeed > p.speed ? ACCELERATION : DECELERATION) * dt;
        if (change > maxChange && change > 0) { p.vx += changeX / change * maxChange; p.vy += changeY / change * maxChange; }
        else { p.vx = targetVx; p.vy = targetVy; }
        p.speed = Math.hypot(p.vx, p.vy);
        if (!targetSpeed && p.speed < STOP_SPEED) { p.vx = p.vy = p.speed = 0; }
        if (amount && !backing) {
          const desired = Math.atan2(dy, dx), delta = Math.atan2(Math.sin(desired - p.facing), Math.cos(desired - p.facing));
          p.facing += delta * (1 - Math.exp(-TURN_RATE * dt));
        }
        if (p.speed > 0) {
          const oldX = p.x, oldY = p.y;
          tryMove(p.x + p.vx * dt, p.y + p.vy * dt);
          if (p.x === oldX) p.vx = 0;
          if (p.y === oldY) p.vy = 0;
          p.speed = Math.hypot(p.vx, p.vy);
          /* 被墙挡住时取消寻路，避免顶着墙走 */
          if (p.path && amount && !M.path.walkableAt(grid, p.x + dx * 0.7, p.y + dy * 0.7, RADIUS) && !M.path.walkableAt(grid, p.x + dx * 0.7, p.y, RADIUS) && !M.path.walkableAt(grid, p.x, p.y + dy * 0.7, RADIUS)) p.path = null;
        }
        p.moving = p.speed >= STOP_SPEED;
        p.backing = p.moving && backing;
        p.running = p.moving && !p.backing && run && !walking;
        p.walking = p.moving && !p.backing && walking;
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

  M.player = { create, WALK_SPEED, SPEED, RUN_SPEED, RADIUS, ROLES, JUMP_DURATION };
})();
