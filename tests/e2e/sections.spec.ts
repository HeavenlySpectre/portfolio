import { test, expect, type Page } from '@playwright/test';

const ORDER = ['top', 'drives', 'projects', 'experience', 'achievements', 'organizations', 'toolkit', 'education', 'contact'];
const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])];
test.use({ viewport: { width: 1280, height: 800 }, launchOptions: { args: GPU } });

/** Skips the loader (a returning visitor) so the motion layer is armed straight away. */
async function open(page: Page) {
  await page.addInitScript(() => { try { sessionStorage.setItem('kv-loader-seen', '1'); } catch { /* ignore */ } });
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('/');
  await expect(page.locator('#loader')).toHaveCount(0);
  await page.waitForTimeout(400);
  return errs;
}

const docTop = (page: Page, sel: string) => page.evaluate((s) => { const r = document.querySelector(s)!.getBoundingClientRect(); return Math.round(r.top + scrollY); }, sel);
const getY = (page: Page) => page.evaluate(() => Math.round(scrollY));

test('section order follows the spec', async ({ page }) => {
  await open(page);
  const ids = await page.evaluate(() => [...document.querySelectorAll('main > section[id]')].map((s) => s.id));
  expect(ids).toEqual(ORDER);
});

test('achievements: exactly two cards, no links', async ({ page }) => {
  await open(page);
  await expect(page.locator('#achievements .card')).toHaveCount(2);
  await expect(page.locator('#achievements a')).toHaveCount(0);
  await expect(page.locator('#achievements img')).toHaveCount(0);
});

test('Hasta El Final appears exactly once, in its final form after the reveal', async ({ page }) => {
  await open(page);
  // scroll through the section like a reader: each principle plays when it enters the viewport
  for (const sel of ['#drives .sh', '#drives .pr.last']) {
    await page.evaluate((x) => document.querySelector(x)!.scrollIntoView({ block: 'center' }), sel);
    await page.waitForTimeout(1500);
  }
  await expect.poll(() => page.evaluate(() => document.querySelectorAll('#drives .fx-w, #drives .fx-g, #drives .vh').length), { timeout: 8000 }).toBe(0);
  const n = await page.evaluate(() => (document.querySelector('main')!.textContent ?? '').match(/Hasta El Final/gi)?.length ?? 0);
  expect(n).toBe(1);
  await expect.poll(() => page.evaluate(() => document.querySelector('#prog')!.textContent!.replace(/\s+/g, ' ')), { timeout: 5000 }).toBe('$ [##########] 3/3 exit 0');
});

