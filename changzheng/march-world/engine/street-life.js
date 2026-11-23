(() => {
  'use strict';
  const M = window.CZMarchWorld._;
  const lines = [
    '这天阴冷得很，把领口扣严实些。', '石板湿滑，过门槛慢些走。',
    '刚从前街回来，卖炭的还没收摊。', '等风小些，再把门板卸下来。',
    '听说城里有个会，街上比昨日安静。', '昨儿有几个红军，帮街坊把门板扶起来了。',
    '前头哨卡查得紧，送货的先在这儿等等。', '这张布告字写得齐整，你念给我听听。',
    '老槐树底下风大，咱们站到檐下说。', '灶里还煨着热水，回去暖暖手。'
  ];

  function create(T, scene, container, parent, onSurface, view, obstacles) {
    const grid = M.path.buildGrid(scene);
    const material = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .92 });
    const group = new T.Group();
    group.name = 'zunyi-pedestrians';
    const batches = new T.Group();
    batches.name = group.name;
    parent.add(batches);
    const geometries = new Map();
    function part(root, color, x, y, z, w, h, d, shape = 'box') {
      if (!geometries.has(shape)) geometries.set(shape, shape === 'box' ? new T.BoxGeometry() :
        new T.SphereGeometry(.5, 8, 6));
      const mesh = new T.Mesh(geometries.get(shape), material);
      mesh.userData.tint = color;
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      root.add(mesh);
      return mesh;
    }
    const tone = hex => new T.Color(hex);
    let seed = 193501;
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    const turnToward = (a, b, dt) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * (1 - Math.exp(-dt * 9));
    const people = scene.streetLife.map(({ stops, observe }, i) => {
      const root = new T.Group();
      group.add(root);
      const coat = tone([0x4b4f42, 0x5b5143, 0x383e43, 0x5e554a][i % 4]);
      const cloth = tone(i % 2 ? 0x3a3832 : 0x3b3d39);
      const skin = tone(0xa47b5c);
      const head = new T.Group();
      head.position.y = 1.45;
      root.add(head);
      part(root, coat, 0, 1.07, 0, .40, .56, .24, 'round');
      part(root, coat, 0, .85, 0, .37, .30, .24);
      part(head, skin, 0, .02, .015, .22, .25, .22, 'round');
      part(head, cloth, 0, .12, .005, .24, .115, .235, 'round');
      const arms = [], legs = [];
      for (const side of [-1, 1]) {
        const arm = new T.Group(), leg = new T.Group();
        arm.position.set(side * .205, 1.24, 0);
        leg.position.set(side * .095, .78, 0);
        root.add(arm, leg);
        part(arm, coat, 0, -.22, 0, .115, .48, .12);
        part(leg, cloth, 0, -.35, .015, .14, .70, .145);
        part(leg, cloth, 0, -.727, .056, .14, .105, .23);
        arms.push(arm); legs.push(leg);
      }
      const [x, y] = stops[0];
      return { root, head, arms, legs, stops, observe, x, y, ground: onSurface(x, y).y,
        heading: Math.PI / 2, state: 'STROLL', dest: 0, route: [], speed: 1.1 + .4 * random(),
        timer: 0, cooldown: random() * 3, phase: random() * 6, gait: 0 };
    });

    const instances = [...geometries.values()].map(geometry => {
      const parts = [];
      group.traverse(node => { if (node.geometry === geometry) parts.push(node); });
      const mesh = new T.InstancedMesh(geometry, material, parts.length);
      parts.forEach((part, index) => mesh.setColorAt(index, part.userData.tint));
      mesh.frustumCulled = false;
      batches.add(mesh);
      return { mesh, parts };
    });

    const notice = document.createElement('canvas');
    notice.width = 128; notice.height = 160;
    const ctx = notice.getContext('2d');
    ctx.fillStyle = '#52483a'; ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = '#a99b7c'; ctx.fillRect(11, 10, 106, 139);
    ctx.fillStyle = '#493e31'; ctx.textAlign = 'center'; ctx.font = '21px serif';
    ctx.fillText('告 示', 64, 39);
    ctx.font = '13px serif';
    ['街巷通行', '请勿拥挤', '往来慢行'].forEach((line, i) => ctx.fillText(line, 64, 66 + i * 20));
    const paper = new T.CanvasTexture(notice);
    paper.colorSpace = T.SRGBColorSpace;
    const board = new T.Mesh(new T.PlaneGeometry(.72, .9), new T.MeshStandardMaterial({ map: paper, roughness: .96 }));
    board.position.copy(onSurface(70.19, 43, 1.52));
    board.rotation.y = Math.PI / 2;
    batches.add(board);

    function nextRoute(person) {
      person.dest = (person.dest + 1 + Math.floor(random() * (person.stops.length - 1))) % person.stops.length;
      const [x, y] = person.stops[person.dest];
      person.route = M.path.findPath(grid, person.x, person.y, x, y) || [];
    }

    function walk(person, player, dt) {
      if (!person.route.length) nextRoute(person);
      const target = person.route[0];
      if (!target) return 0;
      let dx = target.x - person.x, dy = target.y - person.y;
      const length = Math.hypot(dx, dy);
      if (length < .12) {
        person.route.shift();
        if (!person.route.length && person.observe && random() < .68) {
          person.state = 'PAUSE_OBSERVE';
          person.timer = 4 + random() * 4;
        }
        return 0;
      }
      dx /= length; dy /= length;
      const playerX = player.x - person.x, playerY = player.y - person.y;
      const toPlayer = Math.hypot(playerX, playerY);
      const ahead = dx * playerX + dy * playerY > toPlayer * .6;
      person.state = ahead && toPlayer < 2.2 ? 'YIELD' : 'STROLL';
      if (person.state === 'YIELD') {
        if (toPlayer < 1.6 && !player.moving) {
          person.heading = turnToward(person.heading, Math.atan2(playerY, playerX), dt);
          return 0;
        }
        person.side ||= dx * playerY - dy * playerX > 0 ? -1 : 1;
        const steer = person.side * Math.min(1, (2.2 - toPlayer) / .6);
        [dx, dy] = [dx - dy * steer, dy + dx * steer];
      } else person.side = 0;

      // Keep personal space without adding a body to the player's collision grid.
      for (const other of people) {
        if (other === person) continue;
        const sx = person.x - other.x, sy = person.y - other.y;
        const distance = Math.hypot(sx, sy);
        if (distance > .001 && distance < 1.05) {
          const repel = (1.05 - distance) / distance;
          dx += sx * repel; dy += sy * repel;
        }
      }
      const norm = Math.hypot(dx, dy) || 1, stride = Math.min(length, person.speed * dt);
      const x = person.x + dx / norm * stride, y = person.y + dy / norm * stride;
      if (Math.hypot(x - player.x, y - player.y) < .92 ||
          people.some(other => other !== person && Math.hypot(x - other.x, y - other.y) < .60)) return 0;
      if (!M.path.walkableAt(grid, x, y, M.player.RADIUS)) {
        if (person.state !== 'YIELD') person.route.length = 0;
        return 0;
      }
      person.x = x; person.y = y;
      person.heading = turnToward(person.heading, Math.atan2(dy, dx), dt);
      return person.speed;
    }

    const bubble = document.createElement('div');
    bubble.className = 'czmw-street-line';
    bubble.setAttribute('aria-hidden', 'true');
    container.append(bubble);
    const projected = new T.Vector3(), ray = new T.Ray(), hit = new T.Vector3();
    const speech = { owner: null, until: 0, next: 0 };
    let elapsed = 0;

    function showSpeech(player, camera) {
      const eligible = p => (p.state === 'PAUSE_OBSERVE' || p.state === 'CHAT_PAIR') &&
        Math.hypot(player.x - p.x, player.y - p.y) < 9;
      if (elapsed >= speech.next && !speech.owner) {
        const candidates = people.filter(eligible);
        if (candidates.length) {
          speech.owner = candidates[Math.floor(random() * candidates.length)];
          speech.until = elapsed + 3.5;
          speech.next = elapsed + 7 + random() * 3;
          bubble.textContent = lines[Math.floor(random() * lines.length)];
        }
      }
      if (speech.owner && (elapsed >= speech.until || !eligible(speech.owner))) speech.owner = null;
      let visible = false;
      if (speech.owner) {
        const p = speech.owner;
        projected.copy(p.root.position).y += 1.8;
        ray.origin.copy(camera.position);
        ray.direction.copy(projected).sub(ray.origin).normalize();
        const distance = projected.distanceTo(ray.origin);
        const covered = obstacles.some(({object, bounds}) => !object && ray.intersectBox(bounds, hit) && hit.distanceTo(ray.origin) < distance - .12);
        projected.project(camera);
        visible = !covered && Math.abs(projected.x) < .86 && Math.abs(projected.y) < .90 && Math.abs(projected.z) < 1;
        if (visible) {
          bubble.style.left = ((projected.x + 1) * view.viewW / 2) + 'px';
          bubble.style.top = ((1 - projected.y) * view.viewH / 2) + 'px';
        }
      }
      bubble.classList.toggle('is-visible', visible);
    }

    let nextChatCheck = 0;
    return {
      update(dt, player, camera) {
        elapsed += dt;
        if (elapsed >= nextChatCheck) {
          nextChatCheck = elapsed + 1;
          for (const [i, p] of people.entries()) {
            if (p.state !== 'STROLL' || p.cooldown > 0) continue;
            const partner = people.slice(i + 1).find(q => q.state === 'STROLL' && q.cooldown <= 0 &&
              Math.hypot(p.x - q.x, p.y - q.y) < 2.4 &&
              M.path.walkableAt(grid, (p.x + q.x) / 2, (p.y + q.y) / 2, M.player.RADIUS));
            if (!partner || random() >= .52) continue;
            const timer = 5 + random() * 3;
            for (const [a, b] of [[p, partner], [partner, p]]) {
              a.state = 'CHAT_PAIR'; a.partner = b; a.timer = timer;
            }
          }
        }
        for (const p of people) {
          let speed = 0;
          p.cooldown = Math.max(0, p.cooldown - dt);
          if (dt && (p.state === 'PAUSE_OBSERVE' || p.state === 'CHAT_PAIR')) {
            const [x, y] = p.partner ? [p.partner.x, p.partner.y] : p.observe;
            p.heading = turnToward(p.heading, Math.atan2(y - p.y, x - p.x), dt);
            p.timer -= dt;
            if (p.timer <= 0) {
              p.state = 'STROLL'; p.partner = null; p.cooldown = 12 + random() * 10;
              p.route.length = 0;
            }
          } else if (dt) speed = walk(p, player, dt);
          p.root.userData.state = p.state;
          p.root.position.copy(onSurface(p.x, p.y));
          p.ground = Math.max(p.root.position.y, p.ground + (p.root.position.y - p.ground) * (1 - Math.exp(-dt * 25)));
          p.root.position.y = p.ground;
          p.root.rotation.y = Math.PI / 2 - p.heading;
          p.phase += speed * dt * 6;
          p.gait += ((speed ? 1 : 0) - p.gait) * (1 - Math.exp(-dt * 12));
          const swing = Math.sin(p.phase) * p.gait;
          p.legs[0].rotation.x = swing * .4; p.legs[1].rotation.x = -swing * .4;
          p.arms[0].rotation.x = -swing * .22; p.arms[1].rotation.x = swing * .22;
          p.head.rotation.x = p.state === 'CHAT_PAIR' ? .06 * Math.sin(elapsed * 3 + p.phase) : 0;
        }
        group.updateMatrixWorld(true);
        for (const { mesh, parts } of instances) {
          parts.forEach((part, i) => mesh.setMatrixAt(i, part.matrixWorld));
          mesh.instanceMatrix.needsUpdate = true;
        }
        showSpeech(player, camera);
      },
      dispose() {
        batches.removeFromParent(); bubble.remove();
        for (const { mesh } of instances) mesh.dispose();
        paper.dispose(); board.material.dispose(); board.geometry.dispose();
        for (const g of geometries.values()) g.dispose();
        material.dispose();
      }
    };
  }
  M.streetLife = { create };
})();
