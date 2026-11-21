import { WebGLRenderer, SRGBColorSpace, ACESFilmicToneMapping, Color } from 'three';
import { WebGPURenderer } from 'three/webgpu';

const ERROR_TEXT = '当前设备未启用WebGL，且WebGPU不可用，请启用浏览器硬件加速或换用支持3D的设备。';

/** Async boundary is intentional: WebGPU device creation cannot replace a synchronous `new` call. */
export async function createRenderer({ host, scene, RenderBudget = globalThis.RenderBudget,
  rendererOptions = {}, backend = 'auto', onBackendChange = () => {},
  environment = globalThis, factories = {}, simulateInitFailure = false } = {}) {
  if (!host || !scene) throw new TypeError('host and scene are required');
  for (const method of ['register', 'schedule', 'release']) {
    if (typeof RenderBudget?.[method] !== 'function') throw new TypeError(`RenderBudget.${method} is required`);
  }
  let raw, disposed = false, registered = false, transition = null, drawOverride = null;
  let lastGL = null, logicalSize = null, pixelRatio = Math.min(environment.devicePixelRatio || 1, 1);
  let currentBackend = '', reason = '', effectsCleanup = null;
  const releasedGL = new WeakSet();
  let removeContextListeners = () => {};
  const loseGL = renderer => { if (renderer?.forceContextLoss && !releasedGL.has(renderer)) { releasedGL.add(renderer); renderer.forceContextLoss(); } };
  const bindContext = renderer => {
    removeContextListeners();
    const canvas = renderer.domElement;
    const lost = event => {
      event.preventDefault();
      if (disposed || raw !== renderer) return;
      host.dataset.sceneReady = 'false';
      host.dataset.sceneError = '图形上下文中断，正在恢复兼容视图；剧情可以继续。';
      void fallback('WebGL context lost').catch(error => { host.dataset.sceneError = error.message; });
    };
    canvas.addEventListener?.('webglcontextlost', lost);
    removeContextListeners = () => canvas.removeEventListener?.('webglcontextlost', lost);
  };
  const makeGPU = factories.gpu || (opts => new WebGPURenderer(opts));
  const makeGL = factories.webgl || (opts => new WebGLRenderer(opts));
  // A fallback requires a NEW canvas: a canvas already configured for WebGPU cannot become WebGL.
  const { canvas: ignoredCanvas, ...userOptions } = rendererOptions;
  const options = { antialias: RenderBudget.mode !== 'economy', alpha: false,
    powerPreference: 'high-performance', ...userOptions };
  const safeDispose = renderer => { try { renderer?.dispose(); } catch { /* Partially initialized backend. */ } };
  const clearEffects = () => { drawOverride = null; effectsCleanup?.(); effectsCleanup = null; };
  const configure = renderer => {
    renderer.setPixelRatio(pixelRatio);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    if (logicalSize) renderer.setSize(...logicalSize);
  };
  const publish = () => {
    host.dataset.sceneReady = 'true'; delete host.dataset.sceneError;
    host.dataset.renderBackend = currentBackend;
    host.dataset.renderFallbackReason = reason;
    const detail = { backend: currentBackend, reason, renderer: facade };
    onBackendChange(detail);
    if (typeof environment.CustomEvent === 'function') host.dispatchEvent(new environment.CustomEvent('renderbackendchange', { detail }));
  };
  const fail = error => {
    host.dataset.sceneReady = 'error'; host.dataset.sceneError = ERROR_TEXT;
    host.dataset.renderBackend = 'unavailable';
    throw new Error(ERROR_TEXT, { cause: error });
  };

  async function fallback(why) {
    if (disposed) return;
    if (transition) return transition;
    transition = (async () => {
      reason = why;
      if (registered) { RenderBudget.release(host); registered = false; }
      clearEffects();
      const previous = raw; const canvas = previous?.domElement;
      const settings = Object.fromEntries(['outputColorSpace', 'toneMapping', 'toneMappingExposure',
        'autoClear', 'autoClearColor', 'autoClearDepth', 'autoClearStencil', 'sortObjects']
        .filter(key => previous?.[key] !== undefined).map(key => [key, previous[key]]));
      const shadows = previous?.shadowMap ? { enabled: previous.shadowMap.enabled,
        type: previous.shadowMap.type, autoUpdate: previous.shadowMap.autoUpdate } : null;
      const clearColor = previous?.getClearColor?.(new Color()).clone();
      const clearAlpha = previous?.getClearAlpha?.();
      removeContextListeners(); safeDispose(previous); loseGL(previous);
      try {
        raw = makeGL(options); lastGL = raw; configure(raw); bindContext(raw);
        Object.assign(raw, settings);
        if (shadows && raw.shadowMap) Object.assign(raw.shadowMap, shadows);
        if (clearColor) raw.setClearColor(clearColor, clearAlpha);
        for (const attribute of canvas?.attributes || []) {
          if (!['width', 'height'].includes(attribute.name)) raw.domElement.setAttribute(attribute.name, attribute.value);
        }
        canvas?.replaceWith?.(raw.domElement);
        if (!raw.domElement.parentNode) host.appendChild(raw.domElement);
        currentBackend = 'webgl'; RenderBudget.register(host, facade, scene); registered = true;
        publish();
      } catch (error) { canvas?.remove?.(); removeContextListeners(); safeDispose(raw); loseGL(raw); fail(error); }
    })();
    try { await transition; } finally { transition = null; }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (registered) { RenderBudget.release(host); registered = false; }
    clearEffects(); removeContextListeners(); safeDispose(raw); loseGL(raw); raw?.domElement?.remove?.();
    delete host.dataset.sceneReady;
  }

  // Stable identity keeps existing RenderBudget registrations and captured renderer references valid.
  const facade = new Proxy({}, {
    get(_, key) {
      if (key === 'raw') return raw;
      if (key === 'backendName') return currentBackend;
      if (key === 'dispose') return dispose;
      if (key === 'forceContextLoss') return () => { loseGL(lastGL); };
      if (key === 'setPixelRatio') return value => { pixelRatio = Math.min(Math.max(value, .25), RenderBudget.mode === 'cinematic' ? 1.25 : 1); raw.setPixelRatio(pixelRatio); };
      if (key === 'setSize') return (...size) => { logicalSize = size; raw.setSize(...size); };
      if (key === 'render') return (s, camera) => {
        if (disposed || transition) return;
        try { return drawOverride && s === scene ? drawOverride(s, camera) : raw.render(s, camera); }
        catch (error) {
          if (currentBackend === 'webgpu') {
            void fallback(`WebGPU render failure: ${error.message}`).catch(e => { host.dataset.sceneError = e.message; });
            return;
          }
          throw error;
        }
      };
      const value = Reflect.get(raw, key, raw);
      return typeof value === 'function' ? value.bind(raw) : value;
    },
    set(_, key, value) { return Reflect.set(raw, key, value, raw); },
    has(_, key) { return key === 'forceContextLoss' || key in raw; }
  });
  host.dataset.sceneReady = 'false';
  let hasLegacyShaders = false;
  scene.traverse?.(object => {
    for (const material of [object.material].flat().filter(Boolean)) {
      if (material.isShaderMaterial || material.isRawShaderMaterial) hasLegacyShaders = true;
    }
  });
  const gpuAvailable = environment.isSecureContext !== false && Boolean(environment.navigator?.gpu);
  if (backend !== 'webgl' && gpuAvailable && !hasLegacyShaders) {
    let candidate;
    try {
      candidate = makeGPU(options);
      if (simulateInitFailure) throw new Error('Simulated initialization failure');
      // three r186 uses init(), not the older snippets' initAsync().
      await candidate.init();
      if (!candidate.backend?.isWebGPUBackend) throw new Error('WebGPURenderer selected its internal WebGL backend');
      raw = candidate; currentBackend = 'webgpu'; configure(raw);
      raw.onDeviceLost = info => {
        void fallback(`WebGPU device lost: ${info?.message || 'unknown'}`).catch(e => { host.dataset.sceneError = e.message; });
      };
      raw.onError = info => {
        void fallback(`WebGPU validation error: ${info?.message || 'unknown'}`).catch(e => { host.dataset.sceneError = e.message; });
      };
    } catch (error) {
      candidate?.domElement?.remove?.(); safeDispose(candidate); raw = undefined;
      reason = `WebGPU initialization failed: ${error.message}`;
    }
  } else reason = backend === 'webgl' ? 'WebGL explicitly selected' : hasLegacyShaders ? 'Legacy ShaderMaterial requires WebGL' : 'WebGPU unavailable or insecure context';
  if (!raw) {
    try { raw = makeGL(options); lastGL = raw; currentBackend = 'webgl'; configure(raw); bindContext(raw); }
    catch (error) { removeContextListeners(); safeDispose(raw); loseGL(raw); fail(error); }
  }
  if (raw.domElement.style) { raw.domElement.style.width = '100%'; raw.domElement.style.height = '100%'; raw.domElement.style.display = 'block'; }
  (host.querySelector?.('.world3d-view') || host).appendChild(raw.domElement);
  RenderBudget.register(host, facade, scene); registered = true;
  publish();
  return {
    renderer: facade,
    get backend() { return currentBackend; },
    get fallbackReason() { return reason; },
    schedule(tick) { if (!disposed) RenderBudget.schedule(host, tick); },
    setEffects(draw, cleanup) { clearEffects(); drawOverride = draw; effectsCleanup = cleanup; },
    fallback: why => fallback(why || 'Application requested fallback'),
    dispose
  };
}

export const LongMarchRenderer = Object.freeze({ create: createRenderer, ERROR_TEXT });
