/* Prev/next cards: draw the same generated cover the project spiral uses. Without JavaScript the cards stay text. */
const links = [...document.querySelectorAll<HTMLAnchorElement>('.cs-pn a[data-cover]')];
if (links.length) {
  const idle = () => new Promise<void>((r) => ('requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 200)));
  const io = new IntersectionObserver((es) => {
    if (!es.some((e) => e.isIntersecting)) return;
    io.disconnect();
    idle()
      .then(() => import('../spiral/covers'))
      .then(async ({ drawCover, loadFonts, THEME }) => {
        const draw = () => links.forEach((a) => {
          drawCover(a.querySelector('canvas')!, THEME, { slug: a.dataset.cover!, fact: a.dataset.fact ?? '' }, Number(a.dataset.index), Number(a.dataset.total));
          a.classList.add('has-cover');
        });
        draw(); // fallback fonts first, redrawn once the real ones are in
        await loadFonts(THEME);
        draw();
      })
      .catch((err) => console.warn('covers unavailable, showing text cards', err));
  }, { rootMargin: '50% 0px' });
  links.forEach((a) => io.observe(a));
}
