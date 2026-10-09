import { gsap } from 'gsap';
import { onPage } from './lifecycle';

/* Training-log loader. Once per session (sessionStorage['kv-loader-seen']), skippable with any key or tap,
   8 s safety timeout. The exit is ONE gsap timeline: the log collapses, "> ready." travels to the hero prompt
   and retypes as the shell command, a scanline wipes the curtain away and the name resolves.
   Only transform and opacity animate, all measuring happens before the timeline starts. */

declare global { interface Window { __heroReady?: boolean } }

const D = document.documentElement;

/* the loader belongs to the first document of a session: it is only ever on the page when that document is `/` */
onPage(() => {
  const L = document.getElementById('loader');
  if (L && D.classList.contains('ld')) return run(L);
});

function run(L: HTMLElement): () => void {
  const log = document.getElementById('ld-log')!;
  const line = document.getElementById('ld-line')!;
  const curtain = L.querySelector<HTMLElement>('.ld-curtain')!;
  const scan = L.querySelector<HTMLElement>('.ld-scan')!;
  const hint = L.querySelector<HTMLElement>('.ld-hint')!;
  const prompt = document.querySelector<HTMLElement>('.prompt')!;
  const PROMPT = 'kevin@portfolio:~$ whoami', PB = 'kevin@portfolio'.length;
  const MIN_FILL = 1.0, FORCE_AT = 1.9;
  // test hook: ?kv-safety=<ms> shortens the safety timeout so the safety path can be exercised
  const hook = Number(new URLSearchParams(location.search).get('kv-safety'));
  const SAFETY = hook > 0 ? hook : 8000;
  const heroWords = [...document.querySelectorAll<HTMLElement>('.hero h1 span')];
  const heroFinal = heroWords.map((w) => w.textContent ?? '');
  try { history.scrollRestoration = 'manual'; } catch { /* ignore */ }
  scrollTo(0, 0);

  let fontsOK = !document.fonts;
  if (document.fonts) {
    Promise.all([document.fonts.load('400 16px "IBM Plex Mono"'), document.fonts.load('700 16px "IBM Plex Mono"'), document.fonts.ready])
      .then(() => { fontsOK = true; }, () => { fontsOK = true; });
  }

  let finished = false, settled = false, dead = false, tl: gsap.core.Timeline | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const later = (f: () => void, ms: number) => { const t = setTimeout(() => { timers.delete(t); f(); }, ms); timers.add(t); };
  function finish() {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem('kv-loader-seen', '1'); } catch { /* ignore */ }
    D.classList.remove('ld', 'ld-lock');
    L.remove();
    scrollTo(0, 0);
  }
  function settle() { // wipe, reveal and name are all done: safe to start heavy work
    if (settled) return;
    settled = true;
    finish();
    window.dispatchEvent(new Event('loader-done'));
  }
  const until = (test: () => boolean, max: number) => new Promise<void>((res) => {
    const t0 = performance.now();
    (function p() { if (dead || test() || performance.now() - t0 > max) res(); else later(p, 30); })();
  });

  /* ---- log script (generic training log, never real scores) ---- */
  let P = 0, T0 = performance.now(), prev = T0, forced = false, skipped = false, exiting = false, raf = 0;
  const NARROW = innerWidth < 640;
  const bar = (p: number) => { const n = Math.round(p * 16); return '█'.repeat(n) + '░'.repeat(16 - n); };
  const EP: Record<number, [number, number]> = { 3: [0.2693, 0.2841], 6: [0.0921, 0.1014], 9: [0.0526, 0.0589], 12: [0.0412, 0.0467] };
  const nn = (e: number) => String(e).padStart(2, '0');
  interface Line { when: () => boolean; s: () => string }
  const ep = (e: number, thr: number): Line => ({
    when: () => P >= thr - 1e-6,
    s: () => {
      const l = EP[e][0].toFixed(4), v = EP[e][1].toFixed(4);
      return NARROW ? `> ep ${nn(e)}/12 loss ${l} val ${v}` : `> epoch ${nn(e)}/12  loss ${l}  val_loss ${v}` + (e === 12 ? '  acc 0.987  f1 0.981' : '');
    },
  });
  const fin = (s: string): Line => ({ when: () => P >= 1, s: () => s });
  const LINES: Line[] = [
    { when: () => true, s: () => '> init kernel.anugerah v2' },
    { when: () => true, s: () => '> mount /dev/portfolio  [ ok ]' },
    { when: () => true, s: () => '> loading weights … ' + bar(P) + ' ' + String(Math.floor(P * 100)).padStart(2, ' ') + '%' },
    ep(3, 0.25), ep(6, 0.5), ep(9, 0.75), ep(12, 1),
  ];
  if (NARROW) LINES.push(fin('> acc 0.987  f1 0.981'));
  LINES.push(fin('> eval: precision 0.984 · recall 0.978'), fin('> attention heads: 8  ✓'), fin('> ready.'));

  interface Row { el: HTMLElement; shown: number; typed: boolean; html: string }
  const rows: Row[] = [];
  const promptRect = prompt.getBoundingClientRect(), lh = parseFloat(getComputedStyle(prompt).fontSize) * 1.6;
  log.style.left = promptRect.left + 'px';
  log.style.top = Math.max(16, promptRect.top - (LINES.length - 1) * lh) + 'px';
  const fmt = (s: string) => s.replace('[ ok ]', '<span class="ok">[ ok ]</span>').replace('✓', '<span class="ok">✓</span>');

  function frame(now: number) {
    if (exiting || dead) return;
    const dt = Math.min((now - prev) / 1000, 0.1); prev = now;
    const t = (now - T0) / 1000;
    if (!forced && t > FORCE_AT) forced = true;
    const real = 0.1 + 0.4 * (fontsOK ? 1 : 0) + 0.5 * (window.__heroReady ? 1 : 0);
    const target = forced || skipped ? 1 : Math.min(real, 0.97 + 0.03 * (real >= 1 ? 1 : 0));
    P = Math.min(target, P + dt * (skipped ? 20 : forced ? 3 : 1 / MIN_FILL));
    const last = rows[rows.length - 1];
    if ((!last || last.typed) && rows.length < LINES.length && LINES[rows.length].when()) {
      const el = document.createElement('span'); el.className = 'ln'; log.appendChild(el);
      rows.push({ el, shown: 0, typed: false, html: '' });
    }
    rows.forEach((r, i) => {
      if (r.typed && i !== 2 && i !== LINES.length - 1) return; // finished rows are static (row 2 is the live progress bar)
      const txt = LINES[i].s();
      if (r.shown < txt.length) r.shown = skipped ? txt.length : Math.min(txt.length, r.shown + 260 * dt + 0.5);
      r.typed = Math.floor(r.shown) >= txt.length;
      const cur = i === rows.length - 1 && !(i === LINES.length - 1 && r.typed);
      const h = fmt(txt.slice(0, Math.floor(r.shown))) + (cur ? '<span class="cur"></span>' : '');
      if (h !== r.html) { r.html = h; r.el.innerHTML = h; }
    });
    if (rows.length === LINES.length && rows[rows.length - 1].typed) { exiting = true; later(exit, skipped ? 0 : 220); return; }
    raf = requestAnimationFrame(frame);
  }

  /* ---- exit: ONE gsap timeline ---- */
  async function exit() {
    if (settled || dead) return;
    await until(() => !!window.__heroReady, skipped ? 600 : 3000); // the hero background must already be warm under the overlay
    if (document.fonts) await document.fonts.ready;
    if (settled || dead) return;
    const lns = [...log.querySelectorAll<HTMLElement>('.ln')], lastLn = lns[lns.length - 1], old = lns.slice(0, -1);
    lastLn.innerHTML = fmt('&gt; ready.');
    const pr = prompt.getBoundingClientRect(), lr = lastLn.getBoundingClientRect(), dy = lr.top - pr.top, dx = lr.left - pr.left;
    line.style.display = 'block'; line.style.left = pr.left + 'px'; line.style.top = pr.top + 'px';
    const setLine = (s: string) => {
      line.innerHTML = s.length > PB ? '<b>' + s.slice(0, PB) + '</b>' + s.slice(PB) : s.indexOf('>') === 0 ? '<span style="color:var(--text)">' + s.replace('>', '&gt;') + '</span>' : s;
    };
    setLine('> ready.'); lastLn.style.visibility = 'hidden';

    const rv = [...document.querySelectorAll<HTMLElement>('.rv')];
    const words = heroWords, tg = heroFinal;
    const total = tg.join('').length, SYM = '01<>/\\{}[]=+*#%$', thr: number[][] = [];
    let g = 0;
    tg.forEach((w, wi) => { thr[wi] = []; for (let i = 0; i < w.length; i++, g++) thr[wi][i] = 0.1 + 0.8 * (g / (total - 1)); });
    let lastR = 0; const lastS: string[] = [];
    const renderName = (p: number, force = false) => {
      const now = performance.now();
      if (!force && p < 1 && now - lastR < 33) return;
      lastR = now;
      words.forEach((w, wi) => {
        let s = '';
        for (let i = 0; i < tg[wi].length; i++) s += p >= thr[wi][i] ? tg[wi][i] : SYM[(Math.random() * SYM.length) | 0];
        if (lastS[wi] !== s) { lastS[wi] = s; w.textContent = s; }
      });
    };
    renderName(0, true);
    D.classList.remove('ld'); // .rv are held at opacity 0 by the tween below (immediateRender)

    const o = { e: 8, t: 0 }; let ls = '';
    const paint = () => {
      const s = o.t > 0 ? PROMPT.slice(0, o.t) : '> ready.'.slice(0, o.e);
      if (s !== ls) { ls = s; setLine(s); }
    };
    const np = { p: 0 };
    tl = gsap.timeline({ defaults: { overwrite: false }, onComplete: settle });
    tl.to(old, { opacity: 0, y: -4, scaleY: 0.1, duration: 0.24, ease: 'power2.in', stagger: 0.022 }, 0)
      .addLabel('move', 0.28)
      .fromTo(line, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.5, ease: 'power3.inOut' }, 'move')
      .to(o, { e: 0, duration: 0.14, ease: 'none', snap: { e: 1 }, onUpdate: paint }, 'move+=.02')
      .to(o, { t: PROMPT.length, duration: 0.3, ease: 'none', snap: { t: 1 }, onUpdate: paint }, '>')
      .addLabel('reveal', 'move+=.52')
      .call(() => { line.innerHTML = '<b>kevin@portfolio</b>:~$ whoami'; }, undefined, 'reveal')
      .set(scan, { opacity: 1 }, 'reveal')
      .to(hint, { opacity: 0, duration: 0.15 }, 'reveal')
      .to(curtain, { yPercent: 100, duration: 0.6, ease: 'power3.inOut' }, 'reveal')
      .fromTo(rv, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.07, clearProps: 'opacity,transform,transition' }, 'reveal+=.12')
      .to(np, { p: 1, duration: 0.75, ease: 'none', onUpdate: () => renderName(np.p), onComplete: () => renderName(1, true) }, 'reveal+=.1')
      .call(finish, undefined, 'reveal+=.62');
    if (skipped) tl.timeScale(2.5);
  }

  const skip = () => { if (skipped) return; skipped = true; if (tl) tl.timeScale(2.5); };
  addEventListener('keydown', skip);
  addEventListener('pointerdown', skip); // the overlay is inert, so listen on the window
  later(() => { // never trap the page
    if (!settled) {
      tl?.progress(1, false); // events are suppressed on purpose, so restore the end state by hand
      heroWords.forEach((w, i) => { w.textContent = heroFinal[i]; });
      document.querySelectorAll<HTMLElement>('.rv').forEach((e) => { e.style.opacity = ''; e.style.transform = ''; e.style.transition = ''; });
      D.classList.remove('ld');
      settle();
    }
  }, SAFETY);
  raf = requestAnimationFrame((n) => { prev = n; T0 = n; frame(n); });

  /* leaving the page (or any early teardown) must not leave a timer, a frame, a tween or a listener behind, and must not leave the page locked */
  return () => {
    dead = true;
    cancelAnimationFrame(raf);
    timers.forEach(clearTimeout); timers.clear();
    tl?.kill();
    removeEventListener('keydown', skip);
    removeEventListener('pointerdown', skip);
    L.remove();
    D.classList.remove('ld', 'ld-lock');
  };
}
