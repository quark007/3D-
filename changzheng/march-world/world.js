/* march-world 协议主模块（A 方唯一全局导出）：window.CZMarchWorld（+ 清单 CZMarchWorldManifest）。
   协议（与 B 方 march-story 约定，不得静默改字段）：
   - async mount(container, {chapterId, sceneId, spawn, anchors})
   - snapshot() → {chapterId, sceneId, x, y, facing}
   - pause(reason) / resume(reason)：按原因集合暂停；仍有其他原因时不恢复移动
   - applyState({enabledAnchorIds, completedAnchorIds, openPassageIds})
   - destroy()：幂等，可重复调用
   用户确认交互后派发 window 'czmarch:interact'（detail:{chapterId,sceneId,anchorId}）。
   本模块不启动小游戏、不判通关、不写存档。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld;
  const M = NS._;

  /* ========== 场景清单（B 方 story.js 读取 window.CZMarchWorldManifest） ========== */
  function buildManifest() {
    const scenes = Object.values(M.scenes).map(s => ({
      chapterId: s.chapterId, sceneId: s.sceneId, title: s.title,
      spawn: { ...s.spawn },
      anchors: s.anchors.map(a => ({ anchorId: a.anchorId, kind: a.kind, label: a.label, x: a.x, y: a.y })),
      passages: (s.passages || []).map(p => ({ ...p }))
    }));
    scenes.sort((a, b) => a.chapterId - b.chapterId);
    return { version: 1, coordinateSystem: 'scene ground coordinates; x east, y south; unit≈1m', scenes };
  }

  /* ========== 运行态 ========== */
  let live = null; /* 当前挂载会话 */
  let mountSeq = 0;
  let pendingMount = null;
  const pauses = new Set();

  function assertScene(sceneId) {
    const scene = M.scenes[sceneId];
    if (!scene) throw Error('A方场景未注册：' + sceneId);
    return scene;
  }

  async function mount(container, opts) {
    if (!container || !opts) throw Error('mount 需要 container 与参数');
    const { chapterId, sceneId } = opts;
    const scene = assertScene(sceneId);
    if (scene.chapterId !== chapterId) throw Error(`场景 ${sceneId} 不属于第${chapterId}章`);
    /* B 方传入的 anchors 与场景登记清单一致性校验（缺映射立即报错，不静默吞掉） */
    if (Array.isArray(opts.anchors)) {
      const have = new Set(scene.anchors.map(a => a.anchorId));
      for (const a of opts.anchors) if (a && a.anchorId && !have.has(a.anchorId)) throw Error('B方锚点未在场景登记：' + a.anchorId);
    }
    destroy(); /* 场景切换：在 mount 内部清理旧场景 */
    pauses.clear();
    const token = ++mountSeq;

    container.classList.add('czmw-host');

    const roleId=opts.roleId||(typeof GameState!=='undefined'?GameState.character?.id:null)||'soldier';
    const controller = new AbortController();
    pendingMount = { controller, container };
    let view;
    try {
      view = M.view
        ? await M.view.create(container, scene, { chapterId, sceneId, roleId, signal: controller.signal })
        : M.renderer.create(container, scene);
    } catch (error) {
      if (token !== mountSeq) return false;
      container.classList.remove('czmw-host');
      throw error;
    } finally {
      if (pendingMount?.controller === controller) pendingMount = null;
    }
    if (token !== mountSeq || !view) { view?.dispose(); return false; }
    const project = (x, y, height) => view.project ? view.project(x, y, height) : M.proj.project(view.cam, x, y, height);
    const unproject = (sx, sy) => view.unproject ? view.unproject(sx, sy) : M.proj.unproject(view.cam, sx, sy);
    const grid = M.path.buildGrid(view.streetActive && !scene.strictPlayable ? { ...scene, blocked: [...scene.blocked, ...scene.streetBlocked] } : scene);
    const player = M.player.create(scene, grid, opts.spawn,roleId);
    const pin=document.createElement('div');pin.className='czmw-player-pin86';pin.dataset.role=player.roleId;pin.setAttribute('role','img');pin.setAttribute('aria-label','你的位置 · '+player.roleName);const roleLabel=document.createElement('span');roleLabel.textContent='你 · '+player.roleShort;pin.append(roleLabel,document.createElement('i'));container.append(pin);
    view.initializeCamera?.(player);
    scene.focusActor=player;const anchorsMod = M.anchors.create(scene, container);
    scene.anchorEntities=anchorsMod.anchors;
    const ambient = M.ambient.create(scene, view);

    const guidePin=document.createElement('div');guidePin.className='czmw-guide87';guidePin.hidden=true;container.append(guidePin);
    const session = { container, scene, grid, view, player,pin,guidePin, guide:null, route:[],routeAt:0, routeCell:'', anchorsMod, ambient, chapterId, sceneId, dead: false, lastNear: null };

    /* 输入 */
    const settingsPause = Symbol('movement settings');
    const input = M.input.create(container, {
      onInteract() {
        if (pauses.size || session.dead) return;
        const near = session.lastNear;
        if (near) dispatchInteract(session, near.anchorId);
      },
      onTap(sx, sy) {
        if (pauses.size || session.dead) return;
        const w = unproject(sx, sy);
        if (!w) return;
        /* 点按落在锚点附近 → 直接交互；否则寻路移动 */
        let hit = null;
        for (const a of anchorsMod.anchors) if (a.enabled && Math.hypot(a.x - w.x, a.y - w.y) < 2.2) { hit = a; break; }
        if (hit && Math.hypot(hit.x - player.x, hit.y - player.y) <= M.anchors.NEAR) { dispatchInteract(session, hit.anchorId); return; }
        if (hit) { const p = M.path.findPath(grid, player.x, player.y, hit.x, hit.y - 1.2); if (p) player.moveTo(p); return; }
        const path = M.path.findPath(grid, player.x, player.y, w.x, w.y);
        if (path) player.moveTo(path);
      },
      onDir() { player.stopPath(); },
      onJump() { if (!pauses.size) player.jump(); },
      lookCanvas: view.adjustCamera ? view.canvas : null,
      onSettings(open) { if (open) pause(settingsPause); else resume(settingsPause); },
      onFreeLook(active) { view.setFreeLook?.(active); },
      onLook(dx, dy) { if (!pauses.size) view.adjustCamera?.(dx, dy); }
    });
    session.input = input;

    const playerEntity={y:player.y,draw:()=>player.draw(view.canvas.getContext('2d'),view.cam)};
    scene.drawWater=ambient.drawWater;scene.drawSmoke=ambient.drawSmoke;scene.drawOverlay=ambient.drawOverlay;
    scene.collectEntities=(ctx,cam)=>{playerEntity.y=player.y;return [...anchorsMod.drawEntity(ctx,cam,scene.world.h),playerEntity];};
    /* 主循环数据流：renderer 帧回调驱动更新 */
    scene.tick = dt => {
      if (session.dead) return;
      const paused = pauses.size > 0;
      scene.pausedDim = paused;
      input.setEnabled(!paused);
      if (!paused) {
        const movement = input.vector();
        const cameraRelative = Boolean(view.cameraRelativeMovement);
        const direction = cameraRelative ? view.cameraRelativeMovement(movement) : movement;
        player.advance(dt, direction, input.wantsRun?.(), input.wantsWalk?.(),
          cameraRelative ? movement.y : undefined);
      }
      ambient.update(paused ? 0 : dt); /* 暂停时环境动画减速但不冻结（对话框背景仍活着） */
      const near = anchorsMod.update(player.x, player.y, paused);
      if (near !== session.lastNear) {
        session.lastNear = near;
        input.showAction(!!near, near ? (near.kind === 'npc' ? '交谈' : near.kind === 'exit' ? '前往' : '查看') : '交互');
      }
      view.follow(player, dt);
      anchorsMod.layout(view.cam, scene.world.h, project);
      const head=view.headPoint?view.headPoint(player):player.headPoint(view.cam);const px=Math.round(head.x*2)/2+'px',py=Math.round(head.y*2)/2+'px';if(pin.style.left!==px)pin.style.left=px;if(pin.style.top!==py)pin.style.top=py;
      if(session.guide){
        const a=anchorsMod.anchors.find(a=>a.anchorId===session.guide.anchorId&&a.enabled);
        if(a){
          const cell=Math.floor(player.x/3)+':'+Math.floor(player.y/3);if(cell!==session.routeCell&&performance.now()-session.routeAt>400){session.route=guidePath(session,a)||[];session.routeAt=performance.now();session.routeCell=cell;}
          const point=project(a.x,a.y,0),near=Math.hypot(a.x-player.x,a.y-player.y)<M.anchors.NEAR;
          if(guidePin.hidden!==near)guidePin.hidden=near;const outside=point.x<20||point.x>view.cam.viewW-20||point.y<60||point.y>view.cam.viewH-80;const angle=Math.atan2(point.y-view.cam.viewH/2,point.x-view.cam.viewW/2);const arrows=['→','↘','↓','↙','←','↖','↑','↗'];const arrow=arrows[(Math.round(angle/(Math.PI/4))+8)%8];const label=(outside?arrow+' 屏外 · ':'◇ 目标 · ')+session.guide.label;guidePin.dataset.offscreen=String(outside);
          if(session.guideLabel!==label){guidePin.textContent=label;session.guideLabel=label;session.guideWidth=null;}
          if(!near&&session.guideWidth!==view.cam.viewW){session.guideWidth=view.cam.viewW;session.guideHalf=Math.min(view.cam.viewW/2-12,Math.max(45,guidePin.offsetWidth/2));}
          const half=session.guideHalf||90;
          const gx=Math.round(Math.max(half+10,Math.min(view.cam.viewW-half-10,point.x)))+'px';if(guidePin.style.left!==gx)guidePin.style.left=gx;
          const gy=Math.round(Math.max(40,Math.min(view.cam.viewH-(navigator.maxTouchPoints>0?135:60),point.y-70)))+'px';if(guidePin.style.top!==gy)guidePin.style.top=gy;
        }else guidePin.hidden=true;
      }else guidePin.hidden=true;
      view.drawGuide?.(player, session.route, !!session.guide && !paused && !guidePin.hidden);
    };
    scene.drawGuide=(ctx,cam)=>{
      if(!session.guide||!session.route.length||pauses.size)return;
      const points=[{x:player.x,y:player.y},...session.route.slice(1)];
      ctx.save();ctx.beginPath();points.forEach((p,i)=>{const q=M.proj.project(cam,p.x,p.y,0);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});
      ctx.strokeStyle='#253a2d99';ctx.lineWidth=7;ctx.stroke();ctx.setLineDash([8,9]);ctx.strokeStyle='#f4db98';ctx.lineWidth=3;ctx.stroke();ctx.restore();
    };
    view.onGraphicsLost = () => {
      if (session.dead || view.stats?.backend !== 'three') return;
      const previous = view;
      previous.onGraphicsLost = null;
      view = M.view.wrapCanvas(M.renderer.create(container, scene));
      session.view = view;
      input.disableCamera?.();
      previous.dispose();
    };
    live = session;
    if (view.playIntro && opts.playIntro !== false) {
      pauses.add('cinema');
      input.setEnabled(false);
      Promise.resolve(view.playIntro(player)).then(() => {
        if (session.dead) return;
        pauses.delete('cinema');
        if (!pauses.size) input.setEnabled(true);
      });
    }
    return true;
  }

  function dispatchInteract(session, anchorId) {
    session.input.unlock?.();
    window.dispatchEvent(new CustomEvent('czmarch:interact', {
      detail: { chapterId: session.chapterId, sceneId: session.sceneId, anchorId }
    }));
  }

  function snapshot() {
    if (!live || live.dead) throw Error('场景尚未挂载或已销毁，snapshot 不可用');
    return {
      chapterId: live.chapterId, sceneId: live.sceneId,
      x: Math.round(live.player.x * 100) / 100, y: Math.round(live.player.y * 100) / 100,
      facing: Math.round(live.player.facing * 1000) / 1000
    };
  }

  function pause(reason) {
    const r = typeof reason === 'symbol' ? reason : String(reason || 'default');
    if (!live || live.dead) return; /* 未挂载时暂停是安全空操作 */
    pauses.add(r);
    live.input.setEnabled(false);live.player.stop();
  }
  function resume(reason) {
    pauses.delete(typeof reason === 'symbol' ? reason : String(reason || 'default'));
    if(live&&!live.dead&&!pauses.size)live.input.setEnabled(true);
  }
  function applyState(viewState) {
    if (!live || live.dead) return;
    live.anchorsMod.applyState(viewState || {});
  }

  function guidePath(s,a){
    // Use the actual collision grid; never draw a straight shortcut across water or buildings.
    for(const [dx,dy]of [[0,-1.2],[1.5,0],[-1.5,0],[0,1.5]]){
      const path=M.path.findPath(s.grid,s.player.x,s.player.y,a.x+dx,a.y+dy);
      const end=path?.at(-1);if(end&&Math.hypot(end.x-a.x,end.y-a.y)<M.anchors.NEAR)return path;
    }return null;
  }
  function setGuide(target){
    if(!live||live.dead)return;
    if(live.guide?.anchorId===target?.anchorId)return;
    live.guide=target&&typeof target.anchorId==='string'?{anchorId:target.anchorId,label:String(target.label||'下一步').slice(0,100)}:null;
    const a=live.guide&&live.anchorsMod.anchors.find(a=>a.anchorId===live.guide.anchorId&&a.enabled);
    if(a)live.view.frameTarget?.(live.player,a);live.anchorsMod.setGuide?.(live.guide?.anchorId||null);live.route=a?guidePath(live,a)||[]:[];live.routeAt=performance.now();live.routeCell=Math.floor(live.player.x/3)+':'+Math.floor(live.player.y/3);
  }
  function walkToGuide(){
    if(!live||live.dead||pauses.size)return false;
    const a=live.guide&&live.anchorsMod.anchors.find(a=>a.anchorId===live.guide.anchorId&&a.enabled),path=a&&guidePath(live,a);
    if(!path)return false;live.player.moveTo(path);return true;
  }

  function destroy() {
    pauses.clear();
    mountSeq++;
    if (pendingMount) {
      pendingMount.controller.abort();
      pendingMount.container.classList.remove('czmw-host');
      pendingMount = null;
    }
    if (!live) return; /* 幂等：重复 destroy 安全 */
    const s = live; live = null; s.dead = true;
    const scene = s.scene;
    try { s.input && s.input.dispose(); } catch { /* 释放继续 */ }
    s.pin?.remove();
    s.guidePin?.remove();
    try { s.anchorsMod && s.anchorsMod.dispose(); } catch { /* 释放继续 */ }
    try { s.view && s.view.dispose(); } catch { /* 释放继续 */ }
    if (scene) { scene.focusActor=null;scene.anchorEntities=null;scene.tick = null; scene.collectEntities = null; scene.drawWater = null; scene.drawSmoke = null; scene.drawOverlay = null; scene.drawGuide=null;scene.pausedDim = false; }
    s.container.classList.remove('czmw-host');
  }

  /* ========== 导出 ========== */
  NS.mount = mount; NS.snapshot = snapshot; NS.pause = pause; NS.resume = resume;
  NS.applyState = applyState; NS.destroy = destroy;
  NS.setGuide=setGuide;NS.walkToGuide=walkToGuide;
  Object.defineProperty(NS,'performance',{get:()=>live?{...live.view.stats,cacheEntries:M.painter.cacheSize}:null});
  NS.manifest = buildManifest();
  Object.defineProperty(NS, 'mounted', { get: () => !!(live && !live.dead) });
  window.CZMarchWorldManifest = NS.manifest;
})();
