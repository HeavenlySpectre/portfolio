import { gsap } from 'gsap';

/* Motion primitives. Text never changes layout: scrambles keep the character
   count and every space and punctuation mark, typing keeps the not-yet-typed
   remainder as an invisible ghost, and the box is always sized by the final text. */

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const SAFE = '01#*=<>^~';
const isAN = (c: string) => /[A-Za-z0-9]/.test(c);

/** One scramble frame. Letters and digits resolve left to right as progress grows, everything else is kept. */
export function scrambleFrame(final: string, progress: number, rand: () => number): string {
  const n = final.length;
  let out = '';
  for (let i = 0; i < n; i++) {
    const ch = final[i];
    const at = 0.12 + 0.82 * (i / Math.max(1, n - 1));
    out += !isAN(ch) || progress >= at ? ch : SAFE[Math.floor(rand() * SAFE.length) % SAFE.length];
  }
  return out;
}

/** Interpolates the number inside a string like '>100%', '800+' or '99.70%' from 0 to its value, keeping prefix, suffix and decimals. */
export function formatCount(target: string, t: number): string {
  const m = /^(.*?)(\d+(?:\.(\d+))?)(.*)$/s.exec(target);
  if (!m) return target;
  const dec = m[3] ? m[3].length : 0;
  const k = Math.min(1, Math.max(0, t));
  return m[1] + (parseFloat(m[2]) * k).toFixed(dec) + m[4];
}

interface FxState {
  full: string;
  mode: 'type' | 'scr';
  v: HTMLElement;
  g: HTMLElement;
  c: HTMLElement;
  k: number;
  s: string;
}
export type FxEl = HTMLElement & { __fx?: FxState | null };

const mk = (cls?: string, txt?: string) => {
  const e = document.createElement('span');
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
};

export const fullText = (el: HTMLElement): string => (el as FxEl).__fx?.full ?? el.textContent ?? '';

/** Puts the element in armed structure: a visually hidden copy for assistive tech plus the animated aria-hidden copy. */
export function txPrep(el: HTMLElement, mode: 'type' | 'scr'): FxState {
  const e = el as FxEl;
  if (e.__fx) txDone(e);
  const full = e.textContent ?? '';
  const vh = mk('vh', full), wrap = mk(), v = mk(), c = mk('fx-c'), g = mk('fx-g');
  wrap.setAttribute('aria-hidden', 'true');
  c.style.display = 'none';
  g.textContent = full;
  e.textContent = '';
  const f: FxState = { full, mode, v, c, g, k: -1, s: '' };
  if (mode === 'type') {
    wrap.append(v, c, g);
  } else {
    // the invisible full text sizes the box, the scramble is overlaid in place and clipped
    v.textContent = scrambleFrame(full, 0, Math.random);
    v.className = 'fx-s';
    wrap.className = 'fx-w';
    if (getComputedStyle(e).display === 'inline') wrap.style.display = 'inline-block';
    wrap.append(g, v, c);
  }
  e.append(vh, wrap);
  e.__fx = f;
  return f;
}

/** Restores the element to its plain final text. */
export function txDone(el: HTMLElement): void {
  const e = el as FxEl;
  if (!e.__fx) return;
  e.textContent = e.__fx.full;
  e.__fx = null;
}

export interface FxOpts {
  duration?: number;
  delay?: number;
  ease?: string;
}

function txTween(el: HTMLElement, f: FxState, o: FxOpts): gsap.core.Tween {
  const n = f.full.length;
  const state = { p: 0 };
  let last = 0;
  return gsap.to(state, {
    p: 1,
    duration: o.duration ?? Math.min(0.62, Math.max(0.24, n * 0.03)),
    delay: o.delay ?? 0,
    ease: o.ease ?? 'none',
    onStart() { if (f.mode === 'type') f.c.style.display = ''; },
    onUpdate() {
      if (f.mode === 'type') {
        const k = Math.round(state.p * n);
        if (k !== f.k) { f.k = k; f.v.textContent = f.full.slice(0, k); f.g.textContent = f.full.slice(k); }
      } else {
        const now = performance.now();
        if (state.p < 1 && now - last < 33) return;
        last = now;
        const s = scrambleFrame(f.full, state.p, Math.random);
        if (s !== f.s) { f.s = s; f.v.textContent = s; }
      }
    },
    onComplete() { txDone(el); },
  });
}

/** Types the element's text with a caret. Returns the tween, or null under reduced motion (final text stays). */
export function typeText(el: HTMLElement, opts: FxOpts = {}): gsap.core.Tween | null {
  if (prefersReducedMotion()) return null;
  return txTween(el, (el as FxEl).__fx?.mode === 'type' ? (el as FxEl).__fx! : txPrep(el, 'type'), opts);
}

/** Resolves the element's text through a scramble. The box is sized by the invisible final text. */
export function scramble(el: HTMLElement, opts: FxOpts = {}): gsap.core.Tween | null {
  if (prefersReducedMotion()) return null;
  return txTween(el, (el as FxEl).__fx?.mode === 'scr' ? (el as FxEl).__fx! : txPrep(el, 'scr'), opts);
}

/** Counts the number in the element's text up from 0, keeping prefix, suffix and decimals. */
export function countUp(el: HTMLElement, opts: FxOpts = {}): gsap.core.Tween | null {
  if (prefersReducedMotion()) return null;
  const final = el.dataset.final ?? el.textContent ?? '';
  const o = { t: 0 };
  el.textContent = formatCount(final, 0);
  return gsap.to(o, {
    t: 1,
    duration: opts.duration ?? 0.85,
    delay: opts.delay ?? 0,
    ease: opts.ease ?? 'power3.out',
    onUpdate() { el.textContent = formatCount(final, o.t); },
    onComplete() { el.textContent = final; },
  });
}
