// Runtime-generated project covers (2D canvas), Kernel chrome. Each one draws the project's REAL mechanism, keyed by project slug.
export const COVER_W = 1024, COVER_H = 640;

export interface Theme {
  bg: string; card: string; fg: string; dim: string; faint: string; line: string; accent: string; danger: string; paper: string;
  trail: string; edge: string; bloom: number; pulseK: number;
  fMono: string; fDisplay: string; fBody: string;
  contactWeight: number;
  contact: { l1: string; l2: string; sub: string; size: number };
  fontLoads: string[];
}
export interface CoverItem { slug: string; fact: string; isContact?: boolean }
type Rect = { x: number; y: number; w: number; h: number };
type Ctx = CanvasRenderingContext2D;
type TxtOpts = { font: string; color: string; align?: CanvasTextAlign; base?: CanvasTextBaseline; alpha?: number };

const mix = (a: string, b: string, t: number) => {
  const x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16), ch = (s: number) => Math.round(((x >> s) & 255) + (((y >> s) & 255) - ((x >> s) & 255)) * t);
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
};
const FONT = '"IBM Plex Mono", ui-monospace, monospace';

/** Canvas-side tokens: the site palette (tokens.css, terminal green) in Kernel form. */
export const THEME: Theme = {
  bg: '#090c0a', card: '#0d110e', fg: '#d4ecdc', dim: '#7fa28d',
  faint: mix('#090c0a', '#7fa28d', 0.18), line: mix('#090c0a', '#7fa28d', 0.36),
  accent: '#4ade80', trail: '#4ade80', edge: '#4ade80', danger: '#ff6a5c', paper: '#d4ecdc', bloom: 0.42, pulseK: 4.5,
  fMono: FONT, fDisplay: FONT, fBody: FONT, contactWeight: 600,
  contact: { l1: '$ get in', l2: '  touch', sub: 'kevinanugerah.dev', size: 96 },
  fontLoads: ['600 24px "IBM Plex Mono"', '500 24px "IBM Plex Mono"', '400 24px "IBM Plex Mono"', '700 24px "IBM Plex Mono"'],
};

/** Name shown in the cover's title bar. */
const FILE: Record<string, string> = {
  'hybrid-rag': 'retriever.py', 'executive-data-assistant': 'guard.sql', 'material-property-prediction': 'gpr_fit.ipynb',
  'taskflow-devsecops': 'ci.yml', '19mj-career-platform': 'review.json', 'realtime-lakehouse': 'pipeline.sh', 'onchain-todo-dapp': 'Todo.sol', contact: 'contact.sh',
};

const rng = (s: number) => () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const pad2 = (n: number) => String(n).padStart(2, '0');

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function txt(c: Ctx, s: string, x: number, y: number, o: TxtOpts) {
  c.save();
  c.font = o.font; c.fillStyle = o.color; c.textAlign = o.align || 'left'; c.textBaseline = o.base || 'alphabetic';
  if (o.alpha != null) c.globalAlpha = o.alpha;
  c.fillText(s, x, y);
  c.restore();
}
function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}
function check(c: Ctx, x: number, y: number, s: number, color: string, lw = 3) {
  c.save(); c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x, y + s * 0.5); c.lineTo(x + s * 0.38, y + s * 0.85); c.lineTo(x + s, y + s * 0.15); c.stroke(); c.restore();
}
function cross(c: Ctx, x: number, y: number, s: number, color: string, lw = 3) {
  c.save(); c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + s, y + s); c.moveTo(x + s, y); c.lineTo(x, y + s); c.stroke(); c.restore();
}

