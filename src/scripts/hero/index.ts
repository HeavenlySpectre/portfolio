import { prefersReducedMotion } from '../motion/fx';
import { AMB, FONT, TH, hx, lerp, clamp } from './shared';
import { STEP, SENT, gen, genState, genUpdate, drawPanel } from './logits';
import { drawMatrix } from './attention';

declare global { interface Window { __heroReady?: boolean } }

const REDUCED = prefersReducedMotion();
const D = document.documentElement;
const hero = document.getElementById('top') as HTMLElement;
const cv = document.getElementById('bgc') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
const slot = document.getElementById('slot')!;
const dimEl = hero.querySelector<HTMLElement>('.dim')!;
const dprOf = () => Math.min(window.devicePixelRatio || 1, 2); // DPR cap 2

/* pointer */
const ptr = { px: -1, py: -1 };
hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); ptr.px = e.clientX - r.left; ptr.py = e.clientY - r.top; });
hero.addEventListener('pointerleave', () => { ptr.px = -1; });

/* layout */
let W = 0, H = 0, dpr = 1, S = { x: 0, y: 0, w: 0, h: 0 }, mobile = false;
let cw = 12, ch = 20, ml = 0, mt = 0, cols = 0, rows = 0, noise: Float32Array | null = null;
let rzRaf = 0;
const queueResize = () => { if (!rzRaf) rzRaf = requestAnimationFrame(() => { rzRaf = 0; resize(); }); }; // coalesced
function resize() {
  const nW = hero.clientWidth, nH = hero.clientHeight, nd = dprOf(), hr = hero.getBoundingClientRect(), sr = slot.getBoundingClientRect();
  const nS = { x: sr.left - hr.left, y: sr.top - hr.top, w: sr.width, h: sr.height };
  if (noise && nW === W && nH === H && nd === dpr && nS.x === S.x && nS.y === S.y && nS.w === S.w && nS.h === S.h) return; // nothing changed: don't reallocate the canvas
  W = nW; H = nH; dpr = nd; S = nS; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  mobile = W < 760;
  dimEl.style.height = mobile ? Math.max(0, S.y - 8) + 'px' : '';
  cw = mobile ? 9 : 12; ch = mobile ? 15 : 20; ml = mobile ? 0 : 74; mt = mobile ? 0 : 22;
  cols = Math.ceil((W - ml) / cw); rows = Math.ceil((H - mt) / ch);
  noise = new Float32Array(cols * rows); for (let i = 0; i < noise.length; i++) noise[i] = Math.random();
  if (REDUCED) start();
}

/* ambient heatmap. amp: 1 = full pattern, low = quiet grid that still ripples */
const TOK = ['kevin', 'anugerah', 'faza', 'ai', 'data', 'rag', 'sql', 'kafka', 'spark', 'llm', 'etl', 'mlops', 'index', 'query', 'embed', 'rank'];
let sx = -1, sy = -1;
const LV = 10;
function heat(t: number, amp: number) {
  const nz = noise!;
  const tx = ptr.px >= 0 ? ptr.px : W * (0.55 + 0.3 * Math.sin(t * 0.21)), ty = ptr.py >= 0 ? ptr.py : H * (0.5 + 0.28 * Math.sin(t * 0.17 + 1));
  if (sx < 0) { sx = tx; sy = ty; }
  sx = lerp(sx, tx, 0.1); sy = lerp(sy, ty, 0.1);
  const paths = Array.from({ length: LV }, () => new Path2D()), R = ch * 9, WL = ch * 1.5;
  for (let j = 0; j < rows; j++) {
    const y = mt + j * ch, v = j / rows;
    for (let i = 0; i < cols; i++) {
      const x = ml + i * cw, u = i / cols;
      const band = Math.exp(-Math.abs(u - v) * 7) * 0.55, stripe = Math.pow(0.5 + 0.5 * Math.sin(u * 23 + Math.sin(v * 6) * 2.5), 6) * 0.25;
      const base = band + stripe + nz[j * cols + i] * 0.12, d = Math.hypot(x + cw / 2 - sx, y + ch / 2 - sy);
      const focus = Math.exp(-(d * d) / (R * R * 1.4)), ripple = Math.sin(d / WL - t * 3) * Math.exp(-d / (R * 1.6));
      const val = clamp(base * 0.55 * amp + focus * (0.22 + 0.38 * amp) + ripple * 0.3 * (0.4 + focus) * (0.4 + 0.6 * amp));
      paths[Math.min(LV - 1, (val * LV) | 0)].rect(x + 1, y + 1, cw - 2, ch - 2);
    }
  }
  paths.forEach((p, k) => { ctx.fillStyle = k ? `rgba(${AMB},${(0.05 + (k / LV) * 0.75).toFixed(3)})` : `rgba(${AMB},.035)`; ctx.fill(p); });
  if (ml && amp > 0.5) {
    ctx.font = `10px ${FONT}`; ctx.textBaseline = 'middle';
    const fc = Math.floor((sx - ml) / cw / 9), fr = Math.floor((sy - mt) / ch / 3);
    ctx.textAlign = 'right';
    for (let r = 0, k = 0; r < rows; r += 3, k++) { ctx.fillStyle = k === fr ? TH.fg : hx(TH.dim, .75); ctx.fillText(TOK[(k * 5) % TOK.length], ml - 8, mt + r * ch + ch / 2); }
    ctx.textAlign = 'left';
    for (let c = 0, k = 0; c < cols; c += 9, k++) { ctx.fillStyle = k === fc ? TH.fg : hx(TH.dim, .75); ctx.fillText(TOK[(k * 3) % TOK.length], ml + c * cw, mt - 10); }
  }
}

/* frame */
let tClock = 0, lastNow = 0, raf = 0, vis = true, lastDraw = 0, calm = D.classList.contains('ld'); // calm: ~30fps heatmap while the loader transition owns the frame budget
addEventListener('loader-done', () => { calm = false; });
function draw(t: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  heat(t, 0.3);
  const g = genState(), n = mobile ? 5 : 6, view = { ctx, mobile, S };
  const ph = drawPanel(view, S.x, S.y, S.w, n, g);
  drawMatrix(view, ptr, S.y + ph + 14, g, t);
}
function loop(now: number) {
  raf = 0;
  if (!vis || document.hidden) { lastNow = 0; return; }
  const dt = lastNow ? Math.min((now - lastNow) / 1000, 0.1) : 0; lastNow = now; tClock += dt;
  genUpdate(dt);
  if (!calm || now - lastDraw >= 30) { lastDraw = now; draw(tClock + 1); }
  raf = requestAnimationFrame(loop);
}
function start() {
  cancelAnimationFrame(raf); raf = 0;
  if (REDUCED) { gen.t = SENT[gen.si].length * STEP + 0.2; draw(2.5); return; }
  lastNow = 0; raf = requestAnimationFrame(loop);
}
new IntersectionObserver((e) => { vis = e[0].isIntersecting; if (vis) start(); }).observe(hero); // pause offscreen
document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
new ResizeObserver(queueResize).observe(hero);

resize(); start();
(document.fonts ? document.fonts.ready : Promise.resolve()).then(queueResize); // re-measure once the font is in
requestAnimationFrame(() => requestAnimationFrame(() => { window.__heroReady = true; }));
