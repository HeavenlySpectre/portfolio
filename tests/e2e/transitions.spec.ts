import { test, expect, type Page } from '@playwright/test';

// Headless Chromium falls back to SwiftShader (about 2 fps) for the spiral. Ask for the real GPU when there is one.
const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])];
test.use({ viewport: { width: 1280, height: 800 }, launchOptions: { args: GPU } });
test.setTimeout(120_000);

declare global {
  interface Window {
    __spiralCount?: number;
    __kvTx?: { kind: 'card' | 'cd' | 'none'; cmd: string; ms?: number; done: boolean };
    __stCount?: () => number;
    __kvListeners?: () => Record<string, number>;
    __kvGl?: () => number;
  }
}

/** Net live listeners on window/document/media queries, and live (not lost) WebGL contexts, tracked from before any script runs. */
async function instrument(page: Page) {
  await page.addInitScript(() => {
    const live = new Map<string, Set<unknown>>();
    const kind = (t: unknown) => (t === window ? 'window' : t === document ? 'document' : t instanceof MediaQueryList ? 'mql' : '');
    const key = (t: unknown, type: string, cap: unknown) => `${kind(t)}:${type}:${typeof cap === 'object' ? !!(cap as AddEventListenerOptions)?.capture : !!cap}`;
    const add = EventTarget.prototype.addEventListener, rem = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, fn: any, opt?: any) {
      if (kind(this) && fn) {
        const k = key(this, type, opt);
        const s = live.get(k) ?? new Set();
        s.add(fn); live.set(k, s);
        (fn as any).__kvOnce = opt && typeof opt === 'object' && opt.once;
      }
      return add.call(this, type, fn, opt);
    } as typeof add;
    EventTarget.prototype.removeEventListener = function (this: EventTarget, type: string, fn: any, opt?: any) {
      if (kind(this) && fn) live.get(key(this, type, opt))?.delete(fn);
      return rem.call(this, type, fn, opt);
    } as typeof rem;
    window.__kvListeners = () => {
      const o: Record<string, number> = {};
      for (const [k, s] of live) { const n = [...s].filter((f: any) => !f.__kvOnce).length; if (n) o[k] = n; }
      return o;
    };
    const gls: WebGLRenderingContext[] = [];
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, id: string, ...a: any[]) {
      const c = (gc as any).call(this, id, ...a);
      if (c && /webgl/.test(id) && !gls.includes(c)) gls.push(c);
      return c;
    } as typeof gc;
    window.__kvGl = () => gls.filter((g) => !g.isContextLost()).length;
  });
}

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}

/** Home with the loader gone and the spiral live (one mount, pinned). */
async function homeReady(page: Page, url = '/?e2e') {
  await page.goto(url);
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 10000 });
  await toProjects(page);
}
async function toProjects(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.getElementById('projects')!.getBoundingClientRect().top + scrollY - innerHeight * 0.6));
  await page.waitForFunction(() => window.__spiralCount === 1 && !!document.getElementById('projects')?.closest('.pin-spacer'), null, { timeout: 20000 });
}
const inView = (page: Page, sel: string) => page.evaluate((s) => {
  const r = document.querySelector(s)!.getBoundingClientRect();
  return r.top < innerHeight && r.bottom > 0;
}, sel);
/** The case page for a slug is up and its header text has been typed in. */
async function onCase(page: Page, slug: string) {
  await page.waitForURL(`**/projects/${slug}/`);
  await expect(page.locator('main.cs h1')).toBeVisible();
}

test('home to first grid card to case page, back restores #projects with one spiral and no errors', async ({ page }) => {
  const errors = watch(page);
  await instrument(page);
  await homeReady(page);
  await page.locator('.sp-toggle').click(); // grid view: the cards are real, clickable links
  await expect(page.locator('#projects')).toHaveAttribute('data-view', 'grid');
  const first = page.locator('#projects .sp-card').first();
  const title = (await first.locator('.sp-title').textContent())!.trim();
  await first.click();
  await onCase(page, 'hybrid-rag');
  await expect(page).toHaveURL(/\/projects\/hybrid-rag\/$/);
  await expect(page.locator('main.cs h1')).toHaveText(title);
  expect((await page.evaluate(() => window.__kvTx))?.kind).toBe('card');
  // a client-side swap, not a document load: the page state we put on window is still here
  expect(await page.evaluate(() => typeof window.__kvListeners)).toBe('function');
  await page.goBack();
  await page.waitForURL((u) => u.pathname === '/');
  await page.waitForFunction(() => window.__spiralCount === 1 && document.querySelectorAll('#projects canvas').length === 1, null, { timeout: 20000 });
  expect(await inView(page, '#projects')).toBe(true);
  await expect(page.locator('#projects canvas')).toHaveCount(1);
  expect(await page.evaluate(() => document.querySelectorAll('#projects .pin-spacer, .pin-spacer #projects').length)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test('home to ~/contact works after returning from a case page', async ({ page }) => {
  const errors = watch(page);
  await instrument(page);
  await homeReady(page);
  await page.locator('.sp-toggle').click();
  await page.locator('#projects .sp-card').first().click();
  await onCase(page, 'hybrid-rag');
  await page.goBack();
  await page.waitForFunction(() => window.__spiralCount === 1, null, { timeout: 20000 });
  await page.locator('#nav ul a[data-sec=contact]').click();
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#contact');
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('contact')!.getBoundingClientRect().top))).toBeLessThan(400);
  await expect(page.locator('#nav ul a.on')).toHaveText('~/contact');
  expect(errors).toEqual([]);
});

