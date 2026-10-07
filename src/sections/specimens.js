const NS = 'http://www.w3.org/2000/svg';

function el(name, attrs = {}, parent) {
  const n = document.createElementNS(NS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

function mulberry(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Typographic "specimens": small SVG figures per project, built only from steps/technologies
 * named in the project docs. `.draw` paths animate via stroke-dashoffset, `.fade` items fade in.
 */
function diagram(svg, { nodes, edges, caption, capY = 284 }) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const g = el('g', {}, svg);
  edges.forEach(([a, b, accent]) => {
    const A = byId[a], B = byId[b];
    const gap = Math.abs(B.x - A.x) - (A.w + B.w) / 2;
    let d, ax, ay, bx, by, dir;
    if (gap > 4) {
      const s = B.x > A.x ? 1 : -1;
      ax = A.x + s * A.w / 2; ay = A.y; bx = B.x - s * B.w / 2; by = B.y; dir = [s, 0];
      const mx = (ax + bx) / 2;
      d = `M${ax} ${ay}C${mx} ${ay} ${mx} ${by} ${bx} ${by}`;
    } else {
      const s = B.y > A.y ? 1 : -1;
      ax = A.x; ay = A.y + s * A.h / 2 + (s > 0 && A.sub ? 24 : 0); bx = B.x; by = B.y - s * B.h / 2; dir = [0, s];
      const my = (ay + by) / 2;
      d = `M${ax} ${ay}C${ax} ${my} ${bx} ${my} ${bx} ${by}`;
    }
    el('path', { d, class: 'spec__edge draw' + (accent ? ' spec__edge--accent' : '') }, g);
    // arrow head
    const hx = bx, hy = by, k = 5;
    const arrow = dir[0] !== 0
      ? `M${hx - dir[0] * k} ${hy - k}L${hx} ${hy}L${hx - dir[0] * k} ${hy + k}`
      : `M${hx - k} ${hy - dir[1] * k}L${hx} ${hy}L${hx + k} ${hy - dir[1] * k}`;
    el('path', { d: arrow, class: 'spec__edge draw' + (accent ? ' spec__edge--accent' : '') }, g);
  });
  nodes.forEach((n) => {
    const x0 = n.x - n.w / 2, x1 = n.x + n.w / 2, y0 = n.y - n.h / 2, y1 = n.y + n.h / 2;
    el('path', { d: `M${x0} ${y0}H${x1}V${y1}H${x0}Z`, class: 'spec__node draw' }, g);
    const t = el('text', { x: n.x, y: n.y, class: 'spec__txt fade' }, g);
    t.textContent = n.label;
    if (n.sub) {
      const s = el('text', { x: n.x, y: n.y + n.h / 2 + 14, class: 'spec__sub fade' }, g);
      s.textContent = n.sub;
    }
  });
  const c = el('text', { x: 16, y: capY, class: 'spec__cap fade' }, svg);
  c.textContent = caption;
}

function regression(svg, v = false) {
  const rnd = mulberry(13689);
  const W = v ? 280 : 520;
  const x0 = v ? 36 : 44, x1 = W - (v ? 16 : 24), yb = 250, yt = 40;
  const f = (u) => 150 - Math.sin(u * Math.PI * 2.2) * 52 + (u - 0.5) * 36;
  const X = (u) => x0 + u * (x1 - x0);
  const g = el('g', {}, svg);
  el('path', { d: `M${x0} ${yt}V${yb}H${x1}`, class: 'spec__edge draw' }, g);
  // piecewise splits
  [0.34, 0.68].forEach((u) => el('line', { x1: X(u), x2: X(u), y1: yt, y2: yb, class: 'spec__split fade' }, g));
  // uncertainty band
  const N = 90;
  const top = [], bot = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const sp = 9 + 14 * Math.abs(Math.sin(u * Math.PI * 3)) * 0.6 + 8 * Math.pow(Math.abs(u - 0.5) * 2, 3);
    top.push(`${X(u).toFixed(1)} ${(f(u) - sp).toFixed(1)}`);
    bot.push(`${X(u).toFixed(1)} ${(f(u) + sp).toFixed(1)}`);
  }
  el('path', { d: `M${top.join('L')}L${bot.reverse().join('L')}Z`, class: 'spec__band fade' }, g);
  // scatter
  for (let i = 0; i < 46; i++) {
    const u = (i + rnd() * 0.8) / 46;
    const y = f(u) + (rnd() - 0.5) * 34;
    el('circle', { cx: X(u).toFixed(1), cy: y.toFixed(1), r: 2.1, class: 'spec__dot fade' }, g);
  }
  // GP mean, drawn as three pieces
  [[0, 0.34], [0.34, 0.68], [0.68, 1]].forEach(([a, b]) => {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const u = a + ((b - a) * i) / 40; pts.push(`${X(u).toFixed(1)} ${f(u).toFixed(1)}`); }
    el('path', { d: 'M' + pts.join('L'), class: 'spec__curve draw' }, g);
  });
  const c = el('text', { x: v ? 12 : 16, y: 284, class: 'spec__cap fade' }, svg);
  c.textContent = 'PIECEWISE GAUSSIAN PROCESS REGRESSION';
  const c2 = el('text', { x: W - (v ? 12 : 24), y: v ? 24 : 30, class: 'spec__cap fade', 'text-anchor': 'end' }, svg);
  c2.textContent = 'GP MEAN + UNCERTAINTY';
}

