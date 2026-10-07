export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const finePointer = window.matchMedia('(pointer: fine)');

export function debounce(fn, ms = 200) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * Loads the three font families explicitly, then waits for document.fonts.ready (6s offline safety net).
 * progress() is the real fraction of loads that have finished.
 */
export function fontLoader() {
  const loads = [
    document.fonts.load('500 1em "Inter Tight"'),
    document.fonts.load('400 1em "Inter Tight"'),
    document.fonts.load('400 1em "JetBrains Mono"'),
  ];
  let finished = 0, ready = false;
  loads.forEach((p) => p.catch(() => {}).then(() => { finished++; }));
  const all = Promise.all(loads).then(() => document.fonts.ready).catch(() => {}).then(() => { ready = true; });
  const timeout = new Promise((r) => setTimeout(() => { ready = true; r(); }, 6000));
  const promise = Promise.race([all, timeout]);
  return {
    promise,
    progress: () => (ready ? 1 : (finished / loads.length) * 0.9),
  };
}
