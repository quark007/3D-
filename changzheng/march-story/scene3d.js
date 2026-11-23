/* Optional 3D scene viewing. Art reconstruction only; never changes story state. */
(() => {
  'use strict';
  const lib = () => typeof SceneLibrary === 'undefined' ? window.SceneLibrary : SceneLibrary;
  const queue = () => typeof SceneMountQueue === 'undefined' ? window.SceneMountQueue : SceneMountQueue;
  const three = () => typeof LongMarch3D === 'undefined' ? window.LongMarch3D : LongMarch3D;
  function dispose(host) {
    if (!host) return;
    try { three()?.instances.get(host)?.dispose?.(); } catch { /* keep closing */ }
    try { three()?.instances.delete(host); } catch { /* keep closing */ }
    host.remove();
  }
  async function start(row, signal) {
    if (signal?.aborted) return { status: 'cancelled' };
    if (typeof window.CZMarchUI === 'undefined') return { status: 'error', reason: '界面组件未就绪' };
    if (!lib() || !queue()) return { status: 'error', reason: '3D场景组件未加载' };
    const { el, button, dialog } = window.CZMarchUI;
    const { d, body, foot } = dialog(row.title || '3D剧情地点模拟体验', signal);
    const chapterId = Number(row.chapterId) || 1;
    let host = null, ready = false, result = { status: 'cancelled' }, watch = null;
    body.append(el('small', '三维艺术复原 · 非测绘地图 · 不改变史实与任务记录', 'march3d-label'));
    body.append(el('p', '这里按本章剧情地点重建可旋转观察的三维环境，用于辨认山势、道路、渡口与宿营地。场景与模型均为通用艺术复原，不作为丈量、考古或历史细节的证明。'));
    if (chapterId === 12) body.append(el('p', '本章为 1936 年 10 月三大主力会师：会宁与将台堡是两地，复原与标注各自分开（v03 模式下为「ch12_huining_reunion」主场景与「第12章 · 将台堡会师」共享模型），不合并为同一地点、同一日；与 1935 年 10 月吴起镇落脚相隔约一年。', 'march83-note'));
    const status = el('p', '正在准备三维场景…', 'march3d-status');
    status.setAttribute('role', 'status');
    body.append(status);
    body.append(el('p', '在右上角切换「剧情近景 / 真实地形 / 新模型 · v03」，拖动旋转、双击聚焦，也可全屏观察。', 'march83-note'));
    const retry = button('重新加载三维场景', () => begin());
    retry.hidden = true;
    foot.append(retry, button('关闭 · 返回场景', () => d.close()));
    const stopWatch = () => { watch?.disconnect(); watch = null; };
    const showError = error => {
      if (!d.isConnected) return;
      status.textContent = '三维场景未能加载：' + (error || '当前设备可能不支持 WebGL') + '。可重新加载，或关闭窗口继续剧情。';
      status.dataset.state = 'error';
      status.setAttribute('role', 'alert');
      retry.hidden = false;
    };
    async function begin() {
      if (!d.isConnected || signal?.aborted) return;
      retry.hidden = true;
      status.dataset.state = 'loading';
      status.setAttribute('role', 'status');
      status.textContent = '正在准备三维场景…';
      stopWatch();
      dispose(host);
      host = null;
      ready = false;
      try {
        await lib().load();
        if (!d.isConnected || signal?.aborted) return;
        const template = document.createElement('template');
        template.innerHTML = three().markup({ id: chapterId });
        host = template.content.firstElementChild;
        host.classList.add('march3d-frame');
        body.append(host);
        host.scrollIntoView({block:'nearest'});
        status.textContent = '正在生成地形、光照与可辨认地点…';
        watch = new MutationObserver(() => {
          if (!host) return;
          const state = host.dataset.sceneReady;
          if (state === 'true') {
            ready = true;
            status.textContent = '三维场景已就绪。切换构图、拖动或双击观察；关闭窗口后回到原场景。';
            status.dataset.state = 'ready';
          } else if (state === 'error') showError(host.dataset.sceneError);
        });
        watch.observe(host, { attributes: true, attributeFilter: ['data-scene-ready'] });
        if (!three().instances.has(host)) three().mount(host, chapterId);
        if (host.dataset.sceneReady === 'error') showError(host.dataset.sceneError);
      } catch (error) {
        showError(error?.message || String(error));
      }
    }
    d.addEventListener('close', () => {
      stopWatch();
      if (ready) result = { status: 'completed' };
      dispose(host);
      host = null;
    }, { once: true });
    begin();
    return new Promise(resolve => d.addEventListener('close', () => resolve(result), { once: true }));
  }
  window.CZMarchScene3D = { start };
})();
