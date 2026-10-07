import { gsap } from 'gsap';
import { $, finePointer } from './lib.js';

/** Small neutral cursor: 6px dot + 28px lagging ring (grows a little over interactive elements). */
export function initCursor({ reduced }) {
  if (!finePointer.matches) return;
  const root = $('#cursor');
  const dot = $('.cursor__dot', root);
  const ring = $('.cursor__ring', root);
  if (!root || !dot || !ring) return;

  document.documentElement.classList.add('has-cursor');
  gsap.set([dot, ring], { x: -100, y: -100 });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.05, ease: 'none' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.05, ease: 'none' });
  const lag = reduced ? 0.01 : 0.4;
  const rx = gsap.quickTo(ring, 'x', { duration: lag, ease: 'power3.out' });
  const ry = gsap.quickTo(ring, 'y', { duration: lag, ease: 'power3.out' });

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    root.classList.add('is-on');
    dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
  }, { passive: true });
  document.documentElement.addEventListener('mouseleave', () => root.classList.remove('is-on'));

  const sel = 'a, button';
  document.addEventListener('pointerover', (e) => { if (e.target.closest && e.target.closest(sel)) root.classList.add('is-hover'); });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest && e.target.closest(sel);
    if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) root.classList.remove('is-hover');
  });
}
