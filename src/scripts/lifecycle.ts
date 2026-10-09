/* Page lifecycle under the Astro ClientRouter.
   A client script registers with onPage(init). init() runs when its page is in place (right away at module evaluation, then again on every
   astro:page-load), and the teardown it returns runs just before the old page is swapped out. A module that is already loaded is not run again
   by the router, so this is the only place a script learns about the next page: every init must look for its own markup and do nothing without it.
   Module scripts, listeners on window/document, observers, rAF loops, ScrollTriggers and WebGL contexts all belong inside init and its teardown. */

type Teardown = void | (() => void);
interface Reg { init: () => Teardown; down: Teardown; live: boolean }

declare global { interface Window { __kvSwapped?: boolean; __stCount?: () => number } }

const regs = new Set<Reg>();

function start(r: Reg): void {
  if (r.live) return;
  r.live = true;
  try { r.down = r.init(); } catch (err) { console.error(err); }
}
function stop(r: Reg): void {
  if (!r.live) return;
  r.live = false;
  const d = r.down;
  r.down = undefined;
  try { if (typeof d === 'function') d(); } catch (err) { console.error(err); }
}

export function onPage(init: () => Teardown): void {
  const r: Reg = { init, down: undefined, live: false };
  regs.add(r);
  start(r);
  document.addEventListener('astro:page-load', () => start(r));
}

/* astro:before-swap: tear everything down. This happens inside the swap step itself, after the browser has taken its snapshot of the old
   page and after the fallback exit animation (browsers without view transitions), so the page keeps running until the very last moment. */
document.addEventListener('astro:before-swap', (ev) => {
  const e = ev as Event & { swap: () => void };
  const swap = e.swap;
  e.swap = () => {
    window.__kvSwapped = true; // the loader reads this: it is for the first document of a session only
    regs.forEach(stop);
    swap();
  };
});

/* test hook, only with ?e2e in the first URL: how many ScrollTriggers are alive */
if (new URLSearchParams(location.search).has('e2e')) {
  import('gsap/ScrollTrigger').then(({ ScrollTrigger }) => { window.__stCount = () => ScrollTrigger.getAll().length; });
}
