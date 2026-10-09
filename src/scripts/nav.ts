import { initReveals } from './motion/reveal';

const D = document.documentElement;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const nav = document.getElementById('nav')!;
const brand = nav.querySelector<HTMLElement>('.brand')!;
const links = [...nav.querySelectorAll<HTMLAnchorElement>('ul a')];

/* scroll progress under the top bar: one transform per frame */
{
  const bar = document.getElementById('navp')!;
  let tk = 0;
  const upd = () => {
    tk = 0;
    const m = D.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${(m > 0 ? clamp(scrollY / m, 0, 1) : 0).toFixed(4)})`;
  };
  const q = () => { if (!tk) tk = requestAnimationFrame(upd); };
  addEventListener('scroll', q, { passive: true });
  addEventListener('resize', q);
  upd();
}

/* active item: a section maps to the nearest preceding nav anchor */
{
  const anchors = new Set(links.map((a) => a.dataset.sec));
  let cur = '';
  let tick = 0;
  const paint = () => {
    tick = 0;
    const probe = innerHeight * 0.4;
    const atEnd = scrollY + innerHeight >= D.scrollHeight - 2;
    let key = 'top';
    let ak = 'top';
    for (const s of document.querySelectorAll<HTMLElement>('main section[id]')) {
      if (anchors.has(s.id)) ak = s.id;
      if (s.getBoundingClientRect().top <= probe) key = ak;
    }
    // only where the page really has a contact section (a short page is "at the end" from the start)
    if (atEnd && anchors.has('contact') && document.getElementById('contact')) key = 'contact';
    // pages without home sections (case studies) pin one item
    if (nav.dataset.active) key = nav.dataset.active;
    if (key === cur) return;
    cur = key;
    brand.classList.toggle('on', key === 'top');
    for (const a of links) {
      const on = a.dataset.sec === key;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    }
  };
  const queue = () => { if (!tick) tick = requestAnimationFrame(paint); };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  addEventListener('hashchange', queue);
  paint();
}

/* full-screen menu */
{
  const menu = document.getElementById('menu')!;
  const openB = document.getElementById('menu-open')!;
  const closeB = document.getElementById('menu-close')!;
  const setMenu = (on: boolean, focus = true) => {
    menu.hidden = !on;
    D.classList.toggle('menu-open', on);
    openB.setAttribute('aria-expanded', String(on));
    if (focus) (on ? closeB : openB).focus({ preventScroll: true });
  };
  openB.addEventListener('click', () => setMenu(true));
  closeB.addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) setMenu(false, false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });
  matchMedia('(min-width: 641px)').addEventListener('change', (m) => { if (m.matches && !menu.hidden) setMenu(false); });
  menu.addEventListener('keydown', (e) => { // keep Tab inside the dialog
    if (e.key !== 'Tab') return;
    const f = [...menu.querySelectorAll<HTMLElement>('a,button')];
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

initReveals();
