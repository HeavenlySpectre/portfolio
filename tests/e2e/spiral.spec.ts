import { test, expect, type Page } from '@playwright/test';

const SLUGS = [
  'hybrid-rag',
  'executive-data-assistant',
  'material-property-prediction',
  'taskflow-devsecops',
  '19mj-career-platform',
  'realtime-lakehouse',
  'onchain-todo-dapp',
];

// Headless Chromium falls back to SwiftShader, which renders this scene at about 2 fps and stretches every tween 25x.
// Ask for the real GPU when there is one (harmless without it).
const GPU = ['--enable-gpu', '--ignore-gpu-blocklist', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : [])];
test.use({ viewport: { width: 1280, height: 800 }, launchOptions: { args: GPU } });

type Range = { start: number; end: number; max: number };

/** Waits for the loader to leave and the spiral to be live (one mount, pinned). */
async function ready(page: Page): Promise<Range> {
  await page.goto('/');
  await expect(page.locator('#loader')).toHaveCount(0, { timeout: 8000 });
  await page.waitForFunction(() => (window as any).__spiralCount === 1 && !!document.getElementById('projects')?.closest('.pin-spacer'), null, { timeout: 15000 });
  await page.waitForTimeout(600);
  return range(page);
}

/** Pinned scroll range of #projects (the pin spacer), plus the maximum scroll position. */
const range = (page: Page): Promise<Range> =>
  page.evaluate(() => {
    const sp = document.getElementById('projects')!.closest('.pin-spacer') as HTMLElement;
    const r = sp.getBoundingClientRect();
    const start = Math.round(r.top + scrollY);
    return { start, end: Math.round(start + r.height - innerHeight), max: document.scrollingElement!.scrollHeight - innerHeight };
  });

const getY = (page: Page) => page.evaluate(() => Math.round(window.scrollY));

/** Wheel-only traversal. Returns the number of events used and the longest stall outside the pinned range. */
async function traverse(page: Page, dir: 1 | -1, r: Range, target: number) {
  let events = 0, stall = 0, worst = 0, prev = await getY(page);
  const outside = (y: number) => y < r.start - 3 || y > r.end + 3;
  while (events < 260) {
    await page.mouse.wheel(0, 120 * dir);
    await page.waitForTimeout(400);
    events++;
    const y = await getY(page);
    if (dir === 1 ? y >= target - 1 : y <= target + 1) return { events, worst, y };
    // a stall only counts when both the position before and after the event are outside the pinned range
    if (y === prev && outside(y)) { stall++; worst = Math.max(worst, stall); } else stall = 0;
    prev = y;
  }
  return { events, worst, y: await getY(page) };
}

test('exactly one canvas inside #projects, no errors, and destroy() cleans up', async ({ page }) => {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await ready(page);
  await expect(page.locator('#projects canvas')).toHaveCount(1);
  expect(await page.evaluate(() => (window as any).__spiralCount)).toBe(1);
  await page.evaluate(() => (window as any).__spiral.destroy());
  await expect(page.locator('#projects canvas')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__spiralCount)).toBe(0);
  expect(await page.evaluate(() => !!document.getElementById('projects')!.closest('.pin-spacer') || document.getElementById('projects')!.hasAttribute('data-view') || !!document.querySelector('#projects .sp-stage, #projects .sp-controls, #projects .sp-card img'))).toBe(false);
  expect(errs).toEqual([]);
});

// over the canvas the spiral sees every wheel event, over the nav (top-left) the page scrolls natively and the pin snaps
for (const [where, x, y] of [['over the canvas', 640, 420], ['over the nav', 2, 2]] as const) test(`wheel-only traversal reaches the page bottom and back to the top, pointer ${where}`, async ({ page }) => {
  test.setTimeout(240_000);
  const r = await ready(page);
  await page.mouse.move(x, y);
  const down = await traverse(page, 1, r, r.max);
  expect(down.y, 'bottom reached').toBeGreaterThanOrEqual(r.max - 1);
  expect(down.events).toBeLessThanOrEqual(260);
  expect(down.worst, 'stall outside pinned range, going down').toBeLessThan(6);
  const up = await traverse(page, -1, r, 0);
  expect(up.y, 'top reached').toBeLessThanOrEqual(1);
  expect(up.events).toBeLessThanOrEqual(260);
  expect(up.worst, 'stall outside pinned range, going up').toBeLessThan(6);
  test.info().annotations.push({ type: 'events', description: `down ${down.events} (worst stall ${down.worst}), up ${up.events} (worst stall ${up.worst})` });
});

