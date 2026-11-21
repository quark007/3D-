/* Standalone contract implementation for demos ONLY. Never replaces the game's RenderBudget. */
export function createDemoBudget(mode = 'quality') {
  const entries = new Map();
  let draws = 0;
  return {
    mode,
    register(host, renderer, scene) {
      this.release(host);
      entries.set(host, { renderer, scene, timer: null, raf: null, tick: null, last: -Infinity });
    },
    schedule(host, tick) {
      const entry = entries.get(host);
      if (!entry) throw new Error('RenderBudget.register must precede schedule');
      entry.tick = tick;
      if (entry.timer !== null || entry.raf !== null || document.hidden) return;
      const wait = Math.max(0, 1000 / 30 - (performance.now() - entry.last) - 4);
      entry.timer = setTimeout(() => {
        entry.timer = null;
        entry.raf = requestAnimationFrame(now => {
          entry.raf = null;
          if (entries.get(host) !== entry || document.hidden) return;
          if (now - entry.last < 1000 / 30 - .2) { this.schedule(host, entry.tick); return; }
          entry.last = now; draws++; entry.tick(now);
        });
      }, wait);
    },
    release(host) {
      const entry = entries.get(host);
      if (!entry) return;
      if (entry.timer !== null) clearTimeout(entry.timer);
      if (entry.raf !== null) cancelAnimationFrame(entry.raf);
      entries.delete(host);
    },
    get diagnostics() { return { registrations: entries.size, draws, pending: [...entries.values()].filter(e => e.timer !== null || e.raf !== null).length }; }
  };
}
