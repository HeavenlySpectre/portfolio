import { gsap } from 'gsap';
import { $, $$, finePointer } from '../lib.js';

export function initContact({ reduced, scrollTo }) {
  // Copy email
  const btn = $('#copyBtn');
  const status = $('#copyStatus');
  const text = $('[data-copy-text]', btn);
  let timer;
  btn.addEventListener('click', async () => {
    const value = btn.dataset.copy;
    let ok = false;
    try {
      await navigator.clipboard.writeText(value);
      ok = true;
    } catch (_) {
      // Fallback: select the visible address so it can be copied manually / via execCommand.
      const node = $('#emailAddr');
      const range = document.createRange();
      range.selectNodeContents(node);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
    }
    text.textContent = ok ? 'Copied' : 'Press Ctrl+C';
    btn.classList.toggle('is-copied', ok);
    status.textContent = ok ? 'Email address copied to clipboard' : 'Email address selected. Press Ctrl+C to copy.';
    clearTimeout(timer);
    timer = setTimeout(() => {
      text.textContent = 'Copy';
      btn.classList.remove('is-copied');
      status.textContent = '';
    }, 2200);
  });

  // Back to top
  $('#toTop').addEventListener('click', () => scrollTo(0));

  // Magnetic buttons
  if (!reduced && finePointer.matches) {
    $$('[data-magnetic]').forEach((b) => {
      const label = $('span', b);
      const bx = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3.out' });
      const by = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3.out' });
      const lx = gsap.quickTo(label, 'x', { duration: 0.6, ease: 'power3.out' });
      const ly = gsap.quickTo(label, 'y', { duration: 0.6, ease: 'power3.out' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        bx(dx * 0.28); by(dy * 0.4); lx(dx * 0.12); ly(dy * 0.2);
      });
      b.addEventListener('pointerleave', () => { bx(0); by(0); lx(0); ly(0); });
    });
  }
}
