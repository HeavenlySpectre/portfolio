/* Case-study pipeline diagram: scroll-scrubbed packets (port of the case-study board).
   The server renders the finished diagram (every edge lit, every node on) and this script only takes it apart again,
   so without JavaScript or with reduced motion the final state is what the reader sees. Hover, focus and tap show a node's note either way. */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../motion/fx';

gsap.registerPlugin(ScrollTrigger);

const NS = 'http://www.w3.org/2000/svg';
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

interface EdgeRt { t0: number; t1: number; lit: SVGPathElement; len: number; pk: SVGGElement; from: string }
interface NodeRt { id: string; g: SVGGElement; label: string; arrive: number; st: string }
interface Rt { svg: SVGSVGElement; edges: EdgeRt[]; nodes: NodeRt[] }

function mkPacket(svg: SVGSVGElement): SVGGElement {
  const g = document.createElementNS(NS, 'g');
  g.setAttribute('visibility', 'hidden');
  g.setAttribute('aria-hidden', 'true');
  const glow = document.createElementNS(NS, 'rect');
  glow.setAttribute('class', 'pk-g'); glow.setAttribute('x', '-8'); glow.setAttribute('y', '-8'); glow.setAttribute('width', '16'); glow.setAttribute('height', '16'); glow.setAttribute('rx', '2');
  const core = document.createElementNS(NS, 'rect');
  core.setAttribute('class', 'pk'); core.setAttribute('x', '-4'); core.setAttribute('y', '-4'); core.setAttribute('width', '8'); core.setAttribute('height', '8'); core.setAttribute('rx', '1');
  g.append(glow, core);
  svg.append(g);
  return g;
}