const SPECS = {
  mj: (svg) => diagram(svg, {
    nodes: [
      { id: 'cv', label: 'CV REVIEW', x: 92, y: 92, w: 120, h: 40 },
      { id: 'iv', label: 'INTERVIEW', x: 260, y: 150, w: 120, h: 40 },
      { id: 'ev', label: 'EVALUATION', x: 428, y: 208, w: 120, h: 40, sub: 'AI-ASSISTED' },
    ],
    edges: [['cv', 'iv'], ['iv', 'ev', true]],
    caption: '19MJ / CANDIDATE FLOW',
  }),
  lake: (svg) => diagram(svg, {
    nodes: [
      { id: 'k', label: 'KAFKA', x: 82, y: 88, w: 100, h: 40, sub: 'INGESTION' },
      { id: 's', label: 'SPARK', x: 260, y: 88, w: 100, h: 40, sub: 'STREAMING' },
      { id: 'm', label: 'MINIO', x: 438, y: 88, w: 100, h: 40, sub: 'MEDALLION LAYERS' },
      { id: 'f', label: 'MLFLOW', x: 438, y: 208, w: 100, h: 40, sub: 'TRACKING / REGISTRY' },
      { id: 'a', label: 'FASTAPI', x: 260, y: 208, w: 100, h: 40, sub: 'INFERENCE' },
    ],
    edges: [['k', 's'], ['s', 'm'], ['m', 'f'], ['f', 'a', true]],
    caption: 'LAKEHOUSE PIPELINE',
  }),
  gp: regression,
  rag: (svg) => diagram(svg, {
    nodes: [
      { id: 'q', label: 'QUERY', x: 56, y: 150, w: 76, h: 38 },
      { id: 'b', label: 'BM25', x: 188, y: 84, w: 84, h: 38 },
      { id: 'v', label: 'VECTOR', x: 188, y: 216, w: 84, h: 38 },
      { id: 'r', label: 'RERANK', x: 318, y: 150, w: 84, h: 38 },
      { id: 'l', label: 'LLM', x: 452, y: 150, w: 76, h: 38, sub: 'LOCAL INFERENCE' },
    ],
    edges: [['q', 'b'], ['q', 'v'], ['b', 'r'], ['v', 'r'], ['r', 'l', true]],
    caption: 'HYBRID RETRIEVAL',
  }),
  exec: (svg) => diagram(svg, {
    nodes: [
      { id: 'q', label: 'QUESTION', x: 62, y: 140, w: 100, h: 40, sub: 'BAHASA INDONESIA' },
      { id: 's', label: 'SQL', x: 194, y: 140, w: 92, h: 40, sub: 'READ-ONLY' },
      { id: 'c', label: 'CLICKHOUSE', x: 326, y: 140, w: 100, h: 40 },
      { id: 't', label: 'TELEGRAM', x: 458, y: 140, w: 92, h: 40, sub: 'BOT API' },
    ],
    edges: [['q', 's'], ['s', 'c'], ['c', 't', true]],
    caption: 'TEXT-TO-SQL FLOW',
  }),
};