test('terminal cd covers every other navigation, in 800 ms or less', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/projects/hybrid-rag/?e2e');
  // case page -> home through the back link
  await page.locator('.cs-back').click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.waitForFunction(() => window.__kvTx?.done === true);
  let tx = (await page.evaluate(() => window.__kvTx))!;
  expect(tx.kind).toBe('cd');
  expect(tx.cmd).toBe('cd ~');
  expect(tx.ms!).toBeLessThanOrEqual(800);
  expect(await page.locator('#kv-tx').count()).toBe(0);
  // case page -> another case page (prev/next card): not a card-expand source, so it is a cd too
  await page.goto('/projects/hybrid-rag/?e2e');
  await page.locator('.cs-pn a').last().click(); // next project
  await page.waitForURL((u) => /^\/projects\/[^/]+\/$/.test(u.pathname) && u.pathname !== '/projects/hybrid-rag/');
  await page.waitForFunction(() => window.__kvTx?.done === true);
  tx = (await page.evaluate(() => window.__kvTx))!;
  expect(tx.kind).toBe('cd');
  expect(tx.cmd).toBe('cd ~/projects/' + new URL(page.url()).pathname.split('/')[2]);
  expect(tx.ms!).toBeLessThanOrEqual(800);
  expect(errors).toEqual([]);
});

test('reduced motion: the swap is instant, no overlay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?e2e');
  await expect(page.locator('#projects .sp-card').first()).toBeVisible();
  await page.locator('#projects .sp-card').first().click();
  await onCase(page, 'hybrid-rag');
  expect((await page.evaluate(() => window.__kvTx))?.kind).toBe('none');
  expect(await page.locator('#kv-tx').count()).toBe(0);
  await page.goBack();
  await page.waitForURL((u) => u.pathname === '/');
  await expect(page.locator('#projects .sp-card').first()).toBeVisible();
  expect(await page.locator('#projects canvas').count()).toBe(0);
});

test('the loader does not replay on in-site navigation', async ({ page }) => {
  await instrument(page);
  // landing on a case page first, then going home
  await page.goto('/projects/hybrid-rag/?e2e');
  await page.locator('.cs-back').click();
  await page.waitForURL((u) => u.pathname === '/');
  await page.waitForFunction(() => window.__kvTx?.done === true);
  expect(await page.locator('#loader').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.classList.contains('ld'))).toBe(false);
  // a fresh session plays the loader once, leaving and returning does not bring it back
  await page.evaluate(() => sessionStorage.clear());
  await page.goto('/?e2e');
  await expect(page.locator('#loader')).toHaveCount(1);
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 10000 });
  await toProjects(page);
  await page.locator('.sp-toggle').click();
  await page.locator('#projects .sp-card').first().click();
  await onCase(page, 'hybrid-rag');
  await page.goBack();
  await page.waitForURL((u) => u.pathname === '/');
  expect(await page.locator('#loader').count()).toBe(0);
  expect(await page.evaluate(() => document.documentElement.classList.contains('ld'))).toBe(false);
});

test('nav on a case page: ~/projects stays active, its links lead home and the sections work', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/projects/hybrid-rag/');
  const on = page.locator('#nav ul a.on');
  await expect(on).toHaveCount(1);
  await expect(on).toHaveText('~/projects');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); // the end of a short page must not mark ~/contact
  await expect(page.locator('#nav ul a.on')).toHaveText('~/projects');
  await page.locator('#nav ul a[data-sec=experience]').click();
  await page.waitForURL((u) => u.pathname === '/' && u.hash === '#experience');
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('experience')!.getBoundingClientRect().top))).toBeLessThan(300);
  await expect(page.locator('#nav ul a.on')).toHaveText('~/experience');
  expect(errors).toEqual([]);
});

test('mobile menu on a case page leads to a home section', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto('/projects/hybrid-rag/');
  await page.getByRole('button', { name: 'menu' }).click();
  await expect(page.locator('#menu')).toBeVisible();
  await page.locator('#menu .menu-list a', { hasText: '~/contact' }).click();
  await page.waitForURL((u) => u.pathname === '/' && u.hash === '#contact');
  await expect(page.locator('#menu')).toBeHidden();
  await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('contact')!.getBoundingClientRect().top))).toBeLessThan(300);
  // and the menu on the new page is a working one
  await page.getByRole('button', { name: 'menu' }).click();
  await expect(page.locator('#menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#menu')).toBeHidden();
});

test('ten home to case round trips leave one WebGL context, no extra listeners, no extra triggers', async ({ page }) => {
  test.setTimeout(240_000);
  const errors = watch(page);
  await instrument(page);
  await homeReady(page);
  const snap = async () => ({
    ls: await page.evaluate(() => window.__kvListeners!()),
    st: await page.evaluate(() => window.__stCount!()),
    gl: await page.evaluate(() => window.__kvGl!()),
    canvases: await page.locator('#projects canvas').count(),
    count: await page.evaluate(() => window.__spiralCount),
  });
  let base: Awaited<ReturnType<typeof snap>> | null = null;
  for (let i = 0; i < 10; i++) {
    await page.locator('#projects .sp-item.is-active .sp-cta').click(); // the spiral's own link to the active project
    await onCase(page, 'hybrid-rag');
    await page.goBack();
    await page.waitForURL((u) => u.pathname === '/');
    await page.waitForFunction(() => window.__spiralCount === 1 && !!document.querySelector('#projects canvas'), null, { timeout: 20000 });
    await page.waitForTimeout(400);
    if (i === 0) base = await snap();
  }
  const last = await snap();
  expect(last.count).toBe(1);
  expect(last.canvases).toBe(1);
  expect(last.gl).toBe(1);
  expect(last.st).toBe(base!.st);
  expect(last.ls).toEqual(base!.ls);
  expect(await page.evaluate(() => document.querySelectorAll('.pin-spacer').length)).toBe(1);
  expect(errors).toEqual([]);
});
