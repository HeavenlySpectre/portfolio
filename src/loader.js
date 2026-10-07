import { gsap } from 'gsap';
import { $, $$, clamp } from './lib.js';

const FG = '242,242,240';
const ACC = '#ff5a1f';
const ACC_RGB = '255,90,31';
const N = 100;

const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const rnd = (i) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };

// Deterministic, purely decorative curves (precomputed once, 0..N).
const make = (f) => Array.from({ length: N + 1 }, (_, i) => f(i));
const TL = make((i) => 0.09 + 1.05 * Math.exp(-i / 18) + (rnd(i) - 0.5) * 0.09 * Math.exp(-i / 60));
const VL = make((i) => 0.14 + 1.0 * Math.exp(-i / 20) + (rnd(i + 50) - 0.5) * 0.12 * Math.exp(-i / 70) + i * 0.0004);
const TA = make((i) => 0.97 - 0.85 * Math.exp(-i / 16) + (rnd(i + 9) - 0.5) * 0.05 * Math.exp(-i / 60));
const VA = make((i) => 0.93 - 0.82 * Math.exp(-i / 18) + (rnd(i + 99) - 0.5) * 0.07 * Math.exp(-i / 70));
const smoothArr = (a, k = 0.6) => { const o = [a[0]]; for (let i = 1; i < a.length; i++) o.push(o[i - 1] * k + a[i] * (1 - k)); return o; };
const VLs = smoothArr(VL), VAs = smoothArr(VA);

const LOSS_COL = [`rgb(${FG})`, `rgba(${FG},.45)`];
const ACC_COL = [ACC, `rgba(${ACC_RGB},.45)`];
const LOSS_OPT = {
  title: 'loss', series: [TL, VL], colors: LOSS_COL, ymin: 0, ymax: 1.2, ticks: [0, 0.4, 0.8, 1.2],
  fmt: (v) => v.toFixed(1), legend: [['train', LOSS_COL[0]], ['val', LOSS_COL[1]]],
};
const ACC_OPT = {
  title: 'accuracy', series: [TA, VA], colors: ACC_COL, ymin: 0, ymax: 1, ticks: [0, 0.25, 0.5, 0.75, 1],
  fmt: (v) => v.toFixed(2), legend: [['train', ACC_COL[0]], ['val', ACC_COL[1]]],
};

/**
 * Loader "M2 Run dashboard": header bar, four stat cards, loss and accuracy charts, thin progress bar.
 * Progress is REAL (font loading, with a ~2.4s minimum clock) and drives the epoch and curves.
 * At 100%: FINISHED / TRAINING COMPLETE, dashboard fades, "Welcome." rises, then a column shutter.
 * All numbers are decorative. `fonts` is { promise, progress() } from lib.fontLoader().
 */
