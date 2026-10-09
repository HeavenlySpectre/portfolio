import { gsap } from 'gsap';
import { countUp, prefersReducedMotion, scramble, txDone, typeText } from './fx';
import type { GitGraph } from '../experience/gitgraph';

declare global { interface Window { __kvSwapped?: boolean } }

/* Per-section choreography of the home page (port of the home-full board's motion layer).
   One language: things print, compile, resolve and draw, like a terminal and a training run.
   - a section heading types its command with a caret, then the body starts (units wait for their heading)
   - text resolves through a short scramble (same idea as the hero name), numbers count up, rows print line by line
   - transform / opacity / SVG stroke-dashoffset / text content only. Text never changes layout: the typed remainder is kept
     as an invisible ghost, scrambles keep the character count and every space and punctuation mark (see fx.ts)
   - every unit plays once when it enters the viewport, units are armed in small slices so no task gets long
   - prefers-reduced-motion (or no JavaScript) renders everything in its final state: nothing here runs
   The sections only carry plain, final markup. Hero, loader, spiral and the git graph's own scroll replay are not touched here. */

const D = document.documentElement;
const $ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector(s) as T | null;
const $$ = <T extends HTMLElement = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll(s)] as T[];
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const CLEAR = 'opacity,transform,visibility,strokeDasharray,strokeDashoffset,--gl';
/** "terminal print": appears in a few hard steps instead of a smooth fade */
const PRINT = { duration: 0.22, ease: 'steps(3)' };

interface Unit {
  el: HTMLElement;
  build: (tl: gsap.core.Timeline, u: Unit) => void;
  head: Unit | null;
  io: 1 | 2;
  state: 'off' | 'armed' | 'playing' | 'done';
  touched: gsap.TweenTarget[];
  gate: number;
  finalProg?: number;
  tl?: gsap.core.Timeline;
  ctx?: gsap.Context;
  dc?: gsap.core.Tween;
}

export interface SectionMotion { destroy(): void }