// ---------------------------------------------------------------- bodies
const BODY: Record<string, (c: Ctx, r: Rect, T: Theme) => void> = {
  // RAG: two ranked lists (BM25, vector) merge into a fused ranking
  'hybrid-rag'(c, r, T) {
    const { x, y, w, h } = r, m = T.fMono;
    const lw = w * 0.34, rx = x + w * 0.62, rw = w * 0.38;
    const bm: [string, number][] = [['d07', 0.91], ['d02', 0.74], ['d11', 0.62], ['d05', 0.4]];
    const ve: [string, number][] = [['d02', 0.88], ['d07', 0.79], ['d09', 0.55], ['d11', 0.41]];
    const fused: [string, number][] = [['d07', 0.0328], ['d02', 0.0325], ['d11', 0.0298], ['d09', 0.0156], ['d05', 0.0151]];
    const rowH = 44;
    const list = (title: string, rows: [string, number][], y0: number) => {
      txt(c, title, x, y0, { font: `600 22px ${m}`, color: T.dim });
      return rows.map(([id, s], i) => {
        const yy = y0 + 18 + i * rowH;
        txt(c, id, x, yy + 28, { font: `500 24px ${m}`, color: T.fg });
        const bw = (lw - 130) * s;
        c.fillStyle = T.faint; rr(c, x + 70, yy + 8, lw - 130, 22, 4); c.fill();
        c.fillStyle = rgba(T.fg, 0.55); rr(c, x + 70, yy + 8, bw, 22, 4); c.fill();
        txt(c, s.toFixed(2), x + lw, yy + 28, { font: `500 22px ${m}`, color: T.dim, align: 'right' });
        return { id, ex: x + lw + 8, ey: yy + 19 };
      });
    };
    const A = list('BM25 · lexical', bm, y + 20);
    const B = list('DENSE · vector', ve, y + 20 + 4 * rowH + 56);
    // fused list
    txt(c, 'RRF + rerank', rx, y + 20, { font: `600 22px ${m}`, color: T.accent });
    const fy = (i: number) => y + 38 + i * 62;
    const P = fused.map(([id, s], i) => {
      const yy = fy(i);
      const top = i < 3;
      c.fillStyle = top ? T.accent : T.faint; rr(c, rx + 66, yy + 6, (rw - 66) * (0.38 + (s / 0.033) * 0.62), 30, 5); c.fill();
      txt(c, id, rx, yy + 31, { font: `600 26px ${m}`, color: top ? T.fg : T.dim });
      txt(c, String(i + 1), rx + 76, yy + 30, { font: `700 22px ${m}`, color: top ? T.bg : T.dim });
      return { id, sx: rx - 6, sy: yy + 21, top };
    });
    // fusion curves
    [...A, ...B].forEach((p) => {
      const q = P.find((z) => z.id === p.id)!;
      c.strokeStyle = q.top ? rgba(T.accent, 0.7) : rgba(T.fg, 0.16); c.lineWidth = q.top ? 2.5 : 1.5;
      c.beginPath(); c.moveTo(p.ex, p.ey);
      c.bezierCurveTo(p.ex + 60, p.ey, q.sx - 60, q.sy, q.sx, q.sy); c.stroke();
    });
    txt(c, 'query: "kebijakan cuti tahunan?"', x, y + h - 6, { font: `400 22px ${m}`, color: T.dim });
  },

  // Text-to-SQL: question -> SQL -> result table
  'executive-data-assistant'(c, r, T) {
    const { x, y, w, h } = r, m = T.fMono;
    rr(c, x, y + 4, w, 76, 10); c.strokeStyle = T.line; c.lineWidth = 2; c.stroke();
    txt(c, 'ID', x + 22, y + 52, { font: `600 22px ${m}`, color: T.accent });
    txt(c, 'Berapa omzet tiap cabang bulan lalu?', x + 76, y + 53, { font: `500 33px ${T.fBody}`, color: T.fg });
    // arrow
    c.strokeStyle = T.accent; c.lineWidth = 3; c.beginPath(); c.moveTo(x + 40, y + 94); c.lineTo(x + 40, y + 134); c.lineTo(x + 30, y + 124); c.moveTo(x + 40, y + 134); c.lineTo(x + 50, y + 124); c.stroke();
    txt(c, 'schema-aware · read-only', x + 66, y + 122, { font: `400 21px ${m}`, color: T.dim });
    // SQL panel
    const sw = w * 0.6, sy = y + 148, sh = h - 148;
    rr(c, x, sy, sw, sh, 10); c.fillStyle = rgba(T.fg, 0.05); c.fill();
    const L = [
      [['SELECT ', 'k'], ['cabang,', 'i']],
      [['  SUM', 'k'], ['(total) ', 'i'], ['AS ', 'k'], ['omzet', 'i']],
      [['FROM ', 'k'], ['penjualan', 'i']],
      [['WHERE ', 'k'], ["bulan = '2025-09'", 's']],
      [['GROUP BY ', 'k'], ['cabang', 'i']],
      [['ORDER BY ', 'k'], ['omzet ', 'i'], ['DESC', 'k']],
    ];
    L.forEach((ln, i) => {
      let cx = x + 22; const yy = sy + 42 + i * 40;
      txt(c, String(i + 1), x + sw - 18, yy, { font: `400 18px ${m}`, color: T.faint, align: 'right' });
      ln.forEach(([s, k]) => {
        c.font = `500 25px ${m}`;
        txt(c, s, cx, yy, { font: `500 25px ${m}`, color: k === 'k' ? T.accent : k === 's' ? T.dim : T.fg });
        cx += c.measureText(s).width;
      });
    });
    // result table
    const tx = x + sw + 28, tw = w - sw - 28;
    txt(c, 'rows: 3', tx, sy + 26, { font: `600 20px ${m}`, color: T.dim });
    const rows = [['cabang', 'omzet'], ['Jakarta', '412jt'], ['Bandung', '287jt'], ['Surabaya', '254jt']];
    rows.forEach((rw, i) => {
      const yy = sy + 52 + i * 44;
      if (i === 0) { c.fillStyle = rgba(T.fg, 0.08); c.fillRect(tx, yy, tw, 38); }
      c.strokeStyle = T.line; c.lineWidth = 1; c.strokeRect(tx, yy, tw, 38);
      txt(c, rw[0], tx + 12, yy + 27, { font: `${i ? 400 : 600} 21px ${m}`, color: i ? T.fg : T.dim });
      txt(c, rw[1], tx + tw - 12, yy + 27, { font: `${i ? 500 : 600} 21px ${m}`, color: i ? T.accent : T.dim, align: 'right' });
    });
    rr(c, tx, sy + sh - 52, tw, 40, 20); c.strokeStyle = T.accent; c.lineWidth = 2; c.stroke();
    check(c, tx + 14, sy + sh - 42, 20, T.accent, 3);
    txt(c, 'attempt 2/3', tx + 44, sy + sh - 24, { font: `500 20px ${m}`, color: T.fg });
  },

  // Kaggle: GP regression curve, confidence band, data points, piecewise breaks
  'material-property-prediction'(c, r, T) {
    const { x, y, w, h } = r, m = T.fMono, rd = rng(7);
    const px = x + 36, pw = w - 36, py = y + 8, ph = h - 56;
    c.strokeStyle = T.line; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + ph); c.lineTo(px + pw, py + ph); c.stroke();
    for (let i = 1; i < 5; i++) { c.strokeStyle = rgba(T.fg, 0.06); c.beginPath(); c.moveTo(px, py + (ph * i) / 5); c.lineTo(px + pw, py + (ph * i) / 5); c.stroke(); }
    const f = (t: number) => 0.5 + 0.22 * Math.sin(t * 9) + 0.12 * Math.sin(t * 23 + 1) * (0.6 + t * 0.4) - 0.1 * t;
    const pts: [number, number][] = []; for (let i = 0; i < 22; i++) { const t = rd() * 0.96 + 0.02; if (t > 0.58 && t < 0.7) continue; pts.push([t, f(t) + (rd() - 0.5) * 0.07]); }
    const bw = (t: number) => 0.035 + Math.min(...pts.map(([q]) => Math.abs(q - t))) * 1.5;
    const X = (t: number) => px + t * pw, Y = (v: number) => py + ph - v * ph;
    // breaks
    [0.33, 0.66].forEach((b) => { c.save(); c.setLineDash([6, 8]); c.strokeStyle = rgba(T.fg, 0.28); c.beginPath(); c.moveTo(X(b), py); c.lineTo(X(b), py + ph); c.stroke(); c.restore(); });
    // band
    c.beginPath();
    for (let i = 0; i <= 120; i++) { const t = i / 120; i ? c.lineTo(X(t), Y(f(t) + bw(t))) : c.moveTo(X(t), Y(f(t) + bw(t))); }
    for (let i = 120; i >= 0; i--) { const t = i / 120; c.lineTo(X(t), Y(f(t) - bw(t))); }
    c.closePath(); c.fillStyle = rgba(T.accent, 0.18); c.fill();
    c.beginPath(); for (let i = 0; i <= 160; i++) { const t = i / 160; i ? c.lineTo(X(t), Y(f(t))) : c.moveTo(X(t), Y(f(t))); }
    c.strokeStyle = T.accent; c.lineWidth = 3.5; c.stroke();
    pts.forEach(([t, v]) => { c.beginPath(); c.arc(X(t), Y(v), 5.5, 0, 7); c.fillStyle = T.fg; c.fill(); });
    txt(c, 'x · material descriptor', px + pw, py + ph + 36, { font: `400 20px ${m}`, color: T.dim, align: 'right' });
    txt(c, 'piece 1 | piece 2 | piece 3', px, py + ph + 36, { font: `400 20px ${m}`, color: T.dim });
    txt(c, '#1', px + pw - 6, py + 92, { font: `italic 400 110px ${T.fDisplay}`, color: T.accent, align: 'right' });
    txt(c, '0.13689', px + pw - 8, py + 128, { font: `600 28px ${m}`, color: T.fg, align: 'right' });
  },

  // TaskFlow: six pipeline stages, one fails and is diagnosed
  'taskflow-devsecops'(c, r, T) {
    const { x, y, w, h } = r, m = T.fMono;
    const st = ['lint', 'test', 'build', 'scan', 'pack', 'deploy'], bad = 2;
    const pw = (w - 5 * 22) / 6;
    st.forEach((s, i) => {
      const px = x + i * (pw + 22), py = y + 18;
      const fail = i === bad, skipped = i > bad;
      rr(c, px, py, pw, 62, 31);
      c.fillStyle = fail ? T.danger : skipped ? 'transparent' : rgba(T.fg, 0.1); c.fill();
      c.save(); if (skipped) c.setLineDash([5, 6]); c.strokeStyle = fail ? T.danger : skipped ? T.faint : rgba(T.fg, 0.3); c.lineWidth = 2; c.stroke(); c.restore();
      txt(c, s, px + pw / 2 + 12, py + 40, { font: `600 24px ${m}`, color: fail ? T.bg : skipped ? T.dim : T.fg, align: 'center' });
      if (fail) cross(c, px + 20, py + 22, 18, T.bg, 3.5); else if (!skipped) check(c, px + 18, py + 20, 20, T.accent, 3.5);
      if (i < 5) { c.strokeStyle = T.faint; c.lineWidth = 2; c.beginPath(); c.moveTo(px + pw + 2, py + 31); c.lineTo(px + pw + 20, py + 31); c.stroke(); }
    });
    const fx = x + bad * (pw + 22) + pw / 2;
    c.strokeStyle = T.danger; c.lineWidth = 2.5; c.setLineDash([2, 7]); c.lineCap = 'round';
    c.beginPath(); c.moveTo(fx, y + 84); c.lineTo(fx, y + 150); c.stroke(); c.setLineDash([]);
    const dy = y + 150, dh = h - 150;
    rr(c, x, dy, w, dh, 12); c.fillStyle = rgba(T.fg, 0.05); c.fill(); c.strokeStyle = T.line; c.lineWidth = 2; c.stroke();
    txt(c, 'FAILURE INTELLIGENCE', x + 24, dy + 38, { font: `600 21px ${m}`, color: T.accent });
    txt(c, 'top-3 15/15', x + w - 24, dy + 38, { font: `700 24px ${m}`, color: T.fg, align: 'right' });
    const lines = [
      ['FAIL', 'tests/auth.spec.ts › refresh token', T.danger],
      ['why ', 'fixture token expired (ttl 3600s)', T.fg],
      ['fix ', 'regenerate fixture, pin clock in setup', T.fg],
      ['conf', 'ranked in the top 3 of 15 scenarios', T.dim],
    ];
    lines.forEach(([k, v, col], i) => {
      txt(c, k, x + 24, dy + 84 + i * 40, { font: `600 23px ${m}`, color: col });
      txt(c, v, x + 106, dy + 84 + i * 40, { font: `400 23px ${m}`, color: T.fg });
    });
  },

  // 19MJ: CV with highlighted lines + score
  '19mj-career-platform'(c, r, T) {
    const { x, y, w, h } = r, m = T.fMono, rd = rng(3);
    const dw = w * 0.4;
    rr(c, x, y, dw, h, 8); c.fillStyle = T.paper || '#eee'; c.fill();
    c.fillStyle = 'rgba(0,0,0,0.78)'; c.fillRect(x + 24, y + 26, dw * 0.5, 18);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x + 24, y + 54, dw * 0.32, 10);
    const hl = new Set([3, 4, 8, 11]);
    for (let i = 0; i < 12; i++) {
      const yy = y + 92 + i * 31, ww = (dw - 48) * (0.55 + rd() * 0.45);
      if (hl.has(i)) { c.fillStyle = rgba(T.accent, 0.5); c.fillRect(x + 20, yy - 6, ww + 8, 20); }
      c.fillStyle = 'rgba(0,0,0,0.38)'; c.fillRect(x + 24, yy, ww, 8);
    }
    // callouts
    const cx = x + dw + 40;
    const call = (yy: number, a: string, b: string) => {
      c.strokeStyle = rgba(T.accent, 0.7); c.lineWidth = 2; c.beginPath(); c.moveTo(x + dw * 0.78, yy); c.lineTo(cx - 8, yy); c.stroke();
      txt(c, a, cx, yy - 6, { font: `600 22px ${m}`, color: T.fg });
      txt(c, b, cx, yy + 22, { font: `400 20px ${m}`, color: T.dim });
    };
    call(y + 108, 'skills match', '+12  python, sql, mlops');
    call(y + 262, 'gap: no metrics', 'quantify impact in role 2');
    call(y + 400, 'action verb', '"handled" → "reduced"');
    // score
    const sx = x + w - 96, sy = y + h - 96;
    c.lineWidth = 12; c.lineCap = 'round';
    c.strokeStyle = T.faint; c.beginPath(); c.arc(sx, sy, 62, 0, 7); c.stroke();
    c.strokeStyle = T.accent; c.beginPath(); c.arc(sx, sy, 62, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.82); c.stroke();
    txt(c, '82', sx, sy + 16, { font: `700 48px ${T.fDisplay}`, color: T.fg, align: 'center' });
    txt(c, 'cv score', sx, sy + 88, { font: `500 19px ${m}`, color: T.dim, align: 'center' });
  },

  // Lakehouse: stream -> bronze/silver/gold
  'realtime-lakehouse'(c, r, T) {
    const { x, y, w, h } = r, m = T.fMono, rd = rng(11);
    const L = [['gold', 'features · aggregates', '#d2a93a'], ['silver', 'cleaned · deduped', '#a9b0b8'], ['bronze', 'raw · append-only', '#b07a45']];
    const lx = x + w * 0.3, lw = w * 0.5, off = 70, th = 22, gap = 112;
    L.forEach(([n, d, col], i) => {
      const ly = y + 130 + i * gap;
      c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + lw, ly); c.lineTo(lx + lw + off, ly - 46); c.lineTo(lx + off, ly - 46); c.closePath();
      c.fillStyle = rgba(col, 0.2); c.fill(); c.strokeStyle = col; c.lineWidth = 2.5; c.stroke();
      c.fillStyle = rgba(col, 0.55); c.fillRect(lx, ly, lw, th); c.strokeRect(lx, ly, lw, th);
      txt(c, n, lx + 24, ly + 17, { font: `700 21px ${m}`, color: T.bg });
      txt(c, d, lx + off + 22, ly - 14, { font: `500 21px ${m}`, color: T.fg });
    });
    // stream in (kafka -> spark)
    txt(c, 'kafka', x, y + 28, { font: `600 22px ${m}`, color: T.dim });
    for (let k = 0; k < 22; k++) {
      const t = k / 22, yy = y + 56 + t * 232 + (rd() - 0.5) * 8, xx = x + 6 + (1 - Math.pow(1 - t, 2)) * 20 + (k % 3) * 38;
      c.fillStyle = k % 5 === 0 ? T.accent : rgba(T.fg, 0.4); c.fillRect(xx, yy, 22, 8);
    }
    c.strokeStyle = rgba(T.accent, 0.8); c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + 110, y + 330); c.lineTo(lx - 14, y + 330); c.lineTo(lx - 24, y + 320); c.moveTo(lx - 14, y + 330); c.lineTo(lx - 24, y + 340); c.stroke();
    txt(c, 'spark', x, y + 358, { font: `600 22px ${m}`, color: T.dim });
    // out
    const ox = x + w - 6;
    txt(c, 'MLflow', ox, y + 40, { font: `600 22px ${m}`, color: T.fg, align: 'right' });
    txt(c, 'FastAPI', ox, y + 76, { font: `600 22px ${m}`, color: T.accent, align: 'right' });
    txt(c, 'MinIO · s3://lake', x, y + h - 4, { font: `400 20px ${m}`, color: T.dim });
  },

  // dApp: chained blocks with a checked todo
  'onchain-todo-dapp'(c, r, T) {
    const { x, y, w, h } = r, m = T.fMono;
    const bw = 170, g = (w - 4 * bw) / 3, hashes = ['0x4e1a…09', '0x9f3a…c1', '0x21bd…7e', '0x7b2e…91'];
    hashes.forEach((hs, i) => {
      const bx = x + i * (bw + g), by = y + 14, last = i === 3;
      rr(c, bx, by, bw, 130, 10); c.fillStyle = last ? rgba(T.accent, 0.14) : rgba(T.fg, 0.05); c.fill();
      c.strokeStyle = last ? T.accent : T.line; c.lineWidth = last ? 3 : 2; c.stroke();
      txt(c, '#' + (5231 + i), bx + 14, by + 36, { font: `600 22px ${m}`, color: last ? T.accent : T.dim });
      txt(c, hs, bx + 14, by + 74, { font: `500 21px ${m}`, color: T.fg });
      c.fillStyle = T.faint; c.fillRect(bx + 14, by + 96, bw - 28, 7); c.fillRect(bx + 14, by + 112, (bw - 28) * 0.55, 7);
      if (i < 3) { c.strokeStyle = T.fg; c.globalAlpha = 0.5; c.lineWidth = 2.5; c.beginPath(); c.moveTo(bx + bw + 6, by + 65); c.lineTo(bx + bw + g - 6, by + 65); c.stroke(); c.globalAlpha = 1; }
    });
    const ty = y + 200;
    rr(c, x, ty, w, h - 200, 12); c.fillStyle = rgba(T.fg, 0.05); c.fill(); c.strokeStyle = T.line; c.lineWidth = 2; c.stroke();
    txt(c, 'contract Todo', x + 24, ty + 40, { font: `600 21px ${m}`, color: T.dim });
    ([['Review audit checklist', true], ['Publish verified contract', true], ['Share the demo link', false]] as [string, boolean][]).forEach(([s, done], i) => {
      const yy = ty + 70 + i * 52;
      rr(c, x + 24, yy, 32, 32, 6); c.strokeStyle = done ? T.accent : T.dim; c.lineWidth = 2.5; c.stroke();
      if (done) { c.fillStyle = rgba(T.accent, 0.2); c.fill(); check(c, x + 31, yy + 7, 18, T.accent, 3.5); }
      txt(c, s, x + 76, yy + 25, { font: `500 28px ${T.fBody}`, color: done ? T.dim : T.fg });
      if (done) { c.fillStyle = T.dim; c.fillRect(x + 76, yy + 17, c.measureText(s).width * 0.98, 2); }
    });
    txt(c, 'tx 0x7b2e…91 · confirmed', x + w - 24, ty + h - 200 - 22, { font: `500 21px ${m}`, color: T.accent, align: 'right' });
    txt(c, 'Sepolia', x + w - 24, ty + 40, { font: `600 21px ${m}`, color: T.fg, align: 'right' });
  },

  // Contact: big text
  contact(c, r, T) {
    const { x, y, w, h } = r, ct = T.contact;
    const size = ct.size || 118;
    txt(c, ct.l1, x + 4, y + h * 0.4, { font: `${T.contactWeight || 400} ${size}px ${T.fDisplay}`, color: T.fg });
    txt(c, ct.l2, x + 4, y + h * 0.4 + size * 1.0, { font: `${T.contactWeight || 400} ${size}px ${T.fDisplay}`, color: T.accent });
    txt(c, ct.sub, x + 6, y + h - 14, { font: `500 26px ${T.fMono}`, color: T.dim });
    c.strokeStyle = T.accent; c.lineWidth = 5; c.lineCap = 'round';
    const ax = x + w - 90, ay = y + h - 60;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 72, ay); c.moveTo(ax + 50, ay - 22); c.lineTo(ax + 72, ay); c.lineTo(ax + 50, ay + 22); c.stroke();
  },
};

