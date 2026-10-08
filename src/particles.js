import { clamp, debounce } from './lib.js';

const FG = '242,242,240';
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/**
 * Soft particle field (hero background): 160-360 small neutral points drift quietly and settle
 * into a curve as `progress` goes 0 -> 1. Subtle cursor repel. Paused when offscreen.
 */
export function createParticles(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, dpr = 1, pts = [];
  let progress = 0, active = false, wanted = false, raf = 0;
  const mouse = { x: -9999, y: -9999 };

  function build() {
    const n = w < 768 ? 110 : w < 1200 ? 280 : 360;
    pts = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.5,
      delay: Math.random() * 0.4, ox: 0, oy: 0, vx: 0, vy: 0, r: 0.9 + Math.random() * 0.7,
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
    draw(performance.now());
  }

  function draw(now) {
    const t = now * 0.001;
    ctx.clearRect(0, 0, w, h);
    const R = 110, R2 = R * R;
    for (const p of pts) {
      const k = reduced ? 1 : smooth(0, 0.6, (progress - p.delay) / (1 - p.delay + 0.001) * 1.0);
      const curveY = 0.5 - 0.2 * Math.tanh((p.x - 0.5) * 4);
      const ny = p.y + (reduced ? 0 : Math.sin(t * p.sp + p.ph) * 0.012);
      const nx = p.x + (reduced ? 0 : Math.cos(t * p.sp * 0.8 + p.ph) * 0.004);
      const x = nx * w;
      const y = (ny + (curveY - ny) * k * 0.88) * h;
      if (!reduced) {
        const ex = x + p.ox - mouse.x, ey = y + p.oy - mouse.y, d2 = ex * ex + ey * ey;
        if (d2 < R2 && d2 > 0.01) { const d = Math.sqrt(d2); const f = (1 - d / R) * 1.2; p.vx += (ex / d) * f; p.vy += (ey / d) * f; }
        p.vx += -p.ox * 0.05; p.vy += -p.oy * 0.05; p.vx *= 0.88; p.vy *= 0.88; p.ox += p.vx; p.oy += p.vy;
      }
      ctx.fillStyle = `rgba(${FG},${0.18 + 0.2 * k})`;
      ctx.beginPath();
      ctx.arc(x + p.ox, y + p.oy, p.r, 0, 6.29);
      ctx.fill();
    }
  }

  function loop(now) { if (!active) return; draw(now); raf = requestAnimationFrame(loop); }
  function setActive(on) {
    if (reduced) return;
    wanted = on;
    on = on && !document.hidden;
    if (on === active) return;
    active = on;
    if (on) raf = requestAnimationFrame(loop); else cancelAnimationFrame(raf);
  }
  function setProgress(v) { progress = clamp(v, 0, 1); }

  if (!reduced) {
    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }, { passive: true });
    document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); active = false; setActive(wanted); });
  } else {
    progress = 1;
  }
  window.addEventListener('resize', debounce(resize, 200));
  resize();
  return { setActive, setProgress, resize };
}
