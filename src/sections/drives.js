import { gsap } from 'gsap';
import { $, $$, clamp } from '../lib.js';

const lerp = (a, b, t) => a + (b - a) * t;
const range = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;
const backOut = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/**
 * What drives me: a sticky 100svh stage inside a tall section. The three principles pop in and out,
 * one at a time, driven by scroll progress with an eased follow (p += (target - p) * 0.12).
 * P1/P2: scale swap (backOut in, scale-up + blur out). P3: depth fly-through entry, holds.
 * Only transform, opacity and filter are animated. Reduced motion: static centred stack (CSS).
 */
export function initDrives({ reduced }) {
  if (reduced) return;
  const sec = $('#drives');
  const qs = $$('[data-principle]', sec).map((el) => ({ el, m: $('.q__m', el) }));
  const dots = $$('.drives__dots i', sec);
  gsap.from($('.drives__title', sec), {
    y: 32, opacity: 0, duration: 1.1, ease: 'expo.out',
    scrollTrigger: { trigger: sec, start: 'top 70%', toggleActions: 'play none none none' },
  });
  if (!qs.length) return;

  const blurMax = () => (window.innerWidth < 768 ? 6 : 10);
  let p = 0, visible = false;

  const render = () => {
    const r = sec.getBoundingClientRect(), vh = window.innerHeight;
    const target = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    p += (target - p) * 0.12;
    if (Math.abs(target - p) < 0.0004) p = target;
    const P = p * 3, B = blurMax(), B2 = B * 0.8;
    dots.forEach((d, i) => d.classList.toggle('on', Math.floor(Math.min(P, 2.999)) === i));

    qs.forEach(({ el, m }, i) => {
      const t = P - i, last = i === 2;
      const hidden = t < -0.05 || (!last && t > 1);
      el.style.visibility = hidden ? 'hidden' : 'visible';
      if (hidden) return;
      let sc, op, bl, mo;
      if (!last) {
        const inT = range(t, -0.05, 0.35), outT = range(t, 0.72, 1.0);
        sc = lerp(0.82, 1, backOut(inT)) * lerp(1, 1.12, easeIn(outT));
        op = Math.min(easeOut(inT), 1 - outT);
        bl = lerp(B, 0, easeOut(inT)) + lerp(0, B2, outT);
        mo = range(inT, 0.6, 1) * (1 - outT);
      } else {
        // depth fly-through entry, then hold
        const k = easeOut(range(t, -0.05, 0.4));
        sc = lerp(0.15, 1, k);
        op = range(t, -0.05, 0.3);
        bl = lerp(B2, 0, range(t, -0.05, 0.35));
        mo = range(t, 0.3, 0.45);
      }
      el.style.transform = `translate3d(-50%,-50%,0) scale(${sc.toFixed(4)})`;
      el.style.opacity = op.toFixed(3);
      el.style.filter = bl > 0.05 ? `blur(${bl.toFixed(2)}px)` : 'none';
      m.style.opacity = mo.toFixed(3);
    });
  };

  render();
  gsap.ticker.add(() => { if (visible) render(); });
  // Keep the loop alive only while the section is on screen (plus a margin so it settles).
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '10% 0px' });
  io.observe(sec);
}
