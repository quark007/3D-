/* 3D 剧情地图直达入口：?play=3d&chapter=3
 * 复用主站<CZMarchEntry / CZMarchStory>完整链路：地图任务点 -> 对话 / 决策 / 小游戏。
 * 只做三件事：预置演示角色、跳过标题屏、启动指定章节的立体剧情场景。
 * 不改变任何原有剧情、存档与判定逻辑；不带参数时完全不生效。 */
(() => {
  'use strict';
  const search = new URLSearchParams(location.search);
  if (search.get('play') !== '3d') return;
  const chapter = Math.min(12, Math.max(1, Number(search.get('chapter')) || 3));
  const role = /^(commander|logistics|soldier|medic)$/.test(search.get('role') || '') ? search.get('role') : 'soldier';

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function until(test, limit = 20000) {
    const t0 = Date.now();
    while (!test()) { if (Date.now() - t0 > limit) return false; await sleep(80); }
    return true;
  }
  function note(text) {
    let n = document.getElementById('mapPlayNotice');
    if (!n) {
      n = document.createElement('aside'); n.id = 'mapPlayNotice';
      n.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:99999;max-width:min(760px,92vw);padding:10px 16px;border-radius:8px;background:#1c2a24;color:#f3e6c8;border:1px solid #bca87b80;font:14px/1.6 system-ui,sans-serif;box-shadow:0 6px 24px #0008';
      document.body.append(n);
    }
    n.textContent = text;
  }

  async function start() {
    const ready = await until(() =>
      window.CZMarchEntry && window.CZMarchWorldManifest?.scenes?.length >= 12 &&
      window.GameState && window.GameShell && window.CZMarchUI && window.CZMarchRegistry
    );
    if (!ready) { note('剧情模块载入超时，请刷新重试。'); return; }

    // 预置岗位：仅在尚未选择角色时设置，避免覆盖真实存档。
    if (!window.GameState.character) {
      try { window.GameState.selectCharacter(role); } catch (error) { note('预置岗位失败：' + error.message); return; }
    }
    // 直接隐藏标题屏（不调用 GameShell.enter，避免触发开场动画/选角面板挡住地图）。
    try {
      const title = document.getElementById('titleScreen');
      if (title) title.hidden = true;
      document.body.classList.remove('at-title');
      const intro = document.getElementById('introOverlay');
      if (intro) intro.style.display = 'none';
    } catch (error) { console.info('[map-play] 跳过标题屏：', error); }

    // 剧本用 window.CZ_NPC_SCRIPTS 同步提供，NpcStory.load() 仍会走一遍以完成 install()。
    if (window.NpcStory && !window.NpcStory.ready) {
      try { await window.NpcStory.load(); } catch (error) { console.info('[map-play] 剧本载入：', error); }
    }

    note(`正在进入第 ${chapter} 章立体剧情地图…`);
    let ok = false;
    try { ok = await window.CZMarchEntry.launch(chapter); }
    catch (error) { note('进入地图失败：' + error.message); return; }
    if (!ok) { note('地图未启动，请查看控制台提示。'); return; }
    let n = document.getElementById('mapPlayNotice'); if (n) n.remove();
    // 首帧后给出操作说明，随后淡出。
    const tip = document.createElement('aside');
    tip.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:99999;max-width:min(420px,90vw);padding:10px 14px;border-radius:8px;background:#1c2a24e8;color:#f3e6c8;border:1px solid #bca87b80;font:13px/1.6 system-ui,sans-serif';
    tip.textContent = '走近任务点按 E 交互：与 NPC 交谈、做决策或进入小游戏。WASD 移动，V 切换视角，Esc 打开设置。';
    document.body.append(tip);
    setTimeout(() => tip.remove(), 12000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => start(), { once: true });
  else start();
})();