// Vertical variants for narrow screens (< 600px): same nodes and edges, stacked top to bottom in a
// narrow viewBox so the SVG renders near 1:1 and the text stays legible.
const VW = 280;
const col = (labels, x = 140, y0 = 40, step = 90, w = 150, h = 38) =>
  labels.map(([id, label, sub], k) => ({ id, label, sub, x, y: y0 + k * step, w, h }));
const SPECS_V = {
  mj: { H: 300, build: (svg) => diagram(svg, {
    nodes: col([['cv', 'CV REVIEW'], ['iv', 'INTERVIEW'], ['ev', 'EVALUATION', 'AI-ASSISTED']], 140, 44, 90),
    edges: [['cv', 'iv'], ['iv', 'ev', true]], caption: '19MJ / CANDIDATE FLOW', capY: 288,
  }) },
  lake: { H: 460, build: (svg) => diagram(svg, {
    nodes: col([['k', 'KAFKA', 'INGESTION'], ['s', 'SPARK', 'STREAMING'], ['m', 'MINIO', 'MEDALLION LAYERS'], ['f', 'MLFLOW', 'TRACKING / REGISTRY'], ['a', 'FASTAPI', 'INFERENCE']]),
    edges: [['k', 's'], ['s', 'm'], ['m', 'f'], ['f', 'a', true]], caption: 'LAKEHOUSE PIPELINE', capY: 448,
  }) },
  gp: { H: 300, build: (svg) => regression(svg, true) },
  rag: { H: 360, build: (svg) => diagram(svg, {
    nodes: [
      { id: 'q', label: 'QUERY', x: 140, y: 40, w: 110, h: 38 },
      { id: 'b', label: 'BM25', x: 72, y: 124, w: 112, h: 38 },
      { id: 'v', label: 'VECTOR', x: 208, y: 124, w: 112, h: 38 },
      { id: 'r', label: 'RERANK', x: 140, y: 208, w: 110, h: 38 },
      { id: 'l', label: 'LLM', x: 140, y: 292, w: 110, h: 38, sub: 'LOCAL INFERENCE' },
    ],
    edges: [['q', 'b'], ['q', 'v'], ['b', 'r'], ['v', 'r'], ['r', 'l', true]], caption: 'HYBRID RETRIEVAL', capY: 348,
  }) },
  exec: { H: 390, build: (svg) => diagram(svg, {
    nodes: col([['q', 'QUESTION', 'BAHASA INDONESIA'], ['s', 'SQL', 'READ-ONLY'], ['c', 'CLICKHOUSE'], ['t', 'TELEGRAM', 'BOT API']]),
    edges: [['q', 's'], ['s', 'c'], ['c', 't', true]], caption: 'TEXT-TO-SQL FLOW', capY: 378,
  }) },
};

/** Builds a wide (default) and a vertical (< 600px) variant; CSS toggles which one is shown. */
export function buildSpecimen(host) {
  const key = host.getAttribute('data-specimen');
  const build = SPECS[key];
  if (!build) return null;
  const h = el('svg', { viewBox: '0 0 520 300', preserveAspectRatio: 'xMidYMid meet', focusable: 'false', class: 'spec--h' });
  build(h);
  host.appendChild(h);
  const v = SPECS_V[key];
  if (v) {
    const sv = el('svg', { viewBox: `0 0 ${VW} ${v.H}`, preserveAspectRatio: 'xMidYMid meet', focusable: 'false', class: 'spec--v' });
    v.build(sv);
    host.appendChild(sv);
  }
  return host;
}
