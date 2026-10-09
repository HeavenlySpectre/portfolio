import type { Pipeline } from './pipeline';

/* Automatic layered layout for the case-study pipeline diagram.
   Ranks come from the longest path (left to right, or top to bottom on phones). Edges that close a loop are
   drawn as back edges around the diagram so the ranks stay acyclic. Long edges pass through invisible
   placeholder slots, so they never run through a node. Everything is plain numbers, rendered by PipelineDiagram.astro. */

export type Mode = 'h' | 'v';

export interface LaidNode { id: string; label: string; note: string; lines: string[]; rank: number; x: number; y: number; w: number; h: number; arrive: number }
export interface LaidEdge { from: string; to: string; back: boolean; d: string; t0: number; t1: number }
export interface Layout { mode: Mode; width: number; height: number; ranks: number; nodes: LaidNode[]; edges: LaidEdge[] }

/* 1 SVG unit is 1 CSS px: the diagram is never scaled down, so a 12px label is 12px on screen.
   PipelineDiagram picks the layout that fits the box (single row when wide, top to bottom otherwise). */
export const FONT = 12;
const NODE_W = 108;
export const LINE_H = 15;
const WRAP = 14;

export function wrapLabel(label: string, max = WRAP): string[] {
  const lines: string[] = [];
  let cur = '';
  for (const w of label.split(/\s+/).filter(Boolean)) {
    if (cur && (cur + ' ' + w).length > max) { lines.push(cur); cur = w; } else cur = cur ? cur + ' ' + w : w;
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [label];
}

/** Longest-path ranks. `back` holds the keys `a->b` of edges that point back to an ancestor (loops). */
export function rankPipeline(p: Pipeline): { rank: Record<string, number>; back: Set<string>; topo: string[] } {
  const ids = p.nodes.map((n) => n.id);
  const known = new Set(ids);
  const edges = p.edges.filter((e) => known.has(e.from) && known.has(e.to));
  const out = new Map<string, string[]>(ids.map((i) => [i, []]));
  const indeg = new Map<string, number>(ids.map((i) => [i, 0]));
  for (const e of edges) { out.get(e.from)!.push(e.to); indeg.set(e.to, indeg.get(e.to)! + 1); }
  const state = new Map<string, 0 | 1 | 2>(ids.map((i) => [i, 0]));
  const back = new Set<string>();
  const post: string[] = [];
  const visit = (u: string) => {
    state.set(u, 1);
    for (const v of out.get(u)!) {
      const s = state.get(v);
      if (s === 1) back.add(`${u}->${v}`);
      else if (s === 0) visit(v);
    }
    state.set(u, 2);
    post.push(u);
  };
  for (const i of ids) if (indeg.get(i) === 0 && state.get(i) === 0) visit(i);
  for (const i of ids) if (state.get(i) === 0) visit(i);
  const topo = post.reverse();
  const rank: Record<string, number> = Object.fromEntries(ids.map((i) => [i, 0]));
  for (const u of topo) for (const v of out.get(u)!) if (!back.has(`${u}->${v}`)) rank[v] = Math.max(rank[v], rank[u] + 1);
  return { rank, back, topo };
}

interface Item { key: string; rank: number; id?: string; idx: number; size: number; pos: number; c: number }

export function layoutPipeline(p: Pipeline, mode: Mode): Layout {
  const known = new Set(p.nodes.map((n) => n.id));
  const edges = p.edges.filter((e) => known.has(e.from) && known.has(e.to));
  const { rank, back } = rankPipeline(p);
  const R = Math.max(0, ...Object.values(rank));
  const lines = new Map(p.nodes.map((n) => [n.id, wrapLabel(n.label)]));
  const maxLines = Math.max(1, ...[...lines.values()].map((l) => l.length));
  const NODE_H = 14 + LINE_H * maxLines;
  const H = mode === 'h';
  const MAIN = H ? NODE_W : NODE_H;           // node size along the rank axis
  const CROSS = H ? NODE_H : NODE_W;          // node size across it
  const GAP = H ? 28 : 36;                    // space between ranks (room for the edge channels)
  const CGAP = H ? 20 : 10;                   // space between slots in one rank
  const DUMMY = H ? 10 : 8;
  const PAD = H ? 6 : 4;
  const STEP = H ? 4 : 5;

  // items: real nodes plus one placeholder per rank crossed by a long forward edge
  const items: Item[] = p.nodes.map((n, i) => ({ key: n.id, rank: rank[n.id], id: n.id, idx: i, size: CROSS, pos: 0, c: 0 }));
  const byKey = new Map(items.map((i) => [i.key, i]));
  const links: [Item, Item][] = []; // between consecutive ranks
  const chains: { edge: (typeof edges)[number]; i: number; chain: Item[]; back: boolean }[] = [];
  edges.forEach((e, i) => {
    const isBack = back.has(`${e.from}->${e.to}`);
    const a = byKey.get(e.from)!, b = byKey.get(e.to)!;
    if (isBack) { chains.push({ edge: e, i, chain: [a, b], back: true }); return; }
    const chain = [a];
    for (let r = rank[e.from] + 1; r < rank[e.to]; r++) {
      const d: Item = { key: `~${i}:${r}`, rank: r, idx: a.idx, size: DUMMY, pos: 0, c: 0 };
      items.push(d); byKey.set(d.key, d); chain.push(d);
    }
    chain.push(b);
    for (let k = 0; k + 1 < chain.length; k++) links.push([chain[k], chain[k + 1]]);
    chains.push({ edge: e, i, chain, back: false });
  });

  const layers: Item[][] = Array.from({ length: R + 1 }, () => []);
  for (const it of items) layers[it.rank].push(it);
  layers.forEach((l) => l.sort((a, b) => a.idx - b.idx || (a.id ? -1 : 1)));

  const preds = new Map<Item, Item[]>(), succs = new Map<Item, Item[]>();
  for (const it of items) { preds.set(it, []); succs.set(it, []); }
  for (const [a, b] of links) { succs.get(a)!.push(b); preds.get(b)!.push(a); }

  // crossing reduction: barycenter sweeps down and up
  const slot = new Map<Item, number>();
  const reindex = () => layers.forEach((l) => l.forEach((it, i) => slot.set(it, i)));
  reindex();
  const sweep = (l: Item[], nb: Map<Item, Item[]>) => {
    const bary = new Map<Item, number>();
    for (const it of l) { const ns = nb.get(it)!; bary.set(it, ns.length ? ns.reduce((s, n) => s + slot.get(n)!, 0) / ns.length : slot.get(it)!); }
    l.sort((a, b) => bary.get(a)! - bary.get(b)! || slot.get(a)! - slot.get(b)!);
    reindex();
  };
  for (let n = 0; n < 6; n++) {
    for (let r = 1; r <= R; r++) sweep(layers[r], preds);
    for (let r = R - 1; r >= 0; r--) sweep(layers[r], succs);
  }

  // cross-axis coordinates: pack each rank, then pull items toward their neighbours without breaking order
  for (const l of layers) {
    let c = 0;
    l.forEach((it, i) => { it.c = c + it.size / 2; c += it.size + CGAP; if (i === l.length - 1) c -= CGAP; });
    const mid = c / 2;
    l.forEach((it) => { it.c -= mid; });
  }
  const settle = (l: Item[], nb: Map<Item, Item[]>) => {
    const want = l.map((it) => { const ns = nb.get(it)!; return ns.length ? ns.reduce((s, n) => s + n.c, 0) / ns.length : it.c; });
    const sep = (a: Item, b: Item) => (a.size + b.size) / 2 + CGAP;
    const f = want.slice(), g = want.slice();
    for (let i = 1; i < l.length; i++) f[i] = Math.max(f[i], f[i - 1] + sep(l[i - 1], l[i]));
    for (let i = l.length - 2; i >= 0; i--) g[i] = Math.min(g[i], g[i + 1] - sep(l[i], l[i + 1]));
    l.forEach((it, i) => { it.c = (f[i] + g[i]) / 2; });
  };
  for (let n = 0; n < 4; n++) {
    for (let r = 1; r <= R; r++) settle(layers[r], preds);
    for (let r = R - 1; r >= 0; r--) settle(layers[r], succs);
  }
  let lo = Infinity, hi = -Infinity;
  for (const it of items) { lo = Math.min(lo, it.c - it.size / 2); hi = Math.max(hi, it.c + it.size / 2); }

  // back edges run around the outside, nested by span
  const backs = chains.filter((c) => c.back).sort((a, b) => Math.abs(rank[a.edge.from] - rank[a.edge.to]) - Math.abs(rank[b.edge.from] - rank[b.edge.to]));
  const lane = new Map<number, number>();
  backs.forEach((b, k) => lane.set(b.i, k));
  const LANE0 = H ? 16 : 12, LANE_STEP = H ? 9 : 7;
  const crossMin = lo - PAD;
  const crossMax = hi + (backs.length ? LANE0 + LANE_STEP * (backs.length - 1) + PAD : PAD);
  const shiftC = -crossMin;

  // rank-axis coordinates
  const mainOf = (r: number) => PAD + GAP / 2 + MAIN / 2 + r * (MAIN + GAP);
  const gapMid = (g: number) => mainOf(g) + MAIN / 2 + GAP / 2; // between rank g and g+1 (g = -1 is the left margin)
  const width0 = mainOf(R) + MAIN / 2 + GAP / 2 + PAD;

  // channel offsets: each vertical run in a gap gets its own lane
  interface Seg { k: string; gap: number; a: number; b: number }
  const segs: Seg[] = [];
  for (const ch of chains) {
    if (ch.back) {
      const { from, to } = ch.edge;
      const lc = hi + LANE0 + LANE_STEP * lane.get(ch.i)!;
      segs.push({ k: `${ch.i}:s`, gap: rank[from], a: byKey.get(from)!.c, b: lc });
      segs.push({ k: `${ch.i}:t`, gap: rank[to] - 1, a: lc, b: byKey.get(to)!.c });
    } else {
      for (let k = 0; k + 1 < ch.chain.length; k++) {
        const a = ch.chain[k], b = ch.chain[k + 1];
        if (Math.abs(a.c - b.c) > 0.5) segs.push({ k: `${ch.i}:${k}`, gap: a.rank, a: a.c, b: b.c });
      }
    }
  }
  const off = new Map<string, number>();
  const byGap = new Map<number, Seg[]>();
  for (const s of segs) { if (!byGap.has(s.gap)) byGap.set(s.gap, []); byGap.get(s.gap)!.push(s); }
  for (const list of byGap.values()) {
    list.sort((x, y) => (x.a + x.b) - (y.a + y.b) || x.k.localeCompare(y.k));
    list.forEach((s, i) => off.set(s.k, (i - (list.length - 1) / 2) * STEP));
  }

  // route every edge as an orthogonal polyline in (main, cross) space
  const toXY = (m: number, c: number): [number, number] => (H ? [m, c + shiftC] : [c + shiftC, m]);
  const fmt = (pts: [number, number][]) => 'M' + pts.map(([m, c]) => toXY(m, c).map((v) => +v.toFixed(1)).join(',')).join(' L');
  const route = new Map<number, string>();
  for (const ch of chains) {
    const pts: [number, number][] = [];
    if (ch.back) {
      const { from, to } = ch.edge;
      const a = byKey.get(from)!, b = byKey.get(to)!;
      const lc = hi + LANE0 + LANE_STEP * lane.get(ch.i)!;
      const gs = gapMid(rank[from]) + off.get(`${ch.i}:s`)!, gt = gapMid(rank[to] - 1) + off.get(`${ch.i}:t`)!;
      pts.push([mainOf(rank[from]) + MAIN / 2, a.c], [gs, a.c], [gs, lc], [gt, lc], [gt, b.c], [mainOf(rank[to]) - MAIN / 2, b.c]);
    } else {
      const c0 = ch.chain;
      pts.push([mainOf(c0[0].rank) + MAIN / 2, c0[0].c]);
      for (let k = 0; k + 1 < c0.length; k++) {
        const a = c0[k], b = c0[k + 1];
        const g = gapMid(a.rank) + (off.get(`${ch.i}:${k}`) ?? 0);
        if (k > 0) pts.push([mainOf(a.rank), a.c]);
        pts.push([g, a.c], [g, b.c]);
      }
      const last = c0[c0.length - 1];
      pts.push([mainOf(last.rank) - MAIN / 2, last.c]);
    }
    route.set(ch.i, fmt(pts));
  }

  // timing: edges leaving rank r run in slot r
  const S = 0.9 / Math.max(1, R);
  const t0Of = (r: number) => 0.03 + r * S;
  const t1Of = (r: number) => t0Of(r) + S * 0.88;
  const laidEdges: LaidEdge[] = edges.map((e, i) => {
    const isBack = back.has(`${e.from}->${e.to}`);
    const t0 = t0Of(rank[e.from]);
    const t1 = isBack ? Math.min(0.99, t1Of(rank[e.from]) + S * 0.5) : t1Of(rank[e.to] - 1);
    return { from: e.from, to: e.to, back: isBack, d: route.get(i)!, t0, t1 };
  });
  const arrive = new Map<string, number>(p.nodes.map((n) => [n.id, rank[n.id] === 0 ? 0.0005 : 0]));
  for (const e of laidEdges) if (!e.back) arrive.set(e.to, Math.max(arrive.get(e.to)!, e.t1));

  const nodes: LaidNode[] = p.nodes.map((n) => {
    const it = byKey.get(n.id)!;
    const [x, y] = toXY(mainOf(it.rank), it.c);
    return { id: n.id, label: n.label, note: n.note, lines: lines.get(n.id)!, rank: it.rank, x, y, w: NODE_W, h: NODE_H, arrive: arrive.get(n.id)! };
  });
  const cross = crossMax + shiftC;
  return { mode, width: H ? width0 : cross, height: H ? cross : width0, ranks: R + 1, nodes, edges: laidEdges };
}
