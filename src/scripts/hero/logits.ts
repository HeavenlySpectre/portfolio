import { AMB, FONT, TH, clamp, hx, type View } from './shared';

/* Token logits panel and the sentence generator clock that also drives the attention matrix.
   Sentences: [token, p(chosen), 5 alternatives]. */
export type Tok = [string, number, string[]];
export const SENT: Tok[][] = [
  [['Kevin', .41, ['He', 'Engineer', 'I', 'Data', 'A']], ['builds', .44, ['designs', 'ships', 'teaches', 'writes', 'is']], ['AI', .36, ['data', 'RAG', 'ML', 'search', 'pipelines']],
    ['and', .52, ['systems', ',', '/', '&', 'for']], ['data', .47, ['ML', 'search', 'analytics', 'backend', 'SQL']], ['systems', .58, ['pipelines', 'platforms', 'products', 'tools', 'apps']], ['.', .61, [',', '—', 'that', 'for', 'in']]],
  [['Efficient', .34, ['Fast', 'Lean', 'Robust', 'Scalable', 'Reliable']], ['by', .52, ['in', 'at', 'through', 'and', 'with']], ['design', .47, ['default', 'nature', 'choice', 'intent', 'necessity']], [',', .58, ['.', '—', 'and', ':', 'but']],
    ['effective', .31, ['useful', 'reliable', 'robust', 'practical', 'proven']], ['in', .55, ['at', 'by', 'for', 'when', 'under']], ['practice', .49, ['production', 'use', 'theory', 'action', 'context']], ['.', .66, [',', '—', '!', '?', 'too']]],
  [['Simple', .36, ['Small', 'Clear', 'Fast', 'Honest', 'Plain']], ['enough', .57, ['to', 'but', 'and', 'yet', 'by']], ['to', .62, ['for', 'that', 'so', 'when', 'and']], ['trust', .28, ['read', 'use', 'maintain', 'debug', 'audit']], [',', .54, ['.', '—', 'and', ':', 'but']],
    ['useful', .33, ['powerful', 'fast', 'rich', 'robust', 'flexible']], ['enough', .60, ['to', 'but', 'and', 'yet', 'for']], ['to', .64, ['for', 'that', 'so', 'and', 'in']], ['matter', .27, ['ship', 'scale', 'use', 'last', 'help']], ['.', .67, [',', '—', '!', '?', 'too']]],
];

interface Cand { tok: string; p: number; pick: boolean }
const candCache = new Map<string, Cand[]>();
function cands(si: number, k: number, n: number): Cand[] {
  const key = si + ':' + k + ':' + n;
  const hit = candCache.get(key);
  if (hit) return hit;
  const [tok, p, alts] = SENT[si][k], use = alts.slice(0, n - 1), ws = use.map((_, i) => 0.58 ** i), ws0 = ws.reduce((a, b) => a + b, 0);
  const list = [{ tok, p, pick: true }, ...use.map((t, i) => ({ tok: t, p: ((1 - p) * 0.92 * ws[i]) / ws0, pick: false }))].sort((a, b) => b.p - a.p);
  candCache.set(key, list);
  return list;
}

const join = (toks: string[]) => toks.reduce((s, w) => s + (/^[.,—]$/.test(w) ? '' : s ? ' ' : '') + w, '');

/* generator clock */
export const STEP = 1.5, HOLD = 2.6, COMMIT = 0.88;
export const gen = { si: 0, t: 0 };
export function genUpdate(dt: number) {
  gen.t += dt;
  const n = SENT[gen.si].length, total = n * STEP + HOLD;
  if (gen.t > total) { gen.t = 0; gen.si = (gen.si + 1) % SENT.length; }
}
export interface GenState { n: number; done: boolean; step: number; u: number; committed: number; fade: number }
export function genState(): GenState {
  const n = SENT[gen.si].length, done = gen.t >= n * STEP, step = done ? n - 1 : Math.floor(gen.t / STEP), u = done ? 1 : (gen.t % STEP) / STEP;
  const committed = done ? n : step + (u >= COMMIT ? 1 : 0);
  return { n, done, step, u, committed, fade: clamp((n * STEP + HOLD - gen.t) / 0.45) };
}
export const sentenceTokens = () => SENT[gen.si].map((s) => s[0]);

const panelH = (m: boolean, n: number) => 16 + 18 + 26 + n * (m ? 21 : 25) + 12;
const ease3 = (x: number) => 1 - (1 - x) ** 3;

/** Draws the logits panel and returns its height. */
export function drawPanel(v: View, x: number, y: number, w: number, n: number, g: GenState): number {
  const { ctx, mobile: m } = v, rh = m ? 21 : 25, ph = panelH(m, n), toks = sentenceTokens();
  ctx.fillStyle = hx(TH.bg, .88); ctx.fillRect(x, y, w, ph); ctx.strokeStyle = TH.line; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, ph - 1);
  const px = x + 14, pw = w - 28;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = `500 ${m ? 10 : 11}px ${FONT}`; ctx.fillStyle = TH.dim; ctx.fillText(`p(next token | context)   T=0.7  top_k=${n}`, px, y + 26);
  const label = '> ' + join(toks.slice(0, g.committed)); let lfs = m ? 12 : 14; ctx.font = `500 ${lfs}px ${FONT}`;
  const fullW = ctx.measureText('> ' + join(toks)).width + 14;
  if (fullW > pw) { lfs = Math.max(9, Math.floor(lfs * pw / fullW * 10) / 10); ctx.font = `500 ${lfs}px ${FONT}`; } // long sentences shrink to fit the panel
  ctx.fillStyle = TH.fg; ctx.fillText(label, px, y + 50);
  if (((gen.t * 2) | 0) % 2 === 0) { ctx.fillStyle = TH.accent; ctx.fillRect(px + ctx.measureText(label).width + 3, y + 38, 8, 15); }
  const list = g.done ? cands(gen.si, g.n - 1, n) : cands(gen.si, g.step, n), u = g.done ? 1 : g.u, y0 = y + 62;
  const labW = m ? 76 : 96, valW = 38, bx = px + labW, bwMax = pw - labW - valW - 4;
  list.forEach((c, i) => {
    const yy = y0 + i * rh, gr = ease3(clamp(u / 0.5 - i * 0.03)), sel = u > 0.62, hot = c.pick && sel, a = sel ? (c.pick ? 1 : 0.32) : 0.8;
    ctx.font = `${hot ? 600 : 400} ${m ? 11 : 12}px ${FONT}`; ctx.textAlign = 'right'; ctx.fillStyle = hot ? TH.accent : hx(TH.fg, a); ctx.fillText(c.tok, bx - 10, yy + rh * 0.64);
    ctx.fillStyle = hx(TH.line, .5); ctx.fillRect(bx, yy + rh * 0.82, bwMax, 1);
    const bw = (c.p / 0.75) * bwMax * gr; ctx.fillStyle = hot ? TH.accent : `rgba(${AMB},${a * 0.75})`;
    if (hot) { ctx.shadowColor = hx(TH.accent, TH.barGlow); ctx.shadowBlur = TH.barBlur; }
    ctx.fillRect(bx, yy + rh * 0.22, bw, rh * 0.5); ctx.shadowBlur = 0;
    ctx.textAlign = 'left'; ctx.font = `400 ${m ? 10 : 11}px ${FONT}`; ctx.fillStyle = hot ? TH.fg : hx(TH.dim, Math.max(a, 0.55)); ctx.fillText((c.p * gr).toFixed(2), bx + bw + 6, yy + rh * 0.64);
  });
  return ph;
}
