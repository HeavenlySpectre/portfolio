import { mapLegacyHash } from '../lib/legacy-hash';
import { onPage } from './lifecycle';

/* Old links such as /#leadership and /#work: rewrite the hash and scroll there. Runs on every page load, so it also works when the router
   lands on the home page, and on hashchange for a legacy link followed inside the same page. While the first-visit loader is up the scroll
   waits for it (the loader resets the scroll position). */
function resolve(): void {
  const to = mapLegacyHash(location.hash);
  if (!to) return;
  history.replaceState(history.state, '', location.pathname + location.search + to);
  const go = () => document.querySelector(to)?.scrollIntoView({ behavior: 'auto', block: 'start' });
  if (document.documentElement.classList.contains('ld')) window.addEventListener('loader-done', () => requestAnimationFrame(go), { once: true });
  else requestAnimationFrame(go);
}

onPage(() => {
  resolve();
  window.addEventListener('hashchange', resolve);
  return () => window.removeEventListener('hashchange', resolve);
});
