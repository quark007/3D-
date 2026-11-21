/* Load as a normal defer script. Await LongMarchRenderer.ready before creating scenes. */
(function (global) {
  const base = document.currentScript.src;
  const ready = import(new URL('./src/renderer-adapter.js', base).href);
  global.LongMarchRenderer = Object.freeze({
    ready,
    async create(options) { return (await ready).createRenderer(options); }
  });
})(globalThis);
