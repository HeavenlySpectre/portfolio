import { gsap } from 'gsap';
import { $$, onView } from '../lib.js';

/**
 * Generic [data-reveal] fade-up (once) and count-up numbers (once, <= 1.2s, ending on the doc value).
 * Uses a shared IntersectionObserver rather than one ScrollTrigger per element.
 */
export function initReveal({ reduced }) {
  if (reduced) return; // everything stays visible and final

  $$('[data-reveal]').forEach((el) => {
    onView(el, (past) => {
      el.classList.add('is-in');
      if (past) return;
      gsap.fromTo(el, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', clearProps: 'opacity,transform' });
    });
  });

  // Counters play once on entry (never scrubbed). The real value stays in the DOM until the animation
  // actually starts, so if the trigger never fires (jump, crawler, anything) the true numbers remain.
  // Decimal scores "decode": digits settle left to right instead of counting through wrong numbers.
  $$('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const final = pre + to.toFixed(dec) + suf;
    const o = { v: 0 };
    const decode = () => {
      const digitIdx = [...final].map((c, k) => (/\d/.test(c) ? k : -1)).filter((k) => k >= 0);
      const scramble = (settled) => [...final].map((c, k) => {
        const n = digitIdx.indexOf(k);
        return n === -1 || n < settled ? c : String(Math.floor(Math.random() * 10));
      }).join('');
      el.textContent = scramble(0);
      gsap.to(o, {
        v: 1, duration: 1.0, ease: 'power2.out',
        onUpdate: () => { el.textContent = scramble(Math.floor(o.v * (digitIdx.length + 0.001))); },
        onComplete: () => { el.textContent = final; },
      });
    };
    const count = () => {
      el.textContent = pre + '0' + suf;
      gsap.to(o, {
        v: to, duration: 1.1, ease: 'power3.out',
        onUpdate: () => { el.textContent = pre + Math.round(o.v) + suf; },
        onComplete: () => { el.textContent = final; },
      });
    };
    onView(el, (past) => { if (!past) (dec > 0 ? decode : count)(); }, '0px 0px -8% 0px');
  });
}
