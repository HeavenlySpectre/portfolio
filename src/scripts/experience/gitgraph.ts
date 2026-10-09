import { gsap } from 'gsap';
import { buildRoles, commitRows, MON, nowMonth, ymLabel, type RoleModel } from '../../lib/experience-model';
import { prefersReducedMotion, scramble, typeText } from '../motion/fx';

/* Experience git graph (port of the home-full board).
   Vertical git log (below 720px and under reduced motion): the server-rendered list gets its lines drawn on top, a HEAD line follows the scroll.
   Horizontal graph (wide screens): pinned with position: sticky, so scrolling stays native and the wheel is never trapped. The scroll position
   drives a HEAD playhead, the track slides under it, branches are drawn exactly up to it, commits pop and type in and the detail card switches
   to the role under the playhead. Everything is reversible. arm() switches the replay on (after the loader), without it the final state shows. */

export interface GitGraph {
  /** Switches the scroll-driven replay on. Without it the graph is fully drawn. */
  arm(): void;
  /** Starts the replay (the playhead appears). Called automatically when the graph scrolls into view after arm(). */
  go(): void;
  destroy(): void;
}

type El = HTMLElement;
type Sv = SVGElement;
interface Path { el: SVGPathElement; x0: number; x1: number; L: number; xs: number[] | null; ls: number[] | null; off: number }
interface RvItem { el: Sv; x: number; on: boolean; nd: boolean; ty: Sv[]; tab?: boolean }
interface Tick { el: Sv; x: number; on: boolean }
interface YearItem { el: Sv; x: number; y: string; on?: boolean }
interface PkLine { x0: number; y: number; span: number; gap: number; els: Sv[]; v: boolean[] }
interface Typing { el: Sv; full: string; t0: number; dur: number; k: number }
interface E1Node { el: Sv; ring: Sv; y: number; on: boolean }
interface E1Pk { el: Sv; yb: number; span: number; off: number; v: boolean }

const NS = 'http://www.w3.org/2000/svg';
const COL = ['#4ade80', '#9bd8b0', '#e6f5ec', '#58a977'];
const DOT = '·';
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const svgEl = (n: string, a: Record<string, string | number>): Sv => {
  const e = document.createElementNS(NS, n) as Sv;
  for (const k in a) e.setAttribute(k, String(a[k]));
  return e;
};

