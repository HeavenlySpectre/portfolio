import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, $$ } from './lib.js';

/** Smooth scroll (Lenis wired to ScrollTrigger), progress hairline, auto-hiding nav, anchor links. */
export function initScroll({ reduced }) {
  let lenis = null;

  if (!reduced) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, autoRaf: false });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // released when the loader exits
  }

  // Progress hairline
  const bar = $('#progress');
  const nav = $('#nav');
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      bar.style.transform = `scaleX(${self.progress})`;
      const y = self.scroll();
      const hide = self.direction === 1 && y > 160;
      nav.classList.toggle('is-hidden', hide && !nav.contains(document.activeElement));
    },
  });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  // Anchors (also the skip link)
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === '#hero' ? 0 : target, { duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else target.scrollIntoView({ behavior: 'auto' });
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  return {
    lenis,
    scrollTo: (t) => (lenis ? lenis.scrollTo(t, { duration: 1.6 }) : window.scrollTo(0, 0)),
    velocity: () => (lenis ? lenis.velocity : 0),
  };
}
