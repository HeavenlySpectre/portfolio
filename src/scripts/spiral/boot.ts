import { prefersReducedMotion } from '../motion/fx';
import { onPage } from '../lifecycle';
import { transitionSettled } from '../transitions';

/* Lazy init: three.js, the covers and the pin load when #projects is within one viewport, and never while the loader owns the frame
   budget (loader-done, then a calm second, then idle). Module evaluation and scene creation land in separate tasks.
   If the module or WebGL fails, the server-rendered grid stays (the sp-on reservation is lifted).
   Runs on every visit of the home page: the teardown disconnects the observer, drops pending work and destroys the spiral
   (one WebGL context, its pin and its listeners), so coming back mounts exactly one again. */
onPage(() => {
  const section = document.getElementById('projects');
  if (!section || prefersReducedMotion()) return;
  const D = document.documentElement;
  D.classList.add('sp-on'); // reserve the pinned height before the spiral mounts (also set before first paint by the inline script)
  let dead = false;
  let spiral: { destroy(): void } | null = null;
  const cleanups: (() => void)[] = [];
  const idle = () => new Promise<void>((r) => ('requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 200)));
  const loaderCalm = D.classList.contains('ld')
    ? new Promise<void>((r) => {
        let t = 0;
        const done = () => { t = window.setTimeout(r, 1000); };
        addEventListener('loader-done', done, { once: true });
        cleanups.push(() => { removeEventListener('loader-done', done); clearTimeout(t); });
      })
    : Promise.resolve();
  // arriving by a page transition: the cover finishes before the heavy part starts
  const calm = Promise.all([loaderCalm, transitionSettled()]).then(() => undefined);
  let started = false;
  const io = new IntersectionObserver((es) => {
    if (started || !es.some((e) => e.isIntersecting)) return;
    started = true;
    io.disconnect();
    calm
      .then(idle)
      .then(() => (dead ? null : import('./spiral')))
      .then(async (m) => {
        if (!m) return;
        await idle();
        if (!dead) spiral = m.mountSpiral(section);
      })
      .catch((err) => { console.warn('spiral unavailable, showing the grid', err); D.classList.remove('sp-on'); });
  }, { rootMargin: '100% 0px' });
  io.observe(section);
  return () => {
    dead = true;
    io.disconnect();
    cleanups.splice(0).forEach((f) => f());
    spiral?.destroy();
    spiral = null;
  };
});