function mountPipe(root: HTMLElement): void {
  const RED = prefersReducedMotion();
  const hud = root.querySelector<HTMLElement>('.pipe-hud')!;
  const tip = root.querySelector<HTMLElement>('.pipe-tip')!;
  const pct = root.querySelector<HTMLElement>('.pipe-pct')!;
  const txt = root.querySelector<HTMLElement>('.pipe-trace-txt')!;
  const track = root.querySelector<HTMLElement>('.cs-track')!;
  const sticky = root.querySelector<HTMLElement>('.cs-sticky')!;
  const svgs = [...root.querySelectorAll<SVGSVGElement>('svg.pipe')];
  const HINT = 'hover or tap a node for a one-line explanation';
  let selId: string | null = null;

  /* ---- node notes: hover, focus and tap ---- */
  const notes = new Map<string, { label: string; note: string }>();
  const showTip = (id: string | null) => {
    tip.replaceChildren();
    const b = document.createElement('b');
    if (!id) { b.textContent = '› '; tip.append(b, HINT); return; }
    const n = notes.get(id)!;
    b.textContent = `› ${n.label}${n.note ? ': ' : ''}`;
    tip.append(b, n.note);
  };
  for (const svg of svgs) {
    for (const g of svg.querySelectorAll<SVGGElement>('.pnode')) {
      const id = g.dataset.id!;
      const label = [...g.querySelectorAll('tspan')].map((t) => t.textContent).join(' ');
      const full = g.getAttribute('aria-label') ?? label;
      if (!notes.has(id)) notes.set(id, { label, note: full.startsWith(label + ': ') ? full.slice(label.length + 2) : '' });
      g.addEventListener('mouseenter', () => showTip(id));
      g.addEventListener('focus', () => showTip(id));
      g.addEventListener('mouseleave', () => showTip(selId));
      g.addEventListener('blur', () => showTip(selId));
      g.addEventListener('click', () => {
        selId = id;
        for (const o of root.querySelectorAll('.pnode')) o.classList.toggle('sel', (o as SVGElement).dataset.id === id);
        showTip(id);
      });
      g.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); g.dispatchEvent(new Event('click')); }
      });
    }
  }
  hud.hidden = false;
  showTip(null);
  if (RED) return;

  /* ---- scroll-scrubbed run ---- */
  document.documentElement.classList.add('cs-scrub');
  const modeMq = matchMedia('(max-width: 760px)');
  const stickyMq = matchMedia('(min-width: 900px) and (min-height: 760px)');
  let rt: Rt | null = null;
  let P = 0;
  let lastPct = -1;
  let lastTxt = '';

  const activeSvg = () => svgs.find((s) => s.dataset.mode === (modeMq.matches ? 'v' : 'h'))!;

  function build(): void {
    if (rt) rt.edges.forEach((e) => e.pk.remove());
    const svg = activeSvg();
    const edges: EdgeRt[] = [...svg.querySelectorAll<SVGGElement>('.pedge')].map((g) => {
      const lit = g.querySelector<SVGPathElement>('.lit')!;
      const len = lit.getTotalLength();
      lit.style.strokeDasharray = String(len);
      lit.style.strokeDashoffset = String(len);
      return { t0: parseFloat(g.dataset.t0!), t1: parseFloat(g.dataset.t1!), lit, len, pk: mkPacket(svg), from: g.dataset.from! };
    });
    const nodes: NodeRt[] = [...svg.querySelectorAll<SVGGElement>('.pnode')].map((g) => ({
      id: g.dataset.id!, g, label: notes.get(g.dataset.id!)!.label, arrive: parseFloat(g.dataset.arrive!), st: '',
    }));
    // the hidden layout keeps its finished look, the active one is driven by progress
    for (const s of svgs) if (s !== svg) {
      for (const l of s.querySelectorAll<SVGPathElement>('.lit')) { l.style.strokeDasharray = ''; l.style.strokeDashoffset = ''; }
      for (const n of s.querySelectorAll('.pnode')) { n.classList.add('on'); n.classList.remove('hot'); }
    }
    rt = { svg, edges, nodes };
    lastPct = -1; lastTxt = '';
    render(P);
  }

  function render(p: number): void {
    P = p;
    if (!rt) return;
    for (const e of rt.edges) {
      const s = clamp((p - e.t0) / (e.t1 - e.t0));
      e.lit.style.strokeDashoffset = String(e.len * (1 - s));
      const vis = s > 0 && s < 1;
      if (vis) {
        const pt = e.lit.getPointAtLength(e.len * s);
        e.pk.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
      }
      const v = vis ? 'visible' : 'hidden';
      if (e.pk.getAttribute('visibility') !== v) e.pk.setAttribute('visibility', v);
    }
    const hot: string[] = [];
    for (const n of rt.nodes) {
      const st = p > 0 && p >= n.arrive ? (p < n.arrive + 0.06 ? 'hot' : 'on') : '';
      if (st === 'hot') hot.push(n.label);
      if (st !== n.st) { n.st = st; n.g.classList.toggle('on', st !== ''); n.g.classList.toggle('hot', st === 'hot'); }
    }
    const t = p <= 0 ? 'scroll to run the pipeline' : p >= 0.99 ? 'done' : hot.length ? hot.join(' + ') : lastTxt || 'running';
    if (t !== lastTxt) { lastTxt = t; txt.textContent = t; }
    const pc = Math.round(p * 100);
    if (pc !== lastPct) {
      lastPct = pc;
      const f = Math.round(p * 10);
      pct.textContent = `[${'#'.repeat(f)}${'.'.repeat(10 - f)}] ${String(pc).padStart(2)}%`;
    }
  }

  let st: ScrollTrigger | null = null;
  function mountScrub(): void {
    st?.kill();
    const o = { p: P };
    const pinned = stickyMq.matches;
    // the pinned box sits at its own sticky offset, so the run starts when the track reaches it
    const offset = () => parseFloat(getComputedStyle(sticky).top) || 58;
    const startAt = () => `top ${offset()}px`;
    const endAt = () => `bottom ${offset() + sticky.offsetHeight}px`;
    const tw = gsap.to(o, {
      p: 1, ease: 'none', onUpdate: () => render(o.p),
      scrollTrigger: { trigger: track, start: pinned ? startAt : 'top 55%', end: pinned ? endAt : 'bottom 70%', scrub: 0.4, invalidateOnRefresh: true },
    });
    st = tw.scrollTrigger ?? null;
  }

  build();
  mountScrub();
  modeMq.addEventListener('change', () => { build(); st?.refresh(); });
  stickyMq.addEventListener('change', () => { mountScrub(); ScrollTrigger.refresh(); });
}

const root = document.querySelector<HTMLElement>('[data-pipe]');
if (root) mountPipe(root);
