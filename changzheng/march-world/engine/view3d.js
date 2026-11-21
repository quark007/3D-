(() => {
  'use strict';
  const M = window.CZMarchWorld._;

  function wrapCanvas(view) {
    view.project = (x, y, height) => M.proj.project(view.cam, x, y, height);
    view.unproject = (sx, sy) => M.proj.unproject(view.cam, sx, sy);
    view.headPoint = player => player.headPoint(view.cam);
    view.stats.backend = 'canvas';
    return view;
  }

  async function create(container, scene, options = {}) {
    if (options.signal?.aborted) return null;
    if (!M.visual3d.requested(scene) || !M.renderer3d || !M.actors3d) {
      return wrapCanvas(M.renderer.create(container, scene));
    }
    const loading = document.createElement('div');
    loading.className = 'czmw-loading3d';
    loading.setAttribute('role', 'status');
    const text = document.createElement('span');
    text.textContent = '正在准备实时 3D 场景…';
    const fallbackButton = document.createElement('button');
    fallbackButton.type = 'button';
    fallbackButton.textContent = '使用兼容画质';
    fallbackButton.dataset.czmwUi = 'true';
    loading.append(text, fallbackButton);
    container.append(loading);

    const controller = new AbortController();
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(fallback, 30000);
      function cleanup() {
        settled = true;
        clearTimeout(timeout);
        options.signal?.removeEventListener('abort', cancel);
        loading.remove();
      }
      function cancel() {
        if (settled) return;
        cleanup();
        controller.abort();
        resolve(null);
      }
      function fallback() {
        if (settled) return;
        cleanup();
        controller.abort();
        try { resolve(wrapCanvas(M.renderer.create(container, scene))); }
        catch (error) { reject(error); }
      }
      options.signal?.addEventListener('abort', cancel, { once: true });
      fallbackButton.addEventListener('click', fallback);
      Promise.resolve().then(() => {
        if (settled) return null;
        return M.renderer3d.create(container, scene, { ...options, signal: controller.signal });
      }).then(view => {
        if (settled) { view?.dispose(); return; }
        cleanup();
        resolve(view);
      }).catch(error => {
        if (settled) return;
        if (error.name !== 'AbortError') console.warn('实时 3D 已切换兼容画质：', error.message);
        fallback();
      });
    });
  }

  M.view = { create, wrapCanvas };
})();
