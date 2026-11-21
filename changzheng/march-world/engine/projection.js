/* march-world 内部模块：斜俯视投影与镜头。挂在 window.CZMarchWorld._ 下，不新增全局导出。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};

  /* 投影常量：PITCH 为地面纵向压缩（越大越接近俯视），VERT 为物体高度向上拉伸系数。 */
  const PITCH = 0.6;
  const VERT = 0.92;

  /* 透视缩放：近大远小。y 为地面坐标（北小南大），返回角色/道具的尺寸系数。 */
  /* One affine projection for ground and upright objects. No y-only pseudo-perspective.
     Ground coordinates and inverse picking are unchanged: no save migration required. */
  function depthScale() { return 1; }

  function createCamera() {
    return { x: 0, y: 0, zoom: 8, viewW: 0, viewH: 0 };
  }

  /* 依据容器尺寸计算 zoom：保证地面可见高度约 46 世界单位，且不露出世界边界外的空档。 */
  function fitCamera(cam, viewW, viewH, world) {
    cam.viewW = viewW; cam.viewH = viewH;
    const zy = viewH / (46 * PITCH);
    const zx = viewW / Math.min(world.w, 150);
    cam.zoom = Math.min(14, Math.max(3.2, Math.max(zx, zy)));
    clampCamera(cam, world);
  }

  /* 镜头边界：北侧允许越出世界边界 NORTH_MARGIN 单位，露出远景幕布（天空+山峦地平线）；
     南侧保留少量地面余量。宽场景横向滚动由 clamp 保证不露出空档。 */
  const NORTH_MARGIN = 22, SOUTH_MARGIN = 5, SIDE_MARGIN = 6;
  function clampCamera(cam, world) {
    const halfW = cam.viewW / 2 / cam.zoom;
    const halfH = cam.viewH / 2 / (cam.zoom * PITCH);
    const minX = halfW - SIDE_MARGIN, maxX = world.w + SIDE_MARGIN - halfW;
    const minY = halfH - NORTH_MARGIN, maxY = world.h + SOUTH_MARGIN - halfH;
    cam.x = minX >= maxX ? world.w / 2 : Math.min(maxX, Math.max(minX, cam.x));
    cam.y = minY >= maxY ? (world.h + SOUTH_MARGIN - NORTH_MARGIN) / 2 : Math.min(maxY, Math.max(minY, cam.y));
  }

  /* 世界地面坐标 → 屏幕 CSS 像素（容器内）。elev 为离地高度（世界单位）。 */
  function project(cam, x, y, elev) {
    return {
      x: (x - cam.x) * cam.zoom + cam.viewW / 2,
      y: (y - cam.y) * cam.zoom * PITCH + cam.viewH / 2 - (elev || 0) * cam.zoom * VERT
    };
  }

  /* 屏幕 CSS 像素 → 世界地面坐标（点击移动用）。 */
  function unproject(cam, sx, sy) {
    return {
      x: (sx - cam.viewW / 2) / cam.zoom + cam.x,
      y: (sy - cam.viewH / 2) / (cam.zoom * PITCH) + cam.y
    };
  }

  M.proj = { PITCH, VERT, depthScale, createCamera, fitCamera, clampCamera, project, unproject };
})();