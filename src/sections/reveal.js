import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $$ } from '../lib.js';

/** Generic [data-reveal] fade-up (once) and count-up numbers (once, <= 1.2s, ending on the doc value). */
export function initReveal({ reduced }) {
  if (reduced) return; // everything stays visible and final

  $$('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 36, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none none' },
    });
  });

  // Counters play once on entry (never scrubbed). Decimal scores "decode": digits settle left to right
  // instead of counting through plausible-looking wrong numbers.
  $$('[data-count]').forEach((el) => {
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const final = pre + to.toFixed(dec) + suf;
    const o = { v: 0 };
    el.textContent = pre + (0).toFixed(dec) + suf;
    const run = dec > 0
      ? () => {
          const digitIdx = [...final].map((c, i) => (/\d/.test(c) ? i : -1)).filter((i) => i >= 0);
          return gsap.to(o, {
            v: 1, duration: 1.0, ease: 'power2.out',
            onUpdate: () => {
              const settled = Math.floor(o.v * (digitIdx.length + 0.001));
              el.textContent = [...final].map((c, i) => {
                const k = digitIdx.indexOf(i);
                return k === -1 || k < settled ? c : String(Math.floor(Math.random() * 10));
              }).join('');
            },
            onComplete: () => { el.textContent = final; },
          });
        }
      : () => gsap.to(o, {
          v: to, duration: 1.1, ease: 'power3.out',
          onUpdate: () => { el.textContent = pre + Math.round(o.v) + suf; },
          onComplete: () => { el.textContent = final; },
        });
    ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: run });
  });
}