/** Arms the home sections and plays each once when it scrolls into view. Returns once everything is armed. */
export async function mountSectionMotion(graph: GitGraph, { signal }: { signal?: AbortSignal } = {}): Promise<SectionMotion> {
  const noop: SectionMotion = { destroy() { /* nothing armed */ } };
  if (prefersReducedMotion() || signal?.aborted) return noop;

  // wait for the loader transition to finish (it dispatches loader-done), with a safety net so the page is never left hidden
  if (document.getElementById('loader')) {
    await new Promise<void>((r) => {
      const t = setTimeout(r, 12000);
      const done = () => { clearTimeout(t); removeEventListener('loader-done', done); signal?.removeEventListener('abort', done); r(); };
      addEventListener('loader-done', done);
      signal?.addEventListener('abort', done);
    });
  }
  // after a client-side navigation there is no loader to settle behind, so arm in the very next task: the page is already on screen
  await new Promise((r) => setTimeout(r, window.__kvSwapped ? 0 : 120));
  if (signal?.aborted) return noop;

  const yieldMain = (): Promise<void> => new Promise((r) => {
    const s = (self as unknown as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (s?.yield) s.yield().then(() => r()); else setTimeout(r, 0);
  });

  const units: Unit[] = [];
  let cur: Unit | null = null; // the unit whose build() is running
  const byEl = new Map<HTMLElement, Unit>();
  let dead = false;

  const add = (el: HTMLElement | null, build: Unit['build'], o: { head?: Unit | null; io?: 1 | 2 } = {}): Unit | null => {
    if (!el) return null;
    const u: Unit = { el, build, head: o.head ?? null, io: o.io ?? 1, state: 'off', touched: [], gate: 0 };
    units.push(u);
    return u;
  };
  const hide = (els: HTMLElement | HTMLElement[] | SVGElement[] | null, v: gsap.TweenVars = {}) => {
    const a = (Array.isArray(els) ? els : [els]).filter(Boolean) as gsap.TweenTarget[];
    if (!a.length) return;
    cur!.touched.push(...a);
    gsap.set(a, { opacity: 0, ...v });
  };
  const clearTouched = (u: Unit) => { if (u.touched.length) gsap.set(u.touched, { clearProps: CLEAR }); };

  function arm(u: Unit) {
    if (u.state !== 'off') return;
    cur = u; u.touched = [];
    u.ctx = gsap.context(() => {
      u.tl = gsap.timeline({ paused: true, defaults: { overwrite: false }, onComplete: () => { clearTouched(u); u.state = 'done'; } });
      u.build(u.tl, u);
    });
    cur = null; u.state = 'armed';
  }
  function disarm(u: Unit) {
    if (u.state === 'off') return;
    u.dc?.kill();
    u.tl?.kill();
    u.ctx?.revert();
    for (const e of [u.el, ...u.el.querySelectorAll<HTMLElement>('*')]) txDone(e);
    clearTouched(u);
    u.state = 'off';
  }
  function play(u: Unit) {
    if (u.state !== 'armed') return;
    u.state = 'playing';
    let wait = 0;
    const h = u.head;
    if (h) {
      if (h.state === 'armed') play(h);
      if (h.state === 'playing' && h.tl) wait = Math.max(0, h.gate - h.tl.time());
    }
    if (wait > 0.02) u.dc = gsap.delayedCall(wait, () => { u.tl?.play(); }); else u.tl!.play();
  }
  const ioCb = (es: IntersectionObserverEntry[]) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const u = byEl.get(e.target as HTMLElement);
    if (!u) return;
    ioOf(u).unobserve(e.target);
    if (u.state === 'armed') play(u);
  });
  const io1 = new IntersectionObserver(ioCb, { rootMargin: '0px 0px -10% 0px' });
  const io2 = new IntersectionObserver(ioCb, { rootMargin: '0px 0px -32% 0px' });
  const ioOf = (u: Unit) => (u.io === 2 ? io2 : io1);

  /* ---------- shared pieces ---------- */
  /* section command: types with a caret that lingers briefly, then the small tag. Returns the time the body may start. */
  function headBuild(tl: gsap.core.Timeline, u: Unit, h: HTMLElement, extra: { el: HTMLElement; type?: boolean }[] = []): number {
    const cmd = $('.cmd', h)!, small = $('small', h), caret = $('.cursor', h);
    const d = clamp((cmd.textContent ?? '').length * 0.03, 0.24, 0.62);
    hide(h);
    if (small) hide(small);
    if (caret) hide(caret);
    tl.set(h, { opacity: 1 }, 0).add(typeText(cmd, { duration: d, hold: caret ? 0 : 0.4 })!, 0);
    if (small) tl.to(small, { opacity: 1, duration: 0.25 }, d);
    if (caret) tl.set(caret, { opacity: 1 }, d);
    for (const x of extra) {
      hide(x.el);
      if (x.type) tl.set(x.el, { opacity: 1 }, d).add(typeText(x.el, { duration: 0.3 })!, d);
      else tl.to(x.el, { opacity: 1, duration: 0.4 }, d);
    }
    u.gate = d;
    return d;
  }

  /* what-drives-me progress line: $ [###.......] 2/3  exit 0 */
  const prog = { el: $('#prog')!, v: 0, vt: 0, x: 0, n: 3 };
  const renderProg = () => {
    if (!prog.el) return;
    let bar = '';
    const cells = Math.round(prog.v * 10);
    for (let i = 0; i < 10; i++) bar += i < cells ? '#' : '.';
    prog.el.innerHTML = `$ <b>[${bar}]</b> ${Math.floor(prog.v * prog.n + 1e-6)}/${prog.n}${'  exit 0'.slice(0, Math.round(prog.x))}`;
  };
  const progReset = (final: boolean) => { gsap.killTweensOf(prog); prog.v = prog.vt = final ? 1 : 0; prog.x = final ? 8 : 0; renderProg(); };
  const progTo = (v: number, dur: number) => { prog.vt = Math.max(prog.vt, v); gsap.to(prog, { v: prog.vt, duration: dur, ease: 'none', overwrite: 'auto', onUpdate: renderProg }); };
  const progExit = () => gsap.to(prog, { x: 8, duration: 0.3, ease: 'none', onUpdate: renderProg });

  /* ======================= unit definitions ======================= */
  function define() {
    const heads: Record<string, Unit | null> = {};

    /* ---- what drives me: principles print in sequence, the last one is the biggest moment of the page ---- */
    {
      const sec = $('#drives')!;
      prog.n = $$('#prl .pr', sec).length || 3;
      heads.drives = add($('.sh', sec), (tl, u) => headBuild(tl, u, $('.sh', sec)!, $('.bio', sec) ? [{ el: $('.bio', sec)! }] : []));
      $$('#prl .pr', sec).forEach((li, i, all) => add(li, (tl, u) => {
        const last = li.classList.contains('last');
        const tag = $('.tag', li)!, tt = $('.tt', tag)!, q = $('q', li)!, why = $('.why', li)!;
        li.classList.remove('on');
        hide([tag, q]);
        hide(why, { y: 6 });
        const full = q.textContent ?? '';
        const dq = last ? 0.88 : clamp(full.length * 0.011, 0.4, 0.62), t1 = 0.3;
        tl.call(() => li.classList.add('on'), undefined, 0)
          .set(tag, { opacity: 1 }, 0)
          .add(typeText(tt, { duration: 0.22 })!, 0.05)
          .set(q, { opacity: 1 }, t1)
          .add(scramble(q, { duration: dq })!, t1)
          .to(why, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, t1 + dq - 0.1)
          .call(() => progTo((i + 1) / all.length, last ? dq : 0.4), undefined, t1);
        u.finalProg = (i + 1) / all.length;
        if (last) {
          // "Hasta El Final." resolves with a glow pulse (a copy of the text on top, driven by --gl), then the progress line prints exit 0
          q.dataset.t = full;
          cur!.touched.push(q);
          tl.fromTo(q, { scale: 0.96, transformOrigin: '0 50%' }, { scale: 1, duration: 0.95, ease: 'power3.out' }, t1)
            .fromTo(q, { '--gl': 0 }, { '--gl': 1, duration: 0.28, ease: 'power2.out' }, t1 + dq - 0.12)
            .to(q, { '--gl': 0, duration: 0.8, ease: 'power2.inOut' }, '>')
            .call(progExit, undefined, t1 + dq);
        }
      }, { head: heads.drives }));
    }

    /* ---- experience: heading only, the git graph runs its own scroll-driven replay ---- */
    {
      const sec = $('#experience')!;
      heads.exp = add($('.sh', sec), (tl, u) => headBuild(tl, u, $('.sh', sec)!));
    }

    /* ---- achievements: card slides in, medal draws, rank resolves, scores count up, one sheen ---- */
    {
      const sec = $('#achievements')!;
      heads.ach = add($('.sh', sec), (tl, u) => headBuild(tl, u, $('.sh', sec)!));
      $$('.card', sec).forEach((card) => add(card, (tl) => {
        const rk = $('.rk', card)!, sm = $('.rank small', card)!, shapes = $$('.medal path, .medal circle', card), mt = $('.medal text', card)!;
        const rest = [$('h3', card)!, $('.cat', card)!, $('p.s', card)!], stats = $$('.stats span', card), nums = $$('.stats b', card), sheen = $('.sheen', card)!;
        hide(card, { x: -18 });
        hide(rest, { y: 6 });
        hide(stats); hide(mt); hide(sm);
        cur!.touched.push(...shapes);
        gsap.set(shapes, { strokeDasharray: 1, strokeDashoffset: 1 });
        tl.to(card, { opacity: 1, x: 0, duration: 0.45, ease: 'power3.out' }, 0)
          .to(shapes, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.inOut', stagger: 0.12 }, 0.1)
          .to(mt, { opacity: 1, duration: 0.25 }, 0.75)
          .add(scramble(rk, { duration: 0.6 })!, 0.2)
          .set(sm, { opacity: 1 }, 0.35)
          .add(scramble(sm, { duration: 0.55 })!, 0.35)
          .to(rest, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.08 }, 0.45)
          .to(stats, { opacity: 1, duration: 0.3, stagger: 0.12 }, 0.7);
        nums.forEach((b, k) => tl.add(countUp(b, { duration: 0.9 })!, 0.75 + k * 0.12));
        cur!.touched.push(sheen);
        tl.set(sheen, { opacity: 1, x: -64 }, 1.1)
          .to(sheen, { x: () => card.offsetWidth + 64, duration: 0.9, ease: 'power1.inOut' }, 1.1)
          .set(sheen, { opacity: 0 }, 2.0);
      }, { head: heads.ach }));
    }

    /* ---- organizations: name types, big numbers count up, bullet lists type line by line ---- */
    {
      const sec = $('#organizations')!;
      heads.org = add($('.sh', sec), (tl, u) => headBuild(tl, u, $('.sh', sec)!));
      $$('.org', sec).forEach((org) => add(org, (tl) => {
        const h3 = $('h3', org)!, rl = $('.rl', org)!, bigs = $$('.big li', org), pts = $$('.pts li', org);
        hide(org, { x: -14 }); hide(rl); hide(bigs); hide(pts);
        const d = clamp((h3.textContent ?? '').length * 0.016, 0.25, 0.5);
        tl.to(org, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, 0)
          .add(typeText(h3, { duration: d })!, 0.1)
          .to(rl, { opacity: 1, duration: 0.3 }, 0.1 + d);
        const t = 0.1 + d * 0.6;
        bigs.forEach((li, k) => {
          const b = $('b', li)!, at = t + k * 0.1;
          tl.to(li, { opacity: 1, duration: 0.2 }, at);
          if (/\d/.test(b.textContent ?? '') && !li.classList.contains('tx')) tl.add(countUp(b, { duration: 0.85 })!, at);
          else tl.add(typeText(b, { duration: 0.5 })!, at);
        });
        const p0 = t + Math.min(bigs.length, 4) * 0.1 + 0.2;
        pts.forEach((li, k) => {
          const at = p0 + k * 0.14, dd = clamp((li.textContent ?? '').length * 0.0085, 0.25, 0.45);
          tl.set(li, { opacity: 1 }, at).add(typeText(li, { duration: dd })!, at);
        });
      }, { head: heads.org }));
    }

    /* ---- toolkit: the ls -la listing prints row by row ---- */
    {
      const sec = $('#toolkit')!;
      const tot = $('#tot', sec);
      heads.tk = add($('.sh', sec), (tl, u) => headBuild(tl, u, $('.sh', sec)!, tot ? [{ el: tot, type: true }] : []));
      $$('.dir', sec).forEach((dir) => add(dir, (tl) => {
        const h3 = $('h3', dir)!, items = $$('li', dir), lgs = items.map((li) => $('.lg', li)).filter(Boolean) as HTMLElement[];
        hide(h3); hide(items); hide(lgs);
        const step = Math.min(0.025, 0.45 / items.length);
        tl.set(h3, { opacity: 1 }, 0);
        items.forEach((li, i) => {
          tl.set(li, { opacity: 1 }, 0.025 + i * step);
          const lg = $('.lg', li);
          if (lg) tl.to(lg, { opacity: 1, duration: 0.3 }, 0.025 + i * step);
        });
      }, { head: heads.tk }));
    }

    /* ---- education, languages, certifications: ledger rows print ---- */
    $$('#education .blk').forEach((blk) => add(blk, (tl, u) => {
      const h3 = $('h3', blk)!, its = $$('.it', blk);
      const d = headBuild(tl, u, h3);
      hide(its, { x: -8 } as gsap.TweenVars);
      tl.to(its, { opacity: 1, x: 0, ...PRINT, stagger: 0.07 }, d * 0.7);
    }));

    /* ---- contact: links appear one by one ---- */
    {
      const sec = $('#contact')!;
      add($('.wrap', sec), (tl, u) => {
        const d = headBuild(tl, u, $('.sh', sec)!), open = $('.open', sec), dts = $$('.ct dt', sec), dds = $$('.ct dd', sec), cta = $('.cta', sec);
        if (open) { hide(open); tl.to(open, { opacity: 1, duration: 0.35 }, d + 0.05); }
        hide(dts, { x: -8 }); hide(dds, { x: -8 });
        dts.forEach((dt, i) => tl.to([dt, dds[i]], { opacity: 1, x: 0, ...PRINT }, d + 0.3 + i * 0.12));
        if (cta) { hide(cta, { y: 8 }); tl.to(cta, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, d + 0.3 + dts.length * 0.12); }
      });
    }
  }

  const handle: SectionMotion = {
    destroy() {
      if (dead) return;
      dead = true;
      io1.disconnect(); io2.disconnect();
      units.forEach(disarm);
      progReset(true);
      graph.destroy();
      D.dataset.sectionMotion = 'off';
    },
  };
  signal?.addEventListener('abort', () => handle.destroy(), { once: true });

  /* ======================= arm all ======================= */
  define();
  for (const u of units) byEl.set(u.el, u);
  graph.arm();
  progReset(false);
  const vh = innerHeight;
  const order = units.map((u) => { const r = u.el.getBoundingClientRect(); return { u, r, d: Math.abs(r.top + r.height / 2 - vh / 2) }; }).sort((a, b) => a.d - b.d);
  let t0 = performance.now();
  for (const { u, r } of order) {
    if (dead) return noop;
    if (performance.now() - t0 > 8) { await yieldMain(); t0 = performance.now(); if (dead) return noop; }
    if (r.height > 0 && r.bottom <= 0) { // already scrolled past: leave it in its final state
      if (u.finalProg) { prog.vt = Math.max(prog.vt, u.finalProg); prog.v = prog.vt; if (u.finalProg === 1) prog.x = 8; renderProg(); }
      continue;
    }
    arm(u);
    if (r.height > 0 && r.top < vh * (u.io === 2 ? 0.68 : 0.9) && r.bottom > 0) play(u);
    else ioOf(u).observe(u.el);
  }

  return handle;
}