test('Hasta El Final keeps the same height while it animates', async ({ page }) => {
  await open(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => {
    const q = document.querySelector<HTMLElement>('#drives .pr.last q')!;
    const log: { h: number; t: string }[] = [];
    (window as any).__hasta = log;
    const t0 = performance.now();
    const tick = () => { log.push({ h: q.offsetHeight, t: q.textContent ?? '' }); if (performance.now() - t0 < 4500) requestAnimationFrame(tick); };
    tick();
    document.querySelector('#drives .pr.last')!.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(4800);
  const log: { h: number; t: string }[] = await page.evaluate(() => (window as any).__hasta);
  const hs = log.map((l) => l.h);
  expect(Math.max(...hs) - Math.min(...hs)).toBeLessThanOrEqual(1);
  expect(Math.min(...hs)).toBeGreaterThan(20);
  // it really animated: the text passed through more than just the final state
  expect(new Set(log.map((l) => l.t)).size).toBeGreaterThan(3);
});

test('motion on: counts land exactly on the final values', async ({ page }) => {
  await open(page);
  for (const id of ['achievements', 'organizations']) {
    await page.evaluate((i) => document.getElementById(i)!.scrollIntoView(), id);
    await page.waitForTimeout(300);
    await page.evaluate((i) => document.getElementById(i)!.scrollIntoView({ block: 'end' }), id);
    await page.waitForTimeout(3500);
  }
  const text = await page.evaluate(() => (document.querySelector('main') as HTMLElement).innerText);
  for (const v of ['0.13689', '0.8771', '99.70%', '800+', '170+', '+60%', '3x']) expect(text, v).toContain(v);
});

test('experience: the detail card shows a logo with alt text and follows the playhead', async ({ page }) => {
  await open(page);
  const hw = await docTop(page, '#hw');
  await page.evaluate((y) => window.scrollTo(0, y - 500), hw);
  await page.waitForTimeout(1500);
  const img = page.locator('#hs-det img');
  await expect(img).toHaveCount(1);
  expect(((await img.getAttribute('alt')) ?? '').trim().length).toBeGreaterThan(0);

  const span = await page.evaluate(() => { const w = document.getElementById('hw')!, s = document.getElementById('hs')!; return w.offsetHeight - s.clientHeight; });
  const at = async (p: number) => {
    await page.evaluate(([y, s, q]) => window.scrollTo(0, y - 46 + s * q), [hw, span, p] as const);
    await page.waitForTimeout(900);
    return page.evaluate(() => (window as any).__exp.probe());
  };
  const a = await at(0.05);
  expect(a.shown).toBe('avalon');
  const b = await at(0.5);
  const c = await at(1);
  expect(c.shown).toBe('aitt');
  expect(c.q).toBeGreaterThanOrEqual(1);
  const order = [a, b, c].map((s) => s.on);
  expect(order[0]).toBeLessThanOrEqual(order[1]);
  expect(order[1]).toBeLessThanOrEqual(order[2]);
  expect(await img.getAttribute('alt')).toBe('AI Top Trends');
  // the playhead reads HEAD -> main at the end and the ended roles say merged, exit 0
  await expect(page.locator('#ht2 text.phx')).toHaveText('HEAD -> main');
  await expect(page.locator('#ht2 text.mgt')).toHaveCount(2);
  await expect(page.locator('#ht2 text.mgt').first()).toHaveText('merged · exit 0');
  // packets flow on the running roles
  await expect.poll(() => page.locator('#ht2 circle.pk[visibility=visible]').count()).toBeGreaterThan(0);
});

test('experience: branches are never drawn past the playhead', async ({ page }) => {
  await open(page);
  const hw = await docTop(page, '#hw');
  await page.evaluate((y) => window.scrollTo(0, y - 500), hw);
  await page.waitForTimeout(1500);
  const span = await page.evaluate(() => { const w = document.getElementById('hw')!, s = document.getElementById('hs')!; return w.offsetHeight - s.clientHeight; });
  let seenDrawn = 0;
  for (const p of [0.12, 0.3, 0.45, 0.6, 0.75, 0.9, 0.3, 0.12]) { // forward then back: history unwinds
    await page.evaluate(([y, s, q]) => window.scrollTo(0, y - 46 + s * q), [hw, span, p] as const);
    await page.waitForTimeout(500);
    const pr = await page.evaluate(() => (window as any).__exp.probe());
    for (const t of pr.tips) if (t && t.drawn > 0) { seenDrawn++; expect(t.tipX, `tip at p=${p}`).toBeLessThanOrEqual(pr.xP + 1.5); }
  }
  expect(seenDrawn).toBeGreaterThan(4);
});

test('experience: wheel traversal releases at both ends and never traps', async ({ page }) => {
  test.setTimeout(120_000);
  await open(page);
  const top = await docTop(page, '#experience');
  const bottom = top + (await page.evaluate(() => document.getElementById('experience')!.offsetHeight));
  await page.evaluate((y) => window.scrollTo(0, y - 700), top);
  await page.waitForTimeout(800);
  await page.mouse.move(640, 420);
  let prev = await getY(page), stalls = 0, worst = 0, n = 0;
  while (prev < bottom + 400 && n < 160) { // down through the whole section
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(60);
    const y = await getY(page);
    if (y <= prev) { stalls++; worst = Math.max(worst, stalls); } else stalls = 0;
    prev = y; n++;
  }
  expect(prev, 'left the section downward').toBeGreaterThan(bottom);
  expect(worst, 'longest stall going down').toBeLessThan(3);
  stalls = 0; worst = 0; n = 0;
  while (prev > top - 500 && n < 160) { // and back up
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(60);
    const y = await getY(page);
    if (y >= prev) { stalls++; worst = Math.max(worst, stalls); } else stalls = 0;
    prev = y; n++;
  }
  expect(prev, 'left the section upward').toBeLessThan(top);
  expect(worst, 'longest stall going up').toBeLessThan(3);
});

test('experience: fast trackpad burst at the end of the graph keeps scrolling', async ({ page }) => {
  await open(page);
  const hw = await docTop(page, '#hw');
  const h = await page.evaluate(() => document.getElementById('hw')!.offsetHeight);
  await page.evaluate((y) => window.scrollTo(0, y), hw + h - 900);
  await page.waitForTimeout(800);
  const before = await getY(page);
  await page.mouse.move(640, 420);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); }
  await page.waitForTimeout(500);
  expect(await getY(page)).toBeGreaterThan(before + 1500);
});