// ---------------------------------------------------------------- chrome (Kernel: terminal window)
function chrome(c: Ctx, T: Theme, it: CoverItem, i: number, N: number): Rect {
  const W = COVER_W, H = COVER_H, m = T.fMono;
  c.fillStyle = T.card; c.fillRect(0, 0, W, H);
  c.fillStyle = rgba(T.accent, 0.1); c.fillRect(0, 0, W, 56);
  c.strokeStyle = T.accent; c.lineWidth = 2; c.strokeRect(1, 1, W - 2, H - 2);
  c.beginPath(); c.moveTo(0, 56); c.lineTo(W, 56); c.stroke();
  [0, 1, 2].forEach((k) => { c.beginPath(); c.arc(32 + k * 28, 28, 8, 0, 7); if (k === 0) { c.fillStyle = T.accent; c.fill(); } else { c.strokeStyle = T.accent; c.lineWidth = 2; c.stroke(); } });
  txt(c, `~/${it.slug} — ${FILE[it.slug]}`, W / 2, 36, { font: `600 24px ${m}`, color: T.fg, align: 'center' });
  txt(c, `${pad2(i + 1)}/${pad2(N)}`, W - 28, 36, { font: `500 22px ${m}`, color: T.accent, align: 'right' });
  c.fillStyle = rgba(T.accent, 0.1); c.fillRect(0, H - 40, W, 40);
  c.beginPath(); c.moveTo(0, H - 40); c.lineTo(W, H - 40); c.stroke();
  const fact = it.fact.length > 46 ? it.fact.slice(0, 45) + '…' : it.fact;
  txt(c, ` NORMAL  ${fact}`, 12, H - 13, { font: `600 20px ${m}`, color: T.accent });
  txt(c, 'utf-8 · ln 1, col 1 ', W - 12, H - 13, { font: `400 20px ${m}`, color: T.dim, align: 'right' });
  return { x: 36, y: 84, w: W - 72, h: H - 84 - 62 };
}

export function drawCover(canvas: HTMLCanvasElement, T: Theme, it: CoverItem, i: number, N: number): HTMLCanvasElement {
  canvas.width = COVER_W; canvas.height = COVER_H;
  const c = canvas.getContext('2d')!;
  const r = chrome(c, T, it, i, N);
  c.save(); c.beginPath(); c.rect(r.x - 6, r.y - 6, r.w + 12, r.h + 12); c.clip();
  (BODY[it.slug] || BODY.contact)(c, r, T);
  c.restore();
  return canvas;
}

export function renderCovers(items: CoverItem[], T: Theme, canvases?: HTMLCanvasElement[]): HTMLCanvasElement[] {
  return items.map((it, i) => drawCover(canvases?.[i] || document.createElement('canvas'), T, it, i, items.length));
}

export function loadFonts(T: Theme): Promise<unknown> {
  if (!document.fonts) return Promise.resolve();
  return Promise.allSettled(T.fontLoads.map((f) => document.fonts.load(f))).then(() => document.fonts.ready);
}
