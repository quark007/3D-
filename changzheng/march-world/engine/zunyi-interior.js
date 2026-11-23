/* march-world 内部模块：遵义会议会址主楼内部（第 3 章）
 *
 * 现状问题（读 renderer3d.js 得到）
 * -------------------------------
 * 1. `room(x, z, w, d, bottom, top)` 的实现是 `solid(w, top - bottom, d, ...)`，
 *    也就是**一整个实心盒子**。所以主楼没有内部，玩家进不去。
 * 2. 全文没有给 `player.y` 赋值，玩家永远贴在地面高度行走，**没有楼层概念**。
 * 3. 楼梯 prop（`:1504`）只是装饰，8 块石阶，不可行走。
 *
 * 本模块负责
 * ----------
 * · `shell()`  把实心盒子换成「四面墙 + 门洞 + 楼板开洞」的空心壳
 * · `build()`  在里面生成：门厅、楼梯、二楼走道、27㎡ 会议室及全部陈设
 * · 返回 `colliders`（内部隔墙）与 `floorHeightAt()`（楼层采样，供玩家落地用）
 *
 * 史实依据（遵义会议纪念馆口径）
 * -----------------------------
 * · 会议室在二楼东走道尽头，原房主柏辉章的小客厅，27 ㎡，米白墙
 * · 东壁：木壳自鸣摆钟 + 两个壁柜，其一嵌穿衣镜
 * · 西壁：一排轩亮玻璃窗
 * · 顶壁正中：荷叶边盖洋油灯
 * · 正中：板栗色土漆长方桌 200×100×80，鱼背形边沿，15.8cm 边框，方宝瓶桌腿
 * · 桌周：木边藤心折叠靠背椅 20 把
 * · 桌下：木炭火盆
 *
 * 坐标约定
 * --------
 * 全部在建筑的 `group` 局部坐标里生成：原点在建筑中心，门朝 +Z，
 * 一层地面 y = bottom，二层楼板 y = floor。group 被旋转 π 也不影响。
 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};

  const DEFAULTS = {
    bottom: 0.34,      // 台基顶面（一层地面）
    floor: 3.08,       // 二层楼板
    eave: 5.95,        // 檐口（二层天花）
    doorWidth: 1.7,
    doorHeight: 2.30,
    roomShareX: 0.50,  // 会议室占室内宽度比例（目标 5.4 m）
    roomShareZ: 0.80,  // 会议室占室内进深比例（目标 5.0 m）
    stairWidth: 1.10,
    stairRun: 0.26
  };

  let api = null;      // 缓存的内部结构
  let transform = null; // 世界→局部
  let world = null;     // 局部→世界

  /* ---------- 工具 ---------- */
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* 长方桌：鱼背形边沿 + 15.8cm 薄木板边框 + 方宝瓶桌腿 */
  function longTable(ctx, cx, y, cz, w, d, h) {
    const { solid, material, mesh, T } = ctx;
    const table = material('#5a3418', 0.36);
    const dark = material('#3f2d1f', 0.6);
    solid(w, 0.07, d, table, cx, y + h - 0.035, cz);
    // 鱼背边沿
    for (const [bw, bd, ox, oz] of [[w, 0.05, 0, d / 2 - 0.025], [w, 0.05, 0, -d / 2 + 0.025],
                                     [0.05, d, w / 2 - 0.025, 0], [0.05, d, -w / 2 + 0.025, 0]]) {
      solid(bw, 0.028, bd, table, cx + ox, y + h + 0.012, cz + oz);
    }
    // 15.8cm 木板边框
    solid(w + 0.06, 0.158, d + 0.06, dark, cx, y + h - 0.14, cz);
    // 四条腿（柱身 + 宝瓶收腰 + 足）
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const lx = cx + sx * (w / 2 - 0.14), lz = cz + sz * (d / 2 - 0.14);
      solid(0.12, h - 0.26, 0.12, table, lx, y + (h - 0.26) / 2 + 0.06, lz);
      mesh(new T.CylinderGeometry(0.08, 0.048, 0.17, 10), table, lx, y + 0.16, lz);
      solid(0.22, 0.055, 0.22, table, lx, y + 0.028, lz);
    }
  }

  /* 木边藤心折叠靠背椅 */
  function chair(ctx, px, py, pz, rotY) {
    const { solid, material, mesh, T } = ctx;
    const wood = material('#3f2d1f', 0.62);
    const rattan = material('#c2a06a', 0.9);
    const g = new T.Group();
    g.position.set(px, py, pz); g.rotation.y = rotY;
    ctx.group.add(g);

    const seat = mesh(new T.BoxGeometry(0.44, 0.045, 0.42), rattan, 0, 0.45, 0, g);
    seat.castShadow = true; seat.receiveShadow = true;
    for (const [bw, bd, ox, oz] of [[0.47, 0.04, 0, 0.215], [0.47, 0.04, 0, -0.215],
                                     [0.04, 0.42, 0.225, 0], [0.04, 0.42, -0.225, 0]]) {
      mesh(new T.BoxGeometry(bw, 0.06, bd), wood, ox, 0.45, oz, g);
    }
    for (const sx of [-1, 1]) mesh(new T.BoxGeometry(0.045, 0.54, 0.045), wood, sx * 0.205, 0.73, -0.2, g);
    for (const hy of [0.84, 0.97]) mesh(new T.BoxGeometry(0.44, 0.055, 0.04), wood, 0, hy, -0.2, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      mesh(new T.BoxGeometry(0.038, 0.45, 0.038), wood, sx * 0.195, 0.225, sz * 0.185, g);
    }
    return g;
  }

  /* ============================================================
     shell：把实心盒子换成空心壳（四面墙 + 门洞 + 楼板开洞）
     返回 { colliders, floorHeightAt } 所需的几何信息
     ============================================================ */
  function shell(ctx) {
    const { solid, material, width, depth, bottom, floor, eave, opts } = ctx;
    const t = 0.30;                       // 墙厚
    const m = material('#cfc7b6', 0.92);  // 米白灰泥
    const woodM = material('#5b4128', 0.6);
    const dw = opts.doorWidth, dh = opts.doorHeight;
    const halfW = width / 2, halfD = depth / 2;

    // 北墙、东墙、西墙（整面）
    solid(width, eave - bottom, t, m, 0, (bottom + eave) / 2, -halfD + t / 2);
    solid(t, eave - bottom, depth, m, -halfW + t / 2, (bottom + eave) / 2, 0);
    solid(t, eave - bottom, depth, m, halfW - t / 2, (bottom + eave) / 2, 0);

    // 南墙：门洞两侧 + 门楣
    const sideW = (width - dw) / 2;
    for (const s of [-1, 1]) {
      solid(sideW, eave - bottom, t, m, s * (dw / 2 + sideW / 2), (bottom + eave) / 2, halfD - t / 2);
    }
    solid(dw, eave - bottom - dh, t, m, 0, bottom + dh + (eave - bottom - dh) / 2, halfD - t / 2);

    // 门套
    for (const s of [-1, 1]) solid(0.09, dh + 0.06, 0.14, woodM, s * (dw / 2 + 0.03), bottom + dh / 2, halfD - 0.05);
    solid(dw + 0.2, 0.1, 0.16, woodM, 0, bottom + dh + 0.05, halfD - 0.05);

    /* 二层楼板：留出楼梯洞（西南角） */
    const holeW = opts.stairWidth + 0.36, holeD = 3.4;
    const hx = -halfW + t + holeW / 2;             // 洞中心 X（贴西墙）
    const hz = halfD - t - holeD / 2;              // 洞中心 Z（贴南侧，楼梯上行向北）
    const slab = material('#7a593c', 0.72);
    // 四块拼成带洞的楼板
    solid(width - 2 * t, 0.18, halfD - (hz + holeD / 2), slab,
          0, floor, (hz + holeD / 2 + halfD - t) / 2);                     // 洞以南
    solid(width - 2 * t, 0.18, (hz - holeD / 2) - (-halfD + t), slab,
          0, floor, (hz - holeD / 2 - halfD + t) / 2);                     // 洞以北
    solid((hx - holeW / 2) - (-halfW + t), 0.18, holeD, slab,
          (-halfW + t + hx - holeW / 2) / 2, floor, hz);                   // 洞以西
    solid((halfW - t) - (hx + holeW / 2), 0.18, holeD, slab,
          (hx + holeW / 2 + halfW - t) / 2, floor, hz);                    // 洞以东

    // 楼梯口护栏（二层）
    solid(0.07, 0.95, holeD, woodM, hx + holeW / 2, floor + 0.48, hz);
    solid(holeW, 0.95, 0.07, woodM, hx, floor + 0.48, hz - holeD / 2);

    /* 楼梯：从一层上行到 floor，贴西墙 */
    const rise = (floor - bottom) / 14;
    const run = opts.stairRun;
    const z0 = hz + holeD / 2 - 0.2;
    for (let i = 0; i < 14; i++) {
      const y = bottom + rise * (i + 1);
      solid(opts.stairWidth, rise, run, woodM, hx, y - rise / 2, z0 - run * i - run / 2);
    }
    // 楼梯扶手
    for (let i = 0; i < 14; i += 2) {
      const y = bottom + rise * (i + 1), z = z0 - run * i - run / 2;
      solid(0.045, 0.9, 0.045, woodM, hx + opts.stairWidth / 2, y + 0.45, z);
    }

    return { t, hx, hz, holeW, holeD, rise, run, z0 };
  }

  /* ============================================================
     build：内部陈设
     ============================================================ */
  function build(ctx, geo) {
    const { solid, material, mesh, T, width, depth, bottom, floor, eave, opts, pickSurfaces } = ctx;
    const t = geo.t, halfW = width / 2, halfD = depth / 2;
    const innerW = width - 2 * t, innerD = depth - 2 * t;
    const wallM = material('#cfc7b6', 0.92);
    const woodM = material('#5b4128', 0.6);
    const woodD = material('#3f2d1f', 0.62);
    const glassLit = material('#8a6a3a', 0.35);
    // 内窗玻璃：微自发光，否则在封闭房间里读成一块暗板
    const glassWindow = material('#cfd8dc', 0.12).clone();
    glassWindow.emissive = new T.Color('#b9cbd6');
    glassWindow.emissiveIntensity = 0.55;
    const colliders = [];

    /* level：1 = 只有一层有这道墙，2 = 只有二层有；不写就是两层都有（外墙） */
    const addCollider = (x, z, w, d, level = 0) => colliders.push({ x1: x - w / 2, x2: x + w / 2, z1: z - d / 2, z2: z + d / 2, level });

    /* ---------- 一层：门厅 + 作战室（会议室正下方） ---------- */
    // 阶梯（门外，用现有 steps 已生成，这里补室内门厅地面）
    solid(innerW, 0.06, innerD, material('#6a4c33', 0.74), 0, bottom + 0.03, 0);
    /* 一层门厅补一盏暖光，否则封闭房间里只剩环境光 */
    const hallLight = new T.PointLight('#ffd9a8', 13, 13, 2);
    hallLight.position.set(0, bottom + 2.25, 0); ctx.group.add(hallLight);

    // 作战室隔墙：一层东侧，X 方向一道，留门洞
    const opsX = innerW * 0.18;
    const opsW = innerW * 0.34;
    solid(opsW, (floor - bottom) - 2.2, 0.16, wallM, opsX + opsW / 2, bottom + 2.2 + ((floor - bottom) - 2.2) / 2, 0.6);
    for (const s of [-1, 1]) {
      solid(0.16, (floor - bottom), 1.6, wallM, opsX, (bottom + floor) / 2, 0.6 + s * 1.6);
    }
    // 隔墙碰撞只取两侧实墙，中间 1.6m 门洞留空（整条墙会让门洞走不过去）
    addCollider(opsX, 0.6 - 1.6, 0.2, 1.6);
    addCollider(opsX, 0.6 + 1.6, 0.2, 1.6);

    // 作战室长桌 + 墙上的作战地图
    const opsCx = opsX + opsW / 2 + 0.4, opsCz = 0.2;
    longTable(ctx, opsCx, bottom, opsCz, 2.2, 1.0, 0.76);
    solid(2.6, 1.5, 0.03, material('#e8dfc8', 0.94), opsCx, bottom + 2.05, -innerD / 2 + t + 0.02);

    /* ---------- 二楼：走道 + 会议室 ---------- */
    const rw = Math.min(innerW * opts.roomShareX, 5.4);
    const rd = Math.min(innerD * opts.roomShareZ, 5.0);
    const rx = halfW - t - rw / 2;          // 会议室贴东墙
    const rz = halfD - t - rd / 2;          // 会议室偏南，留北侧走道
    const ry = floor + 0.09;                // 楼板面

    // 会议室西壁（朝走道）：南段下半实墙 + 上部玻璃内窗，北端留 1.6m 门洞
    const winH = 1.1, winY = ry + 1.75;
    const roomDoorZ = rz - rd / 2 + 1.5, roomDoorW = 1.6;   // 门洞中心（靠近北侧走道）
    const segN = (roomDoorZ - roomDoorW / 2) - (rz - rd / 2);
    const segS0 = roomDoorZ + roomDoorW / 2;
    const segS = (rz + rd / 2) - segS0;
    // 北段（门洞到北墙）整面实墙
    solid(0.16, eave - ry, segN, wallM, rx - rw / 2, (ry + eave) / 2, rz - rd / 2 + segN / 2);
    // 南段：下半实墙 + 窗带 + 上部实墙
    solid(0.16, winY - winH / 2 - ry, segS, wallM, rx - rw / 2, ry + (winY - winH / 2 - ry) / 2, segS0 + segS / 2);
    solid(0.16, eave - (winY + winH / 2), segS, wallM, rx - rw / 2, (eave + winY + winH / 2) / 2, segS0 + segS / 2);
    // 门楣（2.05m 以上补实）
    solid(0.16, eave - (ry + 2.05), roomDoorW, wallM, rx - rw / 2, (eave + ry + 2.05) / 2, roomDoorZ);
    // 门套
    for (const s of [-1, 1]) solid(0.09, 2.05, 0.09, woodD, rx - rw / 2, ry + 1.02, roomDoorZ + s * (roomDoorW / 2 + 0.05));
    solid(0.09, 0.09, roomDoorW + 0.18, woodD, rx - rw / 2, ry + 2.05, roomDoorZ);
    for (let i = 0; i < 3; i++) {
      const wz = segS0 + segS * (i + 0.5) / 3;
      solid(0.05, winH, segS / 3 - 0.12, glassWindow, rx - rw / 2, winY, wz);
      solid(0.09, winH + 0.14, 0.07, woodD, rx - rw / 2, winY, wz - segS / 6);
    }
    addCollider(rx - rw / 2, rz - rd / 2 + segN / 2, 0.24, segN, 2);
    addCollider(rx - rw / 2, segS0 + segS / 2, 0.24, segS, 2);

    // 会议室北壁（隔出走道）
    solid(rw, eave - ry, 0.16, wallM, rx, ry + (eave - ry) / 2, rz - rd / 2);
    addCollider(rx, rz - rd / 2, rw, 0.24, 2);

    // 墙裙（四周 0.9m 高木板）
    const skirt = 0.9;
    solid(rw, skirt, 0.05, woodM, rx, ry + skirt / 2, rz - rd / 2 + 0.03);
    solid(rw, skirt, 0.05, woodM, rx, ry + skirt / 2, rz + rd / 2 - 0.03);
    solid(0.05, skirt, rd, woodM, rx + rw / 2 - 0.03, ry + skirt / 2, rz);
    solid(0.05, skirt, rd, woodM, rx - rw / 2 + 0.03, ry + skirt / 2, rz);

    // 天花板 + 木梁
    solid(rw, 0.08, rd, material('#d9d0be', 0.94), rx, eave - 0.04, rz);
    for (let i = 0; i < 3; i++) {
      solid(0.14, 0.2, rd, woodD, rx - rw / 2 + rw * (i + 0.5) / 3, eave - 0.18, rz);
    }

    /* ---------- 长桌 + 20 把椅子 ---------- */
    const TW = 2.0, TD = 1.0, TH = 0.80;
    const ty = ry;                            // 桌面所在基准
    longTable(ctx, rx, ty, rz, TW, TD, TH);
    const topY = ty + TH;

    // 7 + 7 + 3 + 3 = 20 把。长边间距只有 0.24m 而椅宽 0.44m，
    // 必然互相叠压——真实会场也是这样挤着的，但为了不连成一道栅栏，
    // 让相邻椅子在进深方向交替前后 6cm，并带一点转角。
    for (let i = 0; i < 7; i++) {
      const tt = -0.72 + i * 0.24;
      const jog = (i % 2 ? 0.065 : -0.02);
      chair(ctx, rx + tt, ty, rz + TD / 2 + 0.34 + jog, Math.PI + (i % 2 ? 0.06 : -0.04));
      chair(ctx, rx + tt, ty, rz - TD / 2 - 0.34 - jog, (i % 2 ? -0.06 : 0.04));
    }
    for (let i = 0; i < 3; i++) {
      const tt = -0.30 + i * 0.30;
      chair(ctx, rx + TW / 2 + 0.34, ty, rz + tt, -Math.PI / 2);
      chair(ctx, rx - TW / 2 - 0.34, ty, rz + tt, Math.PI / 2);
    }

    // 桌面纸张 + 茶杯
    const paperM = material('#efe6d0', 0.95);
    for (const [ox, oz, r] of [[-0.55, 0.1, 0.3], [0.5, -0.12, -0.5], [0.05, 0.2, 0.05]]) {
      const p = mesh(new T.BoxGeometry(0.40, 0.004, 0.28), paperM, rx + ox, topY + 0.004, rz + oz);
      p.rotation.y = r;
    }
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      mesh(new T.CylinderGeometry(0.036, 0.03, 0.068, 10), paperM,
        rx + Math.cos(a) * 0.64, topY + 0.034, rz + Math.sin(a) * 0.29);
    }

    /* ---------- 桌下木炭火盆 ---------- */
    const brass = material('#a8802f', 0.34);
    mesh(new T.CylinderGeometry(0.26, 0.21, 0.17, 18), brass, rx, ty + 0.09, rz);
    const coalM = material('#1c1614', 0.95);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      mesh(new T.DodecahedronGeometry(0.05, 0), coalM, rx + Math.cos(a) * 0.13, ty + 0.15, rz + Math.sin(a) * 0.13);
    }
    // 火盆暖光
    const fire = new T.PointLight('#ff6a22', 3.2, 3.2, 2);
    fire.position.set(rx, ty + 0.3, rz); ctx.group.add(fire);

    /* ---------- 顶壁正中：荷叶边盖洋油灯 ---------- */
    const lampY = eave - 1.05;
    const shadeMat = material('#efe4cc', 0.8).clone();
    shadeMat.side = T.DoubleSide;
    shadeMat.emissive = new T.Color('#ffc98a');
    shadeMat.emissiveIntensity = 0.5;
    mesh(new T.CylinderGeometry(0.22, 0.40, 0.13, 22, 1, true), shadeMat, rx, lampY + 0.10, rz);
    mesh(new T.CylinderGeometry(0.03, 0.03, 0.26, 8), brass, rx, lampY + 0.28, rz);   // 吊杆
    mesh(new T.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), brass, rx, lampY + 0.02, rz)
      .rotation.x = Math.PI;                                                          // 油碗
    mesh(new T.ConeGeometry(0.026, 0.12, 8), material('#ffb45a', 0.6), rx, lampY + 0.06, rz);  // 火苗
    const lamp = new T.PointLight('#ffb265', 14, 8.5, 2);
    lamp.position.set(rx, lampY - 0.08, rz); ctx.group.add(lamp);

    /* ---------- 东壁：挂钟 + 两个壁柜（其一嵌穿衣镜） ---------- */
    const ew = halfW - t;
    const clockZ = rz + 0.7;
    solid(0.15, 0.76, 0.40, woodM, ew - 0.08, ry + 1.95, clockZ);
    const dial = mesh(new T.CircleGeometry(0.145, 24), paperM, ew - 0.165, ry + 2.12, clockZ);
    dial.rotation.y = -Math.PI / 2;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const tick = mesh(new T.BoxGeometry(0.004, 0.022, 0.007), material('#241a12', 0.7),
        ew - 0.17, ry + 2.12 + Math.cos(a) * 0.112, clockZ + Math.sin(a) * 0.112);
      tick.rotation.x = -a;
    }
    solid(0.05, 0.3, 0.26, material('#241a12', 0.7), ew - 0.03, ry + 1.45, clockZ);
    const pend = mesh(new T.CylinderGeometry(0.05, 0.05, 0.012, 14), brass, ew - 0.05, ry + 1.4, clockZ);
    pend.rotation.z = Math.PI / 2;

    for (const [czz, mirror] of [[rz - 0.5, true], [rz - 1.55, false]]) {
      solid(0.28, 1.95, 0.74, woodM, ew - 0.14, ry + 1.0, czz);
      const face = mesh(new T.PlaneGeometry(0.62, 1.6),
        mirror ? material('#b9c6c9', 0.05) : woodD, ew - 0.285, ry + 1.0, czz);
      face.rotation.y = -Math.PI / 2;
      solid(0.04, 0.05, 0.12, brass, ew - 0.29, ry + 0.92, czz);
    }

    /* ---------- 可交互（供他的交互系统接管） ---------- */
    if (pickSurfaces) {
      const hot = mesh(new T.BoxGeometry(TW, 0.1, TD), material('#000000', 1), rx, topY, rz);
      hot.visible = false;
      hot.userData.czPick = {
        name: '长桌', title: '板栗色土漆长桌',
        body: '长 200 × 宽 100 × 高 80 厘米，桌面边沿呈鱼背形，侧边四周为宽 15.8 厘米的薄木板边框，边框与桌腿连接处呈方宝瓶式装饰。原物。',
        meta: '桌周是 20 把木边藤心折叠靠背椅，对应出席遵义会议的 20 位人员。'
      };
      pickSurfaces.push(hot);
      const clockHot = mesh(new T.BoxGeometry(0.2, 0.8, 0.45), material('#000000', 1), ew - 0.09, ry + 1.95, clockZ);
      clockHot.visible = false;
      clockHot.userData.czPick = {
        name: '挂钟', title: '木壳自鸣摆钟',
        body: '会议室东壁的木制外壳自鸣机械摆钟，通体木色，原物。就在这只挂钟的滴答声中，遵义会议开了三天。',
        meta: '会议从 1935 年 1 月 15 日开到 17 日，直到 17 日深夜才结束。'
      };
      pickSurfaces.push(clockHot);
    }

    return { colliders, room: { x: rx, z: rz, w: rw, d: rd, y: ry }, stair: geo };
  }

  /* ============================================================
     对外接口
     ============================================================ */
  M.zunyiInterior = {
    /* 生成空心壳 + 内部。调用点：renderer3d.js 里 `if (meeting) { ... }` 分支内，
       把 `room(0, 0, bodyW, bodyD, .34, eave);` 换成这里的 shell + build。 */
    install(ctx) {
      const opts = { ...DEFAULTS, ...(ctx.opts || {}) };
      // 兼容两种传法：顶层 ctx.bottom 或 ctx.opts.bottom
      const bottom = ctx.bottom ?? opts.bottom;
      const floor = ctx.floor ?? opts.floor;
      const eave = ctx.eave ?? opts.eave;
      const c = { ...ctx, opts, bottom, floor, eave };
      // 记录 group 世界矩阵，供世界坐标采样
      ctx.group.updateMatrixWorld(true);
      world = ctx.group.matrixWorld.clone();
      transform = world.clone().invert();

      const geo = shell(c);
      const built = build(c, geo);
      api = { ...built, opts, bottom, floor, eave,
              width: ctx.width, depth: ctx.depth, gallery: ctx.gallery || 0, stair: geo };
      return api;
    },

    /* 建筑外轮廓（世界坐标 AABB，含檐廊）。renderer3d 用它转成场景坐标的碰撞框。 */
    footprint() {
      if (!api || !world) return null;
      const e = world.elements;
      const tx = (x, z) => e[0] * x + e[8] * z + e[12];
      const tz = (x, z) => e[2] * x + e[10] * z + e[14];
      const hw = api.width / 2 + (api.gallery || 0), hd = api.depth / 2 + (api.gallery || 0);
      const xs = [tx(-hw, -hd), tx(hw, -hd), tx(-hw, hd), tx(hw, hd)];
      const zs = [tz(-hw, -hd), tz(hw, -hd), tz(-hw, hd), tz(hw, hd)];
      return { x1: Math.min(...xs), x2: Math.max(...xs), z1: Math.min(...zs), z2: Math.max(...zs) };
    },

    /* 墙体外框（局部坐标，含门洞缺口），给精确碰撞用 */
    walls() {
      if (!api) return [];
      const { width, depth } = api, o = api.opts;
      const hw = width / 2, hd = depth / 2, t = 0.3, dw = o.doorWidth;
      const list = [
        { x1: -hw, x2: hw, z1: -hd, z2: -hd + t },                 // 北墙
        { x1: -hw, x2: -hw + t, z1: -hd, z2: hd },                 // 西墙
        { x1: hw - t, x2: hw, z1: -hd, z2: hd },                   // 东墙
        { x1: -hw, x2: -dw / 2, z1: hd - t, z2: hd },              // 南墙（门西）
        { x1: dw / 2, x2: hw, z1: hd - t, z2: hd }                 // 南墙（门东）
      ];
      return list;
    },

    /* 楼层高度采样（世界坐标）。玩家每帧落地用：
         const y = M.zunyiInterior.floorHeightAt(player.x, player.z, player.y);
       返回该点的地面/楼板高度；不在建筑内返回 null，调用方保持原逻辑。 */
    floorHeightAt(wx, wz, currentY) {
      if (!api || !transform) return null;
      const v = { x: wx, y: 0, z: wz };
      // 世界 → 局部（只处理 Y 轴旋转 + 平移，够用）
      const m = transform.elements;
      const lx = m[0] * v.x + m[8] * v.z + m[12];
      const lz = m[2] * v.x + m[10] * v.z + m[14];

      const { width, depth, bottom, floor, stair, opts, gallery } = api;
      const reachW = width / 2 + (gallery || 0), reachD = depth / 2 + (gallery || 0);
      if (Math.abs(lx) > reachW || Math.abs(lz) > reachD) return null;
      // 檐廊（台基）也抬到同一层地面，进门前不会有半米落差
      if (Math.abs(lx) > width / 2 || Math.abs(lz) > depth / 2) return bottom + 0.02;

      // 楼梯段：按 z 求台阶高度
      const halfD = depth / 2;
      const zTop = stair.z0, zBot = stair.z0 - stair.run * 14;
      if (Math.abs(lx - stair.hx) < opts.stairWidth / 2 + 0.12 && lz <= zTop && lz >= zBot) {
        const i = Math.floor((zTop - lz) / stair.run);
        return Math.min(floor, bottom + stair.rise * (i + 1));
      }

      // 在楼板洞口范围内 → 一层；否则按当前高度判断所在层
      const inHole = Math.abs(lx - stair.hx) < stair.holeW / 2 && Math.abs(lz - stair.hz) < stair.holeD / 2;
      if (inHole) return bottom + 0.06;
      return (currentY || 0) > (floor + bottom) / 2 ? floor + 0.09 : bottom + 0.06;
    },

    /* 内部隔墙碰撞（局部坐标） */
    colliders() { return api ? api.colliders : []; },

    /* 内部隔墙碰撞（世界坐标，AABB）。
       建筑只做 0 或 π 的 Y 轴旋转，AABB 变换后仍是 AABB，所以可以直接用四角取包围。
       调用方把它并进自己的 solids 数组即可参与碰撞。 */
    worldColliders() {
      if (!api || !world) return [];
      const e = world.elements;
      const tx = (x, z) => e[0] * x + e[8] * z + e[12];
      const tz = (x, z) => e[2] * x + e[10] * z + e[14];
      return api.colliders.map(c => {
        const xs = [tx(c.x1, c.z1), tx(c.x2, c.z1), tx(c.x1, c.z2), tx(c.x2, c.z2)];
        const zs = [tz(c.x1, c.z1), tz(c.x2, c.z1), tz(c.x1, c.z2), tz(c.x2, c.z2)];
        return { x1: Math.min(...xs), x2: Math.max(...xs), z1: Math.min(...zs), z2: Math.max(...zs) };
      });
    },

    get info() { return api; }
  };
})();