export function mountGitGraph(section: HTMLElement): GitGraph {
  const q = <T extends Element = El>(sel: string, root: ParentNode = section) => root.querySelector(sel) as T;
  const qa = <T extends Element = El>(sel: string, root: ParentNode = section) => [...root.querySelectorAll(sel)] as T[];

  const roles = buildRoles();
  const rows = commitRows(roles);
  const byId: Record<string, { o: RoleModel | RoleModel['stints'][number]; parent?: RoleModel }> = {};
  for (const r of roles) {
    byId[r.id] = { o: r };
    r.stints.forEach((st, i) => { byId[`${r.id}:${i}`] = { o: st, parent: r }; });
  }
  const T0 = Math.min(...roles.map((r) => r.s));
  const NOW = nowMonth(roles);
  const rm = prefersReducedMotion();
  let motionOn = false;
  let dead = false;

  const exp = q('#exp');
  const cl = q('#cl'), log = q('#log'), svg = q<SVGSVGElement>('#lg'), g = q<SVGGElement>('#lgg'), clip = q<SVGRectElement>('#lgr'), ph1 = q('#ph1');
  const hw = q('#hw'), hs = q('#hs'), ht2 = q('#ht2'), hdet = q('#hs-det'), hb = q('#hs-b'), hsView = q('.hs-view');
  const cleanups: (() => void)[] = [];
  const on = <K extends keyof WindowEventMap>(t: Window, k: K, f: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
    t.addEventListener(k, f, o);
    cleanups.push(() => t.removeEventListener(k, f, o));
  };

  /* ---------- detail card (horizontal graph) ---------- */
  const lis = (arr: string[]) => arr.map((t) => `<li>${esc(t)}</li>`).join('');
  const logoOf = (r: RoleModel) => `<img class="lt" src="${esc(r.logo)}" alt="${esc(r.org)}" width="48" height="48">`;
  function detail(k: string): string {
    const e = byId[k], par = e.parent ?? (e.o as RoleModel);
    const o = e.o as RoleModel & { name?: string };
    const state = o.e == null ? 'running' : 'exited 0';
    const title = e.parent ? `${esc(par.org)} &middot; ${esc((o as { name: string }).name)}` : `${esc(par.org)} &middot; ${esc(par.role)}`;
    return `${logoOf(par)}<div class="dtx"><b>${title}</b><br><span class="date">${o.date} &middot; ${state}</span><ul class="diff">${lis(o.b.slice(0, 2))}</ul></div>`;
  }

  let view: 'e1' | 'e2' = 'e1';
  const narrow = () => innerWidth < 720 || rm;
  function sync() {
    view = narrow() ? 'e1' : 'e2';
    exp.dataset.view = view;
    requestAnimationFrame(() => { if (dead) return; graph(); onScroll(); layout2(); upd2(); });
  }

  /* ===================== vertical git graph ===================== */
  const E1: { nodes: E1Node[]; Y: number[]; max: number; pk: E1Pk[] } = { nodes: [], Y: [], max: -1, pk: [] };
  let H = 0;
  function graph() {
    if (view !== 'e1') return;
    const lr = log.getBoundingClientRect(), items = [...cl.children] as El[];
    const step = innerWidth < 640 ? 13 : 17, x0 = 8, xs = (l: number) => x0 + l * step;
    const Y = items.map((li) => q('.anchor', li).getBoundingClientRect().top - lr.top + 11);
    H = lr.height;
    svg.setAttribute('height', String(H));
    g.textContent = '';
    const idx = (r: RoleModel, type: string) => rows.findIndex((w) => w.role === r && w.type === type);
    g.appendChild(svgEl('path', { d: `M${x0},0 V${Y[Y.length - 1]}`, stroke: COL[0], 'stroke-width': 2, fill: 'none' }));
    for (const r of roles) {
      if (!r.lane) continue;
      const yo = Y[idx(r, 'open')], x = xs(r.lane), mi = idx(r, 'merge');
      let d = `M${x0},${yo + 26} C${x0},${yo + 10} ${x},${yo + 16} ${x},${yo}`;
      if (mi >= 0) { const ye = Y[mi]; d += ` V${ye + 26} C${x},${ye + 10} ${x0},${ye + 16} ${x0},${ye}`; } else d += ' V0';
      g.appendChild(svgEl('path', { d, stroke: COL[r.lane], 'stroke-width': 2, fill: 'none' }));
    }
    E1.nodes = []; E1.Y = Y;
    rows.forEach((w, i) => {
      const c = w.type === 'merge' ? COL[w.role.lane] : COL[w.lane];
      const rad = w.type === 'sub' ? 3.5 : w.type === 'merge' ? 5 : 6;
      const n = svgEl('circle', { class: 'dn' + (motionOn ? ' pre' : ''), cx: xs(w.lane), cy: Y[i], r: rad, fill: w.type === 'merge' ? c : '#090c0a', stroke: c, 'stroke-width': 2 });
      const rr = svgEl('circle', { class: 'rg', cx: xs(w.lane), cy: Y[i], r: rad, stroke: c });
      g.appendChild(rr); g.appendChild(n);
      E1.nodes.push({ el: n, ring: rr, y: Y[i], on: !motionOn });
    });
    /* light packets on the lines of ongoing roles flow up toward HEAD (newest is on top); the clip rect hides whatever the playhead has not drawn yet */
    E1.pk = [];
    const lines = [{ x: x0, yb: Y[Y.length - 1] }];
    for (const r of roles) if (r.e == null && r.lane) lines.push({ x: xs(r.lane), yb: Y[idx(r, 'open')] });
    for (const ln of lines) {
      const cnt = Math.max(1, Math.round(ln.yb / 150));
      for (let k = 0; k < cnt; k++) {
        const pc = svgEl('circle', { class: 'pk', cx: ln.x, cy: 0, r: 2.5, visibility: 'hidden' });
        g.appendChild(pc);
        E1.pk.push({ el: pc, yb: ln.yb, span: ln.yb, off: (k * ln.yb) / cnt, v: false });
      }
    }
    clip.setAttribute('height', String(rm || !motionOn ? H : clip.getAttribute('height') ?? 0));
  }
  function onScroll() {
    if (view !== 'e1') return;
    const lr = log.getBoundingClientRect();
    const y = rm || !motionOn ? H : Math.max(0, Math.min(H, innerHeight * 0.62 - lr.top));
    clip.setAttribute('height', String(y));
    ph1.style.transform = `translateY(${y.toFixed(1)}px)`;
    ph1.classList.toggle('on', motionOn && !rm);
    /* commit nodes pop and commit text prints in once the drawn line reaches them (once; rebuilt nodes above the high-water mark come back already shown) */
    for (const n of E1.nodes) {
      if (n.on || n.y > y) continue;
      n.on = true;
      n.el.classList.remove('pre');
      n.el.classList.add(n.y <= E1.max ? 'done' : 'pop');
      if (n.y > E1.max) n.ring.classList.add('rp');
    }
    for (const li of [...cl.children] as El[]) {
      if (li.classList.contains('pre') && q('.anchor', li).getBoundingClientRect().top - lr.top + 11 <= y) {
        li.classList.remove('pre');
        if (motionOn) rowIn(li);
      }
    }
    if (motionOn) E1.max = Math.max(E1.max, y);
  }
  let tk = 0;
  on(window, 'scroll', () => { if (!tk) tk = requestAnimationFrame(() => { tk = 0; onScroll(); upd2(); }); }, { passive: true });
  on(window, 'resize', () => sync());
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (!dead) { graph(); onScroll(); layout2(); upd2(); } });
  if ('ResizeObserver' in window) { // rows change height when fonts load or the text reflows: keep the lines on their commits
    const ro = new ResizeObserver(() => { if (!dead && view === 'e1') { graph(); onScroll(); } });
    ro.observe(log);
    cleanups.push(() => ro.disconnect());
  }

  /* ===================== horizontal git graph ===================== */
  const PX = 64, PL = 110, PR = 160, X = (m: number) => PL + (m - T0) * PX, LY = [60, 128, 196, 264], AY = 318, W2 = X(NOW + 1) + PR, SH = 350;
  const X0 = X(T0), XE = X(NOW + 1), SETTLE = 0.96;
  const E2 = {
    p: 0, q: 0, xP: XE, go: false, armed: false, end: false, tn: -1, cy: null as string | null, cur: null as string | null,
    ovr: null as { k: string; sticky: boolean } | null,
    paths: [] as Path[], rv: [] as RvItem[], ticks: [] as Tick[], years: [] as YearItem[], pkl: [] as PkLine[], tips: [] as Sv[],
    ph: null as unknown as Sv, phx: null as unknown as Sv, pht: null as unknown as Sv,
  };
  const CARD = { shown: null as string | null, t: 0, want: null as string | null, timer: 0 };

  (function buildE2() {
    let s = `<svg width="${W2}" height="${SH}" viewBox="0 0 ${W2} ${SH}" role="group" aria-label="Horizontal git graph of roles from ${Math.floor(T0 / 12)} to now">`;
    for (let m = T0; m <= NOW + 1; m++) {
      const yr = m % 12 === 0 || m === T0;
      s += `<line class="tick" data-x="${X(m)}" x1="${X(m)}" x2="${X(m)}" y1="${AY}" y2="${AY + (yr ? 10 : 5)}" stroke="#25362c"/>`;
      if (yr) s += `<text class="y yl" data-x="${X(m)}" data-y="${Math.floor(m / 12)}" x="${X(m) + 4}" y="${AY + 24}">${Math.floor(m / 12)}</text>`;
      else if (m % 3 === 0) s += `<text class="tl" data-x="${X(m)}" x="${X(m) + 3}" y="${AY + 22}">${MON[m % 12]}</text>`;
    }
    s += `<line x1="${PL}" x2="${X(NOW + 1)}" y1="${AY}" y2="${AY}" stroke="#25362c"/><text class="y yl nw" data-x="${XE}" data-y="now" x="${XE - 28}" y="${AY + 24}">now</text>`;
    const xe = (r: RoleModel) => (r.e == null ? XE : X(r.e + 1));
    for (const r of roles) {
      const y = LY[r.lane], c = COL[r.lane], xs = X(r.s), x1 = xe(r);
      if (r.lane === 0) s += `<path class="br" data-x0="${xs}" data-x1="${x1}" d="M${xs},${y} H${x1}" stroke="${c}" stroke-width="2" fill="none"/>`;
      else {
        let d = `M${xs - 30},${LY[0]} C${xs - 12},${LY[0]} ${xs - 18},${y} ${xs},${y} H${r.e == null ? x1 : x1 - 30}`;
        if (r.e != null) d += ` C${x1 - 12},${y} ${x1 - 18},${LY[0]} ${x1},${LY[0]}`;
        s += `<path class="br" data-x0="${xs - 30}" data-x1="${x1}" d="${d}" stroke="${c}" stroke-width="2" fill="none"/>`;
      }
      const lab = r.short || r.org, dl = `${r.role} ${DOT} ${r.e == null ? 'since ' + ymLabel(r.s) : ymLabel(r.s) + ' - ' + ymLabel(r.e)}`;
      s += `<g class="nd gv" data-x="${xs}" tabindex="-1" role="button" data-k="${r.id}" aria-label="${esc(`${r.org}, ${r.role}, ${r.date}`)}"><circle cx="${xs}" cy="${y}" r="16" fill="transparent"/><circle class="rg" cx="${xs}" cy="${y}" r="6" stroke="${c}"/><circle class="dot" cx="${xs}" cy="${y}" r="6" fill="#090c0a" stroke="${c}" stroke-width="2.5"/>` +
        `<text class="o ty" data-full="${esc(lab)}" x="${xs + 12}" y="${y - 20}">${esc(lab)}</text><text class="ty" data-full="${esc(dl)}" x="${xs + 12}" y="${y - 7}">${esc(dl)}</text></g>`;
      if (r.e != null) s += `<circle class="mgd gv" data-x="${x1}" cx="${x1}" cy="${LY[0]}" r="4.5" fill="${c}"/><text class="mgt gv ty" data-x="${x1}" data-full="merged ${DOT} exit 0" x="${x1 + 9}" y="${LY[0] - 9}">merged ${DOT} exit 0</text>`;
      if (r.e == null) s += `<g class="tip gv" data-x="${x1}"><circle class="rg" cx="${x1}" cy="${y}" r="4" stroke="${c}"/><circle cx="${x1}" cy="${y}" r="3.2" fill="${c}"/></g>`;
      if (r.e == null && r.lane) s += `<text class="gv hd" data-x="${x1}" x="${x1 + 8}" y="${y + 4}">HEAD</text>`;
      r.stints.forEach((st, i) => {
        const sx = X(st.s) + (i === 0 ? 20 : 0);
        s += `<g class="nd gv" data-x="${sx}" tabindex="-1" role="button" data-k="${r.id}:${i}" aria-label="${esc(`${st.name}, ${st.date}`)}"><circle cx="${sx}" cy="${y}" r="14" fill="transparent"/><circle class="rg" cx="${sx}" cy="${y}" r="3.8" stroke="${c}"/><circle class="dot" cx="${sx}" cy="${y}" r="3.8" fill="#090c0a" stroke="${c}" stroke-width="2"/><text class="ty" data-full="${esc(st.tiny)}" x="${sx - (i === 0 ? 8 : 4)}" y="${y + 20}">${esc(st.tiny)}</text></g>`;
      });
    }
    const main = roles.find((r) => r.lane === 0) ?? roles[0];
    s += `<text class="gv" data-x="${X(main.s) - 4}" x="${X(main.s) - 4}" y="${LY[0] + 30}" style="font-size:10px">main</text>`;
    /* light packets on the lines of ongoing roles: positions are written by the single rAF loop below */
    s += '<g class="pks" aria-hidden="true">';
    for (const r of roles) {
      if (r.e != null) continue;
      const span = XE - (X(r.s) + 6), n = Math.max(2, Math.round(span / 170));
      for (let j = 0; j < n; j++) s += `<circle class="pk" data-l="${r.id}" cx="0" cy="0" r="2.5" visibility="hidden"/>`;
    }
    s += '</g>';
    /* playhead (HEAD): a glowing vertical line on the time axis, moved by scroll */
    s += `<g class="ph pre" id="ph" aria-hidden="true"><line class="phg" x1="0" x2="0" y1="16" y2="${AY + 8}"/><line class="phg2" x1="0" x2="0" y1="16" y2="${AY + 8}"/><line class="phc" x1="0" x2="0" y1="16" y2="${AY + 8}"/><rect class="pht" x="-1" y="0" width="38" height="16" rx="2"/><text class="phx" x="5" y="12" data-full="HEAD">HEAD</text></g>`;
    s += '</svg>';
    ht2.innerHTML = s;
    ht2.style.width = W2 + 'px';
    ht2.style.height = SH + 'px';
    const NDS = qa<Sv>('.nd', ht2);
    for (const n of NDS) {
      const go = (sticky: boolean) => {
        if (!motionOn) sticky = true;
        E2.ovr = { k: n.dataset.k!, sticky };
        put(n.dataset.k!);
      };
      n.addEventListener('mouseenter', () => go(false));
      n.addEventListener('mouseleave', () => { if (E2.ovr && !E2.ovr.sticky) { E2.ovr = null; put(E2.cur || 'aitt'); } });
      n.addEventListener('focus', () => { resetScroll(); go(true); });
      n.addEventListener('click', () => go(true));
    }
    E2.ph = q<Sv>('#ph', ht2); E2.phx = q<Sv>('.phx', E2.ph as unknown as ParentNode); E2.pht = q<Sv>('.pht', E2.ph as unknown as ParentNode);
    E2.paths = qa<SVGPathElement>('path.br', ht2).map((el) => ({ el, x0: +el.dataset.x0!, x1: +el.dataset.x1!, L: 0, xs: null, ls: null, off: -1 }));
    E2.rv = qa<Sv>('.gv', ht2).map((el) => ({
      el, x: +el.dataset.x!, on: false, nd: el.classList.contains('nd'),
      ty: [...qa<Sv>('.ty', el), ...(el.classList.contains('ty') ? [el] : [])],
    })).sort((a, b) => a.x - b.x);
    E2.ticks = qa<Sv>('.tick, .tl', ht2).map((el) => ({ el, x: +el.dataset.x!, on: false })).sort((a, b) => a.x - b.x);
    E2.years = qa<Sv>('.yl', ht2).map((el) => ({ el, x: +el.dataset.x!, y: el.dataset.y! }));
    E2.tips = qa<Sv>('.tip', ht2);
    E2.pkl = roles.filter((r) => r.e == null).map((r) => {
      const els = qa<Sv>(`.pk[data-l="${r.id}"]`, ht2), x0 = X(r.s) + 6, span = XE - x0;
      return { x0, y: LY[r.lane], span, gap: span / els.length, els, v: els.map(() => false) };
    });
    put('aitt');
    for (const n of NDS) n.classList.toggle('sel', n.dataset.k === 'aitt');
  })();

  /* detail card: playhead decides, hover / tap overrides; a short dwell keeps two commits that are a few pixels apart from churning the card */
  function put(k: string | null) {
    clearTimeout(CARD.timer); CARD.timer = 0;
    if (k == null) return;
    for (const n of qa<Sv>('.nd', ht2)) n.classList.toggle('sel', n.dataset.k === k);
    if (CARD.shown === k && hdet.dataset.k === k) return;
    CARD.shown = k; CARD.t = performance.now();
    hdet.dataset.k = k;
    hdet.innerHTML = detail(k);
    if (motionOn) swap(hdet);
  }
  function want(k: string) {
    CARD.want = k;
    if (k === CARD.shown) { clearTimeout(CARD.timer); CARD.timer = 0; return; }
    const wait = CARD.t + 380 - performance.now();
    if (wait <= 0) put(k);
    else if (!CARD.timer) CARD.timer = window.setTimeout(() => { CARD.timer = 0; if (!E2.ovr && CARD.want) put(CARD.want); }, wait);
  }

  /* the logo slides in, the title resolves through a scramble, the date fades, the bullets type line by line */
  let swapTl: gsap.core.Timeline | null = null;
  function swap(card: El) {
    const b = card.querySelector<El>('b');
    if (!b) return;
    swapTl?.kill();
    card.setAttribute('aria-busy', 'true');
    const logo = card.querySelector<El>('.lt'), date = card.querySelector<El>('.date'), items = [...card.querySelectorAll<El>('.diff li')];
    const tw = (swapTl = gsap.timeline({ onComplete: () => { card.removeAttribute('aria-busy'); gsap.set([logo, date].filter(Boolean) as El[], { clearProps: 'opacity,transform' }); } }));
    if (logo) tw.fromTo(logo, { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.34, ease: 'power2.out' }, 0);
    const tb = scramble(b, { duration: 0.38 });
    if (tb) tw.add(tb, 0.04);
    if (date) tw.fromTo(date, { opacity: 0 }, { opacity: 1, duration: 0.22 }, 0.2);
    let t = 0.3;
    for (const li of items) {
      const d = Math.min(0.6, Math.max(0.22, (li.textContent ?? '').length * 0.0075));
      const tt = typeText(li, { duration: d });
      if (tt) tw.add(tt, t);
      t += d + 0.05;
    }
  }
  /* vertical git log: the commit's bullets type in line by line once the playhead reaches it */
  const typedRows = new WeakSet<El>();
  function rowIn(li: El) {
    if (!motionOn || typedRows.has(li)) return;
    typedRows.add(li);
    const items = [...li.querySelectorAll<El>('.diff li')];
    if (!items.length) return;
    const tw = gsap.timeline();
    let t = 0.14;
    for (const l of items) {
      const d = Math.min(0.55, Math.max(0.2, (l.textContent ?? '').length * 0.0075));
      const tt = typeText(l, { duration: d });
      if (tt) tw.add(tt, t);
      t += d + 0.04;
    }
  }

  let R2 = 0, sh2 = 0, TRAVEL = 0;
  function layout2() {
    if (view !== 'e2') return;
    const k0 = hdet.dataset.k || 'aitt';
    let mh = 0;
    hdet.style.minHeight = '';
    for (const n of qa<Sv>('.nd', ht2)) { hdet.innerHTML = detail(n.dataset.k!); mh = Math.max(mh, hdet.offsetHeight); }
    hdet.innerHTML = detail(k0); hdet.dataset.k = k0; hdet.style.minHeight = mh + 'px';
    const vw = hs.clientWidth;
    sh2 = hs.clientHeight; R2 = Math.max(0, W2 - vw);
    TRAVEL = Math.max(R2 * 0.8, (XE - X0) * 0.95);
    hw.style.height = (sh2 + TRAVEL) + 'px';
  }
  function upd2() {
    if (view !== 'e2') return;
    const rc = hw.getBoundingClientRect(), span = rc.height - sh2;
    const p = span > 0 ? Math.max(0, Math.min(1, (46 - rc.top) / span)) : 0, qq = Math.min(1, p / SETTLE);
    E2.p = p; E2.q = qq; E2.xP = X0 + qq * (XE - X0);
    hs.classList.toggle('mv', p > 0.02);
    ht2.style.transform = `translateX(${-qq * R2}px)`;
    hb.style.width = (p * 100) + '%';
    if (E2.armed) E2.ph.style.transform = `translateX(${E2.xP.toFixed(1)}px)`;
    drawE2();
    syncFocus();
  }

  /* Only nodes that are revealed and on screen are in the tab order: tabbing never reaches an invisible node. */
  function syncFocus() {
    const vw = hs.clientWidth, shift = E2.q * R2;
    for (const o of E2.rv) {
      if (!o.nd) continue;
      const x = o.x - shift;
      const ok = (!E2.armed || o.on) && x >= 6 && x <= vw - 6;
      if (ok !== o.tab) { o.tab = ok; o.el.setAttribute('tabindex', ok ? '0' : '-1'); }
    }
  }
  /* the views clip with overflow hidden, and a focus (or find-in-page) can still scroll them: the track is moved by transform only, so keep them at 0 */
  const resetScroll = () => { for (const e of [hs, hsView]) { if (e.scrollLeft) e.scrollLeft = 0; if (e.scrollTop) e.scrollTop = 0; } };
  for (const e of [hs, hsView]) { e.addEventListener('scroll', resetScroll); cleanups.push(() => e.removeEventListener('scroll', resetScroll)); }

  /* x -> drawn length of a path, from a table sampled once (paths are monotone in x), so a branch ends exactly under the playhead */
  function lut(o: Path) {
    try {
      o.L = o.el.getTotalLength();
      const n = Math.max(2, Math.ceil(o.L / 8));
      const xs = new Array<number>(n + 1), ls = new Array<number>(n + 1);
      for (let i = 0; i <= n; i++) { const l = (o.L * i) / n, pt = o.el.getPointAtLength(l); xs[i] = pt.x; ls[i] = l; }
      for (let i = 1; i <= n; i++) if (xs[i] < xs[i - 1]) xs[i] = xs[i - 1];
      o.xs = xs; o.ls = ls;
      o.el.style.strokeDasharray = `${o.L} ${o.L + 2}`;
    } catch { o.L = 0; o.xs = null; }
  }
  function lenAt(o: Path, F: number) {
    const xs = o.xs!, ls = o.ls!, n = xs.length - 1;
    if (F <= xs[0]) return 0;
    if (F >= xs[n]) return o.L;
    let lo = 0, hi = n;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xs[mid] <= F) lo = mid; else hi = mid; }
    const a = xs[lo], b = xs[hi];
    return ls[lo] + (b > a ? (F - a) / (b - a) : 0) * (ls[hi] - ls[lo]);
  }
  function showItem(o: RvItem, anim: boolean) {
    o.el.classList.remove('pre');
    if (anim) { o.el.classList.add('pop', 'rp'); o.ty.forEach((t, i) => startType(t, i * 150)); }
    else o.ty.forEach((t) => { stopType(t); t.textContent = t.getAttribute('data-full'); });
  }
  function hideItem(o: RvItem) { o.el.classList.add('pre'); o.el.classList.remove('pop', 'rp'); o.ty.forEach(stopType); }
  function setTag(end: boolean, anim: boolean) {
    const full = end ? 'HEAD -> main' : 'HEAD';
    E2.phx.setAttribute('data-full', full);
    E2.pht.setAttribute('width', String(end ? 92 : 38));
    if (anim) startType(E2.phx, 0); else { stopType(E2.phx); E2.phx.textContent = full; }
  }
  function drawE2() {
    if (view !== 'e2' || !E2.armed) return;
    const go = E2.go, F = go ? E2.xP : -1e9, anim = motionOn && LOOP.vis;
    E2.ph.classList.toggle('pre', !go);
    for (const o of E2.paths) {
      if (!o.xs && o.L === 0) lut(o);
      if (!o.xs) continue;
      const off = o.L - lenAt(o, F);
      if (Math.abs(off - o.off) > 0.05) { o.off = off; o.el.style.strokeDashoffset = String(off); }
    }
    let curK: string | null = null;
    for (const o of E2.rv) {
      const isOn = F >= o.x;
      if (isOn !== o.on) { o.on = isOn; if (isOn) showItem(o, anim); else hideItem(o); }
      if (isOn && o.nd) curK = o.el.dataset.k!;
    }
    let n = 0;
    while (n < E2.ticks.length && E2.ticks[n].x <= F) n++;
    if (n !== E2.tn) {
      const a = Math.max(0, Math.min(n, E2.tn < 0 ? 0 : E2.tn)), b = E2.tn < 0 ? E2.ticks.length : Math.max(n, E2.tn);
      for (let i = a; i < b; i++) E2.ticks[i].el.classList.toggle('on', i < n);
      E2.tn = n;
    }
    const cy = go ? String(Math.floor((T0 + (F - PL) / PX) / 12)) : null;
    if (cy !== E2.cy) { E2.cy = cy; for (const yo of E2.years) yo.el.classList.toggle('cur', yo.y === cy); }
    for (const yo of E2.years) { const yon = F >= yo.x; if (yo.on !== yon) { yo.on = yon; yo.el.classList.toggle('on', yon); } }
    const end = go && E2.q >= 1;
    if (end !== E2.end) { E2.end = end; setTag(end, anim); for (const t of E2.tips) t.classList.toggle('tp', end); }
    if (curK !== E2.cur) { E2.cur = curK; E2.ovr = null; if (curK) want(curK); }
  }
  function armE2() {
    const isOn = motionOn, svg2 = ht2.firstElementChild as Sv;
    TY.length = 0; E2.armed = isOn; E2.go = false; E2.end = false; E2.tn = -1; E2.cy = null; E2.cur = null; E2.ovr = null;
    svg2.classList.toggle('arm', isOn);
    for (const pl of E2.pkl) pl.els.forEach((el, j) => { pl.v[j] = false; el.setAttribute('visibility', 'hidden'); });
    for (const o of E2.rv) {
      o.on = false; o.el.classList.remove('pop', 'rp'); o.el.classList.toggle('pre', isOn);
      o.ty.forEach((t) => { t.textContent = t.getAttribute('data-full'); });
    }
    for (const t of E2.tips) t.classList.remove('tp');
    for (const t of E2.ticks) { t.on = false; t.el.classList.remove('on'); }
    for (const yo of E2.years) { yo.on = false; yo.el.classList.remove('on', 'cur'); }
    for (const o of E2.paths) {
      if (!o.xs && view === 'e2') lut(o);
      o.off = -1;
      if (isOn) { if (o.L) { o.el.style.strokeDasharray = `${o.L} ${o.L + 2}`; o.el.style.strokeDashoffset = String(o.L); o.off = o.L; } }
      else { o.el.style.strokeDasharray = ''; o.el.style.strokeDashoffset = ''; }
    }
    if (isOn) {
      E2.ph.classList.add('pre'); setTag(false, false);
      CARD.shown = null; hdet.dataset.k = 'avalon'; hdet.innerHTML = detail('avalon');
      for (const n of qa<Sv>('.nd.sel', ht2)) n.classList.remove('sel');
      E2.ph.style.transform = `translateX(${X0}px)`;
    } else {
      /* final state: everything drawn, playhead settled on "now", card on the most recent role */
      E2.ph.classList.remove('pre'); E2.ph.style.transform = `translateX(${XE}px)`; setTag(true, false);
      for (const t of E2.tips) t.classList.remove('tp');
      CARD.shown = null; E2.cur = null; put('aitt');
    }
    upd2(); wake();
  }

  /* ===================== one rAF loop: typed labels + packets of both graphs. Pauses when the section is offscreen, the tab is hidden or motion is off. ===================== */
  const TY: Typing[] = [];
  const LOOP = { raf: 0, vis: false };
  function stopType(el: Sv) { for (let i = TY.length - 1; i >= 0; i--) if (TY[i].el === el) TY.splice(i, 1); }
  function startType(el: Sv, delay: number) {
    stopType(el);
    const full = el.getAttribute('data-full') || '';
    el.textContent = '';
    TY.push({ el, full, t0: performance.now() + delay, dur: Math.max(220, full.length * 16), k: 0 });
    wake();
  }
  function finishTypes() { for (const t of TY) t.el.textContent = t.full; TY.length = 0; }
  const canRun = () => motionOn && LOOP.vis && !document.hidden && !dead;
  function wake() { if (!LOOP.raf && canRun()) LOOP.raf = requestAnimationFrame(tick); }
  function tick(now: number) {
    LOOP.raf = 0;
    if (!canRun()) { finishTypes(); return; }
    const t = now / 1000;
    for (let i = TY.length - 1; i >= 0; i--) {
      const o = TY[i], u = Math.min(1, Math.max(0, (now - o.t0) / o.dur)), k = Math.round(u * o.full.length);
      if (k !== o.k) { o.k = k; o.el.textContent = o.full.slice(0, k); }
      if (u >= 1) TY.splice(i, 1);
    }
    if (view === 'e2' && E2.armed && E2.go) {
      const xP = E2.xP;
      for (const pl of E2.pkl) {
        for (let j = 0; j < pl.els.length; j++) {
          const uu = (t * 78 + j * pl.gap) % pl.span, x = pl.x0 + uu, vis = x <= xP - 3, el = pl.els[j];
          if (vis !== pl.v[j]) { pl.v[j] = vis; el.setAttribute('visibility', vis ? 'visible' : 'hidden'); }
          if (vis) { el.style.transform = `translate(${x.toFixed(1)}px,${pl.y}px)`; el.style.opacity = Math.min(1, uu / 26, (pl.span - uu) / 26).toFixed(2); }
        }
      }
    } else if (view === 'e1') {
      for (const o of E1.pk) {
        const yy = o.yb - ((t * 64 + o.off) % o.span);
        o.el.style.transform = `translateY(${yy.toFixed(1)}px)`;
        if (!o.v) { o.v = true; o.el.setAttribute('visibility', 'visible'); }
      }
    }
    LOOP.raf = requestAnimationFrame(tick);
  }
  let visIo: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    visIo = new IntersectionObserver((es) => { LOOP.vis = es[es.length - 1].isIntersecting; if (LOOP.vis) wake(); else finishTypes(); });
    visIo.observe(exp);
  } else LOOP.vis = true;
  const onVis = () => { if (document.hidden) finishTypes(); else wake(); };
  document.addEventListener('visibilitychange', onVis);
  cleanups.push(() => document.removeEventListener('visibilitychange', onVis));

  /* ===================== public API ===================== */
  let goIo: IntersectionObserver | null = null;
  const api: GitGraph = {
    go() { E2.go = true; upd2(); },
    arm() {
      if (rm || dead) return;
      motionOn = true;
      for (const li of [...cl.children] as El[]) { li.classList.add('pre'); typedRows.delete(li); }
      E1.max = -1;
      graph(); onScroll(); armE2();
      /* the replay starts when the pinned graph enters; from then on the playhead is a function of scroll alone */
      goIo?.disconnect();
      const rc = hw.getBoundingClientRect();
      if (view !== 'e2' || rc.top < innerHeight * 0.68) api.go();
      else {
        goIo = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { goIo?.disconnect(); api.go(); } }, { rootMargin: '0px 0px -32% 0px' });
        goIo.observe(hw);
      }
    },
    destroy() {
      if (dead) return;
      dead = true; motionOn = false;
      for (const f of cleanups) f();
      cleanups.length = 0;
      goIo?.disconnect(); visIo?.disconnect();
      cancelAnimationFrame(LOOP.raf); cancelAnimationFrame(tk); clearTimeout(CARD.timer);
      swapTl?.kill();
      finishTypes();
      for (const li of [...cl.children] as El[]) li.classList.remove('pre');
      g.textContent = ''; ht2.textContent = ''; hdet.textContent = '';
      ht2.style.cssText = ''; hw.style.height = ''; hdet.style.minHeight = '';
      exp.dataset.view = 'e1';
      if ((window as unknown as { __exp?: unknown }).__exp === probeApi) delete (window as unknown as { __exp?: unknown }).__exp;
    },
  };

  /* test hook, only with ?e2e in the URL: where the playhead is, which role the card shows and how far each branch is drawn */
  const probeApi = {
    probe() {
      const tips = E2.paths.map((o) => {
        if (!o.L) return null;
        const d = o.L - (parseFloat(o.el.style.strokeDashoffset) || 0);
        try { return { drawn: +d.toFixed(1), tipX: +o.el.getPointAtLength(Math.max(0, d)).x.toFixed(1) }; } catch { return null; }
      });
      return {
        p: +E2.p.toFixed(3), q: +E2.q.toFixed(3), xP: +E2.xP.toFixed(1), go: E2.go, cur: E2.cur, shown: CARD.shown,
        title: hdet.querySelector('b')?.textContent ?? '', ovr: E2.ovr?.k ?? null, tips, on: E2.rv.filter((o) => o.on).length, tn: E2.tn,
      };
    },
  };
  if (/[?&]e2e/.test(location.search)) (window as unknown as { __exp?: unknown }).__exp = probeApi;

  armE2();
  sync();
  return api;
}
