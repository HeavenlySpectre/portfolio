import { $$ } from '../lib.js';

/** Live Asia/Jakarta (WIB) time. */
export function initClock() {
  const els = $$('[data-clock]');
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  const tick = () => {
    const t = fmt.format(new Date());
    els.forEach((el) => { el.textContent = t; });
  };
  tick();
  setInterval(tick, 1000);
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}