export async function runLoader({ reduced, fonts, prepare, reveal }) {
  const root = $('#loader');
  const cv = $('#loaderCanvas');
  const shutters = $$('.loader__shutters i', root);
  document.documentElement.classList.add('is-loading');

  const done = () => {
    root.classList.add('is-done');
    document.documentElement.classList.remove('is-loading');
  };

  if (reduced) {
    await fonts.promise;
    await prepare();
    reveal(true);
    await gsap.to(root, { opacity: 0, duration: 0.35, ease: 'none' });
    done();
    return;
  }

  const ctx = cv.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let W = 0, H = 0;
  const fit = () => {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  window.addEventListener('resize', fit);

  // text helper: never below 9px
  const T = (s, X, Y, size, col, w = 400, f = 'JetBrains Mono', al = 'left') => {
    ctx.font = `${w} ${Math.max(9, size)}px '${f}'`;
    ctx.fillStyle = col; ctx.textAlign = al; ctx.textBaseline = 'alphabetic';
    ctx.fillText(s, X, Y);
  };

  function panel(X, Y, w, h, s, o, upto) {
    const { title, series, colors, ymin, ymax, ticks, fmt, legend } = o;
    T(title, X, Y - 10 * s, 11 * s, `rgba(${FG},.85)`, 500, 'Inter Tight');
    const lw = 34 * s, px = X + lw, pw = w - lw, ph = Math.min(h - 18 * s, pw / 1.4);
    const yOf = (v) => Y + ph - (clamp(v, ymin, ymax) - ymin) / (ymax - ymin) * ph;
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${FG},.08)`;
    for (const v of ticks) {
      const yy = yOf(v);
      ctx.beginPath(); ctx.moveTo(px, yy); ctx.lineTo(px + pw, yy); ctx.stroke();
      T(fmt(v), px - 6 * s, yy + 3 * s, 8.5 * s, `rgba(${FG},.4)`, 400, 'JetBrains Mono', 'right');
    }
    for (const e of [0, 25, 50, 75, 100]) {
      T(String(e), px + (e / N) * pw, Y + ph + 13 * s, 8.5 * s, `rgba(${FG},.4)`, 400, 'JetBrains Mono', 'center');
    }
    ctx.strokeStyle = `rgba(${FG},.25)`;
    ctx.beginPath(); ctx.moveTo(px, Y); ctx.lineTo(px, Y + ph); ctx.lineTo(px + pw, Y + ph); ctx.stroke();
    const m = Math.floor(upto);
    series.forEach((arr, k) => {
      ctx.beginPath();
      for (let i = 0; i <= m; i++) {
        const xx = px + (i / N) * pw;
        if (i) ctx.lineTo(xx, yOf(arr[i])); else ctx.moveTo(xx, yOf(arr[i]));
      }
      ctx.strokeStyle = colors[k]; ctx.lineWidth = 1.6 * Math.max(1, s * 0.8); ctx.stroke();
      ctx.fillStyle = colors[k]; ctx.beginPath(); ctx.arc(px + (m / N) * pw, yOf(arr[m]), 3 * s, 0, 6.29); ctx.fill();
    });
    legend.forEach(([lab, col], k) => {
      const lx = px + pw - (legend.length - k) * 62 * s;
      ctx.fillStyle = col; ctx.fillRect(lx, Y - 15 * s, 10 * s, 2 * s);
      T(lab, lx + 14 * s, Y - 11 * s, 8.5 * s, `rgba(${FG},.6)`);
    });
  }

  const MIN = 2.4;
  const t0 = performance.now();
  let progress = 0, completeAt = null, prepared = false, exited = false, blockDy = 0;

  await new Promise((resolve) => {
    const tick = () => {
      const now = performance.now();
      const el = (now - t0) / 1000;
      // Real progress: never ahead of the font loader, never ahead of the minimum-duration clock.
      const timeP = easeOut(clamp(el / MIN, 0, 1));
      const target = Math.min(timeP, fonts.progress());
      progress = Math.max(progress, Math.min(target, progress + 0.02 + (target - progress) * 0.2));
      if (progress > 0.995 && target >= 1) progress = 1;
      const finished = progress >= 1;
      if (finished && completeAt === null) completeAt = now;
      const after = completeAt === null ? 0 : (now - completeAt) / 1000;

      ctx.clearRect(0, 0, W, H);
      const ep = progress * N, e = Math.floor(ep);
      const mobile = W < 768 || H > W; // portrait (incl. tablets): stacked layout
      const s = mobile ? clamp(Math.min(W / 420, H / 760), 0.85, 1.25) : clamp(Math.min(W / 960, H / 600), 0.8, 1.8);
      const pad = mobile ? 18 : Math.max(24, 44 * s);

      ctx.globalAlpha = 1 - ss(0.25, 0.7, after);
      if (ctx.globalAlpha > 0.01) {
        ctx.save();
        ctx.translate(0, blockDy);
        // header bar
        const hh = 40 * s, hy = pad - 14 * s, ty = hy + hh / 2 + 4 * s;
        ctx.fillStyle = 'rgba(242,242,240,.04)'; ctx.fillRect(pad, hy, W - pad * 2, hh);
        ctx.fillStyle = finished ? ACC : `rgb(${FG})`;
        ctx.beginPath(); ctx.arc(pad + 16 * s, hy + hh / 2, 4 * s, 0, 6.29); ctx.fill();
        T(mobile ? 'run · portfolio' : 'run · kevin-portfolio', pad + 30 * s, ty, 12 * s, `rgb(${FG})`, 500, 'Inter Tight');
        T(finished ? 'FINISHED' : 'RUNNING', pad + (mobile ? 140 : 190) * s, ty, 9.5 * s, finished ? ACC : `rgba(${FG},.6)`);
        T(`elapsed 00:0${Math.min(Math.floor(el), 9)}`, W - pad - 14 * s, ty, 9.5 * s, `rgba(${FG},.5)`, 400, 'JetBrains Mono', 'right');

        // stat cards
        const cards = [
          ['epoch', `${e}/100`], ['val_loss', VLs[e].toFixed(4)],
          ['val_accuracy', VAs[e].toFixed(4)], ['learning_rate', (1e-3 * Math.pow(0.97, e)).toExponential(2)],
        ];
        const cy = hy + hh + 12 * s, ch = 54 * s, gap = 12 * s;
        const cols = mobile ? 2 : 4, cw = (W - pad * 2 - (cols - 1) * gap) / cols;
        cards.forEach(([lab, val], i) => {
          const cx = pad + (i % cols) * (cw + gap), yy = cy + Math.floor(i / cols) * (ch + gap);
          ctx.fillStyle = 'rgba(242,242,240,.04)'; ctx.fillRect(cx, yy, cw, ch);
          T(lab, cx + 12 * s, yy + 18 * s, 8.5 * s, `rgba(${FG},.5)`);
          T(val, cx + 12 * s, yy + 42 * s, 20 * s, i === 2 ? ACC : `rgb(${FG})`, 500, 'Inter Tight');
        });
        const cardsBottom = cy + Math.ceil(4 / cols) * (ch + gap) - gap;

        // charts
        const gy = cardsBottom + (mobile ? 34 : 42) * s;
        const limit = H - pad + 6 * s; // nominal bar position
        let barY;
        if (mobile) {
          const pw1 = W - pad * 2 - 34 * s;
          const gh = Math.min((limit - 34 * s - gy - 38 * s) / 2, pw1 / 1.4 + 18 * s);
          panel(pad, gy, W - pad * 2, gh, s, LOSS_OPT, ep);
          panel(pad, gy + gh + 38 * s, W - pad * 2, gh, s, ACC_OPT, ep);
          barY = gy + gh * 2 + 38 * s + 34 * s;
        } else {
          const gw = (W - pad * 2 - 40 * s) / 2;
          const gh = Math.min(limit - 30 * s - gy, (gw - 34 * s) / 1.4 + 18 * s);
          panel(pad, gy, gw, gh, s, LOSS_OPT, ep);
          panel(pad + gw + 40 * s, gy, gw, gh, s, ACC_OPT, ep);
          barY = gy + gh + 30 * s;
        }

        // progress bar, status and %
        ctx.fillStyle = `rgba(${FG},.1)`; ctx.fillRect(pad, barY, W - pad * 2, 2 * s);
        ctx.fillStyle = `rgb(${FG})`; ctx.fillRect(pad, barY, (W - pad * 2) * progress, 2 * s);
        T(finished ? 'TRAINING COMPLETE' : 'TRAINING', pad, barY - 8 * s, 10 * s, finished ? ACC : `rgba(${FG},.6)`);
        T(`${Math.round(progress * 100)}%`, W - pad, barY - 8 * s, 10 * s, `rgba(${FG},.7)`, 400, 'JetBrains Mono', 'right');
        ctx.restore();
        // centre the dashboard block (header top .. bar bottom) vertically in the viewport
        const top = pad - 14 * s, bottom = barY + 2 * s;
        blockDy = Math.max(-pad, (H - (bottom - top)) / 2 - top);
      }
      ctx.globalAlpha = 1;

      if (completeAt !== null) {
        if (!prepared) { prepared = true; Promise.resolve(prepare()); }
        const a = ss(0.55, 1.1, after), dy = (1 - easeOut(a)) * 26 * s;
        ctx.globalAlpha = a;
        T('Welcome.', W / 2, H / 2 + 20 * s + dy, 78 * s, `rgb(${FG})`, 500, 'Inter Tight', 'center');
        T('Kevin Anugerah Faza · AI/ML Engineer', W / 2, H / 2 + 52 * s + dy, 10 * s, `rgba(${FG},.55)`, 400, 'JetBrains Mono', 'center');
        ctx.globalAlpha = 1;
        if (after > 2.3 && !exited) { exited = true; resolve(); return; }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  window.removeEventListener('resize', fit);
  const tl = gsap.timeline({ onComplete: done });
  tl.to(cv, { opacity: 0, duration: 0.5, ease: 'power2.out' })
    .to(shutters, { yPercent: -101, duration: 1.1, ease: 'expo.inOut', stagger: { each: 0.06, from: 'edges' } }, 0.1)
    .add(() => reveal(false), 0.45);
  await tl.then();
}