test('experience: below 720px the vertical git log is shown', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 900 });
  await open(page);
  await expect(page.locator('#exp')).toHaveAttribute('data-view', 'e1');
  await expect(page.locator('#v1')).toBeVisible();
  await expect(page.locator('#v2')).toBeHidden();
  await expect(page.locator('#cl > li')).toHaveCount(11);
  await expect(page.locator('#cl')).toContainText('HEAD');
  await expect(page.locator('#cl')).toContainText('exited 0');
  await expect(page.locator('#cl img').first()).toHaveAttribute('alt', /.+/);
  await page.locator('#v1').scrollIntoViewIfNeeded();
  await expect(page.locator('#lg path').first()).toBeAttached();
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test('every section renders its final values immediately', async ({ page }) => {
    await page.goto('/');
    const text = await page.evaluate(() => (document.querySelector('main') as HTMLElement).innerText);
    for (const v of ['0.13689', '0.8771', '99.70%', '800+', '170+', '+60%', '3x', '>100%']) expect(text, v).toContain(v);
    const n = await page.evaluate(() => (document.querySelector('main')!.textContent ?? '').match(/Hasta El Final/gi)?.length ?? 0);
    expect(n).toBe(1);
    expect(await page.evaluate(() => document.querySelector('#prog')!.textContent!.replace(/\s+/g, ' '))).toBe('$ [##########] 3/3 exit 0');
    expect(await page.evaluate(() => document.querySelectorAll('main .vh, main .fx-g, main .fx-w').length)).toBe(0);
    for (const sel of ['#achievements .card', '#organizations .org', '#toolkit .dir li', '#education .it', '#contact .ct a']) {
      const ok = await page.evaluate((s) => [...document.querySelectorAll(s)].every((e) => getComputedStyle(e).opacity === '1'), sel);
      expect(ok, sel).toBe(true);
    }
    await expect(page.locator('#exp')).toHaveAttribute('data-view', 'e1');
  });
});

test.describe('javascript disabled', () => {
  test.use({ javaScriptEnabled: false });
  test('all sections are readable', async ({ page }) => {
    await page.goto('/');
    for (const id of ORDER) await expect(page.locator('#' + id), id).toBeVisible();
    await expect(page.locator('#organizations')).toContainText('800+');
    await expect(page.locator('#experience')).toContainText('AI Top Trends');
    await expect(page.locator('#toolkit .dir li').first()).toBeVisible();
    await expect(page.locator('#toolkit svg').first()).toBeAttached(); // icons are inlined at build time
    await expect(page.locator('#contact')).toContainText('Indonesia');
  });
});

test('toolkit: inlined icons, missing slugs render a neutral glyph, no runtime fetch', async ({ page }) => {
  const reqs: string[] = [];
  page.on('request', (r) => reqs.push(r.url()));
  await open(page);
  await page.locator('#toolkit').scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector('#toolkit .ls')!.scrollIntoView({ block: 'center' }));
  await expect(page.locator('#toolkit li', { hasText: 'Python' }).locator('svg path')).toHaveCount(1);
  await expect(page.locator('#toolkit li', { hasText: 'LangGraph' }).locator('.lg')).toHaveText('▪');
  expect(reqs.filter((u) => /jsdelivr|simple-icons|unpkg|cdn/i.test(u))).toEqual([]);
  await expect(page.locator('#toolkit .ls')).toHaveText(/^total \d+ {2}\(9 directories\)$/);
});
