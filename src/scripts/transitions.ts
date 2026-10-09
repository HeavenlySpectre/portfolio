/* Page transitions on top of the Astro ClientRouter. Two kinds, both transform/opacity only and 800 ms or less, reduced motion swaps instantly.
   - card expand: from a project card (grid card or the spiral's active project) to its case study. The card and the case header share
     `transition:name="card-<slug>"`, so the browser morphs one into the other (View Transitions API, the styles are in shell.css).
   - terminal `cd`: every other navigation. A command types itself on the bottom line, rows cover the screen from the top, the new page is
     swapped in underneath, the rows retract. The overlay lives on <html> outside <body>, so it survives the body swap.
   The router has the same two seams for both: astro:before-preparation (decide, wrap the loader) and astro:before-swap (carry state over
   to the new document). This module is evaluated once per session, the listeners below stay for its whole life. */

declare global { interface Window { __kvTx?: { kind: Kind; cmd: string; ms?: number; done: boolean } } }

type Kind = 'card' | 'cd' | 'none';
interface Tx { kind: Kind; cmd: string; t0: number; ov: Overlay | null; loaded: boolean }
interface Overlay { covered: Promise<void>; uncover(): Promise<void>; remove(): void }
interface PrepEvent extends Event {
  from: URL; to: URL; navigationType: 'push' | 'replace' | 'traverse'; sourceElement?: Element; info?: { card?: boolean }; loader: () => Promise<void>;
}
interface SwapEvent extends Event { newDocument: Document; viewTransition: { finished: Promise<unknown> } }

const D = document.documentElement;
const E2E = new URLSearchParams(location.search).has('e2e'); // test hook: window.__kvTx tells the last transition
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const CASE = /^\/projects\/([^/]+)\/$/;
const COVER = 170, UNCOVER = 110, STEP = 40, ROWS = 22;
const typeMs = (text: string) => Math.min(150, 50 + text.length * 4); // `cd ~` types in about 70 ms, a project path in 150

let cur: Tx | null = null;
const waiters: (() => void)[] = [];

/** Resolves when no page transition is running. Heavy work after a navigation (the WebGL spiral) waits for it, so it cannot make the cover stutter. */
export const transitionSettled = (): Promise<void> => (cur ? new Promise<void>((r) => { waiters.push(r); }) : Promise.resolve());

/* ---------------------------------------------------------------- terminal cd overlay */
function makeOverlay(text: string): Overlay {
  const el = document.createElement('div');
  el.id = 'kv-tx';
  el.setAttribute('aria-hidden', 'true');
  const rows = document.createElement('div');
  rows.className = 'kv-rows';
  const bars = Array.from({ length: ROWS }, () => rows.appendChild(document.createElement('i')));
  const bar = document.createElement('div');
  bar.className = 'kv-cmd';
  const user = document.createElement('b');
  user.textContent = innerWidth < 520 ? '~' : 'kevin@portfolio:~';
  const typed = document.createElement('span');
  const caret = document.createElement('span');
  caret.className = 'kv-cur';
  bar.append(user, '$ ', typed, caret);
  el.append(rows, bar);
  D.append(el);

  const done = (anims: Animation[]) => Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
  let gone = false;
  const covered = (async () => {
    const t0 = performance.now();
    await new Promise<void>((res) => {
      (function f(now: number) {
        if (gone) return res();
        const k = Math.min(1, (now - t0) / typeMs(text));
        typed.textContent = text.slice(0, Math.round(k * text.length));
        if (k < 1) requestAnimationFrame(f); else res();
      })(t0);
    });
    if (gone) return;
    await done(bars.map((b, i) => b.animate([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: STEP, delay: (i / ROWS) * COVER, fill: 'forwards', easing: 'linear' })));
  })();

  return {
    covered,
    async uncover() {
      if (gone) return;
      await covered;
      if (gone) return;
      bars.forEach((b) => { b.style.transformOrigin = '50% 100%'; });
      const out = bars.map((b, i) => b.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: STEP, delay: (i / ROWS) * UNCOVER, fill: 'forwards', easing: 'linear' }));
      const fade = bar.animate([{ opacity: 1 }, { opacity: 0 }], { duration: UNCOVER, delay: 60, fill: 'forwards' });
      await done([...out, fade]);
      this.remove();
    },
    remove() { gone = true; el.remove(); },
  };
}

/* ---------------------------------------------------------------- helpers */
function finish(t: Tx): void {
  t.ov?.remove();
  if (cur === t) cur = null;
  waiters.splice(0).forEach((r) => r());
  if (E2E && window.__kvTx) { window.__kvTx.ms = Math.round(performance.now() - t.t0); window.__kvTx.done = true; }
}

function pick(e: PrepEvent): { kind: Kind; cmd: string } {
  const path = e.to.pathname;
  const cmd = 'cd ~' + (path === '/' ? '' : path.replace(/\/$/, ''));
  if (reduced()) return { kind: 'none', cmd };
  const src = e.sourceElement instanceof Element ? e.sourceElement : null;
  const card = CASE.test(path) && e.from.pathname === '/' && e.navigationType !== 'traverse' && (!!src?.closest('.sp-card, .sp-item') || !!e.info?.card);
  return { kind: card ? 'card' : 'cd', cmd };
}

/** The grid card already carries the name. The spiral has no card in the page, so its active project panel takes the name for the move. */
function nameSource(e: PrepEvent, slug: string): void {
  const src = e.sourceElement instanceof Element ? e.sourceElement : null;
  if (src?.closest('.sp-card')) return;
  const item = src?.closest<HTMLElement>('.sp-item') ?? document.querySelector<HTMLElement>('.sp-item.is-active');
  item?.style.setProperty('view-transition-name', 'card-' + slug);
}

/* ---------------------------------------------------------------- router seams */
document.addEventListener('astro:before-preparation', (ev) => {
  const e = ev as PrepEvent;
  cur?.ov?.remove(); // a newer navigation takes over
  const { kind, cmd } = pick(e);
  const t: Tx = { kind, cmd, t0: performance.now(), ov: null, loaded: false };
  cur = t;
  if (E2E) window.__kvTx = { kind, cmd, done: false };
  if (kind === 'card') nameSource(e, CASE.exec(e.to.pathname)![1]);
  if (kind === 'cd') {
    const ov = (t.ov = makeOverlay(cmd));
    const load = e.loader;
    // fetching starts at once and overlaps the typing and the cover
    e.loader = async () => { await Promise.all([ov.covered, load()]); };
    setTimeout(() => { if (cur === t && !t.loaded) finish(t); }, 6000); // never leave the screen covered
  }
});

document.addEventListener('astro:before-swap', (ev) => {
  const e = ev as SwapEvent;
  // the router replaces every attribute of <html> with the new document's, so what the page keeps has to be carried across here
  const root = e.newDocument.documentElement;
  root.classList.add('js');
  if (e.newDocument.getElementById('projects') && !reduced()) root.classList.add('sp-on'); // the spiral's pinned height must exist before the scroll position is restored
  const t = cur;
  if (!t || t.kind === 'none') return;
  root.dataset.kvTx = t.kind;
  e.viewTransition.finished.then(() => undefined, () => undefined).then(() => {
    if (D.dataset.kvTx === t.kind) delete D.dataset.kvTx;
    if (t.kind === 'card') finish(t);
  });
});

document.addEventListener('astro:page-load', () => {
  const t = cur;
  if (!t || t.loaded) return; // the first document load has no transition
  t.loaded = true;
  if (t.ov) t.ov.uncover().then(() => finish(t));
  else if (t.kind === 'none') finish(t);
});