test('fast burst at the last card leaves the pinned range', async ({ page }) => {
  test.setTimeout(60_000);
  const r = await ready(page);
  await page.mouse.move(640, 420);
  await page.evaluate((y) => window.scrollTo(0, y), r.end);
  await page.waitForTimeout(1500);
  expect(Math.abs((await getY(page)) - r.end)).toBeLessThan(3);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(16); }
  await page.waitForTimeout(600);
  expect(await getY(page)).toBeGreaterThan(r.end + 20);
});

test('fast burst upward at the first card leaves the pinned range', async ({ page }) => {
  test.setTimeout(60_000);
  const r = await ready(page);
  await page.mouse.move(640, 420);
  await page.evaluate((y) => window.scrollTo(0, y), r.start);
  await page.waitForTimeout(1500);
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(16); }
  await page.waitForTimeout(600);
  expect(await getY(page)).toBeLessThan(r.start - 20);
});

test('after stepping to the last card with the wheel, the next push leaves', async ({ page }) => {
  test.setTimeout(90_000);
  const r = await ready(page);
  await page.mouse.move(640, 420);
  await page.evaluate((y) => window.scrollTo(0, y), r.start);
  await page.waitForTimeout(800);
  for (let i = 0; i < 40; i++) { // keep stepping until the last card is reached
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(700);
    if ((await getY(page)) >= r.end - 3) break;
  }
  expect(Math.abs((await getY(page)) - r.end)).toBeLessThan(4);
  let left = false; // a slow wheeler must be let out within a few pushes
  for (let i = 0; i < 8 && !left; i++) {
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(400);
    left = (await getY(page)) > r.end + 20;
  }
  expect(left).toBe(true);
});

test('the active card faces the camera with no bend, the others keep the spiral', async ({ page }) => {
  test.setTimeout(60_000);
  const r = await ready(page);
  const y = Math.round(r.start + ((r.end - r.start) * 3) / 7);
  await page.evaluate((v) => window.scrollTo(0, v), y);
  const poseOf = () => page.evaluate(() => (window as any).__spiral.pose() as { active: boolean; yaw: number; pitch: number; roll: number; face: number; bend: number }[]);
  await expect.poll(async () => (await poseOf()).find((p) => p.active)?.face, { timeout: 30000 }).toBe(1);
  await expect.poll(async () => (await poseOf()).filter((p) => !p.active).every((p) => p.bend === 1), { timeout: 30000 }).toBe(true);
  const pose = await poseOf();
  const act = pose.find((p) => p.active)!;
  expect(Math.abs(act.yaw)).toBeLessThan(0.5);
  expect(Math.abs(act.pitch)).toBeLessThan(0.5);
  expect(Math.abs(act.roll)).toBeLessThan(0.5);
  expect(act.bend).toBe(0);
});

test('reduced motion shows the grid and creates no canvas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(1200);
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await expect(page.locator('#projects canvas')).toHaveCount(0);
  const links = page.locator('#projects a[href^="/projects/"]');
  await expect(links.first()).toBeVisible();
  expect(await page.evaluate(() => (window as any).__spiralCount ?? 0)).toBe(0);
});

test('the grid has seven project links and the contact card', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const hrefs = await page.locator('#projects a[href^="/projects/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toEqual(SLUGS.map((s) => `/projects/${s}/`));
  for (const h of hrefs) expect(h).toMatch(/^\/projects\/[a-z0-9-]+\/$/);
  await expect(page.locator('#projects a[href="#contact"]')).toHaveCount(1);
  await expect(page.locator('#projects a[href="#contact"]')).toContainText('Get in touch');
});

test.describe('javascript disabled', () => {
  test.use({ javaScriptEnabled: false });
  test('the grid is visible and readable', async ({ page }) => {
    await page.goto('/');
    const links = page.locator('#projects a[href^="/projects/"]');
    await expect(links).toHaveCount(7);
    await expect(links.first()).toBeVisible();
    await expect(links.first()).toContainText('Hybrid RAG Knowledge Assistant');
    await expect(page.locator('#projects canvas')).toHaveCount(0);
  });
});
