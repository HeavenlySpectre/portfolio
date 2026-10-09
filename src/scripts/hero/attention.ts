import { AMB, FONT, TH, clamp, hx, type View } from './shared';
import { COMMIT, SENT, STEP, gen, sentenceTokens, type GenState } from './logits';

/* Linked attention matrix: every committed token adds a row and a column. */
const hash = (a: number, b: number, c: number) => { const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s); };
const attnCache: number[][][] = [];
function attn(si: number): number[][] {
  if (attnCache[si]) return attnCache[si];
  const n = SENT[si].length, out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const s: number[] = []; let z = 0;
    for (let j = 0; j <= i; j++) { const val = 1.5 * hash(si, i, j) + (j === i ? 0.9 : 0) + (j === i - 1 ? 0.7 : 0) + (j === 0 ? 0.6 : 0) - 0.1 * (i - j); const e = Math.exp(val * 2); s.push(e); z += e; }
    out.push(s.map((e) => e / z));
  }
  return (attnCache[si] = out);
}

export function drawMatrix(v: View, ptr: { px: number; py: number }, y0: number, g: GenState, t: number) {
  const { ctx, mobile: m, S } = v, N = g.n, att = attn(gen.si), toks = sentenceTokens();
  const labL = m ? 54 : 80, labT = m ? 56 : 66, foot = 24, availW = S.w - labL - 14, availH = S.y + S.h - y0 - labT - foot - 10;
  const M = Math.max(60, Math.min(availW, availH)), cs = M / N, mx = S.x + S.w - M - 10, my = y0 + labT;
  const bh = labT + M + foot + 8;
  ctx.save(); ctx.globalAlpha = g.fade;
  ctx.fillStyle = hx(TH.bg, .88); ctx.fillRect(S.x, y0, S.w, bh); ctx.strokeStyle = TH.line; ctx.lineWidth = 1; ctx.strokeRect(S.x + 0.5, y0 + 0.5, S.w - 1, bh - 1);
  const cur = g.committed - 1, rowMax = att.map((r) => Math.max(...r));
  const tx = ptr.px >= 0 ? ptr.px : -9999, ty = ptr.py, R = 130, WL = 22;
  for (let r = 0; r < N; r++) for (let c = 0; c <= r; c++) {
    const x = mx + c * cs, y = my + r * cs; let a = 0.05;
    if (r < g.committed) {
      const born = r * STEP + COMMIT * STEP, an = clamp((gen.t - born) / 0.5), cell = clamp(an * (r + 2) - c, 0, 1);
      const w = att[r][c] / rowMax[r]; a = 0.05 + (0.1 + 0.8 * Math.pow(w, 0.8)) * cell * (r === cur ? 1 : 0.55);
    }
    if (tx > -9000) { const d = Math.hypot(x + cs / 2 - tx, y + cs / 2 - ty); a += (Math.exp(-(d * d) / (R * R)) * 0.1 + Math.sin(d / WL - t * 3) * Math.exp(-d / (R * 1.6)) * 0.06); }
    ctx.fillStyle = `rgba(${AMB},${clamp(a, 0, 1).toFixed(3)})`; ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
  }
  if (cur >= 0) { ctx.strokeStyle = TH.accent; ctx.lineWidth = 1.5; ctx.strokeRect(mx + 0.75, my + cur * cs + 0.75, (cur + 1) * cs - 1.5, cs - 1.5); }
  ctx.font = `${m ? 9 : 10}px ${FONT}`; ctx.textBaseline = 'middle';
  for (let k = 0; k < g.committed; k++) { // row labels = queries
    ctx.textAlign = 'right'; ctx.fillStyle = k === cur ? TH.accent : TH.dim; ctx.fillText(toks[k], mx - 7, my + k * cs + cs / 2);
    // column labels = keys, lit by the current token's attention to them
    if (k <= cur) {
      const w = att[cur][k] / rowMax[cur], on = k === cur;
      ctx.save(); ctx.translate(mx + k * cs + cs / 2, my - 7); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'left';
      ctx.fillStyle = on ? TH.accent : hx(TH.fg, (0.35 + 0.65 * w).toFixed(2)); ctx.fillText(toks[k], 0, 0); ctx.restore();
    }
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.font = `400 ${m ? 9 : 10}px ${FONT}`; ctx.fillStyle = TH.dim;
  ctx.fillText(m ? 'attention · query row ▸ keys' : 'attention · layer 11 head 4 · row = query, col = key', S.x + 12, y0 + bh - 11);
  ctx.restore();
}
